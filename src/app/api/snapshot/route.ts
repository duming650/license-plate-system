import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

// 缓存目录
const CACHE_DIR = path.join(process.cwd(), 'public', 'snapshots');

// 确保缓存目录存在
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams;
  const rtspUrl = searchParams.get('url');

  if (!rtspUrl) {
    return NextResponse.json({ success: false, error: 'Missing url parameter' }, { status: 400 });
  }

  const outputPath = path.join(CACHE_DIR, 'current.jpg');

  // 使用 FFmpeg 截图
  const ffmpegPath = 'D:\\ffmpeg\\bin\\ffmpeg.exe';
  
  return new Promise<NextResponse>((resolve) => {
    // FFmpeg 命令：截取一帧
    const ffmpeg = spawn(ffmpegPath, [
      '-rtsp_transport', 'tcp',
      '-i', rtspUrl,
      '-vframes', '1',
      '-q:v', '2',
      '-y',
      outputPath,
    ], {
      windowsHide: true,
    });

    let stderr = '';

    ffmpeg.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    ffmpeg.on('error', (error: Error) => {
      console.error('FFmpeg 启动失败:', error);
      resolve(NextResponse.json({ success: false, error: 'FFmpeg not found' }));
    });

    ffmpeg.on('close', (code: number) => {
      if (code === 0 && fs.existsSync(outputPath)) {
        // 读取图片并转为 base64
        const imageBuffer = fs.readFileSync(outputPath);
        const base64 = imageBuffer.toString('base64');
        const dataUrl = `data:image/jpeg;base64,${base64}`;
        
        resolve(NextResponse.json({ success: true, image: dataUrl }));
      } else {
        console.error('FFmpeg 截图失败，退出码:', code);
        console.error('FFmpeg 输出:', stderr);
        resolve(NextResponse.json({ success: false, error: 'Screenshot failed' }));
      }
    });

    // 10秒超时
    setTimeout(() => {
      ffmpeg.kill();
      resolve(NextResponse.json({ success: false, error: 'Timeout' }));
    }, 10000);
  });
}
