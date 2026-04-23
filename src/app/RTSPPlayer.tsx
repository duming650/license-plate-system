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
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef<any>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'playing' | 'error'>('idle');

  // 初始化播放器
  const initPlayer = useCallback(async () => {
    if (!videoRef.current || !url) return;
    
    setStatus('loading');
    console.log('初始化播放器，URL:', url);

    try {
      // 动态导入 rtsp-web-player
      const { default: RTSPWebPlayer } = await import('rtsp-web-player');
      
      // 清理旧播放器
      if (playerRef.current) {
        if (typeof playerRef.current.destroy === 'function') {
          playerRef.current.destroy();
        } else if (typeof playerRef.current.stop === 'function') {
          playerRef.current.stop();
        }
        playerRef.current = null;
      }
      
      playerRef.current = new RTSPWebPlayer({
        video: videoRef.current,
        rtspUrl: url,
        options: {
          bufferSize: 5,
          decodeFirstFrame: true,
          maxBufferLength: 15,
          disableAudio: true,
          transport: 'tcp',
        },
        onPlay: () => {
          console.log('RTSP 播放成功');
          setStatus('playing');
          onPlay?.();
        },
        onError: (error: any) => {
          console.error('RTSP 播放错误:', error);
          setStatus('error');
          toast.error('摄像头连接失败，请检查 RTSP 地址是否正确');
        },
        onDisconnect: () => {
          console.log('RTSP 断开');
          setStatus('error');
          onStop?.();
        },
      });

      await playerRef.current.play();
    } catch (error) {
      console.error('初始化播放器失败:', error);
      setStatus('error');
      toast.error('无法连接摄像头，请检查 RTSP 地址');
    }
  }, [url, onPlay, onStop]);

  // 初始化播放器
  useEffect(() => {
    if (!url) return;
    
    // 延迟初始化，等待 DOM 准备好
    const timer = setTimeout(() => {
      initPlayer();
    }, 500);
    
    return () => {
      clearTimeout(timer);
      if (playerRef.current) {
        try {
          if (typeof playerRef.current.destroy === 'function') {
            playerRef.current.destroy();
          } else if (typeof playerRef.current.stop === 'function') {
            playerRef.current.stop();
          } else if (typeof playerRef.current.disconnect === 'function') {
            playerRef.current.disconnect();
          }
        } catch (e) {
          console.error('清理播放器失败:', e);
        }
        playerRef.current = null;
      }
    };
  }, [url, initPlayer]);

  // 截取当前帧
  const captureSnapshot = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) {
      console.log('videoRef 或 canvasRef 不存在');
      return null;
    }

    const video = videoRef.current;

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.log('视频尚未加载完成，状态:', status);
      toast.warning('视频尚未加载完成，请稍候');
      return null;
    }

    canvasRef.current.width = video.videoWidth;
    canvasRef.current.height = video.videoHeight;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, canvasRef.current.width, canvasRef.current.height);

    return canvasRef.current.toDataURL('image/jpeg', 0.9);
  }, [status]);

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
  const handleCapture = useCallback(() => {
    console.log('手动截图按钮点击');
    const imageData = captureSnapshot();
    if (imageData && onSnapshot) {
      onSnapshot(imageData);
      toast.success('截图完成');
    }
  }, [captureSnapshot, onSnapshot]);

  return (
    <div className="relative w-full h-full">
      <video
        ref={videoRef}
        className="w-full h-full object-contain bg-black"
        playsInline
        muted
        autoPlay
      />
      
      {/* 隐藏的画布用于截图 */}
      <canvas ref={canvasRef} className="hidden" />
      
      {/* 状态指示 */}
      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-white text-center">
            <div className="animate-spin w-8 h-8 border-4 border-white border-t-transparent rounded-full mx-auto mb-2"></div>
            <p>正在连接摄像头...</p>
          </div>
        </div>
      )}
      
      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
          <div className="text-red-400 text-center p-4">
            <p className="font-bold mb-2">摄像头连接失败</p>
            <p className="text-sm text-gray-400">请检查 RTSP 地址是否正确</p>
            <p className="text-xs text-gray-500 mt-2">提示: {url}</p>
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
