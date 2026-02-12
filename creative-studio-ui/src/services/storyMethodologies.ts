// ============================================================================
// Story Methodologies Implementation
// Template Method Pattern for Story Generation
// ============================================================================

import {
  StoryMethodologyType,
  StoryPhase,
  ApprovalStatus,
  WritingStyle,
  ConsistencyCheckIntensity,
  MethodologyState,
  PhaseState,
  PhaseGenerationResult,
  ConsistencyValidationResult,
  MethodologySettings,
  StructuredDraftRefineOptions,
  LinearProgressiveOptions,
  IterativeChapterOptions,
  StorySkeleton,
  MasterOutline,
  RevisionEntry,
  IStoryMethodology,
} from '../types/storyMethodology';
import type { StoryGenerationParams, StoryPart, GenerationProgress, ReviewScore } from '../types/story';
import { storyReviewer } from './StoryReviewer';
import { generateStoryContent, generateStorySummary } from './storyGenerationService';

// ============================================================================
// Base Abstract Class
// ============================================================================

/**
 * Base class for all story methodologies
 * Implements template method pattern with common functionality
 */
export abstract class BaseStoryMethodology implements IStoryMethodology {
  protected state: MethodologyState;
  protected revisionHistory: RevisionEntry[] = [];
  protected abstract phaseOrder: StoryPhase[];
  
  constructor(
    methodologyType: StoryMethodologyType,
    options: Partial<MethodologyState['options']>,
    settings: Partial<MethodologySettings>
  ) {
    this.state = this.createInitialState(methodologyType, options, settings);
  }
  
  // ============================================================================
  // State Management
  // ============================================================================
  
  protected createInitialState(
    type: StoryMethodologyType,
    options: Partial<MethodologyState['options']>,
    settings: Partial<MethodologySettings>
  ): MethodologyState {
    const defaultSettings: MethodologySettings = {
      writingStyle: WritingStyle.DESCRIPTIVE,
      toneConsistencyCheck: true,
      characterVoiceConsistency: true,
      revisionHistory: true,
      ...settings,
    };
    
    return {
      methodology: type,
      currentPhase: this.getStartingPhase(),
      phases: this.createInitialPhases(),
      options: this.getDefaultOptions(type, options),
      settings: defaultSettings,
      progress: 0,
      isComplete: false,
    };
  }
  
  protected abstract getStartingPhase(): StoryPhase;
  
  protected abstract createInitialPhases(): PhaseState[];
  
  protected abstract getDefaultOptions(
    type: StoryMethodologyType,
    userOptions: Partial<MethodologyState['options']>
  ): MethodologyState['options'];
  
  // ============================================================================
  // IStoryMethodology Interface Implementation
  // ============================================================================
  
  getType(): StoryMethodologyType {
    return this.state.methodology;
  }
  
  getState(): MethodologyState {
    return { ...this.state };
  }
  
  getCurrentPhase(): StoryPhase {
    return this.state.currentPhase;
  }
  
  getNextPhase(): StoryPhase | null {
    const currentIndex = this.phaseOrder.indexOf(this.state.currentPhase);
    if (currentIndex < this.phaseOrder.length - 1) {
      return this.phaseOrder[currentIndex + 1];
    }
    return null;
  }
  
  getPreviousPhase(): StoryPhase | null {
    const currentIndex = this.phaseOrder.indexOf(this.state.currentPhase);
    if (currentIndex > 0) {
      return this.phaseOrder[currentIndex - 1];
    }
    return null;
  }
  
  canStartPhase(phase: StoryPhase): boolean {
    const phaseIndex = this.phaseOrder.indexOf(phase);
    if (phaseIndex === 0) return true;
    
    const previousPhase = this.phaseOrder[phaseIndex - 1];
    const previousPhaseState = this.state.phases.find(p => p.phase === previousPhase);
    
    return previousPhaseState?.status === ApprovalStatus.APPROVED;
  }
  
  async startPhase(phase: StoryPhase): Promise<void> {
    if (!this.canStartPhase(phase)) {
      throw new Error(`Cannot start phase ${phase}. Previous phase must be approved.`);
    }
    
    this.state.currentPhase = phase;
    const phaseState = this.state.phases.find(p => p.phase === phase);
    if (phaseState) {
      phaseState.status = ApprovalStatus.PENDING;
    }
    
    this.updateProgress();
  }
  
  completePhase(phase: StoryPhase, result: PhaseGenerationResult): void {
    const phaseState = this.state.phases.find(p => p.phase === phase);
    if (!phaseState) {
      throw new Error(`Phase ${phase} not found in state`);
    }
    
    phaseState.content = result.content;
    phaseState.summary = result.summary;
    phaseState.status = ApprovalStatus.PENDING;
    phaseState.completedAt = new Date();
    
    this.updateProgress();
  }
  
