# Infinite Loop Fix - GridEditorCanvas

## Problem
The application was experiencing an infinite loop error with the message:
```
Maximum update depth exceeded. This can happen when a component repeatedly calls setState inside componentWillUpdate or componentDidUpdate.
```

Additionally, there was a warning:
```
The result of getSnapshot should be cached to avoid an infinite loop
```

## Root Causes

### 1. Viewport Selector Creating New Objects
**Location:** `GridEditorCanvas.tsx:60`

The viewport selector was creating a new object on every render:
```typescript
const viewport = useViewportStore((state) => ({
  zoom: state.zoom,
  pan: state.pan,
  bounds: state.bounds,
  focusedPanelId: state.focusedPanelId,
}));
```

This caused Zustand's `useSyncExternalStore` to detect changes on every render, triggering infinite re-renders.

**Fix:** Memoize the viewport object using `React.useMemo`:
```typescript
const viewportZoom = useViewportStore((state) => state.zoom);
const viewportPan = useViewportStore((state) => state.pan);
const viewportBounds = useViewportStore((state) => state.bounds);
const viewportFocusedPanelId = useViewportStore((state) => state.focusedPanelId);

const viewport = React.useMemo(() => ({
  zoom: viewportZoom,
  pan: viewportPan,
  bounds: viewportBounds,
  focusedPanelId: viewportFocusedPanelId,
}), [viewportZoom, viewportPan, viewportBounds, viewportFocusedPanelId]);
```

### 2. UndoRedo Store Destructuring
**Location:** `GridEditorCanvas.tsx:73`

The undo/redo functions were being destructured, creating a new object:
```typescript
const { undo, redo } = useUndoRedoStore();
```

This is equivalent to:
```typescript
const temp = useUndoRedoStore((state) => ({ undo: state.undo, redo: state.redo }));
```

Which creates a new object on every render.

**Fix:** Extract functions separately:
```typescript
const undo = useUndoRedoStore((state) => state.undo);
const redo = useUndoRedoStore((state) => state.redo);
```

### 3. GridRenderer useEffect Dependencies
**Location:** `GridRenderer.tsx:396-417`

The main render effect included memoized functions in its dependency array:
```typescript
useEffect(() => {
  // ... render logic
}, [panels, selectedPanelIds, viewport, setupCanvas, loadImage, renderGrid]);
```

Since `setupCanvas`, `loadImage`, and `renderGrid` are wrapped in `useCallback`, they're recreated when their dependencies change, causing the effect to run infinitely.

**Fix:** Remove the memoized functions from the dependency array:
```typescript
useEffect(() => {
  // ... render logic
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [panels, selectedPanelIds, viewport]);
```

### 4. GridRenderer Resize Handler
**Location:** `GridRenderer.tsx:477-489`

Similar issue with the resize handler including memoized functions:
```typescript
useEffect(() => {
  const handleResize = () => {
    // ... resize logic
  };
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, [setupCanvas, renderGrid]);
```

**Fix:** Remove dependencies since the handler only needs to be set up once:
```typescript
useEffect(() => {
  const handleResize = () => {
    // ... resize logic
  };
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
// eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

## Best Practices Applied

1. **Zustand Selectors:** Always select primitive values or use `useMemo` when creating objects from store state
2. **Avoid Destructuring:** Don't destructure from Zustand hooks - select each property separately
3. **useCallback Dependencies:** Don't include memoized functions in useEffect dependency arrays
4. **Event Listeners:** Set up once with empty dependency array when the handler doesn't need reactive updates

## Testing
After applying these fixes:
- ✅ No infinite loop errors
- ✅ No getSnapshot warnings
- ✅ Grid editor renders correctly
- ✅ Viewport updates work as expected
- ✅ Panel selection functions properly
- ✅ Undo/redo operations work correctly

## Files Modified
1. `creative-studio-ui/src/components/gridEditor/GridEditorCanvas.tsx`
2. `creative-studio-ui/src/components/gridEditor/GridRenderer.tsx`
