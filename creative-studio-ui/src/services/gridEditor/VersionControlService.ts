/**
 * Version Control Service - Manages version history for grid configurations
 * 
 * This service provides:
 * - Timestamped version saving
 * - Version metadata storage (author, timestamp, description)
 * - Version listing and retrieval
 * - Version comparison
 * 
 * Requirements: 15.1, 15.2, 15.3, 15.4
 */

import { GridConfiguration } from '../../types/gridEditor';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Version metadata
 */
export interface VersionMetadata {
  id: string;
  timestamp: string; // ISO 8601 format
  author?: string;
  description?: string;
  thumbnail?: string; // Base64 encoded thumbnail image
}

/**
 * Saved version with full configuration
 */
export interface SavedVersion {
  metadata: VersionMetadata;
  configuration: GridConfiguration;
}

/**
 * Version comparison result
 */
export interface VersionComparison {
  version1: VersionMetadata;
  version2: VersionMetadata;
  differences: VersionDifference[];
}

/**
 * Individual difference between versions
 */
export interface VersionDifference {
  type: 'panel_transform' | 'panel_crop' | 'layer_added' | 'layer_removed' | 'layer_modified' | 'metadata';
  panelId?: string;
  layerId?: string;
  description: string;
  before?: any;
  after?: any;
}

/**
 * Version control configuration
 */
export interface VersionControlConfig {
  maxVersions?: number; // Maximum number of versions to keep (default: 50)
  autoSaveInterval?: number; // Auto-save interval in milliseconds (0 = disabled)
  storageKey?: string; // LocalStorage key prefix (default: 'grid-editor-versions')
}

// ============================================================================
// Version Control Service
// ============================================================================

export class VersionControlService {
  private config: Required<VersionControlConfig>;
  private autoSaveTimer: number | null = null;
  private lastSavedConfig: GridConfiguration | null = null;

  constructor(config: VersionControlConfig = {}) {
    this.config = {
      maxVersions: config.maxVersions ?? 50,
      autoSaveInterval: config.autoSaveInterval ?? 0,
      storageKey: config.storageKey ?? 'grid-editor-versions',
    };
  }

  // ============================================================================
  // Version Saving
  // ============================================================================

  /**
   * Save a new version of the grid configuration
   * Requirements: 15.1
   */
  saveVersion(
    configuration: GridConfiguration,
    metadata: Partial<VersionMetadata> = {}
  ): SavedVersion {
    const versionId = this.generateVersionId();
    
    const version: SavedVersion = {
      metadata: {
        id: versionId,
        timestamp: new Date().toISOString(),
        author: metadata.author,
        description: metadata.description,
        thumbnail: metadata.thumbnail,
      },
      configuration: this.deepClone(configuration),
    };

    // Get existing versions
    const versions = this.listVersions(configuration.projectId);

    // Add new version
    versions.push(version);

    // Enforce max versions limit
    const trimmedVersions = this.trimVersions(versions);

    // Save to storage
    this.saveVersionsToStorage(configuration.projectId, trimmedVersions);

    // Update last saved config
    this.lastSavedConfig = this.deepClone(configuration);

    return version;
  }

  /**
   * Save version with auto-generated description
   */
  saveVersionAuto(configuration: GridConfiguration, author?: string): SavedVersion {
    const description = this.generateAutoDescription(configuration);
    return this.saveVersion(configuration, { author, description });
  }

  // ============================================================================
  // Version Retrieval
  // ============================================================================

  /**
   * List all versions for a project
   * Requirements: 15.2
   */
  listVersions(projectId: string): SavedVersion[] {
    const storageKey = this.getStorageKey(projectId);
    const data = localStorage.getItem(storageKey);

    if (!data) {
      return [];
    }

    try {
      const versions = JSON.parse(data) as SavedVersion[];
      // Sort by timestamp (newest first)
      return versions.sort((a, b) => 
        new Date(b.metadata.timestamp).getTime() - new Date(a.metadata.timestamp).getTime()
      );
    } catch (error) {
      console.error('Failed to parse version history:', error);
      return [];
    }
  }

  /**
   * Get a specific version by ID
   * Requirements: 15.2
   */
  getVersion(projectId: string, versionId: string): SavedVersion | null {
    const versions = this.listVersions(projectId);
    return versions.find(v => v.metadata.id === versionId) || null;
  }

