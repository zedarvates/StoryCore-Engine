import { useCallback } from 'react';
import { useWizard } from '@/contexts/WizardContext';

// ============================================================================
// Wizard Navigation Hook
// ============================================================================

export interface WizardNavigationOptions {
  validateBeforeNext?: boolean;
  onStepChange?: (step: number) => void;
}

export function useWizardNavigation(options: WizardNavigationOptions = {}) {
  const {
    currentStep,
    totalSteps,
    goToStep,
    nextStep: contextNextStep,
    previousStep: contextPreviousStep,
    validateStep,
  } = useWizard();

  const { validateBeforeNext = true, onStepChange } = options;

  // ============================================================================
  // Enhanced Next Step with Validation
  // ============================================================================

  const nextStep = useCallback(async () => {
    if (validateBeforeNext) {
      const isValid = await validateStep(currentStep);
      if (!isValid) {
        return false;
      }
    }

    contextNextStep();
    
    if (onStepChange) {
      onStepChange(currentStep + 1);
    }

    return true;
  }, [currentStep, validateBeforeNext, validateStep, contextNextStep, onStepChange]);

  // ============================================================================
  // Enhanced Previous Step
  // ============================================================================

  const previousStep = useCallback(() => {
    contextPreviousStep();
    
    if (onStepChange) {
      onStepChange(currentStep - 1);
    }
  }, [currentStep, contextPreviousStep, onStepChange]);

  // ============================================================================
  // Jump to Specific Step
  // ============================================================================

  const jumpToStep = useCallback(async (step: number) => {
    if (step < 1 || step > totalSteps) {
      return false;
    }

    // If jumping forward, validate all steps in between
    if (step > currentStep && validateBeforeNext) {
      for (let i = currentStep; i < step; i++) {
        const isValid = await validateStep(i);
        if (!isValid) {
          goToStep(i);
          return false;
        }
      }
    }

    goToStep(step);
    
    if (onStepChange) {
      onStepChange(step);
    }

    return true;
  }, [currentStep, totalSteps, validateBeforeNext, validateStep, goToStep, onStepChange]);

  // ============================================================================
  // Navigation State
  // ============================================================================

  const canGoNext = currentStep < totalSteps;
  const canGoPrevious = currentStep > 1;
  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === totalSteps;
  const progress = (currentStep / totalSteps) * 100;

  return {
    currentStep,
    totalSteps,
    nextStep,
    previousStep,
    jumpToStep,
    canGoNext,
    canGoPrevious,
    isFirstStep,
    isLastStep,
    progress,
  };
}
