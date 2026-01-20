/**
 * Generic Wizard Modal Component
 * 
 * A reusable modal component that can display any wizard form dynamically
 * based on the wizard type. Provides consistent modal UI, keyboard navigation,
 * and accessibility features.
 * 
 * Requirements: 2.1, 2.2, 2.4
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle } from 'lucide-react';
import { useAppStore, type WizardType } from '@/stores/useAppStore';
import { useToast } from '@/hooks/use-toast';
import { LLMStatusBanner } from './LLMStatusBanner';
import { DialogueWriterForm } from './forms/DialogueWriterForm';
import { SceneGeneratorForm } from './forms/SceneGeneratorForm';
import { StoryboardCreatorForm } from './forms/StoryboardCreatorForm';
import { StyleTransferForm } from './forms/StyleTransferForm';
import type { Character } from '@/types/character';
import type { Shot } from '@/types';

// Wizard configuration interface
interface WizardConfig {
  title: string;
  description: string;
  component: React.ComponentType<any>;
  submitLabel: string;
  requiresCharacters?: boolean;
  requiresShots?: boolean;
}

// Wizard configuration mapping
const WIZARD_CONFIG: Record<WizardType, WizardConfig> = {
  'dialogue-writer': {
    title: 'Dialogue Writer',
    description: 'Generate natural dialogue for your scenes. Requires at least one character.',
    component: DialogueWriterForm,
    submitLabel: 'Generate Dialogue',
    requiresCharacters: true,
  },
  'scene-generator': {
    title: 'Scene Generator',
    description: 'Create complete scenes with AI assistance',
    component: SceneGeneratorForm,
    submitLabel: 'Generate Scene',
    requiresCharacters: false, // Scenes can exist without characters (documentaries, voiceover, etc.)
  },
  'storyboard-creator': {
    title: 'Storyboard Creator',
    description: 'Transform scripts into visual storyboards',
    component: StoryboardCreatorForm,
    submitLabel: 'Create Storyboard',
  },
  'style-transfer': {
    title: 'Style Transfer',
    description: 'Apply artistic styles to your shots',
    component: StyleTransferForm,
    submitLabel: 'Apply Style',
    requiresShots: true,
  },
  // Note: 'sequence-plan' and 'shot' wizards are handled by separate modals
  // 'world' and 'character' wizards are multi-step and use WorldWizardModal/CharacterWizardModal
  'sequence-plan': {
    title: 'Sequence Plan',
    description: 'Plan your video sequence',
    component: () => null, // Handled by SequencePlanWizardModal
    submitLabel: 'Create Plan',
  },
  'shot': {
    title: 'Shot',
    description: 'Create a new shot',
    component: () => null, // Handled by ShotWizardModal
    submitLabel: 'Create Shot',
  },
};

/**
 * WizardFormRenderer Component
 * 
 * Internal component that renders the appropriate wizard form with proper data injection.
 * Handles data fetching, loading states, and error handling.
 * 
 * Requirements: 2.2, 8.1, 8.2, 8.3, 8.4
 */
interface WizardFormRendererProps {
  wizardType: WizardType;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  onChange?: (data: any) => void;
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
  const [projectShots, setProjectShots] = useState<Shot[]>([]);
  const [isFormValid, setIsFormValid] = useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);

  // Handler for validation state changes - MUST be defined before any conditional returns
  const handleValidationChange = useCallback((isValid: boolean) => {
    setIsFormValid(isValid);
  }, []);

  // Wrapper to add ref to form elements
  const wrapFormWithRef = useCallback((formElement: React.ReactElement) => {
    return React.cloneElement(formElement, { ref: formRef } as any);
  }, []);

  // Notify parent of validation state changes
  useEffect(() => {
    onValidationChange?.(isFormValid);
  }, [isFormValid, onValidationChange]);

  // Notify parent when form is ready
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

  // Fetch project data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const config = WIZARD_CONFIG[wizardType];

        // Fetch characters if required
        if (config.requiresCharacters) {
          if (!project?.characters || project.characters.length === 0) {
            setError('⚠️ No characters available. Please create at least one character using the Character Wizard before using this tool.');
            setIsLoading(false);
            return;
          }
          setCharacters(project.characters);
        }

        // Fetch shots if required
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

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">Loading project data...</span>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8 px-4" style={{
        backgroundColor: '#fef3c7',
        border: '2px solid #f59e0b',
        borderRadius: '0.75rem',
        padding: '2rem',
        margin: '1rem 0'
      }}>
        <AlertCircle className="h-16 w-16 mb-4" style={{ color: '#f59e0b' }} />
        <p className="text-base font-semibold text-center mb-2" style={{ color: '#92400e' }}>
          {error.includes('⚠️') ? error : `⚠️ ${error}`}
        </p>
        <p className="text-sm text-center mb-4" style={{ color: '#78350f' }}>
          This wizard requires characters to function properly.
        </p>
        <Button 
          variant="outline" 
          onClick={onCancel}
          style={{
            borderColor: '#f59e0b',
            color: '#92400e',
            fontWeight: '600'
          }}
        >
          Close and Create Characters
        </Button>
      </div>
    );
  }

  // Render the appropriate wizard form
  const config = WIZARD_CONFIG[wizardType];

  // Map wizard type to form props
  switch (wizardType) {
    case 'dialogue-writer':
      return wrapFormWithRef(
        <DialogueWriterForm
          characters={characters.map(c => ({ id: c.character_id, name: c.name }))}
          onSubmit={onSubmit}
          onCancel={onCancel}
          onChange={onChange}
          onValidationChange={handleValidationChange}
        />
      );

    case 'scene-generator':
      return wrapFormWithRef(
        <SceneGeneratorForm
          characters={characters.map(c => ({ id: c.character_id, name: c.name }))}
          onSubmit={onSubmit}
          onCancel={onCancel}
          onChange={onChange}
          onValidationChange={handleValidationChange}
        />
      );

    case 'storyboard-creator':
      return wrapFormWithRef(
        <StoryboardCreatorForm
          onSubmit={onSubmit}
          onCancel={onCancel}
          onChange={onChange}
          onValidationChange={handleValidationChange}
        />
      );

    case 'style-transfer':
      return wrapFormWithRef(
        <StyleTransferForm
          shots={projectShots.map(s => ({ id: s.id, title: s.title, frame_path: s.image }))}
          onSubmit={onSubmit}
          onChange={onChange}
          onValidationChange={handleValidationChange}
        />
      );

    default:
      return (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">Unknown wizard type</p>
        </div>
      );
  }
}

