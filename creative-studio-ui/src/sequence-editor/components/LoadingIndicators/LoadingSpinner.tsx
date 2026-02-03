/**
 * Loading Spinner Component
 * 
 * Displays a spinning loader for operations exceeding 500ms.
 * 
 * Requirement 20.6: Display spinners for operations exceeding 500ms
 */

import React from 'react';
import './loadingIndicators.css';

export interface LoadingSpinnerProps {
  /** Size of the spinner */
  size?: 'small' | 'medium' | 'large';
  /** Color of the spinner */
  color?: string;
  /** Additional CSS class */
  className?: string;
  /** Label text to display below spinner */
  label?: string;
}

/**
 * Loading spinner component
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  color,
  className = '',
  label,
}) => {
  const sizeClass = {
    small: 'loading-spinner-small',
    medium: '',
    large: 'loading-spinner-large',
  }[size];
  
  const spinnerStyle = color ? { borderTopColor: color } : undefined;
  
  return (
    <div className={`loading-spinner-container ${className}`}>
      <div 
        className={`loading-spinner ${sizeClass}`}
        style={spinnerStyle}
        role="status"
        aria-label={label || 'Loading'}
      />
      {label && (
        <div className="loading-spinner-label">{label}</div>
      )}
    </div>
  );
};

export default LoadingSpinner;
