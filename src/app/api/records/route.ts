import { NextRequest, NextResponse } from 'next/server';
import { queryRecords, deleteRecord } from '@/lib/data/store';
import { RecordsQuery, VehicleType } from '@/lib/data/types';

export const runtime = 'nodejs';

// GET /api/records - 查询记录列表
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const query: RecordsQuery = {
      page: parseInt(searchParams.get('page') || '1'),
      pageSize: parseInt(searchParams.get('pageSize') || '20'),
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      direction: searchParams.get('direction') as 'in' | 'out' | undefined,
      status: searchParams.get('status') as 'normal' | 'internal' | 'special' | 'unlicensed' | undefined,
      plateNumber: searchParams.get('plateNumber') || undefined,
      vehicleType: searchParams.get('vehicleType') as VehicleType | undefined,
    };

    const result = queryRecords(query);

    return NextResponse.json({
      success: true,
      data: {
        records: result.records,
        total: result.total,
        page: query.page,
        pageSize: query.pageSize,
      },
    });
  } catch (error) {
    console.error('查询记录错误:', error);
    return NextResponse.json(
      { success: false, error: '查询失败' },
      { status: 500 }
    );
  }
}

// DELETE /api/records - 删除记录
export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少记录ID' },
        { status: 400 }
      );
    }

    const success = deleteRecord(id);

    if (!success) {
      return NextResponse.json(
        { success: false, error: '记录不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除记录错误:', error);
    return NextResponse.json(
      { success: false, error: '删除失败' },
      { status: 500 }
    );
  }
}
