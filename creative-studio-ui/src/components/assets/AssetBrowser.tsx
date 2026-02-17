/**
 * Asset Browser Component
 * 
 * Displays the prompt library assets in a browsable interface
 * Allows filtering by category and searching
 */

import React, { useState, useMemo } from 'react';
import { usePromptLibrary } from '@/hooks/usePromptLibrary';
import { PromptTemplate } from '@/library/PromptLibraryService';
import { Search, Loader2, AlertCircle, Folder, Tag } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface AssetBrowserProps {
  onSelectAsset?: (asset: PromptTemplate) => void;
  selectedAssetId?: string;
  filterCategories?: string[];
  className?: string;
}

// ============================================================================
// Category Display Names
// ============================================================================

const CATEGORY_NAMES: Record<string, string> = {
  '01-master-coherence': '🎨 Master Coherence',
  '02-genres': '🎬 Genres',
  '03-shot-types': '📹 Shot Types',
  '04-lighting': '💡 Lighting',
  '05-scene-elements': '🏗️ Scene Elements',
  '06-visual-styles': '🖼️ Visual Styles',
  '07-camera-angles': '📐 Camera Angles',
  '08-camera-movements': '🎥 Camera Movements',
  '09-mood-atmosphere': '🌟 Mood & Atmosphere',
  '10-time-of-day': '🌅 Time of Day',
  '11-transitions': '🔄 Transitions',
  '12-color-palettes': '🎨 Color Palettes',
  '13-universe-types': '🌍 Universe Types',
  '14-character-archetypes': '👤 Character Archetypes',
};

// ============================================================================
// Component
// ============================================================================

export function AssetBrowser({
  onSelectAsset,
  selectedAssetId,
  filterCategories,
  className = '',
}: AssetBrowserProps) {
  const {
    isLoading,
    error,
    categories,
    totalPrompts,
    search,
  } = usePromptLibrary();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PromptTemplate[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Filter categories if specified
  const availableCategories = useMemo(() => {
    const cats = Object.keys(categories);
    if (filterCategories && filterCategories.length > 0) {
      return cats.filter(cat => filterCategories.includes(cat));
    }
    return cats;
  }, [categories, filterCategories]);

  // Handle search
  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      const results = await search(query);
      setSearchResults(results);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle category selection
  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategory(categoryId === selectedCategory ? null : categoryId);
    setSearchQuery('');
    setSearchResults([]);
  };

  // Handle asset selection
  const handleAssetClick = (asset: PromptTemplate) => {
    onSelectAsset?.(asset);
  };

  // Get assets to display
  const displayAssets = useMemo(() => {
    if (searchQuery && searchResults.length > 0) {
      return searchResults;
    }

    if (selectedCategory && categories[selectedCategory]) {
      // Would need to load category prompts here
      return [];
    }

    return [];
  }, [searchQuery, searchResults, selectedCategory, categories]);

  // Loading state
  if (isLoading) {
    return (
      <div className={`asset-browser flex items-center justify-center p-8 ${className}`}>
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-500" />
          <p className="text-sm text-gray-600">Loading asset library...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`asset-browser flex items-center justify-center p-8 ${className}`}>
        <div className="text-center text-red-600">
          <AlertCircle className="h-8 w-8 mx-auto mb-2" />
          <p className="text-sm font-medium">Failed to load assets</p>
          <p className="text-xs mt-1">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`asset-browser flex flex-col h-full bg-white dark:bg-gray-900 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Asset Library</h3>
          <span className="text-xs text-gray-500">{totalPrompts} assets</span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700"
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {searchQuery && searchResults.length > 0 ? (
          /* Search Results */
          <div className="p-4 space-y-2">
            <p className="text-sm text-gray-600 mb-3">
              {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
            </p>
            {searchResults.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                isSelected={asset.id === selectedAssetId}
                onClick={() => handleAssetClick(asset)}
              />
            ))}
          </div>
        ) : searchQuery && !isSearching ? (
          /* No Results */
          <div className="flex items-center justify-center p-8 text-gray-500">
            <div className="text-center">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No assets found</p>
            </div>
          </div>
        ) : (
          /* Category List */
          <div className="p-4 space-y-2">
            {availableCategories.map((categoryId) => (
              <CategoryItem
                key={categoryId}
                categoryId={categoryId}
                category={categories[categoryId]}
                isSelected={categoryId === selectedCategory}
                onClick={() => handleCategoryClick(categoryId)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Category Item Component
// ============================================================================

interface CategoryItemProps {
  categoryId: string;
  category: any;
  isSelected: boolean;
  onClick: () => void;
}

function CategoryItem({ categoryId, category, isSelected, onClick }: CategoryItemProps) {
  const displayName = CATEGORY_NAMES[categoryId] || categoryId;
  const promptCount = category?.prompts?.length || 0;

  return (
    <button
      onClick={onClick}
      className={`
        w-full p-3 rounded-lg border text-left transition-all
        ${isSelected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:bg-gray-50 dark:hover:bg-gray-800'
        }
      `}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Folder className="h-4 w-4 text-gray-400" />
          <span className="font-medium text-sm">{displayName}</span>
        </div>
        <span className="text-xs text-gray-500">{promptCount}</span>
      </div>
      {category?.description && (
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 ml-6">
          {category.description}
        </p>
      )}
    </button>
  );
}

// ============================================================================
// Asset Card Component
// ============================================================================

interface AssetCardProps {
  asset: PromptTemplate;
  isSelected: boolean;
  onClick: () => void;
}

function AssetCard({ asset, isSelected, onClick }: AssetCardProps) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full p-3 rounded-lg border text-left transition-all
        ${isSelected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:bg-gray-50 dark:hover:bg-gray-800'
        }
      `}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-sm">{asset.name}</h4>
        {isSelected && (
          <svg className="w-5 h-5 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )}
      </div>

      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
        {asset.description}
      </p>

      {asset.tags && asset.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {asset.tags.slice(0, 3).map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs"
            >
              <Tag className="h-3 w-3" />
              {tag}
            </span>
          ))}
          {asset.tags.length > 3 && (
            <span className="text-xs text-gray-500">+{asset.tags.length - 3}</span>
          )}
        </div>
      )}
    </button>
  );
}

