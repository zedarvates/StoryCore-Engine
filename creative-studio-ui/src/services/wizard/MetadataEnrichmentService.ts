/**
 * Metadata Enrichment Service
 * Handles metadata enrichment, validation, and completeness checking for wizard data
 */

import type {
  SceneBreakdown,
  ShotPlan,
  ValidationResult,
  ValidationError,
} from '../../types/wizard';

// ============================================================================
// Enhanced Types with Metadata
// ============================================================================

export interface PromptReference {
  promptId: string;
  category: string;
  name: string;
  variation?: string;
}

export interface LightingSpecs {
  type: string;
  intensity: string;
  direction: string;
  colorTemp: string;
  shadowQuality: string;
}

export interface AtmosphereSpecs {
  mood: string;
  intensity: number;
  effects: string[];
}

export interface FramingSpecs {
  type: string;
  aspectRatio: string;
  composition: string;
  focusPoint: string;
}

export interface PerspectiveSpecs {
  angle: string;
  height: string;
  psychologicalEffect: string;
  commonUses: string[];
}

export interface MotionSpecs {
  type: string;
  speed: string;
  direction: string;
  purpose: string;
}

export interface EditingSpecs {
  transitionType: string;
  duration: number;
  effect: string;
  purpose: string;
}

export interface EnhancedSceneBreakdown extends SceneBreakdown {
  promptMetadata?: {
    timeOfDayPrompt?: PromptReference;
    moodPrompts?: PromptReference[];
    lightingPrompt?: PromptReference;
    colorPalettePrompt?: PromptReference;
  };
  technicalSpecs?: {
    lighting?: LightingSpecs;
    colorTemperature?: string;
    atmosphere?: AtmosphereSpecs;
    suggestedDuration?: number;
  };
  llmSuggestions?: {
    generatedAt: Date;
    confidence: number;
    reasoning: string;
    alternatives: PromptReference[];
  };
}

export interface EnhancedShotPlan extends ShotPlan {
  promptMetadata?: {
    shotTypePrompt?: PromptReference;
    cameraAnglePrompt?: PromptReference;
    cameraMovementPrompt?: PromptReference;
    transitionPrompt?: PromptReference;
  };
  technicalSpecs?: {
    framing?: FramingSpecs;
    perspective?: PerspectiveSpecs;
    motion?: MotionSpecs;
    editing?: EditingSpecs;
  };
  combinedPrompt?: {
    base: string;
    positive: string;
    negative: string;
    technical: Record<string, unknown>;
  };
  llmSuggestions?: {
    generatedAt: Date;
    confidence: number;
    reasoning: string;
    alternatives: unknown[];
  };
}

// ============================================================================
// Completeness Report Types
// ============================================================================

export interface FieldCompleteness {
  field: string;
  isComplete: boolean;
  value?: unknown;
  weight: number; // Importance weight (0-1)
}

export interface EntityCompleteness {
  entityId: string;
  entityType: 'scene' | 'shot';
  entityName: string;
  fields: FieldCompleteness[];
  completenessScore: number; // 0-100
  missingFields: string[];
  optionalFields: string[];
}

export interface CompletenessReport {
  overallScore: number; // 0-100
  sceneCompleteness: EntityCompleteness[];
  shotCompleteness: EntityCompleteness[];
  totalFields: number;
  completedFields: number;
  missingCriticalFields: string[];
  recommendations: string[];
  meetsThreshold: boolean; // true if >= 90%
}

// ============================================================================
// Metadata Enrichment Service
// ============================================================================

