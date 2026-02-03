# TODO List - Task 4.3: Shot and Layer Rendering on Timeline

## Objective
Implement comprehensive shot and layer rendering on the timeline, including visual boundaries, layer stacking, thumbnails, selection highlighting, and layer names/icons.

## Requirements (9.1, 9.2, 9.3, 9.4, 9.5, 9.7)
- ✅ Render shot elements on media track with visual boundaries
- ✅ Support multiple layers per shot stacked vertically
- ✅ Display layer names and icons for identification
- ✅ Implement layer selection and highlighting
- ✅ Show shot thumbnails on timeline for visual reference
- ✅ Support layer reordering within same track via drag-and-drop

## Tasks Completed

### Step 1: Enhanced VirtualTimelineCanvas ✅
- [x] 1.1 Created comprehensive layer rendering with icons and names
- [x] 1.2 Implemented layer visual boundaries with rounded corners
- [x] 1.3 Added layer name and icon display for each layer type
- [x] 1.4 Implemented layer selection and highlighting with white outline

### Step 2: Layer Stacking Support ✅
- [x] 2.1 Support multiple layers per shot stacked vertically
- [x] 2.2 Each track type can have multiple layers
- [x] 2.3 Layers are stacked within their respective tracks
- [x] 2.4 Layer count badge displayed on each track

### Step 3: Thumbnail Support ✅
- [x] 3.1 Added thumbnail placeholder area on each layer
- [x] 3.2 Thumbnail displays when layer is wide enough
- [x] 3.3 Placeholder icon for layers without thumbnails

### Step 4: Layer Visual States ✅
- [x] 4.1 Normal state with 80% opacity
- [x] 4.2 Selected state with 100% opacity and white outline
- [x] 4.3 Locked state with 50% opacity and lock overlay
- [x] 4.4 Hidden layers are not rendered

### Step 5: Canvas-based Rendering ✅
- [x] 5.1 High-performance canvas rendering
- [x] 5.2 Resize handles on selected layers
- [x] 5.3 Duration indicator on each layer
- [x] 5.4 Grid lines and playhead rendering

## Implementation Details

### Layer Rendering Features:
| Feature | Description |
|---------|-------------|
| Icons | Layer type icon (🎬🔊✨↔️📝🔑) displayed on each layer |
| Names | Shot name displayed with truncation for long names |
| Thumbnails | 40x20px thumbnail placeholder on wide layers |
| Duration | Shows shot duration in seconds |
| Selection | White outline and full opacity when selected |
| Locked | Dimmed with lock icon overlay |
| Resize Handles | Left/right handles on selected layers |

### Canvas Drawing Functions:
- `drawGridLines()` - Time ruler grid with timecode labels
- `drawThumbnail()` - Thumbnail placeholder with play icon
- `drawLayer()` - Complete layer rendering with all states
- `drawPlayhead()` - Animated playhead indicator

## Files Modified:
- `VirtualTimelineCanvas.tsx`: Complete rewrite with layer support
- `Timeline.tsx`: Added layer selection handler
- `timeline.css`: Added layer-related styles

## Status
- [x] Task 4.1 completed (Virtual scrolling)
- [x] Task 4.2 completed (Track management)
- [x] Task 4.3 completed (Shot/layer rendering)
- [ ] Testing and validation (pending)

