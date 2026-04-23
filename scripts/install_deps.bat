@echo off
REM Python 依赖安装脚本
REM 需要先安装 Python: https://www.python.org/downloads/

echo ========================================
echo   车牌识别系统 - Python 依赖安装
echo ========================================
echo.

REM 检查 Python 是否安装
python --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到 Python，请先安装 Python 3.8+
    echo 下载地址: https://www.python.org/downloads/
    pause
    exit /b 1
)

echo [OK] Python 已安装
echo.

echo 正在安装核心依赖...
echo.

echo 安装 OpenCV（用于车辆检测）...
pip install opencv-python -i https://pypi.tuna.tsinghua.edu.cn/simple

echo.
echo 安装 NumPy...
pip install numpy -i https://pypi.tuna.tsinghua.edu.cn/simple

echo.
echo 安装 PaddleOCR（用于车牌识别）...
pip install paddlepaddle paddleocr -i https://pypi.tuna.tsinghua.edu.cn/simple

echo.
echo ========================================
echo   安装完成！
echo ========================================
echo.
echo 可选：安装 EasyOCR（备选OCR引擎）
echo   pip install easyocr
echo.
echo 测试识别：
echo   python scripts\vehicle_recognize.py test.jpg
echo.

pause
