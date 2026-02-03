# Modal Components

This directory contains modal dialog components for the StoryCore application, including configuration modals for the Settings menu.

## Components

### Base Modal (`Modal.tsx`)

A reusable modal component with full accessibility support:

**Features:**
- Focus trap: Keeps focus within the modal when open
- Keyboard handling: Escape key closes the modal
- ARIA attributes: Proper accessibility labels and roles
- Backdrop click: Click outside to close
- Focus restoration: Returns focus to the triggering element on close
- Smooth animations: Fade-in and zoom-in effects

**Props:**
```typescript
interface ModalProps {
  isOpen: boolean;        // Controls modal visibility
  onClose: () => void;    // Callback when modal should close
  title: string;          // Modal title displayed in header
  children: React.ReactNode; // Modal content
  className?: string;     // Additional CSS classes
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'; // Modal size
}
```

**Usage:**
```tsx
import { Modal } from '@/components/modals';

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      title="My Modal"
      size="lg"
    >
      <div>Modal content goes here</div>
    </Modal>
  );
}
```

### LLM Configuration Modal (`LLMConfigModal.tsx`)

Modal wrapper for LLM configuration, accessible from the Settings menu.

**Features:**
- Wraps the existing `LLMSettingsPanel` component
- Provides consistent modal interface
- Handles save and close actions
- Passes through configuration and callbacks

**Props:**
```typescript
interface LLMConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig?: Partial<LLMConfig>;
  onSave?: (config: LLMConfig) => void | Promise<void>;
  onTestConnection?: (config: Partial<LLMConfig>) => Promise<boolean>;
}
```

**Usage:**
```tsx
import { LLMConfigModal } from '@/components/modals';

function SettingsMenu() {
  const [isOpen, setIsOpen] = useState(false);

  const handleSave = async (config: LLMConfig) => {
    // Save configuration
    await saveLLMConfig(config);
  };

  return (
    <LLMConfigModal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      onSave={handleSave}
    />
  );
}
```

### ComfyUI Configuration Modal (`ComfyUIConfigModal.tsx`)

Modal wrapper for ComfyUI server configuration, accessible from the Settings menu.

**Features:**
- Wraps the existing `ComfyUISettingsPanel` component
- Provides consistent modal interface
- Handles save and close actions
- Passes through configuration and callbacks

**Props:**
```typescript
interface ComfyUIConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig?: Partial<ComfyUIConfig>;
  onSave?: (config: ComfyUIConfig) => void | Promise<void>;
}
```

**Usage:**
```tsx
import { ComfyUIConfigModal } from '@/components/modals';

function SettingsMenu() {
  const [isOpen, setIsOpen] = useState(false);

  const handleSave = async (config: ComfyUIConfig) => {
    // Save configuration
    await saveComfyUIConfig(config);
  };

  return (
    <ComfyUIConfigModal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      onSave={handleSave}
    />
  );
}
```

## Accessibility

All modal components follow accessibility best practices:

1. **Keyboard Navigation:**
   - Tab/Shift+Tab: Navigate between focusable elements
   - Escape: Close the modal
   - Focus trap: Focus stays within modal

2. **ARIA Attributes:**
   - `role="dialog"`: Identifies the modal as a dialog
   - `aria-modal="true"`: Indicates modal behavior
   - `aria-labelledby`: Links to the modal title

3. **Focus Management:**
   - Focus moves to modal when opened
   - Focus returns to trigger element when closed
   - First focusable element receives focus

4. **Screen Reader Support:**
   - Proper semantic HTML structure
   - Descriptive labels and titles
   - Status messages announced

## Testing

All modal components have comprehensive test coverage:

- **Modal.test.tsx**: Tests for base Modal component
  - Rendering and visibility
  - Keyboard handling (Escape key)
  - Focus management
  - ARIA attributes
  - Backdrop clicks
  - Size variants

- **ConfigModals.test.tsx**: Tests for configuration modals
  - LLMConfigModal rendering and behavior
  - ComfyUIConfigModal rendering and behavior
  - Props passing to wrapped components
  - Save and close actions

Run tests with:
```bash
npm test -- src/components/modals/__tests__
```

## Implementation Notes

### Requirements Validation

These components validate the following requirements from the UI Menu Reorganization spec:

- **Requirement 2.2**: LLM Config menu item opens configuration window
- **Requirement 2.4**: ComfyUI Config menu item opens configuration window
- **Requirement 5.1**: LLM configuration window displays chatbox config interface
- **Requirement 5.2**: ComfyUI configuration window displays server config interface
- **Requirement 5.3**: Configuration windows return focus on close

### Design Decisions

1. **Component Reuse**: Configuration modals wrap existing settings panels rather than duplicating code, ensuring consistency across the application.

2. **Accessibility First**: The base Modal component implements all accessibility features (focus trap, keyboard handling, ARIA) so that all modals automatically inherit these features.

3. **Flexible Sizing**: The Modal component supports multiple size variants to accommodate different content needs.

4. **Smooth UX**: Modals include animations and proper focus management for a polished user experience.

5. **TypeScript**: All components are fully typed for better developer experience and type safety.

## Future Enhancements

Potential improvements for future iterations:

1. **Animation Customization**: Allow custom animation variants
2. **Portal Rendering**: Use React Portal for better DOM positioning
3. **Stacking Context**: Support for multiple modals with proper z-index management
4. **Confirmation Dialogs**: Add specialized confirmation modal variant
5. **Form Integration**: Enhanced form handling with validation
6. **Responsive Sizing**: Better mobile/tablet size handling
