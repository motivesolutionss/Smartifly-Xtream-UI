import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

// Environment validation schema
const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().optional(), // Render injects this
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters for security'),
    JWT_EXPIRES_IN: z.string().default('15m'),
    REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),
    FIREBASE_PROJECT_ID: z.string().optional(),
    FIREBASE_PRIVATE_KEY: z.string().optional(),
    FIREBASE_CLIENT_EMAIL: z.string().optional(),
    ADMIN_EMAIL: z.string().email().default('admin@smartifly.com'),
    ADMIN_PASSWORD: z.string().min(6).default('admin123'),
    CORS_ORIGINS: z.string().default('http://localhost:5000'),

    // PostgreSQL Tools
    PG_DUMP_PATH: z.string().optional(),
    PSQL_PATH: z.string().optional(),

    // Email Configuration
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.string().optional(),
    SMTP_SECURE: z.string().optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    SMTP_FROM: z.string().email().optional(),

    // Frontend URL
    FRONTEND_URL: z.string().optional(),
});

// Validate environment variables at startup
const validateEnv = () => {
    try {
        return envSchema.parse(process.env);
    } catch (error) {
        if (error instanceof z.ZodError) {
            const issues = error.issues
                .map(i => `  - ${i.path.join('.')}: ${i.message}`)
                .join('\n');
            console.error('\n❌ Environment validation failed:\n' + issues + '\n');
            process.exit(1);
        }
        throw error;
    }
};

const env = validateEnv();

export const config = {
    // Server (Render-safe)
    port: Number(env.PORT) || 3001,

    nodeEnv: env.NODE_ENV,

    // Database
    databaseUrl: env.DATABASE_URL,

    // JWT
    jwtSecret: env.JWT_SECRET,
    jwtExpiresIn: env.JWT_EXPIRES_IN,
    refreshTokenExpiresIn: env.REFRESH_TOKEN_EXPIRES_IN,

    // Firebase
    firebase: {
        projectId: env.FIREBASE_PROJECT_ID,
        privateKey: env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
    },

    // Admin setup
    adminEmail: env.ADMIN_EMAIL,
    adminPassword: env.ADMIN_PASSWORD,

    // CORS (trimmed + safe)
    corsOrigins: env.CORS_ORIGINS
        .split(',')
        .map(o => o.trim())
        .filter(Boolean),

    // App constants
    maxPortals: 5,

    // PostgreSQL Tools
    pgDumpPath: env.PG_DUMP_PATH || 'pg_dump',
    psqlPath: env.PSQL_PATH || 'psql',

    // Email Configuration
    smtp: {
        host: env.SMTP_HOST,
        port: env.SMTP_PORT ? parseInt(env.SMTP_PORT, 10) : 587,
        secure: env.SMTP_SECURE === 'true',
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
        from: env.SMTP_FROM || env.SMTP_USER || 'noreply@smartifly.com',
    },

    // Frontend URL
    frontendUrl: (() => {
        const url = env.FRONTEND_URL || 'http://localhost:3002';
        const firstUrl = url.split(',')[0].trim();
        if (!firstUrl.startsWith('http://') && !firstUrl.startsWith('https://')) {
            return `http://${firstUrl}`;
        }
        return firstUrl;
    })(),
};
