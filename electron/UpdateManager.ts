/**
 * Update Manager - Main orchestrator for the update system
 *
 * Handles the overall update process, user notifications, IPC communication,
 * error handling, retry logic, and rollback preparation.
 */

import { BrowserWindow, dialog, app, Notification } from 'electron';
import { UpdateChecker } from './UpdateChecker';
import { UpdateDownloader } from './UpdateDownloader';
import { UpdateInstaller } from './UpdateInstaller';
import { RollbackManager } from './RollbackManager';

export interface UpdateInfo {
  version: string;
  releaseNotes?: string;
  downloadUrl: string;
  fileSize?: number;
  releaseDate: Date;
  mandatory?: boolean;
}

export interface UpdateStatus {
  state: 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'installing' | 'error';
  progress?: number;
  message?: string;
  error?: string;
  updateInfo?: UpdateInfo;
}

export class UpdateManager {
  private updateChecker: UpdateChecker;
  private updateDownloader: UpdateDownloader;
  private updateInstaller: UpdateInstaller;
  private rollbackManager: RollbackManager;
  private mainWindow: BrowserWindow | null = null;
  private currentStatus: UpdateStatus = { state: 'idle' };
  private checkInterval: NodeJS.Timeout | null = null;
  private retryCount = 0;
  private maxRetries = 3;
  private isUpdating = false;
  private downloadedPackagePath: string | null = null;

  constructor(updateUrl: string, checkIntervalHours = 4) {
    this.updateChecker = new UpdateChecker(updateUrl);
    this.updateDownloader = new UpdateDownloader();
    this.rollbackManager = new RollbackManager();
    this.updateInstaller = new UpdateInstaller(this.rollbackManager);

    // Set application icon for Windows
    this.setApplicationIcon();

    // Set up periodic checks
    this.setupPeriodicChecks(checkIntervalHours * 60 * 60 * 1000); // Convert hours to milliseconds
  }

  /**
   * Set application icon for Windows
   */
  private setApplicationIcon(): void {
    if (process.platform === 'win32') {
      try {
        const iconPath = app.isPackaged
          ? `${process.resourcesPath}/app-icon.ico`
          : `${__dirname}/../../resources/app-icon.ico`;
        
        if (require('fs').existsSync(iconPath)) {
          console.log('Application icon found:', iconPath);
        }
      } catch (error) {
        console.warn('Could not set application icon:', error);
      }
    }
  }

  /**
   * Initialize the update manager with the main window
   */
  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  /**
   * Start the update system - check for updates on startup
   */
  async initialize(): Promise<void> {
    try {
      const isFailed = await this.rollbackManager.detectInstallationFailure();
      if (isFailed) {
        console.warn('Installation failure detected on startup, attempting automatic recovery...');
        const rollbackResult = await this.rollbackManager.rollbackToLastGoodVersion();
        if (rollbackResult.success) {
          console.log(`Automatically rolled back to version ${rollbackResult.rolledBackToVersion}`);
          this.showNotification('Automatic Recovery', `Application was recovered to version ${rollbackResult.rolledBackToVersion}`);
        } else {
          console.error('Automatic rollback failed:', rollbackResult.error);
          this.showNotification('Recovery Failed', 'Application may be in an unstable state. Please reinstall.');
        }
      }
      await this.checkForUpdates();
    } catch (error) {
      console.error('Failed to initialize update system:', error);
      this.updateStatus({
        state: 'error',
        error: error instanceof Error ? error.message : 'Unknown error during initialization'
      });
    }
  }

  /**
   * Set up periodic update checks
   */
  private setupPeriodicChecks(intervalMs: number): void {
    this.checkInterval = setInterval(async () => {
      if (!this.isUpdating) {
        try {
          await this.checkForUpdates();
        } catch (error) {
          console.error('Periodic update check failed:', error);
        }
      }
    }, intervalMs);
  }

  /**
   * Check for available updates
   */
  async checkForUpdates(): Promise<void> {
    if (this.isUpdating) {
      return;
    }

    this.updateStatus({ state: 'checking', message: 'Checking for updates...' });

    try {
      const updateInfo = await this.updateChecker.checkForUpdates();
      if (updateInfo) {
        this.updateStatus({
          state: 'available',
          message: `Update ${updateInfo.version} is available`,
          updateInfo
        });
        this.notifyUserOfUpdate(updateInfo);
      } else {
        this.updateStatus({ state: 'idle', message: 'No updates available' });
      }
    } catch (error) {
      console.error('Update check failed:', error);
      this.updateStatus({
        state: 'error',
        error: error instanceof Error ? error.message : 'Failed to check for updates'
      });
    }
  }

