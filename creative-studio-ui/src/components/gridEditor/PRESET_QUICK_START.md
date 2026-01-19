# Preset System Quick Start Guide

## 5-Minute Integration

### Step 1: Add Preset Panel to Your UI

```tsx
import { PresetPanel } from '@/components/gridEditor/PresetPanel';
import '@/components/gridEditor/PresetPanel.css';

function MyEditor() {
  const [showPresets, setShowPresets] = useState(false);

  return (
    <div>
      <button onClick={() => setShowPresets(true)}>
        Presets
      </button>
      
      {showPresets && (
        <PresetPanel onClose={() => setShowPresets(false)} />
      )}
    </div>
  );
}
```

### Step 2: Apply Presets Programmatically

```tsx
import { usePresetStore } from '@/stores/gridEditor/presetStore';
import { useGridEditorStore } from '@/stores/gridEditorStore';

function QuickPresets() {
  const { getPresetById } = usePresetStore();
  const { applyPreset } = useGridEditorStore();

  const apply = (id: string) => {
    const preset = getPresetById(id);
    if (preset) applyPreset(preset);
  };

  return (
    <div>
      <button onClick={() => apply('preset-cinematic')}>Cinematic</button>
      <button onClick={() => apply('preset-comic')}>Comic</button>
      <button onClick={() => apply('preset-portrait')}>Portrait</button>
    </div>
  );
}
```

### Step 3: Save Custom Presets

```tsx
import { usePresetStore, createPresetFromPanels } from '@/stores/gridEditor/presetStore';
import { useGridEditorStore } from '@/stores/gridEditorStore';

function SavePreset() {
  const { addCustomPreset } = usePresetStore();
  const { panels } = useGridEditorStore();

  const save = () => {
    const preset = createPresetFromPanels(
      'My Preset',
      'Custom layout',
      panels.map(p => ({ transform: p.transform, crop: p.crop }))
    );
    addCustomPreset(preset);
  };

  return <button onClick={save}>Save Current Layout</button>;
}
```

## Available Presets

| ID | Name | Description |
|----|------|-------------|
| `preset-default` | Default | Standard 3x3 grid |
| `preset-cinematic` | Cinematic | 16:9 letterbox |
| `preset-comic` | Comic Book | Dynamic panels |
| `preset-portrait` | Portrait | Vertical emphasis |
| `preset-landscape` | Landscape | Horizontal emphasis |

## Common Tasks

### Get All Presets
```tsx
const { getAllPresets } = usePresetStore();
const presets = getAllPresets();
```

### Delete Custom Preset
```tsx
const { deleteCustomPreset } = usePresetStore();
deleteCustomPreset('preset-custom-123');
```

### Check Selected Preset
```tsx
const { selectedPresetId } = usePresetStore();
console.log('Active preset:', selectedPresetId);
```

### Generate with Preset
```tsx
import { gridApi } from '@/services/gridEditor/GridAPIService';
import { extractPresetStyleParams } from '@/services/gridEditor/PresetStyleExtractor';

const styleParams = extractPresetStyleParams(preset);
const response = await gridApi.generateWithPreset(
  preset.id,
  preset.name,
  panelConfigs,
  styleParams
);
```

## Styling

Override CSS custom properties:

```css
.preset-panel {
  --primary-color: #007bff;
  --bg-secondary: #1e1e1e;
  --text-primary: #ffffff;
}
```

## Full Documentation

See [PRESET_SYSTEM.md](./PRESET_SYSTEM.md) for complete documentation.
