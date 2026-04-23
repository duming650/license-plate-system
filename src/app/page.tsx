'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Car, Camera, Download, Users, FileText, Settings, 
  AlertTriangle, XCircle, CheckCircle, Clock, Search,
  Plus, Upload, Trash2, Edit2, Eye, RefreshCw, TrendingUp
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
  getStats,
  RecognizeResponse,
  WhitelistVehicle
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
  { value: 'orange', label: '橙色' },
  { value: 'brown', label: '棕色' },
];

export default function Home() {
  const { stats, whitelist, refreshStats, refreshWhitelist, addRecentRecord } = useApp();
  
  // 状态
  const [activeTab, setActiveTab] = useState('monitor');
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [useMock, setUseMock] = useState(true); // 默认使用模拟模式
  
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
  
  // 添加白名单弹窗
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
  
  // 预览图片
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewRecord, setPreviewRecord] = useState<RecognizeResponse | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 加载记录列表
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
      console.error('加载记录失败:', error);
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
      console.error('加载白名单失败:', error);
      toast.error('加载白名单失败');
    } finally {
      setWhitelistLoading(false);
    }
  }, []);

  // 初始化加载
  useEffect(() => {
    loadRecords();
    loadWhitelist();
  }, [loadRecords, loadWhitelist]);

  // 处理图片上传
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, direction: 'in' | 'out') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      toast.error('请上传图片文件');
      return;
    }

    // 验证文件大小 (最大 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('图片大小不能超过 10MB');
      return;
    }

    setIsRecognizing(true);
    
    try {
      // 转换为 base64
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        
        try {
          const result = await recognizeVehicle(base64, direction, useMock);
          addRecentRecord(result);
          await loadRecords();
          toast.success(`识别成功：${result.plateNumber || '无牌照'}`);
        } catch (error: any) {
          console.error('识别失败:', error);
          toast.error(error.message || '识别失败');
        } finally {
          setIsRecognizing(false);
        }
      };
      reader.onerror = () => {
        toast.error('读取图片失败');
        setIsRecognizing(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('处理图片失败:', error);
      toast.error('处理图片失败');
      setIsRecognizing(false);
    }

    // 清空 input
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
      setNewVehicle({
        plateNumber: '',
        vehicleType: 'sedan',
        color: 'white',
        brand: '',
        owner: '',
        department: '',
        remark: '',
      });
      loadWhitelist();
      refreshWhitelist();
    } catch (error: any) {
      toast.error(error.message || '添加失败');
    }
  };

  // 删除白名单
  const handleDeleteWhitelist = async (id: string) => {
    if (!confirm('确定要删除这条白名单吗？')) return;
    
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
    if (!confirm('确定要删除这条记录吗？')) return;
    
    try {
      await deleteRecord(id);
      toast.success('删除成功');
      loadRecords();
      refreshStats();
    } catch (error) {
      toast.error('删除失败');
    }
  };

  // 导出记录
  const handleExport = () => {
    const query: any = {};
    if (queryDirection) query.direction = queryDirection;
    if (queryStatus) query.status = queryStatus;
    if (queryPlate) query.plateNumber = queryPlate;
    
    exportRecords(query);
    toast.success('开始导出...');
  };

  // 预览记录
  const handlePreview = (record: RecognizeResponse) => {
    setPreviewRecord(record);
    setPreviewImage(record.imageUrl);
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
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Clock className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">今日通行</p>
                  <p className="text-lg font-bold text-gray-900">{stats?.today || 0}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">内部车辆</p>
                  <p className="text-lg font-bold text-gray-900">{stats?.internal || 0}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">特种车辆</p>
                  <p className="text-lg font-bold text-gray-900">{stats?.special || 0}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <XCircle className="w-4 h-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">无牌照</p>
                  <p className="text-lg font-bold text-gray-900">{stats?.unlicensed || 0}</p>
                </div>
              </div>
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
            <TabsTrigger value="whitelist" className="gap-2">
              <Users className="w-4 h-4" />
              白名单管理
            </TabsTrigger>
          </TabsList>

          {/* 监控识别页 */}
          <TabsContent value="monitor">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 驶入识别 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    车辆驶入识别
                  </CardTitle>
                  <CardDescription>上传车辆图片进行驶入识别</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      ref={fileInputRef}
                      onChange={(e) => handleImageUpload(e, 'in')}
                    />
                    
                    <div 
                      className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-green-500 hover:bg-green-50 transition-colors cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {isRecognizing ? (
                        <div className="space-y-3">
                          <RefreshCw className="w-12 h-12 mx-auto text-green-600 animate-spin" />
                          <p className="text-gray-600">正在识别...</p>
                        </div>
                      ) : (
                        <>
                          <Camera className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                          <p className="text-gray-600 mb-1">点击上传车辆图片</p>
                          <p className="text-sm text-gray-400">支持 JPG、PNG 格式，最大 10MB</p>
                        </>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="useMock"
                        checked={useMock}
                        onChange={(e) => setUseMock(e.target.checked)}
                        className="rounded"
                      />
                      <Label htmlFor="useMock" className="text-sm text-gray-600">
                        使用模拟模式（测试用，无需配置 AI）
                      </Label>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 驶出识别 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-red-600 rotate-180" />
                    车辆驶出识别
                  </CardTitle>
                  <CardDescription>上传车辆图片进行驶出识别</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      id="upload-out"
                      onChange={(e) => handleImageUpload(e, 'out')}
                    />
                    
                    <div 
                      className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                      onClick={() => document.getElementById('upload-out')?.click()}
                    >
                      {isRecognizing ? (
                        <div className="space-y-3">
                          <RefreshCw className="w-12 h-12 mx-auto text-red-600 animate-spin" />
                          <p className="text-gray-600">正在识别...</p>
                        </div>
                      ) : (
                        <>
                          <Camera className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                          <p className="text-gray-600 mb-1">点击上传车辆图片</p>
                          <p className="text-sm text-gray-400">支持 JPG、PNG 格式，最大 10MB</p>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 识别说明 */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>识别功能说明</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-green-50 rounded-lg">
                      <CheckCircle className="w-8 h-8 text-green-600 mb-2" />
                      <h4 className="font-medium text-gray-900 mb-1">内部车辆</h4>
                      <p className="text-sm text-gray-600">白名单中的车辆，识别后标记为内部车辆</p>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <Car className="w-8 h-8 text-blue-600 mb-2" />
                      <h4 className="font-medium text-gray-900 mb-1">外部车辆</h4>
                      <p className="text-sm text-gray-600">普通外部车辆，正常记录通行</p>
                    </div>
                    <div className="p-4 bg-orange-50 rounded-lg">
                      <AlertTriangle className="w-8 h-8 text-orange-600 mb-2" />
                      <h4 className="font-medium text-gray-900 mb-1">特种车辆</h4>
                      <p className="text-sm text-gray-600">铲车、叉车、钩机等工程车辆</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <XCircle className="w-8 h-8 text-gray-600 mb-2" />
                      <h4 className="font-medium text-gray-900 mb-1">无牌照</h4>
                      <p className="text-sm text-gray-600">未能识别车牌的车辆</p>
                    </div>
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
                    <Button variant="outline" onClick={() => loadRecords(1)}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      刷新
                    </Button>
                    <Button onClick={handleExport}>
                      <Download className="w-4 h-4 mr-2" />
                      导出 Excel
                    </Button>
                  </div>
                </div>
                
                {/* 查询条件 */}
                <div className="flex items-center gap-4 mt-4">
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-gray-400" />
                    <Input 
                      placeholder="搜索车牌号" 
                      className="w-40"
                      value={queryPlate}
                      onChange={(e) => setQueryPlate(e.target.value)}
                    />
                  </div>
                  <Select value={queryDirection} onValueChange={setQueryDirection}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="通行方向" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">全部方向</SelectItem>
                      <SelectItem value="in">驶入</SelectItem>
                      <SelectItem value="out">驶出</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={queryStatus} onValueChange={setQueryStatus}>
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder="车辆状态" />
                    </SelectTrigger>
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
                      <TableHead className="w-24">通行时间</TableHead>
                      <TableHead className="w-28">车牌号</TableHead>
                      <TableHead className="w-24">车辆类型</TableHead>
                      <TableHead className="w-20">颜色</TableHead>
                      <TableHead className="w-20">方向</TableHead>
                      <TableHead className="w-24">状态</TableHead>
                      <TableHead className="w-20">置信度</TableHead>
                      <TableHead className="w-20">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recordsLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        </TableRow>
                      ))
                    ) : records.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                          暂无记录
                        </TableCell>
                      </TableRow>
                    ) : (
                      records.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell className="text-sm">
                            {new Date(record.createdAt).toLocaleString('zh-CN')}
                          </TableCell>
                          <TableCell className="font-medium">
                            {record.plateNumber}
                          </TableCell>
                          <TableCell className="text-sm">
                            {VEHICLE_TYPE_NAMES[record.vehicleType] || record.vehicleType}
                          </TableCell>
                          <TableCell className="text-sm">
                            {VEHICLE_COLOR_NAMES[record.color] || record.color}
                          </TableCell>
                          <TableCell>
                            <Badge variant={record.direction === 'in' ? 'default' : 'secondary'}>
                              {DIRECTION_NAMES[record.direction]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={STATUS_COLORS[record.status]}>
                              {STATUS_NAMES[record.status]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {record.confidence.toFixed(0)}%
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handlePreview(record)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleDeleteRecord(record.id)}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                
                {/* 分页 */}
                {recordsTotal > 15 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-gray-500">
                      第 {recordsPage} 页，共 {Math.ceil(recordsTotal / 15)} 页
                    </p>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        disabled={recordsPage <= 1}
                        onClick={() => loadRecords(recordsPage - 1)}
                      >
                        上一页
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        disabled={recordsPage >= Math.ceil(recordsTotal / 15)}
                        onClick={() => loadRecords(recordsPage + 1)}
                      >
                        下一页
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
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
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        添加车辆
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>添加内部车辆</DialogTitle>
                        <DialogDescription>
                          录入内部车辆信息，识别时自动标记
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="plateNumber">车牌号 *</Label>
                          <Input
                            id="plateNumber"
                            placeholder="如：京A12345"
                            value={newVehicle.plateNumber}
                            onChange={(e) => setNewVehicle({...newVehicle, plateNumber: e.target.value.toUpperCase()})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="vehicleType">车辆类型 *</Label>
                          <Select 
                            value={newVehicle.vehicleType} 
                            onValueChange={(v) => setNewVehicle({...newVehicle, vehicleType: v})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {VEHICLE_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="color">车辆颜色</Label>
                          <Select 
                            value={newVehicle.color} 
                            onValueChange={(v) => setNewVehicle({...newVehicle, color: v})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {VEHICLE_COLORS.map((color) => (
                                <SelectItem key={color.value} value={color.value}>
                                  {color.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="brand">品牌型号</Label>
                          <Input
                            id="brand"
                            placeholder="如：丰田卡罗拉"
                            value={newVehicle.brand}
                            onChange={(e) => setNewVehicle({...newVehicle, brand: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="owner">车主/负责人</Label>
                          <Input
                            id="owner"
                            placeholder="请输入"
                            value={newVehicle.owner}
                            onChange={(e) => setNewVehicle({...newVehicle, owner: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="department">部门</Label>
                          <Input
                            id="department"
                            placeholder="请输入"
                            value={newVehicle.department}
                            onChange={(e) => setNewVehicle({...newVehicle, department: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="remark">备注</Label>
                          <Textarea
                            id="remark"
                            placeholder="其他备注信息"
                            value={newVehicle.remark}
                            onChange={(e) => setNewVehicle({...newVehicle, remark: e.target.value})}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                          取消
                        </Button>
                        <Button onClick={handleAddWhitelist}>
                          添加
                        </Button>
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
                      <TableHead className="w-20">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {whitelistLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        </TableRow>
                      ))
                    ) : whitelistData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          暂无白名单车辆，点击上方按钮添加
                        </TableCell>
                      </TableRow>
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
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDeleteWhitelist(vehicle.id)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                
                {/* 分页 */}
                {whitelistTotal > 15 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-gray-500">
                      第 {whitelistPage} 页，共 {Math.ceil(whitelistTotal / 15)} 页
                    </p>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        disabled={whitelistPage <= 1}
                        onClick={() => loadWhitelist(whitelistPage - 1)}
                      >
                        上一页
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        disabled={whitelistPage >= Math.ceil(whitelistTotal / 15)}
                        onClick={() => loadWhitelist(whitelistPage + 1)}
                      >
                        下一页
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* 图片预览弹窗 */}
      <Dialog open={!!previewImage} onOpenChange={() => { setPreviewImage(null); setPreviewRecord(null); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>通行记录详情</DialogTitle>
          </DialogHeader>
          {previewRecord && (
            <div className="space-y-4">
              <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                <img 
                  src={previewImage || ''} 
                  alt="通行图片" 
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">车牌号：</span>
                  <span className="font-medium">{previewRecord.plateNumber}</span>
                </div>
                <div>
                  <span className="text-gray-500">通行时间：</span>
                  <span>{new Date(previewRecord.createdAt).toLocaleString('zh-CN')}</span>
                </div>
                <div>
                  <span className="text-gray-500">车辆类型：</span>
                  <span>{VEHICLE_TYPE_NAMES[previewRecord.vehicleType] || previewRecord.vehicleType}</span>
                </div>
                <div>
                  <span className="text-gray-500">车辆颜色：</span>
                  <span>{VEHICLE_COLOR_NAMES[previewRecord.color] || previewRecord.color}</span>
                </div>
                <div>
                  <span className="text-gray-500">通行方向：</span>
                  <Badge variant={previewRecord.direction === 'in' ? 'default' : 'secondary'}>
                    {DIRECTION_NAMES[previewRecord.direction]}
                  </Badge>
                </div>
                <div>
                  <span className="text-gray-500">车辆状态：</span>
                  <Badge className={STATUS_COLORS[previewRecord.status]}>
                    {STATUS_NAMES[previewRecord.status]}
                  </Badge>
                </div>
                <div>
                  <span className="text-gray-500">识别置信度：</span>
                  <span>{previewRecord.confidence.toFixed(1)}%</span>
                </div>
                {previewRecord.remark && (
                  <div className="col-span-2">
                    <span className="text-gray-500">备注：</span>
                    <span>{previewRecord.remark}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
