import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cache.discoversnoop.com' },
      { protocol: 'https', hostname: 'www.boe.es' },
    ],
  },
  experimental: {
    optimizePackageImports: ['marked'],
  },
};

export default nextConfig;
