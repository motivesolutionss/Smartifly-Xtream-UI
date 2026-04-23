import { Router, Request, Response } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import path from 'path';
import prisma from '../../config/database.js';
import { validate, authMiddleware, AuthRequest } from '../../middleware/index.js';
import { upload } from '../../middleware/upload.js';
import { generateTicketNo } from '../../utils/index.js';
import { notifyInvalidation } from '../../socket.js';

const router = Router();

// Validation schemas
const createTicketSchema = z.object({
    body: z.object({
        name: z.string().min(1).max(100),
        email: z.string().email(),
        subject: z.string().min(1).max(200),
        message: z.string().min(10),
        priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
    }),
});

const ticketNumberSchema = z.string().regex(
    /^TKT-[A-Z2-9]{6}$/,
    'Invalid ticket number format'
);

const publicTicketLookupSchema = z.object({
    params: z.object({
        ticketNo: ticketNumberSchema,
    }),
    query: z.object({
        email: z.string().email(),
    }),
});

const publicReplySchema = z.object({
    params: z.object({
        ticketNo: ticketNumberSchema,
    }),
    body: z.object({
        email: z.string().email(),
        message: z.string().min(1).max(5000),
    }),
});

const adminReplySchema = z.object({
    body: z.object({
        message: z.string().min(1).max(5000),
    }),
});

const updateStatusSchema = z.object({
    body: z.object({
        status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']),
    }),
});

const publicAttachmentDownloadSchema = z.object({
    params: z.object({
        ticketNo: ticketNumberSchema,
        attachmentId: z.string().uuid(),
    }),
    query: z.object({
        email: z.string().email(),
    }),
});

const adminAttachmentDownloadSchema = z.object({
    params: z.object({
        attachmentId: z.string().uuid(),
    }),
});

const publicTicketCreateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many ticket requests. Please try again later.' },
});

const publicTicketLookupLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 40,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many ticket lookups. Please try again later.' },
});

const publicTicketUpdateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please try again later.' },
});

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const uploadsDir = path.join(process.cwd(), 'uploads');

const getStoredFilename = (fileUrl: string) => path.basename(fileUrl);

const buildPublicAttachmentUrl = (ticketNo: string, email: string, attachmentId: string) =>
    `/api/tickets/public/${encodeURIComponent(ticketNo)}/attachments/${encodeURIComponent(attachmentId)}/download?email=${encodeURIComponent(email)}`;

const buildAdminAttachmentUrl = (attachmentId: string) =>
    `/api/tickets/admin/attachments/${encodeURIComponent(attachmentId)}/download`;

const withPublicAttachmentUrls = <T extends { ticketNo: string; attachments?: Array<{ id: string; fileUrl: string }> }>(
    ticket: T,
    email: string
) => ({
    ...ticket,
    attachments: ticket.attachments?.map((attachment) => ({
        ...attachment,
        fileUrl: buildPublicAttachmentUrl(ticket.ticketNo, email, attachment.id),
    })),
});

const withAdminAttachmentUrls = <T extends { attachments?: Array<{ id: string; fileUrl: string }> }>(ticket: T) => ({
    ...ticket,
    attachments: ticket.attachments?.map((attachment) => ({
        ...attachment,
        fileUrl: buildAdminAttachmentUrl(attachment.id),
    })),
});

const streamAttachmentFile = (res: Response, filePath: string, originalFilename: string, fileType?: string) => {
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Attachment file not found' });
    }

    const safeFilename = originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.setHeader('Content-Type', fileType || 'application/octet-stream');
    res.setHeader('Cache-Control', 'private, no-store');

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    fileStream.on('error', () => {
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to download attachment' });
        }
    });
};

