/**
 * useStateRecovery Hook
 * 
 * React hook for managing wizard state recovery.
 * 
 * Requirements: 5.6
 */

import { useState, useEffect, useCallback } from 'react';
import {
  loadWizardStateWithValidation,
  clearWizardState,
  type LoadStateResult,
} from '../utils/wizardStorage';
import {
  getStateValidationService,
  type ValidationResult,
} from '../services/wizard/stateValidationService';

export interface UseStateRecoveryOptions {
  /**
   * Wizard type
   */
  wizardType: 'world' | 'character' | 'sequence-plan';

  /**
   * Auto-check on mount
   */
  autoCheck?: boolean;

  /**
   * Callback when corruption is detected
   */
  onCorruptionDetected?: (result: LoadStateResult<any>) => void;

  /**
   * Callback when recovery is successful
   */
  onRecoverySuccess?: () => void;

  /**
   * Callback when recovery fails
   */
  onRecoveryFailed?: (error: Error) => void;
}

export interface UseStateRecoveryReturn {
  /**
   * Whether state is corrupted
   */
  isCorrupted: boolean;

  /**
   * Validation result
   */
  validationResult: ValidationResult | null;

  /**
   * Load state result
   */
  loadResult: LoadStateResult<any> | null;

  /**
   * Check for corruption
   */
  checkForCorruption: () => Promise<void>;

  /**
   * Attempt to recover state
   */
  attemptRecovery: () => Promise<boolean>;

  /**
   * Reset to clean state
   */
  resetState: () => void;

  /**
   * Dismiss corruption warning
   */
  dismissWarning: () => void;

  /**
   * Show recovery dialog
   */
  showRecoveryDialog: boolean;

  /**
   * Set show recovery dialog
   */
  setShowRecoveryDialog: (show: boolean) => void;
}

export function useStateRecovery(
  options: UseStateRecoveryOptions
): UseStateRecoveryReturn {
  const {
    wizardType,
    autoCheck = true,
    onCorruptionDetected,
    onRecoverySuccess,
    onRecoveryFailed,
  } = options;

  const [isCorrupted, setIsCorrupted] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [loadResult, setLoadResult] = useState<LoadStateResult<any> | null>(null);
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);

  const validationService = getStateValidationService();

  /**
   * Check for corruption
   */
  const checkForCorruption = useCallback(async () => {
    const result = loadWizardStateWithValidation(wizardType);
    setLoadResult(result);

    if (result.isCorrupted) {
      setIsCorrupted(true);

      // Perform detailed validation if state exists
      if (result.state) {
        const validation = validationService.validateState(result.state);
        setValidationResult(validation);
      } else {
        // Create validation result from load result
        setValidationResult({
          isValid: false,
          errors: result.errors,
          warnings: result.warnings,
          canRecover: result.canRecover,
          recoveryStrategy: result.canRecover ? 'partial' : 'reset',
        });
      }

      setShowRecoveryDialog(true);

      if (onCorruptionDetected) {
        onCorruptionDetected(result);
      }
    } else {
      setIsCorrupted(false);
      setValidationResult(null);
    }
  }, [wizardType, validationService, onCorruptionDetected]);

  /**
   * Attempt to recover state
   */
  const attemptRecovery = useCallback(async (): Promise<boolean> => {
    if (!loadResult?.state) {
      return false;
    }

    try {
      const recovered = validationService.recoverState(loadResult.state);

      if (!recovered) {
        throw new Error('Recovery failed: unable to recover state');
      }

      // State was recovered successfully
      setIsCorrupted(false);
      setValidationResult(null);
      setShowRecoveryDialog(false);

      if (onRecoverySuccess) {
        onRecoverySuccess();
      }

      return true;
    } catch (error) {
      console.error('State recovery failed:', error);

      if (onRecoveryFailed && error instanceof Error) {
        onRecoveryFailed(error);
      }

      return false;
    }
  }, [loadResult, validationService, onRecoverySuccess, onRecoveryFailed]);

  /**
   * Reset to clean state
   */
  const resetState = useCallback(() => {
    clearWizardState(wizardType);
    setIsCorrupted(false);
    setValidationResult(null);
    setLoadResult(null);
    setShowRecoveryDialog(false);
  }, [wizardType]);

  /**
   * Dismiss warning
   */
  const dismissWarning = useCallback(() => {
    setShowRecoveryDialog(false);
  }, []);

  // Auto-check on mount
  useEffect(() => {
    if (autoCheck) {
      checkForCorruption();
    }
  }, [autoCheck, checkForCorruption]);

  return {
    isCorrupted,
    validationResult,
    loadResult,
    checkForCorruption,
    attemptRecovery,
    resetState,
    dismissWarning,
    showRecoveryDialog,
    setShowRecoveryDialog,
  };
}
