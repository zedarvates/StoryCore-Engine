# Wizard System Architecture

## Overview

The wizard system in StoryCore-Engine is designed to provide a flexible, extensible framework for creating multi-step and single-form wizards. The system ensures mutual exclusion (only one wizard open at a time) and provides consistent UI/UX across all wizards.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Application (App.tsx)                     │
│  - Renders all wizard modals at app level                   │
│  - Provides global state management via useAppStore         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  useAppStore (Zustand)                       │
│  - Manages wizard state (open/closed)                       │
│  - Provides closeActiveWizard() for mutual exclusion        │
│  - Stores wizard-specific data                              │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              Wizard Launching Components                     │
│  - ProjectDashboardNew.handleLaunchWizard()                 │
│  - ProjectWorkspace.handleLaunchWizard()                    │
│  - WizardLauncher component                                 │
│  - Direct button handlers                                   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Wizard Modals                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Multi-Step Wizards (Dedicated Modals)               │   │
│  │ - ProjectSetupWizardModal                           │   │
│  │ - WorldWizardModal                                  │   │
│  │ - CharacterWizardModal                              │   │
│  │ - StorytellerWizardModal                            │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Generic Wizards (GenericWizardModal)                │   │
│  │ - Scene Generator                                   │   │
│  │ - Storyboard Creator                                │   │
│  │ - Dialogue Writer                                   │   │
│  │ - Style Transfer                                    │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Unimplemented Wizards (Warning Message)             │   │
│  │ - Shot Planning                                     │   │
│  │ - SonicCrafter                                       │   │
│  │ - EditForge                                          │   │
│  │ - ViralForge                                         │   │
│  │ - PanelForge                                         │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Wizard Types

### 1. Multi-Step Wizards (Dedicated Modals)

**Characteristics:**
- Have their own dedicated modal component
- Can have multiple steps/pages
- Manage their own internal state
- Render custom UI specific to the wizard

**Examples:**
- ProjectSetupWizardModal
- WorldWizardModal
- CharacterWizardModal
- StorytellerWizardModal

**Implementation Pattern:**
```typescript
export function MyWizardModal() {
  const showMyWizard = useAppStore((state) => state.showMyWizard);
  const setShowMyWizard = useAppStore((state) => state.setShowMyWizard);

  if (!showMyWizard) {
    return null;
  }

  const handleComplete = (data: MyWizardData) => {
    // Process wizard data
    setShowMyWizard(false);
  };

  return (
    <div className="wizard-modal-overlay">
      <div className="wizard-modal-container">
        {/* Wizard content */}
      </div>
    </div>
  );
}
```

### 2. Generic Wizards (GenericWizardModal)

**Characteristics:**
- Use a shared GenericWizardModal component
- Render different forms based on wizard type
- Managed by activeWizardType state
- Simpler implementation for single-form wizards

**Examples:**
- Scene Generator
- Storyboard Creator
- Dialogue Writer
- Style Transfer

**Implementation Pattern:**
```typescript
// In handleLaunchWizard:
case 'my-generic-wizard':
  openWizard('my-generic-wizard');
  break;

// In GenericWizardModal:
const WIZARD_CONFIG: Record<WizardType, WizardConfig> = {
  'my-generic-wizard': {
    title: 'My Generic Wizard',
    description: 'Description of my wizard',
    component: MyGenericWizardForm,
    submitLabel: 'Generate',
  },
};
```

### 3. Unimplemented Wizards

**Characteristics:**
- Show a warning message to the user
- Don't open any modal
- Placeholder for future implementation

**Implementation Pattern:**
```typescript
case 'my-unimplemented-wizard':
  logger.warn('[ProjectDashboard] Wizard not yet implemented:', { wizardId });
  showWarning(`The my-unimplemented-wizard wizard is not yet implemented. Coming soon!`);
  break;
```

## State Management

### useAppStore Wizard State

