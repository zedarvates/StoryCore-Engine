/**
 * Update Checker - Handles checking for available updates
 *
 * Periodically checks a remote endpoint for new versions and compares
 * with the current application version.
 */

import { app } from 'electron';
import * as https from 'https';
import * as http from 'http';

export interface UpdateInfo {
  version: string;
  releaseNotes?: string;
  downloadUrl: string;
  fileSize?: number;
  releaseDate: Date;
  mandatory?: boolean;
}

export interface UpdateManifest {
  version: string;
  releaseNotes?: string;
  downloadUrl: string;
  fileSize?: number;
  releaseDate: string;
  mandatory?: boolean;
  minVersion?: string;
}

export class UpdateChecker {
  private updateUrl: string;
  private currentVersion: string;
  private lastCheck: Date | null = null;
  private checkTimeout = 30000; // 30 seconds

  constructor(updateUrl: string) {
    this.updateUrl = updateUrl;
    this.currentVersion = app.getVersion();
  }

  /**
   * Check for available updates
   */
  async checkForUpdates(): Promise<UpdateInfo | null> {
    try {
      console.log('Checking for updates from:', this.updateUrl);

      const manifest = await this.fetchUpdateManifest();

      if (this.isNewerVersion(manifest.version)) {
        this.lastCheck = new Date();

        return {
          version: manifest.version,
          releaseNotes: manifest.releaseNotes,
          downloadUrl: manifest.downloadUrl,
          fileSize: manifest.fileSize,
          releaseDate: new Date(manifest.releaseDate),
          mandatory: manifest.mandatory
        };
      }

      this.lastCheck = new Date();
      return null;
    } catch (error) {
      console.error('Failed to check for updates:', error);
      throw error;
    }
  }

  /**
   * Get the time of the last update check
   */
  getLastCheckTime(): Date | null {
    return this.lastCheck;
  }

  /**
   * Force a fresh check (ignore cache)
   */
  async forceCheck(): Promise<UpdateInfo | null> {
    this.lastCheck = null;
    return this.checkForUpdates();
  }

  /**
   * Fetch the update manifest from the remote server
   */
  private async fetchUpdateManifest(): Promise<UpdateManifest> {
    return new Promise((resolve, reject) => {
      const url = new URL(this.updateUrl);
      const client = url.protocol === 'https:' ? https : http;

      const request = client.get(url, {
        timeout: this.checkTimeout,
        headers: {
          'User-Agent': `StoryCore/${this.currentVersion}`,
          'Accept': 'application/json'
        }
      }, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
          return;
        }

        let data = '';
        res.setEncoding('utf8');

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const manifest: UpdateManifest = JSON.parse(data);
            this.validateManifest(manifest);
            resolve(manifest);
          } catch (error) {
            reject(new Error(`Invalid update manifest: ${error instanceof Error ? error.message : String(error)}`));
          }
        });
      });

      request.on('error', (error) => {
        reject(new Error(`Network error: ${error.message}`));
      });

      request.on('timeout', () => {
        request.destroy();
        reject(new Error('Update check timed out'));
      });
    });
  }

  /**
   * Validate the update manifest structure
   */
  private validateManifest(manifest: any): asserts manifest is UpdateManifest {
    if (!manifest || typeof manifest !== 'object') {
      throw new Error('Invalid manifest format');
    }

    if (!manifest.version || typeof manifest.version !== 'string') {
      throw new Error('Missing or invalid version');
    }

    if (!manifest.downloadUrl || typeof manifest.downloadUrl !== 'string') {
      throw new Error('Missing or invalid download URL');
    }

    if (!manifest.releaseDate || typeof manifest.releaseDate !== 'string') {
      throw new Error('Missing or invalid release date');
    }

    // Validate version format (basic semver check)
    if (!/^\d+\.\d+\.\d+/.test(manifest.version)) {
      throw new Error('Invalid version format');
    }

    // Validate URL format
    try {
      new URL(manifest.downloadUrl);
    } catch {
      throw new Error('Invalid download URL format');
    }

    // Validate release date
    const releaseDate = new Date(manifest.releaseDate);
    if (isNaN(releaseDate.getTime())) {
      throw new Error('Invalid release date format');
    }
  }

  /**
   * Compare versions to determine if the remote version is newer
   */
  private isNewerVersion(remoteVersion: string): boolean {
    const currentParts = this.currentVersion.split('.').map(Number);
    const remoteParts = remoteVersion.split('.').map(Number);

    // Pad shorter version arrays
    while (currentParts.length < remoteParts.length) {
      currentParts.push(0);
    }
    while (remoteParts.length < currentParts.length) {
      remoteParts.push(0);
    }

    for (let i = 0; i < currentParts.length; i++) {
      if (remoteParts[i] > currentParts[i]) {
        return true;
      }
      if (remoteParts[i] < currentParts[i]) {
        return false;
      }
    }

    return false; // Versions are equal
  }

  /**
   * Check if the current version meets minimum requirements
   */
  isVersionSupported(minVersion?: string): boolean {
    if (!minVersion) {
      return true;
    }

    return !this.isNewerVersion(minVersion);
  }
}