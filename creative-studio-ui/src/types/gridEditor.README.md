# Advanced Grid Editor - Type Definitions

This directory contains the complete type system for the Advanced Grid Editor feature, including TypeScript interfaces, Zod validation schemas, type guards, and factory functions.

## Files Overview

### `gridEditor.ts`
Core TypeScript interfaces and type definitions for all grid editor data structures.

**Key Types:**
- **Geometry**: `Point`, `Rectangle`
- **Transform**: `Transform` (position, scale, rotation, pivot)
- **Crop**: `CropRegion` (normalized 0-1 coordinates)
- **Layers**: `Layer`, `LayerContent`, `ImageContent`, `AnnotationContent`, `EffectContent`
- **Panels**: `Panel`, `PanelPosition`, `PanelMetadata`
- **Grid**: `GridConfiguration`, `GridMetadata`
- **Tools**: `Tool`, `TransformType`, `OperationType`
- **Viewport**: `ViewportState`
- **Backend**: `PanelGenerationConfig`, `GeneratedImage`
- **Errors**: `ErrorReport`, `ErrorCategory`, `ErrorSeverity`

**Constants:**
```typescript
GRID_CONSTANTS = {
  ROWS: 3,
  COLS: 3,
  TOTAL_PANELS: 9,
  MIN_ZOOM: 0.1,
  MAX_ZOOM: 10.0,
  DEFAULT_ZOOM: 1.0,
  ZOOM_STEP: 0.1,
  ROTATION_SNAP_ANGLE: 15,
  MAX_UNDO_STACK_SIZE: 50,
  MIN_CROP_SIZE: 0.01,
  MAX_LAYER_OPACITY: 1.0,
  MIN_LAYER_OPACITY: 0.0,
  DEFAULT_LAYER_OPACITY: 1.0,
}
```

### `gridEditor.validation.ts`
Zod schemas for runtime validation and TypeScript type guards.

**Validation Functions:**
- `validateGridConfiguration(config)` - Validates complete grid configuration
- `validatePanel(panel)` - Validates individual panel
- `validateTransform(transform)` - Validates transform values
- `validateCropRegion(crop)` - Validates crop region bounds
- `validateLayer(layer)` - Validates layer structure

**Type Guards:**
- `isPoint(value)`, `isRectangle(value)`
- `isTransform(value)`, `isCropRegion(value)`
- `isLayer(value)`, `isPanel(value)`
- `isGridConfiguration(value)`
- `isImageContent(content)`, `isAnnotationContent(content)`, `isEffectContent(content)`
- `isBlendMode(value)`, `isLayerType(value)`, `isTool(value)`

**Constraint Helpers:**
- `clamp(value, min, max)` - Clamps value to range
- `constrainCropRegion(crop)` - Ensures crop is within valid bounds
- `constrainTransform(transform)` - Ensures transform values are valid
- `constrainZoom(zoom)` - Ensures zoom is within valid range
- `constrainOpacity(opacity)` - Ensures opacity is 0-1
- `snapRotation(rotation, snapAngle)` - Snaps rotation to nearest angle
- `isValidPanelPosition(position)` - Validates panel position in grid
- `generatePanelId(row, col)` - Generates panel ID from position
- `parsePanelId(panelId)` - Extracts position from panel ID

### `gridEditor.factories.ts`
Factory functions for creating default instances of data structures.

**Geometry Factories:**
- `createPoint(x, y)` - Creates a point

**Transform Factories:**
- `createTransform(overrides)` - Creates transform with optional overrides
- `createIdentityTransform()` - Creates default identity transform

**Crop Factories:**
- `createCropRegion(overrides)` - Creates crop region with optional overrides
- `createFullCropRegion()` - Creates full-image crop (0,0,1,1)

**Layer Factories:**
- `createImageLayer(url, width, height, name)` - Creates image layer
- `createAnnotationLayer(name)` - Creates annotation layer
- `createEffectLayer(effectType, parameters, name)` - Creates effect layer
- `generateLayerId()` - Generates unique layer ID

**Panel Factories:**
- `createEmptyPanel(row, col)` - Creates empty panel at position
- `createPanelWithImage(row, col, url, width, height)` - Creates panel with image

