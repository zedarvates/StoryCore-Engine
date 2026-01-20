import { useCallback, useState } from 'react';
import { useWizard } from '@/contexts/WizardContext';
import { useToast } from '@/hooks/use-toast';

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

  const { toast } = useToast();
  const { validateBeforeNext = true, onStepChange } = options;
  const [isNavigating, setIsNavigating] = useState(false);

  // ============================================================================
  // Enhanced Next Step with Validation and Race Condition Prevention
  // ============================================================================

  const nextStep = useCallback(async () => {
    // Prevent concurrent navigation
    if (isNavigating) {
      return false;
    }

    setIsNavigating(true);
    
    try {
      if (validateBeforeNext) {
        const isValid = await validateStep(currentStep);
        if (!isValid) {
          // Show toast notification for validation failure
          toast({
            title: "Validation Error",
            description: "Please fill in all required fields before continuing.",
            variant: "destructive",
          });
          return false;
        }
      }

      contextNextStep();
      
      if (onStepChange) {
        onStepChange(currentStep + 1);
      }

      return true;
    } finally {
      setIsNavigating(false);
    }
  }, [currentStep, validateBeforeNext, validateStep, contextNextStep, onStepChange, isNavigating, toast]);

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
  // Jump to Specific Step with Race Condition Prevention
  // ============================================================================

  const jumpToStep = useCallback(async (step: number) => {
    if (step < 1 || step > totalSteps || isNavigating) {
      return false;
    }

    setIsNavigating(true);

    try {
      // If jumping forward, validate all steps in between
      if (step > currentStep && validateBeforeNext) {
        for (let i = currentStep; i < step; i++) {
          const isValid = await validateStep(i);
          if (!isValid) {
            goToStep(i);
            // Show toast notification for validation failure
            toast({
              title: "Validation Error",
              description: `Please complete step ${i} before proceeding.`,
              variant: "destructive",
            });
            return false;
          }
        }
      }

      goToStep(step);
      
      if (onStepChange) {
        onStepChange(step);
      }

      return true;
    } finally {
      setIsNavigating(false);
    }
  }, [currentStep, totalSteps, validateBeforeNext, validateStep, goToStep, onStepChange, isNavigating, toast]);

  // ============================================================================
  // Navigation State
  // ============================================================================

  const canGoNext = currentStep < totalSteps && !isNavigating;
  const canGoPrevious = currentStep > 1 && !isNavigating;
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
    isNavigating,
  };
}
