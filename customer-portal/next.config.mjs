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
    const requiredVars = ['NEXT_PUBLIC_BACKEND_URL'];
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

const nextConfig = {
    output: "standalone",
    images: {
        unoptimized: true,
    },
};

export default withBundleAnalyzer(nextConfig);
