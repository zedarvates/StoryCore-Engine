# Continuous Creation Implementation Plan

## Document Information

| Attribute | Value |
|-----------|-------|
| Version | 1.0 |
| Created | 2026-02-05 |
| Status | Draft |
| Last Updated | 2026-02-05 |

---

## 1. Executive Summary

This document outlines the comprehensive implementation plan for the **Continuous Creation with Referenced Assets** feature set in the StoryCore Creative Studio. This feature enables sophisticated, iterative content creation workflows that leverage a three-level reference system for maintaining visual consistency across multi-shot video productions.

### Key Objectives

- Implement a **Three-Level Reference System** (Project-Level, Sequence-Level, Shot-Level)
- Enable **Manual Storyboard Editing** with full control over generation parameters
- Support **Comment-Driven Generation** for iterative refinement
- Build **Timeline Assembly & Editing** capabilities
- Define **Generation Path Strategies** for optimal output quality
- Implement **Video Replication** workflows
- Add **Project Management** features for multi-episode creation
- Support **Multi-Shot** and **One-Shot/Continuous Take** workflows

### Implementation Overview

The implementation is structured across **4 phases**, progressively building from foundational types and services to advanced features:

| Phase | Focus | Duration |
|-------|-------|----------|
| Phase 1 | Foundation (Types, Services, Store) | 2-3 weeks |
| Phase 2 | Sequence Integration | 2-3 weeks |
| Phase 3 | Shot Enhancement | 2-3 weeks |
| Phase 4 | Advanced Features | 2-3 weeks |

---

## 2. Current State Analysis

### 2.1 Already Implemented Components

The following components and services are already in place and form the foundation for the new features:

#### Core Components

| Component | Location | Status |
|-----------|----------|--------|
| [`StoryboardCanvas`](creative-studio-ui/src/components/StoryboardCanvas.tsx) | UI Component | ✅ Implemented |
| [`Timeline`](creative-studio-ui/src/components/Timeline.tsx) | UI Component | ✅ Implemented |
| [`SequencePlanManager`](creative-studio-ui/src/services/sequencePlanService.ts) | Service | ✅ Implemented |
| [`CharacterEditor`](creative-studio-ui/src/components/character/CharacterEditor.tsx) | UI Component | ✅ Implemented |
| [`WorldModal`](creative-studio-ui/src/components/modals/WorldModal.tsx) | UI Component | ✅ Implemented |
| [`CharactersModal`](creative-studio-ui/src/components/modals/CharactersModal.tsx) | UI Component | ✅ Implemented |
| [`comfyuiServersService`](creative-studio-ui/src/services/comfyuiServersService.ts) | Service | ✅ Implemented |

#### Existing Types & Interfaces

| Type File | Key Types | Purpose |
|-----------|-----------|---------|
| [`shot.ts`](creative-studio-ui/src/types/shot.ts) | `Shot`, `ProductionShot`, `ShotType`, `CameraMovement` | Shot data models |
| [`sequencePlan.ts`](creative-studio-ui/src/types/sequencePlan.ts) | `SequencePlan`, `Act`, `Scene` | Sequence organization |
| [`project.ts`](creative-studio-ui/src/types/project.ts) | `ProjectData`, `CharacterReference`, `WorldDefinition` | Project structure |
| [`story.ts`](creative-studio-ui/src/types/story.ts) | `Story`, `StoryPart`, `CharacterReference` | Story content |
| [`character.ts`](creative-studio-ui/src/types/character.ts) | `Character`, `VisualIdentity`, `Personality` | Character data |
| [`world.ts`](creative-studio-ui/src/types/world.ts) | `World`, `Location`, `WorldRule` | World/setting data |
| [`timeline.ts`](creative-studio-ui/src/types/timeline.ts) | `TimelineTrack`, `TimelineState` | Timeline structure |
| [`generation.ts`](creative-studio-ui/src/types/generation.ts) | `GenerationPipelineState`, `GenerationTask` | Generation pipeline |
| [`gridEditor.ts`](creative-studio-ui/src/types/gridEditor.ts) | `Panel`, `GridMetadata`, `Transform` | Grid-based editing |
| [`gridEditorAdvanced.ts`](creative-studio-ui/src/types/gridEditorAdvanced.ts) | `VideoPlayerState`, `BatchOperation` | Advanced editing |

#### Existing Services

| Service | Purpose |
|---------|---------|
| [`sequencePlanService.ts`](creative-studio-ui/src/services/sequencePlanService.ts) | Sequence planning and management |
| [`sequenceGenerationService.ts`](creative-studio-ui/src/services/sequenceGenerationService.ts) | Sequence generation |
| [`comfyuiServersService.ts`](creative-studio-ui/src/services/comfyuiServersService.ts) | ComfyUI server management |
| [`comfyuiService.ts`](creative-studio-ui/src/services/comfyuiService.ts) | ComfyUI API interactions |
| [`generationOrchestrator.ts`](creative-studio-ui/src/services/GenerationOrchestrator.ts) | Generation workflow orchestration |
| [`storyGenerationService.ts`](creative-studio-ui/src/services/storyGenerationService.ts) | Story generation |
| [`aiWizardService.ts`](creative-studio-ui/src/services/aiWizardService.ts) | AI-powered wizard workflows |
| [`gridGenerationService.ts`](creative-studio-ui/src/services/gridGenerationService.ts) | Grid-based generation |
| [`assetLibraryService.ts`](creative-studio-ui/src/services/assetLibraryService.ts) | Asset library management |
| [`imageStorageService.ts`](creative-studio-ui/src/services/imageStorageService.ts) | Image storage |
| [`projectExportService.ts`](creative-studio-ui/src/services/projectExportService.ts) | Project export |

### 2.2 Existing Data Model Strengths

The current implementation provides:

1. **Comprehensive Shot Model** - [`ProductionShot`](creative-studio-ui/src/types/shot.ts:92) includes composition, camera, timing, and generation settings
2. **Sequence Organization** - [`SequencePlan`](creative-studio-ui/src/types/sequencePlan.ts:8) supports acts, scenes, and shots hierarchy
3. **Character Definition** - [`Character`](creative-studio-ui/src/types/character.ts:5) with detailed visual identity and personality
4. **World Building** - [`World`](creative-studio-ui/src/types/world.ts:5) with locations, rules, and cultural elements
5. **Generation Pipeline** - Multi-stage generation with progress tracking
6. **Timeline Structure** - [`TimelineTrack`](creative-studio-ui/src/types/timeline.ts:8) and state management
7. **Asset Management** - Comprehensive asset metadata and validation

### 2.3 Current Architecture Overview

```
creative-studio-ui/
├── src/
│   ├── types/              # Type definitions
│   ├── services/           # Business logic
│   ├── components/         # UI components
│   │   ├── character/     # Character editing
│   │   ├── modals/        # Modal dialogs
│   │   └── ...
│   └── stores/            # State management
├── backend/               # Backend services
└── config/                # Configuration
```

---

## 3. Gap Analysis

### 3.1 Missing Components

The following components need to be implemented:

| Component | Type | Priority | Description |
|-----------|------|----------|-------------|
| `MasterReferenceSheet` | UI Component | High | Project-level reference sheet |
| `SequenceReferenceSheet` | UI Component | High | Sequence-level reference management |
| `ConsistencyEngine` | Service | High | Visual consistency checking |
| `ReferenceInheritanceService` | Service | High | Reference propagation between levels |
| `StyleTransferService` | Service | Medium | Style transfer between shots |
| `VideoReplicationService` | Service | Medium | Video replication workflow |
| `CommentDrivenGenerationService` | Service | Medium | Comment-based generation |
| `TimelineEditor` | UI Component | High | Enhanced timeline editing |
| `OneShotWorkflowManager` | Service | Medium | Continuous take workflow |

### 3.2 Missing Type Definitions

| Type | Purpose | File |
|------|---------|------|
| `ReferenceImage` | Reference image metadata | New |
| `MasterReference` | Project-level references | New |
| `SequenceReference` | Sequence-level references | New |
| `ShotReference` | Shot-level references | New |
| `ReferenceAnnotation` | Annotations on references | New |
| `StyleProfile` | Visual style profile | New |
| `CommentDrivenTask` | Comment-driven generation task | New |
| `ReplicationRequest` | Video replication request | New |
| `ContinuityFrame` | Frame for continuity | New |
| `WorkflowState` | Workflow state tracking | New |

### 3.3 Feature Gaps

| Feature | Current State | Required State |
|---------|---------------|----------------|
| Three-Level Reference System | Partial (shot references) | Full (project, sequence, shot) |
| Manual Storyboard Editing | Basic | Full (parameters, modes, presets) |
| Comment-Driven Generation | Not implemented | Full (comments → generation) |
| Timeline Assembly | Basic | Full (trim, speed, volume) |
| Generation Path Strategy | Not explicit | Explicit (Text→Image→Video) |
| Video Replication | Not implemented | Full (upload → replicate) |
| Project Management | Basic | Full (start new, return to) |
| Multi-Shot Workflow | Partial | Full (consistency, cuts) |
| One-Shot/Continuous Take | Not implemented | Full (first-last frame) |

---

## 4. Implementation Phases

### Phase 1: Foundation (Types, Services, Store)

**Duration:** 2-3 weeks  
**Objective:** Establish the core type system, services, and state management for reference-based workflows.

#### 1.1 New Type Definitions

Create the following type files:

##### 4.1.1 `reference.ts` - Reference System Types

