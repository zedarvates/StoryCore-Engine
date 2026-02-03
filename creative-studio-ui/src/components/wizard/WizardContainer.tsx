/**
 * WizardContainer Component
 * 
 * Root orchestrator component that manages the entire wizard flow.
 * Coordinates navigation, validation, draft persistence, and export.
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.8, 12.7, 12.8
 */

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useWizardStore } from '../../stores/wizard/wizardStore';
import { WizardHeader } from './WizardHeader';
import { WizardNavigation } from './WizardNavigation';
import { WizardReview } from './WizardReview';
import {
  Step1_ProjectType,
  Step2_GenreStyle,
  Step3_WorldBuilding,
  Step4_CharacterCreation,
  Step5_StoryStructure,
  Step6_DialogueScript,
  Step7_SceneBreakdown,
  Step8_ShotPlanning,
} from './steps';
import { draftPersistence } from '../../services/wizard/DraftPersistence';
import { ExportEngine } from '../../services/wizard/ExportEngine';
import { TemplateSystem } from '../../services/wizard/TemplateSystem';
import type { WizardContainerProps, ProjectExport } from '../../types/wizard';

/**
 * Step configuration with metadata
 */
interface StepConfig {
  title: string;
  description: string;
  component: React.ComponentType<any>;
  isOptional: boolean;
}

/**
 * Step configurations for all wizard steps
 */
const STEP_CONFIGS: Record<number, StepConfig> = {
  1: {
    title: 'Project Type',
    description: 'Select your project type and duration',
    component: Step1_ProjectType,
    isOptional: false,
  },
  2: {
    title: 'Genre & Style',
    description: 'Define the visual style and genre of your project',
    component: Step2_GenreStyle,
    isOptional: false,
  },
  3: {
    title: 'World Building',
    description: 'Create the world and locations for your story',
    component: Step3_WorldBuilding,
    isOptional: false,
  },
  4: {
    title: 'Character Creation',
    description: 'Design your characters and their relationships',
    component: Step4_CharacterCreation,
    isOptional: false,
  },
  5: {
    title: 'Story Structure',
    description: 'Define your narrative structure and plot points',
    component: Step5_StoryStructure,
    isOptional: false,
  },
  6: {
    title: 'Dialogue & Script',
    description: 'Input your script or scene descriptions',
    component: Step6_DialogueScript,
    isOptional: true,
  },
  7: {
    title: 'Scene Breakdown',
    description: 'Break down your story into individual scenes',
    component: Step7_SceneBreakdown,
    isOptional: false,
  },
  8: {
    title: 'Shot Planning',
    description: 'Plan camera work and shot composition',
    component: Step8_ShotPlanning,
    isOptional: false,
  },
};

const TOTAL_STEPS = 8;

/**
 * WizardContainer Component
 * Orchestrates the complete wizard workflow
 */
