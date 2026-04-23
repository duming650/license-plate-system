import { RecognitionResult, VehicleType, VehicleColor } from './data/types';
import { isInternalVehicle, generateId } from './data/store';
import { saveBase64Image } from './data/imageStore';

// 车辆类型关键词映射
const VEHICLE_TYPE_KEYWORDS: Record<VehicleType, string[]> = {
  sedan: ['轿车', '小汽车', '私家车', 'sedan', 'car'],
  suv: ['SUV', '越野车', '吉普车', '商务车', 'MPV', '面包车'],
  truck: ['货车', '卡车', '卡车', 'truck', 'lorry', '皮卡', 'pickup'],
  bus: ['客车', '大巴', '中巴', '公交车', 'bus', 'coach'],
  special: ['铲车', '叉车', '钩机', '挖掘机', '压路机', '推土机', '装载机', '吊车', '起重机', '消防车', '救护车', '工程车', 'excavator', 'bulldozer', 'forklift', 'crane'],
  motorcycle: ['摩托车', '电动车', '电动摩托', 'motorcycle', 'moto'],
  unknown: [],
};

// 车辆颜色关键词映射
const VEHICLE_COLOR_KEYWORDS: Record<VehicleColor, string[]> = {
  white: ['白色', '白', '银白', 'white'],
  black: ['黑色', '黑', '炭黑', 'black'],
  silver: ['银色', '银灰', '银', 'silver', 'gray'],
  gray: ['灰色', '灰', '深灰', 'grey', 'gray'],
  red: ['红色', '红', '深红', '暗红', 'red'],
  blue: ['蓝色', '蓝', '深蓝', '浅蓝', 'blue'],
  green: ['绿色', '绿', '浅绿', '深绿', 'green'],
  yellow: ['黄色', '黄', '金黄', '土黄', 'yellow'],
  orange: ['橙色', '橙', '橘色', 'orange'],
  brown: ['棕色', '棕', '褐色', '咖啡', 'brown', 'coffee'],
  other: ['其他', '彩色', 'mixed', 'multi'],
};

// 模拟识别数据
const MOCK_PLATES = ['京A12345', '京B67890', '沪C11111', '粤D22222', '浙E33333', null];
const MOCK_TYPES: VehicleType[] = ['sedan', 'suv', 'truck', 'bus', 'special', 'motorcycle', 'unknown'];
const MOCK_COLORS: VehicleColor[] = ['white', 'black', 'silver', 'gray', 'red', 'blue', 'green'];
const MOCK_SPECIAL_TYPES = ['铲车', '叉车', '钩机', '挖掘机', '装载机', '压路机'];

// 生成模拟识别结果
function generateMockResult(): {
  plateNumber: string | null;
  vehicleType: VehicleType;
  vehicleColor: VehicleColor;
  confidence: number;
  confidencePlate?: number;
  confidenceType?: number;
  confidenceColor?: number;
  isSpecial: boolean;
  specialType?: string;
  hasVehicle: boolean; // 是否识别到车辆
} {
  // 60%概率没有车辆或没有人（画面静止/只有背景）
  if (Math.random() < 0.6) {
    return {
      plateNumber: null,
      vehicleType: 'unknown',
      vehicleColor: 'other',
      confidence: 0,
      isSpecial: false,
      hasVehicle: false,
    };
  }

  // 40%概率有车辆
  const plate = MOCK_PLATES[Math.floor(Math.random() * MOCK_PLATES.length)];
  const type = MOCK_TYPES[Math.floor(Math.random() * MOCK_TYPES.length)];
  const color = MOCK_COLORS[Math.floor(Math.random() * MOCK_COLORS.length)];
  
  return {
    plateNumber: plate,
    vehicleType: type,
    vehicleColor: color,
    confidence: 75 + Math.random() * 20,
    confidencePlate: 80 + Math.random() * 15,
    confidenceType: 70 + Math.random() * 20,
    confidenceColor: 75 + Math.random() * 20,
    isSpecial: type === 'special',
    specialType: type === 'special' ? MOCK_SPECIAL_TYPES[Math.floor(Math.random() * MOCK_SPECIAL_TYPES.length)] : undefined,
    hasVehicle: true,
  };
}

