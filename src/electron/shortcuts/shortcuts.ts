/**
 * Electron Global Shortcuts
 * 
 * Requirements: 157
 * Level: 🟡 HAUTE
 * 
 * Global keyboard shortcuts for Electron application
 */

import { app, globalShortcut, Accelerator, KeyboardEvent } from 'electron';
import { BrowserWindow } from 'electron';

export interface ShortcutConfig {
  accelerator: Accelerator;
  description: string;
  callback: () => void;
  enabled?: boolean;
}

export interface ShortcutCategory {
  name: string;
  shortcuts: ShortcutConfig[];
}

export class ElectronShortcuts {
  private shortcuts: Map<string, ShortcutConfig> = new Map();
  private mainWindow: BrowserWindow;
  private isRegistered: boolean = false;

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
  }

  /**
   * Register all shortcuts
   */
  public registerAll(): boolean {
    if (this.isRegistered) {
      return true;
    }

    let success = true;

    for (const [id, shortcut] of this.shortcuts) {
      if (shortcut.enabled !== false) {
        const registered = globalShortcut.register(shortcut.accelerator, shortcut.callback);
        if (!registered) {
          console.error(`Failed to register shortcut: ${id}`);
          success = false;
        }
      }
    }

    this.isRegistered = success;
    return success;
  }

  /**
   * Unregister all shortcuts
   */
  public unregisterAll(): void {
    globalShortcut.unregisterAll();
    this.isRegistered = false;
  }

  /**
   * Register a shortcut
   */
  public register(id: string, config: ShortcutConfig): boolean {
    this.shortcuts.set(id, config);

    if (this.isRegistered && config.enabled !== false) {
      return globalShortcut.register(config.accelerator, config.callback);
    }

    return true;
  }

  /**
   * Unregister a shortcut
   */
  public unregister(id: string): void {
    const shortcut = this.shortcuts.get(id);
    if (shortcut) {
      globalShortcut.unregister(shortcut.accelerator);
      this.shortcuts.delete(id);
    }
  }

  /**
   * Check if shortcut is registered
   */
  public isRegistered(id: string): boolean {
    return globalShortcut.isRegistered(this.shortcuts.get(id)?.accelerator || '');
  }

  /**
   * Enable a shortcut
   */
  public enable(id: string): boolean {
    const shortcut = this.shortcuts.get(id);
    if (shortcut) {
      shortcut.enabled = true;
      if (this.isRegistered) {
        return globalShortcut.register(shortcut.accelerator, shortcut.callback);
      }
    }
    return false;
  }

  /**
   * Disable a shortcut
   */
  public disable(id: string): void {
    const shortcut = this.shortcuts.get(id);
    if (shortcut) {
      shortcut.enabled = false;
      globalShortcut.unregister(shortcut.accelerator);
    }
  }

  /**
   * Get all shortcuts
   */
  public getAll(): Map<string, ShortcutConfig> {
    return new Map(this.shortcuts);
  }

  /**
   * Get shortcut categories
   */
  public getCategories(): ShortcutCategory[] {
    return [
      {
        name: 'Application',
        shortcuts: [
          {
            accelerator: 'CmdOrCtrl+Q',
            description: 'Quit application',
            callback: () => app.quit(),
          },
          {
            accelerator: 'CmdOrCtrl+N',
            description: 'New project',
            callback: () => this.createNewProject(),
          },
          {
            accelerator: 'CmdOrCtrl+O',
            description: 'Open project',
            callback: () => this.openProject(),
          },
          {
            accelerator: 'CmdOrCtrl+S',
            description: 'Save project',
            callback: () => this.saveProject(),
          },
        ],
      },
      {
        name: 'Window',
        shortcuts: [
          {
            accelerator: 'CmdOrCtrl+M',
            description: 'Minimize window',
            callback: () => this.minimizeWindow(),
          },
          {
            accelerator: 'CmdOrCtrl+W',
            description: 'Close window',
            callback: () => this.closeWindow(),
          },
          {
            accelerator: 'F11',
            description: 'Toggle full screen',
            callback: () => this.toggleFullScreen(),
          },
          {
            accelerator: 'CmdOrCtrl+=',
            description: 'Zoom in',
            callback: () => this.zoomIn(),
          },
          {
            accelerator: 'CmdOrCtrl+-',
            description: 'Zoom out',
            callback: () => this.zoomOut(),
          },
          {
            accelerator: 'CmdOrCtrl+0',
            description: 'Reset zoom',
            callback: () => this.resetZoom(),
          },
        ],
      },
      {
        name: 'Development',
        shortcuts: [
          {
            accelerator: 'F12',
            description: 'Toggle DevTools',
            callback: () => this.toggleDevTools(),
          },
          {
            accelerator: 'CmdOrCtrl+R',
            description: 'Reload window',
            callback: () => this.reloadWindow(),
          },
          {
            accelerator: 'CmdOrCtrl+Shift+R',
            description: 'Force reload',
            callback: () => this.forceReload(),
          },
        ],
      },
      {
        name: 'Media',
        shortcuts: [
          {
            accelerator: 'Space',
            description: 'Play/Pause',
            callback: () => this.playPause(),
          },
          {
            accelerator: 'CmdOrCtrl+P',
            description: 'Print',
            callback: () => this.print(),
          },
        ],
      },
    ];
  }

  /**
   * Setup default shortcuts
   */
  public setupDefaultShortcuts(): void {
    const categories = this.getCategories();
    
    categories.forEach(category => {
      category.shortcuts.forEach((shortcut, index) => {
        const id = `${category.name.toLowerCase()}-${index}`;
        this.register(id, shortcut);
      });
    });
  }

  /**
   * Handle keyboard event
   */
  public handleKeyboardEvent(event: KeyboardEvent): void {
    // Custom keyboard event handling
    if (event.key === 'F12') {
      this.toggleDevTools();
    }
  }

  /**
   * Create new project
   */
  private createNewProject(): void {
    this.mainWindow.webContents.send('shortcut:new-project');
  }

  /**
   * Open project
   */
  private openProject(): void {
    this.mainWindow.webContents.send('shortcut:open-project');
  }

  /**
   * Save project
   */
  private saveProject(): void {
    this.mainWindow.webContents.send('shortcut:save-project');
  }

  /**
   * Minimize window
   */
  private minimizeWindow(): void {
    this.mainWindow.minimize();
  }

  /**
   * Close window
   */
  private closeWindow(): void {
    this.mainWindow.close();
  }

  /**
   * Toggle full screen
   */
  private toggleFullScreen(): void {
    const isFullScreen = this.mainWindow.isFullScreen();
    this.mainWindow.setFullScreen(!isFullScreen);
  }

  /**
   * Zoom in
   */
  private zoomIn(): void {
    const currentZoom = this.mainWindow.webContents.getZoomFactor();
    this.mainWindow.webContents.setZoomFactor(Math.min(3.0, currentZoom + 0.1));
  }

  /**
   * Zoom out
   */
  private zoomOut(): void {
    const currentZoom = this.mainWindow.webContents.getZoomFactor();
    this.mainWindow.webContents.setZoomFactor(Math.max(0.1, currentZoom - 0.1));
  }

  /**
   * Reset zoom
   */
  private resetZoom(): void {
    this.mainWindow.webContents.setZoomFactor(1.0);
  }

  /**
   * Toggle DevTools
   */
  private toggleDevTools(): void {
    this.mainWindow.webContents.toggleDevTools();
  }

  /**
   * Reload window
   */
  private reloadWindow(): void {
    this.mainWindow.webContents.reload();
  }

  /**
   * Force reload
   */
  private forceReload(): void {
    this.mainWindow.webContents.reloadIgnoringCache();
  }

  /**
   * Play/Pause
   */
  private playPause(): void {
    this.mainWindow.webContents.send('shortcut:play-pause');
  }

  /**
   * Print
   */
  private print(): void {
    this.mainWindow.webContents.send('shortcut:print');
  }
}

/**
 * Create and setup global shortcuts
 */
export function setupGlobalShortcuts(mainWindow: BrowserWindow): ElectronShortcuts {
  const shortcuts = new ElectronShortcuts(mainWindow);
  shortcuts.setupDefaultShortcuts();
  shortcuts.registerAll();
  return shortcuts;
}

/**
 * Check if shortcut is registered
 */
export function isShortcutRegistered(accelerator: Accelerator): boolean {
  return globalShortcut.isRegistered(accelerator);
}

/**
 * Unregister all shortcuts (cleanup)
 */
export function cleanupShortcuts(): void {
  globalShortcut.unregisterAll();
}
