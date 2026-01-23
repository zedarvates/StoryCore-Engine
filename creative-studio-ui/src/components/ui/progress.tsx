/**
 * Progress Bar Components
 * Multiple progress indicator styles for loading states
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  showLabel?: boolean;
  label?: string;
  animated?: boolean;
}

/**
 * Basic linear progress bar
 */
export function Progress({
  className,
  value = 0,
  max = 100,
  size = 'md',
  variant = 'default',
  showLabel = false,
  label,
  animated = true,
  ...props
}: ProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  const variantClasses = {
    default: 'bg-primary',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
  };

  return (
    <div className={cn('w-full', className)} {...props}>
      {(showLabel || label) && (
        <div className="flex justify-between mb-1 text-sm">
          <span className="text-muted-foreground">
            {label || `${Math.round(percentage)}%`}
          </span>
          <span className="text-muted-foreground">
            {Math.round(value)} / {max}
          </span>
        </div>
      )}
      <div
        className={cn(
          'w-full bg-muted rounded-full overflow-hidden',
          sizeClasses[size]
        )}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300',
            variantClasses[variant],
            animated && 'animate-progress'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Circular progress indicator
 */
interface CircularProgressProps extends React.SVGAttributes<SVGElement> {
  value?: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  showLabel?: boolean;
}

export function CircularProgress({
  className,
  value = 0,
  max = 100,
  size = 48,
  strokeWidth = 4,
  variant = 'default',
  showLabel = true,
  ...props
}: CircularProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  const variantColors = {
    default: 'stroke-primary',
    success: 'stroke-green-500',
    warning: 'stroke-yellow-500',
    error: 'stroke-red-500',
    info: 'stroke-blue-500',
  };

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
        {...props}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn(
            'transition-all duration-300',
            variantColors[variant]
          )}
          style={{
            animation: 'dash 1s ease-in-out infinite',
          }}
        />
      </svg>
      {showLabel && (
        <span className="absolute text-sm font-medium">
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  );
}

/**
 * Step progress indicator for wizards
 */
interface StepProgressProps {
  steps: { label: string; description?: string }[];
  currentStep: number;
  onStepClick?: (step: number) => void;
  className?: string;
}

export function StepProgress({
  steps,
  currentStep,
  onStepClick,
  className,
}: StepProgressProps) {
  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          const isUpcoming = stepNumber > currentStep;

          return (
            <React.Fragment key={index}>
              {/* Step circle */}
              <div className="flex flex-col items-center">
                <button
                  onClick={() => onStepClick?.(stepNumber)}
                  disabled={isUpcoming || !onStepClick}
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all',
                    isCompleted && 'bg-green-500 text-white cursor-pointer',
                    isCurrent && 'bg-primary text-primary-foreground ring-4 ring-primary/20 cursor-pointer',
                    isUpcoming && 'bg-muted text-muted-foreground cursor-not-allowed'
                  )}
                >
                  {isCompleted ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    stepNumber
                  )}
                </button>
                <div className="mt-2 text-center">
                  <span className={cn(
                    'text-sm font-medium',
                    (isCurrent || isCompleted) ? 'text-foreground' : 'text-muted-foreground'
                  )}>
                    {step.label}
                  </span>
                  {step.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 max-w-[100px]">
                      {step.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="flex-1 h-0.5 mx-2">
                  <div
                    className={cn(
                      'h-full transition-all',
                      isCompleted ? 'bg-green-500' : 'bg-muted'
                    )}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Multi-step progress bar (compact version)
 */
interface MultiStepProgressProps {
  total: number;
  current: number;
  labels?: string[];
  className?: string;
}

export function MultiStepProgress({
  total,
  current,
  labels,
  className,
}: MultiStepProgressProps) {
  return (
    <div className={cn('w-full', className)}>
      <Progress
        value={current}
        max={total}
        size="md"
        showLabel
        label={`Étape ${current} sur ${total}`}
      />
      <div className="flex justify-between mt-2 text-xs text-muted-foreground">
        {labels?.map((label, index) => (
          <span
            key={index}
            className={cn(
              index + 1 === current && 'text-primary font-medium'
            )}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Generation progress with queue info
 */
interface GenerationProgressProps {
  currentItem: string;
  progress: number;
  totalItems: number;
  completedItems: number;
  queuePosition?: number;
  eta?: number; // seconds
  className?: string;
}

export function GenerationProgress({
  currentItem,
  progress,
  totalItems,
  completedItems,
  queuePosition,
  eta,
  className,
}: GenerationProgressProps) {
  return (
    <div className={cn('space-y-3 p-4 border rounded-lg', className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{currentItem}</span>
        <span className="text-xs text-muted-foreground">
          {completedItems}/{totalItems}
        </span>
      </div>

      <Progress value={progress} size="md" />

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {queuePosition !== undefined && `File d'attente: ${queuePosition}`}
        </span>
        <span>
          {eta !== undefined && `~${Math.ceil(eta / 60)} min restantes`}
        </span>
      </div>
    </div>
  );
}

/**
 * Loading spinner with progress
 */
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'primary' | 'secondary';
  className?: string;
}

export function LoadingSpinner({
  size = 'md',
  variant = 'default',
  className,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  const variantClasses = {
    default: 'text-muted-foreground',
    primary: 'text-primary',
    secondary: 'text-secondary-foreground',
  };

  return (
    <svg
      className={cn(
        'animate-spin',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

/**
 * Inline loading indicator
 */
interface InlineLoadingProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function InlineLoading({
  text = 'Chargement...',
  size = 'md',
  className,
}: InlineLoadingProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <LoadingSpinner size={size} />
      <span className="text-sm text-muted-foreground">{text}</span>
    </div>
  );
}

/**
 * Dots loading animation
 */
interface DotsLoadingProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function DotsLoading({
  size = 'md',
  className,
}: DotsLoadingProps) {
  const dotSizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-3 h-3',
  };

  return (
    <div className={cn('flex gap-1', className)}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn(
            dotSizes[size],
            'bg-primary rounded-full animate-bounce'
          )}
          style={{
            animationDelay: `${i * 0.15}s`,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Pulse loading animation
 */
interface PulseLoadingProps {
  size?: number;
  className?: string;
}

export function PulseLoading({
  size = 40,
  className,
}: PulseLoadingProps) {
  return (
    <div
      className={cn(
        'bg-muted rounded-full animate-pulse',
        className
      )}
      style={{
        width: size,
        height: size,
      }}
    />
  );
}

export default Progress;