```typescript
// Multi-step wizard states
showWorldWizard: boolean;
showCharacterWizard: boolean;
showProjectSetupWizard: boolean;
showStorytellerWizard: boolean;

// Generic wizard states
showDialogueWriter: boolean;
showSceneGenerator: boolean;
showStoryboardCreator: boolean;
showStyleTransfer: boolean;
activeWizardType: WizardType | null;

// Actions
setShowWorldWizard: (show: boolean) => void;
setShowCharacterWizard: (show: boolean) => void;
setShowProjectSetupWizard: (show: boolean) => void;
setShowStorytellerWizard: (show: boolean) => void;
setShowDialogueWriter: (show: boolean) => void;
setShowSceneGenerator: (show: boolean) => void;
setShowStoryboardCreator: (show: boolean) => void;
setShowStyleTransfer: (show: boolean) => void;
openWizard: (wizardType: WizardType) => void;
closeActiveWizard: () => void;
```

### Mutual Exclusion Implementation

The `closeActiveWizard()` function closes all wizards at once:

```typescript
closeActiveWizard: () =>
  set({
    showWorldWizard: false,
    showCharacterWizard: false,
    showProjectSetupWizard: false,
    showStorytellerWizard: false,
    showDialogueWriter: false,
    showSceneGenerator: false,
    showStoryboardCreator: false,
    showStyleTransfer: false,
    activeWizardType: null,
  })
```

The `openWizard()` function closes all wizards before opening a new one:

```typescript
openWizard: (wizardType) =>
  set({
    // Close ALL wizards first
    showWorldWizard: false,
    showCharacterWizard: false,
    showProjectSetupWizard: false,
    showStorytellerWizard: false,
    showDialogueWriter: false,
    showSceneGenerator: false,
    showStoryboardCreator: false,
    showStyleTransfer: false,
    // Open the requested wizard
    activeWizardType: wizardType,
    ...(wizardType === 'dialogue-writer' && { showDialogueWriter: true }),
    // ... etc for other wizard types
  })
```

## Wizard Launching Flow

### Step 1: User Clicks Wizard Button
```typescript
// In WizardLauncher component
<button onClick={() => onLaunchWizard(wizard.id)}>
  {wizard.name}
</button>
```

### Step 2: handleLaunchWizard Called
```typescript
const handleLaunchWizard = (wizardId: string) => {
  // Close all wizards first
  const closeActiveWizard = useAppStore.getState().closeActiveWizard;
  closeActiveWizard();
  
  // Open the requested wizard
  switch (wizardId) {
    case 'my-wizard':
      setShowMyWizard(true);
      break;
  }
};
```

### Step 3: Wizard Modal Renders
```typescript
// In App.tsx
<MyWizardModal />
```

### Step 4: Wizard Modal Checks State
```typescript
export function MyWizardModal() {
  const showMyWizard = useAppStore((state) => state.showMyWizard);
  
  if (!showMyWizard) {
    return null; // Don't render if not open
  }
  
  // Render wizard content
}
```

## Adding a New Wizard

### Option 1: Add a Multi-Step Wizard

1. **Create wizard definition** in `wizardDefinitions.ts`:
```typescript
{
  id: 'my-wizard',
  name: 'My Wizard',
  description: 'Description of my wizard',
  icon: '🎯',
  enabled: true,
  requiredConfig: ['llm'],
  requiresCharacters: false,
  requiresShots: false,
}
```

2. **Add state to useAppStore** in `useAppStore.ts`:
```typescript
showMyWizard: boolean;
setShowMyWizard: (show: boolean) => void;
```

3. **Create wizard modal** component:
```typescript
export function MyWizardModal() {
  const showMyWizard = useAppStore((state) => state.showMyWizard);
  const setShowMyWizard = useAppStore((state) => state.setShowMyWizard);

  if (!showMyWizard) {
    return null;
  }

  return (
    <div className="wizard-modal-overlay">
      <div className="wizard-modal-container">
        {/* Wizard content */}
      </div>
    </div>
  );
}
```

4. **Render modal in App.tsx**:
```typescript
<MyWizardModal />
```

5. **Add launch handler** in `handleLaunchWizard`:
```typescript
case 'my-wizard':
  setShowMyWizard(true);
  break;
```

### Option 2: Add a Generic Wizard

