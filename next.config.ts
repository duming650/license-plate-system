import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 禁用 Turbopack
  experimental: {
    turbo: undefined,
  },
  // 忽略工作区根目录警告
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
