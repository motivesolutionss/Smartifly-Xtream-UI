import { Router } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import multer from 'multer';

import { prisma } from '../../config/prisma';
import { appendLedgerEntry } from '../../storage/financeLedger.store';
import {
  listAnnouncements,
  listFeatureTemplates,
  listPackages,
  saveAnnouncements,
  saveFeatureTemplates,
  savePackages,
  type AnnouncementRecord,
  type FeatureTemplateRecord,
  type PackageRecord,
} from '../../storage/adminContent.store';
import {
  listTicketTemplates,
  listTickets,
  saveTicketTemplates,
  saveTickets,
  type TicketRecord,
  type TicketTemplateRecord,
} from '../../storage/adminTickets.store';
import {
  type FeatureFlagRecord,
  type MaintenanceWindowRecord,
  type NotificationRecord,
  getOpsState,
  patchSettings,
  replaceBackups,
  replaceFeatureFlags,
  replaceMaintenanceWindows,
  replaceNotificationABTests,
  replaceNotificationHistory,
  replaceNotificationSegments,
  replaceNotificationTemplates,
} from '../../storage/adminOps.store';

const router = Router();

const nowIso = () => new Date().toISOString();
const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const ATTACHMENTS_DIR = path.join(DATA_DIR, 'ticket-attachments');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');
const DEFAULT_CURRENCY = 'USD';

const ticketUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

function parsePlan(value: unknown): 'TRIAL' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'LIFETIME' {
  const normalized = String(value ?? 'MONTHLY').trim().toUpperCase();
  if (normalized === 'TRIAL' || normalized === 'MONTHLY' || normalized === 'QUARTERLY' || normalized === 'YEARLY' || normalized === 'LIFETIME') {
    return normalized;
  }
  return 'MONTHLY';
}

function parsePlanFromPackage(pkg: Record<string, unknown> | null): 'TRIAL' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'LIFETIME' {
  if (!pkg) return 'MONTHLY';
  return parsePlan(pkg.duration);
}

function toNumber(value: unknown, fallback = 0): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

// Tickets
router.get('/tickets/all', async (req, res) => {
  const tickets = await listTickets();
  const page = Math.max(1, Number(req.query.page ?? 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 10)));
  const start = (page - 1) * limit;
  const data = tickets.slice(start, start + limit);
  return res.json({
    data,
    pagination: {
      page,
      limit,
      total: tickets.length,
      totalPages: Math.ceil(tickets.length / limit) || 1,
    },
  });
});

router.get('/tickets/stats', async (_req, res) => {
  const tickets = await listTickets();
  const byStatus = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((status) => ({
    name: status,
    value: tickets.filter((t) => t.status === status).length,
  }));
  return res.json({ statusDistribution: byStatus, total: tickets.length });
});

router.post('/tickets/:id/reply', async (req, res) => {
  const tickets = await listTickets();
  const ticket = tickets.find((t) => t.id === req.params.id);
  if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
  const reply = {
    id: makeId(),
    ticketId: ticket.id,
    message: String(req.body?.message ?? ''),
    isAdmin: true,
    createdAt: nowIso(),
  };
  ticket.replies = [...(ticket.replies ?? []), reply];
  ticket.updatedAt = nowIso();
  await saveTickets(tickets as TicketRecord[]);
  return res.json(ticket);
});

