/**
 * Wizard Completion Hook
 * 
 * Manages wizard completion flow, ensuring onComplete is called with final data.
 * Handles success/error states, cleanup, and callbacks.
 */

import { useState, useCallback, useRef } from 'react';

export interface WizardCompletionState<T> {
  isCompleting: boolean;
  isComplete: boolean;
  error: Error | null;
  completedData: T | null;
}

export interface WizardCompletionConfig<T> {
  onComplete: (data: T) => void | Promise<void>;
  onError?: (error: Error) => void;
  onCancel?: () => void;
  validateBeforeComplete?: (data: T) => Promise<{ valid: boolean; error?: string }>;
  cleanupOnComplete?: boolean;
  delayBeforeClose?: number;
}

export interface WizardCompletionResult<T> extends WizardCompletionState<T> {
  complete: (data: T) => Promise<void>;
  cancel: () => void;
  reset: () => void;
  updateData: (data: Partial<T>) => void;
  getData: () => T | null;
}

export function useWizardCompletion<T>(
  config: WizardCompletionConfig<T>
): WizardCompletionResult<T> {
  const [state, setState] = useState<WizardCompletionState<T>>({
    isCompleting: false,
    isComplete: false,
    error: null,
    completedData: null,
  });

  const configRef = useRef(config);
  const currentDataRef = useRef<T | null>(null);
  
  configRef.current = config;

  const complete = useCallback(async (data: T) => {
    if (state.isCompleting || state.isComplete) {
      console.warn('[useWizardCompletion] Completion already in progress or complete');
      return;
    }

    currentDataRef.current = data;
    setState(prev => ({ ...prev, isCompleting: true, error: null }));

    try {
      // Validate before completion if validator provided
      if (configRef.current.validateBeforeComplete) {
        const validation = await configRef.current.validateBeforeComplete(data);
        if (!validation.valid) {
          throw new Error(validation.error || 'Validation failed');
        }
      }

      // Call onComplete callback
      const onComplete = configRef.current.onComplete;
      if (onComplete) {
        const result = onComplete(data);
        if (result instanceof Promise) {
          await result;
        }
      }

      // Mark as complete
      setState({
        isCompleting: false,
        isComplete: true,
        error: null,
        completedData: data,
      });

      // Cleanup if configured
      if (configRef.current.cleanupOnComplete) {
        const delay = configRef.current.delayBeforeClose || 2000;
        setTimeout(() => {
          setState({
            isCompleting: false,
            isComplete: false,
            error: null,
            completedData: null,
          });
        }, delay);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      
      setState(prev => ({
        ...prev,
        isCompleting: false,
        error: err,
      }));

      if (configRef.current.onError) {
        configRef.current.onError(err);
      }
    }
  }, [state.isCompleting, state.isComplete]);

  const cancel = useCallback(() => {
    setState({
      isCompleting: false,
      isComplete: false,
      error: null,
      completedData: null,
    });
    currentDataRef.current = null;

    if (configRef.current.onCancel) {
      configRef.current.onCancel();
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      isCompleting: false,
      isComplete: false,
      error: null,
      completedData: null,
    });
    currentDataRef.current = null;
  }, []);

  const updateData = useCallback((data: Partial<T>) => {
    if (currentDataRef.current) {
      currentDataRef.current = { ...currentDataRef.current, ...data };
    }
  }, []);

  const getData = useCallback(() => {
    return currentDataRef.current;
  }, []);

  return {
    ...state,
    complete,
    cancel,
    reset,
    updateData,
    getData,
  };
}

/**
 * Hook to manage wizard completion with step-by-step data
 */
export function useWizardStepCompletion<T>(
  steps: number[],
  config: WizardCompletionConfig<T>
) {
  const [currentStep, setCurrentStep] = useState(1);
  const [stepData, setStepData] = useState<Record<number, Partial<T>>>({});
  
  const completion = useWizardCompletion<T>(config);

  const updateStepData = useCallback((step: number, data: Partial<T>) => {
    setStepData(prev => ({
      ...prev,
      [step]: { ...prev[step], ...data },
    }));
  }, []);

  const getAllData = useCallback(() => {
    let merged: Partial<T> = {};
    Object.values(stepData).forEach(data => {
      merged = { ...merged, ...data };
    });
    return merged as T;
  }, [stepData]);

  const goToStep = useCallback((step: number) => {
    if (steps.includes(step)) {
      setCurrentStep(step);
    }
  }, [steps]);

  const nextStep = useCallback(() => {
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  }, [currentStep, steps]);

  const previousStep = useCallback(() => {
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  }, [currentStep, steps]);

  const completeWizard = useCallback(async () => {
    const allData = getAllData();
    await completion.complete(allData);
  }, [completion.complete, getAllData]);

  return {
    currentStep,
    stepData,
    updateStepData,
    goToStep,
    nextStep,
    previousStep,
    completeWizard,
    completion,
    getAllData,
    isFirstStep: currentStep === steps[0],
    isLastStep: currentStep === steps[steps.length - 1],
    totalSteps: steps.length,
  };
}

/**
 * Helper function to create completion callback for wizards
 */
export function createWizardCompleteHandler<T>(
  onComplete: (data: T) => void | Promise<void>,
  onSuccess?: () => void,
  onError?: (error: Error) => void
) {
  return async (data: T) => {
    try {
      const result = onComplete(data);
      if (result instanceof Promise) {
        await result;
      }
      onSuccess?.();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
      throw err;
    }
  };
}

/**
 * Validate wizard data before completion
 */
export async function validateWizardData<T>(
  data: T,
  requiredFields: (keyof T)[],
  customValidators?: Array<{
    field: keyof T;
    validate: (value: unknown) => Promise<boolean>;
    message: string;
  }>
): Promise<{ valid: boolean; error?: string }> {
  // Check required fields
  for (const field of requiredFields) {
    const value = data[field];
    if (value === null || value === undefined || value === '') {
      return { valid: false, error: `${String(field)} is required` };
    }
    if (typeof value === 'string' && value.trim() === '') {
      return { valid: false, error: `${String(field)} cannot be empty` };
    }
    if (Array.isArray(value) && value.length === 0) {
      return { valid: false, error: `${String(field)} must have at least one item` };
    }
  }

  // Custom validators
  if (customValidators) {
    for (const validator of customValidators) {
      const value = data[validator.field];
      const isValid = await validator.validate(value);
      if (!isValid) {
        return { valid: false, error: validator.message };
      }
    }
  }

  return { valid: true };
}

/**
 * Format completion result for display
 */
export interface CompletionResultDisplay {
  success: boolean;
  message: string;
  details?: string;
}

export function formatCompletionResult(
  isComplete: boolean,
  error: Error | null,
  data?: unknown
): CompletionResultDisplay {
  if (isComplete && !error) {
    return {
      success: true,
      message: 'Content generated successfully!',
      details: data ? `Data: ${JSON.stringify(data).substring(0, 100)}...` : undefined,
    };
  }

  if (error) {
    return {
      success: false,
      message: 'Generation failed',
      details: error.message,
    };
  }

  return {
    success: false,
    message: 'Unknown state',
  };
}



