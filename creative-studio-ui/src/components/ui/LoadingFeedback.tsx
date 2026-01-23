import React from 'react';
import { Loader2, CheckCircle2, XCircle, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

// ============================================================================
// LoadingFeedback Component
// Feedback visuel pour les états de chargement et de statut
// ============================================================================

export type FeedbackType = 'loading' | 'success' | 'error' | 'warning' | 'info';

interface LoadingFeedbackProps {
  /**
   * Type de feedback
   */
  type: FeedbackType;
  /**
   * Message principal
   */
  message: React.ReactNode;
  /**
   * Message secondaire (optionnel)
   */
  description?: React.ReactNode;
  /**
   * Action optionnelle
   */
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'outline';
  };
  /**
   * Indicateur de progression (pour loading)
   */
  progress?: number;
  /**
   * Texte du progress (optionnel)
   */
  progressText?: string;
  /**
   * Classe CSS supplémentaire
   */
  className?: string;
  /**
   * Dismissable (pour info, warning, error)
   */
  dismissible?: boolean;
  /**
   * Callback de dismissal
   */
  onDismiss?: () => void;
  /**
   * Taille du composant
   */
  size?: 'sm' | 'md' | 'lg';
}

export function LoadingFeedback({
  type,
  message,
  description,
  action,
  progress,
  progressText,
  className,
  dismissible,
  onDismiss,
  size = 'md',
}: LoadingFeedbackProps) {
  const sizeClasses = {
    sm: 'text-xs p-2 gap-1',
    md: 'text-sm p-4 gap-2',
    lg: 'text-base p-6 gap-3',
  };

  const iconSize = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  const iconColors = {
    loading: 'animate-spin text-primary',
    success: 'text-green-500',
    error: 'text-red-500',
    warning: 'text-amber-500',
    info: 'text-blue-500',
  };

  const backgroundColors = {
    loading: 'bg-primary/10 border-primary/20',
    success: 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800',
    error: 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800',
    warning: 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800',
    info: 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800',
  };

  const textColors = {
    loading: 'text-primary',
    success: 'text-green-900 dark:text-green-100',
    error: 'text-red-900 dark:text-red-100',
    warning: 'text-amber-900 dark:text-amber-100',
    info: 'text-blue-900 dark:text-blue-100',
  };

  const renderIcon = () => {
    switch (type) {
      case 'loading':
        return <Loader2 className={cn(iconSize[size], iconColors[type])} />;
      case 'success':
        return <CheckCircle2 className={cn(iconSize[size], iconColors[type])} />;
      case 'error':
        return <XCircle className={cn(iconSize[size], iconColors[type])} />;
      case 'warning':
        return <AlertCircle className={cn(iconSize[size], iconColors[type])} />;
      case 'info':
        return <Info className={cn(iconSize[size], iconColors[type])} />;
    }
  };

  return (
    <div
      className={cn(
        'rounded-lg border flex flex-col items-center justify-center text-center',
        backgroundColors[type],
        textColors[type],
        sizeClasses[size],
        className
      )}
      role="status"
      aria-live={type === 'error' || type === 'warning' ? 'assertive' : 'polite'}
    >
      <div className="flex items-center gap-2">
        {renderIcon()}
        <span className="font-medium">{message}</span>
      </div>

      {description && (
        <p className="opacity-80">{description}</p>
      )}

      {type === 'loading' && progress !== undefined && (
        <div className="w-full max-w-xs mt-2">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          {progressText && (
            <p className="text-xs mt-1 opacity-70">{progressText}</p>
          )}
        </div>
      )}

      {action && (
        <Button
          variant={action.variant === 'primary' ? 'default' : action.variant === 'secondary' ? 'secondary' : 'outline'}
          size={size === 'sm' ? 'sm' : 'default'}
          onClick={action.onClick}
          className="mt-2"
        >
          {action.label}
        </Button>
      )}

      {dismissible && onDismiss && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="absolute top-2 right-2 h-8 w-8 p-0"
          aria-label="Fermer"
        >
          <XCircle className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

// ============================================================================
// InlineLoading Component
// Indicateur de chargement inline
// ============================================================================

interface InlineLoadingProps {
  /**
   * Message optionnel
   */
  message?: string;
  /**
   * Classe CSS supplémentaire
   */
  className?: string;
}

export function InlineLoading({ message, className }: InlineLoadingProps) {
  return (
    <div
      className={cn('flex items-center gap-2 text-muted-foreground', className)}
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-4 w-4 animate-spin" />
      {message && <span>{message}</span>}
      <span className="sr-only">Chargement en cours</span>
    </div>
  );
}

// ============================================================================
// Skeleton Component
// Placeholder de chargement squelette
// ============================================================================

interface SkeletonProps {
  /**
   * Classe CSS pour la forme
   */
  className?: string;
  /**
   * Largeur
   */
  width?: string | number;
  /**
   * Hauteur
   */
  height?: string | number;
  /**
   * Variant de forme
   */
  variant?: 'text' | 'circular' | 'rectangular';
  /**
   * Animation shimmer
   */
  animated?: boolean;
}

export function Skeleton({
  className,
  width,
  height,
  variant = 'text',
  animated = true,
}: SkeletonProps) {
  const variantClasses = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: 'rounded-md',
  };

  return (
    <div
      className={cn(
        'bg-muted',
        variantClasses[variant],
        animated && 'animate-pulse',
        className
      )}
      style={{
        width: width,
        height: height || (variant === 'text' ? '1em' : undefined),
      }}
      aria-hidden="true"
    />
  );
}

// ============================================================================
// LoadingCard Component
// Carte de chargement avec squelettes
// ============================================================================

interface LoadingCardProps {
  /**
   * Nombre de lignes de squelette
   */
  lines?: number;
  /**
   * Classe CSS supplémentaire
   */
  className?: string;
  /**
   * Afficher l'header
   */
  showHeader?: boolean;
  /**
   * Afficher l'image
   */
  showImage?: boolean;
}

export function LoadingCard({
  lines = 3,
  className,
  showHeader = true,
  showImage = true,
}: LoadingCardProps) {
  return (
    <div className={cn('rounded-lg border bg-card p-4 space-y-3', className)}>
      {showHeader && (
        <div className="flex items-center gap-3">
          <Skeleton variant="circular" width={40} height={40} />
          <div className="flex-1 space-y-2">
            <Skeleton width="60%" height={16} />
            <Skeleton width="40%" height={12} />
          </div>
        </div>
      )}

      {showImage && (
        <Skeleton variant="rectangular" width="100%" height={120} />
      )}

      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            width={i === lines - 1 ? '70%' : '100%'}
            height={12}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// ButtonLoading Component
// Bouton avec état de chargement
// ============================================================================

interface ButtonLoadingProps {
  /**
   * État de chargement
   */
  isLoading: boolean;
  /**
   * Texte pendant le chargement
   */
  loadingText?: string;
  /**
   * Children (affiché quand pas en chargement)
   */
  children: React.ReactNode;
  /**
   * Classe CSS supplémentaire
   */
  className?: string;
}

export function ButtonLoading({
  isLoading,
  loadingText,
  children,
  className,
}: ButtonLoadingProps) {
  if (!isLoading) {
    return <>{children}</>;
  }

  return (
    <Button disabled className={cn('gap-2', className)}>
      <Loader2 className="h-4 w-4 animate-spin" />
      {loadingText || 'Chargement...'}
    </Button>
  );
}

// ============================================================================
// ProgressBar Component
// Barre de progression avec labels
// ============================================================================

interface ProgressBarProps {
  /**
   * Valeur de progression (0-100)
   */
  value: number;
  /**
   * Valeur maximale (défaut: 100)
   */
  max?: number;
  /**
   * Label optionnel
   */
  label?: string;
  /**
   * Texte de description
   */
  description?: string;
  /**
   * Afficher le pourcentage
   */
  showPercentage?: boolean;
  /**
   * Taille
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Couleur personnalisée
   */
  color?: 'primary' | 'success' | 'warning' | 'error';
  /**
   * Classe CSS supplémentaire
   */
  className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  label,
  description,
  showPercentage = true,
  size = 'md',
  color = 'primary',
  className,
}: ProgressBarProps) {
  const percentage = Math.round((value / max) * 100);

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  const colorClasses = {
    primary: 'bg-primary',
    success: 'bg-green-500',
    warning: 'bg-amber-500',
    error: 'bg-red-500',
  };

  return (
    <div className={cn('space-y-1', className)}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between text-sm">
          {label && <span className="font-medium">{label}</span>}
          {showPercentage && (
            <span className="text-muted-foreground">{percentage}%</span>
          )}
        </div>
      )}

      <div
        className={cn(
          'w-full bg-muted rounded-full overflow-hidden',
          sizeClasses[size]
        )}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
      >
        <div
          className={cn('h-full transition-all duration-300', colorClasses[color])}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

export default LoadingFeedback;

