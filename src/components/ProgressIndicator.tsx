/**
 * Progress Indicator Component
 * Displays the progress of a single task
 */

import React from 'react';
import { ProgressUpdate } from '../services/progressTrackingService';
import { GenerationTask } from '../services/backendApiService';

interface ProgressIndicatorProps {
  task: GenerationTask;
  progress?: ProgressUpdate;
  showDetails?: boolean;
  compact?: boolean;
  className?: string;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ task, progress, showDetails = false, compact = false, className = '' }) => {
  const getStatusIcon = () => {
    switch (progress?.status || task.status) {
      case 'pending':
        return '⏳';
      case 'processing':
        return '⚙️';
      case 'completed':
        return '✅';
      case 'failed':
        return '❌';
      default:
        return '⏳';
    }
  };

  const getStatusColor = () => {
    switch (progress?.status || task.status) {
      case 'pending':
        return 'bg-gray-100 text-gray-700';
      case 'processing':
        return 'bg-blue-100 text-blue-700';
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'failed':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusText = () => {
    return progress?.status || task.status;
  };

  const getProgressMessage = () => {
    if (progress) {
      return progress.message || `${Math.round(progress.progress)}% complete`;
    }
    return task.message || 'Task in progress';
  };

  if (compact) {
    return (
      <div className={`progress-indicator-compact ${className}`}>
        <span className={`status-icon ${getStatusColor()}`}>{getStatusIcon()}</span>
        <span className="progress-text">{getProgressMessage()}</span>
      </div>
    );
  }

  return (
    <div className={`progress-indicator ${className}`}>
      <div className="progress-header">
        <span className={`status-badge ${getStatusColor()}`}>
          {getStatusIcon()} {getStatusText()}
        </span>
        <span className="task-type">{task.type}</span>
      </div>

      {progress && progress.progress !== undefined && (
        <div className="progress-bar-container">
          <div className="progress-bar" style={{ width: `${progress.progress}%` }}></div>
          <span className="progress-percentage">{Math.round(progress.progress)}%</span>
        </div>
      )}

      <div className="progress-message">{getProgressMessage()}</div>

      {showDetails && (
        <div className="progress-details">
          <div>Task ID: {task.taskId}</div>
          <div>Created: {task.createdAt.toLocaleString()}</div>
          {progress?.startedAt && <div>Started: {progress.startedAt.toLocaleString()}</div>}
          {progress?.completedAt && <div>Completed: {progress.completedAt.toLocaleString()}</div>}
        </div>
      )}

      {progress?.error && (
        <div className="progress-error">Error: {progress.error}</div>
      )}
    </div>
  );
};

// Add CSS styles
const styles = `
.progress-indicator {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  background: white;
}

.progress-indicator-compact {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 4px;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
  margin-right: 8px;
}

.progress-bar-container {
  width: 100%;
  height: 20px;
  background: #e2e8f0;
  border-radius: 10px;
  margin: 8px 0;
  position: relative;
}

.progress-bar {
  height: 100%;
  background: #4299e1;
  border-radius: 10px;
  transition: width 0.3s ease;
}

.progress-percentage {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  color: white;
  font-size: 12px;
  font-weight: bold;
}

.progress-message {
  margin-top: 8px;
  color: #4a5568;
}

.progress-details {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e2e8f0;
  font-size: 12px;
  color: #718096;
}

.progress-error {
  margin-top: 8px;
  color: #e53e3e;
  font-size: 12px;
}
`;

// Inject styles
const styleElement = document.createElement('style');
styleElement.textContent = styles;
document.head.appendChild(styleElement);