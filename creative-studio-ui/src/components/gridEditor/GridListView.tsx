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
    <div
      className="grid-list-view"
      style={{
        width: '100%',
        height: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '8px'
      }}
    >
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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#999',
            fontSize: '14px'
          }}
        >
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
      className="grid-list-item"
      style={{
        marginBottom: '8px',
        padding: '12px',
        background: isSelected ? '#e3f2fd' : 'white',
        border: `2px solid ${isSelected ? '#2196f3' : '#e0e0e0'}`,
        borderRadius: '8px',
        cursor: 'pointer',
        userSelect: 'none'
      }}
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Drag handle */}
        <div
          style={{
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#999',
            cursor: 'grab'
          }}
        >
          ⋮⋮
        </div>

        {/* Item content */}
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 500, marginBottom: '4px' }}>
            {item.content?.name || `Item ${index + 1}`}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            Position: ({item.position.x}, {item.position.y}) • 
            Size: {item.size.width}x{item.size.height}
          </div>
        </div>

        {/* Status indicator */}
        {item.locked && (
          <div
            style={{
              width: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f44336'
            }}
          >
            🔒
          </div>
        )}
      </div>
    </motion.div>
  );
};
