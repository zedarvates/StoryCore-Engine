# Generation Button Toolbar Integration Guide

This guide explains how to integrate the `GenerationButtonToolbar` component into both editor and dashboard contexts.

## Overview

The `GenerationButtonToolbar` is a container component that displays all generation buttons (Prompt, Image, Video, Audio) in a unified toolbar layout. It manages dialog state, handles generation workflow, and adapts its appearance based on the context (editor or dashboard).

## Features

- **Context-Aware Layout**: Automatically adapts styling for editor or dashboard contexts
- **Dialog Management**: Handles opening/closing of all generation dialogs
- **Pipeline Integration**: Connects to the generation store for state management
- **Progress Tracking**: Displays progress modal during generation
- **Responsive Design**: Adapts to different screen sizes
- **Keyboard Shortcuts**: All buttons support keyboard shortcuts (Ctrl+Shift+P/I/V/A)

## Installation

The toolbar is already part of the generation-buttons package:

```typescript
import { GenerationButtonToolbar } from '@/components/generation-buttons';
```

## Basic Usage

### Editor Context

```typescript
import { GenerationButtonToolbar } from '@/components/generation-buttons';
import type { Shot, Sequence, GeneratedAsset } from '@/types';

function EditorLayout() {
  const [currentShot, setCurrentShot] = useState<Shot>(...);
  const [currentSequence, setCurrentSequence] = useState<Sequence>(...);

  const handleGenerationComplete = (asset: GeneratedAsset) => {
    // Handle the generated asset
    console.log('Generated:', asset);
  };

  return (
    <div className="editor-layout">
      {/* Toolbar at top of editor */}
      <GenerationButtonToolbar
        context="editor"
        currentShot={currentShot}
        currentSequence={currentSequence}
        onGenerationComplete={handleGenerationComplete}
      />
      
      {/* Editor content */}
      <div className="editor-content">
        {/* Canvas, timeline, etc. */}
      </div>
    </div>
  );
}
```

### Dashboard Context

```typescript
import { GenerationButtonToolbar } from '@/components/generation-buttons';
import type { GeneratedAsset } from '@/types';

function ProjectDashboard() {
  const handleGenerationComplete = (asset: GeneratedAsset) => {
    // Add asset to project
    console.log('Generated:', asset);
  };

  return (
    <div className="dashboard-layout">
      <div className="dashboard-section">
        <h2>Quick Generation</h2>
        <GenerationButtonToolbar
          context="dashboard"
          onGenerationComplete={handleGenerationComplete}
        />
      </div>
    </div>
  );
}
```

## Props

### GenerationButtonToolbarProps

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `context` | `'editor' \| 'dashboard'` | Yes | Context where toolbar is displayed |
| `currentShot` | `Shot` | No | Current shot (editor context) |
| `currentSequence` | `Sequence` | No | Current sequence (editor context) |
| `onGenerationComplete` | `(asset: GeneratedAsset) => void` | No | Callback when generation completes |
| `className` | `string` | No | Custom CSS class for styling |

## Integration Examples

### 1. Editor Integration with EditorLayout

```typescript
// src/components/EditorLayout.tsx
import { GenerationButtonToolbar } from '@/components/generation-buttons';

export function EditorLayout({ children }: { children: React.ReactNode }) {
  const { currentShot, currentSequence } = useEditorStore();

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Left Sidebar */}
      <AssetPanel />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Generation Toolbar */}
        <GenerationButtonToolbar
          context="editor"
          currentShot={currentShot}
          currentSequence={currentSequence}
          onGenerationComplete={(asset) => {
            // Add asset to current shot or sequence
            addAssetToShot(currentShot.id, asset);
          }}
        />
        
        {/* Canvas Area */}
        <div className="flex-1">
          {children}
        </div>
      </div>
      
      {/* Right Sidebar */}
      <PropertiesPanel />
    </div>
  );
}
```

### 2. Dashboard Integration with ProjectDashboardNew

```typescript
// src/components/workspace/ProjectDashboardNew.tsx
import { GenerationButtonToolbar } from '@/components/generation-buttons';

export function ProjectDashboardNew({ onOpenEditor }: Props) {
  const { project } = useAppStore();

  return (
    <div className="project-dashboard-new">
      {/* Dashboard Header */}
      <div className="dashboard-header">
        <h1>{project.name}</h1>
      </div>
      
      {/* Main Content */}
      <div className="dashboard-main">
        {/* Quick Generation Panel */}
        <div className="dashboard-section">
          <h2>Quick Generation</h2>
          <p className="text-muted-foreground mb-4">
            Generate content for your project
          </p>
          
          <GenerationButtonToolbar
            context="dashboard"
            onGenerationComplete={(asset) => {
              // Add asset to project
              addAssetToProject(project.id, asset);
            }}
          />
        </div>
        
        {/* Other dashboard sections */}
        <SequencesSection />
        <CharactersSection />
      </div>
    </div>
  );
}
```

### 3. Custom Styling

```typescript
// Apply custom styles to the toolbar
<GenerationButtonToolbar
  context="dashboard"
  className="my-custom-toolbar"
/>

// In your CSS file
.my-custom-toolbar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.my-custom-toolbar .toolbar-buttons {
  gap: 1rem;
}
```

