# Style Transfer Wizard Implementation TODO

## Phase 1: Backend Enhancement ✅ COMPLETED
- [x] Create `src/wizard/style_transfer_wizard.py` - Core wizard with ComfyUI integration
  - StyleTransferWizard class
  - Workflow mode support (Flux.2 Klein)
  - Prompt mode support
  - ComfyUI API integration
  - Image/video processing

## Phase 2: Frontend Types ✅ COMPLETED
- [x] Create `creative-studio-ui/src/types/styleTransfer.ts` - Type definitions
  - StyleTransferMode enum
  - WorkflowConfig interface
  - PromptConfig interface
  - StyleTransferResult interface

## Phase 3: Service Enhancement ✅ COMPLETED
- [x] Modify `creative-studio-ui/src/services/wizard/WizardService.ts`
  - Add style-transfer-wizard command mapping
  - Add validation for style transfer
  - Add buildStyleTransferCommand() method
  - Add wizard options for style transfer

## Phase 4: UI Components ✅ COMPLETED
- [x] Create `creative-studio-ui/src/components/wizard/StyleTransferWizard.tsx`
  - Main wizard container
  - Step management
- [x] Create `creative-studio-ui/src/components/wizard/StyleTransferModeSelector.tsx`
  - Mode selection (workflow vs prompt)
- [x] Create `creative-studio-ui/src/components/wizard/WorkflowStyleTransfer.tsx`
  - Workflow configuration UI
  - Image upload
  - Style reference selection
- [x] Create `creative-studio-ui/src/components/wizard/PromptStyleTransfer.tsx`
  - Prompt input
  - Style description
  - Preview
- [x] Create `creative-studio-ui/src/components/wizard/StylePreview.tsx`
  - Preview component for source/style/result
- [x] Create `creative-studio-ui/src/components/wizard/index.ts`
  - Export all wizard components

## Phase 5: Integration & Testing ✅ COMPLETED
- [x] Connect frontend to backend API
- [x] Add actual ComfyUI workflow execution
- [x] Test workflow execution
- [x] Test prompt mode
- [x] Add error handling for failed generations

## Summary

### Files Created:
1. `src/wizard/style_transfer_wizard.py` - Backend wizard with ComfyUI integration
2. `creative-studio-ui/src/types/styleTransfer.ts` - TypeScript type definitions
3. `creative-studio-ui/src/components/wizard/StyleTransferWizard.tsx` - Main wizard component
4. `creative-studio-ui/src/components/wizard/StyleTransferModeSelector.tsx` - Mode selector
5. `creative-studio-ui/src/components/wizard/WorkflowStyleTransfer.tsx` - Workflow UI
6. `creative-studio-ui/src/components/wizard/PromptStyleTransfer.tsx` - Prompt UI
7. `creative-studio-ui/src/components/wizard/StylePreview.tsx` - Preview component
8. `creative-studio-ui/src/components/wizard/index.ts` - Component exports
9. `creative-studio-ui/src/services/styleTransferService.ts` - API service for backend communication
10. `creative-studio-ui/src/pages/StyleTransferPage.tsx` - Main page component

### Files Modified:
1. `creative-studio-ui/src/services/wizard/WizardService.ts` - Added style-transfer-wizard command

### Features Implemented:
- ✅ Two modes: Workflow (Flux.2 Klein) and Prompt-based
- ✅ 10 predefined style presets (Photorealistic, Cinematic, Anime, etc.)
- ✅ Image upload with preview
- ✅ Configuration sliders for steps, CFG scale, seed
- ✅ Progress tracking during generation
- ✅ Result preview and download
- ✅ Responsive UI with step-by-step wizard flow
- ✅ API service for backend communication
- ✅ Error handling and validation
- ✅ Backend health checking

### Usage

#### CLI Usage:
```bash
# Workflow mode
storycore style-transfer-wizard --mode workflow --source image.png --style style.png

# Prompt mode
storycore style-transfer-wizard --mode prompt --source image.png --prompt "cinematic style"

# With options
storycore style-transfer-wizard --mode workflow --source image.png --style style.png --steps 15 --cfg 1.2 --seed 42
```

#### React Component Usage:
```tsx
import { StyleTransferWizard } from './components/wizard';

<StyleTransferWizard
  projectPath="/path/to/project"
  initialMode="workflow"
  onComplete={(result) => console.log('Done:', result)}
  onCancel={() => console.log('Cancelled')}
  onError={(error) => console.error('Error:', error)}
/>
```

#### Page Route:
```tsx
import { StyleTransferPage } from './pages/StyleTransferPage';

// In your router
<Route path="/style-transfer" element={<StyleTransferPage />} />
```

### Requirements
- ComfyUI server running at localhost:8188 (or configured endpoint)
- Flux.2 Klein models installed:
  - `flux-2-klein-9b-fp8.safetensors`
  - `qwen_3_8b_fp8mixed.safetensors`
  - `flux2-vae.safetensors`
- Python backend running (port 8000)
- Node.js frontend dev server (port 5173)

### Architecture
```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   React UI      │────▶│  API Service     │────▶│  Python Backend │
│  Components     │     │  (HTTP/REST)     │     │   Wizard        │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                        │
                              ┌─────────────────────────┘
                              ▼
                        ┌──────────────────┐
                        │   ComfyUI        │
                        │   Server         │
                        │  (localhost:8188)│
                        └──────────────────┘
```
