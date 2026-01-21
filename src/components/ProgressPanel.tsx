/**
 * Progress Panel Component
 * Displays progress for all tasks with filtering and sorting
 */

import React, { useState, useEffect } from 'react';
import { ProgressIndicator } from './ProgressIndicator';
import { GenerationTask } from '../services/backendApiService';
import { ProgressUpdate } from '../services/progressTrackingService';

interface ProgressPanelProps {
  tasks: GenerationTask[];
  progressUpdates: Map<string, ProgressUpdate>;
  filterStatus?: 'all' | 'pending' | 'processing' | 'completed' | 'failed';
  showDetails?: boolean;
  compact?: boolean;
  autoStart?: boolean;
  className?: string;
  onTaskComplete?: (taskId: string) => void;
  onTaskError?: (taskId: string, error: string) => void;
}

export const ProgressPanel: React.FC<ProgressPanelProps> = ({
  tasks,
  progressUpdates,
  filterStatus = 'all',
  showDetails = false,
  compact = false,
  autoStart = true,
  className = '',
  onTaskComplete,
  onTaskError,
}) => {
  const [filteredTasks, setFilteredTasks] = useState<GenerationTask[]>([]);
  const [summary, setSummary] = useState({
    processing: 0,
    pending: 0,
    completed: 0,
    failed: 0,
    total: 0,
  });

  useEffect(() => {
    // Filter tasks based on status
    let filtered = tasks;
    if (filterStatus !== 'all') {
      filtered = tasks.filter((task) => task.status === filterStatus);
    }

    // Sort tasks: processing first, then pending, then completed, then failed
    filtered.sort((a, b) => {
      const statusOrder = { processing: 1, pending: 2, completed: 3, failed: 4 };
      return (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0);
    });

    setFilteredTasks(filtered);

    // Calculate summary statistics
    const newSummary = {
      processing: tasks.filter((t) => t.status === 'processing').length,
      pending: tasks.filter((t) => t.status === 'pending').length,
      completed: tasks.filter((t) => t.status === 'completed').length,
      failed: tasks.filter((t) => t.status === 'failed').length,
      total: tasks.length,
    };
    setSummary(newSummary);
  }, [tasks, filterStatus, progressUpdates]);

  const calculateOverallProgress = () => {
    if (summary.total === 0) return 0;

    const completed = summary.completed;
    const processing = summary.processing;

    // Calculate average progress for processing tasks
    let processingProgress = 0;
    if (processing > 0) {
      const processingTaskIds = tasks
        .filter((t) => t.status === 'processing')
        .map((t) => t.taskId);
      const progressValues = processingTaskIds
        .map((id) => progressUpdates.get(id)?.progress || 0)
        .filter((p) => p > 0);

      if (progressValues.length > 0) {
        processingProgress = progressValues.reduce((sum, p) => sum + p, 0) / progressValues.length;
      }
    }

    // Overall progress: completed tasks + average progress of processing tasks
    return Math.round(((completed + processingProgress / 100) / summary.total) * 100);
  };

  if (filteredTasks.length === 0) {
    return (
      <div className={`progress-panel ${className}`}>
        <div className="progress-summary">
          <div className="summary-stats">
            <span className="stat processing">Processing: {summary.processing}</span>
            <span className="stat pending">Pending: {summary.pending}</span>
            <span className="stat completed">Completed: {summary.completed}</span>
            <span className="stat failed">Failed: {summary.failed}</span>
          </div>
          <div className="overall-progress">
            <div className="progress-label">Overall Progress: {calculateOverallProgress()}%</div>
            <div className="progress-bar-container">
              <div className="progress-bar" style={{ width: `${calculateOverallProgress()}%` }}></div>
            </div>
          </div>
        </div>
        <div className="empty-state">No tasks to display</div>
      </div>
    );
  }

  return (
    <div className={`progress-panel ${className}`}>
      <div className="progress-summary">
        <div className="summary-stats">
          <span className="stat processing">Processing: {summary.processing}</span>
          <span className="stat pending">Pending: {summary.pending}</span>
          <span className="stat completed">Completed: {summary.completed}</span>
          <span className="stat failed">Failed: {summary.failed}</span>
        </div>
        <div className="overall-progress">
          <div className="progress-label">Overall Progress: {calculateOverallProgress()}%</div>
          <div className="progress-bar-container">
            <div className="progress-bar" style={{ width: `${calculateOverallProgress()}%` }}></div>
          </div>
        </div>
      </div>

      <div className="task-list">
        {filteredTasks.map((task) => (
          <ProgressIndicator
            key={task.taskId}
            task={task}
            progress={progressUpdates.get(task.taskId)}
            showDetails={showDetails}
            compact={compact}
            className="task-item"
          />
        ))}
      </div>
    </div>
  );
};

// Add CSS styles
const styles = `
.progress-panel {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
  background: white;
}

.progress-summary {
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e2e8f0;
}

.summary-stats {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.stat {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}

.stat.processing {
  background: #ebf8ff;
  color: #3182ce;
}

.stat.pending {
  background: #f7fafc;
  color: #718096;
}

.stat.completed {
  background: #f0fff4;
  color: #38a169;
}

.stat.failed {
  background: #fff5f5;
  color: #e53e3e;
}

.overall-progress {
  margin-top: 12px;
}

.progress-label {
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 4px;
}

.progress-bar-container {
  width: 100%;
  height: 12px;
  background: #e2e8f0;
  border-radius: 6px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: #4299e1;
  border-radius: 6px;
  transition: width 0.3s ease;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.task-item {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px;
}

.empty-state {
  text-align: center;
  padding: 24px;
  color: #718096;
  font-style: italic;
}
`;

// Inject styles
const styleElement = document.createElement('style');
styleElement.textContent = styles;
document.head.appendChild(styleElement);