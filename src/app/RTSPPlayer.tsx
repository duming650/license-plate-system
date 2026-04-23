'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';

interface RTSPPlayerProps {
  url: string;
  onSnapshot?: (imageData: string) => void;
}

export default function RTSPPlayer({ url, onSnapshot }: RTSPPlayerProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // 截图函数
  const takeSnapshot = useCallback(() => {
    if (imageUrl && onSnapshot) {
      onSnapshot(imageUrl);
      toast.success('截图成功');
    }
  }, [imageUrl, onSnapshot]);

  // 获取截图
  const fetchSnapshot = useCallback(async () => {
    if (!url) return;
    
    try {
      const timestamp = Date.now();
      const res = await fetch(`/api/snapshot?url=${encodeURIComponent(url)}&t=${timestamp}`);
      const data = await res.json();
      
      if (data.success && data.image) {
        setImageUrl(data.image);
        setLoading(false);
        setError('');
      } else {
        setError(data.error || '截图失败');
        setLoading(false);
      }
    } catch (err) {
      console.error('截图失败:', err);
      setError('连接失败');
      setLoading(false);
    }
  }, [url]);

  // 定时刷新
  useEffect(() => {
    if (!url) return;
    
    setLoading(true);
    setError('');
    
    // 立即获取一次
    fetchSnapshot();
    
    // 每 5 秒刷新一次
    intervalRef.current = setInterval(fetchSnapshot, 5000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [url, fetchSnapshot]);

  // 监听键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 按空格键截图
      if (e.code === 'Space' && imageUrl) {
        e.preventDefault();
        takeSnapshot();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [imageUrl, takeSnapshot]);

  return (
    <div className="relative w-full h-full bg-black rounded-lg overflow-hidden">
      {/* 图片显示 */}
      <img
        ref={imgRef}
        src={imageUrl || '/placeholder.svg'}
        alt="摄像头画面"
        className="w-full h-full object-contain"
        style={{ display: imageUrl ? 'block' : 'none' }}
      />
      
      {/* 加载状态 */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
            <span className="text-white text-sm">正在加载画面...</span>
          </div>
        </div>
      )}
      
      {/* 错误提示 */}
      {error && (
        <div className="absolute bottom-16 left-0 right-0 p-3 bg-red-500/80 text-white text-sm text-center">
          {error}
        </div>
      )}
      
      {/* 控制栏 */}
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-center justify-between">
          <div className="text-white/60 text-sm">
            {imageUrl ? '✓ 已连接' : '○ 未连接'}
          </div>
          
          <button
            onClick={takeSnapshot}
            disabled={!imageUrl}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 text-white text-sm rounded-lg flex items-center gap-2 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            截图识别
          </button>
        </div>
        
        <div className="mt-2 text-white/40 text-xs text-center">
          每 5 秒自动刷新 | 按 空格键 快速截图
        </div>
      </div>
    </div>
  );
}
