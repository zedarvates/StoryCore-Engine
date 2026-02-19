import React from 'react';
import { Check, Activity } from 'lucide-react';
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
      <div className="flex items-center">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isUpcoming = index > currentStep;
          const StepIcon = step.icon as React.ComponentType<{ className?: string }>;

          return (
            <React.Fragment key={step.number || index}>
              {/* Step Button/Circle */}
              <div className="flex items-center group">
                <div className="flex flex-col items-center">
                  {allowJumpToStep && onStepClick ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        'relative flex items-center justify-center w-10 h-10 rounded-none border-2 transition-all duration-500 clip-path-polygon-[20%_0%,80%_0%,100%_20%,100%_80%,80%_100%,20%_100%,0%_80%,0%_20%]',
                        isCompleted && 'bg-primary/10 border-primary/40 text-primary hover:bg-primary/20 shadow-[0_0_15px_rgba(var(--primary-rgb),0.2)]',
                        isCurrent && 'bg-primary border-primary text-primary-foreground shadow-[0_0_20px_rgba(var(--primary-rgb),0.5)] pulse-neon',
                        isUpcoming && 'border-primary/10 text-primary/30 hover:border-primary/30'
                      )}
                      onClick={() => onStepClick(index)}
                      disabled={isUpcoming && !allowJumpToStep}
                      aria-label={`Node ${step.number || index + 1}: ${step.title}${isCurrent ? ' (active)' : ''}${isCompleted ? ' (synced)' : ''}`}
                      role="tab"
                      aria-selected={isCurrent}
                    >
                      {isCompleted ? (
                        <Check className="h-5 w-5" aria-hidden="true" />
                      ) : StepIcon ? (
                        <StepIcon className={cn("h-4 w-4", isCurrent ? "animate-pulse" : "opacity-50")} aria-hidden="true" />
                      ) : (
                        <span className="text-xs font-black font-mono">{(index + 1).toString().padStart(2, '0')}</span>
                      )}
                    </Button>
                  ) : (
                    <div
                      className={cn(
                        'relative flex items-center justify-center w-10 h-10 rounded-none border-2 transition-all duration-500',
                        isCompleted && 'bg-primary/10 border-primary/40 text-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.2)]',
                        isCurrent && 'bg-primary border-primary text-primary-foreground shadow-[0_0_25px_rgba(var(--primary-rgb),0.5)]',
                        isUpcoming && 'border-primary/10 text-primary/30'
                      )}
                      style={{ clipPath: 'polygon(20% 0%, 80% 0%, 100% 20%, 100% 80%, 80% 100%, 20% 100%, 0% 80%, 0% 20%)' }}
                      role="tab"
                      aria-selected={isCurrent}
                      aria-disabled={isUpcoming}
                    >
                      {isCompleted ? (
                        <Check className="h-5 w-5" aria-hidden="true" />
                      ) : StepIcon ? (
                        <StepIcon className={cn("h-4 w-4", isCurrent ? "animate-pulse" : "opacity-60")} aria-hidden="true" />
                      ) : (
                        <span className="text-xs font-black font-mono">{(index + 1).toString().padStart(2, '0')}</span>
                      )}
                    </div>
                  )}

                  {/* Step Title - Hidden in standard view to stay compact, shown in a cleaner way */}
                  <div className="absolute -bottom-8 w-24 text-center pointer-events-none">
                    <div
                      className={cn(
                        'text-[9px] font-black uppercase tracking-[0.2em] transition-all duration-500',
                        isCurrent ? 'text-primary opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                      )}
                    >
                      {step.title}
                    </div>
                  </div>
                </div>

                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div className="flex items-center px-2">
                    <div
                      className={cn(
                        'h-0.5 w-12 transition-all duration-700',
                        index < currentStep ? 'bg-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.4)]' : 'bg-primary/10'
                      )}
                      aria-hidden="true"
                    />
                    {isCurrent && (
                      <Activity className="h-3 w-3 text-primary/40 -ml-7.5 animate-pulse" />
                    )}
                  </div>
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
