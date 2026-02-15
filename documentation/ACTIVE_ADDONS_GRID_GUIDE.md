# ActiveAddonsGrid - Team Guide

## Overview

The **ActiveAddonsGrid** is a visual tile-based component that displays all currently enabled add-ons in the StoryCore interface. It provides users with a quick overview of active add-ons and allows them to interact with each add-on directly from the grid.

### Purpose
- Display enabled add-ons as visual tiles in a responsive grid layout
- Provide quick access to add-on information and actions
- Allow users to disable add-ons without navigating to settings
- Maintain visual consistency with the Wizards tile design

---

## Usage

### How the Grid Appears in the UI

The ActiveAddonsGrid component renders as a grid of tiles, each representing an enabled add-on. The grid automatically adjusts its layout based on the available width:

- **Desktop**: 3-4 tiles per row (auto-fit, min 200px per tile)
- **Tablet**: 2-3 tiles per row
- **Mobile**: 2 tiles per row

Each tile displays:
- Add-on icon (custom or type-based emoji)
- Add-on name
- Version number
- "Open" button (if the add-on supports it)

### Clicking a Tile

When you click on an add-on tile:
1. The [`onAddonClick`](src/ui/ActiveAddonsGrid.tsx:48) callback is triggered (if provided)
2. This can be used to navigate to add-on details or open add-on settings

### Disabling an Add-on from the Grid

To disable an add-on:
1. **Hover** over the tile to reveal the tooltip
2. Click the **"Disable"** button in the tooltip
3. The add-on will be disabled via the API (`POST /api/addons/{name}/disable`)
4. The grid automatically refreshes to remove the disabled add-on

---

## API Reference

### JavaScript/TypeScript API

#### `window.refresh_active_addons()`

Manually trigger a refresh of the active add-ons grid:

```typescript
// Dispatch a refresh event
window.dispatchEvent(new CustomEvent('addon-refresh-request'));
```

Or use the exported function:
```typescript
import { refreshActiveAddons } from './ActiveAddonsGrid';

// Call to refresh the grid
refreshActiveAddons();
```

### Event Listeners

The component listens for these custom events to stay synchronized:

| Event | When Fired | Effect |
|-------|------------|--------|
| `addon-enabled` | When an add-on is enabled | Refreshes the grid |
| `addon-disabled` | When an add-on is disabled | Refreshes the grid |
| `addon-refresh-request` | Manual refresh request | Refreshes the grid |

#### Dispatching Events

```typescript
// Notify the grid that an add-on was enabled
window.dispatchEvent(new CustomEvent('addon-enabled', { 
  detail: { name: 'my-addon' } 
}));

// Notify the grid that an add-on was disabled
window.dispatchEvent(new CustomEvent('addon-disabled', { 
  detail: { name: 'my-addon' } 
}));
```

### REST API Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/addons?status=enabled` | GET | Fetch list of enabled add-ons |
| `/api/addons/{name}/disable` | POST | Disable a specific add-on |
| `/api/addons/{name}/open` | POST | Open a specific add-on's UI |

---

## Visual Style

### Matches Wizards Tile Design

The ActiveAddonsGrid follows the same visual pattern as [`WizardLauncher`](src/ui/WizardLauncher.tsx):

