# TODO: Fix Radix UI Dialog Accessibility Warnings

## Task
Fix the Radix UI Dialog accessibility warnings:
- `DialogContent` requires a `DialogTitle` for the component to be accessible for screen reader users
- Missing `Description` or `aria-describedby={undefined}` for {DialogContent}

## Files to Edit

### 1. creative-studio-ui/src/components/configuration/GeneralSettingsWindow.tsx
- [ ] Add `DialogDescription` to imports
- [ ] Add `<DialogDescription>` inside `<DialogHeader>`

### 2. creative-studio-ui/src/components/modals/ObjectsModal.tsx
- [ ] Add `DialogDescription` to imports
- [ ] Add `<DialogDescription>` to main ObjectsModal dialog
- [ ] Add `<DialogDescription>` to ObjectEditModal dialog
- [ ] Add `<DialogDescription>` to ObjectGenerationModal dialog
- [ ] Add `<DialogDescription>` to ObjectAnalysisModal dialog

### 3. creative-studio-ui/src/components/modals/CharactersModal.tsx
- [ ] Add `DialogDescription` to imports
- [ ] Add `<DialogDescription>` to CharactersModal dialog (no project state)
- [ ] Add `<DialogDescription>` to CharacterEditModal dialog

### 4. creative-studio-ui/src/components/modals/LocationsModal.tsx
- [ ] Add `DialogDescription` to imports
- [ ] Add `<DialogDescription>` to LocationsModal dialog (no project state)
- [ ] Add `<DialogDescription>` to LocationEditModal dialog

## Implementation Notes
- If you want to hide the DialogTitle visually, wrap it with VisuallyHidden component
- DialogDescription provides additional context for screen reader users
- Each DialogContent must have either a DialogTitle or aria-describedby

