/**
 * State Validation Service
 * 
 * Validates wizard state structure and detects corruption.
 * 
 * Requirements: 5.6
 */

import type { WizardAutoSaveState, WizardType } from '../../utils/wizardStorage';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  canRecover: boolean;
  recoveryStrategy?: 'reset' | 'partial' | 'migrate';
}

export interface StateVersion {
  major: number;
  minor: number;
  patch: number;
}

const CURRENT_VERSION: StateVersion = {
  major: 1,
  minor: 0,
  patch: 0,
};

/**
 * State Validation Service
 */
export class StateValidationService {
  /**
   * Validate wizard state structure
   */
  // Using 'unknown' for state parameter — validated structurally before type casting
  validateState(state: unknown): ValidationResult {
    const s = state as Record<string, unknown>;
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if state exists
    if (!state) {
      errors.push('State is null or undefined');
      return {
        isValid: false,
        errors,
        warnings,
        canRecover: false,
      };
    }

    // Check if state is an object
    if (typeof state !== 'object') {
      errors.push('State is not an object');
      return {
        isValid: false,
        errors,
        warnings,
        canRecover: false,
      };
    }

    // Validate required fields
    if (!s.wizardType) {
      errors.push('Missing required field: wizardType');
    } else if (s.wizardType !== 'world' && s.wizardType !== 'character' && s.wizardType !== 'sequence-plan') {
      errors.push(`Invalid wizardType: ${s.wizardType}`);
    }

    if (s.timestamp === undefined) {
      errors.push('Missing required field: timestamp');
    } else if (typeof s.timestamp !== 'string') {
      errors.push('Invalid timestamp type');
    } else {
      const date = new Date(s.timestamp);
      if (isNaN(date.getTime())) {
        errors.push('Invalid timestamp format');
      }
    }

    if (s.currentStep === undefined) {
      errors.push('Missing required field: currentStep');
    } else if (typeof s.currentStep !== 'number') {
      errors.push('Invalid currentStep type');
    } else if (s.currentStep < 0) {
      errors.push('currentStep cannot be negative');
    }

    if (!s.formData) {
      errors.push('Missing required field: formData');
    } else if (typeof s.formData !== 'object') {
      errors.push('Invalid formData type');
    }

    if (s.expiresAt === undefined) {
      errors.push('Missing required field: expiresAt');
    } else if (typeof s.expiresAt !== 'string') {
      errors.push('Invalid expiresAt type');
    } else {
      const date = new Date(s.expiresAt);
      if (isNaN(date.getTime())) {
        errors.push('Invalid expiresAt format');
      } else if (date < new Date()) {
        warnings.push('State has expired');
      }
    }

    // Check for version mismatch
    if (s.version) {
      const versionResult = this.checkVersionCompatibility(s.version as string | StateVersion);
      if (!versionResult.compatible) {
        warnings.push(versionResult.message);
      }
    }

    // Determine if state can be recovered
    const canRecover = errors.length === 0 || this.canAttemptRecovery(errors);
    const recoveryStrategy = this.determineRecoveryStrategy(errors, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      canRecover,
      recoveryStrategy,
    };
  }

  /**
   * Check version compatibility
   */
  checkVersionCompatibility(version: string | StateVersion): {
    compatible: boolean;
    message: string;
  } {
    let stateVersion: StateVersion;

    if (typeof version === 'string') {
      const parts = version.split('.').map(Number);
      stateVersion = {
        major: parts[0] || 0,
        minor: parts[1] || 0,
        patch: parts[2] || 0,
      };
    } else {
      stateVersion = version;
    }

    // Major version mismatch is incompatible
    if (stateVersion.major !== CURRENT_VERSION.major) {
      return {
        compatible: false,
        message: `Incompatible major version: ${stateVersion.major} (current: ${CURRENT_VERSION.major})`,
      };
    }

    // Minor version mismatch is a warning
    if (stateVersion.minor !== CURRENT_VERSION.minor) {
      return {
        compatible: true,
        message: `Minor version mismatch: ${stateVersion.minor} (current: ${CURRENT_VERSION.minor})`,
      };
    }

    return {
      compatible: true,
      message: 'Version compatible',
    };
  }

  /**
   * Attempt to recover corrupted state
   */
  // Using 'unknown' for state parameter to attempt recovery of corrupted wizard state structures
  recoverState<T>(state: unknown): WizardAutoSaveState<T> | null {
    const validation = this.validateState(state);
    if (!validation.canRecover) {
      return null;
    }
    const s = state as Record<string, unknown>;
    const recovered: WizardAutoSaveState<T> = {
      wizardType: ((s.wizardType as string) || 'world') as WizardType,
      timestamp: (s.timestamp as string) || new Date().toISOString(),
      currentStep: typeof s.currentStep === 'number' ? s.currentStep : 0,
      formData: (s.formData as T) || ({} as T),
      expiresAt: (s.expiresAt as string) || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    // Validate recovered state
    const recoveredValidation = this.validateState(recovered);
    if (!recoveredValidation.isValid) {
      return null;
    }

    return recovered;
  }

  /**
   * Sanitize form data
   */
  // Using 'unknown' for formData parameter to sanitize arbitrary form data structures
  sanitizeFormData<T>(formData: unknown): Partial<T> {
    if (!formData || typeof formData !== 'object') {
      return {};
    }
    const sanitized: Record<string, unknown> = {};
    for (const key in (formData as Record<string, unknown>)) {
      const val = (formData as Record<string, unknown>)[key];
      if (val !== null && val !== undefined) {
        sanitized[key] = val;
      }
    }
    return sanitized as Partial<T>;
  }

  /**
   * Detect circular references
   */
  hasCircularReferences(obj: unknown): boolean {
    try {
      JSON.stringify(obj);
      return false;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('circular')) {
        return true;
      }
      return false;
    }
  }

  /**
   * Private: Check if recovery is possible
   */
  private canAttemptRecovery(errors: string[]): boolean {
    // Cannot recover if critical fields are missing
    const criticalErrors = [
      'State is null or undefined',
      'State is not an object',
      'Missing required field: wizardType',
      'Invalid wizardType',
    ];

    return !errors.some((error) => criticalErrors.includes(error));
  }

  /**
   * Private: Determine recovery strategy
   */
  private determineRecoveryStrategy(
    errors: string[],
    warnings: string[]
  ): 'reset' | 'partial' | 'migrate' | undefined {
    if (errors.length === 0 && warnings.length === 0) {
      return undefined;
    }

    // If there are critical errors, reset is required
    if (errors.length > 0) {
      return 'reset';
    }

    // If only warnings (like version mismatch), try migration
    if (warnings.some((w) => w.includes('version'))) {
      return 'migrate';
    }

    // Otherwise, partial recovery
    return 'partial';
  }
}

/**
 * Singleton instance
 */
let stateValidationServiceInstance: StateValidationService | null = null;

export function getStateValidationService(): StateValidationService {
  if (!stateValidationServiceInstance) {
    stateValidationServiceInstance = new StateValidationService();
  }
  return stateValidationServiceInstance;
}


