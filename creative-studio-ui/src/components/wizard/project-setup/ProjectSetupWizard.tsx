import React, { useCallback } from 'react';
import { WizardProvider, useWizard } from '@/contexts/WizardContext';
import { ProjectSetupWizardContainer } from './ProjectSetupWizardContainer';
import { Step1ProjectInfo, type ProjectSetupData } from './Step1ProjectInfo';
import { Step2ProjectSettings } from './Step2ProjectSettings';

// ============================================================================
// Project Setup Wizard Steps
// ============================================================================

interface WizardStep {
  id: string;
  title: string;
  description?: string;
}

const WIZARD_STEPS: WizardStep[] = [
  {
    id: 'project-info',
    title: 'Step 1: Project Information',
    description: 'Define your project basics',
  },
  {
    id: 'project-settings',
    title: 'Step 2: Project Settings',
    description: 'Configure project parameters',
  },
];

// ============================================================================
// Project Setup Wizard Content (uses wizard context)
// ============================================================================

interface ProjectSetupWizardContentProps {
  steps: WizardStep[];
  onCancel: () => void;
  renderStepContent: (step: number) => React.ReactNode;
  onComplete?: () => void;
}

function ProjectSetupWizardContent({
  steps,
  onCancel,
  renderStepContent,
  onComplete,
}: ProjectSetupWizardContentProps) {
  const { currentStep } = useWizard<ProjectSetupData>();

  return (
    <ProjectSetupWizardContainer
      title="Project Setup"
      steps={steps}
      onCancel={onCancel}
      onComplete={onComplete}
      allowJumpToStep={false}
      showAutoSaveIndicator={true}
    >
      {renderStepContent(currentStep)}
    </ProjectSetupWizardContainer>
  );
}

// ============================================================================
// Project Setup Wizard
// ============================================================================

interface ProjectSetupWizardProps {
  onComplete: (data: ProjectSetupData) => void;
  onCancel: () => void;
  initialData?: Partial<ProjectSetupData>;
}

export function ProjectSetupWizard({
  onComplete,
  onCancel,
  initialData = {},
}: ProjectSetupWizardProps) {
  // ============================================================================
  // Validation
  // ============================================================================

  const validateStep = useCallback(
    async (step: number, data: Partial<ProjectSetupData>): Promise<Record<string, string[]>> => {
      const errors: Record<string, string[]> = {};

      switch (step) {
        case 1: // Step 1: Project Info
          if (!data.projectName || data.projectName.trim().length === 0) {
            errors.projectName = ['Project name is required'];
          } else if (data.projectName.trim().length < 3) {
            errors.projectName = ['Project name must be at least 3 characters'];
          }

          if (!data.genre || data.genre.length === 0) {
            errors.genre = ['Please select at least one genre'];
          }

          if (!data.tone || data.tone.length === 0) {
            errors.tone = ['Please select at least one tone'];
          }
          break;

        case 2: // Step 2: Project Settings
          // Optional validation - settings can be empty
          break;
      }

      return errors;
    },
    []
  );

  // ============================================================================
  // Submission
  // ============================================================================

  const handleSubmit = useCallback(
    async (data: Partial<ProjectSetupData>) => {
      console.log('✅ Project Setup completed:', data);
      onComplete(data as ProjectSetupData);
    },
    [onComplete]
  );

  // ============================================================================
  // Render Step Content
  // ============================================================================

  const renderStepContent = (currentStep: number) => {
    switch (currentStep) {
      case 1:
        return <Step1ProjectInfo />;
      case 2:
        return <Step2ProjectSettings />;
      default:
        return null;
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <WizardProvider<ProjectSetupData>
      wizardType="project-setup"
      totalSteps={2}
      initialData={initialData}
      onSubmit={handleSubmit}
      onValidateStep={validateStep}
      autoSave={true}
      autoSaveDelay={2000}
    >
      <ProjectSetupWizardContent
        steps={WIZARD_STEPS}
        onCancel={onCancel}
        renderStepContent={renderStepContent}
        onComplete={onCancel}
      />
    </WizardProvider>
  );
}