  /**
   * Get the latest version
   */
  getLatestVersion(projectId: string): SavedVersion | null {
    const versions = this.listVersions(projectId);
    return versions.length > 0 ? versions[0] : null;
  }

  /**
   * Get version metadata only (without full configuration)
   */
  listVersionMetadata(projectId: string): VersionMetadata[] {
    return this.listVersions(projectId).map(v => v.metadata);
  }

  // ============================================================================
  // Version Comparison
  // ============================================================================

  /**
   * Compare two versions and return differences
   * Requirements: 15.3
   */
  compareVersions(
    projectId: string,
    versionId1: string,
    versionId2: string
  ): VersionComparison | null {
    const version1 = this.getVersion(projectId, versionId1);
    const version2 = this.getVersion(projectId, versionId2);

    if (!version1 || !version2) {
      return null;
    }

    const differences = this.findDifferences(
      version1.configuration,
      version2.configuration
    );

    return {
      version1: version1.metadata,
      version2: version2.metadata,
      differences,
    };
  }

  /**
   * Find differences between two configurations
   */
  private findDifferences(
    config1: GridConfiguration,
    config2: GridConfiguration
  ): VersionDifference[] {
    const differences: VersionDifference[] = [];

    // Compare metadata
    if (config1.metadata.description !== config2.metadata.description) {
      differences.push({
        type: 'metadata',
        description: 'Project description changed',
        before: config1.metadata.description,
        after: config2.metadata.description,
      });
    }

    // Compare panels
    for (let i = 0; i < config1.panels.length; i++) {
      const panel1 = config1.panels[i];
      const panel2 = config2.panels[i];

      if (!panel2) continue;

      // Compare transforms
      if (JSON.stringify(panel1.transform) !== JSON.stringify(panel2.transform)) {
        differences.push({
          type: 'panel_transform',
          panelId: panel1.id,
          description: `Transform changed for panel ${panel1.id}`,
          before: panel1.transform,
          after: panel2.transform,
        });
      }

      // Compare crops
      if (JSON.stringify(panel1.crop) !== JSON.stringify(panel2.crop)) {
        differences.push({
          type: 'panel_crop',
          panelId: panel1.id,
          description: `Crop changed for panel ${panel1.id}`,
          before: panel1.crop,
          after: panel2.crop,
        });
      }

      // Compare layers
      const layerDiffs = this.compareLayerArrays(panel1.id, panel1.layers, panel2.layers);
      differences.push(...layerDiffs);
    }

    return differences;
  }

  /**
   * Compare layer arrays and find differences
   */
  private compareLayerArrays(
    panelId: string,
    layers1: any[],
    layers2: any[]
  ): VersionDifference[] {
    const differences: VersionDifference[] = [];

    // Find added layers
    for (const layer2 of layers2) {
      const exists = layers1.some(l => l.id === layer2.id);
      if (!exists) {
        differences.push({
          type: 'layer_added',
          panelId,
          layerId: layer2.id,
          description: `Layer "${layer2.name}" added to panel ${panelId}`,
          after: layer2,
        });
      }
    }

    // Find removed layers
    for (const layer1 of layers1) {
      const exists = layers2.some(l => l.id === layer1.id);
      if (!exists) {
        differences.push({
          type: 'layer_removed',
          panelId,
          layerId: layer1.id,
          description: `Layer "${layer1.name}" removed from panel ${panelId}`,
          before: layer1,
        });
      }
    }

    // Find modified layers
    for (const layer1 of layers1) {
      const layer2 = layers2.find(l => l.id === layer1.id);
      if (layer2 && JSON.stringify(layer1) !== JSON.stringify(layer2)) {
        differences.push({
          type: 'layer_modified',
          panelId,
          layerId: layer1.id,
          description: `Layer "${layer1.name}" modified in panel ${panelId}`,
          before: layer1,
          after: layer2,
        });
      }
    }

    return differences;
  }

  // ============================================================================
  // Version Deletion
  // ============================================================================

  /**
   * Delete a specific version
   */
  deleteVersion(projectId: string, versionId: string): boolean {
    const versions = this.listVersions(projectId);
    const filteredVersions = versions.filter(v => v.metadata.id !== versionId);

    if (filteredVersions.length === versions.length) {
      return false; // Version not found
    }

    this.saveVersionsToStorage(projectId, filteredVersions);
    return true;
  }

  /**
   * Delete all versions for a project
   */
  deleteAllVersions(projectId: string): void {
    const storageKey = this.getStorageKey(projectId);
    localStorage.removeItem(storageKey);
  }

