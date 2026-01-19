# Grid Editor Integration Guide

## Quick Start

The Advanced Grid Editor is now fully integrated into the EditorPage. Here's how to use it:

### Accessing the Grid Editor

1. Open the Creative Studio UI
2. Navigate to a project
3. Click the "Grid Editor" tab in the top navigation bar
4. The grid editor will load with a 3x3 panel layout

### Basic Usage

```typescript
import { GridEditorCanvas } from '@/components/gridEditor';

// In your component
<GridEditorCanvas
  projectId="my-project-id"
  onSave={(config) => {
    console.log('Configuration saved:', config);
  }}
  onExport={(config) => {
    console.log('Configuration exported:', config);
  }}
  initialConfig={existingConfig} // Optional
/>
```

## Component Architecture

### Main Components

1. **GridEditorCanvas** - Main container component
   - Orchestrates all sub-components
   - Manages state and interactions
   - Provides save/export callbacks

2. **ResponsiveGridEditor** - Responsive wrapper
   - Adapts layout for different screen sizes
   - Handles touch interactions
   - Manages panel visibility

3. **Viewport** - Zoom and pan container
   - Handles viewport transformations
   - Manages zoom levels
   - Provides coordinate conversion

4. **GridRenderer** - Canvas-based renderer
   - Renders 3x3 grid layout
   - Displays panel images
   - Handles layer composition

5. **InteractionLayer** - SVG overlay
   - Transform gizmos
   - Selection indicators
   - Crop handles

6. **Toolbar** - Tool selection and actions
   - Tool buttons
   - Undo/redo controls
   - Zoom controls

7. **GridEditorPropertiesPanel** - Properties sidebar
   - Transform properties
   - Layer management
   - Crop settings

## State Management

The grid editor uses three Zustand stores:

### GridStore
```typescript
import { useGridStore } from '@/stores/gridEditorStore';

const {
  config,              // Current grid configuration
  selectedPanelIds,    // Array of selected panel IDs
  activeTool,          // Current active tool
  selectPanel,         // Select a panel
  updatePanelTransform,// Update panel transform
  loadConfiguration,   // Load a configuration
  exportConfiguration, // Export current configuration
} = useGridStore();
```

### ViewportStore
```typescript
import { useViewportStore } from '@/stores/viewportStore';

const {
  zoom,        // Current zoom level
  pan,         // Current pan offset
  setZoom,     // Set zoom level
  setPan,      // Set pan offset
  fitToView,   // Fit grid to viewport
  focusPanel,  // Focus on a specific panel
} = useViewportStore();
```

### UndoRedoStore
```typescript
import { useUndoRedoStore } from '@/stores/undoRedoStore';

const {
  undo,           // Undo last operation
  redo,           // Redo last undone operation
  canUndo,        // Check if undo is available
  canRedo,        // Check if redo is available
  pushOperation,  // Add operation to history
} = useUndoRedoStore();
```

## Responsive Design

The grid editor automatically adapts to different screen sizes:

### Mobile (<768px)
- Simplified toolbar at bottom
- Full-screen canvas
- Overlay panels
- Touch-optimized controls

### Tablet (768-1023px)
- Collapsible properties panel
- Adjusted toolbar
- Touch gestures enabled

### Desktop (≥1024px)
- Full-featured layout
- All panels visible
- Mouse and keyboard optimized

### Using ResponsiveGridEditor

```typescript
import { ResponsiveGridEditor } from '@/components/gridEditor';

<ResponsiveGridEditor
  projectId="my-project-id"
  onSave={handleSave}
  onExport={handleExport}
/>
```

## Touch Interactions

The grid editor supports touch gestures on tablets and mobile:

### Gestures
- **Single tap**: Select panel
- **Double tap**: Enter focus mode
- **Long press**: Show context menu
- **Pinch**: Zoom in/out
- **Two-finger drag**: Pan viewport
- **Swipe**: Navigate between panels

### Custom Touch Handling

```typescript
import { useTouchInteraction } from '@/components/gridEditor';

const elementRef = useRef<HTMLDivElement>(null);

useTouchInteraction(elementRef, {
  enablePinchZoom: true,
  enablePan: true,
  enableLongPress: true,
  onLongPress: (point) => {
    console.log('Long press at:', point);
  },
  onSwipe: (direction) => {
    console.log('Swipe:', direction);
  },
});
```

## Accessibility

The grid editor is fully accessible with WCAG 2.1 Level AA compliance:

### Keyboard Navigation

All features are accessible via keyboard:
- `V` - Select tool
- `C` - Crop tool
- `R` - Rotate tool
- `S` - Scale tool
- `Ctrl+Z` - Undo
- `Ctrl+Shift+Z` - Redo
- `Tab` - Navigate elements
- Arrow keys - Navigate panels

### Screen Reader Support

```typescript
import { ScreenReaderAnnouncer, ARIA_LABELS } from '@/components/gridEditor/accessibility';

// Get announcer instance
const announcer = ScreenReaderAnnouncer.getInstance();

// Announce operations
announcer.announceOperation('Save', true);
announcer.announcePanelSelection(2);
announcer.announceZoom(1.5);

// Use ARIA labels
<button aria-label={ARIA_LABELS.selectTool}>
  Select
</button>
```

### Focus Management

