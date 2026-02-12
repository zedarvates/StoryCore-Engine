/**
 * CommentDrivenGenerationService
 * Interprets plain-language comments and generates new visual/video results
 */

// ============================================================================
// Types
// ============================================================================

export type ModificationType =
  | 'visual_adjustment'
  | 'character_change'
  | 'location_change'
  | 'style_transfer'
  | 'lighting_adjustment'
  | 'color_adjustment'
  | 'composition_change'
  | 'regenerate';

export interface ParsedIntent {
  modificationType: ModificationType;
  parameters: Record<string, unknown>;
  targetElements: string[];
  intent: 'improve' | 'change' | 'regenerate' | 'refine';
  confidence: number;
}

export interface GenerationIntent {
  type: ModificationType;
  prompt: string;
  parameters: GenerationParameters;
  referenceIds: string[];
  constraints: string[];
}

export interface GenerationParameters {
  strength?: number;
  preserve?: string[];
  style?: string;
  mood?: string;
  lighting?: string;
  composition?: string;
  colorPalette?: string[];
  aspectRatio?: string;
  duration?: number;
  fps?: number;
}

export interface ShotComment {
  id: string;
  shotId: string;
  content: string;
  parsedIntent: ParsedIntent;
  createdAt: Date;
  resolved: boolean;
  resultShotId?: string;
}

export interface VisualModification {
  type: ModificationType;
  parameters: GenerationParameters;
  preserveConsistency: boolean;
  affectedElements: string[];
}

export interface GenerationResult {
  success: boolean;
  newShotId?: string;
  previewUrl?: string;
  message?: string;
  error?: string;
}

export interface CommentParseResult {
  intent: ParsedIntent;
  originalComment: string;
  suggestions: string[];
}

// ============================================================================
// Project Store Interface (for dependency injection)
// ============================================================================

interface ProjectStore {
  getShot(shotId: string): {
    id: string;
    sequenceId: string;
    generatedImageUrls?: string[];
    referenceImageUrls?: string[];
    prompt?: string;
    styleOverrides?: Record<string, string>;
  } | undefined;
  updateShot(shotId: string, updates: Record<string, unknown>): void;
  addShot(shot: { id: string; sequenceId: string; prompt?: string }): void;
  getAllSequences(): { id: string; shotIds: string[] }[];
  getSequence(sequenceId: string): { id: string; shotIds: string[] } | undefined;
}

interface GenerationService {
  generateFromPrompt(prompt: string, parameters?: Record<string, unknown>): Promise<{ success: boolean; shotId?: string; previewUrl?: string }>;
  applyStyleTransfer(sourceShotId: string, targetShotId: string, intensity: number): Promise<{ success: boolean; newShotId?: string }>;
  modifyShot(shotId: string, modifications: VisualModification): Promise<GenerationResult>;
}

// ============================================================================
// CommentDrivenGenerationService Class
// ============================================================================

export class CommentDrivenGenerationService {
  private projectStore: ProjectStore;
  private generationService: GenerationService;
  private comments: Map<string, ShotComment[]> = new Map();
  private parseCache: Map<string, CommentParseResult> = new Map();

  constructor(projectStore: ProjectStore, generationService: GenerationService) {
    this.projectStore = projectStore;
    this.generationService = generationService;
  }

  // ============================================================================
  // Comment Parsing
  // ============================================================================

  /**
   * Parse plain-language comment into structured intent
   */
  parseComment(comment: string): ParsedIntent {
    const normalizedComment = comment.toLowerCase().trim();
    
    // Check cache first
    if (this.parseCache.has(normalizedComment)) {
      return this.parseCache.get(normalizedComment)!.intent;
    }

    const modificationType = this.extractModificationType(comment);
    const parameters = this.extractParameters(comment);
    const targetElements = this.extractTargetElements(comment);
    const intent = this.classifyIntentType(comment);
    const confidence = this.calculateConfidence(modificationType, intent, targetElements);

    const result: ParsedIntent = {
      modificationType,
      parameters,
      targetElements,
      intent,
      confidence
    };

    // Cache the result
    this.parseCache.set(normalizedComment, {
      intent: result,
      originalComment: comment,
      suggestions: this.generateSuggestions(comment, result)
    });

    return result;
  }

