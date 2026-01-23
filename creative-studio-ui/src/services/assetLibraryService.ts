/**
 * Asset Library Service
 * 
 * Manages assets from multiple sources:
 * - User project assets (from project folder)
 * - StoryCore base library (from assets/ folder)
 * - Templates (predefined asset templates)
 */

import type { Asset } from '@/types';

// ============================================================================
// Types
// ============================================================================

export interface AssetSource {
  id: string;
  name: string;
  type: 'project' | 'library' | 'template';
  assets: Asset[];
  description?: string;
}

export interface AssetCategory {
  id: string;
  name: string;
  icon: string;
  filter: (asset: Asset) => boolean;
}

export interface AssetSearchOptions {
  query?: string;
  type?: Asset['type'];
  category?: string;
  sources?: string[]; // Filter by source IDs
}

/**
 * Callback type for asset source updates
 */
export type AssetSourceUpdateCallback = (sources: AssetSource[]) => void;

/**
 * Callback type for cache updates
 */
export type CacheUpdateCallback = (cacheCleared: boolean) => void;

// ============================================================================
// Asset Categories
// ============================================================================

export const ASSET_CATEGORIES: AssetCategory[] = [
  {
    id: 'all',
    name: 'Tous',
    icon: 'layers',
    filter: () => true,
  },
  {
    id: 'images',
    name: 'Images',
    icon: 'image',
    filter: (asset) => asset.type === 'image',
  },
  {
    id: 'audio',
    name: 'Audio',
    icon: 'music',
    filter: (asset) => asset.type === 'audio',
  },
  {
    id: 'video',
    name: 'Vidéo',
    icon: 'video',
    filter: (asset) => asset.type === 'video',
  },
  {
    id: 'templates',
    name: 'Templates',
    icon: 'file-text',
    filter: (asset) => asset.type === 'template',
  },
];

// ============================================================================
// Base Library Assets
// ============================================================================

/**
 * StoryCore base library assets
 * These are available to all projects
 */
const BASE_LIBRARY_ASSETS: Asset[] = [
  // Demo Images
  {
    id: 'lib-img-1',
    name: 'Camera_shot_example.jpg',
    type: 'image',
    url: '/assets/demo/camera_shot.jpg',
    thumbnail: '/assets/demo/camera_shot_thumb.jpg',
    metadata: {
      source: 'library',
      category: 'demo',
      tags: ['camera', 'shot', 'example'],
    },
  },
  {
    id: 'lib-img-2',
    name: 'Production_scene.jpg',
    type: 'image',
    url: '/assets/demo/production.jpg',
    thumbnail: '/assets/demo/production_thumb.jpg',
    metadata: {
      source: 'library',
      category: 'demo',
      tags: ['production', 'scene'],
    },
  },
  {
    id: 'lib-img-3',
    name: 'Storyboard_frame.jpg',
    type: 'image',
    url: '/assets/demo/storyboard.jpg',
    thumbnail: '/assets/demo/storyboard_thumb.jpg',
    metadata: {
      source: 'library',
      category: 'demo',
      tags: ['storyboard', 'frame'],
    },
  },
  
  // Demo Audio
  {
    id: 'lib-audio-1',
    name: 'Background_music.mp3',
    type: 'audio',
    url: '/assets/audio/background.mp3',
    metadata: {
      source: 'library',
      category: 'music',
      tags: ['background', 'music', 'ambient'],
      duration: 120,
    },
  },
  {
    id: 'lib-audio-2',
    name: 'Sound_effect_whoosh.mp3',
    type: 'audio',
    url: '/assets/audio/whoosh.mp3',
    metadata: {
      source: 'library',
      category: 'sfx',
      tags: ['sound', 'effect', 'whoosh', 'transition'],
      duration: 2,
    },
  },
  {
    id: 'lib-audio-3',
    name: 'Narration_voice.mp3',
    type: 'audio',
    url: '/assets/audio/narration.mp3',
    metadata: {
      source: 'library',
      category: 'voiceover',
      tags: ['narration', 'voice', 'voiceover'],
      duration: 30,
    },
  },
  
  // UI Assets
  {
    id: 'lib-ui-1',
    name: 'Placeholder_icon.png',
    type: 'image',
    url: '/assets/ui/placeholder.png',
    thumbnail: '/assets/ui/placeholder_thumb.png',
    metadata: {
      source: 'library',
      category: 'ui',
      tags: ['placeholder', 'icon', 'ui'],
    },
  },
  {
    id: 'lib-ui-2',
    name: 'Logo_storycore.png',
    type: 'image',
    url: '/assets/ui/logo.png',
    thumbnail: '/assets/ui/logo_thumb.png',
    metadata: {
      source: 'library',
      category: 'ui',
      tags: ['logo', 'branding'],
    },
  },
];

// ============================================================================
// Asset Library Service
// ============================================================================

export class AssetLibraryService {
  private static instance: AssetLibraryService;
  private cachedSources: AssetSource[] | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 60000; // 1 minute
  
