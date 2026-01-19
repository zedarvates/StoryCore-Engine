/**
 * Type definitions for the Project Setup Wizard
 * These types mirror the Data Contract v1 schema and support the wizard workflow
 */

// ============================================================================
// Project Type Data
// ============================================================================

export type ProjectType =
  | 'court-metrage'
  | 'moyen-metrage'
  | 'long-metrage-standard'
  | 'long-metrage-premium'
  | 'tres-long-metrage'
  | 'special-tv'
  | 'episode-serie'
  | 'custom';

export interface ProjectTypeData {
  type: ProjectType;
  durationMinutes: number;
  durationRange?: { min: number; max: number };
}

// ============================================================================
// Genre & Style Data
// ============================================================================

export type Genre =
  | 'action'
  | 'drama'
  | 'comedy'
  | 'sci-fi'
  | 'fantasy'
  | 'horror'
  | 'romance'
  | 'thriller'
  | 'documentary'
  | 'mystery'
  | 'adventure'
  | 'historical'
  | 'musical'
  | 'western';

export type VisualStyle =
  | 'realistic'
  | 'stylized'
  | 'anime'
  | 'comic-book'
  | 'noir'
  | 'vintage'
  | 'futuristic'
  | 'watercolor'
  | 'oil-painting'
  | 'minimalist'
  | 'surreal';

export type Mood =
  | 'dark'
  | 'light'
  | 'serious'
  | 'playful'
  | 'tense'
  | 'calm'
  | 'energetic'
  | 'melancholic'
  | 'hopeful'
  | 'mysterious';

export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  preset?: string;
}

export interface GenreStyleData {
  genres: Genre[];
  visualStyle: VisualStyle;
  colorPalette: ColorPalette;
  mood: Mood[];
}

// ============================================================================
// World Building Data
// ============================================================================

export type UniverseType = 'realistic' | 'fantasy' | 'sci-fi' | 'historical' | 'alternate';

export interface Location {
  id: string;
  name: string;
  description: string;
  visualCharacteristics: string;
  mood: Mood;
  referenceImages?: string[];
}

export interface WorldBuildingData {
  timePeriod: string;
  primaryLocation: string;
  universeType: UniverseType;
  worldRules: string;
  locations: Location[];
  culturalContext: string;
  technologyLevel: number; // 0-10 scale
}

// ============================================================================
// Character Data
// ============================================================================

export type CharacterRole = 'protagonist' | 'antagonist' | 'supporting' | 'background';

export type DialogueStyle =
  | 'formal'
  | 'casual'
  | 'technical'
  | 'poetic'
  | 'terse'
  | 'verbose'
  | 'dialect-specific';

export interface CharacterRelationship {
  characterId: string;
  relationshipType: string;
  description: string;
}

export interface CharacterProfile {
  id: string;
  name: string;
  role: CharacterRole;
  physicalAppearance: string;
  personalityTraits: string[];
  characterArc: string;
  visualReferences: string[];
  dialogueStyle: DialogueStyle;
  relationships: CharacterRelationship[];
}

// ============================================================================
// Story Structure Data
// ============================================================================

export type ActStructure = '3-act' | '5-act' | 'hero-journey' | 'save-the-cat' | 'custom';

export type NarrativePerspective =
  | 'first-person'
  | 'third-person-limited'
  | 'third-person-omniscient'
  | 'multiple-pov';

export interface PlotPoint {
  id: string;
  name: string;
  description: string;
  timingMinutes: number;
  actNumber: number;
}

export interface StoryStructureData {
  premise: string; // max 500 chars
  logline: string; // max 150 chars
  actStructure: ActStructure;
  plotPoints: PlotPoint[];
  themes: string[];
  motifs: string[];
  narrativePerspective: NarrativePerspective;
}

// ============================================================================
// Script Data
// ============================================================================

export type ScriptFormat =
  | 'full-screenplay'
  | 'scene-descriptions'
  | 'shot-list'
  | 'storyboard-notes';

export interface DialogueLine {
  character: string;
  line: string;
  parenthetical?: string;
}

export interface ParsedScene {
  sceneNumber: number;
  heading: string;
  description: string;
  dialogue: DialogueLine[];
  characters: string[];
}

export interface ScriptData {
  format: ScriptFormat;
  content: string;
  importedFrom?: string;
  parsedScenes?: ParsedScene[];
}

// ============================================================================
// Scene Breakdown Data
// ============================================================================

export type TimeOfDay = 'dawn' | 'morning' | 'afternoon' | 'evening' | 'night' | 'unspecified';

export interface SceneBreakdown {
  id: string;
  sceneNumber: number;
  sceneName: string;
  durationMinutes: number;
  locationId: string;
  characterIds: string[];
  timeOfDay: TimeOfDay;
  emotionalBeat: string;
  keyActions: string[];
  order: number;
}

// ============================================================================
// Shot Planning Data
// ============================================================================

export type ShotType =
  | 'extreme-wide'
  | 'wide'
  | 'medium'
  | 'close-up'
  | 'extreme-close-up'
  | 'over-the-shoulder'
  | 'pov';

