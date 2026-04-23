@echo off
chcp 65001 >nul
echo ========================================
echo    车牌识别系统 - 安装脚本
echo ========================================
echo.

:: 检查 Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [提示] 未检测到 Node.js，正在打开下载页面...
    start https://nodejs.org
    echo.
    echo 请先安装 Node.js，然后再运行此脚本
    pause
    exit /b 1
)

echo [检测] Node.js 版本:
node -v
echo.

:: 获取当前目录
set PROJECT_DIR=%~dp0

echo [安装] 正在安装依赖，这可能需要几分钟...
cd /d "%PROJECT_DIR%"

npm install

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo    安装成功！
    echo ========================================
    echo.
    echo 下一步：
    echo   1. 双击 "启动.bat" 运行系统
    echo   2. 打开浏览器访问 http://localhost:5000
    echo.
) else (
    echo.
    echo [错误] 安装失败，请检查网络连接
)

echo.
pause