// POST /api/tickets - Public: Create ticket
router.post('/', publicTicketCreateLimiter, validate(createTicketSchema), async (req: Request, res: Response) => {
    try {
        const ticketNo = generateTicketNo();
        const { name, email, subject, message, priority } = req.body;

        const ticket = await prisma.ticket.create({
            data: {
                name: name.trim(),
                email: normalizeEmail(email),
                subject: subject.trim(),
                message: message.trim(),
                priority: priority || 'MEDIUM',
                ticketNo,
            },
        });

        notifyInvalidation(['tickets']);

        res.status(201).json({
            message: 'Ticket created successfully',
            ticketNo: ticket.ticketNo,
            ticket,
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create ticket' });
    }
});

// POST /api/tickets/with-attachments - Public: Create ticket with file attachments
router.post('/with-attachments', publicTicketCreateLimiter, upload.array('files', 3), async (req: Request, res: Response) => {
    try {
        const { name, email, subject, message, priority } = req.body;
        const files = req.files as Express.Multer.File[];

        // Validate required fields
        if (!name || !email || !subject || !message) {
            return res.status(400).json({ error: 'Missing required fields: name, email, subject, message' });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        // Validate message length
        if (message.length < 10) {
            return res.status(400).json({ error: 'Message must be at least 10 characters' });
        }

        const ticketNo = generateTicketNo();

        // Create ticket and attachments in a transaction
        const result = await prisma.$transaction(async (tx) => {
            // Create the ticket
            const ticket = await tx.ticket.create({
                data: {
                    name: name.trim(),
                    email: normalizeEmail(email),
                    subject: subject.trim(),
                    message: message.trim(),
                    priority: priority || 'MEDIUM',
                    ticketNo,
                },
            });

            // Create attachments if files were uploaded
            if (files && files.length > 0) {
                await tx.ticketAttachment.createMany({
                    data: files.map(file => ({
                        ticketId: ticket.id,
                        filename: file.originalname,
                        fileUrl: `/uploads/${file.filename}`,
                        fileType: file.mimetype,
                        fileSize: file.size,
                    })),
                });
            }

            // Return ticket with attachments
            return tx.ticket.findUnique({
                where: { id: ticket.id },
                include: { attachments: true },
            });
        });

        notifyInvalidation(['tickets']);

        res.status(201).json({
            message: 'Ticket created successfully',
            ticketNo: result!.ticketNo,
            ticket: withPublicAttachmentUrls(result!, normalizeEmail(email)),
        });
    } catch (error) {
        console.error('Create ticket with attachments error:', error);
        res.status(500).json({ error: 'Failed to create ticket' });
    }
});

// GET /api/tickets/:ticketNo - Public: Get ticket by number
router.get('/:ticketNo', publicTicketLookupLimiter, validate(publicTicketLookupSchema), async (req: Request, res: Response) => {
    try {
        const { ticketNo } = req.params;
        const email = normalizeEmail(req.query.email as string);

        const ticket = await prisma.ticket.findFirst({
            where: {
                ticketNo,
                email,
            },
            include: {
                replies: {
                    orderBy: { createdAt: 'asc' },
                },
                attachments: true,
            },
        });

        if (!ticket) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        res.json(withPublicAttachmentUrls(ticket, email));
    } catch (error) {
        res.status(500).json({ error: 'Failed to get ticket' });
    }
});

// POST /api/tickets/:ticketNo/reply - Public: Add reply to ticket
router.post('/:ticketNo/reply', publicTicketUpdateLimiter, validate(publicReplySchema), async (req: Request, res: Response) => {
    try {
        const { ticketNo } = req.params;
        const { email, message } = req.body;

        const ticket = await prisma.ticket.findFirst({
            where: {
                ticketNo,
                email: normalizeEmail(email),
            },
        });
        if (!ticket) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        if (ticket.status === 'CLOSED') {
            return res.status(400).json({ error: 'Cannot reply to closed ticket' });
        }

        const reply = await prisma.reply.create({
            data: {
                ticketId: ticket.id,
                message,
                isAdmin: false,
            },
        });

        notifyInvalidation(['tickets']);

        // Reopen ticket if it was resolved
        if (ticket.status === 'RESOLVED') {
            await prisma.ticket.update({
                where: { id: ticket.id },
                data: { status: 'OPEN' },
            });
        }

        res.status(201).json(reply);
    } catch (error) {
        res.status(500).json({ error: 'Failed to add reply' });
    }
});

// POST /api/tickets/:ticketNo/attachments - Public: Upload attachments to ticket
router.post('/:ticketNo/attachments', publicTicketUpdateLimiter, upload.array('files', 3), async (req: Request, res: Response) => {
    try {
        const { ticketNo } = req.params;
        const files = req.files as Express.Multer.File[];
        const email = typeof req.body.email === 'string' ? normalizeEmail(req.body.email) : '';

        if (!files || files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        if (!email || !z.string().email().safeParse(email).success) {
            return res.status(400).json({ error: 'Valid email is required' });
        }

        if (!ticketNumberSchema.safeParse(ticketNo).success) {
            return res.status(400).json({ error: 'Invalid ticket number format' });
        }

        const ticket = await prisma.ticket.findFirst({
            where: {
                ticketNo,
                email,
            },
        });
        if (!ticket) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        if (ticket.status === 'CLOSED') {
            return res.status(400).json({ error: 'Cannot add attachments to closed ticket' });
        }

        const attachments = await Promise.all(
            files.map(file =>
                prisma.ticketAttachment.create({
                    data: {
                        ticketId: ticket.id,
                        filename: file.originalname,
                        fileUrl: `/uploads/${file.filename}`,
                        fileType: file.mimetype,
                        fileSize: file.size,
                    },
                })
            )
        );

        notifyInvalidation(['tickets']);
        res.status(201).json(
            attachments.map((attachment) => ({
                ...attachment,
                fileUrl: buildPublicAttachmentUrl(ticketNo, email, attachment.id),
            }))
        );
    } catch (error) {
        console.error('Attachment upload error:', error);
        res.status(500).json({ error: 'Failed to upload attachments' });
    }
});

// GET /api/tickets/public/:ticketNo/attachments/:attachmentId/download - Public: Download ticket attachment
router.get(
    '/public/:ticketNo/attachments/:attachmentId/download',
    publicTicketLookupLimiter,
    validate(publicAttachmentDownloadSchema),
    async (req: Request, res: Response) => {
        try {
            const { ticketNo, attachmentId } = req.params;
            const email = normalizeEmail(req.query.email as string);

            const ticket = await prisma.ticket.findFirst({
                where: {
                    ticketNo,
                    email,
                },
                select: { id: true },
            });

            if (!ticket) {
                return res.status(404).json({ error: 'Ticket not found' });
            }

            const attachment = await prisma.ticketAttachment.findFirst({
                where: {
                    id: attachmentId,
                    ticketId: ticket.id,
                },
            });

            if (!attachment) {
                return res.status(404).json({ error: 'Attachment not found' });
            }

            const storedFilename = getStoredFilename(attachment.fileUrl);
            const filePath = path.join(uploadsDir, storedFilename);

            return streamAttachmentFile(res, filePath, attachment.filename, attachment.fileType);
        } catch (error) {
            res.status(500).json({ error: 'Failed to download attachment' });
        }
    }
);

// === ADMIN ROUTES ===

// GET /api/tickets/admin/stats - Admin: Get ticket counts by status (for stats cards)
router.get('/admin/stats', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const [open, inProgress, resolved, closed] = await Promise.all([
            prisma.ticket.count({ where: { status: 'OPEN' } }),
            prisma.ticket.count({ where: { status: 'IN_PROGRESS' } }),
            prisma.ticket.count({ where: { status: 'RESOLVED' } }),
            prisma.ticket.count({ where: { status: 'CLOSED' } }),
        ]);

        res.json({
            statusDistribution: [
                { name: 'OPEN', value: open },
                { name: 'IN_PROGRESS', value: inProgress },
                { name: 'RESOLVED', value: resolved },
                { name: 'CLOSED', value: closed },
            ],
            total: open + inProgress + resolved + closed,
        });
    } catch (error) {
        console.error('Ticket stats error:', error);
        res.status(500).json({ error: 'Failed to get ticket stats' });
    }
});

// GET /api/tickets/admin/attachments/:attachmentId/download - Admin: Download any attachment
router.get(
    '/admin/attachments/:attachmentId/download',
    authMiddleware,
    validate(adminAttachmentDownloadSchema),
    async (req: AuthRequest, res: Response) => {
        try {
            const { attachmentId } = req.params;

            const attachment = await prisma.ticketAttachment.findUnique({
                where: { id: attachmentId },
            });

            if (!attachment) {
                return res.status(404).json({ error: 'Attachment not found' });
            }

            const storedFilename = getStoredFilename(attachment.fileUrl);
            const filePath = path.join(uploadsDir, storedFilename);

            return streamAttachmentFile(res, filePath, attachment.filename, attachment.fileType);
        } catch (error) {
            res.status(500).json({ error: 'Failed to download attachment' });
        }
    }
);

// GET /api/tickets/admin/all - Admin: Get all tickets (paginated)
router.get('/admin/all', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const { status, priority, page, limit, search, sortBy, sortDir } = req.query;

        // Where clause construction
        const where: any = {};
        if (status) where.status = status;
        if (priority) where.priority = priority;
        if (search) {
            where.OR = [
                { ticketNo: { contains: search as string } },
                { subject: { contains: search as string } },
                { name: { contains: search as string } },
                { email: { contains: search as string } },
            ];
        }

        // If no pagination params, return all (backward compatibility)
        if (!page && !limit) {
            const tickets = await prisma.ticket.findMany({
                where,
                include: {
                    _count: { select: { replies: true } },
                    attachments: true,
                    replies: { orderBy: { createdAt: 'asc' } },
                },
                orderBy: { [((sortBy as string) || 'createdAt')]: ((sortDir as string) || 'desc') },
            });
            return res.json(tickets.map((ticket) => withAdminAttachmentUrls(ticket)));
        }

        // Pagination logic
        const pageNum = parseInt(page as string) || 1;
        const limitNum = parseInt(limit as string) || 10;
        const skip = (pageNum - 1) * limitNum;

        const [tickets, total] = await Promise.all([
            prisma.ticket.findMany({
                where,
                include: {
                    _count: { select: { replies: true } },
                    attachments: true,
                    replies: { orderBy: { createdAt: 'asc' } },
                },
                orderBy: { [((sortBy as string) || 'createdAt')]: ((sortDir as string) || 'desc') },
                skip,
                take: limitNum,
            }),
            prisma.ticket.count({ where }),
        ]);

        res.json({
            data: tickets.map((ticket) => withAdminAttachmentUrls(ticket)),
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum),
            },
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get tickets' });
    }
});

