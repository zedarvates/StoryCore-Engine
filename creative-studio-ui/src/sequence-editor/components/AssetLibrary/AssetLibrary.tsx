/**
 * Asset Library Component
 * 
 * Categorized asset browser with search, drag-and-drop, and AI generation.
 * Requirements: 5.1, 5.2, 5.3, 5.7, 5.8, 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import Fuse from 'fuse.js';
import { AssetGrid } from './AssetGrid';
import { TransitionLibrary } from './TransitionLibrary';
import { EffectLibrary } from './EffectLibrary';
import { AssetGenerationDialog } from './AssetGenerationDialog';
import { AssetDragLayer } from './AssetDragLayer';
import { AssetLibraryService, type AssetSource } from '../../../services/assetLibraryService';
import './assetLibrary.css';

// ============================================================================
// Local Asset type compatible with both the service and sequence-editor
// ============================================================================

// Asset type from the service (original format)
type ServiceAssetType = 'image' | 'audio' | 'video' | 'template';

interface ServiceAssetMetadata {
  description?: string;
  author?: string;
  license?: string;
  source?: string;
  category?: string;
  tags?: string[];
  duration?: number;
  [key: string]: unknown;
}

interface ServiceAsset {
  id: string;
  name: string;
  type: ServiceAssetType;
  url?: string;
  thumbnail?: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  metadata?: ServiceAssetMetadata;
  category?: string;
  subcategory?: string;
  tags?: string[];
  source?: 'builtin' | 'user' | 'ai-generated';
  createdAt?: Date;
}

// ============================================================================
// Category Configuration (without assets - populated dynamically)
// ============================================================================

interface CategoryConfig {
  id: string;
  name: string;
  icon: string;
}

const CATEGORY_CONFIGS: CategoryConfig[] = [
  { id: 'characters', name: 'Characters', icon: '👤' },
  { id: 'environments', name: 'Environments', icon: '🏔️' },
  { id: 'props', name: 'Props & Objects', icon: '📦' },
  { id: 'visual-styles', name: 'Visual Styles', icon: '🎨' },
  { id: 'templates', name: 'Templates', icon: '📋' },
  { id: 'camera-presets', name: 'Camera Presets', icon: '📷' },
  { id: 'transitions', name: 'Transitions', icon: '↔️' },
  { id: 'effects', name: 'Effects', icon: '✨' },
  { id: 'audio-sound', name: 'Audio & Sound', icon: '🔊' },
];

// Helper to get assets for a category from all sources
function getAssetsForCategory(categoryId: string, sources: AssetSource[]): ServiceAsset[] {
  const allAssets: ServiceAsset[] = [];

  for (const source of sources) {
    const sourceAssets = source.assets || [];

    switch (categoryId) {
      case 'characters':
        // Characters: images from characters folder or with character metadata
        allAssets.push(...sourceAssets.filter(a =>
          a.type === 'image' && (
            source.id === 'characters' ||
            a.metadata?.category === 'character' ||
            (Array.isArray(a.metadata?.tags) && a.metadata.tags.includes('character'))
          )
        ));
        break;

      case 'environments':
        // Environments: images from images folder (demo images)
        allAssets.push(...sourceAssets.filter(a =>
          a.type === 'image' && (
            source.id === 'library' ||
            source.id === 'images' ||
            a.metadata?.category === 'demo' ||
            a.metadata?.category === 'environment' ||
            (Array.isArray(a.metadata?.tags) && (
              a.metadata.tags.includes('environment') ||
              a.metadata.tags.includes('scene')
            ))
          )
        ));
        break;

      case 'props':
        // Props: images that aren't characters or environments
        allAssets.push(...sourceAssets.filter(a =>
          a.type === 'image' && (
            a.metadata?.category === 'props' ||
            (Array.isArray(a.metadata?.tags) && (
              a.metadata.tags.includes('prop') ||
              a.metadata.tags.includes('object')
            ))
          )
        ));
        break;

      case 'visual-styles':
        // Visual styles: images with style tags
        allAssets.push(...sourceAssets.filter(a =>
          a.type === 'image' && (
            a.metadata?.category === 'style' ||
            (Array.isArray(a.metadata?.tags) && (
              a.metadata.tags.includes('style') ||
              a.metadata.tags.includes('visual')
            ))
          )
        ));
        break;

      case 'templates':
        // Templates: template type assets
        allAssets.push(...sourceAssets.filter(a =>
          a.type === 'template' || source.type === 'template'
        ));
        break;

      case 'camera-presets':
        // Camera presets: JSON/shots data with camera settings
        allAssets.push(...sourceAssets.filter(a =>
          a.type === 'image' && (
            a.name.includes('camera') ||
            a.name.includes('shot')
          )
        ));
        break;

      case 'transitions':
        // Transitions: built-in transition types
        allAssets.push(...sourceAssets.filter(a =>
          a.type === 'template' && (
            a.name.includes('transition') ||
            a.metadata?.category === 'transition'
          )
        ));
        // Add default transitions if list is empty
        if (allAssets.length === 0 && source.id === 'builtin') {
          ['Dissolve', 'Wipe', 'Slide', 'Zoom', 'Smooth Cut'].forEach(name => {
            allAssets.push({
              id: `trans_${name.toLowerCase().replace(' ', '_')}`,
              name,
              type: 'template',
              metadata: { category: 'transition' }
            });
          });
        }
        break;

      case 'effects':
        // Effects: LUTs, filters, and other visual effects
        allAssets.push(...sourceAssets.filter(a =>
          a.type === 'template' && (
            a.name.includes('effect') ||
            a.metadata?.category === 'effect' ||
            a.metadata?.category === 'lut'
          )
        ));
        break;

      case 'audio-sound':
        // Audio & sound: audio type assets
        allAssets.push(...sourceAssets.filter(a =>
          a.type === 'audio' || source.id === 'sound'
        ));
        break;
    }
  }

  return allAssets;
}

// ============================================================================
// Component
// ============================================================================

export const AssetLibrary: React.FC = () => {
  const [sources, setSources] = useState<AssetSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState('environments');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [showGenerationDialog, setShowGenerationDialog] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load assets on mount
  useEffect(() => {
    const loadAssets = async () => {
      try {
        setLoading(true);
        setError(null);
        const assetService = AssetLibraryService.getInstance();
        const loadedSources = await assetService.getAllAssets();
        setSources(loadedSources);
        console.log('[AssetLibrary] Loaded', loadedSources.length, 'sources');
      } catch (err) {
        console.error('[AssetLibrary] Failed to load assets:', err);
        setError(err instanceof Error ? err.message : 'Failed to load assets');
      } finally {
        setLoading(false);
      }
    };

    loadAssets();
  }, []);

  // Debounce search query updates
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery]);

  // Get current category config
  const currentCategory = CATEGORY_CONFIGS.find((c) => c.id === activeCategory) || CATEGORY_CONFIGS[0];

  // Get assets for current category
  const categoryAssets = useMemo(() => {
    return getAssetsForCategory(activeCategory, sources);
  }, [activeCategory, sources]);

  // Configure Fuse.js for fuzzy search
  const fuse = useMemo(() => {
    if (categoryAssets.length === 0) return null;

    return new Fuse(categoryAssets, {
      keys: [
        { name: 'name', weight: 0.5 },
        { name: 'metadata.tags', weight: 0.3 },
        { name: 'metadata.description', weight: 0.2 },
      ],
      threshold: 0.4,
      includeScore: true,
      minMatchCharLength: 2,
    });
  }, [categoryAssets]);

  // Filtered assets based on search
  const filteredAssets = useMemo(() => {
    if (!debouncedQuery.trim()) {
      return categoryAssets;
    }

    if (fuse) {
      const results = fuse.search(debouncedQuery);
      return results.map((result) => result.item);
    }

    // Fallback to simple search
    const query = debouncedQuery.toLowerCase();
    return categoryAssets.filter((asset) =>
      asset.name.toLowerCase().includes(query) ||
      (Array.isArray(asset.metadata?.tags) && asset.metadata.tags.some((tag: string) => tag.toLowerCase().includes(query))) ||
      (asset.metadata?.description && asset.metadata.description.toLowerCase().includes(query))
    );
  }, [categoryAssets, debouncedQuery, fuse]);

  // Handle search input
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  // Handle category selection
  const handleCategorySelect = useCallback((categoryId: string) => {
    setActiveCategory(categoryId);
  }, []);

  // Handle AI asset generation button click
  const handleGenerateAssetClick = useCallback(() => {
    setShowGenerationDialog(true);
  }, []);

  // Close generation dialog
  const handleCloseGenerationDialog = useCallback(() => {
    setShowGenerationDialog(false);
  }, []);

  // Retry loading assets
  const handleRetry = useCallback(() => {
    const loadAssets = async () => {
      try {
        setLoading(true);
        setError(null);
        const assetService = AssetLibraryService.getInstance();
        const loadedSources = await assetService.getAllAssets();
        setSources(loadedSources);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load assets');
      } finally {
        setLoading(false);
      }
    };
    loadAssets();
  }, []);

  return (
    <div className="asset-library">
      {/* Custom Drag Layer for ghost images */}
      <AssetDragLayer />

      {/* Category Tabs */}
      <div className="asset-library-tabs">
        {CATEGORY_CONFIGS.map((category) => (
          <button
            key={category.id}
            className={`asset-category-tab ${activeCategory === category.id ? 'active' : ''}`}
            onClick={() => handleCategorySelect(category.id)}
            title={category.name}
          >
            <span className="category-icon">{category.icon}</span>
            <span className="category-name">{category.name}</span>
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className={`asset-library-search ${isSearchFocused ? 'focused' : ''}`}>
        <input
          type="text"
          placeholder="Search assets by name, tags, or description..."
          value={searchQuery}
          onChange={handleSearchChange}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => setIsSearchFocused(false)}
          className="search-input"
          aria-label="Search assets"
        />
        {searchQuery && searchQuery !== debouncedQuery && (
          <span className="search-loading" title="Searching...">
            ⏳
          </span>
        )}
        {searchQuery && (
          <button
            className="search-clear-btn"
            onClick={() => setSearchQuery('')}
            title="Clear search"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {/* Content Area */}
      <div className="asset-library-content">
        {loading && (
          <div className="asset-loading">
            <div className="loading-spinner">⏳</div>
            <p>Loading assets...</p>
          </div>
        )}

        {error && !loading && (
          <div className="asset-error">
            <div className="error-icon">⚠️</div>
            <p>{error}</p>
            <button className="retry-button" onClick={handleRetry}>
              Retry
            </button>
          </div>
        )}

        {!loading && !error && activeCategory === 'transitions' && (
          <TransitionLibrary
            sources={sources}
            searchQuery={searchQuery}
          />
        )}

        {!loading && !error && activeCategory === 'effects' && (
          <EffectLibrary
            sources={sources}
            searchQuery={searchQuery}
          />
        )}

        {!loading && !error && activeCategory !== 'transitions' && activeCategory !== 'effects' && (
          <AssetGrid
            assets={filteredAssets}
            categoryId={currentCategory.id}
            searchQuery={searchQuery}
          />
        )}
      </div>

      {/* New AI Asset Button */}
      <div className="asset-library-footer">
        <button
          className="new-asset-button"
          onClick={handleGenerateAssetClick}
        >
          <span className="new-asset-icon">✨</span>
          <span>New AI Asset</span>
        </button>
      </div>

      {/* AI Asset Generation Dialog */}
      {showGenerationDialog && (
        <AssetGenerationDialog
          onClose={handleCloseGenerationDialog}
          defaultCategory={currentCategory.id}
        />
      )}
    </div>
  );
};

export default AssetLibrary;

