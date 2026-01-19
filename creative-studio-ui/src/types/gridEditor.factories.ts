/**
 * Advanced Grid Editor - Factory Functions
 * 
 * This file contains factory functions for creating default instances
 * of grid editor data structures.
 */

import {
  Point,
  Transform,
  CropRegion,
  Layer,
  Panel,
  GridConfiguration,
  ImageContent,
  AnnotationContent,
  EffectContent,
  Preset,
  Operation,
  ViewportState,
  DEFAULT_TRANSFORM,
  DEFAULT_CROP_REGION,
  DEFAULT_VIEWPORT_STATE,
  GRID_CONSTANTS,
} from './gridEditor';

// ============================================================================
// Geometry Factory Functions
// ============================================================================

export function createPoint(x: number = 0, y: number = 0): Point {
  return { x, y };
}

// ============================================================================
// Transform Factory Functions
// ============================================================================

export function createTransform(overrides?: Partial<Transform>): Transform {
  return {
    ...DEFAULT_TRANSFORM,
    ...overrides,
  };
}

export function createIdentityTransform(): Transform {
  return { ...DEFAULT_TRANSFORM };
}

// ============================================================================
// Crop Region Factory Functions
// ============================================================================

export function createCropRegion(overrides?: Partial<CropRegion>): CropRegion {
  return {
    ...DEFAULT_CROP_REGION,
    ...overrides,
  };
}

export function createFullCropRegion(): CropRegion {
  return { ...DEFAULT_CROP_REGION };
}

// ============================================================================
// Layer Content Factory Functions
// ============================================================================

export function createImageContent(
  url: string,
  naturalWidth: number,
  naturalHeight: number
): ImageContent {
  return {
    type: 'image',
    url,
    naturalWidth,
    naturalHeight,
  };
}

export function createAnnotationContent(): AnnotationContent {
  return {
    type: 'annotation',
    drawings: [],
    textAnnotations: [],
  };
}

export function createEffectContent(
  effectType: string,
  parameters: Record<string, unknown> = {}
): EffectContent {
  return {
    type: 'effect',
    effectType,
    parameters,
  };
}

// ============================================================================
// Layer Factory Functions
// ============================================================================

let layerIdCounter = 0;

export function generateLayerId(): string {
  return `layer-${Date.now()}-${layerIdCounter++}`;
}

export function createImageLayer(
  url: string,
  naturalWidth: number,
  naturalHeight: number,
  name: string = 'Image Layer'
): Layer {
  return {
    id: generateLayerId(),
    name,
    type: 'image',
    visible: true,
    locked: false,
    opacity: GRID_CONSTANTS.DEFAULT_LAYER_OPACITY,
    blendMode: 'normal',
    content: createImageContent(url, naturalWidth, naturalHeight),
  };
}

export function createAnnotationLayer(name: string = 'Annotation Layer'): Layer {
  return {
    id: generateLayerId(),
    name,
    type: 'annotation',
    visible: true,
    locked: false,
    opacity: GRID_CONSTANTS.DEFAULT_LAYER_OPACITY,
    blendMode: 'normal',
    content: createAnnotationContent(),
  };
}

export function createEffectLayer(
  effectType: string,
  parameters: Record<string, unknown> = {},
  name: string = 'Effect Layer'
): Layer {
  return {
    id: generateLayerId(),
    name,
    type: 'effect',
    visible: true,
    locked: false,
    opacity: GRID_CONSTANTS.DEFAULT_LAYER_OPACITY,
    blendMode: 'normal',
    content: createEffectContent(effectType, parameters),
  };
}

// ============================================================================
// Panel Factory Functions
// ============================================================================

export function createEmptyPanel(row: number, col: number): Panel {
  return {
    id: `panel-${row}-${col}`,
    position: { row, col },
    layers: [],
    transform: createIdentityTransform(),
    crop: null,
    annotations: [],
    metadata: {},
  };
}

export function createPanelWithImage(
  row: number,
  col: number,
  imageUrl: string,
  naturalWidth: number,
  naturalHeight: number
): Panel {
  const panel = createEmptyPanel(row, col);
  panel.layers.push(createImageLayer(imageUrl, naturalWidth, naturalHeight));
  return panel;
}

// ============================================================================
// Grid Configuration Factory Functions
// ============================================================================

export function createEmptyGridConfiguration(projectId: string): GridConfiguration {
  const now = new Date().toISOString();
  const panels: Panel[] = [];
  
  // Create 3x3 grid of empty panels
  for (let row = 0; row < GRID_CONSTANTS.ROWS; row++) {
    for (let col = 0; col < GRID_CONSTANTS.COLS; col++) {
      panels.push(createEmptyPanel(row, col));
    }
  }
  
  return {
    version: '1.0',
    projectId,
    panels,
    presets: [],
    metadata: {
      createdAt: now,
      modifiedAt: now,
    },
  };
}

// ============================================================================
// Preset Factory Functions
// ============================================================================

let presetIdCounter = 0;

export function generatePresetId(): string {
  return `preset-${Date.now()}-${presetIdCounter++}`;
}

