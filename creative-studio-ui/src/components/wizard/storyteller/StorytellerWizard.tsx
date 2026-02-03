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
import { loadStoryFromFile, saveStoryToFile, saveStoryToDisk, storyToMarkdown, markdownToStory } from '@/utils/storyFileIO';
import { toast } from '@/utils/toast';

// ============================================================================
// Storyteller Wizard Component
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

  // Merge initialData with project metadata if available
  const getInitialStoryData = useCallback((): Partial<Story> => {
    const baseData = initialData || createEmptyStory();

    // If project has metadata, pre-fill story setup
    if (currentProject?.metadata) {
      const projectMeta = currentProject.metadata;

      return {
        ...baseData,
        // Pre-fill genre if available from project
        genre: projectMeta.genre || baseData.genre,
        // Pre-fill tone if available from project
        tone: projectMeta.tone || baseData.tone,
        // Pre-fill length based on project type
        length: projectMeta.projectType === 'court-metrage' ? 'scene' :
          projectMeta.projectType === 'moyen-metrage' ? 'short_story' :
            projectMeta.projectType === 'long-metrage-standard' ? 'novella' :
              projectMeta.projectType === 'long-metrage-premium' ? 'novel' :
                projectMeta.projectType === 'tres-long-metrage' ? 'epic_novel' :
                  baseData.length,
        // Keep other fields from baseData
      };
    }

    return baseData;
  }, [currentProject, initialData]);

  // ============================================================================
  // Load story.md on mount (if project exists)
  // ============================================================================

  useEffect(() => {
    const loadExistingStory = async () => {
      // Only attempt to load if we have Electron API and a current project
      if (!window.electronAPI || !currentProject) {
        return;
      }

      setIsLoadingStory(true);

      try {
        // Get project path from project name
        // In Electron, projects are stored in a known location
        const projectPath = currentProject.project_name;

        // Check if story.md exists
        const storyFilePath = `${projectPath}/story.md`;
        const exists = await window.electronAPI.fs.exists(storyFilePath);

        if (exists) {
          // Read the story.md file
          const fileBuffer = await window.electronAPI.fs.readFile(storyFilePath);
          const markdown = fileBuffer.toString('utf-8');

          // Parse markdown to Story object
          const story = markdownToStory(markdown, getInitialStoryData());

          setLoadedStoryData(story);

          toast.success(
            'Story Loaded',
            'Existing story content has been loaded from story.md'
          );
        }
      } catch (error) {
        console.warn('Failed to load story.md:', error);
        // Don't show error toast - missing file is expected for new projects
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
    async (step: number, data: any): Promise<Record<string, string[]>> => {
      const errors: Record<string, string[]> = {};

      switch (step) {
        case 1: // Story Setup
          if (!data.genre || data.genre.length === 0) {
            errors.genre = ['At least one genre must be selected'];
          }
          if (!data.tone || data.tone.length === 0) {
            errors.tone = ['At least one tone must be selected'];
          }
          if (!data.length) {
            errors.length = ['Story length must be selected'];
          }
          break;

        case 2: // Character Selection
          // Optional - characters can be empty
          break;

        case 3: // Location Selection
          // Optional - locations can be empty
          break;

        case 4: // Story Generation
          // Validation happens during generation
          if (!data.generatedContent) {
            errors.generation = ['Story content must be generated before proceeding'];
          }
          break;

        case 5: // Review & Export
          // Final validation
          if (!data.generatedContent || data.generatedContent.trim() === '') {
            errors.content = ['Story content is required'];
          }
          if (!data.generatedSummary || data.generatedSummary.trim() === '') {
            errors.summary = ['Story summary is required'];
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
    async (data: any) => {
      // Extract character IDs from selected characters
      const characterIds = (data.selectedCharacters || []).map((c: any) => c.id);

      // Create complete story object
      const story: Story = {
        id: crypto.randomUUID(),
        title: data.title || 'Untitled Story',
        content: data.generatedContent || '',
        summary: data.generatedSummary || '',
        genre: data.genre || [],
        tone: data.tone || [],
        length: data.length || 'medium',
        charactersUsed: characterIds, // Use character IDs (Requirement: 4.5)
        locationsUsed: data.selectedLocations || [],
        autoGeneratedElements: data.autoGeneratedElements || [],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
        worldId: data.worldId,
      };

      // Add to store (which also persists to localStorage)
      addStory(story);

      // Save story to disk if we have Electron API and a project
      if (window.electronAPI && currentProject) {
        try {
          const projectPath = currentProject.path || currentProject.project_name;
          await saveStoryToDisk(projectPath, story);

          toast.success(
            'Story Saved',
            'Your story has been saved with its individual chapters.'
          );
        } catch (error) {
          console.error('Failed to save story to disk:', error);
          toast.error(
            'Save Failed',
            'Failed to save story to disk. The story is still saved in the application.'
          );
        }
      }

      // Save story metadata to project if available
      if (currentProject) {
        // Story is already saved to localStorage via store
        // Additional project-level metadata could be saved here if needed
      }

      // Emit event for other components to subscribe to
      window.dispatchEvent(
        new CustomEvent('story-created', {
          detail: { story },
        })
      );

      // Call the onComplete callback
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
