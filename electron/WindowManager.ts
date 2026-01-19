import { BrowserWindow, screen, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

/**
 * Window state for persistence
 */
export interface WindowState {
  width: number;
  height: number;
  x?: number;
  y?: number;
  isMaximized: boolean;
}

/**
 * Configuration for window creation
 */
export interface WindowConfig {
  width?: number;
  height?: number;
  minWidth?: number;
  minHeight?: number;
  title?: string;
  icon?: string;
  preload?: string;
}

/**
 * Manages Electron browser windows
 * 
 * Responsibilities:
 * - Create and manage main application window
 * - Create and manage splash screen
 * - Open external browser when server is ready
 * - Persist and restore window state (size, position)
 * - Handle window lifecycle events
 */
export class WindowManager {
  private mainWindow: BrowserWindow | null = null;
  private splashWindow: BrowserWindow | null = null;
  private stateFilePath: string;
  private defaultState: WindowState = {
    width: 1200,
    height: 800,
    isMaximized: false,
  };

  constructor() {
    // Store window state in user data directory
    const userDataPath = this.getUserDataPath();
    this.stateFilePath = path.join(userDataPath, 'window-state.json');
  }

  /**
   * Create the main application window
   * @param url URL to load in the window
   * @param config Optional window configuration
   * @returns The created BrowserWindow
   */
  createMainWindow(url: string, config?: WindowConfig): BrowserWindow {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.focus();
      return this.mainWindow;
    }

    // Load saved window state
    const state = this.loadWindowState();

    // Get display bounds to ensure window is visible
    const displayBounds = screen.getPrimaryDisplay().bounds;

    // Validate saved position is within display bounds
    if (state.x !== undefined && state.y !== undefined) {
      const isVisible = 
        state.x >= displayBounds.x &&
        state.y >= displayBounds.y &&
        state.x + state.width <= displayBounds.x + displayBounds.width &&
        state.y + state.height <= displayBounds.y + displayBounds.height;

      if (!isVisible) {
        // Reset position if window would be off-screen
        delete state.x;
        delete state.y;
      }
    }

    // Create the window
    this.mainWindow = new BrowserWindow({
      width: config?.width || state.width,
      height: config?.height || state.height,
      x: state.x,
      y: state.y,
      minWidth: config?.minWidth || 800,
      minHeight: config?.minHeight || 600,
      title: config?.title || 'StoryCore Creative Studio',
      icon: config?.icon,
      show: false, // Don't show until ready
      backgroundColor: '#1a1a1a',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: config?.preload,
      },
    });

    // Restore maximized state
    if (state.isMaximized) {
      this.mainWindow.maximize();
    }

    // Load the URL
    this.mainWindow.loadURL(url);

    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      if (this.mainWindow) {
        this.mainWindow.show();
        
        // Close splash screen if it exists
        if (this.splashWindow && !this.splashWindow.isDestroyed()) {
          this.splashWindow.close();
          this.splashWindow = null;
        }
      }
    });

    // Save window state on close
    this.mainWindow.on('close', () => {
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.saveWindowState(this.mainWindow);
      }
    });

    // Handle external links
    this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      // Open external links in default browser
      if (url.startsWith('http://') || url.startsWith('https://')) {
        shell.openExternal(url);
      }
      return { action: 'deny' };
    });

    return this.mainWindow;
  }

  /**
   * Create a splash screen window
   * @returns The created splash screen window
   */
  createSplashScreen(): BrowserWindow {
    if (this.splashWindow && !this.splashWindow.isDestroyed()) {
      return this.splashWindow;
    }

    this.splashWindow = new BrowserWindow({
      width: 400,
      height: 300,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      resizable: false,
      center: true,
      backgroundColor: '#00000000',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    // Create a simple splash screen HTML
    const splashHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              color: white;
            }
            .splash-container {
              text-align: center;
              padding: 40px;
              background: rgba(0, 0, 0, 0.3);
              border-radius: 20px;
              backdrop-filter: blur(10px);
            }
            .logo {
              font-size: 48px;
              font-weight: bold;
              margin-bottom: 20px;
              text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
            }
            .title {
              font-size: 20px;
              margin-bottom: 30px;
              opacity: 0.9;
            }
            .spinner {
              width: 40px;
              height: 40px;
              margin: 0 auto;
              border: 4px solid rgba(255, 255, 255, 0.3);
              border-top-color: white;
              border-radius: 50%;
              animation: spin 1s linear infinite;
            }
            .status {
              margin-top: 20px;
              font-size: 14px;
              opacity: 0.8;
            }
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          </style>
        </head>
        <body>
          <div class="splash-container">
            <div class="logo">🎬</div>
            <div class="title">StoryCore Creative Studio</div>
            <div class="spinner"></div>
            <div class="status">Starting server...</div>
          </div>
        </body>
      </html>
    `;

    this.splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(splashHtml)}`);
    this.splashWindow.show();

    return this.splashWindow;
  }

  /**
   * Show a window
   * @param window The window to show
   */
  showWindow(window: BrowserWindow): void {
    if (!window.isDestroyed()) {
      window.show();
      window.focus();
    }
  }

  /**
   * Hide a window
   * @param window The window to hide
   */
  hideWindow(window: BrowserWindow): void {
    if (!window.isDestroyed()) {
      window.hide();
    }
  }

  /**
   * Open URL in external browser
   * @param url URL to open
   */
  async openBrowser(url: string): Promise<void> {
    try {
      await shell.openExternal(url);
    } catch (error) {
      console.error('Failed to open browser:', error);
      throw new Error(`Failed to open browser: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get the main window
   */
  getMainWindow(): BrowserWindow | null {
    return this.mainWindow;
  }

  /**
   * Get the splash window
   */
  getSplashWindow(): BrowserWindow | null {
    return this.splashWindow;
  }

  /**
   * Close all windows
   */
  closeAll(): void {
    if (this.splashWindow && !this.splashWindow.isDestroyed()) {
      this.splashWindow.close();
      this.splashWindow = null;
    }

    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.close();
      this.mainWindow = null;
    }
  }

  /**
   * Load window state from disk
   */
  private loadWindowState(): WindowState {
    try {
      if (fs.existsSync(this.stateFilePath)) {
        const data = fs.readFileSync(this.stateFilePath, 'utf-8');
        const state = JSON.parse(data) as WindowState;
        
        // Validate state
        if (
          typeof state.width === 'number' &&
          typeof state.height === 'number' &&
          typeof state.isMaximized === 'boolean'
        ) {
          return state;
        }
      }
    } catch (error) {
      console.error('Failed to load window state:', error);
    }

    return { ...this.defaultState };
  }

  /**
   * Save window state to disk
   */
  private saveWindowState(window: BrowserWindow): void {
    try {
      const bounds = window.getBounds();
      const state: WindowState = {
        width: bounds.width,
        height: bounds.height,
        x: bounds.x,
        y: bounds.y,
        isMaximized: window.isMaximized(),
      };

      // Ensure directory exists
      const dir = path.dirname(this.stateFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(this.stateFilePath, JSON.stringify(state, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save window state:', error);
    }
  }

  /**
   * Get user data path for storing application data
   */
  private getUserDataPath(): string {
    // Use platform-specific user data directory
    const appName = 'StoryCore';
    
    switch (process.platform) {
      case 'win32':
        return path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), appName);
      case 'darwin':
        return path.join(os.homedir(), 'Library', 'Application Support', appName);
      case 'linux':
        return path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), appName);
      default:
        return path.join(os.homedir(), `.${appName.toLowerCase()}`);
    }
  }
}
