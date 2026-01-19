/**
 * Advanced Grid Editor - Validation Schemas and Type Guards
 * 
 * This file contains Zod schemas for runtime validation and TypeScript
 * type guards for type-safe operations.
 */

import { z } from 'zod';
import {
  Point,
  Rectangle,
  Transform,
  CropRegion,
  Layer,
  Panel,
  GridConfiguration,
  PanelPosition,
  BlendMode,
  LayerType,
  Tool,
  TransformType,
  OperationType,
  ErrorCategory,
  ErrorSeverity,
  GRID_CONSTANTS,
  ImageContent,
  AnnotationContent,
  EffectContent,
  LayerContent,
} from './gridEditor';

// ============================================================================
// Zod Schemas for Runtime Validation
// ============================================================================

// Geometry Primitives
export const PointSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const RectangleSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
});

// Transform Schema
export const TransformSchema = z.object({
  position: PointSchema,
  scale: PointSchema.refine(
    (scale) => scale.x > 0 && scale.y > 0,
    { message: 'Scale values must be positive' }
  ),
  rotation: z.number().min(-360).max(360),
  pivot: PointSchema.refine(
    (pivot) => pivot.x >= 0 && pivot.x <= 1 && pivot.y >= 0 && pivot.y <= 1,
    { message: 'Pivot values must be between 0 and 1' }
  ),
});

// Crop Region Schema
export const CropRegionSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().min(GRID_CONSTANTS.MIN_CROP_SIZE).max(1),
  height: z.number().min(GRID_CONSTANTS.MIN_CROP_SIZE).max(1),
}).refine(
  (crop) => crop.x + crop.width <= 1 && crop.y + crop.height <= 1,
  { message: 'Crop region must be within bounds (0-1)' }
);

// Layer Content Schemas
export const ImageContentSchema = z.object({
  type: z.literal('image'),
  url: z.string().url(),
  naturalWidth: z.number().positive(),
  naturalHeight: z.number().positive(),
});

export const DrawingElementSchema = z.object({
  id: z.string(),
  type: z.enum(['path', 'rectangle', 'ellipse', 'line']),
  points: z.array(PointSchema),
  style: z.object({
    strokeColor: z.string(),
    strokeWidth: z.number().positive(),
    fillColor: z.string().optional(),
    opacity: z.number().min(0).max(1),
  }),
});

export const TextAnnotationSchema = z.object({
  id: z.string(),
  text: z.string(),
  position: PointSchema,
  style: z.object({
    fontSize: z.number().positive(),
    fontFamily: z.string(),
    color: z.string(),
    backgroundColor: z.string().optional(),
  }),
});

export const AnnotationContentSchema = z.object({
  type: z.literal('annotation'),
  drawings: z.array(DrawingElementSchema),
  textAnnotations: z.array(TextAnnotationSchema),
});

export const EffectContentSchema = z.object({
  type: z.literal('effect'),
  effectType: z.string(),
  parameters: z.record(z.string(), z.unknown()),
});

export const LayerContentSchema = z.discriminatedUnion('type', [
  ImageContentSchema,
  AnnotationContentSchema,
  EffectContentSchema,
]);

// Layer Schema
export const LayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['image', 'annotation', 'effect']),
  visible: z.boolean(),
  locked: z.boolean(),
  opacity: z.number().min(GRID_CONSTANTS.MIN_LAYER_OPACITY).max(GRID_CONSTANTS.MAX_LAYER_OPACITY),
  blendMode: z.enum(['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten']),
  content: LayerContentSchema,
});

// Panel Schema
export const PanelPositionSchema = z.object({
  row: z.number().int().min(0).max(GRID_CONSTANTS.ROWS - 1),
  col: z.number().int().min(0).max(GRID_CONSTANTS.COLS - 1),
});

export const PanelMetadataSchema = z.object({
  generatedAt: z.string().datetime().optional(),
  seed: z.number().int().optional(),
  qualityScore: z.number().min(0).max(1).optional(),
});