  // Subscribers for different events
  private sourceUpdateSubscribers: Set<AssetSourceUpdateCallback> = new Set();
  private cacheUpdateSubscribers: Set<CacheUpdateCallback> = new Set();
  
  private constructor() {
  }
  
  /**
   * Get singleton instance
   */
  static getInstance(): AssetLibraryService {
    if (!AssetLibraryService.instance) {
      AssetLibraryService.instance = new AssetLibraryService();
    }
    return AssetLibraryService.instance;
  }

  /**
   * Subscribe to asset source updates
   * Returns unsubscribe function
   */
  public subscribeToSourceUpdates(callback: AssetSourceUpdateCallback): () => void {
    this.sourceUpdateSubscribers.add(callback);
    
    // Immediately call with current sources if available
    if (this.cachedSources) {
      try {
        callback(this.cachedSources);
      } catch (error) {
        console.error('[AssetLibraryService] Error in source update subscriber:', error);
      }
    }
    
    return () => {
      this.sourceUpdateSubscribers.delete(callback);
    };
  }

  /**
   * Subscribe to cache updates
   * Returns unsubscribe function
   */
  public subscribeToCacheUpdates(callback: CacheUpdateCallback): () => void {
    this.cacheUpdateSubscribers.add(callback);
    return () => {
      this.cacheUpdateSubscribers.delete(callback);
    };
  }

  /**
   * Notify subscribers of source updates
   */
  private notifySourceUpdate(sources: AssetSource[]): void {
    this.sourceUpdateSubscribers.forEach(callback => {
      try {
        callback(sources);
      } catch (error) {
        console.error('[AssetLibraryService] Error in source update subscriber:', error);
      }
    });
  }

  /**
   * Notify subscribers of cache updates
   */
  private notifyCacheUpdate(cacheCleared: boolean): void {
    this.cacheUpdateSubscribers.forEach(callback => {
      try {
        callback(cacheCleared);
      } catch (error) {
        console.error('[AssetLibraryService] Error in cache update subscriber:', error);
      }
    });
  }
  
  /**
   * Get all available assets from all sources
   */
  async getAllAssets(projectPath?: string): Promise<AssetSource[]> {
    // Check cache
    const now = Date.now();
    if (this.cachedSources && (now - this.cacheTimestamp) < this.CACHE_DURATION) {
      return this.cachedSources;
    }
    
    const sources: AssetSource[] = [];
    
    // 1. Load project assets (if project path provided)
    if (projectPath) {
      try {
        const projectAssets = await this.loadProjectAssets(projectPath);
        if (projectAssets.length > 0) {
          sources.push({
            id: 'project',
            name: 'Project Assets',
            type: 'project',
            assets: projectAssets,
            description: 'Assets from your current project',
          });
        }
      } catch (error) {
        console.error('Failed to load project assets:', error);
      }
    }
    
    // 2. Load StoryCore base library
    const libraryAssets = await this.loadLibraryAssets();
    sources.push({
      id: 'library',
      name: 'StoryCore Library',
      type: 'library',
      assets: libraryAssets,
      description: 'Built-in assets available to all projects',
    });
    
    // 3. Load characters
    const characterAssets = await this.loadAssetsFromFolder('/assets/characters', 'characters', 'Character assets');
    if (characterAssets.length > 0) {
      sources.push({
        id: 'characters',
        name: 'Characters',
        type: 'library',
        assets: characterAssets,
        description: 'Character-related assets',
      });
    }

    // 4. Load sound assets
    const soundAssets = await this.loadAssetsFromFolder('/assets/sound', 'sound', 'Sound assets');
    if (soundAssets.length > 0) {
      sources.push({
        id: 'sound',
        name: 'Sound Library',
        type: 'library',
        assets: soundAssets,
        description: 'Audio and sound effect assets',
      });
    }

    // 5. Load workflows
    const workflowAssets = await this.loadAssetsFromFolder('/assets/workflows', 'workflows', 'Workflow templates');
    if (workflowAssets.length > 0) {
      sources.push({
        id: 'workflows',
        name: 'Workflows',
        type: 'template',
        assets: workflowAssets,
        description: 'Workflow and pipeline templates',
      });
    }

    // 6. Load templates
    const templateAssets = await this.loadTemplateAssets();
    if (templateAssets.length > 0) {
      sources.push({
        id: 'templates',
        name: 'Templates',
        type: 'template',
        assets: templateAssets,
        description: 'Predefined asset templates',
      });
    }
    
    // Cache results
    this.cachedSources = sources;
    this.cacheTimestamp = now;
    
    // Notify subscribers
    this.notifySourceUpdate(sources);
    
    return sources;
  }
  
  /**
   * Load assets from user project
   */
  private async loadProjectAssets(projectPath: string): Promise<Asset[]> {
    try {
      // Try to load from Electron API
      if (window.electronAPI?.project?.getAssets) {
        const assets = await window.electronAPI.project.getAssets(projectPath);
        return assets;
      }
      
      // Fallback: Try to load from project.json
      if (window.electronAPI?.project?.load) {
        const project = await window.electronAPI.project.load(projectPath);
        return project.assets || [];
      }
      
      return [];
    } catch (error) {
      console.error('Failed to load project assets:', error);
      return [];
    }
  }
  
