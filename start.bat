@echo off
echo ========================================
echo    License Plate Recognition System
echo ========================================
echo.

cd /d "%~dp0"

echo [1/3] Installing dependencies...
call npm install

echo.
echo [2/3] Dependencies ready
echo.

echo [3/3] Starting server...
echo Please wait...
echo.
echo Access: http://localhost:3000
echo Press Ctrl+C to stop
echo.

npm run dev

pause
