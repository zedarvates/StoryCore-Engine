/**
 * Object Wizard Component
 * 
 * Multi-step wizard for creating story objects (props, items, artifacts, etc.)
 * Follows the same pattern as CharacterWizard
 */

import React, { useCallback } from 'react';
import { WizardProvider, useWizard } from '@/contexts/WizardContext';
import { ProductionWizardContainer } from '../production-wizards/ProductionWizardContainer';
import type { WizardStep } from '../WizardStepIndicator';
import type { StoryObject } from '@/types/object';
import { createEmptyObject } from '@/types/object';
import { useServiceStatus } from '@/hooks/useServiceStatus';
import { Loader2, AlertCircle } from 'lucide-react';
import { Step1BasicInfo } from './Step1BasicInfo';
import { Step2Properties } from './Step2Properties';
import { Step3Abilities } from './Step3Abilities';
import { Step4Review } from './Step4Review';

export interface ObjectWizardProps {
  onComplete: (object: StoryObject) => void;
  onCancel: () => void;
  initialData?: Partial<StoryObject>;
}

const WIZARD_STEPS: WizardStep[] = [
  {
    number: 1,
    title: 'Basic Info',
    description: 'Name and type',
  },
  {
    number: 2,
    title: 'Properties',
    description: 'Physical details',
  },
  {
    number: 3,
    title: 'Abilities',
    description: 'Powers and effects',
  },
  {
    number: 4,
    title: 'Review',
    description: 'Finalize object',
  },
];

interface ObjectWizardContentProps {
  steps: WizardStep[];
  onCancel: () => void;
  renderStepContent: (step: number) => React.ReactNode;
  onComplete?: () => void;
}

function ObjectWizardContent({
  steps,
  onCancel,
  renderStepContent,
  onComplete,
}: ObjectWizardContentProps) {
  const { currentStep, nextStep, previousStep, goToStep, isDirty, submitWizard } = useWizard<StoryObject>();

  const handleComplete = async () => {
    await submitWizard();
    onComplete?.();
  };

  return (
    <ProductionWizardContainer
      title="Create Object"
      steps={steps}
      onCancel={onCancel}
      onComplete={handleComplete}
      allowJumpToStep={false}
      showAutoSaveIndicator={true}
      currentStep={currentStep}
      onNextStep={nextStep}
      onPreviousStep={previousStep}
      onGoToStep={goToStep}
      isDirty={isDirty}
    >
      {renderStepContent(currentStep)}
    </ProductionWizardContainer>
  );
}

export function ObjectWizard({
  onComplete,
  onCancel,
  initialData,
}: ObjectWizardProps) {
  // Check LLM service status
  const { ollama: llmStatus } = useServiceStatus();

  // Validation
  const validateStep = useCallback(
    async (step: number, data: Partial<StoryObject>): Promise<Record<string, string[]>> => {
      const errors: Record<string, string[]> = {};

      switch (step) {
        case 1: // Basic Info
          if (!data.name || data.name.trim() === '') {
            errors.name = ['Object name is required'];
          }
          if (!data.type) {
            errors.type = ['Object type is required'];
          }
          if (!data.description || data.description.trim() === '') {
            errors.description = ['Description is required'];
          }
          break;

        case 2: // Properties
          // Optional validation - properties can be empty
          break;

        case 3: // Abilities
          // Optional validation - abilities can be empty
          if (data.abilities && data.abilities.length > 0) {
            data.abilities.forEach((ability, index) => {
              if (!ability.name || ability.name.trim() === '') {
                errors[`ability-${index}-name`] = ['Ability name is required'];
              }
              if (!ability.description || ability.description.trim() === '') {
                errors[`ability-${index}-description`] = ['Ability description is required'];
              }
            });
          }
          break;

        case 4: // Review
          // Final validation
          if (!data.name || data.name.trim() === '') {
            errors.name = ['Object name is required'];
          }
          if (!data.type) {
            errors.type = ['Object type is required'];
          }
          break;
      }

      return errors;
    },
    []
  );

  // Submission
  const handleSubmit = useCallback(
    async (data: Partial<StoryObject>) => {
      try {
        // Generate UUID
        let objectId = data.id;
        if (!objectId) {
          if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            objectId = crypto.randomUUID();
          } else {
            objectId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
              const r = (Math.random() * 16) | 0;
              const v = c === 'x' ? r : (r & 0x3) | 0x8;
              return v.toString(16);
            });
          }
        }

        const object: StoryObject = {
          id: objectId,
          name: data.name || '',
          type: data.type || 'prop',
          rarity: data.rarity || 'common',
          description: data.description || '',
          appearance: data.appearance || '',
          properties: data.properties || {},
          abilities: data.abilities || [],
          significance: data.significance || '',
          history: data.history,
          currentOwner: data.currentOwner,
          location: data.location,
          relatedCharacters: data.relatedCharacters || [],
          relatedLocations: data.relatedLocations || [],
          relatedObjects: data.relatedObjects || [],
          imageUrl: data.imageUrl,
          imagePrompt: data.imagePrompt,
          generatedBy: data.generatedBy || 'user',
          createdAt: data.createdAt || new Date(),
          updatedAt: new Date(),
          tags: data.tags || [],
        };

        console.log('[ObjectWizard] Object created:', object);
        onComplete(object);
      } catch (error) {
        console.error('Failed to create object:', error);
        alert('Failed to create object: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    },
    [onComplete]
  );

  const handleWizardComplete = useCallback(() => {
    console.log('[ObjectWizard] Wizard completion confirmed');
  }, []);

  // Render step content
  const renderStepContent = (currentStep: number) => {
    switch (currentStep) {
      case 1:
        return <Step1BasicInfo />;
      case 2:
        return <Step2Properties />;
      case 3:
        return <Step3Abilities />;
      case 4:
        return <Step4Review />;
      default:
        return null;
    }
  };

  // Derived state
  const llmChecking = llmStatus === 'checking';
  const llmConfigured = llmStatus === 'connected';

  // Show loading state
  if (llmChecking) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4 min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Checking AI service status...</p>
      </div>
    );
  }

  // Show info if LLM not configured (but allow continuing)
  if (!llmConfigured) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4 min-h-[400px]">
        <AlertCircle className="h-8 w-8 text-amber-500" />
        <p className="text-sm text-muted-foreground">AI service not connected</p>
        <p className="text-xs text-muted-foreground">You can still create objects manually</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <WizardProvider<StoryObject>
      wizardType="object"
      totalSteps={4}
      initialData={initialData || createEmptyObject()}
      onSubmit={handleSubmit}
      onValidateStep={validateStep}
      autoSave={true}
      autoSaveDelay={2000}
    >
      <ObjectWizardContent
        steps={WIZARD_STEPS}
        onCancel={onCancel}
        onComplete={handleWizardComplete}
        renderStepContent={renderStepContent}
      />
    </WizardProvider>
  );
}