  approvePhase(phase: StoryPhase, feedback?: string): void {
    const phaseState = this.state.phases.find(p => p.phase === phase);
    if (!phaseState) {
      throw new Error(`Phase ${phase} not found in state`);
    }
    
    phaseState.status = ApprovalStatus.APPROVED;
    if (feedback) {
      phaseState.feedback = feedback;
    }
    
    // Auto-advance if configured
    const options = this.state.options as StructuredDraftRefineOptions;
    if ('autoAdvance' in options && options.autoAdvance) {
      const nextPhase = this.getNextPhase();
      if (nextPhase) {
        this.state.currentPhase = nextPhase;
      }
    }
    
    this.updateProgress();
  }
  
  requestRevision(phase: StoryPhase, feedback: string): void {
    const phaseState = this.state.phases.find(p => p.phase === phase);
    if (!phaseState) {
      throw new Error(`Phase ${phase} not found in state`);
    }
    
    phaseState.status = ApprovalStatus.NEEDS_REVISION;
    phaseState.feedback = feedback;
    phaseState.revisionCount++;
    
    // Save revision to history if enabled
    if (this.state.settings.revisionHistory && phaseState.content) {
      this.revisionHistory.push({
        id: crypto.randomUUID(),
        phase,
        originalContent: phaseState.content,
        revisedContent: '',
        notes: feedback,
        timestamp: new Date(),
      });
    }
  }
  
  abstract generateContent(
    phase: StoryPhase,
    params: StoryGenerationParams,
    onProgress?: (progress: GenerationProgress) => void
  ): Promise<PhaseGenerationResult>;
  
  async checkConsistency(intensity: ConsistencyCheckIntensity): Promise<ConsistencyValidationResult> {
    // Collect all approved content
    const approvedContent = this.state.phases
      .filter(p => p.status === ApprovalStatus.APPROVED && p.content)
      .map(p => p.content!)
      .join('\n\n');
    
    const issues: ConsistencyValidationResult['issues'] = [];
    let score = 100;
    
    // Tone consistency check
    if (this.state.settings.toneConsistencyCheck) {
      const toneIssues = await this.checkToneConsistency(approvedContent, intensity);
      issues.push(...toneIssues.issues);
      score -= toneIssues.scoreDrop;
    }
    
    // Character voice consistency
    if (this.state.settings.characterVoiceConsistency) {
      const voiceIssues = await this.checkCharacterVoiceConsistency(approvedContent, intensity);
      issues.push(...voiceIssues.issues);
      score -= voiceIssues.scoreDrop;
    }
    
    return {
      passed: score >= 70,
      issues,
      score: Math.max(0, score),
    };
  }
  
  protected async checkToneConsistency(
    content: string,
    intensity: ConsistencyCheckIntensity
  ): Promise<{ issues: ConsistencyValidationResult['issues']; scoreDrop: number }> {
    // Simplified tone check - in production would use LLM analysis
    const issues: ConsistencyValidationResult['issues'] = [];
    let scoreDrop = 0;
    
    if (intensity === ConsistencyCheckIntensity.THOROUGH) {
      // More intensive checking
      scoreDrop = 5;
    } else if (intensity === ConsistencyCheckIntensity.MEDIUM) {
      scoreDrop = 3;
    } else {
      scoreDrop = 1;
    }
    
    return { issues, scoreDrop };
  }
  
  protected async checkCharacterVoiceConsistency(
    content: string,
    intensity: ConsistencyCheckIntensity
  ): Promise<{ issues: ConsistencyValidationResult['issues']; scoreDrop: number }> {
    const issues: ConsistencyValidationResult['issues'] = [];
    let scoreDrop = 0;
    
    if (intensity === ConsistencyCheckIntensity.THOROUGH) {
      scoreDrop = 5;
    } else if (intensity === ConsistencyCheckIntensity.MEDIUM) {
      scoreDrop = 3;
    } else {
      scoreDrop = 1;
    }
    
    return { issues, scoreDrop };
  }
  
  getAvailableTransitions(): { from: StoryPhase; to: StoryPhase }[] {
    const transitions: { from: StoryPhase; to: StoryPhase }[] = [];
    
    for (let i = 0; i < this.phaseOrder.length - 1; i++) {
      transitions.push({
        from: this.phaseOrder[i],
        to: this.phaseOrder[i + 1],
      });
    }
    
    return transitions;
  }
  
