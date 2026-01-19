import React, { useState } from 'react';
import {
  X,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Trash2,
} from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import type { GenerationTask } from '@/types';

interface TaskQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TaskQueueModal: React.FC<TaskQueueModalProps> = ({ isOpen, onClose }) => {
  const { taskQueue, reorderTasks, removeTask } = useAppStore();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleRemoveTask = (taskId: string) => {
    if (confirm('Are you sure you want to remove this task from the queue?')) {
      removeTask(taskId);
    }
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;

    const newQueue = [...taskQueue];
    [newQueue[index - 1], newQueue[index]] = [newQueue[index], newQueue[index - 1]];

    // Update priorities
    newQueue.forEach((task, i) => {
      task.priority = i + 1;
    });

    reorderTasks(newQueue);
  };

  const handleMoveDown = (index: number) => {
    if (index === taskQueue.length - 1) return;

    const newQueue = [...taskQueue];
    [newQueue[index], newQueue[index + 1]] = [newQueue[index + 1], newQueue[index]];

    // Update priorities
    newQueue.forEach((task, i) => {
      task.priority = i + 1;
    });

    reorderTasks(newQueue);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newQueue = [...taskQueue];
    const [draggedTask] = newQueue.splice(draggedIndex, 1);
    newQueue.splice(dropIndex, 0, draggedTask);

    // Update priorities
    newQueue.forEach((task, i) => {
      task.priority = i + 1;
    });

    reorderTasks(newQueue);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Task Queue</h2>
              <p className="text-sm text-gray-500 mt-1">
                {taskQueue.length} {taskQueue.length === 1 ? 'task' : 'tasks'} in queue
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Close"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Task List */}
          <div className="flex-1 overflow-y-auto p-6">
            {taskQueue.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 text-lg">No tasks in queue</p>
                <p className="text-gray-400 text-sm mt-2">
                  Tasks will appear here when you trigger generation
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {taskQueue.map((task, index) => (
                  <TaskQueueItem
                    key={task.id}
                    task={task}
                    position={index + 1}
                    index={index}
                    totalTasks={taskQueue.length}
                    onMoveUp={() => handleMoveUp(index)}
                    onMoveDown={() => handleMoveDown(index)}
                    onRemove={() => handleRemoveTask(task.id)}
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    isDragging={draggedIndex === index}
                    isDragOver={dragOverIndex === index}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {taskQueue.filter((t) => t.status === 'pending').length} pending •{' '}
                {taskQueue.filter((t) => t.status === 'processing').length} processing •{' '}
                {taskQueue.filter((t) => t.status === 'completed').length} completed •{' '}
                {taskQueue.filter((t) => t.status === 'failed').length} failed
              </div>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

interface TaskQueueItemProps {
  task: GenerationTask;
  position: number;
  index: number;
  totalTasks: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  isDragging: boolean;
  isDragOver: boolean;
}

const TaskQueueItem: React.FC<TaskQueueItemProps> = ({
  task,
  position,
  index,
  totalTasks,
  onMoveUp,
  onMoveDown,
  onRemove,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  isDragging,
  isDragOver,
}) => {
  const getStatusIcon = () => {
    switch (task.status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-gray-400" />;
      case 'processing':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (task.status) {
      case 'pending':
        return 'bg-gray-50 border-gray-200';
      case 'processing':
        return 'bg-blue-50 border-blue-200';
      case 'completed':
        return 'bg-green-50 border-green-200';
      case 'failed':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getStatusText = () => {
    switch (task.status) {
      case 'pending':
        return 'Pending';
      case 'processing':
        return 'Processing...';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      default:
        return 'Unknown';
    }
  };

  const getTypeLabel = () => {
    switch (task.type) {
      case 'grid':
        return 'Grid Generation';
      case 'promotion':
        return 'Promotion';
      case 'refine':
        return 'Refinement';
      case 'qa':
        return 'Quality Assurance';
      default:
        return task.type;
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div
      draggable={task.status === 'pending'}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`border rounded-lg p-4 ${getStatusColor()} transition-all ${
        isDragging ? 'opacity-50 scale-95' : ''
      } ${isDragOver ? 'ring-2 ring-purple-500' : ''} ${
        task.status === 'pending' ? 'cursor-move' : ''
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Drag Handle */}
        {task.status === 'pending' && (
          <div className="flex-shrink-0 text-gray-400 hover:text-gray-600 cursor-move">
            <GripVertical className="w-5 h-5" />
          </div>
        )}

        {/* Position Badge */}
        <div className="flex-shrink-0 w-8 h-8 bg-white rounded-full flex items-center justify-center text-sm font-semibold text-gray-700 border border-gray-300">
          {position}
        </div>

        {/* Task Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {getStatusIcon()}
            <span className="font-medium text-gray-900">{getTypeLabel()}</span>
            <span className="text-xs px-2 py-0.5 bg-white rounded-full text-gray-600 border border-gray-300">
              Priority: {task.priority}
            </span>
          </div>

          <p className="text-sm text-gray-600 mb-2">Shot ID: {task.shotId}</p>

          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>Created: {formatDate(task.createdAt)}</span>
            {task.startedAt && <span>Started: {formatDate(task.startedAt)}</span>}
            {task.completedAt && <span>Completed: {formatDate(task.completedAt)}</span>}
          </div>

          {task.error && (
            <div className="mt-2 p-2 bg-red-100 border border-red-200 rounded text-xs text-red-700">
              <strong>Error:</strong> {task.error}
            </div>
          )}
        </div>

        {/* Status Badge */}
        <div className="flex-shrink-0">
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
              task.status === 'pending'
                ? 'bg-gray-200 text-gray-700'
                : task.status === 'processing'
                  ? 'bg-blue-200 text-blue-700'
                  : task.status === 'completed'
                    ? 'bg-green-200 text-green-700'
                    : 'bg-red-200 text-red-700'
            }`}
          >
            {getStatusText()}
          </span>
        </div>

        {/* Reorder Buttons */}
        {task.status === 'pending' && (
          <div className="flex-shrink-0 flex flex-col gap-1">
            <button
              onClick={onMoveUp}
              disabled={index === 0}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Move up"
              title="Move up"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              onClick={onMoveDown}
              disabled={index === totalTasks - 1}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Move down"
              title="Move down"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Remove Button */}
        {(task.status === 'pending' || task.status === 'failed') && (
          <div className="flex-shrink-0">
            <button
              onClick={onRemove}
              className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              aria-label="Remove task"
              title="Remove task"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
