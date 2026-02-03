/**
 * Draggable Asset Component
 * 
 * Enhanced asset card with drag-and-drop support, ghost images, and drag previews.
 * Requirements: 15.1 - Drag-and-drop interaction system
 */

import React, { useCallback } from 'react';
import { useDrag } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { LazyImage } from './LazyImage';
import './assetLibrary.css';

// ============================================================================
// Constants
// ============================================================================

export const DND_ITEM_TYPES = {
  ASSET: 'asset',
} as const;

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

// ============================================================================
// Types
// ============================================================================

export interface DraggedAssetItem {
  asset: ServiceAsset;
  categoryId: string;
  type: typeof DND_ITEM_TYPES.ASSET;
}

interface DraggableAssetProps {
  asset: ServiceAsset;
  categoryId: string;
  onPreview?: (asset: ServiceAsset) => void;
  onEdit?: (asset: ServiceAsset) => void;
  onDelete?: (asset: ServiceAsset) => void;
}

// ============================================================================
// Component
// ============================================================================

export const DraggableAsset: React.FC<DraggableAssetProps> = ({
  asset,
  categoryId,
  onPreview,
  onEdit,
  onDelete,
}) => {
  // Set up drag functionality with custom preview
  const [{ isDragging }, drag, preview] = useDrag<
    DraggedAssetItem,
    void,
    { isDragging: boolean }
  >(
    () => ({
      type: DND_ITEM_TYPES.ASSET,
      item: {
        asset,
        categoryId,
        type: DND_ITEM_TYPES.ASSET,
      },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
      // Optional: Add drag end handler
      end: (item, monitor) => {
        const didDrop = monitor.didDrop();
        if (!didDrop) {
          console.log('Asset drag cancelled:', asset.name);
        }
      },
    }),
    [asset, categoryId]
  );

  // Hide the default HTML5 drag preview (we'll use a custom one)
  React.useEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: true });
  }, [preview]);

  // Event handlers
  const handleClick = useCallback(() => {
    console.log('Asset clicked:', asset.name);
  }, [asset]);

  const handleDoubleClick = useCallback(() => {
    if (onEdit) {
      onEdit(asset);
    }
  }, [asset, onEdit]);

  const handlePreview = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onPreview) {
        onPreview(asset);
      }
    },
    [asset, onPreview]
  );

  const handleEdit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onEdit) {
        onEdit(asset);
      }
    },
    [asset, onEdit]
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onDelete) {
        onDelete(asset);
      }
    },
    [asset, onDelete]
  );

  // Get description from metadata or fallback
  const description = asset.metadata?.description || '';

  // Get tags from metadata or direct property
  const tags = asset.tags || asset.metadata?.tags || [];
  const assetSource = asset.source || 'builtin';

  return (
    <div
      ref={drag as unknown as React.LegacyRef<HTMLDivElement>}
      className={`asset-card ${isDragging ? 'dragging' : ''}`}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      style={{
        opacity: isDragging ? 0.4 : 1,
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
      data-asset-id={asset.id}
      data-asset-type={asset.type}
    >
      {/* Thumbnail */}
      <div className="asset-thumbnail">
        <LazyImage
          src={asset.thumbnailUrl || asset.thumbnail}
          alt={asset.name}
          onError={(e) => {
            // Fallback for missing images
            (e.target as HTMLImageElement).src =
              'data:image/svg+xml,' +
              encodeURIComponent(`
              <svg xmlns="http://www.w3.org/2000/svg" width="150" height="150" viewBox="0 0 150 150">
                <rect fill="#3a3a3a" width="150" height="150"/>
                <text fill="#666" font-family="sans-serif" font-size="14" x="50%" y="50%" text-anchor="middle" dy=".3em">No Preview</text>
              </svg>
            `);
          }}
        />

        {/* Source indicator */}
        <div className={`asset-source ${assetSource}`} title={assetSource}>
          {assetSource === 'ai-generated' && '✨'}
          {assetSource === 'user' && '👤'}
          {(assetSource === 'builtin' || !assetSource) && '📦'}
        </div>

        {/* Drag indicator */}
        {isDragging && (
          <div className="asset-drag-indicator">
            <span>🎯</span>
          </div>
        )}
      </div>

      {/* Asset info */}
      <div className="asset-info">
        <h4 className="asset-name" title={asset.name}>
          {asset.name}
        </h4>
        <p className="asset-description">
          {description.substring(0, 50)}
          {description.length > 50 && '...'}
        </p>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="asset-tags">
            {tags.slice(0, 3).map((tag: string) => (
              <span key={tag} className="asset-tag">
                {tag}
              </span>
            ))}
            {tags.length > 3 && (
              <span className="asset-tag more">+{tags.length - 3}</span>
            )}
          </div>
        )}
      </div>

      {/* Hover overlay */}
      <div className="asset-overlay">
        <button
          className="overlay-btn"
          onClick={handlePreview}
          title="Preview"
          aria-label={`Preview ${asset.name}`}
        >
          👁️
        </button>
        <button
          className="overlay-btn"
          onClick={handleEdit}
          title="Edit"
          aria-label={`Edit ${asset.name}`}
        >
          ✏️
        </button>
        <button
          className="overlay-btn"
          onClick={handleDelete}
          title="Delete"
          aria-label={`Delete ${asset.name}`}
        >
          🗑️
        </button>
      </div>
    </div>
  );
};

export default DraggableAsset;