```typescript
// Location: creative-studio-ui/src/types/reference.ts

/**
 * Reference Image - Core reference data structure
 */
export interface ReferenceImage {
  id: string;
  level: 'project' | 'sequence' | 'shot';
  type: 'character' | 'environment' | 'prop' | 'style' | 'keyframe' | 'continuity';
  assetId: string;
  url: string;
  thumbnailUrl?: string;
  metadata: ReferenceMetadata;
  annotations: ReferenceAnnotation[];
  createdAt: Date;
  modifiedAt: Date;
}

/**
 * Reference metadata for generation context
 */
export interface ReferenceMetadata {
  generationParams?: {
    prompt: string;
    negativePrompt: string;
    model: string;
    seed: number;
    width: number;
    height: number;
    steps: number;
    cfgScale: number;
  };
  qualityScore?: number;
  usageCount: number;
  lastUsedAt?: Date;
}

/**
 * Annotation on a reference image
 */
export interface ReferenceAnnotation {
  id: string;
  type: 'highlight' | 'region' | 'note' | 'instruction';
  position?: { x: number; y: number; width: number; height: number };
  content: string;
  linkedTo?: string; // Other reference ID
  generatedFrom?: string; // Comment ID
}

/**
 * Master Reference Sheet - Project-level references
 */
export interface MasterReferenceSheet {
  id: string;
  projectId: string;
  version: number;
  
  // Core references
  characterReferences: ProjectCharacterReference[];
  environmentReferences: ProjectEnvironmentReference[];
  propReferences: ProjectPropReference[];
  styleReferences: ProjectStyleReference[];
  
  // Key visual elements
  keyCharacterImages: ReferenceImage[];
  keyEnvironmentImages: ReferenceImage[];
  keyShotTemplates: ReferenceImage[];
  
  // Metadata
  createdAt: Date;
  modifiedAt: Date;
  createdBy: string;
}

/**
 * Character reference at project level
 */
export interface ProjectCharacterReference {
  characterId: string;
  characterName: string;
  referenceImages: ReferenceImage[];
  variations: ReferenceImage[];
  defaultPose?: string;
  emotionRange: string[];
}

/**
 * Environment reference at project level
 */
export interface ProjectEnvironmentReference {
  locationId: string;
  locationName: string;
  referenceImages: ReferenceImage[];
  timeOfDayVariations: ReferenceImage[];
}

/**
 * Style profile for consistent visual output
 */
export interface StyleProfile {
  id: string;
  name: string;
  description: string;
  type: 'cinematic' | 'anime' | 'photorealistic' | 'illustration' | 'custom';
  
  // Visual parameters
  colorPalette: string[];
  lightingStyle: string;
  compositionStyle: string;
  mood: string[];
  
  // Generation parameters
  generationPreset: string;
  defaultParams: Record<string, any>;
  
  // Reference images
  referenceImages: ReferenceImage[];
  
  // Applied to
  appliedTo: string[]; // Shot IDs or Sequence IDs
}

/**
 * Sequence Reference Sheet - Sequence-level references
 */
export interface SequenceReferenceSheet {
  id: string;
  sequencePlanId: string;
  version: number;
  
  // Inherited from master
  inheritedCharacterReferences: string[]; // Reference IDs
  inheritedEnvironmentReferences: string[];
  inheritedStyleProfiles: string[];
  
  // Sequence-specific
  sequenceCharacterReferences: SequenceCharacterReference[];
  sequenceEnvironmentReferences: SequenceEnvironmentReference[];
  sequenceShotReferences: SequenceShotReference[];
  
  // Continuity frames
  continuityFrames: ContinuityFrame[];
  
  // Metadata
  createdAt: Date;
  modifiedAt: Date;
}

/**
 * Character reference specific to a sequence
 */
export interface SequenceCharacterReference {
  characterId: string;
  appearanceChanges: AppearanceChange[];
  emotionalArc: EmotionArc[];
}

/**
 * Appearance change tracking
 */
export interface AppearanceChange {
  shotId: string;
  description: string;
  referenceImage?: ReferenceImage;
}

/**
 * Emotional arc for character in sequence
 */
export interface EmotionArc {
  shotId: string;
  emotion: string;
  intensity: number;
  referenceImage?: ReferenceImage;
}

/**
 * Shot reference for sequence
 */
export interface SequenceShotReference {
  shotId: string;
  type: ShotReferenceType;
  referenceImage: ReferenceImage;
  keyframeReferences: ReferenceImage[];
  videoReference?: ReferenceImage;
}

/**
 * Shot reference type
 */
export type ShotReferenceType = 
  | 'establishing' 
  | 'action' 
  | 'dialogue' 
  | 'reaction' 
  | 'insert' 
  | 'transition';

/**
 * Continuity frame for seamless transitions
 */
export interface ContinuityFrame {
  id: string;
  shotId: string; // End frame of this shot
  nextShotId: string; // Start frame of next shot
  frameType: 'shared' | 'transition';
  referenceImage: ReferenceImage;
  transitionDescription?: string;
}

/**
 * Comment-driven generation task
 */
export interface CommentDrivenTask {
  id: string;
  shotId: string;
  comment: string;
  intent: CommentIntent;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: GenerationResult;
  createdAt: Date;
  completedAt?: Date;
}

/**
 * Interpreted comment intent
 */
export interface CommentIntent {
  type: 'modify' | 'regenerate' | 'refine' | 'add' | 'remove';
  target: string; // Element to modify
  description: string;
  suggestedParams?: Record<string, any>;
  confidence: number;
}

/**
 * Generation result from comment
 */
export interface GenerationResult {
  assetType: 'image' | 'video' | 'audio';
  assetUrl: string;
  quality: 'better' | 'same' | 'worse';
  feedback?: string;
}
```

##### 4.1.2 `workflow.ts` - Workflow Types

```typescript
// Location: creative-studio-ui/src/types/workflow.ts

/**
 * Generation path strategy
 */
export interface GenerationPathStrategy {
  id: string;
  name: string;
  description: string;
  type: 'multi-shot' | 'one-shot' | 'continuous';
  
  // Steps in the path
  steps: GenerationStep[];
  
  // Configuration
  config: GenerationPathConfig;
  
  // When to use
  useCases: string[];
}

/**
 * Generation step in the path
 */
export interface GenerationStep {
  order: number;
  name: string;
  type: 'text-to-image' | 'image-to-image' | 'first-frame-to-video' | 'first-last-frame-to-video';
  
  // Input sources
  inputSources: InputSource[];
  
  // Output specification
  outputSpec: OutputSpecification;
  
  // Parameters
  parameters: Record<string, any>;
  
  // Next step conditions
  conditions?: StepCondition[];
}

/**
 * Input source for generation step
 */
export interface InputSource {
  type: 'prompt' | 'reference' | 'previous-output' | 'uploaded';
  sourceId?: string;
  required: boolean;
  priority: number;
}

/**
 * Output specification
 */
export interface OutputSpecification {
  type: 'image' | 'video';
  format: string;
  dimensions?: { width: number; height: number };
  duration?: number;
}

/**
 * Condition for proceeding to next step
 */
export interface StepCondition {
  type: 'quality' | 'manual-approval' | 'auto-progress';
  threshold?: number;
}

/**
 * Video replication request
 */
export interface ReplicationRequest {
  id: string;
  sourceVideoUrl: string;
  targetStyle?: StyleProfile;
  modifications?: ReplicationModification[];
  outputCount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  results: ReplicationResult[];
  createdAt: Date;
  completedAt?: Date;
}

/**
 * Modification for replication
 */
export interface ReplicationModification {
  type: 'character-replace' | 'environment-change' | 'action-modify' | 'style-transfer';
  parameters: Record<string, any>;
}

/**
 * Result of replication
 */
export interface ReplicationResult {
  id: string;
  videoUrl: string;
  thumbnailUrl: string;
  fidelity: number;
  modificationsApplied: string[];
}

/**
 * Project management - Start New Project from Here
 */
export interface ProjectBranchPoint {
  id: string;
  projectId: string;
  nodeId: string; // Shot ID or Sequence ID
  timestamp: Date;
  snapshot: ProjectSnapshot;
}

/**
 * Project snapshot at branch point
 */
export interface ProjectSnapshot {
  projectData: Record<string, any>;
  storyData: Record<string, any>;
  sequenceData: Record<string, any>;
  characterData: Record<string, any>;
  worldData: Record<string, any>;
  referenceSheets: {
    master: MasterReferenceSheet;
    sequences: SequenceReferenceSheet[];
  };
}

/**
 * One-Shot / Continuous Take Workflow
 */
export interface ContinuousTakeWorkflow {
  id: string;
  projectId: string;
  
  // Workflow settings
  mode: 'first-last-frame' | 'interpolated' | 'direct';
  
  // Shot chain
  shots: ContinuousShot[];
  
  // Continuity settings
  continuityStrategy: 'frame-sharing' | 'style-matching' | 'character-tracking';
  
  // Result
  outputUrl?: string;
  status: 'draft' | 'processing' | 'completed';
}

/**
 * Shot in continuous take workflow
 */
export interface ContinuousShot {
  shotId: string;
  order: number;
  startFrame?: ReferenceImage;
  endFrame?: ReferenceImage;
  transitionToNext?: TransitionConfig;
}

/**
 * Transition configuration for continuous take
 */
export interface TransitionConfig {
  type: 'cut' | 'dissolve' | 'wipe' | 'morph';
  duration: number;
  parameters?: Record<string, any>;
}
```

#### 1.2 New Services

##### 4.1.3 `ReferenceInheritanceService`

```typescript
// Location: creative-studio-ui/src/services/referenceInheritanceService.ts

import { EventEmitter } from 'events';
import type {
  MasterReferenceSheet,
  SequenceReferenceSheet,
  ReferenceImage,
  StyleProfile
} from '@/types/reference';

/**
 * Service for managing reference inheritance between levels
 * Project → Sequence → Shot
 */
export class ReferenceInheritanceService extends EventEmitter {
  private masterReferenceSheet: MasterReferenceSheet | null = null;
  private sequenceReferenceSheets: Map<string, SequenceReferenceSheet> = new Map();
  
  /**
   * Get master reference sheet for project
   */
  getMasterReferenceSheet(projectId: string): MasterReferenceSheet | null {
    return this.masterReferenceSheet;
  }
  
  /**
   * Set master reference sheet
   */
  setMasterReferenceSheet(sheet: MasterReferenceSheet): void {
    this.masterReferenceSheet = sheet;
    this.emit('masterReferenceUpdated', sheet);
  }
  
  /**
   * Get references inherited by a sequence from project
   */
  getInheritedReferences(sequenceId: string): {
    characters: ReferenceImage[];
    environments: ReferenceImage[];
    styles: StyleProfile[];
  } {
    const sequenceSheet = this.sequenceReferenceSheets.get(sequenceId);
    if (!sequenceSheet || !this.masterReferenceSheet) {
      return { characters: [], environments: [], styles: [] };
    }
    
    return {
      characters: sequenceSheet.inheritedCharacterReferences
        .map(id => this.findReferenceImage(id))
        .filter(Boolean),
      environments: sequenceSheet.inheritedEnvironmentReferences
        .map(id => this.findReferenceImage(id))
        .filter(Boolean),
      styles: sequenceSheet.inheritedStyleProfiles
        .map(id => this.masterReferenceSheet?.styleProfiles?.find(s => s.id === id))
        .filter(Boolean)
    };
  }
  
  /**
   * Inherit references from project to sequence
   */
  async inheritToSequence(
    sequenceId: string,
    referenceIds: {
      characterIds: string[];
      environmentIds: string[];
      styleIds: string[];
    }
  ): Promise<void> {
    const sequenceSheet = this.sequenceReferenceSheets.get(sequenceId);
    if (!sequenceSheet) {
      throw new Error(`Sequence ${sequenceId} not found`);
    }
    
    sequenceSheet.inheritedCharacterReferences = referenceIds.characterIds;
    sequenceSheet.inheritedEnvironmentReferences = referenceIds.environmentIds;
    sequenceSheet.inheritedStyleProfiles = referenceIds.styleIds;
    
    this.emit('sequenceReferencesUpdated', { sequenceId, sequenceSheet });
  }
  
  /**
   * Get references for a shot (inherited + shot-specific)
   */
  getShotReferences(shotId: string): {
    inherited: ReferenceImage[];
    shotSpecific: ReferenceImage[];
  } {
    // Implementation
    return { inherited: [], shotSpecific: [] };
  }
  
  /**
   * Propagate changes up the hierarchy
   */
  async propagateChange(
    level: 'project' | 'sequence' | 'shot',
    referenceId: string,
    changes: Partial<ReferenceImage>
  ): Promise<void> {
    // Implementation
  }
  
  private findReferenceImage(id: string): ReferenceImage | null {
    // Implementation
    return null;
  }
}

export const referenceInheritanceService = new ReferenceInheritanceService();
```

