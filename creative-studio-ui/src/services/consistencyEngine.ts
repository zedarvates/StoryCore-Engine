/**
 * ConsistencyEngine Service
 * Validates visual consistency across shots in creative projects
 */

import { getPerformanceMonitoringService } from './performanceMonitoringService';

// ============================================================================
// Types
// ============================================================================

export type ConsistencyIssueType = 'character' | 'location' | 'style' | 'transition';
export type ConsistencySeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ConsistencyIssue {
  id: string;
  type: ConsistencyIssueType;
  severity: ConsistencySeverity;
  shotId: string;
  description: string;
  affectedElements: string[];
  suggestedFix?: string;
  autoFixable: boolean;
  createdAt: Date;
  resolvedAt?: Date;
}

export interface ConsistencyScore {
  overallScore: number; // 0-100
  characterScore: number;
  styleScore: number;
  colorScore: number;
  compositionScore: number;
}

export interface ContinuityIssue {
  id: string;
  shotId: string;
  prevShotId: string;
  issueType: 'visual' | 'temporal' | 'spatial';
  description: string;
  suggestedFrameMatch?: string;
  confidence: number;
}

export interface TransitionIssue {
  id: string;
  fromShotId: string;
  toShotId: string;
  issueType: 'cut' | 'dissolve' | 'fade' | 'wipe';
  severity: 'low' | 'medium' | 'high';
  description: string;
  recommendedTransition?: string;
}

export interface FixSuggestion {
  id: string;
  description: string;
  action: 'regenerate' | 'add_reference' | 'adjust_prompt' | 'manual_edit';
  confidence: number; // 0-1
  estimatedImpact: 'low' | 'medium' | 'high';
}

export type ResolutionStrategy = 'auto_fix' | 'manual_review' | 'ignore' | 'regenerate';

// ============================================================================
// Reference Types (imported from reference types)
// ============================================================================

export interface CharacterReference {
  id: string;
  name: string;
  portraitUrl?: string;
  description: string;
  attributes: Record<string, string>;
  styleGuide?: {
    preferredStyle: string;
    colorPalette: string[];
    lightingPreference?: string;
  };
}

export interface LocationReference {
  id: string;
  name: string;
  imageUrls: string[];
  description: string;
  environment: string;
  timeOfDay?: string;
  weatherCondition?: string;
}

export interface StyleSheet {
  id: string;
  name: string;
  globalStyle: {
    colorPalette: string[];
    lightingStyle: string;
    compositionStyle: string;
    textureStyle: string;
  };
  rules: StyleRule[];
}

export interface StyleRule {
  id: string;
  element: string;
  constraint: string;
  value: string;
}

export interface ShotConfig {
  id: string;
  sequenceId: string;
  shotNumber: number;
  characterReferences: string[];
  locationReferences: string[];
  styleOverrides: Record<string, string>;
  prompt?: string;
  generatedImageUrls?: string[];
}

// ============================================================================
// Internal State
// ============================================================================

interface ActiveIssue {
  issue: ConsistencyIssue;
  projectId: string;
  sequenceId?: string;
}

interface ResolvedIssue {
  issue: ConsistencyIssue;
  resolution: ResolutionStrategy;
  resolvedAt: Date;
}

// ============================================================================
// ConsistencyEngine Service Class
// ============================================================================

class ConsistencyEngine {
  private activeIssues: Map<string, ActiveIssue> = new Map();
  private resolvedIssues: Map<string, ResolvedIssue> = new Map();
  private referenceSheetService: ReferenceSheetService | null = null;
  private projectStore: ProjectStore | null = null;

  /**
   * Initialize the ConsistencyEngine with required dependencies
   */
  initialize(
    referenceSheetService: ReferenceSheetService,
    projectStore: ProjectStore
  ): void {
    this.referenceSheetService = referenceSheetService;
    this.projectStore = projectStore;
  }

  // ==========================================================================
  // Character Consistency Validation
  // ==========================================================================

