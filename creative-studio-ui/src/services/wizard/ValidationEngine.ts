/**
 * ValidationEngine - Centralized validation logic for all wizard steps
 * 
 * This service provides comprehensive validation for each wizard step including:
 * - Required field checks
 * - Data type validation
 * - Range validation
 * - Cross-reference validation
 * - Format validation
 * 
 * Requirements: 11.1, 11.2, 11.3
 */

import type {
  ProjectTypeData,
  GenreStyleData,
  WorldBuildingData,
  CharacterProfile,
  StoryStructureData,
  ScriptData,
  SceneBreakdown,
  ShotPlan,
  ValidationResult,
  ValidationError,
  WizardState,
} from '../../types/wizard';

export class ValidationEngine {
  /**
   * Validate Project Type data (Step 1)
   * Requirements: 1.4, 1.5, 11.1, 11.2
   */
  validateProjectType(data: ProjectTypeData | null): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    if (!data) {
      errors.push({
        field: 'projectType',
        message: 'Project type is required',
        severity: 'error',
      });
      return { isValid: false, errors, warnings };
    }

    // Validate type is selected
    if (!data.type) {
      errors.push({
        field: 'type',
        message: 'Please select a project type',
        severity: 'error',
      });
    }

    // Validate duration is positive
    if (data.durationMinutes <= 0) {
      errors.push({
        field: 'durationMinutes',
        message: 'Duration must be a positive number',
        severity: 'error',
      });
    }

