import { ChildProcess, spawn } from 'child_process';
import * as net from 'net';
import * as path from 'path';

/**
 * Configuration for the Vite server
 */
export interface LauncherConfig {
  vitePort: number;
  fallbackPorts: number[];
  serverStartTimeout: number;
  autoOpenBrowser: boolean;
}

/**
 * Information about the running server
 */
export interface ServerInfo {
  port: number;
  url: string;
  pid: number;
  startTime: Date;
}

/**
 * Current status of the server
 */
export type ServerState = 'stopped' | 'starting' | 'running' | 'error';

export interface ServerStatus {
  state: ServerState;
  port?: number;
  url?: string;
  pid?: number;
  uptime?: number;
  error?: ServerError;
}

export interface ServerError {
  code: string;
  message: string;
  details?: string;
  timestamp: Date;
}

/**
 * Manages the lifecycle of the Vite development server
 * 
 * Responsibilities:
 * - Start and stop the Vite server process
 * - Check port availability and handle conflicts
 * - Detect when the server is ready
 * - Provide server status information
 * - Handle graceful shutdown
 */
export class ViteServerManager {
  private process: ChildProcess | null = null;
  private config: LauncherConfig | null = null;
  private serverInfo: ServerInfo | null = null;
  private status: ServerStatus = { state: 'stopped' };
  private readyCallbacks: Array<() => void> = [];
  private errorCallbacks: Array<(error: Error) => void> = [];

  /**
   * Start the Vite server with the given configuration
   * @param config Server configuration
   * @returns Promise that resolves with server information when ready
   */
  async start(config: LauncherConfig): Promise<ServerInfo> {
    if (this.status.state === 'running') {
      throw new Error('Server is already running');
    }

    if (this.status.state === 'starting') {
      throw new Error('Server is already starting');
    }

    this.config = config;
    this.status = { state: 'starting' };

    try {
      // Find an available port
      const port = await this.findAvailablePort(config.vitePort, config.fallbackPorts);

      // Spawn the Vite server process
      await this.spawnServerProcess(port);

      // Wait for the server to be ready
      await this.waitForServerReady(port, config.serverStartTimeout);

      // Update server info and status
      this.serverInfo = {
        port,
        url: `http://localhost:${port}`,
        pid: this.process!.pid!,
        startTime: new Date(),
      };

      this.status = {
        state: 'running',
        port,
        url: this.serverInfo.url,
        pid: this.serverInfo.pid,
        uptime: 0,
      };

      // Notify ready callbacks
      this.readyCallbacks.forEach(callback => callback());
      this.readyCallbacks = [];

      return this.serverInfo;
    } catch (error) {
      const serverError: ServerError = {
        code: error instanceof Error && 'code' in error ? (error as any).code : 'UNKNOWN',
        message: error instanceof Error ? error.message : String(error),
        details: error instanceof Error ? error.stack : undefined,
        timestamp: new Date(),
      };

      this.status = {
        state: 'error',
        error: serverError,
      };

      // Notify error callbacks
      const errorObj = error instanceof Error ? error : new Error(String(error));
      this.errorCallbacks.forEach(callback => callback(errorObj));

      throw error;
    }
  }

