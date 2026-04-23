'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Stats, WhitelistVehicle, RecognizeResponse } from '@/lib/api';
import { getStats, getWhitelist } from '@/lib/api';

// 车辆类型中文映射
export const VEHICLE_TYPE_NAMES: Record<string, string> = {
  sedan: '轿车',
  suv: 'SUV',
  truck: '货车',
  bus: '客车',
  special: '特种车辆',
  motorcycle: '摩托车',
  unknown: '未知',
};

// 车辆颜色中文映射
export const VEHICLE_COLOR_NAMES: Record<string, string> = {
  white: '白色',
  black: '黑色',
  silver: '银色',
  gray: '灰色',
  red: '红色',
  blue: '蓝色',
  green: '绿色',
  yellow: '黄色',
  orange: '橙色',
  brown: '棕色',
  other: '其他',
};

// 状态中文映射
export const STATUS_NAMES: Record<string, string> = {
  normal: '外部车辆',
  internal: '内部车辆',
  special: '特种车辆',
  unlicensed: '无牌照',
};

// 状态颜色
export const STATUS_COLORS: Record<string, string> = {
  normal: 'bg-blue-100 text-blue-800',
  internal: 'bg-green-100 text-green-800',
  special: 'bg-orange-100 text-orange-800',
  unlicensed: 'bg-gray-100 text-gray-800',
};

// 方向中文映射
export const DIRECTION_NAMES: Record<string, string> = {
  in: '驶入',
  out: '驶出',
};

interface AppContextType {
  stats: Stats | null;
  whitelist: WhitelistVehicle[];
  recentRecords: RecognizeResponse[];
  isLoading: boolean;
  refreshStats: () => Promise<void>;
  refreshWhitelist: () => Promise<void>;
  addRecentRecord: (record: RecognizeResponse) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [whitelist, setWhitelist] = useState<WhitelistVehicle[]>([]);
  const [recentRecords, setRecentRecords] = useState<RecognizeResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refreshStats = useCallback(async () => {
    try {
      const data = await getStats();
      setStats(data);
    } catch (error) {
      console.error('获取统计数据失败:', error);
    }
  }, []);

  const refreshWhitelist = useCallback(async () => {
    try {
      const data = await getWhitelist({ pageSize: 1000 });
      setWhitelist(data.vehicles);
    } catch (error) {
      console.error('获取白名单失败:', error);
    }
  }, []);

  const addRecentRecord = useCallback((record: RecognizeResponse) => {
    setRecentRecords(prev => {
      const newRecords = [record, ...prev];
      return newRecords.slice(0, 50); // 保留最近50条
    });
    // 同时刷新统计
    refreshStats();
  }, [refreshStats]);

  return (
    <AppContext.Provider
      value={{
        stats,
        whitelist,
        recentRecords,
        isLoading,
        refreshStats,
        refreshWhitelist,
        addRecentRecord,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