    // Validate duration is reasonable (warn if > 300 minutes / 5 hours)
    if (data.durationMinutes > 300) {
      warnings.push({
        field: 'durationMinutes',
        message: 'Duration exceeds 5 hours. This is unusually long for most projects.',
        severity: 'warning',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate Genre & Style data (Step 2)
   * Requirements: 2.1, 2.2, 2.3, 2.4, 11.1
   */
  validateGenreStyle(data: GenreStyleData | null): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    if (!data) {
      errors.push({
        field: 'genreStyle',
        message: 'Genre and style information is required',
        severity: 'error',
      });
      return { isValid: false, errors, warnings };
    }

    // Validate at least one genre is selected
    if (!data.genres || data.genres.length === 0) {
      errors.push({
        field: 'genres',
        message: 'Please select at least one genre',
        severity: 'error',
      });
    }

    // Validate visual style is selected
    if (!data.visualStyle) {
      errors.push({
        field: 'visualStyle',
        message: 'Please select a visual style',
        severity: 'error',
      });
    }

    // Validate color palette
    if (!data.colorPalette) {
      errors.push({
        field: 'colorPalette',
        message: 'Please define a color palette',
        severity: 'error',
      });
    } else {
      // Validate color format (hex colors)
      const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
      
      if (data.colorPalette.primary && !hexColorRegex.test(data.colorPalette.primary)) {
        errors.push({
          field: 'colorPalette.primary',
          message: 'Primary color must be a valid hex color (e.g., #FF5733)',
          severity: 'error',
        });
      }
      
      if (data.colorPalette.secondary && !hexColorRegex.test(data.colorPalette.secondary)) {
        errors.push({
          field: 'colorPalette.secondary',
          message: 'Secondary color must be a valid hex color',
          severity: 'error',
        });
      }
      
      if (data.colorPalette.accent && !hexColorRegex.test(data.colorPalette.accent)) {
        errors.push({
          field: 'colorPalette.accent',
          message: 'Accent color must be a valid hex color',
          severity: 'error',
        });
      }
    }

    // Validate at least one mood is selected
    if (!data.mood || data.mood.length === 0) {
      errors.push({
        field: 'mood',
        message: 'Please select at least one mood',
        severity: 'error',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate World Building data (Step 3)
   * Requirements: 3.1, 3.2, 3.4, 3.6, 11.1, 11.2
   */
  validateWorldBuilding(data: WorldBuildingData | null): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    if (!data) {
      errors.push({
        field: 'worldBuilding',
        message: 'World building information is required',
        severity: 'error',
      });
      return { isValid: false, errors, warnings };
    }

    // Validate time period
    if (!data.timePeriod || data.timePeriod.trim() === '') {
      errors.push({
        field: 'timePeriod',
        message: 'Time period is required',
        severity: 'error',
      });
    }

    // Validate primary location
    if (!data.primaryLocation || data.primaryLocation.trim() === '') {
      errors.push({
        field: 'primaryLocation',
        message: 'Primary location is required',
        severity: 'error',
      });
    }

    // Validate universe type
    if (!data.universeType) {
      errors.push({
        field: 'universeType',
        message: 'Universe type is required',
        severity: 'error',
      });
    }

    // Validate at least one location is defined (Requirement 3.6)
    if (!data.locations || data.locations.length === 0) {
      errors.push({
        field: 'locations',
        message: 'At least one key location must be defined',
        severity: 'error',
      });
    } else {
      // Validate each location has required fields
      data.locations.forEach((location, index) => {
        if (!location.name || location.name.trim() === '') {
          errors.push({
            field: `locations[${index}].name`,
            message: `Location ${index + 1}: Name is required`,
            severity: 'error',
          });
        }
        
        if (!location.description || location.description.trim() === '') {
          errors.push({
            field: `locations[${index}].description`,
            message: `Location ${index + 1}: Description is required`,
            severity: 'error',
          });
        }
      });
    }

    // Validate technology level is in range
    if (data.technologyLevel < 0 || data.technologyLevel > 10) {
      errors.push({
        field: 'technologyLevel',
        message: 'Technology level must be between 0 and 10',
        severity: 'error',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate Character profiles (Step 4)
   * Requirements: 4.1, 4.2, 4.3, 4.6, 11.1, 11.2
   */
  validateCharacters(data: CharacterProfile[]): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Validate at least one character is defined (Requirement 4.6)
    if (!data || data.length === 0) {
      errors.push({
        field: 'characters',
        message: 'At least one character must be defined',
        severity: 'error',
      });
      return { isValid: false, errors, warnings };
    }

    // Validate each character has required fields
    data.forEach((character, index) => {
      if (!character.name || character.name.trim() === '') {
        errors.push({
          field: `characters[${index}].name`,
          message: `Character ${index + 1}: Name is required`,
          severity: 'error',
        });
      }

      if (!character.role) {
        errors.push({
          field: `characters[${index}].role`,
          message: `Character ${index + 1}: Role is required`,
          severity: 'error',
        });
      }

      if (!character.physicalAppearance || character.physicalAppearance.trim() === '') {
        errors.push({
          field: `characters[${index}].physicalAppearance`,
          message: `Character ${index + 1}: Physical appearance is required`,
          severity: 'error',
        });
      }

      // Warn if personality traits are empty
      if (!character.personalityTraits || character.personalityTraits.length === 0) {
        warnings.push({
          field: `characters[${index}].personalityTraits`,
          message: `Character ${index + 1}: Consider adding personality traits for better characterization`,
          severity: 'warning',
        });
      }
    });

    // Check for duplicate character names
    const names = data.map(c => c.name.toLowerCase().trim()).filter(n => n !== '');
    const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
    if (duplicates.length > 0) {
      warnings.push({
        field: 'characters',
        message: `Duplicate character names found: ${[...new Set(duplicates)].join(', ')}`,
        severity: 'warning',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate Story Structure data (Step 5)
   * Requirements: 5.1, 5.2, 5.7, 11.1, 11.2
   */
  validateStoryStructure(data: StoryStructureData | null): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    if (!data) {
      errors.push({
        field: 'storyStructure',
        message: 'Story structure information is required',
        severity: 'error',
      });
      return { isValid: false, errors, warnings };
    }

    // Validate premise is provided (Requirement 5.7)
    if (!data.premise || data.premise.trim() === '') {
      errors.push({
        field: 'premise',
        message: 'Premise is required',
        severity: 'error',
      });
    } else if (data.premise.length > 500) {
      errors.push({
        field: 'premise',
        message: 'Premise must not exceed 500 characters',
        severity: 'error',
      });
    }

    // Validate logline is provided (Requirement 5.7)
    if (!data.logline || data.logline.trim() === '') {
      errors.push({
        field: 'logline',
        message: 'Logline is required',
        severity: 'error',
      });
    } else if (data.logline.length > 150) {
      errors.push({
        field: 'logline',
        message: 'Logline must not exceed 150 characters',
        severity: 'error',
      });
    }

    // Validate act structure is selected
    if (!data.actStructure) {
      errors.push({
        field: 'actStructure',
        message: 'Act structure is required',
        severity: 'error',
      });
    }

    // Validate narrative perspective is selected
    if (!data.narrativePerspective) {
      errors.push({
        field: 'narrativePerspective',
        message: 'Narrative perspective is required',
        severity: 'error',
      });
    }

    // Warn if no plot points are defined
    if (!data.plotPoints || data.plotPoints.length === 0) {
      warnings.push({
        field: 'plotPoints',
        message: 'Consider adding plot points to structure your narrative',
        severity: 'warning',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate Script data (Step 6)
   * Requirements: 6.1, 6.2, 11.1
   */
  validateScript(data: ScriptData | null): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    if (!data) {
      errors.push({
        field: 'script',
        message: 'Script information is required',
        severity: 'error',
      });
      return { isValid: false, errors, warnings };
    }

    // Validate format is selected
    if (!data.format) {
      errors.push({
        field: 'format',
        message: 'Script format is required',
        severity: 'error',
      });
    }

    // Validate content is provided
    if (!data.content || data.content.trim() === '') {
      errors.push({
        field: 'content',
        message: 'Script content is required',
        severity: 'error',
      });
    }

    // Warn if content is very short
    if (data.content && data.content.trim().length < 100) {
      warnings.push({
        field: 'content',
        message: 'Script content seems very short. Consider adding more detail.',
        severity: 'warning',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate Scene Breakdown data (Step 7)
   * Requirements: 7.2, 7.4, 7.6, 11.1, 11.2
   */
  validateSceneBreakdown(
    data: SceneBreakdown[],
    projectDuration?: number,
    locations?: WorldBuildingData['locations'],
    characters?: CharacterProfile[]
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Validate at least one scene is defined
    if (!data || data.length === 0) {
      errors.push({
        field: 'scenes',
        message: 'At least one scene must be defined',
        severity: 'error',
      });
      return { isValid: false, errors, warnings };
    }

    let totalDuration = 0;

    // Validate each scene has required fields (Requirement 7.6)
    data.forEach((scene, index) => {
      if (!scene.sceneName || scene.sceneName.trim() === '') {
        errors.push({
          field: `scenes[${index}].sceneName`,
          message: `Scene ${index + 1}: Name is required`,
          severity: 'error',
        });
      }

      if (scene.durationMinutes <= 0) {
        errors.push({
          field: `scenes[${index}].durationMinutes`,
          message: `Scene ${index + 1}: Duration must be positive`,
          severity: 'error',
        });
      }

      totalDuration += scene.durationMinutes;

      // Validate location is assigned (Requirement 7.6)
      if (!scene.locationId || scene.locationId.trim() === '') {
        errors.push({
          field: `scenes[${index}].locationId`,
          message: `Scene ${index + 1}: Location is required`,
          severity: 'error',
        });
      }

      // Validate at least one character is assigned (Requirement 7.6)
      if (!scene.characterIds || scene.characterIds.length === 0) {
        errors.push({
          field: `scenes[${index}].characterIds`,
          message: `Scene ${index + 1}: At least one character is required`,
          severity: 'error',
        });
      }

      // Cross-reference validation: location exists
      if (locations && scene.locationId) {
        const locationExists = locations.some(loc => loc.id === scene.locationId);
        if (!locationExists) {
          errors.push({
            field: `scenes[${index}].locationId`,
            message: `Scene ${index + 1}: Referenced location does not exist`,
            severity: 'error',
          });
        }
      }

      // Cross-reference validation: characters exist
      if (characters && scene.characterIds) {
        scene.characterIds.forEach(charId => {
          const characterExists = characters.some(char => char.id === charId);
          if (!characterExists) {
            errors.push({
              field: `scenes[${index}].characterIds`,
              message: `Scene ${index + 1}: Referenced character does not exist`,
              severity: 'error',
            });
          }
        });
      }
    });

    // Validate total duration against project duration (Requirement 7.4)
    if (projectDuration && totalDuration > projectDuration * 1.1) {
      warnings.push({
        field: 'scenes',
        message: `Total scene duration (${totalDuration} min) exceeds project duration (${projectDuration} min) by more than 10%`,
        severity: 'warning',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate Shot Planning data (Step 8)
   * Requirements: 8.2, 8.3, 8.7, 11.1, 11.2
   */
  validateShotPlanning(data: ShotPlan[], scenes?: SceneBreakdown[]): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Validate at least one shot is defined
    if (!data || data.length === 0) {
      errors.push({
        field: 'shots',
        message: 'At least one shot must be defined',
        severity: 'error',
      });
      return { isValid: false, errors, warnings };
    }

    // Validate each shot has required fields
    data.forEach((shot, index) => {
      if (!shot.sceneId || shot.sceneId.trim() === '') {
        errors.push({
          field: `shots[${index}].sceneId`,
          message: `Shot ${index + 1}: Scene reference is required`,
          severity: 'error',
        });
      }

      if (!shot.shotType) {
        errors.push({
          field: `shots[${index}].shotType`,
          message: `Shot ${index + 1}: Shot type is required`,
          severity: 'error',
        });
      }

      if (!shot.cameraAngle) {
        errors.push({
          field: `shots[${index}].cameraAngle`,
          message: `Shot ${index + 1}: Camera angle is required`,
          severity: 'error',
        });
      }

      if (!shot.cameraMovement) {
        errors.push({
          field: `shots[${index}].cameraMovement`,
          message: `Shot ${index + 1}: Camera movement is required`,
          severity: 'error',
        });
      }

      // Cross-reference validation: scene exists
      if (scenes && shot.sceneId) {
        const sceneExists = scenes.some(scene => scene.id === shot.sceneId);
        if (!sceneExists) {
          errors.push({
            field: `shots[${index}].sceneId`,
            message: `Shot ${index + 1}: Referenced scene does not exist`,
            severity: 'error',
          });
        }
      }
    });

    // Validate each scene has at least one shot (Requirement 8.7)
    if (scenes) {
      scenes.forEach((scene, index) => {
        const sceneShots = data.filter(shot => shot.sceneId === scene.id);
        if (sceneShots.length === 0) {
          errors.push({
            field: 'shots',
            message: `Scene ${index + 1} (${scene.sceneName}): At least one shot is required`,
            severity: 'error',
          });
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate cross-step consistency (Requirement 11.3)
   * This validates that data across multiple steps is consistent
   */
  validateCrossStepConsistency(wizardState: WizardState): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Validate scene breakdown references valid locations and characters
    if (wizardState.scenes && wizardState.scenes.length > 0) {
      const sceneValidation = this.validateSceneBreakdown(
        wizardState.scenes,
        wizardState.projectType?.durationMinutes,
        wizardState.worldBuilding?.locations,
        wizardState.characters
      );
      errors.push(...sceneValidation.errors);
      warnings.push(...sceneValidation.warnings);
    }

    // Validate shot planning references valid scenes
    if (wizardState.shots && wizardState.shots.length > 0) {
      const shotValidation = this.validateShotPlanning(
        wizardState.shots,
        wizardState.scenes
      );
      errors.push(...shotValidation.errors);
      warnings.push(...shotValidation.warnings);
    }

    // Validate parsed script characters match character profiles
    if (wizardState.script?.parsedScenes && wizardState.characters) {
      const scriptCharacters = new Set<string>();
      wizardState.script.parsedScenes.forEach(scene => {
        scene.characters.forEach(char => scriptCharacters.add(char.toLowerCase()));
      });

      const profileCharacters = new Set(
        wizardState.characters.map(c => c.name.toLowerCase())
      );

      scriptCharacters.forEach(scriptChar => {
        if (!profileCharacters.has(scriptChar)) {
          warnings.push({
            field: 'script',
            message: `Character "${scriptChar}" appears in script but has no character profile`,
            severity: 'warning',
          });
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

// Export singleton instance
export const validationEngine = new ValidationEngine();
