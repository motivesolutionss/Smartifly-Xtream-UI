import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for smaller deployments
  output: 'export',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
