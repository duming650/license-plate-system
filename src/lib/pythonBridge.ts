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
  'D:\\Python\\python.exe',
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
 * 调用 Python 脚本进行车牌识别
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
    const pythonPath = findPython();
    
    if (!pythonPath) {
      resolve({
        success: false,
        hasVehicle: false,
        hasPerson: false,
        plateNumber: null,
        confidence: 0,
        error: 'Python not found',
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

    // 检查图片是否存在
    if (!fs.existsSync(imagePath)) {
      resolve({
        success: false,
        hasVehicle: false,
        hasPerson: false,
        plateNumber: null,
        confidence: 0,
        error: 'Image not found',
      });
      return;
    }

    console.log(`[Python] Running: ${pythonPath} ${scriptPath} ${imagePath}`);

    const python = spawn(pythonPath, [scriptPath, imagePath], {
      windowsHide: true,
      timeout: 30000,
    });

    let stdout = '';
    let stderr = '';

    python.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    python.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    python.on('error', (error: Error) => {
      console.error('[Python] Error:', error.message);
      resolve({
        success: false,
        hasVehicle: false,
        hasPerson: false,
        plateNumber: null,
        confidence: 0,
        error: error.message,
      });
    });

    python.on('close', (code: number) => {
      console.log(`[Python] Exit code: ${code}`);
      
      if (stdout) {
        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch {
          resolve({
            success: false,
            hasVehicle: false,
            hasPerson: false,
            plateNumber: null,
            confidence: 0,
            error: 'Failed to parse result',
          });
        }
      } else {
        resolve({
          success: false,
          hasVehicle: false,
          hasPerson: false,
          plateNumber: null,
          confidence: 0,
          error: stderr || 'Script failed',
        });
      }
    });

    // 30秒超时
    setTimeout(() => {
      python.kill();
      resolve({
        success: false,
        hasVehicle: false,
        hasPerson: false,
        plateNumber: null,
        confidence: 0,
        error: 'Timeout',
      });
    }, 30000);
  });
}

/**
 * 检查 Python 环境
 */
export async function checkPythonEnv(): Promise<{
  available: boolean;
  version?: string;
  error?: string;
}> {
  const pythonPath = findPython();
  
  if (!pythonPath) {
    return { available: false, error: 'Python not found' };
  }

  try {
    const version = execSync(`"${pythonPath}" --version`, {
      encoding: 'utf-8',
      windowsHide: true,
    }).trim();
    return { available: true, version };
  } catch {
    return { available: false, error: 'Cannot get Python version' };
  }
}