**Grid Factories:**
- `createEmptyGridConfiguration(projectId)` - Creates empty 3x3 grid

**Preset Factories:**
- `createPreset(name, description, transforms, crops)` - Creates custom preset
- `createDefaultPreset(name, description)` - Creates preset with default values
- `createCinematicPreset()` - 16:9 cinematic aspect ratio
- `createComicBookPreset()` - Varied panel sizes for comic layouts
- `createPortraitPreset()` - 9:16 portrait aspect ratio
- `createLandscapePreset()` - Ultra-wide landscape aspect ratio
- `getPredefinedPresets()` - Returns all predefined presets

**Viewport Factories:**
- `createViewportState(overrides)` - Creates viewport state

**Operation Factories:**
- `createOperation(type, panelId, before, after)` - Creates undo/redo operation

## Usage Examples

### Creating a New Grid Configuration

```typescript
import { createEmptyGridConfiguration } from '@/types';

const config = createEmptyGridConfiguration('my-project-id');
// Creates a 3x3 grid with 9 empty panels
```

### Adding an Image to a Panel

```typescript
import { createImageLayer } from '@/types';

const imageLayer = createImageLayer(
  'https://example.com/image.jpg',
  1920,
  1080,
  'Background Image'
);

// Add to panel
panel.layers.push(imageLayer);
```

### Validating User Input

```typescript
import { validateTransform, constrainTransform } from '@/types';

// Validate transform from user input
const result = validateTransform(userInput);
if (!result.success) {
  console.error('Invalid transform:', result.error);
  return;
}

// Or constrain to valid values
const safeTransform = constrainTransform(userInput);
```

### Using Type Guards

```typescript
import { isImageContent, isAnnotationContent } from '@/types';

function renderLayer(layer: Layer) {
  if (isImageContent(layer.content)) {
    // TypeScript knows layer.content is ImageContent
    renderImage(layer.content.url);
  } else if (isAnnotationContent(layer.content)) {
    // TypeScript knows layer.content is AnnotationContent
    renderAnnotations(layer.content.drawings);
  }
}
```

### Applying Presets

```typescript
import { createCinematicPreset } from '@/types';

const cinematicPreset = createCinematicPreset();

// Apply to grid configuration
config.panels.forEach((panel, index) => {
  panel.transform = cinematicPreset.panelTransforms[index];
  panel.crop = cinematicPreset.panelCrops[index];
});
```

### Creating Custom Presets

```typescript
import { createPreset, createIdentityTransform, GRID_CONSTANTS } from '@/types';

const transforms = Array(GRID_CONSTANTS.TOTAL_PANELS)
  .fill(null)
  .map(() => createIdentityTransform());

const crops = Array(GRID_CONSTANTS.TOTAL_PANELS)
  .fill(null)
  .map(() => ({ x: 0.1, y: 0.1, width: 0.8, height: 0.8 }));

const customPreset = createPreset(
  'My Custom Preset',
  'Custom layout with centered crops',
  transforms,
  crops
);
```

### Constraining Values

```typescript
import { constrainCropRegion, snapRotation, constrainZoom } from '@/types';

// Ensure crop is within valid bounds
const safeCrop = constrainCropRegion({
  x: -0.1, // Will be clamped to 0
  y: 0.5,
  width: 1.5, // Will be clamped to max valid width
  height: 0.5,
});

// Snap rotation to 15-degree increments
const snappedRotation = snapRotation(47); // Returns 45

// Constrain zoom level
const safeZoom = constrainZoom(15); // Returns 10 (MAX_ZOOM)
```

### Working with Panel IDs

```typescript
import { generatePanelId, parsePanelId } from '@/types';

// Generate panel ID from position
const panelId = generatePanelId(1, 2); // "panel-1-2"

// Parse panel ID to get position
const position = parsePanelId('panel-1-2'); // { row: 1, col: 2 }
```

## Data Structure Relationships