export const WizardContainer: React.FC<WizardContainerProps> = ({
  initialTemplate,
  onComplete,
  onCancel,
}) => {
  // Wizard store state and actions
  const currentStep = useWizardStore((state) => state.currentStep);
  const isReviewMode = useWizardStore((state) => state.isReviewMode);
  const setCurrentStep = useWizardStore((state) => state.setCurrentStep);
  const validateStep = useWizardStore((state) => state.validateStep);
  const markStepComplete = useWizardStore((state) => state.markStepComplete);
  const canProceed = useWizardStore((state) => state.canProceed);
  const updateStepData = useWizardStore((state) => state.updateStepData);
  const reset = useWizardStore((state) => state.reset);
  const wizardState = useWizardStore();

  // Local state
  const [mode, setMode] = useState<'beginner' | 'advanced'>('beginner');
  const [isInitializing, setIsInitializing] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Use ref to avoid hoisting issues with useEffect
  const handleConfirmRef = useRef<(() => Promise<void>) | null>(null);

  // Services
  const exportEngine = useMemo(() => new ExportEngine(), []);
  const templateSystem = useMemo(() => new TemplateSystem(), []);

  /**
   * Initialize wizard from template if provided
   */
  useEffect(() => {
    const initializeWizard = async () => {
      if (initialTemplate) {
        try {
          const template = await templateSystem.loadTemplate(initialTemplate);
          
          // Apply template data to wizard store
          if (template.data.projectType) {
            updateStepData(1, template.data.projectType);
          }
          if (template.data.genreStyle) {
            updateStepData(2, template.data.genreStyle);
          }
          if (template.data.worldBuilding) {
            updateStepData(3, template.data.worldBuilding);
          }
          if (template.data.characters) {
            updateStepData(4, template.data.characters);
          }
          if (template.data.storyStructure) {
            updateStepData(5, template.data.storyStructure);
          }
          if (template.data.script) {
            updateStepData(6, template.data.script);
          }
          if (template.data.scenes) {
            updateStepData(7, template.data.scenes);
          }
          if (template.data.shots) {
            updateStepData(8, template.data.shots);
          }
        } catch (error) {
          console.error('Failed to load template:', error);
          // Continue with empty wizard if template fails
        }
      }
      setIsInitializing(false);
    };

    initializeWizard();
  }, [initialTemplate, templateSystem, updateStepData]);

  /**
   * Set up auto-save and wizard-submit event listener
   */
  useEffect(() => {
    // Start auto-save (every 30 seconds)
    draftPersistence.autoSave(() => wizardState, 30000);

    // Listen for wizard-submit event from WizardNavigation
    const handleSubmitEvent = () => {
      console.log('[WizardContainer] Received wizard-submit event, calling handleConfirm');
      if (handleConfirmRef.current) {
        handleConfirmRef.current();
      }
    };
    window.addEventListener('wizard-submit', handleSubmitEvent);

    // Cleanup on unmount
    return () => {
      draftPersistence.stopAutoSave();
      window.removeEventListener('wizard-submit', handleSubmitEvent);
    };
  }, [wizardState]);

  /**
   * Handle navigation to next step
   */
  const handleNext = useCallback(async () => {
    // Validate current step
    const validationResult = await validateStep(currentStep);
    
    if (!validationResult.isValid) {
      // Validation failed, errors are already stored in state
      return;
    }

    // Mark current step as complete
    markStepComplete(currentStep);

    // Navigate to next step or review
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
    } else {
      // All steps complete, go to review
      useWizardStore.setState({ isReviewMode: true });
    }
  }, [currentStep, validateStep, markStepComplete, setCurrentStep]);

  /**
   * Handle navigation to previous step
   */
  const handleBack = useCallback(() => {
    if (isReviewMode) {
      // Exit review mode and go back to last step
      useWizardStore.setState({ isReviewMode: false });
      setCurrentStep(TOTAL_STEPS);
    } else if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep, isReviewMode, setCurrentStep]);

  /**
   * Handle skip optional step
   */
  const handleSkip = useCallback(() => {
    const stepConfig = STEP_CONFIGS[currentStep];
    
    if (stepConfig.isOptional) {
      // Mark as complete even though skipped
      markStepComplete(currentStep);
      
      // Navigate to next step
      if (currentStep < TOTAL_STEPS) {
        setCurrentStep(currentStep + 1);
      } else {
        useWizardStore.setState({ isReviewMode: true });
      }
    }
  }, [currentStep, markStepComplete, setCurrentStep]);

  /**
   * Handle manual draft save
   */
  const handleSaveDraft = useCallback(async () => {
    try {
      await draftPersistence.saveDraft(wizardState);
      setLastSaved(new Date());
    } catch (error) {
      console.error('Failed to save draft:', error);
      // Could show error notification here
    }
  }, [wizardState]);

  /**
   * Handle edit from review mode
   */
  const handleEdit = useCallback((step: number) => {
    useWizardStore.setState({ isReviewMode: false });
    setCurrentStep(step);
  }, [setCurrentStep]);

  /**
   * Handle wizard completion and export
   */
  const handleConfirm = useCallback(async () => {
    setIsExporting(true);
    setExportError(null);

    try {
      // Generate project export
      const projectExport: ProjectExport = await exportEngine.exportProject(wizardState);

      // Call completion callback
      onComplete(projectExport);

      // Reset wizard state
      reset();
    } catch (error) {
      console.error('Export failed:', error);
      setExportError(error instanceof Error ? error.message : 'Export failed');
      setIsExporting(false);
    }
  }, [wizardState, exportEngine, onComplete, reset]);

  // Keep ref in sync with handleConfirm
  useEffect(() => {
    handleConfirmRef.current = handleConfirm;
  }, [handleConfirm]);

  /**
   * Handle wizard cancellation
   */
  const handleCancel = useCallback(() => {
    // Optionally save draft before canceling
    draftPersistence.saveDraft(wizardState).catch(console.error);
    
    // Call cancel callback
    onCancel();
    
    // Reset wizard state
    reset();
  }, [wizardState, onCancel, reset]);

  /**
   * Get current step configuration
   */
  const currentStepConfig = useMemo(() => {
    return STEP_CONFIGS[currentStep] || STEP_CONFIGS[1];
  }, [currentStep]);

  /**
   * Stable callback for updating step data
   * Prevents infinite loops in child components
   */
  const handleStepUpdate = useCallback((data: any) => {
    updateStepData(currentStep, data);
  }, [currentStep, updateStepData]);

  /**
   * Render current step component
   */
  const renderStepComponent = useCallback(() => {
    if (isReviewMode) {
      return (
        <WizardReview
          projectData={wizardState}
          onEdit={handleEdit}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      );
    }

    const StepComponent = currentStepConfig.component;
    
    // Extract step data based on current step
    let stepData: any = null;
    let stepErrors: any = {};
    
    switch (currentStep) {
      case 1:
        stepData = wizardState.projectType;
        break;
      case 2:
        stepData = wizardState.genreStyle;
        break;
      case 3:
        stepData = wizardState.worldBuilding;
        break;
      case 4:
        stepData = wizardState.characters;
        break;
      case 5:
        stepData = wizardState.storyStructure;
        break;
      case 6:
        stepData = wizardState.script;
        break;
      case 7:
        stepData = wizardState.scenes;
        break;
      case 8:
        stepData = wizardState.shots;
        break;
    }
    
    // Get validation errors for current step
    const validationErrors = wizardState.validationErrors?.get?.(currentStep) || [];
    if (validationErrors.length > 0) {
      stepErrors = validationErrors.reduce((acc: any, error: any) => {
        acc[error.field] = error.message;
        return acc;
      }, {});
    }
    
    // Prepare context props from previous steps
    const contextProps: any = {};
    
    // For Step7 (Scene Breakdown), pass locations and characters
    if (currentStep === 7) {
      contextProps.locations = wizardState.worldBuilding?.locations || [];
      contextProps.characters = wizardState.characters || [];
      contextProps.projectType = wizardState.projectType;
    }
    
    // For Step8 (Shot Planning), pass scenes, locations, and characters
    if (currentStep === 8) {
      contextProps.scenes = wizardState.scenes || [];
      contextProps.locations = wizardState.worldBuilding?.locations || [];
      contextProps.characters = wizardState.characters || [];
    }
    
    return (
      <StepComponent
        mode={mode}
        data={stepData}
        onUpdate={handleStepUpdate}
        errors={stepErrors}
        {...contextProps}
      />
    );
  }, [
    isReviewMode,
    currentStepConfig,
    mode,
    wizardState,
    currentStep,
    handleStepUpdate,
    handleEdit,
    handleConfirm,
    handleCancel,
  ]);

  /**
   * Determine navigation button states
   */
  const canGoNext = useMemo(() => {
    return canProceed() && !isExporting;
  }, [canProceed, isExporting]);

  const canGoBack = useMemo(() => {
    return (currentStep > 1 || isReviewMode) && !isExporting;
  }, [currentStep, isReviewMode, isExporting]);

  const canSkip = useMemo(() => {
    return currentStepConfig.isOptional && !isExporting;
  }, [currentStepConfig, isExporting]);

  // Show loading state during initialization
  if (isInitializing) {
    return (
      <div className="wizard-container wizard-container--loading">
        <div className="wizard-container__loading-content">
          <div className="wizard-container__spinner" />
          <p>Initializing wizard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="wizard-container">
      {/* Title Bar */}
      <div className="wizard-container__title-bar">
        <h2 className="wizard-container__title">Project Setup Wizard</h2>
      </div>

      {/* Header */}
      {!isReviewMode && (
        <WizardHeader
          currentStep={currentStep}
          totalSteps={TOTAL_STEPS}
          stepTitle={currentStepConfig.title}
          stepDescription={currentStepConfig.description}
          mode={mode}
          onModeToggle={setMode}
        />
      )}

      {/* Main Content */}
      <div className="wizard-container__content">
        {renderStepComponent()}
      </div>

      {/* Export Error Display */}
      {exportError && (
        <div className="wizard-container__error">
          <div className="wizard-container__error-content">
            <svg
              className="wizard-container__error-icon"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 2L2 22h20L12 2z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M12 9v4M12 17h.01"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div>
              <h3>Export Failed</h3>
              <p>{exportError}</p>
            </div>
            <button
              type="button"
              className="wizard-container__error-close"
              onClick={() => setExportError(null)}
              aria-label="Close error message"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Navigation */}
      {!isReviewMode && (
        <WizardNavigation
          currentStep={currentStep}
          totalSteps={TOTAL_STEPS}
          canGoNext={canGoNext}
          canGoBack={canGoBack}
          canSkip={canSkip}
          onNext={handleNext}
          onBack={handleBack}
          onSkip={handleSkip}
          onSaveDraft={handleSaveDraft}
          lastSaved={lastSaved || wizardState.lastSaved || undefined}
        />
      )}

      {/* Styles */}
      <style>{`
        .wizard-container {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          background: #f5f7fa;
        }

        .wizard-container__title-bar {
          background: #1a1a1a;
          padding: 1.5rem 2rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }

        .wizard-container__title {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 600;
          color: #ffffff;
          letter-spacing: -0.02em;
        }

        .wizard-container--loading {
          justify-content: center;
          align-items: center;
        }

        .wizard-container__loading-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          color: #667eea;
        }

        .wizard-container__spinner {
          width: 48px;
          height: 48px;
          border: 4px solid rgba(102, 126, 234, 0.2);
          border-top-color: #667eea;
          border-radius: 50%;
          animation: wizard-spinner 0.8s linear infinite;
        }

        @keyframes wizard-spinner {
          to {
            transform: rotate(360deg);
          }
        }

        .wizard-container__content {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
        }

        .wizard-container__error {
          position: fixed;
          top: 1rem;
          right: 1rem;
          left: 1rem;
          z-index: 1000;
          max-width: 600px;
          margin: 0 auto;
        }

        .wizard-container__error-content {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          padding: 1rem 1.5rem;
          background: #fee;
          border: 1px solid #fcc;
          border-radius: 0.5rem;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .wizard-container__error-icon {
          flex-shrink: 0;
          color: #c33;
        }

        .wizard-container__error-content h3 {
          margin: 0 0 0.25rem 0;
          font-size: 1rem;
          font-weight: 600;
          color: #c33;
        }

        .wizard-container__error-content p {
          margin: 0;
          font-size: 0.875rem;
          color: #666;
        }

        .wizard-container__error-close {
          margin-left: auto;
          padding: 0.25rem 0.5rem;
          font-size: 1.5rem;
          line-height: 1;
          color: #999;
          background: transparent;
          border: none;
          cursor: pointer;
          transition: color 0.2s ease;
        }

        .wizard-container__error-close:hover {
          color: #c33;
        }

        /* Responsive design */
        @media (max-width: 768px) {
          .wizard-container__error {
            top: 0.5rem;
            right: 0.5rem;
            left: 0.5rem;
          }

          .wizard-container__error-content {
            padding: 0.75rem 1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default WizardContainer;
