import { createContext, useContext } from 'react';
import type { WizardContextState } from './types';

// ============================================================================
// Context Creation
// ============================================================================

export const WizardContext = createContext<WizardContextState<unknown> | null>(null);

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
