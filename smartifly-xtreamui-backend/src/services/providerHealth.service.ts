import { prisma } from '../config/prisma';

type ProviderHealthEventType =
  | 'IMAGE_SUCCESS'
  | 'IMAGE_FAILURE'
  | 'URL_REJECTED'
  | 'RAIL_EMPTY'
  | 'DUPLICATE_COLLISION';

type ProviderHealthContext =
  | 'HOME_HERO'
  | 'HOME_POSTER'
  | 'CONTINUE_WATCHING'
  | 'DETAILS'
  | 'LIVE_CARD'
  | 'SEARCH';

export interface ProviderHealthEventInput {
  eventId: string;
  deviceId: string;
  profileId?: string | null;
  portalIdentity: string;
  portalBaseUrl: string;
  host: string;
  eventType: ProviderHealthEventType;
  context: ProviderHealthContext;
  contentType?: string | null;
  contentId?: string | null;
  metadata?: Record<string, unknown> | null;
  occurredAt: string;
  appVersion: string;
  platform: string;
}

let tablesEnsured = false;

async function ensureProviderHealthTables(): Promise<void> {
  if (tablesEnsured) return;

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS provider_health_event (
      id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      event_id VARCHAR(100) NOT NULL,
      device_id VARCHAR(255) NOT NULL,
      profile_id VARCHAR(255) NULL,
      portal_identity VARCHAR(100) NOT NULL,
      portal_base_url VARCHAR(500) NOT NULL,
      host VARCHAR(255) NOT NULL,
      event_type VARCHAR(50) NOT NULL,
      context VARCHAR(50) NOT NULL,
      content_type VARCHAR(50) NULL,
      content_id VARCHAR(255) NULL,
      metadata_json JSON NULL,
      occurred_at DATETIME(3) NOT NULL,
      app_version VARCHAR(50) NOT NULL,
      platform VARCHAR(50) NOT NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      UNIQUE KEY uq_provider_health_event_id (event_id),
      KEY idx_provider_health_event_occurred (occurred_at),
      KEY idx_provider_health_event_portal (portal_identity),
      KEY idx_provider_health_event_host (host)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  tablesEnsured = true;
}

function toDateOnly(value: Date): string {
  return value.toISOString().split('T')[0];
}

function computeStatus(failureRate: number): 'HEALTHY' | 'DEGRADED' | 'CRITICAL' {
  if (failureRate >= 0.25) return 'CRITICAL';
  if (failureRate >= 0.1) return 'DEGRADED';
  return 'HEALTHY';
}

export async function ingestProviderHealthEvents(events: ProviderHealthEventInput[]): Promise<{ accepted: number; rejected: number }> {
  await ensureProviderHealthTables();

  let accepted = 0;
  let rejected = 0;
  const now = Date.now();
  const maxAgeMs = 7 * 24 * 60 * 60 * 1000;

  for (const event of events) {
    const occurred = new Date(event.occurredAt);
    if (Number.isNaN(occurred.getTime())) {
      rejected += 1;
      continue;
    }
    if (now - occurred.getTime() > maxAgeMs) {
      rejected += 1;
      continue;
    }

    const metadataJson = event.metadata ? JSON.stringify(event.metadata) : null;
    try {
      await prisma.$executeRawUnsafe(
        `
          INSERT INTO provider_health_event (
            event_id, device_id, profile_id, portal_identity, portal_base_url, host,
            event_type, context, content_type, content_id, metadata_json, occurred_at, app_version, platform
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE event_id = event_id
        `,
        event.eventId,
        event.deviceId,
        event.profileId ?? null,
        event.portalIdentity,
        event.portalBaseUrl,
        event.host,
        event.eventType,
        event.context,
        event.contentType ?? null,
        event.contentId ?? null,
        metadataJson,
        occurred,
        event.appVersion,
        event.platform,
      );
      accepted += 1;
    } catch {
      rejected += 1;
    }
  }

  return { accepted, rejected };
}

type PortalSummaryRow = {
  portalIdentity: string;
  portalBaseUrl: string;
  totalImages: number;
  imageFailures: number;
  failureRate: number;
  urlRejected: number;
  railEmpty: number;
  uniqueDevices: number;
  status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
};

export async function getProviderHealthSummary(from: Date, to: Date): Promise<PortalSummaryRow[]> {
  await ensureProviderHealthTables();

  const rows = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `
      SELECT
        portal_identity AS portalIdentity,
        portal_base_url AS portalBaseUrl,
        SUM(CASE WHEN event_type = 'IMAGE_SUCCESS' THEN 1 ELSE 0 END) AS imageSuccessCount,
        SUM(CASE WHEN event_type = 'IMAGE_FAILURE' THEN 1 ELSE 0 END) AS imageFailureCount,
        SUM(CASE WHEN event_type = 'URL_REJECTED' THEN 1 ELSE 0 END) AS urlRejectedCount,
        SUM(CASE WHEN event_type = 'RAIL_EMPTY' THEN 1 ELSE 0 END) AS railEmptyCount,
        COUNT(DISTINCT device_id) AS uniqueDevices
      FROM provider_health_event
      WHERE occurred_at >= ? AND occurred_at <= ?
      GROUP BY portal_identity, portal_base_url
      ORDER BY imageFailureCount DESC
    `,
    from,
    to,
  );

  return rows.map((row) => {
    const imageSuccess = Number(row.imageSuccessCount ?? 0);
    const imageFailures = Number(row.imageFailureCount ?? 0);
    const totalImages = imageSuccess + imageFailures;
    const failureRate = totalImages > 0 ? imageFailures / totalImages : 0;
    return {
      portalIdentity: String(row.portalIdentity ?? ''),
      portalBaseUrl: String(row.portalBaseUrl ?? ''),
      totalImages,
      imageFailures,
      failureRate: Number(failureRate.toFixed(4)),
      urlRejected: Number(row.urlRejectedCount ?? 0),
      railEmpty: Number(row.railEmptyCount ?? 0),
      uniqueDevices: Number(row.uniqueDevices ?? 0),
      status: computeStatus(failureRate),
    };
  });
}

