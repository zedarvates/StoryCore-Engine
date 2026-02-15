import React, { useCallback, useState, useEffect } from 'react';
import { WizardProvider, useWizard } from '@/contexts/WizardContext';
import { ProductionWizardContainer } from '../production-wizards/ProductionWizardContainer';
import type { WizardStep } from '../WizardStepIndicator';
import type { Character } from '@/types/character';
import { createEmptyCharacter } from '@/types/character';
import type { World } from '@/types/world';
import type { Story } from '@/types/story';
import { useCharacterPersistence } from '@/hooks/useCharacterPersistence';
import { useServiceStatus } from '@/components/ui/service-warning';
import { eventEmitter, CharacterEventType, createCharacterCreatedPayload } from '@/services/eventEmitter';
import { Step1BasicIdentity } from './Step1BasicIdentity';
import { Step2PhysicalAppearance } from './Step2PhysicalAppearance';
import { Step3Personality } from './Step3Personality';
import { Step4Background } from './Step4Background';
import { Step5Relationships } from './Step5Relationships';
import { Step6ReviewFinalize } from './Step6ReviewFinalize';
import { Loader2, AlertCircle } from 'lucide-react';

// ============================================================================
// Character Wizard Component
// ============================================================================

/**
 * Story context for character creation
 * Used when creating a character from within the Story Generator
 */
export interface StoryContext {
  storyId?: string;
  storyName?: string;
  storyData?: Partial<Story>;
}

export interface CharacterWizardProps {
  onComplete: (character: Character, context?: StoryContext) => void;
  onCancel: () => void;
  worldContext?: World;
  storyContext?: StoryContext;
  initialData?: Partial<Character>;
}

const WIZARD_STEPS: WizardStep[] = [
  {
    number: 1,
    title: 'Basic Identity',
    description: 'Name and role',
  },
  {
    number: 2,
    title: 'Appearance',
    description: 'Physical traits',
  },
  {
    number: 3,
    title: 'Personality',
    description: 'Traits and values',
  },
  {
    number: 4,
    title: 'Background',
    description: 'History and origin',
  },
  {
    number: 5,
    title: 'Relationships',
    description: 'Character connections',
  },
  {
    number: 6,
    title: 'Review',
    description: 'Finalize character',
  },
];

// ============================================================================
// Character Wizard Content (uses wizard context)
// ============================================================================

interface CharacterWizardContentProps {
  steps: WizardStep[];
  onCancel: () => void;
  worldContext?: World;
  storyContext?: StoryContext;
  renderStepContent: (step: number) => React.ReactNode;
  onComplete?: () => void;
}

