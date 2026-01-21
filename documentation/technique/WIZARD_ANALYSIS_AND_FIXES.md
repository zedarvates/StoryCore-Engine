# Wizard Functionality Analysis and Fixes

## Executive Summary

After analyzing the wizard functionality in the StoryCore-Engine Creative Studio, I've identified **12 critical issues** across multiple areas including state management, navigation, validation, integration, and user experience. This document provides a comprehensive breakdown of each issue with detailed fixes.

## Issues Identified

### 1. **Wizard Store Type Inconsistency** ⚠️ CRITICAL
**Location**: `creative-studio-ui/src/stores/wizard/wizardStore.ts`

**Problem**: The wizard store uses `Set` and `Map` for `completedSteps` and `validationErrors`, but the persistence layer serializes them as arrays. This causes type mismatches and potential runtime errors.

**Impact**: 
- State restoration fails silently
- Completed steps are lost on page reload
- Validation errors don't persist correctly

**Fix**:
```typescript
// In wizardStore.ts - Update the merge function
merge: (persistedState: any, currentState) => {
  const completedSteps = Array.isArray(persistedState.completedSteps) 
    ? new Set(persistedState.completedSteps) 
    : new Set();
  
  const validationErrors = Array.isArray(persistedState.validationErrors)
    ? new Map(persistedState.validationErrors)
    : new Map();

  return {
    ...currentState,
    ...persistedState,
    completedSteps,
    validationErrors,
  };
},
```

---

### 2. **Missing Wizard Type Validation** ⚠️ HIGH
**Location**: `creative-studio-ui/src/contexts/WizardContext.tsx`

**Problem**: The wizard context only supports 'world' and 'character' types, but the codebase has 8 different wizard types (dialogue-writer, scene-generator, storyboard-creator, style-transfer, world-building, character, sequence-plan, shot).

**Impact**:
- New wizards cannot use the context
- Type errors when launching non-supported wizards
- Inconsistent wizard behavior

**Fix**:
```typescript
// Update WizardContext.tsx
export type WizardType = 
  | 'world' 
  | 'character'
  | 'dialogue-writer'
  | 'scene-generator'
  | 'storyboard-creator'
  | 'style-transfer'
  | 'sequence-plan'
  | 'shot';

interface WizardProviderProps<T> {
  children: ReactNode;
  wizardType: WizardType; // Updated type
  totalSteps: number;
  // ... rest of props
}
```

---

### 3. **Validation Step Mismatch** ⚠️ HIGH
**Location**: `creative-studio-ui/src/stores/wizard/wizardStore.ts`

**Problem**: The `validateStep` function has hardcoded validation for steps 1-8, but different wizards have different numbers of steps:
- Character Wizard: 6 steps
- World Wizard: 5 steps
- Sequence Plan Wizard: 6 steps
- Shot Wizard: varies

**Impact**:
- Validation fails for wizards with fewer steps
- Incorrect error messages
- Cannot proceed past certain steps

**Fix**:
```typescript
// Create wizard-specific validation
const WIZARD_VALIDATORS: Record<string, (step: number, state: any) => ValidationError[]> = {
  'character': validateCharacterStep,
  'world': validateWorldStep,
  'sequence-plan': validateSequencePlanStep,
  // ... etc
};

validateStep: async (step: number): Promise<ValidationResult> => {
  const state = get();
  const validator = WIZARD_VALIDATORS[state.wizardType];
  
  if (!validator) {
    console.warn(`No validator found for wizard type: ${state.wizardType}`);
    return { isValid: true, errors: [], warnings: [] };
  }
  
  const errors = validator(step, state);
  // ... rest of validation logic
}
```

---

### 4. **Navigation Race Condition** ⚠️ MEDIUM
**Location**: `creative-studio-ui/src/hooks/useWizardNavigation.ts`

**Problem**: The `nextStep` function validates asynchronously but doesn't prevent multiple rapid clicks, leading to race conditions where users can skip steps.

**Impact**:
- Users can bypass validation by clicking quickly
- Multiple API calls triggered
- Inconsistent wizard state

