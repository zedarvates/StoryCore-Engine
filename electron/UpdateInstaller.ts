/**
 * Update Installer - Handles the installation of updates with backup and rollback support
 *
 * Performs silent installation of downloaded updates, creates backups for rollback,
 * manages application restart, and coordinates with the RollbackManager for error recovery.
 */

import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { execSync } from 'child_process';
import { RollbackManager } from './RollbackManager';

export interface InstallationResult {
  success: boolean;
  error?: string;
  backupPath?: string;
  version?: string;
}

export interface HealthCheckResult {
  healthy: boolean;
  issues: string[];
}

export class UpdateInstaller {
  private rollbackManager: RollbackManager;
  private appPath: string;
  private backupDir: string;
  private tempDir: string;

  constructor(rollbackManager: RollbackManager) {
    this.rollbackManager = rollbackManager;
    this.appPath = app.getAppPath();
    this.backupDir = path.join(app.getPath('userData'), 'backups');
    this.tempDir = path.join(os.tmpdir(), 'storycore-install');

    // Ensure directories exist
    this.ensureDirectories();
  }

  /**
   * Install an update from a downloaded package
   */
  async installUpdate(
    packagePath: string,
    version: string,
    onProgress?: (progress: number, message: string) => void
  ): Promise<InstallationResult> {
    try {
      console.log(`Starting installation of version ${version} from ${packagePath}`);

      // Perform pre-installation health check
      const healthCheck = await this.performHealthCheck();
      if (!healthCheck.healthy) {
        throw new Error(`Pre-installation health check failed: ${healthCheck.issues.join(', ')}`);
      }

      // Create backup
      onProgress?.(0.1, 'Creating backup...');
      const backupPath = await this.createBackup(version);
      await this.rollbackManager.recordBackup(backupPath, app.getVersion(), version);

      // Extract and validate update package
      onProgress?.(0.3, 'Extracting update package...');
      const extractionPath = await this.extractPackage(packagePath);

      // Validate extracted files
      onProgress?.(0.5, 'Validating update files...');
      await this.validateUpdateFiles(extractionPath);

      // Perform silent installation
      onProgress?.(0.7, 'Installing update...');
      await this.performInstallation(extractionPath);

      // Post-installation health check
      onProgress?.(0.9, 'Running health checks...');
      const postHealthCheck = await this.performPostInstallHealthCheck();
      if (!postHealthCheck.healthy) {
        throw new Error(`Post-installation health check failed: ${postHealthCheck.issues.join(', ')}`);
      }

      // Clean up temporary files
      await this.cleanupTempFiles(extractionPath, packagePath);

      console.log(`Installation of version ${version} completed successfully`);
      return {
        success: true,
        backupPath,
        version
      };

    } catch (error) {
      console.error('Installation failed:', error);

      // Attempt automatic rollback on failure
      try {
        await this.rollbackManager.rollbackToVersion(app.getVersion());
      } catch (rollbackError) {
        console.error('Automatic rollback failed:', rollbackError);
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown installation error',
        version
      };
    }
  }

  /**
   * Create a backup of the current application
   */
  private async createBackup(version: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `backup-${app.getVersion()}-to-${version}-${timestamp}`;
    const backupPath = path.join(this.backupDir, backupName);

    console.log(`Creating backup: ${backupPath}`);

    // Create backup directory
    await fs.promises.mkdir(backupPath, { recursive: true });

    // Copy app files (excluding certain directories)
    const excludeDirs = ['node_modules', '.git', 'backups', 'temp'];
    await this.copyDirectory(this.appPath, backupPath, excludeDirs);

    return backupPath;
  }

  /**
   * Extract the update package
   */
  private async extractPackage(packagePath: string): Promise<string> {
    const extractionPath = path.join(this.tempDir, `extracted-${crypto.randomUUID()}`);
    await fs.promises.mkdir(extractionPath, { recursive: true });

    // Determine package type and extract accordingly
    const ext = path.extname(packagePath).toLowerCase();

    if (ext === '.zip') {
      await this.extractZip(packagePath, extractionPath);
    } else if (ext === '.tar' || ext === '.gz') {
      await this.extractTar(packagePath, extractionPath);
    } else {
      throw new Error(`Unsupported package format: ${ext}`);
    }

    return extractionPath;
  }

