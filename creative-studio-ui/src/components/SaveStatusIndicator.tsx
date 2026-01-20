/**
 * SaveStatusIndicator Component
 * 
 * Displays the current save status of the project with visual feedback.
 * Shows saving, saved, or error states with appropriate icons and colors.
 * 
 * Requirements: 9.2, 9.5
 */

import React from 'react';
import { useProject } from '../contexts/ProjectContext';

// ============================================================================
// Component Props
// ============================================================================

export interface SaveStatusIndicatorProps {
  className?: string;
  showText?: boolean;
}

// ============================================================================
// Component
// ============================================================================

/**
 * SaveStatusIndicator displays the current save status
 * Requirements: 9.2, 9.5
 */
export const SaveStatusIndicator: React.FC<SaveStatusIndicatorProps> = ({
  className = '',
  showText = true,
}) => {
  const { saveStatus, isSaving, error } = useProject();

  // Determine status display
  const getStatusDisplay = () => {
    if (isSaving || saveStatus === 'saving') {
      return {
        icon: '⏳',
        text: 'Saving...',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
      };
    }

    if (saveStatus === 'saved') {
      return {
        icon: '✓',
        text: 'Saved',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
      };
    }

    if (saveStatus === 'error' || error) {
      return {
        icon: '⚠',
        text: 'Save failed',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
      };
    }

    // Idle state - don't show anything
    return null;
  };

  const status = getStatusDisplay();

  if (!status) {
    return null;
  }

  return (
    <div
      className={`
        inline-flex items-center gap-2 px-3 py-1.5 rounded-md
        ${status.bgColor} ${status.color}
        text-sm font-medium
        transition-all duration-200
        ${className}
      `}
      role="status"
      aria-live="polite"
    >
      <span className="text-base" aria-hidden="true">
        {status.icon}
      </span>
      {showText && <span>{status.text}</span>}
      {error && saveStatus === 'error' && (
        <span className="text-xs opacity-75" title={error}>
          (Retry in progress)
        </span>
      )}
    </div>
  );
};

export default SaveStatusIndicator;
