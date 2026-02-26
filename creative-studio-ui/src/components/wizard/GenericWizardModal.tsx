/**
 * Generic Wizard Modal Component
 * 
 * A reusable modal component that can display any wizard form dynamically
 * based on the wizard type. Provides consistent modal UI, keyboard navigation,
 * and accessibility features.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, Info, X } from 'lucide-react';
import { useAppStore, type WizardType as AppWizardType } from '@/stores/useAppStore';
import { useWizardStore } from '@/stores/wizard/wizardStore';
import { useToast } from '@/hooks/use-toast';
import { LLMStatusBanner } from './LLMStatusBanner';
import { DialogueWriterForm } from './forms/DialogueWriterForm';
import { SceneGeneratorForm } from './forms/SceneGeneratorForm';
import { StoryboardCreatorForm } from './forms/StoryboardCreatorForm';
import { StyleTransferForm } from './forms/StyleTransferForm';
import type { Character } from '@/types/character';
import type { DashboardShot } from '@/types';
import { WizardChainOptions } from './WizardChainOptions';
import type { WizardChainOption } from './WizardChainOptions';
import './WizardModal.css';

// Supported wizard types for GenericWizardModal
const SUPPORTED_WIZARD_TYPES: AppWizardType[] = [
  'dialogue-writer',
  'scene-generator',
  'storyboard-creator',
  'style-transfer',
  'sequence-plan',
  'shot',
  'audio-production-wizard',
];

function isWizardTypeSupported(type: AppWizardType | null | undefined): type is AppWizardType {
  return type !== null && type !== undefined && SUPPORTED_WIZARD_TYPES.includes(type);
}

interface WizardConfig {
  title: string;
  description: string;
  submitLabel: string;
  requiresCharacters?: boolean;
  requiresShots?: boolean;
}

const PLACEHOLDER_CONFIG: WizardConfig = {
  title: 'Wizard',
  description: 'This wizard is handled by a specialized modal.',
  submitLabel: 'Submit',
};

const WIZARD_CONFIG: Record<AppWizardType, WizardConfig> = {
  'dialogue-writer': {
    title: 'Dialogue Writer',
    description: 'Generate natural dialogue for your scenes. Requires at least one character.',
    submitLabel: 'Generate Dialogue',
    requiresCharacters: true,
  },
  'scene-generator': {
    title: 'Scene Generator',
    description: 'Create complete scenes with AI assistance',
    submitLabel: 'Generate Scene',
    requiresCharacters: false,
  },
  'storyboard-creator': {
    title: 'Storyboard Creator',
    description: 'Transform scripts into visual storyboards',
    submitLabel: 'Create Storyboard',
  },
  'style-transfer': {
    title: 'Style Transfer',
    description: 'Apply artistic styles to your shots',
    submitLabel: 'Apply Style',
    requiresShots: true,
  },
  'sequence-plan': {
    title: 'Sequence Plan',
    description: 'Plan your video sequence',
    submitLabel: 'Create Plan',
  },
  'shot': {
    title: 'Shot',
    description: 'Create a new shot',
    submitLabel: 'Create Shot',
  },
  'roger-wizard': PLACEHOLDER_CONFIG,
  'ghost-tracker-wizard': PLACEHOLDER_CONFIG,
  'lip-sync': PLACEHOLDER_CONFIG,
  'scenario-builder': PLACEHOLDER_CONFIG,
  'dialogue-builder': PLACEHOLDER_CONFIG,
  'audio-production-wizard': PLACEHOLDER_CONFIG,
  'video-editor-wizard': PLACEHOLDER_CONFIG,
  'comic-to-sequence-wizard': PLACEHOLDER_CONFIG,
  'marketing-wizard': PLACEHOLDER_CONFIG,
};

interface WizardFormRendererProps {
  wizardType: AppWizardType;
  onSubmit: (data: unknown) => void;
  onCancel: () => void;
  onChange?: (data: unknown) => void;
  onFormReady?: (submitFn: () => void) => void;
  onValidationChange?: (isValid: boolean) => void;
}

function WizardFormRenderer({
  wizardType,
  onSubmit,
  onCancel,
  onChange,
  onFormReady,
  onValidationChange,
}: WizardFormRendererProps): React.ReactElement {
  const project = useAppStore((state) => state.project);
  const shots = useAppStore((state) => state.shots);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [projectShots, setProjectShots] = useState<DashboardShot[]>([]);
  const [isFormValid, setIsFormValid] = useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);

  useEffect(() => {
    onValidationChange?.(isFormValid);
  }, [isFormValid, onValidationChange]);

  useEffect(() => {
    if (!isLoading && !error && formRef.current) {
      const submitFn = () => {
        formRef.current?.dispatchEvent(
          new Event('submit', { cancelable: true, bubbles: true })
        );
      };
      onFormReady?.(submitFn);
    }
  }, [isLoading, error, onFormReady]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const config = WIZARD_CONFIG[wizardType];

        if (config.requiresCharacters) {
          if (!project?.characters || project.characters.length === 0) {
            setError('⚠️ No characters available. Please create at least one character using the Character Wizard before using this tool.');
            setIsLoading(false);
            return;
          }
          setCharacters(project.characters);
        }

        if (config.requiresShots) {
          if (!shots || shots.length === 0) {
            setError('No shots available. Create shots first using other wizards or manually.');
            setIsLoading(false);
            return;
          }
          setProjectShots(shots);
        }

        setIsLoading(false);
      } catch (err) {
        console.error('[WizardFormRenderer] Data fetch error:', err);
        setError('Failed to load project data. Please try again.');
        setIsLoading(false);
      }
    };

    fetchData();
  }, [wizardType, project, shots]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">Loading project data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8 px-4 bg-amber-500/10 border border-amber-500/30 rounded-xl p-8 my-4">
        <AlertCircle className="h-16 w-16 mb-4 text-amber-500" />
        <p className="text-base font-semibold text-center mb-2 text-amber-200">
          {error.includes('⚠️') ? error : `⚠️ ${error}`}
        </p>
        <p className="text-sm text-center mb-4 text-amber-200/70">
          This wizard requires characters to function properly.
        </p>
        <Button
          variant="outline"
          onClick={onCancel}
          className="border-amber-500/50 text-amber-500 hover:bg-amber-500/10"
        >
          Close and Create Characters
        </Button>
      </div>
    );
  }

  switch (wizardType) {
    case 'dialogue-writer':
      return (
        <DialogueWriterForm
          ref={formRef}
          characters={characters.map(c => ({ id: c.character_id, name: c.name }))}
          onSubmit={onSubmit}
          onCancel={onCancel}
          onChange={onChange}
          onValidationChange={setIsFormValid}
          showFooter={false}
        />
      );

    case 'scene-generator':
      return (
        <SceneGeneratorForm
          ref={formRef}
          characters={characters.map(c => ({ id: c.character_id, name: c.name }))}
          onSubmit={onSubmit}
          onCancel={onCancel}
          onChange={onChange}
          onValidationChange={setIsFormValid}
        />
      );

    case 'storyboard-creator':
      return (
        <StoryboardCreatorForm
          ref={formRef}
          onSubmit={onSubmit}
          onCancel={onCancel}
          onChange={onChange}
          onValidationChange={setIsFormValid}
        />
      );

    case 'style-transfer':
      return (
        <StyleTransferForm
          ref={formRef}
          shots={projectShots.map(s => ({ id: s.id, title: s.title, frame_path: s.image }))}
          onSubmit={onSubmit}
          onChange={onChange}
          onValidationChange={setIsFormValid}
        />
      );

    default:
      return <div className="p-4 text-center text-muted-foreground">Specialized wizard - form handled externally.</div>;
  }
}

export interface GenericWizardModalProps {
  isOpen: boolean;
  wizardType: AppWizardType | null;
  onClose: () => void;
  onComplete?: (data: unknown) => void;
}

export function GenericWizardModal({
  isOpen,
  wizardType,
  onClose,
  onComplete,
}: GenericWizardModalProps): React.ReactElement | null {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitFormFn, setSubmitFormFn] = useState<(() => void) | null>(null);
  const [isFormValid, setIsFormValid] = useState(false);
  const [showChainOptions, setShowChainOptions] = useState(false);
  const [chainOptions, setChainOptions] = useState({
    isChained: false,
    triggeredWizards: [] as WizardChainOption[],
    currentChainIndex: 0,
  });
  const [isChainLoading, setIsChainLoading] = useState(false);
  const { toast } = useToast();
  const setShowLLMSettings = useAppStore((state) => state.setShowLLMSettings);

  const wizardTypeFromStore = useWizardStore((state) => state.wizardType) as AppWizardType | null;
  const effectiveWizardType = wizardType || wizardTypeFromStore;

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
      
      setIsSubmitting(false);
      setSubmitFormFn(null);
      setIsFormValid(false);
      setShowChainOptions(false);
    } else {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleKeyDown]);

  const handleLaunchNextWizard = useCallback(() => {
    setIsChainLoading(true);
    try {
      onClose();
      setChainOptions(prev => ({
        ...prev,
        currentChainIndex: prev.currentChainIndex + 1,
      }));
      setShowChainOptions(false);
    } catch (error) {
      console.error('[GenericWizardModal] Error launching next wizard:', error);
    } finally {
      setIsChainLoading(false);
    }
  }, [onClose]);

  const handleSkipChain = useCallback(() => {
    setChainOptions({
      isChained: false,
      triggeredWizards: [],
      currentChainIndex: 0,
    });
    setShowChainOptions(false);
    onClose();
  }, [onClose]);

  const handleContinue = useCallback(() => {
    setChainOptions({
      isChained: false,
      triggeredWizards: [],
      currentChainIndex: 0,
    });
    setShowChainOptions(false);
    onClose();
  }, [onClose]);

  const handleFormSubmit = useCallback(async (formData: unknown) => {
    setIsSubmitting(true);
    try {
      await onComplete?.(formData);

      const wizardConfig = effectiveWizardType ? WIZARD_CONFIG[effectiveWizardType] : null;
      if (wizardConfig) {
        toast({
          title: 'Success',
          description: `${wizardConfig.title} completed successfully.`,
          variant: 'default',
        });
      }

      if (chainOptions.isChained && chainOptions.triggeredWizards.length > 0 &&
        chainOptions.currentChainIndex < chainOptions.triggeredWizards.length) {
        setShowChainOptions(true);
        setIsSubmitting(false);
        return;
      }

      onClose();
    } catch (error) {
      console.error('[GenericWizardModal] Submission error:', error);
      const errorMessage = error instanceof Error
        ? error.message
        : 'An unexpected error occurred. Please try again.';

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [onComplete, onClose, effectiveWizardType, toast, chainOptions]);

  const handleSubmitClick = useCallback(() => {
    if (submitFormFn) {
      submitFormFn();
    }
  }, [submitFormFn]);

  const handleFormReady = useCallback((submitFn: () => void) => {
    setSubmitFormFn(() => submitFn);
  }, []);

  const handleValidationChange = useCallback((isValid: boolean) => {
    setIsFormValid(isValid);
  }, []);

  if (!isOpen || !effectiveWizardType) {
    return null;
  }

  if (!isWizardTypeSupported(effectiveWizardType)) {
    const unsupportedMessage = effectiveWizardType === 'world' ||
      effectiveWizardType === 'character' ||
      effectiveWizardType === 'storyteller' ? (
      <div className="flex flex-col items-center justify-center py-8 px-4 text-white">
        <Info className="h-12 w-12 mb-4 text-blue-500" />
        <p className="text-base font-semibold text-center mb-2">
          This wizard type uses a dedicated modal
        </p>
        <p className="text-sm text-center text-muted-foreground mb-4">
          The "{effectiveWizardType}" wizard is handled by a specialized modal with multi-step support.
        </p>
        <Button variant="outline" onClick={onClose} className="border-white/10">
          Close
        </Button>
      </div>
    ) : (
      <div className="flex flex-col items-center justify-center py-8 px-4 text-white">
        <AlertCircle className="h-12 w-12 mb-4 text-destructive" />
        <p className="text-base font-semibold text-center mb-2">
          Unsupported wizard type: {effectiveWizardType}
        </p>
        <p className="text-sm text-center text-muted-foreground mb-4">
          Please use a valid wizard type from the supported list.
        </p>
        <Button variant="outline" onClick={onClose} className="border-white/10">
          Close
        </Button>
      </div>
    );

    return (
      <div className="wizard-modal-overlay" onClick={onClose}>
        <div className="wizard-modal-container max-w-md" onClick={(e) => e.stopPropagation()}>
          <div className="wizard-modal-header">
            <h2 className="wizard-modal-title">Wizard Not Available</h2>
            <button
              className="wizard-modal-close"
              onClick={onClose}
              aria-label="Close wizard"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="wizard-modal-content">
            {unsupportedMessage}
          </div>
        </div>
      </div>
    );
  }

  const wizardConfig = WIZARD_CONFIG[effectiveWizardType];

  return (
    <div className="wizard-modal-overlay" onClick={onClose}>
      <div className="wizard-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="wizard-modal-header">
          <div className="flex flex-col">
            <h2 className="wizard-modal-title">{wizardConfig.title}</h2>
            <p className="text-xs text-muted-foreground mt-1 font-normal tracking-wide uppercase">{wizardConfig.description}</p>
          </div>
          <button
            className="wizard-modal-close"
            onClick={onClose}
            aria-label="Close wizard"
            disabled={isSubmitting}
          >
            <X size={20} />
          </button>
        </div>

        <div className="wizard-modal-content flex flex-col h-full overflow-hidden">
          <LLMStatusBanner onConfigure={() => setShowLLMSettings(true)} />

          <div className="relative flex-1 overflow-y-auto px-6 py-4">
            {isSubmitting && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="text-sm text-primary font-bold tracking-widest uppercase">Processing...</span>
                </div>
              </div>
            )}

            <WizardFormRenderer
              wizardType={effectiveWizardType}
              onSubmit={handleFormSubmit}
              onCancel={onClose}
              onFormReady={handleFormReady}
              onValidationChange={handleValidationChange}
            />
          </div>

          {showChainOptions && chainOptions.isChained && chainOptions.triggeredWizards.length > 0 && (
            <div className="px-6 pb-4 border-t border-primary/10 pt-4 bg-black/40">
              <WizardChainOptions
                isChained={chainOptions.isChained}
                triggeredWizards={chainOptions.triggeredWizards}
                currentChainIndex={chainOptions.currentChainIndex}
                onLaunchNext={handleLaunchNextWizard}
                onSkipChain={handleSkipChain}
                onContinue={handleContinue}
                isLoading={isChainLoading}
              />
            </div>
          )}

          <div className="p-6 border-t border-primary/20 flex justify-between bg-black/60 mt-auto">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="border-white/10 hover:bg-white/5 text-slate-400"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmitClick}
              disabled={isSubmitting || !submitFormFn || !isFormValid}
              className="bg-primary text-primary-foreground font-bold px-8 shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Synchronizing...' : wizardConfig.submitLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
