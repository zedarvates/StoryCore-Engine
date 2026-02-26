import React, { useState, useEffect, useCallback } from 'react';
import { ProductionWizardContainer } from '../production-wizards/ProductionWizardContainer';
import { WizardStep } from '@/types/wizard';
import { useAudioRemixStore, RemixStyle, MusicStructure } from '@/stores/audioRemixStore';
import { Music, BarChart3, Palette, Clock, Zap, Save } from 'lucide-react';
import '../WizardModal.css'; // Assuming this CSS file exists for wizard-modal-overlay

// ============================================================================
// Wizard Steps Configuration
// ============================================================================

const AUDIO_PRODUCTION_STEPS: WizardStep[] = [
  { number: 1, title: 'Import Audio', description: 'Import or select an audio track to remix', icon: Music },
  { number: 2, title: 'Analyze Structure', description: 'Analyze beats, sections, and structure', icon: BarChart3 },
  { number: 3, title: 'Remix Style', description: 'Choose your remix style and approach', icon: Palette },
  { number: 4, title: 'Duration', description: 'Adjust the target duration', icon: Clock },
  { number: 5, title: 'Effects', description: 'Apply effects and modifications', icon: Zap },
  { number: 6, title: 'Export', description: 'Configure export settings', icon: Save },
];

// ============================================================================
// Local Storage Keys
// ============================================================================

const AUDIO_PRODUCTION_DRAFT_KEY = 'audio-production-draft';

// ============================================================================
// Draft Types
// ============================================================================

interface AudioProductionDraft {
  currentStep: number;
  selectedAudioId: string | null;
  selectedAudioUrl: string | null;
  timestamp: number;
}

// ============================================================================
// Audio Production Wizard Component
// ============================================================================

interface AudioProductionWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  initialAudioId?: string;
  initialAudioUrl?: string;
}

