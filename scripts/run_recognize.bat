@echo off
REM 车辆检测与车牌识别
REM 使用方法: run_recognize.bat <图片路径>

python "%~dp0vehicle_recognize.py" %1
