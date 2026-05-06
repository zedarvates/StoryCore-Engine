/**
 * Electron File System
 * 
 * Requirements: 158
 * Level: 🟡 HAUTE
 * 
 * File system operations for Electron application
 */

import { dialog, OpenDialogOptions, SaveDialogOptions, BrowserWindow } from 'electron';
import { readFile, writeFile, access, constants, mkdir, readdir, stat, unlink, rename, copyFile } from 'fs/promises';
import { join, extname, basename, dirname, resolve } from 'path';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';

export interface FileInfo {
  name: string;
  path: string;
  size: number;
  type: 'file' | 'directory';
  extension: string;
  createdAt: Date;
  modifiedAt: Date;
  isHidden: boolean;
}

export interface FileFilter {
  name: string;
  extensions: string[];
}

export interface FileOperationOptions {
  overwrite?: boolean;
  createDirectories?: boolean;
  encoding?: BufferEncoding;
}

export class ElectronFileSystem {
  private mainWindow: BrowserWindow;
  private recentFiles: string[] = [];
  private maxRecentFiles: number = 10;

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
    this.loadRecentFiles();
  }

  /**
   * Open file dialog
   */
  public async openDialog(options: OpenDialogOptions = {}): Promise<string[] | null> {
    const defaultOptions: OpenDialogOptions = {
      title: 'Open File',
      properties: ['openFile'],
      filters: [
        { name: 'All Files', extensions: ['*'] },
      ],
      ...options,
    };

    const result = await dialog.showOpenDialog(this.mainWindow, defaultOptions);
    
    if (!result.canceled && result.filePaths.length > 0) {
      result.filePaths.forEach(filePath => this.addToRecentFiles(filePath));
      return result.filePaths;
    }

    return null;
  }

  /**
   * Open directory dialog
   */
  public async openDirectoryDialog(options: OpenDialogOptions = {}): Promise<string[] | null> {
    const defaultOptions: OpenDialogOptions = {
      title: 'Select Directory',
      properties: ['openDirectory'],
      ...options,
    };

    const result = await dialog.showOpenDialog(this.mainWindow, defaultOptions);
    
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths;
    }

    return null;
  }

  /**
   * Save file dialog
   */
  public async saveDialog(options: SaveDialogOptions = {}): Promise<string | null> {
    const defaultOptions: SaveDialogOptions = {
      title: 'Save File',
      ...options,
    };

    const result = await dialog.showSaveDialog(this.mainWindow, defaultOptions);
    
    if (!result.canceled && result.filePath) {
      this.addToRecentFiles(result.filePath);
      return result.filePath;
    }

    return null;
  }

  /**
   * Read file
   */
  public async readFile(filePath: string, options?: FileOperationOptions): Promise<Buffer | string> {
    const encoding = options?.encoding;
    
    if (encoding) {
      return await readFile(filePath, encoding);
    }
    
    return await readFile(filePath);
  }

  /**
   * Write file
   */
  public async writeFile(
    filePath: string,
    data: string | Buffer,
    options?: FileOperationOptions
  ): Promise<void> {
    const dir = dirname(filePath);
    
    if (options?.createDirectories) {
      await this.ensureDirectory(dir);
    }

    if (!options?.overwrite) {
      const exists = await this.exists(filePath);
      if (exists) {
        throw new Error(`File already exists: ${filePath}`);
      }
    }

    await writeFile(filePath, data);
  }

  /**
   * Check if file exists
   */
  public async exists(filePath: string): Promise<boolean> {
    try {
      await access(filePath, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file info
   */
  public async getFileInfo(filePath: string): Promise<FileInfo> {
    const stats = await stat(filePath);
    const name = basename(filePath);
    const extension = extname(filePath).toLowerCase();

    return {
      name,
      path: filePath,
      size: stats.size,
      type: stats.isDirectory() ? 'directory' : 'file',
      extension,
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime,
      isHidden: name.startsWith('.'),
    };
  }

  /**
   * Read directory
   */
  public async readDirectory(dirPath: string): Promise<FileInfo[]> {
    const files = await readdir(dirPath);
    const fileInfos: FileInfo[] = [];

    for (const file of files) {
      const filePath = join(dirPath, file);
      try {
        const fileInfo = await this.getFileInfo(filePath);
        fileInfos.push(fileInfo);
      } catch (error) {
        console.error(`Error reading file info: ${filePath}`, error);
      }
    }

    return fileInfos;
  }

  /**
   * Delete file
   */
  public async deleteFile(filePath: string): Promise<void> {
    await unlink(filePath);
    this.removeFromRecentFiles(filePath);
  }

  /**
   * Move/Rename file
   */
  public async moveFile(sourcePath: string, destPath: string): Promise<void> {
    const destDir = dirname(destPath);
    await this.ensureDirectory(destDir);
    await rename(sourcePath, destPath);
    this.updateRecentFile(sourcePath, destPath);
  }

  /**
   * Copy file
   */
  public async copyFile(sourcePath: string, destPath: string): Promise<void> {
    const destDir = dirname(destPath);
    await this.ensureDirectory(destDir);
    await copyFile(sourcePath, destPath);
  }

  /**
   * Create directory
   */
  public async createDirectory(dirPath: string): Promise<void> {
    await this.ensureDirectory(dirPath);
  }

  /**
   * Ensure directory exists
   */
  public async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await mkdir(dirPath, { recursive: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * Copy file with progress
   */
  public async copyFileWithProgress(
    sourcePath: string,
    destPath: string,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    const sourceStats = await stat(sourcePath);
    const readStream = createReadStream(sourcePath);
    const writeStream = createWriteStream(destPath);

    let bytesCopied = 0;
    
    readStream.on('data', (chunk) => {
      bytesCopied += chunk.length;
      if (onProgress) {
        const progress = (bytesCopied / sourceStats.size) * 100;
        onProgress(progress);
      }
    });

    await pipeline(readStream, writeStream);
  }

  /**
   * Get recent files
   */
  public getRecentFiles(): string[] {
    return [...this.recentFiles];
  }

  /**
   * Clear recent files
   */
  public clearRecentFiles(): void {
    this.recentFiles = [];
    this.saveRecentFiles();
  }

  /**
   * Add file to recent files
   */
  private addToRecentFiles(filePath: string): void {
    // Remove if already exists
    this.recentFiles = this.recentFiles.filter(file => file !== filePath);
    
    // Add to beginning
    this.recentFiles.unshift(filePath);
    
    // Limit to max
    if (this.recentFiles.length > this.maxRecentFiles) {
      this.recentFiles = this.recentFiles.slice(0, this.maxRecentFiles);
    }
    
    this.saveRecentFiles();
  }

  /**
   * Remove file from recent files
   */
  private removeFromRecentFiles(filePath: string): void {
    this.recentFiles = this.recentFiles.filter(file => file !== filePath);
    this.saveRecentFiles();
  }

  /**
   * Update recent file path
   */
  private updateRecentFile(oldPath: string, newPath: string): void {
    const index = this.recentFiles.indexOf(oldPath);
    if (index !== -1) {
      this.recentFiles[index] = newPath;
      this.saveRecentFiles();
    }
  }

  /**
   * Save recent files to storage
   */
  private saveRecentFiles(): void {
    // In a real app, save to localStorage or config file
    console.log('Recent files:', this.recentFiles);
  }

  /**
   * Load recent files from storage
   */
  private loadRecentFiles(): void {
    // In a real app, load from localStorage or config file
    this.recentFiles = [];
  }

  /**
   * Create file filter for dialogs
   */
  public static createFileFilter(name: string, extensions: string[]): FileFilter {
    return { name, extensions };
  }

  /**
   * Get common file filters
   */
  public static getCommonFilters(): FileFilter[] {
    return [
      { name: 'All Files', extensions: ['*'] },
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'] },
      { name: 'Videos', extensions: ['mp4', 'webm', 'avi', 'mov', 'mkv'] },
      { name: 'Audio', extensions: ['mp3', 'wav', 'ogg', 'flac', 'aac'] },
      { name: 'Documents', extensions: ['pdf', 'doc', 'docx', 'txt', 'md'] },
      { name: 'JSON', extensions: ['json'] },
      { name: 'JavaScript/TypeScript', extensions: ['js', 'ts', 'jsx', 'tsx'] },
    ];
  }
}

/**
 * Create file system instance
 */
export function createFileSystem(mainWindow: BrowserWindow): ElectronFileSystem {
  return new ElectronFileSystem(mainWindow);
}
