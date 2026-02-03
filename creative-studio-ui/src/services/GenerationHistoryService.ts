/**
 * Generation History Service
 * 
 * Manages generation history including:
 * - History logging on generation completion
 * - History retrieval with parameters
 * - Versioning for regenerations
 * 
 * Requirements: 14.1, 14.3, 14.4
 */

import type { HistoryEntry, GeneratedAsset, GenerationHistory } from '../types/generation';

/**
 * History query options
 */
export interface HistoryQueryOptions {
  type?: HistoryEntry['type'];
  pipelineId?: string;
  startDate?: number;
  endDate?: number;
  limit?: number;
  sortBy?: 'timestamp' | 'version';
  sortOrder?: 'asc' | 'desc';
}

/**
 * History storage key for localStorage
 */
const HISTORY_STORAGE_KEY = 'storycore_generation_history';

/**
 * Generation History Service
 * 
 * Provides centralized history management for generated content.
 * Implements persistent storage using localStorage with automatic cleanup.
 */
export class GenerationHistoryService {
  private static instance: GenerationHistoryService;
  
  // In-memory history cache
  private history: GenerationHistory;
  
  // Version tracking per asset
  private versionMap: Map<string, number> = new Map();
  
  private constructor() {
    // Initialize with default values
    this.history = {
      entries: [],
      maxEntries: 100,
    };
    
    // Load history from storage
    this.loadFromStorage();
  }
  
  public static getInstance(): GenerationHistoryService {
    if (!GenerationHistoryService.instance) {
      GenerationHistoryService.instance = new GenerationHistoryService();
    }
    return GenerationHistoryService.instance;
  }
  
  // ============================================================================
  // History Logging
  // ============================================================================
  
  /**
   * Log a generation to history
   * 
   * Records the generation with all parameters and results.
   * Automatically assigns version numbers for regenerations.
   * 
   * Requirements: 14.1
   */
  public logGeneration(
    pipelineId: string,
    type: HistoryEntry['type'],
    params: Record<string, any>,
    result: GeneratedAsset
  ): HistoryEntry {
    // Determine version number
    const version = this.getNextVersion(result.id);
    
    // Create history entry
    const entry: HistoryEntry = {
      id: crypto.randomUUID(),
      pipelineId,
      type,
      params,
      result,
      timestamp: Date.now(),
      version,
    };
    
    // Add to history
    this.addEntry(entry);
    
    // Save to storage
    this.saveToStorage();
    
    return entry;
  }
  
  /**
   * Add entry to history with automatic cleanup
   */
  private addEntry(entry: HistoryEntry): void {
    // Add to beginning of array (newest first)
    this.history.entries.unshift(entry);
    
    // Trim to max entries
    if (this.history.entries.length > this.history.maxEntries) {
      const removed = this.history.entries.splice(this.history.maxEntries);
      
      // Clean up version map for removed entries
      removed.forEach(e => {
        const key = this.getVersionKey(e.result.id, e.type);
        this.versionMap.delete(key);
      });
    }
  }
  
  // ============================================================================
  // History Retrieval
  // ============================================================================
  
  /**
   * Get all history entries
   * 
   * Requirements: 14.3
   */
  public getAllEntries(): HistoryEntry[] {
    return [...this.history.entries];
  }
  
  /**
   * Query history with filters
   * 
   * Supports filtering by type, pipeline, date range, and sorting.
   * 
   * Requirements: 14.3
   */
  public queryHistory(options: HistoryQueryOptions = {}): HistoryEntry[] {
    let entries = [...this.history.entries];
    
    // Filter by type
    if (options.type) {
      entries = entries.filter(entry => entry.type === options.type);
    }
    
    // Filter by pipeline
    if (options.pipelineId) {
      entries = entries.filter(entry => entry.pipelineId === options.pipelineId);
    }
    
    // Filter by date range
    if (options.startDate) {
      entries = entries.filter(entry => entry.timestamp >= options.startDate!);
    }
    
    if (options.endDate) {
      entries = entries.filter(entry => entry.timestamp <= options.endDate!);
    }
    
    // Sort entries
    const sortBy = options.sortBy || 'timestamp';
    const sortOrder = options.sortOrder || 'desc';
    
    entries.sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === 'timestamp') {
        comparison = a.timestamp - b.timestamp;
      } else if (sortBy === 'version') {
        comparison = a.version - b.version;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    // Limit results
    if (options.limit) {
      entries = entries.slice(0, options.limit);
    }
    
    return entries;
  }
  
