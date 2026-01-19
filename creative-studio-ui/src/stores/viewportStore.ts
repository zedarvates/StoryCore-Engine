/**
 * Viewport Store - Zustand store for viewport state management
 * 
 * This store manages:
 * - Zoom level and pan offset
 * - Viewport bounds
 * - Focused panel state
 * - Coordinate transformations
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 2.5, 2.6
 */

import { create } from 'zustand';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Point in 2D space
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * Viewport bounds
 */
export interface Bounds {
  width: number;
  height: number;
}

/**
 * Viewport state
 */
export interface ViewportState {
  zoom: number; // 0.1 to 10.0
  pan: Point;
  bounds: Bounds;
}

// ============================================================================
// Store Interface
// ============================================================================

export interface ViewportStore {
  // ============================================================================
  // State
  // ============================================================================
  
  zoom: number;
  pan: Point;
  bounds: Bounds;
  focusedPanelId: string | null;
  minZoom: number;
  maxZoom: number;

  // ============================================================================
  // Actions
  // ============================================================================
  
  /**
   * Set zoom level
   * Requirements: 7.1
   */
  setZoom: (zoom: number) => void;

  /**
   * Set pan offset
   * Requirements: 7.2
   */
  setPan: (pan: Point) => void;

  /**
   * Set viewport bounds
   */
  setBounds: (bounds: Bounds) => void;

  /**
   * Zoom in by a fixed increment
   * Requirements: 7.4
   */
  zoomIn: () => void;

  /**
   * Zoom out by a fixed increment
   * Requirements: 7.4
   */
  zoomOut: () => void;

  /**
   * Fit entire grid to viewport
   * Requirements: 7.3
   */
  fitToView: (gridBounds: Bounds) => void;

  /**
   * Zoom to actual pixel size (1:1)
   * Requirements: 7.4
   */
  zoomToActual: () => void;

  /**
   * Zoom to a specific point (e.g., cursor position)
   * Requirements: 7.1
   */
  zoomToPoint: (newZoom: number, point: Point) => void;

  /**
   * Pan by a delta amount
   * Requirements: 7.2
   */
  panBy: (delta: Point) => void;

  /**
   * Focus on a specific panel (enter focus mode)
   * Requirements: 2.5, 2.6
   */
  focusPanel: (panelId: string | null, panelBounds?: Bounds) => void;

  /**
   * Exit focus mode
   * Requirements: 2.7
   */
  exitFocusMode: () => void;

  /**
   * Check if a panel is currently focused
   */
  isFocused: (panelId: string) => boolean;

  /**
   * Get current viewport state
   */
  getViewportState: () => ViewportState;

  /**
   * Reset viewport to default state
   */
  resetViewport: () => void;

  // ============================================================================
  // Coordinate Transformation Utilities
  // ============================================================================
  
  /**
   * Convert screen coordinates to canvas coordinates
   */
  screenToCanvas: (screenPoint: Point) => Point;

