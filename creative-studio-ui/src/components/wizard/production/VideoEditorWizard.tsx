import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ProductionWizardContainer } from '../production-wizards/ProductionWizardContainer';
import { WizardStep } from '@/types/wizard';
import { Layers, Scissors, Music, Sparkles, Save, Upload, Clock, Layout } from 'lucide-react';

// ============================================================================
// Wizard Steps Configuration
// ============================================================================

const VIDEO_EDITOR_STEPS: WizardStep[] = [
  { number: 1, title: 'Import Media', description: 'Import images and video clips', icon: Upload },
  { number: 2, title: 'Timeline', description: 'Arrange clips on the timeline', icon: Layers },
  { number: 3, title: 'Transitions', description: 'Choose transition effects', icon: Scissors },
  { number: 4, title: 'Audio Sync', description: 'Synchronize with audio track', icon: Music },
  { number: 5, title: 'Effects', description: 'Apply visual effects', icon: Sparkles },
  { number: 6, title: 'Export', description: 'Configure export settings', icon: Save },
];

// ============================================================================
// Local Storage Keys
// ============================================================================

const VIDEO_EDITOR_DRAFT_KEY = 'video-editor-draft';

// ============================================================================
// Draft Types
// ============================================================================

interface MediaItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  name: string;
  duration?: number;
}

interface TimelineItem {
  id: string;
  mediaId: string;
  order: number;
  startTime: number;
  endTime: number;
  transition: string;
}

// ============================================================================
// Video Editor Wizard Component
// ============================================================================

interface VideoEditorWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (result: VideoEditorResult) => void;
}

interface VideoEditorResult {
  mediaItems: MediaItem[];
  timelineItems: TimelineItem[];
  audioTrack: string | null;
  totalDuration: number;
}