  /**
   * Download the available update
   */
  async downloadUpdate(): Promise<void> {
    if (this.currentStatus.state !== 'available' || !this.currentStatus.updateInfo) {
      throw new Error('No update available to download');
    }

    this.isUpdating = true;
    const updateInfo = this.currentStatus.updateInfo;

    try {
      this.updateStatus({ state: 'downloading', message: 'Downloading update...', progress: 0 });
      this.downloadedPackagePath = await this.updateDownloader.download(
        updateInfo.downloadUrl,
        (progress: number) => {
          this.updateStatus({
            state: 'downloading',
            message: `Downloading update... ${Math.round(progress * 100)}%`,
            progress
          });
        }
      );

      this.updateStatus({
        state: 'downloaded',
        message: 'Update downloaded successfully',
        progress: 1
      });
      await this.promptInstall(updateInfo);
    } catch (error) {
      console.error('Download failed:', error);
      this.isUpdating = false;
      this.updateStatus({
        state: 'error',
        error: error instanceof Error ? error.message : 'Failed to download update'
      });

      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        console.log(`Retrying download (attempt ${this.retryCount}/${this.maxRetries})`);
        setTimeout(() => this.downloadUpdate(), 5000 * this.retryCount);
      }
    }
  }

  /**
   * Install the downloaded update
   */
  async installUpdate(): Promise<void> {
    if (this.currentStatus.state !== 'downloaded') {
      throw new Error('No update ready to install');
    }

    try {
      this.updateStatus({ state: 'installing', message: 'Installing update...' });
      await this.performInstallation();
      this.updateStatus({ state: 'idle', message: 'Update installed successfully' });
      this.isUpdating = false;
      this.retryCount = 0;
      this.showNotification('Update Complete', 'StoryCore has been updated successfully!');
    } catch (error) {
      console.error('Installation failed:', error);
      this.isUpdating = false;
      if (this.currentStatus.updateInfo) {
        await this.rollbackManager.recordFailedInstallation(this.currentStatus.updateInfo.version);
      }
      this.updateStatus({
        state: 'error',
        error: error instanceof Error ? error.message : 'Failed to install update'
      });
      await this.offerRollback();
    }
  }

  /**
   * Cancel the current update operation
   */
  cancelUpdate(): void {
    if (this.isUpdating) {
      this.updateDownloader.cancel();
      this.isUpdating = false;
      this.updateStatus({ state: 'idle', message: 'Update cancelled' });
    }
  }

  /**
   * Get current update status
   */
  getStatus(): UpdateStatus {
    return { ...this.currentStatus };
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.updateDownloader.cancel();
  }

  /**
   * Update the current status and notify renderer process
   */
  private updateStatus(status: UpdateStatus): void {
    this.currentStatus = { ...status };
    this.notifyRenderer('update-status-changed', this.currentStatus);
  }

  /**
   * Notify the renderer process of an event
   */
  private notifyRenderer(event: string, data: any): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(event, data);
    }
  }

  /**
   * Show a system notification
   */
  private showNotification(title: string, body: string): void {
    if (Notification.isSupported()) {
      const notification = new Notification({
        title,
        body,
        icon: 'path/to/icon.png'
      });
      notification.show();
    }
  }

  /**
   * Notify user of available update
   */
  private async notifyUserOfUpdate(updateInfo: UpdateInfo): Promise<void> {
    const choice = await dialog.showMessageBox(this.mainWindow!, {
      type: 'info',
      title: 'Update Available',
      message: `StoryCore ${updateInfo.version} is available`,
      detail: updateInfo.releaseNotes || 'A new version of StoryCore is ready to download.',
      buttons: ['Download Now', 'Later'],
      defaultId: 0,
      cancelId: 1
    });

    if (choice.response === 0) {
      this.downloadUpdate();
    }
  }

  /**
   * Prompt user to install the downloaded update
   */
  private async promptInstall(_updateInfo: UpdateInfo): Promise<void> {
    const choice = await dialog.showMessageBox(this.mainWindow!, {
      type: 'info',
      title: 'Update Downloaded',
      message: 'Update downloaded successfully',
      detail: 'Would you like to install the update now? The application will restart.',
      buttons: ['Install Now', 'Install Later'],
      defaultId: 0,
      cancelId: 1
    });

    if (choice.response === 0) {
      this.installUpdate();
    }
  }

  /**
   * Offer rollback option after failed installation
   */
  private async offerRollback(): Promise<void> {
    const choice = await dialog.showMessageBox(this.mainWindow!, {
      type: 'error',
      title: 'Update Failed',
      message: 'Failed to install update',
      detail: 'Would you like to rollback to the previous version?',
      buttons: ['Rollback', 'Cancel'],
      defaultId: 0,
      cancelId: 1
    });

    if (choice.response === 0) {
      this.updateStatus({ state: 'installing', message: 'Rolling back to previous version...' });
      const rollbackResult = await this.rollbackManager.rollbackToLastGoodVersion();
      if (rollbackResult.success) {
        this.showNotification('Rollback Complete', `Successfully rolled back to version ${rollbackResult.rolledBackToVersion}`);
        this.updateStatus({ state: 'idle', message: 'Rollback completed successfully' });
        setTimeout(() => {
          app.relaunch();
          app.exit(0);
        }, 2000);
      } else {
        this.updateStatus({
          state: 'error',
          error: rollbackResult.error || 'Rollback failed'
        });
        this.showNotification('Rollback Failed', rollbackResult.error || 'Failed to rollback to previous version');
      }
    }
  }

  /**
   * Perform the actual installation
   */
  private async performInstallation(): Promise<void> {
    if (!this.downloadedPackagePath || !this.currentStatus.updateInfo) {
      throw new Error('No package available for installation');
    }

    const result = await this.updateInstaller.installUpdate(
      this.downloadedPackagePath,
      this.currentStatus.updateInfo.version,
      (progress, message) => {
        this.updateStatus({
          state: 'installing',
          message,
          progress
        });
      }
    );

    if (!result.success) {
      throw new Error(result.error || 'Installation failed');
    }

    await this.rollbackManager.recordSuccessfulInstallation(result.version!, result.backupPath ? await this.rollbackManager.recordBackup(result.backupPath, app.getVersion(), result.version!) : undefined);
    await this.updateInstaller.restartApplication();
  }
}