import React, { ReactNode, useRef, useEffect } from 'react';
import { AlertTriangle, Save, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProductionWizardStepIndicator } from './ProductionWizardStepIndicator.js';
import { ProductionWizardNavigation } from './ProductionWizardNavigation.js';
import { Button } from '@/components/ui/button';
import { WizardStep } from '@/types';

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

  // Use provided props or fallback to defaults
  const wizard = {
    currentStep,
    totalSteps: steps.length,
    isDirty,
    lastSaved,
    canProceed,
    submit: async () => {
      if (onComplete) onComplete();
    },
    saveDraft: async () => {
      // Draft saving would be handled by parent component
      ;
    },
    nextStep: onNextStep || (() => console.warn('nextStep not provided')),
    previousStep: onPreviousStep || (() => console.warn('previousStep not provided')),
    goToStep: onGoToStep || ((step: number) => console.warn('goToStep not provided', step)),
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
          <ProductionWizardNavigation
            currentStep={wizard.currentStep}
            totalSteps={wizard.totalSteps}
            onPrevious={wizard.previousStep}
            onNext={wizard.nextStep}
            onCancel={onCancel}
            onSubmit={handleSubmit}
            canGoNext={wizard.canProceed}
            canGoPrevious={wizard.currentStep > 0}
          />
        </div>
      </div>
    </div>
  );
}
