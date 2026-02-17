# Genre/Style (Visual) Persistence Fix - Plan

## Problem Summary
When users select genre, tone, and visual style in different wizards (Project Setup, World Builder, Storyteller), they lose their selections when reopening the wizards. The data should be saved to the project file (.json) and pre-loaded when the wizards open.

## Additional Requirement
The user also wants "Visual Style" to include specific eras like "anime années 80", "anime années 90", "anime années 2000", etc.

## Status: COMPLETED ✅

## Changes Made

### 1. ProjectSetupWizardModal.tsx
- Modified to pass `initialData` with `genre`, `tone`, `targetAudience`, and `estimatedDuration` from `project.projectSetup`
- This pre-fills the genre/tone checkboxes when reopening the Project Setup wizard

### 2. App.tsx - WorldWizardModal
- Modified to receive `initialData` with `genre` and `tone` from `project.projectSetup`
- This pre-fills the genre/tone when opening the World Builder wizard

### 3. App.tsx - StorytellerWizardModal
- Modified to receive `initialData` with `genre` and `tone` from `project.projectSetup`
- This pre-fills the genre/tone when opening the Storyteller wizard

### 4. Step2_GenreStyle.tsx - Visual Style Options
- Added anime era options:
  - `anime-80s`: Anime 80s (Robotanime, Macross, Galaxy Express)
  - `anime-90s`: Anime 90s (Sailor Moon, Evangelion, Pokemon)
  - `anime-2000s`: Anime 2000s (Fullmetal Alchemist, Bleach)

### 5. wizard.ts - Type Definition
- Updated `VisualStyle` type to include the new anime era options

## Flow After Fix
1. User opens Project Setup → selects genre/tone/visualStyle → saves → data saved to `project.projectSetup`
2. User reopens Project Setup → genre/tone/visualStyle are pre-filled from saved data
3. User opens World Builder → genre/tone are pre-filled from saved data
4. User opens Storyteller → genre/tone are pre-filled from saved data
5. Changes are persisted to the project file when saving

## Files Modified
1. `creative-studio-ui/src/components/wizard/ProjectSetupWizardModal.tsx`
2. `creative-studio-ui/src/App.tsx`
3. `creative-studio-ui/src/components/wizard/steps/Step2_GenreStyle.tsx`
4. `creative-studio-ui/src/types/wizard.ts`