- **Tile Shape**: Rounded corners (12px border-radius)
- **Border**: 2px solid green (#28a745) for active add-ons
- **Size**: Min 140px height, max 180px width
- **Shadow**: Subtle drop shadow on hover

### Active Indicator

Each tile has a **green dot** indicator in the top-right corner:
- Color: `#28a745` (green)
- Size: 12px diameter
- Animation: Subtle pulse animation (2s cycle)
- Purpose: Indicates the add-on is active and running

### Hover Effects

When hovering over a tile:
1. Border color changes to blue (`#007bff`)
2. Tile lifts slightly (`translateY(-2px)`)
3. Box shadow increases
4. Tooltip appears above the tile

### Add-on Type Icons

Default icons by add-on type:

| Type | Icon | Label |
|------|------|-------|
| `workflow_addon` | `:zap:` | Workflow |
| `ui_addon` | `:desktop:` | UI |
| `processing_addon` | `:wrench:` | Processing |
| `model_addon` | `:robot:` | Model |
| `export_addon` | `:outbox:` | Export |

---

## Troubleshooting

### Tiles Don't Appear

If the grid shows "No add-ons enabled" but you expect add-ons:

1. **Check API connectivity**:
   ```bash
   curl http://localhost:8000/api/addons?status=enabled
   ```

2. **Verify add-ons are actually enabled**:
   ```bash
   curl http://localhost:8000/api/addons
   ```
   Look for `"enabled": true` in the response.

3. **Check browser console** for errors:
   - Open Developer Tools (F12)
   - Look for network errors or JavaScript exceptions

4. **Verify the component is mounted**:
   - Ensure the `ActiveAddonsGrid` is rendered in the parent component
   - Check that `projectId` prop is passed correctly

### API Connectivity Issues

If the grid shows an error message:

1. **Verify the backend is running**:
   ```bash
   curl http://localhost:8000/api/addons/stats
   ```

2. **Check CORS settings** if frontend and backend are on different ports

3. **Review network tab** in browser DevTools for failed requests

### Tooltip Not Showing

If the disable tooltip doesn't appear:
- Ensure you're hovering directly over the tile
- Check that `showTooltip` state is being set correctly
- Verify z-index isn't being overridden by parent elements

---

## Developer Notes

### File Locations

| File | Purpose |
|------|---------|
| [`src/ui/ActiveAddonsGrid.tsx`](src/ui/ActiveAddonsGrid.tsx) | Main React component |
| [`src/ui/ActiveAddonsGrid.css`](src/ui/ActiveAddonsGrid.css) | Component styles |
| [`documentation/ACTIVE_ADDONS_GRID_SPEC.md`](documentation/ACTIVE_ADDONS_GRID_SPEC.md) | Technical specification |

### Component Props

```typescript
interface ActiveAddonsGridProps {
  projectId: string;                      // Required: Current project ID
  onAddonClick?: (addon: AddonData) => void;  // Optional: Click callback
  onAddonDisable?: (addonName: string) => void;  // Optional: Disable callback
  onAddonOpen?: (addonName: string) => void;  // Optional: Open callback
  refreshTrigger?: number;                // Optional: External refresh trigger
  className?: string;                     // Optional: Additional CSS class
}
```

### Customizing Styling

To customize the appearance:

1. **Override CSS variables** in your theme:
   ```css
   .active-addons-grid {
     --addon-tile-border: #your-color;
     --addon-active-indicator: #your-color;
   }
   ```

2. **Modify specific classes** in [`ActiveAddonsGrid.css`](src/ui/ActiveAddonsGrid.css):
   - `.addon-tile` - Tile container
   - `.addon-icon` - Icon styling
   - `.addon-tooltip` - Tooltip styling
   - `.active-indicator` - Green dot indicator

3. **Use the `className` prop** for additional styling:
   ```tsx
   <ActiveAddonsGrid 
     projectId="my-project"
     className="custom-addons-theme"
   />
   ```

### Extending Functionality

To add new features:

1. **Add new props** to [`ActiveAddonsGridProps`](src/ui/ActiveAddonsGrid.tsx:46)
2. **Extend the AddonTile** component for new tile actions
3. **Add new event listeners** in the `useEffect` hook (see line 264)
4. **Create new API methods** for backend integration

### Testing

When testing the component:
- Mock the `/api/addons` endpoint for unit tests
- Test loading, error, and empty states
- Verify tooltip interactions
- Test responsive behavior at different viewport widths

---

## Quick Reference

```tsx
// Basic usage
import ActiveAddonsGrid from './ActiveAddonsGrid';

<ActiveAddonsGrid 
  projectId="my-project"
/>

// With callbacks
<ActiveAddonsGrid 
  projectId="my-project"
  onAddonClick={(addon) => console.log('Clicked:', addon.name)}
  onAddonDisable={(name) => console.log('Disabled:', name)}
  onAddonOpen={(name) => console.log('Opened:', name)}
/>

// With external refresh control
const [refreshKey, setRefreshKey] = useState(0);

<ActiveAddonsGrid 
  projectId="my-project"
  refreshTrigger={refreshKey}
/>

// Trigger refresh
setRefreshKey(prev => prev + 1);
```

---

*Last updated: February 2026*