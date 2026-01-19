/**
 * Rollback Manager - Handles rollback operations and version history
 *
 * Detects installation failures, manages backup restoration, maintains version history,
 * and provides automatic and manual rollback capabilities.
 */

import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface BackupRecord {
  id: string;
  path: string;
  fromVersion: string;
  toVersion: string;
  timestamp: Date;
  size: number;
  hash?: string;
}

export interface VersionHistoryEntry {
  version: string;
  installedAt: Date;
  backupId?: string;
  successful: boolean;
}

export interface RollbackResult {
  success: boolean;
  error?: string;
  rolledBackToVersion?: string;
}

export class RollbackManager {
  private backupDir: string;
  private historyFile: string;
  private backups: BackupRecord[] = [];
  private versionHistory: VersionHistoryEntry[] = [];

  constructor() {
    this.backupDir = path.join(app.getPath('userData'), 'backups');
    this.historyFile = path.join(app.getPath('userData'), 'version-history.json');

    this.ensureDirectories();
    this.loadBackupRecords();
    this.loadVersionHistory();
  }

  /**
   * Record a backup that was created during update
   */
  async recordBackup(backupPath: string, fromVersion: string, toVersion: string): Promise<string> {
    const backupId = crypto.randomUUID();
    const timestamp = new Date();

    // Calculate backup size and hash
    const { size, hash } = await this.calculateBackupInfo(backupPath);

    const record: BackupRecord = {
      id: backupId,
      path: backupPath,
      fromVersion,
      toVersion,
      timestamp,
      size,
      hash
    };

    this.backups.push(record);
    await this.saveBackupRecords();

    console.log(`Recorded backup: ${backupId} (${fromVersion} -> ${toVersion})`);
    return backupId;
  }

  /**
   * Record a successful version installation
   */
  async recordSuccessfulInstallation(version: string, backupId?: string): Promise<void> {
    const entry: VersionHistoryEntry = {
      version,
      installedAt: new Date(),
      backupId,
      successful: true
    };

    this.versionHistory.push(entry);
    await this.saveVersionHistory();

    console.log(`Recorded successful installation of version ${version}`);
  }

  /**
   * Record a failed version installation
   */
  async recordFailedInstallation(version: string): Promise<void> {
    const entry: VersionHistoryEntry = {
      version,
      installedAt: new Date(),
      successful: false
    };

    this.versionHistory.push(entry);
    await this.saveVersionHistory();

    console.log(`Recorded failed installation of version ${version}`);
  }

  /**
   * Rollback to a specific version
   */
  async rollbackToVersion(targetVersion: string): Promise<RollbackResult> {
    try {
      console.log(`Attempting rollback to version ${targetVersion}`);

      // Find backup for the target version
      const backupRecord = this.findBackupForVersion(targetVersion);
      if (!backupRecord) {
        return {
          success: false,
          error: `No backup found for version ${targetVersion}`
        };
      }

      // Verify backup integrity
      const isValid = await this.verifyBackup(backupRecord);
      if (!isValid) {
        return {
          success: false,
          error: `Backup for version ${targetVersion} is corrupted or incomplete`
        };
      }

      // Perform the rollback
      await this.performRollback(backupRecord);

      // Record the rollback
      await this.recordSuccessfulInstallation(targetVersion, backupRecord.id);

      console.log(`Successfully rolled back to version ${targetVersion}`);
      return {
        success: true,
        rolledBackToVersion: targetVersion
      };

    } catch (error) {
      console.error('Rollback failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown rollback error'
      };
    }
  }

  /**
   * Rollback to the last known good version
   */
  async rollbackToLastGoodVersion(): Promise<RollbackResult> {
    // Find the last successful installation before the current one
    const currentVersion = app.getVersion();
    const successfulInstallations = this.versionHistory
      .filter(entry => entry.successful && entry.version !== currentVersion)
      .sort((a, b) => b.installedAt.getTime() - a.installedAt.getTime());

    if (successfulInstallations.length === 0) {
      return {
        success: false,
        error: 'No previous successful installation found to rollback to'
      };
    }

    const targetVersion = successfulInstallations[0].version;
    return this.rollbackToVersion(targetVersion);
  }