type HostRow = {
  host: string;
  context: string;
  total: number;
  failures: number;
  failureRate: number;
  status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL' | 'CRITICAL_HOST';
};

export async function getProviderHealthHosts(portalIdentity: string, from: Date, to: Date): Promise<HostRow[]> {
  await ensureProviderHealthTables();

  const rows = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `
      SELECT
        host,
        context,
        SUM(CASE WHEN event_type IN ('IMAGE_SUCCESS', 'IMAGE_FAILURE') THEN 1 ELSE 0 END) AS totalImages,
        SUM(CASE WHEN event_type = 'IMAGE_FAILURE' THEN 1 ELSE 0 END) AS imageFailures
      FROM provider_health_event
      WHERE portal_identity = ?
        AND occurred_at >= ?
        AND occurred_at <= ?
      GROUP BY host, context
      ORDER BY imageFailures DESC
    `,
    portalIdentity,
    from,
    to,
  );

  return rows.map((row) => {
    const total = Number(row.totalImages ?? 0);
    const failures = Number(row.imageFailures ?? 0);
    const failureRate = total > 0 ? failures / total : 0;
    const status =
      total >= 100 && failureRate >= 0.35
        ? 'CRITICAL_HOST'
        : computeStatus(failureRate);
    return {
      host: String(row.host ?? ''),
      context: String(row.context ?? ''),
      total,
      failures,
      failureRate: Number(failureRate.toFixed(4)),
      status,
    };
  });
}

type TimelineItem = {
  date: string;
  imageSuccess: number;
  imageFailure: number;
  urlRejected: number;
  railEmpty: number;
  failureRate: number;
  urlRejectRate: number;
};

export async function getProviderHealthTimeline(portalIdentity: string, days: number): Promise<TimelineItem[]> {
  await ensureProviderHealthTables();

  const safeDays = Math.max(1, Math.min(days, 90));
  const to = new Date();
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - (safeDays - 1));
  from.setUTCHours(0, 0, 0, 0);

  const rows = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `
      SELECT
        DATE(occurred_at) AS dateKey,
        SUM(CASE WHEN event_type = 'IMAGE_SUCCESS' THEN 1 ELSE 0 END) AS imageSuccess,
        SUM(CASE WHEN event_type = 'IMAGE_FAILURE' THEN 1 ELSE 0 END) AS imageFailure,
        SUM(CASE WHEN event_type = 'URL_REJECTED' THEN 1 ELSE 0 END) AS urlRejected,
        SUM(CASE WHEN event_type = 'RAIL_EMPTY' THEN 1 ELSE 0 END) AS railEmpty
      FROM provider_health_event
      WHERE portal_identity = ?
        AND occurred_at >= ?
        AND occurred_at <= ?
      GROUP BY DATE(occurred_at)
      ORDER BY DATE(occurred_at) ASC
    `,
    portalIdentity,
    from,
    to,
  );

  const byDate = new Map<string, Record<string, unknown>>();
  rows.forEach((row) => byDate.set(String(row.dateKey), row));

  const items: TimelineItem[] = [];
  const cursor = new Date(from);
  while (cursor <= to) {
    const key = toDateOnly(cursor);
    const row = byDate.get(key);
    const imageSuccess = Number(row?.imageSuccess ?? 0);
    const imageFailure = Number(row?.imageFailure ?? 0);
    const urlRejected = Number(row?.urlRejected ?? 0);
    const railEmpty = Number(row?.railEmpty ?? 0);
    const totalImages = imageSuccess + imageFailure;
    const failureRate = totalImages > 0 ? imageFailure / totalImages : 0;
    const urlRejectRate = totalImages > 0 ? urlRejected / totalImages : 0;
    items.push({
      date: key,
      imageSuccess,
      imageFailure,
      urlRejected,
      railEmpty,
      failureRate: Number(failureRate.toFixed(4)),
      urlRejectRate: Number(urlRejectRate.toFixed(4)),
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return items;
}
