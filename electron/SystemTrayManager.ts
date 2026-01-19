import { Tray, Menu, nativeImage, app } from 'electron';
import { ServerStatus, ServerState } from './ViteServerManager';

/**
 * Manages the system tray icon and menu
 * 
 * Responsibilities:
 * - Create and manage system tray icon
 * - Update icon based on server status
 * - Provide context menu with server status and controls
 * - Handle tray icon interactions
 */
export class SystemTrayManager {
  private tray: Tray | null = null;
  private currentStatus: ServerState | null = null; // null means not initialized
  private onQuitCallback?: () => void;
  private onShowCallback?: () => void;
  private onRestartCallback?: () => void;

  /**
   * Create the system tray icon
   * @returns The created Tray instance
   */
  create(): Tray {
    if (this.tray) {
      return this.tray;
    }

    // Create tray icon
    const icon = this.createIcon('stopped');
    this.tray = new Tray(icon);
    
    this.tray.setToolTip('StoryCore Creative Studio');
    
    // Set initial menu
    this.updateMenu();

    // Handle click events
    this.tray.on('click', () => {
      if (this.onShowCallback) {
        this.onShowCallback();
      }
    });

    return this.tray;
  }

  /**
   * Update the tray status based on server state
   * @param status The current server status
   */
  updateStatus(status: ServerStatus): void {
    if (!this.tray) {
      return;
    }

    const newState = status.state;
    
    // Only update if state changed
    if (newState !== this.currentStatus) {
      this.currentStatus = newState;
      
      // Update icon
      const icon = this.createIcon(newState);
      this.tray.setImage(icon);
      
      // Update tooltip
      const tooltip = this.getTooltipForStatus(status);
      this.tray.setToolTip(tooltip);
    }

    // Always update menu to reflect current status
    this.updateMenu(status);
  }

  /**
   * Set the context menu for the tray
   * @param menu The menu to set
   */
  setMenu(menu: Menu): void {
    if (this.tray) {
      this.tray.setContextMenu(menu);
    }
  }

  /**
   * Register callback for quit action
   * @param callback Function to call when quit is requested
   */
  onQuit(callback: () => void): void {
    this.onQuitCallback = callback;
  }

  /**
   * Register callback for show window action
   * @param callback Function to call when show is requested
   */
  onShow(callback: () => void): void {
    this.onShowCallback = callback;
  }

  /**
   * Register callback for restart server action
   * @param callback Function to call when restart is requested
   */
  onRestart(callback: () => void): void {
    this.onRestartCallback = callback;
  }

  /**
   * Destroy the tray icon
   */
  destroy(): void {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }

  /**
   * Get the tray instance
   */
  getTray(): Tray | null {
    return this.tray;
  }

  /**
   * Create an icon for the given server state
   * @param state The server state
   * @returns A NativeImage for the tray icon
   */
  private createIcon(state: ServerState): Electron.NativeImage {
    // Create a simple colored circle icon based on state
    // In production, you would use actual icon files
    const size = 16;
    const canvas = this.createCanvas(size);
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // Draw circle with color based on state
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2 - 2, 0, 2 * Math.PI);
      
      switch (state) {
        case 'running':
          ctx.fillStyle = '#4ade80'; // Green
          break;
        case 'starting':
          ctx.fillStyle = '#fbbf24'; // Yellow
          break;
        case 'error':
          ctx.fillStyle = '#ef4444'; // Red
          break;
        case 'stopped':
        default:
          ctx.fillStyle = '#9ca3af'; // Gray
          break;
      }
      
      ctx.fill();
      
