@echo off
echo ========================================
echo   Test Python Recognition
echo ========================================
echo.

REM Test Python
echo Checking Python...
python --version
if errorlevel 1 (
    echo [ERROR] Python not found!
    pause
    exit /b 1
)
echo [OK] Python found
echo.

REM Test with a dummy image path first
echo Testing script...
echo.

REM Wait for user to provide image path
set /p IMG="Enter image path (or press Enter for test): "

if "%IMG%"=="" (
    echo No image path provided.
    echo Please put an image file and enter its path.
    echo Example: C:\Users\Administrator\Desktop\car.jpg
    pause
    exit /b 0
)

echo Running: python scripts\vehicle_recognize.py "%IMG%"
echo.
python scripts\vehicle_recognize.py "%IMG%"

echo.
echo ========================================
echo   Done
echo ========================================
pause
