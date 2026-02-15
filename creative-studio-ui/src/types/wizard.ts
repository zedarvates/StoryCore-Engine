// ============================================================================
// Wizard Shared Types
// Shared types for all wizard components
// ============================================================================

export type SupportedLanguage = 'fr' | 'en' | 'es' | 'de';

// Wizard Type (imported from wizardStorage)
export type WizardType =
  | 'world'
  | 'character'
  | 'storyteller'
  | 'dialogue-writer'
  | 'scene-generator'
  | 'storyboard-creator'
  | 'style-transfer'
  | 'sequence-plan'
  | 'shot';

export interface WizardStep {
  number: number;
  title: string;
  description?: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  requiredFields?: string[];
}

export interface WizardValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export interface DraftData<T> {
  data: T;
  timestamp: number;
  language: SupportedLanguage;
  stepIndex: number;
}

// ============================================================================
// Character Wizard Types
// ============================================================================

export interface CharacterTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  baseStats: {
    personality: string[];
    abilities: string[];
    backstory?: string;
  };
  voiceTraits?: {
    pitch: number;
    speed: number;
    recommendedVoices: string[];
  };
}

export interface CharacterData {
  name: string;
  gender: 'male' | 'female' | 'other';
  age: number;
  personality: string[];
  appearance: string;
  backstory: string;
  voiceId: string;
  abilities: string[];
  worldRelation: string;
  templateId?: string;
}

// ============================================================================
// Story Wizard Types
// ============================================================================

export interface VisualStyleOption {
  value: string;
  label: string;
  description: string;
  examples: string[];
  previewColor: string;
  icon: string;
  moodWords: string[];
  recommendedFor: string[];
  languageVariations?: Record<SupportedLanguage, string>;
}

export interface StorytellerData {
  selectedCharacters: string[];
  selectedLocations: string[];
  previousEpisodeReference: string;
  videoType: string;
  targetDuration: number;
  genre: string[];
  tone: string[];
  targetAudience: string;
  visualStyle: string;
  storySummary: string;
  mainConflict: string;
  resolution: string;
  themes: string[];
  acts: Act[];
  recommendedVisualStyle: string;
  pacing: string;
  musicSuggestions: string[];
  moodPalette: string[];
  cameraTechniques: string[];
  isValidated: boolean;
}

export interface Act {
  id?: string;
  number: number;
  title: string;
  description: string;
  keyScenes: string[];
  characterDevelopment: string;
  duration: number;
}

// ============================================================================
// Wizard Translations
// ============================================================================

export interface WizardTranslations {
  common: {
    next: string;
    previous: string;
    save: string;
    cancel: string;
    close: string;
    generate: string;
    generating: string;
    preview: string;
    loading: string;
    error: string;
    success: string;
    step: string;
    of: string;
    validation: {
      required: string;
      invalid: string;
      minLength: string;
      maxLength: string;
    };
    draft: {
      saved: string;
      autoSave: string;
      restore: string;
      discard: string;
    };
  };
  character: {
    title: string;
    subtitle: string;
    steps: {
      template: { title: string; description: string };
      basic: { title: string; description: string };
      personality: { title: string; description: string };
      backstory: { title: string; description: string };
      abilities: { title: string; description: string };
      preview: { title: string; description: string };
    };
    fields: {
      name: string;
      gender: string;
      age: string;
      personality: string;
      appearance: string;
      backstory: string;
      voice: string;
      abilities: string;
      worldRelation: string;
    };
    gender: {
      male: string;
      female: string;
      other: string;
    };
    templates: {
      hero: string;
      mage: string;
      rogue: string;
      scholar: string;
      villain: string;
      mentor: string;
      sidekick: string;
      rebel: string;
      mystic: string;
    };
  };
  storyteller: {
    title: string;
    subtitle: string;
    steps: {
      analysis: { title: string; description: string };
      format: { title: string; description: string };
      creation: { title: string; description: string };
      structure: { title: string; description: string };
      validation: { title: string; description: string };
    };
    fields: {
      videoType: string;
      duration: string;
      genre: string;
      tone: string;
      targetAudience: string;
      visualStyle: string;
      previousEpisode: string;
    };
    videoTypes: {
      courtMetrage: string;
      metrage: string;
      serieEpisode: string;
      webSerie: string;
    };
    audience: {
      general: string;
      family: string;
      youngAdult: string;
      adult: string;
      mature: string;
    };
    visualStyles: {
      cinematographique: string;
      anime: string;
      documentaire: string;
      artistique: string;
      vintage: string;
      minimaliste: string;
    };
  };
  dialogue: {
    title: string;
    autoGenerate: string;
    manualAdd: string;
    generated: string;
    editing: string;
    fields: {
      character: string;
      text: string;
      voice: string;
      tone: string;
      pitch: string;
      speed: string;
      volume: string;
      position: string;
    };
    tones: {
      neutral: string;
      happy: string;
      sad: string;
      angry: string;
      excited: string;
      calm: string;
      surprised: string;
    };
  };
}

