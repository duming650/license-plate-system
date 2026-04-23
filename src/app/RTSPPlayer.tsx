'use client';

import { useEffect, useRef, useCallback } from 'react';
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
  const containerRef = useRef<HTMLDivElement>(null);

  // 初始化播放器
  const initPlayer = useCallback(async () => {
    if (!videoRef.current || !url) return;

    try {
      // 动态导入 rtsp-web-player
      const { default: RTSPWebPlayer } = await import('rtsp-web-player');
      
      playerRef.current = new RTSPWebPlayer({
        video: videoRef.current,
        rtspUrl: url,
        // 摄像头通用配置（支持 H.264）
        options: {
          bufferSize: 5,
          decodeFirstFrame: true,
          maxBufferLength: 15,
          disableAudio: true,
          transport: 'tcp',
        },
        onPlay: () => {
          console.log('RTSP 播放成功');
          onPlay?.();
        },
        onError: (error: Error) => {
          console.error('RTSP 播放错误:', error);
          toast.error('摄像头连接失败，请检查 RTSP 地址');
        },
        onDisconnect: () => {
          console.log('RTSP 断开');
          onStop?.();
        },
      });

      await playerRef.current.play();
    } catch (error) {
      console.error('初始化播放器失败:', error);
      toast.error('无法连接摄像头');
    }
  }, [url, onPlay, onStop]);

  // 截取当前帧
  const captureSnapshot = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.log('视频尚未加载完成');
      return null;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // 返回 base64 图片数据
    return canvas.toDataURL('image/jpeg', 0.8);
  }, []);

  // 处理自动截图
  useEffect(() => {
    if (!isAutoRecognize) return;

    const handleSnapshot = () => {
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

  // 初始化
  useEffect(() => {
    initPlayer();

    return () => {
      // 清理
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, [initPlayer]);

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        muted
        autoPlay
      />
      
      {/* 隐藏的画布用于截图 */}
      <canvas ref={canvasRef} className="hidden" />
      
      {/* 播放控制栏 */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
        <div className="flex items-center justify-between text-white text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>实时播放</span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={captureSnapshot}
              className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-xs transition-colors"
              title="截图"
            >
              截图
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
