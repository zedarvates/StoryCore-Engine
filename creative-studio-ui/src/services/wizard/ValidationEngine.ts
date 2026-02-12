/**
 * Wizard Validation Engine
 * 
 * Centralized validation system for all wizard steps across all wizards.
 * Provides consistent validation rules, error messages, and severity levels.
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4
 * 
 * @updated 2026-02-12 - Migrated `any` types to specific types
 */

// ============================================================================
// Validation Types (Migrated from `any`)
// ============================================================================

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationFieldError {
  field: string;
  message: string;
  severity: ValidationSeverity;
  code?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationFieldError[];
  warnings: ValidationFieldError[];
  infos: ValidationFieldError[];
}

/** Generic validation data container - replaces `any` for function parameters */
export interface WizardValidationData {
  [key: string]: unknown;
}

/** Typed wizard data interfaces for specific wizards - replaces `any` */
export interface CharacterStepData {
  name?: string;
  role?: {
    archetype?: string;
    [key: string]: unknown;
  };
  physicalAppearance?: string;
  personalityTraits?: string[];
  background?: string;
  visualReferences?: string[];
  relationships?: Array<{ characterId: string; relationshipType: string; description: string }>;
  // Additional properties that may exist
  visual_identity?: {
    age_range?: string;
    [key: string]: unknown;
  };
  personality?: {
    traits?: string[];
    [key: string]: unknown;
  };
}

export interface WorldStepData {
  name?: string;
  genre?: string[];
  setting?: string;
  rules?: string[];
  societies?: string[];
}

export interface StorytellerStepData {
  storySummary?: string;
  selectedCharacters?: string[];
  mainConflict?: string;
}

export interface ProjectSetupStepData {
  projectName?: string;
  genres?: string[];
  scenes?: Array<{ id: string; sceneName: string }>;
}

/** Validation rule interface with typed data - replaces `any` */
export interface StepValidationRule<T extends WizardValidationData = WizardValidationData> {
  step: number;
  wizardType: string;
  validate: (data: T) => ValidationResult;
  dependencies?: string[];
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create an empty validation result
 */
export function createValidResult(): ValidationResult {
  return {
    isValid: true,
    errors: [],
    warnings: [],
    infos: [],
  };
}

/**
 * Create a validation result with errors
 */
export function createInvalidResult(
  errors: ValidationFieldError[],
  warnings: ValidationFieldError[] = [],
  infos: ValidationFieldError[] = []
): ValidationResult {
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    infos,
  };
}

/**
 * Combine multiple validation results
 */
export function combineResults(...results: ValidationResult[]): ValidationResult {
  return results.reduce(
    (acc, result) => ({
      isValid: acc.isValid && result.isValid,
      errors: [...acc.errors, ...result.errors],
      warnings: [...acc.warnings, ...result.warnings],
      infos: [...acc.infos, ...result.infos],
    }),
    createValidResult()
  );
}

/**
 * Check if a field is empty or whitespace - typed version
 */
export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/**
 * Check if a string exceeds maximum length
 */
export function exceedsMaxLength(value: string, maxLength: number): boolean {
  return value.length > maxLength;
}

/**
 * Check if a value is below minimum length
 */
export function belowMinLength(value: unknown, minLength: number): boolean {
  if (typeof value === 'string') return value.trim().length < minLength;
  if (Array.isArray(value)) return value.length < minLength;
  return false;
}

// ============================================================================
// Character Wizard Validation Rules
// ============================================================================

export function validateCharacterStep1(data: CharacterStepData): ValidationResult {
  const errors: ValidationFieldError[] = [];
  const warnings: ValidationFieldError[] = [];

  // Name validation
  if (isEmpty(data?.name)) {
    errors.push({
      field: 'name',
      message: 'Character name is required',
      severity: 'error',
      code: 'NAME_REQUIRED',
    });
  } else if (data?.name && data.name.length < 2) {
    errors.push({
      field: 'name',
      message: 'Character name must be at least 2 characters',
      severity: 'error',
      code: 'NAME_TOO_SHORT',
    });
  }

  // Archetype validation
  if (isEmpty(data?.role?.archetype)) {
    errors.push({
      field: 'role.archetype',
      message: 'Character archetype is required',
      severity: 'error',
      code: 'ARCHETYPE_REQUIRED',
    });
  }

  // Age range validation
  if (isEmpty(data?.visual_identity?.age_range)) {
    errors.push({
      field: 'visual_identity.age_range',
      message: 'Age range is required',
      severity: 'error',
      code: 'AGE_RANGE_REQUIRED',
    });
  }

  return createInvalidResult(errors, warnings);
}

