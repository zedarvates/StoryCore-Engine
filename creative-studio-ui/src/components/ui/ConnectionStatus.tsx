/**
 * Connection Status Component
 * 
 * Displays connection status with indicators and retry functionality
 */

import React from 'react';
import { CheckCircle, XCircle, AlertCircle, Loader, RefreshCw } from 'lucide-react';
import './ConnectionStatus.css';

export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'error' | 'warning';

export interface ConnectionStatusProps {
  state: ConnectionState;
  message?: string;
  onRetry?: () => void;
  showRetry?: boolean;
  className?: string;
}

export function ConnectionStatus({
  state,
  message,
  onRetry,
  showRetry = true,
  className = '',
}: ConnectionStatusProps) {
  const getIcon = () => {
    switch (state) {
      case 'connecting':
        return <Loader className="connection-icon connection-icon-spin" />;
      case 'connected':
        return <CheckCircle className="connection-icon connection-icon-success" />;
      case 'error':
        return <XCircle className="connection-icon connection-icon-error" />;
      case 'warning':
        return <AlertCircle className="connection-icon connection-icon-warning" />;
      case 'idle':
      default:
        return null;
    }
  };

  const getStatusClass = () => {
    switch (state) {
      case 'connecting':
        return 'connection-status-connecting';
      case 'connected':
        return 'connection-status-connected';
      case 'error':
        return 'connection-status-error';
      case 'warning':
        return 'connection-status-warning';
      case 'idle':
      default:
        return 'connection-status-idle';
    }
  };

  if (state === 'idle') return null;

  return (
    <div className={`connection-status ${getStatusClass()} ${className}`}>
      <div className="connection-status-content">
        {getIcon()}
        {message && <span className="connection-status-message">{message}</span>}
      </div>
      {showRetry && state === 'error' && onRetry && (
        <button
          className="connection-retry-button"
          onClick={onRetry}
          aria-label="Retry connection"
        >
          <RefreshCw className="connection-retry-icon" />
          Retry
        </button>
      )}
    </div>
  );
}

/**
 * Inline Connection Status Component
 * Compact version for inline display
 */
export interface InlineConnectionStatusProps {
  state: ConnectionState;
  label?: string;
  className?: string;
}

export function InlineConnectionStatus({
  state,
  label,
  className = '',
}: InlineConnectionStatusProps) {
  const getIcon = () => {
    switch (state) {
      case 'connecting':
        return <Loader className="inline-connection-icon inline-connection-icon-spin" />;
      case 'connected':
        return <CheckCircle className="inline-connection-icon inline-connection-icon-success" />;
      case 'error':
        return <XCircle className="inline-connection-icon inline-connection-icon-error" />;
      case 'warning':
        return <AlertCircle className="inline-connection-icon inline-connection-icon-warning" />;
      case 'idle':
      default:
        return null;
    }
  };

  if (state === 'idle') return null;

  return (
    <div className={`inline-connection-status ${className}`}>
      {getIcon()}
      {label && <span className="inline-connection-label">{label}</span>}
    </div>
  );
}
