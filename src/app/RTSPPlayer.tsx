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
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // 获取截图
  const fetchSnapshot = useCallback(async () => {
    if (!url) return;
    
    try {
      const res = await fetch(`/api/snapshot?url=${encodeURIComponent(url)}&_=${Date.now()}`);
      const data = await res.json();
      
      if (data.success && data.image) {
        setImageUrl(data.image);
        setLoading(false);
        onPlay?.();
      }
    } catch (err) {
      console.error('截图失败:', err);
    }
  }, [url, onPlay]);

  // 初始化和定时刷新
  useEffect(() => {
    if (!url) return;
    
    // 立即获取
    fetchSnapshot();
    
    // 每5秒刷新一次画面
    intervalRef.current = setInterval(fetchSnapshot, 5000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [url, fetchSnapshot]);

  // 监听自动识别事件
  useEffect(() => {
    if (!isAutoRecognize) return;

    const handleAutoSnapshot = async () => {
      console.log('自动识别触发');
      try {
        const res = await fetch(`/api/snapshot?url=${encodeURIComponent(url)}`);
        const data = await res.json();
        
        if (data.success && data.image && onSnapshot) {
          onSnapshot(data.image);
        }
      } catch (err) {
        console.error('自动截图失败:', err);
      }
    };

    // 监听自定义事件
    window.addEventListener('hkv:snapshot', handleAutoSnapshot);

    return () => {
      window.removeEventListener('hkv:snapshot', handleAutoSnapshot);
    };
  }, [isAutoRecognize, url, onSnapshot]);

  // 手动截图
  const handleCapture = useCallback(async () => {
    console.log('手动截图按钮点击');
    
    try {
      const res = await fetch(`/api/snapshot?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      
      if (data.success && data.image && onSnapshot) {
        onSnapshot(data.image);
        toast.success('截图完成');
      } else {
        toast.error('截图失败');
      }
    } catch (err) {
      console.error('截图失败:', err);
      toast.error('截图失败');
    }
  }, [url, onSnapshot]);

  return (
    <div className="relative w-full h-full bg-black">
      <img
        ref={imgRef}
        src={imageUrl}
        alt="摄像头画面"
        className="w-full h-full object-contain"
        style={{ display: loading ? 'none' : 'block' }}
      />
      
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-white text-center">
            <div className="animate-spin w-8 h-8 border-4 border-white border-t-transparent rounded-full mx-auto mb-2"></div>
            <p>加载中...</p>
          </div>
        </div>
      )}
      
      <button
        onClick={handleCapture}
        className="absolute bottom-2 right-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded shadow transition-colors"
      >
        截图识别
      </button>
    </div>
  );
}