export function validateCharacterStep2(data: CharacterStepData): ValidationResult {
  // Step 2 (Physical Appearance) is optional - LLM can help fill in
  return createValidResult();
}

export function validateCharacterStep3(data: CharacterStepData): ValidationResult {
  const errors: ValidationFieldError[] = [];
  const warnings: ValidationFieldError[] = [];

  // Max 10 personality traits
  if (data?.personality?.traits && data.personality.traits.length > 10) {
    errors.push({
      field: 'personality.traits',
      message: 'Maximum 10 personality traits allowed',
      severity: 'error',
      code: 'TOO_MANY_TRAITS',
    });
  }

  return createInvalidResult(errors, warnings);
}

export function validateCharacterStep4(data: CharacterStepData): ValidationResult {
  // Step 4 (Background) is optional
  return createValidResult();
}

export function validateCharacterStep5(data: CharacterStepData): ValidationResult {
  const errors: ValidationFieldError[] = [];
  const warnings: ValidationFieldError[] = [];

  // Validate relationships
  if (data?.relationships && data.relationships.length > 0) {
    data.relationships.forEach((rel: unknown, index: number) => {
      if (isEmpty(rel?.character_name)) {
        errors.push({
          field: `relationships[${index}].character_name`,
          message: 'Character name is required for relationship',
          severity: 'error',
          code: 'RELATIONSHIP_NAME_REQUIRED',
        });
      }
      if (isEmpty(rel?.relationship_type)) {
        errors.push({
          field: `relationships[${index}].relationship_type`,
          message: 'Relationship type is required',
          severity: 'error',
          code: 'RELATIONSHIP_TYPE_REQUIRED',
        });
      }
    });
  }

  return createInvalidResult(errors, warnings);
}

export function validateCharacterStep6(data: CharacterStepData): ValidationResult {
  // Final review step - re-validate required fields
  return validateCharacterStep1(data);
}

// ============================================================================
// World Wizard Validation Rules
// ============================================================================

export function validateWorldStep1(data: WorldStepData): ValidationResult {
  const errors: ValidationFieldError[] = [];
  const warnings: ValidationFieldError[] = [];

  if (isEmpty(data?.name)) {
    errors.push({
      field: 'name',
      message: 'World name is required',
      severity: 'error',
      code: 'WORLD_NAME_REQUIRED',
    });
  }

  if (isEmpty(data?.genre)) {
    errors.push({
      field: 'genre',
      message: 'Genre is required',
      severity: 'error',
      code: 'GENRE_REQUIRED',
    });
  }

  return createInvalidResult(errors, warnings);
}

export function validateWorldStep2(data: WorldStepData): ValidationResult {
  // World rules - at least one rule required
  const errors: ValidationFieldError[] = [];
  
  if (data?.rules && data.rules.length === 0) {
    errors.push({
      field: 'rules',
      message: 'At least one world rule is required',
      severity: 'warning',
      code: 'NO_RULES',
    });
  }

  return createInvalidResult(errors);
}

export function validateWorldStep3(data: WorldStepData): ValidationResult {
  const errors: ValidationFieldError[] = [];
  const warnings: ValidationFieldError[] = [];

  if (isEmpty(data?.setting)) {
    errors.push({
      field: 'setting',
      message: 'Setting/environment description is required',
      severity: 'error',
      code: 'SETTING_REQUIRED',
    });
  }

  return createInvalidResult(errors, warnings);
}

export function validateWorldStep4(data: WorldStepData): ValidationResult {
  const errors: ValidationFieldError[] = [];
  const warnings: ValidationFieldError[] = [];

  // Culture/societies validation
  if (data?.societies && data.societies.length === 0) {
    warnings.push({
      field: 'societies',
      message: 'Adding societies enriches your world',
      severity: 'warning',
      code: 'NO_SOCIETIES',
    });
  }

  return createInvalidResult(errors, warnings);
}

