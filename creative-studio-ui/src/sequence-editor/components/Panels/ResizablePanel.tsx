/**
 * Resizable Panel Component
 * 
 * A wrapper component that enables drag-to-resize functionality for panels
 * with visual feedback and layout persistence.
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 20.2, 20.5
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import { setPanelLayout, resetPanelLayout } from '../../store/slices/panelsSlice';

// ============================================================================
// Types
// ============================================================================

export type ResizeDirection = 'horizontal' | 'vertical' | 'both';

export interface ResizablePanelProps {
  panelId: 'assetLibrary' | 'preview' | 'shotConfig' | 'timeline';
  children: React.ReactNode;
  className?: string;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  resizeDirection: ResizeDirection;
  showResetButton?: boolean;
  ariaLabel?: string;
}

interface ResizeState {
  isResizing: boolean;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
}

// ============================================================================
// Constants
// ============================================================================

const LAYOUT_STORAGE_KEY = 'sequence-editor-layout';
const RESIZE_DEBOUNCE_MS = 500; // Debounce localStorage saves

const DEFAULT_MIN_DIMENSIONS = {
  assetLibrary: { minWidth: 120, minHeight: 0 },
  preview: { minWidth: 640, minHeight: 360 },
  shotConfig: { minWidth: 200, minHeight: 0 },
  timeline: { minWidth: 0, minHeight: 150 },
};

const DEFAULT_MAX_DIMENSIONS = {
  assetLibrary: { maxWidth: 50, maxHeight: 0 },
  preview: { maxWidth: 80, maxHeight: 90 },
  shotConfig: { maxWidth: 50, maxHeight: 0 },
  timeline: { maxWidth: 0, maxHeight: 80 },
};

// ============================================================================
// Component
// ============================================================================

export const ResizablePanel: React.FC<ResizablePanelProps> = ({
  panelId,
  children,
  className = '',
  minWidth,
  minHeight,
  maxWidth,
  maxHeight,
  resizeDirection = 'horizontal',
  showResetButton = true,
  ariaLabel,
}) => {
  const dispatch = useAppDispatch();
  const layout = useAppSelector((state) => state.panels.layout);
  
  const panelRef = useRef<HTMLDivElement>(null);
  const resizeHandleRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<number | null>(null);
  
  const [isHovered, setIsHovered] = useState(false);
  const [resizeState, setResizeState] = useState<ResizeState>({
    isResizing: false,
    startX: 0,
    startY: 0,
    startWidth: 0,
    startHeight: 0,
  });

  // Get container dimensions
  const getContainerDimensions = useCallback(() => {
    const root = document.querySelector('.sequence-editor-root');
    if (root) {
      return {
        width: root.clientWidth,
        height: root.clientHeight,
      };
    }
    return { width: window.innerWidth, height: window.innerHeight };
  }, []);

  // Get current dimensions from layout state
  const getCurrentDimensions = useCallback(() => {
    const panelLayout = layout[panelId];
    if (panelId === 'timeline') {
      return { width: 0, height: panelLayout.height };
    }
    if (panelId === 'preview') {
      return { width: panelLayout.width, height: panelLayout.height };
    }
    return { width: panelLayout.width, height: 0 };
  }, [layout, panelId]);

  // Get current dimensions from layout state (in pixels)
  const getCurrentDimensionsPixels = useCallback(() => {
    const containerDims = getContainerDimensions();
    const panelLayout = layout[panelId];

    if (panelId === 'timeline') {
      return {
        width: containerDims.width,
        height: (panelLayout.height / 100) * containerDims.height
      };
    }
    if (panelId === 'preview') {
      return {
        width: (panelLayout.width / 100) * containerDims.width,
        height: (panelLayout.height / 100) * containerDims.height
      };
    }
    // assetLibrary and shotConfig
    return {
      width: (panelLayout.width / 100) * containerDims.width,
      height: 0
    };
  }, [layout, panelId, getContainerDimensions]);

  // Save layout to localStorage
  const saveLayoutToStorage = useCallback((newLayout: typeof layout) => {
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Debounce save
    saveTimeoutRef.current = window.setTimeout(() => {
      try {
        localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(newLayout));
        console.log('Layout saved to localStorage:', newLayout);
      } catch (error) {
        console.error('Failed to save layout:', error);
      }
    }, RESIZE_DEBOUNCE_MS);
  }, []);

  // Calculate new dimensions during resize
  const calculateNewDimensions = useCallback((
    clientX: number,
    clientY: number,
    startX: number,
    startY: number,
    startWidth: number,
    startHeight: number
  ) => {
    const deltaX = clientX - startX;
    const deltaY = clientY - startY;
    
    const containerDims = getContainerDimensions();
    const minDims = DEFAULT_MIN_DIMENSIONS[panelId];
    const maxDims = DEFAULT_MAX_DIMENSIONS[panelId];
    
    let newWidth = startWidth;
    let newHeight = startHeight;
    
    // Apply min/max constraints
    const effectiveMinWidth = minWidth ?? minDims.minWidth;
    const effectiveMinHeight = minHeight ?? minDims.minHeight;
    const effectiveMaxWidth = maxWidth ?? (maxDims.maxWidth / 100) * containerDims.width;
    const effectiveMaxHeight = maxHeight ?? (maxDims.maxHeight / 100) * containerDims.height;
    
    if (resizeDirection === 'horizontal' || resizeDirection === 'both') {
      if (panelId === 'assetLibrary') {
        newWidth = Math.min(Math.max(startWidth + deltaX, effectiveMinWidth), effectiveMaxWidth);
      } else if (panelId === 'shotConfig') {
        newWidth = Math.min(Math.max(startWidth - deltaX, effectiveMinWidth), effectiveMaxWidth);
      } else {
        newWidth = Math.min(Math.max(startWidth + deltaX, effectiveMinWidth), effectiveMaxWidth);
      }
    }
    
    if (resizeDirection === 'vertical' || resizeDirection === 'both') {
      if (panelId === 'timeline') {
        newHeight = Math.min(Math.max(startHeight - deltaY, effectiveMinHeight), effectiveMaxHeight);
      } else {
        newHeight = Math.min(Math.max(startHeight + deltaY, effectiveMinHeight), effectiveMaxHeight);
      }
    }
    
    return { width: newWidth, height: newHeight };
  }, [panelId, resizeDirection, minWidth, minHeight, maxWidth, maxHeight, getContainerDimensions]);

  // Dispatch layout update
  const updateLayout = useCallback((newWidth: number, newHeight: number) => {
    const containerDims = getContainerDimensions();
    
    let newLayout = { ...layout };
    
    if (panelId === 'assetLibrary') {
      newLayout = {
        ...newLayout,
        assetLibrary: { width: (newWidth / containerDims.width) * 100 },
      };
    } else if (panelId === 'preview') {
      newLayout = {
        ...newLayout,
        preview: {
          width: (newWidth / containerDims.width) * 100,
          height: (newHeight / containerDims.height) * 100,
        },
      };
    } else if (panelId === 'shotConfig') {
      newLayout = {
        ...newLayout,
        shotConfig: { width: (newWidth / containerDims.width) * 100 },
      };
    } else if (panelId === 'timeline') {
      newLayout = {
        ...newLayout,
        timeline: { height: (newHeight / containerDims.height) * 100 },
      };
    }
    
    dispatch(setPanelLayout(newLayout));
    saveLayoutToStorage(newLayout);
  }, [dispatch, layout, panelId, getContainerDimensions, saveLayoutToStorage]);

  // Mouse down handler - start resizing
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const currentDims = getCurrentDimensions();
    const containerDims = getContainerDimensions();
    
    setResizeState({
      isResizing: true,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: panelId === 'timeline' 
        ? containerDims.width 
        : (currentDims.width / 100) * containerDims.width,
      startHeight: (currentDims.height / 100) * containerDims.height,
    });
    
    // Add global event listeners
    document.body.style.cursor = resizeDirection === 'vertical' ? 'row-resize' : 'col-resize';
    document.body.style.userSelect = 'none';
  }, [resizeDirection, getCurrentDimensions, getContainerDimensions, panelId]);

  // Mouse move handler - calculate new dimensions
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!resizeState.isResizing) return;
    
    const { width, height } = calculateNewDimensions(
      e.clientX,
      e.clientY,
      resizeState.startX,
      resizeState.startY,
      resizeState.startWidth,
      resizeState.startHeight
    );
    
    // Update CSS custom properties for immediate visual feedback
    if (panelRef.current) {
      if (resizeDirection === 'horizontal' || resizeDirection === 'both') {
        panelRef.current.style.width = `${width}px`;
      }
      if (resizeDirection === 'vertical' || resizeDirection === 'both') {
        panelRef.current.style.height = `${height}px`;
      }
    }
  }, [resizeState, calculateNewDimensions, resizeDirection]);

  // Mouse up handler - finalize resize
  const handleMouseUp = useCallback(() => {
    if (!resizeState.isResizing) return;

    // Get final dimensions from the panel element
    if (panelRef.current) {
      const finalWidth = panelRef.current.offsetWidth;
      const finalHeight = panelRef.current.offsetHeight;

      updateLayout(finalWidth, finalHeight);

      // Clear inline styles
      panelRef.current.style.width = '';
      panelRef.current.style.height = '';
    }

    // Reset state
    setResizeState({
      isResizing: false,
      startX: 0,
      startY: 0,
      startWidth: 0,
      startHeight: 0,
    });

    // Remove global event listeners
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, [resizeState, updateLayout]);

  // Effect to add/remove global mouse listeners during resize
  useEffect(() => {
    if (resizeState.isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizeState.isResizing, handleMouseMove, handleMouseUp]);

  // Effect to restore layout from localStorage on mount
  useEffect(() => {
    try {
      const savedLayout = localStorage.getItem(LAYOUT_STORAGE_KEY);
      if (savedLayout) {
        const parsedLayout = JSON.parse(savedLayout);
        // Validate and apply saved layout
        if (parsedLayout.assetLibrary && parsedLayout.preview && 
            parsedLayout.shotConfig && parsedLayout.timeline) {
          dispatch(setPanelLayout(parsedLayout));
          console.log('Layout restored from localStorage');
        }
      }
    } catch (error) {
      console.error('Failed to restore layout:', error);
    }
  }, [dispatch]);

  // Effect to persist layout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Handle reset layout
  const handleResetLayout = useCallback(() => {
    dispatch(resetPanelLayout());
    localStorage.removeItem(LAYOUT_STORAGE_KEY);
    console.log('Layout reset to defaults');
  }, [dispatch]);

  // Calculate panel dimensions from Redux state
  const panelDimensions = getCurrentDimensionsPixels();

  // Get resize handle position class
  const getResizeHandleClass = () => {
    if (panelId === 'assetLibrary') return 'resize-handle resize-handle-asset-library';
    if (panelId === 'shotConfig') return 'resize-handle resize-handle-shot-config';
    if (panelId === 'timeline') return 'resize-handle resize-handle-timeline';
    return 'resize-handle';
  };

  return (
    <div
      ref={panelRef}
      className={`resizable-panel ${className}`}
      data-panel-id={panelId}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="region"
      aria-label={ariaLabel || `${panelId} panel`}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        width: panelDimensions.width > 0 ? `${panelDimensions.width}px` : undefined,
        height: panelDimensions.height > 0 ? `${panelDimensions.height}px` : undefined,
      }}
    >
      {/* Panel Content */}
      <div className="resizable-panel-content" style={{ flex: 1, overflow: 'auto' }}>
        {children}
      </div>
      
      {/* Reset Layout Button */}
      {showResetButton && isHovered && (
        <button
          className="reset-layout-button"
          onClick={handleResetLayout}
          title="Reset Layout"
          style={{
            position: 'absolute',
            bottom: '8px',
            right: '8px',
            padding: '4px 8px',
            fontSize: '12px',
            background: 'var(--bg-secondary, #2a2a2a)',
            border: '1px solid var(--border-color, #3a3a3a)',
            borderRadius: '4px',
            color: 'var(--text-primary, #fff)',
            cursor: 'pointer',
            zIndex: 100,
            opacity: 0.8,
            transition: 'opacity 200ms ease-in-out',
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '0.8'}
        >
          Reset Layout
        </button>
      )}
      
      {/* Resize Handle */}
      <div
        ref={resizeHandleRef}
        className={getResizeHandleClass()}
        onMouseDown={handleMouseDown}
        role="separator"
        aria-label={`Resize ${panelId} panel`}
        data-resize-direction={resizeDirection}
        tabIndex={0}
        onKeyDown={(e) => {
          // Allow keyboard resizing with arrow keys
          if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || 
              e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            // Implement keyboard resize logic here if needed
          }
        }}
        style={{
          position: 'absolute',
          zIndex: 50,
          opacity: isHovered || resizeState.isResizing ? 1 : 0,
          transition: 'opacity 200ms ease-in-out, background-color 200ms ease-in-out',
          ...(panelId === 'assetLibrary' && {
            right: 0,
            top: 0,
            width: '6px',
            height: '100%',
            cursor: 'col-resize',
          }),
          ...(panelId === 'shotConfig' && {
            left: 0,
            top: 0,
            width: '6px',
            height: '100%',
            cursor: 'col-resize',
          }),
          ...(panelId === 'preview' && {
            bottom: 0,
            left: 0,
            width: '100%',
            height: '6px',
            cursor: 'row-resize',
          }),
          ...(panelId === 'timeline' && {
            top: 0,
            left: 0,
            width: '100%',
            height: '6px',
            cursor: 'row-resize',
          }),
          ...(resizeState.isResizing && {
            backgroundColor: 'var(--accent-color, #4A90E2)',
            opacity: 1,
          }),
        }}
      />
    </div>
  );
};

export default ResizablePanel;

