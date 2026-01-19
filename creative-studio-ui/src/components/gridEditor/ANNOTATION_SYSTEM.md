# Annotation System Documentation

## Overview

The annotation system provides professional-grade drawing and annotation tools for the Advanced Grid Editor. It enables users to add visual feedback, markup, and notes directly on panels through freehand drawing, shapes, and text annotations.

## Architecture

The annotation system consists of three main components:

### 1. AnnotationTools
**File:** `AnnotationTools.tsx`

Handles the drawing interaction and creation of annotation elements:
- **Pen Tool**: Freehand drawing with continuous path tracking
- **Shape Tools**: Rectangle, ellipse, and line drawing
- **Text Tool**: Interactive text annotation placement
- **Real-time Preview**: Shows drawing in progress before committing

**Key Features:**
- Coordinate transformation between screen and panel space (0-1 normalized)
- Automatic annotation layer creation and management
- Mouse event handling for drawing interactions
- Text input with keyboard shortcuts (Enter to confirm, Escape to cancel)

### 2. AnnotationRenderer
**File:** `AnnotationRenderer.tsx`

Renders existing annotations from annotation layers:
- Displays all drawing elements (paths, lines, rectangles, ellipses)
- Renders text annotations with optional backgrounds
- Respects layer visibility and opacity settings
- Converts normalized coordinates to screen space for rendering

**Key Features:**
- SVG-based rendering for crisp vector graphics
- Layer composition with opacity blending
- Global visibility toggle support
- Non-interactive overlay (pointerEvents: none)

### 3. AnnotationControls
**File:** `AnnotationControls.tsx`

Provides UI controls for annotation settings:
- Tool selection buttons with visual feedback
- Color pickers for stroke and fill colors
- Stroke width and opacity sliders
- Text styling controls (font size, color)
- Annotation visibility toggle
- Delete all annotations button

**Key Features:**
- Preset color palette for quick selection
- Separate controls for drawing and text styles
- Conditional UI based on active tool
- Confirmation dialog for destructive actions

## Data Structure

### Annotation Layer

Annotations are stored as a special layer type within panels:

```typescript
interface Layer {
  id: string;
  name: string;
  type: 'annotation'; // Special type for annotations
  visible: boolean;
  locked: boolean;
  opacity: number;
  blendMode: BlendMode;
  content: AnnotationContent;
}

interface AnnotationContent {
  type: 'annotation';
  drawings: DrawingElement[];
  textAnnotations: TextAnnotation[];
}
```

### Drawing Elements

```typescript
interface DrawingElement {
  id: string;
  type: 'path' | 'rectangle' | 'ellipse' | 'line';
  points: Point[]; // Normalized coordinates (0-1)
  style: {
    strokeColor: string;
    strokeWidth: number;
    fillColor?: string;
    opacity: number;
  };
}
```

### Text Annotations

```typescript
interface TextAnnotation {
  id: string;
  text: string;
  position: Point; // Normalized coordinates (0-1)
  style: {
    fontSize: number;
    fontFamily: string;
    color: string;
    backgroundColor?: string;
  };
}
```

## Integration Guide

### Basic Integration

```tsx
import { AnnotationTools } from './AnnotationTools';
import { AnnotationRenderer } from './AnnotationRenderer';
import { AnnotationControls } from './AnnotationControls';

function GridEditor() {
  const [annotationTool, setAnnotationTool] = useState<AnnotationToolType>('pen');
  const [annotationsVisible, setAnnotationsVisible] = useState(true);
  const [drawingStyle, setDrawingStyle] = useState({
    strokeColor: '#FF0000',
    strokeWidth: 3,
    fillColor: undefined,
    opacity: 1.0,
  });
  const [textStyle, setTextStyle] = useState({
    fontSize: 24,
    fontFamily: 'Arial, sans-serif',
    color: '#FFFFFF',
    backgroundColor: undefined,
  });

  return (
    <div>
      {/* Render existing annotations */}
      <AnnotationRenderer
        panel={selectedPanel}
        panelBounds={panelBounds}
        annotationsVisible={annotationsVisible}
      />

      {/* Drawing tools (only when in annotate mode) */}
      {activeTool === 'annotate' && (
        <AnnotationTools
          panel={selectedPanel}
          panelBounds={panelBounds}
          activeTool={annotationTool}
          style={drawingStyle}
          textStyle={textStyle}
          onAnnotationCreated={() => console.log('Annotation created')}
        />
      )}

      {/* Controls sidebar */}
      <AnnotationControls
        selectedPanel={selectedPanel}
        activeTool={annotationTool}
        onToolChange={setAnnotationTool}
        style={drawingStyle}
        onStyleChange={setDrawingStyle}
        textStyle={textStyle}
        onTextStyleChange={setTextStyle}
        annotationsVisible={annotationsVisible}
        onVisibilityChange={setAnnotationsVisible}
      />
    </div>
  );
}
```

### Complete Example

See `AnnotationIntegration.example.tsx` for a complete working example with:
- Full grid editor integration
- Tool switching
- Style management
- Keyboard shortcuts
- Usage instructions

## User Workflow

### Drawing Workflow

1. **Select a Panel**: Click on a panel to select it
2. **Activate Annotate Tool**: Press `A` or click the Annotate button in toolbar
3. **Choose Drawing Tool**: Select Pen, Line, Rectangle, or Ellipse
4. **Adjust Style**: Set stroke color, width, fill color (for shapes), and opacity
5. **Draw**: Click and drag on the panel to draw
6. **Repeat**: Continue drawing additional elements

### Text Annotation Workflow