  reset(): void {
    this.state.phases.forEach(p => {
      p.status = ApprovalStatus.PENDING;
      p.content = undefined;
      p.summary = undefined;
      p.feedback = undefined;
      p.completedAt = undefined;
      p.revisionCount = 0;
    });
    this.state.currentPhase = this.getStartingPhase();
    this.state.progress = 0;
    this.state.isComplete = false;
    this.revisionHistory = [];
  }
  
  async exportStory(): Promise<{
    content: string;
    summary: string;
    metadata: Record<string, unknown>;
  }> {
    const allContent = this.state.phases
      .filter(p => p.content)
      .map(p => p.content!)
      .join('\n\n');
    
    let summary = '';
    try {
      summary = await generateStorySummary(allContent);
    } catch {
      summary = allContent.substring(0, 500) + '...';
    }
    
    return {
      content: allContent,
      summary,
      metadata: {
        methodology: this.state.methodology,
        phases: this.state.phases.map(p => ({
          phase: p.phase,
          status: p.status,
          revisionCount: p.revisionCount,
        })),
        settings: this.state.settings,
        revisionHistory: this.revisionHistory,
      },
    };
  }
  
  // ============================================================================
  // Protected Helpers
  // ============================================================================
  
  protected updateProgress(): void {
    const totalPhases = this.state.phases.length;
    const completedPhases = this.state.phases.filter(
      p => p.status === ApprovalStatus.APPROVED
    ).length;
    
    this.state.progress = Math.round((completedPhases / totalPhases) * 100);
    this.state.isComplete = completedPhases === totalPhases;
  }
  
  protected async generatePhaseContent(
    phase: StoryPhase,
    params: StoryGenerationParams,
    prompt: string,
    onProgress?: (progress: GenerationProgress) => void
  ): Promise<PhaseGenerationResult> {
    onProgress?.({
      stage: 'generating_intro',
      progress: 0,
      currentTask: `Generating ${phase}...`,
    });
    
    let content = '';
    try {
      const { getLLMService } = await import('./llmService');
      const llmService = getLLMService();
      
      const response = await llmService.generateText(prompt, {
        temperature: 0.8,
        maxTokens: 2000,
      });
      
      content = response.trim();
    } catch (error) {
      console.error(`[StoryMethodology] Failed to generate ${phase}:`, error);
      content = this.createFallbackContent(phase, params);
    }
    
    let scores: ReviewScore = { tension: 50, drama: 50, sense: 70, emotion: 50, overall: 55 };
    try {
      scores = await storyReviewer.reviewPart(content, { genre: params.genre, tone: params.tone });
    } catch {
      // Use default scores
    }
    
    let summary = '';
    try {
      summary = await generateStorySummary(content);
    } catch {
      summary = content.substring(0, 200) + '...';
    }
    
    onProgress?.({
      stage: 'complete',
      progress: 100,
      currentTask: `${phase} complete`,
    });
    
    return {
      phase,
      content,
      summary,
      scores,
    };
  }
  
  protected createFallbackContent(phase: StoryPhase, params: StoryGenerationParams): string {
    const charNames = params.characters?.map((c) => c.name).join(', ') || 'the characters';
    const locationNames = params.locations?.map((l) => l.name).join(', ') || 'the world';
    
    const fallbackContent: Record<StoryPhase, string> = {
      [StoryPhase.INTRO_SUMMARY]: `The story begins in ${locationNames}, introducing ${charNames} as they embark on an adventure.`,
      [StoryPhase.CHAPTER_OUTLINE]: `Chapter outline covering key plot developments and character arcs.`,
      [StoryPhase.ENDING_SUMMARY]: `The story concludes with resolution of the main conflict.`,
      [StoryPhase.FULL_CONTENT]: `Full story content expanding on the summaries.`,
      [StoryPhase.REVISION]: `Revised content based on feedback.`,
      [StoryPhase.SKELETON]: `Complete story skeleton with all structural elements.`,
      [StoryPhase.SKELETON_REVIEW]: `Reviewed and approved skeleton.`,
      [StoryPhase.FULL_EXPANSION]: `Fully expanded story from skeleton.`,
      [StoryPhase.POLISH]: `Polished and refined story content.`,
      [StoryPhase.MASTER_OUTLINE]: `Comprehensive master outline for the entire story.`,
      [StoryPhase.CHAPTER_GENERATION]: `Generated chapter content.`,
      [StoryPhase.CONSISTENCY_CHECK]: `Consistency validation complete.`,
    };
    
    return fallbackContent[phase] || 'Generated content';
  }
}

// ============================================================================
// Methodology 1: Structured Draft & Refine
// ============================================================================

