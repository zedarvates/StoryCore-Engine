# R&D: Image Generation Dialog with Workflow/Model Selection

## Information Gathered

### Current State:
- Image generation is done directly in components like ShotWizardModal, SequencePlanWizardModal, CharacterCard
- No unified dialog for selecting workflow/model before generation
- comfyuiService.ts has WorkflowType enum: `flux2`, `z_image_turbo`, `z_image_turbo_coherence`, `sdxl`, `custom`
- ModelDownloadModal.tsx exists for downloading models
- FireRed Image Edit model URL provided: https://huggingface.co/cocorang/FireRed-Image-Edit-1.0-FP8_And_BF16/resolve/main/FireRed-Image-Edit-1.0_fp8mixed_comfy.safetensors?download=true

### Components Requiring Model/Workflow Selection:
- ShotWizardModal.tsx (shot reference images)
- SequencePlanWizardModal.tsx
- CharacterCard.tsx (character portraits)
- SceneMediaPanel.tsx
- CharacterImagesSection.tsx

---

## Implementation Plan

### Phase 1: Create ImageGenerationModal Component

1.1 **Create ImageGenerationModal.tsx** in `creative-studio-ui/src/components/modals/`
   - Modal with tabs: Workflow Selection | Advanced Settings
   - Workflow selection cards with descriptions
   - Model dropdown (fetched from ComfyUI)
   - Resolution selector with GPU memory validation
   - Generation parameters (steps, CFG, sampler, scheduler)
   - Download model button if not available

1.2 **Create imageGenerationService.ts** 
   - Function to fetch available checkpoints from ComfyUI
   - Function to validate resolution based on GPU memory
   - Helper to build workflows based on selected model

### Phase 2: Add FireRed Model to ModelDownloadModal

2.1 **Update ModelDownloadModal.tsx**
   - Add FireRed Image Edit to the models list
   - Add download functionality for the HuggingFace URL

### Phase 3: Update comfyuiService for FireRed Support

3.1 **Add FireRed workflow type** to WorkflowType enum
3.2 **Add buildFireRedWorkflow method** to ComfyUIService
3.3 **Update generateImage** to accept workflow type parameter

### Phase 4: Integrate ImageGenerationModal

4.1 **Update ShotWizardModal.tsx**
   - Replace inline image generation with ImageGenerationModal
   - Pass generated image URL back to form

4.2 **Update SequencePlanWizardModal.tsx**
   - Same integration as ShotWizardModal

4.3 **Update CharacterCard.tsx**
   - Add model selection to character portrait generation

### Phase 5: Testing

5.1 Test workflow selection
5.2 Test model download
5.3 Test image generation with different workflows
6.4 Test resolution validation

---

## Files to Create/Modify

### New Files:
- `creative-studio-ui/src/components/modals/ImageGenerationModal.tsx`
- `creative-studio-ui/src/services/imageGenerationService.ts`

### Files to Modify:
- `ModelDownloadModal.tsx` - Add FireRed model
- `creative-studio-ui/src/services/comfyuiService.ts` - Add FireRed support
- `creative-studio-ui/src/components/wizard/ShotWizardModal.tsx` - Integrate modal
- `creative-studio-ui/src/components/wizard/SequencePlanWizardModal.tsx` - Integrate modal
- `creative-studio-ui/src/components/character/CharacterCard.tsx` - Integrate modal

---

## Follow-up Steps

1. Run `npm run build` to verify no TypeScript errors
2. Test the modal appears when clicking generate image
3. Test model download from HuggingFace
4. Test image generation with different workflows
5. Verify resolution limits are enforced based on GPU memory

