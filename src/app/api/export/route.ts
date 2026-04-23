import { NextRequest, NextResponse } from 'next/server';
import { queryRecords } from '@/lib/data/store';
import { RecordsQuery, VehicleType } from '@/lib/data/types';

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

// 生成 CSV 内容
function generateCSV(records: any[]): string {
  const headers = [
    '序号',
    '通行时间',
    '车牌号',
    '车辆类型',
    '车辆颜色',
    '通行方向',
    '车辆状态',
    '置信度',
    '备注',
  ];

  const rows = records.map((record, index) => [
    index + 1,
    new Date(record.createdAt).toLocaleString('zh-CN'),
    record.plateNumber,
    VEHICLE_TYPE_NAMES[record.vehicleType] || record.vehicleType,
    VEHICLE_COLOR_NAMES[record.color] || record.color,
    DIRECTION_NAMES[record.direction] || record.direction,
    STATUS_NAMES[record.status] || record.status,
    `${record.confidence.toFixed(1)}%`,
    record.remark || '',
  ]);

  // 转义 CSV 值
  const escapeCSV = (value: any): string => {
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvContent = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => row.map(escapeCSV).join(',')),
  ].join('\n');

  // 添加 BOM 以支持 Excel 正确显示中文
  return '\uFEFF' + csvContent;
}

// 生成 HTML 表格（用于预览）
function generateHTML(records: any[]): string {
  const rows = records.map(record => `
    <tr>
      <td>${new Date(record.createdAt).toLocaleString('zh-CN')}</td>
      <td>${record.plateNumber}</td>
      <td>${VEHICLE_TYPE_NAMES[record.vehicleType] || record.vehicleType}</td>
      <td>${VEHICLE_COLOR_NAMES[record.color] || record.color}</td>
      <td>${DIRECTION_NAMES[record.direction] || record.direction}</td>
      <td>${STATUS_NAMES[record.status] || record.status}</td>
      <td>${record.confidence.toFixed(1)}%</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>车辆通行记录</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #4CAF50; color: white; }
        tr:nth-child(even) { background-color: #f2f2f2; }
      </style>
    </head>
    <body>
      <h1>车辆通行记录导出</h1>
      <p>导出时间: ${new Date().toLocaleString('zh-CN')}</p>
      <p>记录数量: ${records.length} 条</p>
      <table>
        <thead>
          <tr>
            <th>通行时间</th>
            <th>车牌号</th>
            <th>车辆类型</th>
            <th>车辆颜色</th>
            <th>通行方向</th>
            <th>车辆状态</th>
            <th>置信度</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </body>
    </html>
  `;
}

// GET /api/export - 导出记录
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const query: RecordsQuery = {
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      direction: searchParams.get('direction') as 'in' | 'out' | undefined,
      status: searchParams.get('status') as 'normal' | 'internal' | 'special' | 'unlicensed' | undefined,
      plateNumber: searchParams.get('plateNumber') || undefined,
      vehicleType: searchParams.get('vehicleType') as VehicleType | undefined,
    };

    const format = searchParams.get('format') || 'csv';
    const maxRecords = parseInt(searchParams.get('maxRecords') || '10000');

    // 获取所有符合条件的记录（不分页）
    const result = queryRecords({ ...query, pageSize: maxRecords });

    if (format === 'html') {
      // 返回 HTML 预览
      const html = generateHTML(result.records);
      return new NextResponse(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
      });
    }

    // 默认返回 CSV
    const csv = generateCSV(result.records);
    const filename = `车辆通行记录_${new Date().toISOString().split('T')[0]}.csv`;

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('导出错误:', error);
    return NextResponse.json(
      { success: false, error: '导出失败' },
      { status: 500 }
    );
  }
}