// POST /api/tickets/admin/:id/reply - Admin: Reply to ticket
router.post('/admin/:id/reply', authMiddleware, validate(adminReplySchema), async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { message } = req.body;

        const ticket = await prisma.ticket.findUnique({ where: { id } });
        if (!ticket) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        const reply = await prisma.reply.create({
            data: {
                ticketId: id,
                message,
                isAdmin: true,
            },
        });

        // Update status and track SLA first response
        const updateData: any = {};
        if (ticket.status === 'OPEN') {
            updateData.status = 'IN_PROGRESS';
        }
        // Set first response time if not already set (SLA tracking)
        if (!ticket.firstResponseAt) {
            updateData.firstResponseAt = new Date();
        }

        if (Object.keys(updateData).length > 0) {
            await prisma.ticket.update({
                where: { id },
                data: updateData,
            });
        }

        notifyInvalidation(['tickets']);
        res.status(201).json(reply);
    } catch (error) {
        res.status(500).json({ error: 'Failed to add reply' });
    }
});

// POST /api/tickets/admin/:id/attachments - Admin: Upload attachments
router.post('/admin/:id/attachments', authMiddleware, upload.array('files', 5), async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const files = req.files as Express.Multer.File[];

        if (!files || files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        const ticket = await prisma.ticket.findUnique({ where: { id } });
        if (!ticket) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        const attachments = await Promise.all(
            files.map(file =>
                prisma.ticketAttachment.create({
                    data: {
                        ticketId: id,
                        filename: file.originalname,
                        fileUrl: `/uploads/${file.filename}`,
                        fileType: file.mimetype,
                        fileSize: file.size,
                    },
                })
            )
        );

        res.status(201).json(
            attachments.map((attachment) => ({
                ...attachment,
                fileUrl: buildAdminAttachmentUrl(attachment.id),
            }))
        );
    } catch (error) {
        console.error('Attachment upload error:', error);
        res.status(500).json({ error: 'Failed to upload attachments' });
    }
});

