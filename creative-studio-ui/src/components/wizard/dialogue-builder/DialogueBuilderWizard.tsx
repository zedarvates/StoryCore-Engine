/**
 * Dialogue Builder Wizard
 * 
 * A 3-step interactive wizard for crafting cinematic dialogue:
 * 1. Scene Setup: Context, Characters, and Tone.
 * 2. Dialogue Draft: AI-assisted line generation and manual refining.
 * 3. Review & Direct: Final polish and direct output to LipSync or Storyboard.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { WizardErrorBoundary } from '../WizardErrorBoundary';
import { WizardStepIndicator, WizardStep } from '../WizardStepIndicator';
import { WizardNavigation } from '../WizardNavigation';
import { useAppStore } from '@/stores/useAppStore';
import { saveWizardState } from '@/utils/wizardStorage';

// Subcomponents
import { SceneSetupStep } from './steps/SceneSetupStep';
import { DialogueDraftStep } from './steps/DialogueDraftStep';
import { ReviewDirectStep } from './steps/ReviewDirectStep';

export interface DialogueBuilderData {
  sceneContext: string;
  participants: string[];
  tone: string;
  generatedDialogue: string;
  isGenerating?: boolean;
}

export interface DialogueBuilderWizardProps {
  onComplete: (data: DialogueBuilderData, result?: string) => void;
  onCancel: () => void;
  initialData?: Partial<DialogueBuilderData>;
}

export function DialogueBuilderWizard({
  onComplete,
  onCancel,
  initialData,
}: DialogueBuilderWizardProps) {
  // State
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<DialogueBuilderData>({
    sceneContext: initialData?.sceneContext || '',
    participants: initialData?.participants || [],
    tone: initialData?.tone || 'Casual',
    generatedDialogue: initialData?.generatedDialogue || '',
    isGenerating: initialData?.isGenerating || false,
  });
  const [lastSaved, setLastSaved] = useState<Date | undefined>();

  const setShowLipSyncWizard = useAppStore(state => state.setShowLipSyncWizard);

  // Steps definition
  const steps: WizardStep[] = [
    { number: 1, title: 'Scene Setup', description: 'Context & Voice' },
    { number: 2, title: 'Drafting', description: 'Dialogue Generation' },
    { number: 3, title: 'Review', description: 'Polish & Direct' },
  ];

  // Data update
  const updateData = useCallback((newData: Partial<DialogueBuilderData>) => {
    setData((prev: DialogueBuilderData) => ({ ...prev, ...newData }));
  }, []);

  const handleFinish = useCallback(async () => {
    onComplete(data, data.generatedDialogue);
  }, [data, onComplete]);

  const handleLipSync = useCallback(() => {
    onComplete(data, data.generatedDialogue);
    setShowLipSyncWizard(true, {
      audioFile: undefined, 
    });
  }, [data, onComplete, setShowLipSyncWizard]);

  const handleGenerate = useCallback(async () => {
    updateData({ isGenerating: true });
    // Mock generation delay
    setTimeout(() => {
      updateData({ 
        isGenerating: false, 
        generatedDialogue: "CHARACTER 1\n(softly)\nWe've been through this before. The story doesn't end here.\n\nCHARACTER 2\n(looking away)\nMaybe for you it doesn't. For me, it was over the moment we left the city." 
      });
    }, 2000);
  }, [updateData]);

  // Render current step content
  const stepContent = useMemo(() => {
    switch (currentStep) {
      case 1:
        return (
          <SceneSetupStep 
            data={data} 
            onUpdate={updateData} 
          />
        );
      case 2:
        return (
          <DialogueDraftStep 
            data={data} 
            onGenerate={handleGenerate}
            onUpdate={updateData}
          />
        );
      case 3:
        return (
          <ReviewDirectStep 
            data={data} 
            onUpdate={updateData} 
            onLipSync={handleLipSync}
          />
        );
      default:
        return null;
    }
  }, [currentStep, data, updateData, handleLipSync, handleGenerate]);

  const isStepValid = useMemo(() => {
    if (currentStep === 1) return !!data.sceneContext?.trim() && data.participants?.length > 0;
    if (currentStep === 2) return !!data.generatedDialogue?.trim();
    return true;
  }, [currentStep, data]);

  return (
    <WizardErrorBoundary wizardType="dialogue-writer">
      <div className="flex flex-col h-full max-w-6xl mx-auto">
        {/* Header Area */}
        <div className="px-8 pt-8 pb-4">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                Dialogue Forge
                <span className="text-xs font-bold uppercase py-1 px-2 bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-300 rounded-md tracking-widest">v2.0</span>
              </h2>
              <p className="text-gray-500 dark:text-gray-400 font-medium mt-1">
                Craft sharp, character-driven dialogue with AI assistance.
              </p>
            </div>
            <button 
              onClick={onCancel}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              Cancel Forge
            </button>
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
                const success = saveWizardState('dialogue-writer', currentStep, data);
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