router.post('/tickets/:id/approve-payment', async (req, res) => {
  try {
    const ticketId = req.params.id;
    const tickets = await listTickets();
    const index = tickets.findIndex((t) => t.id === ticketId);
    if (index === -1) return res.status(404).json({ success: false, message: 'Ticket not found' });

    const ticket = tickets[index] as Record<string, unknown>;
    const status = String(ticket.status ?? 'OPEN').toUpperCase();
    if (status === 'CLOSED' || status === 'RESOLVED') {
      return res.status(400).json({ success: false, message: 'Ticket already resolved' });
    }

    const packagesStore = await listPackages();
    const packageIdRaw = req.body?.packageId;
    const packageId = packageIdRaw != null ? String(packageIdRaw) : String(ticket.packageId ?? '');
    const selectedPackage = packagesStore.find((p) => String(p.id) === packageId);

    const userIdRaw = req.body?.userId != null ? Number(req.body.userId) : null;
    const userId = Number.isFinite(userIdRaw as number) ? (userIdRaw as number) : null;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'userId is required for approval.' });
    }
    const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null }, select: { id: true } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const serverIdRaw = req.body?.serverId != null ? Number(req.body.serverId) : null;
    const serverId = Number.isFinite(serverIdRaw as number) ? (serverIdRaw as number) : null;
    const amount = toNumber(req.body?.amount, toNumber(selectedPackage?.price, 0));
    const currency = String(req.body?.currency ?? selectedPackage?.currency ?? DEFAULT_CURRENCY).toUpperCase();
    const plan = parsePlan(req.body?.plan ?? parsePlanFromPackage((selectedPackage ?? null) as Record<string, unknown> | null));

    const key = `LIC-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    const license = await prisma.license.create({
      data: {
        key,
        userId,
        serverId: serverId || undefined,
        plan,
        status: 'ACTIVE',
        activatedAt: new Date(),
      },
    });

    const ledger = await appendLedgerEntry({
      type: 'SUBSCRIPTION_CREATED',
      userId,
      licenseId: license.id,
      amount,
      currency,
      status: 'POSTED',
      note: `Approved from ticket ${String(ticket.ticketNo ?? ticket.id)}`,
      meta: {
        ticketId: String(ticket.id),
        ticketNo: String(ticket.ticketNo ?? ''),
        packageId: selectedPackage ? String(selectedPackage.id) : null,
        packageName: selectedPackage ? String(selectedPackage.name ?? '') : null,
        approvedBy: 'admin',
      },
    });

    ticket.status = 'RESOLVED';
    ticket.updatedAt = nowIso();
    ticket.resolvedAt = nowIso();
    ticket.approval = {
      approvedAt: nowIso(),
      userId,
      packageId: selectedPackage ? String(selectedPackage.id) : (packageId || null),
      packageName: selectedPackage ? String(selectedPackage.name ?? '') : null,
      licenseId: license.id,
      ledgerEntryId: ledger.id,
      amount,
      currency,
      plan,
    };
    ticket.replies = [
      ...(Array.isArray(ticket.replies) ? (ticket.replies as Array<Record<string, unknown>>) : []),
      {
        id: makeId(),
        ticketId: String(ticket.id),
        isAdmin: true,
        createdAt: nowIso(),
        message: `Payment approved. Subscription activated (License #${license.id}).`,
      },
    ];
    tickets[index] = ticket as TicketRecord;
    await saveTickets(tickets as TicketRecord[]);

    return res.json({
      success: true,
      ticket,
      license,
      ledgerEntry: ledger,
    });
  } catch (error) {
    console.error('[admin.tickets.approve-payment] error:', error);
    return res.status(500).json({ success: false, message: 'Failed to approve payment' });
  }
});

router.put('/tickets/:id/status', async (req, res) => {
  const tickets = await listTickets();
  const ticket = tickets.find((t) => t.id === req.params.id);
  if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
  ticket.status = req.body?.status ?? ticket.status;
  ticket.updatedAt = nowIso();
  await saveTickets(tickets as TicketRecord[]);
  return res.json(ticket);
});

router.put('/tickets/:id/tags', async (req, res) => {
  const tickets = await listTickets();
  const ticket = tickets.find((t) => t.id === req.params.id);
  if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
  ticket.tags = Array.isArray(req.body?.tags) ? req.body.tags : ticket.tags;
  ticket.updatedAt = nowIso();
  await saveTickets(tickets as TicketRecord[]);
  return res.json(ticket);
});

router.delete('/tickets/:id', async (req, res) => {
  const tickets = await listTickets();
  const next = tickets.filter((t) => t.id !== req.params.id);
  await saveTickets(next);
  return res.json({ success: true });
});

