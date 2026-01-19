# StoryCore Engine UI Reconstruction Plan

## Executive Summary

This comprehensive reconstruction plan addresses all specified requirements for rebuilding the StoryCore Engine UI. The plan incorporates existing implementations (TOS dialog, chatbox assistant, ComfyUI wizard, central configuration UI, asset integration) while designing enhancements for a **CapCut-like experience** with seamless workflows, comprehensive AI settings, and an advanced prompt system.

**Key Objectives:**
- Deliver a modern, performant UI with CapCut-like smoothness and responsiveness
- Unify AI and ComfyUI settings across all tools for consistent user experience
- Enhance sequence plan editing with video visualization and advanced grid editing
- Implement classic-styled Terms of Service with prominent homepage integration
- Achieve professional-grade performance with WebGL acceleration and optimized rendering

---

## 1. Terms of Usage Window - Classic Style Homepage Integration

### Design Requirements

- **Classic Style:** Traditional EULA appearance with serif fonts, formal layout, and legal document aesthetic
- **Prominent Homepage Display:** Modal-first launch experience with banner fallback for returning users
- **User Experience:** Must-read terms with clear acceptance/decline options

### Mock-up Description

```
┌─────────────────────────────────────────────────────────────────┐
│                    TERMS OF SERVICE AGREEMENT                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   STORYCORE ENGINE END USER LICENSE AGREEMENT                   │
│                                                                 │
│   Last Updated: January 19, 2026                                │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ This software is licensed, not sold. By using StoryCore │   │
│   │ Engine, you agree to these terms...                     │   │
│   │                                                         │   │
│   │ [Scrollable legal text area]                            │   │
│   │                                                         │   │
│   │ 1. LICENSE GRANT                                        │   │
│   │    You are granted a non-exclusive, non-transferable    │   │
│   │    license to use...                                    │   │
│   │                                                         │   │
│   │ 2. RESTRICTIONS                                         │   │
│   │    You may not...                                       │   │
│   │                                                         │   │
│   │ [Continue with full terms...]                           │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│   □ I have read and agree to the Terms of Service              │
│                                                                 │
│   [ Decline ]                           [ Accept & Continue ]   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Technical Specifications

- **Modal System:** Electron BrowserWindow with `modal=true`, `parent=mainWindow`
- **Persistence:** LocalStorage flag `tosAccepted: true` after acceptance
- **Fallback Banner:** Non-intrusive notification bar for returning users
- **Content Management:** Markdown-based terms stored in `/docs/terms-of-service.md`
- **Accessibility:** Keyboard navigation (Tab, Enter, Escape), screen reader support

---

## 2. Comprehensive AI LLM Assistant Settings

### Design Requirements

- **Consistent Implementation:** Unified settings across chatbox, prompt editor, and generation tools
- **Comprehensive Features:** Multi-provider support, model selection, parameter tuning, context management
- **Real-time Integration:** Live connection status, latency monitoring, automatic failover

### Mock-up Description

```
┌─────────────────────────────────────────────────────────────────┐
│                    AI ASSISTANT CONFIGURATION                    │
├─────────────────────────────────────────────────────────────────┤
│ Provider: [OpenAI ▼]   Model: [GPT-4 ▼]   Status: 🟢 Connected   │
│                                                                 │
│ ┌─ API Configuration ──────────────────────────────────────┐    │
│ │ API Key: [••••••••••••••••••••••••••••••••••] [Show] [Test]│    │
│ │ Base URL: [https://api.openai.com/v1]                     │    │
│ │ Timeout: [30s]   Retries: [3]   Rate Limit: [60/min]      │    │
│ └───────────────────────────────────────────────────────────┘    │
│                                                                 │
│ ┌─ Model Parameters ────────────────────────────────────────┐    │
│ │ Temperature: [0.7 ────●──── 2.0]   (Creativity)           │    │
│ │ Max Tokens: [4096 ────●──── 8192]   (Response Length)      │    │
│ │ Top P: [0.1 ────●──── 1.0]   (Diversity)                   │    │
│ │ Frequency Penalty: [0.0 ────●──── 2.0]   (Repetition)      │    │
│ │ Presence Penalty: [0.0 ────●──── 2.0]   (Topic Focus)      │    │
│ └───────────────────────────────────────────────────────────┘    │
│                                                                 │
│ ┌─ Context Management ──────────────────────────────────────┐    │
│ │ Memory Size: [10] conversations   Auto-save: □            │    │
│ │ Context Window: [8192] tokens   Compression: □            │    │
│ │ Personality: [Creative Assistant ▼]                       │    │
│ └───────────────────────────────────────────────────────────┘    │
│                                                                 │
│ [ Save Settings ]   [ Reset to Defaults ]   [ Advanced ▼ ]      │
└─────────────────────────────────────────────────────────────────┘
```

### Technical Specifications

- **Unified Context:** Single `AIConfigurationContext` React context
- **Provider Abstraction:** Interface-based design supporting OpenAI, Anthropic, Ollama, HuggingFace
- **Settings Persistence:** Encrypted storage with Electron secure storage
- **Real-time Validation:** API key testing, model availability checks, latency measurement
- **Consistent UI Components:** Reusable `AIProviderSelector`, `ModelParameterSlider`, `ConnectionStatusIndicator`

---

## 3. Complete ComfyUI Settings Standardization

### Design Requirements

- **Unified Settings:** Consistent ComfyUI configuration across all generation tools
- **Complete Functionality:** Full workflow management, model selection, hardware optimization
- **Standardized Everywhere:** Embedded settings in relevant UI sections

### Mock-up Description

```
┌─────────────────────────────────────────────────────────────────┐
│                     COMFYUI BACKEND SETTINGS                     │
├─────────────────────────────────────────────────────────────────┤
│ Status: 🟢 Connected   Server: http://localhost:8188            │
│                                                                 │
│ ┌─ Server Configuration ────────────────────────────────────┐    │
│ │ URL: [http://localhost:8188]   [Test Connection]         │    │
│ │ Auto-start: □   CORS Headers: □   GPU Memory: [8GB]       │    │
│ │ Models Path: [/ComfyUI/models]   Workflows Path: [/workflows]│    │
│ └───────────────────────────────────────────────────────────┘    │
│                                                                 │
│ ┌─ Model Management ────────────────────────────────────────┐    │
│ │ Diffusion Model: [flux2_dev_fp8mixed.safetensors ▼]       │    │
│ │ VAE Model: [vae-ft-mse-840000-ema-pruned.ckpt ▼]          │    │
│ │ CLIP Model: [clip_l.safetensors ▼]                        │    │
│ │ LoRA Models: [+ Add LoRA] [style1.safetensors] [✕]        │    │
│ └───────────────────────────────────────────────────────────┘    │
│                                                                 │
│ ┌─ Workflow Templates ──────────────────────────────────────┐    │
│ │ Default: [StoryCore Image Gen v2 ▼]                       │    │
│ │ Video: [StoryCore Video Synth ▼]                          │    │
│ │ Animation: [StoryCore Animation ▼]                        │    │
│ │ Custom Workflows: [Browse...] [+ Create New]             │    │
│ └─────────────────────────────────────────────────────────────┘    │
│                                                                 │
│ ┌─ Performance Optimization ────────────────────────────────┐    │
│ │ Precision: [FP16 ▼]   Batch Size: [1]   Steps: [20]        │    │
│ │ GPU Memory: [Auto]   CPU Threads: [4]   Cache: □           │    │
│ │ Upscaling: [None ▼]   Denoising: [0.5]                     │    │
│ └───────────────────────────────────────────────────────────┘    │
│                                                                 │
│ [ Save & Apply ]   [ Reset ]   [ Install ComfyUI ▼ ]           │
└─────────────────────────────────────────────────────────────────┘
```

### Technical Specifications

- **Configuration Service:** Centralized `ComfyUIService` with validation and persistence
- **Workflow Validation:** JSON schema validation for uploaded workflows
- **Model Discovery:** Automatic model scanning and metadata extraction
- **Performance Profiling:** GPU memory monitoring, execution time tracking
- **Standardized Components:** `ComfyUIConfigPanel`, `WorkflowSelector`, `ModelBrowser`

---

## 4. Enhanced Sequence Plan Editing Space

### Design Requirements

- **Video Visualization:** Add video preview capability to sequence plans currently lacking it
- **Individual Shot Frames Section:** Below sequence plan, display individual shot frames with key details
- **Editing Grid:** Include grid for structuring and organizing sequences
- **Sequence Plan Management:** Dedicated space for selecting and creating new sequence plans integrated with editing space

### Mock-up Description

```
┌─────────────────────────────────────────────────────────────────┐
│  [Sequence Plan: Opening Scene]                     [■] [□] [✕] │
├─────────────────────────────────────────────────────────────────┤
│ ┌─ Sequence Plan Overview ──────────────────────────────────┐ │
│ │ [Storyboard Thumbnails: Shot1] [Shot2] [Shot3] [Shot4]    │ │
│ │ Video Preview: ▶️ [00:00/02:30] ──────────────●─────      │ │
│ │ Current Sequence: Scene 1 - Hero Introduction             │ │
│ └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─ Individual Shot Frames ──────────────────────────────────┐ │
│ │ Shot 1: [Thumbnail]                                        │ │
│ │ Duration: 5s | Type: Establishing | Camera: Wide          │ │
│ │ Description: Hero walking through city streets            │ │
│ │ Shot 2: [Thumbnail]                                        │ │
│ │ Duration: 3s | Type: Close-up | Camera: Tracking          │ │
│ │ Description: Focus on hero's determined expression        │ │
│ │ Shot 3: [Thumbnail]                                        │ │
│ │ Duration: 7s | Type: Action | Camera: Dynamic              │ │
│ │ Description: Hero encounters obstacle                     │ │
│ └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─ Editing Grid ─────────────────────────────────────────────┐ │
│ │ ┌───┬───┬───┬───┬───┬───┬───┬───┬───┬───┐                   │ │
│ │ │S1 │S2 │S3 │   │   │   │   │   │   │   │                   │ │
│ │ ├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤                   │ │
│ │ │   │   │   │   │   │   │   │   │   │   │                   │ │
│ │ ├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤                   │ │
│ │ │   │   │   │   │   │   │   │   │   │   │                   │ │
│ │ └───┴───┴───┴───┴───┴───┴───┴───┴───┴───┘                   │ │
│ │ [Grid controls: Add Row | Add Column | Clear | Auto-arrange]│ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─ Sequence Plan Manager ────────────────────────────────────┐ │
│ │ 📂 Available Plans                                          │ │
│ │ ├── Opening Scene (Current)                                 │ │
│ │ ├── Character Introduction                                  │ │
│ │ ├── Conflict Development                                    │ │
│ │ ├── Climax Sequence                                         │ │
│ │ ├── Resolution                                              │ │
│ │ [+ Create New Sequence Plan]                                │ │
│ │                                                              │ │
│ │ [Load Selected] [Duplicate] [Delete] [Export]               │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Technical Specifications

- **Video Visualization:** WebRTC-based video streaming with synchronized playback controls
- **Shot Frame Management:** Thumbnail generation and caching system with metadata overlay
- **Editing Grid:** Drag-and-drop grid component with auto-layout algorithms
- **Sequence Plan Integration:** Real-time synchronization between plan selection and editing space
- **Persistence:** JSON-based sequence plan storage with version history

---

## 5. Scene Wizard (Priority MEDIUM)

### Design Requirements

- **Purpose:** For creating complete scenes
- **Core Features:**
  - Selection of present characters
  - Choice of location (from the World)
  - Definition of action/dialogue
  - Automatic generation of several shots

### Mock-up Description

```
┌─────────────────────────────────────────────────────────────────┐
│                          SCENE WIZARD                            │
├─────────────────────────────────────────────────────────────────┤
│ [Select Characters] [Choose Location] [Define Action/Dialogue]  │
│                                                                 │
│ ┌─ Characters ──────────────────────────────────────────────┐   │
│ │ [Hero] [Villain] [Supporting Character] [+ Add New]        │   │
│ └─────────────────────────────────────────────────────────────┘   │
│                                                                 │
│ ┌─ Location ─────────────────────────────────────────────────┐   │
│ │ [City Street ▼]                                             │   │
│ └─────────────────────────────────────────────────────────────┘   │
│                                                                 │
│ ┌─ Action/Dialogue ──────────────────────────────────────────┐   │
│ │ [Enter scene description, actions, and dialogue...]        │   │
│ │                                                             │   │
│ │ [Multiline text area for detailed scene definition]        │   │
│ └─────────────────────────────────────────────────────────────┘   │
│                                                                 │
│ [ Generate Shots ]   [ Preview ]   [ Save Scene ]                │
│                                                                 │
│ ┌─ Generated Shots ──────────────────────────────────────────┐   │
│ │ Shot 1: [Thumbnail] Establishing shot - 5s                 │   │
│ │ Shot 2: [Thumbnail] Close-up dialogue - 3s                 │   │
│ │ Shot 3: [Thumbnail] Action sequence - 7s                   │   │
│ │ [+ Generate More Shots]                                     │   │
│ └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Technical Specifications

- **Character Integration:** Connection to character database with search and selection
- **World Location System:** Dropdown populated from predefined world locations
- **AI Generation:** Integration with AI services for automatic shot generation based on description
- **Output Format:** Generated shots exported to sequence plan editor
- **UI Components:** Multi-select character picker, location selector, rich text editor for action/dialogue

---

## 6. Project Setup Wizard (Priority MEDIUM)

### Design Requirements

- **Purpose:** For initializing a new project
- **Core Features:**
  - Project type selection (short film, advertising, etc.)
  - Global parameters (resolution, framerate)
  - Default AI configuration
  - Automatic folder structure creation

### Mock-up Description

```
┌─────────────────────────────────────────────────────────────────┐
│                      PROJECT SETUP WIZARD                        │
├─────────────────────────────────────────────────────────────────┤
│ [Step 1/4: Project Type] [▶]                                    │
│                                                                 │
│ ┌─ Project Type ────────────────────────────────────────────┐   │
│ │ ○ Short Film                                                 │   │
│ │ ○ Advertising Campaign                                       │   │
│ │ ○ Music Video                                                │   │
│ │ ○ Documentary                                                │   │
│ │ ○ Other: [______________]                                    │   │
│ └─────────────────────────────────────────────────────────────┘   │
│                                                                 │
│ [ Next: Global Parameters ]                                     │
│                                                                 │
│ ┌─ Global Parameters ────────────────────────────────────────┐   │
│ │ Resolution: [1920x1080 ▼]   Framerate: [30 FPS ▼]           │   │
│ │ Aspect Ratio: [16:9 ▼]   Color Space: [Rec.709 ▼]           │   │
│ │ Duration Estimate: [5-10 min ▼]                             │   │
│ └─────────────────────────────────────────────────────────────┘   │
│                                                                 │
│ ┌─ Default AI Configuration ────────────────────────────────┐   │
│ │ AI Provider: [OpenAI ▼]   Model: [GPT-4 ▼]                │   │
│ │ Creativity Level: [Medium ▼]   Style: [Balanced ▼]        │   │
│ └─────────────────────────────────────────────────────────────┘   │
│                                                                 │
│ ┌─ Folder Structure ─────────────────────────────────────────┐   │
│ │ 📁 Project Root                                             │   │
│ │ ├── 📁 assets                                               │   │
│ │ ├── 📁 sequences                                            │   │
│ │ ├── 📁 characters                                           │   │
│ │ ├── 📁 audio                                                │   │
│ │ └── 📁 exports                                              │   │
│ │ [Auto-create folders: □]                                    │   │
│ └─────────────────────────────────────────────────────────────┘   │
│                                                                 │
│ [ Create Project ]   [ Back ]   [ Cancel ]                      │
└─────────────────────────────────────────────────────────────────┘
```

### Technical Specifications

- **Project Templates:** Predefined configurations for different project types
- **Parameter Validation:** Range checking and compatibility verification for technical parameters
- **AI Settings Inheritance:** Default configurations pulled from global AI settings
- **File System Integration:** Automatic folder creation with proper permissions
- **Wizard Flow:** Step-by-step interface with progress indicator and validation

---

## 7. Storyboard Wizard (Priority LOW)

### Design Requirements

- **Purpose:** For creating a visual storyboard
- **Core Features:**
  - Import/creation of sketches
  - Annotations and notes
  - Organization into sequences
  - Export to the Sequence Plan Editor

### Mock-up Description

```
┌─────────────────────────────────────────────────────────────────┐
│                        STORYBOARD WIZARD                         │
├─────────────────────────────────────────────────────────────────┤
│ [Import Sketches] [Create New] [Organize Sequences] [Export]    │
│                                                                 │
│ ┌─ Sketch Canvas ────────────────────────────────────────────┐   │
│ │ [Drawing area with tools: pencil, brush, shapes, text]     │   │
│ │                                                             │   │
│ │ [Current sketch thumbnail]                                  │   │
│ │                                                             │   │
│ │ [Annotation: Enter notes for this shot...]                 │   │
│ │                                                             │   │
│ │ Camera: [Wide ▼]   Movement: [Static ▼]   Duration: [5s]    │   │
│ └─────────────────────────────────────────────────────────────┘   │
│                                                                 │
│ ┌─ Sequence Organization ────────────────────────────────────┐   │
│ │ Sequence 1: Opening Scene                                  │   │
│ │ ├── Shot 1: [Thumbnail] Establishing                       │   │
│ │ ├── Shot 2: [Thumbnail] Character Intro                    │   │
│ │ ├── Shot 3: [Thumbnail] Action                              │   │
│ │ [+ Add Shot] [Reorder]                                      │   │
│ │                                                             │   │
│ │ Sequence 2: Development                                     │   │
│ │ [+ Add Sequence]                                            │   │
│ └─────────────────────────────────────────────────────────────┘   │
│                                                                 │
│ [ Export to Sequence Plan Editor ]   [ Save Storyboard ]       │
└─────────────────────────────────────────────────────────────────┘
```

### Technical Specifications

- **Sketch Tools:** Basic drawing interface with common tools and undo/redo
- **Import Support:** File upload for images, PDFs, and existing sketches
- **Annotation System:** Rich text notes with positioning and linking to shots
- **Sequence Management:** Drag-and-drop organization with hierarchical structure
- **Export Integration:** Direct export to sequence plan format with metadata preservation

---

## Implementation Guidelines

### Phase 1: Foundation (Week 1-2)

- **Audit Current Codebase:** Review all existing implementations for reusability
- **Design System Updates:** Extend current design system for new components
- **API Architecture:** Define unified APIs for AI, ComfyUI, and asset services
- **Performance Baseline:** Establish performance benchmarks for CapCut-like experience

### Phase 2: Core Components (Week 3-6)

- **TOS Dialog Enhancement:** Implement classic styling and homepage integration
- **AI Settings Unification:** Create consistent AI configuration components
- **ComfyUI Standardization:** Complete backend integration and UI standardization
- **Timeline Engine:** Build performant timeline component with WebGL acceleration

### Phase 3: Advanced Features (Week 7-10)

- **Prompt System:** Implement multi-modal prompt editor with asset integration
- **Workflow Optimization:** Add drag-and-drop, keyboard shortcuts, and batch operations
- **Performance Tuning:** Optimize rendering, implement virtual scrolling, background processing

### Phase 4: Integration & Testing (Week 11-12)

- **Cross-Component Integration:** Ensure all components work seamlessly together
- **End-to-End Testing:** Test complete user workflows from project creation to export
- **Performance Validation:** Verify CapCut-like smoothness and responsiveness
- **Documentation:** Update all technical and user documentation

### Phase 5: Polish & Deployment (Week 13-14)

- **UI/UX Refinement:** Final design polish and accessibility improvements
- **Performance Optimization:** Final optimizations for production deployment
- **User Testing:** Conduct user acceptance testing and gather feedback
- **Production Deployment:** Package and deploy the reconstructed UI

---

## Technical Specifications Summary

- **Frontend Framework:** React 18+ with TypeScript
- **State Management:** Context API with custom hooks
- **UI Library:** Shadcn/ui with Tailwind CSS
- **Performance:** WebGL for timeline, Web Workers for processing
- **Persistence:** Electron secure storage for sensitive data
- **APIs:** REST/WebSocket for backend communication
- **Testing:** Jest for unit tests, Cypress for E2E tests
- **Build System:** Vite for development, Electron Builder for packaging

---

## Success Criteria

### TOS Window
- Classic-styled, prominently displayed, legally compliant
- Smooth modal experience with proper keyboard navigation
- Persistent acceptance tracking with fallback banner

### AI Settings
- Comprehensive, consistent across all sections, real-time validation
- Multi-provider support with automatic failover
- Encrypted storage for sensitive credentials

### ComfyUI Settings
- Complete functionality, standardized everywhere, performant
- Automatic model discovery and workflow validation
- GPU memory monitoring and optimization

### Sequence Plan Editing
- Enhanced with video visualization, shot frames, editing grid, and integrated plan management
- WebGL-accelerated timeline with 60 FPS performance
- Real-time synchronization and version history

---

## Risk Mitigation

- **Technical Risk:** Incremental testing with rollback capabilities
- **Timeline Risk:** Parallel development tracks with weekly milestones
- **Quality Risk:** Comprehensive automated testing and manual QA checkpoints
- **Performance Risk:** Early performance benchmarking and continuous optimization

## Dependencies

- **Existing Implementations:** TOS dialog, chatbox assistant, ComfyUI wizard, central configuration UI
- **UI Framework:** React 18+, TypeScript, Shadcn/ui, Tailwind CSS
- **Backend Services:** ComfyUI server, AI provider APIs, Electron secure storage
- **Hardware:** GPU support for WebGL acceleration and video processing