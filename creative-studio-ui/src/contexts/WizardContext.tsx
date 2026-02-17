import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

// ============================================================================
// Wizard Context Types
// ============================================================================

export type WizardType =
  | 'world'
  | 'character'
  | 'storyteller'
  | 'dialogue-writer'
  | 'scene-generator'
  | 'storyboard-creator'
  | 'style-transfer'
  | 'sequence-plan'
  | 'shot'
  | 'project-setup'
  | 'object';

/**
 * Wizard chain configuration for triggering subsequent wizards
 */
export interface WizardChainConfig {
  /** The wizard type to trigger next */
  wizardType: WizardType;
  /** Whether this chain is auto-triggered or manual */
  autoTrigger: boolean;
  /** Initial data to pass to the next wizard */
  initialData?: Record<string, unknown>;
  /** Label for the chain button */
  label?: string;
  /** Description of what the next wizard will do */
  description?: string;
}

/**
 * Wizard chain state
 */
export interface WizardChainState {
  /** Whether wizard chaining is enabled */
  isChained: boolean;
  /** Array of wizard chains to trigger after completion */
  triggeredWizards: WizardChainConfig[];
  /** Current chain index */
  currentChainIndex: number;
  /** Data accumulated from previous wizards in the chain */
  chainData: Record<string, unknown>;
}

export interface WizardContextState<T> {
  currentStep: number;
  totalSteps: number;
  formData: Partial<T>;
  validationErrors: Record<string, string[]>;
  isSubmitting: boolean;
  isDirty: boolean;
  isManualMode: boolean; // Manual entry mode (fallback from LLM)
  
  // Wizard Chain State
  chainState: WizardChainState;
  
  // Actions
  goToStep: (step: number) => void;
  nextStep: () => Promise<void>;
  previousStep: () => void;
  updateFormData: (data: Partial<T>) => void;
  setValidationErrors: (errors: Record<string, string[]>) => void;
  validateStep: (step: number) => Promise<boolean>;
  submitWizard: () => Promise<void>;
  resetWizard: () => void;
  saveProgress: () => void;
  loadProgress: () => void;
  setManualMode: (enabled: boolean) => void;
  clearSavedProgress: () => void;
  hasSavedProgress: () => boolean;
  
