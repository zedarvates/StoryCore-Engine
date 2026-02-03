/**
 * Batch Progress Display Component
 * 
 * Displays progress for batch generation tasks:
 * - Individual task progress
 * - Overall batch progress
 * - Task status indicators
 * 
 * Requirements: 11.3
 */

import React from 'react';
import type { BatchGenerationState, BatchGenerationTask } from '../../types/generation';

interface BatchProgressDisplayProps {
  batch: BatchGenerationState;
  onCancel?: () => void;
}

export const BatchProgressDisplay: React.FC<BatchProgressDisplayProps> = ({ batch, onCancel }) => {
  const overallProgress = batch.tasks.length > 0
    ? (batch.completedCount / batch.tasks.length) * 100
    : 0;

  const getStatusColor = (status: BatchGenerationTask['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'running':
        return 'bg-blue-500';
      case 'failed':
        return 'bg-red-500';
      case 'cancelled':
        return 'bg-gray-500';
      default:
        return 'bg-gray-600';
    }
  };

  const getStatusIcon = (status: BatchGenerationTask['status']) => {
    switch (status) {
      case 'completed':
        return '✓';
      case 'running':
        return '⟳';
      case 'failed':
        return '✗';
      case 'cancelled':
        return '⊘';
      default:
        return '○';
    }
  };

  return (
    <div className="batch-progress-display bg-gray-800 rounded-lg p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Batch Generation Progress</h3>
          <p className="text-sm text-gray-400">
            {batch.completedCount} of {batch.tasks.length} completed
            {batch.failedCount > 0 && ` • ${batch.failedCount} failed`}
          </p>
        </div>
        {onCancel && batch.status === 'running' && (
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
          >
            Cancel Batch
          </button>
        )}
      </div>

      {/* Overall Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-300">Overall Progress</span>
          <span className="text-gray-400">{Math.round(overallProgress)}%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${overallProgress}%` }}
            role="progressbar"
            aria-valuenow={overallProgress}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        <h4 className="text-sm font-medium text-gray-300 sticky top-0 bg-gray-800 py-2">
          Individual Tasks
        </h4>
        {batch.tasks.map((task, index) => (
          <div
            key={task.id}
            className="flex items-center gap-3 p-3 bg-gray-700/50 rounded hover:bg-gray-700 transition-colors"
          >
            {/* Status Icon */}
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full ${getStatusColor(
                task.status
              )} text-white font-bold`}
              aria-label={`Task ${index + 1} status: ${task.status}`}
            >
              {getStatusIcon(task.status)}
            </div>

            {/* Task Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white">
                  Task {index + 1}
                </span>
                <span className="text-xs text-gray-400 capitalize">{task.status}</span>
              </div>

              {/* Progress Bar for Running Tasks */}
              {task.status === 'running' && (
                <div className="mt-2">
                  <div className="w-full bg-gray-600 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${task.progress.overallProgress}%` }}
                      role="progressbar"
                      aria-valuenow={task.progress.overallProgress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{task.progress.message}</p>
                </div>
              )}

              {/* Error Message for Failed Tasks */}
              {task.status === 'failed' && task.error && (
                <p className="text-xs text-red-400 mt-1">{task.error}</p>
              )}
            </div>

            {/* Completion Time */}
            {task.completedAt && (
              <span className="text-xs text-gray-500">
                {new Date(task.completedAt).toLocaleTimeString()}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Status Summary */}
      <div className="flex items-center gap-4 pt-4 border-t border-gray-700 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-gray-400">Completed: {batch.completedCount}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-gray-400">
            Running: {batch.tasks.filter(t => t.status === 'running').length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gray-600" />
          <span className="text-gray-400">
            Queued: {batch.tasks.filter(t => t.status === 'queued').length}
          </span>
        </div>
        {batch.failedCount > 0 && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-gray-400">Failed: {batch.failedCount}</span>
          </div>
        )}
      </div>
    </div>
  );
};