  /**
   * Validate character consistency for a shot
   */
  validateCharacterConsistency(shotId: string): ConsistencyIssue[] {
    const timer = getPerformanceMonitoringService().createTimer('validateCharacterConsistency');
    
    const issues: ConsistencyIssue[] = [];
    
    if (!this.projectStore) {
      return issues;
    }

    const shot = this.projectStore.getShot(shotId);
    if (!shot) {
      return issues;
    }

    for (const characterId of shot.characterReferences) {
      const inconsistency = this.detectCharacterInconsistency(shotId, characterId);
      if (inconsistency) {
        issues.push(inconsistency);
      }
    }

    const duration = timer.stop({ shotId, characterCount: shot.characterReferences.length });
    getPerformanceMonitoringService().trackConsistencyCheck(1, duration);

    return issues;
  }

  /**
   * Compare character appearances across multiple images
   */
  compareCharacterAppearances(characterId: string, imageUrls: string[]): ConsistencyScore {
    if (imageUrls.length < 2) {
      return this.createEmptyScore();
    }

    // Get character reference for comparison
    const characterRef = this.referenceSheetService?.getCharacterReference(characterId);
    
    // Simulate image comparison (in real implementation, this would use image analysis)
    const characterMatches = this.analyzeImageConsistency(imageUrls, 'character');
    const styleMatches = this.analyzeStyleConsistency(imageUrls);
    const colorMatches = this.analyzeColorConsistency(imageUrls);
    const compositionMatches = this.analyzeCompositionConsistency(imageUrls);

    return {
      overallScore: this.calculateOverallScore(characterMatches, styleMatches, colorMatches, compositionMatches),
      characterScore: characterMatches * 100,
      styleScore: styleMatches * 100,
      colorScore: colorMatches * 100,
      compositionScore: compositionMatches * 100,
    };
  }

  /**
   * Detect specific character inconsistency in a shot
   */
  detectCharacterInconsistency(shotId: string, characterId: string): ConsistencyIssue | null {
    const shot = this.projectStore?.getShot(shotId);
    if (!shot) return null;

    const characterRef = this.referenceSheetService?.getCharacterReference(characterId);
    if (!characterRef) return null;

    // Check if generated images match character reference
    const generatedImages = shot.generatedImageUrls || [];
    if (generatedImages.length === 0) {
      return null;
    }

    const score = this.compareCharacterAppearances(characterId, generatedImages);
    
    if (score.characterScore < 70) {
      return {
        id: this.generateIssueId(),
        type: 'character',
        severity: score.characterScore < 40 ? 'high' : 'medium',
        shotId,
        description: `Character "${characterRef.name}" appearance inconsistent with reference`,
        affectedElements: [characterId],
        suggestedFix: `Regenerate with character reference "${characterRef.portraitUrl}"`,
        autoFixable: true,
        createdAt: new Date(),
      };
    }

    return null;
  }

  // ==========================================================================
  // Location Consistency Validation
  // ==========================================================================

  /**
   * Validate location consistency for a shot
   */
  validateLocationConsistency(shotId: string): ConsistencyIssue[] {
    const issues: ConsistencyIssue[] = [];
    
    if (!this.projectStore) {
      return issues;
    }

    const shot = this.projectStore.getShot(shotId);
    if (!shot) {
      return issues;
    }

    for (const locationId of shot.locationReferences) {
      const inconsistency = this.detectLocationInconsistency(shotId, locationId);
      if (inconsistency) {
        issues.push(inconsistency);
      }
    }

    return issues;
  }

  /**
   * Compare location references across multiple images
   */
  compareLocationReferences(locationId: string, imageUrls: string[]): ConsistencyScore {
    if (imageUrls.length < 2) {
      return this.createEmptyScore();
    }

    const locationRef = this.referenceSheetService?.getLocationReference(locationId);
    
    const characterMatches = this.analyzeImageConsistency(imageUrls, 'location');
    const styleMatches = this.analyzeStyleConsistency(imageUrls);
    const colorMatches = this.analyzeColorConsistency(imageUrls);
    const compositionMatches = this.analyzeCompositionConsistency(imageUrls);

    return {
      overallScore: this.calculateOverallScore(characterMatches, styleMatches, colorMatches, compositionMatches),
      characterScore: characterMatches * 100,
      styleScore: styleMatches * 100,
      colorScore: colorMatches * 100,
      compositionScore: compositionMatches * 100,
    };
  }

