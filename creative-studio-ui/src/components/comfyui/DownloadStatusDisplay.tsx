/**
 * DownloadStatusDisplay Component
 * 
 * Displays active model downloads with individual progress bars, download speed,
 * and estimated time remaining.
 * 
 * Validates: Requirements 7.2, 7.3
 */

import React from 'react';
import './DownloadStatusDisplay.css';

export interface DownloadProgress {
  modelName: string;
  totalBytes: number;
  downloadedBytes: number;
  speedMbps: number;
  etaSeconds: number;
  status: 'downloading' | 'paused' | 'completed' | 'failed';
  errorMessage?: string;
}

export interface DownloadStatusDisplayProps {
  activeDownloads: DownloadProgress[];
  onPause?: (modelName: string) => void;
  onResume?: (modelName: string) => void;
  onCancel?: (modelName: string) => void;
  onRetry?: (modelName: string) => void;
}

/**
 * Format bytes to human-readable size
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Format seconds to human-readable time
 */
function formatTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

/**
 * Get status color
 */
function getStatusColor(status: DownloadProgress['status']): string {
  switch (status) {
    case 'downloading':
      return '#3b82f6'; // blue
    case 'paused':
      return '#f59e0b'; // amber
    case 'completed':
      return '#10b981'; // green
    case 'failed':
      return '#ef4444'; // red
    default:
      return '#6b7280'; // gray
  }
}

/**
 * Get status icon
 */
function getStatusIcon(status: DownloadProgress['status']): string {
  switch (status) {
    case 'downloading':
      return '⬇';
    case 'paused':
      return '⏸';
    case 'completed':
      return '✓';
    case 'failed':
      return '✕';
    default:
      return '○';
  }
}

/**
 * Individual download item component
 */
const DownloadItem: React.FC<{
  download: DownloadProgress;
  onPause?: (modelName: string) => void;
  onResume?: (modelName: string) => void;
  onCancel?: (modelName: string) => void;
  onRetry?: (modelName: string) => void;
}> = ({ download, onPause, onResume, onCancel, onRetry }) => {
  const percentage = download.totalBytes > 0
    ? (download.downloadedBytes / download.totalBytes) * 100
    : 0;
  
  const statusColor = getStatusColor(download.status);
  const statusIcon = getStatusIcon(download.status);

  return (
    <div className="download-item">
      <div className="download-item-header">
        <div className="download-item-info">
          <span 
            className="download-status-icon"
            style={{ color: statusColor }}
            aria-label={`Status: ${download.status}`}
          >
            {statusIcon}
          </span>
          <span className="download-model-name">{download.modelName}</span>
        </div>
        
        <div className="download-item-controls">
          {download.status === 'downloading' && onPause && (
            <button
              className="download-control-btn"
              onClick={() => onPause(download.modelName)}
              aria-label="Pause download"
              title="Pause"
            >
              ⏸
            </button>
          )}
          
          {download.status === 'paused' && onResume && (
            <button
              className="download-control-btn"
              onClick={() => onResume(download.modelName)}
              aria-label="Resume download"
              title="Resume"
            >
              ▶
            </button>
          )}
          
          {download.status === 'failed' && onRetry && (
            <button
              className="download-control-btn retry"
              onClick={() => onRetry(download.modelName)}
              aria-label="Retry download"
              title="Retry"
            >
              ↻
            </button>
          )}
          
          {(download.status === 'downloading' || download.status === 'paused') && onCancel && (
            <button
              className="download-control-btn cancel"
              onClick={() => onCancel(download.modelName)}
              aria-label="Cancel download"
              title="Cancel"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="download-progress-bar-container">
        <div 
          className="download-progress-bar"
          style={{ 
            width: `${percentage}%`,
            backgroundColor: statusColor
          }}
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>

      <div className="download-item-details">
        <div className="download-size-info">
          <span className="download-current-size">
            {formatBytes(download.downloadedBytes)}
          </span>
          <span className="download-separator"> / </span>
          <span className="download-total-size">
            {formatBytes(download.totalBytes)}
          </span>
          <span className="download-percentage">
            {' '}({percentage.toFixed(1)}%)
          </span>
        </div>

        {download.status === 'downloading' && (
          <div className="download-speed-eta">
            <span className="download-speed">
              {download.speedMbps.toFixed(2)} MB/s
            </span>
            <span className="download-separator"> • </span>
            <span className="download-eta">
              ETA: {formatTime(download.etaSeconds)}
            </span>
          </div>
        )}

        {download.status === 'failed' && download.errorMessage && (
          <div className="download-error-message">
            {download.errorMessage}
          </div>
        )}

        {download.status === 'completed' && (
          <div className="download-completed-message">
            Download completed successfully
          </div>
        )}

        {download.status === 'paused' && (
          <div className="download-paused-message">
            Download paused
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Main DownloadStatusDisplay component
 */
export const DownloadStatusDisplay: React.FC<DownloadStatusDisplayProps> = ({
  activeDownloads,
  onPause,
  onResume,
  onCancel,
  onRetry,
}) => {
  if (activeDownloads.length === 0) {
    return null;
  }

  return (
    <div className="download-status-display">
      <div className="download-status-header">
        <h3 className="download-status-title">Model Downloads</h3>
        <span className="download-count-badge">
          {activeDownloads.length}
        </span>
      </div>

      <div className="download-items-container">
        {activeDownloads.map((download) => (
          <DownloadItem
            key={download.modelName}
            download={download}
            onPause={onPause}
            onResume={onResume}
            onCancel={onCancel}
            onRetry={onRetry}
          />
        ))}
      </div>
    </div>
  );
};

export default DownloadStatusDisplay;
