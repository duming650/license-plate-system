'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { toast } from 'sonner';
import Hls from 'hls.js';

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const streamKeyRef = useRef<string>('');
  
  const [mode, setMode] = useState<'auto' | 'hls' | 'snapshot'>('auto');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [streamInfo, setStreamInfo] = useState<{ key: string; url: string } | null>(null);

  // 启动 RTSP 转 HLS 流
  const startTranscoding = useCallback(async () => {
    if (!url) return null;
    
    try {
      // 先尝试启动转码
      const startRes = await fetch(`/api/stream?url=${encodeURIComponent(url)}&action=start`);
      const startData = await startRes.json();
      
      if (startData.success) {
        streamKeyRef.current = startData.streamKey;
        setStreamInfo({
          key: startData.streamKey,
          url: startData.m3u8Url,
        });
        return startData.m3u8Url;
      }
      
      // 检查是否已经在运行
      const statusRes = await fetch(`/api/stream?url=${encodeURIComponent(url)}&action=status`);
      const statusData = await statusRes.json();
      
      if (statusData.success && statusData.status?.running) {
        streamKeyRef.current = statusData.streamKey;
        setStreamInfo({
          key: statusData.streamKey,
          url: statusData.m3u8Url,
        });
        return statusData.m3u8Url;
      }
      
      return null;
    } catch (err) {
      console.error('启动转码失败:', err);
      return null;
    }
  }, [url]);

  // HLS 模式：播放实时流
  const initHlsPlayer = useCallback(async (m3u8Url: string) => {
    if (!videoRef.current) return;
    
    // 清除之前的实例
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const video = videoRef.current;
    
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30,
      });
      hlsRef.current = hls;
      
      hls.loadSource(m3u8Url);
      hls.attachMedia(video);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
        setLoading(false);
        setError('');
        onPlay?.();
      });
      
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          console.error('HLS 错误:', data);
          // 尝试重新连接
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            setTimeout(() => initHlsPlayer(m3u8Url), 3000);
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = m3u8Url;
      video.play().catch(() => {});
    }
  }, [onPlay]);

  // 截图模式：定时刷新
  const fetchSnapshot = useCallback(async () => {
    if (!url) return;
    
    try {
      setLoading(true);
      const res = await fetch(`/api/snapshot?url=${encodeURIComponent(url)}&_=${Date.now()}`);
      const data = await res.json();
      
      if (data.success && data.image) {
        setImageUrl(data.image);
        setLoading(false);
        setError('');
        onPlay?.();
      } else {
        setError(data.error || '截图失败');
        setLoading(false);
      }
    } catch (err) {
      console.error('截图失败:', err);
      setError('连接失败');
      setLoading(false);
    }
  }, [url, onPlay]);

  // 初始化播放
  useEffect(() => {
    if (!url) return;
    
    setLoading(true);
    setError('');
    
    const init = async () => {
      // 截图模式
      if (mode === 'snapshot') {
        fetchSnapshot();
        intervalRef.current = setInterval(fetchSnapshot, 3000);
        return;
      }
      
      // HLS 模式：先启动转码
      if (mode === 'hls' || mode === 'auto') {
        const m3u8Url = await startTranscoding();
        
        if (m3u8Url) {
          // 等待一下让转码开始
          setTimeout(() => {
            initHlsPlayer(m3u8Url);
          }, 2000);
        } else {
          // 转码失败，切换到截图模式
          setMode('snapshot');
          fetchSnapshot();
          intervalRef.current = setInterval(fetchSnapshot, 3000);
        }
      }
    };
    
    init();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [url, mode, startTranscoding, initHlsPlayer, fetchSnapshot]);

  // 切换模式
  const handleModeChange = useCallback((newMode: 'snapshot' | 'hls') => {
    setMode(newMode);
  }, []);

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

    window.addEventListener('hkv:snapshot', handleAutoSnapshot);
    return () => window.removeEventListener('hkv:snapshot', handleAutoSnapshot);
  }, [isAutoRecognize, url, onSnapshot]);

  // 手动截取当前画面
  const handleSnapshot = useCallback(() => {
    if (mode === 'hls' && videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg');
        onSnapshot?.(dataUrl);
        toast.success('截图成功');
      }
    } else if (mode === 'snapshot' && imageUrl) {
      onSnapshot?.(imageUrl);
      toast.success('截图成功');
    }
  }, [mode, imageUrl, onSnapshot]);

  return (
    <div className="relative w-full h-full bg-black rounded-lg overflow-hidden">
      {/* 视频播放器（HLS模式） */}
      {mode !== 'snapshot' && (
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          playsInline
          muted
          controls={mode === 'hls'}
        />
      )}
      
      {/* 截图模式显示 */}
      {mode === 'snapshot' && (
        <img
          ref={imgRef}
          src={imageUrl || '/placeholder.svg'}
          alt="摄像头画面"
          className="w-full h-full object-contain"
          style={{ display: imageUrl ? 'block' : 'none' }}
        />
      )}
      
      {/* 加载状态 */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
            <span className="text-white text-sm">
              {mode === 'snapshot' ? '正在加载画面...' : '正在启动实时流...'}
            </span>
          </div>
        </div>
      )}
      
      {/* 错误提示 */}
      {error && (
        <div className="absolute bottom-12 left-0 right-0 p-2 bg-red-500/80 text-white text-sm text-center">
          {error}
        </div>
      )}
      
      {/* 控制栏 */}
      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-center justify-between">
          {/* 模式切换 */}
          <div className="flex gap-1">
            <button
              onClick={() => handleModeChange('snapshot')}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                mode === 'snapshot' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              截图模式
            </button>
            <button
              onClick={() => handleModeChange('hls')}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                mode === 'hls' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              实时流
            </button>
          </div>
          
          {/* 截图按钮 */}
          <button
            onClick={handleSnapshot}
            className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-xs rounded flex items-center gap-1 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            截图识别
          </button>
        </div>
        
        {/* 状态信息 */}
        <div className="mt-1 text-xs text-white/60 flex items-center gap-2">
          {mode === 'snapshot' && (
            <>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                每3秒自动刷新
              </span>
            </>
          )}
          {mode === 'hls' && streamInfo && (
            <>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                实时流播放中
              </span>
              <span className="text-white/40">|</span>
              <span>RTSP 转 HLS</span>
            </>
          )}
          {error && <span className="text-red-400">{error}</span>}
        </div>
      </div>
    </div>
  );
}
