/**
 * BaseWizard Component
 * 
 * A standardized wizard component that provides common functionality
 * for all wizard types. Use this as the base for new wizards.
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { WizardStepIndicator, StepState, WizardStep } from './WizardStepIndicator';
import { WizardNavigation } from './WizardNavigation';
import { WizardErrorBoundary } from './WizardErrorBoundary';
import { useWizardAutoSave, WizardAutoSaveState } from '@/hooks/useWizardAutoSave';
import { useWizardCompletion } from '@/hooks/useWizardCompletion';
import { useWizardErrorHandler } from '@/hooks/useWizardErrorHandler';
import type { WizardType } from '@/utils/wizardStorage';

// ============================================================================
// Types
// ============================================================================

export interface WizardStepComponentProps<T> {
  data: Partial<T>;
  onUpdate: (data: Partial<T>) => void;
  errors?: Record<string, string[]>;
  isValid?: boolean;
}

export interface BaseWizardConfig<T> {
  wizardType: WizardType;
  steps: WizardStep[];
  initialData?: Partial<T>;
  validateStep?: (step: number, data: Partial<T>) => Promise<{ valid: boolean; errors?: Record<string, string[]> }>;
  onComplete?: (data: T) => void | Promise<void>;
  onCancel?: () => void;
  autoSave?: boolean;
  autoSaveInterval?: number;
}

export interface BaseWizardProps<T> {
  config: BaseWizardConfig<T>;
  renderStep: (step: number, data: Partial<T>, onUpdate: (data: Partial<T>) => void) => React.ReactNode;
  className?: string;
}

// ============================================================================
// BaseWizard Component
// ============================================================================

export function BaseWizard<T>({
  config,
  renderStep,
  className,
}: BaseWizardProps<T>) {
  const {
    wizardType,
    steps,
    initialData,
    validateStep,
    onComplete,
    onCancel,
    autoSave = true,
    autoSaveInterval = 30000,
  } = config;

  // State
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [stepData, setStepData] = useState<Record<number, Partial<T>>>({
    ...steps.reduce((acc, step) => ({ ...acc, [step.number]: {} }), {}),
    ...initialData,
  });
  const [stepErrors, setStepErrors] = useState<Record<number, Record<string, string[]>>>({});
  const [stepStates, setStepStates] = useState<Record<number, StepState>>({});
  const [isReviewMode, setIsReviewMode] = useState(false);

  // Hooks
  const getWizardState = useCallback((): WizardAutoSaveState => ({
    currentStep,
    completedSteps,
    isReviewMode,
    stepData,
  }), [currentStep, completedSteps, isReviewMode, stepData]);

  const autoSaveResult = useWizardAutoSave(getWizardState, {
    wizardType,
    intervalMs: autoSaveInterval,
    enabled: autoSave,
  });

  const completion = useWizardCompletion<T>({
    onComplete: async (data) => {
      await onComplete?.(data);
    },
    onError: (error) => {
      console.error('Wizard completion error:', error);
    },
    onCancel: () => {
      onCancel?.();
    },
  });

  const errorHandler = useWizardErrorHandler(wizardType);

  // =========================================================================
  // Data Management
  // =========================================================================

  const updateStepData = useCallback((step: number, data: Partial<T>) => {
    setStepData(prev => ({
      ...prev,
      [step]: { ...prev[step], ...data },
    }));
    
    // Clear errors when data changes
    setStepErrors(prev => ({
      ...prev,
      [step]: {},
    }));

    // Update step state
    setStepStates(prev => ({
      ...prev,
      [step]: { status: 'pending' },
    }));
  }, []);

  const getAllData = useCallback(() => {
    let merged: Partial<T> = {};
    Object.values(stepData).forEach(data => {
      merged = { ...merged, ...data };
    });
    return merged as T;
  }, [stepData]);

  // =========================================================================
  // Navigation
  // =========================================================================

  const canGoNext = useMemo(() => {
    const errors = stepErrors[currentStep] || {};
    return Object.keys(errors).length === 0;
  }, [stepErrors, currentStep]);

  const canGoPrevious = currentStep > 1;

  const handleNext = useCallback(async () => {
    // Validate current step
    if (validateStep) {
      const result = await validateStep(currentStep, stepData[currentStep]);
      setStepErrors(prev => ({
        ...prev,
        [currentStep]: result.errors || {},
      }));
      
      setStepStates(prev => ({
        ...prev,
        [currentStep]: {
          status: result.valid ? 'valid' : 'invalid',
          errorCount: Object.keys(result.errors || {}).length,
        },
      }));

      if (!result.valid) {
        return;
      }
    } else {
      setStepStates(prev => ({
        ...prev,
        [currentStep]: { status: 'valid' },
      }));
    }

    // Mark step as completed
    if (!completedSteps.includes(currentStep)) {
      setCompletedSteps(prev => [...prev, currentStep]);
    }

    // Go to next step
    const currentIndex = steps.findIndex(s => s.number === currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1].number);
    } else {
      setIsReviewMode(true);
    }
  }, [currentStep, stepData, validateStep, steps, completedSteps]);

  const handlePrevious = useCallback(() => {
    const currentIndex = steps.findIndex(s => s.number === currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].number);
    }
  }, [currentStep, steps]);

  const handleGoToStep = useCallback((step: number) => {
    // Only allow going to completed steps or the next step
    if (step < currentStep || step === currentStep + 1) {
      setCurrentStep(step);
    }
  }, [currentStep]);

  const handleComplete = useCallback(async () => {
    await completion.complete(getAllData());
  }, [completion, getAllData]);

  const handleCancel = useCallback(() => {
    completion.cancel();
    onCancel?.();
  }, [completion, onCancel]);

  // =========================================================================
  // Effects
  // =========================================================================

  // Update current step state when entering
  useEffect(() => {
    if (!isReviewMode) {
      setStepStates(prev => ({
        ...prev,
        [currentStep]: { status: 'pending' },
      }));
    }
  }, [currentStep, isReviewMode]);

  // =========================================================================
  // Render
  // =========================================================================

  const currentStepData = stepData[currentStep] || {};
  const currentErrors = stepErrors[currentStep] || {};

  return (
    <WizardErrorBoundary
      wizardType={wizardType}
      onReset={() => {
        setCurrentStep(1);
        setCompletedSteps([]);
        setStepData({});
        setStepErrors({});
        setStepStates({});
        setIsReviewMode(false);
        completion.reset();
        errorHandler.clearError();
      }}
    >
      <div className={`base-wizard ${className || ''}`}>
        {/* Header with step indicator */}
        <div className="base-wizard__header">
          <WizardStepIndicator
            steps={steps}
            currentStep={isReviewMode ? steps.length : currentStep}
            stepStates={stepStates}
            onStepClick={handleGoToStep}
            allowJumpToStep={false}
          />
        </div>

        {/* Auto-save indicator */}
        {autoSave && (
          <div className="base-wizard__autosave">
            {autoSaveResult.isSaving && (
              <span className="text-amber-500">Saving...</span>
            )}
            {autoSaveResult.isDirty && !autoSaveResult.isSaving && (
              <span className="text-orange-500">Unsaved changes</span>
            )}
            {!autoSaveResult.isDirty && autoSaveResult.lastSaved && (
              <span className="text-green-500">
                Saved at {autoSaveResult.lastSaved.toLocaleTimeString()}
              </span>
            )}
          </div>
        )}

        {/* Error display */}
        {errorHandler.hasError && (
          <div className="base-wizard__error">
            <p className="text-red-500">{errorHandler.getErrorMessage()}</p>
            <button
              onClick={errorHandler.clearError}
              className="text-sm text-gray-500 underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Content */}
        <div className="base-wizard__content">
          {isReviewMode ? (
            <div className="base-wizard__review">
              <h2 className="text-xl font-bold mb-4">Review</h2>
              <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
                {JSON.stringify(getAllData(), null, 2)}
              </pre>
            </div>
          ) : (
            renderStep(currentStep, currentStepData, (data) => updateStepData(currentStep, data))
          )}
        </div>

        {/* Navigation */}
        <div className="base-wizard__footer">
          <WizardNavigation
            currentStep={isReviewMode ? steps.length : currentStep}
            totalSteps={steps.length}
            canGoNext={canGoNext && !completion.isCompleting}
            canGoBack={canGoPrevious && !isReviewMode && !completion.isCompleting}
            isSubmitting={completion.isCompleting}
            onNext={isReviewMode ? undefined : handleNext}
            onBack={isReviewMode ? undefined : handlePrevious}
            onSubmit={isReviewMode ? handleComplete : undefined}
            onCancel={handleCancel}
          />
        </div>
      </div>
    </WizardErrorBoundary>
  );
}

