/**
 * Wizard Step Indicator Component
 * 
 * Enhanced step indicator with validation state support.
 * Shows colors based on step state: completed, current, error, warning.
 */

import { Check, AlertTriangle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

import { WizardStep } from '@/types';
export type { WizardStep };

export type StepValidationStatus = 'pending' | 'valid' | 'invalid' | 'warning';

export interface StepState {
  status: StepValidationStatus;
  errorCount?: number;
  warningCount?: number;
}

interface WizardStepIndicatorProps {
  steps: WizardStep[];
  currentStep: number;
  stepStates?: Record<number, StepState>;
  onStepClick?: (step: number) => void;
  allowJumpToStep?: boolean;
  showValidationBadges?: boolean;
  className?: string;
}


function getConnectorColor(
  isCompleted: boolean,
  status: StepValidationStatus,
  isCurrent: boolean
): string {
  if (isCompleted && status === 'valid') {
    return 'bg-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]';
  }
  if (isCompleted && status === 'warning') {
    return 'bg-amber-500';
  }
  if (isCompleted || isCurrent) {
    return 'bg-primary/60';
  }
  return 'bg-primary/10';
}

function getTitleColor(
  isCompleted: boolean,
  isCurrent: boolean,
  status: StepValidationStatus
): string {
  if (status === 'invalid') {
    return 'text-red-500';
  }
  if (status === 'warning') {
    return 'text-amber-500';
  }
  if (isCurrent) {
    return 'text-primary neon-text font-bold';
  }
  if (isCompleted) {
    return 'text-primary/80';
  }
  return 'text-primary/40';
}

// ============================================================================
// Components
// ============================================================================

function ValidationBadge({
  status,
  count,
}: {
  status: 'invalid' | 'warning';
  count?: number;
}) {
  const isInvalid = status === 'invalid';
  const Icon = isInvalid ? AlertCircle : AlertTriangle;
  const colorClass = isInvalid ? 'text-red-500' : 'text-amber-500';
  const bgClass = isInvalid ? 'bg-red-100' : 'bg-amber-100';

  return (
    <span
      className={cn(
        'absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px]',
        'rounded-full text-xs font-bold px-1',
        bgClass,
        colorClass
      )}
      title={`${count || 1} ${isInvalid ? 'error' : 'warning'}${count !== 1 ? 's' : ''}`}
    >
      <Icon className="w-3 h-3" />
      {count && count > 1 && <span className="ml-0.5">{count}</span>}
    </span>
  );
}

export function WizardStepIndicator({
  steps,
  currentStep,
  stepStates = {},
  onStepClick,
  allowJumpToStep = false,
  showValidationBadges = true,
  className,
}: WizardStepIndicatorProps) {
  const handleStepClick = (stepNumber: number) => {
    if (allowJumpToStep && onStepClick) {
      onStepClick(stepNumber);
    }
  };

  return (
    <div className={cn('w-full wizard-step-indicator', className)}>
      <nav aria-label="Wizard progress">
        <ol role="list" className="flex items-center justify-between">
          {steps.map((step, index) => {
            const isCompleted = step.number < currentStep;
            const isCurrent = step.number === currentStep;
            const isFuture = step.number > currentStep;
            const isClickable = allowJumpToStep && step.number <= currentStep;
            const stepState = stepStates[step.number] || { status: 'pending' as StepValidationStatus };
            const hasErrors = stepState.status === 'invalid';
            const hasWarnings = stepState.status === 'warning';
            const isValid = stepState.status === 'valid' || (isCompleted && !hasErrors && !hasWarnings);

            const status: StepValidationStatus = isCompleted ? (hasErrors ? 'invalid' : hasWarnings ? 'warning' : 'valid') : (isCurrent ? 'pending' : 'pending');

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
                        'h-full transition-all duration-500 wizard-step-connector',
                        getConnectorColor(isCompleted, status, isCurrent)
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
                    'group relative flex flex-col items-center wizard-focus-ring',
                    isClickable && 'cursor-pointer hover:opacity-80 focus:outline-none',
                    !isClickable && 'cursor-default'
                  )}
                  aria-current={isCurrent ? 'step' : undefined}
                  aria-label={`${step.title}${isCurrent ? ' (current step)' : ''}${isCompleted ? ' (completed)' : ''}${hasErrors ? ' (has errors)' : ''}${hasWarnings ? ' (has warnings)' : ''}${!isClickable ? ' (not accessible)' : ''}`}
                  tabIndex={isClickable ? 0 : -1}
                >
                  {/* Step Circle */}
                  <span
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all duration-500 wizard-step-circle',
                      isCurrent && 'border-primary bg-primary/20 scale-110 shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)]',
                      isCompleted && isValid && 'border-primary bg-primary text-primary-foreground',
                      isCompleted && hasErrors && 'border-red-500 bg-red-500 text-white',
                      isCompleted && hasWarnings && 'border-amber-500 bg-amber-500 text-white',
                      isFuture && 'border-primary/20 bg-primary/5 text-primary/40 grayscale'
                    )}
                  >
                    {isCompleted && isValid ? (
                      <Check className="h-5 w-5 text-primary-foreground" aria-hidden="true" />
                    ) : (
                      <span className={cn(
                        "text-sm font-bold",
                        isCurrent ? "text-primary neon-text" : isCompleted ? "text-white" : "text-primary/40"
                      )} aria-hidden="true">
                        {step.number}
                      </span>
                    )}

                    {/* Validation Badge */}
                    {showValidationBadges && (hasErrors || hasWarnings) && (
                      <ValidationBadge
                        status={hasErrors ? 'invalid' : 'warning'}
                        count={hasErrors ? stepState.errorCount : stepState.warningCount}
                      />
                    )}
                  </span>

                  {/* Step Title */}
                  <span
                    className={cn(
                      'mt-2 text-[10px] uppercase tracking-widest transition-colors duration-300 wizard-step-title',
                      getTitleColor(isCompleted, isCurrent, isCompleted ? status : (isCurrent ? 'pending' : 'pending'))
                    )}
                  >
                    {step.title}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Progress Bar (alternative compact view) */}
      <div className="mt-4 sm:hidden">
        <div className="flex items-center justify-between text-[10px] font-bold tracking-widest uppercase text-primary/60">
          <span>
            Node {currentStep} of {steps.length}
          </span>
          <span>
            {Math.round((currentStep / steps.length) * 100)}% SYNCED
          </span>
        </div>
        <div
          className="mt-2 h-1 w-full bg-primary/10 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={currentStep}
          aria-valuemin={1}
          aria-valuemax={steps.length}
          aria-label="Wizard progress"
        >
          <div
            className="h-full bg-primary transition-all duration-1000 shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]"
            style={{ width: `${(currentStep / steps.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Compact Version
// ============================================================================

interface CompactStepIndicatorProps {
  steps: WizardStep[];
  currentStep: number;
  stepStates?: Record<number, StepState>;
  onStepClick?: (step: number) => void;
  allowJumpToStep?: boolean;
}

export function CompactStepIndicator({
  steps,
  currentStep,
  stepStates = {},
  onStepClick,
  allowJumpToStep = false,
}: CompactStepIndicatorProps) {
  const handleStepClick = (stepNumber: number) => {
    if (allowJumpToStep && onStepClick) {
      onStepClick(stepNumber);
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      {steps.map((step, index) => {
        const isCompleted = step.number < currentStep;
        const isCurrent = step.number === currentStep;
        const isClickable = allowJumpToStep && step.number <= currentStep;
        const stepState = stepStates[step.number] || { status: 'pending' as StepValidationStatus };
        const hasErrors = stepState.status === 'invalid';
        const hasWarnings = stepState.status === 'warning';
        const isValid = stepState.status === 'valid' || (isCompleted && !hasErrors && !hasWarnings);

        return (
          <div key={step.number} className="flex items-center">
            <button
              type="button"
              onClick={() => handleStepClick(step.number)}
              disabled={!isClickable}
              className={cn(
                'w-7 h-7 rounded flex items-center justify-center text-[10px] font-bold transition-all duration-300 border',
                isValid && 'bg-primary border-primary text-primary-foreground shadow-[0_0_10px_rgba(var(--primary-rgb),0.3)]',
                hasErrors && 'bg-red-500 border-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.3)]',
                isCurrent && 'bg-primary/20 border-primary text-primary neon-text pulse-neon',
                !isCompleted && !isCurrent && 'bg-primary/5 border-primary/10 text-primary/30',
                isClickable && 'cursor-pointer hover:bg-primary/30',
                !isClickable && 'cursor-default'
              )}
              aria-label={`Step ${step.number}: ${step.title}${isCurrent ? ' (current)' : ''}`}
            >
              {isValid ? <Check className="w-3 h-3" /> : step.number}
            </button>

            {/* Connector */}
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'w-4 h-[1px] mx-0.5 transition-colors duration-500',
                  isCompleted ? 'bg-primary' : 'bg-primary/10'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Legend Component
// ============================================================================

export function StepIndicatorLegend() {
  return (
    <div className="flex items-center gap-4 text-[10px] uppercase tracking-widest font-bold text-primary/40">
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-primary" />
        <span>Valid</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-primary/20 border border-primary" />
        <span>Syncing</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-red-500" />
        <span>Error</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-primary/5 border border-primary/20" />
        <span>Standby</span>
      </div>
    </div>
  );
}
