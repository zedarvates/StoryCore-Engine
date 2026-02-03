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

export interface WizardStep {
  number: number;
  title: string;
  description?: string;
}

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

// ============================================================================
// Helper Functions
// ============================================================================

function getStepStatusColor(status: StepValidationStatus): string {
  switch (status) {
    case 'valid':
      return 'border-green-500 bg-green-500 text-white';
    case 'invalid':
      return 'border-red-500 bg-red-500 text-white';
    case 'warning':
      return 'border-amber-500 bg-amber-500 text-white';
    case 'pending':
    default:
      return 'border-gray-400 bg-gray-400 text-white';
  }
}

function getConnectorColor(
  isCompleted: boolean,
  status: StepValidationStatus,
  isCurrent: boolean
): string {
  if (isCompleted && status === 'valid') {
    return 'bg-green-500';
  }
  if (isCompleted && status === 'warning') {
    return 'bg-amber-500';
  }
  if (isCompleted) {
    return 'bg-blue-500';
  }
  if (isCurrent) {
    return 'bg-blue-500';
  }
  return 'bg-gray-600';
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
  if (isCompleted) {
    return 'text-green-500';
  }
  if (isCurrent) {
    return 'text-blue-500';
  }
  return 'text-gray-400';
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
            const isClickable = allowJumpToStep && step.number <= currentStep;
            const stepState = stepStates[step.number] || { status: 'pending' as StepValidationStatus };
            const hasErrors = stepState.status === 'invalid';
            const hasWarnings = stepState.status === 'warning';
            const isValid = stepState.status === 'valid' || (isCompleted && !hasErrors && !hasWarnings);

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
                        'h-full transition-colors duration-300 wizard-step-connector',
                        getConnectorColor(isCompleted, stepState.status, isCurrent)
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
                      'flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all duration-300 wizard-step-circle',
                      isValid && 'border-green-500 bg-green-500',
                      hasErrors && 'border-red-500 bg-red-500',
                      hasWarnings && 'border-amber-500 bg-amber-500',
                      !isValid && !hasErrors && !hasWarnings && (isCompleted || isCurrent)
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-400 bg-gray-400'
                    )}
                  >
                    {isValid ? (
                      <Check className="h-5 w-5 text-white" aria-hidden="true" />
                    ) : (
                      <span className="text-sm font-semibold text-white" aria-hidden="true">
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
                      'mt-2 text-sm font-medium transition-colors duration-300 wizard-step-title',
                      getTitleColor(isCompleted, isCurrent, stepState.status)
                    )}
                  >
                    {step.title}
                  </span>

                  {/* Step Description (optional) */}
                  {step.description && (
                    <span className="mt-1 text-xs text-gray-400 text-center max-w-[120px]">
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
          <span className="font-medium text-gray-900 dark:text-white">
            Step {currentStep} of {steps.length}
          </span>
          <span className="text-gray-500">
            {Math.round((currentStep / steps.length) * 100)}% Complete
          </span>
        </div>
        <div
          className="mt-2 h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={currentStep}
          aria-valuemin={1}
          aria-valuemax={steps.length}
          aria-label="Wizard progress"
        >
          <div
            className={cn(
              'h-full transition-all duration-300',
              getConnectorColor(true, 'valid', false).replace('bg-', 'bg-gradient-to-r from-blue-500 to-')
            )}
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
    <div className="flex items-center gap-1">
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
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                'transition-all duration-200',
                isValid && 'bg-green-500 text-white',
                hasErrors && 'bg-red-500 text-white',
                hasWarnings && 'bg-amber-500 text-white',
                !isValid && !hasErrors && !hasWarnings && (isCompleted || isCurrent)
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
                isClickable && 'cursor-pointer hover:opacity-80',
                !isClickable && 'cursor-default'
              )}
              aria-label={`Step ${step.number}: ${step.title}${isCurrent ? ' (current)' : ''}`}
            >
              {isValid ? <Check className="w-4 h-4" /> : step.number}
            </button>

            {/* Connector */}
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'w-8 h-0.5 mx-1',
                  isCompleted ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
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
    <div className="flex items-center gap-4 text-xs text-gray-500">
      <div className="flex items-center gap-1">
        <div className="w-3 h-3 rounded-full bg-green-500" />
        <span>Valid</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-3 h-3 rounded-full bg-blue-500" />
        <span>Current</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-3 h-3 rounded-full bg-red-500" />
        <span>Error</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-3 h-3 rounded-full bg-amber-500" />
        <span>Warning</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-3 h-3 rounded-full bg-gray-400" />
        <span>Pending</span>
      </div>
    </div>
  );
}
