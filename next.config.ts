import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 忽略构建错误
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
