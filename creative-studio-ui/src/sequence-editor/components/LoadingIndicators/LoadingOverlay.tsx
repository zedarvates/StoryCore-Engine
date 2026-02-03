/**
 * Loading Overlay Component
 * 
 * Displays a full-screen or container overlay with loading indicator.
 * 
 * Requirement 20.6: Display spinners for operations exceeding 500ms
 */

import React from 'react';
import LoadingSpinner from './LoadingSpinner';
import './loadingIndicators.css';

export interface LoadingOverlayProps {
  /** Whether the overlay is visible */
  visible: boolean;
  /** Message to display */
  message?: string;
  /** Whether to show as fullscreen overlay */
  fullscreen?: boolean;
  /** Additional CSS class */
  className?: string;
}

/**
 * Loading overlay component
 */
export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible,
  message,
  fullscreen = false,
  className = '',
}) => {
  if (!visible) return null;
  
  return (
    <div 
      className={`loading-overlay ${fullscreen ? 'loading-overlay-fullscreen' : ''} ${className}`}
      role="alert"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="loading-overlay-content">
        <LoadingSpinner size="large" />
        {message && (
          <div className="loading-overlay-message">{message}</div>
        )}
      </div>
    </div>
  );
};

export default LoadingOverlay;