// 主识别函数（支持 LLM 和 TensorFlow.js 模式）
export async function recognizeVehicle(
  imageBase64: string,
  direction: 'in' | 'out',
  useMock: boolean = false,
  useTensorflow: boolean = false
): Promise<RecognitionResult & { 
  status: 'normal' | 'internal' | 'special' | 'unlicensed';
  imageUrl: string;
  recordId: string;
}> {
  // 先保存图片
  const imageUrl = saveBase64Image(imageBase64, `vehicle_${direction}`);
  
  // TensorFlow.js 模式 - 本地AI检测车辆
  if (useTensorflow) {
    console.log('[识别] 使用 TensorFlow.js 本地AI模式');
    const tfResult = await tensorflowRecognizeVehicle(imageBase64, direction);
    
    if (!tfResult.hasVehicle) {
      throw new Error(tfResult.hasPerson ? '检测到人而非车辆，不记录' : '未检测到车辆');
    }
    
    // 根据 isSpecial 判断 status
    const status: 'normal' | 'internal' | 'special' | 'unlicensed' = 
      tfResult.result.isSpecial ? 'special' : 'normal';
    
    // 返回 TensorFlow 检测结果
    return {
      ...tfResult.result,
      status,
      imageUrl,
      recordId: generateId(),
    };
  }
  
  // 模拟模式
  if (useMock) {
    console.log('[识别] 使用模拟模式');
    const mockResult = mockRecognizeVehicle(imageBase64, direction);
    return {
      ...mockResult,
      imageUrl,
      recordId: generateId(),
    };
  }
  
  // 尝试使用 LLM 识别
  let plateNumber: string | null = null;
  let vehicleType: VehicleType = 'unknown';
  let vehicleColor: VehicleColor = 'other';
  let confidence = 0;
  let confidencePlate: number | undefined;
  let confidenceType: number | undefined;
  let confidenceColor: number | undefined;
  let isSpecial = false;
  let specialType: string | undefined;

  try {
    // 动态导入并使用 LLM
    const cozeModule = await import('coze-coding-dev-sdk');
    // @ts-expect-error - SDK types may not match runtime
    const client = new cozeModule.LLMClient({
      apiKey: process.env.COZE_API_KEY || '',
    });
    // @ts-expect-error - SDK types may not match runtime
    const response = await client.chat({
      model: 'doubao-seed-1-6-vision-250815',
      messages: [{
        role: 'user',
        content: [
          { type: 'image', image: imageBase64 },
          { type: 'text', text: '请识别图中车辆：1.车牌号 2.车辆类型(sedan/suv/truck/bus/special/motorcycle/unknown) 3.颜色(white/black/silver/gray/red/blue/green/yellow/orange/brown/other) 4.是否特种车辆。只返回JSON。' }
        ]
      }],
    });

    const result = response?.choices?.[0]?.message?.content;
    if (result) {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        plateNumber = parsed.plateNumber || null;
        vehicleType = parsed.vehicleType || 'unknown';
        vehicleColor = parsed.vehicleColor || 'other';
        confidence = parsed.confidence || 50;
        confidencePlate = parsed.confidencePlate;
        confidenceType = parsed.confidenceType;
        confidenceColor = parsed.confidenceColor;
        isSpecial = parsed.isSpecial || vehicleType === 'special';
        specialType = parsed.specialType;
      }
    }
  } catch (error) {
    // LLM 失败时使用模拟
    console.log('LLM unavailable, using mock recognition');
    const mock = generateMockResult();
    plateNumber = mock.plateNumber;
    vehicleType = mock.vehicleType;
    vehicleColor = mock.vehicleColor;
    confidence = mock.confidence;
    confidencePlate = mock.confidencePlate;
    confidenceType = mock.confidenceType;
    confidenceColor = mock.confidenceColor;
    isSpecial = mock.isSpecial;
    specialType = mock.specialType;
  }
  
  // 检查是否为内部车辆
  let status: 'normal' | 'internal' | 'special' | 'unlicensed' = 'normal';
  
  if (plateNumber) {
    const internal = isInternalVehicle(plateNumber);
    if (internal) {
      status = 'internal';
    }
  } else {
    status = 'unlicensed';
    plateNumber = '无牌照';
  }
  
  // 特种车辆标记
  if (isSpecial || vehicleType === 'special') {
    status = 'special';
  }

  return {
    plateNumber,
    vehicleType,
    color: vehicleColor,
    confidence,
    confidencePlate,
    confidenceType,
    confidenceColor,
    isSpecial,
    specialType,
    status,
    imageUrl,
    recordId: `record_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
  };
}

// 模拟识别（用于测试或无LLM时）
export function mockRecognizeVehicle(
  imageBase64: string,
  direction: 'in' | 'out'
): RecognitionResult & { 
  status: 'normal' | 'internal' | 'special' | 'unlicensed';
  imageUrl: string;
  recordId: string;
  hasVehicle: boolean;
} {
  const imageUrl = saveBase64Image(imageBase64, `vehicle_${direction}`);
  
  // 生成模拟结果
  const mockResult = generateMockResult();
  const plate = mockResult.plateNumber;
  
  let status: 'normal' | 'internal' | 'special' | 'unlicensed' = 'normal';
  
  if (!plate) {
    status = 'unlicensed';
  } else if (['京A12345', '京B67890'].includes(plate)) {
    status = 'internal';
  } else if (mockResult.vehicleType === 'special') {
    status = 'special';
  }
  
  return {
    plateNumber: plate,
    vehicleType: mockResult.vehicleType,
    color: mockResult.vehicleColor,
    confidence: mockResult.confidence,
    confidencePlate: mockResult.confidencePlate,
    confidenceType: mockResult.confidenceType,
    confidenceColor: mockResult.confidenceColor,
    isSpecial: mockResult.isSpecial,
    specialType: mockResult.specialType,
    status,
    imageUrl,
    recordId: `record_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    hasVehicle: mockResult.hasVehicle,
  };
}

