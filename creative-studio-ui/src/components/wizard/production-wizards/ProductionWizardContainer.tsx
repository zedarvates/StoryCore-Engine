import React, { ReactNode, useRef, useEffect, useState, useCallback } from 'react';
import { AlertTriangle, Save, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProductionWizardStepIndicator } from './ProductionWizardStepIndicator.js';
import { ProductionWizardNavigation } from './ProductionWizardNavigation.js';
import { Button } from '@/components/ui/button';
import { WizardStep } from '@/types';
import { useWizard } from '@/contexts/WizardContext.js';
import { useToast } from '@/hooks/use-toast';

// ============================================================================
// Production Wizard Container Component
// ============================================================================

interface ProductionWizardContainerProps {
  title: string;
  steps: WizardStep[];
  children: ReactNode;
  onCancel: () => void;
  onComplete?: () => void;
  allowJumpToStep?: boolean;
  showAutoSaveIndicator?: boolean;
  className?: string;
  // Navigation state and callbacks
  currentStep?: number;
  onNextStep?: () => void;
  onPreviousStep?: () => void;
  onGoToStep?: (step: number) => void;
  canProceed?: boolean;
  isDirty?: boolean;
  lastSaved?: number;
}

export function ProductionWizardContainer({
  title,
  steps,
  children,
  onCancel,
  onComplete,
  allowJumpToStep = false,
  showAutoSaveIndicator = true,
  className,
  currentStep = 0,
  onNextStep,
  onPreviousStep,
  onGoToStep,
  canProceed = true,
  isDirty = false,
  lastSaved = 0,
}: ProductionWizardContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  // Check if we have all required props from parent wizard context
  // If so, we don't need to call useWizard()
  const hasParentNavigation = onNextStep && onPreviousStep && onGoToStep;
  const hasParentSubmit = onComplete;
  
  // Only call useWizard() if we need fallback behavior from parent context
  const wizardContext = hasParentNavigation && hasParentSubmit ? null : useWizard();
  const { submitWizard, isSubmitting: contextIsSubmitting, validationErrors } = wizardContext || {};
  const isSubmitting = contextIsSubmitting || false;

  // Local state for tracking validation - updates reactively from context
  const [localValidationErrors, setLocalValidationErrors] = useState<Record<string, string[]>>({});

  // Sync validation errors from context when they change
  useEffect(() => {
    if (validationErrors) {
      setLocalValidationErrors(validationErrors);
    }
  }, [validationErrors]);

  // Calculate if can proceed based on validation errors
  const hasValidationErrors = localValidationErrors && Object.keys(localValidationErrors).length > 0;
  const canGoNext = !hasValidationErrors;

  // Handle next step with validation toast
  const handleNextStep = useCallback(() => {
    if (hasValidationErrors) {
      const errorCount = Object.keys(localValidationErrors).length;
      toast({
        title: 'Validation Failed',
        description: `Please fix ${errorCount} ${errorCount === 1 ? 'error' : 'errors'} before continuing.`,
        variant: 'destructive',
      });
      return;
    }
    // Call the original nextStep
    if (onNextStep) {
      onNextStep();
    } else if (wizardContext?.nextStep) {
      wizardContext.nextStep();
    } else {
      console.warn('nextStep not provided');
    }
  }, [hasValidationErrors, localValidationErrors, toast, onNextStep, wizardContext]);

  // Use provided props or fallback to defaults, preferring context functions
  const wizard = {
    currentStep,
    totalSteps: steps.length,
    isDirty,
    lastSaved,
    canProceed: canGoNext,
    validationErrors,
    submit: async () => {
      if (submitWizard) {
        await submitWizard();
      } else if (onComplete) {
        onComplete();
      }
    },
    saveDraft: async () => {
      if (wizardContext?.saveProgress) {
        wizardContext.saveProgress();
      }
    },
    nextStep: handleNextStep,
    previousStep: onPreviousStep || (wizardContext?.previousStep ? () => wizardContext.previousStep!() : (() => console.warn('previousStep not provided'))),
    goToStep: onGoToStep || (wizardContext?.goToStep ? (step: number) => wizardContext.goToStep!(step) : ((step: number) => console.warn('goToStep not provided', step))),
  };

  const handleSubmit = async () => {
    try {
      await wizard.submit();
    } catch (error) {
      console.error('Wizard submission failed:', error);
    }
  };

  const handleManualSave = async () => {
    await wizard.saveDraft();
  };

  const formatLastSaved = (timestamp: number) => {
    if (timestamp === 0) return '';
    const date = new Date(timestamp);
    const now = Date.now();
    const diff = now - timestamp;

    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div
      ref={containerRef}
      className={cn('flex flex-col h-full cyber-card text-foreground', className)}
      role="main"
      aria-label={title}
    >
      {/* Header */}
      <div className="border-b border-primary/30 bg-card/95 px-6 py-4 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold neon-text text-primary">{title}</h1>

          {/* Auto-save Indicator */}
          {showAutoSaveIndicator && wizard.lastSaved > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status" aria-live="polite">
              <Clock className="h-4 w-4 text-accent" aria-hidden="true" />
              <span>Last saved {formatLastSaved(wizard.lastSaved)}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleManualSave}
                className="gap-2 h-8 px-2 hover:bg-accent/20 text-accent hover:text-accent-foreground"
                aria-label="Save progress now"
              >
                <Save className="h-3 w-3" aria-hidden="true" />
                Save Now
              </Button>
            </div>
          )}
        </div>

        {/* Step Indicator */}
        <ProductionWizardStepIndicator
          steps={steps}
          currentStep={wizard.currentStep}
          onStepClick={allowJumpToStep ? wizard.goToStep : undefined}
          allowJumpToStep={allowJumpToStep}
        />
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto px-6 py-6 min-h-0 bg-background/50" style={{ scrollBehavior: 'smooth' }}>
        <div className="max-w-4xl mx-auto">
          {children}
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="border-t border-primary/30 bg-card/95 px-6 py-4 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto">
          {/* Validation Errors Warning */}
          {localValidationErrors && Object.keys(localValidationErrors).length > 0 && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-400 font-medium">
                ⚠️ Please fix the errors above to continue
              </p>
            </div>
          )}
          
          <ProductionWizardNavigation
            currentStep={wizard.currentStep}
            totalSteps={wizard.totalSteps}
            onPrevious={wizard.previousStep}
            onNext={wizard.nextStep}
            onCancel={onCancel}
            onSubmit={handleSubmit}
            canGoNext={wizard.canProceed}
            canGoPrevious={wizard.currentStep > 0}
            isSubmitting={isSubmitting}
          />
        </div>
      </div>
    </div>
  );
}
