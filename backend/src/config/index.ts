import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().optional(),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters for security'),
    JWT_EXPIRES_IN: z.string().default('15m'),
    REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),
    FIREBASE_PROJECT_ID: z.string().optional(),
    FIREBASE_PRIVATE_KEY: z.string().optional(),
    FIREBASE_CLIENT_EMAIL: z.string().optional(),
    ADMIN_EMAIL: z.string().email().default('admin@smartifly.com'),
    ADMIN_PASSWORD: z.string().min(12, 'ADMIN_PASSWORD must be at least 12 characters'),
    CORS_ORIGINS: z.string().default('http://localhost:5000'),
    PG_DUMP_PATH: z.string().optional(),
    PSQL_PATH: z.string().optional(),
    BREVO_API_KEY: z.string().min(1, 'BREVO_API_KEY is required'),
    SMTP_FROM: z.string().email().optional(),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.string().optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    SMTP_SECURE: z.string().optional(),
    FRONTEND_URL: z.string().optional(),
});

const validateEnv = () => {
    try {
        const parsedEnv = envSchema.parse(process.env);

        if (parsedEnv.NODE_ENV === 'production') {
            const weakAdminPasswords = new Set([
                'admin123',
                'admin123!',
                'password',
                'changeme',
                'change_me_strong_admin_password',
            ]);

            if (weakAdminPasswords.has(parsedEnv.ADMIN_PASSWORD.toLowerCase())) {
                throw new Error('ADMIN_PASSWORD is using an insecure default value');
            }

            const origins = parsedEnv.CORS_ORIGINS.split(',').map(o => o.trim());
            if (origins.includes('*')) {
                throw new Error('CORS_ORIGINS cannot contain wildcard (*) in production');
            }
        }

        return parsedEnv;
    } catch (error) {
        if (error instanceof z.ZodError) {
            const issues = error.issues
                .map(i => `  - ${i.path.join('.')}: ${i.message}`)
                .join('\n');
            console.error('\nEnvironment validation failed:\n' + issues + '\n');
            process.exit(1);
        }

        if (error instanceof Error) {
            console.error(`\nEnvironment validation failed:\n  - ${error.message}\n`);
            process.exit(1);
        }

        throw error;
    }
};

const env = validateEnv();

export const config = {
    port: Number(env.PORT) || 3001,
    nodeEnv: env.NODE_ENV,
    databaseUrl: env.DATABASE_URL,
    jwtSecret: env.JWT_SECRET,
    jwtExpiresIn: env.JWT_EXPIRES_IN,
    refreshTokenExpiresIn: env.REFRESH_TOKEN_EXPIRES_IN,

    firebase: {
        projectId: env.FIREBASE_PROJECT_ID,
        privateKey: env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
    },

    adminEmail: env.ADMIN_EMAIL,
    adminPassword: env.ADMIN_PASSWORD,

    corsOrigins: env.CORS_ORIGINS
        .split(',')
        .map(o => o.trim())
        .filter(Boolean),

    maxPortals: 5,
    pgDumpPath: env.PG_DUMP_PATH || 'pg_dump',
    psqlPath: env.PSQL_PATH || 'psql',

    brevoApiKey: env.BREVO_API_KEY,
    fromEmail: env.SMTP_FROM || 'noreply@smartifly.com',
    smtpHost: env.SMTP_HOST || 'smtp-relay.brevo.com',
    smtpPort: Number(env.SMTP_PORT) || 587,
    smtpUser: env.SMTP_USER,
    smtpPass: env.SMTP_PASS,
    smtpSecure: (env.SMTP_SECURE || 'false').toLowerCase() === 'true',

    frontendUrl: (() => {
        const url = env.FRONTEND_URL || 'http://localhost:3002';
        const firstUrl = url.split(',')[0].trim();
        if (!firstUrl.startsWith('http://') && !firstUrl.startsWith('https://')) {
            return `http://${firstUrl}`;
        }
        return firstUrl;
    })(),
};
