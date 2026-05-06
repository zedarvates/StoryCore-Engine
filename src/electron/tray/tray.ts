/**
 * Electron Tray Icon
 * 
 * Requirements: 156
 * Level: 🟡 HAUTE
 * 
 * System tray icon with context menu
 */

import { app, Tray, Menu, nativeImage, BrowserWindow } from 'electron';
import { join } from 'path';

export interface TrayOptions {
  mainWindow: BrowserWindow;
  showOnStartup?: boolean;
}

export class ElectronTray {
  private tray: Tray | null = null;
  private mainWindow: BrowserWindow;
  private showOnStartup: boolean;
  private iconPath: string;

  constructor(options: TrayOptions) {
    this.mainWindow = options.mainWindow;
    this.showOnStartup = options.showOnStartup ?? true;
    this.iconPath = this.getIconPath();
  }

  /**
   * Create tray icon
   */
  public create(): void {
    const icon = nativeImage.createFromPath(this.iconPath);
    this.tray = new Tray(icon);

    this.setupTooltip();
    this.setupContextMenu();
    this.setupEventHandlers();

    if (this.showOnStartup) {
      this.mainWindow.show();
    } else {
      this.mainWindow.hide();
    }
  }

  /**
   * Show tray notification
   */
  public showNotification(options: {
    title: string;
    body: string;
    silent?: boolean;
  }): void {
    if (!this.tray) return;

    this.tray.displayBalloon({
      title: options.title,
      content: options.body,
      icon: nativeImage.createFromPath(this.iconPath),
    });
  }

  /**
   * Update tray icon
   */
  public updateIcon(iconPath?: string): void {
    if (!this.tray) return;

    const path = iconPath || this.iconPath;
    const icon = nativeImage.createFromPath(path);
    this.tray.setImage(icon);
  }

  /**
   * Update tooltip
   */
  public setTooltip(tooltip: string): void {
    if (!this.tray) return;
    this.tray.setToolTip(tooltip);
  }

  /**
   * Destroy tray icon
   */
  public destroy(): void {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }

  /**
   * Check if tray is created
   */
  public isCreated(): boolean {
    return this.tray !== null;
  }

  /**
   * Get icon path based on platform
   */
  private getIconPath(): string {
    const iconName = process.platform === 'win32' ? 'icon.ico' : 'icon.png';
    return join(__dirname, '..', '..', 'assets', iconName);
  }

  /**
   * Setup tooltip
   */
  private setupTooltip(): void {
    if (!this.tray) return;
    this.tray.setToolTip('StoryCore Engine');
  }

  /**
   * Setup context menu
   */
  private setupContextMenu(): void {
    if (!this.tray) return;

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show StoryCore',
        click: () => this.showWindow(),
      },
      {
        label: 'Hide StoryCore',
        click: () => this.hideWindow(),
      },
      { type: 'separator' },
      {
        label: 'New Project',
        click: () => this.createNewProject(),
      },
      {
        label: 'Open Recent',
        submenu: [
          {
            label: 'Project 1',
            click: () => this.openRecent('project1'),
          },
          {
            label: 'Project 2',
            click: () => this.openRecent('project2'),
          },
        ],
      },
      { type: 'separator' },
      {
        label: 'Preferences...',
        click: () => this.openPreferences(),
      },
      { type: 'separator' },
      {
        label: 'Toggle DevTools',
        click: () => this.toggleDevTools(),
      },
      { type: 'separator' },
      {
        label: 'Quit StoryCore',
        click: () => this.quit(),
      },
    ]);

    this.tray.setContextMenu(contextMenu);
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    if (!this.tray) return;

    this.tray.on('click', () => {
      this.toggleWindow();
    });

    this.tray.on('double-click', () => {
      this.showWindow();
    });

    this.tray.on('right-click', () => {
      this.tray?.popUpContextMenu();
    });

    this.tray.on('balloon-click', () => {
      this.showWindow();
    });
  }

  /**
   * Show main window
   */
  private showWindow(): void {
    this.mainWindow.show();
    this.mainWindow.focus();
  }

  /**
   * Hide main window
   */
  private hideWindow(): void {
    this.mainWindow.hide();
  }

  /**
   * Toggle main window visibility
   */
  private toggleWindow(): void {
    if (this.mainWindow.isVisible()) {
      this.hideWindow();
    } else {
      this.showWindow();
    }
  }

  /**
   * Create new project
   */
  private createNewProject(): void {
    this.mainWindow.webContents.send('tray:new-project');
    this.showWindow();
  }

  /**
   * Open recent project
   */
  private openRecent(projectId: string): void {
    this.mainWindow.webContents.send('tray:open-recent', projectId);
    this.showWindow();
  }

  /**
   * Open preferences
   */
  private openPreferences(): void {
    this.mainWindow.webContents.send('tray:preferences');
    this.showWindow();
  }

  /**
   * Toggle dev tools
   */
  private toggleDevTools(): void {
    this.mainWindow.webContents.toggleDevTools();
  }

  /**
   * Quit application
   */
  private quit(): void {
    app.quit();
  }
}

/**
 * Create tray icon
 */
export function createTrayIcon(mainWindow: BrowserWindow, options?: Partial<TrayOptions>): ElectronTray {
  const tray = new ElectronTray({
    mainWindow,
    ...options,
  });

  tray.create();
  return tray;
}
