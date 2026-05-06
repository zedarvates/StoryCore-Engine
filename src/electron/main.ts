/**
 * Main Electron Application
 * 
 * Requirements: 151-160
 * Level: 🟡 HAUTE
 * 
 * Main Electron process with all desktop features integrated
 */

import { app, BrowserWindow, shell, ipcMain } from 'electron';
import { join } from 'path';
import { createApplicationMenu } from './menu/menu';
import { createTrayIcon } from './tray/tray';
import { setupGlobalShortcuts } from './shortcuts/shortcuts';
import { createFileSystem } from './file-system/file-system';
import { createPrintSystem } from './print/print';

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (require('electron-squirrel-startup')) {
  app.quit();
}

class StoryCoreElectron {
  private mainWindow: BrowserWindow | null = null;
  private menu: any = null;
  private tray: any = null;
  private shortcuts: any = null;
  private fileSystem: any = null;
  private printSystem: any = null;

  constructor() {
    this.initializeApp();
  }

  /**
   * Initialize the application
   */
  private async initializeApp(): Promise<void> {
    // Set app name
    app.setName('StoryCore Engine');

    // Handle startup events
    app.on('ready', () => this.createWindow());
    app.on('window-all-closed', () => this.handleWindowAllClosed());
    app.on('activate', () => this.handleActivate());
    app.on('before-quit', () => this.handleBeforeQuit());
    app.on('will-quit', () => this.handleWillQuit());

    // Setup IPC handlers
    this.setupIPCHandlers();
  }

