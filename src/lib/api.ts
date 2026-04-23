// API 客户端
const API_BASE = '/api';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// 通用请求方法
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json();
  
  if (!response.ok || !data.success) {
    throw new Error(data.error || '请求失败');
  }
  
  return data.data;
}

// ============ 识别 API ============

export interface RecognizeResponse {
  id: string;
  plateNumber: string;
  vehicleType: string;
  color: string;
  direction: 'in' | 'out';
  status: 'normal' | 'internal' | 'special' | 'unlicensed';
  confidence: number;
  confidencePlate?: number;
  confidenceType?: number;
  confidenceColor?: number;
  imageUrl: string;
  remark?: string;
  createdAt: string;
}

export async function recognizeVehicle(
  imageData: string,
  direction: 'in' | 'out',
  useMock?: boolean
): Promise<RecognizeResponse> {
  return request<RecognizeResponse>('/recognize', {
    method: 'POST',
    body: JSON.stringify({ imageData, direction, useMock }),
  });
}

// ============ 记录 API ============

export interface RecordsQuery {
  page?: number;
  pageSize?: number;
  startDate?: string;
  endDate?: string;
  direction?: 'in' | 'out';
  status?: 'normal' | 'internal' | 'special' | 'unlicensed';
  plateNumber?: string;
  vehicleType?: string;
}

export interface RecordsResponse {
  records: RecognizeResponse[];
  total: number;
  page: number;
  pageSize: number;
}

export async function getRecords(query: RecordsQuery = {}): Promise<RecordsResponse> {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      params.append(key, String(value));
    }
  });
  
  return request<RecordsResponse>(`/records?${params.toString()}`);
}

export async function deleteRecord(id: string): Promise<void> {
  await request('/records', {
    method: 'DELETE',
    body: JSON.stringify({ id }),
  });
}

// ============ 白名单 API ============

export interface WhitelistVehicle {
  id: string;
  plateNumber: string;
  vehicleType: string;
  color: string;
  brand?: string;
  owner?: string;
  department?: string;
  remark?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WhitelistQuery {
  page?: number;
  pageSize?: number;
  plateNumber?: string;
  vehicleType?: string;
}

export interface WhitelistResponse {
  vehicles: WhitelistVehicle[];
  total: number;
  page: number;
  pageSize: number;
}

export async function getWhitelist(query: WhitelistQuery = {}): Promise<WhitelistResponse> {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      params.append(key, String(value));
    }
  });
  
  return request<WhitelistResponse>(`/whitelist?${params.toString()}`);
}

export async function addWhitelist(vehicle: Partial<WhitelistVehicle>): Promise<WhitelistVehicle> {
  return request<WhitelistVehicle>('/whitelist', {
    method: 'POST',
    body: JSON.stringify(vehicle),
  });
}

export async function updateWhitelist(
  id: string,
  updates: Partial<WhitelistVehicle>
): Promise<WhitelistVehicle> {
  return request<WhitelistVehicle>('/whitelist', {
    method: 'PUT',
    body: JSON.stringify({ id, ...updates }),
  });
}

export async function deleteWhitelist(id: string): Promise<void> {
  await request('/whitelist', {
    method: 'DELETE',
    body: JSON.stringify({ id }),
  });
}

export async function importWhitelist(
  vehicles: Partial<WhitelistVehicle>[]
): Promise<{ success: number; failed: number; errors: string[] }> {
  return request('/whitelist', {
    method: 'PATCH',
    body: JSON.stringify({ vehicles }),
  });
}

// ============ 统计 API ============

export interface Stats {
  total: number;
  today: number;
  internal: number;
  external: number;
  special: number;
  unlicensed: number;
}

export async function getStats(): Promise<Stats> {
  return request<Stats>('/stats');
}

// ============ 导出 API ============

export function exportRecords(query: RecordsQuery = {}): void {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      params.append(key, String(value));
    }
  });
  
  window.open(`${API_BASE}/export?${params.toString()}`, '_blank');
}
