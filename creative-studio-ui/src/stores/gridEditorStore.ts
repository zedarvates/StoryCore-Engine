/**
 * Grid Editor Store - Zustand store for Advanced Grid Editor feature
 * 
 * This store manages the complete state for the 3x3 Master Coherence Sheet editor:
 * - Grid configuration (panels, layers, transforms, crops)
 * - Panel selection and active tool state
 * - Clipboard operations
 * - Integration with backend services
 * 
 * Requirements: 1.5, 2.1, 2.2, 2.3, 3.2, 4.6, 5.1, 5.2, 5.5, 10.1, 10.2
 */

import { create } from 'zustand';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Geometry primitives
 */
export interface Point {
  x: number;
  y: number;
}

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Transform (Position, scale, rotation)
 */
export interface Transform {
  position: Point; // pixels from panel origin
  scale: Point; // 1.0 = 100%
  rotation: number; // degrees
  pivot: Point; // 0-1 normalized
}

/**
 * Crop Region (Normalized coordinates)
 */
export interface CropRegion {
  x: number; // 0-1
  y: number; // 0-1
  width: number; // 0-1
  height: number; // 0-1
}

/**
 * Blend modes for layer composition
 */
export type BlendMode = 'normal' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten';

/**
 * Layer content types
 */
export interface ImageContent {
  type: 'image';
  url: string;
  naturalWidth: number;
  naturalHeight: number;
}

export interface AnnotationContent {
  type: 'annotation';
  drawings: DrawingElement[];
  textAnnotations: TextAnnotation[];
}

export interface EffectContent {
  type: 'effect';
  effectType: string;
  parameters: Record<string, unknown>;
}

export type LayerContent = ImageContent | AnnotationContent | EffectContent;

/**
 * Drawing elements for annotations
 */
export interface DrawingElement {
  id: string;
  type: 'path' | 'rectangle' | 'ellipse' | 'line';
  points: Point[];
  style: {
    strokeColor: string;
    strokeWidth: number;
    fillColor?: string;
    opacity: number;
  };
}

export interface TextAnnotation {
  id: string;
  text: string;
  position: Point;
  style: {
    fontSize: number;
    fontFamily: string;
    color: string;
    backgroundColor?: string;
  };
}

/**
 * Layer (Composable visual element)
 */
export interface Layer {
  id: string;
  name: string;
  type: 'image' | 'annotation' | 'effect';
  visible: boolean;
  locked: boolean;
  opacity: number; // 0-1
  blendMode: BlendMode;
  content: LayerContent;
}

/**
 * Panel (Individual grid cell)
 */
export interface Panel {
  id: string;
  position: { row: number; col: number }; // 0-2 for 3x3
  layers: Layer[];
  transform: Transform;
  crop: CropRegion | null;
  annotations: Annotation[];
  metadata: {
    generatedAt?: string;
    seed?: number;
    qualityScore?: number;
    modified?: boolean;
  };
}

/**
 * Annotation (visual markers and feedback)
 */
export interface Annotation {
  id: string;
  type: 'drawing' | 'text';
  content: string;
  visible: boolean;
}

/**
 * Grid Configuration (Top-level)
 */
export interface GridConfiguration {
  version: string; // "1.0"
  projectId: string;
  panels: Panel[];
  presets: Preset[];
  metadata: {
    createdAt: string;
    modifiedAt: string;
    author?: string;
    description?: string;
  };
}

/**
 * Preset (Predefined configuration)
 */
export interface Preset {
  id: string;
  name: string;
  description: string;
  thumbnail?: string;
  panelTransforms: Transform[];
  panelCrops: (CropRegion | null)[];
}

/**
 * Tool types
 */
export type Tool = 'select' | 'crop' | 'rotate' | 'scale' | 'pan' | 'annotate';

// ============================================================================
// Store Interface
// ============================================================================

export interface GridStore {
  // ============================================================================
  // State
  // ============================================================================
  
  config: GridConfiguration;
  selectedPanelIds: string[];
  activeTool: Tool;
  clipboard: Panel | null;

  // ============================================================================
  // Selection Actions
  // ============================================================================
  
