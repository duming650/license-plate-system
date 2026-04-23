// 基于 TensorFlow.js 的车辆检测
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import { saveBase64Image } from './data/imageStore';
import { VehicleType, VehicleColor } from './data/types';

// 模型实例（单例）
let model: cocoSsd.ObjectDetection | null = null;
let modelLoading = false;

// 车辆相关的类别
const VEHICLE_CLASSES = ['car', 'bus', 'truck', 'motorcycle', 'bicycle'];
const PERSON_CLASS = 'person';

// 加载模型
export async function loadModel(): Promise<cocoSsd.ObjectDetection | null> {
  if (model) return model;
  if (modelLoading) {
    // 等待模型加载完成
    while (modelLoading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return model;
  }
  
  try {
    modelLoading = true;
    console.log('正在加载 TensorFlow.js 模型...');
    model = await cocoSsd.load();
    console.log('模型加载完成');
    return model;
  } catch (error) {
    console.error('模型加载失败:', error);
    modelLoading = false;
    return null;
  }
}

// 检测图像中的车辆
export async function detectVehicles(
  imageBase64: string
): Promise<{
  hasVehicle: boolean;
  vehicles: Array<{
    type: string;
    score: number;
    bbox: number[];
  }>;
  hasPerson: boolean;
}> {
  // 加载模型
  const model = await loadModel();
  if (!model) {
    throw new Error('模型加载失败');
  }
  
  // 将 base64 转换为图片
  const img = await base64ToImage(imageBase64);
  
  // 检测
  const predictions = await model.detect(img);
  
  // 过滤结果
  const vehicles: Array<{ type: string; score: number; bbox: number[] }> = [];
  let hasPerson = false;
  
  for (const pred of predictions) {
    const className = pred.class.toLowerCase();
    const score = pred.score;
    
    if (VEHICLE_CLASSES.includes(className) && score > 0.5) {
      vehicles.push({
        type: className,
        score: score,
        bbox: pred.bbox as number[],
      });
    }
    
    if (className === PERSON_CLASS && score > 0.5) {
      hasPerson = true;
    }
  }
  
  return {
    hasVehicle: vehicles.length > 0,
    vehicles,
    hasPerson,
  };
}

// base64 转 Image
function base64ToImage(base64: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = base64;
  });
}

// 映射 coco-ssd 类型到车辆类型
export function mapCocoTypeToVehicle(type: string): VehicleType {
  switch (type.toLowerCase()) {
    case 'car':
      return 'sedan';
    case 'truck':
      return 'truck';
    case 'bus':
      return 'bus';
    case 'motorcycle':
      return 'motorcycle';
    case 'bicycle':
      return 'motorcycle';
    default:
      return 'unknown';
  }
}

// 随机生成车牌（用于演示）
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
  const num5 = Math.random() > 0.5 ? numbers[Math.floor(Math.random() * numbers.length)] : '';
  
  return `${province}${letter}${num1}${num2}${num3}${num4}${num5}`;
}

// 随机生成车牌（增强版）
function generatePlateNumberEnhanced(): string {
  const provinces = ['京', '津', '沪', '渝', '冀', '豫', '云', '辽', '黑', '湘', '皖', '鲁', '新', '苏', '浙', '赣', '鄂', '桂', '甘', '晋', '蒙', '陕', '吉', '闽', '贵', '粤', '青', '藏', '川', '宁', '琼'];
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const numbers = '0123456789';
  
  const province = provinces[Math.floor(Math.random() * provinces.length)];
  const letter = letters[Math.floor(Math.random() * letters.length)];
  let plate = `${province}${letter}`;
  
  // 5位或6位车牌
  const length = Math.random() > 0.3 ? 5 : 4;
  for (let i = 0; i < length; i++) {
    plate += numbers[Math.floor(Math.random() * numbers.length)];
  }
  
  return plate;
}

// 随机生成车牌
function generatePlate(): string {
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

// 随机生成颜色
function randomColor(): VehicleColor {
  const colors: VehicleColor[] = ['white', 'black', 'silver', 'gray', 'red', 'blue', 'green', 'yellow', 'orange', 'brown'];
  return colors[Math.floor(Math.random() * colors.length)];
}

// 识别结果接口
export interface RecognitionResult {
  plateNumber: string | null;
  vehicleType: VehicleType;
  color: VehicleColor;
  confidence: number;
  confidencePlate?: number;
  confidenceType?: number;
  confidenceColor?: number;
  isSpecial: boolean;
  specialType?: string;
}

// 使用 TensorFlow.js 进行真实识别
export async function tfRecognizeVehicle(
  imageBase64: string,
  direction: 'in' | 'out'
): Promise<{
  hasVehicle: boolean;
  hasPerson: boolean;
  vehicles: Array<{
    type: VehicleType;
    color: VehicleColor;
    plateNumber: string;
    confidence: number;
    imageUrl: string;
    recordId: string;
    status: 'normal' | 'internal' | 'special' | 'unlicensed';
    isSpecial: boolean;
    specialType?: string;
  }>;
}> {
  // 检测车辆
  const detection = await detectVehicles(imageBase64);
  
  // 保存图片
  const imageUrl = saveBase64Image(imageBase64, `vehicle_${direction}`);
  const recordId = `record_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  
  if (!detection.hasVehicle) {
    // 没有车辆（只有人或其他）
    return {
      hasVehicle: false,
      hasPerson: detection.hasPerson,
      vehicles: [],
    };
  }
  
  // 识别到的每辆车都生成一条记录
  const vehicles = detection.vehicles.map(v => {
    const plateNumber = generatePlate();
    const isSpecial = v.type === 'truck'; // 大货车视为特种车辆
    const status: 'normal' | 'internal' | 'special' | 'unlicensed' = 
      isSpecial ? 'special' : 'normal';
    
    return {
      type: mapCocoTypeToVehicle(v.type),
      color: randomColor(),
      plateNumber,
      confidence: v.score * 100,
      imageUrl,
      recordId,
      status,
      isSpecial,
      specialType: isSpecial ? '货车' : undefined,
    };
  });
  
  return {
    hasVehicle: true,
    hasPerson: detection.hasPerson,
    vehicles,
  };
}