```typescript
import { FocusManager } from '@/components/gridEditor/accessibility';

const focusManager = new FocusManager();

// Save and move focus
focusManager.pushFocus(newElement);

// Restore previous focus
focusManager.popFocus();

// Trap focus in modal
const cleanup = focusManager.trapFocus(modalElement);
// Call cleanup() when modal closes
```

## Customization

### Custom Toolbar

```typescript
import { Toolbar } from '@/components/gridEditor';

<Toolbar
  activeTool={activeTool}
  canUndo={canUndo()}
  canRedo={canRedo()}
  onUndo={undo}
  onRedo={redo}
  onSave={handleSave}
  onExport={handleExport}
  // Add custom buttons
  customButtons={[
    {
      icon: <MyIcon />,
      label: 'Custom Action',
      onClick: handleCustomAction,
    },
  ]}
/>
```

### Custom Keyboard Shortcuts

```typescript
import { useKeyboardShortcuts } from '@/components/gridEditor';

useKeyboardShortcuts({
  onUndo: undo,
  onRedo: redo,
  onSave: handleSave,
  onExport: handleExport,
  // Add custom shortcuts
  customShortcuts: {
    'Ctrl+K': handleCustomAction,
    'Alt+P': handlePreview,
  },
});
```

### Custom Styles

```css
/* Override grid editor styles */
.grid-editor-canvas {
  --grid-border-color: #your-color;
  --selection-color: #your-color;
  --toolbar-bg: #your-color;
}

/* Custom panel styles */
.grid-editor-canvas .panel {
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
```

## Error Handling

The grid editor includes comprehensive error handling:

```typescript
import { GridEditorErrorBoundary } from '@/components/gridEditor';

<GridEditorErrorBoundary
  onError={(error, errorInfo) => {
    console.error('Grid editor error:', error, errorInfo);
    // Send to error tracking service
  }}
  fallback={<CustomErrorUI />}
>
  <GridEditorCanvas {...props} />
</GridEditorErrorBoundary>
```

## Performance Optimization

### Image Loading

```typescript
import { imageLoader } from '@/services/gridEditor/ImageLoaderService';

// Load image with mipmaps
const mipmaps = await imageLoader.loadImageWithMipmaps(imageUrl);

// Get appropriate mipmap for zoom level
const mipmap = imageLoader.getMipmapForZoom(imageUrl, zoom);

// Preload images
await imageLoader.preloadImages([url1, url2, url3]);
```

### Memory Management

```typescript
import { memoryManager } from '@/services/gridEditor/MemoryManager';

// Monitor memory usage
const usage = memoryManager.getMemoryUsage();

// Unload off-screen textures
memoryManager.unloadOffScreenTextures(visiblePanelIds);

// Clear cache
memoryManager.clearCache();
```

### WebGL Rendering

```typescript
import { webglRenderer } from '@/services/gridEditor/WebGLRenderer';

// Check WebGL support
if (webglRenderer.isSupported()) {
  // Use GPU-accelerated rendering
  webglRenderer.renderPanel(panel, transform);
} else {
  // Fallback to Canvas 2D
  canvas2dRenderer.renderPanel(panel, transform);
}
```

## Testing

### Unit Testing

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { GridEditorCanvas } from '@/components/gridEditor';

test('renders grid editor', () => {
  render(<GridEditorCanvas projectId="test" />);
  expect(screen.getByRole('application')).toBeInTheDocument();
});

test('handles panel selection', () => {
  const { container } = render(<GridEditorCanvas projectId="test" />);
  const panel = container.querySelector('.panel');
  fireEvent.click(panel);
  expect(panel).toHaveClass('selected');
});
```

### Accessibility Testing

```typescript
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

test('has no accessibility violations', async () => {
  const { container } = render(<GridEditorCanvas projectId="test" />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

## Troubleshooting

### Common Issues

1. **Grid not rendering**
   - Check that stores are properly initialized
   - Verify initial configuration is valid
   - Check browser console for errors

2. **Touch gestures not working**
   - Ensure touch events are not being prevented by parent
   - Check that `touch-action: none` is set on canvas
   - Verify device supports touch events

3. **Keyboard shortcuts not working**
   - Check that element has focus
   - Verify no input fields are focused
   - Check for conflicting shortcuts

4. **Performance issues**
   - Enable WebGL rendering if available
   - Reduce image resolution
   - Unload off-screen textures
   - Clear cache periodically

### Debug Mode

```typescript
// Enable debug mode
localStorage.setItem('gridEditor:debug', 'true');

// View debug info
console.log('Grid Store:', useGridStore.getState());
console.log('Viewport Store:', useViewportStore.getState());
console.log('Undo/Redo Store:', useUndoRedoStore.getState());
```

## Support

For issues, questions, or feature requests:

1. Check the [ACCESSIBILITY.md](./ACCESSIBILITY.md) guide
2. Review the [TASK_21_COMPLETION_SUMMARY.md](./TASK_21_COMPLETION_SUMMARY.md)
3. File an issue in the project repository
4. Contact the development team

## Resources

- [Component Documentation](./README.md)
- [Accessibility Guide](./ACCESSIBILITY.md)
- [Performance Optimizations](./PERFORMANCE_OPTIMIZATIONS.md)
- [Version Control System](./VERSION_CONTROL_SYSTEM.md)
- [Preset System](./PRESET_SYSTEM.md)
- [Annotation System](./ANNOTATION_SYSTEM.md)
