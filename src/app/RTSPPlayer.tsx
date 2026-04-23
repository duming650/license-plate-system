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
  const containerRef = useRef<HTMLDivElement>(null);
  const [isUsingFFmpeg, setIsUsingFFmpeg] = useState(false);

  // 初始化原生播放器
  const initNativePlayer = useCallback(async () => {
    if (!videoRef.current || !url) return;

    try {
      const { default: RTSPWebPlayer } = await import('rtsp-web-player');
      
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
          setIsUsingFFmpeg(false);
          onPlay?.();
        },
        onError: (error: Error) => {
          console.error('RTSP 播放错误:', error);
          // 原生播放失败，尝试 FFmpeg
          initFFmpegPlayer();
        },
        onDisconnect: () => {
          console.log('RTSP 断开');
          onStop?.();
        },
      });

      await playerRef.current.play();
    } catch (error) {
      console.error('原生播放器失败:', error);
      initFFmpegPlayer();
    }
  }, [url, onPlay, onStop]);

  // 使用 FFmpeg 转码播放
  const initFFmpegPlayer = useCallback(async () => {
    if (!videoRef.current || !url || !videoRef.current.src) return;

    try {
      setIsUsingFFmpeg(true);
      
      // 创建 HLS 流地址（通过 API 代理）
      const hlsUrl = `/api/stream?url=${encodeURIComponent(url)}`;
      
      // 动态加载 HLS.js
      const Hls = (await import('hls.js')).default;
      
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
        });
        
        hls.loadSource(hlsUrl);
        hls.attachMedia(videoRef.current);
        
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log('HLS 流加载成功');
          videoRef.current?.play();
          onPlay?.();
        });
        
        hls.on(Hls.Events.ERROR, (event: any, data: any) => {
          console.error('HLS 错误:', data);
          if (data.fatal) {
            toast.error('视频流加载失败');
          }
        });
        
        playerRef.current = hls;
      } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari 原生支持 HLS
        videoRef.current.src = hlsUrl;
        videoRef.current.play();
        onPlay?.();
      }
    } catch (error) {
      console.error('FFmpeg 播放失败:', error);
      toast.error('无法播放视频流');
    }
  }, [url, onPlay]);

  // 初始化播放器
  useEffect(() => {
    if (!url) return;
    
    initNativePlayer();
    
    return () => {
      if (playerRef.current) {
        if (typeof playerRef.current.destroy === 'function') {
          playerRef.current.destroy();
        } else if (typeof playerRef.current.stop === 'function') {
          playerRef.current.stop();
        } else if (typeof playerRef.current.disconnect === 'function') {
          playerRef.current.disconnect();
        }
        playerRef.current = null;
      }
    };
  }, [url, initNativePlayer]);

  // 截取当前帧
  const captureSnapshot = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;

    const video = videoRef.current;

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.log('视频尚未加载完成');
      return null;
    }

    canvasRef.current.width = video.videoWidth;
    canvasRef.current.height = video.videoHeight;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, canvasRef.current.width, canvasRef.current.height);

    return canvasRef.current.toDataURL('image/jpeg', 0.9);
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

  // 手动截图
  const handleCapture = useCallback(() => {
    const imageData = captureSnapshot();
    if (imageData && onSnapshot) {
      onSnapshot(imageData);
      toast.success('截图完成');
    } else {
      toast.error('截图失败，视频未加载');
    }
  }, [captureSnapshot, onSnapshot]);

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <video
        ref={videoRef}
        className="w-full h-full object-contain bg-black"
        playsInline
        muted
      />
      
      {/* 隐藏的画布用于截图 */}
      <canvas ref={canvasRef} className="hidden" />
      
      {/* 播放状态指示 */}
      {isUsingFFmpeg && (
        <div className="absolute top-2 left-2 px-2 py-1 bg-blue-500/80 text-white text-xs rounded">
          FFmpeg 转码中
        </div>
      )}
      
      {/* 手动截图按钮 */}
      <button
        onClick={handleCapture}
        className="absolute bottom-2 right-2 px-3 py-1 bg-white/90 hover:bg-white text-gray-800 text-sm rounded shadow"
      >
        截图识别
      </button>
    </div>
  );
}
