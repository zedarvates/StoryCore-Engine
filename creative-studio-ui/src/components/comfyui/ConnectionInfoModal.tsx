/**
 * ConnectionInfoModal Component
 * 
 * Displays detailed connection information in a modal dialog.
 * Shows ComfyUI version, queue depth, CORS status, model/workflow readiness.
 * 
 * Validates: Requirements 6.3, 6.4, 6.6
 */

import React from 'react';
import './ConnectionInfoModal.css';

export interface ConnectionInfo {
  status: 'Connected' | 'Connecting' | 'Disconnected' | 'Error';
  url: string;
  version?: string;
  queueDepth?: number;
  corsEnabled?: boolean;
  modelsReady?: boolean;
  workflowsReady?: boolean;
  errorMessage?: string;
  disconnectionReason?: string;
  suggestedActions?: string[];
  lastCheck?: Date;
}

export interface ConnectionInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  connectionInfo: ConnectionInfo;
  onRetry?: () => void;
  onConfigure?: () => void;
  onViewLogs?: () => void;
}

/**
 * Format date to readable string
 */
function formatDate(date?: Date): string {
  if (!date) return 'Never';
  
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  
  return date.toLocaleString();
}

/**
 * Get status badge color
 */
function getStatusBadgeColor(ready: boolean | undefined): string {
  if (ready === undefined) return '#6b7280'; // gray
  return ready ? '#10b981' : '#ef4444'; // green or red
}

/**
 * Get status badge text
 */
function getStatusBadgeText(ready: boolean | undefined): string {
  if (ready === undefined) return 'Unknown';
  return ready ? 'Ready' : 'Not Ready';
}

export const ConnectionInfoModal: React.FC<ConnectionInfoModalProps> = ({
  isOpen,
  onClose,
  connectionInfo,
  onRetry,
  onConfigure,
  onViewLogs,
}) => {
  if (!isOpen) return null;

  const isConnected = connectionInfo.status === 'Connected';
  const isDisconnected = connectionInfo.status === 'Disconnected' || connectionInfo.status === 'Error';

  return (
    <div className="connection-info-modal-overlay" onClick={onClose}>
      <div 
        className="connection-info-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="connection-info-title"
        aria-modal="true"
      >
        <div className="connection-info-header">
          <h2 id="connection-info-title">Connection Information</h2>
          <button
            className="connection-info-close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="connection-info-content">
          {/* Connection Status Section */}
          <div className="connection-info-section">
            <h3>Connection Status</h3>
            <div className="connection-info-grid">
              <div className="connection-info-item">
                <span className="connection-info-label">Status:</span>
                <span 
                  className="connection-info-value"
                  style={{ 
                    color: isConnected ? '#10b981' : isDisconnected ? '#ef4444' : '#f59e0b' 
                  }}
                >
                  {connectionInfo.status}
                </span>
              </div>
              
              <div className="connection-info-item">
                <span className="connection-info-label">URL:</span>
                <span className="connection-info-value connection-info-url">
                  {connectionInfo.url}
                </span>
              </div>
              
              <div className="connection-info-item">
                <span className="connection-info-label">Last Check:</span>
                <span className="connection-info-value">
                  {formatDate(connectionInfo.lastCheck)}
                </span>
              </div>
            </div>
          </div>

          {/* Connected State Information */}
          {isConnected && (
            <>
              <div className="connection-info-section">
                <h3>Backend Information</h3>
                <div className="connection-info-grid">
                  <div className="connection-info-item">
                    <span className="connection-info-label">ComfyUI Version:</span>
                    <span className="connection-info-value">
                      {connectionInfo.version || 'Unknown'}
                    </span>
                  </div>
                  
                  <div className="connection-info-item">
                    <span className="connection-info-label">Queue Depth:</span>
                    <span className="connection-info-value">
                      {connectionInfo.queueDepth !== undefined 
                        ? `${connectionInfo.queueDepth} items` 
                        : 'Unknown'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="connection-info-section">
                <h3>Readiness Status</h3>
                <div className="connection-info-badges">
                  <div className="connection-info-badge">
                    <span 
                      className="connection-info-badge-dot"
                      style={{ backgroundColor: getStatusBadgeColor(connectionInfo.corsEnabled) }}
                    />
                    <span className="connection-info-badge-label">CORS:</span>
                    <span className="connection-info-badge-value">
                      {getStatusBadgeText(connectionInfo.corsEnabled)}
                    </span>
                  </div>
                  
                  <div className="connection-info-badge">
                    <span 
                      className="connection-info-badge-dot"
                      style={{ backgroundColor: getStatusBadgeColor(connectionInfo.modelsReady) }}
                    />
                    <span className="connection-info-badge-label">Models:</span>
                    <span className="connection-info-badge-value">
                      {getStatusBadgeText(connectionInfo.modelsReady)}
                    </span>
                  </div>
                  
                  <div className="connection-info-badge">
                    <span 
                      className="connection-info-badge-dot"
                      style={{ backgroundColor: getStatusBadgeColor(connectionInfo.workflowsReady) }}
                    />
                    <span className="connection-info-badge-label">Workflows:</span>
                    <span className="connection-info-badge-value">
                      {getStatusBadgeText(connectionInfo.workflowsReady)}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Disconnected State Information */}
          {isDisconnected && (
            <>
              <div className="connection-info-section">
                <h3>Disconnection Details</h3>
                <div className="connection-info-error">
                  <div className="connection-info-error-icon">⚠</div>
                  <div className="connection-info-error-content">
                    <div className="connection-info-error-title">
                      {connectionInfo.disconnectionReason || connectionInfo.errorMessage || 'Connection failed'}
                    </div>
                    {connectionInfo.errorMessage && connectionInfo.disconnectionReason && (
                      <div className="connection-info-error-details">
                        {connectionInfo.errorMessage}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {connectionInfo.suggestedActions && connectionInfo.suggestedActions.length > 0 && (
                <div className="connection-info-section">
                  <h3>Suggested Actions</h3>
                  <ul className="connection-info-actions-list">
                    {connectionInfo.suggestedActions.map((action, index) => (
                      <li key={index}>{action}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        <div className="connection-info-footer">
          {onRetry && isDisconnected && (
            <button
              className="connection-info-button connection-info-button-primary"
              onClick={onRetry}
            >
              Retry Connection
            </button>
          )}
          
          {onConfigure && (
            <button
              className="connection-info-button connection-info-button-secondary"
              onClick={onConfigure}
            >
              Configure
            </button>
          )}
          
          {onViewLogs && (
            <button
              className="connection-info-button connection-info-button-secondary"
              onClick={onViewLogs}
            >
              View Logs
            </button>
          )}
          
          <button
            className="connection-info-button connection-info-button-secondary"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConnectionInfoModal;
