// ============================================================================
// Wizard Storage Utilities
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

export interface WizardAutoSaveState<T> {
  wizardType: WizardType;
  timestamp: string;
  currentStep: number;
  formData: Partial<T>;
  expiresAt: string;
}

// ============================================================================
// Storage Key Generation
// ============================================================================

function getStorageKey(wizardType: WizardType): string {
  return `wizard-${wizardType}`;
}

// ============================================================================
// Save Wizard State
// ============================================================================

export function saveWizardState<T>(
  wizardType: WizardType,
  currentStep: number,
  formData: Partial<T>,
  expirationDays: number = 7
): boolean {
  try {
    const state: WizardAutoSaveState<T> = {
      wizardType,
      timestamp: new Date().toISOString(),
      currentStep,
      formData,
      expiresAt: new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000).toISOString(),
    };

    const key = getStorageKey(wizardType);
    localStorage.setItem(key, JSON.stringify(state));
    
    return true;
  } catch (error) {
    // Failed to save wizard state - log for debugging in development only
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to save wizard state:', error);
    }
    
    // Check if storage is full
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      if (process.env.NODE_ENV === 'development') {
        console.warn('LocalStorage quota exceeded. Cannot save wizard progress.');
      }
    }
    
    return false;
  }
}

// ============================================================================
// Load Wizard State
// ============================================================================

export function loadWizardState<T>(
  wizardType: WizardType
): WizardAutoSaveState<T> | null {
  try {
    const key = getStorageKey(wizardType);
    const saved = localStorage.getItem(key);
    
    if (!saved) {
      return null;
    }

    const state: WizardAutoSaveState<T> = JSON.parse(saved);
    
    // Validate state structure
    if (!isValidWizardState(state)) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Invalid wizard state structure, clearing corrupted data');
      }
      clearWizardState(wizardType);
      return null;
    }

    // Check if expired
    if (new Date(state.expiresAt) < new Date()) {
      console.info('Wizard state expired, clearing old data');
      clearWizardState(wizardType);
      return null;
    }

    return state;
  } catch (error) {
    // Failed to load wizard state - log for debugging in development only
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to load wizard state:', error);
    }
    
    // Clear corrupted state
    clearWizardState(wizardType);
    
    return null;
  }
}

// ============================================================================
// Load Wizard State with Validation
// ============================================================================

export interface LoadStateResult<T> {
  state: WizardAutoSaveState<T> | null;
  isValid: boolean;
  isCorrupted: boolean;
  errors: string[];
  warnings: string[];
  canRecover: boolean;
}

export function loadWizardStateWithValidation<T>(
  wizardType: WizardType
): LoadStateResult<T> {
  try {
    const key = getStorageKey(wizardType);
    const saved = localStorage.getItem(key);
    
    if (!saved) {
      return {
        state: null,
        isValid: true,
        isCorrupted: false,
        errors: [],
        warnings: [],
        canRecover: false,
      };
    }

    const state: WizardAutoSaveState<T> = JSON.parse(saved);
    
    // Basic validation
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (!isValidWizardState(state)) {
      errors.push('Invalid state structure');
    }
    
    if (state.expiresAt && new Date(state.expiresAt) < new Date()) {
      warnings.push('State has expired');
    }

    const isValid = errors.length === 0;
    const isCorrupted = errors.length > 0;
    const canRecover = isCorrupted && state.formData !== undefined;

    return {
      state: isValid ? state : null,
      isValid,
      isCorrupted,
      errors,
      warnings,
      canRecover,
    };
  } catch (error) {
    return {
      state: null,
      isValid: false,
      isCorrupted: true,
      errors: ['Failed to parse state: ' + (error instanceof Error ? error.message : String(error))],
      warnings: [],
      canRecover: false,
    };
  }
}

// ============================================================================
// Clear Wizard State
// ============================================================================

export function clearWizardState(wizardType: WizardType): void {
  try {
    const key = getStorageKey(wizardType);
    localStorage.removeItem(key);
  } catch (error) {
    // Failed to clear wizard state - log for debugging in development only
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to clear wizard state:', error);
    }
  }
}

// ============================================================================
// Check if Wizard State Exists
// ============================================================================

export function hasWizardState(wizardType: WizardType): boolean {
  const state = loadWizardState(wizardType);
  return state !== null;
}

// ============================================================================
// Export Wizard State as JSON
// ============================================================================

export function exportWizardState<T>(
  wizardType: WizardType
): string | null {
  const state = loadWizardState<T>(wizardType);
  
  if (!state) {
    return null;
  }

  try {
    return JSON.stringify(state.formData, null, 2);
  } catch (error) {
    // Failed to export wizard state - log for debugging in development only
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to export wizard state:', error);
    }
    return null;
  }
}

