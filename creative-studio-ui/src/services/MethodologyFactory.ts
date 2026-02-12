// ============================================================================
// Methodology Factory
// Creates and manages story methodology instances
// ============================================================================

import {
  StoryMethodologyType,
  StoryPhase,
  ApprovalStatus,
  WritingStyle,
  ConsistencyCheckIntensity,
  MethodologyDescription,
  MethodologyOption,
  MethodologyState,
  IStoryMethodology,
} from '../types/storyMethodology';
import {
  StructuredDraftRefineMethodology,
  LinearProgressiveMethodology,
  IterativeChapterMethodology,
  SequentialMethodology,
} from './storyMethodologies';

// ============================================================================
// Type aliases for clarity
// ============================================================================

type StoryMethodologyTypeValue = typeof StoryMethodologyType[keyof typeof StoryMethodologyType];

// ============================================================================
// Methodology Descriptions
// ============================================================================

const METHODOLOGY_DESCRIPTIONS: Record<StoryMethodologyTypeValue, MethodologyDescription> = {
  ['sequential']: {
    type: 'sequential',
    name: 'Sequential',
    shortDescription: 'Traditional intro → chapters → ending flow',
    description: `The classic story creation approach where the story is generated in a linear sequence:
    1. Generate the introduction
    2. Expand into full story with chapters
    3. Final review and polish

    Best for: Simple stories, beginners, or when you want a straightforward approach.`,
    icon: 'list-ordered',
    color: '#3b82f6',
    phases: [
      { phase: 'intro_summary' as any, name: 'Introduction', description: 'Generate story introduction' },
      { phase: 'full_content' as any, name: 'Full Story', description: 'Expand to complete story' },
    ],
    options: [],
  },
  
  ['structured_draft_refine']: {
    type: 'structured_draft_refine',
    name: 'Structured Draft & Refine',
    shortDescription: 'Multi-phase review with full control',
    description: `A comprehensive approach with deliberate planning and revision phases:
    1. **Phase 1 - Intro Summary**: Generate and review intro outline
    2. **Phase 2 - Chapter Outlines**: Create detailed chapter plans
    3. **Phase 3 - Ending Summary**: Plan the conclusion
    4. **Phase 4 - Full Content**: Expand all summaries to full content
    5. **Phase 5 - Revision**: Targeted refinements based on feedback

    Best for: Complex stories, writers who want full control over structure.`,
    icon: 'layout-template',
    color: '#8b5cf6',
    phases: [
      { phase: 'intro_summary' as any, name: 'Intro Summary', description: 'Create introduction outline' },
      { phase: 'chapter_outline' as any, name: 'Chapter Outlines', description: 'Plan each chapter' },
      { phase: 'ending_summary' as any, name: 'Ending Summary', description: 'Plan the conclusion' },
      { phase: 'full_content' as any, name: 'Full Content', description: 'Expand to complete story' },
      { phase: 'revision' as any, name: 'Revision', description: 'Refine based on feedback' },
    ],
    options: [
      {
        id: 'autoAdvance',
        name: 'Auto-advance',
        description: 'Automatically move to next phase after approval',
        valueType: 'boolean',
        defaultValue: false,
      },
      {
        id: 'manualReview',
        name: 'Manual Review Required',
        description: 'Require explicit approval before advancing',
        valueType: 'boolean',
        defaultValue: true,
      },
      {
        id: 'batchSummaries',
        name: 'Batch Summaries',
        description: 'Generate all summaries before expanding',
        valueType: 'boolean',
        defaultValue: false,
      },
    ],
  },
  
  ['linear_progressive']: {
    type: 'linear_progressive',
    name: 'Linear Progressive',
    shortDescription: 'Skeleton-first with single expansion',
    description: `A streamlined approach for efficient story creation:
    1. **Phase 1 - Story Skeleton**: Generate complete story structure in one pass
    2. **Phase 2 - Skeleton Review**: Review and adjust the entire structure
    3. **Phase 3 - Full Expansion**: Expand skeleton to complete story
    4. **Phase 4 - Polish**: Final quality check and refinements

    Best for: Experienced writers who want a faster process with built-in planning.`,
    icon: 'trending-up',
    color: '#10b981',
    phases: [
      { phase: 'skeleton' as any, name: 'Story Skeleton', description: 'Generate complete structure' },
      { phase: 'skeleton_review' as any, name: 'Skeleton Review', description: 'Review and adjust structure' },
      { phase: 'full_expansion' as any, name: 'Full Expansion', description: 'Expand to complete story' },
      { phase: 'polish' as any, name: 'Polish', description: 'Final refinements' },
    ],
    options: [
      {
        id: 'expansionPasses',
        name: 'Expansion Passes',
        description: 'Number of times to expand content (higher = more refined)',
        valueType: 'number',
        defaultValue: 1,
        min: 1,
        max: 3,
      },
      {
        id: 'includeCharacterArcs',
        name: 'Include Character Arcs',
        description: 'Generate character arc diagrams',
        valueType: 'boolean',
        defaultValue: false,
      },
      {
        id: 'includeSceneBreakdowns',
        name: 'Include Scene Breakdowns',
        description: 'Generate detailed scene breakdowns',
        valueType: 'boolean',
        defaultValue: false,
      },
    ],
  },
  
  ['iterative_chapter']: {
    type: 'iterative_chapter',
    name: 'Iterative Chapter-by-Chapter',
    shortDescription: 'Deep refinement with per-chapter control',
    description: `The most thorough approach with maximum control:
    1. **Phase 1 - Master Outline**: Create comprehensive story blueprint
    2. **Phase 2-N+1 - Per-Chapter Generation**: Generate chapters in batches with review
    3. **Phase N+1 - Ending**: Generate and review ending
    4. **Phase N+2 - Global Consistency**: Cross-check all parts for consistency

    Best for: Long-form fiction, series planning, maximum quality control.`,
    icon: 'book-open',
    color: '#f59e0b',
    phases: [
      { phase: 'master_outline' as any, name: 'Master Outline', description: 'Create comprehensive blueprint' },
      { phase: 'chapter_generation' as any, name: 'Chapter Generation', description: 'Generate chapters in batches' },
      { phase: 'ending_summary' as any, name: 'Ending', description: 'Generate ending' },
      { phase: 'consistency_check' as any, name: 'Consistency Check', description: 'Cross-check all parts' },
    ],
    options: [
      {
        id: 'chaptersPerBatch',
        name: 'Chapters Per Batch',
        description: 'Number of chapters to generate before review',
        valueType: 'number',
        defaultValue: 1,
        min: 1,
        max: 3,
      },
      {
        id: 'consistencyIntensity',
        name: 'Consistency Check Intensity',
        description: 'How thoroughly to check consistency',
        valueType: 'select',
        defaultValue: 'medium',
        options: [
          { value: 'light', label: 'Light' },
          { value: 'medium', label: 'Medium' },
          { value: 'thorough', label: 'Thorough' },
        ],
      },
      {
        id: 'allowReordering',
        name: 'Allow Chapter Reordering',
        description: 'Allow reordering chapters after generation',
        valueType: 'boolean',
        defaultValue: false,
      },
    ],
  },
};

