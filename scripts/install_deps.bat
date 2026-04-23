@echo off
REM Python Dependencies Installation Script for License Plate Recognition System

echo ========================================
echo   License Plate Recognition System
echo   Python Dependencies Installer
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found. Please install Python 3.8+ first.
    echo Download: https://www.python.org/downloads/
    pause
    exit /b 1
)

echo [OK] Python is installed
echo.

echo Installing dependencies...
echo.

echo Step 1/3: Installing OpenCV (for vehicle detection)...
pip install opencv-python -i https://pypi.tuna.tsinghua.edu.cn/simple
if errorlevel 1 (
    echo [WARNING] OpenCV installation may have issues
)

echo.
echo Step 2/3: Installing NumPy...
pip install numpy -i https://pypi.tuna.tsinghua.edu.cn/simple
if errorlevel 1 (
    echo [WARNING] NumPy installation may have issues
)

echo.
echo Step 3/3: Installing PaddleOCR (for plate recognition)...
pip install paddlepaddle paddleocr -i https://pypi.tuna.tsinghua.edu.cn/simple
if errorlevel 1 (
    echo [WARNING] PaddleOCR installation may have issues
)

echo.
echo ========================================
echo   Installation Complete!
echo ========================================
echo.
echo To test the recognition:
echo   python scripts\vehicle_recognize.py test.jpg
echo.
echo If you get errors, try installing manually:
echo   pip install opencv-python numpy paddlepaddle paddleocr
echo.

pause