  /**
   * Select a panel, optionally adding to existing selection
   * Requirements: 2.1, 2.2, 2.3
   */
  selectPanel: (panelId: string, addToSelection: boolean) => void;

  /**
   * Deselect all panels
   * Requirements: 2.4
   */
  deselectAll: () => void;

  /**
   * Get currently selected panels
   */
  getSelectedPanels: () => Panel[];

  // ============================================================================
  // Transform Actions
  // ============================================================================
  
  /**
   * Update transform for a specific panel
   * Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 3.8
   */
  updatePanelTransform: (panelId: string, transform: Transform) => void;

  /**
   * Apply transform to multiple panels simultaneously
   * Requirements: 6.2
   */
  updateMultiplePanelTransforms: (panelIds: string[], transform: Transform) => void;

  // ============================================================================
  // Crop Actions
  // ============================================================================
  
  /**
   * Update crop region for a specific panel
   * Requirements: 4.2, 4.3, 4.4, 4.6, 4.7
   */
  updatePanelCrop: (panelId: string, crop: CropRegion | null) => void;

  // ============================================================================
  // Layer Management Actions
  // ============================================================================
  
  /**
   * Add a new layer to a panel
   * Requirements: 5.1
   */
  addLayer: (panelId: string, layer: Layer) => void;

  /**
   * Remove a layer from a panel
   * Requirements: 5.5
   */
  removeLayer: (panelId: string, layerId: string) => void;

  /**
   * Reorder layers within a panel
   * Requirements: 5.2
   */
  reorderLayers: (panelId: string, layerId: string, newIndex: number) => void;

  /**
   * Update layer properties
   * Requirements: 5.3, 5.4, 5.8
   */
  updateLayer: (panelId: string, layerId: string, updates: Partial<Layer>) => void;

  /**
   * Toggle layer visibility
   * Requirements: 5.3
   */
  toggleLayerVisibility: (panelId: string, layerId: string) => void;

  /**
   * Toggle layer lock status
   * Requirements: 5.4
   */
  toggleLayerLock: (panelId: string, layerId: string) => void;

  // ============================================================================
  // Generation Actions
  // ============================================================================
  
  /**
   * Update panel image after generation
   * Requirements: 11.2
   */
  updatePanelImage: (
    panelId: string,
    imageUrl: string,
    metadata: {
      seed: number;
      generationTime: number;
      qualityScore: number;
      width: number;
      height: number;
    }
  ) => void;

  /**
   * Mark panel as modified
   * Requirements: 11.5
   */
  markPanelAsModified: (panelId: string) => void;

  /**
   * Push operation to undo stack
   * Requirements: 11.7
   */
  // Using 'any' for operation parameter to support flexible operation types from undo/redo system
  pushOperation: (operation: unknown) => void;

  // ============================================================================
  // Tool Actions
  // ============================================================================
  
  /**
   * Set the active editing tool
   * Requirements: 8.1, 8.2, 8.3, 8.4
   */
  setActiveTool: (tool: Tool) => void;

  // ============================================================================
  // Clipboard Actions
  // ============================================================================
  
  /**
   * Copy a panel to clipboard
   * Requirements: 8.8
   */
  copyPanel: (panelId: string) => void;

  /**
   * Paste clipboard content to target panel
   * Requirements: 8.8
   */
  pastePanel: (targetPanelId: string) => void;

  /**
   * Duplicate a panel
   * Requirements: 8.8
   */
  duplicatePanel: (panelId: string, targetPanelId: string) => void;

  // ============================================================================
  // Configuration Persistence Actions
  // ============================================================================
  
  /**
   * Load a grid configuration
   * Requirements: 10.2
   */
  loadConfiguration: (config: GridConfiguration) => void;

  /**
   * Export current grid configuration
   * Requirements: 10.1, 10.3
   */
  exportConfiguration: () => GridConfiguration;

  /**
   * Reset to default configuration
   */
  resetConfiguration: (projectId: string) => void;

  // ============================================================================
  // Panel Query Helpers
  // ============================================================================
  
