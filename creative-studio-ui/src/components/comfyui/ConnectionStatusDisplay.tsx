/**
 * ConnectionStatusDisplay Component
 * 
 * Displays ComfyUI connection status with color coding and action buttons.
 * 
 * Validates: Requirements 6.1, 6.2
 */

import React from 'react';
import './ConnectionStatusDisplay.css';

export type ConnectionStatus = 'Connected' | 'Connecting' | 'Disconnected' | 'Error';

export interface ConnectionStatusDisplayProps {
  status: ConnectionStatus;
  message: string;
  details?: string;
  onAction?: () => void;
  actionLabel?: string;
  onClick?: () => void;
}

/**
 * Get color for connection status
 */
function getStatusColor(status: ConnectionStatus): string {
  switch (status) {
    case 'Connected':
      return '#10b981'; // green
    case 'Connecting':
      return '#f59e0b'; // amber
    case 'Disconnected':
      return '#6b7280'; // gray
    case 'Error':
      return '#ef4444'; // red
    default:
      return '#6b7280';
  }
}

/**
 * Get icon for connection status
 */
function getStatusIcon(status: ConnectionStatus): string {
  switch (status) {
    case 'Connected':
      return '✓';
    case 'Connecting':
      return '⟳';
    case 'Disconnected':
      return '○';
    case 'Error':
      return '✕';
    default:
      return '○';
  }
}

/**
 * Get default action label for status
 */
function getDefaultActionLabel(status: ConnectionStatus): string {
  switch (status) {
    case 'Connected':
      return 'View Details';
    case 'Connecting':
      return 'Cancel';
    case 'Disconnected':
      return 'Retry';
    case 'Error':
      return 'Retry';
    default:
      return 'Retry';
  }
}

export const ConnectionStatusDisplay: React.FC<ConnectionStatusDisplayProps> = ({
  status,
  message,
  details,
  onAction,
  actionLabel,
  onClick,
}) => {
  const statusColor = getStatusColor(status);
  const statusIcon = getStatusIcon(status);
  const finalActionLabel = actionLabel || getDefaultActionLabel(status);

  return (
    <div 
      className="connection-status-display"
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="connection-status-indicator">
        <div 
          className={`connection-status-dot ${status === 'Connecting' ? 'pulsing' : ''}`}
          style={{ backgroundColor: statusColor }}
          aria-label={`Status: ${status}`}
        >
          <span className="connection-status-icon">{statusIcon}</span>
        </div>
        
        <div className="connection-status-text">
          <div className="connection-status-label" style={{ color: statusColor }}>
            {status}
          </div>
          <div className="connection-status-message">
            {message}
          </div>
          {details && (
            <div className="connection-status-details">
              {details}
            </div>
          )}
        </div>
      </div>

      {onAction && (
        <button
          className="connection-status-action"
          onClick={(e) => {
            e.stopPropagation();
            onAction();
          }}
          aria-label={finalActionLabel}
        >
          {finalActionLabel}
        </button>
      )}
    </div>
  );
};

export default ConnectionStatusDisplay;
