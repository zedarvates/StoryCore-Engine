# TypeScript Build Fix Plan

## Tasks

### Phase 1: Fix Critical Import/Dependency Issues
- [ ] 1.1 Fix timelineService.ts - Define Event and Sequence interfaces locally
- [ ] 1.2 Install MUI dependencies in src/ui (@mui/material, @mui/icons-material, @emotion/react, @emotion/styled)
- [ ] 1.3 Fix LLMConfigurationWindow.tsx - Create OllamaSettings component or remove import

### Phase 2: Fix Unused Variable Issues
- [ ] 2.1 Fix unused variables in AIEnhancementControls.tsx
- [ ] 2.2 Fix unused variables in AIProgressIndicator.tsx
- [ ] 2.3 Fix unused variables in APISettingsWindow.tsx
- [ ] 2.4 Fix unused variables in App.tsx
- [ ] 2.5 Fix unused variables in CentralConfigurationUI.tsx
- [ ] 2.6 Fix unused variables in ComfyUIConfigurationWindow.tsx
- [ ] 2.7 Fix unused variables in DialogueEditor.tsx
- [ ] 2.8 Fix unused variables in EffectLayerManager.tsx
- [ ] 2.9 Fix unused variables in EffectStack.tsx
- [ ] 2.10 Fix unused variables in ErrorNotification.tsx
- [ ] 2.11 Fix unused variables in FieldHighlight.tsx
- [ ] 2.12 Fix unused variables in SeedancePanel.tsx
- [ ] 2.13 Fix unused variables in StyleTransferControls.tsx
- [ ] 2.14 Fix unused variables in VersionControl.tsx
- [ ] 2.15 Fix unused variables in WizardLauncher.tsx
- [ ] 2.16 Fix TimelineEditor.test.tsx - Add proper types or exclude from build

### Phase 3: Verify Build
- [ ] 3.1 Run npm run ui:build to verify all errors are fixed