##### 4.1.4 `ConsistencyEngine`

```typescript
// Location: creative-studio-ui/src/services/consistencyEngine.ts

import type {
  ReferenceImage,
  StyleProfile,
  ContinuityFrame
} from '@/types/reference';
import type { Shot, ProductionShot } from '@/types/shot';

/**
 * Service for checking and maintaining visual consistency
 */
export class ConsistencyEngine {
  /**
   * Check consistency between shots
   */
  async checkShotConsistency(
    shotId1: string,
    shotId2: string
  ): Promise<ConsistencyReport> {
    // Implementation
    return {
      score: 0,
      issues: [],
      suggestions: []
    };
  }
  
  /**
   * Check character consistency across shots
   */
  async checkCharacterConsistency(
    characterId: string,
    shotIds: string[]
  ): Promise<ConsistencyReport> {
    // Implementation
    return {
      score: 0,
      issues: [],
      suggestions: []
    };
  }
  
  /**
   * Check environment consistency
   */
  async checkEnvironmentConsistency(
    locationId: string,
    shotIds: string[]
  ): Promise<ConsistencyReport> {
    // Implementation
    return {
      score: 0,
      issues: [],
      suggestions: []
    };
  }
  
  /**
   * Suggest reference images for a shot
   */
  async suggestReferences(
    shot: ProductionShot,
    context: {
      previousShot?: ProductionShot;
      nextShot?: ProductionShot;
      sequenceId: string;
    }
  ): Promise<ReferenceImage[]> {
    // Implementation
    return [];
  }
  
  /**
   * Generate continuity suggestions
   */
  async generateContinuitySuggestions(
    shots: ProductionShot[]
  ): Promise<ContinuitySuggestion[]> {
    // Implementation
    return [];
  }
  
  /**
   * Validate style profile application
   */
  async validateStyleApplication(
    styleProfile: StyleProfile,
    shot: ProductionShot
  ): Promise<StyleValidationResult> {
    // Implementation
    return {
      valid: true,
      warnings: [],
      requiredAdjustments: []
    };
  }
}

/**
 * Consistency report
 */
export interface ConsistencyReport {
  score: number; // 0-100
  issues: ConsistencyIssue[];
  suggestions: string[];
}

/**
 * Consistency issue
 */
export interface ConsistencyIssue {
  type: 'character' | 'environment' | 'lighting' | 'camera' | 'style';
  severity: 'low' | 'medium' | 'high';
  description: string;
  affectedShotIds: string[];
  suggestedFix?: string;
}

/**
 * Continuity suggestion
 */
export interface ContinuitySuggestion {
  type: 'frame-sharing' | 'style-matching' | 'lighting-match';
  fromShotId: string;
  toShotId: string;
  suggestion: string;
  priority: number;
}

/**
 * Style validation result
 */
export interface StyleValidationResult {
  valid: boolean;
  warnings: string[];
  requiredAdjustments: string[];
}

export const consistencyEngine = new ConsistencyEngine();
```

##### 4.1.5 `StyleTransferService`

```typescript
// Location: creative-studio-ui/src/services/styleTransferService.ts

import type { StyleProfile, ReferenceImage } from '@/types/reference';
import type { GenerationParams } from '@/types/generation';

/**
 * Service for transferring styles between images and shots
 */
export class StyleTransferService {
  /**
   * Extract style from reference images
   */
  async extractStyle(
    referenceImages: ReferenceImage[]
  ): Promise<ExtractedStyle> {
    // Implementation using ComfyUI or other style extraction
    return {
      colorPalette: [],
      lightingCharacteristics: [],
      compositionPatterns: [],
      textureCharacteristics: []
    };
  }
  
  /**
   * Apply style profile to generation
   */
  async applyStyleToGeneration(
    styleProfile: StyleProfile,
    basePrompt: string,
    generationParams: GenerationParams
  ): Promise<GenerationParams> {
    // Implementation
    return generationParams;
  }
  
  /**
   * Transfer style from one image to another
   */
  async transferStyle(
    sourceImageUrl: string,
    targetImageUrl: string,
    options: StyleTransferOptions
  ): Promise<string> {
    // Implementation
    return '';
  }
  
  /**
   * Create style profile from reference collection
   */
  async createStyleProfile(
    name: string,
    description: string,
    referenceImages: ReferenceImage[]
  ): Promise<StyleProfile> {
    // Implementation
    return {
      id: '',
      name,
      description,
      type: 'custom',
      colorPalette: [],
      lightingStyle: '',
      compositionStyle: '',
      mood: [],
      generationPreset: '',
      defaultParams: {},
      referenceImages: [],
      appliedTo: []
    };
  }
}

/**
 * Extracted style characteristics
 */
export interface ExtractedStyle {
  colorPalette: string[];
  lightingCharacteristics: string[];
  compositionPatterns: string[];
  textureCharacteristics: string[];
}

/**
 * Style transfer options
 */
export interface StyleTransferOptions {
  strength: number; // 0-1
  preserveContent: boolean;
  preserveStructure: boolean;
}

export const styleTransferService = new StyleTransferService();
```

##### 4.1.6 `CommentDrivenGenerationService`

```typescript
// Location: creative-studio-ui/src/services/commentDrivenGenerationService.ts

import type { CommentDrivenTask, CommentIntent, GenerationResult } from '@/types/reference';
import type { Shot } from '@/types/shot';

/**
 * Service for comment-driven generation workflows
 */
export class CommentDrivenGenerationService {
  private pendingTasks: Map<string, CommentDrivenTask> = new Map();
  
  /**
   * Create a comment-driven generation task
   */
  async createTask(
    shotId: string,
    comment: string
  ): Promise<CommentDrivenTask> {
    // Parse comment to intent
    const intent = await this.parseCommentIntent(comment, shotId);
    
    const task: CommentDrivenTask = {
      id: crypto.randomUUID(),
      shotId,
      comment,
      intent,
      status: 'pending',
      createdAt: new Date()
    };
    
    this.pendingTasks.set(task.id, task);
    return task;
  }
  
  /**
   * Parse comment to understand user intent
   */
  async parseCommentIntent(
    comment: string,
    shotId: string
  ): Promise<CommentIntent> {
    // Implementation using LLM to interpret comment
    return {
      type: 'modify',
      target: '',
      description: comment,
      confidence: 0.9
    };
  }
  
  /**
   * Process a comment-driven task
   */
  async processTask(taskId: string): Promise<GenerationResult> {
    const task = this.pendingTasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }
    
    task.status = 'processing';
    
    try {
      // Execute generation based on intent
      const result = await this.executeGeneration(task);
      
      task.status = 'completed';
      task.result = result;
      task.completedAt = new Date();
      
      return result;
    } catch (error) {
      task.status = 'failed';
      throw error;
    }
  }
  
  /**
   * Execute generation based on intent
   */
  private async executeGeneration(task: CommentDrivenTask): Promise<GenerationResult> {
    // Implementation
    return {
      assetType: 'image',
      assetUrl: '',
      quality: 'same'
    };
  }
  
  /**
   * Get pending tasks
   */
  getPendingTasks(): CommentDrivenTask[] {
    return Array.from(this.pendingTasks.values())
      .filter(t => t.status === 'pending' || t.status === 'processing');
  }
  
  /**
   * Cancel a task
   */
  async cancelTask(taskId: string): Promise<void> {
    const task = this.pendingTasks.get(taskId);
    if (task && task.status === 'pending') {
      this.pendingTasks.delete(taskId);
    }
  }
}

export const commentDrivenGenerationService = new CommentDrivenGenerationService();
```

##### 4.1.7 `VideoReplicationService`

```typescript
// Location: creative-studio-ui/src/services/videoReplicationService.ts

import type {
  ReplicationRequest,
  ReplicationResult,
  ReplicationModification
} from '@/types/workflow';

/**
 * Service for video replication workflows
 */
export class VideoReplicationService {
  /**
   * Upload and analyze source video
   */
  async analyzeSourceVideo(videoUrl: string): Promise<VideoAnalysis> {
    // Implementation - extract frames, analyze content
    return {
      frameCount: 0,
      duration: 0,
      keyFrames: [],
      detectedElements: []
    };
  }
  
  /**
   * Create replication request
   */
  async createReplicationRequest(
    sourceVideoUrl: string,
    options: ReplicationOptions
  ): Promise<ReplicationRequest> {
    return {
      id: crypto.randomUUID(),
      sourceVideoUrl,
      targetStyle: options.styleProfile,
      modifications: options.modifications,
      outputCount: options.outputCount || 1,
      status: 'pending',
      results: [],
      createdAt: new Date()
    };
  }
  
  /**
   * Process replication request
   */
  async processReplication(requestId: string): Promise<void> {
    // Implementation
  }
  
  /**
   * Apply modifications to replicated video
   */
  async applyModification(
    resultId: string,
    modification: ReplicationModification
  ): Promise<ReplicationResult> {
    // Implementation
    return {
      id: '',
      videoUrl: '',
      thumbnailUrl: '',
      fidelity: 0,
      modificationsApplied: []
    };
  }
}

/**
 * Video analysis result
 */
export interface VideoAnalysis {
  frameCount: number;
  duration: number;
  keyFrames: string[];
  detectedElements: DetectedElement[];
}

/**
 * Detected element in video
 */
export interface DetectedElement {
  type: 'character' | 'environment' | 'action' | 'object';
  boundingBox?: { x: number; y: number; width: number; height: number };
  confidence: number;
  label: string;
}

/**
 * Replication options
 */
export interface ReplicationOptions {
  styleProfile?: any;
  modifications?: ReplicationModification[];
  outputCount?: number;
}

export const videoReplicationService = new VideoReplicationService();
```

