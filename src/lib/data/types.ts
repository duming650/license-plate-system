// 车辆类型枚举
export type VehicleType = 
  | 'sedan'        // 轿车
  | 'suv'          // SUV
  | 'truck'        // 货车
  | 'bus'          // 客车
  | 'special'       // 特种车辆（铲车、钩机、叉车等）
  | 'motorcycle'    // 摩托车
  | 'unknown';      // 未知/无牌照

// 车辆颜色
export type VehicleColor = 
  | 'white' | 'black' | 'silver' | 'gray' | 'red' 
  | 'blue' | 'green' | 'yellow' | 'orange' | 'brown' 
  | 'other';

// 通行方向
export type Direction = 'in' | 'out';

// 通行记录状态
export type RecordStatus = 'normal' | 'internal' | 'special' | 'unlicensed';

// 白名单车辆
export interface WhitelistVehicle {
  id: string;
  plateNumber: string;          // 车牌号
  vehicleType: VehicleType;     // 车辆类型
  color: VehicleColor;          // 车辆颜色
  brand?: string;               // 品牌型号
  owner?: string;               // 车主/负责人
  department?: string;           // 部门
  remark?: string;              // 备注
  createdAt: string;
  updatedAt: string;
}

// 车辆通行记录
export interface VehicleRecord {
  id: string;
  plateNumber: string;          // 车牌号（无牌照车为 '无牌照'）
  vehicleType: VehicleType;     // 车辆类型
  color: VehicleColor;          // 车辆颜色
  direction: Direction;          // 通行方向
  status: RecordStatus;         // 记录状态
  confidence: number;           // 识别置信度
  imageUrl: string;             // 抓拍图片路径
  thumbnailUrl?: string;        // 缩略图路径
  confidencePlate?: number;     // 车牌识别置信度
  confidenceType?: number;      // 车辆类型识别置信度
  confidenceColor?: number;     // 车辆颜色识别置信度
  remark?: string;              // 备注
  createdAt: string;            // 通行时间
}

// 识别结果
export interface RecognitionResult {
  plateNumber: string | null;   // 车牌号，无牌照时为 null
  vehicleType: VehicleType;
  color: VehicleColor;
  confidence: number;
  confidencePlate?: number;
  confidenceType?: number;
  confidenceColor?: number;
  isSpecial: boolean;           // 是否特种车辆
  specialType?: string;         // 特种车辆类型
  hasVehicle?: boolean;         // 是否检测到车辆
}

// API 请求/响应类型
export interface RecognizeRequest {
  imageData: string;            // Base64 图片数据
  direction: Direction;
}

export interface RecognizeResponse {
  success: boolean;
  data?: VehicleRecord;
  error?: string;
}

export interface RecordsQuery {
  page?: number;
  pageSize?: number;
  startDate?: string;
  endDate?: string;
  direction?: Direction;
  status?: RecordStatus;
  plateNumber?: string;
  vehicleType?: VehicleType;
}

export interface RecordsResponse {
  success: boolean;
  data: {
    records: VehicleRecord[];
    total: number;
    page: number;
    pageSize: number;
  };
  error?: string;
}

export interface WhitelistQuery {
  page?: number;
  pageSize?: number;
  plateNumber?: string;
  vehicleType?: VehicleType;
}

export interface WhitelistResponse {
  success: boolean;
  data: {
    vehicles: WhitelistVehicle[];
    total: number;
    page: number;
    pageSize: number;
  };
  error?: string;
}