export class MetadataEnrichmentService {
  // Field weights for completeness calculation
  private static readonly SCENE_FIELD_WEIGHTS: Record<string, number> = {
    // Core fields (required)
    id: 1.0,
    sceneNumber: 1.0,
    sceneName: 1.0,
    durationMinutes: 1.0,
    locationId: 1.0,
    characterIds: 1.0,
    timeOfDay: 1.0,
    emotionalBeat: 0.8,
    keyActions: 0.8,
    order: 1.0,

    // Enhanced metadata fields
    'promptMetadata.timeOfDayPrompt': 0.7,
    'promptMetadata.moodPrompts': 0.7,
    'promptMetadata.lightingPrompt': 0.6,
    'promptMetadata.colorPalettePrompt': 0.5,

    // Technical specs
    'technicalSpecs.lighting': 0.6,
    'technicalSpecs.colorTemperature': 0.5,
    'technicalSpecs.atmosphere': 0.6,
    'technicalSpecs.suggestedDuration': 0.4,
  };

  private static readonly SHOT_FIELD_WEIGHTS: Record<string, number> = {
    // Core fields (required)
    id: 1.0,
    sceneId: 1.0,
    shotNumber: 1.0,
    shotType: 1.0,
    cameraAngle: 1.0,
    cameraMovement: 1.0,
    transition: 1.0,
    compositionNotes: 0.7,
    order: 1.0,

    // Enhanced metadata fields
    'promptMetadata.shotTypePrompt': 0.7,
    'promptMetadata.cameraAnglePrompt': 0.7,
    'promptMetadata.cameraMovementPrompt': 0.7,
    'promptMetadata.transitionPrompt': 0.6,

    // Technical specs
    'technicalSpecs.framing': 0.6,
    'technicalSpecs.perspective': 0.6,
    'technicalSpecs.motion': 0.6,
    'technicalSpecs.editing': 0.5,

    // Combined prompt
    'combinedPrompt.base': 0.5,
    'combinedPrompt.positive': 0.5,
    'combinedPrompt.negative': 0.4,
  };

  /**
   * Check completeness of a single scene
   */
  checkSceneCompleteness(scene: EnhancedSceneBreakdown): EntityCompleteness {
    const fields: FieldCompleteness[] = [];
    const missingFields: string[] = [];
    const optionalFields: string[] = [];

    // Check each field
    Object.entries(MetadataEnrichmentService.SCENE_FIELD_WEIGHTS).forEach(
      ([field, weight]) => {
        const value = this.getNestedValue(scene, field);
        const isComplete = this.isFieldComplete(value);

        fields.push({
          field,
          isComplete,
          value,
          weight,
        });

        if (!isComplete) {
          if (weight >= 0.8) {
            missingFields.push(field);
          } else {
            optionalFields.push(field);
          }
        }
      }
    );

    // Calculate weighted completeness score
    const totalWeight = fields.reduce((sum, f) => sum + f.weight, 0);
    const completedWeight = fields
      .filter((f) => f.isComplete)
      .reduce((sum, f) => sum + f.weight, 0);
    const completenessScore = (completedWeight / totalWeight) * 100;

    return {
      entityId: scene.id,
      entityType: 'scene',
      entityName: `Scene ${scene.sceneNumber}: ${scene.sceneName}`,
      fields,
      completenessScore,
      missingFields,
      optionalFields,
    };
  }

  /**
   * Check completeness of a single shot
   */
  checkShotCompleteness(shot: EnhancedShotPlan): EntityCompleteness {
    const fields: FieldCompleteness[] = [];
    const missingFields: string[] = [];
    const optionalFields: string[] = [];

    // Check each field
    Object.entries(MetadataEnrichmentService.SHOT_FIELD_WEIGHTS).forEach(
      ([field, weight]) => {
        const value = this.getNestedValue(shot, field);
        const isComplete = this.isFieldComplete(value);

        fields.push({
          field,
          isComplete,
          value,
          weight,
        });

        if (!isComplete) {
          if (weight >= 0.8) {
            missingFields.push(field);
          } else {
            optionalFields.push(field);
          }
        }
      }
    );

    // Calculate weighted completeness score
    const totalWeight = fields.reduce((sum, f) => sum + f.weight, 0);
    const completedWeight = fields
      .filter((f) => f.isComplete)
      .reduce((sum, f) => sum + f.weight, 0);
    const completenessScore = (completedWeight / totalWeight) * 100;

    return {
      entityId: shot.id,
      entityType: 'shot',
      entityName: `Shot ${shot.shotNumber}`,
      fields,
      completenessScore,
      missingFields,
      optionalFields,
    };
  }

