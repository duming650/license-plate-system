import { NextRequest, NextResponse } from 'next/server';
import { recognizeVehicle, mockRecognizeVehicle, tensorflowRecognizeVehicle } from '@/lib/recognition';
import { saveRecord } from '@/lib/data/store';
import { VehicleRecord } from '@/lib/data/types';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageData, direction, useMock, useTensorflow } = body;

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

    let hasVehicle = false;
    let result: any = null;

    // TensorFlow.js 模式（本地AI，无需API）
    if (useTensorflow) {
      console.log('使用 TensorFlow.js 模式识别');
      const tfResult = await tensorflowRecognizeVehicle(imageData, direction);
      
      if (!tfResult.hasVehicle) {
        // 没有车辆（可能只有人）
        return NextResponse.json({
          success: true,
          data: null,
          message: tfResult.hasPerson ? '检测到人而非车辆' : '未检测到车辆',
          hasVehicle: false,
        });
      }
      
      result = tfResult.result;
      hasVehicle = true;
    }
    // 模拟模式
    else if (useMock) {
      console.log('使用模拟模式识别');
      result = mockRecognizeVehicle(imageData, direction);
      hasVehicle = result.hasVehicle;
      
      if (!hasVehicle) {
        return NextResponse.json({
          success: true,
          data: null,
          message: '未检测到车辆',
          hasVehicle: false,
        });
      }
    }
    // API 模式
    else {
      console.log('使用 API 模式识别');
      result = await recognizeVehicle(imageData, direction);
      hasVehicle = result.hasVehicle;
      
      if (!hasVehicle) {
        return NextResponse.json({
          success: true,
          data: null,
          message: result.message || '未检测到车辆',
          hasVehicle: false,
        });
      }
    }

    // 创建记录
    const record: VehicleRecord = {
      id: result.recordId,
      plateNumber: result.plateNumber || '无牌照',
      vehicleType: result.vehicleType || 'unknown',
      color: result.color || 'other',
      direction: direction as 'in' | 'out',
      status: result.status || 'normal',
      confidence: result.confidence || 0,
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
      hasVehicle: true,
    });
  } catch (error) {
    console.error('识别错误:', error);
    return NextResponse.json(
      { success: false, error: '识别失败，请重试' },
      { status: 500 }
    );
  }
}