#### 1.3 State Management

##### 4.1.8 Reference Store (Zustand)

```typescript
// Location: creative-studio-ui/src/stores/referenceStore.ts

import { create } from 'zustand';
import type {
  MasterReferenceSheet,
  SequenceReferenceSheet,
  ReferenceImage,
  StyleProfile
} from '@/types/reference';

interface ReferenceState {
  // Master reference sheet
  masterReferenceSheet: MasterReferenceSheet | null;
  setMasterReferenceSheet: (sheet: MasterReferenceSheet) => void;
  
  // Sequence reference sheets
  sequenceReferenceSheets: Map<string, SequenceReferenceSheet>;
  setSequenceReferenceSheet: (sequenceId: string, sheet: SequenceReferenceSheet) => void;
  
  // Style profiles
  styleProfiles: StyleProfile[];
  addStyleProfile: (profile: StyleProfile) => void;
  updateStyleProfile: (id: string, updates: Partial<StyleProfile>) => void;
  deleteStyleProfile: (id: string) => void;
  
  // Selected references
  selectedReferenceIds: string[];
  setSelectedReferences: (ids: string[]) => void;
  
  // UI state
  activeReferenceLevel: 'project' | 'sequence' | 'shot';
  setActiveReferenceLevel: (level: 'project' | 'sequence' | 'shot') => void;
  
  // Actions
  loadProjectReferences: (projectId: string) => Promise<void>;
  saveReferenceSheet: (sheet: MasterReferenceSheet | SequenceReferenceSheet) => Promise<void>;
}

export const useReferenceStore = create<ReferenceState>((set, get) => ({
  masterReferenceSheet: null,
  sequenceReferenceSheets: new Map(),
  styleProfiles: [],
  selectedReferenceIds: [],
  activeReferenceLevel: 'project',
  
  setMasterReferenceSheet: (sheet) => {
    set({ masterReferenceSheet: sheet });
  },
  
  setSequenceReferenceSheet: (sequenceId, sheet) => {
    const sheets = new Map(get().sequenceReferenceSheets);
    sheets.set(sequenceId, sheet);
    set({ sequenceReferenceSheets: sheets });
  },
  
  addStyleProfile: (profile) => {
    set((state) => ({
      styleProfiles: [...state.styleProfiles, profile]
    }));
  },
  
  updateStyleProfile: (id, updates) => {
    set((state) => ({
      styleProfiles: state.styleProfiles.map(p =>
        p.id === id ? { ...p, ...updates } : p
      )
    }));
  },
  
  deleteStyleProfile: (id) => {
    set((state) => ({
      styleProfiles: state.styleProfiles.filter(p => p.id !== id)
    }));
  },
  
  setSelectedReferences: (ids) => {
    set({ selectedReferenceIds: ids });
  },
  
  setActiveReferenceLevel: (level) => {
    set({ activeReferenceLevel: level });
  },
  
  loadProjectReferences: async (projectId) => {
    // Implementation
  },
  
  saveReferenceSheet: async (sheet) => {
    // Implementation
  }
}));
```

#### 1.4 Deliverables for Phase 1

| Deliverable | File Path | Status |
|-------------|-----------|--------|
| Reference Types | `src/types/reference.ts` | ⏳ Pending |
| Workflow Types | `src/types/workflow.ts` | ⏳ Pending |
| ReferenceInheritanceService | `src/services/referenceInheritanceService.ts` | ⏳ Pending |
| ConsistencyEngine | `src/services/consistencyEngine.ts` | ⏳ Pending |
| StyleTransferService | `src/services/styleTransferService.ts` | ⏳ Pending |
| CommentDrivenGenerationService | `src/services/commentDrivenGenerationService.ts` | ⏳ Pending |
| VideoReplicationService | `src/services/videoReplicationService.ts` | ⏳ Pending |
| Reference Store | `src/stores/referenceStore.ts` | ⏳ Pending |

---

### Phase 2: Sequence Integration

**Duration:** 2-3 weeks  
**Objective:** Implement sequence-level reference management and integration with existing sequence planning.

#### 2.1 UI Components

##### 4.2.1 SequenceReferenceSheet Component

```typescript
// Location: creative-studio-ui/src/components/reference/SequenceReferenceSheet.tsx

import React, { useState, useEffect } from 'react';
import { useReferenceStore } from '@/stores/referenceStore';
import { referenceInheritanceService } from '@/services/referenceInheritanceService';
import type { SequenceReferenceSheet, ReferenceImage } from '@/types/reference';

interface SequenceReferenceSheetProps {
  sequenceId: string;
  onClose: () => void;
}

export const SequenceReferenceSheet: React.FC<SequenceReferenceSheetProps> = ({
  sequenceId,
  onClose
}) => {
  const { sequenceReferenceSheets, setSequenceReferenceSheet } = useReferenceStore();
  const [activeTab, setActiveTab] = useState<'characters' | 'environments' | 'shots' | 'continuity'>('characters');
  
  const sheet = sequenceReferenceSheets.get(sequenceId);
  
  const handleInheritFromProject = async () => {
    const inherited = await referenceInheritanceService.getInheritedReferences(sequenceId);
    // Update sheet with inherited references
  };
  
  const handleAddShotReference = (shotId: string, reference: ReferenceImage) => {
    if (!sheet) return;
    
    const updatedSheet = {
      ...sheet,
      sequenceShotReferences: [
        ...sheet.sequenceShotReferences,
        { shotId, type: 'establishing', referenceImage: reference, keyframeReferences: [] }
      ]
    };
    
    setSequenceReferenceSheet(sequenceId, updatedSheet);
  };
  
  return (
    <div className="sequence-reference-sheet">
      <div className="sheet-header">
        <h2>Sequence Reference Sheet</h2>
        <button onClick={onClose}>Close</button>
      </div>
      
      <div className="inheritance-bar">
        <button onClick={handleInheritFromProject}>
          Inherit from Project
        </button>
      </div>
      
      <div className="tabs">
        <button onClick={() => setActiveTab('characters')}>Characters</button>
        <button onClick={() => setActiveTab('environments')}>Environments</button>
        <button onClick={() => setActiveTab('shots')}>Shot References</button>
        <button onClick={() => setActiveTab('continuity')}>Continuity</button>
      </div>
      
      <div className="tab-content">
        {activeTab === 'characters' && (
          <CharacterReferencesTab sheet={sheet} onAdd={handleAddShotReference} />
        )}
        {activeTab === 'environments' && (
          <EnvironmentReferencesTab sheet={sheet} />
        )}
        {activeTab === 'shots' && (
          <ShotReferencesTab sheet={sheet} />
        )}
        {activeTab === 'continuity' && (
          <ContinuityTab sheet={sheet} />
        )}
      </div>
    </div>
  );
};
```

##### 4.2.2 MasterReferenceSheet Component

```typescript
// Location: creative-studio-ui/src/components/reference/MasterReferenceSheet.tsx

import React, { useState, useEffect } from 'react';
import { useReferenceStore } from '@/stores/referenceStore';
import type { MasterReferenceSheet, StyleProfile } from '@/types/reference';

interface MasterReferenceSheetProps {
  projectId: string;
  onClose: () => void;
}

export const MasterReferenceSheet: React.FC<MasterReferenceSheetProps> = ({
  projectId,
  onClose
}) => {
  const { masterReferenceSheet, setMasterReferenceSheet, styleProfiles, addStyleProfile } = useReferenceStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'characters' | 'environments' | 'styles'>('overview');
  const [showStyleEditor, setShowStyleEditor] = useState(false);
  
  useEffect(() => {
    if (!masterReferenceSheet) {
      // Load or create master reference sheet
    }
  }, [projectId]);
  
  const handleAddStyleProfile = (profile: StyleProfile) => {
    addStyleProfile(profile);
  };
  
  return (
    <div className="master-reference-sheet modal-large">
      <div className="sheet-header">
        <h1>Master Reference Sheet</h1>
        <div className="header-actions">
          <button onClick={() => setShowStyleEditor(true)}>
            Create Style Profile
          </button>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
      
      <div className="overview-section">
        <div className="key-elements-preview">
          <h3>Key Visual Elements</h3>
          <div className="preview-grid">
            {masterReferenceSheet?.keyCharacterImages.map(img => (
              <img key={img.id} src={img.url} alt="Character reference" />
            ))}
          </div>
        </div>
        
        <div className="storyboard-preview">
          <h3>Storyboard Preview</h3>
          <div className="preview-strip">
            {/* Storyboard preview */}
          </div>
        </div>
      </div>
      
      <div className="tabs">
        <button onClick={() => setActiveTab('overview')}>Overview</button>
        <button onClick={() => setActiveTab('characters')}>Characters</button>
        <button onClick={() => setActiveTab('environments')}>Environments</button>
        <button onClick={() => setActiveTab('styles')}>Style Profiles</button>
      </div>
      
      <div className="tab-content">
        {/* Tab content implementations */}
      </div>
      
      {showStyleEditor && (
        <StyleProfileEditor
          onSave={handleAddStyleProfile}
          onClose={() => setShowStyleEditor(false)}
        />
      )}
    </div>
  );
};
```

#### 2.2 Sequence Integration Points

##### 4.2.3 Enhanced SequencePlanService

