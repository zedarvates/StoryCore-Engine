# MenuBar Components

Core menu components for building accessible menu bars with full keyboard navigation support.

## Components

### MenuBarErrorBoundary

An error boundary component that catches errors in the MenuBar component tree and provides graceful error handling.

**Features:**
- Catches component errors and prevents app crash
- Displays user-friendly error messages via notification service
- Logs errors to console for debugging
- Provides optional fallback UI
- Allows custom error handling via callback
- Includes retry mechanism for error recovery

**Example:**
```tsx
import { MenuBar, MenuBarErrorBoundary } from '@/components/menuBar';

// Basic usage
<MenuBarErrorBoundary>
  <MenuBar {...props} />
</MenuBarErrorBoundary>

// With custom fallback UI
<MenuBarErrorBoundary
  fallback={
    <div className="error-message">
      Menu bar error - please reload
    </div>
  }
>
  <MenuBar {...props} />
</MenuBarErrorBoundary>

// With custom error handler
<MenuBarErrorBoundary
  onError={(error, errorInfo) => {
    // Log to external service
    logErrorToService(error, errorInfo);
  }}
>
  <MenuBar {...props} />
</MenuBarErrorBoundary>
```

**Props:**
- `children`: ReactNode - Child components to wrap
- `fallback?`: ReactNode - Optional custom fallback UI
- `onError?`: (error: Error, errorInfo: ErrorInfo) => void - Optional error callback

**Default Fallback UI:**
When an error occurs and no custom fallback is provided, displays:
- Error icon with "Menu bar error" message
- Retry button to reset the error boundary
- Proper ARIA attributes for accessibility

**Requirements:** 15.2 (Error Handling and User Feedback)

### MenuItem

A single menu item within a dropdown menu.

**Features:**
- Labels with optional icons
- Keyboard shortcuts display
- Enabled/disabled states
- Checked states for toggles
- Submenu indicators
- Full ARIA accessibility attributes

**Example:**
```tsx
import { MenuItem } from '@/components/menuBar';

<MenuItem
  id="save"
  label="Save Project"
  shortcut="Ctrl+S"
  enabled={true}
  onClick={handleSave}
/>

// Toggle item
<MenuItem
  id="grid"
  label="Show Grid"
  checked={gridVisible}
  onClick={toggleGrid}
/>

// Disabled item
<MenuItem
  id="export"
  label="Export"
  enabled={false}
  onClick={handleExport}
/>

// Item with submenu
<MenuItem
  id="recent"
  label="Recent Projects"
  hasSubmenu={true}
/>
```

### MenuDropdown

A dropdown menu that displays menu items with full keyboard navigation.

**Features:**
- Arrow key navigation (up/down)
- Enter key activation
- Escape key to close
- Home/End key navigation
- Roving tabindex for focus management
- Click outside to close
- Mouse hover support

**Example:**
```tsx
import { MenuDropdown } from '@/components/menuBar';

<MenuDropdown
  items={[
    { id: 'new', label: 'New Project', shortcut: 'Ctrl+N', onClick: handleNew },
    { id: 'open', label: 'Open Project', shortcut: 'Ctrl+O', onClick: handleOpen },
    { id: 'save', label: 'Save', shortcut: 'Ctrl+S', enabled: hasProject, onClick: handleSave }
  ]}
  isOpen={isOpen}
  onClose={handleClose}
  ariaLabel="File menu"
/>
```

### Menu

A menu trigger button with an associated dropdown menu.

**Features:**
- Menu open/close state management
- Click and hover interactions
- Keyboard activation (Enter, Space, Arrow keys)
- Focus management
- ARIA attributes for accessibility

**Example:**
```tsx
import { Menu } from '@/components/menuBar';

<Menu
  id="file-menu"
  label="File"
  items={[
    { id: 'new', label: 'New Project', shortcut: 'Ctrl+N', onClick: handleNew },
    { id: 'open', label: 'Open Project', shortcut: 'Ctrl+O', onClick: handleOpen },
    { id: 'save', label: 'Save', shortcut: 'Ctrl+S', onClick: handleSave }
  ]}
  onItemClick={(itemId) => console.log('Clicked:', itemId)}
/>
```

## Complete MenuBar Example with Error Boundary

