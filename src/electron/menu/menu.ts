/**
 * Electron Menu System
 * 
 * Requirements: 155-160
 * Level: 🟡 HAUTE
 * 
 * Native menu bar for Electron application
 */

import { app, Menu, BrowserWindow, MenuItemConstructorOptions, shell } from 'electron';
import { join } from 'path';

export interface MenuTemplate extends MenuItemConstructorOptions {
  id?: string;
  role?: string;
  label?: string;
  submenu?: MenuTemplate[];
  accelerator?: string;
  click?: () => void;
  type?: 'normal' | 'separator' | 'submenu' | 'checkbox' | 'radio';
  enabled?: boolean;
  visible?: boolean;
  checked?: boolean;
}

export interface MenuOptions {
  isMac: boolean;
  isDev: boolean;
  mainWindow: BrowserWindow;
}

export class ElectronMenu {
  private menu: Menu | null = null;
  private mainWindow: BrowserWindow;
  private isMac: boolean;
  private isDev: boolean;

  constructor(options: MenuOptions) {
    this.mainWindow = options.mainWindow;
    this.isMac = options.isMac;
    this.isDev = options.isDev;
  }

  /**
   * Build and set application menu
   */
  public build(): void {
    const template = this.buildTemplate();
    this.menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(this.menu);
  }

  /**
   * Build menu template
   */
  private buildTemplate(): MenuTemplate[] {
    const template: MenuTemplate[] = [];

    // File menu
    template.push(this.buildFileMenu());

    // Edit menu
    template.push(this.buildEditMenu());

    // View menu
    template.push(this.buildViewMenu());

    // Window menu
    template.push(this.buildWindowMenu());

    // Help menu
    template.push(this.buildHelpMenu());

    // macOS specific menus
    if (this.isMac) {
      template.unshift(this.buildAppMenu());
    }

    return template;
  }

  /**
   * Build File menu
   */
  private buildFileMenu(): MenuTemplate {
    return {
      label: 'File',
      submenu: [
        {
          label: 'New Project',
          accelerator: 'CmdOrCtrl+N',
          click: () => this.createNewProject(),
        },
        {
          label: 'Open Project...',
          accelerator: 'CmdOrCtrl+O',
          click: () => this.openProject(),
        },
        {
          label: 'Save Project',
          accelerator: 'CmdOrCtrl+S',
          click: () => this.saveProject(),
        },
        {
          label: 'Save Project As...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => this.saveProjectAs(),
        },
        { type: 'separator' },
        {
          label: 'Import Media...',
          accelerator: 'CmdOrCtrl+I',
          click: () => this.importMedia(),
        },
        {
          label: 'Export Project...',
          accelerator: 'CmdOrCtrl+E',
          click: () => this.exportProject(),
        },
        { type: 'separator' },
        {
          label: 'Settings...',
          accelerator: 'CmdOrCtrl+,',
          click: () => this.openSettings(),
        },
        { type: 'separator' },
        {
          label: 'Print...',
          accelerator: 'CmdOrCtrl+P',
          click: () => this.print(),
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: this.isMac ? 'Cmd+Q' : 'Alt+F4',
          click: () => app.quit(),
        },
      ],
    };
  }

  /**
   * Build Edit menu
   */
  private buildEditMenu(): MenuTemplate {
    return {
      label: 'Edit',
      submenu: [
        {
          label: 'Undo',
          accelerator: 'CmdOrCtrl+Z',
          role: 'undo',
        },
        {
          label: 'Redo',
          accelerator: 'CmdOrCtrl+Shift+Z',
          role: 'redo',
        },
        { type: 'separator' },
        {
          label: 'Cut',
          accelerator: 'CmdOrCtrl+X',
          role: 'cut',
        },
        {
          label: 'Copy',
          accelerator: 'CmdOrCtrl+C',
          role: 'copy',
        },
        {
          label: 'Paste',
          accelerator: 'CmdOrCtrl+V',
          role: 'paste',
        },
        {
          label: 'Select All',
          accelerator: 'CmdOrCtrl+A',
          role: 'selectAll',
        },
        { type: 'separator' },
        {
          label: 'Find...',
          accelerator: 'CmdOrCtrl+F',
          click: () => this.find(),
        },
        {
          label: 'Replace...',
          accelerator: 'CmdOrCtrl+H',
          click: () => this.replace(),
        },
      ],
    };
  }

