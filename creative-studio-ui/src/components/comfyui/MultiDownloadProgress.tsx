/**
 * MultiDownloadProgress Component
 * 
 * Displays overall progress summary for multiple concurrent downloads,
 * including completed count, failed count, and total MB downloaded.
 * 
 * Validates: Requirements 7.4
 */

import React from 'react';
import './MultiDownloadProgress.css';
import { DownloadProgress } from './DownloadStatusDisplay';

export interface MultiDownloadProgressProps {
  downloads: DownloadProgress[];
  onClearCompleted?: () => void;
}

/**
 * Format bytes to MB
 */
function formatMB(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(2);
}

/**
 * Calculate overall statistics
 */
function calculateStats(downloads: DownloadProgress[]) {
  const stats = {
    total: downloads.length,
    downloading: 0,
    paused: 0,
    completed: 0,
    failed: 0,
    totalBytes: 0,
    downloadedBytes: 0,
    totalMB: 0,
    downloadedMB: 0,
    overallProgress: 0,
    averageSpeed: 0,
  };

  let activeDownloads = 0;
  let totalSpeed = 0;

  downloads.forEach((download) => {
    // Count by status
    switch (download.status) {
      case 'downloading':
        stats.downloading++;
        activeDownloads++;
        totalSpeed += download.speedMbps;
        break;
      case 'paused':
        stats.paused++;
        break;
      case 'completed':
        stats.completed++;
        break;
      case 'failed':
        stats.failed++;
        break;
    }

    // Accumulate bytes
    stats.totalBytes += download.totalBytes;
    stats.downloadedBytes += download.downloadedBytes;
  });

  // Calculate MB
  stats.totalMB = parseFloat(formatMB(stats.totalBytes));
  stats.downloadedMB = parseFloat(formatMB(stats.downloadedBytes));

  // Calculate overall progress
  if (stats.totalBytes > 0) {
    stats.overallProgress = (stats.downloadedBytes / stats.totalBytes) * 100;
  }

  // Calculate average speed
  if (activeDownloads > 0) {
    stats.averageSpeed = totalSpeed / activeDownloads;
  }

  return stats;
}

/**
 * MultiDownloadProgress component
 */
export const MultiDownloadProgress: React.FC<MultiDownloadProgressProps> = ({
  downloads,
  onClearCompleted,
}) => {
  const stats = calculateStats(downloads);

  if (downloads.length === 0) {
    return null;
  }

  const hasCompleted = stats.completed > 0;
  const hasActive = stats.downloading > 0 || stats.paused > 0;

  return (
    <div className="multi-download-progress">
      <div className="multi-download-header">
        <h4 className="multi-download-title">Download Summary</h4>
        {hasCompleted && onClearCompleted && (
          <button
            className="clear-completed-btn"
            onClick={onClearCompleted}
            aria-label="Clear completed downloads"
          >
            Clear Completed
          </button>
        )}
      </div>

      {/* Overall Progress Bar */}
      {hasActive && (
        <div className="overall-progress-section">
          <div className="overall-progress-info">
            <span className="overall-progress-label">Overall Progress</span>
            <span className="overall-progress-percentage">
              {stats.overallProgress.toFixed(1)}%
            </span>
          </div>
          <div className="overall-progress-bar-container">
            <div
              className="overall-progress-bar"
              style={{ width: `${stats.overallProgress}%` }}
              role="progressbar"
              aria-valuenow={stats.overallProgress}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
          <div className="overall-progress-details">
            <span className="overall-downloaded">
              {stats.downloadedMB.toFixed(2)} MB
            </span>
            <span className="overall-separator"> / </span>
            <span className="overall-total">
              {stats.totalMB.toFixed(2)} MB
            </span>
            {stats.averageSpeed > 0 && (
              <>
                <span className="overall-separator"> • </span>
                <span className="overall-speed">
                  {stats.averageSpeed.toFixed(2)} MB/s avg
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Status Counts */}
      <div className="download-status-counts">
        {stats.downloading > 0 && (
          <div className="status-count downloading">
            <span className="status-count-icon">⬇</span>
            <span className="status-count-label">Downloading</span>
            <span className="status-count-value">{stats.downloading}</span>
          </div>
        )}

        {stats.paused > 0 && (
          <div className="status-count paused">
            <span className="status-count-icon">⏸</span>
            <span className="status-count-label">Paused</span>
            <span className="status-count-value">{stats.paused}</span>
          </div>
        )}

        {stats.completed > 0 && (
          <div className="status-count completed">
            <span className="status-count-icon">✓</span>
            <span className="status-count-label">Completed</span>
            <span className="status-count-value">{stats.completed}</span>
          </div>
        )}

        {stats.failed > 0 && (
          <div className="status-count failed">
            <span className="status-count-icon">✕</span>
            <span className="status-count-label">Failed</span>
            <span className="status-count-value">{stats.failed}</span>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="download-summary-stats">
        <div className="summary-stat">
          <span className="summary-stat-label">Total Downloads</span>
          <span className="summary-stat-value">{stats.total}</span>
        </div>
        <div className="summary-stat">
          <span className="summary-stat-label">Total Size</span>
          <span className="summary-stat-value">{stats.totalMB.toFixed(2)} MB</span>
        </div>
        <div className="summary-stat">
          <span className="summary-stat-label">Downloaded</span>
          <span className="summary-stat-value">{stats.downloadedMB.toFixed(2)} MB</span>
        </div>
      </div>
    </div>
  );
};

export default MultiDownloadProgress;
