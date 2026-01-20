/**
 * GridLayout Component
 * 
 * Provides a grid-based layout system with snap-to-grid functionality,
 * alignment guides, and configurable grid parameters.
 * 
 * Features:
 * - Configurable grid (columns, rows, gap, cellSize)
 * - Snap-to-grid with configurable threshold
 * - Semi-transparent grid lines display
 * - Alignment guides for panel proximity
 * - Distribute evenly functionality
 */

import React, { useRef, useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import type { GridLayoutProps, GridPanel, Position, AlignmentGuide } from '../../types/gridEditorAdvanced';
import { GridLines } from './GridLines';
import { GridItem } from './GridItem';
import { AlignmentGuides } from './AlignmentGuides';

export const GridLayout: React.FC<GridLayoutProps> = ({
  config,
  items,
  onLayoutChange
}) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<GridPanel[]>(items);
  const [alignmentGuides, setAlignmentGuides] = useState<AlignmentGuide[]>([]);
  const [shiftPressed, setShiftPressed] = useState(false);

  // Listen for Shift key to disable snap temporarily
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setShiftPressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setShiftPressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  /**
   * Snap position to nearest grid cell
   * Exigences: 3.1, 3.2
   */
  const snapToGrid = useCallback((position: Position): Position => {
    // If Shift is pressed, disable snap (Exigence 3.2)
    if (shiftPressed || !config.snapEnabled) {
      return position;
    }

    const { cellSize, gap } = config;
    const cellWidth = cellSize.width + gap;
    const cellHeight = cellSize.height + gap;

    // Calculate nearest grid position
    const col = Math.round(position.x / cellWidth);
    const row = Math.round(position.y / cellHeight);

    const snappedX = col * cellWidth;
    const snappedY = row * cellHeight;

    // Check if within snap threshold (Exigence 3.1)
    const distance = Math.sqrt(
      Math.pow(position.x - snappedX, 2) + Math.pow(position.y - snappedY, 2)
    );

    if (distance <= config.snapThreshold) {
      return { x: snappedX, y: snappedY };
    }

    return position;
  }, [config, shiftPressed]);

  /**
   * Detect alignment guides when panels are close to each other
   * Exigence: 3.7
   */
  const detectAlignmentGuides = useCallback((movingPanel: GridPanel, allPanels: GridPanel[]): AlignmentGuide[] => {
    const guides: AlignmentGuide[] = [];
    const PROXIMITY_THRESHOLD = 10; // pixels

    allPanels.forEach(panel => {
      if (panel.id === movingPanel.id) return;

      // Check vertical alignment (same x position)
      if (Math.abs(panel.position.x - movingPanel.position.x) < PROXIMITY_THRESHOLD) {
        guides.push({
          type: 'vertical',
          position: panel.position.x,
          items: [panel, movingPanel]
        });
      }

      // Check horizontal alignment (same y position)
      if (Math.abs(panel.position.y - movingPanel.position.y) < PROXIMITY_THRESHOLD) {
        guides.push({
          type: 'horizontal',
          position: panel.position.y,
          items: [panel, movingPanel]
        });
      }

      // Check right edge alignment
      const movingRight = movingPanel.position.x + movingPanel.size.width;
      const panelRight = panel.position.x + panel.size.width;
      if (Math.abs(movingRight - panelRight) < PROXIMITY_THRESHOLD) {
        guides.push({
          type: 'vertical',
          position: panelRight,
          items: [panel, movingPanel]
        });
      }

      // Check bottom edge alignment
      const movingBottom = movingPanel.position.y + movingPanel.size.height;
      const panelBottom = panel.position.y + panel.size.height;
      if (Math.abs(movingBottom - panelBottom) < PROXIMITY_THRESHOLD) {
        guides.push({
          type: 'horizontal',
          position: panelBottom,
          items: [panel, movingPanel]
        });
      }
    });

    return guides;
  }, []);

  /**
   * Handle panel position change
   */
  const handlePanelMove = useCallback((panelId: string, newPosition: Position) => {
    const snappedPosition = snapToGrid(newPosition);
    
    setLayout(prevLayout => {
      const newLayout = prevLayout.map(panel => {
        if (panel.id === panelId) {
          const updatedPanel = { ...panel, position: snappedPosition };
          
          // Detect alignment guides
          const guides = detectAlignmentGuides(updatedPanel, prevLayout);
          setAlignmentGuides(guides);
          
          return updatedPanel;
        }
        return panel;
      });

      onLayoutChange?.(newLayout);
      return newLayout;
    });
  }, [snapToGrid, detectAlignmentGuides, onLayoutChange]);

  /**
   * Handle panel resize with grid constraints
   * Exigence: 3.3
   */
  const handlePanelResize = useCallback((panelId: string, newSize: { width: number; height: number }) => {
    const { cellSize, gap } = config;
    const cellWidth = cellSize.width + gap;
    const cellHeight = cellSize.height + gap;

    // Constrain to valid grid dimensions (Exigence 3.3)
    const constrainedWidth = Math.max(cellWidth, Math.round(newSize.width / cellWidth) * cellWidth);
    const constrainedHeight = Math.max(cellHeight, Math.round(newSize.height / cellHeight) * cellHeight);

    setLayout(prevLayout => {
      const newLayout = prevLayout.map(panel =>
        panel.id === panelId
          ? { ...panel, size: { width: constrainedWidth, height: constrainedHeight } }
          : panel
      );

      onLayoutChange?.(newLayout);
      return newLayout;
    });
  }, [config, onLayoutChange]);

  /**
   * Distribute panels evenly
   * Exigence: 3.8
   */
  const distributeEvenly = useCallback((selectedPanelIds: string[], direction: 'horizontal' | 'vertical') => {
    const selectedPanels = layout.filter(panel => selectedPanelIds.includes(panel.id));
    
    if (selectedPanels.length < 2) return;

    // Sort panels by position
    const sorted = [...selectedPanels].sort((a, b) => {
      if (direction === 'horizontal') {
        return a.position.x - b.position.x;
      }
      return a.position.y - b.position.y;
    });

    // Calculate total space and spacing
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    
    let totalSpace: number;
    let totalPanelSize: number;
    
    if (direction === 'horizontal') {
      totalSpace = (last.position.x + last.size.width) - first.position.x;
      totalPanelSize = sorted.reduce((sum, panel) => sum + panel.size.width, 0);
    } else {
      totalSpace = (last.position.y + last.size.height) - first.position.y;
      totalPanelSize = sorted.reduce((sum, panel) => sum + panel.size.height, 0);
    }

    const spacing = (totalSpace - totalPanelSize) / (sorted.length - 1);

    // Reposition panels with uniform spacing
    let currentPosition = direction === 'horizontal' ? first.position.x : first.position.y;

    const newLayout = layout.map(panel => {
      const sortedIndex = sorted.findIndex(p => p.id === panel.id);
      if (sortedIndex === -1) return panel;

      const newPos = { ...panel.position };
      
      if (direction === 'horizontal') {
        newPos.x = currentPosition;
        currentPosition += panel.size.width + spacing;
      } else {
        newPos.y = currentPosition;
        currentPosition += panel.size.height + spacing;
      }

      return { ...panel, position: newPos };
    });

    setLayout(newLayout);
    onLayoutChange?.(newLayout);
  }, [layout, onLayoutChange]);

  /**
   * Clear alignment guides when not dragging
   */
  const clearAlignmentGuides = useCallback(() => {
    setAlignmentGuides([]);
  }, []);

  // Sync layout with items prop
  React.useEffect(() => {
    setLayout(items);
  }, [items]);

  /**
   * Recalculate positions when grid spacing changes
   * Exigence: 3.5
   */
  React.useEffect(() => {
    // Animate recalculation when grid config changes
    const recalculatedLayout = layout.map(panel => {
      // Snap existing positions to new grid
      const snappedPosition = snapToGrid(panel.position);
      return { ...panel, position: snappedPosition };
    });

    if (JSON.stringify(recalculatedLayout) !== JSON.stringify(layout)) {
      setLayout(recalculatedLayout);
      onLayoutChange?.(recalculatedLayout);
    }
  }, [config.cellSize, config.gap]); // Trigger when spacing changes

  return (
    <div 
      ref={gridRef} 
      className="grid-layout"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden'
      }}
    >
      {/* Grid lines (Exigence 3.4, 3.6) */}
      {config.showGridLines && <GridLines config={config} />}

      {/* Alignment guides (Exigence 3.7) */}
      <AnimatePresence>
        {alignmentGuides.length > 0 && (
          <AlignmentGuides guides={alignmentGuides} />
        )}
      </AnimatePresence>

      {/* Grid items */}
      {layout.map(item => (
        <GridItem
          key={item.id}
          item={item}
          onMove={handlePanelMove}
          onResize={handlePanelResize}
          onDragEnd={clearAlignmentGuides}
          snapToGrid={config.snapEnabled && !shiftPressed ? snapToGrid : undefined}
        />
      ))}
    </div>
  );
};
