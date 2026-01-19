# Wizard Infrastructure

This directory contains the reusable wizard infrastructure for the Creative Studio UI. The wizard system provides a multi-step form experience with state management, navigation, validation, and auto-save functionality.

## Components

### Core Components

- **WizardContainer**: Main container component that wraps the entire wizard experience
- **WizardStepIndicator**: Visual progress indicator showing current step and completion status
- **WizardNavigation**: Navigation buttons (Previous, Next, Cancel, Submit)
- **WizardFormLayout**: Layout components for consistent form styling
  - `FormField`: Individual form field with label, error display, and help text
  - `FormSection`: Grouped form fields with section title
  - `FormGrid`: Multi-column grid layout for forms
  - `ValidationErrorSummary`: Summary of all validation errors

### Context and Hooks

- **WizardContext**: React context providing wizard state and actions
- **useWizard**: Hook to access wizard context
- **useWizardNavigation**: Hook providing enhanced navigation with validation

### Utilities

- **wizardStorage**: LocalStorage utilities for auto-save and state persistence
  - `saveWizardState`: Save wizard progress to localStorage
  - `loadWizardState`: Load saved wizard progress
  - `clearWizardState`: Clear saved progress
  - `exportWizardState`: Export wizard data as JSON
  - `importWizardState`: Import wizard data from JSON

## Usage Example

```typescript
import { WizardProvider, useWizard } from '@/contexts/WizardContext';
import { WizardContainer, WizardStep, FormField, FormGrid } from '@/components/wizard';
import { Input } from '@/components/ui/input';

// Define your data model
interface MyFormData {
  name: string;
  email: string;
  age: number;
}

// Define wizard steps
const steps: WizardStep[] = [
  { number: 1, title: 'Basic Info', description: 'Enter your details' },
  { number: 2, title: 'Preferences', description: 'Set your preferences' },
  { number: 3, title: 'Review', description: 'Review and submit' },
];

// Step component
function Step1() {
  const { formData, updateFormData, validationErrors } = useWizard<MyFormData>();

  return (
    <FormGrid columns={2}>
      <FormField
        label="Name"
        name="name"
        required
        error={validationErrors.name?.[0]}
        helpText="Enter your full name"
      >
        <Input
          value={formData.name || ''}
          onChange={(e) => updateFormData({ name: e.target.value })}
        />
      </FormField>

      <FormField
        label="Email"
        name="email"
        required
        error={validationErrors.email?.[0]}
      >
        <Input
          type="email"
          value={formData.email || ''}
          onChange={(e) => updateFormData({ email: e.target.value })}
        />
      </FormField>
    </FormGrid>
  );
}

// Main wizard component
function MyWizard({ onComplete, onCancel }: MyWizardProps) {
  const handleSubmit = async (data: MyFormData) => {
    // Process the completed form data
    await onComplete(data);
  };

  const handleValidateStep = async (step: number, data: Partial<MyFormData>) => {
    const errors: Record<string, string[]> = {};

    if (step === 1) {
      if (!data.name) {
        errors.name = ['Name is required'];
      }
      if (!data.email) {
        errors.email = ['Email is required'];
      }
    }

    return errors;
  };

  return (
    <WizardProvider
      wizardType="world"
      totalSteps={3}
      onSubmit={handleSubmit}
      onValidateStep={handleValidateStep}
      autoSave={true}
      autoSaveDelay={2000}
    >
      <WizardContainer
        title="Create New World"
        steps={steps}
        onCancel={onCancel}
        onComplete={() => console.log('Wizard completed!')}
        allowJumpToStep={false}
        showAutoSaveIndicator={true}
      >
        {/* Render current step based on context */}
        <WizardStepContent />
      </WizardContainer>
    </WizardProvider>
  );
}

function WizardStepContent() {
  const { currentStep } = useWizard();

  switch (currentStep) {
    case 1:
      return <Step1 />;
    case 2:
      return <Step2 />;
    case 3:
      return <Step3 />;
    default:
      return null;
  }
}
```