export function validateWorldStep5(data: WorldStepData): ValidationResult {
  // Final review - re-validate critical fields
  return validateWorldStep1(data);
}

// ============================================================================
// Storyteller Wizard Validation Rules
// ============================================================================

export function validateStorytellerStep1(data: StorytellerStepData): ValidationResult {
  const errors: ValidationFieldError[] = [];
  const warnings: ValidationFieldError[] = [];

  if (isEmpty(data?.storySummary)) {
    errors.push({
      field: 'storySummary',
      message: 'Story summary is required',
      severity: 'error',
      code: 'SUMMARY_REQUIRED',
    });
  }

  if (data?.storySummary && data.storySummary.length < 50) {
    warnings.push({
      field: 'storySummary',
      message: 'Story summary could be more detailed',
      severity: 'warning',
      code: 'SUMMARY_TOO_SHORT',
    });
  }

  return createInvalidResult(errors, warnings);
}

export function validateStorytellerStep2(data: StorytellerStepData): ValidationResult {
  // Character selection
  const errors: ValidationFieldError[] = [];

  if (!data?.selectedCharacters || data.selectedCharacters.length === 0) {
    errors.push({
      field: 'selectedCharacters',
      message: 'At least one character is required',
      severity: 'error',
      code: 'NO_CHARACTERS',
    });
  }

  return createInvalidResult(errors);
}

export function validateStorytellerStep3(data: StorytellerStepData): ValidationResult {
  // Location selection - optional
  return createValidResult();
}

export function validateStorytellerStep4(data: StorytellerStepData): ValidationResult {
  const errors: ValidationFieldError[] = [];

  if (isEmpty(data?.mainConflict)) {
    errors.push({
      field: 'mainConflict',
      message: 'Main conflict is required',
      severity: 'error',
      code: 'CONFLICT_REQUIRED',
    });
  }

  return createInvalidResult(errors);
}

export function validateStorytellerStep5(data: StorytellerStepData): ValidationResult {
  // Final review
  const result = combineResults(
    validateStorytellerStep1(data),
    validateStorytellerStep2(data)
  );
  return result;
}

// ============================================================================
// Project Setup Wizard Validation Rules
// ============================================================================

export function validateProjectSetupStep1(data: ProjectSetupStepData): ValidationResult {
  const errors: ValidationFieldError[] = [];

  if (isEmpty(data?.projectName)) {
    errors.push({
      field: 'projectName',
      message: 'Project name is required',
      severity: 'error',
      code: 'PROJECT_NAME_REQUIRED',
    });
  }

  return createInvalidResult(errors);
}

export function validateProjectSetupStep2(data: ProjectSetupStepData): ValidationResult {
  const errors: ValidationFieldError[] = [];

  if (!data?.genres || data.genres.length === 0) {
    errors.push({
      field: 'genres',
      message: 'At least one genre must be selected',
      severity: 'error',
      code: 'GENRES_REQUIRED',
    });
  }

  return createInvalidResult(errors);
}

export function validateProjectSetupStep3(data: ProjectSetupStepData): ValidationResult {
  // Scene breakdown validation
  const errors: ValidationFieldError[] = [];

  if (!data?.scenes || data.scenes.length === 0) {
    errors.push({
      field: 'scenes',
      message: 'At least one scene is required',
      severity: 'error',
      code: 'SCENES_REQUIRED',
    });
  }

  return createInvalidResult(errors);
}

// ============================================================================
// Validation Engine
// ============================================================================

export class WizardValidationEngine {
  private rules: Map<string, StepValidationRule[]> = new Map();

  constructor() {
    this.registerDefaultRules();
  }

