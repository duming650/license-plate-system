# 车牌识别系统

## 快速开始

### 1. 安装 Python 依赖（可选，用于真实车牌识别）

如果你想使用真实的车牌识别功能（非模拟），需要安装 Python 依赖：

```bash
cd scripts
install_deps.bat
```

或者手动安装：

```bash
pip install opencv-python numpy paddlepaddle paddleocr
```

### 2. 安装 Node.js 依赖

```bash
npm install
```

### 3. 启动系统

双击 `start.bat` 或运行：

```bash
npm run dev
```

然后浏览器打开 http://localhost:3000

## 使用说明

### 识别模式

- **默认模式**：使用 Python 脚本进行车牌识别
- **模拟模式**：使用随机生成的数据（用于测试）

### 摄像头设置

1. 点击页面上的"设置"按钮
2. 选择摄像头品牌
3. 输入 RTSP 地址
4. 点击"连接"查看画面

支持的摄像头品牌：
- 海康威视
- 大华
- 宇视
- 天地伟业
- 汉邦高科
- 华为

### RTSP 地址格式

各品牌 RTSP 地址格式：

**海康威视**
```
rtsp://admin:密码@IP:554/Streaming/Channels/101
```

**大华**
```
rtsp://admin:密码@IP:554/cam/realmonitor?channel=1&subtype=0
```

**汉邦高科**
```
rtsp://admin:密码@IP:554/stream1
```

### 识别规则

- **内部车辆**：白名单中的车辆，显示绿色标记
- **特种车辆**：铲车、叉车、挖掘机等，显示橙色标记
- **外部车辆**：普通车辆，显示蓝色标记
- **无牌照**：未能识别车牌，显示灰色标记

### 白名单管理

在"白名单"页面可以添加内部车辆信息，添加后系统会自动识别。

## 常见问题

### 1. 启动报错 "Turbopack"

确保 package.json 中的 dev 脚本包含 `--no-turbo`：

```json
"dev": "next dev --no-turbo"
```

### 2. Python 识别不工作

1. 确保已安装 Python 依赖
2. 检查 Python 是否在系统 PATH 中
3. 查看命令行输出中的 `[Python]` 日志

### 3. 摄像头画面不显示

1. 检查 RTSP 地址是否正确
2. 确保电脑和摄像头在同一个网络
3. 尝试使用截图模式

### 4. 识别不准确

1. 确保图片清晰
2. 车牌在画面中占比较大
3. 避免强光或逆光

## 技术架构

- **前端**：Next.js 16 + React 19 + TypeScript
- **UI**：shadcn/ui + Tailwind CSS
- **车牌识别**：PaddleOCR + OpenCV
- **数据存储**：JSON 文件

## 目录结构

```
├── src/
│   ├── app/           # Next.js 页面
│   ├── lib/           # 核心逻辑
│   │   ├── recognition.ts    # 识别逻辑
│   │   ├── pythonBridge.ts    # Python 调用
│   │   └── data/      # 数据类型和存储
│   └── components/     # UI 组件
├── scripts/
│   ├── vehicle_recognize.py   # Python 识别脚本
│   ├── install_deps.bat        # 安装依赖脚本
│   └── test_python.bat        # 测试脚本
├── public/
│   └── uploads/       # 上传的图片存储
├── data/              # JSON 数据文件
│   ├── records.json   # 通行记录
│   └── whitelist.json  # 白名单
└── start.bat          # 启动脚本
```

## 许可证

MIT License
