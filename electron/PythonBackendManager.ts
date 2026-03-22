import { ChildProcess, spawn } from 'child_process';
import * as path from 'path';
import * as http from 'http';

/**
 * Configuration for the Python backend
 */
export interface BackendConfig {
  port: number;
  host: string;
  timeout: number;
}

/**
 * Information about the running backend
 */
export interface BackendInfo {
  port: number;
  url: string;
  pid: number;
  startTime: Date;
}

/**
 * Current status of the backend
 */
export type BackendState = 'stopped' | 'starting' | 'running' | 'error';

export interface BackendStatus {
  state: BackendState;
  port?: number;
  url?: string;
  pid?: number;
  uptime?: number;
  error?: string;
}

/**
 * Manages the lifecycle of the Python FastAPI backend
 */
export class PythonBackendManager {
  private process: ChildProcess | null = null;
  private backendInfo: BackendInfo | null = null;
  private status: BackendStatus = { state: 'stopped' };

  /**
   * Start the Python backend if it's not already running
   * @param config Backend configuration
   * @returns Promise that resolves with backend information when ready
   */
  async start(config: BackendConfig): Promise<BackendInfo> {
    const isRunning = await this.checkBackendReady(config.port);
    if (isRunning) {
      console.log(`[Backend] Already running on http://${config.host}:${config.port}`);
      this.status = { state: 'running', port: config.port, url: `http://${config.host}:${config.port}` };
      return {
        port: config.port,
        url: `http://${config.host}:${config.port}`,
        pid: -1, // Unknown PID if already running
        startTime: new Date(),
      };
    }


    this.status = { state: 'starting' };

    try {
      // Spawn the Python process
      await this.spawnBackendProcess(config.port);

      // Wait for the backend to be ready
      await this.waitForBackendReady(config.port, config.timeout);

      this.backendInfo = {
        port: config.port,
        url: `http://${config.host}:${config.port}`,
        pid: this.process!.pid!,
        startTime: new Date(),
      };

      this.status = {
        state: 'running',
        port: config.port,
        url: this.backendInfo.url,
        pid: this.backendInfo.pid,
        uptime: 0,
      };

      return this.backendInfo;
    } catch (error) {
      this.status = {
        state: 'error',
        error: error instanceof Error ? error.message : String(error),
      };
      throw error;
    }
  }

  /**
   * Stop the backend process
   */
  async stop(): Promise<void> {
    if (this.process) {
      return new Promise((resolve) => {
        this.process!.once('exit', () => {
          this.process = null;
          this.status = { state: 'stopped' };
          resolve();
        });
        
        // Kill the whole process tree if possible (on Windows)
        if (process.platform === 'win32') {
          spawn('taskkill', ['/pid', this.process!.pid!.toString(), '/f', '/t']);
        } else {
          this.process!.kill('SIGTERM');
        }
      });
    }
    this.status = { state: 'stopped' };
  }

  /**
   * Spawn the Python FastAPI server
   */
  private async spawnBackendProcess(port: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const rootPath = path.join(__dirname, '..');
      
      // Select python command
      const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

      console.log(`[Backend] Spawning Python backend on port ${port}...`);
      
      this.process = spawn(pythonCmd, ['-m', 'backend.main_api'], {
        cwd: rootPath,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          PORT: port.toString(),
          PYTHONUNBUFFERED: '1'
        }
      });

      if (!this.process.pid) {
        reject(new Error('Failed to spawn Python process'));
        return;
      }

      this.process.stdout?.on('data', (data) => {
        console.log('[Backend]', data.toString().trim());
      });

      this.process.stderr?.on('data', (data) => {
        console.error('[Backend Error]', data.toString().trim());
      });

      this.process.on('exit', (code) => {
        console.log(`[Backend] Process exited with code ${code}`);
        if (this.status.state === 'starting') {
          reject(new Error(`Backend failed to start (exit code ${code})`));
        }
        this.process = null;
        this.status = { state: 'stopped' };
      });

      resolve();
    });
  }

  /**
   * Wait for the backend to be ready by polling /health
   */
  private async waitForBackendReady(port: number, timeout: number): Promise<void> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      if (await this.checkBackendReady(port)) {
        return;
      }
      await new Promise(r => setTimeout(r, 1000));
    }
    throw new Error(`Backend timed out after ${timeout}ms`);
  }

  /**
   * Check if backend is responding on /health
   */
  private async checkBackendReady(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const req = http.get(`http://localhost:${port}/health`, (res) => {
        resolve(res.statusCode === 200);
      });
      req.on('error', () => resolve(false));
      req.setTimeout(500, () => {
        req.destroy();
        resolve(false);
      });
    });
  }
}