```typescript
// Location: creative-studio-ui/src/services/sequencePlanService.ts (enhanced)

import { referenceInheritanceService } from './referenceInheritanceService';
import { consistencyEngine } from './consistencyEngine';

export interface SequencePlan {
  id: string;
  name: string;
  description: string;
  
  // Reference sheet
  referenceSheetId?: string;
  
  // ... existing fields
}

/**
 * Enhanced sequence plan service with reference integration
 */
export class EnhancedSequencePlanService {
  /**
   * Create sequence with reference sheet
   */
  async createSequenceWithReferences(
    plan: Partial<SequencePlan>,
    projectReferences: {
      characterIds: string[];
      environmentIds: string[];
      styleIds: string[];
    }
  ): Promise<SequencePlan> {
    // Create sequence plan
    const sequence = await this.create(plan);
    
    // Create reference sheet
    const referenceSheet: SequenceReferenceSheet = {
      id: crypto.randomUUID(),
      sequencePlanId: sequence.id,
      version: 1,
      inheritedCharacterReferences: projectReferences.characterIds,
      inheritedEnvironmentReferences: projectReferences.environmentIds,
      inheritedStyleProfiles: projectReferences.styleIds,
      sequenceCharacterReferences: [],
      sequenceEnvironmentReferences: [],
      sequenceShotReferences: [],
      continuityFrames: [],
      createdAt: new Date(),
      modifiedAt: new Date()
    };
    
    // Save reference sheet
    referenceInheritanceService.setSequenceReferenceSheet(sequence.id, referenceSheet);
    
    return sequence;
  }
  
  /**
   * Add shot with automatic reference suggestions
   */
  async addShotWithReferences(
    sequenceId: string,
    shotData: Partial<ProductionShot>
  ): Promise<ProductionShot> {
    // Get sequence context
    const sequence = await this.get(sequenceId);
    
    // Get previous and next shot for context
    const previousShot = sequence.shots[sequence.shots.length - 1];
    
    // Get reference suggestions
    const suggestions = await consistencyEngine.suggestReferences(
      shotData as ProductionShot,
      {
        previousShot,
        sequenceId
      }
    );
    
    // Create shot with references
    const shot = await this.addShot(sequenceId, {
      ...shotData,
      references: suggestions
    });
    
    return shot;
  }
  
  /**
   * Check sequence consistency
   */
  async checkSequenceConsistency(sequenceId: string): Promise<ConsistencyReport> {
    const sequence = await this.get(sequenceId);
    return consistencyEngine.checkShotConsistency(
      sequence.shots[0]?.id,
      sequence.shots[sequence.shots.length - 1]?.id
    );
  }
}
```

#### 2.3 Deliverables for Phase 2

| Deliverable | File Path | Status |
|-------------|-----------|--------|
| SequenceReferenceSheet Component | `src/components/reference/SequenceReferenceSheet.tsx` | ⏳ Pending |
| MasterReferenceSheet Component | `src/components/reference/MasterReferenceSheet.tsx` | ⏳ Pending |
| StyleProfileEditor Component | `src/components/reference/StyleProfileEditor.tsx` | ⏳ Pending |
| Enhanced SequencePlanService | `src/services/sequencePlanService.ts` | ⏳ Pending |
| Reference Integration Tests | `src/__tests__/reference/` | ⏳ Pending |

---

### Phase 3: Shot Enhancement

**Duration:** 2-3 weeks  
**Objective:** Implement shot-level reference management, manual editing, and comment-driven generation UI.

#### 3.1 UI Components

##### 4.3.1 Enhanced StoryboardCanvas with References

```typescript
// Location: creative-studio-ui/src/components/StoryboardCanvas.tsx (enhanced)

import React, { useState, useCallback } from 'react';
import { useReferenceStore } from '@/stores/referenceStore';
import { commentDrivenGenerationService } from '@/services/commentDrivenGenerationService';
import type { Shot, ProductionShot } from '@/types/shot';
import type { ReferenceImage, CommentDrivenTask } from '@/types/reference';

interface StoryboardCanvasProps {
  projectId: string;
  onShotSelect: (shotId: string) => void;
}

export const StoryboardCanvas: React.FC<StoryboardCanvasProps> = ({
  projectId,
  onShotSelect
}) => {
  const {
    selectedReferenceIds,
    setSelectedReferences,
    activeReferenceLevel
  } = useReferenceStore();
  
  const [editingShot, setEditingShot] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState('');
  const [pendingTasks, setPendingTasks] = useState<CommentDrivenTask[]>([]);
  
  const handleAddComment = async (shotId: string, comment: string) => {
    const task = await commentDrivenGenerationService.createTask(shotId, comment);
    setPendingTasks([...pendingTasks, task]);
    setCommentInput('');
  };
  
  const handleReferenceDrop = useCallback((shotId: string, references: ReferenceImage[]) => {
    // Apply references to shot
    updateShotReferences(shotId, references);
  }, []);
  
  const handleManualEdit = (shotId: string) => {
    setEditingShot(shotId);
  };
  
  return (
    <div className="storyboard-canvas">
      <div className="canvas-toolbar">
        <button onClick={() => setActiveReferenceLevel('project')}>
          Project References
        </button>
        <button onClick={() => setActiveReferenceLevel('sequence')}>
          Sequence References
        </button>
        <button onClick={() => setActiveReferenceLevel('shot')}>
          Shot References
        </button>
      </div>
      
      <div className="canvas-main">
        <div className="reference-panel">
          <ReferencePanel
            level={activeReferenceLevel}
            selectedIds={selectedReferenceIds}
            onSelect={setSelectedReferences}
            onDrop={(refs) => handleReferenceDrop(editingShot || '', refs)}
          />
        </div>
        
        <div className="storyboard-grid">
          <ShotGrid
            onShotSelect={onShotSelect}
            onEdit={handleManualEdit}
            onAddReference={handleReferenceDrop}
          />
        </div>
        
        <div className="comment-panel">
          <CommentInput
            value={commentInput}
            onChange={setCommentInput}
            onSubmit={() => editingShot && handleAddComment(editingShot, commentInput)}
          />
          <TaskList
            tasks={pendingTasks}
            onTaskComplete={(task) => {
              setPendingTasks(pendingTasks.filter(t => t.id !== task.id));
            }}
          />
        </div>
      </div>
      
      {editingShot && (
        <ManualEditModal
          shotId={editingShot}
          onClose={() => setEditingShot(null)}
        />
      )}
    </div>
  );
};
```

##### 4.3.2 ManualStoryboardEditor Component

```typescript
// Location: creative-studio-ui/src/components/ManualStoryboardEditor.tsx

import React, { useState } from 'react';
import type { ProductionShot } from '@/types/shot';
import type { ReferenceImage, StyleProfile } from '@/types/reference';

interface ManualStoryboardEditorProps {
  shot: ProductionShot;
  availableReferences: ReferenceImage[];
  availableStyles: StyleProfile[];
  onSave: (shot: ProductionShot) => void;
  onCancel: () => void;
}

export const ManualStoryboardEditor: React.FC<ManualStoryboardEditorProps> = ({
  shot,
  availableReferences,
  availableStyles,
  onSave,
  onCancel
}) => {
  const [editedShot, setEditedShot] = useState<ProductionShot>(shot);
  const [activeTab, setActiveTab] = useState<'generation' | 'references' | 'style'>('generation');
  
  const handleGenerationParamChange = (key: string, value: any) => {
    setEditedShot({
      ...editedShot,
      generation: {
        ...editedShot.generation,
        [key]: value
      }
    });
  };
  
  const handleReferenceToggle = (refId: string) => {
    const currentRefs = editedShot.generation.styleReferences;
    const newRefs = currentRefs.includes(refId)
      ? currentRefs.filter(id => id !== refId)
      : [...currentRefs, refId];
    
    handleGenerationParamChange('styleReferences', newRefs);
  };
  
  const handleStyleApply = (style: StyleProfile) => {
    setEditedShot({
      ...editedShot,
      generation: {
        ...editedShot.generation,
        comfyuiPreset: style.generationPreset,
        parameters: {
          ...editedShot.generation.parameters,
          ...style.defaultParams
        }
      }
    });
  };
  
  return (
    <div className="manual-storyboard-editor modal-large">
      <div className="editor-header">
        <h2>Manual Storyboard Editing - Shot {shot.number}</h2>
        <div className="header-actions">
          <button onClick={() => onSave(editedShot)}>Save Changes</button>
          <button onClick={onCancel}>Cancel</button>
        </div>
      </div>
      
      <div className="editor-tabs">
        <button onClick={() => setActiveTab('generation')}>Generation Settings</button>
        <button onClick={() => setActiveTab('references')}>References</button>
        <button onClick={() => setActiveTab('style')}>Style</button>
      </div>
      
      <div className="editor-content">
        {activeTab === 'generation' && (
          <div className="generation-settings">
            <section>
              <h3>AI Provider & Model</h3>
              <select
                value={editedShot.generation.aiProvider}
                onChange={(e) => handleGenerationParamChange('aiProvider', e.target.value)}
              >
                <option value="comfyui">ComfyUI</option>
                <option value="custom">Custom</option>
              </select>
              
              <select
                value={editedShot.generation.model}
                onChange={(e) => handleGenerationParamChange('model', e.target.value)}
              >
                <option value="sdxl">SDXL</option>
                <option value="sd15">SD 1.5</option>
                <option value="flux">Flux</option>
              </select>
            </section>
            
            <section>
              <h3>Prompt</h3>
              <textarea
                value={editedShot.generation.prompt}
                onChange={(e) => handleGenerationParamChange('prompt', e.target.value)}
                rows={4}
              />
            </section>
            
            <section>
              <h3>Negative Prompt</h3>
              <textarea
                value={editedShot.generation.negativePrompt}
                onChange={(e) => handleGenerationParamChange('negativePrompt', e.target.value)}
                rows={3}
              />
            </section>
            
            <section>
              <h3>Generation Mode</h3>
              <div className="mode-selector">
                <label>
                  <input
                    type="radio"
                    name="mode"
                    value="text-to-video"
                    checked={editedShot.generation.parameters.mode === 'text-to-video'}
                    onChange={() => handleGenerationParamChange('parameters.mode', 'text-to-video')}
                  />
                  Text-to-Video
                </label>
                <label>
                  <input
                    type="radio"
                    name="mode"
                    value="first-frame-to-video"
                    checked={editedShot.generation.parameters.mode === 'first-frame-to-video'}
                    onChange={() => handleGenerationParamChange('parameters.mode', 'first-frame-to-video')}
                  />
                  First-Frame-to-Video
                </label>
                <label>
                  <input
                    type="radio"
                    name="mode"
                    value="first-last-frame-to-video"
                    checked={editedShot.generation.parameters.mode === 'first-last-frame-to-video'}
                    onChange={() => handleGenerationParamChange('parameters.mode', 'first-last-frame-to-video')}
                  />
                  First-and-Last-Frame-to-Video
                </label>
              </div>
            </section>
            
            <section>
              <h3>Parameters</h3>
              <div className="param-grid">
                <label>
                  Width:
                  <input
                    type="number"
                    value={editedShot.generation.parameters.width}
                    onChange={(e) => handleGenerationParamChange('parameters.width', parseInt(e.target.value))}
                  />
                </label>
                <label>
                  Height:
                  <input
                    type="number"
                    value={editedShot.generation.parameters.height}
                    onChange={(e) => handleGenerationParamChange('parameters.height', parseInt(e.target.value))}
                  />
                </label>
                <label>
                  Steps:
                  <input
                    type="number"
                    value={editedShot.generation.parameters.steps}
                    onChange={(e) => handleGenerationParamChange('parameters.steps', parseInt(e.target.value))}
                  />
                </label>
                <label>
                  CFG Scale:
                  <input
                    type="number"
                    step="0.1"
                    value={editedShot.generation.parameters.cfgScale}
                    onChange={(e) => handleGenerationParamChange('parameters.cfgScale', parseFloat(e.target.value))}
                  />
                </label>
                <label>
                  Seed:
                  <input
                    type="number"
                    value={editedShot.generation.seed || ''}
                    onChange={(e) => handleGenerationParamChange('seed', parseInt(e.target.value))}
                  />
                </label>
              </div>
            </section>
          </div>
        )}
        
        {activeTab === 'references' && (
          <div className="references-selector">
            <h3>Select Reference Images</h3>
            <div className="reference-grid">
              {availableReferences.map(ref => (
                <div
                  key={ref.id}
                  className={`reference-item ${editedShot.generation.styleReferences.includes(ref.id) ? 'selected' : ''}`}
                  onClick={() => handleReferenceToggle(ref.id)}
                >
                  <img src={ref.thumbnailUrl || ref.url} alt={ref.type} />
                  <span className="ref-type">{ref.type}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {activeTab === 'style' && (
          <div className="style-selector">
            <h3>Apply Style Profile</h3>
            <div className="style-grid">
              {availableStyles.map(style => (
                <div
                  key={style.id}
                  className="style-item"
                  onClick={() => handleStyleApply(style)}
                >
                  <div className="style-preview">
                    {style.referenceImages.slice(0, 3).map(img => (
                      <img key={img.id} src={img.thumbnailUrl || img.url} alt="" />
                    ))}
                  </div>
                  <span className="style-name">{style.name}</span>
                  <span className="style-type">{style.type}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
```

