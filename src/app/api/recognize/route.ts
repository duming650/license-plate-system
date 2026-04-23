import { NextRequest, NextResponse } from 'next/server';
import { recognizeVehicle, getPythonStatus } from '@/lib/recognition';
import { saveRecord } from '@/lib/data/store';
import { VehicleRecord } from '@/lib/data/types';

export const runtime = 'nodejs';

// GET: 检查 Python 环境
export async function GET() {
  try {
    const pythonStatus = await getPythonStatus();
    return NextResponse.json({
      success: true,
      python: pythonStatus,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    });
  }
}

// POST: 执行识别
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageData, direction, useMock } = body;

    if (!imageData || !direction) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数：imageData 和 direction' },
        { status: 400 }
      );
    }

    if (!['in', 'out'].includes(direction)) {
      return NextResponse.json(
        { success: false, error: 'direction 必须是 in 或 out' },
        { status: 400 }
      );
    }

    // 调用识别函数
    // useMock=true 使用模拟模式，useMock=false 使用 Python 脚本模式
    const result = await recognizeVehicle(imageData, direction, useMock === true, true);
    
    // 检查是否识别到车辆
    if (!result.hasVehicle) {
      return NextResponse.json({
        success: true,
        data: null,
        message: '未检测到车辆',
        hasVehicle: false,
      });
    }

    // 保存记录
    const record: VehicleRecord = {
      id: result.recordId,
      plateNumber: result.plateNumber || '无牌照',
      vehicleType: result.vehicleType,
      color: result.color,
      direction,
      status: result.status,
      confidence: result.confidence,
      imageUrl: result.imageUrl,
      confidencePlate: result.confidencePlate,
      confidenceType: result.confidenceType,
      confidenceColor: result.confidenceColor,
      remark: result.specialType,
      createdAt: new Date().toISOString(),
    };
    
    await saveRecord(record);

    return NextResponse.json({
      success: true,
      data: record,
      hasVehicle: true,
    });
  } catch (error: any) {
    console.error('识别失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '识别失败' },
      { status: 500 }
    );
  }
}
