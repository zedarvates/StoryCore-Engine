import { ReactNode, useRef } from 'react';
import { AlertTriangle, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardStepIndicator } from './WizardStepIndicator';
import type { WizardStep } from './WizardStepIndicator';
import { WizardNavigation } from './WizardNavigation';
import { useWizard } from '@/contexts/WizardContext';
import { useWizardNavigation } from '@/hooks/useWizardNavigation';
import { Button } from '@/components/ui/button';
import { useKeyboardNavigation, useFocusManagement, useTabOrder } from '@/hooks/useKeyboardNavigation';
import { StepChangeAnnouncement, LoadingAnnouncement } from './LiveRegion';

// ============================================================================
// Wizard Container Component
// ============================================================================

interface WizardContainerProps {
  title: string;
  steps: WizardStep[];
  children: ReactNode;
  onCancel: () => void;
  onComplete?: () => void;
  allowJumpToStep?: boolean;
  showAutoSaveIndicator?: boolean;
  className?: string;
}

export function WizardContainer({
  title,
  steps,
  children,
  onCancel,
  onComplete,
  allowJumpToStep = false,
  showAutoSaveIndicator = true,
  className,
}: WizardContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const {
    isSubmitting,
    isDirty,
    submitWizard,
    saveProgress,
  } = useWizard();

  const {
    currentStep,
    nextStep,
    previousStep,
    jumpToStep,
    canGoNext,
    canGoPrevious,
    isLastStep,
  } = useWizardNavigation();

  const handleSubmit = async () => {
    try {
      await submitWizard();
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error('Wizard submission failed:', error);
    }
  };

  const handleManualSave = () => {
    saveProgress();
  };

  // Keyboard navigation support
  useKeyboardNavigation({
    onNext: nextStep,
    onPrevious: previousStep,
    onCancel,
    onSubmit: handleSubmit,
    enabled: !isSubmitting,
    canGoNext,
    canGoPrevious,
    isLastStep,
  });

  // Focus management
  useFocusManagement(currentStep, {
    enabled: true,
    focusOnStepChange: true,
  });

  // Tab order management
  useTabOrder(containerRef, true);

  return (
    <div ref={containerRef} className={cn('flex flex-col h-full', className)} role="main" aria-label={title}>
      {/* Live Region Announcements */}
      <StepChangeAnnouncement
        currentStep={currentStep}
        totalSteps={steps.length}
        stepTitle={steps[currentStep - 1]?.title || ''}
      />
      <LoadingAnnouncement
        isLoading={isSubmitting}
        loadingMessage="Saving wizard data..."
        completeMessage="Wizard data saved successfully"
      />
      
      {/* Header */}
      <div className="border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">{title}</h1>
          
          {/* Auto-save Indicator */}
          {showAutoSaveIndicator && isDirty && (
            <div className="flex items-center gap-2" role="status" aria-live="polite">
              <span className="text-sm text-gray-500">
                Changes auto-saved
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleManualSave}
                className="gap-2"
                aria-label="Save progress now"
              >
                <Save className="h-4 w-4" aria-hidden="true" />
                Save Now
              </Button>
            </div>
          )}
        </div>

        {/* Step Indicator */}
        <WizardStepIndicator
          steps={steps}
          currentStep={currentStep}
          onStepClick={jumpToStep}
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
      <div className="border-t bg-white px-6 py-4">
        <div className="max-w-4xl mx-auto">
          {/* Keyboard shortcuts hint */}
          <div className="text-xs text-gray-500 mb-2 text-center">
            <span className="sr-only">Keyboard shortcuts: </span>
            <span aria-hidden="true">
              Press <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">Enter</kbd> to advance, 
              <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs ml-1">Esc</kbd> to cancel, 
              <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs ml-1">Alt+←</kbd> / 
              <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">Alt+→</kbd> to navigate
            </span>
          </div>
          <WizardNavigation
            currentStep={currentStep}
            totalSteps={steps.length}
            onPrevious={previousStep}
            onNext={nextStep}
            onCancel={onCancel}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            canGoNext={canGoNext}
            canGoPrevious={canGoPrevious}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Wizard Resume Banner Component
// ============================================================================

interface WizardResumeBannerProps {
  onResume: () => void;
  onStartNew: () => void;
  className?: string;
}

export function WizardResumeBanner({
  onResume,
  onStartNew,
  className,
}: WizardResumeBannerProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-blue-200 bg-blue-50 p-4',
        className
      )}
      role="alert"
      aria-labelledby="resume-banner-title"
      aria-describedby="resume-banner-description"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex-1">
          <h3 id="resume-banner-title" className="text-sm font-semibold text-blue-800">
            Resume Previous Session
          </h3>
          <p id="resume-banner-description" className="mt-1 text-sm text-blue-700">
            You have unsaved progress from a previous session. Would you like to continue where you left off?
          </p>
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              onClick={onResume}
              className="bg-blue-600 hover:bg-blue-700"
              aria-label="Resume previous wizard session"
            >
              Resume
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onStartNew}
              aria-label="Start a new wizard session and discard previous progress"
            >
              Start New
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