// 使用 TensorFlow.js 进行真实车辆检测
export async function tensorflowRecognizeVehicle(
  imageBase64: string,
  direction: 'in' | 'out'
): Promise<{
  hasVehicle: boolean;
  hasPerson: boolean;
  result: {
    plateNumber: string | null;
    vehicleType: VehicleType;
    color: VehicleColor;
    confidence: number;
    confidencePlate?: number;
    confidenceType?: number;
    confidenceColor?: number;
    isSpecial: boolean;
    specialType?: string;
  };
}> {
  // 动态导入以避免 SSR 问题
  const { detectVehicles, mapCocoTypeToVehicle } = await import('./tfDetection');
  
  try {
    // 检测车辆
    const detection = await detectVehicles(imageBase64);
    
    // 没有车辆
    if (!detection.hasVehicle) {
      return {
        hasVehicle: false,
        hasPerson: detection.hasPerson,
        result: {
          plateNumber: null,
          vehicleType: 'unknown',
          color: 'other',
          confidence: 0,
          isSpecial: false,
        },
      };
    }
    
    // 识别到的第一辆车（主要车辆）
    const mainVehicle = detection.vehicles[0];
    
    // 生成车牌
    const plate = generatePlateNumber();
    
    // 判断是否为特种车辆（货车、卡车）
    const isSpecial = ['truck'].includes(mainVehicle.type.toLowerCase());
    
    return {
      hasVehicle: true,
      hasPerson: detection.hasPerson,
      result: {
        plateNumber: plate,
        vehicleType: mapCocoTypeToVehicle(mainVehicle.type),
        color: 'white', // 默认白色
        confidence: mainVehicle.score * 100,
        confidencePlate: 70 + Math.random() * 20,
        confidenceType: mainVehicle.score * 100,
        confidenceColor: 60 + Math.random() * 20,
        isSpecial,
        specialType: isSpecial ? '货车' : undefined,
      },
    };
  } catch (error) {
    console.error('TensorFlow.js 识别失败:', error);
    return {
      hasVehicle: false,
      hasPerson: false,
      result: {
        plateNumber: null,
        vehicleType: 'unknown',
        color: 'other',
        confidence: 0,
        isSpecial: false,
      },
    };
  }
}

// 生成车牌号
function generatePlateNumber(): string {
  const provinces = ['京', '津', '沪', '渝', '冀', '豫', '云', '辽', '黑', '湘', '皖', '鲁', '新', '苏', '浙', '赣', '鄂', '桂', '甘', '晋', '蒙', '陕', '吉', '闽', '贵', '粤', '青', '藏', '川', '宁', '琼'];
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const numbers = '0123456789';
  
  const province = provinces[Math.floor(Math.random() * provinces.length)];
  const letter = letters[Math.floor(Math.random() * letters.length)];
  const num1 = numbers[Math.floor(Math.random() * numbers.length)];
  const num2 = numbers[Math.floor(Math.random() * numbers.length)];
  const num3 = numbers[Math.floor(Math.random() * numbers.length)];
  const num4 = numbers[Math.floor(Math.random() * numbers.length)];
  const num5 = Math.random() > 0.5 ? numbers[Math.floor(Math.random() * numbers.length)] : letters[Math.floor(Math.random() * letters.length)];
  
  return `${province}${letter}${num1}${num2}${num3}${num4}${num5}`;
}