  /**
   * Generate comprehensive completeness report for all scenes and shots
   */
  checkCompleteness(
    scenes: EnhancedSceneBreakdown[],
    shots: EnhancedShotPlan[]
  ): CompletenessReport {
    // Check completeness for each scene
    const sceneCompleteness = scenes.map((scene) => this.checkSceneCompleteness(scene));

    // Check completeness for each shot
    const shotCompleteness = shots.map((shot) => this.checkShotCompleteness(shot));

    // Calculate overall statistics
    const allEntities = [...sceneCompleteness, ...shotCompleteness];
    const totalFields = allEntities.reduce((sum, e) => sum + e.fields.length, 0);
    const completedFields = allEntities.reduce(
      (sum, e) => sum + e.fields.filter((f) => f.isComplete).length,
      0
    );

    // Calculate weighted overall score
    const totalWeight = allEntities.reduce(
      (sum, e) => sum + e.fields.reduce((s, f) => s + f.weight, 0),
      0
    );
    const completedWeight = allEntities.reduce(
      (sum, e) =>
        sum + e.fields.filter((f) => f.isComplete).reduce((s, f) => s + f.weight, 0),
      0
    );
    const overallScore = totalWeight > 0 ? (completedWeight / totalWeight) * 100 : 0;

    // Collect missing critical fields (weight >= 0.8)
    const missingCriticalFields = allEntities.flatMap((e) =>
      e.missingFields.map((field) => `${e.entityName}: ${field}`)
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      sceneCompleteness,
      shotCompleteness,
      overallScore
    );

    return {
      overallScore,
      sceneCompleteness,
      shotCompleteness,
      totalFields,
      completedFields,
      missingCriticalFields,
      recommendations,
      meetsThreshold: overallScore >= 90,
    };
  }

