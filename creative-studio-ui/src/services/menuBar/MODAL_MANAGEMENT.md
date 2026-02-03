# Modal Management System

## Overview

The Modal Management System provides centralized control over all modals in the StoryCore Creative Studio menu bar. It handles modal lifecycle, state management, and rendering with a clean, type-safe API.

## Architecture

```
┌─────────────────────────────────────────┐
│         Application Root                │
│  ┌───────────────────────────────────┐  │
│  │      ModalRenderer                │  │
│  │  (Renders active modals)          │  │
│  └───────────────────────────────────┘  │
│                 ▲                        │
│                 │                        │
│  ┌──────────────┴──────────────────┐    │
│  │      ModalManager                │    │
│  │  - Registration                  │    │
│  │  - State tracking                │    │
│  │  - Lifecycle management          │    │
│  └──────────────┬──────────────────┘    │
│                 │                        │
│  ┌──────────────▼──────────────────┐    │
│  │   Menu Bar / Components         │    │
│  │  (Open/close modals)            │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

## Core Components

### ModalManager

The central class that manages all modal operations.

**Key Methods:**
- `registerModal(id, component)` - Register a modal component
- `openModal(id, props)` - Open a modal with props
- `closeModal(id)` - Close a specific modal
- `closeAll()` - Close all open modals
- `isOpen(id)` - Check if a modal is open
- `subscribe(listener)` - Subscribe to state changes

### useModalManager Hook

React hook for using the ModalManager in components.

**Returns:**
- `activeModals` - Set of currently open modal IDs
- `openModal(id, props)` - Function to open a modal
- `closeModal(id)` - Function to close a modal
- `closeAll()` - Function to close all modals
- `isOpen(id)` - Function to check if modal is open

### ModalRenderer

Component that renders all active modals. Place this at the root of your application.

## Available Modals

### NewProjectModal

Modal for creating a new project.

**Props:**
- `onCreateProject: (name: string, type?: string) => void | Promise<void>`

**Usage:**
```typescript
openModal('new-project', {
  onCreateProject: async (name, type) => {
    await projectService.create(name, type);
  }
});
```

### SaveAsModal

Modal for saving project with a new name.

**Props:**
- `currentProjectName: string`
- `onSaveAs: (newName: string, location?: string) => void | Promise<void>`

**Usage:**
```typescript
openModal('save-as', {
  currentProjectName: 'My Project',
  onSaveAs: async (newName, location) => {
    await projectService.saveAs(newName, location);
  }
});
```

### ExportModal

Modal for exporting project in various formats.

**Props:**
- `projectName: string`
- `onExport: (options: ExportOptions) => void | Promise<void>`

**Export Options:**
- `format: 'json' | 'pdf' | 'video'`
- `includeAssets?: boolean`
- `includeQAReport?: boolean`
- `videoQuality?: 'low' | 'medium' | 'high'`

**Usage:**
```typescript
openModal('export', {
  projectName: 'My Project',
  onExport: async (options) => {
    await exportService.export(options);
  }
});
```

### KeyboardShortcutsModal

Modal displaying all keyboard shortcuts.

**Props:**
- `shortcuts?: ShortcutCategory[]` (optional, uses defaults if not provided)

**Usage:**
```typescript
openModal('keyboard-shortcuts');
// Or with custom shortcuts:
openModal('keyboard-shortcuts', {
  shortcuts: customShortcutList
});
```

### AboutModal

Modal displaying application information.

**Props:**
- `version?: string`
- `buildDate?: string`

**Usage:**
```typescript
openModal('about', {
  version: '1.0.0',
  buildDate: '2024-01-28'
});
```

### ConfirmationModal

Generic confirmation dialog.

**Props:**
- `title: string`
- `message: string`
- `type?: 'warning' | 'info' | 'question'`
- `buttons?: ConfirmationButton[]`
- `showCancel?: boolean`

**Preset Variants:**
- `UnsavedChangesConfirmation` - For unsaved changes warnings
- `DeleteConfirmation` - For delete confirmations

**Usage:**
```typescript
// Generic confirmation
openModal('confirmation', {
  title: 'Confirm Action',
  message: 'Are you sure?',
  type: 'warning',
  buttons: [
    {
      label: 'Confirm',
      variant: 'destructive',
      action: async () => {
        await performAction();
      }
    }
  ]
});

// Unsaved changes
openModal('unsaved-changes', {
  onSave: async () => await saveProject(),
  onDontSave: () => closeProject()
});
```

## Setup

### 1. Register Modals at Application Startup

```typescript
import { modalManager } from '@/services/menuBar';
import {
  NewProjectModal,
  SaveAsModal,
  ExportModal,
  KeyboardShortcutsModal,
  AboutModal,
  UnsavedChangesConfirmation,
} from '@/components/modals/menuBar';

// In your app initialization
useEffect(() => {
  modalManager.registerModal('new-project', NewProjectModal);
  modalManager.registerModal('save-as', SaveAsModal);
  modalManager.registerModal('export', ExportModal);
  modalManager.registerModal('keyboard-shortcuts', KeyboardShortcutsModal);
  modalManager.registerModal('about', AboutModal);
  modalManager.registerModal('unsaved-changes', UnsavedChangesConfirmation);
}, []);
```

### 2. Add ModalRenderer to Your App Root

```typescript
import { ModalRenderer } from '@/services/menuBar';