router.post('/tickets/bulk-action', async (req, res) => {
  const tickets = await listTickets();
  const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
  const action = String(req.body?.action ?? '');
  if (action === 'delete') {
    const next = tickets.filter((t) => !ids.includes(t.id));
    await saveTickets(next);
  }
  return res.json({ success: true });
});

router.get('/tickets/export', async (req, res) => {
  const tickets = await listTickets();
  const format = String(req.query.format ?? 'csv').toLowerCase();
  if (format === 'json') {
    const filename = `tickets-export-${Date.now()}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(JSON.stringify(tickets, null, 2));
  }

  const headers = ['id', 'ticketNo', 'name', 'email', 'subject', 'status', 'priority', 'createdAt', 'updatedAt'];
  const csvRows = [
    headers.join(','),
    ...tickets.map((ticket: Record<string, unknown>) =>
      headers
        .map((key) => {
          const value = ticket[key];
          const str = String(value ?? '');
          return `"${str.replace(/"/g, '""')}"`;
        })
        .join(',')
    ),
  ];
  const filename = `tickets-export-${Date.now()}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.send(csvRows.join('\n'));
});
router.get('/tickets/attachments/:id/download', async (req, res) => {
  const attachmentId = req.params.id;
  const tickets = await listTickets();
  for (const t of tickets as Array<Record<string, unknown>>) {
    const attachments = Array.isArray(t.attachments) ? (t.attachments as Array<Record<string, unknown>>) : [];
    const match = attachments.find((a) => String(a.id) === attachmentId);
    if (!match) continue;
    const storedName = String(match.storedName ?? '');
    const originalName = String(match.filename ?? 'attachment.bin');
    const filePath = path.join(ATTACHMENTS_DIR, storedName);
    try {
      await fs.access(filePath);
      return res.download(filePath, originalName);
    } catch {
      return res.status(404).json({ success: false, message: 'Attachment file not found' });
    }
  }
  return res.status(404).json({ success: false, message: 'Attachment not found' });
});
router.post('/tickets/:id/attachments', ticketUpload.array('files', 10), async (req, res) => {
  const ticketId = req.params.id;
  const tickets = await listTickets();
  const index = tickets.findIndex((t) => t.id === ticketId);
  if (index === -1) return res.status(404).json({ success: false, message: 'Ticket not found' });
  const files = Array.isArray(req.files) ? req.files : [];
  if (files.length === 0) return res.status(400).json({ success: false, message: 'No files uploaded' });

  await fs.mkdir(ATTACHMENTS_DIR, { recursive: true });
  const ticket = tickets[index] as Record<string, unknown>;
  const existing = Array.isArray(ticket.attachments) ? (ticket.attachments as Array<Record<string, unknown>>) : [];

  const created: Array<Record<string, unknown>> = [];
  for (const file of files) {
    const id = makeId();
    const storedName = `${id}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const filePath = path.join(ATTACHMENTS_DIR, storedName);
    await fs.writeFile(filePath, file.buffer);
    const item = {
      id,
      ticketId,
      filename: file.originalname,
      storedName,
      fileUrl: `/v1/admin/tickets/attachments/${encodeURIComponent(id)}/download`,
      fileType: file.mimetype,
      fileSize: file.size,
      createdAt: nowIso(),
    };
    existing.push(item);
    created.push(item);
  }

  ticket.attachments = existing;
  ticket.updatedAt = nowIso();
  tickets[index] = ticket as TicketRecord;
  await saveTickets(tickets as TicketRecord[]);
  return res.json({ success: true, attachments: created });
});
router.get('/tickets/templates', async (_req, res) => {
  const ticketTemplates = await listTicketTemplates();
  return res.json(ticketTemplates);
});
router.post('/tickets/templates', async (req, res) => {
  const ticketTemplates = await listTicketTemplates();
  const item = { id: makeId(), ...req.body, isActive: true, createdAt: nowIso(), updatedAt: nowIso() };
  ticketTemplates.unshift(item);
  await saveTicketTemplates(ticketTemplates as TicketTemplateRecord[]);
  return res.json(item);
});
router.put('/tickets/templates/:id', async (req, res) => {
  const ticketTemplates = await listTicketTemplates();
  const next = ticketTemplates.map((t) => (t.id === req.params.id ? { ...t, ...req.body, updatedAt: nowIso() } : t));
  await saveTicketTemplates(next as TicketTemplateRecord[]);
  const updated = next.find((t) => t.id === req.params.id) ?? null;
  return res.json(updated);
});
router.delete('/tickets/templates/:id', async (req, res) => {
  const ticketTemplates = await listTicketTemplates();
  const next = ticketTemplates.filter((t) => t.id !== req.params.id);
  await saveTicketTemplates(next);
  return res.json({ success: true });
});

