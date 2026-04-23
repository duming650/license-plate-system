'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { toast } from 'sonner';

interface RTSPPlayerProps {
  url: string;
  onPlay?: () => void;
  onStop?: () => void;
  onSnapshot?: (imageData: string) => void;
  isAutoRecognize?: boolean;
}

export default function RTSPPlayer({ 
  url, 
  onPlay, 
  onStop, 
  onSnapshot,
  isAutoRecognize = false 
}: RTSPPlayerProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'playing' | 'error'>('idle');
  const [imageUrl, setImageUrl] = useState<string>('');

  // 使用 FFmpeg 定时截图
  useEffect(() => {
    if (!url) return;
    
    setStatus('loading');
    console.log('使用 FFmpeg 截图模式，URL:', url);

    // 立即获取第一帧
    fetch(`/api/snapshot?url=${encodeURIComponent(url)}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.image) {
          setImageUrl(data.image);
          setStatus('playing');
          onPlay?.();
        } else {
          setStatus('error');
        }
      })
      .catch(err => {
        console.error('截图失败:', err);
        setStatus('error');
      });

    // 每3秒更新一次画面
    intervalRef.current = setInterval(() => {
      const timestamp = Date.now();
      setImageUrl(prev => {
        // 添加时间戳强制刷新
        return prev ? prev.split('&t=')[0] + `&t=${timestamp}` : prev;
      });
    }, 3000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [url, onPlay, status]);

  // 截取当前帧
  const captureSnapshot = useCallback((): string | null => {
    if (!imgRef.current || !canvasRef.current) {
      console.log('imgRef 或 canvasRef 不存在');
      return null;
    }

    const img = imgRef.current;

    if (img.naturalWidth === 0 || img.naturalHeight === 0) {
      console.log('图片尚未加载完成');
      toast.warning('视频尚未加载完成，请稍候');
      return null;
    }

    canvasRef.current.width = img.naturalWidth;
    canvasRef.current.height = img.naturalHeight;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(img, 0, 0, canvasRef.current.width, canvasRef.current.height);

    return canvasRef.current.toDataURL('image/jpeg', 0.9);
  }, []);

  // 处理自动截图
  useEffect(() => {
    if (!isAutoRecognize) return;

    const handleSnapshot = () => {
      console.log('自动识别触发');
      const imageData = captureSnapshot();
      if (imageData && onSnapshot) {
        onSnapshot(imageData);
      }
    };

    window.addEventListener('hkv:snapshot', handleSnapshot);

    return () => {
      window.removeEventListener('hkv:snapshot', handleSnapshot);
    };
  }, [isAutoRecognize, captureSnapshot, onSnapshot]);

  // 手动截图
  const handleCapture = useCallback(async () => {
    console.log('手动截图按钮点击');
    
    // 先获取最新一帧
    try {
      const res = await fetch(`/api/snapshot?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      
      if (data.success && data.image && onSnapshot) {
        // 转换 data URL
        const imageData = data.image;
        onSnapshot(imageData);
        toast.success('截图完成');
        return;
      }
    } catch (err) {
      console.error('获取截图失败:', err);
    }
    
    // 降级：使用当前显示的图片
    const imageData = captureSnapshot();
    if (imageData && onSnapshot) {
      onSnapshot(imageData);
      toast.success('截图完成');
    } else {
      toast.error('截图失败');
    }
  }, [url, captureSnapshot, onSnapshot]);

  return (
    <div className="relative w-full h-full">
      {/* 使用 img 标签显示截图 */}
      <img
        ref={imgRef}
        src={imageUrl}
        alt="摄像头画面"
        className="w-full h-full object-contain bg-black"
      />
      
      {/* 隐藏的画布用于截图 */}
      <canvas ref={canvasRef} className="hidden" />
      
      {/* 状态指示 */}
      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-white text-center">
            <div className="animate-spin w-8 h-8 border-4 border-white border-t-transparent rounded-full mx-auto mb-2"></div>
            <p>正在连接摄像头...</p>
            <p className="text-xs text-gray-400 mt-2">使用 FFmpeg 拉取画面</p>
          </div>
        </div>
      )}
      
      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
          <div className="text-red-400 text-center p-4">
            <p className="font-bold mb-2">摄像头连接失败</p>
            <p className="text-sm text-gray-400">FFmpeg 无法获取视频流</p>
            <p className="text-xs text-gray-500 mt-2">提示: 请检查 RTSP 地址是否正确</p>
          </div>
        </div>
      )}
      
      {/* 手动截图按钮 */}
      <button
        onClick={handleCapture}
        className="absolute bottom-2 right-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded shadow transition-colors"
      >
        截图识别
      </button>
    </div>
  );
}
