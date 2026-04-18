import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  /* config options here */
  allowedDevOrigins: ['10.0.1.34'],
};

export default nextConfig;