  /**
   * Get panel by ID
   */
  getPanelById: (panelId: string) => Panel | undefined;

  /**
   * Get panel by grid position
   */
  getPanelByPosition: (row: number, col: number) => Panel | undefined;

  /**
   * Get all panels
   */
  getAllPanels: () => Panel[];

  // ============================================================================
  // Preset Actions
  // ============================================================================
  
  /**
   * Apply a preset to the grid
   * Requirements: 14.1, 14.2, 14.5
   */
  applyPreset: (preset: Preset) => void;
}

// ============================================================================
// Default Values and Helpers
// ============================================================================

/**
 * Create default transform
 */
export const createDefaultTransform = (): Transform => ({
  position: { x: 0, y: 0 },
  scale: { x: 1.0, y: 1.0 },
  rotation: 0,
  pivot: { x: 0.5, y: 0.5 },
});

/**
 * Create default panel
 */
export const createDefaultPanel = (row: number, col: number): Panel => ({
  id: `panel-${row}-${col}`,
  position: { row, col },
  layers: [],
  transform: createDefaultTransform(),
  crop: null,
  annotations: [],
  metadata: {},
});

/**
 * Create default grid configuration
 */
export const createDefaultGridConfiguration = (projectId: string): GridConfiguration => {
  const panels: Panel[] = [];
  
  // Create 3x3 grid of panels
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      panels.push(createDefaultPanel(row, col));
    }
  }

  return {
    version: '1.0',
    projectId,
    panels,
    presets: [],
    metadata: {
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
    },
  };
};

// ============================================================================
// Store Implementation
// ============================================================================

/**
 * Create Grid Editor Store with Zustand
 */
