/**
 * Minimap Component - Overview navigation for zoomed viewport
 * 
 * This component provides:
 * - Minimap display when zoomed beyond threshold
 * - Current viewport position as rectangle overlay
 * - Click to jump to location
 * 
 * Requirements: 7.5
 */

import React, { useRef, useCallback, useMemo } from 'react';
import { useViewportStore } from '../../stores/viewportStore';

// ============================================================================
// Type Definitions
// ============================================================================

export interface MinimapProps {
  /**
   * Bounds of the full grid content
   */
  contentBounds: { width: number; height: number };
  
  /**
   * Zoom threshold above which minimap is displayed
   * Default: 1.5 (150%)
   */
  displayThreshold?: number;
  
  /**
   * Size of the minimap in pixels
   * Default: 200
   */
  size?: number;
  
  /**
   * Position of the minimap
   * Default: 'bottom-right'
   */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  
  /**
   * Optional className for styling
   */
  className?: string;
}

// ============================================================================
// Minimap Component
// ============================================================================

export const Minimap: React.FC<MinimapProps> = ({
  contentBounds,
  displayThreshold = 1.5,
  size = 200,
  position = 'bottom-right',
  className = '',
}) => {
  // ============================================================================
  // Store State
  // ============================================================================
  
  const { zoom, pan, bounds, setPan } = useViewportStore();
  
  const minimapRef = useRef<HTMLDivElement>(null);

  // ============================================================================
  // Visibility Check
  // ============================================================================
  
  const isVisible = zoom > displayThreshold;

  // ============================================================================
  // Calculate Minimap Scale and Viewport Rectangle
  // ============================================================================
  
  const minimapData = useMemo(() => {
    // Scale to fit content in minimap
    const scale = size / Math.max(contentBounds.width, contentBounds.height);
    
    // Minimap dimensions
    const minimapWidth = contentBounds.width * scale;
    const minimapHeight = contentBounds.height * scale;
    
    // Viewport rectangle in minimap space
    const viewportWidth = bounds.width / zoom;
    const viewportHeight = bounds.height / zoom;
    
    // Viewport position in content space
    const viewportX = -pan.x / zoom;
    const viewportY = -pan.y / zoom;
    
    // Viewport rectangle in minimap space
    const rectX = viewportX * scale;
    const rectY = viewportY * scale;
    const rectWidth = viewportWidth * scale;
    const rectHeight = viewportHeight * scale;
    
    return {
      scale,
      minimapWidth,
      minimapHeight,
      viewportRect: {
        x: rectX,
        y: rectY,
        width: rectWidth,
        height: rectHeight,
      },
    };
  }, [contentBounds, size, zoom, pan, bounds]);

  // ============================================================================
  // Click to Jump Handler
  // Requirements: 7.5
  // ============================================================================
  
  const handleMinimapClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!minimapRef.current) return;

      const rect = minimapRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      // Convert click position to content space
      const contentX = clickX / minimapData.scale;
      const contentY = clickY / minimapData.scale;

      // Calculate new pan to center viewport on clicked position
      const newPan = {
        x: -(contentX * zoom) + bounds.width / 2,
        y: -(contentY * zoom) + bounds.height / 2,
      };

      setPan(newPan);
    },
    [minimapData.scale, zoom, bounds, setPan]
  );

  // ============================================================================
  // Position Styles
  // ============================================================================
  
  const positionStyles: Record<string, React.CSSProperties> = {
    'top-left': { top: 16, left: 16 },
    'top-right': { top: 16, right: 16 },
    'bottom-left': { bottom: 16, left: 16 },
    'bottom-right': { bottom: 16, right: 16 },
  };

  // ============================================================================
  // Render
  // ============================================================================
  
  if (!isVisible) {
    return null;
  }

  const containerStyle: React.CSSProperties = {
    ...styles.minimap,
    ...positionStyles[position],
    width: minimapData.minimapWidth,
    height: minimapData.minimapHeight,
  };

  const viewportRectStyle: React.CSSProperties = {
    ...styles.viewportRect,
    left: minimapData.viewportRect.x,
    top: minimapData.viewportRect.y,
    width: minimapData.viewportRect.width,
    height: minimapData.viewportRect.height,
  };

  return (
    <div
      ref={minimapRef}
      className={`minimap ${className}`}
      style={containerStyle}
      onClick={handleMinimapClick}
      role="navigation"
      aria-label="Minimap navigation"
    >
      {/* Content representation (simplified) */}
      <div style={styles.content}>
        {/* Grid representation */}
        <svg
          width={minimapData.minimapWidth}
          height={minimapData.minimapHeight}
          style={styles.grid}
        >
          {/* Draw 3x3 grid */}
          {Array.from({ length: 3 }).map((_, row) =>
            Array.from({ length: 3 }).map((_, col) => {
              const cellWidth = minimapData.minimapWidth / 3;
              const cellHeight = minimapData.minimapHeight / 3;
              return (
                <rect
                  key={`${row}-${col}`}
                  x={col * cellWidth}
                  y={row * cellHeight}
                  width={cellWidth}
                  height={cellHeight}
                  fill="rgba(255, 255, 255, 0.1)"
                  stroke="rgba(255, 255, 255, 0.3)"
                  strokeWidth="1"
                />
              );
            })
          )}
        </svg>
      </div>

      {/* Viewport rectangle overlay */}
      <div style={viewportRectStyle} />
    </div>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles: Record<string, React.CSSProperties> = {
  minimap: {
    position: 'absolute',
    background: 'rgba(0, 0, 0, 0.8)',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderRadius: 8,
    cursor: 'pointer',
    overflow: 'hidden',
    zIndex: 90,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
    transition: 'opacity 0.3s',
  },
  content: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  grid: {
    display: 'block',
  },
  viewportRect: {
    position: 'absolute',
    border: '2px solid rgba(59, 130, 246, 0.8)',
    background: 'rgba(59, 130, 246, 0.2)',
    pointerEvents: 'none' as const,
    boxShadow: '0 0 8px rgba(59, 130, 246, 0.6)',
  },
};

export default Minimap;
