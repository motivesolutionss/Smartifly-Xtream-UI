/** @type {import('next').NextConfig} */

// Bundle analyzer - using createRequire for ES module compatibility
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const withBundleAnalyzer = require('@next/bundle-analyzer')({
    enabled: process.env.ANALYZE === 'true',
});

// Validate critical environment variables at build time
function validateEnvVars() {
    const isProduction = process.env.NODE_ENV === 'production';
    const requiredVars = ['NEXT_PUBLIC_API_URL'];
    const missingVars = [];

    for (const varName of requiredVars) {
        if (!process.env[varName]) {
            missingVars.push(varName);
        }
    }

    if (missingVars.length > 0) {
        if (isProduction) {
            throw new Error(
                `❌ CRITICAL: Missing required environment variables for production build:\n` +
                missingVars.map(v => `  - ${v}`).join('\n') +
                `\n\nPlease set these variables in your environment or .env file before building.`
            );
        } else {
            console.warn(
                `⚠️  WARNING: Missing environment variables (using defaults):\n` +
                missingVars.map(v => `  - ${v}`).join('\n')
            );
        }
    }
}

// Run validation
validateEnvVars();

const isDev = process.env.NODE_ENV !== 'production';
const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

let apiOrigin = '';
if (apiUrl) {
    try {
        apiOrigin = new URL(apiUrl).origin;
    } catch {
        apiOrigin = '';
    }
}

const connectSrc = [
    "'self'",
    'https:',
    'wss:',
    ...(isDev ? ['http:', 'ws:'] : []),
    ...(apiOrigin ? [apiOrigin] : []),
].join(' ');

const contentSecurityPolicy = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https:",
    "media-src 'self' blob: https:",
    `connect-src ${connectSrc}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
].join('; ');

const securityHeaders = [
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    { key: 'Content-Security-Policy', value: contentSecurityPolicy },
];

const nextConfig = {
    output: "standalone",
    images: {
        unoptimized: true,
    },
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: securityHeaders,
            },
        ];
    },
};

export default withBundleAnalyzer(nextConfig);