export type CameraAngle =
  | 'eye-level'
  | 'high-angle'
  | 'low-angle'
  | 'dutch-angle'
  | 'birds-eye'
  | 'worms-eye';

export type CameraMovement =
  | 'static'
  | 'pan'
  | 'tilt'
  | 'dolly'
  | 'track'
  | 'zoom'
  | 'handheld'
  | 'crane';

export type Transition = 'cut' | 'fade' | 'dissolve' | 'wipe' | 'match-cut';

export interface ShotPlan {
  id: string;
  sceneId: string;
  shotNumber: number;
  shotType: ShotType;
  cameraAngle: CameraAngle;
  cameraMovement: CameraMovement;
  transition: Transition;
  compositionNotes: string;
  order: number;
}

// ============================================================================
// Validation Types
// ============================================================================

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

// ============================================================================
// Wizard State Types
// ============================================================================

export interface WizardState {
  // Navigation state
  currentStep: number;
  completedSteps: Set<number>;
  isReviewMode: boolean;

  // Project data (mirrors Data Contract v1)
  projectType: ProjectTypeData | null;
  genreStyle: GenreStyleData | null;
  worldBuilding: WorldBuildingData | null;
  characters: CharacterProfile[];
  storyStructure: StoryStructureData | null;
  script: ScriptData | null;
  scenes: SceneBreakdown[];
  shots: ShotPlan[];

  // Metadata
  draftId: string | null;
  lastSaved: Date | null;
  validationErrors: Map<number, ValidationError[]>;

  // Actions
  setCurrentStep: (step: number) => void;
  updateStepData: (step: number, data: Partial<WizardStepData>) => void;
  markStepComplete: (step: number) => void;
  validateStep: (step: number) => Promise<ValidationResult>;
  canProceed: () => boolean;
  reset: () => void;
}

// Union type for all step data
export type WizardStepData =
  | ProjectTypeData
  | GenreStyleData
  | WorldBuildingData
  | CharacterProfile[]
  | StoryStructureData
  | ScriptData
  | SceneBreakdown[]
  | ShotPlan[];

// ============================================================================
// Export Types
// ============================================================================

export interface CoherenceConfig {
  visualStyle: VisualStyle;
  colorPalette: ColorPalette;
  mood: Mood[];
}

export interface ProjectJSON {
  schema_version: '1.0';
  project_name: string;
  project_metadata: {
    type: string;
    duration_minutes: number;
    genres: string[];
    visual_style: string;
    created_at: string;
  };
  world_building: WorldBuildingData;
  characters: CharacterProfile[];
  story_structure: StoryStructureData;
  scenes: SceneBreakdown[];
  shots: ShotPlan[];
  capabilities: {
    grid_generation: boolean;
    promotion_engine: boolean;
    qa_engine: boolean;
    autofix_engine: boolean;
  };
  generation_status: {
    grid: 'pending';
    promotion: 'pending';
  };
}

export interface ProjectExport {
  projectJSON: ProjectJSON;
  projectPath: string;
  summaryDocument: string;
  coherenceConfig: CoherenceConfig;
  exportTimestamp: Date;
}

// ============================================================================
// Production Wizards Types
// ============================================================================

import type { SequencePlan } from './sequencePlan';
import type { ProductionShot } from './shot';
import type { SequenceTemplate, ShotTemplate } from './template';

export interface WizardStep {
  number: number;
  title: string;
  description?: string;
  isOptional?: boolean;
  icon?: React.ReactNode;
}

export interface ShotPreview {
  thumbnailUrl?: string;
  estimatedDuration: number;
  estimatedCost: number;
  qualityScore: number;
}

// Sequence Plan Wizard specific types
export interface SequencePlanWizardState {
  currentStep: number;
  formData: Partial<SequencePlan>;
  selectedTemplate?: SequenceTemplate;
  validationErrors: Record<string, string>;
  isDirty: boolean;
  lastSaved: number;
}

// Shot Wizard specific types
export interface ShotWizardState {
  currentStep: number;
  formData: Partial<ProductionShot>;
  selectedTemplate?: ShotTemplate;
  generatedPrompt: string;
  validationErrors: Record<string, string>;
  previewData: ShotPreview;
  isDirty: boolean;
  lastSaved: number;
  quickMode: boolean;
}

// ============================================================================
// Wizard Context Types (for modal integration)
// ============================================================================

/**
 * Context for Sequence Plan Wizard Modal
 */
export interface SequencePlanWizardContext {
  mode: 'create' | 'edit';
  initialTemplateId?: string;
  existingSequencePlan?: SequencePlan;
  sourceLocation?: 'dashboard' | 'editor' | 'plans-panel';
}

/**
 * Context for Shot Wizard Modal
 */
export interface ShotWizardContext {
  mode: 'create' | 'edit';
  sequenceId?: string;
  sceneId?: string;
  shotNumber?: number;
  initialTemplateId?: string;
  existingShot?: ProductionShot;
  quickMode?: boolean;
  sourceLocation?: 'storyboard' | 'timeline' | 'shot-card';
  timelinePosition?: number; // For timeline-based creation
}