export const useGridStore = create<GridStore>((set, get) => ({
  // ============================================================================
  // Initial State
  // ============================================================================
  
  config: createDefaultGridConfiguration('default'),
  selectedPanelIds: [],
  activeTool: 'select',
  clipboard: null,

  // ============================================================================
  // Selection Actions
  // ============================================================================
  
  selectPanel: (panelId: string, addToSelection: boolean = false) => {
    set((state) => {
      if (addToSelection) {
        // Add to selection if not already selected
        if (!state.selectedPanelIds.includes(panelId)) {
          return {
            selectedPanelIds: [...state.selectedPanelIds, panelId],
          };
        }
        return state;
      } else {
        // Replace selection with single panel
        return {
          selectedPanelIds: [panelId],
        };
      }
    });
  },

  deselectAll: () => {
    set({ selectedPanelIds: [] });
  },

  getSelectedPanels: () => {
    const { config, selectedPanelIds } = get();
    return config.panels.filter((panel) => selectedPanelIds.includes(panel.id));
  },

  // ============================================================================
  // Transform Actions
  // ============================================================================
  
  updatePanelTransform: (panelId: string, transform: Transform) => {
    set((state) => ({
      config: {
        ...state.config,
        panels: state.config.panels.map((panel) =>
          panel.id === panelId
            ? { ...panel, transform }
            : panel
        ),
        metadata: {
          ...state.config.metadata,
          modifiedAt: new Date().toISOString(),
        },
      },
    }));
  },

  updateMultiplePanelTransforms: (panelIds: string[], transform: Transform) => {
    set((state) => ({
      config: {
        ...state.config,
        panels: state.config.panels.map((panel) =>
          panelIds.includes(panel.id)
            ? { ...panel, transform }
            : panel
        ),
        metadata: {
          ...state.config.metadata,
          modifiedAt: new Date().toISOString(),
        },
      },
    }));
  },

  // ============================================================================
  // Crop Actions
  // ============================================================================
  
  updatePanelCrop: (panelId: string, crop: CropRegion | null) => {
    set((state) => ({
      config: {
        ...state.config,
        panels: state.config.panels.map((panel) =>
          panel.id === panelId
            ? { ...panel, crop }
            : panel
        ),
        metadata: {
          ...state.config.metadata,
          modifiedAt: new Date().toISOString(),
        },
      },
    }));
  },

  // ============================================================================
  // Layer Management Actions
  // ============================================================================
  
  addLayer: (panelId: string, layer: Layer) => {
    set((state) => ({
      config: {
        ...state.config,
        panels: state.config.panels.map((panel) =>
          panel.id === panelId
            ? { ...panel, layers: [...panel.layers, layer] }
            : panel
        ),
        metadata: {
          ...state.config.metadata,
          modifiedAt: new Date().toISOString(),
        },
      },
    }));
  },

  removeLayer: (panelId: string, layerId: string) => {
    set((state) => ({
      config: {
        ...state.config,
        panels: state.config.panels.map((panel) =>
          panel.id === panelId
            ? {
                ...panel,
                layers: panel.layers.filter((layer) => layer.id !== layerId),
              }
            : panel
        ),
        metadata: {
          ...state.config.metadata,
          modifiedAt: new Date().toISOString(),
        },
      },
    }));
  },

  reorderLayers: (panelId: string, layerId: string, newIndex: number) => {
    set((state) => ({
      config: {
        ...state.config,
        panels: state.config.panels.map((panel) => {
          if (panel.id !== panelId) return panel;

          const layers = [...panel.layers];
          const currentIndex = layers.findIndex((layer) => layer.id === layerId);

          if (currentIndex === -1) return panel;

          // Remove layer from current position
          const [layer] = layers.splice(currentIndex, 1);

          // Insert at new position
          layers.splice(newIndex, 0, layer);

          return { ...panel, layers };
        }),
        metadata: {
          ...state.config.metadata,
          modifiedAt: new Date().toISOString(),
        },
      },
    }));
  },

  updateLayer: (panelId: string, layerId: string, updates: Partial<Layer>) => {
    set((state) => ({
      config: {
        ...state.config,
        panels: state.config.panels.map((panel) =>
          panel.id === panelId
            ? {
                ...panel,
                layers: panel.layers.map((layer) =>
                  layer.id === layerId
                    ? { ...layer, ...updates }
                    : layer
                ),
              }
            : panel
        ),
        metadata: {
          ...state.config.metadata,
          modifiedAt: new Date().toISOString(),
        },
      },
    }));
  },

  toggleLayerVisibility: (panelId: string, layerId: string) => {
    set((state) => ({
      config: {
        ...state.config,
        panels: state.config.panels.map((panel) =>
          panel.id === panelId
            ? {
                ...panel,
                layers: panel.layers.map((layer) =>
                  layer.id === layerId
                    ? { ...layer, visible: !layer.visible }
                    : layer
                ),
              }
            : panel
        ),
        metadata: {
          ...state.config.metadata,
          modifiedAt: new Date().toISOString(),
        },
      },
    }));
  },

  toggleLayerLock: (panelId: string, layerId: string) => {
    set((state) => ({
      config: {
        ...state.config,
        panels: state.config.panels.map((panel) =>
          panel.id === panelId
            ? {
                ...panel,
                layers: panel.layers.map((layer) =>
                  layer.id === layerId
                    ? { ...layer, locked: !layer.locked }
                    : layer
                ),
              }
            : panel
        ),
        metadata: {
          ...state.config.metadata,
          modifiedAt: new Date().toISOString(),
        },
      },
    }));
  },

  // ============================================================================
  // Tool Actions
  // ============================================================================
  
  setActiveTool: (tool: Tool) => {
    set({ activeTool: tool });
  },

  // ============================================================================
  // Clipboard Actions
  // ============================================================================
  
  copyPanel: (panelId: string) => {
    const panel = get().getPanelById(panelId);
    if (panel) {
      set({ clipboard: { ...panel } });
    }
  },

  pastePanel: (targetPanelId: string) => {
    const { clipboard } = get();
    if (!clipboard) return;

    set((state) => ({
      config: {
        ...state.config,
        panels: state.config.panels.map((panel) =>
          panel.id === targetPanelId
            ? {
                ...panel,
                layers: clipboard.layers.map((layer) => ({
                  ...layer,
                  id: `${layer.id}-copy-${Date.now()}`,
                })),
                transform: clipboard.transform,
                crop: clipboard.crop,
              }
            : panel
        ),
        metadata: {
          ...state.config.metadata,
          modifiedAt: new Date().toISOString(),
        },
      },
    }));
  },

  duplicatePanel: (panelId: string, targetPanelId: string) => {
    get().copyPanel(panelId);
    get().pastePanel(targetPanelId);
  },

  // ============================================================================
  // Configuration Persistence Actions
  // ============================================================================
  
  loadConfiguration: (config: GridConfiguration) => {
    set({
      config,
      selectedPanelIds: [],
      activeTool: 'select',
    });
  },

  exportConfiguration: () => {
    return get().config;
  },

  resetConfiguration: (projectId: string) => {
    set({
      config: createDefaultGridConfiguration(projectId),
      selectedPanelIds: [],
      activeTool: 'select',
      clipboard: null,
    });
  },

  // ============================================================================
  // Panel Query Helpers
  // ============================================================================
  
  getPanelById: (panelId: string) => {
    return get().config.panels.find((panel) => panel.id === panelId);
  },

  getPanelByPosition: (row: number, col: number) => {
    return get().config.panels.find(
      (panel) => panel.position.row === row && panel.position.col === col
    );
  },

  getAllPanels: () => {
    return get().config.panels;
  },

  // ============================================================================
  // Generation Actions
  // ============================================================================
  
  updatePanelImage: (
    panelId: string,
    imageUrl: string,
    metadata: {
      seed: number;
      generationTime: number;
      qualityScore: number;
      width: number;
      height: number;
    }
  ) => {
    set((state) => ({
      config: {
        ...state.config,
        panels: state.config.panels.map((panel) => {
          if (panel.id !== panelId) return panel;

          // Create or update the image layer
          const imageLayer: Layer = {
            id: `layer-image-${Date.now()}`,
            name: 'Generated Image',
            type: 'image',
            visible: true,
            locked: false,
            opacity: 1.0,
            blendMode: 'normal',
            content: {
              type: 'image',
              url: imageUrl,
              naturalWidth: metadata.width,
              naturalHeight: metadata.height,
            },
          };

          // Replace first layer or add new layer
          const layers = panel.layers.length > 0
            ? [imageLayer, ...panel.layers.slice(1)]
            : [imageLayer];

          return {
            ...panel,
            layers,
            metadata: {
              ...panel.metadata,
              generatedAt: new Date().toISOString(),
              seed: metadata.seed,
              qualityScore: metadata.qualityScore,
              modified: false, // Reset modified flag after generation
            },
          };
        }),
        metadata: {
          ...state.config.metadata,
          modifiedAt: new Date().toISOString(),
        },
      },
    }));
  },

  markPanelAsModified: (panelId: string) => {
    set((state) => ({
      config: {
        ...state.config,
        panels: state.config.panels.map((panel) =>
          panel.id === panelId
            ? {
                ...panel,
                metadata: {
                  ...panel.metadata,
                  modified: true,
                },
              }
            : panel
        ),
        metadata: {
          ...state.config.metadata,
          modifiedAt: new Date().toISOString(),
        },
      },
    }));
  },

  // Using 'any' for _operation parameter to match interface signature
  pushOperation: (_operation: unknown) => {
    // This is a placeholder - the actual undo/redo is handled by useUndoRedoStore
    // This method is here for convenience so components can call it directly
    // In practice, components should import and use useUndoRedoStore directly
    console.warn('pushOperation called on GridStore - use useUndoRedoStore instead');
  },

  // ============================================================================
  // Preset Actions
  // ============================================================================
  
  applyPreset: (preset: Preset) => {
    set((state) => ({
      config: {
        ...state.config,
        panels: state.config.panels.map((panel, index) => ({
          ...panel,
          // Apply preset transform (preserve existing images)
          transform: preset.panelTransforms[index] || panel.transform,
          // Apply preset crop
          crop: preset.panelCrops[index] !== undefined ? preset.panelCrops[index] : panel.crop,
        })),
        metadata: {
          ...state.config.metadata,
          modifiedAt: new Date().toISOString(),
        },
      },
    }));
  },
}));

// Export alias for consistency with other components
export const useGridEditorStore = useGridStore;


