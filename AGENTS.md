# 车牌识别系统 (License Plate Recognition System)

## 项目概述

智能车牌识别系统，支持车辆通行记录、内部车辆白名单管理、通行统计和电子表格导出功能。

## 技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4

## 目录结构

```
├── src/
│   ├── app/
│   │   ├── api/                    # API 路由
│   │   │   ├── recognize/          # 车辆识别接口
│   │   │   ├── records/           # 通行记录管理
│   │   │   ├── whitelist/         # 白名单管理
│   │   │   ├── stats/             # 统计数据
│   │   │   └── export/            # 数据导出
│   │   ├── page.tsx               # 主页面
│   │   ├── layout.tsx             # 布局
│   │   └── globals.css            # 全局样式
│   ├── components/ui/             # UI 组件库
│   ├── lib/
│   │   ├── api.ts                 # API 客户端
│   │   ├── context.tsx            # 应用状态管理
│   │   ├── recognition.ts         # 车牌识别逻辑
│   │   └── data/
│   │       ├── types.ts           # 类型定义
│   │       ├── store.ts           # 数据存储（JSON 文件）
│   │       └── imageStore.ts      # 图片存储
│   └── hooks/
├── public/uploads/               # 上传的图片存储
├── data/                         # JSON 数据库文件
│   ├── records.json              # 通行记录
│   └── whitelist.json            # 白名单
└── package.json
```

## 功能模块

### 1. 车辆识别

- **驶入识别**: 上传车辆图片，识别车牌号、车型、颜色
- **驶出识别**: 记录车辆离开
- **识别模式**:
  - 模拟模式（默认）：用于测试，无需配置 AI
  - LLM 模式：使用多模态大模型进行真实识别

### 2. 车辆分类

| 类型 | 说明 |
|------|------|
| 内部车辆 | 白名单中的车辆，识别后标记为绿色 |
| 外部车辆 | 普通外部车辆，识别后标记为蓝色 |
| 特种车辆 | 铲车、叉车、钩机等工程车辆，标记为橙色 |
| 无牌照 | 未能识别车牌的车辆，标记为灰色 |

### 3. 白名单管理

- 添加内部车辆（车牌号、车型、颜色、品牌、车主、部门等）
- 支持批量管理
- 自动识别内部车辆并标记

### 4. 通行记录

- 记录所有车辆通行信息
- 支持多条件查询（方向、状态、车牌号）
- 分页展示
- 查看通行图片

### 5. 导出功能

- 导出为 CSV 格式（支持 Excel 打开）
- 支持按条件筛选后导出

## API 接口

### 车辆识别
```
POST /api/recognize
Body: { imageData: string, direction: 'in' | 'out', useMock?: boolean }
```

### 通行记录
```
GET  /api/records?page=1&pageSize=20&direction=&status=&plateNumber=
DELETE /api/records { id: string }
```

### 白名单
```
GET    /api/whitelist
POST   /api/whitelist
PUT    /api/whitelist { id, ...updates }
DELETE /api/whitelist { id }
PATCH  /api/whitelist/import { vehicles: [] }
```

### 统计
```
GET /api/stats
```

### 导出
```
GET /api/export?startDate=&endDate=&direction=&status=&plateNumber=&format=csv
```

## 数据模型

### VehicleRecord (通行记录)
```typescript
{
  id: string
  plateNumber: string          // 车牌号
  vehicleType: VehicleType    // sedan|suv|truck|bus|special|motorcycle|unknown
  color: VehicleColor         // white|black|silver|gray|red|blue|green|...
  direction: 'in' | 'out'    // 通行方向
  status: RecordStatus        // normal|internal|special|unlicensed
  confidence: number          // 识别置信度
  imageUrl: string           // 抓拍图片路径
  createdAt: string          // 通行时间
}
```

### WhitelistVehicle (白名单)
```typescript
{
  id: string
  plateNumber: string
  vehicleType: VehicleType
  color: VehicleColor
  brand?: string
  owner?: string
  department?: string
  remark?: string
  createdAt: string
  updatedAt: string
}
```

## 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| COZE_API_KEY | Coze API 密钥 | - |
| COZE_TOKEN | Coze Token | - |
| COZE_BASE_URL | API 地址 | https://api.coze.cn |

## 开发命令

```bash
pnpm install    # 安装依赖
pnpm dev        # 开发模式
pnpm build      # 构建生产版本
pnpm start      # 启动生产环境
pnpm lint       # 代码检查
pnpm ts-check   # TypeScript 检查
```

## 测试验证

```bash
# 识别接口测试
curl -X POST http://localhost:5000/api/recognize \
  -H 'Content-Type: application/json' \
  -d '{"imageData":"base64...","direction":"in","useMock":true}'

# 导出测试
curl -o records.csv "http://localhost:5000/api/export"
```
