/**
 * Update Downloader - Handles downloading update files with progress tracking
 *
 * Downloads update packages from remote URLs with progress callbacks,
 * cancellation support, and error handling.
 */

import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import * as crypto from 'crypto';

export interface DownloadProgress {
  total: number;
  downloaded: number;
  percentage: number;
  speed: number; // bytes per second
}

export class UpdateDownloader {
  private activeDownloads = new Map<string, AbortController>();
  private downloadTimeout = 300000; // 5 minutes

  /**
   * Download a file from a URL with progress tracking
   */
  async download(
    url: string,
    onProgress?: (progress: number) => void,
    expectedHash?: string
  ): Promise<string> {
    const urlObj = new URL(url);
    const downloadId = crypto.randomUUID();

    const abortController = new AbortController();
    this.activeDownloads.set(downloadId, abortController);

    try {
      const downloadPath = await this.performDownload(
        urlObj,
        downloadId,
        abortController.signal,
        onProgress
      );

      // Verify hash if provided
      if (expectedHash) {
        await this.verifyDownload(downloadPath, expectedHash);
      }

      console.log(`Download completed: ${downloadPath}`);
      return downloadPath;
    } finally {
      this.activeDownloads.delete(downloadId);
    }
  }

  /**
   * Cancel all active downloads
   */
  cancel(): void {
    for (const [id, controller] of this.activeDownloads) {
      controller.abort();
      this.activeDownloads.delete(id);
    }
  }

  /**
   * Cancel a specific download
   */
  cancelDownload(downloadId: string): void {
    const controller = this.activeDownloads.get(downloadId);
    if (controller) {
      controller.abort();
      this.activeDownloads.delete(downloadId);
    }
  }

  /**
   * Perform the actual download
   */
  private async performDownload(
    url: URL,
    _downloadId: string,
    signal: AbortSignal,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const tempDir = app.getPath('temp');
      const filename = this.generateFilename(url);
      const downloadPath = path.join(tempDir, `storycore-update-${Date.now()}-${filename}`);

      const client = url.protocol === 'https:' ? https : http;

      const request = client.get(url, {
        signal,
        timeout: this.downloadTimeout,
        headers: {
          'User-Agent': `StoryCore/${app.getVersion()}`
        }
      }, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
          return;
        }

        const totalSize = parseInt(response.headers['content-length'] || '0', 10);
        let downloadedSize = 0;

        const fileStream = fs.createWriteStream(downloadPath);

        response.pipe(fileStream);

        response.on('data', (chunk) => {
          downloadedSize += chunk.length;

          if (onProgress && totalSize > 0) {
            const progress = downloadedSize / totalSize;
            onProgress(progress);
          }
        });

        fileStream.on('finish', () => {
          fileStream.close();
          resolve(downloadPath);
        });

        fileStream.on('error', (error) => {
          fs.unlink(downloadPath, () => {}); // Clean up partial file
          reject(new Error(`File write error: ${error.message}`));
        });
      });

      request.on('error', (error) => {
        fs.unlink(downloadPath, () => {}); // Clean up partial file
        if (error.name === 'AbortError') {
          reject(new Error('Download cancelled'));
        } else {
          reject(new Error(`Download error: ${error.message}`));
        }
      });

      request.on('timeout', () => {
        request.destroy();
        fs.unlink(downloadPath, () => {}); // Clean up partial file
        reject(new Error('Download timed out'));
      });

      signal.addEventListener('abort', () => {
        request.destroy();
        fs.unlink(downloadPath, () => {}); // Clean up partial file
      });
    });
  }

  /**
   * Verify the downloaded file against an expected hash
   */
  private async verifyDownload(filePath: string, expectedHash: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);

      stream.on('data', (chunk) => {
        hash.update(chunk);
      });

      stream.on('end', () => {
        const actualHash = hash.digest('hex');
        if (actualHash !== expectedHash) {
          fs.unlink(filePath, () => {}); // Clean up invalid file
          reject(new Error(`Hash verification failed. Expected: ${expectedHash}, Got: ${actualHash}`));
        } else {
          resolve();
        }
      });

      stream.on('error', (error) => {
        reject(new Error(`Hash verification error: ${error.message}`));
      });
    });
  }

  /**
   * Generate a safe filename from URL
   */
  private generateFilename(url: URL): string {
    const pathname = url.pathname;
    const basename = path.basename(pathname);

    // If basename is just a pathname separator or empty, generate a default name
    if (!basename || basename === '/' || basename === '\\') {
      return `update-${Date.now()}.tmp`;
    }

    // Sanitize filename - remove potentially dangerous characters
    const sanitized = basename.replace(/[^a-zA-Z0-9._-]/g, '_');

    // Ensure it has an extension or add a default one
    if (!path.extname(sanitized)) {
      return `${sanitized}.update`;
    }

    return sanitized;
  }

  /**
   * Clean up temporary files older than specified age
   */
  async cleanupTempFiles(maxAgeHours = 24): Promise<void> {
    const tempDir = app.getPath('temp');
    const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
    const now = Date.now();

    try {
      const files = await fs.promises.readdir(tempDir);
      const updateFiles = files.filter(file => file.startsWith('storycore-update-'));

      for (const file of updateFiles) {
        const filePath = path.join(tempDir, file);
        try {
          const stats = await fs.promises.stat(filePath);
          if (now - stats.mtime.getTime() > maxAgeMs) {
            await fs.promises.unlink(filePath);
            console.log(`Cleaned up old update file: ${file}`);
          }
        } catch (error) {
          // File might have been deleted or inaccessible, continue
          console.warn(`Failed to check/cleanup ${file}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup temp files:', error);
    }
  }

  /**
   * Get download statistics
   */
  getActiveDownloads(): string[] {
    return Array.from(this.activeDownloads.keys());
  }
}