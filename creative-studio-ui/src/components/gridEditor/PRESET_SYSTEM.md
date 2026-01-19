# Preset System Documentation

## Overview

The Preset System provides predefined and custom grid layouts for the Advanced Grid Editor. It allows users to quickly apply professional composition styles and save their own custom configurations.

**Validates Requirements:** 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7

## Architecture

### Components

1. **PresetStore** (`stores/gridEditor/presetStore.ts`)
   - Manages preset state and persistence
   - Provides default presets (Cinematic, Comic, Portrait, Landscape)
   - Handles custom preset creation and deletion
   - Persists custom presets to localStorage

2. **PresetPanel** (`components/gridEditor/PresetPanel.tsx`)
   - UI for browsing and applying presets
   - Displays preset thumbnails and descriptions
   - Provides "Save as Preset" functionality
   - Allows deletion of custom presets

3. **GridAPIService** (`services/gridEditor/GridAPIService.ts`)
   - Backend integration for preset-based generation
   - Sends preset style parameters to backend
   - Handles batch generation with preset configurations

4. **PresetStyleExtractor** (`services/gridEditor/PresetStyleExtractor.ts`)
   - Analyzes preset configurations
   - Extracts style parameters for backend
   - Converts transforms and crops to style descriptors

## Default Presets

### 1. Default Preset
- **ID:** `preset-default`
- **Description:** Standard 3x3 grid with no transformations
- **Use Case:** Clean slate for custom compositions
- **Characteristics:**
  - No transforms applied
  - No crops applied
  - Equal panel sizing

### 2. Cinematic Preset
- **ID:** `preset-cinematic`
- **Description:** Widescreen 16:9 format with letterbox crops
- **Use Case:** Film-style storytelling, dramatic scenes
- **Characteristics:**
  - 1.2x scale for dramatic effect
  - Letterbox crops (16:9 aspect ratio)
  - Horizontal emphasis

### 3. Comic Book Preset
- **ID:** `preset-comic`
- **Description:** Dynamic panel layout inspired by comic books
- **Use Case:** Action sequences, varied compositions
- **Characteristics:**
  - Varied rotations (-3° to +3°)
  - Dynamic scaling (1.1x to 1.2x)
  - Center panel emphasized
  - Asymmetric crops

### 4. Portrait Preset
- **ID:** `preset-portrait`
- **Description:** Vertical composition for character focus
- **Use Case:** Character portraits, vertical scenes
- **Characteristics:**
  - Vertical stretch (1.15x height)
  - Side crops for portrait aspect
  - Centered composition

### 5. Landscape Preset
- **ID:** `preset-landscape`
- **Description:** Horizontal composition for wide vistas
- **Use Case:** Environmental shots, panoramic scenes
- **Characteristics:**
  - Horizontal stretch (1.15x width)
  - Top/bottom crops for landscape aspect
  - Wide field of view

## Usage

### Basic Usage

```typescript
import { PresetPanel } from '@/components/gridEditor/PresetPanel';
import { usePresetStore } from '@/stores/gridEditor/presetStore';
import { useGridEditorStore } from '@/stores/gridEditorStore';

function MyGridEditor() {
  const [showPresets, setShowPresets] = useState(false);

  return (
    <div>
      <button onClick={() => setShowPresets(true)}>
        Show Presets
      </button>
      
      {showPresets && (
        <PresetPanel onClose={() => setShowPresets(false)} />
      )}
    </div>
  );
}
```

### Programmatic Preset Application

```typescript
import { usePresetStore } from '@/stores/gridEditor/presetStore';
import { useGridEditorStore } from '@/stores/gridEditorStore';

function applyPresetById(presetId: string) {
  const { getPresetById } = usePresetStore();
  const { applyPreset } = useGridEditorStore();
  
  const preset = getPresetById(presetId);
  if (preset) {
    applyPreset(preset);
  }
}

// Apply cinematic preset
applyPresetById('preset-cinematic');
```

### Creating Custom Presets

```typescript
import { usePresetStore, createPresetFromPanels } from '@/stores/gridEditor/presetStore';
import { useGridEditorStore } from '@/stores/gridEditorStore';

function saveCurrentAsPreset(name: string, description: string) {
  const { addCustomPreset } = usePresetStore();
  const { panels } = useGridEditorStore();
  
  const presetData = createPresetFromPanels(
    name,
    description,
    panels.map(p => ({ transform: p.transform, crop: p.crop }))
  );
  
  const presetId = addCustomPreset(presetData);
  console.log('Created preset:', presetId);
}
```

### Backend Integration

```typescript
import { gridApi } from '@/services/gridEditor/GridAPIService';
import { extractPresetStyleParams } from '@/services/gridEditor/PresetStyleExtractor';

async function generateWithPreset(preset: Preset, panels: Panel[]) {
  // Extract style parameters from preset
  const styleParams = extractPresetStyleParams(preset);
  
  // Create generation configs
  const panelConfigs = panels.map((panel, index) => ({
    panelId: panel.id,
    prompt: 'Your generation prompt',
    seed: Math.floor(Math.random() * 1000000),
    transform: preset.panelTransforms[index],
    crop: preset.panelCrops[index],
    styleReference: 'master-coherence-sheet-url',
    presetId: preset.id,
    presetName: preset.name,
    presetStyleParams: styleParams,
  }));
  
  // Generate with preset parameters
  const response = await gridApi.generateWithPreset(
    preset.id,
    preset.name,
    panelConfigs,
    styleParams
  );
  
  if (response.success) {
    console.log('Generation complete:', response.data);
  }
}
```

