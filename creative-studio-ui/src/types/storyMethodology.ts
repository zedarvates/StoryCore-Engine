// ============================================================================
// Story Methodology Types
// ============================================================================

/**
 * Available story creation methodologies
 */
export const StoryMethodologyType = {
  /** Original sequential approach (intro → chapters → ending) */
  SEQUENTIAL: 'sequential' as const,
  /** Structured Draft & Refine with multiple review phases */
  STRUCTURED_DRAFT_REFINE: 'structured_draft_refine' as const,
  /** Linear Progressive with skeleton-first approach */
  LINEAR_PROGRESSIVE: 'linear_progressive' as const,
  /** Iterative Chapter-by-Chapter with deep refinement */
  ITERATIVE_CHAPTER: 'iterative_chapter' as const,
};

export type StoryMethodologyType = typeof StoryMethodologyType[keyof typeof StoryMethodologyType];

/**
 * Story generation phases across all methodologies
 */
export const StoryPhase = {
  /** Intro summary generation */
  INTRO_SUMMARY: 'intro_summary' as const,
  /** Chapter outlines generation */
  CHAPTER_OUTLINE: 'chapter_outline' as const,
  /** Ending summary generation */
  ENDING_SUMMARY: 'ending_summary' as const,
  /** Full content generation from summaries */
  FULL_CONTENT: 'full_content' as const,
  /** Revision cycle */
  REVISION: 'revision' as const,
  /** Story skeleton generation (Linear Progressive) */
  SKELETON: 'skeleton' as const,
  /** Skeleton review phase */
  SKELETON_REVIEW: 'skeleton_review' as const,
  /** Full expansion phase */
  FULL_EXPANSION: 'full_expansion' as const,
  /** Polish phase */
  POLISH: 'polish' as const,
  /** Master outline generation (Iterative Chapter) */
  MASTER_OUTLINE: 'master_outline' as const,
  /** Per-chapter generation */
  CHAPTER_GENERATION: 'chapter_generation' as const,
  /** Global consistency check */
  CONSISTENCY_CHECK: 'consistency_check' as const,
};

export type StoryPhase = typeof StoryPhase[keyof typeof StoryPhase];

/**
 * Approval status for phases
 */
export const ApprovalStatus = {
  /** Pending user review */
  PENDING: 'pending' as const,
  /** Approved by user */
  APPROVED: 'approved' as const,
  /** Rejected by user */
  REJECTED: 'rejected' as const,
  /** Needs revision */
  NEEDS_REVISION: 'needs_revision' as const,
};

export type ApprovalStatus = typeof ApprovalStatus[keyof typeof ApprovalStatus];

/**
 * Writing style options
 */
export const WritingStyle = {
  DESCRIPTIVE: 'descriptive' as const,
  MINIMALIST: 'minimalist' as const,
  DIALOG_HEAVY: 'dialog_heavy' as const,
  POETIC: 'poetic' as const,
  TECHNICAL: 'technical' as const,
};

export type WritingStyle = typeof WritingStyle[keyof typeof WritingStyle];

/**
 * Consistency check intensity levels
 */
export const ConsistencyCheckIntensity = {
  LIGHT: 'light' as const,
  MEDIUM: 'medium' as const,
  THOROUGH: 'thorough' as const,
};

export type ConsistencyCheckIntensity = typeof ConsistencyCheckIntensity[keyof typeof ConsistencyCheckIntensity];

/**
 * Methodology option configuration
 */
export interface MethodologyOption {
  /** Unique identifier for the option */
  id: string;
  /** Display name */
  name: string;
  /** Description of the option */
  description: string;
  /** Type of value */
  valueType: 'boolean' | 'number' | 'string' | 'select';
  /** Default value */
  defaultValue: boolean | number | string;
  /** Available options (for select type) */
  options?: { value: string; label: string }[];
  /** Minimum value (for number type) */
  min?: number;
  /** Maximum value (for number type) */
  max?: number;
}

