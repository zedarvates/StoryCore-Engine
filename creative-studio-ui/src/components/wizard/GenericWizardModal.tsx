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
import { DialogueWriterForm } from './forms/DialogueWriterForm';
import { SceneGeneratorForm } from './forms/SceneGeneratorForm';
import { StoryboardCreatorForm } from './forms/StoryboardCreatorForm';
import { StyleTransferForm } from './forms/StyleTransferForm';
import { WorldBuildingForm } from './forms/WorldBuildingForm';
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
    description: 'Generate natural dialogue for your scenes',
    component: DialogueWriterForm,
    submitLabel: 'Generate Dialogue',
    requiresCharacters: true,
  },
  'scene-generator': {
    title: 'Scene Generator',
    description: 'Create complete scenes with AI assistance',
    component: SceneGeneratorForm,
    submitLabel: 'Generate Scene',
    requiresCharacters: true,
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
  'world-building': {
    title: 'World Building',
    description: 'Design rich, detailed worlds for your stories',
    component: WorldBuildingForm,
    submitLabel: 'Create World',
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
}

function WizardFormRenderer({
  wizardType,
  onSubmit,
  onCancel,
  onChange,
  onFormReady,
}: WizardFormRendererProps): React.ReactElement {
  const project = useAppStore((state) => state.project);
  const shots = useAppStore((state) => state.shots);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [projectShots, setProjectShots] = useState<Shot[]>([]);
  const formRef = React.useRef<HTMLFormElement>(null);

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
            setError('No characters available. Create characters first using the Character Wizard.');
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
      <div className="flex flex-col items-center justify-center py-8 px-4">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-sm text-center text-muted-foreground mb-4">{error}</p>
        <Button variant="outline" onClick={onCancel}>
          Close
        </Button>
      </div>
    );
  }

  // Render the appropriate wizard form
  const config = WIZARD_CONFIG[wizardType];

  // Wrapper to add ref to form elements
  const wrapFormWithRef = (formElement: React.ReactElement) => {
    return React.cloneElement(formElement, { ref: formRef } as any);
  };

  // Map wizard type to form props
  switch (wizardType) {
    case 'dialogue-writer':
      return wrapFormWithRef(
        <DialogueWriterForm
          characters={characters.map(c => ({ id: c.character_id, name: c.name }))}
          onSubmit={onSubmit}
          onCancel={onCancel}
          onChange={onChange}
        />
      );

    case 'scene-generator':
      return wrapFormWithRef(
        <SceneGeneratorForm
          characters={characters.map(c => ({ id: c.character_id, name: c.name }))}
          onSubmit={onSubmit}
          onCancel={onCancel}
          onChange={onChange}
        />
      );

    case 'storyboard-creator':
      return wrapFormWithRef(
        <StoryboardCreatorForm
          onSubmit={onSubmit}
          onCancel={onCancel}
          onChange={onChange}
        />
      );

    case 'style-transfer':
      return wrapFormWithRef(
        <StyleTransferForm
          shots={projectShots.map(s => ({ id: s.id, title: s.title, frame_path: s.frame_path }))}
          onSubmit={onSubmit}
          onChange={onChange}
        />
      );

    case 'world-building':
      return wrapFormWithRef(
        <WorldBuildingForm
          onSubmit={onSubmit}
          onChange={onChange}
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

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setIsSubmitting(false);
      setSubmitFormFn(null);
    }
  }, [isOpen]);

  // Handle form submission from wizard forms
  const handleFormSubmit = useCallback(async (formData: any) => {
    setIsSubmitting(true);
    try {
      // Call completion handler with form data
      await onComplete?.(formData);
      
      // Close modal on success
      onClose();
    } catch (error) {
      console.error('[GenericWizardModal] Submission error:', error);
      // Error handling will be enhanced in later tasks
    } finally {
      setIsSubmitting(false);
    }
  }, [onComplete, onClose]);

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

        {/* Render wizard form */}
        <div className="py-4">
          <WizardFormRenderer
            wizardType={wizardType}
            onSubmit={handleFormSubmit}
            onCancel={onClose}
            onChange={handleFormChange}
            onFormReady={handleFormReady}
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
            disabled={isSubmitting || !submitFormFn}
          >
            {isSubmitting ? 'Processing...' : wizardConfig.submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
