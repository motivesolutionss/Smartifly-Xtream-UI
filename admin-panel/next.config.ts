import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for smaller deployments
  output: 'standalone',

  // API rewrites to backend
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
