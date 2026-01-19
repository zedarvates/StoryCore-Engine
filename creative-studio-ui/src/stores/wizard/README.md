# Wizard Store

The Wizard Store manages the complete state for the Project Setup Wizard using Zustand.

## Overview

The wizard store provides centralized state management for the 8-step wizard workflow:
1. Project Type Selection
2. Genre & Style Definition
3. World Building
4. Character Creation
5. Story Structure
6. Dialogue & Script
7. Scene Breakdown
8. Shot Planning

## Usage

### Basic Usage

```typescript
import { useWizardStore } from '@/stores/wizard/wizardStore';

function MyComponent() {
  const currentStep = useWizardStore((state) => state.currentStep);
  const setCurrentStep = useWizardStore((state) => state.setCurrentStep);
  
  return (
    <div>
      <p>Current Step: {currentStep}</p>
      <button onClick={() => setCurrentStep(currentStep + 1)}>
        Next
      </button>
    </div>
  );
}
```

### Using Selector Hooks

For better performance, use the provided selector hooks:

```typescript
import { 
  useCurrentStep, 
  useProjectType, 
  useCanProceed 
} from '@/stores/wizard/wizardStore';

function NavigationButtons() {
  const currentStep = useCurrentStep();
  const canProceed = useCanProceed();
  
  return (
    <button disabled={!canProceed}>
      Next
    </button>
  );
}
```

## State Structure

### Navigation State
- `currentStep: number` - Current wizard step (1-8)
- `completedSteps: Set<number>` - Set of completed step numbers
- `isReviewMode: boolean` - Whether in review mode

### Project Data
- `projectType: ProjectTypeData | null` - Step 1 data
- `genreStyle: GenreStyleData | null` - Step 2 data
- `worldBuilding: WorldBuildingData | null` - Step 3 data
- `characters: CharacterProfile[]` - Step 4 data
- `storyStructure: StoryStructureData | null` - Step 5 data
- `script: ScriptData | null` - Step 6 data
- `scenes: SceneBreakdown[]` - Step 7 data
- `shots: ShotPlan[]` - Step 8 data

### Metadata
- `draftId: string | null` - Draft identifier for persistence
- `lastSaved: Date | null` - Last save timestamp
- `validationErrors: Map<number, ValidationError[]>` - Validation errors per step

## Actions

### Navigation Actions

#### `setCurrentStep(step: number)`
Navigate to a specific step.

```typescript
const { setCurrentStep } = useWizardStore.getState();
setCurrentStep(3);
```

#### `markStepComplete(step: number)`
Mark a step as complete.

```typescript
const { markStepComplete } = useWizardStore.getState();
markStepComplete(1);
```

### Data Actions

#### `updateStepData(step: number, data: Partial<WizardStepData>)`
Update data for a specific step.

```typescript
const { updateStepData } = useWizardStore.getState();

// Update step 1 (Project Type)
updateStepData(1, {
  type: 'court-metrage',
  durationMinutes: 15,
});

// Update step 4 (Characters)
updateStepData(4, [
  {
    id: '1',
    name: 'John Doe',
    role: 'protagonist',
    // ... other character fields
  }
]);
```

### Validation Actions

#### `validateStep(step: number): Promise<ValidationResult>`
Validate a specific step and update validation errors.

```typescript
const { validateStep } = useWizardStore.getState();

const result = await validateStep(1);
if (result.isValid) {
  console.log('Step is valid');
} else {
  console.log('Errors:', result.errors);
  console.log('Warnings:', result.warnings);
}
```

#### `canProceed(): boolean`
Check if the user can proceed from the current step.

```typescript
const { canProceed } = useWizardStore.getState();

if (canProceed()) {
  // Enable Next button
}
```

### Utility Actions

#### `reset()`
Reset the wizard to initial state.

```typescript
const { reset } = useWizardStore.getState();
reset();
```

## Validation

The store includes basic validation logic for each step:

- **Step 1**: Requires project type and positive duration
- **Step 2**: Requires at least one genre
- **Step 3**: Requires at least one location
- **Step 4**: Requires at least one character
- **Step 5**: Requires premise and logline
- **Step 6**: Requires script data
- **Step 7**: Requires at least one scene with location and characters
- **Step 8**: Requires at least one shot per scene

More comprehensive validation will be added when the ValidationEngine service is implemented (Task 3).

## Persistence

The store uses Zustand's persist middleware to automatically save state to localStorage. The state is restored when the application reloads.

Custom serialization handles:
- `Set<number>` for completedSteps
- `Map<number, ValidationError[]>` for validationErrors

## Selector Hooks

The following selector hooks are provided for optimized component rendering:

- `useCurrentStep()` - Current step number
- `useCompletedSteps()` - Set of completed steps
- `useIsReviewMode()` - Review mode flag
- `useProjectType()` - Project type data
- `useGenreStyle()` - Genre and style data
- `useWorldBuilding()` - World building data
- `useCharacters()` - Character profiles
- `useStoryStructure()` - Story structure data
- `useScript()` - Script data
- `useScenes()` - Scene breakdown
- `useShots()` - Shot planning
- `useValidationErrors()` - Validation errors map
- `useCanProceed()` - Can proceed flag

## DevTools

The store is configured with Zustand DevTools for debugging. Use the Redux DevTools browser extension to inspect state changes.

## Testing

See `__tests__/wizardStore.test.ts` for comprehensive unit tests covering:
- Navigation state management
- Project data updates
- Validation logic
- State persistence
- Reset functionality

## Future Enhancements

- Integration with ValidationEngine service (Task 3)
- Integration with DraftPersistence service (Task 4)
- Integration with TemplateSystem service (Task 5)
- Cross-step consistency validation
- Undo/redo support