  /**
   * Load assets from StoryCore base library
   */
  private async loadLibraryAssets(): Promise<Asset[]> {
    const assets: Asset[] = [...BASE_LIBRARY_ASSETS];

    // Try to load from local assets folder
    try {
      if (window.electronAPI?.assets?.scanFolder) {
        const libraryAssets = await window.electronAPI.assets.scanFolder('/assets/library');
        assets.push(...libraryAssets);
      }
    } catch (error) {
      console.warn('Failed to load library assets from folder:', error);
    }

    return assets;
  }
  
  /**
   * Load assets from a specific folder
   */
  private async loadAssetsFromFolder(
    folderPath: string,
    sourceName: string,
    description: string
  ): Promise<Asset[]> {
    try {
      if (window.electronAPI?.assets?.scanFolder) {
        const assets = await window.electronAPI.assets.scanFolder(folderPath);
        return assets;
      }
    } catch (error) {
      console.warn(`Failed to load ${sourceName} assets from folder ${folderPath}:`, error);
    }

    return [];
  }

  /**
   * Load template assets
   */
  private async loadTemplateAssets(): Promise<Asset[]> {
    return this.loadAssetsFromFolder('/assets/templates', 'templates', 'Template assets');
  }
  
  /**
   * Search assets across all sources
   */
  async searchAssets(
    options: AssetSearchOptions,
    sources?: AssetSource[]
  ): Promise<Asset[]> {
    // Get sources if not provided
    if (!sources) {
      sources = await this.getAllAssets();
    }
    
    // Filter by source IDs if specified
    if (options.sources && options.sources.length > 0) {
      sources = sources.filter(source => options.sources!.includes(source.id));
    }
    
    // Flatten all assets
    let allAssets = sources.flatMap(source => source.assets);
    
    // Filter by type
    if (options.type) {
      allAssets = allAssets.filter(asset => asset.type === options.type);
    }
    
    // Filter by category
    if (options.category && options.category !== 'all') {
      const category = ASSET_CATEGORIES.find(c => c.id === options.category);
      if (category) {
        allAssets = allAssets.filter(category.filter);
      }
    }
    
    // Filter by search query
    if (options.query && options.query.trim()) {
      const query = options.query.toLowerCase();
      allAssets = allAssets.filter(asset => {
        // Search in name
        if (asset.name.toLowerCase().includes(query)) return true;
        
        // Search in metadata tags
        if (asset.metadata?.tags) {
          const tags = Array.isArray(asset.metadata.tags) 
            ? asset.metadata.tags 
            : [asset.metadata.tags];
          if (tags.some((tag: string) => tag.toLowerCase().includes(query))) return true;
        }
        
        // Search in metadata category
        if (asset.metadata?.category && 
            typeof asset.metadata.category === 'string' &&
            asset.metadata.category.toLowerCase().includes(query)) return true;
        
        return false;
      });
    }
    
    return allAssets;
  }
  
  /**
   * Get assets by category
   */
  async getAssetsByCategory(
    categoryId: string,
    sources?: AssetSource[]
  ): Promise<Asset[]> {
    return this.searchAssets({ category: categoryId }, sources);
  }
  
  /**
   * Get assets by type
   */
  async getAssetsByType(
    type: Asset['type'],
    sources?: AssetSource[]
  ): Promise<Asset[]> {
    return this.searchAssets({ type }, sources);
  }
  
  /**
   * Get asset by ID
   */
  async getAssetById(
    assetId: string,
    sources?: AssetSource[]
  ): Promise<Asset | null> {
    if (!sources) {
      sources = await this.getAllAssets();
    }
    
    for (const source of sources) {
      const asset = source.assets.find(a => a.id === assetId);
      if (asset) return asset;
    }
    
    return null;
  }
  
  /**
   * Clear cache
   */
  clearCache(): void {
    this.cachedSources = null;
    this.cacheTimestamp = 0;
    
    // Notify subscribers
    this.notifyCacheUpdate(true);
  }
  
  /**
   * Refresh assets (clear cache and reload)
   */
  async refresh(projectPath?: string): Promise<AssetSource[]> {
    this.clearCache();
    return this.getAllAssets(projectPath);
  }
  
  /**
   * Get statistics about assets
   */
  async getStatistics(sources?: AssetSource[]): Promise<{
    totalAssets: number;
    byType: Record<string, number>;
    bySource: Record<string, number>;
  }> {
    if (!sources) {
      sources = await this.getAllAssets();
    }
    
    const stats = {
      totalAssets: 0,
      byType: {} as Record<string, number>,
      bySource: {} as Record<string, number>,
    };
    
    for (const source of sources) {
      stats.bySource[source.id] = source.assets.length;
      stats.totalAssets += source.assets.length;
      
      for (const asset of source.assets) {
        stats.byType[asset.type] = (stats.byType[asset.type] || 0) + 1;
      }
    }
    
    return stats;
  }
}

// ============================================================================
// Export
// ============================================================================

export default AssetLibraryService;
