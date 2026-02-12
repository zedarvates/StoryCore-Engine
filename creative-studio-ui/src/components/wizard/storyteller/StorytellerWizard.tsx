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
import { 
  saveStoryToDisk, 
  loadStoryPartsFromDisk,
  storyToMarkdown, 
  markdownToStory 
} from '@/utils/storyFileIO';
import { toast } from '@/utils/toast';

// ============================================================================
// Storyteller Wizard Component - LLM-Optimized Version
// ============================================================================

export interface StorytellerWizardProps {
  onComplete: (story: Story) => void;
  onCancel: () => void;
  initialData?: Partial<Story>;
}

const WIZARD_STEPS: WizardStep[] = [
  {
    number: 1,
    title: 'Story Setup',
    description: 'Genre, tone, and length',
  },
  {
    number: 2,
    title: 'Characters',
    description: 'Select or create',
  },
  {
    number: 3,
    title: 'Locations',
    description: 'Select or create',
  },
  {
    number: 4,
    title: 'Generate',
    description: 'AI story creation',
  },
  {
    number: 5,
    title: 'Review & Export',
    description: 'Finalize and save',
  },
];

// ============================================================================
// Storyteller Wizard Content (uses wizard context)
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

export function StorytellerWizard({ onComplete, onCancel, initialData }: StorytellerWizardProps) {
  // Get store actions
  const addStory = useStore((state) => state.addStory);
  const currentProject = useStore((state) => state.project);

  // Loading state for file operations
  const [isLoadingStory, setIsLoadingStory] = useState(false);
  const [loadedStoryData, setLoadedStoryData] = useState<Partial<Story> | null>(null);

  // ============================================================================
  // Pre-fill with project metadata
  // ============================================================================

  const getInitialStoryData = useCallback((): Partial<Story> => {
    const baseData = initialData || createEmptyStory();

    if (currentProject?.metadata) {
      const projectMeta = currentProject.metadata;

      return {
        ...baseData,
        genre: projectMeta.genre || baseData.genre,
        tone: projectMeta.tone || baseData.tone,
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

  // ============================================================================
  // Load story parts on mount (if project exists)
  // ============================================================================

  useEffect(() => {
    const loadExistingStory = async () => {
      if (!window.electronAPI || !currentProject) {
        return;
      }

      setIsLoadingStory(true);

      try {
        const projectPath = currentProject.path || currentProject.project_name;
        
        // Try to load parts from the new LLM-optimized structure
        const parts = await loadStoryPartsFromDisk(projectPath);
        
        if (parts && parts.length > 0) {
          // Combine parts into story content
          const combinedContent = parts.map(p => `### ${p.title}\n\n${p.content}`).join('\n\n');
          const lastPart = parts[parts.length - 1];
          
          setLoadedStoryData({
            ...getInitialStoryData(),
            content: combinedContent,
            summary: lastPart.summary,
            parts: parts,
          });

          toast.success(
            'Story Loaded',
            `Loaded ${parts.length} story parts from LLM-optimized files`
          );
        } else {
          // Fallback to legacy story.md
          const storyFilePath = `${projectPath}/story.md`;
          const exists = await window.electronAPI.fs.exists(storyFilePath);

          if (exists) {
            const fileBuffer = await window.electronAPI.fs.readFile(storyFilePath);
            const markdown = fileBuffer.toString('utf-8');
            const story = markdownToStory(markdown, getInitialStoryData());

            setLoadedStoryData(story);

            toast.success(
              'Story Loaded',
              'Existing story content has been loaded from story.md'
            );
          }
        }
      } catch (error) {
        console.warn('Failed to load story:', error);
      } finally {
        setIsLoadingStory(false);
      }
    };

    loadExistingStory();
  }, [currentProject, getInitialStoryData]);

  // ============================================================================
  // Validation
  // ============================================================================

  const validateStep = useCallback(
    async (step: number, data: unknown): Promise<Record<string, string[]>> => {
      const errors: Record<string, string[]> = {};

      switch (step) {
        case 1:
          // Validate genre - allow empty initially (will use project defaults)
          if (data.genre !== undefined && Array.isArray(data.genre) && data.genre.length === 0) {
            // Warning only, not blocking
            console.warn('[StorytellerWizard] No genre selected, will use project defaults');
          }
          // Validate tone - allow empty initially (will use project defaults)
          if (data.tone !== undefined && Array.isArray(data.tone) && data.tone.length === 0) {
            // Warning only, not blocking
            console.warn('[StorytellerWizard] No tone selected, will use project defaults');
          }
          // Validate length - allow empty initially (will use project defaults)
          if (data.length !== undefined && data.length === '') {
            // Warning only, not blocking
            console.warn('[StorytellerWizard] No length selected, will use project defaults');
          }
          break;

        case 2:
        case 3:
          // Optional - no validation required
          break;

        case 4:
          // Story generation step - allow skipping
          // No blocking validation needed
          break;

        case 5:
          // Review step - validate that story content exists (but allow placeholder)
          if (!data.generatedContent || data.generatedContent.trim() === '') {
            errors.content = ['Story content is required. You can enter it manually if generation was skipped.'];
          }
          if (!data.generatedSummary || data.generatedSummary.trim() === '') {
            errors.summary = ['Story summary is required. You can enter it manually if generation was skipped.'];
          }
          break;
      }

      // Debug logging for validation
      if (Object.keys(errors).length > 0) {
        console.log('[StorytellerWizard] Validation errors for step', step, ':', errors);
      }

      return errors;
    },
    []
  );

  // ============================================================================
  // Submission - Save with LLM-Optimized Format
  // ============================================================================

  const handleSubmit = useCallback(
    async (data: unknown) => {
      const characterIds = (data.selectedCharacters || []).map((c: unknown) => c.id);

      const story: Story = {
        id: crypto.randomUUID(),
        title: data.title || 'Untitled Story',
        content: data.generatedContent || '',
        summary: data.generatedSummary || '',
        genre: data.genre || [],
        tone: data.tone || [],
        length: data.length || 'medium',
        charactersUsed: characterIds,
        locationsUsed: data.selectedLocations || [],
        autoGeneratedElements: data.autoGeneratedElements || [],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
        worldId: data.worldId,
        parts: data.parts,
        fileFormat: 'md',
      };

      // Add to store
      addStory(story);

      // Save story to disk with LLM-optimized format
      if (window.electronAPI && currentProject) {
        try {
          const projectPath = currentProject.path || currentProject.project_name;
          await saveStoryToDisk(projectPath, story);

          toast.success(
            'Story Saved',
            'Your story has been saved with LLM-optimized structure (intro, chapters, ending, summary)'
          );
        } catch (error) {
          console.error('Failed to save story to disk:', error);
          toast.error(
            'Save Failed',
            'Failed to save story to disk. The story is still saved in the application.'
          );
        }
      }

      // Emit event
      window.dispatchEvent(
        new CustomEvent('story-created', {
          detail: { story },
        })
      );

      onComplete(story);
    },
    [onComplete, addStory, currentProject]
  );

  // ============================================================================
  // Render Step Content
  // ============================================================================

  const renderStepContent = (currentStep: number) => {
    switch (currentStep) {
      case 1:
        return <Step1StorySetup />;
      case 2:
        return <Step2CharacterSelection />;
      case 3:
        return <Step3LocationSelection />;
      case 4:
        return <Step4StoryGeneration />;
      case 5:
        return <Step5ReviewExport />;
      default:
        return null;
    }
  };

  return (
    <WizardProvider
      wizardType="storyteller"
      totalSteps={5}
      initialData={loadedStoryData || getInitialStoryData()}
      onSubmit={handleSubmit}
      onValidateStep={validateStep}
      autoSave={true}
      autoSaveDelay={2000}
    >
      {isLoadingStory ? (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading story...</p>
          </div>
        </div>
      ) : (
        <StorytellerWizardContent
          steps={WIZARD_STEPS}
          onCancel={onCancel}
          renderStepContent={renderStepContent}
        />
      )}
    </WizardProvider>
  );
}


