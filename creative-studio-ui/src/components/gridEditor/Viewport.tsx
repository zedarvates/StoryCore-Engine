/**
 * Viewport Component - Container with zoom and pan controls
 * 
 * This component provides:
 * - Mouse wheel zoom centered on cursor
 * - Space+drag pan interaction
 * - CSS transforms for zoom/pan
 * - Zoom level display and controls
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.6
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useViewportStore } from '../../stores/viewportStore';
import { Minimap } from './Minimap';

// ============================================================================
// Type Definitions
// ============================================================================

export interface ViewportProps {
  children: React.ReactNode;
  className?: string;
  gridBounds?: { width: number; height: number };
  showMinimap?: boolean;
}

// ============================================================================
// Viewport Component
// ============================================================================

export const Viewport: React.FC<ViewportProps> = ({
  children,
  className = '',
  gridBounds = { width: 1920, height: 1080 },
  showMinimap = true,
}) => {
  // ============================================================================
  // Store State
  // ============================================================================
  
  const {
    zoom,
    pan,
    setBounds,
    zoomToPoint,
    panBy,
    zoomIn,
    zoomOut,
    fitToView,
    zoomToActual,
    focusedPanelId,
    exitFocusMode,
  } = useViewportStore();

  // ============================================================================
  // Local State
  // ============================================================================
  
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const panStartRef = useRef<{ x: number; y: number } | null>(null);

  // ============================================================================
  // Update Viewport Bounds on Resize
  // ============================================================================
  
  useEffect(() => {
    const updateBounds = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setBounds({ width: rect.width, height: rect.height });
      }
    };

    updateBounds();
    window.addEventListener('resize', updateBounds);

    return () => {
      window.removeEventListener('resize', updateBounds);
    };
  }, [setBounds]);

  // ============================================================================
  // Mouse Wheel Zoom (Centered on Cursor)
  // Requirements: 7.1
  // ============================================================================
  
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();

      if (!containerRef.current) return;

      // Get cursor position relative to container
      const rect = containerRef.current.getBoundingClientRect();
      const cursorPoint = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };

      // Calculate new zoom level
      const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1; // Zoom out or in
      const newZoom = zoom * zoomDelta;

      // Zoom to cursor point
      zoomToPoint(newZoom, cursorPoint);
    },
    [zoom, zoomToPoint]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [handleWheel]);

  // ============================================================================
  // Space Key Detection
  // ============================================================================
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isSpacePressed) {
        e.preventDefault();
        setIsSpacePressed(true);
      }
      // Exit focus mode on Escape key (Requirements: 2.7)
      if (e.code === 'Escape' && focusedPanelId) {
        e.preventDefault();
        exitFocusMode();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setIsSpacePressed(false);
        setIsPanning(false);
        panStartRef.current = null;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isSpacePressed, focusedPanelId, exitFocusMode]);

  // ============================================================================
  // Space+Drag Pan Interaction
  // Requirements: 7.2
  // ============================================================================
  
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (isSpacePressed) {
        e.preventDefault();
        setIsPanning(true);
        panStartRef.current = { x: e.clientX, y: e.clientY };
      }
    },
    [isSpacePressed]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning && panStartRef.current) {
        const delta = {
          x: e.clientX - panStartRef.current.x,
          y: e.clientY - panStartRef.current.y,
        };

        panBy(delta);
        panStartRef.current = { x: e.clientX, y: e.clientY };
      }
    },
    [isPanning, panBy]
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    panStartRef.current = null;
  }, []);

  // ============================================================================
  // Zoom Controls Handlers
  // Requirements: 7.3, 7.4
  // ============================================================================
  
  const handleFitToView = useCallback(() => {
    fitToView(gridBounds);
  }, [fitToView, gridBounds]);

  const handleZoomToActual = useCallback(() => {
    zoomToActual();
  }, [zoomToActual]);

  const handleZoomIn = useCallback(() => {
    zoomIn();
  }, [zoomIn]);

  const handleZoomOut = useCallback(() => {
    zoomOut();
  }, [zoomOut]);

  // ============================================================================
  // Focus Mode Handlers
  // Requirements: 2.5, 2.7
  // ============================================================================
  
  const handleExitFocus = useCallback(() => {
    exitFocusMode();
  }, [exitFocusMode]);

  // ============================================================================
  // Render
  // ============================================================================
  
  const cursor = isSpacePressed ? (isPanning ? 'grabbing' : 'grab') : 'default';

  return (
    <div className={`viewport-container ${className}`} style={styles.container}>
      {/* Zoom Controls - Requirements: 7.4, 7.6 */}
      <div style={styles.controls}>
        <div style={styles.zoomControls}>
          <button
            onClick={handleFitToView}
            style={styles.zoomButton}
            className="zoom-button"
            title="Fit to View"
            aria-label="Fit to View"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M1 1h6v2H3v4H1V1zm14 0h-6v2h4v4h2V1zM1 15h6v-2H3v-4H1v6zm14 0h-6v-2h4v-4h2v6z" />
            </svg>
          </button>
          <button
            onClick={handleZoomToActual}
            style={styles.zoomButton}
            className="zoom-button"
            title="Zoom to 100%"
            aria-label="Zoom to 100%"
          >
            1:1
          </button>
          <button
            onClick={handleZoomOut}
            style={styles.zoomButton}
            className="zoom-button"
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            −
          </button>
          <span style={styles.zoomLevel} aria-label={`Zoom level: ${Math.round(zoom * 100)}%`}>
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            style={styles.zoomButton}
            className="zoom-button"
            title="Zoom In"
            aria-label="Zoom In"
          >
            +
          </button>
        </div>
      </div>

      {/* Exit Focus Button - Requirements: 2.5, 2.7 */}
      {focusedPanelId && (
        <div style={styles.exitFocusContainer}>
          <button
            onClick={handleExitFocus}
            style={styles.exitFocusButton}
            className="exit-focus-button"
            title="Exit Focus Mode (Esc)"
            aria-label="Exit Focus Mode"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: 8 }}>
              <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="2" fill="none" />
            </svg>
            Exit Focus Mode
          </button>
        </div>
      )}

      {/* Minimap - Requirements: 7.5 */}
      {showMinimap && !focusedPanelId && (
        <Minimap
          contentBounds={gridBounds}
          displayThreshold={1.5}
          size={200}
          position="bottom-right"
        />
      )}

      {/* Viewport Container */}
      <div
        ref={containerRef}
        style={{ ...styles.canvas, cursor }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Content with CSS Transform - Animated transition (Requirements: 2.7) */}
        <div
          ref={contentRef}
          className="viewport-content"
          data-testid="viewport-content"
          style={{
            ...styles.content,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transition: focusedPanelId ? 'transform 0.3s ease-in-out' : 'none',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    background: '#1a1a1a',
  },
  controls: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 100,
    display: 'flex',
    gap: 8,
  },
  zoomControls: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    background: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 8,
    padding: 8,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
  },
  zoomButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    color: 'white',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  zoomLevel: {
    minWidth: 48,
    textAlign: 'center' as const,
    color: 'white',
    fontSize: 12,
    fontWeight: 500,
    padding: '0 8px',
  },
  exitFocusContainer: {
    position: 'absolute',
    top: 16,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 100,
  },
  exitFocusButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '12px 24px',
    background: 'rgba(33, 150, 243, 0.9)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: 8,
    color: 'white',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 4px 12px rgba(33, 150, 243, 0.4)',
  },
  canvas: {
    position: 'relative',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  content: {
    position: 'absolute',
    top: 0,
    left: 0,
    transformOrigin: '0 0',
    willChange: 'transform',
  },
};

export default Viewport;