  /**
   * Detect if the current installation is in a failed state
   */
  async detectInstallationFailure(): Promise<boolean> {
    try {
      // Check if critical files are accessible and valid
      const criticalFiles = ['package.json', 'main.js', 'preload.js'];
      const appPath = app.getAppPath();

      for (const file of criticalFiles) {
        const filePath = path.join(appPath, file);
        await fs.promises.access(filePath, fs.constants.R_OK);

        // Basic validation for package.json
        if (file === 'package.json') {
          const content = await fs.promises.readFile(filePath, 'utf-8');
          JSON.parse(content); // Will throw if invalid JSON
        }
      }

      // Check if the version in package.json matches expected
      const packageJsonPath = path.join(appPath, 'package.json');
      const packageJson = JSON.parse(await fs.promises.readFile(packageJsonPath, 'utf-8'));

      if (!packageJson.version) {
        console.warn('No version found in package.json');
        return true;
      }

      // Check if there were recent failures
      const recentFailures = this.versionHistory
        .filter(entry => !entry.successful)
        .filter(entry => {
          const hoursSinceFailure = (Date.now() - entry.installedAt.getTime()) / (1000 * 60 * 60);
          return hoursSinceFailure < 1; // Within last hour
        });

      if (recentFailures.length > 0) {
        console.warn('Recent installation failures detected');
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error detecting installation failure:', error);
      return true;
    }
  }

  /**
   * Get version history
   */
  getVersionHistory(): VersionHistoryEntry[] {
    return [...this.versionHistory].sort((a, b) => b.installedAt.getTime() - a.installedAt.getTime());
  }

  /**
   * Get available backups
   */
  getAvailableBackups(): BackupRecord[] {
    return [...this.backups].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Clean up old backups (keep only the most recent ones)
   */
  async cleanupOldBackups(keepCount = 5): Promise<void> {
    if (this.backups.length <= keepCount) {
      return;
    }

    // Sort by timestamp, keep most recent
    const sortedBackups = [...this.backups].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    const toDelete = sortedBackups.slice(keepCount);

    for (const backup of toDelete) {
      try {
        await fs.promises.rm(backup.path, { recursive: true, force: true });
        console.log(`Cleaned up old backup: ${backup.id}`);
      } catch (error) {
        console.warn(`Failed to cleanup backup ${backup.id}:`, error);
      }
    }

    // Update records
    this.backups = sortedBackups.slice(0, keepCount);
    await this.saveBackupRecords();
  }

  /**
   * Find backup record for a specific version
   */
  private findBackupForVersion(version: string): BackupRecord | null {
    // Look for backup that would restore to this version
    return this.backups.find(backup => backup.fromVersion === version) || null;
  }

  /**
   * Perform the actual rollback
   */
  private async performRollback(backupRecord: BackupRecord): Promise<void> {
    const appPath = app.getAppPath();
    const tempDir = path.join(require('os').tmpdir(), `rollback-${crypto.randomUUID()}`);

    try {
      // Create temp directory for current state
      await fs.promises.mkdir(tempDir, { recursive: true });

      // Backup current critical files
      const criticalFiles = ['main.js', 'preload.js', 'package.json'];
      for (const file of criticalFiles) {
        const source = path.join(appPath, file);
        const dest = path.join(tempDir, `${file}.current`);
        try {
          await fs.promises.copyFile(source, dest);
        } catch {
          // File might not exist
        }
      }

      // Restore from backup
      await this.restoreFromBackup(backupRecord.path, appPath);

      console.log(`Rolled back to version ${backupRecord.fromVersion} from backup ${backupRecord.id}`);

    } catch (error) {
      // Attempt to restore critical files
      console.error('Rollback failed, attempting to restore critical files...');
      const criticalFiles = ['main.js', 'preload.js', 'package.json'];
      for (const file of criticalFiles) {
        const source = path.join(tempDir, `${file}.current`);
        const dest = path.join(appPath, file);
        try {
          await fs.promises.copyFile(source, dest);
        } catch (restoreError) {
          console.error(`Failed to restore ${file}:`, restoreError);
        }
      }
      throw error;
    } finally {
      // Clean up temp directory
      try {
        await fs.promises.rm(tempDir, { recursive: true, force: true });
      } catch {}
    }
  }

  /**
   * Restore files from backup
   */
  private async restoreFromBackup(backupPath: string, targetPath: string): Promise<void> {
    const items = await fs.promises.readdir(backupPath);

    for (const item of items) {
      const sourcePath = path.join(backupPath, item);
      const destPath = path.join(targetPath, item);

      const stat = await fs.promises.stat(sourcePath);

      if (stat.isDirectory()) {
        await fs.promises.mkdir(destPath, { recursive: true });
        await this.restoreFromBackup(sourcePath, destPath);
      } else {
        await fs.promises.copyFile(sourcePath, destPath);
      }
    }
  }

  /**
   * Verify backup integrity
   */
  private async verifyBackup(backupRecord: BackupRecord): Promise<boolean> {
    try {
      // Check if backup directory exists
      await fs.promises.access(backupRecord.path, fs.constants.R_OK);

      // Check if critical files exist
      const criticalFiles = ['package.json', 'main.js'];
      for (const file of criticalFiles) {
        await fs.promises.access(path.join(backupRecord.path, file), fs.constants.R_OK);
      }

      // Verify hash if available
      if (backupRecord.hash) {
        const { hash: currentHash } = await this.calculateBackupInfo(backupRecord.path);
        if (currentHash !== backupRecord.hash) {
          console.warn(`Backup ${backupRecord.id} hash mismatch`);
          return false;
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Calculate backup size and hash
   */
  private async calculateBackupInfo(backupPath: string): Promise<{ size: number; hash: string }> {
    let totalSize = 0;
    const hash = crypto.createHash('sha256');

    async function processDirectory(dirPath: string): Promise<void> {
      const items = await fs.promises.readdir(dirPath);

      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stat = await fs.promises.stat(itemPath);

        if (stat.isDirectory()) {
          await processDirectory(itemPath);
        } else {
          totalSize += stat.size;
          const stream = fs.createReadStream(itemPath);
          await new Promise<void>((resolve, reject) => {
            stream.on('data', (chunk) => hash.update(chunk));
            stream.on('end', () => resolve());
            stream.on('error', reject);
          });
        }
      }
    }

    await processDirectory(backupPath);
    return { size: totalSize, hash: hash.digest('hex') };
  }

  /**
   * Load backup records from disk
   */
  private async loadBackupRecords(): Promise<void> {
    try {
      const data = await fs.promises.readFile(this.historyFile, 'utf-8');
      const parsed = JSON.parse(data);
      this.backups = (parsed.backups || []).map((record: any) => ({
        ...record,
        timestamp: new Date(record.timestamp)
      }));
    } catch {
      this.backups = [];
    }
  }

  /**
   * Save backup records to disk
   */
  private async saveBackupRecords(): Promise<void> {
    const data = {
      backups: this.backups,
      versionHistory: this.versionHistory.map(entry => ({
        ...entry,
        installedAt: entry.installedAt.toISOString()
      }))
    };

    await fs.promises.writeFile(this.historyFile, JSON.stringify(data, null, 2));
  }

  /**
   * Load version history from disk
   */
  private async loadVersionHistory(): Promise<void> {
    try {
      const data = await fs.promises.readFile(this.historyFile, 'utf-8');
      const parsed = JSON.parse(data);
      this.versionHistory = (parsed.versionHistory || []).map((entry: any) => ({
        ...entry,
        installedAt: new Date(entry.installedAt)
      }));
    } catch {
      this.versionHistory = [];
    }
  }

  /**
   * Save version history to disk
   */
  private async saveVersionHistory(): Promise<void> {
    await this.saveBackupRecords(); // Same file
  }

  /**
   * Ensure required directories exist
   */
  private ensureDirectories(): void {
    [this.backupDir].forEach(dir => {
      try {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      } catch (error) {
        console.error(`Failed to create directory ${dir}:`, error);
      }
    });
  }
}