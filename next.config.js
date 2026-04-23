/** @type {import('next').NextConfig} */
const nextConfig = {
  // 禁用 Turbopack（Windows 不兼容）
  experimental: {},
  // 忽略构建警告
  typescript: {
    ignoreBuildErrors: false,
  },
};

module.exports = nextConfig;
