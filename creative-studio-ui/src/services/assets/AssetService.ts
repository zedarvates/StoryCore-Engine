/**
 * AssetService - Handles asset import, validation, storage, and metadata management
 * Part of the editor-wizard-integration feature
 */

import type {
  AssetType,
  AssetMetadata,
  ValidationResult,
  ImportResult,
} from '../../types/asset';
import { ASSET_VALIDATION_RULES } from '../../types/asset';

export class AssetService {
  /**
   * Cross-platform path joining utility
   * Works in both browser and Node.js environments
   */
  private joinPath(...parts: string[]): string {
    return parts
      .join('/')
      .replace(/\/+/g, '/')
      .replace(/\\/g, '/');
  }

  /**
   * Validates an asset file against type-specific rules
   * Requirements: 9.2, 9.3, 9.4
   */
  validateAsset(file: File): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Determine asset type from file extension
    const assetType = this.getAssetTypeFromFile(file);
    if (!assetType) {
      errors.push(
        `Unsupported file type. Supported types: PNG, JPG, JPEG, MP3, WAV, MP4, MOV`
      );
      return { valid: false, errors, warnings };
    }

    const rules = ASSET_VALIDATION_RULES[assetType];

    // Validate file extension
    const fileExtension = this.getFileExtension(file.name).toLowerCase();
    if (!rules.allowedExtensions.includes(fileExtension)) {
      errors.push(
        `Invalid file extension for ${assetType}. Allowed: ${rules.allowedExtensions.join(', ')}`
      );
    }

    // Validate file size
    if (file.size > rules.maxSize) {
      const maxSizeMB = rules.maxSize / (1024 * 1024);
      errors.push(
        `File size (${this.formatFileSize(file.size)}) exceeds maximum allowed size (${maxSizeMB}MB)`
      );
    }

    // For images, we'll need to validate dimensions after loading
    // This will be done asynchronously in the import process
    if (assetType === 'image' && rules.minDimensions) {
      warnings.push(
        `Image dimensions will be validated during import (minimum: ${rules.minDimensions.width}x${rules.minDimensions.height})`
      );
    }