function App() {
  return (
    <div>
      {/* Your app content */}
      <YourAppContent />
      
      {/* Modal renderer - renders all active modals */}
      <ModalRenderer />
    </div>
  );
}
```

### 3. Use Modals in Your Components

```typescript
import { useModalManager } from '@/services/menuBar';

function MenuBar() {
  const { openModal } = useModalManager();

  const handleNewProject = () => {
    openModal('new-project', {
      onCreateProject: async (name, type) => {
        await createProject(name, type);
      }
    });
  };

  return (
    <button onClick={handleNewProject}>
      New Project
    </button>
  );
}
```

## Best Practices

### 1. Modal Registration

Register all modals once at application startup, not in individual components:

```typescript
// ✅ Good - Register once at app root
useEffect(() => {
  modalManager.registerModal('my-modal', MyModal);
}, []);

// ❌ Bad - Registering in every component
function MyComponent() {
  useEffect(() => {
    modalManager.registerModal('my-modal', MyModal);
  }, []);
}
```

### 2. Error Handling

Always handle errors in modal actions:

```typescript
openModal('new-project', {
  onCreateProject: async (name) => {
    try {
      await projectService.create(name);
      notificationService.success('Project created');
    } catch (error) {
      notificationService.error('Failed to create project');
      throw error; // Re-throw to let modal handle it
    }
  }
});
```

### 3. Cleanup

Clean up modal registrations when components unmount:

```typescript
useEffect(() => {
  modalManager.registerModal('custom-modal', CustomModal);
  
  return () => {
    modalManager.unregisterModal('custom-modal');
  };
}, []);
```

### 4. Type Safety

Use TypeScript interfaces for modal props:

```typescript
interface MyModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: MyData;
}

function MyModal({ isOpen, onClose, data }: MyModalProps) {
  // Implementation
}

// Type-safe modal opening
openModal('my-modal', {
  data: myData // TypeScript will validate this
});
```

## Integration with Menu Bar

The modal system integrates seamlessly with the menu bar configuration:

```typescript
const menuConfig = {
  id: 'file',
  label: 'File',
  items: [
    {
      id: 'new-project',
      label: 'New Project',
      action: (context) => {
        context.services.modal.openModal('new-project', {
          onCreateProject: async (name, type) => {
            await context.services.persistence.createProject(name, type);
          }
        });
      }
    }
  ]
};
```

## Testing

### Unit Testing ModalManager

```typescript
import { ModalManager } from './ModalManager';

describe('ModalManager', () => {
  let manager: ModalManager;

  beforeEach(() => {
    manager = new ModalManager();
  });

  it('should register and open modals', () => {
    const MockModal = () => <div>Mock</div>;
    manager.registerModal('test', MockModal);
    
    manager.openModal('test', { prop: 'value' });
    
    expect(manager.isOpen('test')).toBe(true);
  });

  it('should close modals', () => {
    manager.openModal('test');
    manager.closeModal('test');
    
    expect(manager.isOpen('test')).toBe(false);
  });
});
```

### Testing Modal Components

```typescript
import { render, fireEvent } from '@testing-library/react';
import { NewProjectModal } from './NewProjectModal';

describe('NewProjectModal', () => {
  it('should call onCreateProject with form data', async () => {
    const onCreateProject = vi.fn();
    const { getByLabelText, getByText } = render(
      <NewProjectModal
        isOpen={true}
        onClose={() => {}}
        onCreateProject={onCreateProject}
      />
    );

    fireEvent.change(getByLabelText(/project name/i), {
      target: { value: 'Test Project' }
    });
    
    fireEvent.click(getByText(/create project/i));

    expect(onCreateProject).toHaveBeenCalledWith('Test Project', 'standard');
  });
});
```

## Troubleshooting

### Modal Not Appearing

1. Check that the modal is registered:
   ```typescript
   console.log(modalManager.getRegisteredModals());
   ```

2. Check that ModalRenderer is in your component tree:
   ```typescript
   // Should be at root level
   <ModalRenderer />
   ```

3. Check that the modal is actually open:
   ```typescript
   console.log(modalManager.isOpen('my-modal'));
   ```

### Modal Props Not Updating

Modal props are passed when the modal is opened. To update props, close and reopen the modal:

```typescript
// Close and reopen with new props
modalManager.closeModal('my-modal');
modalManager.openModal('my-modal', { newProp: 'value' });
```

### Multiple Modals Open

The system supports multiple modals open simultaneously. They will stack in the order they were opened. To close all:

```typescript
modalManager.closeAll();
```

## Requirements Satisfied

This modal management system satisfies the following requirements:

- **1.1, 1.4, 1.5**: File menu operations (New, Save As, Export)
- **2.10**: Edit menu preferences modal
- **6.2, 6.3**: Help menu modals (Shortcuts, About)
- **1.8, 15.3**: Unsaved changes protection and confirmations

## See Also

- [Menu Bar Configuration](./MenuConfigValidator.ts)
- [Menu State Management](./MenuStateManager.ts)
- [Modal Components](../../components/modals/menuBar/)
