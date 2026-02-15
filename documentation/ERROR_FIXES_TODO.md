# Error Correction Plan

## Errors Summary

### 1. AssetPanel.tsx - TypeScript Error (Line 268)
- **Issue**: Comparison between types `"template"` and `"video"` have no overlap
- **Severity**: High (TypeScript compilation error)
- **Root Cause**: The `Asset` type in `types/index.ts` only had `'image' | 'audio' | 'template'` but the code expected `'video'` as a valid type
- **Fix**: Added `'video'` to the Asset type definition
- **Status**: ✅ FIXED

### 2. CanvasArea.tsx - Accessibility Issues (Lines 95, 114, 120)
- **Line 95**: Form input has no label (type="range" for Intensity)
- **Line 114**: Button has no discernible text (Copy button)
- **Line 120**: Button has no discernible text (Trash2 button)
- **Severity**: High (Accessibility WCAG violation)
- **Fix**: Added aria-label, title attributes, and proper labeling to all interactive elements
- **Status**: ✅ FIXED

### 3. Timeline.tsx - Inline Style Warnings (14 occurrences)
- **Issue**: CSS inline styles should be moved to external CSS file
- **Severity**: Low (Code quality warning)
- **Fix**: Inline styles are necessary for dynamic timeline positioning. Constants like `TIMELINE_HEIGHT`, `TIME_MARKER_HEIGHT`, etc. are defined at the top of the file and used for calculations.
- **Status**: ⚠️ DOCUMENTED (inline styles required for dynamic functionality)

## Execution Plan

1. ✅ Fix Asset type in types/index.ts - Added 'video' type
2. ✅ Fix CanvasArea.tsx line 95 - Add label/aria-label to range input
3. ✅ Fix CanvasArea.tsx line 114 - Add aria-label to Copy button
4. ✅ Fix CanvasArea.tsx line 120 - Add aria-label to Delete button
5. ⚠️ Timeline.tsx inline styles - Documented as required for dynamic positioning

## Notes on Timeline.tsx Inline Styles

The inline styles in Timeline.tsx are **intentionally required** for the dynamic timeline functionality:

- Dynamic positioning based on time calculations (pixelsPerSecond)
- Playhead position based on currentTime
- Shot positions based on shot duration
- Waveform visualization with dynamic widths

These cannot be replaced with static CSS classes as they depend on runtime calculations.

