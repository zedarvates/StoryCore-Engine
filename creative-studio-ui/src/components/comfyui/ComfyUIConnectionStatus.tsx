/**
 * ComfyUIConnectionStatus Component
 * 
 * Integrated component that combines ConnectionStatusDisplay, ConnectionInfoModal,
 * and automatic status updates via useConnectionStatus hook.
 * 
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */

import React, { useState, useCallback } from 'react';
import { ConnectionStatusDisplay } from './ConnectionStatusDisplay';
import { ConnectionInfoModal } from './ConnectionInfoModal';
import { MockModeIndicator, MockModeReason } from './MockModeIndicator';
import { useConnectionStatus } from '../../hooks/useConnectionStatus';

export interface ComfyUIConnectionStatusProps {
  /**
   * Backend URL (default: http://localhost:8000)
   */
  backendUrl?: string;
  
  /**
   * Update interval in milliseconds (default: 5000ms = 5 seconds)
   */
  updateInterval?: number;
  
  /**
   * Enable automatic status updates (default: true)
   */
  autoUpdate?: boolean;
  
  /**
   * Callback when status changes
   */
  onStatusChange?: (status: 'Connected' | 'Connecting' | 'Disconnected' | 'Error') => void;
  
  /**
   * Callback when retry is clicked
   */
  onRetry?: () => void;
  
  /**
   * Callback when configure is clicked
   */
  onConfigure?: () => void;
  
  /**
   * Callback when view logs is clicked
   */
  onViewLogs?: () => void;
  
  /**
   * Whether mock mode is manually enabled by user (default: false)
   */
  mockModeEnabled?: boolean;
  
  /**
   * Callback when mock mode indicator is clicked
   */
  onMockModeClick?: () => void;
}

/**
 * Get display message for connection status
 */
function getStatusMessage(
  status: 'Connected' | 'Connecting' | 'Disconnected' | 'Error',
  version?: string,
  queueDepth?: number
): string {
  switch (status) {
    case 'Connected':
      if (version) {
        return `ComfyUI ${version} - ${queueDepth || 0} items in queue`;
      }
      return 'Connected to ComfyUI Desktop';
    case 'Connecting':
      return 'Connecting to ComfyUI Desktop...';
    case 'Disconnected':
      return 'Not connected to ComfyUI Desktop';
    case 'Error':
      return 'Connection error';
    default:
      return 'Unknown status';
  }
}

/**
 * Get details text for connection status
 */
function getStatusDetails(
  status: 'Connected' | 'Connecting' | 'Disconnected' | 'Error',
  url: string,
  errorMessage?: string
): string | undefined {
  switch (status) {
    case 'Connected':
      return `Connected to ${url}`;
    case 'Disconnected':
      return 'Start ComfyUI Desktop to enable real generation';
    case 'Error':
      return errorMessage || 'Failed to connect';
    default:
      return undefined;
  }
}

export const ComfyUIConnectionStatus: React.FC<ComfyUIConnectionStatusProps> = ({
  backendUrl = 'http://localhost:8000',
  updateInterval = 5000,
  autoUpdate = true,
  onStatusChange,
  onRetry,
  onConfigure,
  onViewLogs,
  mockModeEnabled = false,
  onMockModeClick,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const {
    status,
    connectionInfo,
    isChecking,
    checkStatus,
  } = useConnectionStatus({
    backendUrl,
    updateInterval,
    autoUpdate,
    onStatusChange,
  });
  
  /**
   * Determine if mock mode is active
   * Mock mode is active when:
   * 1. User manually enabled it, OR
   * 2. Backend is unavailable (Disconnected or Error status)
   */
  const isMockModeActive = mockModeEnabled || status === 'Disconnected' || status === 'Error';
  
  /**
   * Determine mock mode reason
   */
  const mockModeReason: MockModeReason = mockModeEnabled 
    ? 'user_preference' 
    : 'backend_unavailable';
  
  /**
   * Handle retry action
   */
  const handleRetry = useCallback(() => {
    checkStatus();
    onRetry?.();
  }, [checkStatus, onRetry]);
  
  /**
   * Handle action button click
   */
  const handleAction = useCallback(() => {
    if (status === 'Connected') {
      setIsModalOpen(true);
    } else {
      handleRetry();
    }
  }, [status, handleRetry]);
  
  /**
   * Handle status display click
   */
  const handleStatusClick = useCallback(() => {
    setIsModalOpen(true);
  }, []);
  
  /**
   * Handle modal close
   */
  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
  }, []);
  
  const message = getStatusMessage(status, connectionInfo.version, connectionInfo.queueDepth);
  const details = getStatusDetails(status, connectionInfo.url, connectionInfo.errorMessage);
  
  return (
    <>
      <ConnectionStatusDisplay
        status={isChecking ? 'Connecting' : status}
        message={message}
        details={details}
        onAction={handleAction}
        onClick={handleStatusClick}
      />
      
      <MockModeIndicator
        active={isMockModeActive}
        reason={mockModeReason}
        onClick={onMockModeClick}
      />
      
      <ConnectionInfoModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        connectionInfo={connectionInfo}
        onRetry={handleRetry}
        onConfigure={onConfigure}
        onViewLogs={onViewLogs}
      />
    </>
  );
};

export default ComfyUIConnectionStatus;
