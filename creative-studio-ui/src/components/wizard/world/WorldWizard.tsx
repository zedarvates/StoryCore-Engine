import React, { useCallback } from 'react';
import { WizardProvider, useWizard } from '@/contexts/WizardContext';
import { WizardContainer } from '../WizardContainer';
import type { WizardStep } from '../WizardStepIndicator';
import type { World } from '@/types/world';
import { createEmptyWorld } from '@/types/world';
import { useStore } from '@/store';
import { Step1BasicInformation } from './Step1BasicInformation';
import { Step2WorldRules } from './Step2WorldRules';
import { Step3Locations } from './Step3Locations';
import { Step4CulturalElements } from './Step4CulturalElements';
import { Step5ReviewFinalize } from './Step5ReviewFinalize';

// ============================================================================
// World Wizard Component
// ============================================================================

export interface WorldWizardProps {
  onComplete: (world: World) => void;
  onCancel: () => void;
  initialData?: Partial<World>;
}

const WIZARD_STEPS: WizardStep[] = [
  {
    number: 1,
    title: 'Basic Info',
    description: 'Name, genre, and tone',
  },
  {
    number: 2,
    title: 'World Rules',
    description: 'Laws and systems',
  },
  {
    number: 3,
    title: 'Locations',
    description: 'Key places',
  },
  {
    number: 4,
    title: 'Culture',
    description: 'Cultural elements',
  },
  {
    number: 5,
    title: 'Review',
    description: 'Finalize world',
  },
];

// ============================================================================
// World Wizard Content (uses wizard context)
// ============================================================================

interface WorldWizardContentProps {
  steps: WizardStep[];
  onCancel: () => void;
  renderStepContent: (step: number) => React.ReactNode;
}

function WorldWizardContent({ steps, onCancel, renderStepContent }: WorldWizardContentProps) {
  const { currentStep } = useWizard<World>();

  return (
    <WizardContainer
      title="Create World"
      steps={steps}
      onCancel={onCancel}
      allowJumpToStep={false}
      showAutoSaveIndicator={true}
    >
      {renderStepContent(currentStep)}
    </WizardContainer>
  );
}

export function WorldWizard({ onComplete, onCancel, initialData }: WorldWizardProps) {
  // Get store actions
  const addWorld = useStore((state) => state.addWorld);

  // ============================================================================
  // Validation
  // ============================================================================

  const validateStep = useCallback(
    async (step: number, data: Partial<World>): Promise<Record<string, string[]>> => {
      const errors: Record<string, string[]> = {};

      switch (step) {
        case 1: // Basic Information
          if (!data.name || data.name.trim() === '') {
            errors.name = ['World name is required'];
          }
          if (!data.timePeriod || data.timePeriod.trim() === '') {
            errors.timePeriod = ['Time period is required'];
          }
          if (!data.genre || data.genre.length === 0) {
            errors.genre = ['At least one genre must be selected'];
          }
          if (!data.tone || data.tone.length === 0) {
            errors.tone = ['At least one tone must be selected'];
          }
          break;

        case 2: // World Rules
          // Optional validation - rules can be empty
          break;

        case 3: // Locations
          // Optional validation - locations can be empty
          if (data.locations && data.locations.length > 0) {
            data.locations.forEach((location, index) => {
              if (!location.name || location.name.trim() === '') {
                errors[`location-${index}-name`] = ['Location name is required'];
              }
            });
          }
          break;

        case 4: // Cultural Elements
          // Optional validation - cultural elements can be empty
          break;

        case 5: // Review
          // Final validation - ensure all required fields are present
          if (!data.name || data.name.trim() === '') {
            errors.name = ['World name is required'];
          }
          if (!data.genre || data.genre.length === 0) {
            errors.genre = ['At least one genre must be selected'];
          }
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
    async (data: Partial<World>) => {
      // Create complete world object
      const world: World = {
        id: crypto.randomUUID(),
        name: data.name || '',
        genre: data.genre || [],
        timePeriod: data.timePeriod || '',
        tone: data.tone || [],
        locations: data.locations || [],
        rules: data.rules || [],
        atmosphere: data.atmosphere || '',
        culturalElements: data.culturalElements || {
          languages: [],
          religions: [],
          traditions: [],
          historicalEvents: [],
          culturalConflicts: [],
        },
        technology: data.technology || '',
        magic: data.magic || '',
        conflicts: data.conflicts || [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Add to store (which also persists to localStorage and updates project)
      addWorld(world);

      // Emit event for other components to subscribe to
      window.dispatchEvent(
        new CustomEvent('world-created', {
          detail: { world },
        })
      );

      // Call the onComplete callback
      onComplete(world);
    },
    [onComplete, addWorld]
  );

  // ============================================================================
  // Render Step Content
  // ============================================================================

  const renderStepContent = (currentStep: number) => {
    switch (currentStep) {
      case 1:
        return <Step1BasicInformation />;
      case 2:
        return <Step2WorldRules />;
      case 3:
        return <Step3Locations />;
      case 4:
        return <Step4CulturalElements />;
      case 5:
        return <Step5ReviewFinalize />;
      default:
        return null;
    }
  };

  return (
    <WizardProvider<World>
      wizardType="world"
      totalSteps={5}
      initialData={initialData || createEmptyWorld()}
      onSubmit={handleSubmit}
      onValidateStep={validateStep}
      autoSave={true}
      autoSaveDelay={2000}
    >
      <WorldWizardContent
        steps={WIZARD_STEPS}
        onCancel={onCancel}
        renderStepContent={renderStepContent}
      />
    </WizardProvider>
  );
}
