# Context Menu Component

A flexible and feature-rich context menu system for the Advanced Grid Editor.

## Features

- ✅ **Positioned Display**: Automatically adjusts position to stay within viewport
- ✅ **Click Outside Handling**: Closes menu when clicking outside
- ✅ **Escape Key Support**: Closes menu with Escape key
- ✅ **Hierarchical Submenus**: Supports nested menu items
- ✅ **Keyboard Shortcuts Display**: Shows shortcuts for each action
- ✅ **Adaptive Context**: Different menus for single shot, multiple shots, and empty timeline
- ✅ **Smooth Animations**: Uses Framer Motion for fluid transitions
- ✅ **Icon Support**: Displays icons alongside menu items
- ✅ **Danger Actions**: Visual distinction for destructive actions
- ✅ **Disabled States**: Support for disabled menu items

## Usage

### Basic Usage

```tsx
import { ContextMenu, useContextMenu } from '../components/contextMenu';
import { buildContextMenu, determineMenuContext } from '../services/contextMenu';

const MyComponent = () => {
  const { menuState, showContextMenu, hideContextMenu } = useContextMenu();
  
  const handlers = {
    onDuplicate: (shots) => console.log('Duplicate', shots),
    onDelete: (shotIds) => console.log('Delete', shotIds),
    // ... other handlers
  };

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    
    const context = determineMenuContext(selectedShots, true);
    const menuItems = buildContextMenu(context, selectedShots, handlers);
    
    showContextMenu(event.clientX, event.clientY, menuItems);
  };

  return (
    <>
      <div onContextMenu={handleContextMenu}>
        Right-click me!
      </div>
      
      {menuState.visible && (
        <ContextMenu
          items={menuState.items}
          position={menuState.position}
          onClose={hideContextMenu}
        />
      )}
    </>
  );
};
```

### Menu Contexts

The system supports three different contexts:

#### 1. Single Shot Menu
Displayed when right-clicking on a single shot:
- Duplicate
- Delete
- Export (with submenu)
- Transform (with submenu)
- Add Tag
- Properties

#### 2. Multiple Shots Menu
Displayed when right-clicking with multiple shots selected:
- Selection info (disabled, shows count)
- Duplicate All
- Delete All
- Batch Export (with submenu)
- Batch Transform (with submenu)
- Add Tag to All
- Group Shots

#### 3. Empty Timeline Menu
Displayed when right-clicking on empty timeline area:
- Create New Shot
- Import (with submenu)
- Paste
- Create from Template (with submenu)

### Custom Menu Items

You can create custom menu items:

```tsx
const customItems: ContextMenuItem[] = [
  {
    id: 'custom-action',
    label: 'Custom Action',
    icon: <MyIcon />,
    shortcut: 'Ctrl+K',
    action: () => console.log('Custom action'),
    submenu: [
      {
        id: 'sub-action-1',
        label: 'Sub Action 1',
        action: () => console.log('Sub action 1')
      }
    ]
  },
  {
    id: 'separator',
    label: '',
    separator: true
  },
  {
    id: 'danger-action',
    label: 'Dangerous Action',
    danger: true,
    action: () => console.log('Danger!')
  }
];
```

## API Reference

### ContextMenu Component

```tsx
interface ContextMenuProps {
  items: ContextMenuItem[];
  position: { x: number; y: number };
  onClose: () => void;
  visible?: boolean;
}
```

### ContextMenuItem Interface

```tsx
interface ContextMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  submenu?: ContextMenuItem[];
  action?: () => void;
  separator?: boolean;
}
```

### useContextMenu Hook

```tsx
const {
  menuState,      // Current menu state
  showContextMenu,    // Show menu at position
  hideContextMenu,    // Hide menu
  handleContextMenu   // Convenience handler for onContextMenu events
} = useContextMenu();
```

### Context Menu Actions

```tsx
// Duplicate shots
duplicateShot(shot: Shot, existingShots: Shot[]): Shot
duplicateShots(shots: Shot[], allShots: Shot[]): Shot[]

// Delete shots with confirmation
deleteShots(shots: Shot[], onDelete: (shotIds: string[]) => void): Promise<boolean>

// Export shots
exportShots(shots: Shot[]): void

// Transform shots
transformShots(shots: Shot[], transformType: string, onTransform: (shots: Shot[]) => void): void

// Tag shots
tagShots(shots: Shot[], tag: string, onUpdate: (shots: Shot[]) => void): void
```

### Context Menu Builder

```tsx
// Build menu based on context
buildContextMenu(
  context: MenuContext,
  shots: Shot[],
  handlers: ContextMenuActionHandlers
): ContextMenuItem[]

// Determine context from selection
determineMenuContext(
  selectedShots: Shot[],
  clickedOnShot: boolean
): MenuContext
```

## Requirements Validation

This implementation satisfies the following requirements:

### Exigence 6.1 ✅
WHEN l'utilisateur clique droit sur un plan, THE Context_Menu SHALL afficher les opérations disponibles pour ce plan
- Implemented in `buildSingleShotMenu`

### Exigence 6.2 ✅
WHEN plusieurs plans sont sélectionnés, THE Context_Menu SHALL afficher les opérations par lots applicables
- Implemented in `buildMultipleShotsMenu`

### Exigence 6.3 ✅
WHEN l'utilisateur sélectionne "Duplicate", THE Context_Menu SHALL créer une copie du plan avec suffixe numérique
- Implemented in `generateDuplicateName` and `duplicateShot`

### Exigence 6.4 ✅
WHEN l'utilisateur sélectionne "Delete", THE Context_Menu SHALL demander confirmation si plus de 5 plans sélectionnés
- Implemented in `requiresDeleteConfirmation` and `confirmDelete`

### Exigence 6.5 ✅
THE Context_Menu SHALL afficher les raccourcis clavier associés à chaque action
- Implemented in `ContextMenu` component with `shortcut` prop

### Exigence 6.6 ✅
WHEN l'utilisateur clique droit sur la timeline vide, THE Context_Menu SHALL afficher les options de création
- Implemented in `buildEmptyTimelineMenu`

### Exigence 6.7 ✅
THE Context_Menu SHALL supporter les sous-menus pour les opérations groupées
- Implemented in `ContextMenu` component with `submenu` support

### Exigence 6.8 ✅
WHEN l'utilisateur clique en dehors, THE Context_Menu SHALL se fermer automatiquement
- Implemented in `ContextMenu` component with click outside detection

## Example

See `src/examples/ContextMenuExample.tsx` for a complete working example.

## Testing

Property-based tests are defined in task 10.2 (optional):
- **Propriété 11: Menu Contextuel Adaptatif** - Validates that menu items match context
- **Propriété 12: Duplication avec Suffixe Unique** - Validates unique naming for duplicates

## Architecture

```
components/contextMenu/
├── ContextMenu.tsx          # Main component
├── useContextMenu.ts        # State management hook
├── index.ts                 # Public exports
└── README.md                # This file

services/contextMenu/
├── ContextMenuActions.ts    # Action implementations
├── ContextMenuBuilder.ts    # Menu building logic
└── index.ts                 # Public exports

examples/
└── ContextMenuExample.tsx   # Usage example
```

## Future Enhancements

- Keyboard navigation (arrow keys)
- Search/filter in large menus
- Recent actions history
- Custom themes
- Touch/mobile support
- Accessibility improvements (ARIA labels)