## Preset Style Parameters

When generating with presets, the following style parameters are extracted and sent to the backend:

### Aspect Ratio
- Calculated from crop regions
- Common values: `16:9`, `4:3`, `3:2`, `9:16`, `1:1`
- Custom ratios: `width:height` format

### Composition Style
- Determined from preset name and characteristics
- Values: `cinematic`, `comic`, `portrait`, `landscape`, `standard`, `dynamic`, `dramatic`

### Crop Style
- Analyzed from crop regions
- Values: `none`, `letterbox`, `pillarbox`, `centered`, `dynamic`

### Transform Style
- Analyzed from transforms
- Values: `stable`, `subtle`, `dramatic`

## API Reference

### PresetStore

```typescript
interface PresetStore {
  // State
  presets: Preset[];
  customPresets: Preset[];
  selectedPresetId: string | null;
  
  // Actions
  loadDefaultPresets: () => void;
  addCustomPreset: (preset: Omit<Preset, 'id'>) => string;
  deleteCustomPreset: (presetId: string) => boolean;
  getPresetById: (presetId: string) => Preset | undefined;
  getAllPresets: () => Preset[];
  selectPreset: (presetId: string | null) => void;
  updatePresetThumbnail: (presetId: string, thumbnail: string) => void;
}
```

### GridStore (Preset Methods)

```typescript
interface GridStore {
  // Apply preset to grid
  applyPreset: (preset: Preset) => void;
}
```

### GridAPIService (Preset Methods)

```typescript
class GridAPIService {
  // Generate panels with preset parameters
  async generateWithPreset(
    presetId: string,
    presetName: string,
    panels: PanelGenerationConfig[],
    presetStyleParams?: Record<string, any>
  ): Promise<ApiResponse<BatchGenerationResponse>>;
}
```

### PresetStyleExtractor

```typescript
// Extract style parameters from preset
function extractPresetStyleParams(preset: Preset): PresetStyleParams;

// Extract style parameters for specific panel
function extractPanelStyleParams(
  preset: Preset,
  panelIndex: number
): PresetStyleParams;

// Create generation config with preset
function createGenerationConfigWithPreset(
  panelId: string,
  prompt: string,
  seed: number,
  transform: Transform,
  crop: CropRegion | null,
  styleReference: string,
  preset: Preset,
  panelIndex: number
): PanelGenerationConfig;
```

## Data Persistence

### LocalStorage
Custom presets are automatically persisted to localStorage under the key `grid-editor-presets`.

```typescript
{
  customPresets: Preset[];
  selectedPresetId: string | null;
}
```

### Backend Storage
Grid configurations (including presets) can be uploaded to the backend:

```typescript
const response = await gridApi.uploadGridConfiguration(config);
// Returns: { configId, url, timestamp }
```

## Styling

The preset panel uses CSS custom properties for theming:

```css
--bg-primary: Background color
--bg-secondary: Secondary background
--bg-tertiary: Tertiary background
--text-primary: Primary text color
--text-secondary: Secondary text color
--border-color: Border color
--primary-color: Primary accent color
--primary-hover: Primary hover color
--hover-bg: Hover background
```

## Best Practices

1. **Preset Naming**
   - Use descriptive names that indicate the preset's purpose
   - Keep names concise (under 50 characters)
   - Use title case for consistency

2. **Preset Descriptions**
   - Explain the use case and characteristics
   - Keep under 200 characters
   - Mention key features (aspect ratio, style, etc.)

3. **Custom Presets**
   - Test presets with different content before saving
   - Use meaningful names that reflect the composition style
   - Consider creating presets for recurring project needs

4. **Backend Integration**
   - Always include preset style parameters in generation requests
   - Handle generation failures gracefully
   - Provide user feedback during generation

5. **Performance**
   - Presets are lightweight (only transforms and crops)
   - Custom presets are persisted locally for fast access
   - Thumbnail generation is optional and can be deferred

## Troubleshooting

### Preset Not Applying
- Check that the preset has 9 transforms and 9 crops
- Verify the preset ID exists in the store
- Ensure `applyPreset` is called after preset selection

### Custom Preset Not Persisting
- Check browser localStorage is enabled
- Verify localStorage quota is not exceeded
- Check for console errors during save

### Backend Generation Failing
- Verify preset style parameters are correctly formatted
- Check backend API endpoint is accessible
- Review backend logs for parameter validation errors

### Preset Thumbnails Not Showing
- Thumbnails are optional and may be undefined
- Use `updatePresetThumbnail` to add thumbnails
- Generate thumbnails from canvas using `generatePresetThumbnail`

## Future Enhancements

1. **Preset Sharing**
   - Export/import preset files
   - Share presets between users
   - Preset marketplace

2. **Advanced Presets**
   - Animation presets with keyframes
   - Layer-specific presets
   - Effect presets

3. **Preset Preview**
   - Real-time preview before applying
   - Side-by-side comparison
   - Animated transitions

4. **Smart Presets**
   - AI-suggested presets based on content
   - Adaptive presets that adjust to panel content
   - Context-aware preset recommendations

## Related Documentation

- [Grid Editor Overview](./README.md)
- [State Management](../../stores/gridEditor/README.md)
- [Backend Integration](../../services/gridEditor/README.md)
- [Design Document](../../../.kiro/specs/advanced-grid-editor/design.md)
- [Requirements](../../../.kiro/specs/advanced-grid-editor/requirements.md)
