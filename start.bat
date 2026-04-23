@echo off
echo ========================================
echo   车牌识别系统
echo ========================================
echo.
echo Starting Next.js server...
echo.

cd /d "%~dp0"

npx next dev --no-turbo

pause