  /**
   * Extract type of modification from comment
   */
  extractModificationType(comment: string): ModificationType {
    const normalizedComment = comment.toLowerCase();

    // Regenerate patterns
    if (/\bregenerate\b|\bredo\b|\brecreate\b|\bstart over\b|\btry again\b/i.test(normalizedComment)) {
      return 'regenerate';
    }

    // Visual adjustment patterns
    if (/\b(sharpen|blur|enhance|improve|adjust|modify|tweak|fine-tune)\b/i.test(normalizedComment)) {
      return 'visual_adjustment';
    }

    // Character change patterns
    if (/\b(character|person|figure|actor|subject|dress|outfit|clothes|hair|face|expression|pose)\b/i.test(normalizedComment)) {
      return 'character_change';
    }

    // Location change patterns
    if (/\b(location|place|setting|scene|environment|background|around|where)\b/i.test(normalizedComment)) {
      return 'location_change';
    }

    // Style transfer patterns
    if (/\b(style|artistic|painting|sketch|watercolor|oil painting|illustrate|art style)\b/i.test(normalizedComment)) {
      return 'style_transfer';
    }

    // Lighting adjustment patterns
    if (/\b(lighting|light|dark|bright|dramatic|soft|shadow|highlight|exposure)\b/i.test(normalizedComment)) {
      return 'lighting_adjustment';
    }

    // Color adjustment patterns
    if (/\b(color|colour|saturation|vibrant|muted|tint|hue|temperature)\b/i.test(normalizedComment)) {
      return 'color_adjustment';
    }

    // Composition change patterns
    if (/\b(composition|angle|view|perspective|close-up|wide|shot framing|crop|center|balance)\b/i.test(normalizedComment)) {
      return 'composition_change';
    }

    return 'visual_adjustment'; // Default to visual adjustment
  }

  /**
   * Extract parameters from comment
   */
  extractParameters(comment: string): Record<string, unknown> {
    const parameters: Record<string, unknown> = {};
    const normalizedComment = comment.toLowerCase();

    // Extract intensity/strength
    const intensityMatch = normalizedComment.match(/\b(more|less|slightly|a bit|a little|very|extremely)\s*(intense|strong|subtle|pronounced)\b/i);
    if (intensityMatch) {
      parameters.intensity = intensityMatch[1].toLowerCase() === 'more' || intensityMatch[1].toLowerCase() === 'very' ? 0.8 : 0.3;
    }

    // Extract style preferences
    const styleMatch = normalizedComment.match(/\b(in the style of|like|similar to)\s+([^\.,]+)/i);
    if (styleMatch) {
      parameters.styleReference = styleMatch[2].trim();
    }

    // Extract lighting type
    if (/\bsoft lighting\b/i.test(normalizedComment)) parameters.lighting = 'soft';
    else if (/\bdrama(tic)? lighting\b/i.test(normalizedComment)) parameters.lighting = 'dramatic';
    else if (/\bnatural lighting\b/i.test(normalizedComment)) parameters.lighting = 'natural';
    else if (/\bneon lighting\b/i.test(normalizedComment)) parameters.lighting = 'neon';
    else if (/\bgolden hour\b/i.test(normalizedComment)) parameters.lighting = 'golden_hour';

    // Extract mood/emotion
    const moodMatch = normalizedComment.match(/\b(mood|feeling|atmosphere)\s+(?:of\s+)?([^\.,]+)/i);
    if (moodMatch) {
      parameters.mood = moodMatch[2].trim();
    }

    // Extract color preferences
    if (/\bwarm(?:er)? tones?\b/i.test(normalizedComment)) parameters.colorTemperature = 'warm';
    if (/\bcool(?:er)? tones?\b/i.test(normalizedComment)) parameters.colorTemperature = 'cool';
    if (/\bvibrant\b/i.test(normalizedComment)) parameters.saturation = 'high';
    if (/\bmuted\b/i.test(normalizedComment)) parameters.saturation = 'low';

    // Extract aspect ratio
    if (/\bportrait\b/i.test(normalizedComment)) parameters.aspectRatio = '9:16';
    else if (/\blandscape\b/i.test(normalizedComment)) parameters.aspectRatio = '16:9';
    else if (/\bsquare\b/i.test(normalizedComment)) parameters.aspectRatio = '1:1';

    // Extract specific character/element references
    const characterMatch = normalizedComment.match(/\b(character|person|man|woman|child)\s+(?:named|called|as|with)\s+([^\.,]+)/i);
    if (characterMatch) {
      parameters.characterDescription = characterMatch[2].trim();
    }

    return parameters;
  }