```tsx
import React from 'react';
import { Menu, MenuBarErrorBoundary } from '@/components/menuBar';

export function MenuBar() {
  const [gridVisible, setGridVisible] = React.useState(false);
  const [project, setProject] = React.useState(null);

  const fileMenuItems = [
    {
      id: 'new',
      label: 'New Project',
      shortcut: 'Ctrl+N',
      onClick: () => console.log('New project'),
    },
    {
      id: 'open',
      label: 'Open Project',
      shortcut: 'Ctrl+O',
      onClick: () => console.log('Open project'),
    },
    {
      id: 'save',
      label: 'Save',
      shortcut: 'Ctrl+S',
      enabled: project !== null,
      onClick: () => console.log('Save project'),
    },
  ];

  const viewMenuItems = [
    {
      id: 'grid',
      label: 'Show Grid',
      checked: gridVisible,
      onClick: () => setGridVisible(!gridVisible),
    },
    {
      id: 'zoom-in',
      label: 'Zoom In',
      shortcut: 'Ctrl++',
      onClick: () => console.log('Zoom in'),
    },
    {
      id: 'zoom-out',
      label: 'Zoom Out',
      shortcut: 'Ctrl+-',
      onClick: () => console.log('Zoom out'),
    },
  ];

  return (
    <MenuBarErrorBoundary>
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center h-12 px-4 gap-2">
          <Menu id="file" label="File" items={fileMenuItems} />
          <Menu id="view" label="View" items={viewMenuItems} />
        </div>
      </nav>
    </MenuBarErrorBoundary>
  );
}
```

## Error Handling

### Error Boundary Best Practices

1. **Always wrap MenuBar in production:**
   ```tsx
   <MenuBarErrorBoundary>
     <MenuBar {...props} />
   </MenuBarErrorBoundary>
   ```

2. **Provide custom error handlers for logging:**
   ```tsx
   <MenuBarErrorBoundary
     onError={(error, errorInfo) => {
       logToMonitoringService({
         error: error.message,
         stack: error.stack,
         componentStack: errorInfo.componentStack,
         timestamp: new Date().toISOString(),
       });
     }}
   >
     <MenuBar {...props} />
   </MenuBarErrorBoundary>
   ```

3. **Use custom fallback UI to match your design:**
   ```tsx
   const customFallback = (
     <div className="menu-error">
       Menu bar error - please reload
     </div>
   );
   
   <MenuBarErrorBoundary fallback={customFallback}>
     <MenuBar {...props} />
   </MenuBarErrorBoundary>
   ```

### Error Boundary Limitations

Error boundaries do NOT catch errors in:
- Event handlers (use try-catch instead)
- Asynchronous code (setTimeout, promises)
- Server-side rendering
- Errors thrown in the error boundary itself

For these cases, implement additional error handling in your components.

## Keyboard Navigation

### Menu Trigger
- **Enter/Space**: Open menu
- **Arrow Down**: Open menu and focus first item
- **Arrow Up**: Open menu and focus last item
- **Escape**: Close menu (when open)

### Menu Dropdown
- **Arrow Down**: Move to next enabled item
- **Arrow Up**: Move to previous enabled item
- **Home**: Move to first enabled item
- **End**: Move to last enabled item
- **Enter/Space**: Activate focused item
- **Escape**: Close menu and return focus to trigger
- **Tab**: Close menu and continue tab navigation

## Accessibility

All components follow WAI-ARIA menu pattern guidelines:

- **Roles**: `menubar`, `menu`, `menuitem`
- **States**: `aria-expanded`, `aria-haspopup`, `aria-disabled`, `aria-checked`
- **Labels**: `aria-label` for all interactive elements
- **Focus Management**: Roving tabindex pattern
- **Keyboard Support**: Full keyboard navigation
- **Screen Reader**: Proper announcements for all states

## Styling

Components use Tailwind CSS classes and support:
- Light and dark themes
- Hover states
- Focus indicators
- Disabled states
- Smooth transitions

Customize by passing `className` prop or modifying the component styles.

## Requirements Validation

These components satisfy the following requirements from the spec:

- **8.1-8.4**: Menu state management with visual feedback
- **10.1-10.5**: Full keyboard navigation support
- **10.3, 10.6**: Complete ARIA attributes for accessibility
- **15.2**: Error handling and user feedback with MenuBarErrorBoundary
