import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

// ============================================================================
// Wizard Context Types
// ============================================================================

export type WizardType = 
  | 'world' 
  | 'character'
  | 'dialogue-writer'
  | 'scene-generator'
  | 'storyboard-creator'
  | 'style-transfer'
  | 'sequence-plan'
  | 'shot';

export interface WizardContextState<T> {
  currentStep: number;
  totalSteps: number;
  formData: Partial<T>;
  validationErrors: Record<string, string[]>;
  isSubmitting: boolean;
  isDirty: boolean;
  isManualMode: boolean; // Manual entry mode (fallback from LLM)
  
  // Actions
  goToStep: (step: number) => void;
  nextStep: () => void;
  previousStep: () => void;
  updateFormData: (data: Partial<T>) => void;
  setValidationErrors: (errors: Record<string, string[]>) => void;
  validateStep: (step: number) => Promise<boolean>;
  submitWizard: () => Promise<void>;
  resetWizard: () => void;
  saveProgress: () => void;
  loadProgress: () => void;
  setManualMode: (enabled: boolean) => void;
}

interface WizardProviderProps<T> {
  children: ReactNode;
  wizardType: WizardType;
  totalSteps: number;
  initialData?: Partial<T>;
  onSubmit: (data: T) => Promise<void>;
  onComplete?: (data: T) => void;
  onValidateStep?: (step: number, data: Partial<T>) => Promise<Record<string, string[]>>;
  autoSave?: boolean;
  autoSaveDelay?: number; // milliseconds
}

// ============================================================================
// Context Creation
// ============================================================================

const WizardContext = createContext<WizardContextState<any> | null>(null);

// ============================================================================
// Wizard Provider Component
// ============================================================================

export function WizardProvider<T>({
  children,
  wizardType,
  totalSteps,
  initialData = {},
  onSubmit,
  onComplete,
  onValidateStep,
  autoSave = true,
  autoSaveDelay = 2000,
}: WizardProviderProps<T>) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Partial<T>>(initialData);
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isManualMode, setIsManualMode] = useState(false);
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  // ============================================================================
  // Auto-save to localStorage
  // ============================================================================

  const saveProgress = useCallback(() => {
    try {
      const state = {
        wizardType,
        timestamp: new Date().toISOString(),
        currentStep,
        formData,
        isManualMode,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      };
      
      localStorage.setItem(`wizard-${wizardType}`, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save wizard progress:', error);
    }
  }, [wizardType, currentStep, formData, isManualMode]);

  const loadProgress = useCallback(() => {
    try {
      const saved = localStorage.getItem(`wizard-${wizardType}`);
      if (!saved) return;

      const state = JSON.parse(saved);
      
      // Check if expired
      if (new Date(state.expiresAt) < new Date()) {
        localStorage.removeItem(`wizard-${wizardType}`);
        return;
      }

      setCurrentStep(state.currentStep);
      setFormData(state.formData);
      setIsManualMode(state.isManualMode || false);
      setIsDirty(true);
    } catch (error) {
      console.error('Failed to load wizard progress:', error);
      // Clear corrupted state
      localStorage.removeItem(`wizard-${wizardType}`);
    }
  }, [wizardType]);

  // Load progress on mount
  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  // Auto-save when form data changes
  useEffect(() => {
    if (!autoSave || !isDirty) return;

    // Clear existing timeout
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }

    // Set new timeout
    const timeout = setTimeout(() => {
      saveProgress();
    }, autoSaveDelay);

    setAutoSaveTimeout(timeout);

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [formData, autoSave, autoSaveDelay, isDirty, saveProgress]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
      }
    };
  }, [autoSaveTimeout]);

  // ============================================================================
  // Navigation Actions
  // ============================================================================

  const goToStep = useCallback((step: number) => {
    if (step < 1 || step > totalSteps) return;
    setCurrentStep(step);
  }, [totalSteps]);

  const nextStep = useCallback(() => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep, totalSteps]);

  const previousStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  // ============================================================================
  // Form Data Actions
  // ============================================================================

  const updateFormData = useCallback((data: Partial<T>) => {
    setFormData((prev) => ({ ...prev, ...data }));
    setIsDirty(true);
    
    // Clear validation errors for updated fields
    const updatedFields = Object.keys(data);
    setValidationErrors((prev) => {
      const newErrors = { ...prev };
      updatedFields.forEach((field) => {
        delete newErrors[field];
      });
      return newErrors;
    });
  }, []);

  // ============================================================================
  // Validation
  // ============================================================================

  const validateStep = useCallback(async (step: number): Promise<boolean> => {
    if (!onValidateStep) return true;

    try {
      const errors = await onValidateStep(step, formData);
      setValidationErrors(errors);
      return Object.keys(errors).length === 0;
    } catch (error) {
      console.error('Validation error:', error);
      return false;
    }
  }, [formData, onValidateStep]);

  // ============================================================================
  // Submission
  // ============================================================================

  const submitWizard = useCallback(async () => {
    setIsSubmitting(true);
    
    try {
      // Validate all steps
      let isValid = true;
      for (let step = 1; step <= totalSteps; step++) {
        const stepValid = await validateStep(step);
        if (!stepValid) {
          isValid = false;
          setCurrentStep(step); // Go to first invalid step
          break;
        }
      }

      if (!isValid) {
        setIsSubmitting(false);
        return;
      }

      // Submit the form
      await onSubmit(formData as T);
      
      // Call onComplete callback after successful submission
      if (onComplete) {
        onComplete(formData as T);
      }
      
      // Clear saved progress on successful submission
      localStorage.removeItem(`wizard-${wizardType}`);
      
      // Reset wizard state
      setFormData(initialData);
      setCurrentStep(1);
      setIsDirty(false);
      setValidationErrors({});
    } catch (error) {
      console.error('Wizard submission error:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, totalSteps, validateStep, onSubmit, onComplete, wizardType, initialData]);

  // ============================================================================
  // Reset
  // ============================================================================

  const resetWizard = useCallback(() => {
    setFormData(initialData);
    setCurrentStep(1);
    setValidationErrors({});
    setIsDirty(false);
    setIsManualMode(false);
    localStorage.removeItem(`wizard-${wizardType}`);
  }, [initialData, wizardType]);

  // ============================================================================
  // Manual Mode Toggle
  // ============================================================================

  const setManualMode = useCallback((enabled: boolean) => {
    setIsManualMode(enabled);
  }, []);

  // ============================================================================
  // Context Value
  // ============================================================================

  const value: WizardContextState<T> = {
    currentStep,
    totalSteps,
    formData,
    validationErrors,
    isSubmitting,
    isDirty,
    isManualMode,
    goToStep,
    nextStep,
    previousStep,
    updateFormData,
    setValidationErrors,
    validateStep,
    submitWizard,
    resetWizard,
    saveProgress,
    loadProgress,
    setManualMode,
  };

  return (
    <WizardContext.Provider value={value}>
      {children}
    </WizardContext.Provider>
  );
}

// ============================================================================
// Hook to use Wizard Context
// ============================================================================

export function useWizard<T>(): WizardContextState<T> {
  const context = useContext(WizardContext);
  
  if (!context) {
    throw new Error('useWizard must be used within a WizardProvider');
  }
  
  return context as WizardContextState<T>;
}
