import React, { useEffect, Suspense } from 'react';
import { useWorldBuilderSelectors, useWorldBuilderActions } from '../../../stores/worldBuilderStore';
import { StepNavigator } from './StepNavigator';
import { ProgressIndicator } from './ProgressIndicator';
import { ErrorBoundary } from './ErrorBoundary';
import { LLMAssistant } from './LLMAssistant';
import { WorldPreview } from './WorldPreview';
import { FoundationsStep } from './steps/FoundationsStep';
import { RulesStep } from './steps/RulesStep';
import { CultureStep } from './steps/CultureStep';
import { LocationsStep } from './steps/LocationsStep';
import { SynthesisStep } from './steps/SynthesisStep';
import './WorldBuilderWizard.css';

const STEP_COMPONENTS = {
  foundations: FoundationsStep,
  rules: RulesStep,
  culture: CultureStep,
  locations: LocationsStep,
  synthesis: SynthesisStep,
} as const;

interface WorldBuilderWizardProps {
  onClose?: () => void;
  initialData?: any;
}

export const WorldBuilderWizard: React.FC<WorldBuilderWizardProps> = ({
  onClose,
  initialData,
}) => {
  const { worldData, currentStep, isLoading, error } = useWorldBuilderSelectors();
  const { initializeWorld, saveWorld, setError } = useWorldBuilderActions();

  useEffect(() => {
    if (!worldData && initialData) {
      initializeWorld(initialData);
    } else if (!worldData) {
      initializeWorld({});
    }
  }, [worldData, initialData, initializeWorld]);

  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      if (worldData) {
        saveWorld();
      }
    }, 30000); // Auto-save every 30 seconds

    return () => clearInterval(autoSaveInterval);
  }, [worldData, saveWorld]);

  const handleStepChange = (step: string) => {
    // Navigation logic with validation
    // Allow navigation to completed steps or current step
  };

  const CurrentStepComponent = STEP_COMPONENTS[currentStep as keyof typeof STEP_COMPONENTS];

  if (isLoading && !worldData) {
    return (
      <div className="world-builder-wizard loading">
        <div className="loading-spinner">Loading world builder...</div>
      </div>
    );
  }

  return (
    <ErrorBoundary onError={(error) => setError(error.message)}>
      <div className="world-builder-wizard">
        <div className="wizard-header">
          <h1>World Builder</h1>
          <ProgressIndicator />
          <button
            className="close-button"
            onClick={onClose}
            aria-label="Close wizard"
          >
            ×
          </button>
        </div>

        <div className="wizard-layout">
          <div className="wizard-sidebar">
            <StepNavigator onStepChange={handleStepChange} />
            <LLMAssistant />
          </div>

          <div className="wizard-content">
            <Suspense fallback={<div className="step-loading">Loading step...</div>}>
              {CurrentStepComponent && <CurrentStepComponent />}
            </Suspense>
          </div>

          <div className="wizard-preview">
            <WorldPreview />
          </div>
        </div>

        {error && (
          <div className="error-banner">
            <span>{error}</span>
            <button onClick={() => setError(null)}>×</button>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};