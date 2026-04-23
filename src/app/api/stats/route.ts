import { NextResponse } from 'next/server';
import { getRecordStats } from '@/lib/data/store';

export const runtime = 'nodejs';

// GET /api/stats - 获取统计数据
export async function GET() {
  try {
    const stats = getRecordStats();
    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('获取统计错误:', error);
    return NextResponse.json(
      { success: false, error: '获取统计失败' },
      { status: 500 }
    );
  }
}
