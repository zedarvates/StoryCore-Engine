import React, { useEffect, useState } from 'react';
import { useWizard } from '@/contexts/WizardContext';
import { WizardFormLayout } from '../WizardFormLayout';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Loader2, CheckCircle, AlertCircle, RefreshCw, ChevronRight, ChevronLeft } from 'lucide-react';
import { useStore } from '@/store';
import type { GenerationProgress, StoryGenerationParams, WorldContext, StoryPart, Story } from '@/types/story';
import type { MethodologyState, StoryPhase } from '@/types/storyMethodology';
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
  parts?: unknown[];
  methodologyState?: MethodologyState;
}

// ============================================================================
// Phase Progress Component
// ============================================================================

interface Phase {
  phase: StoryPhase;
  name: string;
  description: string;
}

interface PhaseProgressProps {
  phases: Phase[];
  currentPhase: StoryPhase;
  progress: number;
}

function PhaseProgress({ phases, currentPhase, progress }: PhaseProgressProps) {
  const getPhaseIndex = (phase: StoryPhase) =>
    phases.findIndex(p => p.phase === phase);

  const currentIndex = getPhaseIndex(currentPhase);

  return (
    <div className="space-y-4">
      {/* Overall Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Overall Progress</span>
          <span className="text-muted-foreground">{progress}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Phase Steps */}
      <div className="flex items-center justify-between">
        {phases.map((phase, index) => {
          const isComplete = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isPending = index > currentIndex;

          return (
            <React.Fragment key={phase.phase}>
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${isComplete
                    ? 'bg-green-500 text-white'
                    : isCurrent
                      ? 'bg-blue-500 text-white animate-pulse'
                      : 'bg-muted text-muted-foreground'
                    }`}
                >
                  {isComplete ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span className={`text-xs mt-1 ${isCurrent ? 'font-medium text-primary' : 'text-muted-foreground'}`}>
                  {phase.name}
                </span>
              </div>
              {index < phases.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 ${index < currentIndex ? 'bg-green-500' : 'bg-muted'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
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

function StoryPartPreview({ part }: { part: StoryPart }) {
  const scores = part.reviewScore;

  return (
    <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium flex items-center gap-2">
          <ScrollText className="w-4 h-4 text-primary" />
          {part.title}
        </h4>
        {scores && (
          <div className="flex items-center gap-2 px-2 py-1 rounded bg-amber-amber-900/30 text-amber100 dark:bg--700 dark:text-amber-400 text-xs font-bold">
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

interface StoryPreviewProps {
  title: string;
  summary: string;
  content: string;
  parts?: StoryPart[];
}

function StoryPreview({ title, summary, content, parts }: StoryPreviewProps) {
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
            parts.map((part: StoryPart, index: number) => (
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
        <span>📖 {content?.split(' ').length || 0} words</span>
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

  const [generatedStory, setGeneratedStory] = useState<Story | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasSkipped, setHasSkipped] = useState(false);

  useEffect(() => {
    // Start generation automatically when component mounts (only if not skipped)
    if (!hasSkipped && !generatedStory) {
      handleGenerate();
    }
  }, [hasSkipped]);

  const handleSkip = () => {
    setHasSkipped(true);
    setProgress({
      stage: 'complete',
      progress: 100,
      currentTask: 'Generation skipped - you can enter content manually in the next step',
    });

    // Set empty content to allow proceeding
    updateFormData({
      generatedContent: '[Enter your story content here]',
      generatedSummary: '[Enter your story summary here]',
      parts: [],
    });
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
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
        keyObjects: currentWorld.keyObjects || [],
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
        characters: selectedCharacters as unknown as StoryGenerationParams['characters'],
        locations: selectedLocations as unknown as StoryGenerationParams['locations'],
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

      const story = await generateStory(params, (p: GenerationProgress) => {
        setProgress(p);
      });

      setGeneratedStory(story);

      // Update wizard form data
      updateFormData({
        generatedContent: story.content,
        generatedSummary: story.summary,
        parts: story.parts,
        methodologyState: story.methodologyState,
      });

    } catch (error) {
      console.error('Story generation failed:', error);
      setProgress({
        stage: progress.stage,
        progress: progress.progress,
        currentTask: progress.currentTask,
        error: error instanceof Error ? error.message : 'Failed to generate story',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRetry = () => {
    setHasSkipped(false);
    handleGenerate();
  };

  return (
    <WizardFormLayout
      title="Story Generation"
      description="Your story is being generated with AI"
    >
      {/* Phase Progress (if methodology state exists) */}
      {formData.methodologyState && (
        <div className="mb-6">
          <PhaseProgress
            phases={[
              { phase: 'intro_summary' as StoryPhase, name: 'Introduction', description: 'Generate intro' },
              { phase: 'chapter_outline' as StoryPhase, name: 'Chapters', description: 'Plan chapters' },
              { phase: 'ending_summary' as StoryPhase, name: 'Ending', description: 'Plan ending' },
              { phase: 'full_content' as StoryPhase, name: 'Full Story', description: 'Expand content' },
              { phase: 'revision' as StoryPhase, name: 'Revision', description: 'Refine story' },
            ]}
            currentPhase={formData.methodologyState.currentPhase}
            progress={formData.methodologyState.progress}
          />
        </div>
      )}

      {/* Progress Display */}
      <GenerationProgressComponent progress={progress} />

      {/* Retry Button (shown on error) */}
      {progress.error && (
        <div className="flex gap-2">
          <Button
            onClick={handleRetry}
            variant="outline"
            className="flex-1 gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Retry Generation
          </Button>
          <Button
            onClick={handleSkip}
            variant="secondary"
            className="flex-1 gap-2"
          >
            <ChevronRight className="w-4 h-4" />
            Skip & Continue
          </Button>
        </div>
      )}

      {/* Skip Button (shown during generation) */}
      {isGenerating && !progress.error && (
        <Button
          onClick={handleSkip}
          variant="outline"
          className="w-full gap-2 mt-4"
        >
          <ChevronRight className="w-4 h-4" />
          Skip Generation (Enter Content Manually)
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


