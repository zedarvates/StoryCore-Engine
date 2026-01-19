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
}: ProductionWizardContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // We'll use the production wizard context
  // For now, create mock functions - will be replaced with actual context usage
  const mockWizard = {
    currentStep: 0,
    totalSteps: steps.length,
    isDirty: false,
    lastSaved: 0,
    canProceed: true,
    submit: async () => {
      if (onComplete) onComplete();
    },
    saveDraft: async () => {},
    nextStep: () => {},
    previousStep: () => {},
    goToStep: (step: number) => {},
  };

  const handleSubmit = async () => {
    try {
      await mockWizard.submit();
    } catch (error) {
      console.error('Wizard submission failed:', error);
    }
  };

  const handleManualSave = async () => {
    await mockWizard.saveDraft();
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
      className={cn('flex flex-col h-full bg-white', className)}
      role="main"
      aria-label={title}
    >
      {/* Header */}
      <div className="border-b bg-gray-50 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>

          {/* Auto-save Indicator */}
          {showAutoSaveIndicator && mockWizard.lastSaved > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-600" role="status" aria-live="polite">
              <Clock className="h-4 w-4" aria-hidden="true" />
              <span>Last saved {formatLastSaved(mockWizard.lastSaved)}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleManualSave}
                className="gap-2 h-8 px-2"
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
          currentStep={mockWizard.currentStep}
          onStepClick={allowJumpToStep ? mockWizard.goToStep : undefined}
          allowJumpToStep={allowJumpToStep}
        />
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-4xl mx-auto">
          {children}
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="border-t bg-gray-50 px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <ProductionWizardNavigation
            currentStep={mockWizard.currentStep}
            totalSteps={mockWizard.totalSteps}
            onPrevious={mockWizard.previousStep}
            onNext={mockWizard.nextStep}
            onCancel={onCancel}
            onSubmit={handleSubmit}
            canGoNext={mockWizard.canProceed}
            canGoPrevious={mockWizard.currentStep > 0}
          />
        </div>
      </div>
    </div>
  );
}