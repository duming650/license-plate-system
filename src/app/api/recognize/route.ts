import { NextRequest, NextResponse } from 'next/server';
import { recognizeVehicle, mockRecognizeVehicle } from '@/lib/recognition';
import { saveRecord, generateId } from '@/lib/data/store';
import { VehicleRecord } from '@/lib/data/types';

export const runtime = 'nodejs';

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

    // 识别车辆（支持模拟模式用于测试）
    const result = useMock 
      ? mockRecognizeVehicle(imageData, direction)
      : await recognizeVehicle(imageData, direction);

    // 创建记录
    const record: VehicleRecord = {
      id: result.recordId,
      plateNumber: result.plateNumber || '无牌照',
      vehicleType: result.vehicleType,
      color: result.color,
      direction: direction as 'in' | 'out',
      status: result.status,
      confidence: result.confidence,
      confidencePlate: result.confidencePlate,
      confidenceType: result.confidenceType,
      confidenceColor: result.confidenceColor,
      imageUrl: result.imageUrl,
      remark: result.isSpecial ? `特种车辆：${result.specialType || result.vehicleType}` : undefined,
      createdAt: new Date().toISOString(),
    };

    // 保存记录
    saveRecord(record);

    return NextResponse.json({
      success: true,
      data: record,
    });
  } catch (error) {
    console.error('识别错误:', error);
    return NextResponse.json(
      { success: false, error: '识别失败，请重试' },
      { status: 500 }
    );
  }
}