#### 3.2 Enhanced Timeline Component

```typescript
// Location: creative-studio-ui/src/components/Timeline.tsx (enhanced)

import React, { useState, useRef, useEffect } from 'react';
import type { TimelineTrack, TimelineState } from '@/types/timeline';

interface EnhancedTimelineProps {
  tracks: TimelineTrack[];
  currentTime: number;
  duration: number;
  onTimeChange: (time: number) => void;
  onTrackUpdate: (trackId: string, updates: Partial<TimelineTrack>) => void;
  onClipEdit: (clipId: string) => void;
}

export const EnhancedTimeline: React.FC<EnhancedTimelineProps> = ({
  tracks,
  currentTime,
  duration,
  onTimeChange,
  onTrackUpdate,
  onClipEdit
}) => {
  const [zoom, setZoom] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);
  
  const handleClipClick = (clipId: string) => {
    onClipEdit(clipId);
  };
  
  const handleClipDrop = (clipId: string, newStartTime: number) => {
    onTrackUpdate(
      tracks.find(t => t.mediaId === clipId)?.id || '',
      { startTime: newStartTime }
    );
  };
  
  return (
    <div className="enhanced-timeline">
      <div className="timeline-toolbar">
        <button onClick={() => setIsPlaying(!isPlaying)}>
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <input
          type="range"
          min={0}
          max={duration}
          value={currentTime}
          onChange={(e) => onTimeChange(parseFloat(e.target.value))}
        />
        <span className="time-display">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
        <input
          type="range"
          min={0.5}
          max={4}
          step={0.1}
          value={zoom}
          onChange={(e) => setZoom(parseFloat(e.target.value))}
        />
      </div>
      
      <div className="timeline-content" ref={timelineRef}>
        <div className="time-ruler" style={{ transform: `scaleX(${zoom})` }}>
          {/* Time markers */}
        </div>
        
        <div className="tracks-container">
          {tracks.map(track => (
            <TrackRow
              key={track.id}
              track={track}
              zoom={zoom}
              currentTime={currentTime}
              onClipClick={handleClipClick}
              onClipDrop={handleClipDrop}
            />
          ))}
        </div>
      </div>
      
      <div className="timeline-footer">
        <div className="clip-actions">
          <button onClick={() => trimSelectedClip()}>Trim</button>
          <button onClick={() => splitSelectedClip()}>Split</button>
          <button onClick={() => deleteSelectedClip()}>Delete</button>
          <button onClick={() => duplicateSelectedClip()}>Duplicate</button>
        </div>
      </div>
    </div>
  );
};

const TrackRow: React.FC<{
  track: TimelineTrack;
  zoom: number;
  currentTime: number;
  onClipClick: (clipId: string) => void;
  onClipDrop: (clipId: string, time: number) => void;
}> = ({ track, zoom, currentTime, onClipClick, onClipDrop }) => {
  const clipRef = useRef<HTMLDivElement>(null);
  
  const clipStyle: React.CSSProperties = {
    left: `${track.startTime * zoom}px`,
    width: `${track.duration * zoom}px`
  };
  
  return (
    <div className="track-row">
      <div className="track-header">
        <span className="track-type">{track.type}</span>
      </div>
      <div className="track-content">
        <div
          ref={clipRef}
          className={`timeline-clip ${currentTime >= track.startTime && currentTime <= track.startTime + track.duration ? 'active' : ''}`}
          style={clipStyle}
          onClick={() => onClipClick(track.mediaId)}
        >
          <span className="clip-label">{track.mediaId}</span>
        </div>
      </div>
    </div>
  );
};

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const frames = Math.floor((seconds % 1) * 30);
  return `${mins}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
}
```

#### 3.3 Deliverables for Phase 3

| Deliverable | File Path | Status |
|-------------|-----------|--------|
| Enhanced StoryboardCanvas | `src/components/StoryboardCanvas.tsx` | ⏳ Pending |
| ManualStoryboardEditor | `src/components/ManualStoryboardEditor.tsx` | ⏳ Pending |
| Enhanced Timeline | `src/components/Timeline.tsx` | ⏳ Pending |
| CommentPanel Component | `src/components/reference/CommentPanel.tsx` | ⏳ Pending |
| ReferencePanel Component | `src/components/reference/ReferencePanel.tsx` | ⏳ Pending |

---

### Phase 4: Advanced Features

**Duration:** 2-3 weeks  
**Objective:** Implement video replication, project management shortcuts, and one-shot/continuous take workflows.

#### 4.1 Video Replication Feature

##### 4.4.1 VideoReplication Component

```typescript
// Location: creative-studio-ui/src/components/VideoReplication.tsx

import React, { useState, useCallback } from 'react';
import { videoReplicationService } from '@/services/videoReplicationService';
import type { ReplicationRequest, ReplicationResult } from '@/types/workflow';

interface VideoReplicationProps {
  onComplete?: (results: ReplicationResult[]) => void;
}

export const VideoReplication: React.FC<VideoReplicationProps> = ({
  onComplete
}) => {
  const [step, setStep] = useState<'upload' | 'analyze' | 'configure' | 'processing' | 'complete'>('upload');
  const [sourceVideo, setSourceVideo] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<VideoAnalysis | null>(null);
  const [request, setRequest] = useState<ReplicationRequest | null>(null);
  const [results, setResults] = useState<ReplicationResult[]>([]);
  
  const handleFileSelect = useCallback(async (file: File) => {
    setSourceVideo(file);
    setStep('analyze');
    
    // Upload and analyze
    const url = await uploadFile(file);
    const videoAnalysis = await videoReplicationService.analyzeSourceVideo(url);
    setAnalysis(videoAnalysis);
    setStep('configure');
  }, []);
  
  const handleReplication = async () => {
    if (!sourceVideo) return;
    
    setStep('processing');
    
    const url = URL.createObjectURL(sourceVideo);
    const repRequest = await videoReplicationService.createReplicationRequest(url, {
      outputCount: 1
    });
    
    setRequest(repRequest);
    await videoReplicationService.processReplication(repRequest.id);
    
    setResults(repRequest.results);
    setStep('complete');
    onComplete?.(repRequest.results);
  };
  
  return (
    <div className="video-replication">
      {step === 'upload' && (
        <div className="upload-step">
          <h2>Upload Reference Video</h2>
          <div className="upload-zone">
            <input
              type="file"
              accept="video/*"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            />
          </div>
          <p className="hint">Upload the video you want to replicate</p>
        </div>
      )}
      
      {step === 'analyze' && (
        <div className="analyze-step">
          <h2>Analyzing Video</h2>
          <div className="loading-spinner" />
          <p>Extracting frames and detecting elements...</p>
        </div>
      )}
      
      {step === 'configure' && analysis && (
        <div className="configure-step">
          <h2>Configure Replication</h2>
          
          <section>
            <h3>Detected Elements</h3>
            <div className="elements-grid">
              {analysis.detectedElements.map((el, idx) => (
                <div key={idx} className="element-card">
                  <span className="element-type">{el.type}</span>
                  <span className="element-label">{el.label}</span>
                </div>
              ))}
            </div>
          </section>
          
          <section>
            <h3>Output Options</h3>
            <label>
              Number of variations:
              <input
                type="number"
                min={1}
                max={5}
                defaultValue={1}
              />
            </label>
          </section>
          
          <button onClick={handleReplication}>Start Replication</button>
        </div>
      )}
      
      {step === 'processing' && (
        <div className="processing-step">
          <h2>Processing Replication</h2>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: '50%' }} />
          </div>
          <p>Generating variations...</p>
        </div>
      )}
      
      {step === 'complete' && (
        <div className="complete-step">
          <h2>Replication Complete</h2>
          <div className="results-grid">
            {results.map(result => (
              <div key={result.id} className="result-card">
                <video src={result.videoUrl} controls />
                <button onClick={() => downloadResult(result)}>
                  Download
                </button>
              </div>
            ))}
          </div>
          <button onClick={() => setStep('upload')}>Start New Replication</button>
        </div>
      )}
    </div>
  );
};
```

#### 4.2 Project Management Features

##### 4.4.2 ProjectBranchingService

```typescript
// Location: creative-studio-ui/src/services/projectBranchingService.ts

