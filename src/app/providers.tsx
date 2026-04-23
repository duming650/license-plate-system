'use client';

import { useEffect } from 'react';
import { AppProvider, useApp } from '@/lib/context';

function AppContent({ children }: { children: React.ReactNode }) {
  const { refreshStats, refreshWhitelist } = useApp();

  useEffect(() => {
    // 初始化加载数据
    refreshStats();
    refreshWhitelist();
    
    // 每30秒刷新统计数据
    const interval = setInterval(refreshStats, 30000);
    return () => clearInterval(interval);
  }, [refreshStats, refreshWhitelist]);

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <AppContent>{children}</AppContent>
    </AppProvider>
  );
}
