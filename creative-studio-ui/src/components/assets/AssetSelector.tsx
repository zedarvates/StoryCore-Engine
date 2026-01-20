/**
 * Asset Selector Component
 * 
 * Simple dropdown/modal selector for choosing assets from specific categories
 * Optimized for use in wizards and forms
 */

import React, { useState, useEffect } from 'react';
import { PromptTemplate } from '@/library/PromptLibraryService';
import { useCategoryPrompts } from '@/hooks/usePromptLibrary';
import { ChevronDown, Loader2, AlertCircle, Check } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface AssetSelectorProps {
  categoryId: string;
  selectedAssetId?: string;
  onSelect: (asset: PromptTemplate) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  disabled?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function AssetSelector({
  categoryId,
  selectedAssetId,
  onSelect,
  placeholder = 'Select an asset...',
  label,
  className = '',
  disabled = false,
}: AssetSelectorProps) {
  const { prompts, isLoading, error } = useCategoryPrompts(categoryId);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedAsset = prompts.find(p => p.id === selectedAssetId);

  // Filter prompts based on search
  const filteredPrompts = searchQuery
    ? prompts.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : prompts;

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.asset-selector-dropdown')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelect = (asset: PromptTemplate) => {
    onSelect(asset);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className={`asset-selector ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
        </label>
      )}

      <div className="relative asset-selector-dropdown">
        {/* Trigger Button */}
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled || isLoading}
          className={`
            w-full px-4 py-2 text-left border rounded-lg flex items-center justify-between
            transition-colors
            ${disabled || isLoading
              ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-50'
              : 'bg-white dark:bg-gray-900 hover:border-blue-400 cursor-pointer'
            }
            ${isOpen ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-300 dark:border-gray-700'}
          `}
        >
          <span className={selectedAsset ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500'}>
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </span>
            ) : selectedAsset ? (
              selectedAsset.name
            ) : (
              placeholder
            )}
          </span>
          <ChevronDown
            className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''}`}
          />
        </button>

        {/* Dropdown */}
        {isOpen && !isLoading && !error && (
          <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg max-h-80 overflow-hidden flex flex-col">
            {/* Search */}
            <div className="p-2 border-b dark:border-gray-700">
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700"
                autoFocus
              />
            </div>

            {/* Options List */}
            <div className="overflow-y-auto flex-1">
              {filteredPrompts.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  No assets found
                </div>
              ) : (
                filteredPrompts.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => handleSelect(asset)}
                    className={`
                      w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800
                      transition-colors border-b border-gray-100 dark:border-gray-800 last:border-b-0
                      ${asset.id === selectedAssetId ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                    `}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-gray-900 dark:text-gray-100 mb-1">
                          {asset.name}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                          {asset.description}
                        </div>
                        {asset.tags && asset.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {asset.tags.slice(0, 2).map((tag, index) => (
                              <span
                                key={index}
                                className="inline-block px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      {asset.id === selectedAssetId && (
                        <Check className="h-5 w-5 text-blue-500 flex-shrink-0" />
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Error State */}
        {error && isOpen && (
          <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-900 border border-red-300 dark:border-red-700 rounded-lg shadow-lg p-4">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <div>
                <p className="text-sm font-medium">Failed to load assets</p>
                <p className="text-xs mt-1">{error.message}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Selected Asset Details (Optional) */}
      {selectedAsset && !isOpen && (
        <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {selectedAsset.description}
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Quick Access Components for Common Categories
// ============================================================================

export function ShotTypeSelector(props: Omit<AssetSelectorProps, 'categoryId'>) {
  return <AssetSelector {...props} categoryId="03-shot-types" label="Shot Type" />;
}

export function CameraAngleSelector(props: Omit<AssetSelectorProps, 'categoryId'>) {
  return <AssetSelector {...props} categoryId="07-camera-angles" label="Camera Angle" />;
}

export function CameraMovementSelector(props: Omit<AssetSelectorProps, 'categoryId'>) {
  return <AssetSelector {...props} categoryId="08-camera-movements" label="Camera Movement" />;
}

export function LightingSelector(props: Omit<AssetSelectorProps, 'categoryId'>) {
  return <AssetSelector {...props} categoryId="04-lighting" label="Lighting" />;
}

export function MoodSelector(props: Omit<AssetSelectorProps, 'categoryId'>) {
  return <AssetSelector {...props} categoryId="09-mood-atmosphere" label="Mood & Atmosphere" />;
}

export function TimeOfDaySelector(props: Omit<AssetSelectorProps, 'categoryId'>) {
  return <AssetSelector {...props} categoryId="10-time-of-day" label="Time of Day" />;
}

export function VisualStyleSelector(props: Omit<AssetSelectorProps, 'categoryId'>) {
  return <AssetSelector {...props} categoryId="06-visual-styles" label="Visual Style" />;
}

export function GenreSelector(props: Omit<AssetSelectorProps, 'categoryId'>) {
  return <AssetSelector {...props} categoryId="02-genres" label="Genre" />;
}

export function TransitionSelector(props: Omit<AssetSelectorProps, 'categoryId'>) {
  return <AssetSelector {...props} categoryId="11-transitions" label="Transition" />;
}

export function ColorPaletteSelector(props: Omit<AssetSelectorProps, 'categoryId'>) {
  return <AssetSelector {...props} categoryId="12-color-palettes" label="Color Palette" />;
}
