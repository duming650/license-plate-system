import path from 'path';
import fs from 'fs';
import { RecognitionResult, VehicleType, VehicleColor } from './data/types';
import { isInternalVehicle, generateId } from './data/store';
import { saveBase64Image } from './data/imageStore';
import { callPythonRecognition, checkPythonEnv } from './pythonBridge';

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

// 判断是否为特种车辆
function isSpecialVehicle(text: string): boolean {
  const specialKeywords = ['铲车', '叉车', '钩机', '挖掘机', '压路机', '推土机', '装载机', '吊车', '起重机', '消防车', '救护车', '工程车', 'excavator', 'bulldozer', 'forklift', 'crane', 'tractor'];
  const lowerText = text.toLowerCase();
  return specialKeywords.some(k => lowerText.includes(k.toLowerCase()));
}

// 识别车辆类型
function recognizeVehicleType(text: string): VehicleType {
  const lowerText = text.toLowerCase();
  for (const [type, keywords] of Object.entries(VEHICLE_TYPE_KEYWORDS)) {
    if (keywords.some(k => lowerText.includes(k.toLowerCase()))) {
      return type as VehicleType;
    }
  }
  return 'unknown';
}

// 识别车辆颜色
function recognizeVehicleColor(text: string): VehicleColor {
  const lowerText = text.toLowerCase();
  for (const [color, keywords] of Object.entries(VEHICLE_COLOR_KEYWORDS)) {
    if (keywords.some(k => lowerText.includes(k.toLowerCase()))) {
      return color as VehicleColor;
    }
  }
  return 'other';
}

// 模拟模式识别
export async function mockRecognizeVehicle(
  imageBase64: string,
  direction: 'in' | 'out'
): Promise<RecognitionResult> {
  // 保存图片
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
  const num1 = numbers[Math.floor(Math.random() * numbers.length)];
  const num2 = numbers[Math.floor(Math.random() * numbers.length)];
  const num3 = numbers[Math.floor(Math.random() * numbers.length)];
  const num4 = numbers[Math.floor(Math.random() * numbers.length)];
  const num5 = Math.random() > 0.5 ? numbers[Math.floor(Math.random() * numbers.length)] : letters[Math.floor(Math.random() * letters.length)];

  const plateNumber = `${province}${letter}${num1}${num2}${num3}${num4}${num5}`;
  const confidence = 60 + Math.random() * 40;

  const types: VehicleType[] = ['sedan', 'suv', 'truck', 'bus', 'motorcycle'];
  const colors: VehicleColor[] = ['white', 'black', 'silver', 'gray', 'red', 'blue', 'green'];
  
  const vehicleType = types[Math.floor(Math.random() * types.length)];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const isSpecial = vehicleType === 'truck';

  return {
    plateNumber,
    vehicleType,
    color,
    confidence,
    confidencePlate: 70 + Math.random() * 20,
    confidenceType: 60 + Math.random() * 30,
    confidenceColor: 50 + Math.random() * 30,
    isSpecial,
    hasVehicle: true,
  };
}

// 主识别函数 - 支持 Python 脚本、API 和模拟模式
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
  // 先保存图片
  const imageUrl = saveBase64Image(imageBase64, `vehicle_${direction}`);
  const recordId = generateId();

  // 模拟模式
  if (useMock) {
    console.log('[识别] 使用模拟模式');
    const mockResult = await mockRecognizeVehicle(imageBase64, direction);
    
    if (!mockResult.hasVehicle) {
      return {
        ...mockResult,
        status: 'normal',
        imageUrl,
        recordId,
      };
    }

    // 检查白名单
    const isInternal = mockResult.plateNumber ? isInternalVehicle(mockResult.plateNumber) : false;
    const status: 'normal' | 'internal' | 'special' | 'unlicensed' = 
      isInternal ? 'internal' : 
      mockResult.isSpecial ? 'special' : 
      !mockResult.plateNumber ? 'unlicensed' : 'normal';

    return {
      ...mockResult,
      status,
      imageUrl,
      recordId,
    };
  }

  // Python 脚本模式
  if (usePython) {
    console.log('[识别] 使用 Python 脚本模式');
    
    // 使用实际保存的图片路径
    const filename = imageUrl.replace('/uploads/', '');
    const imagePath = path.join(process.cwd(), 'public', 'uploads', filename);
    console.log('[识别] imageUrl:', imageUrl);
    console.log('[识别] filename:', filename);
    console.log('[识别] imagePath:', imagePath);
    
    // 检查图片是否存在
    if (!fs.existsSync(imagePath)) {
      console.error('[识别] 图片不存在:', imagePath);
      console.log('[识别] public目录:', path.join(process.cwd(), 'public'));
      console.log('[识别] uplo目录文件:', fs.existsSync(path.join(process.cwd(), 'public', 'uploads')) ? fs.readdirSync(path.join(process.cwd(), 'public', 'uploads')) : '目录不存在');
      console.log('[识别] 回退到模拟模式');
      return await mockRecognizeVehicle(imageBase64, direction) as any;
    }
    
    try {
      const result = await callPythonRecognition(imagePath);
      
      if (!result.success) {
        console.error('[识别] Python 脚本执行失败:', result.error);
        // 回退到模拟模式
        console.log('[识别] 回退到模拟模式');
        return await mockRecognizeVehicle(imageBase64, direction) as any;
      }
      
      if (!result.hasVehicle) {
        const errorMsg = result.hasPerson ? '检测到人而非车辆，不记录' : '未检测到车辆';
        throw new Error(errorMsg);
      }
      
      // 根据结果构建返回
      const plateNumber = result.plateNumber;
      const isSpecial = result.plateNumber?.toLowerCase().includes('货车') || false;
      const isInternal = plateNumber ? isInternalVehicle(plateNumber) : false;
      
      const status: 'normal' | 'internal' | 'special' | 'unlicensed' = 
        isInternal ? 'internal' : 
        isSpecial ? 'special' : 
        !plateNumber ? 'unlicensed' : 'normal';

      return {
        plateNumber: plateNumber || '待识别',
        vehicleType: plateNumber?.includes('货车') || plateNumber?.includes('卡车') ? 'truck' : 'sedan',
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
      console.error('[识别] Python 识别失败:', error);
      throw error;
    }
  }

  // API 模式（需要配置 API Key）
  console.log('[识别] 使用 API 模式');
  throw new Error('API 模式需要配置 COZE_API_KEY');
}

// 获取 Python 环境状态
export async function getPythonStatus() {
  return await checkPythonEnv();
}