  /**
   * Extract target elements from comment
   */
  private extractTargetElements(comment: string): string[] {
    const targets: string[] = [];
    const normalizedComment = comment.toLowerCase();

    const elementPatterns: [RegExp, string][] = [
      [/\b(background|backdrop|setting)\b/i, 'background'],
      [/\b(foreground|subject|main focus)\b/i, 'foreground'],
      [/\b(lighting|lights?|shadows?)\b/i, 'lighting'],
      [/\b(colors?|colours?)\b/i, 'colors'],
      [/\b(character|figure|person)\b/i, 'character'],
      [/\b(wardrobe|outfit|clothes|dress)\b/i, 'wardrobe'],
      [/\b(hairst?yle|hair)\b/i, 'hair'],
      [/\b(facial expression|face|expression)\b/i, 'face'],
      [/\b(pose|posture|position)\b/i, 'pose'],
      [/\b(atmosphere|mood|ambience)\b/i, 'atmosphere'],
      [/\b(composition|frame|shot)\b/i, 'composition']
    ];

    for (const [pattern, label] of elementPatterns) {
      if (pattern.test(normalizedComment)) {
        targets.push(label);
      }
    }

    return targets.length > 0 ? targets : ['general'];
  }

  /**
   * Calculate confidence score for parsed intent
   */
  private calculateConfidence(modificationType: ModificationType, intent: string, targetElements: string[]): number {
    let confidence = 0.5;

    // Increase confidence based on specificity
    if (targetElements.length > 0 && targetElements[0] !== 'general') {
      confidence += 0.2;
    }
    if (intent === 'regenerate') {
      confidence += 0.3;
    }
    if (modificationType !== 'visual_adjustment') {
      confidence += 0.15;
    }

    return Math.min(1, Math.max(0, confidence));
  }

  /**
   * Generate suggestions based on parsed comment
   */
  private generateSuggestions(comment: string, intent: ParsedIntent): string[] {
    const suggestions: string[] = [];

    if (intent.modificationType === 'regenerate') {
      suggestions.push('Consider providing more specific details for the new generation');
      suggestions.push('You could include style preferences or mood descriptions');
    } else if (intent.modificationType === 'character_change') {
      suggestions.push('You might want to specify the character\'s appearance more precisely');
    } else if (intent.modificationType === 'style_transfer') {
      suggestions.push('Mentioning a reference style or artist could help');
    }

    return suggestions;
  }

  // ============================================================================
  // Intent Classification
  // ============================================================================

  /**
   * Classify the generation intent
   */
  classifyIntent(comment: string): GenerationIntent {
    const parsedIntent = this.parseComment(comment);
    const modificationType = parsedIntent.modificationType;
    const parameters = parsedIntent.parameters;

    // Build prompt based on parsed intent
    let prompt = this.buildPromptFromIntent(comment, parsedIntent);

    // Set up reference IDs
    const referenceIds: string[] = [];

    // Set up constraints
    const constraints: string[] = [];
    if (parsedIntent.targetElements.length > 0) {
      constraints.push(`preserve: ${parsedIntent.targetElements.filter(e => e !== 'general').join(', ')}`);
    }

    return {
      type: modificationType,
      prompt,
      parameters: this.mapToGenerationParameters(parameters),
      referenceIds,
      constraints
    };
  }

  /**
   * Check if comment asks for regeneration
   */
  isRegenerateRequest(comment: string): boolean {
    const normalizedComment = comment.toLowerCase();
    return /\bregenerate\b|\bredo\b|\brecreate\b|\bstart over\b|\btry again\b/i.test(normalizedComment);
  }

  /**
   * Check if comment asks for modification
   */
  isModificationRequest(comment: string): boolean {
    const normalizedComment = comment.toLowerCase();
    const modifyPatterns = /\b(change|modify|adjust|tweak|improve|enhance|alter|different|instead)\b/i;
    return modifyPatterns.test(normalizedComment) && !this.isRegenerateRequest(normalizedComment);
  }

  /**
   * Classify the intent type from comment
   */
  private classifyIntentType(comment: string): 'improve' | 'change' | 'regenerate' | 'refine' {
    const normalizedComment = comment.toLowerCase();

    if (this.isRegenerateRequest(normalizedComment)) {
      return 'regenerate';
    }

    if (/\b(improve|better|enhance|perfect|refine|polish)\b/i.test(normalizedComment)) {
      return 'improve';
    }

    if (/\b(change|different|modify|alter|switch)\b/i.test(normalizedComment)) {
      return 'change';
    }

    return 'refine';
  }