// ============================================================================
// Language Helpers
// ============================================================================

export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  fr: 'Français',
  en: 'English',
  es: 'Español',
  de: 'Deutsch'
};

export const LANGUAGE_FLAGS: Record<SupportedLanguage, string> = {
  fr: '🇫🇷',
  en: '🇺🇸',
  es: '🇪🇸',
  de: '🇩🇪'
};


// ============================================================================
// Project Setup Wizard Types
// Comprehensive data models for the multi-step project initialization wizard
// ============================================================================

// Project Type Data
export interface ProjectTypeData {
  type: 'court-metrage' | 'moyen-metrage' | 'long-metrage-standard' |
  'long-metrage-premium' | 'tres-long-metrage' | 'special-tv' |
  'episode-serie' | 'custom';
  durationMinutes: number;
  durationRange?: { min: number; max: number };
}

// Genre and Style Data
export type Genre = 'action' | 'drama' | 'comedy' | 'sci-fi' | 'fantasy' |
  'horror' | 'romance' | 'thriller' | 'documentary' |
  'mystery' | 'adventure' | 'historical' | 'musical' | 'western';

export type VisualStyle = 'realistic' | 'stylized' | 'anime' | 'comic-book' |
  'noir' | 'vintage' | 'futuristic' | 'watercolor' |
  'oil-painting' | 'minimalist' | 'surreal';

export type Mood = 'dark' | 'light' | 'serious' | 'playful' | 'tense' |
  'calm' | 'energetic' | 'melancholic' | 'hopeful' | 'mysterious';

export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  preset?: string; // e.g., 'warm-sunset', 'cool-ocean', 'monochrome'
}

export interface GenreStyleData {
  genres: Genre[];
  visualStyle: VisualStyle;
  colorPalette: ColorPalette;
  mood: Mood[];
}

// World Building Data
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
  universeType: 'realistic' | 'fantasy' | 'sci-fi' | 'historical' | 'alternate';
  worldRules: string;
  locations: Location[];
  culturalContext: string;
  technologyLevel: number; // 0-10 scale
}

// Character Data
export type DialogueStyle = 'formal' | 'casual' | 'technical' | 'poetic' |
  'terse' | 'verbose' | 'dialect-specific';

export interface CharacterRelationship {
  characterId: string;
  relationshipType: string; // e.g., 'friend', 'enemy', 'family', 'mentor'
  description: string;
}

export interface CharacterProfile {
  id: string;
  name: string;
  role: 'protagonist' | 'antagonist' | 'supporting' | 'background';
  physicalAppearance: string;
  personalityTraits: string[];
  characterArc: string;
  visualReferences: string[];
  dialogueStyle: DialogueStyle;
  relationships: CharacterRelationship[];
}

// Story Structure Data
export type ActStructure = '3-act' | '5-act' | 'hero-journey' | 'save-the-cat' | 'custom';

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
  narrativePerspective: 'first-person' | 'third-person-limited' |
  'third-person-omniscient' | 'multiple-pov';
}

// Script Data
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
  format: 'full-screenplay' | 'scene-descriptions' | 'shot-list' | 'storyboard-notes';
  content: string;
  importedFrom?: string; // file path if imported
  parsedScenes?: ParsedScene[];
}