// Packages
router.get('/packages/admin', async (_req, res) => {
  const packagesStore = await listPackages();
  return res.json(packagesStore);
});
router.get('/packages', async (_req, res) => {
  const packagesStore = await listPackages();
  return res.json(packagesStore.filter((p) => p.isActive !== false));
});
router.post('/packages', async (req, res) => {
  const packagesStore = await listPackages();
  const item = {
    id: makeId(),
    isActive: true,
    isPopular: false,
    order: packagesStore.length + 1,
    currency: 'USD',
    pricingTiers: [],
    createdAt: nowIso(),
    updatedAt: nowIso(),
    ...req.body,
  };
  packagesStore.unshift(item);
  await savePackages(packagesStore as PackageRecord[]);
  return res.json(item);
});
router.put('/packages/:id', async (req, res) => {
  const packagesStore = await listPackages();
  const next = packagesStore.map((p) => (p.id === req.params.id ? { ...p, ...req.body, updatedAt: nowIso() } : p));
  await savePackages(next as unknown as PackageRecord[]);
  return res.json(next.find((p) => p.id === req.params.id) ?? null);
});
router.delete('/packages/:id', async (req, res) => {
  const packagesStore = await listPackages();
  const next = packagesStore.filter((p) => p.id !== req.params.id);
  await savePackages(next);
  return res.json({ success: true });
});
router.post('/packages/:id/duplicate', async (req, res) => {
  const packagesStore = await listPackages();
  const source = packagesStore.find((p) => p.id === req.params.id);
  if (!source) return res.status(404).json({ message: 'Package not found' });
  const item = { ...source, id: makeId(), name: req.body?.name ?? `${source.name} Copy`, createdAt: nowIso(), updatedAt: nowIso() };
  packagesStore.unshift(item);
  await savePackages(packagesStore as PackageRecord[]);
  return res.json(item);
});
router.get('/packages/analytics', async (_req, res) => {
  const packagesStore = await listPackages();
  const result = packagesStore.map((p: Record<string, unknown>) => {
    const views = Number(p.views ?? 0);
    const purchases = Number(p.purchases ?? 0);
    const revenue = Number(p.revenue ?? 0);
    return {
      package: { id: p.id, name: p.name },
      views,
      purchases,
      revenue,
    };
  });
  return res.json(result);
});
router.post('/packages/:id/analytics/view', async (req, res) => {
  const packagesStore = await listPackages();
  const next = packagesStore.map((p: Record<string, unknown>) =>
    String(p.id) === req.params.id ? { ...p, views: Number(p.views ?? 0) + 1, updatedAt: nowIso() } : p
  );
  await savePackages(next as unknown as PackageRecord[]);
  return res.json({ success: true });
});
router.post('/packages/:id/analytics/purchase', async (req, res) => {
  const amount = Number(req.body?.amount ?? 0);
  const packagesStore = await listPackages();
  const next = packagesStore.map((p: Record<string, unknown>) =>
    String(p.id) === req.params.id
      ? {
          ...p,
          purchases: Number(p.purchases ?? 0) + 1,
          revenue: Number(p.revenue ?? 0) + (Number.isFinite(amount) ? amount : 0),
          updatedAt: nowIso(),
        }
      : p
  );
  await savePackages(next as unknown as PackageRecord[]);
  return res.json({ success: true });
});
router.get('/packages/:id/tiers', async (req, res) => {
  const packagesStore = await listPackages();
  const pkg = packagesStore.find((p: Record<string, unknown>) => String(p.id) === req.params.id) as Record<string, unknown> | undefined;
  if (!pkg) return res.status(404).json({ success: false, message: 'Package not found' });
  return res.json(Array.isArray(pkg.pricingTiers) ? pkg.pricingTiers : []);
});
router.post('/packages/:id/tiers', async (req, res) => {
  const packagesStore = await listPackages();
  const next = packagesStore.map((p: Record<string, unknown>) => {
    if (String(p.id) !== req.params.id) return p;
    const tiers = Array.isArray(p.pricingTiers) ? [...(p.pricingTiers as Array<Record<string, unknown>>)] : [];
    const tier = { id: makeId(), packageId: p.id, createdAt: nowIso(), updatedAt: nowIso(), ...req.body };
    tiers.push(tier);
    return { ...p, pricingTiers: tiers, updatedAt: nowIso() };
  });
  await savePackages(next as unknown as PackageRecord[]);
  return res.json({ success: true });
});
router.put('/packages/tiers/:id', async (req, res) => {
  const tierId = req.params.id;
  const packagesStore = await listPackages();
  const next = packagesStore.map((p: Record<string, unknown>) => {
    const tiers = Array.isArray(p.pricingTiers) ? (p.pricingTiers as Array<Record<string, unknown>>) : [];
    const updated = tiers.map((t) => (String(t.id) === tierId ? { ...t, ...req.body, updatedAt: nowIso() } : t));
    return { ...p, pricingTiers: updated, updatedAt: nowIso() };
  });
  await savePackages(next as unknown as PackageRecord[]);
  return res.json({ success: true });
});
router.delete('/packages/tiers/:id', async (req, res) => {
  const tierId = req.params.id;
  const packagesStore = await listPackages();
  const next = packagesStore.map((p: Record<string, unknown>) => {
    const tiers = Array.isArray(p.pricingTiers) ? (p.pricingTiers as Array<Record<string, unknown>>) : [];
    const filtered = tiers.filter((t) => String(t.id) !== tierId);
    return { ...p, pricingTiers: filtered, updatedAt: nowIso() };
  });
  await savePackages(next as unknown as PackageRecord[]);
  return res.json({ success: true });
});
router.get('/packages/feature-templates', async (_req, res) => {
  const featureTemplates = await listFeatureTemplates();
  return res.json(featureTemplates);
});
router.post('/packages/feature-templates', async (req, res) => {
  const featureTemplates = await listFeatureTemplates();
  const item = { id: makeId(), isActive: true, createdAt: nowIso(), updatedAt: nowIso(), ...req.body };
  featureTemplates.unshift(item);
  await saveFeatureTemplates(featureTemplates as FeatureTemplateRecord[]);
  return res.json(item);
});
router.put('/packages/feature-templates/:id', async (req, res) => {
  const featureTemplates = await listFeatureTemplates();
  const next = featureTemplates.map((t) => (t.id === req.params.id ? { ...t, ...req.body, updatedAt: nowIso() } : t));
  await saveFeatureTemplates(next as FeatureTemplateRecord[]);
  return res.json(next.find((t) => t.id === req.params.id) ?? null);
});
router.delete('/packages/feature-templates/:id', async (req, res) => {
  const featureTemplates = await listFeatureTemplates();
  const next = featureTemplates.filter((t) => t.id !== req.params.id);
  await saveFeatureTemplates(next);
  return res.json({ success: true });
});

