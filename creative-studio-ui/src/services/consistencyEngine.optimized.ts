/**
 * Optimized Consistency Engine
 * High-performance consistency validation with caching and batching
 */

import type {
  MasterReferenceSheet,
  SequenceReferenceSheet,
  ShotReference,
  CharacterAppearanceSheet,
  LocationAppearanceSheet,
} from '../types/reference';
import {
  MemoryCache,
  OptimizedConsistencyChecker,
  consistencyChecker,
  debounce,
} from '../utils/performance';

// ============================================================================
// Types
// ============================================================================

/**
 * Consistency issue type
 */
export interface ConsistencyIssue {
  id: string;
  type: 'character' | 'location' | 'style';
  severity: 'low' | 'medium' | 'high';
  shotId: string;
  description: string;
  affectedElements: string[];
  suggestedFix: string;
  autoFixable: boolean;
}

/**
 * Consistency score type
 */
export interface ConsistencyScore {
  overallScore: number;
  characterScore: number;
  styleScore: number;
  colorScore: number;
  compositionScore: number;
}

interface ConsistencyValidationOptions {
  cacheEnabled?: boolean;
  cacheTTL?: number;
  strictMode?: boolean;
}

interface BatchValidationResult {
  entityId: string;
  score: ConsistencyScore;
  issues: ConsistencyIssue[];
  cached: boolean;
}

// ============================================================================
// Optimized Consistency Engine
// ============================================================================

export class OptimizedConsistencyEngine {
  private cache: MemoryCache<ConsistencyScore>;
  private checker: OptimizedConsistencyChecker;
  private defaultTTL: number;
  
  constructor(defaultTTL: number = 30 * 1000) {
    this.defaultTTL = defaultTTL;
    this.cache = new MemoryCache<ConsistencyScore>(defaultTTL);
    this.checker = consistencyChecker;
  }
  
  /**
   * Calculate consistency score with caching
   */
  calculateScore(
    masterSheet: MasterReferenceSheet,
    sequenceSheet?: SequenceReferenceSheet,
    shotReference?: ShotReference,
    options: ConsistencyValidationOptions = {}
  ): ConsistencyScore {
    const { cacheEnabled = true, strictMode = false } = options;
    
    // Generate cache key
    const cacheKey = this.generateCacheKey(masterSheet, sequenceSheet, shotReference);
    
    // Check cache
    if (cacheEnabled) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }
    
    // Calculate score
    const score = this.computeScore(masterSheet, sequenceSheet, shotReference, strictMode);
    
    // Cache result
    if (cacheEnabled) {
      this.cache.set(cacheKey, score);
    }
    
