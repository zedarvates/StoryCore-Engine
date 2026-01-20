# Wizards Navigation Fix - Final Resolution

## Problem Summary

The wizard buttons in the Project Dashboard were not opening their respective wizards due to a type mismatch between:
1. Wizard IDs used in `wizardDefinitions` ('world-building', 'character-creation')
2. Wizard types used in `WizardContext` ('world', 'character')
3. Wizard types used in `useAppStore` (was using 'world-building', 'character-creation')

Additionally, the Content Security Policy (CSP) was blocking connections to `127.0.0.1:8000` (only allowing `localhost:*`).

## Root Cause

The application has two types of wizards:

### 1. Multi-Step Wizards (Complex)
- **WorldWizard** - 5-step wizard for world building
- **CharacterWizard** - 6-step wizard for character creation
- Use `WizardProvider` with `wizardType` prop
- Opened via dedicated state: `showWorldWizard`, `showCharacterWizard`
- Rendered in separate modals: `WorldWizardModal`, `CharacterWizardModal`

### 2. Simple Form Wizards
- **DialogueWriter**, **SceneGenerator**, **StoryboardCreator**, **StyleTransfer**
- Single-page forms
- Opened via `openWizard(type)` function
- Rendered in `GenericWizardModal`

The confusion arose because:
- `WizardContext.tsx` defined types like `'world'`, `'character'` for use with `WizardProvider`
- `useAppStore.ts` was trying to use `'world-building'`, `'character-creation'` for all wizards
- `ProjectWorkspace.tsx` was calling `openWizard()` for multi-step wizards instead of using their dedicated state

## Solution Implemented

### 1. Fixed Content Security Policy
**File**: `creative-studio-ui/index.html`

Added `http://127.0.0.1:*` and `ws://127.0.0.1:*` to CSP `connect-src` directive:
```html
<meta
  http-equiv="Content-Security-Policy"
  content="default-src 'self'; connect-src 'self' http://localhost:* ws://localhost:* http://127.0.0.1:* ws://127.0.0.1:* https://api.openai.com https://api.anthropic.com; ..."
/>
```

### 2. Separated Wizard Type Systems
**File**: `creative-studio-ui/src/stores/useAppStore.ts`

Redefined `WizardType` to only include simple form wizards:
```typescript
export type WizardType =
  | 'dialogue-writer'
  | 'scene-generator'
  | 'storyboard-creator'
  | 'style-transfer'
  | 'sequence-plan'
  | 'shot';
```

Removed `showWorld` and `showCharacter` from generic wizard state (they use dedicated state).

### 3. Updated Wizard Launcher Logic
**File**: `creative-studio-ui/src/components/workspace/ProjectWorkspace.tsx`

Changed `handleLaunchWizard` to route wizards correctly:
```typescript
switch (wizardId) {
  case 'world-building':
    setShowWorldWizard(true);  // Use dedicated modal
    break;
  case 'character-creation':
    setShowCharacterWizard(true);  // Use dedicated modal
    break;
  case 'scene-generator':
    openWizard('scene-generator');  // Use GenericWizardModal
    break;
  // ... etc
}
```

### 4. Cleaned Up GenericWizardModal
**File**: `creative-studio-ui/src/components/wizard/GenericWizardModal.tsx`

- Removed `WorldBuildingForm` import
- Removed `'world-building'` from `WIZARD_CONFIG`
- Removed `case 'world-building'` from form renderer
- Added placeholder entries for `'sequence-plan'` and `'shot'` (handled by separate modals)

### 5. Updated App.tsx
**File**: `creative-studio-ui/src/App.tsx`

- Removed unused `showWorld` and `showCharacter` from store destructuring
- Removed `case 'world'` from `handleWizardComplete` (not a valid generic wizard type)

## Architecture Clarification

```
Wizard System Architecture
├── Multi-Step Wizards (Complex)
│   ├── WorldWizard (5 steps)
│   │   ├── State: showWorldWizard
│   │   ├── Modal: WorldWizardModal
│   │   └── Provider: WizardProvider<World> with wizardType="world"
│   │
│   ├── CharacterWizard (6 steps)
│   │   ├── State: showCharacterWizard
│   │   ├── Modal: CharacterWizardModal
│   │   └── Provider: WizardProvider<Character> with wizardType="character"
│   │
│   ├── SequencePlanWizard
│   │   ├── State: showSequencePlanWizard
│   │   └── Modal: SequencePlanWizardModal
│   │
│   └── ShotWizard
│       ├── State: showShotWizard
│       └── Modal: ShotWizardModal
│
└── Simple Form Wizards
    ├── DialogueWriter
    ├── SceneGenerator
    ├── StoryboardCreator
    └── StyleTransfer
    │
    ├── State: activeWizardType (WizardType)
    ├── Modal: GenericWizardModal
    └── Opened via: openWizard(type)
```

## Testing Checklist

- [x] CSP allows connections to `127.0.0.1:8000`
- [x] World Building button opens WorldWizardModal
- [x] Character Creation button opens CharacterWizardModal
- [x] Scene Generator button opens GenericWizardModal with SceneGeneratorForm
- [x] Storyboard Creator button opens GenericWizardModal with StoryboardCreatorForm
- [x] Dialogue Writer button opens GenericWizardModal with DialogueWriterForm
- [x] Style Transfer button opens GenericWizardModal with StyleTransferForm
- [x] No TypeScript errors in wizard-related files
- [x] No console errors when clicking wizard buttons

## Files Modified

1. `creative-studio-ui/index.html` - CSP update
2. `creative-studio-ui/src/stores/useAppStore.ts` - WizardType redefinition
3. `creative-studio-ui/src/components/workspace/ProjectWorkspace.tsx` - Wizard routing logic
4. `creative-studio-ui/src/components/wizard/GenericWizardModal.tsx` - Removed world-building
5. `creative-studio-ui/src/App.tsx` - Removed unused state and case

## Expected Behavior

1. **ComfyUI Connection**: Console shows successful connection to `http://127.0.0.1:8000` (no CSP violations)
2. **World Building**: Opens 5-step wizard modal with progress indicator
3. **Character Creation**: Opens 6-step wizard modal with progress indicator
4. **Other Wizards**: Open single-page forms in GenericWizardModal
5. **No Errors**: No WizardProvider errors, no type mismatches

## Notes

- The CSP error for `127.0.0.1` is now resolved
- Multi-step wizards (World, Character) are completely separate from simple form wizards
- `WizardContext.tsx` types ('world', 'character') are only used internally by `WizardProvider`
- `useAppStore.ts` types are only for simple form wizards in `GenericWizardModal`
- Wizard IDs in `wizardDefinitions` ('world-building', 'character-creation') are mapped to the correct opener in `ProjectWorkspace.tsx`

---

**Status**: ✅ Complete - All wizard navigation issues resolved
**Date**: 2026-01-20
