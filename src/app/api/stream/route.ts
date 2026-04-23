import { NextRequest } from 'next/server';
import { spawn } from 'child_process';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const rtspUrl = searchParams.get('url');

  if (!rtspUrl) {
    return new Response('Missing url parameter', { status: 400 });
  }

  // Windows FFmpeg 路径
  const ffmpegPath = 'D:\\ffmpeg\\bin\\ffmpeg.exe';
  const ffprobePath = 'D:\\ffmpeg\\bin\\ffprobe.exe';

  // 创建 ReadableStream 来传输 HLS 数据
  const stream = new ReadableStream({
    async start(controller) {
      // FFmpeg 命令：将 RTSP 转码为 HLS
      const ffmpeg = spawn(ffmpegPath, [
        '-rtsp_transport', 'tcp',
        '-i', rtspUrl,
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-tune', 'zerolatency',
        '-b:v', '1000k',
        '-maxrate', '1000k',
        '-bufsize', '2000k',
        '-hls_time', '2',
        '-hls_list_size', '6',
        '-hls_flags', 'delete_segments',
        '-f', 'hls',
        '-', // 输出到 stdout
      ], {
        windowsHide: true,
      });

      ffmpeg.stdout.on('data', (data: Buffer) => {
        try {
          controller.enqueue(data);
        } catch (e) {
          // 流已关闭
        }
      });

      ffmpeg.stderr.on('data', (data: Buffer) => {
        console.log('FFmpeg:', data.toString());
      });

      ffmpeg.on('error', (error: Error) => {
        console.error('FFmpeg 错误:', error);
        controller.close();
      });

      ffmpeg.on('close', () => {
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-mpegURL',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache',
    },
  });
}