export class StructuredDraftRefineMethodology extends BaseStoryMethodology {
  protected phaseOrder: StoryPhase[] = [
    StoryPhase.INTRO_SUMMARY,
    StoryPhase.CHAPTER_OUTLINE,
    StoryPhase.ENDING_SUMMARY,
    StoryPhase.FULL_CONTENT,
    StoryPhase.REVISION,
  ];
  
  protected getStartingPhase(): StoryPhase {
    return StoryPhase.INTRO_SUMMARY;
  }
  
  protected createInitialPhases(): PhaseState[] {
    return [
      { phase: StoryPhase.INTRO_SUMMARY, status: ApprovalStatus.PENDING, revisionCount: 0 },
      { phase: StoryPhase.CHAPTER_OUTLINE, status: ApprovalStatus.PENDING, revisionCount: 0 },
      { phase: StoryPhase.ENDING_SUMMARY, status: ApprovalStatus.PENDING, revisionCount: 0 },
      { phase: StoryPhase.FULL_CONTENT, status: ApprovalStatus.PENDING, revisionCount: 0 },
      { phase: StoryPhase.REVISION, status: ApprovalStatus.PENDING, revisionCount: 0 },
    ];
  }
  
  protected getDefaultOptions(
    type: StoryMethodologyType,
    userOptions: Partial<MethodologyState['options']>
  ): StructuredDraftRefineOptions {
    return {
      autoAdvance: false,
      manualReview: true,
      batchSummaries: false,
      ...userOptions,
    } as StructuredDraftRefineOptions;
  }
  
  async generateContent(
    phase: StoryPhase,
    params: StoryGenerationParams,
    onProgress?: (progress: GenerationProgress) => void
  ): Promise<PhaseGenerationResult> {
    switch (phase) {
      case StoryPhase.INTRO_SUMMARY:
        return this.generateIntroSummary(params, onProgress);
      case StoryPhase.CHAPTER_OUTLINE:
        return this.generateChapterOutlines(params, onProgress);
      case StoryPhase.ENDING_SUMMARY:
        return this.generateEndingSummary(params, onProgress);
      case StoryPhase.FULL_CONTENT:
        return this.generateFullContent(params, onProgress);
      case StoryPhase.REVISION:
        return this.generateRevision(params, onProgress);
      default:
        throw new Error(`Unknown phase: ${phase}`);
    }
  }
  
  private async generateIntroSummary(
    params: StoryGenerationParams,
    onProgress?: (progress: GenerationProgress) => void
  ): Promise<PhaseGenerationResult> {
    const prompt = `
Generate a detailed intro summary for a ${params.genre.join(', ')} story with ${params.tone.join(', ')} tone.

World Context:
${JSON.stringify(params.worldContext)}

Characters:
${params.characters?.map((c) => `- ${c.name}: ${c.description || c.role}`).join('\n') || 'No characters specified'}

Locations:
${params.locations?.map((l) => `- ${l.name}: ${l.description || l.type}`).join('\n') || 'No locations specified'}

Write a comprehensive introduction summary (200-400 words) that establishes:
1. The opening scene and setting
2. Main character introductions
3. Initial conflict or inciting incident
4. The story's premise

Output only the summary content.
`;
    
    return this.generatePhaseContent(StoryPhase.INTRO_SUMMARY, params, prompt, onProgress);
  }
  
  private async generateChapterOutlines(
    params: StoryGenerationParams,
    onProgress?: (progress: GenerationProgress) => void
  ): Promise<PhaseGenerationResult> {
    const introPhase = this.state.phases.find(p => p.phase === StoryPhase.INTRO_SUMMARY);
    const previousContext = introPhase?.summary || '';
    
    const chapterCount = this.getChapterCount(params.length);
    
    const prompt = `
Generate chapter outlines for a ${params.genre.join(', ')} story with ${params.tone.join(', ')} tone.

Previous Summary:
${previousContext}

World Context:
${JSON.stringify(params.worldContext)}

Characters:
${params.characters?.map((c) => `- ${c.name}: ${c.description || c.role}`).join('\n') || 'No characters specified'}

Generate ${chapterCount} chapter outlines, each including:
1. Chapter title
2. Key events (3-5 bullet points)
3. Character development notes
4. Plot progression

Output as a structured outline with clear chapter separations.
`;
    
    return this.generatePhaseContent(StoryPhase.CHAPTER_OUTLINE, params, prompt, onProgress);
  }
  