// ============================================================================
// Import Wizard State from JSON
// ============================================================================

export function importWizardState<T>(
  wizardType: WizardType,
  jsonData: string
): boolean {
  try {
    const formData = JSON.parse(jsonData) as Partial<T>;
    
    return saveWizardState(wizardType, 1, formData);
  } catch (error) {
    // Failed to import wizard state - log for debugging in development only
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to import wizard state:', error);
    }
    return false;
  }
}

// ============================================================================
// Validate Wizard State Structure
// ============================================================================

// Using 'any' for state parameter to validate arbitrary wizard state structures
// before type narrowing with the type guard
function isValidWizardState(state: any): state is WizardAutoSaveState<any> {
  const validWizardTypes: WizardType[] = [
    'world',
    'character',
    'dialogue-writer',
    'scene-generator',
    'storyboard-creator',
    'style-transfer',
    'sequence-plan',
    'shot',
  ];

  return (
    state &&
    typeof state === 'object' &&
    typeof state.wizardType === 'string' &&
    validWizardTypes.includes(state.wizardType as WizardType) &&
    typeof state.timestamp === 'string' &&
    typeof state.currentStep === 'number' &&
    typeof state.formData === 'object' &&
    typeof state.expiresAt === 'string'
  );
}

// ============================================================================
// Check LocalStorage Availability
// ============================================================================

export function isLocalStorageAvailable(): boolean {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (error) {
    return false;
  }
}

// ============================================================================
// Get LocalStorage Usage
// ============================================================================

export function getLocalStorageUsage(): {
  used: number;
  available: number;
  percentage: number;
} {
  try {
    let used = 0;
    
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        used += localStorage[key].length + key.length;
      }
    }

    // Most browsers have 5-10MB limit, we'll use 5MB as conservative estimate
    const available = 5 * 1024 * 1024; // 5MB in bytes
    const percentage = (used / available) * 100;

    return {
      used,
      available,
      percentage,
    };
  } catch (error) {
    // Failed to calculate storage usage - log for debugging in development only
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to calculate storage usage:', error);
    }
    return {
      used: 0,
      available: 0,
      percentage: 0,
    };
  }
}

// ============================================================================
// Clear All Wizard States
// ============================================================================

export function clearAllWizardStates(): void {
  const wizardTypes: WizardType[] = [
    'world',
    'character',
    'dialogue-writer',
    'scene-generator',
    'storyboard-creator',
    'style-transfer',
    'sequence-plan',
    'shot',
  ];
  
  wizardTypes.forEach(type => clearWizardState(type));
}

// ============================================================================
// Emergency Export on Critical Error
// ============================================================================

export function emergencyExportWizardState<T>(
  wizardType: WizardType,
  error?: Error
): void {
  try {
    const state = loadWizardState<T>(wizardType);
    
    if (!state) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('No wizard state to export');
      }
      return;
    }

    const exportData = {
      wizardType,
      timestamp: new Date().toISOString(),
      formData: state.formData,
      error: error ? {
        message: error.message,
        stack: error.stack,
      } : undefined,
    };

    // Create download link
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${wizardType}-wizard-emergency-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    if (process.env.NODE_ENV === 'development') {
      console.info('Emergency export completed successfully');
    }
  } catch (exportError) {
    // Failed emergency export - log for debugging in development only
    if (process.env.NODE_ENV === 'development') {
      console.error('Emergency export failed:', exportError);
    }
  }
}

// ============================================================================
// Auto-Export on Window Unload (for critical errors)
// ============================================================================

let autoExportEnabled = false;

export function enableAutoExportOnError(): void {
  if (autoExportEnabled) {
    return;
  }

  autoExportEnabled = true;

  const wizardTypes: WizardType[] = [
    'world',
    'character',
    'dialogue-writer',
    'scene-generator',
    'storyboard-creator',
    'style-transfer',
    'sequence-plan',
    'shot',
  ];

  // Listen for unhandled errors
  window.addEventListener('error', (event) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Unhandled error detected, attempting emergency export');
    }
    wizardTypes.forEach(type => emergencyExportWizardState(type, event.error));
  });

  // Listen for unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Unhandled rejection detected, attempting emergency export');
    }
    const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
    wizardTypes.forEach(type => emergencyExportWizardState(type, error));
  });
}

export function disableAutoExportOnError(): void {
  autoExportEnabled = false;
  // Note: Cannot remove event listeners without references
  // This is a limitation of the current implementation
}