**Fix**:
```typescript
// Add loading state to prevent race conditions
const [isNavigating, setIsNavigating] = useState(false);

const nextStep = useCallback(async () => {
  if (isNavigating) return false; // Prevent concurrent navigation
  
  setIsNavigating(true);
  try {
    if (validateBeforeNext) {
      const isValid = await validateStep(currentStep);
      if (!isValid) {
        return false;
      }
    }

    contextNextStep();
    
    if (onStepChange) {
      onStepChange(currentStep + 1);
    }

    return true;
  } finally {
    setIsNavigating(false);
  }
}, [currentStep, validateBeforeNext, validateStep, contextNextStep, onStepChange, isNavigating]);
```

---

### 5. **Auto-Save Memory Leak** ⚠️ MEDIUM
**Location**: `creative-studio-ui/src/contexts/WizardContext.tsx`

**Problem**: The auto-save timeout is stored in state but not properly cleaned up when the component unmounts, causing memory leaks.

**Impact**:
- Memory leaks in long-running sessions
- Potential crashes on slow devices
- Unnecessary localStorage writes after unmount

**Fix**:
```typescript
// Add cleanup effect
useEffect(() => {
  return () => {
    // Cleanup timeout on unmount
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }
  };
}, [autoSaveTimeout]);
```

---

### 6. **Missing Error Boundaries** ⚠️ HIGH
**Location**: Multiple wizard components

**Problem**: Wizard components don't have error boundaries, so any runtime error crashes the entire wizard instead of showing a recovery UI.

**Impact**:
- Complete wizard failure on any error
- Loss of user data
- Poor user experience

**Fix**:
```typescript
// Create WizardErrorBoundary.tsx
import { Component, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { emergencyExportWizardState } from '@/utils/wizardStorage';

interface Props {
  children: ReactNode;
  wizardType: WizardType;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class WizardErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Wizard error:', error, errorInfo);
    // Emergency export wizard data
    emergencyExportWizardState(this.props.wizardType, error);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8">
          <AlertCircle className="h-16 w-16 text-destructive mb-4" />
          <h2 className="text-2xl font-bold mb-2">Wizard Error</h2>
          <p className="text-muted-foreground mb-4 text-center max-w-md">
            An error occurred in the wizard. Your data has been automatically exported.
          </p>
          <div className="flex gap-2">
            <Button onClick={this.handleReset}>Try Again</Button>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Reload Page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

---

### 7. **Incomplete Wizard Integration** ⚠️ CRITICAL
**Location**: `creative-studio-ui/src/components/wizard/GenericWizardModal.tsx`

**Problem**: The `GenericWizardModal` doesn't properly integrate with the wizard store. It uses local state instead of the centralized wizard store, causing state inconsistencies.

**Impact**:
- Wizard state not persisted
- Auto-save doesn't work
- Cannot resume wizards
- Duplicate state management

**Fix**:
```typescript
// Update GenericWizardModal to use wizard store
import { useWizardStore } from '@/stores/wizard/wizardStore';

export function GenericWizardModal({
  isOpen,
  wizardType,
  onClose,
  onComplete,
}: GenericWizardModalProps): React.ReactElement {
  const {
    currentStep,
    formData,
    updateStepData,
    validateStep,
    reset,
  } = useWizardStore();

  // Use store state instead of local state
  const handleFormSubmit = useCallback(async (formData: any) => {
    const validation = await validateStep(currentStep);
    if (!validation.isValid) {
      return;
    }
    
    await onComplete?.(formData);
    reset(); // Reset wizard store
    onClose();
  }, [currentStep, validateStep, onComplete, onClose, reset]);

  // ... rest of component
}
```

---

### 8. **Missing Wizard Type in Store** ⚠️ HIGH
**Location**: `creative-studio-ui/src/stores/wizard/wizardStore.ts`

**Problem**: The wizard store doesn't track which wizard type is currently active, making it impossible to have multiple wizards open or to properly restore state.

**Impact**:
- Cannot have multiple wizards in progress
- State restoration picks wrong wizard
- Validation uses wrong rules

**Fix**:
```typescript
// Add wizardType to store state
interface WizardState {
  // Add this field
  wizardType: WizardType | null;
  
  // ... existing fields
  
  // Add action to set wizard type
  setWizardType: (type: WizardType) => void;
}

