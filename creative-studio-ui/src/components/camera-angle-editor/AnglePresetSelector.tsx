/**
 * AnglePresetSelector Component
 * 
 * A grid of angle preset buttons for selecting camera angles.
 * Supports multi-select for batch generation.
 * 
 * Usage:
 * ```tsx
 * <AnglePresetSelector
 *   selectedAngles={['front', 'left']}
 *   onAngleToggle={(angle) => handleToggle(angle)}
 *   onSelectAll={() => handleSelectAll()}
 *   onClearSelection={() => handleClear()}
 * />
 * ```
 */

import React from 'react';
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpFromLine,
  RotateCcw,
  CircleDot,
  Maximize2,
  Minimize2,
  Bird,
  Worm,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CameraAnglePreset, CameraAnglePresetMetadata } from '@/types/cameraAngle';

// ============================================================================
// Types
// ============================================================================

export interface AnglePresetSelectorProps {
  /** Available presets to display */
  presets: CameraAnglePresetMetadata[];
  /** Currently selected angles */
  selectedAngles: CameraAnglePreset[];
  /** Callback when an angle is toggled */
  onAngleToggle: (angle: CameraAnglePreset) => void;
  /** Callback to select all angles */
  onSelectAll?: () => void;
  /** Callback to clear selection */
  onClearSelection?: () => void;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Show select all/clear buttons */
  showSelectAll?: boolean;
  /** Grid columns (default: 4) */
  columns?: 2 | 3 | 4 | 5 | 6;
}

// ============================================================================
// Icon Mapping
// ============================================================================

/**
 * Map preset IDs to Lucide icons
 */
const getPresetIcon = (presetId: CameraAnglePreset): React.ReactNode => {
  const iconClass = 'w-5 h-5';
  
  switch (presetId) {
    case 'front':
      return <CircleDot className={iconClass} aria-hidden="true" />;
    case 'left':
      return <ArrowLeft className={iconClass} aria-hidden="true" />;
    case 'right':
      return <ArrowRight className={iconClass} aria-hidden="true" />;
    case 'top':
      return <ArrowUp className={iconClass} aria-hidden="true" />;
    case 'bottom':
      return <ArrowDown className={iconClass} aria-hidden="true" />;
    case 'isometric':
      return <RotateCcw className={iconClass} aria-hidden="true" />;
    case 'back':
      return <ArrowUpFromLine className={iconClass} aria-hidden="true" />;
    case 'close_up':
      return <Maximize2 className={iconClass} aria-hidden="true" />;
    case 'wide_shot':
      return <Minimize2 className={iconClass} aria-hidden="true" />;
    case 'bird_eye':
      return <Bird className={iconClass} aria-hidden="true" />;
    case 'worm_eye':
      return <Worm className={iconClass} aria-hidden="true" />;
    default:
      return <CircleDot className={iconClass} aria-hidden="true" />;
  }
};

// ============================================================================
// Component
// ============================================================================

export const AnglePresetSelector: React.FC<AnglePresetSelectorProps> = ({
  presets,
  selectedAngles,
  onAngleToggle,
  onSelectAll,
  onClearSelection,
  disabled = false,
  className,
  showSelectAll = true,
  columns = 4,
}) => {
  /**
   * Check if an angle is selected
   */
  const isSelected = (angle: CameraAnglePreset): boolean => {
    return selectedAngles.includes(angle);
  };

  /**
   * Handle button click
   */
  const handleClick = (angle: CameraAnglePreset) => {
    if (!disabled) {
      onAngleToggle(angle);
    }
  };

  /**
   * Handle keyboard interaction
   */
  const handleKeyDown = (e: React.KeyboardEvent, angle: CameraAnglePreset) => {
    if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
      e.preventDefault();
      onAngleToggle(angle);
    }
  };

  /**
   * Get grid columns class
   */
  const getGridClass = () => {
    switch (columns) {
      case 2:
        return 'grid-cols-2';
      case 3:
        return 'grid-cols-3';
      case 5:
        return 'grid-cols-5';
      case 6:
        return 'grid-cols-6';
      case 4:
      default:
        return 'grid-cols-4';
    }
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header with select all/clear buttons */}
      {showSelectAll && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Select Camera Angles
          </span>
          <div className="flex gap-2">
            {onSelectAll && (
              <button
                type="button"
                onClick={onSelectAll}
                disabled={disabled}
                className={cn(
                  'text-xs px-2 py-1 rounded transition-colors',
                  disabled
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-primary hover:bg-primary/10'
                )}
                aria-label="Select all angles"
              >
                Select All
              </button>
            )}
            {onClearSelection && (
              <button
                type="button"
                onClick={onClearSelection}
                disabled={disabled || selectedAngles.length === 0}
                className={cn(
                  'text-xs px-2 py-1 rounded transition-colors',
                  disabled || selectedAngles.length === 0
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                )}
                aria-label="Clear selection"
              >
                Clear ({selectedAngles.length})
              </button>
            )}
          </div>
        </div>
      )}

      {/* Preset grid */}
      <fieldset className={cn('grid gap-2', getGridClass())}>
        <legend className="sr-only">Camera angle presets</legend>
        {presets.map((preset) => {
          const selected = isSelected(preset.id);

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleClick(preset.id)}
              onKeyDown={(e) => handleKeyDown(e, preset.id)}
              disabled={disabled}
              className={cn(
                'relative flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all',
                'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2',
                disabled && 'cursor-not-allowed opacity-50',
                selected
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
              )}
              aria-pressed={selected}
              aria-label={`${preset.displayName}: ${preset.description}`}
              title={preset.description}
            >
              {/* Selection indicator */}
              {selected && (
                <div className="absolute top-1 right-1">
                  <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-primary-foreground" />
                  </div>
                </div>
              )}

              {/* Icon */}
              <div
                className={cn(
                  'mb-1',
                  selected
                    ? 'text-primary'
                    : 'text-gray-500 dark:text-gray-400'
                )}
              >
                {getPresetIcon(preset.id)}
              </div>

              {/* Label */}
              <span
                className={cn(
                  'text-xs font-medium text-center leading-tight',
                  selected
                    ? 'text-primary'
                    : 'text-gray-700 dark:text-gray-300'
                )}
              >
                {preset.displayName}
              </span>
            </button>
          );
        })}
      </fieldset>

      {/* Selection count */}
      {selectedAngles.length > 0 && (
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          {selectedAngles.length} angle{selectedAngles.length === 1 ? '' : 's'} selected
        </p>
      )}
    </div>
  );
};

// ============================================================================
// Exports
// ============================================================================

export default AnglePresetSelector;