import type { ProjectBranchPoint, ProjectSnapshot } from '@/types/workflow';
import { persistenceService } from './persistenceService';

export interface BranchPoint {
  id: string;
  projectId: string;
  nodeId: string;
  nodeType: 'shot' | 'sequence';
  description: string;
  timestamp: Date;
}

export class ProjectBranchingService {
  private branchPoints: Map<string, BranchPoint[]> = new Map();
  
  /**
   * Create a branch point
   */
  async createBranchPoint(
    projectId: string,
    nodeId: string,
    nodeType: 'shot' | 'sequence',
    description: string
  ): Promise<BranchPoint> {
    // Capture project snapshot
    const snapshot = await this.captureSnapshot(projectId);
    
    const branchPoint: BranchPoint = {
      id: crypto.randomUUID(),
      projectId,
      nodeId,
      nodeType,
      description,
      timestamp: new Date()
    };
    
    // Store branch point
    const projectBranchPoints = this.branchPoints.get(projectId) || [];
    projectBranchPoints.push(branchPoint);
    this.branchPoints.set(projectId, projectBranchPoints);
    
    return branchPoint;
  }
  
  /**
   * Start new project from branch point
   */
  async startNewProjectFromHere(branchPointId: string): Promise<string> {
    const branchPoint = await this.findBranchPoint(branchPointId);
    if (!branchPoint) {
      throw new Error('Branch point not found');
    }
    
    const snapshot = await this.getSnapshot(branchPoint.projectId, branchPoint.id);
    
    // Create new project with snapshot data
    const newProjectId = await this.createProjectFromSnapshot(snapshot);
    
    return newProjectId;
  }
  
  /**
   * Return to branch point (clear later context)
   */
  async returnToThisMoment(branchPointId: string): Promise<void> {
    const branchPoint = await this.findBranchPoint(branchPointId);
    if (!branchPoint) {
      throw new Error('Branch point not found');
    }
    
    const snapshot = await this.getSnapshot(branchPoint.projectId, branchPoint.id);
    
    // Restore project to snapshot state
    await this.restoreProject(snapshot);
  }
  
  /**
   * Get branch points for project
   */
  getBranchPoints(projectId: string): BranchPoint[] {
    return this.branchPoints.get(projectId) || [];
  }
  
  private async captureSnapshot(projectId: string): Promise<ProjectSnapshot> {
    // Implementation: capture all project data
    return {
      projectData: {},
      storyData: {},
      sequenceData: {},
      characterData: {},
      worldData: {},
      referenceSheets: {
        master: null as any,
        sequences: []
      }
    };
  }
  
  private async createProjectFromSnapshot(snapshot: ProjectSnapshot): Promise<string> {
    // Implementation
    return '';
  }
  
  private async restoreProject(snapshot: ProjectSnapshot): Promise<void> {
    // Implementation
  }
}

export const projectBranchingService = new ProjectBranchingService();
```

##### 4.4.3 ContinuousTakeWorkflowManager

```typescript
// Location: creative-studio-ui/src/services/continuousTakeWorkflowService.ts

import type { ContinuousTakeWorkflow, ContinuousShot, TransitionConfig } from '@/types/workflow';
import type { ProductionShot } from '@/types/shot';
import { referenceInheritanceService } from './referenceInheritanceService';

export class ContinuousTakeWorkflowManager {
  private workflows: Map<string, ContinuousTakeWorkflow> = new Map();
  
  /**
   * Create continuous take workflow from shots
   */
  async createWorkflow(
    projectId: string,
    shotIds: string[],
    options: {
      mode: 'first-last-frame' | 'interpolated' | 'direct';
      continuityStrategy: 'frame-sharing' | 'style-matching' | 'character-tracking';
    }
  ): Promise<ContinuousTakeWorkflow> {
    const workflow: ContinuousTakeWorkflow = {
      id: crypto.randomUUID(),
      projectId,
      mode: options.mode,
      shots: [],
      continuityStrategy: options.continuityStrategy,
      status: 'draft'
    };
    
    // Build shot chain with continuity frames
    for (let i = 0; i < shotIds.length; i++) {
      const shot: ContinuousShot = {
        shotId: shotIds[i],
        order: i,
        transitionToNext: i < shotIds.length - 1 ? {
          type: 'cut',
          duration: 0
        } : undefined
      };
      
      workflow.shots.push(shot);
    }
    
    this.workflows.set(workflow.id, workflow);
    return workflow;
  }
  
  /**
   * Set transition between shots
   */
  setTransition(workflowId: string, fromShotId: string, config: TransitionConfig): void {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return;
    
    const fromShot = workflow.shots.find(s => s.shotId === fromShotId);
    if (fromShot) {
      fromShot.transitionToNext = config;
    }
  }
  
  /**
   * Generate continuity frames for workflow
   */
  async generateContinuityFrames(workflowId: string): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return;
    
    workflow.status = 'processing';
    
    // Generate continuity frames for each shot transition
    for (let i = 0; i < workflow.shots.length - 1; i++) {
      const currentShot = workflow.shots[i];
      const nextShot = workflow.shots[i + 1];
      
      // Get or generate shared frame
      const sharedFrame = await this.getOrGenerateSharedFrame(
        currentShot.shotId,
        nextShot.shotId,
        workflow.mode
      );
      
      if (currentShot.endFrame && nextShot.startFrame) {
        // Already have frames
        continue;
      }
      
      currentShot.endFrame = sharedFrame;
      nextShot.startFrame = sharedFrame;
    }
    
    workflow.status = 'completed';
  }
  
  private async getOrGenerateSharedFrame(
    shotId1: string,
    shotId2: string,
    mode: 'first-last-frame' | 'interpolated' | 'direct'
  ): Promise<ReferenceImage | undefined> {
    // Implementation: get existing or generate new shared frame
    return undefined;
  }
  
  /**
   * Execute workflow - generate final output
   */
  async executeWorkflow(workflowId: string): Promise<string> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error('Workflow not found');
    }
    
    // Generate all shots with continuity
    await this.generateContinuityFrames(workflowId);
    
    // Combine into continuous video
    const outputUrl = await this.combineIntoVideo(workflow);
    
    workflow.outputUrl = outputUrl;
    workflow.status = 'completed';
    
    return outputUrl;
  }
  
  private async combineIntoVideo(workflow: ContinuousTakeWorkflow): Promise<string> {
    // Implementation using video processing
    return '';
  }
}

export const continuousTakeWorkflowManager = new ContinuousTakeWorkflowManager();
```

#### 4.3 Export to Premiere Pro

##### 4.4.4 PremiereExportService

```typescript
// Location: creative-studio-ui/src/services/premiereExportService.ts

export interface PremiereExportOptions {
  includeMedia: boolean;
  includeMarkers: boolean;
  includeAudio: boolean;
  videoCodec: string;
  audioCodec: string;
}

export interface PremiereProjectFile {
  name: string;
  sequences: PremiereSequence[];
}

export interface PremiereSequence {
  name: string;
  videoTracks: PremiereTrack[];
  audioTracks: PremiereTrack[];
}

export interface PremiereTrack {
  name: string;
  clips: PremiereClip[];
}

export interface PremiereClip {
  name: string;
  startTime: number;
  endTime: number;
  mediaPath: string;
}

export class PremiereExportService {
  /**
   * Export project to Premiere Pro format
   */
  async exportToPremiere(
    projectData: any,
    options: PremiereExportOptions
  ): Promise<{ filePath: string; mediaFiles: string[] }> {
    // Create .prproj file structure
    const premiereProject = this.buildPremiereProject(projectData, options);
    
    // Save project file
    const projectPath = await this.saveProjectFile(premiereProject, options);
    
    // Copy media files
    const mediaFiles = await this.copyMediaFiles(projectData, options);
    
    return {
      filePath: projectPath,
      mediaFiles
    };
  }
  
  private buildPremiereProject(
    projectData: any,
    options: PremiereExportOptions
  ): PremiereProjectFile {
    // Build Premiere project structure
    return {
      name: projectData.project_name,
      sequences: [{
        name: 'Main Sequence',
        videoTracks: this.buildVideoTracks(projectData, options),
        audioTracks: this.buildAudioTracks(projectData, options)
      }]
    };
  }
  
  private buildVideoTracks(projectData: any, options: PremiereExportOptions): PremiereTrack[] {
    // Build video tracks from shots
    return projectData.shots.map((shot: any, index: number) => ({
      name: `Video ${index + 1}`,
      clips: [{
        name: shot.title || `Shot ${shot.number}`,
        startTime: shot.timing?.inPoint || 0,
        endTime: (shot.timing?.inPoint || 0) + (shot.timing?.duration || 5),
        mediaPath: shot.generatedAssetUrl || ''
      }]
    }));
  }
  
  private buildAudioTracks(projectData: any, options: PremiereExportOptions): PremiereTrack[] {
    // Build audio tracks from audio tracks in shots
    return [];
  }
  
  private async saveProjectFile(project: PremiereProjectFile, options: PremiereExportOptions): Promise<string> {
    // Save as .prproj XML
    return '';
  }
  
  private async copyMediaFiles(projectData: any, options: PremiereExportOptions): Promise<string[]> {
    // Copy referenced media files to export folder
    return [];
  }
}