## Features

### State Management

- **Form Data**: Centralized form data management with type safety
- **Validation**: Per-step validation with error tracking
- **Dirty State**: Tracks whether form has been modified
- **Submission State**: Loading state during form submission

### Navigation

- **Step Navigation**: Next, Previous, and Jump to Step functionality
- **Validation on Navigate**: Optional validation before advancing
- **Boundary Handling**: Automatic disable of navigation at first/last steps
- **Progress Tracking**: Visual progress indicator

### Persistence

- **Auto-Save**: Automatic saving to localStorage with configurable delay
- **Resume**: Load and resume incomplete wizards
- **Expiration**: Automatic cleanup of old saved states (default 7 days)
- **Export/Import**: JSON export/import for data recovery

### Accessibility

- **Keyboard Navigation**: Full keyboard support
- **ARIA Labels**: Proper ARIA attributes for screen readers
- **Error Announcements**: Live regions for error messages
- **Focus Management**: Proper focus handling between steps

## API Reference

### WizardProvider Props

```typescript
interface WizardProviderProps<T> {
  children: ReactNode;
  wizardType: 'world' | 'character';
  totalSteps: number;
  initialData?: Partial<T>;
  onSubmit: (data: T) => Promise<void>;
  onValidateStep?: (step: number, data: Partial<T>) => Promise<Record<string, string[]>>;
  autoSave?: boolean;
  autoSaveDelay?: number; // milliseconds
}
```

### useWizard Hook

```typescript
interface WizardContextState<T> {
  currentStep: number;
  totalSteps: number;
  formData: Partial<T>;
  validationErrors: Record<string, string[]>;
  isSubmitting: boolean;
  isDirty: boolean;
  
  goToStep: (step: number) => void;
  nextStep: () => void;
  previousStep: () => void;
  updateFormData: (data: Partial<T>) => void;
  setValidationErrors: (errors: Record<string, string[]>) => void;
  validateStep: (step: number) => Promise<boolean>;
  submitWizard: () => Promise<void>;
  resetWizard: () => void;
  saveProgress: () => void;
  loadProgress: () => void;
}
```

### useWizardNavigation Hook

```typescript
interface WizardNavigationReturn {
  currentStep: number;
  totalSteps: number;
  nextStep: () => Promise<boolean>;
  previousStep: () => void;
  jumpToStep: (step: number) => Promise<boolean>;
  canGoNext: boolean;
  canGoPrevious: boolean;
  isFirstStep: boolean;
  isLastStep: boolean;
  progress: number; // 0-100
}
```

## Best Practices

1. **Type Safety**: Always provide a type parameter to `useWizard<T>()` for type-safe form data
2. **Validation**: Implement `onValidateStep` for step-by-step validation
3. **Error Handling**: Display validation errors inline with `FormField` component
4. **Auto-Save**: Enable auto-save for long wizards to prevent data loss
5. **Accessibility**: Use semantic HTML and ARIA labels for all form fields
6. **Loading States**: Show loading indicators during submission
7. **Confirmation**: Prompt for confirmation before canceling with unsaved changes

## Requirements Validated

This wizard infrastructure validates the following requirements from the design document:

- **Requirement 5.1**: Auto-save to localStorage within 2 seconds
- **Requirement 5.2**: Preserve partial data on wizard close
- **Requirement 5.3**: Restore previous state on reopen
- **Requirement 5.4**: Clear temporary state on completion
- **Requirement 6.1**: Consistent shadcn/ui components and styling
- **Requirement 1.6**: Preserve entered data during navigation
- **Requirement 5.7**: Maintain separate state for each wizard type

## Testing

The wizard infrastructure includes comprehensive tests covering:

- State management and form data updates
- Navigation between steps with data preservation
- LocalStorage persistence and recovery
- Validation and error handling
- Boundary conditions (first/last step)
- Corrupted state detection and cleanup

Run tests with:
```bash
npm test -- wizard
```
