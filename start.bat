@echo off
echo Starting License Plate Recognition System...
echo.

REM Check Node.js
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found!
    pause
    exit /b 1
)

REM Start Next.js
npx next dev

pause
