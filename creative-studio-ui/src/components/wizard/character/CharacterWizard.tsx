import React, { useCallback } from 'react';
import { WizardProvider, useWizard } from '@/contexts/WizardContext';
import { WizardContainer } from '../WizardContainer';
import type { WizardStep } from '../WizardStepIndicator';
import type { Character } from '@/types/character';
import { createEmptyCharacter } from '@/types/character';
import type { World } from '@/types/world';
import { useCharacterPersistence } from '@/hooks/useCharacterPersistence';
import { Step1BasicIdentity } from './Step1BasicIdentity';
import { Step2PhysicalAppearance } from './Step2PhysicalAppearance';
import { Step3Personality } from './Step3Personality';
import { Step4Background } from './Step4Background';
import { Step5Relationships } from './Step5Relationships';
import { Step6ReviewFinalize } from './Step6ReviewFinalize';

// ============================================================================
// Character Wizard Component
// ============================================================================

export interface CharacterWizardProps {
  onComplete: (character: Character) => void;
  onCancel: () => void;
  worldContext?: World;
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
  renderStepContent: (step: number) => React.ReactNode;
}

function CharacterWizardContent({
  steps,
  onCancel,
  renderStepContent,
}: CharacterWizardContentProps) {
  const { currentStep } = useWizard<Character>();

  return (
    <WizardContainer
      title="Create Character"
      steps={steps}
      onCancel={onCancel}
      allowJumpToStep={false}
      showAutoSaveIndicator={true}
    >
      {renderStepContent(currentStep)}
    </WizardContainer>
  );
}

export function CharacterWizard({
  onComplete,
  onCancel,
  worldContext,
  initialData,
}: CharacterWizardProps) {
  // ============================================================================
  // Character Persistence
  // ============================================================================

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
          if (!data.visual_identity?.age_range || data.visual_identity.age_range.trim() === '') {
            errors.age_range = ['Age range is required'];
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

        // Emit event for other components to subscribe to
        window.dispatchEvent(
          new CustomEvent('character-created', {
            detail: { character: savedCharacter },
          })
        );

        // Call the onComplete callback with saved character
        onComplete(savedCharacter);
      } catch (error) {
        console.error('Failed to save character:', error);
        
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
            height: data.visual_identity?.height || '',
            build: data.visual_identity?.build || '',
            posture: data.visual_identity?.posture || '',
            clothing_style: data.visual_identity?.clothing_style || '',
            color_palette: data.visual_identity?.color_palette || [],
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

        onComplete(character);
      }
    },
    [onComplete, saveCharacter]
  );

  // ============================================================================
  // Render Step Content
  // ============================================================================

  const renderStepContent = (currentStep: number) => {
    switch (currentStep) {
      case 1:
        return <Step1BasicIdentity worldContext={worldContext} />;
      case 2:
        return <Step2PhysicalAppearance worldContext={worldContext} />;
      case 3:
        return <Step3Personality />;
      case 4:
        return <Step4Background worldContext={worldContext} />;
      case 5:
        return <Step5Relationships />;
      case 6:
        return <Step6ReviewFinalize />;
      default:
        return null;
    }
  };

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
        renderStepContent={renderStepContent}
      />
    </WizardProvider>
  );
}