  private async generateEndingSummary(
    params: StoryGenerationParams,
    onProgress?: (progress: GenerationProgress) => void
  ): Promise<PhaseGenerationResult> {
    const chapterPhase = this.state.phases.find(p => p.phase === StoryPhase.CHAPTER_OUTLINE);
    const previousContext = chapterPhase?.summary || '';
    
    const prompt = `
Generate an ending summary for a ${params.genre.join(', ')} story with ${params.tone.join(', ')} tone.

Previous Story Development:
${previousContext}

Write a comprehensive ending summary (200-400 words) covering:
1. Climax and turning point
2. Resolution of main conflicts
3. Character conclusions
4. Thematic closure

Output only the ending summary content.
`;
    
    return this.generatePhaseContent(StoryPhase.ENDING_SUMMARY, params, prompt, onProgress);
  }
  
  private async generateFullContent(
    params: StoryGenerationParams,
    onProgress?: (progress: GenerationProgress) => void
  ): Promise<PhaseGenerationResult> {
    const introPhase = this.state.phases.find(p => p.phase === StoryPhase.INTRO_SUMMARY);
    const chapterPhase = this.state.phases.find(p => p.phase === StoryPhase.CHAPTER_OUTLINE);
    const endingPhase = this.state.phases.find(p => p.phase === StoryPhase.ENDING_SUMMARY);
    
    const prompt = `
Expand the following story structure into full narrative content for a ${params.genre.join(', ')} story.

INTRO SUMMARY:
${introPhase?.content || ''}

CHAPTER OUTLINES:
${chapterPhase?.content || ''}

ENDING SUMMARY:
${endingPhase?.content || ''}

Writing Style: ${this.state.settings.writingStyle}

Expand each section into full narrative prose (approximately 1000-2000 words total), maintaining:
- Consistent tone throughout
- Character voice consistency
- Engaging narrative flow
- Proper pacing

Output the complete expanded story.
`;
    
    return this.generatePhaseContent(StoryPhase.FULL_CONTENT, params, prompt, onProgress);
  }
  
  private async generateRevision(
    params: StoryGenerationParams,
    onProgress?: (progress: GenerationProgress) => void
  ): Promise<PhaseGenerationResult> {
    const fullContentPhase = this.state.phases.find(p => p.phase === StoryPhase.FULL_CONTENT);
    const feedback = fullContentPhase?.feedback || '';
    
    const prompt = `
Revise the following story content based on the provided feedback.

ORIGINAL CONTENT:
${fullContentPhase?.content || ''}

FEEDBACK/REVISION NOTES:
${feedback || 'No specific feedback - perform general polish and improvement'}

Writing Style: ${this.state.settings.writingStyle}

Apply the revisions while maintaining:
- Story coherence
- Character consistency
- Tone consistency
- Narrative quality

Output the revised story content.
`;
    
    return this.generatePhaseContent(StoryPhase.REVISION, params, prompt, onProgress);
  }
  
  private getChapterCount(length: string): number {
    const counts: Record<string, number> = {
      short: 1,
      medium: 3,
      long: 5,
      short_story: 2,
      novella: 5,
      novel: 10,
      epic_novel: 15,
    };
    return counts[length] || 3;
  }
}

// ============================================================================
// Methodology 2: Linear Progressive
// ============================================================================

export class LinearProgressiveMethodology extends BaseStoryMethodology {
  protected phaseOrder: StoryPhase[] = [
    StoryPhase.SKELETON,
    StoryPhase.SKELETON_REVIEW,
    StoryPhase.FULL_EXPANSION,
    StoryPhase.POLISH,
  ];
  
  protected getStartingPhase(): StoryPhase {
    return StoryPhase.SKELETON;
  }
  
  protected createInitialPhases(): PhaseState[] {
    return [
      { phase: StoryPhase.SKELETON, status: ApprovalStatus.PENDING, revisionCount: 0 },
      { phase: StoryPhase.SKELETON_REVIEW, status: ApprovalStatus.PENDING, revisionCount: 0 },
      { phase: StoryPhase.FULL_EXPANSION, status: ApprovalStatus.PENDING, revisionCount: 0 },
      { phase: StoryPhase.POLISH, status: ApprovalStatus.PENDING, revisionCount: 0 },
    ];
  }
  
  protected getDefaultOptions(
    type: StoryMethodologyType,
    userOptions: Partial<MethodologyState['options']>
  ): LinearProgressiveOptions {
    return {
      expansionPasses: 1,
      includeCharacterArcs: false,
      includeSceneBreakdowns: false,
      ...userOptions,
    } as LinearProgressiveOptions;
  }
  