  /**
   * Stop the Vite server gracefully
   */
  async stop(): Promise<void> {
    if (this.status.state === 'stopped') {
      return;
    }

    if (!this.process) {
      this.status = { state: 'stopped' };
      return;
    }

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        // Force kill if graceful shutdown takes too long
        if (this.process) {
          this.process.kill('SIGKILL');
        }
        reject(new Error('Server shutdown timeout'));
      }, 5000);

      this.process!.once('exit', () => {
        clearTimeout(timeout);
        this.process = null;
        this.serverInfo = null;
        this.status = { state: 'stopped' };
        resolve();
      });

      // Send SIGTERM for graceful shutdown
      this.process!.kill('SIGTERM');
    });
  }

  /**
   * Restart the server
   */
  async restart(): Promise<ServerInfo> {
    await this.stop();
    if (!this.config) {
      throw new Error('Cannot restart: no configuration available');
    }
    return this.start(this.config);
  }

  /**
   * Get the current server status
   */
  getStatus(): ServerStatus {
    if (this.status.state === 'running' && this.serverInfo) {
      const uptime = Date.now() - this.serverInfo.startTime.getTime();
      return {
        ...this.status,
        uptime,
      };
    }
    return this.status;
  }

  /**
   * Register a callback to be called when the server is ready
   */
  onReady(callback: () => void): void {
    if (this.status.state === 'running') {
      callback();
    } else {
      this.readyCallbacks.push(callback);
    }
  }

  /**
   * Register a callback to be called when an error occurs
   */
  onError(callback: (error: Error) => void): void {
    this.errorCallbacks.push(callback);
  }

  /**
   * Check if a port is available
   */
  private async isPortAvailable(port: number): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      const server = net.createServer();

      server.once('error', () => {
        resolve(false);
      });

      server.once('listening', () => {
        server.close();
        resolve(true);
      });

      server.listen(port);
    });
  }

  /**
   * Find an available port from the configured options
   */
  private async findAvailablePort(defaultPort: number, fallbackPorts: number[]): Promise<number> {
    // Try default port first
    if (await this.isPortAvailable(defaultPort)) {
      return defaultPort;
    }

    // Try fallback ports
    for (const port of fallbackPorts) {
      if (await this.isPortAvailable(port)) {
        return port;
      }
    }

    throw new Error(
      `No available ports found. Tried ${defaultPort} and fallback ports ${fallbackPorts.join(', ')}`
    );
  }

  /**
   * Spawn the Vite server process
   */
  private async spawnServerProcess(port: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const uiPath = path.join(__dirname, '../../creative-studio-ui');

      // Determine the npm command based on platform
      const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

      // Spawn the Vite dev server
      this.process = spawn(npmCommand, ['run', 'dev', '--', '--port', port.toString()], {
        cwd: uiPath,
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true,
        env: {
          ...process.env,
          FORCE_COLOR: '1', // Enable colored output
        },
      });

      if (!this.process.pid) {
        reject(new Error('Failed to spawn Vite server process'));
        return;
      }

      // Handle process output
      this.process.stdout?.on('data', (data: Buffer) => {
        const output = data.toString();
        console.log('[Vite]', output);
      });

      this.process.stderr?.on('data', (data: Buffer) => {
        const output = data.toString();
        console.error('[Vite Error]', output);
      });

      // Handle process exit
      this.process.on('exit', (code, signal) => {
        console.log(`Vite server exited with code ${code} and signal ${signal}`);
        if (this.status.state === 'starting') {
          reject(new Error(`Vite server exited during startup with code ${code}`));
        } else if (this.status.state === 'running') {
          // Server crashed unexpectedly
          const error: ServerError = {
            code: 'SERVER_CRASHED',
            message: `Server crashed with exit code ${code}`,
            timestamp: new Date(),
          };
          this.status = { state: 'error', error };
          this.errorCallbacks.forEach(callback =>
            callback(new Error(error.message))
          );
        }
        this.process = null;
      });

      // Handle spawn errors
      this.process.on('error', (error) => {
        console.error('Failed to start Vite server:', error);
        reject(error);
      });

      // Resolve immediately after spawning - we'll wait for ready separately
      resolve();
    });
  }

  /**
   * Wait for the server to be ready by polling the port
   */
  private async waitForServerReady(port: number, timeout: number): Promise<void> {
    const startTime = Date.now();
    const pollInterval = 500; // Check every 500ms

    while (Date.now() - startTime < timeout) {
      try {
        // Try to connect to the server
        const isReady = await this.checkServerReady(port);
        if (isReady) {
          return;
        }
      } catch (error) {
        // Server not ready yet, continue polling
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error(`Server failed to start within ${timeout}ms`);
  }

  /**
   * Check if the server is ready by attempting to connect
   */
  private async checkServerReady(port: number): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      const socket = new net.Socket();

      socket.setTimeout(1000);

      socket.once('connect', () => {
        socket.destroy();
        resolve(true);
      });

      socket.once('error', () => {
        socket.destroy();
        resolve(false);
      });

      socket.once('timeout', () => {
        socket.destroy();
        resolve(false);
      });

      socket.connect(port, 'localhost');
    });
  }
}
