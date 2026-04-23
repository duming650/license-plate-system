import fs from 'fs';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

// 确保上传目录存在
function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

// 保存 Base64 图片
export function saveBase64Image(base64Data: string, prefix: string = 'img'): string {
  ensureUploadDir();
  
  // 提取 MIME 类型
  const matches = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!matches) {
    throw new Error('Invalid base64 image data');
  }
  
  const ext = matches[1];
  const data = matches[2];
  const filename = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
  const filepath = path.join(UPLOAD_DIR, filename);
  
  // 解码并保存
  const buffer = Buffer.from(data, 'base64');
  fs.writeFileSync(filepath, buffer);
  
  // 返回公开访问路径
  return `/uploads/${filename}`;
}

// 删除图片
export function deleteImage(imageUrl: string): boolean {
  if (!imageUrl) return false;
  
  const filename = imageUrl.replace('/uploads/', '');
  const filepath = path.join(UPLOAD_DIR, filename);
  
  if (fs.existsSync(filepath)) {
    fs.unlinkSync(filepath);
    return true;
  }
  return false;
}

// 获取文件大小
export function getFileSize(imageUrl: string): number {
  if (!imageUrl) return 0;
  
  const filename = imageUrl.replace('/uploads/', '');
  const filepath = path.join(UPLOAD_DIR, filename);
  
  if (fs.existsSync(filepath)) {
    const stats = fs.statSync(filepath);
    return stats.size;
  }
  return 0;
}
