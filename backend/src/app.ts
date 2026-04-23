import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config/index.js';
import { errorHandler, notFoundHandler } from './middleware/index.js';
import prisma from './config/database.js';

// Import routes
import { authRoutes } from './modules/auth/index.js';
import { portalRoutes } from './modules/portals/index.js';
import { ticketRoutes } from './modules/tickets/index.js';
import { packageRoutes } from './modules/packages/index.js';
import { announcementRoutes } from './modules/announcements/index.js';
import { settingsRoutes } from './modules/settings/index.js';
import { notificationRoutes } from './modules/notifications/index.js';
import { analyticsRoutes } from './modules/analytics/index.js';
import { subscriptionRoutes } from './modules/subscriptions/index.js';

const app = express();
app.disable('x-powered-by');

/**
 * TRUST PROXY (PRODUCTION SAFE)
 * Required when running behind Render, VPS reverse proxy, Nginx, Docker, Cloudflare
 */
if (config.nodeEnv === 'production') {
    app.set('trust proxy', 1);
}

// Security middleware
app.use(helmet({
    crossOriginResourcePolicy: false,
}));

const allowedOrigins = new Set(config.corsOrigins);
app.use(cors({
    origin: (origin, callback) => {
        // Allow same-origin/non-browser clients (curl, health probes, server-to-server).
        if (!origin) {
            return callback(null, true);
        }

        return callback(null, allowedOrigins.has(origin));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 60 * 60 * 24,
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: config.nodeEnv === 'production' ? 300 : 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please try again later.' },
});
app.use(limiter);

// Body parsing with size limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Root route
app.get('/', (req, res) => {
    res.json({
        message: 'Welcome to Smartifly Backend API',
        status: 'running',
        api_base: '/api',
        health_check: '/health'
    });
});

// Health check with database connectivity
app.get('/health', async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
    } catch {
        res.status(503).json({ status: 'unhealthy', db: 'disconnected', timestamp: new Date().toISOString() });
    }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/portals', portalRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/subscriptions', subscriptionRoutes);

// API info
app.get('/api', (req, res) => {
    res.json({
        name: 'Smartifly Backend API',
        version: '1.0.0',
        endpoints: {
            auth: '/api/auth',
            portals: '/api/portals',
            tickets: '/api/tickets',
            packages: '/api/packages',
            announcements: '/api/announcements',
            settings: '/api/settings',
            notifications: '/api/notifications',
            analytics: '/api/analytics',
            subscriptions: '/api/subscriptions',
        },
    });
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
import http from 'http';
import { initializeSocket } from './socket.js';
import { initializeScheduler } from './scheduler.js';
import { initializeFirebase } from './config/firebase.js';

const server = http.createServer(app);
initializeSocket(server);

server.listen(config.port, () => {
    console.log(`
╔═══════════════════════════════════════════════════╗
║         Smartifly Backend API                     ║
╠═══════════════════════════════════════════════════╣
║  Server:  http://localhost:${config.port}                 ║
║  Mode:    ${config.nodeEnv.padEnd(39)}║
║  API:     http://localhost:${config.port}/api              ║
║  Socket:  Enabled                                 ║
╚═══════════════════════════════════════════════════╝
  `);

    // Initialize scheduled tasks
    initializeScheduler();

    // Initialize Firebase for push notifications
    initializeFirebase();
});

export default app;
