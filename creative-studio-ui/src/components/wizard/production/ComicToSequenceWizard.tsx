import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ProductionWizardContainer } from '../production-wizards/ProductionWizardContainer';
import { WizardStep } from '@/types/wizard';
import { Image, List, ArrowRight, Music, Clock, Play, Save, Upload, Settings } from 'lucide-react';

// ============================================================================
// Wizard Steps Configuration
// ============================================================================

const COMIC_TO_SEQUENCE_STEPS: WizardStep[] = [
  { number: 1, title: 'Import Comic', description: 'Import comic pages or panels', icon: Upload },
  { number: 2, title: 'Panel Selection', description: 'Select and order panels', icon: List },
  { number: 3, title: 'Transitions', description: 'Choose transition effects between panels', icon: ArrowRight },
  { number: 4, title: 'Audio', description: 'Assign audio track to sequence', icon: Music },
  { number: 5, title: 'Timing', description: 'Adjust timing for each panel', icon: Clock },
  { number: 6, title: 'Generate', description: 'Generate video sequence', icon: Play },
];

// ============================================================================
// Local Storage Keys
// ============================================================================

const COMIC_TO_SEQUENCE_DRAFT_KEY = 'comic-to-sequence-draft';

// ============================================================================
// Types
// ============================================================================

interface ComicPanel {
  id: string;
  url: string;
  name: string;
  pageNumber: number;
  panelNumber: number;
  duration: number;
  transition: string;
}

interface ComicPage {
  id: string;
  url: string;
  name: string;
  pageNumber: number;
  panels: ComicPanel[];
}

interface ComicToSequenceDraft {
  currentStep: number;
  pages: ComicPage[];
  panels: ComicPanel[];
  audioTrack: string | null;
  timestamp: number;
}

interface ComicToSequenceResult {
  panels: ComicPanel[];
  audioTrack: string | null;
  totalDuration: number;
}

// ============================================================================
// Comic to Sequence Wizard Component
// ============================================================================

interface ComicToSequenceWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (result: ComicToSequenceResult) => void;
}

