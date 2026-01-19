import { ChevronLeft, ChevronRight, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ButtonLoading } from './LoadingStates';

// ============================================================================
// Wizard Navigation Component
// ============================================================================

interface WizardNavigationProps {
  currentStep: number;
  totalSteps: number;
  onPrevious: () => void;
  onNext: () => void;
  onCancel: () => void;
  onSubmit?: () => void;
  isSubmitting?: boolean;
  canGoNext?: boolean;
  canGoPrevious?: boolean;
  nextLabel?: string;
  previousLabel?: string;
  submitLabel?: string;
  cancelLabel?: string;
  showCancel?: boolean;
  className?: string;
}

export function WizardNavigation({
  currentStep,
  totalSteps,
  onPrevious,
  onNext,
  onCancel,
  onSubmit,
  isSubmitting = false,
  canGoNext = true,
  canGoPrevious = true,
  nextLabel = 'Next',
  previousLabel = 'Previous',
  submitLabel = 'Complete',
  cancelLabel = 'Cancel',
  showCancel = true,
  className,
}: WizardNavigationProps) {
  const isLastStep = currentStep === totalSteps;
  const isFirstStep = currentStep === 1;

  const handleNext = () => {
    if (isLastStep && onSubmit) {
      onSubmit();
    } else {
      onNext();
    }
  };

  return (
    <div className={cn('flex items-center justify-between gap-4', className)} role="navigation" aria-label="Wizard navigation">
      {/* Left Side - Cancel Button */}
      <div className="flex-shrink-0">
        {showCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isSubmitting}
            className="gap-2"
            aria-label="Cancel wizard and discard changes"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            {cancelLabel}
          </Button>
        )}
      </div>

      {/* Right Side - Navigation Buttons */}
      <div className="flex items-center gap-2">
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
          className="gap-2"
          aria-label={isLastStep ? 'Complete wizard and save' : 'Go to next step'}
        >
          {isLastStep ? (
            <ButtonLoading isLoading={isSubmitting} loadingText="Saving...">
              <Save className="h-4 w-4" aria-hidden="true" />
              {submitLabel}
            </ButtonLoading>
          ) : (
            <>
              {nextLabel}
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