  /**
   * Detect specific location inconsistency in a shot
   */
  detectLocationInconsistency(shotId: string, locationId: string): ConsistencyIssue | null {
    const shot = this.projectStore?.getShot(shotId);
    if (!shot) return null;

    const locationRef = this.referenceSheetService?.getLocationReference(locationId);
    if (!locationRef) return null;

    const generatedImages = shot.generatedImageUrls || [];
    if (generatedImages.length === 0) {
      return null;
    }

    const score = this.compareLocationReferences(locationId, generatedImages);
    
    if (score.characterScore < 70) {
      return {
        id: this.generateIssueId(),
        type: 'location',
        severity: score.characterScore < 40 ? 'high' : 'medium',
        shotId,
        description: `Location "${locationRef.name}" appearance inconsistent with reference images`,
        affectedElements: [locationId],
        suggestedFix: `Include reference images: ${locationRef.imageUrls.slice(0, 3).join(', ')}`,
        autoFixable: true,
        createdAt: new Date(),
      };
    }

    return null;
  }

  // ==========================================================================
  // Style Consistency Validation
  // ==========================================================================

  /**
   * Validate style consistency for a shot
   */
  validateStyleConsistency(shotId: string): ConsistencyIssue[] {
    const issues: ConsistencyIssue[] = [];
    
    if (!this.projectStore) {
      return issues;
    }

    const shot = this.projectStore.getShot(shotId);
    if (!shot) {
      return issues;
    }

    const inconsistency = this.detectStyleInconsistency(shotId);
    if (inconsistency) {
      issues.push(inconsistency);
    }

    return issues;
  }

  /**
   * Compare shot style to target style
   */
  compareStyleFeatures(shotId: string, targetStyle: string): ConsistencyScore {
    const shot = this.projectStore?.getShot(shotId);
    if (!shot) {
      return this.createEmptyScore();
    }

    const generatedImages = shot.generatedImageUrls || [];
    if (generatedImages.length === 0) {
      return this.createEmptyScore();
    }

    const styleMatches = this.analyzeStyleConsistency(generatedImages);
    const colorMatches = this.analyzeColorConsistency(generatedImages);
    const compositionMatches = this.analyzeCompositionConsistency(generatedImages);

    return {
      overallScore: this.calculateOverallScore(styleMatches, styleMatches, colorMatches, compositionMatches),
      characterScore: 100, // Not applicable for style-only comparison
      styleScore: styleMatches * 100,
      colorScore: colorMatches * 100,
      compositionScore: compositionMatches * 100,
    };
  }

  /**
   * Detect style deviation in a shot
   */
  detectStyleInconsistency(shotId: string): ConsistencyIssue | null {
    const shot = this.projectStore?.getShot(shotId);
    if (!shot) return null;

    const styleSheet = this.referenceSheetService?.getActiveStyleSheet();
    if (!styleSheet) return null;

    const generatedImages = shot.generatedImageUrls || [];
    if (generatedImages.length === 0) {
      return null;
    }

    const score = this.compareStyleFeatures(shotId, styleSheet.id);
    
    if (score.styleScore < 70 || score.colorScore < 70 || score.compositionScore < 70) {
      const lowestScore = Math.min(score.styleScore, score.colorScore, score.compositionScore);
      const issueType = score.styleScore === lowestScore ? 'style' : 
                        score.colorScore === lowestScore ? 'style' : 'style';

      return {
        id: this.generateIssueId(),
        type: 'style',
        severity: lowestScore < 40 ? 'high' : 'medium',
        shotId,
        description: `Shot style inconsistent with style sheet "${styleSheet.name}"`,
        affectedElements: [],
        suggestedFix: `Apply style sheet rules: ${styleSheet.globalStyle.lightingStyle} lighting, ${styleSheet.globalStyle.compositionStyle} composition`,
        autoFixable: true,
        createdAt: new Date(),
      };
    }

    return null;
  }

  // ==========================================================================
  // Cross-Shot Consistency
  // ==========================================================================