// ============================================================================
// Factory function for creating wizards
// ============================================================================

export function createWizard<T>(
  config: Omit<BaseWizardConfig<T>, 'wizardType'> & { wizardType: WizardType }
) {
  return function WizardComponent({
    renderStep,
    className,
  }: Omit<BaseWizardProps<T>, 'config'>) {
    return (
      <BaseWizard<T>
        config={config}
        renderStep={renderStep}
        className={className}
      />
    );
  };
}

// ============================================================================
// Example usage
// ============================================================================

/*
// Character Wizard using BaseWizard
const CharacterWizard = createWizard<Character>({
  wizardType: 'character',
  steps: [
    { number: 1, title: 'Basic Identity', description: 'Name and role' },
    { number: 2, title: 'Appearance', description: 'Physical traits' },
    { number: 3, title: 'Personality', description: 'Traits and values' },
    { number: 4, title: 'Background', description: 'History and origin' },
    { number: 5, title: 'Relationships', description: 'Character connections' },
    { number: 6, title: 'Review', description: 'Finalize character' },
  ],
  validateStep: async (step, data) => {
    const result = await validationEngine.validateStep('character', step, data);
    return {
      valid: result.isValid,
      errors: formatValidationErrors(result),
    };
  },
  onComplete: (character) => {
    console.log('Character created:', character);
  },
  autoSave: true,
});

// Usage
<CharacterWizard
  renderStep={(step, data, onUpdate) => {
    switch (step) {
      case 1:
        return <Step1BasicIdentity data={data} onUpdate={onUpdate} />;
      case 2:
        return <Step2PhysicalAppearance data={data} onUpdate={onUpdate} />;
      // ...
    }
  }}
/>
*/

export default BaseWizard;