export const premiereExportService = new PremiereExportService();
```

#### 4.4 Deliverables for Phase 4

| Deliverable | File Path | Status |
|-------------|-----------|--------|
| VideoReplication Component | `src/components/VideoReplication.tsx` | ⏳ Pending |
| ProjectBranchingService | `src/services/projectBranchingService.ts` | ⏳ Pending |
| ContinuousTakeWorkflowManager | `src/services/continuousTakeWorkflowService.ts` | ⏳ Pending |
| PremiereExportService | `src/services/premiereExportService.ts` | ⏳ Pending |
| Export Dialog | `src/components/export/ExportDialog.tsx` | ⏳ Pending |

---

## 5. Technical Architecture

### 5.1 New Types & Interfaces Summary

| File | New Types |
|------|-----------|
| `types/reference.ts` | `ReferenceImage`, `ReferenceMetadata`, `ReferenceAnnotation`, `MasterReferenceSheet`, `ProjectCharacterReference`, `StyleProfile`, `SequenceReferenceSheet`, `SequenceCharacterReference`, `ContinuityFrame`, `CommentDrivenTask`, `CommentIntent`, `GenerationResult` |
| `types/workflow.ts` | `GenerationPathStrategy`, `GenerationStep`, `ReplicationRequest`, `ReplicationModification`, `ProjectBranchPoint`, `ContinuousTakeWorkflow`, `ContinuousShot`, `TransitionConfig` |

### 5.2 New Services Required

| Service | Dependencies | Purpose |
|---------|--------------|---------|
| `referenceInheritanceService.ts` | Types (reference) | Reference propagation |
| `consistencyEngine.ts` | Types (reference, shot) | Visual consistency |
| `styleTransferService.ts` | Types (reference), ComfyUI | Style transfer |
| `commentDrivenGenerationService.ts` | Types (reference), LLM | Comment interpretation |
| `videoReplicationService.ts` | Types (workflow) | Video replication |
| `projectBranchingService.ts` | Types (workflow) | Project management |
| `continuousTakeWorkflowService.ts` | Types (workflow) | Continuous take |
| `premiereExportService.ts` | - | Premiere export |

### 5.3 Component Modifications

| Component | Modifications |
|-----------|---------------|
| `StoryboardCanvas.tsx` | Add reference panel, comment input, manual edit modal |
| `Timeline.tsx` | Add clip editing, trimming, drag-drop |
| `SequencePlanManager.ts` | Add reference sheet integration |
| `CharacterEditor.tsx` | Add reference export |
| `WorldModal.tsx` | Add reference export |

### 5.4 Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Reference System Architecture                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐                                           │
│  │ MasterReference  │◄──────────────────────────────┐           │
│  │     Sheet        │                               │           │
│  │  (Project-Level) │                               │           │
│  └────────┬─────────┘                               │           │
│           │                                         │           │
│           │ inherits                                │           │
│           ▼                                         │           │
│  ┌──────────────────┐                               │           │
│  │ SequenceReference│                               │           │
│  │     Sheet        │                               │           │
│  │ (Sequence-Level) │                               │           │
│  └────────┬─────────┘                               │           │
│           │                                         │           │
│           │ inherits                                │           │
│           ▼                                         │           │
│  ┌──────────────────┐                               │           │
│  │  Shot References │                               │           │
│  │    (Shot-Level)  │                               │           │
│  └──────────────────┘                               │           │
│                                                   │           │
│  ┌───────────────────────────────────────────────┐│           │
│  │           ConsistencyEngine                   │           │
│  │  - checkShotConsistency()                     │           │
│  │  - checkCharacterConsistency()                │           │
│  │  - suggestReferences()                        │           │
│  └───────────────────────────────────────────────┘           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.5 Service Interaction Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Generation Workflow Architecture                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   User Input                    Generation Pipeline                      │
│   ──────────                    ────────────────────                     │
│                                                                          │
│   ┌──────────────┐              ┌─────────────────────────────────┐      │
│   │ Manual Edit  │──────────────►│ GenerationOrchestrator          │      │
│   └──────────────┘              └───────────────┬─────────────────┘      │
│                                                │                         │
│   ┌──────────────┐                            │                         │
│   │   Comment    │──────────────┐              ▼                         │
│   └──────────────┘              │    ┌─────────────────────┐            │
│                                │    │ GenerationPath      │            │
│   ┌──────────────┐              │    │ Strategy            │            │
│   │  Replication │──────────────┼───►│ - Text-to-Image     │            │
│   └──────────────┘              │    │ - Image-to-Image    │            │
│                                │    │ - FirstFrameToVideo │            │
│   ┌──────────────┐              │    │ - FirstLastFrame    │            │
│   │  One-Shot    │──────────────┼───►└─────────────────────┘            │
│   └──────────────┘              │              │                         │
│                                │              ▼                         │
│                                │    ┌─────────────────────┐            │
│                                │    │ ComfyUI Service     │            │
│                                └───►└─────────────────────┘            │
│                                               │                         │
│                                               ▼                         │
│                                      ┌─────────────────────┐           │
│                                      │ Output              │           │
│                                      │ - Images            │           │
│                                      │ - Videos            │           │
│                                      │ - Timeline          │           │
│                                      └─────────────────────┘           │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Data Migration Strategy

### 6.1 Version Compatibility

The new reference system should maintain backward compatibility with existing project data:

| Version | Migration Required | Strategy |
|---------|-------------------|----------|
| v1.0 → v2.0 | Yes | Auto-migrate on first load |
| Existing projects | No | Reference sheets created on demand |

### 6.2 Migration Steps

1. **Load existing project data**
2. **Check for existing reference images**
3. **Create MasterReferenceSheet** from existing references
4. **Create empty SequenceReferenceSheets** for each sequence
5. **Link existing shots to reference sheets**
6. **Validate integrity**
7. **Save migrated data**

### 6.3 Migration Code

```typescript
// Location: creative-studio-ui/src/services/migrationService.ts

export async function migrateToReferenceSystem(
  projectData: any
): Promise<MigratedProjectData> {
  // 1. Create master reference sheet from existing references
  const masterReferenceSheet = await createMasterReferenceSheet(projectData);
  
  // 2. Create sequence reference sheets
  const sequenceReferenceSheets = await createSequenceReferenceSheets(
    projectData,
    masterReferenceSheet
  );
  
  // 3. Link shots to references
  const updatedShots = await linkShotsToReferences(
    projectData.shots,
    masterReferenceSheet,
    sequenceReferenceSheets
  );
  
  return {
    ...projectData,
    referenceSystem: {
      version: '2.0',
      masterReferenceSheet,
      sequenceReferenceSheets
    },
    shots: updatedShots
  };
}
```

---

## 7. Timeline & Dependencies

### 7.1 Implementation Timeline

```
Phase 1: Foundation (Weeks 1-3)
├─ Week 1: Types & Basic Services
├─ Week 2: State Management
└─ Week 3: Testing & Polish

Phase 2: Sequence Integration (Weeks 4-6)
├─ Week 4: UI Components
├─ Week 5: Integration Points
└─ Week 6: Testing

Phase 3: Shot Enhancement (Weeks 7-9)
├─ Week 7: StoryboardCanvas Enhancement
├─ Week 8: Manual Editor & Timeline
└─ Week 9: Testing

Phase 4: Advanced Features (Weeks 10-12)
├─ Week 10: Video Replication
├─ Week 11: Project Management
└─ Week 12: Export & Polish
```

### 7.2 Dependency Graph

```
Phase 1 (Foundation)
├─ types/reference.ts ──────────┐
├─ types/workflow.ts ────────────┤
├─ services/referenceInheritanceService.ts ──┤
├─ services/consistencyEngine.ts ──────────────┤
├─ services/styleTransferService.ts ───────────┤
├─ services/commentDrivenGenerationService.ts ─┤
├─ services/videoReplicationService.ts ────────┤
└─ stores/referenceStore.ts ────────────────────┘

Phase 2 (Sequence Integration)
├─ components/reference/SequenceReferenceSheet.tsx ──┐
├─ components/reference/MasterReferenceSheet.tsx ─────┤
└─ Enhanced sequencePlanService.ts ────────────────────┘

Phase 3 (Shot Enhancement)
├─ Enhanced StoryboardCanvas.tsx ──┐
├─ ManualStoryboardEditor.tsx ────┤
└─ Enhanced Timeline.tsx ──────────┘

Phase 4 (Advanced Features)
├─ VideoReplication.tsx ──────┐
├─ projectBranchingService.ts ─┤
├─ continuousTakeWorkflow ─────┤
└─ premiereExportService.ts ──┘
```

---

## 8. Risk Assessment & Mitigation

### 8.1 Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Performance with large reference sets | High | Medium | Implement pagination and lazy loading |
| Reference consistency conflicts | High | Medium | Add conflict resolution UI |
| Migration failures | High | Low | Backup before migration, rollback plan |
| Cross-browser compatibility | Medium | Low | Test on major browsers |

### 8.2 Feature Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Comment intent misinterpretation | High | Medium | Add confirmation step for high-confidence actions |
| Style transfer quality | Medium | Medium | Offer manual override options |
| Video replication fidelity | Medium | Medium | Provide quality metrics |
| One-shot workflow complexity | Medium | High | Add wizards and presets |

### 8.3 Mitigation Strategies

1. **Progressive Enhancement**: Implement features incrementally with fallbacks
2. **User Testing**: Test each phase with representative users
3. **Documentation**: Comprehensive docs for complex workflows
4. **Monitoring**: Add analytics to track feature usage and issues
5. **Rollback Plan**: Ensure backward compatibility throughout

---

## 9. Appendices

### 9.1 Reference Level Details

#### Shot-Level Referencing
- Direct modification of shot content
- Add/remove shots before or after referenced shot
- Modify generation parameters
- Switch generation models

#### Keyframe-Level Referencing
- Control keyframe generation
- Fine-tune visual content via plain language
- Switch generation models
- Modify timing and composition

#### Video-Level Referencing
- Direct video modification
- Plain language instructions for refinement
- Change generation models
- Select generation modes:
  - Text-to-video
  - First-frame-to-video
  - First-and-last-frame-to-video

### 9.2 Generation Path Strategy Details

| Step | Mode | Input | Output | Purpose |
|------|------|-------|--------|---------|
| 1 | Text-to-Image | Prompt + Style refs | Key elements | Establish visual foundation |
| 2 | Image-to-Image | Key elements + Prompt | First frames | Create consistent first frames |
| 3 | FirstFrameToVideo | First frames + Prompt | Video clips | Generate full videos |

### 9.3 One-Shot/Continuous Take Requirements

- First frame of shot N = Last frame of shot N-1
- Shared frames enable seamless transitions
- Recommended: 8-12 seconds per shot
- First shot should be medium shot with all characters visible
- Use first-and-last-frame video generation mode

---

## 10. Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-05 | Initial document creation |

---

*Document generated as part of StoryCore Creative Studio implementation planning.*
