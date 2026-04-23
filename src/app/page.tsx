'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Car, Camera, Download, Users, FileText, 
  AlertTriangle, XCircle, CheckCircle, Clock, Search,
  Plus, Trash2, Eye, RefreshCw, TrendingUp,
  Video, VideoOff, Play, Pause, Settings, 
  Wifi, WifiOff, Monitor, BarChart3, Calendar,
  PieChart, TrendingDown, ArrowUpDown
} from 'lucide-react';
import { useApp, STATUS_COLORS, STATUS_NAMES, DIRECTION_NAMES, VEHICLE_TYPE_NAMES, VEHICLE_COLOR_NAMES } from '@/lib/context';
import { 
  recognizeVehicle, 
  getRecords, 
  getWhitelist, 
  addWhitelist, 
  deleteWhitelist,
  deleteRecord,
  exportRecords,
  exportSummaryExcel,
  getSummary,
  RecognizeResponse,
  WhitelistVehicle,
  SummaryData
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';

// 动态导入 RTSP 播放器（避免 SSR 问题）
const RTSPPlayer = dynamic(() => import('./RTSPPlayer'), { ssr: false });

// 车辆类型选项
const VEHICLE_TYPES = [
  { value: 'sedan', label: '轿车' },
  { value: 'suv', label: 'SUV/越野车' },
  { value: 'truck', label: '货车/卡车' },
  { value: 'bus', label: '客车' },
  { value: 'special', label: '特种车辆' },
  { value: 'motorcycle', label: '摩托车' },
];

// 车辆颜色选项
const VEHICLE_COLORS = [
  { value: 'white', label: '白色' },
  { value: 'black', label: '黑色' },
  { value: 'silver', label: '银色' },
  { value: 'gray', label: '灰色' },
  { value: 'red', label: '红色' },
  { value: 'blue', label: '蓝色' },
  { value: 'green', label: '绿色' },
  { value: 'yellow', label: '黄色' },
];

// 汇总报表组件
function SummaryReport() {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // 加载汇总数据
  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSummary(startDate || undefined, endDate || undefined);
      setSummary(data);
    } catch (error) {
      toast.error('加载汇总数据失败');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  // 导出 Excel
  const handleExport = () => {
    exportSummaryExcel(startDate || undefined, endDate || undefined);
    toast.success('开始导出 Excel 报表');
  };

  // 计算百分比
  const calcPercent = (value: number, total: number) => {
    if (total === 0) return '0%';
    return ((value / total) * 100).toFixed(1) + '%';
  };

  if (!summary && loading) {
    return (
      <Card>
        <CardHeader><CardTitle>通行汇总报表</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* 筛选条件 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-600" />
            通行汇总报表
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label>开始日期</Label>
              <Input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-2">
              <Label>结束日期</Label>
              <Input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-40"
              />
            </div>
            <Button onClick={loadSummary} variant="outline" className="gap-2">
              <Search className="w-4 h-4" />
              查询
            </Button>
            <Button onClick={handleExport} className="gap-2 bg-purple-600 hover:bg-purple-700">
              <Download className="w-4 h-4" />
              导出 Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 总体统计 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">总通行次数</p>
                <p className="text-3xl font-bold">{summary.summary.totalCount}</p>
              </div>
              <ArrowUpDown className="w-10 h-10 text-blue-200" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">今日通行</p>
                <p className="text-3xl font-bold">{summary.summary.todayCount}</p>
              </div>
              <TrendingUp className="w-10 h-10 text-green-200" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm">特种车辆</p>
                <p className="text-3xl font-bold">{summary.statusStats.special}</p>
              </div>
              <AlertTriangle className="w-10 h-10 text-orange-200" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-gray-500 to-gray-600 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-100 text-sm">无牌照</p>
                <p className="text-3xl font-bold">{summary.statusStats.unlicensed}</p>
              </div>
              <XCircle className="w-10 h-10 text-gray-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 按状态和方向统计 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-blue-600" />
              按状态统计
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium">内部车辆</span>
                </div>
                <div className="text-right">
                  <span className="text-xl font-bold text-green-600">{summary.statusStats.internal}</span>
                  <span className="text-sm text-gray-500 ml-2">
                    {calcPercent(summary.statusStats.internal, summary.summary.totalCount)}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Car className="w-5 h-5 text-blue-600" />
                  <span className="font-medium">外部车辆</span>
                </div>
                <div className="text-right">
                  <span className="text-xl font-bold text-blue-600">{summary.statusStats.normal}</span>
                  <span className="text-sm text-gray-500 ml-2">
                    {calcPercent(summary.statusStats.normal, summary.summary.totalCount)}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  <span className="font-medium">特种车辆</span>
                </div>
                <div className="text-right">
                  <span className="text-xl font-bold text-orange-600">{summary.statusStats.special}</span>
                  <span className="text-sm text-gray-500 ml-2">
                    {calcPercent(summary.statusStats.special, summary.summary.totalCount)}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <XCircle className="w-5 h-5 text-gray-600" />
                  <span className="font-medium">无牌照</span>
                </div>
                <div className="text-right">
                  <span className="text-xl font-bold text-gray-600">{summary.statusStats.unlicensed}</span>
                  <span className="text-sm text-gray-500 ml-2">
                    {calcPercent(summary.statusStats.unlicensed, summary.summary.totalCount)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-purple-600" />
              驶入/驶出统计
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <span className="font-medium">驶入</span>
                </div>
                <div className="text-right">
                  <span className="text-xl font-bold text-green-600">{summary.directionStats.in}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <TrendingDown className="w-5 h-5 text-red-600 rotate-180" />
                  <span className="font-medium">驶出</span>
                </div>
                <div className="text-right">
                  <span className="text-xl font-bold text-red-600">{summary.directionStats.out}</span>
                </div>
              </div>

              {/* 今日时段分布 */}
              <div className="mt-6">
                <h4 className="font-medium text-sm text-gray-600 mb-3">今日通行时段分布</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {Object.entries(summary.hourlyStats)
                    .filter(([_, stats]) => stats.total > 0)
                    .sort(([a], [b]) => Number(b) - Number(a))
                    .slice(0, 10)
                    .map(([hour, stats]) => (
                      <div key={hour} className="flex items-center gap-2 text-sm">
                        <span className="w-12 text-gray-500">{hour}:00</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                          <div 
                            className="bg-purple-500 h-2 rounded-full"
                            style={{ width: `${Math.min(100, (stats.total / Math.max(...Object.values(summary.hourlyStats).map(s => s.total || 1))) * 100)}%` }}
                          />
                        </div>
                        <span className="w-8 text-right font-medium">{stats.total}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 按车辆类型统计 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="w-5 h-5 text-blue-600" />
            按车辆类型统计
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(summary.typeStats)
              .filter(([_, count]) => count > 0)
              .sort(([_, a], [__, b]) => Number(b) - Number(a))
              .map(([type, count]) => (
                <div key={type} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                  <p className="text-sm text-gray-500">{VEHICLE_TYPE_NAMES[type] || type}</p>
                  <p className="text-2xl font-bold text-gray-900">{count}</p>
                  <p className="text-xs text-gray-400">{calcPercent(count, summary.summary.totalCount)}</p>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* 按日统计（最近30天） */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-green-600" />
            近30天通行趋势
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {Object.entries(summary.dailyStats)
              .sort(([a], [b]) => b.localeCompare(a))
              .map(([date, stats]) => (
                <div key={date} className="flex items-center gap-4 text-sm">
                  <span className="w-24 text-gray-500">{date}</span>
                  <div className="flex-1 flex items-center gap-2">
                    <div className="flex items-center gap-1 w-20">
                      <TrendingUp className="w-3 h-3 text-green-600" />
                      <span className="text-green-600">{stats.in}</span>
                    </div>
                    <div className="flex items-center gap-1 w-20">
                      <TrendingDown className="w-3 h-3 text-red-600" />
                      <span className="text-red-600">{stats.out}</span>
                    </div>
                  </div>
                  <div className="w-24">
                    <div className="bg-blue-500 h-2 rounded-full" 
                         style={{ width: `${Math.min(100, (stats.total / Math.max(...Object.values(summary.dailyStats).map(s => s.total || 1))) * 100)}%` }} />
                  </div>
                  <span className="w-8 text-right font-medium">{stats.total}</span>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* 内部车辆明细 */}
      {summary.internalRecords.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              内部车辆通行明细
            </CardTitle>
            <CardDescription>共 {summary.internalRecords.length} 条记录</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>车牌号</TableHead>
                  <TableHead>车辆类型</TableHead>
                  <TableHead>颜色</TableHead>
                  <TableHead>通行时间</TableHead>
                  <TableHead>方向</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.internalRecords.slice(0, 20).map((record, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium text-green-600">{record.plateNumber}</TableCell>
                    <TableCell>{VEHICLE_TYPE_NAMES[record.vehicleType] || record.vehicleType}</TableCell>
                    <TableCell>{VEHICLE_COLOR_NAMES[record.color] || record.color}</TableCell>
                    <TableCell>{new Date(record.createdAt).toLocaleString('zh-CN')}</TableCell>
                    <TableCell>
                      <Badge variant={record.direction === 'in' ? 'default' : 'secondary'}>
                        {DIRECTION_NAMES[record.direction]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {summary.internalRecords.length > 20 && (
              <p className="text-sm text-gray-500 mt-2 text-center">
                仅显示前20条，查看全部请导出 Excel
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// 摄像头品牌选项
const CAMERA_BRANDS = [
  { value: 'hikvision', label: '海康威视 (Hikvision)' },
  { value: 'dahua', label: '大华 (Dahua)' },
  { value: 'uniview', label: '宇视 (Uniview)' },
  { value: 'tiandy', label: '天地伟业 (Tiandy)' },
  { value: 'hanbang', label: '汉邦高科 (Hanbang)' },
  { value: 'huawei', label: '华为 (Huawei)' },
  { value: 'other', label: '其他品牌' },
];

// 摄像头配置接口
interface CameraConfig {
  name: string;
  brand: string;
  rtspUrl: string;
  ip: string;
  port: string;
  username: string;
  password: string;
}

// 网络摄像头配置组件
function CameraSettings({ onSave, currentConfig }: { onSave: (config: CameraConfig) => void; currentConfig: CameraConfig }) {
  const [config, setConfig] = useState<CameraConfig>(currentConfig);
  
  const handleSave = () => {
    if (!config.rtspUrl && !config.ip) {
      toast.error('请输入 RTSP 地址或摄像头 IP');
      return;
    }
    if (!config.rtspUrl && (!config.username || !config.password)) {
      toast.error('请输入用户名和密码');
      return;
    }
    onSave(config);
    toast.success('摄像头配置已保存');
  };
  
  // 根据品牌获取提示信息
  const getBrandHint = () => {
    switch (config.brand) {
      case 'hikvision':
        return 'rtsp://用户名:密码@IP:554/Streaming/Channels/101';
      case 'dahua':
        return 'rtsp://用户名:密码@IP:554/cam/realplay?chn=1&subtype=0';
      case 'uniview':
        return 'rtsp://用户名:密码@IP:554/media/video1';
      case 'tiandy':
        return 'rtsp://用户名:密码@IP:554/Stream%201';
      case 'hanbang':
        return 'rtsp://用户名:密码@IP:554/stream1';
      case 'huawei':
        return 'rtsp://用户名:密码@IP:554/Live/Channels/101';
      default:
        return 'rtsp://用户名:密码@IP:554/Streaming/Channels/101';
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>摄像头名称</Label>
        <Input 
          placeholder="如：入口摄像头"
          value={config.name}
          onChange={(e) => setConfig({...config, name: e.target.value})}
        />
      </div>
      
      <div className="space-y-2">
        <Label>摄像头品牌</Label>
        <Select value={config.brand} onValueChange={(value) => setConfig({...config, brand: value})}>
          <SelectTrigger>
            <SelectValue placeholder="选择摄像头品牌" />
          </SelectTrigger>
          <SelectContent>
            {CAMERA_BRANDS.map((brand) => (
              <SelectItem key={brand.value} value={brand.value}>
                {brand.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label>RTSP 地址（可选，填写则优先使用）</Label>
        <Input 
          placeholder="rtsp://admin:password@192.168.1.64/Streaming/Channels/101"
          value={config.rtspUrl}
          onChange={(e) => setConfig({...config, rtspUrl: e.target.value})}
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>IP地址</Label>
          <Input 
            placeholder="192.168.1.64"
            value={config.ip}
            onChange={(e) => setConfig({...config, ip: e.target.value})}
          />
        </div>
        <div className="space-y-2">
          <Label>端口</Label>
          <Input 
            placeholder="554"
            value={config.port}
            onChange={(e) => setConfig({...config, port: e.target.value})}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>用户名</Label>
          <Input 
            placeholder="admin"
            value={config.username}
            onChange={(e) => setConfig({...config, username: e.target.value})}
          />
        </div>
        <div className="space-y-2">
          <Label>密码</Label>
          <Input 
            type="password"
            placeholder="password"
            value={config.password}
            onChange={(e) => setConfig({...config, password: e.target.value})}
          />
        </div>
      </div>
      
      <Button onClick={handleSave} className="w-full">
        保存配置
      </Button>
      
      <div className="p-3 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-sm mb-2">各品牌 RTSP 地址格式</h4>
        <div className="text-xs text-gray-600 space-y-1">
          <p><strong>海康威视：</strong>rtsp://用户:密码@IP:554/Streaming/Channels/101</p>
          <p><strong>大华：</strong>rtsp://用户:密码@IP:554/cam/realplay?chn=1</p>
          <p><strong>宇视：</strong>rtsp://用户:密码@IP:554/media/video1</p>
          <p><strong>天地伟业：</strong>rtsp://用户:密码@IP:554/Stream%201</p>
          <p><strong>汉邦高科：</strong>rtsp://用户:密码@IP:554/stream1</p>
          <p><strong>华为：</strong>rtsp://用户:密码@IP:554/Live/Channels/101</p>
          <p className="text-gray-400 mt-2">
            选择品牌后，系统会自动适配正确的格式
          </p>
        </div>
      </div>
    </div>
  );
}

// 网络摄像头识别组件
function NetworkCamera() {
  const { addRecentRecord, refreshStats } = useApp();
  
  const [config, setConfig] = useState<CameraConfig>({
    name: '',
    brand: 'hikvision',
    rtspUrl: '',
    ip: '',
    port: '554',
    username: '',
    password: '',
  });
  const [showSettings, setShowSettings] = useState(false);
  const [direction, setDirection] = useState<'in' | 'out'>('in');
  const [useMock, setUseMock] = useState(true);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lastRecognizeTime, setLastRecognizeTime] = useState(0);
  const [autoInterval, setAutoInterval] = useState<number>(5); // 秒
  const [isAutoRecognize, setIsAutoRecognize] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // 生成 RTSP URL（根据品牌自动适配格式）
  const generateRTSPUrl = useCallback(() => {
    if (config.rtspUrl) return config.rtspUrl;
    if (!config.ip || !config.username || !config.password) return '';
    
    const base = `${config.username}:${config.password}@${config.ip}:${config.port}`;
    
    // 根据不同品牌生成对应格式
    switch (config.brand) {
      case 'hikvision':
        // 海康：rtsp://user:pass@ip:554/Streaming/Channels/101
        return `rtsp://${base}/Streaming/Channels/101`;
      case 'dahua':
        // 大华：rtsp://user:pass@ip:554/cam/realplay?chn=1&subtype=0
        return `rtsp://${base}/cam/realplay?chn=1&subtype=0`;
      case 'uniview':
        // 宇视：rtsp://user:pass@ip:554/media/video1
        return `rtsp://${base}/media/video1`;
      case 'tiandy':
        // 天地伟业：rtsp://user:pass@ip:554/Stream%201
        return `rtsp://${base}/Stream%201`;
      case 'hanbang':
        // 汉邦高科：rtsp://user:pass@ip:554/stream1
        return `rtsp://${base}/stream1`;
      case 'huawei':
        // 华为：rtsp://user:pass@ip:554/Live/Channels/101
        return `rtsp://${base}/Live/Channels/101`;
      case 'other':
      default:
        // 通用格式
        return `rtsp://${base}/Streaming/Channels/101`;
    }
  }, [config]);
  
  // 处理截图识别
  const handleSnapshot = useCallback(async (imageData: string) => {
    const now = Date.now();
    if (now - lastRecognizeTime < 3000) return; // 3秒间隔
    if (isRecognizing) return;
    
    setIsRecognizing(true);
    setLastRecognizeTime(now);
    
    try {
      const result = await recognizeVehicle(imageData, direction, useMock);
      addRecentRecord(result);
      
      if (result.status === 'internal') {
        toast.success(`内部车辆: ${result.plateNumber}`, { duration: 2000 });
      } else if (result.status === 'special') {
        toast.warning(`特种车辆: ${result.plateNumber || '无牌照'} - ${result.remark || ''}`, { duration: 3000 });
      } else if (result.status === 'unlicensed') {
        toast.error(`无牌照车辆`, { duration: 3000 });
      } else {
        toast(`外部车辆: ${result.plateNumber}`, { duration: 2000 });
      }
      
      refreshStats();
    } catch (err: any) {
      console.error('识别失败:', err);
      toast.error('识别失败');
    } finally {
      setIsRecognizing(false);
    }
  }, [direction, useMock, isRecognizing, lastRecognizeTime, addRecentRecord, refreshStats]);
  
  // 自动识别
  const startAutoRecognize = useCallback(() => {
    setIsAutoRecognize(true);
    toast.info(`开始自动识别，每 ${autoInterval} 秒检测一次`);
  }, [autoInterval]);
  
  const stopAutoRecognize = useCallback(() => {
    setIsAutoRecognize(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    toast.info('停止自动识别');
  }, []);
  
  // 接收截图
  const handleSnapshotCapture = useCallback((imageData: string) => {
    handleSnapshot(imageData);
  }, [handleSnapshot]);
  
  // 定时器
  useEffect(() => {
    if (isAutoRecognize && isPlaying) {
      intervalRef.current = setInterval(() => {
        // 触发截图识别
        const event = new CustomEvent('hkv:snapshot');
        window.dispatchEvent(event);
      }, autoInterval * 1000);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isAutoRecognize, isPlaying, autoInterval]);
  
  const rtspUrl = generateRTSPUrl();
  const hasConfig = !!rtspUrl;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Monitor className="w-5 h-5 text-blue-600" />
          网络摄像头识别
        </CardTitle>
        <CardDescription>
          {hasConfig ? `已连接：${config.name || config.ip} (${CAMERA_BRANDS.find(b => b.value === config.brand)?.label || '未知品牌'})` : '请先配置摄像头'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* 视频播放区域 */}
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
            {hasConfig ? (
              <RTSPPlayer
                url={rtspUrl}
                onPlay={() => setIsPlaying(true)}
                onStop={() => setIsPlaying(false)}
                onSnapshot={handleSnapshotCapture}
                isAutoRecognize={isAutoRecognize}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                <VideoOff className="w-16 h-16 mb-4" />
                <p>未配置摄像头</p>
                <p className="text-sm">请点击右上角设置配置 RTSP 地址</p>
              </div>
            )}
            
            {/* 识别中遮罩 */}
            {isRecognizing && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                <div className="text-white text-center">
                  <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin" />
                  <p>正在识别...</p>
                </div>
              </div>
            )}
          </div>
          
          {/* 控制按钮 */}
          <div className="flex items-center gap-2 flex-wrap">
            <Dialog open={showSettings} onOpenChange={setShowSettings}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Settings className="w-4 h-4" />
                  {hasConfig ? '修改配置' : '配置摄像头'}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>网络摄像头配置</DialogTitle>
                  <DialogDescription>
                    选择摄像头品牌，系统会自动适配 RTSP 格式
                  </DialogDescription>
                </DialogHeader>
                <CameraSettings 
                  onSave={(c) => {
                    setConfig(c);
                    setShowSettings(false);
                  }}
                  currentConfig={config}
                />
              </DialogContent>
            </Dialog>
            
            {hasConfig && (
              <>
                {isAutoRecognize ? (
                  <Button onClick={stopAutoRecognize} variant="destructive" className="gap-2">
                    <Pause className="w-4 h-4" />
                    停止自动
                  </Button>
                ) : (
                  <Button onClick={startAutoRecognize} className="gap-2" disabled={!isPlaying}>
                    <Play className="w-4 h-4" />
                    开始自动识别
                  </Button>
                )}
                
                <div className="flex items-center gap-2 ml-auto">
                  <Label className="text-sm">识别间隔：</Label>
                  <Select value={String(autoInterval)} onValueChange={(v) => setAutoInterval(Number(v))}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3秒</SelectItem>
                      <SelectItem value="5">5秒</SelectItem>
                      <SelectItem value="10">10秒</SelectItem>
                      <SelectItem value="15">15秒</SelectItem>
                      <SelectItem value="30">30秒</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
          
          {/* 设置选项 */}
          <div className="flex items-center gap-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <Label>通行方向：</Label>
              <Select value={direction} onValueChange={(v) => setDirection(v as 'in' | 'out')}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in">驶入</SelectItem>
                  <SelectItem value="out">驶出</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="useMockHikvision"
                checked={useMock}
                onChange={(e) => setUseMock(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="useMockHikvision" className="text-sm">
                模拟模式
              </Label>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Home() {
  const { stats, refreshStats, refreshWhitelist, addRecentRecord } = useApp();
  
  // 状态
  const [activeTab, setActiveTab] = useState('monitor');
  const [useMock, setUseMock] = useState(true);
  
  // 记录列表状态
  const [records, setRecords] = useState<RecognizeResponse[]>([]);
  const [recordsTotal, setRecordsTotal] = useState(0);
  const [recordsPage, setRecordsPage] = useState(1);
  const [recordsLoading, setRecordsLoading] = useState(false);
  
  // 查询条件
  const [queryDirection, setQueryDirection] = useState<string>('');
  const [queryStatus, setQueryStatus] = useState<string>('');
  const [queryPlate, setQueryPlate] = useState('');
  
  // 白名单状态
  const [whitelistData, setWhitelistData] = useState<WhitelistVehicle[]>([]);
  const [whitelistTotal, setWhitelistTotal] = useState(0);
  const [whitelistPage, setWhitelistPage] = useState(1);
  const [whitelistLoading, setWhitelistLoading] = useState(false);
  
  // 弹窗状态
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newVehicle, setNewVehicle] = useState({
    plateNumber: '',
    vehicleType: 'sedan',
    color: 'white',
    brand: '',
    owner: '',
    department: '',
    remark: '',
  });
  
  // 预览
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewRecord, setPreviewRecord] = useState<RecognizeResponse | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 加载记录
  const loadRecords = useCallback(async (page: number = 1) => {
    setRecordsLoading(true);
    try {
      const query: any = { page, pageSize: 15 };
      if (queryDirection) query.direction = queryDirection;
      if (queryStatus) query.status = queryStatus;
      if (queryPlate) query.plateNumber = queryPlate;
      
      const result = await getRecords(query);
      setRecords(result.records);
      setRecordsTotal(result.total);
      setRecordsPage(page);
    } catch (error) {
      toast.error('加载记录失败');
    } finally {
      setRecordsLoading(false);
    }
  }, [queryDirection, queryStatus, queryPlate]);

  // 加载白名单
  const loadWhitelist = useCallback(async (page: number = 1) => {
    setWhitelistLoading(true);
    try {
      const result = await getWhitelist({ page, pageSize: 15 });
      setWhitelistData(result.vehicles);
      setWhitelistTotal(result.total);
      setWhitelistPage(page);
    } catch (error) {
      toast.error('加载白名单失败');
    } finally {
      setWhitelistLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecords();
    loadWhitelist();
  }, [loadRecords, loadWhitelist]);

  // 处理图片上传
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, dir: 'in' | 'out') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('请上传图片文件');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('图片大小不能超过 10MB');
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        try {
          const result = await recognizeVehicle(base64, dir, useMock);
          addRecentRecord(result);
          await loadRecords();
          toast.success(`识别成功：${result.plateNumber || '无牌照'}`);
        } catch (error: any) {
          toast.error(error.message || '识别失败');
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error('处理图片失败');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 添加白名单
  const handleAddWhitelist = async () => {
    if (!newVehicle.plateNumber || !newVehicle.vehicleType) {
      toast.error('请填写车牌号和车辆类型');
      return;
    }

    try {
      await addWhitelist(newVehicle);
      toast.success('添加成功');
      setAddDialogOpen(false);
      setNewVehicle({ plateNumber: '', vehicleType: 'sedan', color: 'white', brand: '', owner: '', department: '', remark: '' });
      loadWhitelist();
      refreshWhitelist();
    } catch (error: any) {
      toast.error(error.message || '添加失败');
    }
  };

  // 删除白名单
  const handleDeleteWhitelist = async (id: string) => {
    if (!confirm('确定要删除吗？')) return;
    try {
      await deleteWhitelist(id);
      toast.success('删除成功');
      loadWhitelist();
      refreshWhitelist();
    } catch (error) {
      toast.error('删除失败');
    }
  };

  // 删除记录
  const handleDeleteRecord = async (id: string) => {
    if (!confirm('确定要删除吗？')) return;
    try {
      await deleteRecord(id);
      toast.success('删除成功');
      loadRecords();
      refreshStats();
    } catch (error) {
      toast.error('删除失败');
    }
  };

  // 导出
  const handleExport = () => {
    const query: any = {};
    if (queryDirection) query.direction = queryDirection;
    if (queryStatus) query.status = queryStatus;
    if (queryPlate) query.plateNumber = queryPlate;
    exportRecords(query);
    toast.success('开始导出...');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 顶部导航 */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                <Car className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">车牌识别系统</h1>
                <p className="text-sm text-gray-500">智能车辆管理平台</p>
              </div>
            </div>
            
            {/* 统计数据 */}
            <div className="flex items-center gap-6">
              <StatCard icon={<Clock className="w-4 h-4 text-blue-600" />} label="今日通行" value={stats?.today || 0} />
              <StatCard icon={<CheckCircle className="w-4 h-4 text-green-600" />} label="内部车辆" value={stats?.internal || 0} />
              <StatCard icon={<AlertTriangle className="w-4 h-4 text-orange-600" />} label="特种车辆" value={stats?.special || 0} />
              <StatCard icon={<XCircle className="w-4 h-4 text-gray-600" />} label="无牌照" value={stats?.unlicensed || 0} />
            </div>
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="monitor" className="gap-2">
              <Camera className="w-4 h-4" />
              监控识别
            </TabsTrigger>
            <TabsTrigger value="records" className="gap-2">
              <FileText className="w-4 h-4" />
              通行记录
            </TabsTrigger>
            <TabsTrigger value="summary" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              汇总报表
            </TabsTrigger>
            <TabsTrigger value="whitelist" className="gap-2">
              <Users className="w-4 h-4" />
              白名单管理
            </TabsTrigger>
          </TabsList>

          {/* 监控识别页 */}
          <TabsContent value="monitor">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 海康摄像头识别 */}
              <NetworkCamera />

              {/* 图片上传识别 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    图片上传识别
                  </CardTitle>
                  <CardDescription>上传车辆图片进行识别</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={(e) => handleImageUpload(e, 'in')} />
                    
                    <div 
                      className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-green-500 hover:bg-green-50 transition-colors cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Camera className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                      <p className="text-gray-600 mb-1">点击上传车辆图片</p>
                      <p className="text-sm text-gray-400">支持 JPG、PNG 格式，最大 10MB</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="useMockUpload" checked={useMock} onChange={(e) => setUseMock(e.target.checked)} className="rounded" />
                      <Label htmlFor="useMockUpload" className="text-sm text-gray-600">使用模拟模式</Label>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 识别说明 */}
              <Card className="lg:col-span-2">
                <CardHeader><CardTitle>识别功能说明</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <FeatureCard icon={<CheckCircle className="w-8 h-8 text-green-600" />} title="内部车辆" desc="白名单中的车辆" />
                    <FeatureCard icon={<Car className="w-8 h-8 text-blue-600" />} title="外部车辆" desc="普通外部车辆" />
                    <FeatureCard icon={<AlertTriangle className="w-8 h-8 text-orange-600" />} title="特种车辆" desc="铲车、叉车、钩机等" />
                    <FeatureCard icon={<XCircle className="w-8 h-8 text-gray-600" />} title="无牌照" desc="未能识别车牌" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 通行记录页 */}
          <TabsContent value="records">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>通行记录</CardTitle>
                    <CardDescription>共 {recordsTotal} 条记录</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => loadRecords(1)}><RefreshCw className="w-4 h-4 mr-2" />刷新</Button>
                    <Button onClick={handleExport}><Download className="w-4 h-4 mr-2" />导出 Excel</Button>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-4">
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-gray-400" />
                    <Input placeholder="搜索车牌号" className="w-40" value={queryPlate} onChange={(e) => setQueryPlate(e.target.value)} />
                  </div>
                  <Select value={queryDirection} onValueChange={setQueryDirection}>
                    <SelectTrigger className="w-32"><SelectValue placeholder="通行方向" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">全部方向</SelectItem>
                      <SelectItem value="in">驶入</SelectItem>
                      <SelectItem value="out">驶出</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={queryStatus} onValueChange={setQueryStatus}>
                    <SelectTrigger className="w-36"><SelectValue placeholder="车辆状态" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">全部状态</SelectItem>
                      <SelectItem value="normal">外部车辆</SelectItem>
                      <SelectItem value="internal">内部车辆</SelectItem>
                      <SelectItem value="special">特种车辆</SelectItem>
                      <SelectItem value="unlicensed">无牌照</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={() => loadRecords(1)}>查询</Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>通行时间</TableHead>
                      <TableHead>车牌号</TableHead>
                      <TableHead>车辆类型</TableHead>
                      <TableHead>颜色</TableHead>
                      <TableHead>方向</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>置信度</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recordsLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 8 }).map((_, j) => (
                            <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : records.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-8 text-gray-500">暂无记录</TableCell></TableRow>
                    ) : (
                      records.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell className="text-sm">{new Date(record.createdAt).toLocaleString('zh-CN')}</TableCell>
                          <TableCell className="font-medium">{record.plateNumber}</TableCell>
                          <TableCell className="text-sm">{VEHICLE_TYPE_NAMES[record.vehicleType] || record.vehicleType}</TableCell>
                          <TableCell className="text-sm">{VEHICLE_COLOR_NAMES[record.color] || record.color}</TableCell>
                          <TableCell><Badge variant={record.direction === 'in' ? 'default' : 'secondary'}>{DIRECTION_NAMES[record.direction]}</Badge></TableCell>
                          <TableCell><Badge className={STATUS_COLORS[record.status]}>{STATUS_NAMES[record.status]}</Badge></TableCell>
                          <TableCell className="text-sm">{record.confidence.toFixed(0)}%</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="sm" onClick={() => { setPreviewRecord(record); setPreviewImage(record.imageUrl); }}>
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteRecord(record.id)}>
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                {recordsTotal > 15 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-gray-500">第 {recordsPage} 页，共 {Math.ceil(recordsTotal / 15)} 页</p>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" disabled={recordsPage <= 1} onClick={() => loadRecords(recordsPage - 1)}>上一页</Button>
                      <Button variant="outline" size="sm" disabled={recordsPage >= Math.ceil(recordsTotal / 15)} onClick={() => loadRecords(recordsPage + 1)}>下一页</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 汇总报表页 */}
          <TabsContent value="summary">
            <SummaryReport />
          </TabsContent>

          {/* 白名单管理页 */}
          <TabsContent value="whitelist">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>内部车辆白名单</CardTitle>
                    <CardDescription>共 {whitelistTotal} 辆内部车辆</CardDescription>
                  </div>
                  <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                    <DialogTrigger asChild>
                      <Button><Plus className="w-4 h-4 mr-2" />添加车辆</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>添加内部车辆</DialogTitle>
                        <DialogDescription>录入内部车辆信息，识别时自动标记</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>车牌号 *</Label>
                          <Input placeholder="如：京A12345" value={newVehicle.plateNumber} onChange={(e) => setNewVehicle({...newVehicle, plateNumber: e.target.value.toUpperCase()})} />
                        </div>
                        <div className="space-y-2">
                          <Label>车辆类型 *</Label>
                          <Select value={newVehicle.vehicleType} onValueChange={(v) => setNewVehicle({...newVehicle, vehicleType: v})}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {VEHICLE_TYPES.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>车辆颜色</Label>
                          <Select value={newVehicle.color} onValueChange={(v) => setNewVehicle({...newVehicle, color: v})}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {VEHICLE_COLORS.map((color) => <SelectItem key={color.value} value={color.value}>{color.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>品牌型号</Label>
                          <Input placeholder="如：丰田卡罗拉" value={newVehicle.brand} onChange={(e) => setNewVehicle({...newVehicle, brand: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <Label>车主/负责人</Label>
                          <Input placeholder="请输入" value={newVehicle.owner} onChange={(e) => setNewVehicle({...newVehicle, owner: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <Label>部门</Label>
                          <Input placeholder="请输入" value={newVehicle.department} onChange={(e) => setNewVehicle({...newVehicle, department: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <Label>备注</Label>
                          <Textarea placeholder="其他备注信息" value={newVehicle.remark} onChange={(e) => setNewVehicle({...newVehicle, remark: e.target.value})} />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setAddDialogOpen(false)}>取消</Button>
                        <Button onClick={handleAddWhitelist}>添加</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>车牌号</TableHead>
                      <TableHead>车辆类型</TableHead>
                      <TableHead>颜色</TableHead>
                      <TableHead>品牌型号</TableHead>
                      <TableHead>车主/负责人</TableHead>
                      <TableHead>部门</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {whitelistLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 7 }).map((_, j) => (
                            <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : whitelistData.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-500">暂无白名单车辆</TableCell></TableRow>
                    ) : (
                      whitelistData.map((vehicle) => (
                        <TableRow key={vehicle.id}>
                          <TableCell className="font-medium">{vehicle.plateNumber}</TableCell>
                          <TableCell>{VEHICLE_TYPE_NAMES[vehicle.vehicleType] || vehicle.vehicleType}</TableCell>
                          <TableCell>{VEHICLE_COLOR_NAMES[vehicle.color] || vehicle.color}</TableCell>
                          <TableCell className="text-sm text-gray-600">{vehicle.brand || '-'}</TableCell>
                          <TableCell className="text-sm">{vehicle.owner || '-'}</TableCell>
                          <TableCell className="text-sm">{vehicle.department || '-'}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteWhitelist(vehicle.id)}>
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* 预览弹窗 */}
      <Dialog open={!!previewImage} onOpenChange={() => { setPreviewImage(null); setPreviewRecord(null); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>通行记录详情</DialogTitle></DialogHeader>
          {previewRecord && (
            <div className="space-y-4">
              <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                <img src={previewImage || ''} alt="通行图片" className="w-full h-full object-contain" />
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500">车牌号：</span><span className="font-medium">{previewRecord.plateNumber}</span></div>
                <div><span className="text-gray-500">通行时间：</span><span>{new Date(previewRecord.createdAt).toLocaleString('zh-CN')}</span></div>
                <div><span className="text-gray-500">车辆类型：</span><span>{VEHICLE_TYPE_NAMES[previewRecord.vehicleType] || previewRecord.vehicleType}</span></div>
                <div><span className="text-gray-500">车辆颜色：</span><span>{VEHICLE_COLOR_NAMES[previewRecord.color] || previewRecord.color}</span></div>
                <div><span className="text-gray-500">通行方向：</span><Badge variant={previewRecord.direction === 'in' ? 'default' : 'secondary'}>{DIRECTION_NAMES[previewRecord.direction]}</Badge></div>
                <div><span className="text-gray-500">车辆状态：</span><Badge className={STATUS_COLORS[previewRecord.status]}>{STATUS_NAMES[previewRecord.status]}</Badge></div>
                <div><span className="text-gray-500">识别置信度：</span><span>{previewRecord.confidence.toFixed(1)}%</span></div>
                {previewRecord.remark && <div className="col-span-2"><span className="text-gray-500">备注：</span><span>{previewRecord.remark}</span></div>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// 辅助组件
function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">{icon}</div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-lg font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className={`p-4 rounded-lg`}>
      <div className="mb-2">{icon}</div>
      <h4 className="font-medium text-gray-900 mb-1">{title}</h4>
      <p className="text-sm text-gray-600">{desc}</p>
    </div>
  );
}