  /**
   * Build prompt from parsed intent
   */
  private buildPromptFromIntent(comment: string, intent: ParsedIntent): string {
    const parts: string[] = [];

    // Add modification context based on type
    switch (intent.modificationType) {
      case 'character_change':
        parts.push('Modified character appearance');
        break;
      case 'location_change':
        parts.push('Changed scene location');
        break;
      case 'style_transfer':
        parts.push('Applied new artistic style');
        break;
      case 'lighting_adjustment':
        parts.push('Adjusted lighting');
        break;
      case 'color_adjustment':
        parts.push('Modified color palette');
        break;
      case 'composition_change':
        parts.push('Changed composition');
        break;
      case 'regenerate':
        return comment; // Use original comment for regeneration
      default:
        parts.push('Visual adjustment');
    }

    // Add original comment context if provided
    if (comment && !this.isRegenerateRequest(comment)) {
      parts.push(`Original request: ${comment}`);
    }

    // Add parameters
    if (intent.parameters.styleReference) {
      parts.push(`Style reference: ${intent.parameters.styleReference}`);
    }
    if (intent.parameters.mood) {
      parts.push(`Mood: ${intent.parameters.mood}`);
    }

    return parts.join('. ');
  }

  /**
   * Map extracted parameters to GenerationParameters
   */
  private mapToGenerationParameters(params: Record<string, unknown>): GenerationParameters {
    return {
      strength: typeof params.intensity === 'number' ? params.intensity : 0.7,
      style: params.styleReference as string,
      mood: params.mood as string,
      lighting: params.lighting as string,
      colorPalette: params.colorPalette as string[],
      aspectRatio: params.aspectRatio as string
    };
  }

  // ============================================================================
  // Generation Execution
  // ============================================================================