export function AudioProductionWizard({
  isOpen,
  onClose,
  onComplete,
  initialAudioId,
  initialAudioUrl,
}: AudioProductionWizardProps) {
  // ============================================================================
  // State Management
  // ============================================================================

  const store = useAudioRemixStore();
  
  const [wizardState, setWizardState] = useState({
    currentStep: 0,
    selectedAudioId: initialAudioId || null,
    selectedAudioUrl: initialAudioUrl || null,
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
    const draft: AudioProductionDraft = {
      currentStep: state.currentStep,
      selectedAudioId: state.selectedAudioId,
      selectedAudioUrl: state.selectedAudioUrl,
      timestamp: Date.now(),
    };
    localStorage.setItem(AUDIO_PRODUCTION_DRAFT_KEY, JSON.stringify(draft));
    setWizardState(prev => ({
      ...prev,
      lastSaved: Date.now(),
      isDirty: false,
    }));
  }, []);

  const loadDraftFromLocalStorage = useCallback((): AudioProductionDraft | null => {
    try {
      const saved = localStorage.getItem(AUDIO_PRODUCTION_DRAFT_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load draft:', e);
    }
    return null;
  }, []);

  const clearDraftFromLocalStorage = useCallback(() => {
    localStorage.removeItem(AUDIO_PRODUCTION_DRAFT_KEY);
  }, []);

  // ============================================================================
  // Initialization Effects
  // ============================================================================

  const initializeWizard = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      let initialState = {
        currentStep: 0,
        selectedAudioId: initialAudioId || null,
        selectedAudioUrl: initialAudioUrl || null,
        validationErrors: {} as Record<string, string>,
        isDirty: false,
        lastSaved: 0,
      };

      // Try to load draft
      if (!initialAudioId && !initialAudioUrl) {
        const draft = loadDraftFromLocalStorage();
        if (draft) {
          initialState = {
            ...initialState,
            currentStep: draft.currentStep,
            selectedAudioId: draft.selectedAudioId,
            selectedAudioUrl: draft.selectedAudioUrl,
          };
        }
      }

      setWizardState(initialState);
      
      // Auto-load track if provided
      if (initialAudioId && initialAudioUrl) {
        await store.loadTrack(initialAudioId, initialAudioUrl);
      } else {
        store.reset();
      }

    } catch (err) {
      console.error('Failed to initialize wizard:', err);
      setError('Impossible d\'initialiser l\'assistant de production audio.');
    } finally {
      setIsLoading(false);
    }
  }, [initialAudioId, initialAudioUrl, loadDraftFromLocalStorage, store]);

  useEffect(() => {
    if (isOpen) {
      initializeWizard();
    }
  }, [isOpen, initializeWizard]);

  // ============================================================================
  // Auto-save Effect
  // ============================================================================

  useEffect(() => {
    if (wizardState.isDirty && !initialAudioId) {
      const timer = setTimeout(() => {
        saveDraftToLocalStorage(wizardState);
      }, 30000);
      return () => clearTimeout(timer);
    }
  }, [wizardState.isDirty, wizardState, initialAudioId, saveDraftToLocalStorage]);

  // ============================================================================
  // Navigation Handlers
  // ============================================================================

  const goToStep = useCallback((stepIndex: number) => {
    if (stepIndex >= 0 && stepIndex < AUDIO_PRODUCTION_STEPS.length) {
      setWizardState(prev => ({
        ...prev,
        currentStep: stepIndex,
      }));
    }
  }, []);

  const nextStep = useCallback(() => {
    if (wizardState.currentStep < AUDIO_PRODUCTION_STEPS.length - 1) {
      goToStep(wizardState.currentStep + 1);
    }
  }, [wizardState.currentStep, goToStep]);

  const previousStep = useCallback(() => {
    if (wizardState.currentStep > 0) {
      goToStep(wizardState.currentStep - 1);
    }
  }, [wizardState.currentStep, goToStep]);

  // ============================================================================
  // Completion Handler
  // ============================================================================

  const handleSubmit = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Clear any draft
      if (!initialAudioId) {
        clearDraftFromLocalStorage();
      }

      onComplete();
    } catch (err) {
      console.error('Failed to complete audio production:', err);
      setError(err instanceof Error ? err.message : 'Failed to complete audio production');
    } finally {
      setIsLoading(false);
    }
  }, [initialAudioId, onComplete, clearDraftFromLocalStorage]);

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

    if (!initialAudioId) {
      clearDraftFromLocalStorage();
    }

    onClose();
  }, [wizardState.isDirty, initialAudioId, onClose, clearDraftFromLocalStorage]);

  // ============================================================================
  // Step Content Renderer
  // ============================================================================

  const renderStepContent = () => {
    const currentStepNumber = AUDIO_PRODUCTION_STEPS[wizardState.currentStep].number;

    switch (currentStepNumber) {
      case 1:
        return (
          <Step1AudioImport
            selectedAudioUrl={wizardState.selectedAudioUrl}
            onAudioSelect={(id, url) => {
              setWizardState(prev => ({
                ...prev,
                selectedAudioId: id,
                selectedAudioUrl: url,
                isDirty: true,
              }));
            }}
          />
        );

      case 2:
        return (
          <Step2AnalyzeStructure
            isAnalyzing={store.isAnalyzing}
            analysisError={store.analysisError}
            musicStructure={store.musicStructure}
            onAnalyze={store.analyzeStructure}
            currentTrackUrl={store.currentTrackUrl}
          />
        );

      case 3:
        return (
          <Step3RemixStyle
            selectedStyle={store.selectedStyle}
            onStyleSelect={store.setRemixStyle}
          />
        );

      case 4:
        return (
          <Step4Duration
            targetDuration={store.targetDuration}
            musicStructure={store.musicStructure}
            onDurationChange={store.setTargetDuration}
          />
        );

      case 5:
        return (
          <Step5Effects
            fadeInDuration={store.fadeInDuration}
            fadeOutDuration={store.fadeOutDuration}
            crossfadeDuration={store.crossfadeDuration}
            preserveIntro={store.preserveIntro}
            preserveOutro={store.preserveOutro}
            suggestedCuts={store.suggestedCuts}
            selectedCuts={store.selectedCuts}
            onEffectChange={store.applyEffect}
            onToggleCut={store.toggleCut}
          />
        );

      case 6:
        return (
          <Step6Export
            isExporting={store.isExporting}
            exportError={store.exportError}
            exportedUrl={store.exportedUrl}
            onExport={store.export}
          />
        );

      default:
        return <div>Unknown step</div>;
    }
  };

  const canProceedToNextStep = useCallback(() => {
    if (wizardState.currentStep === 0 && !wizardState.selectedAudioId) {
      return false;
    }
    return true;
  }, [wizardState.currentStep, wizardState.selectedAudioId]);

  // Handle Escape key
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="wizard-modal-overlay" onClick={handleCancel}>
      <div className="wizard-modal-container max-w-6xl h-[92vh]" onClick={(e) => e.stopPropagation()}>
        <ProductionWizardContainer
          title="Sonic Remix Architect"
          steps={AUDIO_PRODUCTION_STEPS}
          currentStep={wizardState.currentStep}
          onNextStep={nextStep}
          onPreviousStep={previousStep}
          onGoToStep={goToStep}
          onCancel={handleCancel}
          onComplete={handleSubmit}
          canProceed={canProceedToNextStep()}
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
            <div className="overflow-y-auto h-full p-8">
              {renderStepContent()}
            </div>
          )}
        </ProductionWizardContainer>
      </div>
    </div>
  );
}

