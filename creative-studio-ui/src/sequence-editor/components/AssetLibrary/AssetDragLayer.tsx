/**
 * Asset Drag Layer Component
 * 
 * Custom drag layer that displays a ghost image with asset thumbnail during drag operations.
 * Requirements: 15.1 - Display ghost image following cursor during drag
 */

import React from 'react';
import { useDragLayer, XYCoord } from 'react-dnd';
import { DND_ITEM_TYPES, type DraggedAssetItem } from './DraggableAsset';
import './assetLibrary.css';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get styles for the drag layer based on current drag state
 */
function getItemStyles(
  initialOffset: XYCoord | null,
  currentOffset: XYCoord | null
): React.CSSProperties {
  if (!initialOffset || !currentOffset) {
    return {
      display: 'none',
    };
  }

  const { x, y } = currentOffset;

  // Apply transform to follow cursor
  const transform = `translate(${x}px, ${y}px)`;

  return {
    transform,
    WebkitTransform: transform,
    // Position slightly offset from cursor for better visibility
    marginLeft: '10px',
    marginTop: '10px',
  };
}

// ============================================================================
// Component
// ============================================================================

export const AssetDragLayer: React.FC = () => {
  const {
    itemType,
    isDragging,
    item,
    initialOffset,
    currentOffset,
  } = useDragLayer((monitor) => ({
    item: monitor.getItem() as DraggedAssetItem | null,
    itemType: monitor.getItemType(),
    initialOffset: monitor.getInitialSourceClientOffset(),
    currentOffset: monitor.getSourceClientOffset(),
    isDragging: monitor.isDragging(),
  }));

  // Don't render if not dragging or wrong item type
  if (!isDragging || itemType !== DND_ITEM_TYPES.ASSET || !item) {
    return null;
  }

  return (
    <div className="asset-drag-layer">
      <div
        className="asset-drag-preview"
        style={getItemStyles(initialOffset, currentOffset)}
      >
        <AssetDragPreview asset={item.asset} />
      </div>
    </div>
  );
};

// ============================================================================
// Drag Preview Component
// ============================================================================

interface AssetDragPreviewProps {
  asset: DraggedAssetItem['asset'];
}

const AssetDragPreview: React.FC<AssetDragPreviewProps> = ({ asset }) => {
  return (
    <div className="asset-drag-preview-content">
      {/* Thumbnail */}
      <div className="asset-drag-thumbnail">
        <img
          src={asset.thumbnailUrl}
          alt={asset.name}
          onError={(e) => {
            // Fallback for missing images
            (e.target as HTMLImageElement).src =
              'data:image/svg+xml,' +
              encodeURIComponent(`
              <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
                <rect fill="#3a3a3a" width="80" height="80"/>
                <text fill="#666" font-family="sans-serif" font-size="10" x="50%" y="50%" text-anchor="middle" dy=".3em">No Preview</text>
              </svg>
            `);
          }}
        />
        
        {/* Drag indicator overlay */}
        <div className="drag-preview-overlay">
          <span className="drag-icon">🎯</span>
        </div>
      </div>

      {/* Asset name */}
      <div className="asset-drag-info">
        <span className="asset-drag-name">{asset.name}</span>
        <span className="asset-drag-type">{asset.type}</span>
      </div>
    </div>
  );
};

export default AssetDragLayer;