export function createPreset(
  name: string,
  description: string,
  panelTransforms: Transform[],
  panelCrops: (CropRegion | null)[]
): Preset {
  if (panelTransforms.length !== GRID_CONSTANTS.TOTAL_PANELS) {
    throw new Error(`Preset must have exactly ${GRID_CONSTANTS.TOTAL_PANELS} panel transforms`);
  }
  if (panelCrops.length !== GRID_CONSTANTS.TOTAL_PANELS) {
    throw new Error(`Preset must have exactly ${GRID_CONSTANTS.TOTAL_PANELS} panel crops`);
  }
  
  return {
    id: generatePresetId(),
    name,
    description,
    panelTransforms,
    panelCrops,
  };
}

export function createDefaultPreset(name: string, description: string): Preset {
  const transforms = Array(GRID_CONSTANTS.TOTAL_PANELS).fill(null).map(() => createIdentityTransform());
  const crops = Array(GRID_CONSTANTS.TOTAL_PANELS).fill(null);
  
  return createPreset(name, description, transforms, crops);
}

// ============================================================================
// Viewport Factory Functions
// ============================================================================

export function createViewportState(overrides?: Partial<ViewportState>): ViewportState {
  return {
    ...DEFAULT_VIEWPORT_STATE,
    ...overrides,
  };
}

// ============================================================================
// Operation Factory Functions
// ============================================================================

export function createOperation(
  type: Operation['type'],
  panelId: string,
  before: unknown,
  after: unknown
): Operation {
  return {
    type,
    timestamp: Date.now(),
    data: {
      panelId,
      before,
      after,
    },
  };
}

// ============================================================================
// Predefined Presets
// ============================================================================

/**
 * Creates a cinematic preset with 16:9 aspect ratio crops
 */
export function createCinematicPreset(): Preset {
  const transforms = Array(GRID_CONSTANTS.TOTAL_PANELS).fill(null).map(() => createIdentityTransform());
  const crops = Array(GRID_CONSTANTS.TOTAL_PANELS).fill(null).map(() => ({
    x: 0,
    y: 0.125, // Crop top and bottom to achieve 16:9
    width: 1.0,
    height: 0.75,
  }));
  
  return createPreset(
    'Cinematic',
    'Wide-screen 16:9 aspect ratio for cinematic compositions',
    transforms,
    crops
  );
}

/**
 * Creates a comic book preset with varied panel sizes
 */
export function createComicBookPreset(): Preset {
  const transforms = Array(GRID_CONSTANTS.TOTAL_PANELS).fill(null).map(() => createIdentityTransform());
  
  // Varied crops for comic book effect
  const crops: (CropRegion | null)[] = [
    { x: 0, y: 0, width: 1.0, height: 0.6 }, // Top row - wide panels
    { x: 0, y: 0, width: 1.0, height: 0.6 },
    { x: 0, y: 0, width: 1.0, height: 0.6 },
    { x: 0.1, y: 0.1, width: 0.8, height: 0.8 }, // Middle row - square panels
    { x: 0.1, y: 0.1, width: 0.8, height: 0.8 },
    { x: 0.1, y: 0.1, width: 0.8, height: 0.8 },
    { x: 0, y: 0.2, width: 1.0, height: 0.8 }, // Bottom row - tall panels
    { x: 0, y: 0.2, width: 1.0, height: 0.8 },
    { x: 0, y: 0.2, width: 1.0, height: 0.8 },
  ];
  
  return createPreset(
    'Comic Book',
    'Varied panel sizes for dynamic comic book layouts',
    transforms,
    crops
  );
}

/**
 * Creates a portrait preset with vertical crops
 */
export function createPortraitPreset(): Preset {
  const transforms = Array(GRID_CONSTANTS.TOTAL_PANELS).fill(null).map(() => createIdentityTransform());
  const crops = Array(GRID_CONSTANTS.TOTAL_PANELS).fill(null).map(() => ({
    x: 0.2,
    y: 0,
    width: 0.6, // Crop sides for portrait orientation
    height: 1.0,
  }));
  
  return createPreset(
    'Portrait',
    'Vertical 9:16 aspect ratio for portrait compositions',
    transforms,
    crops
  );
}

/**
 * Creates a landscape preset with horizontal emphasis
 */
export function createLandscapePreset(): Preset {
  const transforms = Array(GRID_CONSTANTS.TOTAL_PANELS).fill(null).map(() => createIdentityTransform());
  const crops = Array(GRID_CONSTANTS.TOTAL_PANELS).fill(null).map(() => ({
    x: 0,
    y: 0.25,
    width: 1.0,
    height: 0.5, // Crop top and bottom for wide landscape
  }));
  
  return createPreset(
    'Landscape',
    'Ultra-wide aspect ratio for panoramic landscapes',
    transforms,
    crops
  );
}

/**
 * Returns all predefined presets
 */
export function getPredefinedPresets(): Preset[] {
  return [
    createCinematicPreset(),
    createComicBookPreset(),
    createPortraitPreset(),
    createLandscapePreset(),
  ];
}