  /**
   * Convert canvas coordinates to screen coordinates
   */
  canvasToScreen: (canvasPoint: Point) => Point;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_ZOOM = 1.0;
const DEFAULT_PAN: Point = { x: 0, y: 0 };
const DEFAULT_BOUNDS: Bounds = { width: 1920, height: 1080 };
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 10.0;
const ZOOM_STEP_FACTOR = 1.2; // 20% zoom steps

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Clamp a value between min and max
 */
const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

/**
 * Calculate zoom to fit bounds within viewport
 */
const calculateFitZoom = (contentBounds: Bounds, viewportBounds: Bounds): number => {
  const scaleX = viewportBounds.width / contentBounds.width;
  const scaleY = viewportBounds.height / contentBounds.height;
  return Math.min(scaleX, scaleY) * 0.9; // 90% to add padding
};

/**
 * Calculate pan to center content in viewport
 */
const calculateCenterPan = (
  contentBounds: Bounds,
  viewportBounds: Bounds,
  zoom: number
): Point => {
  const scaledWidth = contentBounds.width * zoom;
  const scaledHeight = contentBounds.height * zoom;

  return {
    x: (viewportBounds.width - scaledWidth) / 2,
    y: (viewportBounds.height - scaledHeight) / 2,
  };
};

// ============================================================================
// Store Implementation
// ============================================================================

/**
 * Create Viewport Store with Zustand
 */
export const useViewportStore = create<ViewportStore>((set, get) => ({
  // ============================================================================
  // Initial State
  // ============================================================================
  
  zoom: DEFAULT_ZOOM,
  pan: DEFAULT_PAN,
  bounds: DEFAULT_BOUNDS,
  focusedPanelId: null,
  minZoom: MIN_ZOOM,
  maxZoom: MAX_ZOOM,

  // ============================================================================
  // Actions
  // ============================================================================
  
  setZoom: (zoom: number) => {
    const { minZoom, maxZoom } = get();
    set({ zoom: clamp(zoom, minZoom, maxZoom) });
  },

  setPan: (pan: Point) => {
    set({ pan });
  },

  setBounds: (bounds: Bounds) => {
    set({ bounds });
  },

  zoomIn: () => {
    const { zoom, maxZoom } = get();
    const newZoom = Math.min(zoom * ZOOM_STEP_FACTOR, maxZoom);
    set({ zoom: newZoom });
  },

  zoomOut: () => {
    const { zoom, minZoom } = get();
    const newZoom = Math.max(zoom / ZOOM_STEP_FACTOR, minZoom);
    set({ zoom: newZoom });
  },

  fitToView: (gridBounds: Bounds) => {
    const { bounds } = get();
    const fitZoom = calculateFitZoom(gridBounds, bounds);
    const centerPan = calculateCenterPan(gridBounds, bounds, fitZoom);

    set({
      zoom: fitZoom,
      pan: centerPan,
      focusedPanelId: null,
    });
  },

  zoomToActual: () => {
    set({ zoom: 1.0 });
  },

  zoomToPoint: (newZoom: number, point: Point) => {
    const { zoom, pan, minZoom, maxZoom } = get();
    const clampedZoom = clamp(newZoom, minZoom, maxZoom);

    // Calculate new pan to keep the point under the cursor
    // Formula: newPan = point - (point - oldPan) * (newZoom / oldZoom)
    const zoomRatio = clampedZoom / zoom;
    const newPan: Point = {
      x: point.x - (point.x - pan.x) * zoomRatio,
      y: point.y - (point.y - pan.y) * zoomRatio,
    };

    set({
      zoom: clampedZoom,
      pan: newPan,
    });
  },

  panBy: (delta: Point) => {
    const { pan } = get();
    set({
      pan: {
        x: pan.x + delta.x,
        y: pan.y + delta.y,
      },
    });
  },

  focusPanel: (panelId: string | null, panelBounds?: Bounds) => {
    if (!panelId || !panelBounds) {
      set({ focusedPanelId: null });
      return;
    }

    const { bounds, minZoom, maxZoom } = get();

    // Calculate zoom to maximize panel display (Requirements: 2.6)
    // Use 95% of viewport to leave some padding
    const fitZoom = calculateFitZoom(panelBounds, bounds) * 0.95;
    const clampedZoom = clamp(fitZoom, minZoom, maxZoom);

    // Calculate pan to center panel (Requirements: 2.6)
    const centerPan = calculateCenterPan(panelBounds, bounds, clampedZoom);

    // Preserve selection state during focus mode (Requirements: 2.7)
    // Note: Selection state is managed by GridStore, not ViewportStore
    // This just sets the focused panel ID
    set({
      focusedPanelId: panelId,
      zoom: clampedZoom,
      pan: centerPan,
    });
  },

  exitFocusMode: () => {
    set({ focusedPanelId: null });
  },

  isFocused: (panelId: string) => {
    return get().focusedPanelId === panelId;
  },

  getViewportState: () => {
    const { zoom, pan, bounds } = get();
    return { zoom, pan, bounds };
  },

  resetViewport: () => {
    set({
      zoom: DEFAULT_ZOOM,
      pan: DEFAULT_PAN,
      focusedPanelId: null,
    });
  },

  // ============================================================================
  // Coordinate Transformation Utilities
  // ============================================================================
  
  screenToCanvas: (screenPoint: Point): Point => {
    const { zoom, pan } = get();
    return {
      x: (screenPoint.x - pan.x) / zoom,
      y: (screenPoint.y - pan.y) / zoom,
    };
  },

  canvasToScreen: (canvasPoint: Point): Point => {
    const { zoom, pan } = get();
    return {
      x: canvasPoint.x * zoom + pan.x,
      y: canvasPoint.y * zoom + pan.y,
    };
  },
}));

// ============================================================================
// Exported Helper Functions
// ============================================================================

/**
 * Calculate visible panels based on viewport state
 */
export const getVisiblePanels = (
  viewportState: ViewportState,
  panelBounds: Bounds[]
): number[] => {
  const visibleIndices: number[] = [];

  panelBounds.forEach((bounds, index) => {
    // Transform panel bounds to screen space
    const screenBounds = {
      x: bounds.width * viewportState.zoom + viewportState.pan.x,
      y: bounds.height * viewportState.zoom + viewportState.pan.y,
      width: bounds.width * viewportState.zoom,
      height: bounds.height * viewportState.zoom,
    };

    // Check if panel intersects with viewport
    const intersects =
      screenBounds.x < viewportState.bounds.width &&
      screenBounds.x + screenBounds.width > 0 &&
      screenBounds.y < viewportState.bounds.height &&
      screenBounds.y + screenBounds.height > 0;

    if (intersects) {
      visibleIndices.push(index);
    }
  });

  return visibleIndices;
};