// In store implementation
setWizardType: (type: WizardType) => {
  set({ wizardType: type }, false, 'setWizardType');
},
```

---

### 9. **Form Validation Not Triggered** ⚠️ MEDIUM
**Location**: `creative-studio-ui/src/components/wizard/forms/*`

**Problem**: Form components don't call `onValidationChange` consistently, so the parent modal doesn't know when forms become valid/invalid.

**Impact**:
- Submit button enabled when form is invalid
- Users can submit incomplete data
- Validation errors not displayed

**Fix**:
```typescript
// In each form component, add validation effect
useEffect(() => {
  const isValid = validateForm(formData);
  onValidationChange?.(isValid);
}, [formData, onValidationChange]);

// Example for DialogueWriterForm
const validateForm = (data: DialogueFormData): boolean => {
  return !!(
    data.sceneContext?.trim() &&
    data.characters?.length > 0 &&
    data.emotionalTone?.trim()
  );
};
```

---

### 10. **Wizard Modal Accessibility Issues** ⚠️ MEDIUM
**Location**: `creative-studio-ui/src/components/wizard/WizardDialog.tsx`

**Problem**: 
- Missing focus trap in modal
- No keyboard escape handling
- Loading state not announced to screen readers
- Progress not accessible

**Impact**:
- Poor accessibility for keyboard users
- Screen reader users miss important updates
- WCAG 2.1 compliance failures

**Fix**:
```typescript
// Add focus trap and keyboard handling
import { useEffect, useRef } from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';

export function WizardDialog({ isOpen, onClose, ...props }: WizardDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  
  // Focus trap
  useFocusTrap(dialogRef, isOpen);
  
  // Keyboard handling
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);
  
  // Add ARIA live region for progress
  return (
    <div 
      ref={dialogRef}
      className="wizard-dialog-overlay" 
      role="dialog"
      aria-modal="true"
      aria-labelledby="wizard-title"
      aria-describedby="wizard-description"
    >
      <div 
        className="wizard-dialog" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Add live region for screen readers */}
        <div 
          role="status" 
          aria-live="polite" 
          aria-atomic="true"
          className="sr-only"
        >
          {generationState.isGenerating && 
            `Generating content: ${generationState.progress}% complete. ${generationState.stage}`
          }
        </div>
        
        {/* Rest of dialog content */}
      </div>
    </div>
  );
}
```

---

### 11. **Wizard Step Data Type Safety** ⚠️ LOW
**Location**: `creative-studio-ui/src/stores/wizard/wizardStore.ts`

**Problem**: The `updateStepData` function uses a switch statement with type assertions, which bypasses TypeScript's type checking and can lead to runtime errors.

**Impact**:
- Type safety compromised
- Potential runtime errors
- Harder to maintain

**Fix**:
```typescript
// Create type-safe step data updaters
type StepDataUpdater<T> = (current: T | null, update: Partial<T>) => T;

const stepDataUpdaters: Record<number, StepDataUpdater<any>> = {
  1: (current, update) => ({ ...current, ...update } as ProjectTypeData),
  2: (current, update) => ({ ...current, ...update } as GenreStyleData),
  3: (current, update) => ({ ...current, ...update } as WorldBuildingData),
  4: (current, update) => update as CharacterProfile[],
  5: (current, update) => ({ ...current, ...update } as StoryStructureData),
  6: (current, update) => ({ ...current, ...update } as ScriptData),
  7: (current, update) => update as SceneBreakdown[],
  8: (current, update) => update as ShotPlan[],
};

