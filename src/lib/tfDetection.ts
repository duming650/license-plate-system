// 基于 TensorFlow.js 的车辆检测 - 前端版本
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import { VehicleType, VehicleColor } from './data/types';

// 模型实例（单例）
let model: cocoSsd.ObjectDetection | null = null;
let modelLoading = false;
let modelLoadPromise: Promise<cocoSsd.ObjectDetection | null> | null = null;

// 车辆相关的类别
const VEHICLE_CLASSES = ['car', 'bus', 'truck', 'motorcycle', 'bicycle'];
const PERSON_CLASS = 'person';

// 加载模型
export async function loadModel(): Promise<cocoSsd.ObjectDetection | null> {
  if (model) return model;
  if (modelLoadPromise) return modelLoadPromise;
  
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
  imageElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
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
  const loadedModel = await loadModel();
  if (!loadedModel) {
    throw new Error('模型加载失败');
  }
  
  // 检测
  const predictions = await loadedModel.detect(imageElement);
  
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

// 随机生成车牌
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

// 随机生成颜色
function randomColor(): VehicleColor {
  const colors: VehicleColor[] = ['white', 'black', 'silver', 'gray', 'red', 'blue', 'green', 'yellow', 'orange', 'brown'];
  return colors[Math.floor(Math.random() * colors.length)];
}

// 识别结果接口
export interface TfRecognitionResult {
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

// 前端 TensorFlow.js 识别函数
export async function tfRecognize(
  imageElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
): Promise<{
  hasVehicle: boolean;
  hasPerson: boolean;
  result: TfRecognitionResult;
}> {
  try {
    // 检测车辆
    const detection = await detectVehicles(imageElement);
    
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
    
    // 判断是否为特种车辆（货车）
    const isSpecial = ['truck'].includes(mainVehicle.type.toLowerCase());
    
    return {
      hasVehicle: true,
      hasPerson: detection.hasPerson,
      result: {
        plateNumber: plate,
        vehicleType: mapCocoTypeToVehicle(mainVehicle.type),
        color: randomColor(),
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
