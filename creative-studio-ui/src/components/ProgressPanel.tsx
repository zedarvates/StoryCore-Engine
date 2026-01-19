/**
 * ProgressPanel Component
 * 
 * Displays progress for all generation tasks with real-time updates.
 * Can be used as a standalone panel or integrated into the task queue modal.
 */

import React, { useEffect } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { useProgressTracking } from '@/hooks/useProgressTracking';
import { ProgressIndicator } from './ProgressIndicator';
import type { GenerationTask } from '@/types';

export interface ProgressPanelProps {
  /**
   * Filter tasks by status
   */
  filterStatus?: GenerationTask['status'] | 'all';

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
   * Auto-start tracking
   * @default true
   */
  autoStart?: boolean;

  /**
   * Custom className
   */
  className?: string;

  /**
   * Callback when task completes
   */
  onTaskComplete?: (taskId: string) => void;

  /**
   * Callback when task fails
   */
  onTaskError?: (taskId: string, error: string) => void;
}

export const ProgressPanel: React.FC<ProgressPanelProps> = ({
  filterStatus = 'all',
  showDetails = false,
  compact = false,
  autoStart = true,
  className = '',
  onTaskComplete,
  onTaskError,
}) => {
  const taskQueue = useAppStore((state) => state.taskQueue);

  const {
    progressUpdates,
    getProgress,
    startTrackingAll,
    stopTrackingAll,
  } = useProgressTracking({
    autoStart,
    onComplete: onTaskComplete,
    onError: onTaskError,
  });

  // Filter tasks
  const filteredTasks = taskQueue.filter((task) => {
    if (filterStatus === 'all') return true;
    return task.status === filterStatus;
  });

  // Sort tasks: processing first, then pending, then completed/failed
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const statusOrder = { processing: 0, pending: 1, completed: 2, failed: 3 };
    const aOrder = statusOrder[a.status];
    const bOrder = statusOrder[b.status];
    
    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }
    
    return a.priority - b.priority;
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTrackingAll();
    };
  }, [stopTrackingAll]);

  if (sortedTasks.length === 0) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`}>
        <p className="text-lg mb-2">No tasks to display</p>
        <p className="text-sm">
          {filterStatus === 'all'
            ? 'Add tasks to the queue to see progress here'
            : `No ${filterStatus} tasks found`}
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Task Progress
          <span className="ml-2 text-sm font-normal text-gray-500">
            ({sortedTasks.length} {sortedTasks.length === 1 ? 'task' : 'tasks'})
          </span>
        </h3>
        
        {/* Summary Stats */}
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-gray-600">
              {taskQueue.filter((t) => t.status === 'processing').length} processing
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-gray-400" />
            <span className="text-gray-600">
              {taskQueue.filter((t) => t.status === 'pending').length} pending
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-gray-600">
              {taskQueue.filter((t) => t.status === 'completed').length} completed
            </span>
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {sortedTasks.map((task) => (
          <ProgressIndicator
            key={task.id}
            task={task}
            progress={getProgress(task.id)}
            showDetails={showDetails}
            compact={compact}
          />
        ))}
      </div>

      {/* Overall Progress */}
      {!compact && taskQueue.length > 0 && (
        <div className="mt-6 pt-4 border-t">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span className="font-medium">Overall Progress</span>
            <span>
              {taskQueue.filter((t) => t.status === 'completed').length} / {taskQueue.length} completed
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-300"
              style={{
                width: `${(taskQueue.filter((t) => t.status === 'completed').length / taskQueue.length) * 100}%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