  /**
   * Validate all shots in a sequence for consistency
   */
  validateSequenceConsistency(sequenceId: string): ConsistencyIssue[] {
    const issues: ConsistencyIssue[] = [];
    
    if (!this.projectStore) {
      return issues;
    }

    const sequence = this.projectStore.getSequence(sequenceId);
    if (!sequence) {
      return issues;
    }

    for (const shotId of sequence.shotIds) {
      // Validate each shot
      issues.push(...this.validateCharacterConsistency(shotId));
      issues.push(...this.validateLocationConsistency(shotId));
      issues.push(...this.validateStyleConsistency(shotId));
    }

    // Check continuity between shots
    const continuityIssues = this.detectContinuityBreaks(sequenceId);
    for (const continuityIssue of continuityIssues) {
      issues.push({
        id: continuityIssue.id,
        type: 'transition',
        severity: 'medium',
        shotId: continuityIssue.shotId,
        description: continuityIssue.description,
        affectedElements: [],
        suggestedFix: continuityIssue.suggestedFrameMatch,
        autoFixable: false,
        createdAt: new Date(),
      });
    }

    return issues;
  }

  /**
   * Detect frame-to-frame continuity breaks in a sequence
   */
  detectContinuityBreaks(sequenceId: string): ContinuityIssue[] {
    const issues: ContinuityIssue[] = [];
    
    if (!this.projectStore) {
      return issues;
    }

    const sequence = this.projectStore.getSequence(sequenceId);
    if (!sequence || sequence.shotIds.length < 2) {
      return issues;
    }

    const shots = sequence.shotIds.map(id => this.projectStore?.getShot(id)).filter(Boolean) as ShotConfig[];

    for (let i = 1; i < shots.length; i++) {
      const prevShot = shots[i - 1];
      const currShot = shots[i];

      // Check for visual continuity (colors, composition)
      const visualScore = this.checkVisualContinuity(prevShot, currShot);
      
      // Check for temporal continuity (time progression)
      const temporalScore = this.checkTemporalContinuity(prevShot, currShot);
      
      // Check for spatial continuity (camera position, movement)
      const spatialScore = this.checkSpatialContinuity(prevShot, currShot);

      if (visualScore < 0.6 || temporalScore < 0.6 || spatialScore < 0.6) {
        const issueType = visualScore < 0.6 ? 'visual' : 
                         temporalScore < 0.6 ? 'temporal' : 'spatial';
        
        issues.push({
          id: this.generateIssueId(),
          shotId: currShot.id,
          prevShotId: prevShot.id,
          issueType,
          description: this.generateContinuityDescription(issueType, prevShot, currShot),
          suggestedFrameMatch: `Match frame from shot ${prevShot.shotNumber}`,
          confidence: Math.min(visualScore, temporalScore, spatialScore),
        });
      }
    }

    return issues;
  }

  /**
   * Validate shot transitions in a sequence
   */
  validateShotTransitions(sequenceId: string): TransitionIssue[] {
    const issues: TransitionIssue[] = [];
    
    if (!this.projectStore) {
      return issues;
    }

    const sequence = this.projectStore.getSequence(sequenceId);
    if (!sequence || sequence.shotIds.length < 2) {
      return issues;
    }

    const shots = sequence.shotIds.map(id => this.projectStore?.getShot(id)).filter(Boolean) as ShotConfig[];

    for (let i = 1; i < shots.length; i++) {
      const fromShot = shots[i - 1];
      const toShot = shots[i];

      // Check transition compatibility
      const transitionScore = this.evaluateTransition(fromShot, toShot);
      
      if (transitionScore < 0.7) {
        issues.push({
          id: this.generateIssueId(),
          fromShotId: fromShot.id,
          toShotId: toShot.id,
          issueType: 'cut',
          severity: transitionScore < 0.4 ? 'high' : 'medium',
          description: `Transition from shot ${fromShot.shotNumber} to ${toShot.shotNumber} may be jarring`,
          recommendedTransition: this.suggestTransition(fromShot, toShot),
        });
      }
    }

    return issues;
  }

  // ==========================================================================
  // Issue Management
  // ==========================================================================

