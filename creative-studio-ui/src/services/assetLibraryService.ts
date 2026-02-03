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
 * Check if we're running in browser context (no Electron)
 */
const isBrowserContext = (): boolean => {
  return !(window as any).electronAPI;
};

/**
 * Get the correct base path for assets based on context
 */
const getAssetBasePath = (): string => {
  if (isBrowserContext()) {
    // In browser context, assets are served from the public folder
    return '/assets';
  } else {
    // In Electron context, assets are in the project root
    return 'assets';
  }
};

/**
 * StoryCore base library assets
 * These are available to all projects
 * Using actual existing assets from the project
 */
const BASE_LIBRARY_ASSETS: Asset[] = [
  // Demo Images - Using actual assets from /assets/resources/jpg-files/
  {
    id: 'lib-img-1',
    name: 'Sample Image 1',
    type: 'image',
    url: `${getAssetBasePath()}/resources/jpg-files/file_0.jpg`,
    thumbnail: `${getAssetBasePath()}/resources/jpg-files/file_0.jpg`,
    metadata: {
      source: 'library',
      category: 'demo',
      tags: ['sample', 'image', 'example'],
    },
  },
  {
    id: 'lib-img-2',
    name: 'Sample Image 2',
    type: 'image',
    url: `${getAssetBasePath()}/resources/jpg-files/file_1.jpg`,
    thumbnail: `${getAssetBasePath()}/resources/jpg-files/file_1.jpg`,
    metadata: {
      source: 'library',
      category: 'demo',
      tags: ['sample', 'image', 'production'],
    },
  },
  {
    id: 'lib-img-3',
    name: 'StoryCore Logo',
    type: 'image',
    url: `${getAssetBasePath()}/library/StorycoreIconeV2.png`,
    thumbnail: `${getAssetBasePath()}/library/StorycoreIconeV2.png`,
    metadata: {
      source: 'library',
      category: 'branding',
      tags: ['logo', 'branding', 'storycore'],
    },
  },
  
  // UI Assets - Using actual assets from /assets/resources/ui/
  {
    id: 'lib-ui-1',
    name: 'Panel Placeholder',
    type: 'image',
    url: `${getAssetBasePath()}/resources/ui/panel-placeholder-empty.svg`,
    thumbnail: `${getAssetBasePath()}/resources/ui/panel-placeholder-empty.svg`,
    metadata: {
      source: 'library',
      category: 'ui',
      tags: ['placeholder', 'panel', 'ui'],
    },
  },
  {
    id: 'lib-ui-2',
    name: 'Loading State',
    type: 'image',
    url: `${getAssetBasePath()}/resources/ui/panel-placeholder-loading.svg`,
    thumbnail: `${getAssetBasePath()}/resources/ui/panel-placeholder-loading.svg`,
    metadata: {
      source: 'library',
      category: 'ui',
      tags: ['loading', 'placeholder', 'ui'],
    },
  },
  {
    id: 'lib-ui-3',
    name: 'Toolbar Icons',
    type: 'image',
    url: `${getAssetBasePath()}/resources/ui/toolbar-icons.svg`,
    thumbnail: `${getAssetBasePath()}/resources/ui/toolbar-icons.svg`,
    metadata: {
      source: 'library',
      category: 'ui',
      tags: ['icons', 'toolbar', 'ui'],
    },
  },
  
  // Icons from /assets/resources/icons/
  {
    id: 'lib-icon-1',
    name: 'StoryCore Logo Square',
    type: 'image',
    url: `${getAssetBasePath()}/resources/icons/storycore-logo-square.svg`,
    thumbnail: `${getAssetBasePath()}/resources/icons/storycore-logo-square.svg`,
    metadata: {
      source: 'library',
      category: 'branding',
      tags: ['logo', 'branding', 'storycore', 'square'],
    },
  },
  {
    id: 'lib-icon-2',
    name: 'StoryCore Logo Horizontal',
    type: 'image',
    url: `${getAssetBasePath()}/resources/icons/storycore-logo-horizontal.svg`,
    thumbnail: `${getAssetBasePath()}/resources/icons/storycore-logo-horizontal.svg`,
    metadata: {
      source: 'library',
      category: 'branding',
      tags: ['logo', 'branding', 'storycore', 'horizontal'],
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
    
    console.log('[AssetLibraryService] Loaded', sources.length, 'sources with', 
      sources.reduce((acc, s) => acc + s.assets.length, 0), 'total assets');
    
    return sources;
  }
  
  /**
   * Load assets from user project
   */
  private async loadProjectAssets(projectPath: string): Promise<Asset[]> {
    try {
      // Try to load from Electron API (with type assertion)
      const electronProject = window.electronAPI?.project as Record<string, Function> | undefined;
      if (electronProject?.getAssets) {
        const assets = await electronProject.getAssets(projectPath) as Asset[];
        return assets;
      }
      
      // Fallback: Try to load from project.json
      if (electronProject?.load) {
        const project = await electronProject.load(projectPath) as { assets?: Asset[] };
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

    // Try to load from local assets folder (with type assertion)
    try {
      const electronAssets = window.electronAPI?.assets as Record<string, Function> | undefined;
      if (electronAssets?.scanFolder) {
        const libraryAssets = await electronAssets.scanFolder('/assets/library') as Asset[];
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
      // With type assertion for Electron API
      const electronAssets = window.electronAPI?.assets as Record<string, Function> | undefined;
      if (electronAssets?.scanFolder) {
        const assets = await electronAssets.scanFolder(folderPath) as Asset[];
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