    // For audio/video, duration validation will be done during import
    if ((assetType === 'audio' || assetType === 'video') && rules.minDuration) {
      warnings.push(
        `${assetType} duration will be validated during import (minimum: ${rules.minDuration}s)`
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validates image dimensions asynchronously
   * Requirements: 9.3
   */
  async validateImageDimensions(file: File): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const dimensions = await this.getImageDimensions(file);
      const rules = ASSET_VALIDATION_RULES.image;

      if (rules.minDimensions) {
        if (
          dimensions.width < rules.minDimensions.width ||
          dimensions.height < rules.minDimensions.height
        ) {
          errors.push(
            `Image dimensions (${dimensions.width}x${dimensions.height}) are below minimum required (${rules.minDimensions.width}x${rules.minDimensions.height})`
          );
        }
      }
    } catch (error) {
      errors.push(`Failed to read image dimensions: ${error}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validates audio/video duration asynchronously
   * Requirements: 9.3
   */
  async validateMediaDuration(
    file: File,
    type: 'audio' | 'video'
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const duration = await this.getMediaDuration(file, type);
      const rules = ASSET_VALIDATION_RULES[type];

      if (rules.minDuration && duration < rules.minDuration) {
        errors.push(
          `${type} duration (${duration.toFixed(2)}s) is below minimum required (${rules.minDuration}s)`
        );
      }
    } catch (error) {
      errors.push(`Failed to read ${type} duration: ${error}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Gets image dimensions from a File object
   */
  private async getImageDimensions(
    file: File
  ): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({ width: img.width, height: img.height });
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };

      img.src = url;
    });
  }

  /**
   * Gets media duration from a File object
   */
  private async getMediaDuration(
    file: File,
    type: 'audio' | 'video'
  ): Promise<number> {
    return new Promise((resolve, reject) => {
      const element =
        type === 'audio'
          ? document.createElement('audio')
          : document.createElement('video');
      const url = URL.createObjectURL(file);

      element.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        resolve(element.duration);
      };

      element.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error(`Failed to load ${type}`));
      };

      element.src = url;
    });
  }

  /**
   * Determines asset type from file
   */
  private getAssetTypeFromFile(file: File): AssetType | null {
    const extension = this.getFileExtension(file.name).toLowerCase();

    if (ASSET_VALIDATION_RULES.image.allowedExtensions.includes(extension)) {
      return 'image';
    }
    if (ASSET_VALIDATION_RULES.audio.allowedExtensions.includes(extension)) {
      return 'audio';
    }
    if (ASSET_VALIDATION_RULES.video.allowedExtensions.includes(extension)) {
      return 'video';
    }

    return null;
  }

  /**
   * Gets file extension including the dot
   */
  private getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot === -1 ? '' : filename.substring(lastDot);
  }

  /**
   * Formats file size for display
   */
  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  /**
   * Imports multiple assets with validation and progress tracking
   * Requirements: 9.1, 9.5, 9.6, 9.7
   */
  async importAssets(
    files: File[],
    projectPath: string,
    onProgress?: (current: number, total: number, filename: string) => void
  ): Promise<ImportResult[]> {
    const results: ImportResult[] = [];
    const newAssets: AssetMetadata[] = [];

    // Get existing assets
    const existingAssets = await this.getAllAssets(projectPath);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Report progress
      if (onProgress) {
        onProgress(i + 1, files.length, file.name);
      }

      try {
        // Validate file
        const basicValidation = this.validateAsset(file);
        if (!basicValidation.valid) {
          results.push({
            success: false,
            error: basicValidation.errors.join('; '),
          });
          continue;
        }

        // Perform additional async validation based on type
        const assetType = this.getAssetTypeFromFile(file);
        if (!assetType) {
          results.push({
            success: false,
            error: 'Unable to determine asset type',
          });
          continue;
        }

        // Additional validation for images
        if (assetType === 'image') {
          const dimensionValidation = await this.validateImageDimensions(file);
          if (!dimensionValidation.valid) {
            results.push({
              success: false,
              error: dimensionValidation.errors.join('; '),
            });
            continue;
          }
        }

        // Additional validation for audio/video
        if (assetType === 'audio' || assetType === 'video') {
          const durationValidation = await this.validateMediaDuration(
            file,
            assetType
          );
          if (!durationValidation.valid) {
            results.push({
              success: false,
              error: durationValidation.errors.join('; '),
            });
            continue;
          }
        }

        // Generate asset ID
        const assetId = this.generateAssetId(file.name);

        // Copy file to project
        const assetPath = await this.copyAssetToProject(
          file,
          projectPath,
          assetType
        );

        // Create metadata
        const metadata = this.createAssetMetadata(file, assetPath, assetId);

        // Generate thumbnail for images
        if (assetType === 'image') {
          try {
            metadata.thumbnail = await this.generateThumbnail(file);
          } catch (error) {
            console.warn('Failed to generate thumbnail:', error);
            // Continue without thumbnail
          }
        }

        newAssets.push(metadata);

        results.push({
          success: true,
          assetId,
          assetPath,
        });
      } catch (error) {
        results.push({
          success: false,
          error: `Failed to import ${file.name}: ${error}`,
        });
      }
    }

    // Update asset library with all assets (existing + new)
    if (newAssets.length > 0) {
      const allAssets = [...existingAssets, ...newAssets];
      await this.updateAssetLibrary(projectPath, allAssets);
    }

    return results;
  }

  /**
   * Generates a unique asset ID following the pattern asset_{timestamp}_{filename}
   * Requirements: 9.6
   */
  generateAssetId(filename: string): string {
    const timestamp = Date.now();
    // Remove extension and sanitize filename
    const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
    const sanitized = nameWithoutExt.replace(/[^a-zA-Z0-9-_]/g, '_');
    return `asset_${timestamp}_${sanitized}`;
  }

  /**
   * Copies an asset file to the project directory with proper directory creation
   * Requirements: 9.5, 9.7
   */
  async copyAssetToProject(
    file: File,
    projectPath: string,
    assetType: AssetType
  ): Promise<string> {
    // Construct the target directory path
    const assetTypeDir = `${assetType}s`; // images, audios, videos
    const targetDir = this.joinPath(projectPath, 'assets', assetTypeDir);

    // Generate unique filename
    const assetId = this.generateAssetId(file.name);
    const extension = this.getFileExtension(file.name);
    const targetFilename = `${assetId}${extension}`;
    const targetPath = this.joinPath(targetDir, targetFilename);

    // In a browser environment, we need to use the File System Access API
    // or rely on Electron's file system capabilities
    // For now, we'll use a placeholder that assumes Electron IPC is available
    if (window.electronAPI && window.electronAPI.fs) {
      // Ensure directory exists
      await window.electronAPI.fs.ensureDir(targetDir);

      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      // Write file to target location
      await window.electronAPI.fs.writeFile(targetPath, uint8Array as any);

      return targetPath;
    } else {
      throw new Error(
        'File system access not available. This feature requires Electron.'
      );
    }
  }

  /**
   * Creates asset metadata with all required fields
   * Requirements: 9.8
   */
  createAssetMetadata(
    file: File,
    assetPath: string,
    assetId: string
  ): AssetMetadata {
    const assetType = this.getAssetTypeFromFile(file);
    if (!assetType) {
      throw new Error('Unable to determine asset type');
    }

    return {
      id: assetId,
      filename: file.name,
      type: assetType,
      path: assetPath,
      size: file.size,
      imported_at: new Date().toISOString(),
    };
  }

  /**
   * Generates a thumbnail for an image asset
   * Requirements: 9.8
   */
  async generateThumbnail(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        // Create canvas for thumbnail
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Calculate thumbnail dimensions (max 200x200, maintain aspect ratio)
        const maxSize = 200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw image to canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to data URL
        const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.8);

        URL.revokeObjectURL(url);
        resolve(thumbnailDataUrl);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image for thumbnail'));
      };

      img.src = url;
    });
  }

  /**
   * Updates the asset library in project.json
   * Requirements: 9.8
   */
  async updateAssetLibrary(
    projectPath: string,
    assets: AssetMetadata[]
  ): Promise<void> {
    if (!window.electronAPI || !window.electronAPI.fs) {
      throw new Error(
        'File system access not available. This feature requires Electron.'
      );
    }

    const projectJsonPath = this.joinPath(projectPath, 'project.json');

    // Read existing project.json
    let projectData: unknown = {};
    try {
      const exists = await window.electronAPI.fs.exists(projectJsonPath);
      if (exists) {
        const buffer = await window.electronAPI.fs.readFile(projectJsonPath);
        const decoder = new TextDecoder();
        const jsonString = decoder.decode(buffer);
        projectData = JSON.parse(jsonString);
      }
    } catch (error) {
      console.warn('Failed to read project.json, creating new one:', error);
    }

    // Update assets array
    projectData.assets = assets;

    // Write back to project.json
    const jsonString = JSON.stringify(projectData, null, 2);
    const encoder = new TextEncoder();
    const uint8Array = encoder.encode(jsonString);
    await window.electronAPI.fs.writeFile(projectJsonPath, uint8Array as any);
  }

  /**
   * Gets assets by type from project.json
   * Requirements: 9.9
   */
  async getAssetsByType(
    projectPath: string,
    type: AssetType
  ): Promise<AssetMetadata[]> {
    if (!window.electronAPI || !window.electronAPI.fs) {
      throw new Error(
        'File system access not available. This feature requires Electron.'
      );
    }

    const projectJsonPath = this.joinPath(projectPath, 'project.json');

    try {
      const exists = await window.electronAPI.fs.exists(projectJsonPath);
      if (!exists) {
        return [];
      }

      const buffer = await window.electronAPI.fs.readFile(projectJsonPath);
      const decoder = new TextDecoder();
      const jsonString = decoder.decode(buffer);
      const projectData = JSON.parse(jsonString);

      if (!projectData.assets || !Array.isArray(projectData.assets)) {
        return [];
      }

      return projectData.assets.filter(
        (asset: AssetMetadata) => asset.type === type
      );
    } catch (error) {
      console.error('Failed to get assets by type:', error);
      return [];
    }
  }

  /**
   * Gets all assets from project.json
   * Requirements: 9.9
   */
  async getAllAssets(projectPath: string): Promise<AssetMetadata[]> {
    if (!window.electronAPI || !window.electronAPI.fs) {
      throw new Error(
        'File system access not available. This feature requires Electron.'
      );
    }

    const projectJsonPath = this.joinPath(projectPath, 'project.json');

    try {
      const exists = await window.electronAPI.fs.exists(projectJsonPath);
      if (!exists) {
        return [];
      }

      const buffer = await window.electronAPI.fs.readFile(projectJsonPath);
      const decoder = new TextDecoder();
      const jsonString = decoder.decode(buffer);
      const projectData = JSON.parse(jsonString);

      if (!projectData.assets || !Array.isArray(projectData.assets)) {
        return [];
      }

      return projectData.assets;
    } catch (error) {
      console.error('Failed to get all assets:', error);
      return [];
    }
  }
}

