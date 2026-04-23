import path from 'path';
import fs from 'fs';
import { RecognitionResult, VehicleType, VehicleColor } from './data/types';
import { isInternalVehicle, generateId } from './data/store';
import { saveBase64Image } from './data/imageStore';
import { callPythonRecognition } from './pythonBridge';

// 模拟模式识别
export async function mockRecognizeVehicle(
  imageBase64: string,
  direction: 'in' | 'out'
): Promise<RecognitionResult> {
  const imageUrl = saveBase64Image(imageBase64, `mock_${direction}`);
  
  // 60%概率没有车辆
  if (Math.random() < 0.6) {
    return {
      plateNumber: null,
      vehicleType: 'unknown',
      color: 'other',
      confidence: 0,
      isSpecial: false,
      hasVehicle: false,
    };
  }

  // 生成随机数据
  const provinces = ['京', '津', '沪', '渝', '冀', '豫', '云', '辽', '黑', '湘', '皖', '鲁', '新', '苏', '浙', '赣', '鄂', '桂', '甘', '晋', '蒙', '陕', '吉', '闽', '贵', '粤', '青', '藏', '川', '宁', '琼'];
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const numbers = '0123456789';

  const province = provinces[Math.floor(Math.random() * provinces.length)];
  const letter = letters[Math.floor(Math.random() * letters.length)];
  const nums = Array.from({length: 5}, () => numbers[Math.floor(Math.random() * numbers.length)]).join('');

  const plateNumber = `${province}${letter}${nums}`;
  const confidence = 60 + Math.random() * 40;
  const types: VehicleType[] = ['sedan', 'suv', 'truck', 'bus', 'motorcycle'];
  const colors: VehicleColor[] = ['white', 'black', 'silver', 'gray', 'red', 'blue', 'green'];
  
  const vehicleType = types[Math.floor(Math.random() * types.length)];
  const color = colors[Math.floor(Math.random() * colors.length)];

  return {
    plateNumber,
    vehicleType,
    color,
    confidence,
    confidencePlate: 70 + Math.random() * 20,
    confidenceType: 60 + Math.random() * 30,
    confidenceColor: 50 + Math.random() * 30,
    isSpecial: vehicleType === 'truck',
    hasVehicle: true,
  };
}

// 主识别函数
export async function recognizeVehicle(
  imageBase64: string,
  direction: 'in' | 'out',
  useMock: boolean = false,
  usePython: boolean = true
): Promise<RecognitionResult & { 
  status: 'normal' | 'internal' | 'special' | 'unlicensed';
  imageUrl: string;
  recordId: string;
}> {
  // 保存图片
  const imageUrl = saveBase64Image(imageBase64, `vehicle_${direction}`);
  const recordId = generateId();

  // 模拟模式
  if (useMock) {
    console.log('[识别] 使用模拟模式');
    const mockResult = await mockRecognizeVehicle(imageBase64, direction);
    
    if (!mockResult.hasVehicle) {
      return { ...mockResult, status: 'normal', imageUrl, recordId };
    }

    const isInternal = mockResult.plateNumber ? isInternalVehicle(mockResult.plateNumber) : false;
    const status: 'normal' | 'internal' | 'special' | 'unlicensed' = 
      isInternal ? 'internal' : mockResult.isSpecial ? 'special' : 'normal';

    return { ...mockResult, status, imageUrl, recordId };
  }

  // Python 脚本模式
  console.log('[识别] 使用 Python 脚本模式');
  
  // 获取实际保存的图片路径
  const filename = path.basename(imageUrl);
  const imagePath = path.join(process.cwd(), 'public', 'uploads', filename);
  
  console.log('[识别] 图片路径:', imagePath);
  
  // 检查图片是否存在
  if (!fs.existsSync(imagePath)) {
    console.log('[识别] 图片不存在，回退到模拟模式');
    return await mockRecognizeVehicle(imageBase64, direction) as any;
  }

  try {
    const result = await callPythonRecognition(imagePath);
    
    if (!result.success || !result.hasVehicle) {
      const msg = result.hasPerson ? '检测到人而非车辆' : '未检测到车辆';
      console.log('[识别]', msg);
      throw new Error(msg);
    }
    
    const plateNumber = result.plateNumber;
    const isInternal = plateNumber ? isInternalVehicle(plateNumber) : false;
    const isSpecial = plateNumber?.includes('货车') || false;
    
    const status: 'normal' | 'internal' | 'special' | 'unlicensed' = 
      isInternal ? 'internal' : isSpecial ? 'special' : 'normal';

    console.log('[识别] 识别成功:', plateNumber);

    return {
      plateNumber: plateNumber || '待识别',
      vehicleType: 'sedan',
      color: 'white',
      confidence: result.confidence || 70,
      confidencePlate: result.confidence || 70,
      confidenceType: 70,
      confidenceColor: 50,
      isSpecial,
      hasVehicle: true,
      status,
      imageUrl,
      recordId,
    };
  } catch (error: any) {
    console.error('[识别] Python 识别失败:', error.message);
    console.log('[识别] 回退到模拟模式');
    return await mockRecognizeVehicle(imageBase64, direction) as any;
  }
}