## Styling

The toolbar comes with default styles that adapt to the context:

### Editor Context Styles
- Sticky positioning at the top
- Full-width layout
- Box shadow for depth
- Buttons aligned to the left

### Dashboard Context Styles
- Rounded corners
- Border and subtle shadow
- Buttons centered
- Compact layout

### CSS Classes

- `.generation-button-toolbar` - Base toolbar class
- `.generation-toolbar-editor` - Editor context class
- `.generation-toolbar-dashboard` - Dashboard context class
- `.toolbar-buttons` - Button container class

## State Management

The toolbar integrates with the generation store (`useGenerationStore`) to:

1. Track pipeline state (prompt → image → video → audio)
2. Enable/disable buttons based on prerequisites
3. Show progress during generation
4. Preserve generated assets

### Pipeline Flow

```
Prompt Generation (always enabled)
    ↓
Image Generation (enabled after prompt)
    ↓
Video Generation (enabled after image)
    ↓
Audio Generation (always enabled)
```

## Event Handling

### onGenerationComplete Callback

Called when any generation step completes:

```typescript
const handleGenerationComplete = (asset: GeneratedAsset) => {
  console.log('Asset type:', asset.type); // 'prompt' | 'image' | 'video' | 'audio'
  console.log('Asset URL:', asset.url);
  console.log('Metadata:', asset.metadata);
  console.log('Related assets:', asset.relatedAssets);
  
  // Add to project, shot, or sequence
  if (asset.type === 'image') {
    addImageToShot(currentShot.id, asset);
  } else if (asset.type === 'video') {
    addVideoToSequence(currentSequence.id, asset);
  }
};
```

## Keyboard Shortcuts

All buttons support keyboard shortcuts:

- **Ctrl+Shift+P**: Open Prompt Generation Dialog
- **Ctrl+Shift+I**: Open Image Generation Dialog
- **Ctrl+Shift+V**: Open Video Generation Dialog
- **Ctrl+Shift+A**: Open Audio Generation Dialog
- **Escape**: Cancel current generation (if cancellable)

## Responsive Design

The toolbar automatically adapts to different screen sizes:

- **Desktop**: Full button layout with text labels
- **Tablet**: Compact layout with smaller gaps
- **Mobile**: Stacked layout with touch-friendly buttons

## Accessibility

The toolbar is fully accessible:

- **ARIA Labels**: All buttons have descriptive labels
- **Keyboard Navigation**: Full keyboard support
- **Screen Readers**: Progress updates announced
- **Focus Management**: Proper focus handling in dialogs
- **Color Contrast**: WCAG AA compliant

## Testing

The toolbar includes comprehensive tests:

```bash
# Run toolbar tests
npm test -- GenerationButtonToolbar.test.tsx

# Run all generation button tests
npm test -- generation-buttons
```

## Troubleshooting

### Buttons Not Enabling

**Problem**: Image/Video buttons remain disabled even after previous step completes.

**Solution**: Ensure the generation store is properly updated:

```typescript
const { completeStage } = useGenerationStore();

// After prompt generation
completeStage('prompt', promptResult);
```

### Dialogs Not Opening

**Problem**: Clicking buttons doesn't open dialogs.

**Solution**: Check that all dialog components are imported and rendered:

```typescript
import {
  PromptGenerationDialog,
  ImageGenerationDialog,
  VideoGenerationDialog,
  AudioGenerationDialog,
} from '@/components/generation-buttons';
```

### Styling Issues

**Problem**: Toolbar doesn't match application theme.

**Solution**: Ensure CSS variables are defined:

```css
:root {
  --background: ...;
  --foreground: ...;
  --border: ...;
  --primary: ...;
}
```

## Best Practices

1. **Always provide context**: Specify 'editor' or 'dashboard' context
2. **Handle generation completion**: Implement `onGenerationComplete` callback
3. **Provide current shot/sequence**: In editor context, pass current entities
4. **Test keyboard shortcuts**: Ensure shortcuts don't conflict with other features
5. **Monitor performance**: Use React DevTools to check re-renders

## Related Components

- `PromptGenerationButton` - Individual prompt button
- `ImageGenerationButton` - Individual image button
- `VideoGenerationButton` - Individual video button
- `AudioGenerationButton` - Individual audio button
- `GenerationProgressModal` - Progress display during generation

## API Reference

See the [Design Document](../../.kiro/specs/generation-buttons-ui/design.md) for complete API reference and architecture details.

## Examples

See `GenerationButtonToolbar.example.tsx` for complete working examples of:

- Editor context integration
- Dashboard context integration
- Responsive layouts
- Custom styling
- Complete EditorLayout integration
- Complete ProjectDashboard integration

## Support

For issues or questions:

1. Check the [Design Document](../../.kiro/specs/generation-buttons-ui/design.md)
2. Review the [Requirements](../../.kiro/specs/generation-buttons-ui/requirements.md)
3. Run the example file: `GenerationButtonToolbar.example.tsx`
4. Check the test file for usage patterns: `__tests__/GenerationButtonToolbar.test.tsx`
