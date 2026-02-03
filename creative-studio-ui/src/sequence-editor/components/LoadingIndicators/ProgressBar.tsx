/**
 * Progress Bar Component
 * 
 * Displays a progress bar for operations with known progress.
 * 
 * Requirement 20.6: Display spinners for operations exceeding 500ms
 * Requirement 20.7: Use ease-in-out for all animations
 */

import React from 'react';
import './loadingIndicators.css';

export interface ProgressBarProps {
  /** Progress value (0-100) */
  value?: number;
  /** Whether to show indeterminate progress */
  indeterminate?: boolean;
  /** Label text */
  label?: string;
  /** Whether to show percentage */
  showPercentage?: boolean;
  /** Color of the progress bar */
  color?: string;
  /** Additional CSS class */
  className?: string;
}

/**
 * Progress bar component
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({
  value = 0,
  indeterminate = false,
  label,
  showPercentage = false,
  color,
  className = '',
}) => {
  const clampedValue = Math.max(0, Math.min(100, value));
  const fillStyle = color ? { backgroundColor: color } : undefined;
  
  return (
    <div className={`progress-bar-container ${className}`}>
      {(label || showPercentage) && (
        <div className="progress-bar-header">
          {label && <span className="progress-bar-label">{label}</span>}
          {showPercentage && !indeterminate && (
            <span className="progress-bar-percentage">{Math.round(clampedValue)}%</span>
          )}
        </div>
      )}
      <div 
        className="progress-bar"
        role="progressbar"
        aria-valuenow={indeterminate ? undefined : clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || 'Progress'}
      >
        {indeterminate ? (
          <div 
            className="progress-bar-indeterminate"
            style={fillStyle}
          />
        ) : (
          <div 
            className="progress-bar-fill"
            style={{ 
              width: `${clampedValue}%`,
              ...fillStyle
            }}
          />
        )}
      </div>
    </div>
  );
};

export default ProgressBar;