export function VideoEditorWizard({
  isOpen,
  onClose,
  onComplete,
}: VideoEditorWizardProps) {
  const [wizardState, setWizardState] = useState({
    currentStep: 0,
    mediaItems: [] as MediaItem[],
    timelineItems: [] as TimelineItem[],
    audioTrack: null as string | null,
    selectedTransition: 'fade',
    audioSyncEnabled: true,
    validationErrors: {} as Record<string, string>,
    isDirty: false,
    lastSaved: 0,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============================================================================
  // Local Storage Helpers
  // ============================================================================

  const saveDraftToLocalStorage = useCallback((state: typeof wizardState) => {
    const draft = {
      currentStep: state.currentStep,
      mediaItems: state.mediaItems,
      timelineItems: state.timelineItems,
      audioTrack: state.audioTrack,
      timestamp: Date.now(),
    };
    localStorage.setItem(VIDEO_EDITOR_DRAFT_KEY, JSON.stringify(draft));
    setWizardState(prev => ({
      ...prev,
      lastSaved: Date.now(),
      isDirty: false,
    }));
  }, []);

  const loadDraftFromLocalStorage = useCallback(() => {
    try {
      const saved = localStorage.getItem(VIDEO_EDITOR_DRAFT_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load draft:', e);
    }
    return null;
  }, []);

  const clearDraftFromLocalStorage = useCallback(() => {
    localStorage.removeItem(VIDEO_EDITOR_DRAFT_KEY);
  }, []);

  // ============================================================================
  // Initialization Effects
  // ============================================================================

  useEffect(() => {
    if (isOpen) {
      initializeWizard();
    }
  }, [isOpen]);

  const initializeWizard = async () => {
    try {
      setIsLoading(true);
      setError(null);

      let initialState = {
        currentStep: 0,
        mediaItems: [] as MediaItem[],
        timelineItems: [] as TimelineItem[],
        audioTrack: null as string | null,
        selectedTransition: 'fade',
        audioSyncEnabled: true,
        validationErrors: {} as Record<string, string>,
        isDirty: false,
        lastSaved: 0,
      };

      const draft = loadDraftFromLocalStorage();
      if (draft) {
        initialState = {
          ...initialState,
          currentStep: draft.currentStep,
          mediaItems: draft.mediaItems,
          timelineItems: draft.timelineItems,
          audioTrack: draft.audioTrack,
        };
      }

      setWizardState(initialState);
    } catch (err) {
      console.error('Failed to initialize wizard:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize wizard');
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================================
  // Auto-save Effect
  // ============================================================================

  useEffect(() => {
    if (wizardState.isDirty) {
      const timer = setTimeout(() => {
        saveDraftToLocalStorage(wizardState);
      }, 30000);
      return () => clearTimeout(timer);
    }
  }, [wizardState.isDirty, wizardState, saveDraftToLocalStorage]);

  // ============================================================================
  // Navigation Handlers
  // ============================================================================

  const goToStep = useCallback((stepIndex: number) => {
    if (stepIndex >= 0 && stepIndex < VIDEO_EDITOR_STEPS.length) {
      setWizardState(prev => ({
        ...prev,
        currentStep: stepIndex,
      }));
    }
  }, []);

  const nextStep = useCallback(() => {
    if (wizardState.currentStep < VIDEO_EDITOR_STEPS.length - 1) {
      goToStep(wizardState.currentStep + 1);
    }
  }, [wizardState.currentStep, goToStep]);

  const previousStep = useCallback(() => {
    if (wizardState.currentStep > 0) {
      goToStep(wizardState.currentStep - 1);
    }
  }, [wizardState.currentStep, goToStep]);

  // ============================================================================
  // Media Handlers
  // ============================================================================

  const addMediaItem = useCallback((item: MediaItem) => {
    setWizardState(prev => ({
      ...prev,
      mediaItems: [...prev.mediaItems, item],
      isDirty: true,
    }));
  }, []);

  const removeMediaItem = useCallback((id: string) => {
    setWizardState(prev => ({
      ...prev,
      mediaItems: prev.mediaItems.filter(m => m.id !== id),
      timelineItems: prev.timelineItems.filter(t => t.mediaId !== id),
      isDirty: true,
    }));
  }, []);

  const reorderTimelineItems = useCallback((items: TimelineItem[]) => {
    setWizardState(prev => ({
      ...prev,
      timelineItems: items.map((item, index) => ({ ...item, order: index })),
      isDirty: true,
    }));
  }, []);

  // ============================================================================
  // Completion Handler
  // ============================================================================

  const handleComplete = useCallback(() => {
    try {
      setIsLoading(true);
      
      const totalDuration = wizardState.timelineItems.reduce((acc, item) => {
        return acc + (item.endTime - item.startTime);
      }, 0);

      const result: VideoEditorResult = {
        mediaItems: wizardState.mediaItems,
        timelineItems: wizardState.timelineItems,
        audioTrack: wizardState.audioTrack,
        totalDuration,
      };

      clearDraftFromLocalStorage();
      onComplete(result);
    } catch (err) {
      console.error('Failed to complete video editing:', err);
      setError(err instanceof Error ? err.message : 'Failed to complete video editing');
    } finally {
      setIsLoading(false);
    }
  }, [wizardState, onComplete, clearDraftFromLocalStorage]);

  // ============================================================================
  // Cancel Handler with Confirmation
  // ============================================================================

  const handleCancel = useCallback(() => {
    if (wizardState.isDirty) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to cancel?'
      );
      if (!confirmed) return;
    }

    clearDraftFromLocalStorage();
    onClose();
  }, [wizardState.isDirty, onClose, clearDraftFromLocalStorage]);

  // ============================================================================
  // Calculate Total Duration Helper
  // ============================================================================

  const calculateTotalDuration = () => {
    return wizardState.timelineItems.reduce((acc, item) => {
      return acc + (item.endTime - item.startTime);
    }, 0);
  };

  // ============================================================================
  // Step Content Renderer
  // ============================================================================

  const renderStepContent = () => {
    const currentStepNumber = VIDEO_EDITOR_STEPS[wizardState.currentStep].number;

    switch (currentStepNumber) {
      case 1:
        return (
          <Step1ImportMedia
            mediaItems={wizardState.mediaItems}
            onAddMedia={addMediaItem}
            onRemoveMedia={removeMediaItem}
          />
        );

      case 2:
        return (
          <Step2Timeline
            mediaItems={wizardState.mediaItems}
            timelineItems={wizardState.timelineItems}
            onReorder={reorderTimelineItems}
          />
        );

      case 3:
        return (
          <Step3Transitions
            selectedTransition={wizardState.selectedTransition}
            timelineItems={wizardState.timelineItems}
            onTransitionSelect={(transition) => {
              setWizardState(prev => ({
                ...prev,
                selectedTransition: transition,
                isDirty: true,
              }));
            }}
            onUpdateTimelineTransition={(id, transition) => {
              setWizardState(prev => ({
                ...prev,
                timelineItems: prev.timelineItems.map(t =>
                  t.id === id ? { ...t, transition } : t
                ),
                isDirty: true,
              }));
            }}
          />
        );

      case 4:
        return (
          <Step4AudioSync
            audioTrack={wizardState.audioTrack}
            audioSyncEnabled={wizardState.audioSyncEnabled}
            onAudioSelect={(url) => {
              setWizardState(prev => ({
                ...prev,
                audioTrack: url,
                isDirty: true,
              }));
            }}
            onSyncToggle={(enabled) => {
              setWizardState(prev => ({
                ...prev,
                audioSyncEnabled: enabled,
                isDirty: true,
              }));
            }}
          />
        );

      case 5:
        return (
          <Step5Effects
            timelineItems={wizardState.timelineItems}
          />
        );

      case 6:
        return (
          <Step6Export
            totalDuration={calculateTotalDuration()}
          />
        );

      default:
        return <div>Unknown step</div>;
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="max-w-4xl h-[85vh] overflow-hidden flex flex-col cyber-card border-primary/30 bg-card/95 backdrop-blur-sm">
        <DialogHeader className="border-b border-primary/30 bg-card/95 backdrop-blur-sm">
          <DialogTitle className="neon-text text-primary text-xl font-bold">
            Video Editor Wizard
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0">
          <ProductionWizardContainer
            title="Video Editor Wizard"
            steps={VIDEO_EDITOR_STEPS}
            currentStep={wizardState.currentStep}
            onNextStep={nextStep}
            onPreviousStep={previousStep}
            onGoToStep={goToStep}
            onCancel={handleCancel}
            onComplete={handleComplete}
            allowJumpToStep={false}
            showAutoSaveIndicator={true}
            canProceed={wizardState.mediaItems.length > 0}
            isDirty={wizardState.isDirty}
            lastSaved={wizardState.lastSaved}
            className="h-full"
          >
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground neon-text-blue">Loading...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <p className="mb-4 text-destructive neon-text-pink">{error}</p>
                  <button
                    onClick={initializeWizard}
                    className="px-4 py-2 btn-neon rounded neon-border"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : (
              renderStepContent()
            )}
          </ProductionWizardContainer>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Step Components
// ============================================================================

interface Step1ImportMediaProps {
  mediaItems: MediaItem[];
  onAddMedia: (item: MediaItem) => void;
  onRemoveMedia: (id: string) => void;
}

function Step1ImportMedia({ mediaItems, onAddMedia, onRemoveMedia }: Step1ImportMediaProps) {
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      Array.from(files).forEach((file, index) => {
        const id = `media-${Date.now()}-${index}`;
        const type = file.type.startsWith('video/') ? 'video' : 'image';
        const url = URL.createObjectURL(file);
        
        onAddMedia({
          id,
          type,
          url,
          name: file.name,
          duration: type === 'video' ? 5 : 3,
        });
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Import Media</h3>
        <p className="text-muted-foreground">
          Import images and video clips to include in your sequence.
        </p>
      </div>

      <div className="border-2 border-dashed border-primary/30 rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
        <div className="mb-4">
          <span className="text-4xl">📁</span>
        </div>
        <p className="mb-2 font-medium">Drop files here</p>
        <p className="text-sm text-muted-foreground mb-4">
          Supported: JPG, PNG, MP4, WebM
        </p>
        <label className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 cursor-pointer inline-block">
          Browse Files
          <input
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>
      </div>

      {mediaItems.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium">Imported Media ({mediaItems.length})</h4>
          <div className="grid grid-cols-4 gap-4">
            {mediaItems.map(item => (
              <div key={item.id} className="relative group">
                {item.type === 'video' ? (
                  <video src={item.url} className="w-full h-24 object-cover rounded-lg" />
                ) : (
                  <img src={item.url} alt={item.name} className="w-full h-24 object-cover rounded-lg" />
                )}
                <button
                  onClick={() => onRemoveMedia(item.id)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
                <p className="text-xs truncate mt-1">{item.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface Step2TimelineProps {
  mediaItems: MediaItem[];
  timelineItems: TimelineItem[];
  onReorder: (items: TimelineItem[]) => void;
}

function Step2Timeline({ mediaItems, timelineItems, onReorder }: Step2TimelineProps) {
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, item: TimelineItem) => {
    e.dataTransfer.setData('text/plain', item.id);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('text/plain');
    
    if (draggedId !== targetId) {
      const draggedItem = timelineItems.find(t => t.id === draggedId);
      const targetItem = timelineItems.find(t => t.id === targetId);
      
      if (draggedItem && targetItem) {
        const newItems = [...timelineItems];
        const draggedIndex = newItems.findIndex(t => t.id === draggedId);
        const targetIndex = newItems.findIndex(t => t.id === targetId);
        
        const tempOrder = newItems[draggedIndex].order;
        newItems[draggedIndex].order = newItems[targetIndex].order;
        newItems[targetIndex].order = tempOrder;
        
        newItems.sort((a, b) => a.order - b.order);
        
        onReorder(newItems);
      }
    }
    
    setDragOverId(null);
  };

  React.useEffect(() => {
    if (mediaItems.length > 0 && timelineItems.length === 0) {
      const newItems = mediaItems.map((media, index) => ({
        id: `timeline-${media.id}`,
        mediaId: media.id,
        order: index,
        startTime: 0,
        endTime: media.duration || 3,
        transition: 'fade',
      }));
      onReorder(newItems);
    }
  }, [mediaItems]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Timeline Arrangement</h3>
        <p className="text-muted-foreground">
          Drag and drop clips to arrange them on the timeline.
        </p>
      </div>

      {timelineItems.length === 0 ? (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-yellow-700 dark:text-yellow-400">
            Please import media first to arrange them on the timeline.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {timelineItems.map((item) => {
            const media = mediaItems.find(m => m.id === item.mediaId);
            if (!media) return null;

            return (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => handleDragStart(e, item)}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverId(item.id);
                }}
                onDragLeave={() => setDragOverId(null)}
                onDrop={(e) => handleDrop(e, item.id)}
                className={`p-3 rounded-lg border flex items-center gap-4 transition-colors ${
                  dragOverId === item.id
                    ? 'border-primary bg-primary/10'
                    : 'border-primary/20 hover:border-primary/40'
                }`}
              >
                <span className="text-muted-foreground">⋮⋮</span>
                {media.type === 'video' ? (
                  <video src={media.url} className="w-16 h-10 object-cover rounded" />
                ) : (
                  <img src={media.url} alt={media.name} className="w-16 h-10 object-cover rounded" />
                )}
                <div className="flex-1">
                  <p className="font-medium">{media.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Duration: {item.endTime - item.startTime}s
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{item.endTime - item.startTime}s</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface Step3TransitionsProps {
  selectedTransition: string;
  timelineItems: TimelineItem[];
  onTransitionSelect: (transition: string) => void;
  onUpdateTimelineTransition: (id: string, transition: string) => void;
}

const transitions = [
  { id: 'cut', name: 'Cut' },
  { id: 'fade', name: 'Fade' },
  { id: 'dissolve', name: 'Dissolve' },
  { id: 'wipe', name: 'Wipe' },
  { id: 'slide', name: 'Slide' },
];

function Step3Transitions({
  selectedTransition,
  timelineItems,
  onTransitionSelect,
  onUpdateTimelineTransition,
}: Step3TransitionsProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Transition Effects</h3>
        <p className="text-muted-foreground">
          Choose default and individual clip transitions.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Default Transition</label>
          <div className="flex flex-wrap gap-2">
            {transitions.map(transition => (
              <button
                key={transition.id}
                onClick={() => onTransitionSelect(transition.id)}
                className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                  selectedTransition === transition.id
                    ? 'border-primary bg-primary/10'
                    : 'border-primary/20 hover:border-primary/40'
                }`}
              >
                {transition.name}
              </button>
            ))}
          </div>
        </div>

        {timelineItems.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium">Clip Transitions</h4>
            {timelineItems.map((item) => (
              <div key={item.id} className="flex items-center gap-4 p-3 bg-accent/5 rounded-lg">
                <span className="text-sm text-muted-foreground">Clip {item.order + 1}</span>
                <select
                  value={item.transition}
                  onChange={(e) => onUpdateTimelineTransition(item.id, e.target.value)}
                  className="px-3 py-2 border border-primary/20 rounded"
                >
                  {transitions.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface Step4AudioSyncProps {
  audioTrack: string | null;
  audioSyncEnabled: boolean;
  onAudioSelect: (url: string) => void;
  onSyncToggle: (enabled: boolean) => void;
}

function Step4AudioSync({
  audioTrack,
  audioSyncEnabled,
  onAudioSelect,
  onSyncToggle,
}: Step4AudioSyncProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Audio Synchronization</h3>
        <p className="text-muted-foreground">
          Add an audio track and synchronize it with your video.
        </p>
      </div>

      <div className="flex items-center gap-4 p-4 bg-accent/10 rounded-lg">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={audioSyncEnabled}
            onChange={(e) => onSyncToggle(e.target.checked)}
            className="rounded border-primary/20"
          />
          <span className="font-medium">Enable Audio Sync</span>
        </label>
      </div>

      <div className="border-2 border-dashed border-primary/30 rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
        <div className="mb-4">
          <span className="text-4xl">🎵</span>
        </div>
        <p className="mb-2 font-medium">Drop audio file here</p>
        <p className="text-sm text-muted-foreground mb-4">
          Supported: MP3, WAV, OGG
        </p>
        <label className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 cursor-pointer inline-block">
          Browse Files
          <input
            type="file"
            accept="audio/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const url = URL.createObjectURL(file);
                onAudioSelect(url);
              }
            }}
            className="hidden"
          />
        </label>
      </div>

      {audioTrack && (
        <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-green-700 dark:text-green-400 font-medium">Audio track added!</p>
          <audio controls src={audioTrack} className="w-full mt-2" />
        </div>
      )}
    </div>
  );
}

interface Step5EffectsProps {
  timelineItems: TimelineItem[];
}

function Step5Effects({ timelineItems }: Step5EffectsProps) {
  const effects = [
    { id: 'none', name: 'None', description: 'Original clip' },
    { id: 'grayscale', name: 'Grayscale', description: 'Black and white' },
    { id: 'sepia', name: 'Sepia', description: 'Vintage sepia tone' },
    { id: 'blur', name: 'Blur', description: 'Blur effect' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Visual Effects</h3>
        <p className="text-muted-foreground">
          Apply visual effects to individual clips.
        </p>
      </div>

      {timelineItems.length === 0 ? (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-yellow-700 dark:text-yellow-400">
            Please add clips to the timeline first.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {timelineItems.map((item) => (
            <div key={item.id} className="p-4 bg-accent/5 rounded-lg">
              <p className="font-medium mb-2">Clip {item.order + 1}</p>
              <select
                className="w-full px-3 py-2 border border-primary/20 rounded"
                defaultValue="none"
              >
                {effects.map(effect => (
                  <option key={effect.id} value={effect.id}>
                    {effect.name} - {effect.description}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface Step6ExportProps {
  totalDuration: number;
}

function Step6Export({ totalDuration }: Step6ExportProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState('mp4');

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      alert('Export completed! (Demo)');
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Export Settings</h3>
        <p className="text-muted-foreground">
          Configure export format and settings.
        </p>
      </div>

      <div className="p-4 bg-accent/10 rounded-lg">
        <div className="flex items-center gap-4">
          <Layout className="w-8 h-8 text-primary" />
          <div>
            <p className="font-medium">Sequence Summary</p>
            <p className="text-sm text-muted-foreground">
              Duration: {Math.floor(totalDuration / 60)}m {totalDuration % 60}s
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Output Format</label>
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value)}
            className="w-full px-3 py-2 border border-primary/20 rounded"
          >
            <option value="mp4">MP4 (H.264)</option>
            <option value="webm">WebM (VP9)</option>
            <option value="gif">Animated GIF</option>
          </select>
        </div>

        <button
          onClick={handleExport}
          disabled={isExporting || totalDuration === 0}
          className="w-full px-4 py-3 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
        >
          {isExporting ? 'Exporting...' : 'Export Video'}
        </button>
      </div>
    </div>
  );
}
