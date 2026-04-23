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
        error: '未找到 Python，请安装 Python 3.8+',
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
        error: 'Python 脚本不存在',
      });
      return;
    }

    console.log(`[Python] 调用脚本: ${scriptPath}`);
    console.log(`[Python] 图片路径: ${imagePath}`);

    // 调用 Python 脚本
    const python = spawn(pythonPath, [scriptPath, imagePath], {
      windowsHide: true,
      timeout: 30000, // 30秒超时
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
      console.error('[Python] 启动失败:', error);
      resolve({
        success: false,
        hasVehicle: false,
        hasPerson: false,
        plateNumber: null,
        confidence: 0,
        error: `Python 启动失败: ${error.message}`,
      });
    });

    python.on('close', (code: number) => {
      console.log(`[Python] 脚本退出，代码: ${code}`);
      
      if (stderr) {
        console.error('[Python] 错误输出:', stderr);
      }

      if (code === 0 && stdout) {
        try {
          const result = JSON.parse(stdout);
          console.log('[Python] 识别结果:', result);
          resolve(result);
        } catch (e) {
          console.error('[Python] 解析结果失败:', stdout);
          resolve({
            success: false,
            hasVehicle: false,
            hasPerson: false,
            plateNumber: null,
            confidence: 0,
            error: '解析识别结果失败',
          });
        }
      } else {
        // 尝试从错误信息中提取问题
        let errorMsg = 'Python 脚本执行失败';
        if (stderr.includes('need_install')) {
          errorMsg = '请先安装 Python 依赖，运行: scripts\\install_deps.bat';
        }
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

    // 30秒超时
    setTimeout(() => {
      python.kill();
      resolve({
        success: false,
        hasVehicle: false,
        hasPerson: false,
        plateNumber: null,
        confidence: 0,
        error: '识别超时（30秒）',
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
  hasOpenCV?: boolean;
  hasPaddleOCR?: boolean;
  error?: string;
}> {
  return new Promise((resolve) => {
    const pythonPath = findPython();
    
    if (!pythonPath) {
      resolve({
        available: false,
        error: '未找到 Python，请安装 Python 3.8+',
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
        error: '无法获取 Python 版本',
      });
    }
  });
}
