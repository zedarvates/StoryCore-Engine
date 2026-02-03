import React, { useEffect, useState } from 'react';
import { useWizard } from '@/contexts/WizardContext';
import { WizardFormLayout } from '../WizardFormLayout';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Loader2, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { useStore } from '@/store';
import type { GenerationProgress, StoryGenerationParams, WorldContext } from '@/types/story';
import { generateStory } from '@/services/storyGenerationService';
import { Star, ScrollText, Layers, FileEdit } from 'lucide-react';

// ============================================================================
// Wizard Form Data Interface
// ============================================================================

interface StoryWizardFormData {
  title?: string;
  genre?: string[];
  tone?: string[];
  length?: 'short' | 'medium' | 'long';
  selectedCharacters?: Array<{ id: string; name: string; role: string }>;
  selectedLocations?: Array<{ id: string; name: string; significance: string }>;
  generatedContent?: string;
  generatedSummary?: string;
  parts?: any[];
}

// ============================================================================
// Generation Progress Component
// ============================================================================

interface GenerationProgressProps {
  progress: GenerationProgress;
}

function GenerationProgressComponent({ progress }: GenerationProgressProps) {
  const stageLabels: Record<string, string> = {
    preparing: 'Preparing generation...',
    creating_elements: 'Creating story elements...',
    generating_intro: 'Generating story introduction...',
    generating_chapter: `Generating chapter ${progress.currentChapter || 1} of ${progress.totalChapters || '?'}...`,
    generating_ending: 'Finalizing the story ending...',
    reviewing: 'Reviewing content quality...',
    refining: 'Refining story details...',
    generating_story: 'Generating story content...',
    creating_summary: 'Creating summary...',
    complete: 'Generation complete!',
  };

  const isError = !!progress.error;
  const isComplete = progress.stage === 'complete';

  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">{stageLabels[progress.stage]}</span>
          <span className="text-muted-foreground">{progress.progress}%</span>
        </div>
        <Progress value={progress.progress} className="h-2" />
      </div>

      {/* Current Task */}
      <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-900">
        {isError ? (
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
        ) : isComplete ? (
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
        ) : (
          <Loader2 className="w-5 h-5 text-blue-500 animate-spin flex-shrink-0" />
        )}
        <p className="text-sm text-muted-foreground">{progress.currentTask}</p>
      </div>

      {/* Error Message */}
      {isError && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-900 dark:text-red-100">
            <strong>Error:</strong> {progress.error}
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Story Preview Component
// ============================================================================

function StoryPartPreview({ part }: { part: any }) {
  const scores = part.reviewScore;

  return (
    <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium flex items-center gap-2">
          <ScrollText className="w-4 h-4 text-primary" />
          {part.title}
        </h4>
        {scores && (
          <div className="flex items-center gap-2 px-2 py-1 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-bold">
            <Star className="w-3 h-3 fill-current" />
            Quality: {scores.overall}/10
          </div>
        )}
      </div>
      <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4">{part.content}</p>

      {scores && (
        <div className="grid grid-cols-4 gap-2 pt-2 border-t border-gray-200 dark:border-gray-800">
          <div className="text-center">
            <div className="text-[10px] text-muted-foreground uppercase">Tension</div>
            <div className="text-xs font-bold">{scores.tension}</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-muted-foreground uppercase">Drama</div>
            <div className="text-xs font-bold">{scores.drama}</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-muted-foreground uppercase">Sense</div>
            <div className="text-xs font-bold">{scores.sense}</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-muted-foreground uppercase">Emotion</div>
            <div className="text-xs font-bold">{scores.emotion}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function StoryPreview({ title, summary, content, parts }: any) {
  const [activeTab, setActiveTab] = useState<'summary' | 'parts'>('parts');

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title || 'Untitled Story'}</h3>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={activeTab === 'parts' ? 'default' : 'outline'}
            onClick={() => setActiveTab('parts')}
            className="h-8 gap-1"
          >
            <Layers className="w-3.5 h-3.5" />
            Chapters
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'summary' ? 'default' : 'outline'}
            onClick={() => setActiveTab('summary')}
            className="h-8 gap-1"
          >
            <FileEdit className="w-3.5 h-3.5" />
            Summary
          </Button>
        </div>
      </div>

      {activeTab === 'summary' ? (
        <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
          <h4 className="text-sm font-semibold mb-2">Full Summary</h4>
          <p className="text-sm text-muted-foreground">{summary}</p>
        </div>
      ) : (
        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
          {parts && parts.length > 0 ? (
            parts.map((part: any, index: number) => (
              <StoryPartPreview key={part.id || index} part={part} />
            ))
          ) : (
            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{content}</p>
            </div>
          )}
        </div>
      )}

      {/* Metadata */}
      <div className="flex gap-4 text-xs text-muted-foreground py-2 border-t border-gray-100 dark:border-gray-800">
        <span>📖 {content.split(' ').length} words</span>
        <span>📑 {parts?.length || 1} parts</span>
      </div>
    </div>
  );
}

// ============================================================================
// Step 4: Story Generation
// ============================================================================

export function Step4StoryGeneration() {
  const { formData, updateFormData } = useWizard<StoryWizardFormData>();
  const currentWorld = useStore((state) => state.worlds?.find(w => w.id === state.selectedWorldId));
  const characters = useStore((state) => state.characters || []);

  const [progress, setProgress] = useState<GenerationProgress>({
    stage: 'preparing',
    progress: 0,
    currentTask: 'Initializing story generation...',
  });

  const [generatedStory, setGeneratedStory] = useState<any | null>(null);

  useEffect(() => {
    // Start generation automatically when component mounts
    handleGenerate();
  }, []);

  const handleGenerate = async () => {
    try {
      // Reset state
      setProgress({
        stage: 'preparing',
        progress: 10,
        currentTask: 'Preparing story parameters...',
      });
      setGeneratedStory(null);

      // Build world context
      const worldContext: WorldContext | undefined = currentWorld ? {
        id: currentWorld.id,
        name: currentWorld.name,
        genre: currentWorld.genre || [],
        tone: currentWorld.tone || [],
        rules: (currentWorld.rules || []).map(r => ({
          id: r.id,
          category: r.category,
          rule: r.rule,
          description: r.implications || '',
        })),
        culturalElements: currentWorld.culturalElements || {},
        atmosphere: currentWorld.atmosphere || '',
      } : undefined;

      // Get selected characters and locations
      const selectedCharacterIds = formData.selectedCharacters?.map((c: any) => c.id) || [];
      const selectedCharacters = characters.filter(c => selectedCharacterIds.includes(c.character_id));
      const selectedLocations = formData.selectedLocations || [];

      // Build generation params
      const params: StoryGenerationParams = {
        genre: formData.genre || [],
        tone: formData.tone || [],
        length: formData.length || 'medium',
        characters: selectedCharacters,
        locations: selectedLocations,
        worldContext: worldContext || {
          id: 'default',
          name: 'Default World',
          genre: formData.genre || [],
          tone: formData.tone || [],
          rules: [],
          culturalElements: {},
          atmosphere: '',
        },
      };

      // Stage 1: Creating elements (if needed)
      setProgress({
        stage: 'creating_elements',
        progress: 30,
        currentTask: 'Analyzing story elements...',
      });

      const story = await generateStory(params as any, (p: GenerationProgress) => {
        setProgress(p);
      }) as any;

      setGeneratedStory(story);

      // Update wizard form data
      updateFormData({
        generatedContent: story.content,
        generatedSummary: story.summary,
        parts: story.parts,
      });

    } catch (error) {
      console.error('Story generation failed:', error);
      setProgress({
        stage: progress.stage,
        progress: progress.progress,
        currentTask: progress.currentTask,
        error: error instanceof Error ? error.message : 'Failed to generate story',
      });
    }
  };

  const handleRetry = () => {
    handleGenerate();
  };

  return (
    <WizardFormLayout
      title="Story Generation"
      description="Your story is being generated with AI"
    >
      {/* Progress Display */}
      <GenerationProgressComponent progress={progress} />

      {/* Retry Button (shown on error) */}
      {progress.error && (
        <Button
          onClick={handleRetry}
          variant="outline"
          className="w-full gap-2 mt-4"
        >
          <RefreshCw className="w-4 h-4" />
          Retry Generation
        </Button>
      )}

      {/* Story Preview (shown when complete) */}
      {generatedStory && progress.stage === 'complete' && (
        <div className="mt-6">
          <StoryPreview
            title={formData.title || 'Generated Story'}
            summary={generatedStory.summary}
            content={generatedStory.content}
            parts={generatedStory.parts}
          />
        </div>
      )}

      {/* Info Box */}
      {progress.stage !== 'complete' && !progress.error && (
        <div className="mt-6 bg-blue-50 dark:bg-blue-950/20 p-4 rounded-md">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            ⏳ <strong>Please wait:</strong> Story generation may take 30-60 seconds depending on length and complexity.
          </p>
        </div>
      )}
    </WizardFormLayout>
  );
}