// Generic wizard modal props
export interface GenericWizardModalProps {
  isOpen: boolean;
  wizardType: WizardType | null;
  onClose: () => void;
  onComplete?: (data: any) => void;
}

/**
 * GenericWizardModal Component
 * 
 * Displays wizard forms in a modal dialog with consistent UI and behavior.
 * Handles form submission, validation, and lifecycle management.
 */
export function GenericWizardModal({
  isOpen,
  wizardType,
  onClose,
  onComplete,
}: GenericWizardModalProps): React.ReactElement {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitFormFn, setSubmitFormFn] = useState<(() => void) | null>(null);
  const [isFormValid, setIsFormValid] = useState(false);
  const { toast } = useToast();
  const setShowLLMSettings = useAppStore((state) => state.setShowLLMSettings);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setIsSubmitting(false);
      setSubmitFormFn(null);
      setIsFormValid(false);
    }
  }, [isOpen]);

  // Handle form submission from wizard forms
  const handleFormSubmit = useCallback(async (formData: any) => {
    setIsSubmitting(true);
    try {
      // Call completion handler with form data
      await onComplete?.(formData);
      
      // Show success toast
      const wizardConfig = wizardType ? WIZARD_CONFIG[wizardType] : null;
      if (wizardConfig) {
        toast({
          title: 'Success',
          description: `${wizardConfig.title} completed successfully.`,
          variant: 'default',
        });
      }
      
      // Close modal on success
      onClose();
    } catch (error) {
      console.error('[GenericWizardModal] Submission error:', error);
      
      // Display error toast with specific message
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
  }, [onComplete, onClose, wizardType, toast]);

  // Handle submit button click
  const handleSubmitClick = useCallback(() => {
    // Trigger form submission using the submit function provided by the form
    if (submitFormFn) {
      submitFormFn();
    }
  }, [submitFormFn]);

  // Handle form ready callback
  const handleFormReady = useCallback((submitFn: () => void) => {
    setSubmitFormFn(() => submitFn);
  }, []);

  // Handle form data changes (for auto-save in later tasks)
  const handleFormChange = useCallback((data: any) => {
    // This will be used for draft auto-save in task 10
  }, []);

  // Handle validation state changes from form
  const handleValidationChange = useCallback((isValid: boolean) => {
    setIsFormValid(isValid);
  }, []);

  // Get wizard configuration
  const wizardConfig = wizardType ? WIZARD_CONFIG[wizardType] : null;

  if (!wizardType || !wizardConfig) {
    return <></>;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        aria-labelledby="wizard-modal-title"
        aria-describedby="wizard-modal-description"
      >
        <DialogHeader>
          <DialogTitle id="wizard-modal-title">
            {wizardConfig.title}
          </DialogTitle>
          <DialogDescription id="wizard-modal-description">
            {wizardConfig.description}
          </DialogDescription>
        </DialogHeader>

        {/* LLM Status Banner */}
        <LLMStatusBanner onConfigure={() => setShowLLMSettings(true)} />

        {/* Render wizard form */}
        <div className="py-4 relative">
          {/* Loading overlay during submission */}
          {isSubmitting && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-md">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Processing...</span>
              </div>
            </div>
          )}
          
          <WizardFormRenderer
            wizardType={wizardType}
            onSubmit={handleFormSubmit}
            onCancel={onClose}
            onChange={handleFormChange}
            onFormReady={handleFormReady}
            onValidationChange={handleValidationChange}
          />
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmitClick}
            disabled={isSubmitting || !submitFormFn || !isFormValid}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Processing...' : wizardConfig.submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