  async generateContent(
    phase: StoryPhase,
    params: StoryGenerationParams,
    onProgress?: (progress: GenerationProgress) => void
  ): Promise<PhaseGenerationResult> {
    switch (phase) {
      case StoryPhase.SKELETON:
        return this.generateSkeleton(params, onProgress);
      case StoryPhase.SKELETON_REVIEW:
        return this.generateSkeletonReview(params, onProgress);
      case StoryPhase.FULL_EXPANSION:
        return this.generateFullExpansion(params, onProgress);
      case StoryPhase.POLISH:
        return this.generatePolish(params, onProgress);
      default:
        throw new Error(`Unknown phase: ${phase}`);
    }
  }
  
  private async generateSkeleton(
    params: StoryGenerationParams,
    onProgress?: (progress: GenerationProgress) => void
  ): Promise<PhaseGenerationResult> {
    const options = this.state.options as LinearProgressiveOptions;
    
    const prompt = `
Create a complete story skeleton for a ${params.genre.join(', ')} story with ${params.tone.join(', ')} tone.

World Context:
${JSON.stringify(params.worldContext)}

Characters:
${params.characters?.map((c) => `- ${c.name}: ${c.description || c.role}`).join('\n') || 'No characters specified'}

Locations:
${params.locations?.map((l) => `- ${l.name}: ${l.description || l.type}`).join('\n') || 'No locations specified'}

${options.includeCharacterArcs ? 'Include detailed character arc diagrams.' : ''}
${options.includeSceneBreakdowns ? 'Include scene breakdowns for each chapter.' : ''}

Generate a comprehensive skeleton including:
1. Story Premise (1-2 sentences)
2. Intro Summary (150-200 words)
3. Chapter-by-Chapter Outlines with key events
4. Ending Summary (150-200 words)

Output as a structured document.
`;
    
    return this.generatePhaseContent(StoryPhase.SKELETON, params, prompt, onProgress);
  }
  
  private async generateSkeletonReview(
    params: StoryGenerationParams,
    onProgress?: (progress: GenerationProgress) => void
  ): Promise<PhaseGenerationResult> {
    const skeletonPhase = this.state.phases.find(p => p.phase === StoryPhase.SKELETON);
    const feedback = skeletonPhase?.feedback || '';
    
    const prompt = `
Review and refine the story skeleton based on feedback.

ORIGINAL SKELETON:
${skeletonPhase?.content || ''}

FEEDBACK:
${feedback || 'Perform general review and suggest improvements'}

Provide:
1. Approved sections list
2. Suggested modifications
3. Overall structure assessment

Output the reviewed skeleton with any refinements.
`;
    
    return this.generatePhaseContent(StoryPhase.SKELETON_REVIEW, params, prompt, onProgress);
  }
  
  private async generateFullExpansion(
    params: StoryGenerationParams,
    onProgress?: (progress: GenerationProgress) => void
  ): Promise<PhaseGenerationResult> {
    const options = this.state.options as LinearProgressiveOptions;
    const skeletonPhase = this.state.phases.find(p => p.phase === StoryPhase.SKELETON);
    
    const prompt = `
Expand the story skeleton into full narrative content.

SKELETON:
${skeletonPhase?.content || ''}

Writing Style: ${this.state.settings.writingStyle}

Perform ${options.expansionPasses} expansion pass(es), expanding:
- Intro into full opening section
- Each chapter outline into full chapter content
- Ending summary into full conclusion

Maintain:
- Consistent tone
- Character voice consistency
- Narrative flow
- Pacing appropriate to genre

Output the complete expanded story.
`;
    
    return this.generatePhaseContent(StoryPhase.FULL_EXPANSION, params, prompt, onProgress);
  }
  
  private async generatePolish(
    params: StoryGenerationParams,
    onProgress?: (progress: GenerationProgress) => void
  ): Promise<PhaseGenerationResult> {
    const expansionPhase = this.state.phases.find(p => p.phase === StoryPhase.FULL_EXPANSION);
    
    const prompt = `
Polish and refine the expanded story content.

EXPANDED STORY:
${expansionPhase?.content || ''}

Perform final polish including:
- Dialogue improvement
- Descriptive passages enhancement
- Pacing adjustments
- Consistency check
- Grammar and style improvements

Writing Style: ${this.state.settings.writingStyle}

Output the polished final story.
`;
    
    return this.generatePhaseContent(StoryPhase.POLISH, params, prompt, onProgress);
  }
}

// ============================================================================
// Methodology 3: Iterative Chapter-by-Chapter
// ============================================================================

export class IterativeChapterMethodology extends BaseStoryMethodology {
  protected phaseOrder: StoryPhase[] = [
    StoryPhase.MASTER_OUTLINE,
    StoryPhase.CHAPTER_GENERATION,
    StoryPhase.ENDING_SUMMARY,
    StoryPhase.CONSISTENCY_CHECK,
  ];
  
  private currentChapterIndex = 0;
  
