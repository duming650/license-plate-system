import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

// HLS 输出目录
const HLS_DIR = path.join(process.cwd(), 'public', 'hls');

// 确保目录存在
if (!fs.existsSync(HLS_DIR)) {
  fs.mkdirSync(HLS_DIR, { recursive: true });
}

// 转码进程管理
const transcoders: Map<string, {
  process: ReturnType<typeof spawn>;
  startedAt: number;
}> = new Map();

// 清理过期进程（超过30分钟的）
function cleanupOldTranscoders() {
  const now = Date.now();
  const maxAge = 30 * 60 * 1000; // 30分钟
  
  for (const [key, value] of transcoders.entries()) {
    if (now - value.startedAt > maxAge) {
      console.log(`清理过期的转码进程: ${key}`);
      value.process.kill();
      transcoders.delete(key);
    }
  }
}

// 每5分钟清理一次
setInterval(cleanupOldTranscoders, 5 * 60 * 1000);

// 获取转码状态
function getTranscoderStatus(key: string) {
  const transcoder = transcoders.get(key);
  if (!transcoder) return null;
  
  return {
    running: transcoder.process.exitCode === null,
    uptime: Date.now() - transcoder.startedAt,
  };
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const rtspUrl = searchParams.get('url');
  const action = searchParams.get('action') || 'status';

  if (!rtspUrl) {
    return NextResponse.json({ 
      success: false, 
      error: 'Missing url parameter',
      availableActions: ['start', 'stop', 'status', 'm3u8']
    });
  }

  // 生成唯一的流标识
  const streamKey = Buffer.from(rtspUrl).toString('base64').substring(0, 32);
  const m3u8Path = path.join(HLS_DIR, `${streamKey}.m3u8`);
  const tsDir = path.join(HLS_DIR, streamKey);
  
  // 确保 ts 文件目录存在
  if (!fs.existsSync(tsDir)) {
    fs.mkdirSync(tsDir, { recursive: true });
  }

  // 状态查询
  if (action === 'status') {
    const status = getTranscoderStatus(streamKey);
    return NextResponse.json({
      success: true,
      streamKey,
      status: status || { running: false, uptime: 0 },
      m3u8Url: `/hls/${streamKey}/index.m3u8`,
    });
  }

  // 停止转码
  if (action === 'stop') {
    const transcoder = transcoders.get(streamKey);
    if (transcoder) {
      transcoder.process.kill();
      transcoders.delete(streamKey);
    }
    return NextResponse.json({ success: true, message: '转码已停止' });
  }

  // 启动转码
  if (action === 'start') {
    // 检查是否已经在运行
    if (transcoders.has(streamKey)) {
      const status = getTranscoderStatus(streamKey);
      if (status?.running) {
        return NextResponse.json({
          success: true,
          message: '转码已在运行',
          streamKey,
          m3u8Url: `/hls/${streamKey}/index.m3u8`,
        });
      }
    }

    // Windows FFmpeg 路径
    const ffmpegPath = 'D:\\ffmpeg\\bin\\ffmpeg.exe';
    
    // FFmpeg 命令：RTSP 转 HLS
    const ffmpeg = spawn(ffmpegPath, [
      '-rtsp_transport', 'tcp',
      '-i', rtspUrl,
      // 视频编码
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-tune', 'zerolatency',
      '-b:v', '1000k',
      '-maxrate', '1500k',
      '-bufsize', '2000k',
      // 音频（禁用）
      '-an',
      // HLS 输出
      '-f', 'hls',
      '-hls_time', '2',
      '-hls_list_size', '10',
      '-hls_flags', 'delete_segments',
      '-hls_segment_filename', path.join(tsDir, 'segment_%03d.ts'),
      path.join(tsDir, 'index.m3u8'),
    ], {
      windowsHide: true,
    });

    let stderr = '';

    ffmpeg.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    ffmpeg.on('error', (error: Error) => {
      console.error('FFmpeg 启动失败:', error);
      transcoders.delete(streamKey);
    });

    ffmpeg.on('close', (code: number) => {
      console.log(`FFmpeg 关闭，退出码: ${code}`);
      transcoders.delete(streamKey);
    });

    // 保存进程
    transcoders.set(streamKey, {
      process: ffmpeg,
      startedAt: Date.now(),
    });

    console.log(`开始转码: ${streamKey}`);

    return NextResponse.json({
      success: true,
      message: '转码已开始',
      streamKey,
      m3u8Url: `/hls/${streamKey}/index.m3u8`,
    });
  }

  // 返回帮助信息
  return NextResponse.json({
    success: false,
    error: 'Unknown action',
    availableActions: ['start', 'stop', 'status', 'm3u8'],
  });
}
