import React, { useCallback, useState, useEffect } from 'react';
import { WizardProvider, useWizard } from '@/contexts/WizardContext';
import { ProductionWizardContainer as WizardContainer } from '../production-wizards/ProductionWizardContainer';
import type { WizardStep } from '@/types';
import type { Story } from '@/types/story';
import { createEmptyStory } from '@/types/story';
import { useStore } from '@/store';
import { Step1StorySetup } from './Step1StorySetup';
import { Step2CharacterSelection } from './Step2CharacterSelection';
import { Step3LocationSelection } from './Step3LocationSelection';
import { Step4StoryGeneration } from './Step4StoryGeneration';
import { Step5ReviewExport } from './Step5ReviewExport';
import { saveStoryToDisk } from '@/utils/storyFileIO';
import { toast } from '@/utils/toast';
import { Button } from '@/components/ui/button';
import { FileText, Plus, RefreshCw } from 'lucide-react';

// ============================================================================
// Storyteller Wizard Component - Updated to use hasSavedProgress
// ============================================================================

export interface StorytellerWizardProps {
  onComplete: (story: Story) => void;
  onCancel: () => void;
  initialData?: Partial<Story>;
}

const WIZARD_STEPS: WizardStep[] = [
  { number: 1, title: 'Story Setup', description: 'Genre, tone, and length' },
  { number: 2, title: 'Characters', description: 'Select or create' },
  { number: 3, title: 'Locations', description: 'Select or create' },
  { number: 4, title: 'Generate', description: 'AI story creation' },
  { number: 5, title: 'Review & Export', description: 'Finalize and save' },
];

// ============================================================================
// Storyteller Wizard Content
// ============================================================================

interface StorytellerWizardContentProps {
  steps: WizardStep[];
  onCancel: () => void;
  renderStepContent: (step: number) => React.ReactNode;
}

function StorytellerWizardContent({ steps, onCancel, renderStepContent }: StorytellerWizardContentProps) {
  const { currentStep } = useWizard();

  return (
    <WizardContainer
      title="Create Story"
      steps={steps}
      onCancel={onCancel}
      allowJumpToStep={false}
      showAutoSaveIndicator={true}
    >
      {renderStepContent(currentStep)}
    </WizardContainer>
  );
}

// ============================================================================
// Continue Dialog Component - Shown when hasSavedProgress() returns true
// ============================================================================

interface ContinueDialogProps {
  onContinuePrevious: () => void;
  onStartFresh: () => void;
  isLoading: boolean;
}