// ============================================================================
// Step Components
// ============================================================================

interface Step1AudioImportProps {
  selectedAudioUrl: string | null;
  onAudioSelect: (audioId: string, audioUrl: string) => void;
}

function Step1AudioImport({ selectedAudioUrl, onAudioSelect }: Step1AudioImportProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Import Audio Track</h3>
        <p className="text-muted-foreground">
          Select an audio file to remix. Supported formats: MP3, WAV, OGG, FLAC.
        </p>
      </div>

      <div className="border-2 border-dashed border-primary/30 rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
        <div className="mb-4">
          <span className="text-4xl text-primary"><Music size={48} className="mx-auto" /></span>
        </div>
        <p className="mb-2 font-medium">Drop your audio file here</p>
        <p className="text-sm text-muted-foreground mb-4">or click to browse</p>
        <button 
          onClick={() => onAudioSelect('mock-track-1', 'https://example.com/audio.mp3')}
          className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
        >
          Browse Files
        </button>
      </div>

      {selectedAudioUrl && (
        <div className="p-4 bg-accent/10 rounded-lg border border-primary/20">
          <p className="font-medium">Selected: {selectedAudioUrl.split('/').pop()}</p>
        </div>
      )}
    </div>
  );
}

interface Step2AnalyzeStructureProps {
  isAnalyzing: boolean;
  analysisError: string | null;
  musicStructure: MusicStructure | null;
  onAnalyze: () => Promise<void>;
  currentTrackUrl: string | null;
}

