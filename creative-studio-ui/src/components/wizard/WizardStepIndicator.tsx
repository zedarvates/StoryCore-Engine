import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// Wizard Step Indicator Component
// ============================================================================

export interface WizardStep {
  number: number;
  title: string;
  description?: string;
}

interface WizardStepIndicatorProps {
  steps: WizardStep[];
  currentStep: number;
  onStepClick?: (step: number) => void;
  allowJumpToStep?: boolean;
  className?: string;
}

export function WizardStepIndicator({
  steps,
  currentStep,
  onStepClick,
  allowJumpToStep = false,
  className,
}: WizardStepIndicatorProps) {
  const handleStepClick = (stepNumber: number) => {
    if (allowJumpToStep && onStepClick) {
      onStepClick(stepNumber);
    }
  };

  return (
    <div className={cn('w-full', className)}>
      <nav aria-label="Wizard progress">
        <ol role="list" className="flex items-center justify-between">
          {steps.map((step, index) => {
            const isCompleted = step.number < currentStep;
            const isCurrent = step.number === currentStep;
            const isClickable = allowJumpToStep && step.number <= currentStep;

            return (
              <li
                key={step.number}
                className={cn(
                  'relative flex-1',
                  index !== steps.length - 1 && 'pr-8 sm:pr-20'
                )}
              >
                {/* Connector Line */}
                {index !== steps.length - 1 && (
                  <div
                    className="absolute top-4 left-0 -ml-px mt-0.5 h-0.5 w-full"
                    aria-hidden="true"
                  >
                    <div
                      className={cn(
                        'h-full transition-colors duration-300',
                        isCompleted ? 'bg-primary' : 'bg-gray-300'
                      )}
                    />
                  </div>
                )}

                {/* Step Button/Indicator */}
                <button
                  type="button"
                  onClick={() => handleStepClick(step.number)}
                  disabled={!isClickable}
                  className={cn(
                    'group relative flex flex-col items-center',
                    isClickable && 'cursor-pointer hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg p-2',
                    !isClickable && 'cursor-default'
                  )}
                  aria-current={isCurrent ? 'step' : undefined}
                  aria-label={`${step.title}${isCurrent ? ' (current step)' : ''}${isCompleted ? ' (completed)' : ''}${!isClickable ? ' (not accessible)' : ''}`}
                  tabIndex={isClickable ? 0 : -1}
                >
                  {/* Step Circle */}
                  <span
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all duration-300',
                      isCompleted && 'border-primary bg-primary text-white',
                      isCurrent && 'border-primary bg-white text-primary',
                      !isCompleted && !isCurrent && 'border-gray-300 bg-white text-gray-500'
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-5 w-5" aria-hidden="true" />
                    ) : (
                      <span className="text-sm font-semibold" aria-hidden="true">{step.number}</span>
                    )}
                  </span>

                  {/* Step Title */}
                  <span
                    className={cn(
                      'mt-2 text-sm font-medium transition-colors duration-300',
                      isCurrent && 'text-primary',
                      isCompleted && 'text-gray-900',
                      !isCompleted && !isCurrent && 'text-gray-500'
                    )}
                  >
                    {step.title}
                  </span>

                  {/* Step Description (optional) */}
                  {step.description && (
                    <span className="mt-1 text-xs text-gray-500 text-center max-w-[120px]">
                      {step.description}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Progress Bar (alternative compact view) */}
      <div className="mt-4 sm:hidden">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-gray-900">
            Step {currentStep} of {steps.length}
          </span>
          <span className="text-gray-500">
            {Math.round((currentStep / steps.length) * 100)}% Complete
          </span>
        </div>
        <div className="mt-2 h-2 w-full bg-gray-200 rounded-full overflow-hidden" role="progressbar" aria-valuenow={currentStep} aria-valuemin={1} aria-valuemax={steps.length} aria-label="Wizard progress">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${(currentStep / steps.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
