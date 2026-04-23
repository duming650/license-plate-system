import type { Metadata } from 'next';
import { Inspector } from 'react-dev-inspector';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: {
    default: '车牌识别系统',
    template: '%s | 车牌识别系统',
  },
  description: '智能车牌识别系统，支持内部车辆管理、通行记录、电子表格导出',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-gray-50">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
