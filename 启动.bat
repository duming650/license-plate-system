@echo off
chcp 65001 >nul
echo ========================================
echo    车牌识别系统 - 启动脚本
echo ========================================
echo.

:: 检查 Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js
    echo 请先安装 Node.js：https://nodejs.org
    pause
    exit /b 1
)

:: 获取当前目录
set PROJECT_DIR=%~dp0

echo [1/3] 正在安装依赖...
cd /d "%PROJECT_DIR%"
npm install

if %errorlevel% neq 0 (
    echo [错误] 依赖安装失败
    pause
    exit /b 1
)

echo.
echo [2/3] 依赖安装完成
echo.

echo [3/3] 正在启动服务...
echo 请稍等，服务启动中...
echo.
echo 启动成功后，请访问: http://localhost:5000
echo 按 Ctrl+C 可以停止服务
echo.

npm run dev

pause
