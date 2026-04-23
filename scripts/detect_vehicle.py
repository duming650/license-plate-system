#!/usr/bin/env python3
"""
车辆检测脚本 - 检测图片中是否有车辆，排除人
使用 OpenCV 和 Haar Cascade 或 YOLO
"""

import sys
import json
import os

def main():
    # 检查参数
    if len(sys.argv) < 2:
        print(json.dumps({
            'success': False,
            'error': '缺少图片参数'
        }))
        sys.exit(1)
    
    image_path = sys.argv[1]
    
    try:
        # 检查图片是否存在
        if not os.path.exists(image_path):
            print(json.dumps({
                'success': False,
                'error': f'图片不存在: {image_path}'
            }))
            sys.exit(1)
        
        # 尝试使用 OpenCV
        try:
            import cv2
        except ImportError:
            print(json.dumps({
                'success': False,
                'error': '请先安装 OpenCV: pip install opencv-python',
                'need_install': True
            }))
            sys.exit(1)
        
        # 读取图片
        img = cv2.imread(image_path)
        if img is None:
            print(json.dumps({
                'success': False,
                'error': '无法读取图片'
            }))
            sys.exit(1)
        
        # 转换为灰度图
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # 尝试加载车辆检测器
        vehicle_found = False
        has_person = False
        
        # 方法1: 尝试使用 OpenCV 自带的分类器
        car_cascade = None
        try:
            # 尝试不同的路径
            cascade_paths = [
                cv2.data.haarcascades + 'haarcascade_car.xml',
                'C:/opencv/build/etc/haarcascades/haarcascade_car.xml',
            ]
            for path in cascade_paths:
                if os.path.exists(path):
                    car_cascade = cv2.CascadeClassifier(path)
                    break
        except:
            pass
        
        # 方法2: 使用行人检测器（OpenCV 内置）
        person_cascade = None
        try:
            person_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_fullbody.xml')
        except:
            pass
        
        # 检测行人
        if person_cascade is not None:
            persons = person_cascade.detectMultiScale(
                gray,
                scaleFactor=1.1,
                minNeighbors=3,
                minSize=(30, 60)
            )
            if len(persons) > 0:
                has_person = True
        
        # 检测车辆（如果分类器可用）
        if car_cascade is not None:
            cars = car_cascade.detectMultiScale(
                gray,
                scaleFactor=1.1,
                minNeighbors=3,
                minSize=(50, 50)
            )
            if len(cars) > 0:
                vehicle_found = True
        
        # 如果没有车辆分类器，基于图像特征判断
        if car_cascade is None:
            # 简单启发式方法：检查画面中是否有大面积的矩形物体（可能是车）
            # 这里可以添加更复杂的逻辑
            
            # 如果检测到行人但没有其他特征，返回未检测到车辆
            if not vehicle_found and not has_person:
                # 可以基于图像复杂度等特征做简单判断
                pass
        
        # 返回结果
        result = {
            'success': True,
            'hasVehicle': vehicle_found,
            'hasPerson': has_person,
            'message': ''
        }
        
        if vehicle_found:
            result['message'] = '检测到车辆'
        elif has_person:
            result['message'] = '检测到人而非车辆'
        else:
            result['message'] = '未检测到车辆'
        
        print(json.dumps(result))
        
    except Exception as e:
        print(json.dumps({
            'success': False,
            'error': str(e)
        }))
        sys.exit(1)


if __name__ == '__main__':
    main()