  /**
   * Create main window
   */
  private createWindow(): void {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      title: 'StoryCore Engine',
      icon: this.getIconPath(),
      backgroundColor: '#1a1a1a',
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        preload: join(__dirname, 'preload.js'),
      },
    });

    // Load the application
    this.loadApplication();

    // Setup window event handlers
    this.setupWindowEvents();

    // Initialize desktop features
    this.initializeDesktopFeatures();
  }

  /**
   * Load the application
   */
  private async loadApplication(): Promise<void> {
    if (!this.mainWindow) return;

    // Load the React app
    if (process.env.NODE_ENV === 'development') {
      await this.mainWindow.loadURL('http://localhost:3000');
      this.mainWindow.webContents.openDevTools();
    } else {
      await this.mainWindow.loadFile(join(__dirname, '../../creative-studio-ui/build/index.html'));
    }

    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
    });
  }

  /**
   * Setup window event handlers
   */
  private setupWindowEvents(): void {
    if (!this.mainWindow) return;

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    this.mainWindow.on('minimize', (event) => {
      if (this.tray && this.shouldMinimizeToTray()) {
        event.preventDefault();
        this.mainWindow?.hide();
      }
    });

    this.mainWindow.on('close', (event) => {
      if (!app.isQuitting && this.shouldMinimizeToTray()) {
        event.preventDefault();
        this.mainWindow?.hide();
      }
    });
  }

  /**
   * Initialize desktop features
   */
  private initializeDesktopFeatures(): void {
    if (!this.mainWindow) return;

    // Create application menu
    this.menu = createApplicationMenu(this.mainWindow);

    // Create tray icon
    this.tray = createTrayIcon(this.mainWindow, {
      showOnStartup: false,
    });

    // Setup global shortcuts
    this.shortcuts = setupGlobalShortcuts(this.mainWindow);

    // Create file system instance
    this.fileSystem = createFileSystem(this.mainWindow);

    // Create print system
    this.printSystem = createPrintSystem(this.mainWindow);
  }

  /**
   * Setup IPC handlers
   */
  private setupIPCHandlers(): void {
    // Menu handlers
    ipcMain.handle('menu:get-template', () => {
      return this.menu?.getTemplate();
    });

    ipcMain.handle('menu:update-item', (_event, id: string, enabled: boolean) => {
      this.menu?.updateMenuItem(id, enabled);
    });

    // Tray handlers
    ipcMain.handle('tray:show-notification', (_event, options: any) => {
      this.tray?.showNotification(options);
    });

    ipcMain.handle('tray:update-icon', (_event, iconPath?: string) => {
      this.tray?.updateIcon(iconPath);
    });

    // Shortcut handlers
    ipcMain.handle('shortcuts:register', (_event, id: string, config: any) => {
      return this.shortcuts?.register(id, config);
    });

    ipcMain.handle('shortcuts:unregister', (_event, id: string) => {
      this.shortcuts?.unregister(id);
    });

    ipcMain.handle('shortcuts:get-all', () => {
      return this.shortcuts?.getAll();
    });

    // File system handlers
    ipcMain.handle('fs:open-dialog', (_event, options: any) => {
      return this.fileSystem?.openDialog(options);
    });

    ipcMain.handle('fs:save-dialog', (_event, options: any) => {
      return this.fileSystem?.saveDialog(options);
    });

    ipcMain.handle('fs:read-file', (_event, path: string, options?: any) => {
      return this.fileSystem?.readFile(path, options);
    });

    ipcMain.handle('fs:write-file', (_event, path: string, data: any, options?: any) => {
      return this.fileSystem?.writeFile(path, data, options);
    });

    ipcMain.handle('fs:get-file-info', (_event, path: string) => {
      return this.fileSystem?.getFileInfo(path);
    });

    ipcMain.handle('fs:read-directory', (_event, path: string) => {
      return this.fileSystem?.readDirectory(path);
    });

    ipcMain.handle('fs:delete-file', (_event, path: string) => {
      return this.fileSystem?.deleteFile(path);
    });

    ipcMain.handle('fs:move-file', (_event, sourcePath: string, destPath: string) => {
      return this.fileSystem?.moveFile(sourcePath, destPath);
    });

    ipcMain.handle('fs:copy-file', (_event, sourcePath: string, destPath: string) => {
      return this.fileSystem?.copyFile(sourcePath, destPath);
    });

    ipcMain.handle('fs:create-directory', (_event, path: string) => {
      return this.fileSystem?.createDirectory(path);
    });

    ipcMain.handle('fs:get-recent-files', () => {
      return this.fileSystem?.getRecentFiles();
    });

    // Print handlers
    ipcMain.handle('print:current-window', (_event, options?: any) => {
      return this.printSystem?.printCurrentWindow(options);
    });

    ipcMain.handle('print:html', (_event, html: string, options?: any) => {
      return this.printSystem?.printHTML(html, options);
    });

    ipcMain.handle('print:pdf', (_event, pdfPath: string, options?: any) => {
      return this.printSystem?.printPDF(pdfPath, options);
    });

    ipcMain.handle('print:show-preview', (_event, options?: any) => {
      return this.printSystem?.showPrintPreview(options);
    });

    ipcMain.handle('print:get-printers', () => {
      return this.printSystem?.getPrinters();
    });

    ipcMain.handle('print:get-jobs', () => {
      return this.printSystem?.getAllPrintJobs();
    });

    ipcMain.handle('print:cancel-job', (_event, jobId: string) => {
      return this.printSystem?.cancelPrintJob(jobId);
    });

    // Window handlers
    ipcMain.handle('window:minimize', () => {
      this.mainWindow?.minimize();
    });

    ipcMain.handle('window:maximize', () => {
      if (this.mainWindow?.isMaximized()) {
        this.mainWindow.unmaximize();
      } else {
        this.mainWindow?.maximize();
      }
    });

    ipcMain.handle('window:close', () => {
      this.mainWindow?.close();
    });

    ipcMain.handle('window:toggle-fullscreen', () => {
      const isFullScreen = this.mainWindow?.isFullScreen() || false;
      this.mainWindow?.setFullScreen(!isFullScreen);
    });
  }

  /**
   * Get icon path
   */
  private getIconPath(): string {
    const iconName = process.platform === 'win32' ? 'icon.ico' : 'icon.png';
    return join(__dirname, '..', 'assets', iconName);
  }

  /**
   * Check if should minimize to tray
   */
  private shouldMinimizeToTray(): boolean {
    return true; // Always minimize to tray
  }

  /**
   * Handle window all closed
   */
  private handleWindowAllClosed(): void {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  }

  /**
   * Handle activate
   */
  private handleActivate(): void {
    if (this.mainWindow === null) {
      this.createWindow();
    }
  }

  /**
   * Handle before quit
   */
  private handleBeforeQuit(): void {
    app.isQuitting = true;
  }

  /**
   * Handle will quit
   */
  private handleWillQuit(): void {
    // Cleanup resources
    this.shortcuts?.unregisterAll();
    this.tray?.destroy();
  }
}

// Create the application
new StoryCoreElectron();
