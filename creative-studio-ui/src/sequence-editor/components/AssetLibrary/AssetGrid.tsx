/**
 * Asset Grid Component
 * 
 * Displays assets in a grid layout with thumbnails and drag-and-drop support.
 * Requirements: 5.2, 5.3, 10.2, 10.4, 15.1, 15.2, 15.3, 15.4, 15.5, 15.6
 * 
 * FIX: All hooks are now called unconditionally at the top level BEFORE any early returns.
 * This prevents the "Rendered fewer hooks than expected" error.
 */

import React, { useCallback, useState, useMemo, useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { DraggableAsset } from './DraggableAsset';
import { TemplatePreview } from '../TemplatePreview';
import { PresetPreview } from '../PresetPreview';
import { MarketplacePublishDialog } from './MarketplacePublishDialog';
import { useTemplates } from '../../hooks/useTemplates';
import { useAppSelector } from '../../store';
import type { Asset, AssetType, ServiceAsset, ServiceAssetType } from '../../types';
import './assetLibrary.css';

interface AssetGridProps {
  assets: ServiceAsset[];
  categoryId: string;
  searchQuery: string;
  onPublish?: (asset: ServiceAsset) => void;
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
    createdAt: serviceAsset.createdAt || Date.now(),
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
  const [previewAsset, setPreviewAsset] = useState<ServiceAsset | null>(null);
  const [publishingAsset, setPublishingAsset] = useState<ServiceAsset | null>(null);
  
  // Hook 2: useAppSelector for timeline state
  // Called second to maintain consistent hook order
  const { selectedElements, shots } = useAppSelector((state) => state.timeline);
  
  // Hook 3: useTemplates for template operations
  // Called third to maintain consistent hook order
  const { applyTemplate, applyPreset } = useTemplates();

  // Hook 4: Virtualization state
  const parentRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);

  // Hook 5: Resize observer for grid responsiveness
  useEffect(() => {
    if (!parentRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    observer.observe(parentRef.current);
    return () => observer.disconnect();
  }, []);

  // Constants for grid calculation
  const GRID_COLUMN_MIN_WIDTH = 140;
  const GRID_GAP = 16;
  const ESTIMATED_ROW_HEIGHT = 240;

  // Calculate grid layout
  const columns = useMemo(() => {
    if (!containerWidth) return 1;
    return Math.max(1, Math.floor((containerWidth + GRID_GAP) / (GRID_COLUMN_MIN_WIDTH + GRID_GAP)));
  }, [containerWidth]);

  const rowCount = Math.ceil(assets.length / columns);

  // Hook 6: Virtualizer
  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    overscan: 3,
    initialRect: { width: 800, height: 600 },
  });

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

  const handlePublish = useCallback((asset: ServiceAsset) => {
    setPublishingAsset(asset);
  }, []);

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
      <div 
        ref={parentRef} 
        className="asset-grid-virtual-container"
        style={{
          height: '100%',
          overflowY: 'auto',
          width: '100%',
          position: 'relative'
        }}
      >
        <div
          className="asset-grid-scroll-content"
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const rowIndex = virtualRow.index;
            const startAssetIndex = rowIndex * columns;
            const rowAssets = assets.slice(startAssetIndex, startAssetIndex + columns);

            return (
              <div
                key={virtualRow.key}
                className="asset-grid-row"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                  display: 'grid',
                  gridTemplateColumns: `repeat(${columns}, 1fr)`,
                  gap: `${GRID_GAP}px`,
                  paddingBottom: `${GRID_GAP}px`
                }}
              >
                {rowAssets.map((asset) => (
                  <DraggableAsset
                    key={asset.id}
                    asset={asset}
                    categoryId={categoryId}
                    onPreview={handlePreview}
                    onPublish={handlePublish}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
                {/* Pad empty slots in the last row to maintain grid alignment */}
                {rowAssets.length < columns && 
                  Array.from({ length: columns - rowAssets.length }).map((_, i) => (
                    <div key={`empty-${i}`} className="asset-grid-spacer" />
                  ))
                }
              </div>
            );
          })}
        </div>
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
          onClose={() => setPreviewAsset(null)}
          onApply={handleApplyTemplate}
          selectedShotCount={selectedShotCount}
        />
      )}

      {/* Marketplace Publish Dialog */}
      {publishingAsset && (
        <MarketplacePublishDialog
          asset={publishingAsset}
          onClose={() => setPublishingAsset(null)}
        />
      )}
    </>
  );
};

export default AssetGrid;

