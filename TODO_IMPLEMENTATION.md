# Image Generation Dialog - Implementation TODO

## Phase 1: Create ImageGenerationModal Component
- [ ] 1.1 Create ImageGenerationModal.tsx in creative-studio-ui/src/components/modals/
- [ ] 1.2 Create imageGenerationService.ts in creative-studio-ui/src/services/

## Phase 2: Add FireRed Model to ModelDownloadModal
- [ ] 2.1 Update ModelDownloadModal.tsx with FireRed Image Edit model

## Phase 3: Update comfyuiService for FireRed Support
- [ ] 3.1 Add FireRed workflow type to WorkflowType enum
- [ ] 3.2 Add buildFireRedWorkflow method
- [ ] 3.3 Update generateImage to accept workflow type parameter

## Phase 4: Integrate ImageGenerationModal
- [ ] 4.1 Update ShotWizardModal.tsx
- [ ] 4.2 Update SequencePlanWizardModal.tsx
- [ ] 4.3 Update CharacterCard.tsx

## Phase 5: Testing
- [ ] 5.1 Run build to verify no TypeScript errors
- [ ] 5.2 Test the modal appears when clicking generate image
- [ ] 5.3 Test model download from HuggingFace
- [ ] 5.4 Test image generation with different workflows

