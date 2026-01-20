# Responsive Grid System

## Overview

The responsive grid system automatically adapts the grid layout to different screen sizes, providing an optimal viewing experience across devices. It includes automatic breakpoint detection, list mode for small screens, fullscreen support, and persistent user preferences.

## Features

### Breakpoint Management (Exigences 12.2, 12.3, 12.4)

The system defines four responsive breakpoints:

| Breakpoint | Width Range | Columns | Mode |
|------------|-------------|---------|------|
| Mobile | 320px - 767px | 1 | List |
| Tablet | 768px - 1023px | 2 | List |
| Desktop | 1024px - 1919px | 3 | Grid |
| Large | 1920px+ | 4 | Grid |

### Automatic Mode Switching (Exigence 12.2)

- **Grid Mode**: Used on screens ≥ 1024px for optimal spatial organization
- **List Mode**: Automatically activated on screens < 1024px for better mobile experience

### Window Resize Handling (Exigences 12.1, 12.6)

- Smooth animated transitions when resizing
- Maintains panel proportions during resize
- Debounced resize events for performance (150ms)
- Recalculates layout with animation

### Fullscreen Support (Exigence 12.5)

- Maximizes space utilization in fullscreen mode
- Reduces gaps for cleaner appearance
- Hides grid lines automatically
- Detects fullscreen changes across browsers

### Orientation Change (Exigence 12.7)

- Detects portrait/landscape orientation changes
- Adapts layout immediately on orientation change
- Forces list mode in portrait on smaller screens

### Layout Preferences (Exigence 12.8)

- Saves preferences per breakpoint to localStorage
- Persists: columns, grid lines, snap settings, grid size
- Automatically restores preferences on load
- Export/import preferences as JSON

## Usage

### Basic Usage

```typescript
import { ResponsiveGridLayout } from './components/gridEditor/ResponsiveGridLayout';

function MyComponent() {
  const [items, setItems] = useState<GridPanel[]>([...]);
  
  const baseConfig: GridLayoutConfig = {
    columns: 3,
    rows: 3,
    gap: 16,
    cellSize: { width: 200, height: 200 },
    snapEnabled: true,
    snapThreshold: 10,
    showGridLines: true
  };

  return (
    <ResponsiveGridLayout
      items={items}
      baseConfig={baseConfig}
      onLayoutChange={setItems}
      enablePreferences={true}
      animateTransitions={true}
    />
  );
}
```

### Using the Hook Directly

```typescript
import { useResponsiveGrid } from './hooks/useResponsiveGrid';

function MyComponent() {
  const responsive = useResponsiveGrid();

  return (
    <div>
      <p>Breakpoint: {responsive.breakpoint.name}</p>
      <p>Columns: {responsive.columns}</p>
      <p>Mode: {responsive.useListMode ? 'List' : 'Grid'}</p>
      <p>Orientation: {responsive.orientation}</p>
      <p>Fullscreen: {responsive.isFullscreen ? 'Yes' : 'No'}</p>
    </div>
  );
}
```

### Custom Breakpoints

```typescript
import { useResponsiveGridWithBreakpoints } from './hooks/useResponsiveGrid';

const customBreakpoints = [
  { name: 'mobile', minWidth: 0, maxWidth: 599, columns: 1, useListMode: true },
  { name: 'tablet', minWidth: 600, maxWidth: 1199, columns: 2, useListMode: false },
  { name: 'desktop', minWidth: 1200, columns: 4, useListMode: false }
];

function MyComponent() {
  const responsive = useResponsiveGridWithBreakpoints(customBreakpoints);
  // ...
}
```

### Managing Preferences

```typescript
import { getLayoutPreferencesManager } from './services/responsive/LayoutPreferences';

const preferencesManager = getLayoutPreferencesManager();

// Get preference for current breakpoint
const preference = preferencesManager.getPreference(responsive.breakpoint);

// Set preference
preferencesManager.setPreference(responsive.breakpoint, {
  columns: 4,
  showGridLines: true,
  snapEnabled: false
});

// Export preferences
const json = preferencesManager.exportPreferences();

// Import preferences
preferencesManager.importPreferences(json);

// Clear all preferences
preferencesManager.clearPreferences();
```

## Components

### ResponsiveGridLayout

Main component that orchestrates responsive behavior.

**Props:**
- `items`: Array of grid panels to display
- `baseConfig`: Base grid configuration
- `onLayoutChange`: Callback when layout changes
- `enablePreferences`: Enable preference persistence (default: true)
- `animateTransitions`: Enable animated transitions (default: true)

### GridListView

Optimized list view for small screens.

**Props:**
- `items`: Array of grid panels
- `onItemClick`: Callback when item is clicked
- `onLayoutChange`: Callback when order changes
- `selectedIds`: Array of selected item IDs

### useResponsiveGrid Hook

Hook for accessing responsive grid state.

**Returns:**
- `breakpoint`: Current breakpoint configuration
- `columns`: Number of columns for current breakpoint
- `useListMode`: Whether to use list mode
- `width`: Current viewport width
- `height`: Current viewport height
- `orientation`: Current orientation ('portrait' | 'landscape')
- `isFullscreen`: Whether in fullscreen mode

## Performance Considerations

### Debouncing

Resize events are debounced with a 150ms delay to prevent excessive recalculations.

### Transition Optimization

Transitions are only applied when `animateTransitions` is enabled and can be disabled for better performance on low-end devices.

### Preference Caching

Layout preferences are cached in memory and only written to localStorage when changed.

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Fullscreen API with vendor prefixes
- localStorage with fallback for unavailable storage
- OrientationChange event support

## Testing

### Unit Tests

```typescript
describe('useResponsiveGrid', () => {
  it('should return correct breakpoint for width', () => {
    // Test breakpoint detection
  });

  it('should detect orientation changes', () => {
    // Test orientation detection
  });

  it('should detect fullscreen changes', () => {
    // Test fullscreen detection
  });
});
```

### Integration Tests

```typescript
describe('ResponsiveGridLayout', () => {
  it('should switch to list mode on small screens', () => {
    // Test mode switching
  });

  it('should save and restore preferences', () => {
    // Test preference persistence
  });

  it('should animate transitions on resize', () => {
    // Test animations
  });
});
```

## Accessibility

- Touch-friendly list items on mobile
- Keyboard navigation support
- Screen reader compatible
- Respects prefers-reduced-motion

## Future Enhancements

- Virtual scrolling for large lists
- Drag-and-drop reordering in list mode
- Custom transition animations
- Responsive image loading
- Progressive enhancement

## Related Files

- `src/hooks/useResponsiveGrid.ts` - Responsive grid hook
- `src/services/responsive/LayoutPreferences.ts` - Preference management
- `src/components/gridEditor/ResponsiveGridLayout.tsx` - Main component
- `src/components/gridEditor/GridListView.tsx` - List view component
- `src/components/gridEditor/GridLayout.tsx` - Grid view component

## Requirements Mapping

- **12.1**: Window resize handling with animation
- **12.2**: Automatic breakpoint-based mode switching
- **12.3**: Column calculation based on width
- **12.4**: Animated layout transitions
- **12.5**: Fullscreen mode support
- **12.6**: Panel proportion maintenance
- **12.7**: Orientation change detection
- **12.8**: Preference persistence per screen size