  /**
   * Build View menu
   */
  private buildViewMenu(): MenuTemplate {
    return {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => this.mainWindow.webContents.reload(),
        },
        {
          label: 'Force Reload',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => this.mainWindow.webContents.reloadIgnoringCache(),
        },
        {
          label: 'Toggle Developer Tools',
          accelerator: this.isMac ? 'Alt+Cmd+I' : 'F12',
          click: () => this.mainWindow.webContents.toggleDevTools(),
        },
        { type: 'separator' },
        {
          label: 'Zoom In',
          accelerator: 'CmdOrCtrl+Plus',
          click: () => this.zoomIn(),
        },
        {
          label: 'Zoom Out',
          accelerator: 'CmdOrCtrl+-',
          click: () => this.zoomOut(),
        },
        {
          label: 'Reset Zoom',
          accelerator: 'CmdOrCtrl+0',
          click: () => this.resetZoom(),
        },
        { type: 'separator' },
        {
          label: 'Toggle Full Screen',
          accelerator: this.isMac ? 'Ctrl+Cmd+F' : 'F11',
          click: () => this.toggleFullScreen(),
        },
      ],
    };
  }

  /**
   * Build Window menu
   */
  private buildWindowMenu(): MenuTemplate {
    return {
      label: 'Window',
      role: 'windowMenu',
      submenu: [
        {
          label: 'Minimize',
          accelerator: 'CmdOrCtrl+M',
          role: 'minimize',
        },
        {
          label: 'Close',
          accelerator: this.isMac ? 'Cmd+W' : 'Alt+F4',
          role: 'close',
        },
        { type: 'separator' },
        {
          label: 'Bring All to Front',
          role: 'front',
        },
      ],
    };
  }

  /**
   * Build Help menu
   */
  private buildHelpMenu(): MenuTemplate {
    return {
      label: 'Help',
      role: 'help',
      submenu: [
        {
          label: 'Documentation',
          click: () => shell.openExternal('https://storycore.engine/docs'),
        },
        {
          label: 'Tutorials',
          click: () => shell.openExternal('https://storycore.engine/tutorials'),
        },
        {
          label: 'API Reference',
          click: () => shell.openExternal('https://storycore.engine/api'),
        },
        { type: 'separator' },
        {
          label: 'Report Issue',
          click: () => shell.openExternal('https://github.com/zedarvates/StoryCore-Engine/issues'),
        },
        {
          label: 'Search Issues',
          click: () => shell.openExternal('https://github.com/zedarvates/StoryCore-Engine/issues'),
        },
      ],
    };
  }

  /**
   * Build macOS Application menu
   */
  private buildAppMenu(): MenuTemplate {
    return {
      label: app.name,
      submenu: [
        {
          label: `About ${app.name}`,
          role: 'about',
        },
        { type: 'separator' },
        {
          label: 'Services',
          role: 'services',
        },
        { type: 'separator' },
        {
          label: `Hide ${app.name}`,
          accelerator: 'CmdOrCtrl+H',
          role: 'hide',
        },
        {
          label: 'Hide Others',
          accelerator: 'CmdOrCtrl+Shift+H',
          role: 'hideOthers',
        },
        {
          label: 'Show All',
          role: 'unhide',
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: 'Cmd+Q',
          click: () => app.quit(),
        },
      ],
    };
  }

  /**
   * Create new project
   */
  private createNewProject(): void {
    this.mainWindow.webContents.send('menu:new-project');
  }

  /**
   * Open project
   */
  private openProject(): void {
    this.mainWindow.webContents.send('menu:open-project');
  }

  /**
   * Save project
   */
  private saveProject(): void {
    this.mainWindow.webContents.send('menu:save-project');
  }

  /**
   * Save project as
   */
  private saveProjectAs(): void {
    this.mainWindow.webContents.send('menu:save-project-as');
  }

  /**
   * Import media
   */
  private importMedia(): void {
    this.mainWindow.webContents.send('menu:import-media');
  }

  /**
   * Export project
   */
  private exportProject(): void {
    this.mainWindow.webContents.send('menu:export-project');
  }

  /**
   * Open settings
   */
  private openSettings(): void {
    this.mainWindow.webContents.send('menu:settings');
  }

  /**
   * Print
   */
  private print(): void {
    this.mainWindow.webContents.send('menu:print');
  }

  /**
   * Find
   */
  private find(): void {
    this.mainWindow.webContents.send('menu:find');
  }

  /**
   * Replace
   */
  private replace(): void {
    this.mainWindow.webContents.send('menu:replace');
  }

  /**
   * Zoom in
   */
  private zoomIn(): void {
    const currentZoom = this.mainWindow.webContents.getZoomFactor();
    this.mainWindow.webContents.setZoomFactor(currentZoom + 0.1);
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
   * Toggle full screen
   */
  private toggleFullScreen(): void {
    const isFullScreen = this.mainWindow.isFullScreen();
    this.mainWindow.setFullScreen(!isFullScreen);
  }

  /**
   * Update menu item state
   */
  public updateMenuItem(id: string, enabled: boolean): void {
    if (!this.menu) return;

    const item = this.menu.getMenuItemById(id);
    if (item) {
      item.enabled = enabled;
    }
  }

  /**
   * Get menu template
   */
  public getTemplate(): MenuTemplate[] {
    return this.buildTemplate();
  }
}

/**
 * Create and configure application menu
 */
export function createApplicationMenu(mainWindow: BrowserWindow): ElectronMenu {
  const isMac = process.platform === 'darwin';
  const isDev = process.env.NODE_ENV === 'development';

  const menu = new ElectronMenu({
    mainWindow,
    isMac,
    isDev,
  });

  menu.build();
  return menu;
}