// Announcements
router.get('/announcements/admin', async (_req, res) => {
  const announcements = await listAnnouncements();
  return res.json(announcements);
});
router.post('/announcements', async (req, res) => {
  const announcements = await listAnnouncements();
  const item = { id: makeId(), views: 0, isActive: true, createdAt: nowIso(), updatedAt: nowIso(), ...req.body };
  announcements.unshift(item);
  await saveAnnouncements(announcements as AnnouncementRecord[]);
  return res.json(item);
});
router.patch('/announcements/:id', async (req, res) => {
  const announcements = await listAnnouncements();
  const next = announcements.map((a) => (a.id === req.params.id ? { ...a, ...req.body, updatedAt: nowIso() } : a));
  await saveAnnouncements(next as AnnouncementRecord[]);
  return res.json(next.find((a) => a.id === req.params.id) ?? null);
});
router.delete('/announcements/:id', async (req, res) => {
  const announcements = await listAnnouncements();
  const next = announcements.filter((a) => a.id !== req.params.id);
  await saveAnnouncements(next);
  return res.json({ success: true });
});

// Settings
router.get('/settings/admin', async (_req, res) => {
  const state = await getOpsState();
  return res.json(state.settings);
});
router.put('/settings', async (req, res) => {
  const settings = await patchSettings(req.body ?? {});
  return res.json(settings);
});
router.get('/settings/flags', async (_req, res) => {
  const state = await getOpsState();
  return res.json(state.featureFlags);
});
router.post('/settings/flags', async (req, res) => {
  const state = await getOpsState();
  const featureFlags = state.featureFlags;
  const item = { id: makeId(), isEnabled: false, createdAt: nowIso(), updatedAt: nowIso(), ...req.body };
  featureFlags.unshift(item);
  await replaceFeatureFlags(featureFlags);
  return res.json(item);
});
router.patch('/settings/flags/:id', async (req, res) => {
  const state = await getOpsState();
  const next = state.featureFlags.map((f) => (f.id === req.params.id ? { ...f, ...req.body, updatedAt: nowIso() } : f));
  await replaceFeatureFlags(next);
  return res.json(next.find((f) => f.id === req.params.id) ?? null);
});
router.post('/settings/flags/:id/toggle', async (req, res) => {
  const state = await getOpsState();
  const next = state.featureFlags.map((f) => (f.id === req.params.id ? { ...f, isEnabled: !f.isEnabled, updatedAt: nowIso() } : f));
  await replaceFeatureFlags(next);
  return res.json(next.find((f) => f.id === req.params.id) ?? null);
});
router.delete('/settings/flags/:id', async (req, res) => {
  const state = await getOpsState();
  const next = state.featureFlags.filter((f) => f.id !== req.params.id);
  await replaceFeatureFlags(next);
  return res.json({ success: true });
});
router.get('/settings/maintenance-windows', async (_req, res) => {
  const state = await getOpsState();
  return res.json(state.maintenanceWindows);
});
router.post('/settings/maintenance-windows', async (req, res) => {
  const state = await getOpsState();
  const maintenanceWindows = state.maintenanceWindows;
  const item = { id: makeId(), status: 'SCHEDULED', createdAt: nowIso(), updatedAt: nowIso(), ...req.body };
  maintenanceWindows.unshift(item);
  await replaceMaintenanceWindows(maintenanceWindows);
  return res.json(item);
});
router.patch('/settings/maintenance-windows/:id/status', async (req, res) => {
  const state = await getOpsState();
  const next = state.maintenanceWindows.map((m) => (m.id === req.params.id ? { ...m, status: req.body?.status ?? m.status, updatedAt: nowIso() } : m));
  await replaceMaintenanceWindows(next);
  return res.json(next.find((m) => m.id === req.params.id) ?? null);
});
router.delete('/settings/maintenance-windows/:id', async (req, res) => {
  const state = await getOpsState();
  const next = state.maintenanceWindows.filter((m) => m.id !== req.params.id);
  await replaceMaintenanceWindows(next);
  return res.json({ success: true });
});
router.get('/settings/backups', async (_req, res) => {
  const state = await getOpsState();
  return res.json(state.backups);
});
router.post('/settings/backups', async (_req, res) => {
  const state = await getOpsState();
  const backups = state.backups;
  await fs.mkdir(BACKUPS_DIR, { recursive: true });
  const filename = `backup-${Date.now()}.json`;
  const backupPath = path.join(BACKUPS_DIR, filename);
  const [tickets, packagesStore, announcements] = await Promise.all([
    listTickets(),
    listPackages(),
    listAnnouncements(),
  ]);
  const snapshot = {
    exportedAt: nowIso(),
    settings: state.settings,
    featureFlags: state.featureFlags,
    maintenanceWindows: state.maintenanceWindows,
    notifications: state.notificationHistory,
    tickets,
    packages: packagesStore,
    announcements,
  };
  const raw = JSON.stringify(snapshot, null, 2);
  await fs.writeFile(backupPath, raw, 'utf8');
  const item = { id: makeId(), filename, size: Buffer.byteLength(raw, 'utf8'), status: 'COMPLETED', createdAt: nowIso() };
  backups.unshift(item);
  await replaceBackups(backups);
  return res.json(item);
});
router.post('/settings/backups/:id/restore', async (req, res) => {
  const backupId = req.params.id;
  const state = await getOpsState();
  const backup = state.backups.find((b: Record<string, unknown>) => String(b.id) === backupId);
  if (!backup) return res.status(404).json({ success: false, message: 'Backup not found' });
  const filename = String(backup.filename ?? '');
  if (!filename) return res.status(400).json({ success: false, message: 'Invalid backup record' });
  const backupPath = path.join(BACKUPS_DIR, filename);

  try {
    const raw = await fs.readFile(backupPath, 'utf8');
    const snapshot = JSON.parse(raw) as Record<string, unknown>;

    if (Array.isArray(snapshot.tickets)) {
      await saveTickets(snapshot.tickets as TicketRecord[]);
    }
    if (Array.isArray(snapshot.packages)) {
      await savePackages(snapshot.packages as PackageRecord[]);
    }
    if (Array.isArray(snapshot.announcements)) {
      await saveAnnouncements(snapshot.announcements as AnnouncementRecord[]);
    }
    if (snapshot.settings && typeof snapshot.settings === 'object') {
      await patchSettings(snapshot.settings as Record<string, unknown>);
    }
    if (Array.isArray(snapshot.featureFlags)) {
      await replaceFeatureFlags(snapshot.featureFlags as unknown as FeatureFlagRecord[]);
    }
    if (Array.isArray(snapshot.maintenanceWindows)) {
      await replaceMaintenanceWindows(snapshot.maintenanceWindows as unknown as MaintenanceWindowRecord[]);
    }
    if (Array.isArray(snapshot.notifications)) {
      await replaceNotificationHistory(snapshot.notifications as unknown as NotificationRecord[]);
    }

    return res.json({ success: true, restoredAt: nowIso(), backupId });
  } catch {
    return res.status(500).json({ success: false, message: 'Failed to restore backup' });
  }
});
router.get('/settings/backups/:filename/download', async (req, res) => {
  const filename = decodeURIComponent(req.params.filename);
  const filePath = path.join(BACKUPS_DIR, filename);
  try {
    await fs.access(filePath);
    return res.download(filePath, filename);
  } catch {
    return res.status(404).json({ success: false, message: 'Backup file not found' });
  }
});
router.get('/settings/audit-logs', async (req, res) => {
  const page = Math.max(1, Number(req.query.page ?? 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 20)));
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      skip,
      take: limit,
      orderBy: { id: 'desc' },
      select: { id: true, action: true, entity: true, details: true, ipAddress: true, createdAt: true, userId: true },
    }),
    prisma.auditLog.count(),
  ]);
  return res.json({
    data: items.map((i) => ({
      id: String(i.id),
      adminId: i.userId ? String(i.userId) : undefined,
      action: i.action,
      resource: i.entity,
      details: i.details,
      ipAddress: i.ipAddress,
      createdAt: i.createdAt.toISOString(),
    })),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
  });
});