1. **Create wizard definition** in `wizardDefinitions.ts`:
```typescript
{
  id: 'my-generic-wizard',
  name: 'My Generic Wizard',
  description: 'Description of my wizard',
  icon: '🎯',
  enabled: true,
  requiredConfig: [],
  requiresCharacters: false,
  requiresShots: false,
}
```

2. **Create wizard form component**:
```typescript
export function MyGenericWizardForm({ onSubmit, onCancel }) {
  // Form implementation
}
```

3. **Add to GenericWizardModal** configuration:
```typescript
const WIZARD_CONFIG: Record<WizardType, WizardConfig> = {
  'my-generic-wizard': {
    title: 'My Generic Wizard',
    description: 'Description',
    component: MyGenericWizardForm,
    submitLabel: 'Generate',
  },
};
```

4. **Add launch handler** in `handleLaunchWizard`:
```typescript
case 'my-generic-wizard':
  openWizard('my-generic-wizard');
  break;
```

### Option 3: Add an Unimplemented Wizard (Placeholder)

1. **Create wizard definition** in `wizardDefinitions.ts`:
```typescript
{
  id: 'my-future-wizard',
  name: 'My Future Wizard',
  description: 'Coming soon!',
  icon: '🚀',
  enabled: true,
  requiredConfig: [],
  requiresCharacters: false,
  requiresShots: false,
}
```

2. **Add launch handler** in `handleLaunchWizard`:
```typescript
case 'my-future-wizard':
  logger.warn('[ProjectDashboard] Wizard not yet implemented:', { wizardId });
  showWarning(`The my-future-wizard wizard is not yet implemented. Coming soon!`);
  break;
```

## Best Practices

### 1. Always Close All Wizards First
```typescript
// ✅ CORRECT
const closeActiveWizard = useAppStore.getState().closeActiveWizard;
closeActiveWizard();
setShowMyWizard(true);

// ❌ WRONG
setShowMyWizard(true); // Other wizards might still be open
```

### 2. Use Consistent Naming
- Wizard IDs: kebab-case (e.g., `my-wizard`)
- State variables: camelCase (e.g., `showMyWizard`)
- Functions: camelCase (e.g., `handleLaunchWizard`)

### 3. Add Logging
```typescript
logger.info('[ProjectDashboard] Launching wizard:', { wizardId });
```

### 4. Handle Errors Gracefully
```typescript
try {
  // Wizard logic
} catch (error) {
  logger.error('Wizard error:', error);
  showError('Wizard failed', error.message);
}
```

### 5. Validate User Input
```typescript
const handleComplete = (data: WizardData) => {
  if (!data.name || data.name.trim() === '') {
    showError('Validation Error', 'Name is required');
    return;
  }
  // Process data
};
```

## Troubleshooting

### Issue: Wrong Wizard Opens
**Solution:** Ensure `closeActiveWizard()` is called before opening new wizard

### Issue: Multiple Wizards Open
**Solution:** Check that all wizard launching code calls `closeActiveWizard()`

### Issue: Wizard Doesn't Close
**Solution:** Verify that the modal component checks the state correctly:
```typescript
if (!showMyWizard) {
  return null;
}
```

### Issue: Wizard State Not Updating
**Solution:** Ensure state is properly defined in useAppStore and actions are called correctly

## Related Files

- `creative-studio-ui/src/stores/useAppStore.ts` - Wizard state management
- `creative-studio-ui/src/App.tsx` - Wizard modal rendering
- `creative-studio-ui/src/data/wizardDefinitions.ts` - Wizard definitions
- `creative-studio-ui/src/components/workspace/ProjectDashboardNew.tsx` - Wizard launching
- `creative-studio-ui/src/components/wizards/` - Wizard components
- `creative-studio-ui/src/components/wizard/` - Wizard modals

## Future Improvements

1. **Wizard History**: Track wizard usage and provide quick access to recently used wizards
2. **Wizard Presets**: Save and load wizard configurations
3. **Wizard Chaining**: Allow wizards to launch other wizards automatically
4. **Wizard Analytics**: Track wizard completion rates and user behavior
5. **Wizard Customization**: Allow users to customize wizard appearance and behavior
