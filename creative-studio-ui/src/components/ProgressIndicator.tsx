/**
 * ProgressIndicator Component
 * 
 * Displays progress for a generation task with status, progress bar, and message.
 */

import React from 'react';
import type { ProgressUpdate } from '@/services/progressTrackingService';
import type { GenerationTask } from '@/types';

export interface ProgressIndicatorProps {
  /**
   * Task to display progress for
   */
  task: GenerationTask;

  /**
   * Progress update data
   */
  progress?: ProgressUpdate;

  /**
   * Show detailed information
   * @default false
   */
  showDetails?: boolean;

  /**
   * Compact mode (smaller display)
   * @default false
   */
  compact?: boolean;

  /**
   * Custom className
   */
  className?: string;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  task,
  progress,
  showDetails = false,
  compact = false,
  className = '',
}) => {
  const getStatusColor = (status: GenerationTask['status']): string => {
    switch (status) {
      case 'pending':
        return 'bg-gray-200 text-gray-700';
      case 'processing':
        return 'bg-blue-100 text-blue-700';
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'failed':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-200 text-gray-700';
    }
  };

  const getStatusIcon = (status: GenerationTask['status']): string => {
    switch (status) {
      case 'pending':
        return '⏳';
      case 'processing':
        return '⚙️';
      case 'completed':
        return '✅';
      case 'failed':
        return '❌';
      default:
        return '❓';
    }
  };

  const progressValue = progress?.progress || 0;
  const statusColor = getStatusColor(task.status);
  const statusIcon = getStatusIcon(task.status);

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="text-lg">{statusIcon}</span>
        <div className="flex-1 min-w-0">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                task.status === 'completed'
                  ? 'bg-green-500'
                  : task.status === 'failed'
                  ? 'bg-red-500'
                  : 'bg-blue-500'
              }`}
              style={{ width: `${progressValue}%` }}
            />
          </div>
        </div>
        <span className="text-sm text-gray-600 whitespace-nowrap">{progressValue}%</span>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{statusIcon}</span>
          <div>
            <h4 className="font-medium text-gray-900">{task.type.toUpperCase()}</h4>
            <p className="text-sm text-gray-500">Task ID: {task.id.slice(0, 8)}</p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColor}`}>
          {task.status}
        </span>
      </div>

      {/* Progress Bar */}
      {task.status === 'processing' && (
        <div className="mb-3">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>{progress?.message || 'Processing...'}</span>
            <span>{progressValue}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-blue-500 h-3 rounded-full transition-all duration-300 relative overflow-hidden"
              style={{ width: `${progressValue}%` }}
            >
              {/* Animated shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
            </div>
          </div>
        </div>
      )}

      {/* Completed Progress */}
      {task.status === 'completed' && (
        <div className="mb-3">
          <div className="flex justify-between text-sm text-green-600 mb-1">
            <span>{progress?.message || 'Completed successfully'}</span>
            <span>100%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div className="bg-green-500 h-3 rounded-full w-full" />
          </div>
        </div>
      )}

      {/* Failed Progress */}
      {task.status === 'failed' && (
        <div className="mb-3">
          <div className="text-sm text-red-600 mb-1">
            {progress?.error || task.error || 'Task failed'}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div className="bg-red-500 h-3 rounded-full" style={{ width: `${progressValue}%` }} />
          </div>
        </div>
      )}

      {/* Details */}
      {showDetails && (
        <div className="mt-3 pt-3 border-t text-sm text-gray-600 space-y-1">
          <div className="flex justify-between">
            <span>Priority:</span>
            <span className="font-medium">{task.priority}</span>
          </div>
          <div className="flex justify-between">
            <span>Created:</span>
            <span className="font-medium">{new Date(task.createdAt).toLocaleTimeString()}</span>
          </div>
          {task.startedAt && (
            <div className="flex justify-between">
              <span>Started:</span>
              <span className="font-medium">{new Date(task.startedAt).toLocaleTimeString()}</span>
            </div>
          )}
          {task.completedAt && (
            <div className="flex justify-between">
              <span>Completed:</span>
              <span className="font-medium">{new Date(task.completedAt).toLocaleTimeString()}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Add shimmer animation to global styles or Tailwind config
// @keyframes shimmer {
//   0% { transform: translateX(-100%); }
//   100% { transform: translateX(100%); }
// }
// .animate-shimmer {
//   animation: shimmer 2s infinite;
// }
