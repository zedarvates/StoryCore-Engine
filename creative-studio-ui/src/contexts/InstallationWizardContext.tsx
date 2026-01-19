/**
 * Installation Wizard Context
 * Manages state for the ComfyUI installation wizard
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { WizardState } from '../types/installation';

interface InstallationWizardContextType {
  wizardState: WizardState;
  updateWizardState: (updates: Partial<WizardState>) => void;
  resetWizard: () => void;
  setCurrentStep: (step: WizardState['currentStep']) => void;
  setFileDetected: (detected: boolean, valid: boolean) => void;
  setInstallationProgress: (progress: number, status: string) => void;
  setInstallationError: (error: string | null) => void;
  setInstallationComplete: (url: string, models: string[], workflows: string[]) => void;
}

const InstallationWizardContext = createContext<InstallationWizardContextType | undefined>(undefined);

const initialWizardState: WizardState = {
  currentStep: 'download',
  downloadZonePath: '',
  fileDetected: false,
  fileValid: false,
  installationProgress: 0,
  installationStatus: '',
  installationError: null,
  installedModels: [],
  installedWorkflows: [],
  comfyUIUrl: null
};

interface InstallationWizardProviderProps {
  children: ReactNode;
}

export const InstallationWizardProvider: React.FC<InstallationWizardProviderProps> = ({ children }) => {
  const [wizardState, setWizardState] = useState<WizardState>(initialWizardState);

  const updateWizardState = useCallback((updates: Partial<WizardState>) => {
    setWizardState(prev => ({ ...prev, ...updates }));
  }, []);

  const resetWizard = useCallback(() => {
    setWizardState(initialWizardState);
  }, []);

  const setCurrentStep = useCallback((step: WizardState['currentStep']) => {
    setWizardState(prev => ({ ...prev, currentStep: step }));
  }, []);

  const setFileDetected = useCallback((detected: boolean, valid: boolean) => {
    setWizardState(prev => ({
      ...prev,
      fileDetected: detected,
      fileValid: valid
    }));
  }, []);

  const setInstallationProgress = useCallback((progress: number, status: string) => {
    setWizardState(prev => ({
      ...prev,
      installationProgress: progress,
      installationStatus: status
    }));
  }, []);

  const setInstallationError = useCallback((error: string | null) => {
    setWizardState(prev => ({
      ...prev,
      installationError: error
    }));
  }, []);

  const setInstallationComplete = useCallback((
    url: string,
    models: string[],
    workflows: string[]
  ) => {
    setWizardState(prev => ({
      ...prev,
      currentStep: 'completion',
      comfyUIUrl: url,
      installedModels: models,
      installedWorkflows: workflows,
      installationProgress: 100,
      installationStatus: 'Installation completed successfully!'
    }));
  }, []);

  const value: InstallationWizardContextType = {
    wizardState,
    updateWizardState,
    resetWizard,
    setCurrentStep,
    setFileDetected,
    setInstallationProgress,
    setInstallationError,
    setInstallationComplete
  };

  return (
    <InstallationWizardContext.Provider value={value}>
      {children}
    </InstallationWizardContext.Provider>
  );
};

export const useInstallationWizard = (): InstallationWizardContextType => {
  const context = useContext(InstallationWizardContext);
  if (!context) {
    throw new Error('useInstallationWizard must be used within InstallationWizardProvider');
  }
  return context;
};