  protected getStartingPhase(): StoryPhase {
    return StoryPhase.MASTER_OUTLINE;
  }
  
  protected createInitialPhases(): PhaseState[] {
    return [
      { phase: StoryPhase.MASTER_OUTLINE, status: ApprovalStatus.PENDING, revisionCount: 0 },
      { phase: StoryPhase.CHAPTER_GENERATION, status: ApprovalStatus.PENDING, revisionCount: 0 },
      { phase: StoryPhase.ENDING_SUMMARY, status: ApprovalStatus.PENDING, revisionCount: 0 },
      { phase: StoryPhase.CONSISTENCY_CHECK, status: ApprovalStatus.PENDING, revisionCount: 0 },
    ];
  }
  
  protected getDefaultOptions(
    type: StoryMethodologyType,
    userOptions: Partial<MethodologyState['options']>
  ): IterativeChapterOptions {
    return {
      chaptersPerBatch: 1,
      consistencyIntensity: ConsistencyCheckIntensity.MEDIUM,
      allowReordering: false,
      ...userOptions,
    } as IterativeChapterOptions;
  }
  
  async generateContent(
    phase: StoryPhase,
    params: StoryGenerationParams,
    onProgress?: (progress: GenerationProgress) => void
  ): Promise<PhaseGenerationResult> {
    switch (phase) {
      case StoryPhase.MASTER_OUTLINE:
        return this.generateMasterOutline(params, onProgress);
      case StoryPhase.CHAPTER_GENERATION:
        return this.generateChapterBatch(params, onProgress);
      case StoryPhase.ENDING_SUMMARY:
        return this.generateEndingSummary(params, onProgress);
      case StoryPhase.CONSISTENCY_CHECK:
        return this.generateConsistencyCheck(params, onProgress);
      default:
        throw new Error(`Unknown phase: ${phase}`);
    }
  }
  
  private async generateMasterOutline(
    params: StoryGenerationParams,
    onProgress?: (progress: GenerationProgress) => void
  ): Promise<PhaseGenerationResult> {
    const prompt = `
Create a comprehensive master outline for a ${params.genre.join(', ')} story with ${params.tone.join(', ')} tone.

World Context:
${JSON.stringify(params.worldContext)}

Characters:
${params.characters?.map((c) => `- ${c.name}: ${c.description || c.role}`).join('\n') || 'No characters specified'}

Locations:
${params.locations?.map((l) => `- ${l.name}: ${l.description || l.type}`).join('\n') || 'No locations specified'}

Generate a detailed master outline including:
1. Story Premise (1-2 sentences)
2. Three-Act Structure with key plot points
3. Character Arcs for each main character
4. Chapter-by-chapter breakdown with:
   - Chapter title
   - Brief summary
   - Key scenes
   - Character focus
5. Thematic elements

Output as a comprehensive outline document.
`;
    
    return this.generatePhaseContent(StoryPhase.MASTER_OUTLINE, params, prompt, onProgress);
  }
  
  private async generateChapterBatch(
    params: StoryGenerationParams,
    onProgress?: (progress: GenerationProgress) => void
  ): Promise<PhaseGenerationResult> {
    const options = this.state.options as IterativeChapterOptions;
    const outlinePhase = this.state.phases.find(p => p.phase === StoryPhase.MASTER_OUTLINE);
    const previousContent = this.getPreviousChapterContent();
    
    const chapterCount = options.chaptersPerBatch;
    
    const prompt = `
Generate chapters ${this.currentChapterIndex + 1} through ${this.currentChapterIndex + chapterCount} based on the master outline.

MASTER OUTLINE:
${outlinePhase?.content || ''}

${previousContent ? `PREVIOUS CHAPTERS:\n${previousContent}` : ''}

Writing Style: ${this.state.settings.writingStyle}

For each chapter in this batch:
1. Write full chapter content (500-1500 words)
2. Include key scenes from outline
3. Develop character focus
4. Advance plot

Output all chapters in sequence.
`;
    
    this.currentChapterIndex += chapterCount;
    
    return this.generatePhaseContent(StoryPhase.CHAPTER_GENERATION, params, prompt, onProgress);
  }
  
  private getPreviousChapterContent(): string {
    // Collect content from previous chapter generation phases
    return '';
  }
  