  /**
   * Get history entry by ID
   */
  public getEntryById(entryId: string): HistoryEntry | undefined {
    return this.history.entries.find(entry => entry.id === entryId);
  }
  
  /**
   * Get history entries by asset ID
   * 
   * Returns all history entries for a specific asset, useful for
   * viewing all versions of a regenerated asset.
   */
  public getEntriesByAssetId(assetId: string): HistoryEntry[] {
    return this.history.entries.filter(entry => entry.result.id === assetId);
  }
  
  /**
   * Get history entries by pipeline ID
   * 
   * Returns all history entries for a specific pipeline.
   */
  public getEntriesByPipelineId(pipelineId: string): HistoryEntry[] {
    return this.history.entries.filter(entry => entry.pipelineId === pipelineId);
  }
  
  /**
   * Get history entries by type
   */
  public getEntriesByType(type: HistoryEntry['type']): HistoryEntry[] {
    return this.history.entries.filter(entry => entry.type === type);
  }
  
  /**
   * Get recent history entries
   * 
   * Returns the most recent N entries.
   */
  public getRecentEntries(limit: number = 10): HistoryEntry[] {
    return this.history.entries.slice(0, limit);
  }
  
  // ============================================================================
  // Versioning
  // ============================================================================
  
  /**
   * Get next version number for an asset
   * 
   * Tracks version numbers for regenerations of the same asset.
   * 
   * Requirements: 14.4
   */
  private getNextVersion(assetId: string): number {
    // Find all existing entries for this asset
    const existingEntries = this.history.entries.filter(
      entry => entry.result.id === assetId
    );
    
    if (existingEntries.length === 0) {
      return 1;
    }
    
    // Find highest version number
    const maxVersion = Math.max(...existingEntries.map(e => e.version));
    return maxVersion + 1;
  }
  
  /**
   * Get version key for version map
   */
  private getVersionKey(assetId: string, type: HistoryEntry['type']): string {
    return `${assetId}_${type}`;
  }
  
  /**
   * Get all versions of an asset
   * 
   * Returns all history entries for an asset, sorted by version.
   * 
   * Requirements: 14.4
   */
  public getAssetVersions(assetId: string): HistoryEntry[] {
    const entries = this.getEntriesByAssetId(assetId);
    
    // Sort by version ascending
    return entries.sort((a, b) => a.version - b.version);
  }
  
  /**
   * Get latest version of an asset
   */
  public getLatestVersion(assetId: string): HistoryEntry | undefined {
    const versions = this.getAssetVersions(assetId);
    return versions[versions.length - 1];
  }
  
  /**
   * Get specific version of an asset
   */
  public getVersion(assetId: string, version: number): HistoryEntry | undefined {
    return this.history.entries.find(
      entry => entry.result.id === assetId && entry.version === version
    );
  }
  
  /**
   * Compare two versions of an asset
   * 
   * Returns parameter differences between two versions.
   */
  public compareVersions(
    assetId: string,
    version1: number,
    version2: number
  ): {
    version1Entry?: HistoryEntry;
    version2Entry?: HistoryEntry;
    paramDifferences: Record<string, { v1: any; v2: any }>;
  } {
    const v1Entry = this.getVersion(assetId, version1);
    const v2Entry = this.getVersion(assetId, version2);
    
    const paramDifferences: Record<string, { v1: any; v2: any }> = {};
    
    if (v1Entry && v2Entry) {
      // Find parameter differences
      const allKeys = new Set([
        ...Object.keys(v1Entry.params),
        ...Object.keys(v2Entry.params),
      ]);
      
      allKeys.forEach(key => {
        const v1Value = v1Entry.params[key];
        const v2Value = v2Entry.params[key];
        
        if (JSON.stringify(v1Value) !== JSON.stringify(v2Value)) {
          paramDifferences[key] = { v1: v1Value, v2: v2Value };
        }
      });
    }
    
    return {
      version1Entry: v1Entry,
      version2Entry: v2Entry,
      paramDifferences,
    };
  }
  
  // ============================================================================
  // History Management
  // ============================================================================
  
  /**
   * Clear all history
   */
  public clearHistory(): void {
    this.history.entries = [];
    this.versionMap.clear();
    this.saveToStorage();
  }
  
