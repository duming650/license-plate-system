#!/usr/bin/env python3
"""
车牌识别脚本 - 使用 PaddleOCR
支持车辆检测和车牌识别
"""

import sys
import json
import base64
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
        
        # 动态导入 PaddleOCR（需要先安装）
        try:
            from paddleocr import PaddleOCR
            from PIL import Image
            import numpy as np
        except ImportError as e:
            print(json.dumps({
                'success': False,
                'error': f'请先安装依赖: pip install paddlepaddle paddleocr pillow numpy',
                'need_install': True
            }))
            sys.exit(1)
        
        # 初始化 PaddleOCR
        # use_angle_cls=True 启用方向分类，det=True 检测，rec=True 识别
        ocr = PaddleOCR(
            use_angle_cls=True,
            lang='ch',  # 中文
            det=True,   # 检测
            rec=True,   # 识别
            show_log=False
        )
        
        # 进行识别
        result = ocr.ocr(image_path, cls=True)
        
        # 解析结果
        plates = []
        if result and result[0]:
            for line in result[0]:
                if line:
                    text = line[1][0] if len(line) > 1 else ''
                    confidence = line[1][1] if len(line) > 1 else 0
                    
                    # 过滤无效结果
                    if text and len(text) >= 7:  # 车牌至少7位
                        # 检查是否是车牌格式（中国车牌）
                        if is_valid_plate(text):
                            plates.append({
                                'plate': text,
                                'confidence': float(confidence)
                            })
        
        # 判断结果
        if plates:
            # 按置信度排序，返回最高置信度的
            best_plate = max(plates, key=lambda x: x['confidence'])
            print(json.dumps({
                'success': True,
                'hasVehicle': True,
                'plateNumber': best_plate['plate'],
                'confidence': best_plate['confidence'],
                'allPlates': plates,
                'message': f'识别到车牌: {best_plate["plate"]}'
            }))
        else:
            print(json.dumps({
                'success': True,
                'hasVehicle': False,
                'plateNumber': None,
                'confidence': 0,
                'message': '未识别到车牌'
            }))
        
    except Exception as e:
        print(json.dumps({
            'success': False,
            'error': str(e)
        }))
        sys.exit(1)


def is_valid_plate(text):
    """验证是否是有效的中国车牌"""
    # 去掉空格和特殊字符
    text = text.strip().upper()
    
    # 中国车牌格式检查
    provinces = ['京', '津', '沪', '渝', '冀', '豫', '云', '辽', '黑', '湘', '皖', '鲁', '新', '苏', '浙', '赣', '鄂', '桂', '甘', '晋', '蒙', '陕', '吉', '闽', '贵', '粤', '青', '藏', '川', '宁', '琼']
    
    # 检查是否以省份开头
    if len(text) < 7 or len(text) > 8:
        return False
    
    # 第一个字符应该是省份简称
    if text[0] not in provinces:
        return False
    
    # 车牌第二位应该是字母
    if not text[1].isalpha():
        return False
    
    return True


if __name__ == '__main__':
    main()
