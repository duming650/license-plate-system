import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 禁用 Turbopack，使用传统的 webpack
  experimental: {
    turbo: undefined,
  },
};

export default nextConfig;
