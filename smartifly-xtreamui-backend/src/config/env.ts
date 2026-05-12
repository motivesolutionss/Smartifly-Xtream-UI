import 'dotenv/config';

function requireEnv(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing required environment variable: ${key}`);
  return v;
}

interface Env {
  NODE_ENV: string;
  DATABASE_URL: string;

  JWT_SECRET: string;
  jwtAccessSecret: string;
  jwtRefreshSecret: string;
  jwtAccessExpiresIn: string;        // ✅ always string for jwt.sign()
  jwtRefreshExpiresInDays: number;

  // License key config
  licenseKeyMode: 'UUID' | 'HMAC';
  licenseKeySecret: string;
  licenseKeyPrefix: string;
  licenseKeySize: number;

  // SMTP Email Config
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPass: string;
  googleClientId: string | null;
  googleClientSecret: string | null;

  // 🔐 Config encryption key for /v1/public/config
  configEncryptionKey: string;
}

export const env: Env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',

  DATABASE_URL: requireEnv('DATABASE_URL'),

  JWT_SECRET: requireEnv('JWT_SECRET'),
  jwtAccessSecret: requireEnv('JWT_ACCESS_SECRET'),
  jwtRefreshSecret: requireEnv('JWT_REFRESH_SECRET'),

  // e.g. "15m", "1h", "900" — always as string
  jwtAccessExpiresIn: requireEnv('JWT_ACCESS_EXPIRES_IN'),

  jwtRefreshExpiresInDays: Number(
    process.env.JWT_REFRESH_EXPIRES_IN_DAYS ?? 7,
  ),

  // License key config
  licenseKeyMode: (process.env.LICENSE_KEY_MODE as 'UUID' | 'HMAC') ?? 'HMAC',
  licenseKeySecret:
    process.env.LICENSE_KEY_SECRET ?? requireEnv('JWT_REFRESH_SECRET'),
  licenseKeyPrefix: process.env.LICENSE_KEY_PREFIX ?? 'GF',
  licenseKeySize: Number(process.env.LICENSE_KEY_SIZE ?? 20),

  // SMTP Email Config
  smtpHost: requireEnv('SMTP_HOST'),
  smtpPort: Number(process.env.SMTP_PORT ?? 587),
  smtpSecure: process.env.SMTP_SECURE === 'true',
  smtpUser: requireEnv('SMTP_USER'),
  smtpPass: requireEnv('SMTP_PASS'),
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? null,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? null,

  // 🔐 Config Encryption Key
  configEncryptionKey:
    process.env.CONFIG_ENCRYPTION_KEY ??
    (process.env.NODE_ENV === 'development'
      ? 'dev-only-config-key-change-before-deploy'
      : requireEnv('CONFIG_ENCRYPTION_KEY')),
};