1. **Select Text Tool**: Choose the Text tool from annotation controls
2. **Adjust Text Style**: Set font size, color, and optional background
3. **Click to Place**: Click on the panel where you want to add text
4. **Type Text**: Enter your annotation text
5. **Confirm**: Press `Enter` to confirm or `Escape` to cancel

### Managing Annotations

- **Toggle Visibility**: Use the visibility button to show/hide all annotations
- **Delete All**: Click "Delete All Annotations" to remove all annotations from a panel
- **Layer Management**: Annotations are stored as layers and can be managed through the layer stack

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `A` | Activate Annotate Tool |
| `Enter` | Confirm text annotation |
| `Escape` | Cancel text annotation / Exit annotate mode |

## Technical Details

### Coordinate System

The annotation system uses a normalized coordinate system (0-1) for storing annotation data:
- **Storage**: All points are stored in panel-relative coordinates (0-1)
- **Rendering**: Coordinates are converted to screen space for display
- **Benefits**: Resolution-independent, works with any panel size or zoom level

### Layer Integration

Annotations are fully integrated with the layer system:
- Stored as a special `annotation` layer type
- Support all layer operations (visibility, opacity, lock, delete)
- Render above image layers by default
- Included in export/import operations

### Performance Considerations

- **SVG Rendering**: Uses SVG for crisp vector graphics at any zoom level
- **Event Handling**: Efficient mouse tracking with debouncing for smooth drawing
- **Memory**: Minimal memory footprint, stores only point data and styles
- **Rendering**: Non-blocking rendering with pointer-events optimization

## Requirements Mapping

This implementation satisfies the following requirements:

### Requirement 12.1: Annotation Tools
✅ Pen tool for freehand drawing  
✅ Shape tools (rectangle, ellipse, line)  
✅ Text annotation tool  
✅ Annotation mode toggle in toolbar

### Requirement 12.2: Annotation Layer Storage
✅ Annotations stored as separate layer type  
✅ Drawing elements with points and styles  
✅ Text annotations with position and formatting

### Requirement 12.3: Text Annotations
✅ Editable text field at click location  
✅ Configurable font size, family, and color  
✅ Optional background color

### Requirement 12.4: Annotation Persistence
✅ Annotations included in grid configuration export  
✅ Full round-trip support (export → import)

### Requirement 12.5: Annotation Visibility
✅ Global visibility toggle  
✅ Per-layer visibility control  
✅ Annotations render above panel content

### Requirement 12.6: Annotation Deletion
✅ Delete individual annotation layers  
✅ Delete all annotations from a panel  
✅ Confirmation dialog for destructive actions

### Requirement 12.7: Annotation Rendering
✅ Annotations render above all other panel content  
✅ Respect layer z-order and opacity  
✅ Support for all drawing types and text

## Testing

The annotation system includes comprehensive tests in `__tests__/annotationSystem.test.ts`:

- ✅ Annotation layer creation
- ✅ Drawing element storage
- ✅ Text annotation storage
- ✅ Layer visibility toggling
- ✅ Layer deletion
- ✅ Multiple drawing types
- ✅ Export/import persistence

Run tests with:
```bash
npm test -- annotationSystem.test.ts
```

## Future Enhancements

Potential improvements for future iterations:

1. **Advanced Drawing Tools**
   - Arrow tool with customizable heads
   - Polygon tool for multi-point shapes
   - Bezier curve tool for smooth paths

2. **Annotation Editing**
   - Select and move existing annotations
   - Resize and reshape annotations
   - Edit text annotations in place

3. **Styling Enhancements**
   - Custom color picker with hex input
   - Gradient fills for shapes
   - Dashed/dotted line styles
   - Shadow effects

4. **Collaboration Features**
   - Author attribution for annotations
   - Timestamp tracking
   - Comment threads on annotations
   - Annotation history and versioning

5. **Export Options**
   - Export annotations as separate layer
   - Export with/without annotations toggle
   - Annotation-only export for review

## Troubleshooting

### Annotations Not Appearing

1. Check that annotation layer is visible
2. Verify global annotations visibility is enabled
3. Ensure panel is selected when drawing
4. Check layer opacity is not set to 0

### Drawing Not Working

1. Verify annotate tool is active (press `A`)
2. Check that panel is selected
3. Ensure annotation tool is chosen in controls
4. Verify mouse events are not blocked by other elements

### Text Input Not Showing

1. Click directly on the panel (not outside bounds)
2. Ensure text tool is selected
3. Check that input is not hidden behind other elements
4. Try clicking again if input doesn't appear

## API Reference

### AnnotationTools Props

```typescript
interface AnnotationToolsProps {
  panel: Panel;
  panelBounds: { x: number; y: number; width: number; height: number };
  activeTool: AnnotationToolType;
  style: {
    strokeColor: string;
    strokeWidth: number;
    fillColor?: string;
    opacity: number;
  };
  textStyle: {
    fontSize: number;
    fontFamily: string;
    color: string;
    backgroundColor?: string;
  };
  onAnnotationCreated?: () => void;
}
```

### AnnotationRenderer Props

```typescript
interface AnnotationRendererProps {
  panel: Panel;
  panelBounds: { x: number; y: number; width: number; height: number };
  annotationsVisible?: boolean;
}
```

### AnnotationControls Props

```typescript
interface AnnotationControlsProps {
  selectedPanel?: Panel;
  activeTool: AnnotationToolType;
  onToolChange: (tool: AnnotationToolType) => void;
  style: { /* drawing style */ };
  onStyleChange: (style: { /* drawing style */ }) => void;
  textStyle: { /* text style */ };
  onTextStyleChange: (style: { /* text style */ }) => void;
  annotationsVisible: boolean;
  onVisibilityChange: (visible: boolean) => void;
}
```

## License

Part of the StoryCore-Engine Advanced Grid Editor feature.
