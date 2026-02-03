/**
 * MockModeIndicator Component
 * 
 * Displays a clear indicator when the system is operating in mock mode.
 * Shows the reason for mock mode (backend unavailable or user preference).
 * 
 * Validates: Requirements 11.2, 11.3
 */

import React from 'react';
import './MockModeIndicator.css';

export type MockModeReason = 'backend_unavailable' | 'user_preference' | 'configuration';

export interface MockModeIndicatorProps {
  /** Whether mock mode is currently active */
  active: boolean;
  /** Reason for mock mode activation */
  reason?: MockModeReason;
  /** Optional custom message */
  customMessage?: string;
  /** Callback when user clicks the indicator */
  onClick?: () => void;
  /** Whether to show in compact mode */
  compact?: boolean;
}

/**
 * Get human-readable reason text
 */
function getReasonText(reason: MockModeReason): string {
  switch (reason) {
    case 'backend_unavailable':
      return 'ComfyUI backend unavailable';
    case 'user_preference':
      return 'Manually enabled by user';
    case 'configuration':
      return 'Configured in settings';
    default:
      return 'Active';
  }
}

/**
 * Get icon for mock mode reason
 */
function getReasonIcon(reason: MockModeReason): string {
  switch (reason) {
    case 'backend_unavailable':
      return '⚠';
    case 'user_preference':
      return '👤';
    case 'configuration':
      return '⚙';
    default:
      return 'ℹ';
  }
}

export const MockModeIndicator: React.FC<MockModeIndicatorProps> = ({
  active,
  reason = 'backend_unavailable',
  customMessage,
  onClick,
  compact = false,
}) => {
  if (!active) {
    return null;
  }

  const reasonText = customMessage || getReasonText(reason);
  const reasonIcon = getReasonIcon(reason);

  if (compact) {
    return (
      <div 
        className="mock-mode-indicator compact"
        onClick={onClick}
        style={{ cursor: onClick ? 'pointer' : 'default' }}
        role={onClick ? 'button' : 'status'}
        tabIndex={onClick ? 0 : undefined}
        aria-label={`Mock Mode Active: ${reasonText}`}
        onKeyDown={(e) => {
          if (onClick && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onClick();
          }
        }}
      >
        <span className="mock-mode-icon">{reasonIcon}</span>
        <span className="mock-mode-label">Mock Mode</span>
      </div>
    );
  }

  return (
    <div 
      className="mock-mode-indicator"
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      role={onClick ? 'button' : 'status'}
      tabIndex={onClick ? 0 : undefined}
      aria-label={`Mock Mode Active: ${reasonText}`}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="mock-mode-header">
        <span className="mock-mode-icon">{reasonIcon}</span>
        <span className="mock-mode-title">Mock Mode Active</span>
      </div>
      
      <div className="mock-mode-content">
        <div className="mock-mode-reason">
          {reasonText}
        </div>
        <div className="mock-mode-description">
          Placeholder images will be generated instead of real AI assets.
        </div>
      </div>

      {onClick && (
        <div className="mock-mode-hint">
          Click for more information
        </div>
      )}
    </div>
  );
};

export default MockModeIndicator;