function ContinueDialog({ onContinuePrevious, onStartFresh, isLoading }: ContinueDialogProps) {
  return (
    <div className="flex items-center justify-center h-[500px]">
      <div className="text-center p-8 max-w-md">
        <FileText className="w-16 h-16 mx-auto mb-4 text-primary" />
        <h2 className="text-xl font-bold mb-2">Saved Progress Found</h2>
        <p className="text-muted-foreground mb-6">
          You have saved progress from a previous session. Would you like to continue where you left off or start fresh?
        </p>
        <div className="flex gap-4 justify-center">
          <Button onClick={onContinuePrevious} className="gap-2" disabled={isLoading}>
            {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            Continue Previous
          </Button>
          <Button onClick={onStartFresh} variant="outline" className="gap-2" disabled={isLoading}>
            <Plus className="w-4 h-4" />
            Start Fresh
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Storyteller Wizard Inner - Has access to wizard context via useWizard()
// ============================================================================

interface StorytellerWizardInnerProps {
  steps: WizardStep[];
  onCancel: () => void;
  renderStepContent: (step: number) => React.ReactNode;
}

function StorytellerWizardInner({ steps, onCancel, renderStepContent }: StorytellerWizardInnerProps) {
  const { hasSavedProgress, loadProgress, clearSavedProgress } = useWizard();
  const [showContinueDialog, setShowContinueDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [wizardReady, setWizardReady] = useState(false);

  // Check for saved progress on mount using hasSavedProgress()
  useEffect(() => {
    if (hasSavedProgress()) {
      setShowContinueDialog(true);
    } else {
      setWizardReady(true);
    }
  }, [hasSavedProgress]);

  // Handle continue previous - call loadProgress() manually
  const handleContinuePrevious = useCallback(() => {
    setIsLoading(true);
    try {
      loadProgress();
      setShowContinueDialog(false);
      setWizardReady(true);
      toast.success('Progress Loaded', 'Your previous progress has been restored');
    } catch (error) {
      console.error('Failed to load progress:', error);
      toast.error('Load Failed', 'Failed to load saved progress');
    } finally {
      setIsLoading(false);
    }
  }, [loadProgress]);

  // Handle start fresh - call clearSavedProgress()
  const handleStartFresh = useCallback(() => {
    try {
      clearSavedProgress();
      setShowContinueDialog(false);
      setWizardReady(true);
    } catch (error) {
      console.error('Failed to clear progress:', error);
      // Still proceed even if clear fails
      setShowContinueDialog(false);
      setWizardReady(true);
    }
  }, [clearSavedProgress]);

  // Show continue dialog if hasSavedProgress() returned true
  if (showContinueDialog) {
    return (
      <ContinueDialog
        onContinuePrevious={handleContinuePrevious}
        onStartFresh={handleStartFresh}
        isLoading={isLoading}
      />
    );
  }

  // Show loading state while initializing
  if (!wizardReady) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 mx-auto mb-4 animate-spin" />
          <p className="text-muted-foreground">Initializing wizard...</p>
        </div>
      </div>
    );
  }

  return (
    <StorytellerWizardContent
      steps={steps}
      onCancel={onCancel}
      renderStepContent={renderStepContent}
    />
  );
}

// ============================================================================
// Main Storyteller Wizard Component
// ============================================================================

export function StorytellerWizard({ onComplete, onCancel, initialData }: StorytellerWizardProps) {
  const addStory = useStore((state) => state.addStory);
  const currentProject = useStore((state) => state.project);

  const getInitialStoryData = useCallback((): Partial<Story> => {
    const baseData = initialData || createEmptyStory();

    if (currentProject?.metadata) {
      const projectMeta = currentProject.metadata;
      return {
        ...baseData,
        genre: (projectMeta.genre as string[]) || baseData.genre,
        tone: (projectMeta.tone as string[]) || baseData.tone,
        length: projectMeta.projectType === 'court-metrage' ? 'scene' :
          projectMeta.projectType === 'moyen-metrage' ? 'short_story' :
            projectMeta.projectType === 'long-metrage-standard' ? 'novella' :
              projectMeta.projectType === 'long-metrage-premium' ? 'novel' :
                projectMeta.projectType === 'tres-long-metrage' ? 'epic_novel' :
                  baseData.length,
      };
    }
    return baseData;
  }, [currentProject, initialData]);

  const validateStep = useCallback(
    async (step: number, data: Record<string, unknown>): Promise<Record<string, string[]>> => {
      const errors: Record<string, string[]> = {};

      switch (step) {
        case 1:
          // Allow empty - will use project defaults
          break;
        case 2:
        case 3:
          break;
        case 4:
          break;
        case 5:
          if (!data.generatedContent || (data.generatedContent as string).trim() === '') {
            errors.content = ['Story content is required'];
          }
          if (!data.generatedSummary || (data.generatedSummary as string).trim() === '') {
            errors.summary = ['Story summary is required'];
          }
          break;
      }
      return errors;
    },
    []
  );

  const handleSubmit = useCallback(
    async (data: Record<string, unknown>) => {
      const selectedChars = (data.selectedCharacters as Array<{ id: string }>) || [];
      const characterRefs = selectedChars.map(c => ({ id: c.id })) as Story['charactersUsed'];
      const selectedLocs = (data.selectedLocations as Array<{ id: string; name: string }>) || [];
      const locationRefs = selectedLocs.map(l => ({ id: l.id, name: l.name, significance: 'present' })) as Story['locationsUsed'];

      const story: Story = {
        id: crypto.randomUUID(),
        title: (data.title as string) || 'Untitled Story',
        content: (data.generatedContent as string) || '',
        summary: (data.generatedSummary as string) || '',
        genre: (data.genre as string[]) || [],
        tone: (data.tone as string[]) || [],
        length: (data.length as Story['length']) || 'medium',
        charactersUsed: characterRefs,
        locationsUsed: locationRefs,
        autoGeneratedElements: (data.autoGeneratedElements as Story['autoGeneratedElements']) || [],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
        worldId: data.worldId as string | undefined,
        parts: data.parts as Story['parts'],
        fileFormat: 'md',
      };

      addStory(story);

      // Save story to disk if Electron API is available and project has a valid path
      const projectPath = currentProject?.path || currentProject?.project_name;
      if (window.electronAPI?.fs && projectPath) {
        try {
          console.log('[StorytellerWizard] Saving story to disk at path:', projectPath);
          await saveStoryToDisk(projectPath, story);
          toast.success('Story Saved', 'Your story has been saved to disk');
        } catch (error) {
          console.error('[StorytellerWizard] Failed to save story to disk:', error);
          toast.error('Save Failed', 'Failed to save story to disk');
        }
      } else {
        console.warn('[StorytellerWizard] Cannot save to disk - missing project path or Electron API');
        // Story is still saved to store (addStory was called above)
        toast.info('Story Created', 'Story saved to application state');
      }

      window.dispatchEvent(new CustomEvent('story-created', { detail: { story } }));
      onComplete(story);
    },
    [onComplete, addStory, currentProject]
  );

  const renderStepContent = (currentStep: number) => {
    switch (currentStep) {
      case 1: return <Step1StorySetup />;
      case 2: return <Step2CharacterSelection />;
      case 3: return <Step3LocationSelection />;
      case 4: return <Step4StoryGeneration />;
      case 5: return <Step5ReviewExport />;
      default: return null;
    }
  };

  return (
    <WizardProvider
      wizardType="storyteller"
      totalSteps={5}
      initialData={getInitialStoryData()}
      onSubmit={handleSubmit as (data: unknown) => Promise<void>}
      onValidateStep={validateStep as (step: number, data: unknown) => Promise<Record<string, string[]>>}
      autoSave={true}
      autoSaveDelay={2000}
      autoLoad={false}
    >
      <StorytellerWizardInner
        steps={WIZARD_STEPS}
        onCancel={onCancel}
        renderStepContent={renderStepContent}
      />
    </WizardProvider>
  );
}
