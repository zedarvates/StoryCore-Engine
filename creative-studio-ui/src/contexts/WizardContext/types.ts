import React from 'react';

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
  lastSaved?: number;
  
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

export interface WizardProviderProps<T> {
  children: React.ReactNode;
  wizardType: WizardType;
  totalSteps: number;
  initialData?: Partial<T>;
  onSubmit: (data: T) => Promise<void>;
  onComplete?: (data: T) => void;
  onValidateStep?: (step: number, data: Partial<T>) => Promise<Record<string, string[]>>;
  autoSave?: boolean;
  autoSaveDelay?: number; // milliseconds
  autoLoad?: boolean; // defaults to false
}
