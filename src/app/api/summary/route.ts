import { NextRequest, NextResponse } from 'next/server';
import { getAllRecords } from '@/lib/data/store';
import * as XLSX from 'xlsx';

export const runtime = 'nodejs';

// 车辆类型中文映射
const VEHICLE_TYPE_NAMES: Record<string, string> = {
  sedan: '轿车',
  suv: 'SUV/越野车',
  truck: '货车/卡车',
  bus: '客车',
  special: '特种车辆',
  motorcycle: '摩托车',
  unknown: '未知',
};

// 车辆颜色中文映射
const VEHICLE_COLOR_NAMES: Record<string, string> = {
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
const STATUS_NAMES: Record<string, string> = {
  normal: '外部车辆',
  internal: '内部车辆',
  special: '特种车辆',
  unlicensed: '无牌照',
};

// 方向中文映射
const DIRECTION_NAMES: Record<string, string> = {
  in: '驶入',
  out: '驶出',
};

// 生成汇总数据
function generateSummary(records: any[], startDate?: string, endDate?: string) {
  // 过滤日期范围
  let filteredRecords = records;
  if (startDate) {
    filteredRecords = filteredRecords.filter(r => r.createdAt >= startDate);
  }
  if (endDate) {
    filteredRecords = filteredRecords.filter(r => r.createdAt <= endDate);
  }

  // 1. 总体统计
  const totalCount = filteredRecords.length;
  const today = new Date().toDateString();
  const todayCount = filteredRecords.filter(r => 
    new Date(r.createdAt).toDateString() === today
  ).length;

  // 2. 按状态统计
  const statusStats = {
    internal: filteredRecords.filter(r => r.status === 'internal').length,
    normal: filteredRecords.filter(r => r.status === 'normal').length,
    special: filteredRecords.filter(r => r.status === 'special').length,
    unlicensed: filteredRecords.filter(r => r.status === 'unlicensed').length,
  };

  // 3. 按车辆类型统计
  const typeStats: Record<string, number> = {};
  Object.keys(VEHICLE_TYPE_NAMES).forEach(type => {
    typeStats[type] = filteredRecords.filter(r => r.vehicleType === type).length;
  });

  // 4. 按车辆颜色统计
  const colorStats: Record<string, number> = {};
  Object.keys(VEHICLE_COLOR_NAMES).forEach(color => {
    colorStats[color] = filteredRecords.filter(r => r.color === color).length;
  });

  // 5. 按方向统计
  const directionStats = {
    in: filteredRecords.filter(r => r.direction === 'in').length,
    out: filteredRecords.filter(r => r.direction === 'out').length,
  };

  // 6. 按日统计（最近30天）
  const dailyStats: Record<string, { in: number; out: number; total: number }> = {};
  const last30Days = new Date();
  for (let i = 29; i >= 0; i--) {
    const date = new Date(last30Days);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    dailyStats[dateStr] = { in: 0, out: 0, total: 0 };
  }

  filteredRecords.forEach(record => {
    const dateStr = record.createdAt.split('T')[0];
    if (dailyStats[dateStr]) {
      const dir = record.direction as 'in' | 'out';
      dailyStats[dateStr][dir]++;
      dailyStats[dateStr].total++;
    }
  });

  // 7. 按小时统计（今日）
  const hourlyStats: Record<number, { in: number; out: number; total: number }> = {};
  for (let i = 0; i < 24; i++) {
    hourlyStats[i] = { in: 0, out: 0, total: 0 };
  }

  filteredRecords
    .filter(r => new Date(r.createdAt).toDateString() === today)
    .forEach(record => {
      const hour = new Date(record.createdAt).getHours();
      const dir = record.direction as 'in' | 'out';
      hourlyStats[hour][dir]++;
      hourlyStats[hour].total++;
    });

  // 8. 内部车辆明细
  const internalRecords = filteredRecords.filter(r => r.status === 'internal');

  return {
    summary: {
      totalCount,
      todayCount,
      startDate: startDate || '全部',
      endDate: endDate || '全部',
      generatedAt: new Date().toISOString(),
    },
    statusStats,
    typeStats,
    colorStats,
    directionStats,
    dailyStats,
    hourlyStats,
    internalRecords,
  };
}

// 生成 Excel 文件
function generateExcel(summary: ReturnType<typeof generateSummary>) {
  const wb = XLSX.utils.book_new();

  // 1. 总体统计表
  const overviewData = [
    ['车牌识别系统 - 通行汇总报表'],
    [],
    ['统计周期', `${summary.summary.startDate} 至 ${summary.summary.endDate}`],
    ['生成时间', summary.summary.generatedAt],
    [],
    ['指标', '数量', '说明'],
    ['总通行次数', summary.summary.totalCount, ''],
    ['今日通行', summary.summary.todayCount, ''],
    [],
    ['按状态统计', '', ''],
    ['内部车辆', summary.statusStats.internal, '白名单车辆'],
    ['外部车辆', summary.statusStats.normal, '普通车辆'],
    ['特种车辆', summary.statusStats.special, '铲车/叉车等'],
    ['无牌照车辆', summary.statusStats.unlicensed, '未能识别车牌'],
    [],
    ['按方向统计', '', ''],
    ['驶入', summary.directionStats.in, ''],
    ['驶出', summary.directionStats.out, ''],
  ];
  const overviewWs = XLSX.utils.aoa_to_sheet(overviewData);
  overviewWs['!cols'] = [{ wch: 15 }, { wch: 12 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, overviewWs, '总体统计');

  // 2. 按日统计表
  const dailyData: (string | number)[][] = [
    ['日期', '驶入', '驶出', '合计'],
  ];
  Object.entries(summary.dailyStats as Record<string, { in: number; out: number; total: number }>)
    .sort(([a], [b]) => (a as string).localeCompare(b as string))
    .forEach(([date, stats]) => {
    dailyData.push([date, stats.in, stats.out, stats.total]);
  });
  const dailyWs = XLSX.utils.aoa_to_sheet(dailyData);
  dailyWs['!cols'] = [{ wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, dailyWs, '按日统计');

  // 3. 按小时统计表（今日）
  const hourlyData: (string | number)[][] = [
    ['小时', '驶入', '驶出', '合计'],
  ];
  for (let i = 0; i < 24; i++) {
    const stats = summary.hourlyStats[i as unknown as number] || { in: 0, out: 0, total: 0 };
    hourlyData.push([`${i.toString().padStart(2, '0')}:00`, stats.in, stats.out, stats.total]);
  }
  const hourlyWs = XLSX.utils.aoa_to_sheet(hourlyData);
  hourlyWs['!cols'] = [{ wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, hourlyWs, '按时段统计');

  // 4. 按车辆类型统计
  const typeData = [
    ['车辆类型', '数量', '占比'],
    ['轿车', summary.typeStats.sedan || 0, `${((summary.typeStats.sedan || 0) / summary.summary.totalCount * 100).toFixed(1)}%`],
    ['SUV/越野车', summary.typeStats.suv || 0, `${((summary.typeStats.suv || 0) / summary.summary.totalCount * 100).toFixed(1)}%`],
    ['货车/卡车', summary.typeStats.truck || 0, `${((summary.typeStats.truck || 0) / summary.summary.totalCount * 100).toFixed(1)}%`],
    ['客车', summary.typeStats.bus || 0, `${((summary.typeStats.bus || 0) / summary.summary.totalCount * 100).toFixed(1)}%`],
    ['特种车辆', summary.typeStats.special || 0, `${((summary.typeStats.special || 0) / summary.summary.totalCount * 100).toFixed(1)}%`],
    ['摩托车', summary.typeStats.motorcycle || 0, `${((summary.typeStats.motorcycle || 0) / summary.summary.totalCount * 100).toFixed(1)}%`],
    ['未知', summary.typeStats.unknown || 0, `${((summary.typeStats.unknown || 0) / summary.summary.totalCount * 100).toFixed(1)}%`],
  ];
  const typeWs = XLSX.utils.aoa_to_sheet(typeData);
  typeWs['!cols'] = [{ wch: 15 }, { wch: 12 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, typeWs, '按车辆类型');

  // 5. 按车辆颜色统计
  const colorData = [
    ['颜色', '数量', '占比'],
    ['白色', summary.colorStats.white || 0, ''],
    ['黑色', summary.colorStats.black || 0, ''],
    ['银色', summary.colorStats.silver || 0, ''],
    ['灰色', summary.colorStats.gray || 0, ''],
    ['红色', summary.colorStats.red || 0, ''],
    ['蓝色', summary.colorStats.blue || 0, ''],
    ['绿色', summary.colorStats.green || 0, ''],
    ['黄色', summary.colorStats.yellow || 0, ''],
    ['橙色', summary.colorStats.orange || 0, ''],
    ['棕色', summary.colorStats.brown || 0, ''],
    ['其他', summary.colorStats.other || 0, ''],
  ];
  colorData.forEach((row, idx) => {
    if (idx > 0 && summary.summary.totalCount > 0) {
      const count = parseInt(row[1] as string) || 0;
      row[2] = `${(count / summary.summary.totalCount * 100).toFixed(1)}%`;
    }
  });
  const colorWs = XLSX.utils.aoa_to_sheet(colorData);
  colorWs['!cols'] = [{ wch: 12 }, { wch: 12 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, colorWs, '按车辆颜色');

  // 6. 内部车辆明细
  if (summary.internalRecords.length > 0) {
    const internalData = [
      ['车牌号', '车辆类型', '颜色', '通行时间', '方向'],
    ];
    summary.internalRecords.forEach(record => {
      internalData.push([
        record.plateNumber,
        VEHICLE_TYPE_NAMES[record.vehicleType] || record.vehicleType,
        VEHICLE_COLOR_NAMES[record.color] || record.color,
        new Date(record.createdAt).toLocaleString('zh-CN'),
        DIRECTION_NAMES[record.direction],
      ]);
    });
    const internalWs = XLSX.utils.aoa_to_sheet(internalData);
    internalWs['!cols'] = [{ wch: 15 }, { wch: 12 }, { wch: 10 }, { wch: 20 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, internalWs, '内部车辆明细');
  }

  return XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
}

// GET /api/summary - 获取汇总数据
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const format = searchParams.get('format') || 'json';

    const records = getAllRecords();
    const summary = generateSummary(records, startDate, endDate);

    if (format === 'xlsx' || format === 'excel') {
      const excelBuffer = generateExcel(summary);
      const filename = `通行汇总报表_${new Date().toISOString().split('T')[0]}.xlsx`;

      return new NextResponse(excelBuffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error('获取汇总数据错误:', error);
    return NextResponse.json(
      { success: false, error: '获取汇总数据失败' },
      { status: 500 }
    );
  }
}
