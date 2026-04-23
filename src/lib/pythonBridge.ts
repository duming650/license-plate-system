import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

// 脚本目录
const SCRIPTS_DIR = path.join(process.cwd(), 'scripts');

// Windows Python 路径
const PYTHON_PATHS = [
  'python',
  'python3',
  'C:\\Python\\python.exe',
  'C:\\Program Files\\Python311\\python.exe',
  'C:\\Program Files (x86)\\Python\\python.exe',
];

// 查找可用的 Python
function findPython(): string | null {
  for (const py of PYTHON_PATHS) {
    try {
      execSync(`"${py}" --version`, { stdio: 'ignore' });
      return py;
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * 调用 Python 脚本进行车辆检测和车牌识别
 */
export async function callPythonRecognition(
  imagePath: string
): Promise<{
  success: boolean;
  hasVehicle: boolean;
  hasPerson: boolean;
  plateNumber: string | null;
  confidence: number;
  error?: string;
}> {
  return new Promise((resolve) => {
    // 查找 Python
    const pythonPath = findPython();
    
    if (!pythonPath) {
      resolve({
        success: false,
        hasVehicle: false,
        hasPerson: false,
        plateNumber: null,
        confidence: 0,
        error: 'Python not found. Please install Python 3.8+',
      });
      return;
    }

    const scriptPath = path.join(SCRIPTS_DIR, 'vehicle_recognize.py');
    
    // 检查脚本是否存在
    if (!fs.existsSync(scriptPath)) {
      resolve({
        success: false,
        hasVehicle: false,
        hasPerson: false,
        plateNumber: null,
        confidence: 0,
        error: 'Python script not found',
      });
      return;
    }

    // 确保图片存在
    if (!fs.existsSync(imagePath)) {
      resolve({
        success: false,
        hasVehicle: false,
        hasPerson: false,
        plateNumber: null,
        confidence: 0,
        error: `Image not found: ${imagePath}`,
      });
      return;
    }

    console.log(`[Python] Calling script: ${scriptPath}`);
    console.log(`[Python] Image path: ${imagePath}`);

    // 调用 Python 脚本
    const python = spawn(pythonPath, [scriptPath, imagePath], {
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';

    python.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    python.stderr.on('data', (data: Buffer) => {
      const msg = data.toString();
      // 打印调试信息
      console.log(`[Python] ${msg}`);
      stderr += msg;
    });

    python.on('error', (error: Error) => {
      console.error('[Python] Start failed:', error);
      resolve({
        success: false,
        hasVehicle: false,
        hasPerson: false,
        plateNumber: null,
        confidence: 0,
        error: `Python start failed: ${error.message}`,
      });
    });

    python.on('close', (code: number) => {
      console.log(`[Python] Script exited with code: ${code}`);
      
      if (code === 0 && stdout) {
        try {
          const result = JSON.parse(stdout);
          console.log('[Python] Result:', result);
          resolve(result);
        } catch (e) {
          console.error('[Python] Parse failed:', stdout);
          resolve({
            success: false,
            hasVehicle: false,
            hasPerson: false,
            plateNumber: null,
            confidence: 0,
            error: 'Parse result failed',
          });
        }
      } else {
        // 检查是否需要安装依赖
        let errorMsg = 'Python script execution failed';
        if (stderr.includes('need_install') || stderr.includes('not installed')) {
          errorMsg = 'Python dependencies not installed. Please run: scripts\\install_deps.bat';
        } else if (stderr) {
          // 从 stderr 提取错误信息
          const match = stderr.match(/error[:\s]*(.+)/i);
          if (match) {
            errorMsg = match[1].trim();
          }
        }
        
        console.error('[Python] Error:', errorMsg);
        resolve({
          success: false,
          hasVehicle: false,
          hasPerson: false,
          plateNumber: null,
          confidence: 0,
          error: errorMsg,
        });
      }
    });

    // 60秒超时
    setTimeout(() => {
      python.kill();
      resolve({
        success: false,
        hasVehicle: false,
        hasPerson: false,
        plateNumber: null,
        confidence: 0,
        error: 'Recognition timeout (60s)',
      });
    }, 60000);
  });
}

/**
 * 检查 Python 环境
 */
export async function checkPythonEnv(): Promise<{
  available: boolean;
  version?: string;
  hasOpenCV?: boolean;
  hasPaddleOCR?: boolean;
  error?: string;
}> {
  return new Promise((resolve) => {
    const pythonPath = findPython();
    
    if (!pythonPath) {
      resolve({
        available: false,
        error: 'Python not found. Please install Python 3.8+',
      });
      return;
    }

    // 获取 Python 版本
    try {
      const version = execSync(`"${pythonPath}" --version`, {
        encoding: 'utf-8',
        windowsHide: true,
      }).trim();
      
      resolve({
        available: true,
        version,
      });
    } catch {
      resolve({
        available: false,
        error: 'Cannot get Python version',
      });
    }
  });
}