/**
 * Structured Draft & Refine specific options
 */
export interface StructuredDraftRefineOptions {
  /** Auto-advance after approval */
  autoAdvance: boolean;
  /** Manual review required for each phase */
  manualReview: boolean;
  /** Generate all summaries first, then expand */
  batchSummaries: boolean;
}

/**
 * Linear Progressive specific options
 */
export interface LinearProgressiveOptions {
  /** Number of expansion passes (1-3) */
  expansionPasses: number;
  /** Include character arc diagrams */
  includeCharacterArcs: boolean;
  /** Include scene breakdowns */
  includeSceneBreakdowns: boolean;
}

/**
 * Iterative Chapter specific options
 */
export interface IterativeChapterOptions {
  /** Number of chapters per batch (1, 2, or 3) */
  chaptersPerBatch: number;
  /** Consistency check intensity */
  consistencyIntensity: ConsistencyCheckIntensity;
  /** Allow chapter reordering */
  allowReordering: boolean;
}

/**
 * Common methodology settings
 */
export interface MethodologySettings {
  /** Writing style preference */
  writingStyle: WritingStyle;
  /** Enable tone consistency check */
  toneConsistencyCheck: boolean;
  /** Enable character voice consistency */
  characterVoiceConsistency: boolean;
  /** Enable revision history tracking */
  revisionHistory: boolean;
}

/**
 * State for a single phase in the methodology
 */
export interface PhaseState {
  /** Phase identifier */
  phase: StoryPhase;
  /** Current approval status */
  status: ApprovalStatus;
  /** Generated content for this phase */
  content?: string;
  /** Summary/Outline content */
  summary?: string;
  /** User feedback/revision notes */
  feedback?: string;
  /** Timestamp when phase was completed */
  completedAt?: Date;
  /** Revision count */
  revisionCount: number;
}

/**
 * Methodology state tracking
 */
export interface MethodologyState {
  /** Current methodology type */
  methodology: StoryMethodologyType;
  /** Current active phase */
  currentPhase: StoryPhase;
  /** All phases in the methodology */
  phases: PhaseState[];
  /** Methodology-specific options */
  options: StructuredDraftRefineOptions | LinearProgressiveOptions | IterativeChapterOptions;
  /** Common settings */
  settings: MethodologySettings;
  /** Overall progress (0-100) */
  progress: number;
  /** Whether the methodology is complete */
  isComplete: boolean;
}

/**
 * Revision history entry
 */
export interface RevisionEntry {
  /** Unique identifier */
  id: string;
  /** Phase that was revised */
  phase: StoryPhase;
  /** Original content */
  originalContent: string;
  /** Revised content */
  revisedContent: string;
  /** User notes for the revision */
  notes: string;
  /** Timestamp */
  timestamp: Date;
}

/**
 * Character arc diagram
 */
export interface CharacterArc {
  /** Character name */
  characterName: string;
  /** Arc type (rising, falling, flat, circular) */
  arcType: 'rising' | 'falling' | 'flat' | 'circular';
  /** Key turning points */
  turningPoints: { chapter: number; description: string }[];
  /** Character growth description */
  growth: string;
}

/**
 * Scene breakdown
 */
export interface SceneBreakdown {
  /** Chapter number */
  chapter: number;
  /** Scene number within chapter */
  sceneNumber: number;
  /** Scene location */
  location: string;
  /** Characters present */
  characters: string[];
  /** Scene purpose */
  purpose: string;
  /** Scene summary */
  summary: string;
}

/**
 * Story skeleton structure
 */
export interface StorySkeleton {
  /** Intro summary */
  introSummary: string;
  /** Chapter outlines */
  chapterOutlines: { chapter: number; outline: string; keyEvents: string[] }[];
  /** Ending summary */
  endingSummary: string;
  /** Character arcs (optional) */
  characterArcs?: CharacterArc[];
  /** Scene breakdowns (optional) */
  sceneBreakdowns?: SceneBreakdown[];
}