  // ============================================================================
  // Auto-Save
  // ============================================================================

  /**
   * Start auto-save with the configured interval
   * Requirements: 15.7
   */
  startAutoSave(
    getConfiguration: () => GridConfiguration,
    author?: string
  ): void {
    if (this.config.autoSaveInterval <= 0) {
      console.warn('Auto-save is disabled (interval <= 0)');
      return;
    }

    // Clear existing timer
    this.stopAutoSave();

    // Set up new timer
    this.autoSaveTimer = window.setInterval(() => {
      const config = getConfiguration();
      
      // Only save if configuration has changed
      if (this.hasConfigurationChanged(config)) {
        this.saveVersionAuto(config, author);
      }
    }, this.config.autoSaveInterval);

  }

  /**
   * Stop auto-save
   */
  stopAutoSave(): void {
    if (this.autoSaveTimer !== null) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  /**
   * Check if configuration has changed since last save
   */
  private hasConfigurationChanged(config: GridConfiguration): boolean {
    if (!this.lastSavedConfig) {
      return true;
    }

    // Compare modification timestamps
    return config.metadata.modifiedAt !== this.lastSavedConfig.metadata.modifiedAt;
  }

  // ============================================================================
  // Storage Management
  // ============================================================================

  /**
   * Get storage key for a project
   */
  private getStorageKey(projectId: string): string {
    return `${this.config.storageKey}-${projectId}`;
  }

  /**
   * Save versions to localStorage
   */
  private saveVersionsToStorage(projectId: string, versions: SavedVersion[]): void {
    const storageKey = this.getStorageKey(projectId);
    try {
      localStorage.setItem(storageKey, JSON.stringify(versions));
    } catch (error) {
      console.error('Failed to save versions to storage:', error);
      // Handle quota exceeded error
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn('Storage quota exceeded, removing oldest versions');
        const trimmedVersions = versions.slice(0, Math.floor(versions.length / 2));
        localStorage.setItem(storageKey, JSON.stringify(trimmedVersions));
      }
    }
  }

  /**
   * Trim versions to max limit
   */
  private trimVersions(versions: SavedVersion[]): SavedVersion[] {
    if (versions.length <= this.config.maxVersions) {
      return versions;
    }

    // Sort by timestamp (newest first) and keep only maxVersions
    return versions
      .sort((a, b) => 
        new Date(b.metadata.timestamp).getTime() - new Date(a.metadata.timestamp).getTime()
      )
      .slice(0, this.config.maxVersions);
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Generate unique version ID
   */
  private generateVersionId(): string {
    return `version-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate auto-description based on configuration changes
   */
  private generateAutoDescription(config: GridConfiguration): string {
    const timestamp = new Date().toLocaleString();
    return `Auto-saved at ${timestamp}`;
  }

  /**
   * Deep clone an object
   */
  private deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Get storage usage statistics
   */
  getStorageStats(projectId: string): {
    versionCount: number;
    totalSize: number;
    averageSize: number;
  } {
    const versions = this.listVersions(projectId);
    const storageKey = this.getStorageKey(projectId);
    const data = localStorage.getItem(storageKey);
    const totalSize = data ? data.length : 0;

    return {
      versionCount: versions.length,
      totalSize,
      averageSize: versions.length > 0 ? totalSize / versions.length : 0,
    };
  }

  /**
   * Export version history to JSON file
   */
  exportVersionHistory(projectId: string): Blob {
    const versions = this.listVersions(projectId);
    const json = JSON.stringify(versions, null, 2);
    return new Blob([json], { type: 'application/json' });
  }

  /**
   * Import version history from JSON file
   */
  async importVersionHistory(projectId: string, file: File): Promise<number> {
    const text = await file.text();
    const versions = JSON.parse(text) as SavedVersion[];

    // Validate versions
    if (!Array.isArray(versions)) {
      throw new Error('Invalid version history format');
    }

    // Merge with existing versions (avoid duplicates)
    const existingVersions = this.listVersions(projectId);
    const existingIds = new Set(existingVersions.map(v => v.metadata.id));
    
    const newVersions = versions.filter(v => !existingIds.has(v.metadata.id));
    const mergedVersions = [...existingVersions, ...newVersions];

    // Save merged versions
    this.saveVersionsToStorage(projectId, this.trimVersions(mergedVersions));

    return newVersions.length;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * Default version control service instance
 */
export const versionControlService = new VersionControlService();