  /**
   * Get all active issues in a project
   */
  getActiveIssues(projectId: string): ConsistencyIssue[] {
    const issues: ConsistencyIssue[] = [];
    
    for (const [_, activeIssue] of this.activeIssues) {
      if (activeIssue.projectId === projectId) {
        issues.push(activeIssue.issue);
      }
    }

    return issues.sort((a, b) => this.getSeverityWeight(b.severity) - this.getSeverityWeight(a.severity));
  }

  /**
   * Resolve an issue with the given resolution strategy
   */
  resolveIssue(issueId: string, resolution: ResolutionStrategy): void {
    const activeIssue = this.activeIssues.get(issueId);
    if (!activeIssue) {
      return;
    }

    const resolvedIssue: ResolvedIssue = {
      issue: {
        ...activeIssue.issue,
        resolvedAt: new Date(),
      },
      resolution,
      resolvedAt: new Date(),
    };

    this.resolvedIssues.set(issueId, resolvedIssue);
    this.activeIssues.delete(issueId);

    // Trigger auto-fix if requested
    if (resolution === 'auto_fix' && activeIssue.issue.autoFixable) {
      this.executeAutoFix(activeIssue.issue);
    }
  }

  /**
   * Suggest fixes for an issue
   */
  suggestFix(issueId: string): FixSuggestion[] {
    const activeIssue = this.activeIssues.get(issueId);
    if (!activeIssue) {
      return [];
    }

    const suggestions: FixSuggestion[] = [];
    const issue = activeIssue.issue;

    switch (issue.type) {
      case 'character':
        suggestions.push({
          id: this.generateFixId(),
          description: 'Regenerate with character reference image',
          action: 'regenerate',
          confidence: 0.85,
          estimatedImpact: 'high',
        });
        suggestions.push({
          id: this.generateFixId(),
          description: 'Add additional character reference',
          action: 'add_reference',
          confidence: 0.7,
          estimatedImpact: 'medium',
        });
        suggestions.push({
          id: this.generateFixId(),
          description: 'Adjust prompt to emphasize character features',
          action: 'adjust_prompt',
          confidence: 0.6,
          estimatedImpact: 'medium',
        });
        break;

      case 'location':
        suggestions.push({
          id: this.generateFixId(),
          description: 'Include location reference images in prompt',
          action: 'add_reference',
          confidence: 0.8,
          estimatedImpact: 'high',
        });
        suggestions.push({
          id: this.generateFixId(),
          description: 'Regenerate with location description',
          action: 'regenerate',
          confidence: 0.75,
          estimatedImpact: 'high',
        });
        break;

      case 'style':
        suggestions.push({
          id: this.generateFixId(),
          description: 'Apply style sheet rules to prompt',
          action: 'adjust_prompt',
          confidence: 0.9,
          estimatedImpact: 'high',
        });
        suggestions.push({
          id: this.generateFixId(),
          description: 'Regenerate with style emphasis',
          action: 'regenerate',
          confidence: 0.7,
          estimatedImpact: 'high',
        });
        break;

      case 'transition':
        suggestions.push({
          id: this.generateFixId(),
          description: 'Review and adjust manually',
          action: 'manual_edit',
          confidence: 0.5,
          estimatedImpact: 'low',
        });
        break;
    }

    return suggestions;
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  /**
   * Create an empty consistency score
   */
  private createEmptyScore(): ConsistencyScore {
    return {
      overallScore: 0,
      characterScore: 0,
      styleScore: 0,
      colorScore: 0,
      compositionScore: 0,
    };
  }

  /**
   * Generate unique issue ID
   */
  private generateIssueId(): string {
    return `issue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique fix ID
   */
  private generateFixId(): string {
    return `fix_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get severity weight for sorting
   */
  private getSeverityWeight(severity: ConsistencySeverity): number {
    const weights: Record<ConsistencySeverity, number> = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
    };
    return weights[severity];
  }

  /**
   * Analyze image consistency (simulated)
   */
  private analyzeImageConsistency(imageUrls: string[], type: 'character' | 'location'): number {
    // In real implementation, this would use image analysis
    // For now, return a random score between 0.6 and 1.0
    return 0.6 + Math.random() * 0.4;
  }

  /**
   * Analyze style consistency (simulated)
   */
  private analyzeStyleConsistency(imageUrls: string[]): number {
    return 0.7 + Math.random() * 0.3;
  }

  /**
   * Analyze color consistency (simulated)
   */
  private analyzeColorConsistency(imageUrls: string[]): number {
    return 0.65 + Math.random() * 0.35;
  }

  /**
   * Analyze composition consistency (simulated)
   */
  private analyzeCompositionConsistency(imageUrls: string[]): number {
    return 0.7 + Math.random() * 0.3;
  }

  /**
   * Calculate overall consistency score
   */
  private calculateOverallScore(
    characterScore: number,
    styleScore: number,
    colorScore: number,
    compositionScore: number
  ): number {
    return ((characterScore + styleScore + colorScore + compositionScore) / 4) * 100;
  }

  /**
   * Check visual continuity between two shots
   */
  private checkVisualContinuity(prevShot: ShotConfig, currShot: ShotConfig): number {
    const prevImages = prevShot.generatedImageUrls || [];
    const currImages = currShot.generatedImageUrls || [];
    
    if (prevImages.length === 0 || currImages.length === 0) {
      return 1.0; // No images to compare
    }

    return this.analyzeColorConsistency([prevImages[0], currImages[0]]);
  }

  /**
   * Check temporal continuity between two shots
   */
  private checkTemporalContinuity(prevShot: ShotConfig, currShot: ShotConfig): number {
    // In real implementation, check time-of-day, day/night progression, etc.
    return 0.8;
  }

  /**
   * Check spatial continuity between two shots
   */
  private checkSpatialContinuity(prevShot: ShotConfig, currShot: ShotConfig): number {
    // In real implementation, check camera position, movement, etc.
    return 0.75;
  }

  /**
   * Evaluate transition between two shots
   */
  private evaluateTransition(fromShot: ShotConfig, toShot: ShotConfig): number {
    const visualContinuity = this.checkVisualContinuity(fromShot, toShot);
    const styleContinuity = this.compareStyleFeatures(fromShot.id, toShot.id);
    
    return (visualContinuity + styleContinuity.styleScore / 100) / 2;
  }

  /**
   * Suggest a transition type
   */
  private suggestTransition(fromShot: ShotConfig, toShot: ShotConfig): string {
    const visualContinuity = this.checkVisualContinuity(fromShot, toShot);
    
    if (visualContinuity < 0.5) {
      return 'dissolve'; // Smooth out jarring cuts
    } else if (visualContinuity < 0.7) {
      return 'fade';
    }
    return 'cut';
  }

  /**
   * Generate continuity issue description
   */
  private generateContinuityDescription(
    issueType: string,
    prevShot: ShotConfig,
    currShot: ShotConfig
  ): string {
    const descriptions: Record<string, string> = {
      visual: `Visual discontinuity between shot ${prevShot.shotNumber} and ${currShot.shotNumber}`,
      temporal: `Time progression issue between shot ${prevShot.shotNumber} and ${currShot.shotNumber}`,
      spatial: `Spatial/movement inconsistency between shot ${prevShot.shotNumber} and ${currShot.shotNumber}`,
    };
    return descriptions[issueType] || 'Continuity issue detected';
  }

  /**
   * Execute auto-fix for an issue
   */
  private executeAutoFix(issue: ConsistencyIssue): void {
    // In real implementation, this would trigger regeneration or apply fixes
    console.log(`Auto-fixing issue ${issue.id}: ${issue.description}`);
  }
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const consistencyEngine = new ConsistencyEngine();

// ============================================================================
// Type definitions for external dependencies
// ============================================================================

/**
 * ReferenceSheetService interface (minimal for dependency injection)
 */
interface ReferenceSheetService {
  getCharacterReference(characterId: string): CharacterReference | undefined;
  getLocationReference(locationId: string): LocationReference | undefined;
  getActiveStyleSheet(): StyleSheet | undefined;
  getStyleSheet(styleSheetId: string): StyleSheet | undefined;
}

/**
 * ProjectStore interface (minimal for dependency injection)
 */
interface ProjectStore {
  getShot(shotId: string): ShotConfig | undefined;
  getSequence(sequenceId: string): { id: string; shotIds: string[] } | undefined;
  getProject(projectId: string): { id: string; sequences: string[] } | undefined;
}