function Step2AnalyzeStructure({
  isAnalyzing,
  analysisError,
  musicStructure,
  onAnalyze,
  currentTrackUrl,
}: Step2AnalyzeStructureProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Analyze Structure</h3>
        <p className="text-muted-foreground">
          Analyze the audio track to detect beats, sections, and structure.
        </p>
      </div>

      {!currentTrackUrl ? (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-yellow-700 dark:text-yellow-400">
            Please import an audio file first to analyze its structure.
          </p>
        </div>
      ) : (
        <>
          <button
            onClick={onAnalyze}
            disabled={isAnalyzing}
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze Structure'}
          </button>

          {analysisError && (
            <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-700 dark:text-red-400">{analysisError}</p>
            </div>
          )}

          {musicStructure && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-accent/10 rounded-lg">
                  <p className="text-sm text-muted-foreground">Duration</p>
                  <p className="text-xl font-semibold">{Math.round(musicStructure.duration)}s</p>
                </div>
                <div className="p-4 bg-accent/10 rounded-lg">
                  <p className="text-sm text-muted-foreground">Tempo (BPM)</p>
                  <p className="text-xl font-semibold">{musicStructure.tempo || 'N/A'}</p>
                </div>
                <div className="p-4 bg-accent/10 rounded-lg">
                  <p className="text-sm text-muted-foreground">Sections</p>
                  <p className="text-xl font-semibold">{musicStructure.sections?.length || 0}</p>
                </div>
              </div>

              {musicStructure.sections && musicStructure.sections.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Detected Sections</h4>
                  <div className="space-y-2">
                    {musicStructure.sections.map((section, index) => (
                      <div key={index} className="p-3 bg-accent/5 rounded border border-primary/10">
                        <div className="flex justify-between">
                          <span className="font-medium">{section.label || section.sectionType || `Section ${index + 1}`}</span>
                          <span className="text-muted-foreground">
                            {Math.round(section.startTime)}s - {Math.round(section.endTime)}s
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface Step3RemixStyleProps {
  selectedStyle: RemixStyle;
  onStyleSelect: (style: RemixStyle) => void;
}

function Step3RemixStyle({ selectedStyle, onStyleSelect }: Step3RemixStyleProps) {
  const styles: { id: RemixStyle; name: string; description: string }[] = [
    { id: 'smooth', name: 'Smooth', description: 'Seamless transitions with crossfades' },
    { id: 'beat-cut', name: 'Beat Cut', description: 'Precise cuts aligned to beats' },
    { id: 'structural', name: 'Structural', description: 'Restructure sections' },
    { id: 'dynamic', name: 'Dynamic', description: 'Add energy and variation' },
    { id: 'ai-generative', name: 'AI Generative', description: 'AI-powered remixing' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Choose Remix Style</h3>
        <p className="text-muted-foreground">
          Select how you want to remix this audio track.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {styles.map(style => (
          <button
            key={style.id}
            onClick={() => onStyleSelect(style.id)}
            className={`p-4 rounded-lg border text-left transition-all ${
              selectedStyle === style.id
                ? 'border-primary bg-primary/10 shadow-inner'
                : 'border-primary/20 hover:border-primary/40'
            }`}
          >
            <p className="font-medium">{style.name}</p>
            <p className="text-sm text-muted-foreground">{style.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

interface Step4DurationProps {
  targetDuration: number;
  musicStructure: MusicStructure | null;
  onDurationChange: (duration: number) => void;
}

function Step4Duration({ targetDuration, musicStructure, onDurationChange }: Step4DurationProps) {
  const originalDuration = musicStructure?.duration || 180;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Adjust Duration</h3>
        <p className="text-muted-foreground">
          Set the target duration for your remix.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">
            Target Duration: {Math.round(targetDuration)} seconds
          </label>
          <input
            type="range"
            min="10"
            max={Math.round(originalDuration * 2)}
            value={targetDuration}
            onChange={(e) => onDurationChange(Number(e.target.value))}
            className="w-full"
            title="Duration slider"
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>10s</span>
            <span>{Math.round(originalDuration * 2)}s</span>
          </div>
        </div>

        <div className="p-4 bg-accent/10 rounded-lg">
          <p className="text-sm text-muted-foreground">Original Duration</p>
          <p className="text-2xl font-semibold">{Math.round(originalDuration)} seconds</p>
          <p className="text-sm mt-2">
            {targetDuration < originalDuration
              ? `Will remove ${Math.round(originalDuration - targetDuration)} seconds`
              : `Will add ${Math.round(targetDuration - originalDuration)} seconds`
            }
          </p>
        </div>
      </div>
    </div>
  );
}

interface Step5EffectsProps {
  fadeInDuration: number;
  fadeOutDuration: number;
  crossfadeDuration: number;
  preserveIntro: boolean;
  preserveOutro: boolean;
  suggestedCuts: Array<{
    id?: string;
    section: string;
    originalStart: number;
    originalEnd: number;
    suggestedStart: number;
    suggestedEnd: number;
    removed: number;
  }>;
  selectedCuts: string[];
  onEffectChange: (effect: string, value: number | boolean) => void;
  onToggleCut: (cutId: string) => void;
}

function Step5Effects({
  fadeInDuration,
  fadeOutDuration,
  crossfadeDuration,
  preserveIntro,
  preserveOutro,
  suggestedCuts,
  selectedCuts,
  onEffectChange,
  onToggleCut,
}: Step5EffectsProps) {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold mb-2">Effects & Modifications</h3>
        <p className="text-muted-foreground">
          Finetune the remix with effects and structural modifications.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div className="space-y-6">
          <h4 className="font-medium">Transitions</h4>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm">Fade In</label>
                <span className="text-sm font-medium">{fadeInDuration}s</span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                step="0.1"
                value={fadeInDuration}
                onChange={(e) => onEffectChange('fadeIn', parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm">Fade Out</label>
                <span className="text-sm font-medium">{fadeOutDuration}s</span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                step="0.1"
                value={fadeOutDuration}
                onChange={(e) => onEffectChange('fadeOut', parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm">Crossfade</label>
                <span className="text-sm font-medium">{crossfadeDuration}s</span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                step="0.1"
                value={crossfadeDuration}
                onChange={(e) => onEffectChange('crossfade', parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h4 className="font-medium">Preservation</h4>
          
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={preserveIntro}
                onChange={(e) => onEffectChange('preserveIntro', e.target.checked)}
                className="rounded text-primary"
              />
              <span>Preserve Original Intro</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={preserveOutro}
                onChange={(e) => onEffectChange('preserveOutro', e.target.checked)}
                className="rounded text-primary"
              />
              <span>Preserve Original Outro</span>
            </label>
          </div>
        </div>
      </div>

      {suggestedCuts.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-primary/10">
          <h4 className="font-medium italic text-primary">Suggested Structural Optimizations</h4>
          <div className="grid grid-cols-1 gap-3">
            {suggestedCuts.map((cut, index) => {
              const cutId = cut.id || `cut-${index}`;
              const isSelected = selectedCuts.includes(cutId);
              
              return (
                <div 
                  key={cutId}
                  className={`p-4 rounded-lg border transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-primary/20 border-primary shadow-sm' 
                      : 'bg-accent/5 border-primary/10 hover:border-primary/30'
                  }`}
                  onClick={() => onToggleCut(cutId)}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                        isSelected ? 'bg-primary border-primary' : 'border-primary/30'
                      }`}>
                        {isSelected && <div className="w-2 h-2 bg-white rounded-sm" />}
                      </div>
                      <span className="font-medium">Section: {cut.section}</span>
                    </div>
                    <span className="text-xs font-mono text-muted-foreground">
                      {Math.round(cut.originalStart)}s → {Math.round(cut.originalEnd)}s 
                      <span className="ml-2 text-amber-500">(-{Math.round(cut.removed)}s)</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

interface Step6ExportProps {
  isExporting: boolean;
  exportError: string | null;
  exportedUrl: string | null;
  onExport: (format?: string) => Promise<string>;
}

function Step6Export({ isExporting, exportError, exportedUrl, onExport }: Step6ExportProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Export Settings</h3>
        <p className="text-muted-foreground">
          Configure and export your remixed audio.
        </p>
      </div>

      {!exportedUrl ? (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Output Format</label>
            <select className="w-full px-3 py-2 border border-primary/20 rounded bg-background" title="Output format selection">
              <option value="mp3">MP3 (128 kbps)</option>
              <option value="mp3-high">MP3 (320 kbps)</option>
              <option value="wav">WAV (Lossless)</option>
              <option value="flac">FLAC (Lossless)</option>
            </select>
          </div>

          <button
            onClick={() => onExport('mp3')}
            disabled={isExporting}
            className="w-full px-4 py-3 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {isExporting ? 'Exporting...' : 'Export Audio'}
          </button>

          {exportError && (
            <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-700 dark:text-red-400">{exportError}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-green-700 dark:text-green-400 font-medium">Export Complete!</p>
            <p className="text-sm mt-1">Your audio has been exported successfully.</p>
          </div>

          <audio controls src={exportedUrl} className="w-full mt-4" />

          <a
            href={exportedUrl}
            download="remixed-audio.mp3"
            className="block text-center px-4 py-3 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors mt-4"
          >
            Download Remix
          </a>
        </div>
      )}
    </div>
  );
}
