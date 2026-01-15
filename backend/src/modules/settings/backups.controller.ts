import { Request, Response } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import prisma from '../../config/database.js';
import { config } from '../../config';
import { AuthRequest } from '../../middleware';
import { createAuditLog } from './audit-logs.controller';

const execAsync = promisify(exec);

// Ensure backups directory exists
const BACKUPS_DIR = path.join(process.cwd(), 'backups');
if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

/**
 * Parse DATABASE_URL to extract connection details
 * Format: postgresql://user:password@host:port/database
 */
function parseDatabaseUrl(url: string) {
    const match = url.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
    if (!match) {
        throw new Error('Invalid DATABASE_URL format');
    }

    return {
        user: match[1],
        password: match[2],
        host: match[3],
        port: match[4],
        database: match[5]
    };
}

export const getBackups = async (req: Request, res: Response) => {
    try {
        const backups = await prisma.backup.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(backups);
    } catch (error) {
        console.error('Get backups error:', error);
        res.status(500).json({ error: 'Failed to fetch backups' });
    }
};

export const createBackup = async (req: AuthRequest, res: Response) => {
    try {
        const filename = `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.sql`;
        const filepath = path.join(BACKUPS_DIR, filename);

        // Parse DATABASE_URL
        const dbUrl = process.env.DATABASE_URL;
        if (!dbUrl) {
            return res.status(500).json({ error: 'DATABASE_URL not configured' });
        }

        const dbConfig = parseDatabaseUrl(dbUrl);

        // Create backup with initial status
        const backup = await prisma.backup.create({
            data: {
                filename,
                size: 0,
                status: 'IN_PROGRESS',
                url: `/api/settings/backups/${filename}/download`
            }
        });

        // Execute pg_dump using configured path
        const pgDumpCommand = `"${config.pgDumpPath}" -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database} -F p -f "${filepath}"`;

        try {
            await execAsync(pgDumpCommand, {
                env: { ...process.env, PGPASSWORD: dbConfig.password }
            });

            // Get file size
            const stats = fs.statSync(filepath);
            const fileSize = stats.size;

            // Update backup status
            await prisma.backup.update({
                where: { id: backup.id },
                data: {
                    status: 'COMPLETED',
                    size: fileSize
                }
            });

            await createAuditLog('CREATE', 'Backup', req.adminId || 'system', {
                id: backup.id,
                filename: backup.filename,
                size: fileSize
            }, req.ip);

            res.json({
                ...backup,
                status: 'COMPLETED',
                size: fileSize
            });
        } catch (execError: any) {
            // Update backup status to failed
            await prisma.backup.update({
                where: { id: backup.id },
                data: { status: 'FAILED' }
            });

            console.error('pg_dump error:', execError);

            // Provide helpful error message
            const isCommandNotFound = execError.message.includes('not found') ||
                execError.message.includes('not recognized') ||
                execError.code === 'ENOENT';

            if (isCommandNotFound) {
                return res.status(500).json({
                    error: 'Backup tool not found',
                    details: 'pg_dump is not installed or not in PATH. Please install PostgreSQL client tools or set PG_DUMP_PATH environment variable.',
                    hint: 'For production: Set PG_DUMP_PATH=/path/to/pg_dump in your .env file'
                });
            }

            res.status(500).json({
                error: 'Backup failed',
                details: execError.message
            });
        }
    } catch (error) {
        console.error('Create backup error:', error);
        res.status(500).json({ error: 'Failed to create backup' });
    }
};

export const restoreBackup = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const backup = await prisma.backup.findUnique({ where: { id } });

        if (!backup) {
            return res.status(404).json({ error: 'Backup not found' });
        }

        if (backup.status !== 'COMPLETED') {
            return res.status(400).json({ error: 'Cannot restore incomplete backup' });
        }

        const filepath = path.join(BACKUPS_DIR, backup.filename);

        if (!fs.existsSync(filepath)) {
            return res.status(404).json({ error: 'Backup file not found on disk' });
        }

        // Parse DATABASE_URL
        const dbUrl = process.env.DATABASE_URL;
        if (!dbUrl) {
            return res.status(500).json({ error: 'DATABASE_URL not configured' });
        }

        const dbConfig = parseDatabaseUrl(dbUrl);

        // Execute psql to restore using configured path
        const psqlCommand = `"${config.psqlPath}" -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database} -f "${filepath}"`;

        try {
            await execAsync(psqlCommand, {
                env: { ...process.env, PGPASSWORD: dbConfig.password }
            });

            await createAuditLog('RESTORE', 'Backup', req.adminId || 'system', {
                id: backup.id,
                filename: backup.filename
            }, req.ip);

            res.json({ success: true, message: `System restored to backup: ${backup.filename}` });
        } catch (execError: any) {
            console.error('psql restore error:', execError);

            // Provide helpful error message
            const isCommandNotFound = execError.message.includes('not found') ||
                execError.message.includes('not recognized') ||
                execError.code === 'ENOENT';

            if (isCommandNotFound) {
                return res.status(500).json({
                    error: 'Restore tool not found',
                    details: 'psql is not installed or not in PATH. Please install PostgreSQL client tools or set PSQL_PATH environment variable.',
                    hint: 'For production: Set PSQL_PATH=/path/to/psql in your .env file'
                });
            }

            res.status(500).json({
                error: 'Restore failed',
                details: execError.message
            });
        }
    } catch (error) {
        console.error('Restore backup error:', error);
        res.status(500).json({ error: 'Failed to restore backup' });
    }
};

export const downloadBackup = async (req: Request, res: Response) => {
    try {
        const { filename } = req.params;

        // Security check: ensure filename looks like what we expect to prevent traversal
        if (!filename.startsWith('backup-') || !filename.endsWith('.sql')) {
            return res.status(400).send('Invalid filename');
        }

        const filepath = path.join(BACKUPS_DIR, filename);

        // Check if file exists
        if (!fs.existsSync(filepath)) {
            return res.status(404).send('Backup file not found');
        }

        // Set headers for download
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/sql');

        // Stream the file
        const fileStream = fs.createReadStream(filepath);
        fileStream.pipe(res);

        fileStream.on('error', (error) => {
            console.error('File stream error:', error);
            if (!res.headersSent) {
                res.status(500).send('Failed to download backup');
            }
        });
    } catch (error) {
        console.error('Download backup error:', error);
        if (!res.headersSent) {
            res.status(500).send('Failed to download backup');
        }
    }
};