export function ComicToSequenceWizard({
  isOpen,
  onClose,
  onComplete,
}: ComicToSequenceWizardProps) {
  // ============================================================================
  // State Management
  // ============================================================================

  const [wizardState, setWizardState] = useState({
    currentStep: 0,
    pages: [] as ComicPage[],
    panels: [] as ComicPanel[],
    audioTrack: null as string | null,
    selectedPanelIds: [] as string[],
    defaultTransition: 'fade',
    defaultDuration: 3,
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
    const draft: ComicToSequenceDraft = {
      currentStep: state.currentStep,
      pages: state.pages,
      panels: state.panels,
      audioTrack: state.audioTrack,
      timestamp: Date.now(),
    };
    localStorage.setItem(COMIC_TO_SEQUENCE_DRAFT_KEY, JSON.stringify(draft));
    setWizardState(prev => ({
      ...prev,
      lastSaved: Date.now(),
      isDirty: false,
    }));
  }, []);

  const loadDraftFromLocalStorage = useCallback((): ComicToSequenceDraft | null => {
    try {
      const saved = localStorage.getItem(COMIC_TO_SEQUENCE_DRAFT_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load draft:', e);
    }
    return null;
  }, []);

  const clearDraftFromLocalStorage = useCallback(() => {
    localStorage.removeItem(COMIC_TO_SEQUENCE_DRAFT_KEY);
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
        pages: [] as ComicPage[],
        panels: [] as ComicPanel[],
        audioTrack: null as string | null,
        selectedPanelIds: [] as string[],
        defaultTransition: 'fade',
        defaultDuration: 3,
        validationErrors: {} as Record<string, string>,
        isDirty: false,
        lastSaved: 0,
      };

      const draft = loadDraftFromLocalStorage();
      if (draft) {
        initialState = {
          ...initialState,
          currentStep: draft.currentStep,
          pages: draft.pages,
          panels: draft.panels,
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
    if (stepIndex >= 0 && stepIndex < COMIC_TO_SEQUENCE_STEPS.length) {
      setWizardState(prev => ({
        ...prev,
        currentStep: stepIndex,
      }));
    }
  }, []);

  const nextStep = useCallback(() => {
    if (wizardState.currentStep < COMIC_TO_SEQUENCE_STEPS.length - 1) {
      goToStep(wizardState.currentStep + 1);
    }
  }, [wizardState.currentStep, goToStep]);

  const previousStep = useCallback(() => {
    if (wizardState.currentStep > 0) {
      goToStep(wizardState.currentStep - 1);
    }
  }, [wizardState.currentStep, goToStep]);

  // ============================================================================
  // Panel Handlers
  // ============================================================================

  const togglePanelSelection = useCallback((panelId: string) => {
    setWizardState(prev => {
      const isSelected = prev.selectedPanelIds.includes(panelId);
      return {
        ...prev,
        selectedPanelIds: isSelected
          ? prev.selectedPanelIds.filter(id => id !== panelId)
          : [...prev.selectedPanelIds, panelId],
        isDirty: true,
      };
    });
  }, []);

  const updatePanelDuration = useCallback((panelId: string, duration: number) => {
    setWizardState(prev => ({
      ...prev,
      panels: prev.panels.map(p =>
        p.id === panelId ? { ...p, duration } : p
      ),
      isDirty: true,
    }));
  }, []);

  const updatePanelTransition = useCallback((panelId: string, transition: string) => {
    setWizardState(prev => ({
      ...prev,
      panels: prev.panels.map(p =>
        p.id === panelId ? { ...p, transition } : p
      ),
      isDirty: true,
    }));
  }, []);

  // ============================================================================
  // Completion Handler
  // ============================================================================

  const handleComplete = useCallback(() => {
    try {
      setIsLoading(true);
      
      const totalDuration = wizardState.panels.reduce((acc, panel) => {
        return acc + panel.duration;
      }, 0);

      const result: ComicToSequenceResult = {
        panels: wizardState.panels,
        audioTrack: wizardState.audioTrack,
        totalDuration,
      };

      clearDraftFromLocalStorage();
      onComplete(result);
    } catch (err) {
      console.error('Failed to complete sequence generation:', err);
      setError(err instanceof Error ? err.message : 'Failed to complete sequence generation');
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
  // Step Content Renderer
  // ============================================================================

  const renderStepContent = () => {
    const currentStepNumber = COMIC_TO_SEQUENCE_STEPS[wizardState.currentStep].number;

    switch (currentStepNumber) {
      case 1:
        return (
          <Step1ImportComic
            pages={wizardState.pages}
            onPagesLoad={(pages) => {
              setWizardState(prev => ({
                ...prev,
                pages,
                isDirty: true,
              }));
            }}
          />
        );

      case 2:
        return (
          <Step2PanelSelection
            pages={wizardState.pages}
            selectedPanelIds={wizardState.selectedPanelIds}
            onTogglePanel={togglePanelSelection}
            onSelectAll={() => {
              const allPanelIds = wizardState.pages.flatMap(p => p.panels).map(panel => panel.id);
              setWizardState(prev => ({
                ...prev,
                selectedPanelIds: allPanelIds,
                isDirty: true,
              }));
            }}
            onDeselectAll={() => {
              setWizardState(prev => ({
                ...prev,
                selectedPanelIds: [],
                isDirty: true,
              }));
            }}
          />
        );

      case 3:
        return (
          <Step3Transitions
            panels={wizardState.panels}
            defaultTransition={wizardState.defaultTransition}
            onDefaultTransitionChange={(transition) => {
              setWizardState(prev => ({
                ...prev,
                defaultTransition: transition,
                isDirty: true,
              }));
            }}
            onUpdatePanelTransition={updatePanelTransition}
          />
        );

      case 4:
        return (
          <Step4Audio
            audioTrack={wizardState.audioTrack}
            onAudioSelect={(url) => {
              setWizardState(prev => ({
                ...prev,
                audioTrack: url,
                isDirty: true,
              }));
            }}
          />
        );

      case 5:
        return (
          <Step5Timing
            panels={wizardState.panels}
            defaultDuration={wizardState.defaultDuration}
            onDefaultDurationChange={(duration) => {
              setWizardState(prev => ({
                ...prev,
                defaultDuration: duration,
                isDirty: true,
              }));
            }}
            onUpdatePanelDuration={updatePanelDuration}
          />
        );

      case 6:
        return (
          <Step6Generate
            panels={wizardState.panels}
            audioTrack={wizardState.audioTrack}
            totalDuration={wizardState.panels.reduce((acc, p) => acc + p.duration, 0)}
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
            Comic to Sequence Wizard
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0">
          <ProductionWizardContainer
            title="Comic to Sequence Wizard"
            steps={COMIC_TO_SEQUENCE_STEPS}
            currentStep={wizardState.currentStep}
            onNextStep={nextStep}
            onPreviousStep={previousStep}
            onGoToStep={goToStep}
            onCancel={handleCancel}
            onComplete={handleComplete}
            allowJumpToStep={false}
            showAutoSaveIndicator={true}
            canProceed={wizardState.panels.length > 0}
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

interface Step1ImportComicProps {
  pages: ComicPage[];
  onPagesLoad: (pages: ComicPage[]) => void;
}

function Step1ImportComic({ pages, onPagesLoad }: Step1ImportComicProps) {
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newPages: ComicPage[] = Array.from(files).map((file, index) => {
        const id = `page-${Date.now()}-${index}`;
        const url = URL.createObjectURL(file);
        
        // Create a default panel for each page
        const panels: ComicPanel[] = [{
          id: `panel-${id}-0`,
          url,
          name: `${file.name} (Panel 1)`,
          pageNumber: index + 1,
          panelNumber: 1,
          duration: 3,
          transition: 'fade',
        }];

        return {
          id,
          url,
          name: file.name,
          pageNumber: index + 1,
          panels,
        };
      });

      onPagesLoad([...pages, ...newPages]);
    }
  };

  const handlePageReorder = (event: React.DragEvent, targetIndex: number) => {
    event.preventDefault();
    // Implementation for reordering pages
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Import Comic</h3>
        <p className="text-muted-foreground">
          Import comic pages to convert into a video sequence.
        </p>
      </div>

      <div className="border-2 border-dashed border-primary/30 rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
        <div className="mb-4">
          <span className="text-4xl">📚</span>
        </div>
        <p className="mb-2 font-medium">Drop comic pages here</p>
        <p className="text-sm text-muted-foreground mb-4">
          Supported: JPG, PNG, PDF
        </p>
        <label className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 cursor-pointer inline-block">
          Browse Files
          <input
            type="file"
            multiple
            accept="image/*,application/pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>
      </div>

      {pages.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium">Imported Pages ({pages.length})</h4>
          <div className="grid grid-cols-4 gap-4">
            {pages.map((page, index) => (
              <div key={page.id} className="relative group">
                <img
                  src={page.url}
                  alt={page.name}
                  className="w-full h-32 object-cover rounded-lg"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 rounded-b-lg truncate">
                  Page {index + 1}: {page.name}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {page.panels.length} panel(s)
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface Step2PanelSelectionProps {
  pages: ComicPage[];
  selectedPanelIds: string[];
  onTogglePanel: (panelId: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

function Step2PanelSelection({
  pages,
  selectedPanelIds,
  onTogglePanel,
  onSelectAll,
  onDeselectAll,
}: Step2PanelSelectionProps) {
  const allPanels = pages.flatMap(page => 
    page.panels.map(panel => ({
      ...panel,
      pageName: page.name,
    }))
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Panel Selection</h3>
        <p className="text-muted-foreground">
          Select which panels to include in your sequence.
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onSelectAll}
          className="px-3 py-1 text-sm bg-primary/10 hover:bg-primary/20 rounded"
        >
          Select All
        </button>
        <button
          onClick={onDeselectAll}
          className="px-3 py-1 text-sm bg-primary/10 hover:bg-primary/20 rounded"
        >
          Deselect All
        </button>
      </div>

      {allPanels.length === 0 ? (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-yellow-700 dark:text-yellow-400">
            Please import comic pages first to select panels.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4 max-h-96 overflow-y-auto">
          {allPanels.map((panel) => (
            <label
              key={panel.id}
              className={`relative cursor-pointer rounded-lg border-2 transition-all ${
                selectedPanelIds.includes(panel.id)
                  ? 'border-primary bg-primary/10'
                  : 'border-transparent hover:border-primary/30'
              }`}
            >
              <input
                type="checkbox"
                checked={selectedPanelIds.includes(panel.id)}
                onChange={() => onTogglePanel(panel.id)}
                className="sr-only"
              />
              <img
                src={panel.url}
                alt={panel.name}
                className="w-full h-32 object-cover rounded-lg"
              />
              {selectedPanelIds.includes(panel.id) && (
                <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-primary-foreground text-sm">✓</span>
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 rounded-b-lg">
                {panel.pageName} - Panel {panel.panelNumber}
              </div>
            </label>
          ))}
        </div>
      )}

      <div className="p-4 bg-accent/10 rounded-lg">
        <p className="text-sm text-muted-foreground">
          Selected: {selectedPanelIds.length} panels
        </p>
      </div>
    </div>
  );
}

interface Step3TransitionsProps {
  panels: ComicPanel[];
  defaultTransition: string;
  onDefaultTransitionChange: (transition: string) => void;
  onUpdatePanelTransition: (panelId: string, transition: string) => void;
}

const transitions = [
  { id: 'cut', name: 'Cut' },
  { id: 'fade', name: 'Fade' },
  { id: 'dissolve', name: 'Dissolve' },
  { id: 'wipe', name: 'Wipe' },
  { id: 'slide', name: 'Slide' },
];

function Step3Transitions({
  panels,
  defaultTransition,
  onDefaultTransitionChange,
  onUpdatePanelTransition,
}: Step3TransitionsProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Transition Effects</h3>
        <p className="text-muted-foreground">
          Choose transition effects between panels.
        </p>
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Default Transition</label>
        <div className="flex flex-wrap gap-2">
          {transitions.map(transition => (
            <button
              key={transition.id}
              onClick={() => onDefaultTransitionChange(transition.id)}
              className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                defaultTransition === transition.id
                  ? 'border-primary bg-primary/10'
                  : 'border-primary/20 hover:border-primary/40'
              }`}
            >
              {transition.name}
            </button>
          ))}
        </div>
      </div>

      {panels.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium">Panel Transitions</h4>
          {panels.map((panel, index) => (
            <div key={panel.id} className="flex items-center gap-4 p-3 bg-accent/5 rounded-lg">
              <img
                src={panel.url}
                alt={panel.name}
                className="w-16 h-16 object-cover rounded"
              />
              <div className="flex-1">
                <p className="text-sm font-medium">Panel {index + 1}</p>
                <p className="text-xs text-muted-foreground truncate">{panel.name}</p>
              </div>
              <select
                value={panel.transition}
                onChange={(e) => onUpdatePanelTransition(panel.id, e.target.value)}
                className="px-3 py-2 border border-primary/20 rounded text-sm"
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
  );
}

interface Step4AudioProps {
  audioTrack: string | null;
  onAudioSelect: (url: string) => void;
}

function Step4Audio({ audioTrack, onAudioSelect }: Step4AudioProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Audio Track</h3>
        <p className="text-muted-foreground">
          Add background music or narration to your sequence.
        </p>
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

interface Step5TimingProps {
  panels: ComicPanel[];
  defaultDuration: number;
  onDefaultDurationChange: (duration: number) => void;
  onUpdatePanelDuration: (panelId: string, duration: number) => void;
}

function Step5Timing({
  panels,
  defaultDuration,
  onDefaultDurationChange,
  onUpdatePanelDuration,
}: Step5TimingProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Timing Adjustment</h3>
        <p className="text-muted-foreground">
          Set how long each panel is displayed.
        </p>
      </div>

      <div className="p-4 bg-accent/10 rounded-lg">
        <label className="text-sm font-medium mb-2 block">Default Panel Duration</label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="1"
            max="10"
            step="0.5"
            value={defaultDuration}
            onChange={(e) => onDefaultDurationChange(Number(e.target.value))}
            className="flex-1"
            title="Default duration slider"
          />
          <span className="font-medium">{defaultDuration}s</span>
        </div>
      </div>

      {panels.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium">Panel Durations</h4>
          {panels.map((panel, index) => (
            <div key={panel.id} className="flex items-center gap-4 p-3 bg-accent/5 rounded-lg">
              <img
                src={panel.url}
                alt={panel.name}
                className="w-16 h-16 object-cover rounded"
              />
              <div className="flex-1">
                <p className="text-sm font-medium">Panel {index + 1}</p>
                <p className="text-xs text-muted-foreground truncate">{panel.name}</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={panel.duration}
                  onChange={(e) => onUpdatePanelDuration(panel.id, Number(e.target.value))}
                  className="w-16 px-2 py-1 text-sm border border-primary/20 rounded"
                  title="Panel duration in seconds"
                />
                <span className="text-sm text-muted-foreground">sec</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="p-4 bg-accent/10 rounded-lg">
        <p className="text-sm text-muted-foreground">
          Total Duration: {panels.reduce((acc, p) => acc + p.duration, 0)} seconds
        </p>
      </div>
    </div>
  );
}

interface Step6GenerateProps {
  panels: ComicPanel[];
  audioTrack: string | null;
  totalDuration: number;
}

function Step6Generate({ panels, audioTrack, totalDuration }: Step6GenerateProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      alert('Sequence generated! (Demo)');
    }, 3000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Generate Sequence</h3>
        <p className="text-muted-foreground">
          Review your settings and generate the video sequence.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-accent/10 rounded-lg">
          <Settings className="w-8 h-8 text-primary mb-2" />
          <p className="text-2xl font-semibold">{panels.length}</p>
          <p className="text-sm text-muted-foreground">Panels</p>
        </div>
        <div className="p-4 bg-accent/10 rounded-lg">
          <Clock className="w-8 h-8 text-primary mb-2" />
          <p className="text-2xl font-semibold">{totalDuration}s</p>
          <p className="text-sm text-muted-foreground">Total Duration</p>
        </div>
        <div className="p-4 bg-accent/10 rounded-lg">
          <Music className="w-8 h-8 text-primary mb-2" />
          <p className="text-2xl font-semibold">{audioTrack ? 'Yes' : 'No'}</p>
          <p className="text-sm text-muted-foreground">Audio Track</p>
        </div>
      </div>

      <div className="p-4 bg-accent/5 rounded-lg max-h-48 overflow-y-auto">
        <h4 className="font-medium mb-2">Sequence Preview</h4>
        <div className="flex gap-2 flex-wrap">
          {panels.map((panel, index) => (
            <div key={panel.id} className="relative">
              <img
                src={panel.url}
                alt={panel.name}
                className="w-16 h-16 object-cover rounded"
              />
              <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-xs">
                {panel.duration}s
              </span>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={handleGenerate}
        disabled={isGenerating || panels.length === 0}
        className="w-full px-4 py-3 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isGenerating ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>
            Generating...
          </>
        ) : (
          <>
            <Play className="w-4 h-4" />
            Generate Sequence
          </>
        )}
      </button>
    </div>
  );
}