  /**
   * Register default validation rules for all wizards
   */
  private registerDefaultRules(): void {
    // Character Wizard
    this.registerRule('character', 1, validateCharacterStep1);
    this.registerRule('character', 2, validateCharacterStep2);
    this.registerRule('character', 3, validateCharacterStep3);
    this.registerRule('character', 4, validateCharacterStep4);
    this.registerRule('character', 5, validateCharacterStep5);
    this.registerRule('character', 6, validateCharacterStep6);

    // World Wizard
    this.registerRule('world', 1, validateWorldStep1);
    this.registerRule('world', 2, validateWorldStep2);
    this.registerRule('world', 3, validateWorldStep3);
    this.registerRule('world', 4, validateWorldStep4);
    this.registerRule('world', 5, validateWorldStep5);

    // Storyteller Wizard
    this.registerRule('storyteller', 1, validateStorytellerStep1);
    this.registerRule('storyteller', 2, validateStorytellerStep2);
    this.registerRule('storyteller', 3, validateStorytellerStep3);
    this.registerRule('storyteller', 4, validateStorytellerStep4);
    this.registerRule('storyteller', 5, validateStorytellerStep5);

    // Project Setup Wizard
    this.registerRule('project-setup', 1, validateProjectSetupStep1);
    this.registerRule('project-setup', 2, validateProjectSetupStep2);
    this.registerRule('project-setup', 3, validateProjectSetupStep3);
  }

  /**
   * Register a validation rule for a specific wizard step
   */
  registerRule<T extends WizardValidationData>(
    wizardType: string,
    step: number,
    validate: (data: T) => ValidationResult,
    dependencies?: string[]
  ): void {
    const key = wizardType;
    if (!this.rules.has(key)) {
      this.rules.set(key, []);
    }
    this.rules.get(key)!.push({ step, wizardType, validate: validate as (data: WizardValidationData) => ValidationResult, dependencies });
  }

  /**
   * Validate a specific step for a wizard
   */
  validateStep<T extends WizardValidationData>(wizardType: string, step: number, data: T): ValidationResult {
    const rules = this.rules.get(wizardType);
    if (!rules) {
      console.warn(`No validation rules found for wizard type: ${wizardType}`);
      return createValidResult();
    }

    const rule = rules.find(r => r.step === step);
    if (!rule) {
      console.warn(`No validation rule found for step ${step} in ${wizardType}`);
      return createValidResult();
    }

    return rule.validate(data as WizardValidationData);
  }

  /**
   * Validate all steps for a wizard
   */
  validateAll(wizardType: string, allData: Record<number, WizardValidationData>): ValidationResult {
    const rules = this.rules.get(wizardType);
    if (!rules) {
      return createValidResult();
    }

    const results = rules.map(rule => {
      const stepData = allData[rule.step];
      return rule.validate(stepData);
    });

    return combineResults(...results);
  }

  /**
   * Get validation summary for display
   */
  getSummary(result: ValidationResult): {
    totalErrors: number;
    totalWarnings: number;
    totalInfos: number;
    hasErrors: boolean;
    message: string;
  } {
    const totalErrors = result.errors.length;
    const totalWarnings = result.warnings.length;
    const totalInfos = result.infos.length;

    let message = '';
    if (totalErrors > 0) {
      message = `${totalErrors} error${totalErrors > 1 ? 's' : ''} found`;
    } else if (totalWarnings > 0) {
      message = `${totalWarnings} warning${totalWarnings > 1 ? 's' : ''} found`;
    } else {
      message = 'All validations passed';
    }

    return {
      totalErrors,
      totalWarnings,
      totalInfos,
      hasErrors: totalErrors > 0,
      message,
    };
  }
}

// ============================================================================
// Singleton instance
// ============================================================================

export const validationEngine = new WizardValidationEngine();

// ============================================================================
// Helper functions for UI
// ============================================================================

/**
 * Format validation errors for display in a form
 */
export function formatValidationErrors(result: ValidationResult): string[] {
  return result.errors.map(error => `${error.field}: ${error.message}`);
}

/**
 * Get first error message for a specific field
 */
export function getFieldError(result: ValidationResult, field: string): string | null {
  const error = result.errors.find(e => e.field === field);
  return error ? error.message : null;
}

/**
 * Check if a field has any errors
 */
export function hasFieldError(result: ValidationResult, field: string): boolean {
  return result.errors.some(e => e.field === field);
}

/**
 * Get all errors, warnings, and infos grouped by field
 */
export function groupErrorsByField(result: ValidationResult): Record<string, ValidationFieldError[]> {
  const grouped: Record<string, ValidationFieldError[]> = {};
  
  [...result.errors, ...result.warnings, ...result.infos].forEach(error => {
    if (!grouped[error.field]) {
      grouped[error.field] = [];
    }
    grouped[error.field].push(error);
  });
  
  return grouped;
}