// Notifications
router.post('/notifications/send', async (req, res) => {
  const state = await getOpsState();
  const notificationHistory = state.notificationHistory;
  const item = {
    id: makeId(),
    title: req.body?.title ?? 'Notification',
    body: req.body?.body ?? '',
    data: req.body?.data ?? null,
    status: 'SENT',
    sentAt: nowIso(),
    sentBy: 'ADMIN',
  };
  notificationHistory.unshift(item);
  await replaceNotificationHistory(notificationHistory);
  return res.json(item);
});
router.get('/notifications/history', async (_req, res) => {
  const state = await getOpsState();
  return res.json(state.notificationHistory);
});
router.get('/notifications/devices', async (_req, res) => {
  const total = await prisma.deviceUser.count({ where: { deletedAt: null } });
  return res.json({ total, android: total, ios: 0, web: 0 });
});
router.get('/notifications/templates', async (_req, res) => {
  const state = await getOpsState();
  return res.json(state.notificationTemplates);
});
router.post('/notifications/templates', async (req, res) => {
  const state = await getOpsState();
  const notificationTemplates = state.notificationTemplates;
  const item = { id: makeId(), isActive: true, createdAt: nowIso(), updatedAt: nowIso(), ...req.body };
  notificationTemplates.unshift(item);
  await replaceNotificationTemplates(notificationTemplates);
  return res.json(item);
});
router.patch('/notifications/templates/:id', async (req, res) => {
  const state = await getOpsState();
  const next = state.notificationTemplates.map((t) => (t.id === req.params.id ? { ...t, ...req.body, updatedAt: nowIso() } : t));
  await replaceNotificationTemplates(next);
  return res.json(next.find((t) => t.id === req.params.id) ?? null);
});
router.delete('/notifications/templates/:id', async (req, res) => {
  const state = await getOpsState();
  const next = state.notificationTemplates.filter((t) => t.id !== req.params.id);
  await replaceNotificationTemplates(next);
  return res.json({ success: true });
});
router.get('/notifications/segments', async (_req, res) => {
  const state = await getOpsState();
  return res.json(state.notificationSegments);
});
router.post('/notifications/segments', async (req, res) => {
  const state = await getOpsState();
  const notificationSegments = state.notificationSegments;
  const item = { id: makeId(), isActive: true, createdAt: nowIso(), updatedAt: nowIso(), ...req.body };
  notificationSegments.unshift(item);
  await replaceNotificationSegments(notificationSegments);
  return res.json(item);
});
router.patch('/notifications/segments/:id', async (req, res) => {
  const state = await getOpsState();
  const next = state.notificationSegments.map((s) => (s.id === req.params.id ? { ...s, ...req.body, updatedAt: nowIso() } : s));
  await replaceNotificationSegments(next);
  return res.json(next.find((s) => s.id === req.params.id) ?? null);
});
router.delete('/notifications/segments/:id', async (req, res) => {
  const state = await getOpsState();
  const next = state.notificationSegments.filter((s) => s.id !== req.params.id);
  await replaceNotificationSegments(next);
  return res.json({ success: true });
});
router.get('/notifications/ab-tests', async (_req, res) => {
  const state = await getOpsState();
  return res.json(state.notificationABTests);
});
router.post('/notifications/ab-tests', async (req, res) => {
  const state = await getOpsState();
  const notificationABTests = state.notificationABTests;
  const item = { id: makeId(), createdAt: nowIso(), updatedAt: nowIso(), ...req.body };
  notificationABTests.unshift(item);
  await replaceNotificationABTests(notificationABTests);
  return res.json(item);
});
router.patch('/notifications/ab-tests/:id', async (req, res) => {
  const state = await getOpsState();
  const next = state.notificationABTests.map((a) => (a.id === req.params.id ? { ...a, ...req.body, updatedAt: nowIso() } : a));
  await replaceNotificationABTests(next);
  return res.json(next.find((a) => a.id === req.params.id) ?? null);
});
router.delete('/notifications/ab-tests/:id', async (req, res) => {
  const state = await getOpsState();
  const next = state.notificationABTests.filter((a) => a.id !== req.params.id);
  await replaceNotificationABTests(next);
  return res.json({ success: true });
});
router.post('/notifications/scheduler/run', (_req, res) => res.json({ success: true }));

export default router;