      // Add border
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Convert canvas to native image
    const dataUrl = canvas.toDataURL();
    return nativeImage.createFromDataURL(dataUrl);
  }

  /**
   * Create a canvas element for icon generation
   * @param size Size of the canvas
   * @returns Canvas-like object
   */
  private createCanvas(size: number): any {
    // In Node.js environment, we need to use a different approach
    // For now, we'll create a simple data URL directly
    // In production, you would use the 'canvas' npm package or actual icon files
    
    // Fallback: create a minimal canvas-like object
    const canvas = {
      width: size,
      height: size,
      getContext: (type: string) => {
        if (type === '2d') {
          return {
            beginPath: () => {},
            arc: () => {},
            fill: () => {},
            stroke: () => {},
            fillStyle: '',
            strokeStyle: '',
            lineWidth: 0,
          };
        }
        return null;
      },
      toDataURL: () => {
        // Return a simple 1x1 transparent PNG as fallback
        return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      },
    };
    
    return canvas;
  }

  /**
   * Get tooltip text for the current status
   * @param status The server status
   * @returns Tooltip text
   */
  private getTooltipForStatus(status: ServerStatus): string {
    const baseTitle = 'StoryCore Creative Studio';
    
    switch (status.state) {
      case 'running':
        return `${baseTitle}\nServer running on port ${status.port}`;
      case 'starting':
        return `${baseTitle}\nServer starting...`;
      case 'error':
        return `${baseTitle}\nServer error: ${status.error?.message || 'Unknown error'}`;
      case 'stopped':
      default:
        return `${baseTitle}\nServer stopped`;
    }
  }

  /**
   * Update the context menu based on current status
   * @param status Optional server status for detailed menu items
   */
  private updateMenu(status?: ServerStatus): void {
    if (!this.tray) {
      return;
    }

    const menuItems: Electron.MenuItemConstructorOptions[] = [];

    // Title item (non-clickable)
    menuItems.push({
      label: 'StoryCore Creative Studio',
      enabled: false,
    });

    menuItems.push({ type: 'separator' });

    // Server status
    if (status) {
      const statusLabel = this.getStatusLabel(status);
      menuItems.push({
        label: statusLabel,
        enabled: false,
      });

      // Show port if running
      if (status.state === 'running' && status.port) {
        menuItems.push({
          label: `Port: ${status.port}`,
          enabled: false,
        });
      }

      // Show uptime if running
      if (status.state === 'running' && status.uptime !== undefined) {
        const uptimeStr = this.formatUptime(status.uptime);
        menuItems.push({
          label: `Uptime: ${uptimeStr}`,
          enabled: false,
        });
      }

      // Show error if in error state
      if (status.state === 'error' && status.error) {
        menuItems.push({
          label: `Error: ${status.error.message}`,
          enabled: false,
        });
      }

      menuItems.push({ type: 'separator' });
    }

    // Show window action
    menuItems.push({
      label: 'Show Window',
      click: () => {
        if (this.onShowCallback) {
          this.onShowCallback();
        }
      },
    });

    // Restart server action (only if running or error)
    if (status && (status.state === 'running' || status.state === 'error')) {
      menuItems.push({
        label: 'Restart Server',
        click: () => {
          if (this.onRestartCallback) {
            this.onRestartCallback();
          }
        },
      });
    }

    menuItems.push({ type: 'separator' });

    // Quit action
    menuItems.push({
      label: 'Quit',
      click: () => {
        if (this.onQuitCallback) {
          this.onQuitCallback();
        } else {
          app.quit();
        }
      },
    });

    const menu = Menu.buildFromTemplate(menuItems);
    this.tray.setContextMenu(menu);
  }

  /**
   * Get a human-readable status label
   * @param status The server status
   * @returns Status label
   */
  private getStatusLabel(status: ServerStatus): string {
    switch (status.state) {
      case 'running':
        return 'Status: ✓ Running';
      case 'starting':
        return 'Status: ⟳ Starting...';
      case 'error':
        return 'Status: ✗ Error';
      case 'stopped':
      default:
        return 'Status: ○ Stopped';
    }
  }

  /**
   * Format uptime in milliseconds to human-readable string
   * @param uptime Uptime in milliseconds
   * @returns Formatted uptime string
   */
  private formatUptime(uptime: number): string {
    const seconds = Math.floor(uptime / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}