  private async generateEndingSummary(
    params: StoryGenerationParams,
    onProgress?: (progress: GenerationProgress) => void
  ): Promise<PhaseGenerationResult> {
    const outlinePhase = this.state.phases.find(p => p.phase === StoryPhase.MASTER_OUTLINE);
    const previousContent = this.getPreviousChapterContent();
    
    const prompt = `
Generate the ending based on the master outline and previous chapters.

MASTER OUTLINE (Ending section):
${outlinePhase?.content?.substring(0, 500) || ''}

PREVIOUS CHAPTERS:
${previousContent}

Write a compelling ending that:
1. Reaches the climax
2. Resolves all major conflicts
3. Provides character conclusions
4. Delivers thematic closure

Writing Style: ${this.state.settings.writingStyle}

Output the complete ending section.
`;
    
    return this.generatePhaseContent(StoryPhase.ENDING_SUMMARY, params, prompt, onProgress);
  }
  
  private async generateConsistencyCheck(
    params: StoryGenerationParams,
    onProgress?: (progress: GenerationProgress) => void
  ): Promise<PhaseGenerationResult> {
    const options = this.state.options as IterativeChapterOptions;
    
    onProgress?.({
      stage: 'reviewing',
      progress: 50,
      currentTask: 'Checking consistency across all chapters...',
    });
    
    const consistencyResult = await this.checkConsistency(options.consistencyIntensity);
    
    const prompt = `
Perform final consistency check and polish based on the consistency report.

CONSISTENCY REPORT:
${JSON.stringify(consistencyResult)}

Apply any necessary fixes to ensure:
- Consistent tone throughout
- Character voice consistency
- Plot coherence
- Timeline accuracy

Output the final consistent story.
`;
    
    return this.generatePhaseContent(StoryPhase.CONSISTENCY_CHECK, params, prompt, onProgress);
  }
  
  override reset(): void {
    super.reset();
    this.currentChapterIndex = 0;
  }
}

// ============================================================================
// Sequential Methodology (Backward Compatibility)
// ============================================================================

export class SequentialMethodology extends BaseStoryMethodology {
  protected phaseOrder: StoryPhase[] = [
    StoryPhase.INTRO_SUMMARY,
    StoryPhase.FULL_CONTENT,
  ];
  
  protected getStartingPhase(): StoryPhase {
    return StoryPhase.INTRO_SUMMARY;
  }
  
  protected createInitialPhases(): PhaseState[] {
    return [
      { phase: StoryPhase.INTRO_SUMMARY, status: ApprovalStatus.PENDING, revisionCount: 0 },
      { phase: StoryPhase.FULL_CONTENT, status: ApprovalStatus.PENDING, revisionCount: 0 },
    ];
  }
  
  protected getDefaultOptions(
    type: StoryMethodologyType,
    userOptions: Partial<MethodologyState['options']>
  ): Record<string, never> {
    return {};
  }
  
  async generateContent(
    phase: StoryPhase,
    params: StoryGenerationParams,
    onProgress?: (progress: GenerationProgress) => void
  ): Promise<PhaseGenerationResult> {
    // Delegate to the existing StoryWeaver logic
    switch (phase) {
      case StoryPhase.INTRO_SUMMARY:
        return this.generateIntro(params, onProgress);
      case StoryPhase.FULL_CONTENT:
        return this.generateFullStory(params, onProgress);
      default:
        throw new Error(`Unknown phase: ${phase}`);
    }
  }
  
  private async generateIntro(
    params: StoryGenerationParams,
    onProgress?: (progress: GenerationProgress) => void
  ): Promise<PhaseGenerationResult> {
    const prompt = `
Generate an engaging introduction for a ${params.genre.join(', ')} story with ${params.tone.join(', ')} tone.

World Context:
${JSON.stringify(params.worldContext)}

Characters:
${params.characters?.map((c) => `- ${c.name}: ${c.description || c.role}`).join('\n') || 'No characters specified'}

Locations:
${params.locations?.map((l) => `- ${l.name}: ${l.description || l.type}`).join('\n') || 'No locations specified'}

Write the story introduction (500-1000 words) establishing the setting, characters, and initial conflict.
`;
    
    return this.generatePhaseContent(StoryPhase.INTRO_SUMMARY, params, prompt, onProgress);
  }
  
  private async generateFullStory(
    params: StoryGenerationParams,
    onProgress?: (progress: GenerationProgress) => void
  ): Promise<PhaseGenerationResult> {
    const introPhase = this.state.phases.find(p => p.phase === StoryPhase.INTRO_SUMMARY);
    
    const prompt = `
Expand this introduction into a complete ${params.length} story.

INTRODUCTION:
${introPhase?.content || ''}

Genre: ${params.genre.join(', ')}
Tone: ${params.tone.join(', ')}
Writing Style: ${this.state.settings.writingStyle}

Continue the story through intro, chapters, and ending, creating a complete narrative.
Output the full story content.
`;
    
    return this.generatePhaseContent(StoryPhase.FULL_CONTENT, params, prompt, onProgress);
  }
}

