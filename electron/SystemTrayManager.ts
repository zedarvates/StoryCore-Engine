import { Tray, Menu, nativeImage, app } from 'electron';
import { ServerStatus, ServerState } from './ViteServerManager';

/**
 * Manages the system tray icon and menu
 * 
 * Responsibilities:
 * - Create and manage system tray icon
 * - Update icon based on server status and voice state
 * - Provide context menu with server status and controls
 * - Handle tray icon interactions
 * - Support voice activation with microphone icon and glow effect
 */
export class SystemTrayManager {
  private tray: Tray | null = null;
  private currentStatus: ServerState | null = null; // null means not initialized
  private onQuitCallback?: () => void;
  private onShowCallback?: () => void;
  private onRestartCallback?: () => void;
  private isListening: boolean = false; // Voice listening state
  private currentToolTip: string = 'StoryCore Creative Studio';

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
    this.currentToolTip = 'StoryCore Creative Studio';
    
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
      this.currentToolTip = tooltip;
    }

    // Always update menu to reflect current status
    this.updateMenu(status);
  }

  /**
   * Update voice listening state for glow effect
   * @param isListening Whether voice recognition is active
   */
  updateVoiceState(isListening: boolean): void {
    this.isListening = isListening;
    
    if (!this.tray) {
      return;
    }

    // Update icon with glow effect
    const icon = this.createIcon(this.currentStatus || 'stopped');
    this.tray.setImage(icon);

    // Update tooltip to show voice state
    const currentTooltip = this.currentToolTip;
    if (isListening) {
      this.tray.setToolTip(currentTooltip + '\n🎤 Voice listening active (Alt+Space)');
    }
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
   * Includes microphone icon with glow effect when voice is listening
   * @param state The server state
   * @returns A NativeImage for the tray icon
   */
  private createIcon(state: ServerState): Electron.NativeImage {
    // Icon size is 16px
    
    // Create SVG for microphone icon with glow
    const svg = this.createMicrophoneSVG(state, this.isListening);
    const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
    
    return nativeImage.createFromDataURL(dataUrl);
  }

  /**
   * Create SVG for microphone icon
   * @param state Server state
   * @param isListening Whether voice is listening
   * @returns SVG string
   */
  private createMicrophoneSVG(state: ServerState, isListening: boolean): string {
    // Determine base color based on state
    let baseColor = '#9ca3af'; // Gray (stopped)
    if (isListening) {
      baseColor = '#a855f7'; // Purple (listening)
    } else {
      switch (state) {
        case 'running':
          baseColor = '#4ade80'; // Green
          break;
        case 'starting':
          baseColor = '#fbbf24'; // Yellow
          break;
        case 'error':
          baseColor = '#ef4444'; // Red
          break;
      }
    }

    // Glow filter SVG
    const glowFilter = isListening 
      ? `<defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>`
      : '';

    // Animated glow circles when listening
    const glowCircles = isListening
      ? `<circle cx="8" cy="8" r="12" fill="none" stroke="${baseColor}" stroke-width="1" opacity="0.3">
           <animate attributeName="r" values="10;14;10" dur="1.5s" repeatCount="indefinite"/>
           <animate attributeName="opacity" values="0.4;0.1;0.4" dur="1.5s" repeatCount="indefinite"/>
         </circle>
         <circle cx="8" cy="8" r="16" fill="none" stroke="${baseColor}" stroke-width="0.5" opacity="0.2">
           <animate attributeName="r" values="14;20;14" dur="2s" repeatCount="indefinite"/>
           <animate attributeName="opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite"/>
         </circle>`
      : '';

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${isListening ? 32 : 16}" height="${isListening ? 32 : 16}" viewBox="0 0 16 16">
        ${glowFilter}
        ${glowCircles}
        <g filter="${isListening ? 'url(#glow)' : ''}">
          <!-- Microphone body -->
          <rect x="6" y="3" width="4" height="6" rx="2" fill="${baseColor}"/>
          <!-- Microphone stand arc -->
          <path d="M3 8 Q3 12 8 12 Q13 12 13 8" fill="none" stroke="${baseColor}" stroke-width="1.5" stroke-linecap="round"/>
          <!-- Microphone stand -->
          <line x1="8" y1="12" x2="8" y2="14" stroke="${baseColor}" stroke-width="1.5" stroke-linecap="round"/>
          <!-- Base -->
          <line x1="5" y1="14" x2="11" y2="14" stroke="${baseColor}" stroke-width="1.5" stroke-linecap="round"/>
        </g>
      </svg>
    `;
    
    return svg;
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
