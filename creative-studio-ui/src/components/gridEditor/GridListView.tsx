/**
 * GridListView Component
 * 
 * Optimized list view for small screens (< 1024px).
 * Provides a vertical scrolling list with touch-friendly interactions.
 * 
 * Exigence: 12.2
 */

import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import type { GridPanel } from '../../types/gridEditorAdvanced';
import './GridListView.css';

export interface GridListViewProps {
  items: GridPanel[];
  onItemClick?: (item: GridPanel) => void;
  onLayoutChange?: (items: GridPanel[]) => void;
  selectedIds?: string[];
}

export const GridListView: React.FC<GridListViewProps> = ({
  items,
  onItemClick,
  onLayoutChange,
  selectedIds = []
}) => {
  const handleItemClick = useCallback((item: GridPanel) => {
    onItemClick?.(item);
  }, [onItemClick]);

  const handleItemMove = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;

    const newItems = [...items];
    const [movedItem] = newItems.splice(fromIndex, 1);
    newItems.splice(toIndex, 0, movedItem);

    onLayoutChange?.(newItems);
  }, [items, onLayoutChange]);

  return (
    <div className="grid-list-view">
      {items.map((item, index) => (
        <GridListItem
          key={item.id}
          item={item}
          index={index}
          isSelected={selectedIds.includes(item.id)}
          onClick={() => handleItemClick(item)}
          onMove={handleItemMove}
        />
      ))}

      {items.length === 0 && (
        <div className="grid-list-view-empty">
          No items to display
        </div>
      )}
    </div>
  );
};

/**
 * Individual list item
 */
interface GridListItemProps {
  item: GridPanel;
  index: number;
  isSelected: boolean;
  onClick: () => void;
  onMove: (fromIndex: number, toIndex: number) => void;
}

const GridListItem: React.FC<GridListItemProps> = ({
  item,
  index,
  isSelected,
  onClick
}) => {
  return (
    <motion.div
      className={`grid-list-item ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
      whileHover={{
        scale: 1.02,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
      }}
      whileTap={{
        scale: 0.98
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{
        duration: 0.2,
        delay: index * 0.05
      }}
    >
      <div className="grid-list-item-content">
        {/* Drag handle */}
        <div className="grid-list-item-drag-handle">
          &#8942;&#8942;
        </div>

        {/* Item content */}
        <div className="grid-list-item-info">
          <div className="grid-list-item-title">
            {item.content?.notes || `Shot ${item.content?.number || index + 1}`}
          </div>
          <div className="grid-list-item-details">
            Position: ({item.position.x}, {item.position.y}) •
            Size: {item.size.width}x{item.size.height}
          </div>
        </div>

        {/* Status indicator */}
        {/* item.locked removed as GridPanel doesn't have locked property */}
      </div>
    </motion.div>
  );
};