// PUT /api/tickets/admin/:id/status - Admin: Update ticket status
router.put('/admin/:id/status', authMiddleware, validate(updateStatusSchema), async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        // Build update data with conditional resolvedAt
        const ticket = await prisma.ticket.update({
            where: { id },
            data: {
                status: status as 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED',
                ...(status === 'RESOLVED' && { resolvedAt: new Date() }),
            },
        });

        notifyInvalidation(['tickets']);
        res.json(ticket);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update ticket status' });
    }
});

// DELETE /api/tickets/admin/:id - Admin: Delete ticket
router.delete('/admin/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        await prisma.ticket.delete({ where: { id } });

        notifyInvalidation(['tickets']);
        res.json({ message: 'Ticket deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete ticket' });
    }
});

// POST /api/tickets/admin/bulk-action - Admin: Bulk actions on tickets
router.post('/admin/bulk-action', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const { ids, action } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'No tickets selected' });
        }

        let result;
        switch (action) {
            case 'close':
                result = await prisma.ticket.updateMany({
                    where: { id: { in: ids } },
                    data: { status: 'CLOSED' },
                });
                break;
            case 'resolve':
                result = await prisma.ticket.updateMany({
                    where: { id: { in: ids } },
                    data: { status: 'RESOLVED', resolvedAt: new Date() },
                });
                break;
            case 'delete':
                result = await prisma.ticket.deleteMany({
                    where: { id: { in: ids } },
                });
                break;
            default:
                return res.status(400).json({ error: 'Invalid action' });
        }

        res.json({ message: `${action} completed`, count: result.count });
        notifyInvalidation(['tickets']);
    } catch (error) {
        res.status(500).json({ error: 'Failed to perform bulk action' });
    }
});

