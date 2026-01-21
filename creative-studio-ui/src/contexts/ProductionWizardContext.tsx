import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { z } from 'zod';

// ============================================================================
// Production Wizard Context Types
// ============================================================================

export interface ProductionWizardContextValue<T> {
  // State
  currentStep: number;
  totalSteps: number;
  formData: Partial<T>;
  validationErrors: Record<string, string>;
  isDirty: boolean;
  lastSaved: number;

  // Navigation
  goToStep: (step: number) => void;
  nextStep: () => void;
  previousStep: () => void;
  canProceed: boolean;

  // Data management
  updateFormData: (data: Partial<T>) => void;
  resetFormData: () => void;

  // Validation
  validateStep: (step: number) => Promise<boolean>;
  validateAll: () => Promise<boolean>;

  // Persistence
  saveDraft: () => Promise<void>;
  loadDraft: () => Promise<void>;
  clearDraft: () => Promise<void>;

  // Submission
  submit: () => Promise<void>;
}

interface ProductionWizardProviderProps<T> {
  children: ReactNode;
  wizardType: string; // 'sequence-plan' | 'shot'
  totalSteps: number;
  initialData?: Partial<T>;
  onSubmit: (data: T) => Promise<void>;
  onValidateStep?: (step: number, data: Partial<T>) => Promise<Record<string, string>>;
  schema?: z.ZodSchema<T>; // Zod schema for validation
  autoSaveInterval?: number; // milliseconds
}

// ============================================================================
// Context Creation
// ============================================================================

const ProductionWizardContext = createContext<ProductionWizardContextValue<any> | null>(null);

// ============================================================================
// Production Wizard Provider Component
// ============================================================================

export function ProductionWizardProvider<T>({
  children,
  wizardType,
  totalSteps,
  initialData = {},
  onSubmit,
  onValidateStep,
  schema,
  autoSaveInterval = 30000, // 30 seconds
}: ProductionWizardProviderProps<T>) {
  const [currentStep, setCurrentStep] = useState(0); // 0-based indexing
  const [formData, setFormData] = useState<Partial<T>>(initialData);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState(0);
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  // ============================================================================
  // Navigation Methods
  // ============================================================================

  const goToStep = useCallback((step: number) => {
    if (step >= 0 && step < totalSteps) {
      setCurrentStep(step);
    }
  }, [totalSteps]);

  const nextStep = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep, totalSteps]);

  const previousStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const canProceed = currentStep < totalSteps - 1 && Object.keys(validationErrors).length === 0;

  // ============================================================================
  // Form Data Management
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

  const resetFormData = useCallback(() => {
    setFormData(initialData);
    setCurrentStep(0);
    setValidationErrors({});
    setIsDirty(false);
    setLastSaved(0);
  }, [initialData]);

  // ============================================================================
  // Validation System
  // ============================================================================

  const validateStep = useCallback(async (step: number): Promise<boolean> => {
    let errors: Record<string, string> = {};

    // Custom validation
    if (onValidateStep) {
      try {
        errors = await onValidateStep(step, formData);
      } catch (error) {
        console.error('Custom validation error:', error);
        errors = { general: 'Validation failed' };
      }
    }

    // Schema validation
    if (schema) {
      try {
        schema.parse(formData);
      } catch (error) {
        if (error instanceof z.ZodError) {
          error.issues.forEach((issue) => {
            const field = issue.path.join('.');
            errors[field] = issue.message;
          });
        }
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData, onValidateStep, schema]);

  const validateAll = useCallback(async (): Promise<boolean> => {
    let allValid = true;
    for (let step = 0; step < totalSteps; step++) {
      const stepValid = await validateStep(step);
      if (!stepValid) {
        allValid = false;
        setCurrentStep(step); // Go to first invalid step
        break;
      }
    }
    return allValid;
  }, [totalSteps, validateStep]);

  // ============================================================================
  // Persistence (Draft Storage)
  // ============================================================================

  const saveDraft = useCallback(async (): Promise<void> => {
    try {
      const draftData = {
        wizardType,
        timestamp: Date.now(),
        currentStep,
        formData,
        validationErrors,
      };

      // This would integrate with the draft storage service
      // For now, using localStorage as placeholder
      localStorage.setItem(`production-wizard-${wizardType}-draft`, JSON.stringify(draftData));

      setLastSaved(Date.now());
      setIsDirty(false);
    } catch (error) {
      console.error('Failed to save draft:', error);
      throw error;
    }
  }, [wizardType, currentStep, formData, validationErrors]);

  const loadDraft = useCallback(async (): Promise<void> => {
    try {
      const saved = localStorage.getItem(`production-wizard-${wizardType}-draft`);
      if (!saved) return;

      const draftData = JSON.parse(saved);

      // Check if draft is recent (within 24 hours)
      const isRecent = Date.now() - draftData.timestamp < 24 * 60 * 60 * 1000;
      if (!isRecent) {
        localStorage.removeItem(`production-wizard-${wizardType}-draft`);
        return;
      }

      setCurrentStep(draftData.currentStep);
      setFormData(draftData.formData);
      setValidationErrors(draftData.validationErrors || {});
      setLastSaved(draftData.timestamp);
      setIsDirty(true);
    } catch (error) {
      console.error('Failed to load draft:', error);
      // Clear corrupted draft
      localStorage.removeItem(`production-wizard-${wizardType}-draft`);
    }
  }, [wizardType]);

  const clearDraft = useCallback(async (): Promise<void> => {
    localStorage.removeItem(`production-wizard-${wizardType}-draft`);
    setLastSaved(0);
  }, [wizardType]);

  // ============================================================================
  // Auto-save Functionality
  // ============================================================================

  useEffect(() => {
    if (!isDirty) return;

    // Clear existing timeout
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }

    // Set new timeout
    const timeout = setTimeout(() => {
      saveDraft().catch(console.error);
    }, autoSaveInterval);

    setAutoSaveTimeout(timeout);

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [formData, isDirty, saveDraft, autoSaveInterval]);

  // Load draft on mount
  useEffect(() => {
    loadDraft().catch(console.error);
  }, [loadDraft]);

  // ============================================================================
  // Submission
  // ============================================================================

  const submit = useCallback(async (): Promise<void> => {
    // Validate all steps before submission
    const isValid = await validateAll();
    if (!isValid) {
      throw new Error('Validation failed');
    }

    try {
      await onSubmit(formData as T);

      // Clear draft on successful submission
      await clearDraft();

      // Reset form
      resetFormData();
    } catch (error) {
      console.error('Submission error:', error);
      throw error;
    }
  }, [formData, validateAll, onSubmit, clearDraft, resetFormData]);

  // ============================================================================
  // Context Value
  // ============================================================================

  const value: ProductionWizardContextValue<T> = {
    currentStep,
    totalSteps,
    formData,
    validationErrors,
    isDirty,
    lastSaved,
    goToStep,
    nextStep,
    previousStep,
    canProceed,
    updateFormData,
    resetFormData,
    validateStep,
    validateAll,
    saveDraft,
    loadDraft,
    clearDraft,
    submit,
  };

  return (
    <ProductionWizardContext.Provider value={value}>
      {children}
    </ProductionWizardContext.Provider>
  );
}

// ============================================================================
// Hook to use Production Wizard Context
// ============================================================================

export function useProductionWizard<T>(): ProductionWizardContextValue<T> {
  const context = useContext(ProductionWizardContext);

  if (!context) {
    throw new Error('useProductionWizard must be used within a ProductionWizardProvider');
  }

  return context as ProductionWizardContextValue<T>;
}