export const PanelSchema = z.object({
  id: z.string(),
  position: PanelPositionSchema,
  layers: z.array(LayerSchema),
  transform: TransformSchema,
  crop: CropRegionSchema.nullable(),
  annotations: z.array(DrawingElementSchema),
  metadata: PanelMetadataSchema,
});

// Preset Schema
export const PresetSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  thumbnail: z.string().url().optional(),
  panelTransforms: z.array(TransformSchema).length(GRID_CONSTANTS.TOTAL_PANELS),
  panelCrops: z.array(CropRegionSchema.nullable()).length(GRID_CONSTANTS.TOTAL_PANELS),
});

// Grid Configuration Schema
export const GridMetadataSchema = z.object({
  createdAt: z.string().datetime(),
  modifiedAt: z.string().datetime(),
  author: z.string().optional(),
  description: z.string().optional(),
});

export const GridConfigurationSchema = z.object({
  version: z.string().regex(/^\d+\.\d+$/),
  projectId: z.string().min(1),
  panels: z.array(PanelSchema).length(GRID_CONSTANTS.TOTAL_PANELS),
  presets: z.array(PresetSchema),
  metadata: GridMetadataSchema,
});

// ============================================================================
// Type Guards
// ============================================================================

export function isPoint(value: unknown): value is Point {
  return PointSchema.safeParse(value).success;
}

export function isRectangle(value: unknown): value is Rectangle {
  return RectangleSchema.safeParse(value).success;
}

export function isTransform(value: unknown): value is Transform {
  return TransformSchema.safeParse(value).success;
}

export function isCropRegion(value: unknown): value is CropRegion {
  return CropRegionSchema.safeParse(value).success;
}

export function isLayer(value: unknown): value is Layer {
  return LayerSchema.safeParse(value).success;
}

export function isPanel(value: unknown): value is Panel {
  return PanelSchema.safeParse(value).success;
}

export function isGridConfiguration(value: unknown): value is GridConfiguration {
  return GridConfigurationSchema.safeParse(value).success;
}

export function isImageContent(content: LayerContent): content is ImageContent {
  return content.type === 'image';
}

export function isAnnotationContent(content: LayerContent): content is AnnotationContent {
  return content.type === 'annotation';
}

export function isEffectContent(content: LayerContent): content is EffectContent {
  return content.type === 'effect';
}

export function isBlendMode(value: string): value is BlendMode {
  return ['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten'].includes(value);
}

export function isLayerType(value: string): value is LayerType {
  return ['image', 'annotation', 'effect'].includes(value);
}

export function isTool(value: string): value is Tool {
  return ['select', 'crop', 'rotate', 'scale', 'pan', 'annotate'].includes(value);
}

export function isTransformType(value: string): value is TransformType {
  return ['position', 'scale', 'rotation'].includes(value);
}

export function isOperationType(value: string): value is OperationType {
  return [
    'transform',
    'crop',
    'layer_add',
    'layer_remove',
    'layer_reorder',
    'layer_modify',
    'annotation_add',
    'annotation_remove',
  ].includes(value);
}

export function isErrorCategory(value: string): value is ErrorCategory {
  return [
    'user_input',
    'file_io',
    'backend_communication',
    'performance',
    'validation',
    'unknown',
  ].includes(value);
}

export function isErrorSeverity(value: string): value is ErrorSeverity {
  return ['info', 'warning', 'error', 'critical'].includes(value);
}

// ============================================================================
// Validation Functions
// ============================================================================