  // Wizard Chain Actions
  setChainEnabled: (enabled: boolean) => void;
  addTriggeredWizard: (config: WizardChainConfig) => void;
  removeTriggeredWizard: (index: number) => void;
  clearTriggeredWizards: () => void;
  triggerNextWizard: () => WizardChainConfig | null;
  addToChainData: (key: string, value: unknown) => void;
  getChainData: () => Record<string, unknown>;
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
  autoLoad?: boolean; // NEW: defaults to false
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
  autoLoad = false,
}: WizardProviderProps<T>) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Partial<T>>(initialData);
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isManualMode, setIsManualMode] = useState(false);
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  // ============================================================================
  // Wizard Chain State
  // ============================================================================
  const [chainState, setChainState] = useState<WizardChainState>({
    isChained: false,
    triggeredWizards: [],
    currentChainIndex: 0,
    chainData: {},
  });

  // ============================================================================
  // Wizard Chain Functions
  // ============================================================================
  
  const setChainEnabled = useCallback((enabled: boolean) => {
    setChainState(prev => ({ ...prev, isChained: enabled }));
  }, []);

  const addTriggeredWizard = useCallback((config: WizardChainConfig) => {
    setChainState(prev => ({
      ...prev,
      triggeredWizards: [...prev.triggeredWizards, config],
    }));
  }, []);

  const removeTriggeredWizard = useCallback((index: number) => {
    setChainState(prev => ({
      ...prev,
      triggeredWizards: prev.triggeredWizards.filter((_, i) => i !== index),
    }));
  }, []);

  const clearTriggeredWizards = useCallback(() => {
    setChainState(prev => ({
      ...prev,
      triggeredWizards: [],
      currentChainIndex: 0,
      chainData: {},
    }));
  }, []);

  const triggerNextWizard = useCallback((): WizardChainConfig | null => {
    const { triggeredWizards, currentChainIndex } = chainState;
    
    // Check if there are more wizards in the chain
    if (currentChainIndex >= triggeredWizards.length) {
      return null;
    }
    
    // Get the next wizard config
    const nextWizard = triggeredWizards[currentChainIndex];
    
    // Increment chain index
    setChainState(prev => ({
      ...prev,
      currentChainIndex: prev.currentChainIndex + 1,
    }));
    
    return nextWizard;
  }, [chainState]);

  const addToChainData = useCallback((key: string, value: unknown) => {
    setChainState(prev => ({
      ...prev,
      chainData: { ...prev.chainData, [key]: value },
    }));
  }, []);

  const getChainData = useCallback((): Record<string, unknown> => {
    return chainState.chainData;
  }, [chainState]);

  // ============================================================================
  // Validation - MUST be defined BEFORE nextStep
  // ============================================================================

  const validateStep = useCallback(async (step: number, data?: Partial<T>): Promise<boolean> => {
    // Use provided data or fall back to current formData from closure
    const dataToValidate = data || formData;
    if (!onValidateStep) return true;

    try {
      const errors = await onValidateStep(step, dataToValidate);
      setValidationErrors(errors);
      return Object.keys(errors).length === 0;
    } catch (error) {
      console.error('Validation error:', error);
      return false;
    }
  }, [formData, onValidateStep]);

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

  // Check if saved progress exists without loading it
  const hasSavedProgress = useCallback((): boolean => {
    const saved = localStorage.getItem(`wizard-${wizardType}`);
    if (!saved) return false;

    try {
      const state = JSON.parse(saved);
      // Check if expired
      if (new Date(state.expiresAt) < new Date()) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }, [wizardType]);

  // Load progress on mount only if autoLoad is true
  useEffect(() => {
    if (autoLoad) {
      loadProgress();
    }
  }, [loadProgress, autoLoad]);

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

  // Reset validation errors when wizard first loads
  useEffect(() => {
    setValidationErrors({});
  }, [wizardType]);

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

  const nextStep = useCallback(async () => {
    // Validate current step before proceeding
    const isValid = await validateStep(currentStep);
    if (isValid && currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep, totalSteps, validateStep]);

  const previousStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  // ============================================================================
  // Form Data Actions
  // ============================================================================

  // Auto-validate when form data changes
  useEffect(() => {
    if (!onValidateStep || isDirty) return;

    // Only auto-validate for steps 1, 4, 5 which have validation requirements
    // Skip for steps 2 and 3 which are optional
    if (currentStep === 2 || currentStep === 3) return;

    validateStep(currentStep);
  }, [formData, currentStep, onValidateStep, validateStep, isDirty]);

  const updateFormData = useCallback((data: Partial<T>) => {
    setFormData((prev) => ({ ...prev, ...data }));
    setIsDirty(true);

    // Immediately clear validation errors for updated fields (sync operation)
    const updatedFields = Object.keys(data);
    setValidationErrors((prev) => {
      const newErrors = { ...prev };
      updatedFields.forEach((field) => {
        delete newErrors[field];
      });
      return newErrors;
    });

    // For immediate feedback, validate with the merged data
    if (onValidateStep) {
      // Use setTimeout to ensure we have the latest formData
      setTimeout(() => {
        validateStep(currentStep, { ...formData, ...data });
      }, 0);
    }
  }, [currentStep, onValidateStep, validateStep, formData]);

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
  // Clear Saved Progress (for fresh start)
  // ============================================================================

  const clearSavedProgress = useCallback(() => {
    localStorage.removeItem(`wizard-${wizardType}`);
    setIsDirty(false);
  }, [wizardType]);

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
    chainState,
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
    clearSavedProgress,
    hasSavedProgress,
    setChainEnabled,
    addTriggeredWizard,
    removeTriggeredWizard,
    clearTriggeredWizards,
    triggerNextWizard,
    addToChainData,
    getChainData,
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