// PUT /api/tickets/admin/:id/tags - Admin: Update ticket tags
router.put('/admin/:id/tags', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { tags } = req.body;

        const ticket = await prisma.ticket.update({
            where: { id },
            data: { tags },
        });

        notifyInvalidation(['tickets']);
        res.json(ticket);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update tags' });
    }
});

// GET /api/tickets/admin/export - Admin: Export tickets as CSV
router.get('/admin/export', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const tickets = await prisma.ticket.findMany({
            include: { _count: { select: { replies: true } } },
            orderBy: { createdAt: 'desc' },
        });

        // Build CSV content
        const headers = ['Ticket No', 'Subject', 'Customer', 'Email', 'Status', 'Priority', 'Tags', 'Created', 'Replies'];
        const rows = tickets.map(t => [
            t.ticketNo,
            `"${t.subject.replace(/"/g, '""')}"`,
            `"${t.name.replace(/"/g, '""')}"`,
            t.email,
            t.status,
            t.priority,
            `\"${((t.tags as string[]) || []).join(', ')}\"`,
            new Date(t.createdAt).toISOString(),
            t._count.replies,
        ]);

        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=tickets-export.csv');
        res.send(csv);
    } catch (error) {
        res.status(500).json({ error: 'Failed to export tickets' });
    }
});

// === TEMPLATES ===

// GET /api/tickets/admin/templates - Admin: Get all templates
router.get('/admin/templates', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const templates = await prisma.ticketTemplate.findMany({
            where: { isActive: true },
            orderBy: { name: 'asc' },
        });
        res.json(templates);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get templates' });
    }
});

// POST /api/tickets/admin/templates - Admin: Create template
router.post('/admin/templates', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const { name, content, category } = req.body;

        const template = await prisma.ticketTemplate.create({
            data: { name, content, category: category || 'General' },
        });

        res.status(201).json(template);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create template' });
    }
});

// PUT /api/tickets/admin/templates/:id - Admin: Update template
router.put('/admin/templates/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { name, content, category, isActive } = req.body;

        const template = await prisma.ticketTemplate.update({
            where: { id },
            data: { name, content, category, isActive },
        });

        res.json(template);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update template' });
    }
});

// DELETE /api/tickets/admin/templates/:id - Admin: Delete template
router.delete('/admin/templates/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.ticketTemplate.delete({ where: { id } });
        res.json({ message: 'Template deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete template' });
    }
});

export default router;
