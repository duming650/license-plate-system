import { NextRequest, NextResponse } from 'next/server';
import { 
  queryWhitelist, 
  addWhitelist, 
  updateWhitelist, 
  deleteWhitelist,
  importWhitelist 
} from '@/lib/data/store';
import { WhitelistQuery, WhitelistVehicle, VehicleType } from '@/lib/data/types';

export const runtime = 'nodejs';

// GET /api/whitelist - 查询白名单
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const query: WhitelistQuery = {
      page: parseInt(searchParams.get('page') || '1'),
      pageSize: parseInt(searchParams.get('pageSize') || '20'),
      plateNumber: searchParams.get('plateNumber') || undefined,
      vehicleType: searchParams.get('vehicleType') as VehicleType | undefined,
    };

    const result = queryWhitelist(query);

    return NextResponse.json({
      success: true,
      data: {
        vehicles: result.vehicles,
        total: result.total,
        page: query.page,
        pageSize: query.pageSize,
      },
    });
  } catch (error) {
    console.error('查询白名单错误:', error);
    return NextResponse.json(
      { success: false, error: '查询失败' },
      { status: 500 }
    );
  }
}

// POST /api/whitelist - 添加白名单
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { plateNumber, vehicleType, color, brand, owner, department, remark } = body;

    if (!plateNumber || !vehicleType) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数：plateNumber 和 vehicleType' },
        { status: 400 }
      );
    }

    const vehicle = addWhitelist({
      plateNumber: plateNumber.toUpperCase(),
      vehicleType,
      color: color || 'other',
      brand,
      owner,
      department,
      remark,
    });

    return NextResponse.json({
      success: true,
      data: vehicle,
    });
  } catch (error) {
    console.error('添加白名单错误:', error);
    return NextResponse.json(
      { success: false, error: '添加失败' },
      { status: 500 }
    );
  }
}

// PUT /api/whitelist - 更新白名单
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少记录ID' },
        { status: 400 }
      );
    }

    const vehicle = updateWhitelist(id, updates);

    if (!vehicle) {
      return NextResponse.json(
        { success: false, error: '记录不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: vehicle,
    });
  } catch (error) {
    console.error('更新白名单错误:', error);
    return NextResponse.json(
      { success: false, error: '更新失败' },
      { status: 500 }
    );
  }
}

// DELETE /api/whitelist - 删除白名单
export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少记录ID' },
        { status: 400 }
      );
    }

    const success = deleteWhitelist(id);

    if (!success) {
      return NextResponse.json(
        { success: false, error: '记录不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除白名单错误:', error);
    return NextResponse.json(
      { success: false, error: '删除失败' },
      { status: 500 }
    );
  }
}

// POST /api/whitelist/import - 批量导入
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { vehicles } = body;

    if (!Array.isArray(vehicles) || vehicles.length === 0) {
      return NextResponse.json(
        { success: false, error: '请提供要导入的车辆列表' },
        { status: 400 }
      );
    }

    const result = importWhitelist(vehicles);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('导入白名单错误:', error);
    return NextResponse.json(
      { success: false, error: '导入失败' },
      { status: 500 }
    );
  }
}