export function validateGridConfiguration(config: unknown): {
  success: boolean;
  data?: z.infer<typeof GridConfigurationSchema>;
  error?: z.ZodError;
} {
  const result = GridConfigurationSchema.safeParse(config);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

export function validatePanel(panel: unknown): {
  success: boolean;
  data?: z.infer<typeof PanelSchema>;
  error?: z.ZodError;
} {
  const result = PanelSchema.safeParse(panel);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

export function validateTransform(transform: unknown): {
  success: boolean;
  data?: z.infer<typeof TransformSchema>;
  error?: z.ZodError;
} {
  const result = TransformSchema.safeParse(transform);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

export function validateCropRegion(crop: unknown): {
  success: boolean;
  data?: z.infer<typeof CropRegionSchema>;
  error?: z.ZodError;
} {
  const result = CropRegionSchema.safeParse(crop);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

export function validateLayer(layer: unknown): {
  success: boolean;
  data?: z.infer<typeof LayerSchema>;
  error?: z.ZodError;
} {
  const result = LayerSchema.safeParse(layer);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

// ============================================================================
// Constraint Validation Helpers
// ============================================================================

/**
 * Clamps a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Constrains a crop region to valid bounds (0-1)
 */
export function constrainCropRegion(crop: CropRegion): CropRegion {
  const x = clamp(crop.x, 0, 1 - GRID_CONSTANTS.MIN_CROP_SIZE);
  const y = clamp(crop.y, 0, 1 - GRID_CONSTANTS.MIN_CROP_SIZE);
  const maxWidth = 1 - x;
  const maxHeight = 1 - y;
  const width = clamp(crop.width, GRID_CONSTANTS.MIN_CROP_SIZE, maxWidth);
  const height = clamp(crop.height, GRID_CONSTANTS.MIN_CROP_SIZE, maxHeight);
  
  return { x, y, width, height };
}

/**
 * Constrains transform values to valid ranges
 */
export function constrainTransform(transform: Transform): Transform {
  return {
    position: transform.position,
    scale: {
      x: Math.max(0.01, transform.scale.x),
      y: Math.max(0.01, transform.scale.y),
    },
    rotation: clamp(transform.rotation, -360, 360),
    pivot: {
      x: clamp(transform.pivot.x, 0, 1),
      y: clamp(transform.pivot.y, 0, 1),
    },
  };
}

/**
 * Constrains zoom level to valid range
 */
export function constrainZoom(zoom: number): number {
  return clamp(zoom, GRID_CONSTANTS.MIN_ZOOM, GRID_CONSTANTS.MAX_ZOOM);
}

/**
 * Constrains layer opacity to valid range
 */
export function constrainOpacity(opacity: number): number {
  return clamp(opacity, GRID_CONSTANTS.MIN_LAYER_OPACITY, GRID_CONSTANTS.MAX_LAYER_OPACITY);
}

/**
 * Snaps rotation to nearest snap angle if within threshold
 */
export function snapRotation(rotation: number, snapAngle: number = GRID_CONSTANTS.ROTATION_SNAP_ANGLE): number {
  const normalized = rotation % 360;
  const remainder = normalized % snapAngle;
  
  if (Math.abs(remainder) < snapAngle / 4) {
    return normalized - remainder;
  }
  if (Math.abs(remainder - snapAngle) < snapAngle / 4) {
    return normalized + (snapAngle - remainder);
  }
  
  return rotation;
}

/**
 * Validates panel position is within grid bounds
 */
export function isValidPanelPosition(position: PanelPosition): boolean {
  return (
    position.row >= 0 &&
    position.row < GRID_CONSTANTS.ROWS &&
    position.col >= 0 &&
    position.col < GRID_CONSTANTS.COLS
  );
}

/**
 * Generates a unique panel ID based on position
 */
export function generatePanelId(row: number, col: number): string {
  return `panel-${row}-${col}`;
}

/**
 * Parses panel ID to extract position
 */
export function parsePanelId(panelId: string): PanelPosition | null {
  const match = panelId.match(/^panel-(\d+)-(\d+)$/);
  if (!match) return null;
  
  const row = parseInt(match[1], 10);
  const col = parseInt(match[2], 10);
  
  if (isValidPanelPosition({ row, col })) {
    return { row, col };
  }
  
  return null;
}
