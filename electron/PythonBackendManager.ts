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

      // Perform version compatibility check
      try {
        await this.checkVersion(config.port);
        console.log('[Backend] Version compatibility verified');
      } catch (versionError) {
        console.error('[Backend] Version check failed:', versionError);
        // We stop the backend if it's incompatible
        await this.stop();
        throw versionError;
      }

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
      // Try multiple strategies to find the backend location
      const possiblePaths = [
        // Development: project root (two levels up from dist/electron)
        path.resolve(__dirname, '../../'),
        // Production (electron-builder): app.asar root
        path.join(__dirname, '..'),
        // Alternative production: app contents
        path.resolve(__dirname, '../..'),
      ];
      
      // Cache fs module outside loop for efficiency
      const fs = require('fs');
      
      // Find the first path that has backend/main_api.py
      let rootPath: string | undefined;
      for (const candidate of possiblePaths) {
        const backendPath = path.join(candidate, 'backend', 'main_api.py');
        try {
          if (fs.existsSync(backendPath)) {
            rootPath = candidate;
            console.log(`[PythonBackend] Found backend at: ${backendPath}`);
            break;
          }
        } catch {
          // Continue to next candidate
        }
      }
      
      if (!rootPath) {
        // Error: No valid backend path found in any location
        const errorMsg = `[PythonBackend] CRITICAL: Could not locate backend/main_api.py in any search path.\n` +
          `Searched paths: ${possiblePaths.join('\n')}\n` +
          `Please ensure the backend is properly installed or rebuilt.`;
        console.error(errorMsg);
        // Fallback to development path but log as error
        rootPath = path.resolve(__dirname, '../../');
        console.error(`[PythonBackend] Using fallback path: ${rootPath} - THIS MAY NOT WORK IN PRODUCTION`);
      }
      
      // Select python command
      const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
      
      console.log(`[PythonBackend] Starting python backend from: ${rootPath}`);
      console.log(`[PythonBackend] command: ${pythonCmd} -m backend.main_api`);
      
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

  /**
   * Performs a version check against the backend
   */
  private async checkVersion(port: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const req = http.get(`http://localhost:${port}/health`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            const version = response.version;
            
            if (!version) {
              reject(new Error('Backend did not provide a version number'));
              return;
            }

            console.log(`[Backend] Detected version: ${version}`);
            
            const minVersion = '1.0.0';
            if (this.isVersionCompatible(version, minVersion)) {
              resolve();
            } else {
              reject(new Error(`Incompatible backend version: ${version}. Minimum required: ${minVersion}`));
            }
          } catch (e) {
            reject(new Error('Failed to parse backend version response'));
          }
        });
      });
      
      req.on('error', (e) => {
        reject(new Error(`Failed to contact backend for version check: ${e.message}`));
      });
    });
  }

  /**
   * Simple semantic version comparison
   */
  private isVersionCompatible(current: string, minimum: string): boolean {
    const v1 = current.split('.').map(Number);
    const v2 = minimum.split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
      const n1 = v1[i] || 0;
      const n2 = v2[i] || 0;
      if (n1 > n2) return true;
      if (n1 < n2) return false;
    }
    return true;
  }
}
