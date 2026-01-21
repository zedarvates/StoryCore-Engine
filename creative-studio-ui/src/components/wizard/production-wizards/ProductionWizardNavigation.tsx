import React from 'react';
import { ChevronLeft, ChevronRight, Save, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ============================================================================
// Production Wizard Navigation Component
// ============================================================================

interface ProductionWizardNavigationProps {
  currentStep: number;
  totalSteps: number;
  onPrevious: () => void;
  onNext: () => void;
  onCancel: () => void;
  onSubmit?: () => void;
  canGoNext?: boolean;
  canGoPrevious?: boolean;
  isSubmitting?: boolean;
  nextLabel?: string;
  previousLabel?: string;
  submitLabel?: string;
  cancelLabel?: string;
  className?: string;
}

export function ProductionWizardNavigation({
  currentStep,
  totalSteps,
  onPrevious,
  onNext,
  onCancel,
  onSubmit,
  canGoNext = true,
  canGoPrevious = true,
  isSubmitting = false,
  nextLabel = 'Continue',
  previousLabel = 'Back',
  submitLabel = 'Complete',
  cancelLabel = 'Cancel',
  className,
}: ProductionWizardNavigationProps) {
  const isLastStep = currentStep === totalSteps - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = () => {
    if (isLastStep && onSubmit) {
      onSubmit();
    } else {
      onNext();
    }
  };

  return (
    <nav
      className={cn('flex items-center justify-between', className)}
      role="navigation"
      aria-label="Wizard navigation"
    >
      {/* Left Side - Cancel Button */}
      <div className="flex-shrink-0">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={isSubmitting}
          className="gap-2 text-gray-600 hover:text-gray-800"
          aria-label="Cancel wizard and return to previous screen"
        >
          <X className="h-4 w-4" aria-hidden="true" />
          {cancelLabel}
        </Button>
      </div>

      {/* Center - Progress Indicator */}
      <div className="flex-1 flex justify-center">
        <div className="text-sm text-gray-600">
          Step {currentStep + 1} of {totalSteps}
        </div>
      </div>

      {/* Right Side - Navigation Buttons */}
      <div className="flex items-center gap-3">
        {/* Previous Button */}
        <Button
          type="button"
          variant="outline"
          onClick={onPrevious}
          disabled={!canGoPrevious || isFirstStep || isSubmitting}
          className="gap-2"
          aria-label={`Go to previous step${isFirstStep ? ' (disabled, already on first step)' : ''}`}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          {previousLabel}
        </Button>

        {/* Next/Submit Button */}
        <Button
          type="button"
          onClick={handleNext}
          disabled={!canGoNext || isSubmitting}
          className="gap-2 min-w-24"
          aria-label={isLastStep ? 'Complete wizard and save changes' : 'Continue to next step'}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              {isLastStep ? 'Saving...' : 'Loading...'}
            </>
          ) : isLastStep ? (
            <>
              <Save className="h-4 w-4" aria-hidden="true" />
              {submitLabel}
            </>
          ) : (
            <>
              {nextLabel}
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </>
          )}
        </Button>
      </div>
    </nav>
  );
}