  /**
   * Validate metadata structure and content
   */
  validateMetadata(
    scenes: EnhancedSceneBreakdown[],
    shots: EnhancedShotPlan[]
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Validate scenes
    scenes.forEach((scene, index) => {
      // Required fields
      if (!scene.id) {
        errors.push({
          field: `scenes[${index}].id`,
          message: `Scene ${index + 1} is missing an ID`,
          severity: 'error',
        });
      }
      if (!scene.sceneName || scene.sceneName.trim() === '') {
        errors.push({
          field: `scenes[${index}].sceneName`,
          message: `Scene ${scene.sceneNumber} is missing a name`,
          severity: 'error',
        });
      }
      if (scene.durationMinutes <= 0) {
        errors.push({
          field: `scenes[${index}].durationMinutes`,
          message: `Scene ${scene.sceneNumber} has invalid duration`,
          severity: 'error',
        });
      }
      if (!scene.locationId) {
        errors.push({
          field: `scenes[${index}].locationId`,
          message: `Scene ${scene.sceneNumber} is missing a location`,
          severity: 'error',
        });
      }
      if (!scene.characterIds || scene.characterIds.length === 0) {
        warnings.push({
          field: `scenes[${index}].characterIds`,
          message: `Scene ${scene.sceneNumber} has no characters assigned`,
          severity: 'warning',
        });
      }

      // Enhanced metadata warnings
      if (!scene.promptMetadata?.timeOfDayPrompt) {
        warnings.push({
          field: `scenes[${index}].promptMetadata.timeOfDayPrompt`,
          message: `Scene ${scene.sceneNumber} is missing time of day prompt metadata`,
          severity: 'warning',
        });
      }
    });

    // Validate shots
    shots.forEach((shot, index) => {
      // Required fields
      if (!shot.id) {
        errors.push({
          field: `shots[${index}].id`,
          message: `Shot ${index + 1} is missing an ID`,
          severity: 'error',
        });
      }
      if (!shot.sceneId) {
        errors.push({
          field: `shots[${index}].sceneId`,
          message: `Shot ${shot.shotNumber} is not linked to a scene`,
          severity: 'error',
        });
      }

      // Validate scene reference exists
      const sceneExists = scenes.some((s) => s.id === shot.sceneId);
      if (!sceneExists) {
        errors.push({
          field: `shots[${index}].sceneId`,
          message: `Shot ${shot.shotNumber} references non-existent scene ${shot.sceneId}`,
          severity: 'error',
        });
      }

      // Enhanced metadata warnings
      if (!shot.promptMetadata?.shotTypePrompt) {
        warnings.push({
          field: `shots[${index}].promptMetadata.shotTypePrompt`,
          message: `Shot ${shot.shotNumber} is missing shot type prompt metadata`,
          severity: 'warning',
        });
      }
      if (!shot.combinedPrompt) {
        warnings.push({
          field: `shots[${index}].combinedPrompt`,
          message: `Shot ${shot.shotNumber} is missing combined prompt`,
          severity: 'warning',
        });
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Generate recommendations based on completeness analysis
   */
  private generateRecommendations(
    sceneCompleteness: EntityCompleteness[],
    shotCompleteness: EntityCompleteness[],
    overallScore: number
  ): string[] {
    const recommendations: string[] = [];

    // Overall score recommendations
    if (overallScore < 90) {
      recommendations.push(
        `Overall metadata completeness is ${overallScore.toFixed(1)}%. Aim for 90% or higher for optimal results.`
      );
    }

    // Scene-specific recommendations
    const incompleteScenes = sceneCompleteness.filter((s) => s.completenessScore < 90);
    if (incompleteScenes.length > 0) {
      recommendations.push(
        `${incompleteScenes.length} scene(s) have incomplete metadata. Focus on: ${incompleteScenes
          .slice(0, 3)
          .map((s) => s.entityName)
          .join(', ')}`
      );
    }

    // Shot-specific recommendations
    const incompleteShots = shotCompleteness.filter((s) => s.completenessScore < 90);
    if (incompleteShots.length > 0) {
      recommendations.push(
        `${incompleteShots.length} shot(s) have incomplete metadata. Consider adding prompt metadata and technical specs.`
      );
    }

    // Prompt metadata recommendations
    const scenesWithoutPrompts = sceneCompleteness.filter(
      (s) => s.missingFields.some((f) => f.includes('promptMetadata'))
    );
    if (scenesWithoutPrompts.length > 0) {
      recommendations.push(
        `${scenesWithoutPrompts.length} scene(s) are missing prompt library metadata. Use the prompt selectors to enhance scenes.`
      );
    }

    const shotsWithoutPrompts = shotCompleteness.filter(
      (s) => s.missingFields.some((f) => f.includes('promptMetadata'))
    );
    if (shotsWithoutPrompts.length > 0) {
      recommendations.push(
        `${shotsWithoutPrompts.length} shot(s) are missing cinematography prompts. Add shot type, camera angle, and movement metadata.`
      );
    }

    // Technical specs recommendations
    const scenesWithoutTechSpecs = sceneCompleteness.filter(
      (s) => s.missingFields.some((f) => f.includes('technicalSpecs'))
    );
    if (scenesWithoutTechSpecs.length > 0) {
      recommendations.push(
        `${scenesWithoutTechSpecs.length} scene(s) are missing technical specifications. These are auto-generated from prompt selections.`
      );
    }

    // Success message
    if (overallScore >= 90) {
      recommendations.push(
        '✓ Excellent! Your project metadata meets the 90% completeness threshold.'
      );
    }

    return recommendations;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: unknown, path: string): unknown {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Check if a field value is considered complete
   */
  private isFieldComplete(value: unknown): boolean {
    if (value === null || value === undefined) {
      return false;
    }
    if (typeof value === 'string' && value.trim() === '') {
      return false;
    }
    if (Array.isArray(value) && value.length === 0) {
      return false;
    }
    if (typeof value === 'object' && Object.keys(value).length === 0) {
      return false;
    }
    return true;
  }
}

// Export singleton instance
export const metadataEnrichmentService = new MetadataEnrichmentService();