  /**
   * Remove specific entry from history
   */
  public removeEntry(entryId: string): boolean {
    const index = this.history.entries.findIndex(entry => entry.id === entryId);
    
    if (index !== -1) {
      const removed = this.history.entries.splice(index, 1)[0];
      
      // Clean up version map
      const key = this.getVersionKey(removed.result.id, removed.type);
      this.versionMap.delete(key);
      
      this.saveToStorage();
      return true;
    }
    
    return false;
  }
  
  /**
   * Remove entries older than specified date
   */
  public removeEntriesOlderThan(timestamp: number): number {
    const initialLength = this.history.entries.length;
    
    this.history.entries = this.history.entries.filter(
      entry => entry.timestamp >= timestamp
    );
    
    const removedCount = initialLength - this.history.entries.length;
    
    if (removedCount > 0) {
      this.saveToStorage();
    }
    
    return removedCount;
  }
  
  /**
   * Set maximum number of history entries
   */
  public setMaxEntries(maxEntries: number): void {
    this.history.maxEntries = maxEntries;
    
    // Trim if necessary
    if (this.history.entries.length > maxEntries) {
      this.history.entries = this.history.entries.slice(0, maxEntries);
      this.saveToStorage();
    }
  }
  
  /**
   * Get history statistics
   */
  public getStatistics(): {
    totalEntries: number;
    entriesByType: Record<string, number>;
    oldestEntry?: HistoryEntry;
    newestEntry?: HistoryEntry;
    averageVersions: number;
  } {
    const entriesByType: Record<string, number> = {
      prompt: 0,
      image: 0,
      video: 0,
      audio: 0,
    };
    
    this.history.entries.forEach(entry => {
      entriesByType[entry.type] = (entriesByType[entry.type] || 0) + 1;
    });
    
    const oldestEntry = this.history.entries[this.history.entries.length - 1];
    const newestEntry = this.history.entries[0];
    
    // Calculate average versions per asset
    const assetVersionCounts = new Map<string, number>();
    this.history.entries.forEach(entry => {
      const count = assetVersionCounts.get(entry.result.id) || 0;
      assetVersionCounts.set(entry.result.id, count + 1);
    });
    
    const totalVersions = Array.from(assetVersionCounts.values()).reduce(
      (sum, count) => sum + count,
      0
    );
    const averageVersions = assetVersionCounts.size > 0
      ? totalVersions / assetVersionCounts.size
      : 0;
    
    return {
      totalEntries: this.history.entries.length,
      entriesByType,
      oldestEntry,
      newestEntry,
      averageVersions,
    };
  }
  
  // ============================================================================
  // Persistence
  // ============================================================================
  
  /**
   * Save history to localStorage
   */
  private saveToStorage(): void {
    try {
      const data = JSON.stringify(this.history);
      localStorage.setItem(HISTORY_STORAGE_KEY, data);
    } catch (error) {
      console.error('[GenerationHistoryService] Error saving to storage:', error);
    }
  }
  
  /**
   * Load history from localStorage
   */
  private loadFromStorage(): void {
    try {
      const data = localStorage.getItem(HISTORY_STORAGE_KEY);
      
      if (data) {
        const parsed = JSON.parse(data) as GenerationHistory;
        this.history = parsed;
        
        // Rebuild version map
        this.rebuildVersionMap();
      }
    } catch (error) {
      console.error('[GenerationHistoryService] Error loading from storage:', error);
      // Reset to default on error
      this.history = {
        entries: [],
        maxEntries: 100,
      };
    }
  }
  
  /**
   * Rebuild version map from entries
   */
  private rebuildVersionMap(): void {
    this.versionMap.clear();
    
    this.history.entries.forEach(entry => {
      const key = this.getVersionKey(entry.result.id, entry.type);
      const currentMax = this.versionMap.get(key) || 0;
      this.versionMap.set(key, Math.max(currentMax, entry.version));
    });
  }
  
  /**
   * Export history to JSON
   */
  public exportToJSON(): string {
    return JSON.stringify(this.history, null, 2);
  }
  
  /**
   * Import history from JSON
   */
  public importFromJSON(json: string): boolean {
    try {
      const parsed = JSON.parse(json) as GenerationHistory;
      
      // Validate structure
      if (!parsed.entries || !Array.isArray(parsed.entries)) {
        throw new Error('Invalid history format');
      }
      
      this.history = parsed;
      this.rebuildVersionMap();
      this.saveToStorage();
      
      return true;
    } catch (error) {
      console.error('[GenerationHistoryService] Error importing from JSON:', error);
      return false;
    }
  }
}

// Export singleton instance
export const generationHistoryService = GenerationHistoryService.getInstance();