// Scene Breakdown Data
export interface SceneBreakdown {
  id: string;
  sceneNumber: number;
  sceneName: string;
  durationMinutes: number;
  locationId: string;
  characterIds: string[];
  timeOfDay: 'dawn' | 'morning' | 'afternoon' | 'evening' | 'night' | 'unspecified';
  emotionalBeat: string;
  keyActions: string[];
  order: number; // for drag-and-drop reordering
}

// Shot Planning Data
export type ShotType = 'extreme-wide' | 'wide' | 'medium' | 'close-up' |
  'extreme-close-up' | 'over-the-shoulder' | 'pov';

export type CameraAngle = 'eye-level' | 'high-angle' | 'low-angle' |
  'dutch-angle' | 'birds-eye' | 'worms-eye';

export type CameraMovement = 'static' | 'pan' | 'tilt' | 'dolly' | 'track' |
  'zoom' | 'handheld' | 'crane';

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

// Validation Types
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

// Wizard Step Data Union Type
export type WizardStepData =
  | ProjectTypeData
  | GenreStyleData
  | WorldBuildingData
  | CharacterProfile[]
  | StoryStructureData
  | ScriptData
  | SceneBreakdown[]
  | ShotPlan[];

// Wizard State
export interface WizardState {
  // Wizard metadata
  wizardType: WizardType | null;

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
  setWizardType: (type: WizardType) => void;
  setCurrentStep: (step: number) => void;
  updateStepData: (step: number, data: Partial<WizardStepData>) => void;
  markStepComplete: (step: number) => void;
  validateStep: (step: number) => Promise<ValidationResult>;
  canProceed: () => boolean;
  reset: () => void;
}

// Template Types
export type TemplateCategory = 'short-film' | 'feature' | 'series' | 'documentary' | 'custom';

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  data: Partial<WizardState>;
}

export interface DraftMetadata {
  id: string;
  projectName: string;
  timestamp: Date;
  currentStep: number;
}

// Export Types
export interface CoherenceConfig {
  visualStyle: VisualStyle;
  colorPalette: ColorPalette;
  mood: Mood[];
  styleConsistencyRules: string[];
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
    grid: 'pending' | 'done' | 'failed' | 'passed';
    promotion: 'pending' | 'done' | 'failed' | 'passed';
  };
}

export interface ProjectExport {
  projectJSON: ProjectJSON;
  projectPath: string;
  summaryDocument: string; // Markdown content
  coherenceConfig: CoherenceConfig;
  exportTimestamp: Date;
}

// Component Props Types
export interface StepComponentProps<T = unknown> {
  data: T;
  onUpdate: (data: Partial<T>) => void;
  onValidate: () => ValidationResult;
  mode: 'beginner' | 'advanced';
}

export interface WizardContainerProps {
  initialTemplate?: string;
  onComplete: (projectData: ProjectExport) => void;
  onCancel: () => void;
}

export interface WizardNavigationProps {
  currentStep: number;
  totalSteps: number;
  canGoNext: boolean;
  canGoBack: boolean;
  canSkip: boolean;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  onSaveDraft: () => void;
  onSubmit?: () => void; // Called at the last step
  onCancel?: () => void; // Called when cancel is clicked
  lastSaved?: Date;
}

export interface WizardReviewProps {
  projectData: WizardState;
  onEdit: (step: number) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

// Schema Validation Result
export interface SchemaValidationResult {
  isValid: boolean;
  errors: Array<{
    path: string;
    message: string;
  }>;
}
// ============================================================================
// Wizard Contexts
// For specific wizard launches via Store
// ============================================================================

export interface SequencePlanWizardContext {
  mode: 'create' | 'edit';
  sequenceId?: string;
  initialTemplateId?: string;
  existingSequencePlan?: unknown;
  sourceLocation?: string;
}

export interface ShotWizardContext {
  mode: 'create' | 'edit';
  shotId?: string;
  sequenceId?: string;
  sceneId?: string;
  shotNumber?: number;
  initialTemplateId?: string;
  existingShot?: unknown;
  quickMode?: boolean;
  sourceLocation?: string;
  timelinePosition?: number;
  initialData?: unknown;
}