    return score;
  }
  
  /**
   * Compute score without caching
   */
  private computeScore(
    masterSheet: MasterReferenceSheet,
    sequenceSheet?: SequenceReferenceSheet,
    shotReference?: ShotReference,
    strictMode: boolean = false
  ): ConsistencyScore {
    let totalWeight = 0;
    let weightedScore = 0;
    
    // Character consistency (weight: 0.4)
    const characterScore = this.validateCharacterConsistency(masterSheet, shotReference);
    totalWeight += 0.4;
    weightedScore += characterScore * 0.4;
    
    // Location consistency (weight: 0.3)
    const locationScore = this.validateLocationConsistency(masterSheet, shotReference);
    totalWeight += 0.3;
    weightedScore += locationScore * 0.3;
    
    // Style consistency (weight: 0.2)
    const styleScore = this.validateStyleConsistency(masterSheet, sequenceSheet);
    totalWeight += 0.2;
    weightedScore += styleScore * 0.2;
    
    // Transition consistency (weight: 0.1)
    const transitionScore = this.validateTransitionConsistency(sequenceSheet);
    totalWeight += 0.1;
    weightedScore += transitionScore * 0.1;
    
    const overallScore = Math.round((weightedScore / totalWeight) * 100);
    
    // Adjust for strict mode
    const adjustedScore = strictMode ? Math.min(overallScore, overallScore * 0.9) : overallScore;
    
    return {
      overallScore: adjustedScore,
      characterScore: Math.round(characterScore * 100),
      styleScore: Math.round(styleScore * 100),
      colorScore: this.calculateColorScore(masterSheet),
      compositionScore: Math.round((characterScore + locationScore) * 50),
    };
  }
  
  /**
   * Validate character consistency
   */
  private validateCharacterConsistency(
    masterSheet: MasterReferenceSheet,
    shotReference?: ShotReference
  ): number {
    if (masterSheet.characterSheets.length === 0) return 1;
    
    let matchCount = 0;
    let totalCount = 0;
    
    for (const character of masterSheet.characterSheets) {
      // Check if character has reference images
      if (character.appearanceImages.length === 0) continue;
      
      totalCount++;
      
      // Check if character is referenced in shot
      if (shotReference) {
        if (shotReference.inheritedFromMaster.includes(character.id)) {
          matchCount++;
        }
      } else {
        // If no shot reference, assume character is used
        matchCount++;
      }
    }
    
    return totalCount > 0 ? matchCount / totalCount : 1;
  }
  
  /**
   * Validate location consistency
   */
  private validateLocationConsistency(
    masterSheet: MasterReferenceSheet,
    shotReference?: ShotReference
  ): number {
    if (masterSheet.locationSheets.length === 0) return 1;
    
    let matchCount = 0;
    let totalCount = 0;
    
    for (const location of masterSheet.locationSheets) {
      if (location.referenceImages.length === 0) continue;
      
      totalCount++;
      
      if (shotReference) {
        if (shotReference.inheritedFromMaster.includes(location.id)) {
          matchCount++;
        }
      } else {
        matchCount++;
      }
    }
    
    return totalCount > 0 ? matchCount / totalCount : 1;
  }
  
  /**
   * Validate style consistency
   */
  private validateStyleConsistency(
    masterSheet: MasterReferenceSheet,
    sequenceSheet?: SequenceReferenceSheet
  ): number {
    const masterStyle = masterSheet.styleSheet;
    
    // Check if art style is defined
    if (!masterStyle.artStyle) return 0.5;
    
    // Check if style is consistent with sequence overrides
    if (sequenceSheet && sequenceSheet.sequenceStyle.styleOverrides.length > 0) {
      const hasOverrides = sequenceSheet.sequenceStyle.styleOverrides.length > 0;
      return hasOverrides ? 0.8 : 1;
    }
    
    return 1;
  }
  
  /**
   * Validate transition consistency
   */
  private validateTransitionConsistency(sequenceSheet?: SequenceReferenceSheet): number {
    if (!sequenceSheet) return 1;
    
    const transitions = sequenceSheet.sequenceStyle.transitions;
    if (transitions.length === 0) return 1;
    
    // Check for valid transition types
    const validTransitions = ['cut', 'dissolve', 'fade', 'wipe', 'match_cut', 'cross_dissolve'];
    const validCount = transitions.filter(t => validTransitions.includes(t)).length;
    
    return validCount / transitions.length;
  }
  
  /**
   * Calculate color score
   */
  private calculateColorScore(masterSheet: MasterReferenceSheet): number {
    const colors = masterSheet.styleSheet.colorPalette;
    
    if (colors.length === 0) return 50;
    
    // Check for valid hex colors
    const validColors = colors.filter(c => /^#[0-9A-Fa-f]{6}$/.test(c));
    
    return Math.round((validColors.length / colors.length) * 100);
  }
  
  /**
   * Generate cache key for consistency score
   */
  private generateCacheKey(
    masterSheet: MasterReferenceSheet,
    sequenceSheet?: SequenceReferenceSheet,
    shotReference?: ShotReference
  ): string {
    const parts = [
      masterSheet.id,
      masterSheet.characterSheets.length.toString(),
      masterSheet.locationSheets.length.toString(),
      masterSheet.styleSheet.artStyle,
    ];
    
    if (sequenceSheet) {
      parts.push(sequenceSheet.id);
    }
    
    if (shotReference) {
      parts.push(shotReference.id);
      parts.push(shotReference.inheritedFromMaster.join(','));
    }
    
    return parts.join(':');
  }
  
  /**
   * Find consistency issues
   */
  findIssues(
    masterSheet: MasterReferenceSheet,
    sequenceSheet?: SequenceReferenceSheet,
    shotReference?: ShotReference
  ): ConsistencyIssue[] {
    const issues: ConsistencyIssue[] = [];
    
    // Check for missing character references
    for (const character of masterSheet.characterSheets) {
      if (character.appearanceImages.length === 0) {
        issues.push({
          id: `issue-char-${character.id}`,
          type: 'character',
          severity: 'medium',
          shotId: shotReference?.shotId || 'master',
          description: `Character "${character.characterName}" has no reference images`,
          affectedElements: [character.id],
          suggestedFix: 'Add reference images for this character',
          autoFixable: false,
        });
      }
    }
    
    // Check for missing location references
    for (const location of masterSheet.locationSheets) {
      if (location.referenceImages.length === 0) {
        issues.push({
          id: `issue-loc-${location.id}`,
          type: 'location',
          severity: 'medium',
          shotId: shotReference?.shotId || 'master',
          description: `Location "${location.locationName}" has no reference images`,
          affectedElements: [location.id],
          suggestedFix: 'Add reference images for this location',
          autoFixable: false,
        });
      }
    }
    
    // Check for missing style
    if (!masterSheet.styleSheet.artStyle) {
      issues.push({
        id: 'issue-style-missing',
        type: 'style',
        severity: 'high',
        shotId: 'master',
        description: 'Art style is not defined',
        affectedElements: [],
        suggestedFix: 'Set an art style in the master reference sheet',
        autoFixable: false,
      });
    }
    
    return issues;
  }
  
  /**
   * Batch validate multiple shots
   */
  batchValidate(
    shots: Array<{
      id: string;
      masterSheet: MasterReferenceSheet;
      sequenceSheet?: SequenceReferenceSheet;
    }>
  ): BatchValidationResult[] {
    return shots.map(shot => ({
      entityId: shot.id,
      score: this.calculateScore(shot.masterSheet, shot.sequenceSheet),
      issues: this.findIssues(shot.masterSheet, shot.sequenceSheet),
      cached: false,
    }));
  }
  
  /**
   * Invalidate cache for specific entity
   */
  invalidate(entityId: string): void {
    // Find and delete matching cache entries
    // In production, would need more sophisticated key management
    this.cache.delete(entityId);
  }
  
  /**
   * Clear all caches
   */
  clearCache(): void {
    this.cache.clear();
  }
  
  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hits: number; misses: number } {
    return {
      size: this.cache.size(),
      hits: 0, // Would need to track separately
      misses: 0,
    };
  }
}

// ============================================================================
// Debounced save for reference sheets
// ============================================================================

/**
 * Create debounced save function for reference sheets
 */
export function createDebouncedSave<T>(
  saveFn: (data: T) => Promise<void>,
  delay: number = 1000
): (data: T) => void {
  return debounce(saveFn, delay);
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const optimizedConsistencyEngine = new OptimizedConsistencyEngine();
