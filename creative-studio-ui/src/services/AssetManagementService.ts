/**
 * Asset Management Service
 * 
 * Manages generated assets including:
 * - Automatic saving to project directory
 * - Metadata storage (generation parameters, timestamp, file size)
 * - Asset association graph (linkAssets, getRelatedAssets)
 * 
 * Requirements: 9.1, 9.2, 9.5
 */

import type { GeneratedAsset, AssetMetadata } from '../types/generation';

/**
 * Asset save options
 */
export interface AssetSaveOptions {
  projectPath: string;
  asset: GeneratedAsset;
  filename?: string;
  subdirectory?: string;
}

/**
 * Asset query options
 */
export interface AssetQueryOptions {
  type?: GeneratedAsset['type'];
  startDate?: number;
  endDate?: number;
  limit?: number;
}

/**
 * Asset Management Service
 * 
 * Provides centralized asset management for generated content.
 */
export class AssetManagementService {
  private static instance: AssetManagementService;
  
  // Asset graph for tracking relationships
  private assetGraph: Map<string, GeneratedAsset> = new Map();
  private assetEdges: Map<string, string[]> = new Map();
  
  // Asset metadata cache
  private metadataCache: Map<string, AssetMetadata> = new Map();
  
  private constructor() {}
  
  public static getInstance(): AssetManagementService {
    if (!AssetManagementService.instance) {
      AssetManagementService.instance = new AssetManagementService();
    }
    return AssetManagementService.instance;
  }
  
  // ============================================================================
  // Asset Saving and Organization
  // ============================================================================
  