function CharacterWizardContent({
  steps,
  onCancel,
  renderStepContent,
  onComplete,
}: CharacterWizardContentProps) {
  const { currentStep, nextStep, previousStep, goToStep, isDirty, submitWizard } = useWizard<Character>();

  const handleComplete = async () => {
    await submitWizard();
    onComplete?.();
  };

  return (
    <ProductionWizardContainer
      title="Create Character"
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

export function CharacterWizard({
  onComplete,
  onCancel,
  worldContext,
  storyContext,
  initialData,
}: CharacterWizardProps) {
  // ============================================================================
  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  // ============================================================================

  // Check LLM service status
  const { llmConfigured, llmChecking } = useServiceStatus();

  // Character Persistence hook
  const { saveCharacter } = useCharacterPersistence();

  // ============================================================================
  // Validation
  // ============================================================================

  const validateStep = useCallback(
    async (step: number, data: Partial<Character>): Promise<Record<string, string[]>> => {
      const errors: Record<string, string[]> = {};

      switch (step) {
        case 1: // Basic Identity
          if (!data.name || data.name.trim() === '') {
            errors.name = ['Character name is required'];
          }
          if (!data.role?.archetype || data.role.archetype.trim() === '') {
            errors.archetype = ['Character archetype is required'];
          }
          if (!data.visual_identity?.gender || data.visual_identity.gender.trim() === '') {
            errors.gender = ['Gender is required'];
          }
          if (!data.visual_identity?.age_range || data.visual_identity.age_range.trim() === '') {
            errors.age_range = ['Age Range is required'];
          }
          break;

        case 2: // Physical Appearance
          // Optional validation - appearance fields can be empty
          // LLM will help fill these in
          break;

        case 3: // Personality
          // Optional validation - personality can be built gradually
          if (data.personality?.traits && data.personality.traits.length > 10) {
            errors.traits = ['Maximum 10 personality traits allowed'];
          }
          break;

        case 4: // Background
          // Optional validation - background can be empty
          break;

        case 5: // Relationships
          // Validate that referenced characters exist
          if (data.relationships && data.relationships.length > 0) {
            data.relationships.forEach((rel, index) => {
              if (!rel.character_name || rel.character_name.trim() === '') {
                errors[`relationship-${index}-name`] = ['Character name is required'];
              }
              if (!rel.relationship_type || rel.relationship_type.trim() === '') {
                errors[`relationship-${index}-type`] = ['Relationship type is required'];
              }
            });
          }
          break;

        case 6: // Review
          // Final validation - ensure all required fields are present
          if (!data.name || data.name.trim() === '') {
            errors.name = ['Character name is required'];
          }
          if (!data.role?.archetype || data.role.archetype.trim() === '') {
            errors.archetype = ['Character archetype is required'];
          }
          if (!data.visual_identity?.gender || data.visual_identity.gender.trim() === '') {
            errors.gender = ['Gender is required'];
          }
          if (!data.visual_identity?.age_range || data.visual_identity.age_range.trim() === '') {
            errors.age_range = ['Age Range is required'];
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
    async (data: Partial<Character>) => {
      try {
        // Save character to JSON file and update store
        const savedCharacter = await saveCharacter(data);

        // Emit character-created event with proper payload structure
        // Requirements: 3.4, 12.1
        eventEmitter.emit(
          CharacterEventType.CHARACTER_CREATED,
          createCharacterCreatedPayload(
            savedCharacter,
            'wizard',
            storyContext?.storyName
          )
        );

        // Call the onComplete callback with saved character and story context
        // Requirements: 3.2, 3.5
        onComplete(savedCharacter, storyContext);
      } catch (error) {
        console.error('Failed to save character:', error);

        // Create a detailed error message based on the error type
        let errorMessage = 'Failed to save character: ';
        if (error instanceof Error) {
          errorMessage += error.message;

          // Add specific guidance for common error types
          if (error.message.includes('permission') || error.message.includes('access')) {
            errorMessage += '\nPlease check your file system permissions.';
          } else if (error.message.includes('network') || error.message.includes('connection')) {
            errorMessage += '\nPlease check your network connection.';
          } else if (error.message.includes('invalid')) {
            errorMessage += '\nPlease verify all character data is valid.';
          }
        } else {
          errorMessage += 'Unknown error occurred.';
        }

        // Show error to user
        alert(errorMessage);

        // Still create the character object for the callback
        // even if persistence failed
        // Generate UUID with fallback
        let characterId = data.character_id;
        if (!characterId) {
          if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            characterId = crypto.randomUUID();
          } else {
            characterId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
              const r = (Math.random() * 16) | 0;
              const v = c === 'x' ? r : (r & 0x3) | 0x8;
              return v.toString(16);
            });
          }
        }

        const character: Character = {
          character_id: characterId,
          name: data.name || '',
          creation_method: 'wizard',
          creation_timestamp: new Date().toISOString(),
          version: '1.0',
          visual_identity: {
            hair_color: data.visual_identity?.hair_color || '',
            hair_style: data.visual_identity?.hair_style || '',
            hair_length: data.visual_identity?.hair_length || '',
            eye_color: data.visual_identity?.eye_color || '',
            eye_shape: data.visual_identity?.eye_shape || '',
            skin_tone: data.visual_identity?.skin_tone || '',
            facial_structure: data.visual_identity?.facial_structure || '',
            distinctive_features: data.visual_identity?.distinctive_features || [],
            age_range: data.visual_identity?.age_range || '',
            gender: data.visual_identity?.gender || '',
            height: data.visual_identity?.height || '',
            build: data.visual_identity?.build || '',
            posture: data.visual_identity?.posture || '',
            clothing_style: data.visual_identity?.clothing_style || '',
            color_palette: data.visual_identity?.color_palette || [],
            reference_images: data.visual_identity?.reference_images || [],
            reference_sheet_images: data.visual_identity?.reference_sheet_images || [],
          },
          personality: {
            traits: data.personality?.traits || [],
            values: data.personality?.values || [],
            fears: data.personality?.fears || [],
            desires: data.personality?.desires || [],
            flaws: data.personality?.flaws || [],
            strengths: data.personality?.strengths || [],
            temperament: data.personality?.temperament || '',
            communication_style: data.personality?.communication_style || '',
          },
          background: {
            origin: data.background?.origin || '',
            occupation: data.background?.occupation || '',
            education: data.background?.education || '',
            family: data.background?.family || '',
            significant_events: data.background?.significant_events || [],
            current_situation: data.background?.current_situation || '',
          },
          relationships: data.relationships || [],
          role: {
            archetype: data.role?.archetype || '',
            narrative_function: data.role?.narrative_function || '',
            character_arc: data.role?.character_arc || '',
          },
        };

        // Emit event even on persistence failure
        eventEmitter.emit(
          CharacterEventType.CHARACTER_CREATED,
          createCharacterCreatedPayload(
            character,
            'wizard',
            storyContext?.storyName
          )
        );

        onComplete(character, storyContext);
      }
    },
    [onComplete, saveCharacter, storyContext]
  );

  // Create a callback for WizardContainer that triggers completion
  // The actual character data is handled by handleSubmit (passed to WizardProvider.onSubmit)
  // This callback is called after submitWizard() completes successfully
  const handleWizardComplete = useCallback(() => {
    // This callback is called by WizardNavigation when user clicks "Complete"
    // The character has already been created and onComplete(character) was called by handleSubmit
    // This is just a notification that the wizard finished successfully
    console.log('[CharacterWizard] Wizard completion confirmed');
  }, []);

  // ============================================================================
  // Render Step Content
  // ============================================================================

  const renderStepContent = (currentStep: number) => {
    switch (currentStep) {
      case 1:
        return <Step1BasicIdentity worldContext={worldContext} storyContext={storyContext} />;
      case 2:
        return <Step2PhysicalAppearance worldContext={worldContext} storyContext={storyContext} />;
      case 3:
        return <Step3Personality storyContext={storyContext} />;
      case 4:
        return <Step4Background worldContext={worldContext} storyContext={storyContext} />;
      case 5:
        return <Step5Relationships storyContext={storyContext} />;
      case 6:
        return <Step6ReviewFinalize storyContext={storyContext} />;
      default:
        return null;
    }
  };


  // ============================================================================
  // CONDITIONAL RENDERING (after all hooks)
  // ============================================================================


  return (
    <WizardProvider<Character>
      wizardType="character"
      totalSteps={6}
      initialData={initialData || createEmptyCharacter()}
      onSubmit={handleSubmit}
      onValidateStep={validateStep}
      autoSave={true}
      autoSaveDelay={2000}
    >
      <CharacterWizardContent
        steps={WIZARD_STEPS}
        onCancel={onCancel}
        worldContext={worldContext}
        storyContext={storyContext}
        onComplete={handleWizardComplete}
        renderStepContent={renderStepContent}
      />
    </WizardProvider>
  );
}