updateStepData: (step: number, data: Partial<WizardStepData>) => {
  set((state) => {
    const updater = stepDataUpdaters[step];
    if (!updater) {
      console.warn(`No updater for step ${step}`);
      return state;
    }
    
    const currentData = getStepData(state, step);
    const newData = updater(currentData, data);
    
    return setStepData(state, step, newData);
  }, false, 'updateStepData');
},
```

---

### 12. **Missing Wizard Completion Callback** ⚠️ HIGH
**Location**: `creative-studio-ui/src/contexts/WizardContext.tsx`

**Problem**: The `WizardProvider` has an `onSubmit` prop but doesn't call the `onComplete` callback after successful submission, breaking the integration flow.

**Impact**:
- Parent components don't know when wizard completes
- UI doesn't update after wizard completion
- Modal doesn't close automatically

**Fix**:
```typescript
// In WizardContext.tsx submitWizard function
const submitWizard = useCallback(async () => {
  setIsSubmitting(true);
  
  try {
    // ... validation logic
    
    // Submit the form
    await onSubmit(formData as T);
    
    // Call onComplete callback
    if (onComplete) {
      onComplete(formData as T);
    }
    
    // Clear saved progress on successful submission
    localStorage.removeItem(`wizard-${wizardType}`);
    
    // Reset wizard state
    setFormData(initialData);
    setCurrentStep(1);
    setIsDirty(false);
    setValidationErrors({});
  } catch (error) {
    console.error('Wizard submission error:', error);
    throw error;
  } finally {
    setIsSubmitting(false);
  }
}, [formData, totalSteps, validateStep, onSubmit, onComplete, wizardType, initialData]);
```

---

## Priority Matrix

| Issue | Priority | Impact | Effort | Status |
|-------|----------|--------|--------|--------|
| #1 - Store Type Inconsistency | CRITICAL | High | Low | 🔴 Not Fixed |
| #2 - Missing Wizard Type Validation | HIGH | High | Low | 🔴 Not Fixed |
| #3 - Validation Step Mismatch | HIGH | High | Medium | 🔴 Not Fixed |
| #4 - Navigation Race Condition | MEDIUM | Medium | Low | 🔴 Not Fixed |
| #5 - Auto-Save Memory Leak | MEDIUM | Medium | Low | 🔴 Not Fixed |
| #6 - Missing Error Boundaries | HIGH | High | Medium | 🔴 Not Fixed |
| #7 - Incomplete Wizard Integration | CRITICAL | High | High | 🔴 Not Fixed |
| #8 - Missing Wizard Type in Store | HIGH | High | Low | 🔴 Not Fixed |
| #9 - Form Validation Not Triggered | MEDIUM | Medium | Medium | 🔴 Not Fixed |
| #10 - Wizard Modal Accessibility | MEDIUM | Medium | Medium | 🔴 Not Fixed |
| #11 - Wizard Step Data Type Safety | LOW | Low | Medium | 🔴 Not Fixed |
| #12 - Missing Completion Callback | HIGH | High | Low | 🔴 Not Fixed |

## Recommended Fix Order

1. **Phase 1 - Critical Fixes** (Day 1)
   - Issue #1: Store Type Inconsistency
   - Issue #7: Incomplete Wizard Integration
   - Issue #6: Missing Error Boundaries

2. **Phase 2 - High Priority** (Day 2)
   - Issue #2: Missing Wizard Type Validation
   - Issue #3: Validation Step Mismatch
   - Issue #8: Missing Wizard Type in Store
   - Issue #12: Missing Completion Callback

3. **Phase 3 - Medium Priority** (Day 3)
   - Issue #4: Navigation Race Condition
   - Issue #5: Auto-Save Memory Leak
   - Issue #9: Form Validation Not Triggered
   - Issue #10: Wizard Modal Accessibility

4. **Phase 4 - Low Priority** (Day 4)
   - Issue #11: Wizard Step Data Type Safety
   - Testing and validation
   - Documentation updates

## Testing Strategy

After implementing fixes, test the following scenarios:

### Unit Tests
- [ ] Wizard store state persistence
- [ ] Wizard navigation with validation
- [ ] Form validation triggers
- [ ] Error boundary catches errors
- [ ] Auto-save functionality

### Integration Tests
- [ ] Complete wizard flow (all 8 wizard types)
- [ ] Wizard state restoration after page reload
- [ ] Multiple wizards in sequence
- [ ] Error recovery and data export

### Accessibility Tests
- [ ] Keyboard navigation
- [ ] Screen reader announcements
- [ ] Focus management
- [ ] ARIA attributes

### Performance Tests
- [ ] Memory leak detection
- [ ] Auto-save performance
- [ ] Large form data handling

## Conclusion

The wizard functionality has significant issues that need to be addressed systematically. The most critical issues are:

1. **State management inconsistencies** causing data loss
2. **Missing integration** between components
3. **Lack of error handling** leading to crashes

By following the recommended fix order and testing strategy, these issues can be resolved in approximately 4 days of focused development work.

## Next Steps

1. Review and approve this analysis
2. Create GitHub issues for each problem
3. Assign developers to fix phases
4. Implement fixes in order
5. Run comprehensive test suite
6. Deploy and monitor

---

**Document Version**: 1.0  
**Date**: January 19, 2026  
**Author**: Kiro AI Assistant
