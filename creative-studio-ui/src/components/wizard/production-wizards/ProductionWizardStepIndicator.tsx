import React from 'react';
import { Check, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { WizardStep } from '@/types';

// ============================================================================
// Production Wizard Step Indicator Component
// ============================================================================

interface ProductionWizardStepIndicatorProps {
  steps: WizardStep[];
  currentStep: number;
  onStepClick?: (step: number) => void;
  allowJumpToStep?: boolean;
  className?: string;
}

export function ProductionWizardStepIndicator({
  steps,
  currentStep,
  onStepClick,
  allowJumpToStep = false,
  className,
}: ProductionWizardStepIndicatorProps) {
  return (
    <div
      className={cn('flex items-center justify-center', className)}
      role="tablist"
      aria-label="Wizard progress"
    >
      <div className="flex items-center space-x-4">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isUpcoming = index > currentStep;

          return (
            <React.Fragment key={step.number}>
              {/* Step Button/Circle */}
              <div className="flex flex-col items-center">
                {allowJumpToStep && onStepClick ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200',
                      isCompleted && 'bg-green-500 border-green-500 text-white hover:bg-green-600 neon-text-green',
                      isCurrent && 'bg-primary border-primary text-primary-foreground neon-border',
                      isUpcoming && 'border-muted text-muted-foreground hover:border-accent'
                    )}
                    onClick={() => onStepClick(index)}
                    disabled={isUpcoming && !allowJumpToStep}
                    aria-label={`Step ${step.number}: ${step.title}${isCurrent ? ' (current)' : ''}${isCompleted ? ' (completed)' : ''}`}
                    role="tab"
                    aria-selected={isCurrent}
                    aria-controls={`step-panel-${step.number}`}
                  >
                    {isCompleted ? (
                      <Check className="h-5 w-5" aria-hidden="true" />
                    ) : (
                      <Circle className="h-3 w-3 fill-current" aria-hidden="true" />
                    )}
                  </Button>
                ) : (
                  <div
                    className={cn(
                      'relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200',
                      isCompleted && 'bg-green-500 border-green-500 text-white neon-text-green',
                      isCurrent && 'bg-primary border-primary text-primary-foreground neon-border',
                      isUpcoming && 'border-muted text-muted-foreground'
                    )}
                    role="tab"
                    aria-selected={isCurrent}
                    aria-disabled={isUpcoming}
                  >
                    {isCompleted ? (
                      <Check className="h-5 w-5" aria-hidden="true" />
                    ) : (
                      <span className="text-sm font-medium">{step.number}</span>
                    )}
                  </div>
                )}

                {/* Step Title */}
                <div className="mt-2 text-center">
                  <div
                    className={cn(
                      'text-sm font-medium max-w-24 truncate',
                      isCurrent && 'text-primary neon-text',
                      isCompleted && 'text-green-500 neon-text-green',
                      isUpcoming && 'text-muted-foreground'
                    )}
                  >
                    {step.title}
                  </div>
                  {step.description && (
                    <div className="text-xs text-muted-foreground mt-1 max-w-24 truncate">
                      {step.description}
                    </div>
                  )}
                </div>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'h-0.5 w-12 transition-colors duration-200',
                    index < currentStep ? 'bg-green-500 neon-text-green' : 'bg-muted'
                  )}
                  aria-hidden="true"
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