  /**
   * Validate the extracted update files
   */
  private async validateUpdateFiles(extractionPath: string): Promise<void> {
    // Check for required files
    const requiredFiles = ['package.json', 'main.js', 'preload.js'];
    const extractedFiles = await fs.promises.readdir(extractionPath);

    for (const required of requiredFiles) {
      if (!extractedFiles.includes(required)) {
        // Check in subdirectories (in case of nested structure)
        let found = false;
        for (const file of extractedFiles) {
          const filePath = path.join(extractionPath, file);
          const stat = await fs.promises.stat(filePath);
          if (stat.isDirectory()) {
            try {
              await fs.promises.access(path.join(filePath, required));
              found = true;
              break;
            } catch {}
          }
        }
        if (!found) {
          throw new Error(`Required file not found: ${required}`);
        }
      }
    }

    // Validate package.json
    try {
      const packageJsonPath = path.join(extractionPath, 'package.json');
      const packageJson = JSON.parse(await fs.promises.readFile(packageJsonPath, 'utf-8'));

      if (!packageJson.version) {
        throw new Error('Invalid package.json: missing version');
      }

      if (!packageJson.main) {
        throw new Error('Invalid package.json: missing main entry point');
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('Invalid package.json')) {
        throw error;
      }
      throw new Error(`Failed to validate package.json: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Perform the actual installation by replacing files
   */
  private async performInstallation(extractionPath: string): Promise<void> {
    // Find the actual app directory (might be nested)
    const appDir = await this.findAppDirectory(extractionPath);

    // Create a temporary backup of critical files for immediate rollback
    const criticalBackup = path.join(this.tempDir, `critical-backup-${crypto.randomUUID()}`);
    await fs.promises.mkdir(criticalBackup, { recursive: true });

    const criticalFiles = ['main.js', 'preload.js', 'package.json'];
    for (const file of criticalFiles) {
      const source = path.join(this.appPath, file);
      const dest = path.join(criticalBackup, file);
      try {
        await fs.promises.copyFile(source, dest);
      } catch (error) {
        console.warn(`Could not backup critical file ${file}:`, error);
      }
    }

    try {
      // Replace files
      await this.replaceFiles(appDir, this.appPath);
    } catch (error) {
      // Restore critical files immediately
      console.error('Installation failed, restoring critical files...');
      for (const file of criticalFiles) {
        const source = path.join(criticalBackup, file);
        const dest = path.join(this.appPath, file);
        try {
          await fs.promises.copyFile(source, dest);
        } catch (restoreError) {
          console.error(`Failed to restore critical file ${file}:`, restoreError);
        }
      }
      throw error;
    } finally {
      // Clean up critical backup
      try {
        await fs.promises.rm(criticalBackup, { recursive: true, force: true });
      } catch {}
    }
  }

  /**
   * Restart the application
   */
  async restartApplication(): Promise<void> {
    console.log('Restarting application...');

    // Give some time for any pending operations
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Relaunch the application
    app.relaunch();
    app.exit(0);
  }

  /**
   * Perform pre-installation health check
   */
  private async performHealthCheck(): Promise<HealthCheckResult> {
    const issues: string[] = [];

    // Check if app path is accessible
    try {
      await fs.promises.access(this.appPath, fs.constants.R_OK);
    } catch {
      issues.push('Application directory not accessible');
    }

    // Check critical files exist
    const criticalFiles = ['package.json', 'main.js'];
    for (const file of criticalFiles) {
      try {
        await fs.promises.access(path.join(this.appPath, file), fs.constants.R_OK);
      } catch {
        issues.push(`Critical file missing: ${file}`);
      }
    }

    // Note: Disk space check could be added here if needed
    // For now, we assume sufficient space is available

    return {
      healthy: issues.length === 0,
      issues
    };
  }

  /**
   * Perform post-installation health check
   */
  private async performPostInstallHealthCheck(): Promise<HealthCheckResult> {
    return this.performHealthCheck(); // Same checks apply
  }

  /**
   * Find the actual app directory in extracted package (handles nested structures)
   */
  private async findAppDirectory(extractionPath: string): Promise<string> {
    // Check if extraction path itself is the app directory
    if (await this.isAppDirectory(extractionPath)) {
      return extractionPath;
    }

    // Look for app directory in subdirectories
    const items = await fs.promises.readdir(extractionPath);
    for (const item of items) {
      const itemPath = path.join(extractionPath, item);
      const stat = await fs.promises.stat(itemPath);
      if (stat.isDirectory() && await this.isAppDirectory(itemPath)) {
        return itemPath;
      }
    }

    // If no clear app directory found, assume the extraction path
    console.warn('Could not identify app directory structure, using extraction path');
    return extractionPath;
  }

  /**
   * Check if a directory contains app files
   */
  private async isAppDirectory(dirPath: string): Promise<boolean> {
    try {
      await fs.promises.access(path.join(dirPath, 'package.json'));
      await fs.promises.access(path.join(dirPath, 'main.js'));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Recursively copy a directory with exclusions
   */
  private async copyDirectory(source: string, destination: string, excludeDirs: string[] = []): Promise<void> {
    const items = await fs.promises.readdir(source);

    for (const item of items) {
      if (excludeDirs.includes(item)) {
        continue;
      }

      const sourcePath = path.join(source, item);
      const destPath = path.join(destination, item);

      const stat = await fs.promises.stat(sourcePath);

      if (stat.isDirectory()) {
        await fs.promises.mkdir(destPath, { recursive: true });
        await this.copyDirectory(sourcePath, destPath, excludeDirs);
      } else {
        await fs.promises.copyFile(sourcePath, destPath);
      }
    }
  }

  /**
   * Replace files from source to destination
   */
  private async replaceFiles(source: string, destination: string): Promise<void> {
    const items = await fs.promises.readdir(source);

    for (const item of items) {
      const sourcePath = path.join(source, item);
      const destPath = path.join(destination, item);

      const stat = await fs.promises.stat(sourcePath);

      if (stat.isDirectory()) {
        // Ensure destination directory exists
        await fs.promises.mkdir(destPath, { recursive: true });
        await this.replaceFiles(sourcePath, destPath);
      } else {
        // Backup existing file if it exists
        try {
          await fs.promises.access(destPath);
          const backupPath = `${destPath}.backup`;
          await fs.promises.copyFile(destPath, backupPath);
        } catch {
          // File doesn't exist, no backup needed
        }

        // Copy new file
        await fs.promises.copyFile(sourcePath, destPath);
      }
    }
  }

  /**
   * Extract ZIP package
   */
  private async extractZip(zipPath: string, extractionPath: string): Promise<void> {
    // Use system unzip command (cross-platform)
    try {
      execSync(`unzip -q "${zipPath}" -d "${extractionPath}"`, { stdio: 'inherit' });
    } catch (error) {
      throw new Error(`Failed to extract ZIP: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Extract TAR package
   */
  private async extractTar(tarPath: string, extractionPath: string): Promise<void> {
    try {
      execSync(`tar -xf "${tarPath}" -C "${extractionPath}"`, { stdio: 'inherit' });
    } catch (error) {
      throw new Error(`Failed to extract TAR: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Clean up temporary files
   */
  private async cleanupTempFiles(extractionPath: string, packagePath: string): Promise<void> {
    const cleanupPromises = [
      fs.promises.rm(extractionPath, { recursive: true, force: true }).catch(() => {}),
      fs.promises.unlink(packagePath).catch(() => {})
    ];

    await Promise.all(cleanupPromises);
  }

  /**
   * Ensure required directories exist
   */
  private ensureDirectories(): void {
    [this.backupDir, this.tempDir].forEach(dir => {
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