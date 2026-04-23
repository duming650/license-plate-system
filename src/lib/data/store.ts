import fs from 'fs';
import path from 'path';
import { 
  VehicleRecord, 
  WhitelistVehicle, 
  RecordsQuery, 
  WhitelistQuery,
  RecordStatus,
  VehicleType
} from './types';

// 数据存储目录
const DATA_DIR = path.join(process.cwd(), 'data');
const RECORDS_FILE = path.join(DATA_DIR, 'records.json');
const WHITELIST_FILE = path.join(DATA_DIR, 'whitelist.json');

// 确保数据目录存在
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// 读取 JSON 文件
function readJsonFile<T>(filePath: string, defaultValue: T): T {
  ensureDataDir();
  if (!fs.existsSync(filePath)) {
    writeJsonFile(filePath, defaultValue);
    return defaultValue;
  }
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return defaultValue;
  }
}

// 写入 JSON 文件
function writeJsonFile<T>(filePath: string, data: T): void {
  ensureDataDir();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// 生成唯一 ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// ============ 通行记录操作 ============

// 获取所有记录
export function getAllRecords(): VehicleRecord[] {
  return readJsonFile<VehicleRecord[]>(RECORDS_FILE, []);
}

// 保存记录
export function saveRecord(record: VehicleRecord): VehicleRecord {
  const records = getAllRecords();
  records.unshift(record); // 添加到开头
  writeJsonFile(RECORDS_FILE, records);
  return record;
}

// 分页查询记录
export function queryRecords(query: RecordsQuery): { records: VehicleRecord[]; total: number } {
  let records = getAllRecords();
  
  // 过滤条件
  if (query.startDate) {
    records = records.filter(r => r.createdAt >= query.startDate!);
  }
  if (query.endDate) {
    records = records.filter(r => r.createdAt <= query.endDate!);
  }
  if (query.direction) {
    records = records.filter(r => r.direction === query.direction);
  }
  if (query.status) {
    records = records.filter(r => r.status === query.status);
  }
  if (query.plateNumber) {
    const plate = query.plateNumber.toUpperCase();
    records = records.filter(r => r.plateNumber.includes(plate));
  }
  if (query.vehicleType) {
    records = records.filter(r => r.vehicleType === query.vehicleType);
  }

  const total = records.length;
  
  // 分页
  const page = query.page || 1;
  const pageSize = query.pageSize || 20;
  const start = (page - 1) * pageSize;
  const paginatedRecords = records.slice(start, start + pageSize);

  return { records: paginatedRecords, total };
}

// 获取记录统计
export function getRecordStats(): {
  total: number;
  today: number;
  internal: number;
  external: number;
  special: number;
  unlicensed: number;
} {
  const records = getAllRecords();
  const today = new Date().toDateString();
  
  return {
    total: records.length,
    today: records.filter(r => new Date(r.createdAt).toDateString() === today).length,
    internal: records.filter(r => r.status === 'internal').length,
    external: records.filter(r => r.status === 'normal').length,
    special: records.filter(r => r.status === 'special').length,
    unlicensed: records.filter(r => r.status === 'unlicensed').length,
  };
}

// 删除记录
export function deleteRecord(id: string): boolean {
  const records = getAllRecords();
  const index = records.findIndex(r => r.id === id);
  if (index === -1) return false;
  
  records.splice(index, 1);
  writeJsonFile(RECORDS_FILE, records);
  return true;
}

// ============ 白名单操作 ============

// 获取所有白名单
export function getAllWhitelist(): WhitelistVehicle[] {
  return readJsonFile<WhitelistVehicle[]>(WHITELIST_FILE, []);
}

// 检查是否为内部车辆
export function isInternalVehicle(plateNumber: string): WhitelistVehicle | null {
  const whitelist = getAllWhitelist();
  const normalizedPlate = plateNumber.replace(/[_\-\s]/g, '').toUpperCase();
  return whitelist.find(v => {
    const normalizedV = v.plateNumber.replace(/[_\-\s]/g, '').toUpperCase();
    return normalizedV === normalizedPlate;
  }) || null;
}

// 添加白名单
export function addWhitelist(vehicle: Omit<WhitelistVehicle, 'id' | 'createdAt' | 'updatedAt'>): WhitelistVehicle {
  const whitelist = getAllWhitelist();
  const now = new Date().toISOString();
  const newVehicle: WhitelistVehicle = {
    ...vehicle,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };
  whitelist.push(newVehicle);
  writeJsonFile(WHITELIST_FILE, whitelist);
  return newVehicle;
}

// 更新白名单
export function updateWhitelist(id: string, updates: Partial<WhitelistVehicle>): WhitelistVehicle | null {
  const whitelist = getAllWhitelist();
  const index = whitelist.findIndex(v => v.id === id);
  if (index === -1) return null;
  
  whitelist[index] = {
    ...whitelist[index],
    ...updates,
    id: whitelist[index].id,
    createdAt: whitelist[index].createdAt,
    updatedAt: new Date().toISOString(),
  };
  writeJsonFile(WHITELIST_FILE, whitelist);
  return whitelist[index];
}

// 删除白名单
export function deleteWhitelist(id: string): boolean {
  const whitelist = getAllWhitelist();
  const index = whitelist.findIndex(v => v.id === id);
  if (index === -1) return false;
  
  whitelist.splice(index, 1);
  writeJsonFile(WHITELIST_FILE, whitelist);
  return true;
}

// 分页查询白名单
export function queryWhitelist(query: WhitelistQuery): { vehicles: WhitelistVehicle[]; total: number } {
  let vehicles = getAllWhitelist();
  
  if (query.plateNumber) {
    const plate = query.plateNumber.toUpperCase();
    vehicles = vehicles.filter(v => v.plateNumber.includes(plate));
  }
  if (query.vehicleType) {
    vehicles = vehicles.filter(v => v.vehicleType === query.vehicleType);
  }

  const total = vehicles.length;
  
  const page = query.page || 1;
  const pageSize = query.pageSize || 20;
  const start = (page - 1) * pageSize;
  const paginatedVehicles = vehicles.slice(start, start + pageSize);

  return { vehicles: paginatedVehicles, total };
}

// 批量导入白名单
export function importWhitelist(vehicles: Omit<WhitelistVehicle, 'id' | 'createdAt' | 'updatedAt'>[]): { success: number; failed: number; errors: string[] } {
  const whitelist = getAllWhitelist();
  const now = new Date().toISOString();
  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const vehicle of vehicles) {
    // 检查是否已存在
    const normalizedPlate = vehicle.plateNumber.replace(/[_\-\s]/g, '').toUpperCase();
    const exists = whitelist.some(v => 
      v.plateNumber.replace(/[_\-\s]/g, '').toUpperCase() === normalizedPlate
    );
    
    if (exists) {
      failed++;
      errors.push(`车牌 ${vehicle.plateNumber} 已存在`);
      continue;
    }

    whitelist.push({
      ...vehicle,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    });
    success++;
  }

  writeJsonFile(WHITELIST_FILE, whitelist);
  return { success, failed, errors };
}
