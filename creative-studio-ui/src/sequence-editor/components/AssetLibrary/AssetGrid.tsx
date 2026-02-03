/**
 * Asset Grid Component
 * 
 * Displays assets in a grid layout with thumbnails and drag-and-drop support.
 * Requirements: 5.2, 5.3, 10.2, 10.4, 15.1, 15.2, 15.3, 15.4, 15.5, 15.6
 * 
 * FIX: All hooks are now called unconditionally at the top level BEFORE any early returns.
 * This prevents the "Rendered fewer hooks than expected" error.
 */

import React, { useCallback, useState, useMemo } from 'react';
import { DraggableAsset } from './DraggableAsset';
import { TemplatePreview } from '../TemplatePreview';
import { PresetPreview } from '../PresetPreview';
import { useTemplates } from '../../hooks/useTemplates';
import { useAppSelector } from '../../store';
import type { Asset, AssetType } from '../../types';
import './assetLibrary.css';

// ============================================================================
// Local Asset type (matching AssetLibrary.tsx)
// ============================================================================

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

interface AssetGridProps {
  assets: ServiceAsset[];
  categoryId: string;
  searchQuery: string;
}

// ============================================================================
// Type Conversion Helper
// ============================================================================

/**
 * Convert ServiceAsset to Asset type for use with TemplatePreview/PresetPreview
 */
function convertToAsset(serviceAsset: ServiceAsset): Asset {
  // Map ServiceAssetType to AssetType
  const assetTypeMap: Record<ServiceAssetType, AssetType> = {
    'image': 'character',
    'audio': 'camera-preset',
    'video': 'prop',
    'template': 'template',
  };

  return {
    id: serviceAsset.id,
    name: serviceAsset.name,
    type: assetTypeMap[serviceAsset.type] || 'prop',
    category: serviceAsset.category || 'general',
    subcategory: serviceAsset.subcategory,
    thumbnailUrl: serviceAsset.thumbnailUrl || serviceAsset.thumbnail || '',
    previewUrl: serviceAsset.previewUrl,
    metadata: {
      description: serviceAsset.metadata?.description || '',
      author: serviceAsset.metadata?.author,
      license: serviceAsset.metadata?.license,
      tags: serviceAsset.tags || serviceAsset.metadata?.tags || [],
    },
    tags: serviceAsset.tags || serviceAsset.metadata?.tags || [],
    source: serviceAsset.source || 'builtin',
    createdAt: serviceAsset.createdAt || new Date(),
  };
}

export const AssetGrid: React.FC<AssetGridProps> = ({
  assets,
  categoryId,
  searchQuery,
}) => {
  // ============================================================================
  // STEP 1: ALL HOOKS MUST BE CALLED UNCONDITIONALLY AT THE TOP LEVEL
  // This is the critical fix - hooks must always be called in the same order
  // ============================================================================
  
  // Hook 1: useState for preview management
  // Called first to ensure consistent hook order
  const [previewAsset, setPreviewAsset] = useState<ServiceAsset | null>(null);
  
  // Hook 2: useAppSelector for timeline state
  // Called second to maintain consistent hook order
  const { selectedElements, shots } = useAppSelector((state) => state.timeline);
  
  // Hook 3: useTemplates for template operations
  // Called third to maintain consistent hook order
  const { applyTemplate, applyPreset } = useTemplates();

  // ============================================================================
  // STEP 2: COMPUTED VALUES (safe to calculate after hooks)
  // These are derived state, not hooks, so order doesn't matter
  // ============================================================================
  
  // Calculate selected shot count
  const selectedShotCount = useMemo(() => 
    shots.filter((shot: { id: string }) => selectedElements.includes(shot.id)).length,
    [shots, selectedElements]
  );

  // Determine which preview to show
  const isNarrativePreset = useMemo(() => 
    previewAsset?.subcategory === 'narrative',
    [previewAsset]
  );

  // ============================================================================
  // STEP 3: EVENT HANDLERS (useCallback hooks)
  // These are additional hooks but they depend on the state above
  // ============================================================================
  
  // Asset action handlers - defined AFTER all primary hooks
  const handlePreview = useCallback((asset: ServiceAsset) => {
    // Show template/preset preview for templates
    if (asset.type === 'template') {
      setPreviewAsset(asset);
    } else {
      console.log('Preview asset:', asset.name);
      // TODO: Implement asset preview modal for other types
    }
  }, []);

  const handleEdit = useCallback((asset: ServiceAsset) => {
    console.log('Edit asset:', asset.name);
    // TODO: Implement asset editor
  }, []);

  const handleDelete = useCallback((asset: ServiceAsset) => {
    console.log('Delete asset:', asset.name);
    // TODO: Implement asset deletion with confirmation
  }, []);

  const handleApplyTemplate = useCallback(() => {
    if (!previewAsset) return;

    if (previewAsset.type === 'template') {
      const assetForApply = convertToAsset(previewAsset);
      if (previewAsset.subcategory === 'narrative') {
        applyPreset(assetForApply);
      } else {
        applyTemplate(assetForApply);
      }
    }

    setPreviewAsset(null);
  }, [previewAsset, applyTemplate, applyPreset]);

  // ============================================================================
  // STEP 4: EARLY RETURNS (only after ALL hooks are defined)
  // Now it's safe to return early since all hooks have been called
  // ============================================================================
  
  // Handle empty state
  if (assets.length === 0) {
    return (
      <div className="asset-grid-empty">
        <div className="empty-icon">
          {searchQuery ? '🔍' : '📁'}
        </div>
        <p className="empty-message">
          {searchQuery
            ? `No assets found for "${searchQuery}"`
            : 'No assets in this category'}
        </p>
        {searchQuery && (
          <button
            className="empty-action-btn"
            onClick={() => {
              // Clear search would be handled via parent
            }}
          >
            Clear Search
          </button>
        )}
      </div>
    );
  }

  // ============================================================================
  // STEP 5: RENDER (only after early returns)
  // ============================================================================
  
  return (
    <>
      <div className="asset-grid">
        {assets.map((asset) => (
          <DraggableAsset
            key={asset.id}
            asset={asset}
            categoryId={categoryId}
            onPreview={handlePreview}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {/* Template Preview Dialog */}
      {previewAsset && previewAsset.type === 'template' && !isNarrativePreset && (
        <TemplatePreview
          asset={convertToAsset(previewAsset)}
          onClose={() => setPreviewAsset(null)}
          onApply={handleApplyTemplate}
        />
      )}

      {/* Preset Preview Dialog */}
      {previewAsset && previewAsset.type === 'template' && isNarrativePreset && (
        <PresetPreview
          asset={convertToAsset(previewAsset)}
          selectedShotCount={selectedShotCount}
          onClose={() => setPreviewAsset(null)}
          onApply={handleApplyTemplate}
        />
      )}
    </>
  );
};

export default AssetGrid;