// ============================================================================
// Methodology Factory Implementation
// ============================================================================

export class MethodologyFactory {
  private static instance: MethodologyFactory | null = null;
  private currentMethodology: IStoryMethodology | null = null;
  
  private constructor() {
    // Singleton pattern
  }
  
  /**
   * Get the singleton instance
   */
  static getInstance(): MethodologyFactory {
    if (!MethodologyFactory.instance) {
      MethodologyFactory.instance = new MethodologyFactory();
    }
    return MethodologyFactory.instance;
  }
  
  /**
   * Create a new methodology instance
   */
  createMethodology(
    type: StoryMethodologyTypeValue,
    options?: Partial<MethodologyState['options']>,
    settings?: Partial<MethodologyState['settings']>
  ): IStoryMethodology {
    switch (type) {
      case 'sequential':
        this.currentMethodology = new SequentialMethodology(type as any, options || {}, settings || {});
        break;
        
      case 'structured_draft_refine':
        this.currentMethodology = new StructuredDraftRefineMethodology(type as any, options || {}, settings || {});
        break;
        
      case 'linear_progressive':
        this.currentMethodology = new LinearProgressiveMethodology(type as any, options || {}, settings || {});
        break;
        
      case 'iterative_chapter':
        this.currentMethodology = new IterativeChapterMethodology(type as any, options || {}, settings || {});
        break;
        
      default:
        throw new Error(`Unknown methodology type: ${type}`);
    }
    
    return this.currentMethodology;
  }
  
  /**
   * Get description for a methodology type
   */
  getDescription(type: StoryMethodologyTypeValue): MethodologyDescription {
    const description = METHODOLOGY_DESCRIPTIONS[type];
    if (!description) {
      throw new Error(`Unknown methodology type: ${type}`);
    }
    return description;
  }
  
  /**
   * Get all available methodology descriptions
   */
  getAvailableMethodologies(): MethodologyDescription[] {
    return Object.values(METHODOLOGY_DESCRIPTIONS);
  }
  
  /**
   * Get the current active methodology instance
   */
  getCurrentMethodology(): IStoryMethodology | null {
    return this.currentMethodology;
  }
  
  /**
   * Check if a methodology type is available
   */
  isMethodologyAvailable(type: StoryMethodologyTypeValue): boolean {
    return type in METHODOLOGY_DESCRIPTIONS;
  }
  
  /**
   * Get default options for a methodology type
   */
  getDefaultOptions(type: StoryMethodologyTypeValue): Record<string, unknown> {
    const description = this.getDescription(type);
    const options: Record<string, unknown> = {};
    
    for (const option of description.options) {
      options[option.id] = option.defaultValue;
    }
    
    return options;
  }
  
  /**
   * Validate options against methodology requirements
   */
  validateOptions(
    type: StoryMethodologyTypeValue,
    options: Record<string, unknown>
  ): { valid: boolean; errors: string[] } {
    const description = this.getDescription(type);
    const errors: string[] = [];
    
    for (const option of description.options) {
      const value = options[option.id];
      
      if (value === undefined) {
        continue; // Use default
      }
      
      if (option.valueType === 'number') {
        if (typeof value !== 'number') {
          errors.push(`Option "${option.name}" must be a number`);
        } else if (option.min !== undefined && value < option.min) {
          errors.push(`Option "${option.name}" must be at least ${option.min}`);
        } else if (option.max !== undefined && value > option.max) {
          errors.push(`Option "${option.name}" must be at most ${option.max}`);
        }
      } else if (option.valueType === 'boolean') {
        if (typeof value !== 'boolean') {
          errors.push(`Option "${option.name}" must be a boolean`);
        }
      } else if (option.valueType === 'string' || option.valueType === 'select') {
        if (typeof value !== 'string') {
          errors.push(`Option "${option.name}" must be a string`);
        } else if (option.options && !option.options.some(o => o.value === value)) {
          errors.push(`Option "${option.name}" must be one of: ${option.options.map(o => o.label).join(', ')}`);
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }
  
  /**
   * Convert user-friendly options to methodology options
   */
  applyUserOptions(
    _type: StoryMethodologyTypeValue,
    userOptions: Record<string, unknown>
  ): Record<string, unknown> {
    return { ...userOptions };
  }
}

// Export singleton instance
export const methodologyFactory = MethodologyFactory.getInstance();
