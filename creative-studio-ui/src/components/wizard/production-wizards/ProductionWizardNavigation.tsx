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
  submitLabel = 'Finalize Node',
  cancelLabel = 'Abort',
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
          className="text-[10px] uppercase font-black tracking-widest text-red-500/60 hover:text-red-400 hover:bg-red-500/10 transition-all gap-2"
          aria-label="Cancel wizard and return to previous screen"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
          {cancelLabel}
        </Button>
      </div>

      {/* Center - Progress Indicator */}
      <div className="flex-1 flex justify-center">
        <div className="flex items-center gap-3">
          <div className="h-px w-8 bg-primary/20" />
          <div className="text-[10px] uppercase font-black tracking-[0.2em] text-primary/60">
            Nexus Node <span className="text-primary">{currentStep + 1}</span> // <span className="opacity-40">{totalSteps}</span>
          </div>
          <div className="h-px w-8 bg-primary/20" />
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
          className="h-9 px-4 border-primary/20 bg-primary/5 text-primary/60 hover:text-primary hover:bg-primary/10 text-[10px] uppercase font-black tracking-widest transition-all gap-2 disabled:opacity-20"
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
          className={cn(
            "h-9 px-6 min-w-36 transition-all duration-500 group relative overflow-hidden",
            isLastStep
              ? "bg-primary text-primary-foreground shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)] hover:shadow-[0_0_30px_rgba(var(--primary-rgb),0.6)]"
              : "border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 hover:border-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)]"
          )}
          aria-label={isLastStep ? 'Complete wizard and save changes' : 'Continue to next step'}
        >
          {/* Neon pulse effect */}
          {canGoNext && !isSubmitting && (
            <div className="absolute inset-0 bg-primary/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out pointer-events-none" />
          )}

          <div className="relative flex items-center justify-center gap-2 text-[10px] uppercase font-black tracking-widest">
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                {isLastStep ? 'Materializing...' : 'Syncing...'}
              </>
            ) : isLastStep ? (
              <>
                <Save className="h-3.5 w-3.5" aria-hidden="true" />
                {submitLabel}
              </>
            ) : (
              <>
                {nextLabel}
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </>
            )}
          </div>
        </Button>
      </div>
    </nav>
  );
}