/**
 * Master outline for iterative chapter methodology
 */
export interface MasterOutline {
  /** Story premise */
  premise: string;
  /** Plot structure */
  plotStructure: {
    act: number;
    description: string;
    keyEvents: string[];
  }[];
  /** Character arcs */
  characterArcs: CharacterArc[];
  /** Chapter-by-chapter breakdown */
  chapterBreakdowns: {
    chapter: number;
    title: string;
    summary: string;
    keyScenes: string[];
    characterFocus: string[];
  }[];
  /** Thematic elements */
  themes: string[];
}

/**
 * Methodology description for UI display
 */
export interface MethodologyDescription {
  /** Methodology type */
  type: StoryMethodologyType;
  /** Display name */
  name: string;
  /** Short description */
  shortDescription: string;
  /** Full description */
  description: string;
  /** Icon identifier */
  icon: string;
  /** Color theme */
  color: string;
  /** Phases in this methodology */
  phases: { phase: StoryPhase; name: string; description: string }[];
  /** Available options */
  options: MethodologyOption[];
}

/**
 * Result of a phase generation
 */
export interface PhaseGenerationResult {
  /** Phase that was generated */
  phase: StoryPhase;
  /** Generated content */
  content: string;
  /** Summary (if applicable) */
  summary?: string;
  /** Quality scores */
  scores?: {
    tension: number;
    drama: number;
    sense: number;
    emotion: number;
    overall: number;
  };
  /** Any warnings or suggestions */
  suggestions?: string[];
}

/**
 * Validation result for consistency checks
 */
export interface ConsistencyValidationResult {
  /** Whether the check passed */
  passed: boolean;
  /** Issues found */
  issues: {
    type: 'tone' | 'character_voice' | 'plot_hole' | 'timeline' | 'other';
    description: string;
    severity: 'low' | 'medium' | 'high';
    suggestedFix?: string;
  }[];
  /** Overall consistency score (0-100) */
  score: number;
}

/**
 * Methodology factory interface
 */
export interface IMethodologyFactory {
  /** Create a new methodology instance */
  createMethodology(
    type: StoryMethodologyType,
    options?: Partial<MethodologyState['options']>
  ): IStoryMethodology;
  
  /** Get methodology description */
  getDescription(type: StoryMethodologyType): MethodologyDescription;
  
  /** Get all available methodologies */
  getAvailableMethodologies(): MethodologyDescription[];
}

/**
 * Story methodology interface
 */
export interface IStoryMethodology {
  /** Get the type of this methodology */
  getType(): StoryMethodologyType;
  
  /** Get the current state */
  getState(): MethodologyState;
  
  /** Get the next phase */
  getNextPhase(): StoryPhase | null;
  
  /** Get the previous phase */
  getPreviousPhase(): StoryPhase | null;
  
  /** Check if a phase can be started */
  canStartPhase(phase: StoryPhase): boolean;
  
  /** Start a new phase */
  startPhase(phase: StoryPhase): Promise<void>;
  
  /** Complete a phase with content */
  completePhase(phase: StoryPhase, content: PhaseGenerationResult): void;
  
  /** Submit approval for a phase */
  approvePhase(phase: StoryPhase, feedback?: string): void;
  
  /** Request revision for a phase */
  requestRevision(phase: StoryPhase, feedback: string): void;
  
  /** Generate content for a phase */
  generateContent(
    phase: StoryPhase,
    params: unknown,
    onProgress?: (progress: unknown) => void
  ): Promise<PhaseGenerationResult>;
  
  /** Check consistency */
  checkConsistency(intensity: ConsistencyCheckIntensity): Promise<ConsistencyValidationResult>;
  
  /** Get available transitions */
  getAvailableTransitions(): { from: StoryPhase; to: StoryPhase }[];
  
  /** Reset the methodology */
  reset(): void;
  
  /** Export final story */
  exportStory(): Promise<{
    content: string;
    summary: string;
    metadata: unknown;
  }>;
}