  /**
   * Save generated asset to project directory
   * 
   * Automatically saves the asset with metadata to the appropriate subdirectory
   * based on asset type (images/, videos/, audio/).
   * 
   * Requirements: 9.1
   */
  public async saveAsset(options: AssetSaveOptions): Promise<string> {
    const { projectPath, asset, filename, subdirectory } = options;
    
    try {
      // Determine subdirectory based on asset type
      const assetSubdir = subdirectory || this.getAssetSubdirectory(asset.type);
      
      // Generate filename if not provided
      const assetFilename = filename || this.generateFilename(asset);
      
      // Construct full path
      const assetPath = this.joinPath(projectPath, assetSubdir, assetFilename);
      
      // Save asset file
      await this.saveAssetFile(assetPath, asset);
      
      // Save metadata
      await this.saveAssetMetadata(projectPath, asset);
      
      // Add to asset graph
      this.addAssetToGraph(asset);
      
      // Update asset URL to local path
      const updatedAsset: GeneratedAsset = {
        ...asset,
        url: this.joinPath(assetSubdir, assetFilename),
      };
      
      // Update in graph
      this.assetGraph.set(asset.id, updatedAsset);
      
      return assetPath;
    } catch (error) {
      console.error('[AssetManagementService] Error saving asset:', error);
      throw new Error(
        `Failed to save asset ${asset.id}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  
  /**
   * Save asset file to disk
   * 
   * Handles different asset types (image, video, audio) and saves them
   * using the appropriate method (Electron API or browser File System Access API).
   */
  private async saveAssetFile(path: string, asset: GeneratedAsset): Promise<void> {
    // Check if we're running in Electron environment
    if (window.electronAPI?.fs) {
      // Use Electron API for file system access
      await this.saveAssetFileElectron(path, asset);
    } else if (typeof window !== 'undefined' && window.showSaveFilePicker) {
      // Use browser File System Access API
      await this.saveAssetFileBrowser(path, asset);
    } else {
      // Development/fallback mode - log instead of saving
      console.warn('[AssetManagementService] Running in non-Electron environment without File System Access API. Save operation skipped.');
      console.log('[AssetManagementService] Asset that would be saved:', { path, asset });
    }
  }
  
  /**
   * Save asset file using Electron API
   */
  private async saveAssetFileElectron(path: string, asset: GeneratedAsset): Promise<void> {
    try {
      // Ensure directory exists
      const directory = path.substring(0, path.lastIndexOf('/'));
      await this.ensureDirectoryExists(directory);
      
      // Convert asset URL to buffer
      const buffer = await this.assetUrlToBuffer(asset.url, asset.type);
      
      // Write file
      await window.electronAPI!.fs!.writeFile(path, buffer as any);
    } catch (error) {
      throw new Error(`Failed to save asset file with Electron: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Save asset file using browser File System Access API
   */
  private async saveAssetFileBrowser(path: string, asset: GeneratedAsset): Promise<void> {
    try {
      // Extract filename from path
      const filename = path.substring(path.lastIndexOf('/') + 1);
      
      // Create file handle
      const fileHandle = await window.showSaveFilePicker!({
        suggestedName: filename,
        types: this.getFilePickerTypes(asset.type),
      });
      
      // Create writable stream
      const writable = await fileHandle.createWritable();
      
      // Convert asset URL to blob
      const blob = await this.assetUrlToBlob(asset.url, asset.type);
      
      // Write blob
      await writable.write(blob);
      await writable.close();
    } catch (error) {
      throw new Error(`Failed to save asset file with browser API: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Save asset metadata to project directory
   * 
   * Stores metadata in a JSON file alongside the asset for easy retrieval.
   * 
   * Requirements: 9.2
   */
  private async saveAssetMetadata(projectPath: string, asset: GeneratedAsset): Promise<void> {
    try {
      // Create metadata object with enhanced information
      const metadata = {
        id: asset.id,
        type: asset.type,
        timestamp: asset.timestamp,
        generationParams: asset.metadata.generationParams,
        fileSize: asset.metadata.fileSize,
        dimensions: asset.metadata.dimensions,
        duration: asset.metadata.duration,
        format: asset.metadata.format,
        relatedAssets: asset.relatedAssets,
      };
      
      // Construct metadata path
      const metadataPath = this.joinPath(
        projectPath,
        'metadata',
        `${asset.id}.json`
      );
      
      // Save metadata
      const metadataJson = JSON.stringify(metadata, null, 2);
      
      if (window.electronAPI?.fs) {
        // Ensure metadata directory exists
        const metadataDir = this.joinPath(projectPath, 'metadata');
        await this.ensureDirectoryExists(metadataDir);
        
        // Write metadata file
        const encoder = new TextEncoder();
        const uint8Array = encoder.encode(metadataJson);
        await window.electronAPI.fs.writeFile(metadataPath, uint8Array as any);
      } else {
        // Development/fallback mode
        console.log('[AssetManagementService] Metadata that would be saved:', metadata);
      }
      
      // Cache metadata
      this.metadataCache.set(asset.id, asset.metadata);
    } catch (error) {
      console.error('[AssetManagementService] Error saving metadata:', error);
      // Don't throw - metadata save failure shouldn't prevent asset save
    }
  }
  
  /**
   * Load asset metadata from project directory
   * 
   * Requirements: 9.2
   */
  public async loadAssetMetadata(projectPath: string, assetId: string): Promise<AssetMetadata | null> {
    // Check cache first
    if (this.metadataCache.has(assetId)) {
      return this.metadataCache.get(assetId)!;
    }
    
    try {
      const metadataPath = this.joinPath(
        projectPath,
        'metadata',
        `${assetId}.json`
      );
      
      if (window.electronAPI?.fs) {
        const buffer = await window.electronAPI.fs.readFile(metadataPath);
        const metadataJson = buffer.toString('utf-8');
        const metadata = JSON.parse(metadataJson);
        
        // Cache metadata
        this.metadataCache.set(assetId, metadata);
        
        return metadata;
      } else {
        console.warn('[AssetManagementService] Cannot load metadata in non-Electron environment');
        return null;
      }
    } catch (error) {
      console.error('[AssetManagementService] Error loading metadata:', error);
      return null;
    }
  }
  
  // ============================================================================
  // Asset Association Graph
  // ============================================================================
  
  /**
   * Link two assets in the association graph
   * 
   * Creates a directional relationship from source to target asset.
   * Used to track pipeline relationships (e.g., image → video → audio).
   * 
   * Requirements: 9.5
   */
  public linkAssets(sourceId: string, targetId: string): void {
    const edges = this.assetEdges.get(sourceId) || [];
    
    if (!edges.includes(targetId)) {
      edges.push(targetId);
      this.assetEdges.set(sourceId, edges);
    }
    
    // Update source asset's relatedAssets array
    const sourceAsset = this.assetGraph.get(sourceId);
    if (sourceAsset && !sourceAsset.relatedAssets.includes(targetId)) {
      sourceAsset.relatedAssets.push(targetId);
    }
  }
  
  /**
   * Get all assets related to a given asset
   * 
   * Returns all assets linked to the specified asset in the association graph.
   * 
   * Requirements: 9.5
   */
  public getRelatedAssets(assetId: string): GeneratedAsset[] {
    const relatedIds = this.assetEdges.get(assetId) || [];
    return relatedIds
      .map(id => this.assetGraph.get(id))
      .filter((asset): asset is GeneratedAsset => asset !== undefined);
  }
  
  /**
   * Add asset to the asset graph
   */
  public addAssetToGraph(asset: GeneratedAsset): void {
    this.assetGraph.set(asset.id, asset);
    
    // Initialize edges if not present
    if (!this.assetEdges.has(asset.id)) {
      this.assetEdges.set(asset.id, []);
    }
  }
  
  /**
   * Remove asset from the asset graph
   */
  public removeAssetFromGraph(assetId: string): void {
    this.assetGraph.delete(assetId);
    this.assetEdges.delete(assetId);
    this.metadataCache.delete(assetId);
    
    // Remove from other assets' edges
    this.assetEdges.forEach((targets, sourceId) => {
      const filtered = targets.filter(id => id !== assetId);
      if (filtered.length !== targets.length) {
        this.assetEdges.set(sourceId, filtered);
      }
    });
  }
  
  /**
   * Get asset from graph by ID
   */
  public getAsset(assetId: string): GeneratedAsset | undefined {
    return this.assetGraph.get(assetId);
  }
  
  /**
   * Get all assets from graph
   */
  public getAllAssets(): GeneratedAsset[] {
    return Array.from(this.assetGraph.values());
  }
  
  /**
   * Query assets with filters
   */
  public queryAssets(options: AssetQueryOptions = {}): GeneratedAsset[] {
    let assets = this.getAllAssets();
    
    // Filter by type
    if (options.type) {
      assets = assets.filter(asset => asset.type === options.type);
    }
    
    // Filter by date range
    if (options.startDate) {
      assets = assets.filter(asset => asset.timestamp >= options.startDate!);
    }
    
    if (options.endDate) {
      assets = assets.filter(asset => asset.timestamp <= options.endDate!);
    }
    
    // Sort by timestamp (newest first)
    assets.sort((a, b) => b.timestamp - a.timestamp);
    
    // Limit results
    if (options.limit) {
      assets = assets.slice(0, options.limit);
    }
    
    return assets;
  }
  
  /**
   * Clear all assets from graph
   */
  public clearGraph(): void {
    this.assetGraph.clear();
    this.assetEdges.clear();
    this.metadataCache.clear();
  }
  
  // ============================================================================
  // Helper Methods
  // ============================================================================
  
  /**
   * Get subdirectory for asset type
   */
  private getAssetSubdirectory(type: GeneratedAsset['type']): string {
    switch (type) {
      case 'image':
        return 'images';
      case 'video':
        return 'videos';
      case 'audio':
        return 'audio';
      case 'prompt':
        return 'prompts';
      default:
        return 'assets';
    }
  }
  
  /**
   * Generate filename for asset
   */
  private generateFilename(asset: GeneratedAsset): string {
    const timestamp = new Date(asset.timestamp).toISOString().replace(/[:.]/g, '-');
    const extension = this.getFileExtension(asset.type, asset.metadata.format);
    return `${asset.type}_${timestamp}_${asset.id.substring(0, 8)}.${extension}`;
  }
  
  /**
   * Get file extension for asset type and format
   */
  private getFileExtension(type: GeneratedAsset['type'], format: string): string {
    if (format) {
      return format;
    }
    
    switch (type) {
      case 'image':
        return 'png';
      case 'video':
        return 'mp4';
      case 'audio':
        return 'wav';
      case 'prompt':
        return 'txt';
      default:
        return 'bin';
    }
  }
  
  /**
   * Get file picker types for asset type
   */
  private getFilePickerTypes(type: GeneratedAsset['type']): FilePickerAcceptType[] {
    switch (type) {
      case 'image':
        return [{
          description: 'Image Files',
          accept: {
            'image/png': ['.png'],
            'image/jpeg': ['.jpg', '.jpeg'],
          },
        }];
      case 'video':
        return [{
          description: 'Video Files',
          accept: {
            'video/mp4': ['.mp4'],
            'video/webm': ['.webm'],
          },
        }];
      case 'audio':
        return [{
          description: 'Audio Files',
          accept: {
            'audio/wav': ['.wav'],
            'audio/mp3': ['.mp3'],
          },
        }];
      default:
        return [{
          description: 'All Files',
          accept: {
            '*/*': ['.*'],
          },
        }];
    }
  }
  
  /**
   * Convert asset URL to buffer
   */
  private async assetUrlToBuffer(url: string, type: GeneratedAsset['type']): Promise<Uint8Array> {
    // Handle data URLs
    if (url.startsWith('data:')) {
      const base64Data = url.split(',')[1];
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    }
    
    // Handle HTTP URLs
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      return new Uint8Array(arrayBuffer);
    }
    
    // Handle local file paths (mock data)
    console.warn('[AssetManagementService] Cannot convert local file path to buffer:', url);
    return new Uint8Array(0);
  }
  
  /**
   * Convert asset URL to blob
   */
  private async assetUrlToBlob(url: string, type: GeneratedAsset['type']): Promise<Blob> {
    // Handle data URLs
    if (url.startsWith('data:')) {
      const response = await fetch(url);
      return await response.blob();
    }
    
    // Handle HTTP URLs
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const response = await fetch(url);
      return await response.blob();
    }
    
    // Handle local file paths (mock data)
    console.warn('[AssetManagementService] Cannot convert local file path to blob:', url);
    return new Blob();
  }
  
  /**
   * Ensure directory exists
   * 
   * Uses Electron API fs.mkdir with recursive option to create directories.
   * Returns true if directory exists or was created successfully.
   */
  private async ensureDirectoryExists(path: string): Promise<boolean> {
    if (window.electronAPI?.fs) {
      try {
        const exists = await window.electronAPI.fs.exists(path);
        if (!exists) {
          await window.electronAPI.fs.mkdir(path, { recursive: true });
        }
        return true;
      } catch (error) {
        console.warn(`[AssetManagementService] Failed to create directory ${path}`, { error });
        return false;
      }
    } else {
      // Non-Electron environment: directory creation is not supported
      console.warn(`[AssetManagementService] Cannot create directory in non-Electron environment: ${path}`);
      return false;
    }
  }
  
  /**
   * Cross-platform path joining utility
   */
  private joinPath(...parts: string[]): string {
    return parts.join('/').replace(/\/+/g, '/');
  }
}

// Export singleton instance
export const assetManagementService = AssetManagementService.getInstance();