  /**
   * Execute generation based on comment
   */
  async executeGeneration(shotId: string, comment: string, intent?: GenerationIntent): Promise<GenerationResult> {
    try {
      const generationIntent = intent || this.classifyIntent(comment);
      const parsedIntent = this.parseComment(comment);

      // Get original shot
      const originalShot = this.projectStore.getShot(shotId);
      if (!originalShot) {
        return {
          success: false,
          message: 'Shot not found',
          error: 'Shot not found in project store'
        };
      }

      // Handle regeneration
      if (generationIntent.type === 'regenerate' || parsedIntent.intent === 'regenerate') {
        return await this.handleRegeneration(shotId, comment, originalShot);
      }

      // Handle modifications
      const modification: VisualModification = {
        type: generationIntent.type,
        parameters: generationIntent.parameters,
        preserveConsistency: true,
        affectedElements: parsedIntent.targetElements
      };

      return await this.applyModification(shotId, modification);
    } catch (error) {
      return {
        success: false,
        message: 'Generation failed',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Handle regeneration request
   */
  private async handleRegeneration(
    shotId: string,
    comment: string,
    originalShot: { id: string; sequenceId: string; prompt?: string }
  ): Promise<GenerationResult> {
    // Build regeneration prompt
    const basePrompt = originalShot.prompt || '';
    const modifiedPrompt = comment.replace(/\b(regenerate|redo|recreate)\b/gi, '').trim();
    const finalPrompt = modifiedPrompt ? `${basePrompt}, ${modifiedPrompt}` : basePrompt;

    // Call generation service
    const result = await this.generationService.generateFromPrompt(finalPrompt, {
      preserveStyle: true,
      preserveCharacters: true
    });

    if (result.success && result.shotId) {
      // Add new shot to store
      this.projectStore.addShot({
        id: result.shotId,
        sequenceId: originalShot.sequenceId,
        prompt: finalPrompt
      });

      return {
        success: true,
        newShotId: result.shotId,
        previewUrl: result.previewUrl,
        message: 'Successfully regenerated shot'
      };
    }

    return {
      success: false,
      message: 'Regeneration failed',
      error: 'Generation service returned failure'
    };
  }

  /**
   * Generate multiple variations based on comment
   */
  async generateVariations(shotId: string, comment: string): Promise<string[]> {
    const variations: string[] = [];
    const baseIntent = this.classifyIntent(comment);

    // Generate variations with different parameter strengths
    const strengths = [0.3, 0.5, 0.7, 0.9];

    for (const strength of strengths) {
      const modifiedParams = {
        ...baseIntent.parameters,
        strength
      };

      const result = await this.generationService.generateFromPrompt(baseIntent.prompt, modifiedParams);
      if (result.success && result.shotId) {
        variations.push(result.shotId);
      }
    }

    return variations;
  }

  /**
   * Apply specific modification to shot
   */
  async applyModification(shotId: string, modification: VisualModification): Promise<GenerationResult> {
    try {
      // Get the shot to modify
      const shot = this.projectStore.getShot(shotId);
      if (!shot) {
        return {
          success: false,
          message: 'Shot not found',
          error: 'Cannot modify non-existent shot'
        };
      }

      // Apply modification based on type
      switch (modification.type) {
        case 'style_transfer':
          return await this.applyStyleTransferModification(shotId, modification);
        case 'character_change':
          return await this.applyCharacterModification(shotId, modification);
        case 'lighting_adjustment':
          return await this.applyLightingModification(shotId, modification);
        case 'color_adjustment':
          return await this.applyColorModification(shotId, modification);
        case 'composition_change':
          return await this.applyCompositionModification(shotId, modification);
        default:
          return await this.applyVisualAdjustment(shotId, modification);
      }
    } catch (error) {
      return {
        success: false,
        message: 'Modification failed',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Apply style transfer modification
   */
  private async applyStyleTransferModification(shotId: string, modification: VisualModification): Promise<GenerationResult> {
    const result = await this.generationService.applyStyleTransfer(shotId, shotId, 0.7);
    if (result.success && result.newShotId) {
      return {
        success: true,
        newShotId: result.newShotId,
        message: 'Style transfer applied successfully'
      };
    }
    return { success: false, message: 'Style transfer failed' };
  }

  /**
   * Apply character modification
   */
  private async applyCharacterModification(shotId: string, modification: VisualModification): Promise<GenerationResult> {
    const result = await this.generationService.modifyShot(shotId, modification);
    return result;
  }

  /**
   * Apply lighting modification
   */
  private async applyLightingModification(shotId: string, modification: VisualModification): Promise<GenerationResult> {
    const result = await this.generationService.modifyShot(shotId, modification);
    return result;
  }

  /**
   * Apply color modification
   */
  private async applyColorModification(shotId: string, modification: VisualModification): Promise<GenerationResult> {
    const result = await this.generationService.modifyShot(shotId, modification);
    return result;
  }

  /**
   * Apply composition modification
   */
  private async applyCompositionModification(shotId: string, modification: VisualModification): Promise<GenerationResult> {
    const result = await this.generationService.modifyShot(shotId, modification);
    return result;
  }

  /**
   * Apply general visual adjustment
   */
  private async applyVisualAdjustment(shotId: string, modification: VisualModification): Promise<GenerationResult> {
    const result = await this.generationService.modifyShot(shotId, modification);
    return result;
  }

  // ============================================================================
  // Comment Management
  // ============================================================================

  /**
   * Add comment to shot
   */
  addComment(shotId: string, comment: string): string {
    const commentId = `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const parsedIntent = this.parseComment(comment);

    const newComment: ShotComment = {
      id: commentId,
      shotId,
      content: comment,
      parsedIntent,
      createdAt: new Date(),
      resolved: false
    };

    // Get existing comments for this shot
    const existingComments = this.comments.get(shotId) || [];
    existingComments.push(newComment);
    this.comments.set(shotId, existingComments);

    return commentId;
  }

  /**
   * Get all comments for a shot
   */
  getComments(shotId: string): ShotComment[] {
    return this.comments.get(shotId) || [];
  }

  /**
   * Mark comment as resolved
   */
  resolveComment(commentId: string): void {
    for (const [shotId, comments] of this.comments.entries()) {
      const commentIndex = comments.findIndex(c => c.id === commentId);
      if (commentIndex !== -1) {
        comments[commentIndex].resolved = true;
        this.comments.set(shotId, comments);
        return;
      }
    }
  }

  /**
   * Get unresolved comments for a shot
   */
  getUnresolvedComments(shotId: string): ShotComment[] {
    return this.getComments(shotId).filter(c => !c.resolved);
  }

  /**
   * Get comment by ID
   */
  getCommentById(commentId: string): ShotComment | undefined {
    for (const comments of this.comments.values()) {
      const found = comments.find(c => c.id === commentId);
      if (found) return found;
    }
    return undefined;
  }

  /**
   * Link result shot to comment
   */
  linkResultToComment(commentId: string, resultShotId: string): void {
    const comment = this.getCommentById(commentId);
    if (comment) {
      comment.resultShotId = resultShotId;
      comment.resolved = true;
    }
  }

  /**
   * Clear all comments for a shot
   */
  clearComments(shotId: string): void {
    this.comments.delete(shotId);
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hits: number; misses: number } {
    return {
      size: this.parseCache.size,
      hits: 0,
      misses: 0
    };
  }

  /**
   * Clear parse cache
   */
  clearCache(): void {
    this.parseCache.clear();
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

let commentDrivenGenerationService: CommentDrivenGenerationService | null = null;

export function getCommentDrivenGenerationService(
  projectStore: ProjectStore,
  generationService: GenerationService
): CommentDrivenGenerationService {
  if (!commentDrivenGenerationService) {
    commentDrivenGenerationService = new CommentDrivenGenerationService(projectStore, generationService);
  }
  return commentDrivenGenerationService;
}

export { CommentDrivenGenerationService as default };
