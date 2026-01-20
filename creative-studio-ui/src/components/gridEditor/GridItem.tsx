/**
 * GridItem Component
 * 
 * Represents a single item in the grid layout with drag and resize capabilities
 */

import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { GridPanel, Position } from '../../types/gridEditorAdvanced';

interface GridItemProps {
  item: GridPanel;
  onMove: (id: string, position: Position) => void;
  onResize: (id: string, size: { width: number; height: number }) => void;
  onDragEnd?: () => void;
  snapToGrid?: (position: Position) => Position;
}

export const GridItem: React.FC<GridItemProps> = ({
  item,
  onMove,
  onResize,
  onDragEnd,
  snapToGrid
}) => {
  const itemRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState<Position | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    
    e.preventDefault();
    e.stopPropagation();

    setIsDragging(true);
    setDragStart({
      x: e.clientX - item.position.x,
      y: e.clientY - item.position.y
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !dragStart) return;

    const newPosition = {
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    };

    const finalPosition = snapToGrid ? snapToGrid(newPosition) : newPosition;
    onMove(item.id, finalPosition);
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      setDragStart(null);
      onDragEnd?.();
    }
  };

  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  return (
    <motion.div
      ref={itemRef}
      className="grid-item"
      style={{
        position: 'absolute',
        left: item.position.x,
        top: item.position.y,
        width: item.size.width,
        height: item.size.height,
        zIndex: item.zIndex,
        cursor: isDragging ? 'grabbing' : 'grab',
        border: '2px solid rgba(255, 255, 255, 0.3)',
        borderRadius: '4px',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none'
      }}
      onMouseDown={handleMouseDown}
      animate={{
        scale: isDragging ? 1.05 : 1,
        boxShadow: isDragging 
          ? '0 8px 16px rgba(0, 0, 0, 0.3)' 
          : '0 2px 4px rgba(0, 0, 0, 0.1)'
      }}
      transition={{ duration: 0.2 }}
    >
      {/* Content preview */}
      <div style={{ padding: '8px', textAlign: 'center', color: 'white' }}>
        {item.content.title || 'Panel'}
      </div>
    </motion.div>
  );
};
