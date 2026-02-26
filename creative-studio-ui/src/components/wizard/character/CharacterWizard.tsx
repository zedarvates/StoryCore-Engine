/**
 * Character Wizard Component
 * 
 * Refined 3-step character creator with:
 * - Premium visuals (rounded corners, clean elevations)
 * - Modular architecture (separate step components)
 * - Integrated AI assistants
 * - Character presets
 */

import React, { useState, useCallback, useMemo } from 'react';
import { WizardErrorBoundary } from '../WizardErrorBoundary';
import { WizardStepIndicator, WizardStep } from '../WizardStepIndicator';
import { WizardNavigation } from '../WizardNavigation';
import { useCharacterPersistence } from '@/hooks/useCharacterPersistence';
import { useAppStore } from '@/stores/useAppStore';
import { eventEmitter, CharacterEventType, createCharacterCreatedPayload } from '@/services/eventEmitter';
import { saveWizardState } from '@/utils/wizardStorage';
import type { Character } from '@/types/character';
import { createEmptyCharacter } from '@/types/character';
import type { World } from '@/types/world';

// Subcomponents
import { IdentityStep } from './steps/IdentityStep';
import { EssenceStep } from './steps/EssenceStep';
import { ChroniclesStep } from './steps/ChroniclesStep';
import { CharacterPreset } from './presets';

export interface CharacterWizardProps {
  onComplete: (character: Character) => void;
  onCancel: () => void;
  worldContext?: World;
  initialData?: Partial<Character>;
}

export function CharacterWizard({
  onComplete,
  onCancel,
  worldContext,
  initialData,
}: CharacterWizardProps) {
  // State
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<Partial<Character>>(initialData || createEmptyCharacter());
  const [lastSaved, setLastSaved] = useState<Date | undefined>();

  const { saveCharacter } = useCharacterPersistence();
  const setShowLLMSettings = useAppStore((state) => state.setShowLLMSettings);

  // Steps definition
  const steps: WizardStep[] = [
    { number: 1, title: 'Foundations', description: 'Template & Identity' },
    { number: 2, title: 'Essence', description: 'Psychology & Form' },
    { number: 3, title: 'Chronicles', description: 'Nexus & History' },
  ];

  // Data update
  const updateData = useCallback((newData: Partial<Character>) => {
    setData((prev) => ({ ...prev, ...newData }));
  }, []);

  // Apply preset
  const applyPreset = useCallback((preset: CharacterPreset) => {
    if (preset.id === 'fresh') {
      setData(createEmptyCharacter());
      return;
    }

    setData((prev) => ({
      ...prev,
      role: {
        ...prev.role,
        archetype: preset.archetype,
      } as Character['role'],
      personality: {
        ...prev.personality,
        traits: preset.traits,
      } as Character['personality'],
      visual_identity: {
        ...prev.visual_identity,
        appearance: preset.appearance || '',
        clothing_style: preset.clothing || '',
      } as Character['visual_identity'],
    }));
  }, []);

  const handleFinish = useCallback(async () => {
    try {
      // Ensure we have a valid character object
      const characterToSave: Partial<Character> = {
        ...data,
        character_id: data.character_id || crypto.randomUUID(),
        name: data.name || 'Unnamed Character',
        creation_method: 'wizard',
        creation_timestamp: Date.now(),
        version: '1.0',
      };

      // Persist via hook
      const savedCharacter = await saveCharacter(characterToSave);

      // Emit event
      eventEmitter.emit(
        CharacterEventType.CHARACTER_CREATED,
        createCharacterCreatedPayload(savedCharacter, 'wizard')
      );

      onComplete(savedCharacter);
    } catch (error) {
      console.error('[CharacterWizard] Failed to save character:', error);
      alert('An error occurred while saving the character. Please try again.');
    }
  }, [data, saveCharacter, onComplete]);

  // Render current step content
  const stepContent = useMemo(() => {
    switch (currentStep) {
      case 1:
        return (
          <IdentityStep 
            data={data} 
            onUpdate={updateData} 
            onApplyPreset={applyPreset} 
          />
        );
      case 2:
        return (
          <EssenceStep 
            data={data} 
            onUpdate={updateData}
            worldContext={worldContext}
          />
        );
      case 3:
        return (
          <ChroniclesStep 
            data={data} 
            onUpdate={updateData} 
            worldContext={worldContext}
          />
        );
      default:
        return null;
    }
  }, [currentStep, data, updateData, applyPreset, worldContext]);

  const isStepValid = useMemo(() => {
    if (currentStep === 1) return !!data.name?.trim() && !!data.role?.archetype;
    return true;
  }, [currentStep, data]);

  return (
    <WizardErrorBoundary wizardType="character">
      <div className="flex flex-col h-full max-w-6xl mx-auto bg-gray-50/30 dark:bg-gray-950/30">
        {/* Header Area */}
        <div className="px-8 pt-8 pb-4">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                Character Synthesis
                <span className="text-xs font-bold uppercase py-1 px-2 bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 rounded-md tracking-widest">v2.0</span>
              </h2>
              <p className="text-gray-500 dark:text-gray-400 font-medium mt-1">
                Establish the fundamental signatures of a new consciousness.
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <button 
                onClick={onCancel}
                className="text-sm font-bold text-gray-400 hover:text-red-500 transition-colors uppercase tracking-widest"
              >
                Abort Synthesis
              </button>
              <button 
                onClick={() => setShowLLMSettings(true)}
                className="text-[10px] font-black uppercase tracking-widest text-blue-500 hover:text-blue-600 underline decoration-blue-500/30 underline-offset-4"
              >
                LLM Configuration
              </button>
            </div>
          </div>

          <WizardStepIndicator 
            steps={steps} 
            currentStep={currentStep} 
          />
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-8 py-4 custom-scrollbar">
          <div className="max-w-4xl mx-auto pb-12">
            {stepContent}
          </div>
        </div>

        {/* Navigation Area */}
        <div className="px-8 py-6 border-t border-gray-100 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-md">
          <div className="max-w-4xl mx-auto">
            <WizardNavigation
              currentStep={currentStep}
              totalSteps={steps.length}
              onNext={() => setCurrentStep((s) => s + 1)}
              onBack={() => setCurrentStep((s) => s - 1)}
              canGoNext={isStepValid}
              canGoBack={currentStep > 1}
              canSkip={false}
              onSkip={() => {}}
              onSaveDraft={() => {
                const success = saveWizardState('character', currentStep, data);
                if (success) setLastSaved(new Date());
              }}
              onSubmit={handleFinish}
              lastSaved={lastSaved}
            />
          </div>
        </div>
      </div>
    </WizardErrorBoundary>
  );
}


