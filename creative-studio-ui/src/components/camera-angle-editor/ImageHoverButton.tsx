/**
 * ImageHoverButton Component
 * 
 * A button that appears on image hover to open the camera angle editor.
 * Uses Tailwind CSS with group/group-hover pattern for the hover effect.
 * 
 * Usage:
 * ```tsx
 * <ImageHoverButton
 *   imageId="image-123"
 *   imagePath="/path/to/image.jpg"
 *   onClick={(imageId, imagePath) => openEditor(imagePath)}
 * >
 *   <img src="/path/to/image.jpg" alt="My image" />
 * </ImageHoverButton>
 * ```
 */

import React from 'react';
import { CameraIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface ImageHoverButtonProps {
  /** Unique identifier for the image */
  imageId: string;
  /** Path or URL to the image */
  imagePath: string;
  /** Callback when the button is clicked */
  onClick: (imageId: string, imagePath: string) => void;
  /** Optional children to render instead of default image display */
  children?: React.ReactNode;
  /** Additional CSS classes for the container */
  className?: string;
  /** Button label text - defaults to French text */
  buttonLabel?: string;
  /** Whether the button should be disabled */
  disabled?: boolean;
  /** Position of the button overlay */
  buttonPosition?: 'center' | 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  /** Alt text for accessibility when no children provided */
  imageAlt?: string;
  /** Whether to show the hover scale effect on the image */
  enableScaleEffect?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export const ImageHoverButton: React.FC<ImageHoverButtonProps> = ({
  imageId,
  imagePath,
  onClick,
  children,
  className,
  buttonLabel = "Changer l'angle de vue par IA",
  disabled = false,
  buttonPosition = 'center',
  imageAlt = 'Image',
  enableScaleEffect = true,
}) => {
  /**
   * Handle button click
   */
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!disabled) {
      onClick(imageId, imagePath);
    }
  };

  /**
   * Handle keyboard interaction for accessibility
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!disabled) {
        onClick(imageId, imagePath);
      }
    }
  };

  /**
   * Get position classes for the button overlay
   */
  const getPositionClasses = () => {
    switch (buttonPosition) {
      case 'bottom-right':
        return 'items-end justify-end p-2';
      case 'bottom-left':
        return 'items-end justify-start p-2';
      case 'top-right':
        return 'items-start justify-end p-2';
      case 'top-left':
        return 'items-start justify-start p-2';
      case 'center':
      default:
        return 'items-center justify-center';
    }
  };

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-lg',
        className
      )}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={handleKeyDown}
      aria-label={buttonLabel}
    >
      {/* Render children or default image */}
      {children || (
        <img
          src={imagePath}
          alt={imageAlt}
          className={cn(
            'w-full h-full object-cover transition-transform duration-300',
            enableScaleEffect && 'group-hover:scale-105'
          )}
          loading="lazy"
        />
      )}

      {/* Hover overlay with button */}
      <div
        className={cn(
          'absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex',
          getPositionClasses()
        )}
      >
        <button
          type="button"
          onClick={handleClick}
          disabled={disabled}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors shadow-lg text-sm font-medium',
            'focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-black/40',
            disabled
              ? 'bg-gray-400/50 cursor-not-allowed text-gray-300'
              : 'bg-white/90 hover:bg-white text-gray-800'
          )}
          aria-label={buttonLabel}
        >
          <CameraIcon className="w-4 h-4" aria-hidden="true" />
          <span>{buttonLabel}</span>
        </button>
      </div>

      {/* Focus indicator for keyboard navigation */}
      <div
        className="absolute inset-0 ring-2 ring-primary ring-opacity-0 group-focus-visible:ring-opacity-100 rounded-lg pointer-events-none transition-opacity"
        aria-hidden="true"
      />
    </div>
  );
};

// ============================================================================
// Compound Components
// ============================================================================

/**
 * ImageHoverButtonOverlay - For custom overlay content
 * 
 * Use this when you want a custom overlay instead of the default button.
 */
export interface ImageHoverButtonOverlayProps {
  children: React.ReactNode;
  className?: string;
}

export const ImageHoverButtonOverlay: React.FC<ImageHoverButtonOverlayProps> = ({
  children,
  className,
}) => (
  <div
    className={cn(
      'absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center',
      className
    )}
  >
    {children}
  </div>
);

// ============================================================================
// Utility Component
// ============================================================================

/**
 * ImageWithHoverButton - Simplified wrapper for common use case
 */
export interface ImageWithHoverButtonProps extends Omit<ImageHoverButtonProps, 'children'> {
  /** Image source URL */
  src: string;
  /** Alt text for the image */
  alt: string;
  /** Additional classes for the image */
  imageClassName?: string;
}

export const ImageWithHoverButton: React.FC<ImageWithHoverButtonProps> = ({
  src,
  alt,
  imageClassName,
  ...props
}) => (
  <ImageHoverButton {...props} imagePath={src} imageAlt={alt}>
    <img
      src={src}
      alt={alt}
      className={cn('w-full h-full object-cover', imageClassName)}
      loading="lazy"
    />
  </ImageHoverButton>
);

// ============================================================================
// Exports
// ============================================================================

export default ImageHoverButton;