```
GridConfiguration
├── panels: Panel[] (9 panels in 3x3 grid)
│   ├── id: string
│   ├── position: { row: 0-2, col: 0-2 }
│   ├── layers: Layer[]
│   │   ├── id: string
│   │   ├── type: 'image' | 'annotation' | 'effect'
│   │   ├── content: ImageContent | AnnotationContent | EffectContent
│   │   ├── opacity: 0-1
│   │   └── blendMode: BlendMode
│   ├── transform: Transform
│   │   ├── position: Point
│   │   ├── scale: Point
│   │   ├── rotation: number
│   │   └── pivot: Point
│   ├── crop: CropRegion | null
│   │   ├── x: 0-1
│   │   ├── y: 0-1
│   │   ├── width: 0-1
│   │   └── height: 0-1
│   └── annotations: DrawingElement[]
├── presets: Preset[]
│   ├── panelTransforms: Transform[9]
│   └── panelCrops: (CropRegion | null)[9]
└── metadata: GridMetadata
    ├── createdAt: string
    ├── modifiedAt: string
    ├── author?: string
    └── description?: string
```

## Validation Rules

### Transform Constraints
- **Scale**: Must be > 0 (minimum 0.01 enforced by constrainTransform)
- **Rotation**: -360 to 360 degrees
- **Pivot**: 0-1 normalized coordinates

### Crop Region Constraints
- **Position (x, y)**: 0-1 normalized coordinates
- **Size (width, height)**: MIN_CROP_SIZE (0.01) to 1.0
- **Bounds**: x + width ≤ 1, y + height ≤ 1

### Layer Constraints
- **Opacity**: 0-1 (MIN_LAYER_OPACITY to MAX_LAYER_OPACITY)
- **Blend Mode**: One of 'normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten'

### Panel Constraints
- **Position**: row and col must be 0-2 for 3x3 grid
- **Layers**: Array of valid Layer objects
- **Transform**: Must pass TransformSchema validation
- **Crop**: Must pass CropRegionSchema validation or be null

### Grid Configuration Constraints
- **Version**: Must match pattern /^\d+\.\d+$/ (e.g., "1.0")
- **Panels**: Must have exactly 9 panels (TOTAL_PANELS)
- **Metadata**: createdAt and modifiedAt must be valid ISO 8601 datetime strings

## Best Practices

1. **Always validate user input** using the validation functions before applying to state
2. **Use factory functions** to create new instances with proper defaults
3. **Use type guards** for type-safe discriminated union handling
4. **Use constraint helpers** to ensure values stay within valid ranges
5. **Use constants** from GRID_CONSTANTS instead of magic numbers
6. **Generate IDs** using the provided generator functions for consistency
7. **Validate before export** to ensure data integrity when saving configurations

## Testing

All validation schemas and type guards should be tested with:
- Valid inputs (should pass)
- Invalid inputs (should fail with appropriate errors)
- Edge cases (boundary values, empty arrays, null values)
- Constraint functions (should clamp to valid ranges)

Example test:
```typescript
import { validateCropRegion, constrainCropRegion } from '@/types';

test('validates crop region within bounds', () => {
  const result = validateCropRegion({ x: 0, y: 0, width: 1, height: 1 });
  expect(result.success).toBe(true);
});

test('rejects crop region outside bounds', () => {
  const result = validateCropRegion({ x: 0, y: 0, width: 1.5, height: 1 });
  expect(result.success).toBe(false);
});

test('constrains crop region to valid bounds', () => {
  const crop = constrainCropRegion({ x: -0.1, y: 0, width: 1.5, height: 1 });
  expect(crop.x).toBe(0);
  expect(crop.width).toBeLessThanOrEqual(1);
});
```

## Migration Guide

When updating these types:

1. **Update the version** in GridConfiguration if breaking changes
2. **Add migration functions** to convert old formats to new
3. **Update validation schemas** to match new structure
4. **Update factory functions** to create new structure
5. **Update documentation** with new examples
6. **Add tests** for new validation rules

## Related Files

- **State Management**: `src/stores/gridEditorStore.ts`, `src/stores/undoRedoStore.ts`, `src/stores/viewportStore.ts`
- **Components**: `src/components/GridEditor/` (to be implemented)
- **Services**: `src/services/gridApi.ts`, `src/services/imageLoader.ts` (to be implemented)
