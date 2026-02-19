import React, { ReactNode, useRef, useEffect, useState, useCallback } from 'react';
import { AlertTriangle, Clock, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProductionWizardStepIndicator } from './ProductionWizardStepIndicator';
import { ProductionWizardNavigation } from './ProductionWizardNavigation';
import { WizardStep } from '@/types';
import { useWizard } from '@/contexts/WizardContext';
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
  isDirty = false,
  lastSaved = 0,
}: ProductionWizardContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Fallback to wizard context if navigation props aren't provided
  const wizardContext = useWizard();
  const { submitWizard, isSubmitting: contextIsSubmitting, validationErrors } = wizardContext;
  const isSubmitting = contextIsSubmitting || false;

  // Local state for tracking validation
  const [localValidationErrors, setLocalValidationErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (validationErrors) {
      setLocalValidationErrors(validationErrors);
    }
  }, [validationErrors]);

  const hasValidationErrors = localValidationErrors && Object.keys(localValidationErrors).length > 0;
  const canGoNext = !hasValidationErrors;

  const handleNextStep = useCallback(() => {
    if (hasValidationErrors) {
      const errorCount = Object.keys(localValidationErrors).length;
      toast({
        title: 'Validation Conflict',
        description: `Please resolve ${errorCount} data ${errorCount === 1 ? 'mismatch' : 'mismatches'} before advancing.`,
        variant: 'destructive',
      });
      return;
    }
    if (onNextStep) {
      onNextStep();
    } else if (wizardContext?.nextStep) {
      wizardContext.nextStep();
    }
  }, [hasValidationErrors, localValidationErrors, toast, onNextStep, wizardContext]);

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
    previousStep: onPreviousStep || (() => wizardContext.previousStep()),
    goToStep: onGoToStep || ((step: number) => wizardContext.goToStep(step)),
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
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now();
    const diff = now - timestamp;

    if (diff < 60000) return 'Just Synced';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div
      ref={containerRef}
      className={cn('flex flex-col h-full bg-[#07070a] text-foreground', className)}
      role="main"
      aria-label={title}
    >
      {/* Scanning effect overlay */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-5 z-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
      </div>

      {/* Header */}
      <div className="border-b border-primary/20 bg-black/40 px-8 py-6 backdrop-blur-md relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-primary animate-pulse" />
              <span className="text-[10px] uppercase font-bold tracking-[0.3em] text-primary/60">System Wizard Alpha</span>
            </div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-white drop-shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]">
              {title}
            </h1>
          </div>

          {/* Auto-save Indicator */}
          {showAutoSaveIndicator && wizard.lastSaved > 0 && (
            <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 px-3 py-1.5 rounded-full" role="status" aria-live="polite">
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-primary/60" />
                <span className="text-[10px] uppercase font-black tracking-widest text-primary/80">{formatLastSaved(wizard.lastSaved)}</span>
              </div>
              <div className="w-px h-3 bg-primary/20" />
              <button
                onClick={handleManualSave}
                className="text-[10px] uppercase font-black tracking-widest text-primary hover:neon-text transition-all"
                aria-label="Commit changes now"
              >
                Commit
              </button>
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
      <div className="flex-1 overflow-y-auto px-8 py-8 min-h-0 bg-transparent relative z-10 scrollbar-cyber" style={{ scrollBehavior: 'smooth' }}>
        <div className="max-w-5xl mx-auto">
          {children}
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="border-t border-primary/20 bg-black/60 px-8 py-6 backdrop-blur-xl relative z-20">
        <div className="max-w-5xl mx-auto">
          {/* Validation Errors Warning */}
          {localValidationErrors && Object.keys(localValidationErrors).length > 0 && (
            <div className="mb-6 p-3 bg-red-500/5 border border-red-500/20 rounded flex items-center gap-3">
              <div className="p-1 bg-red-500/20 rounded">
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </div>
              <p className="text-[11px] text-red-400 font-black uppercase tracking-widest">
                Critical conflicts detected. Resolve all parameters to proceed.
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
