/**
 * Task Queue Panel Component
 * 
 * Displays the generation job queue with priority controls.
 * Allows users to reorder jobs, retry failed jobs, and monitor progress.
 */

import { useState, useEffect, useCallback } from 'react';
import type {
  TaskQueueItem,
  TaskQueueResponse,
  PriorityUpdateResponse,
  RetryResponse,
} from '../types';
import {
  getTaskQueue,
  moveJobUp,
  moveJobDown,
  retryJob,
  deleteJob,
  getStatusColor,
  getPriorityColor,
  formatEstimatedTime,
  getStatusIcon,
  getPriorityIcon,
} from '../services/taskQueueService';

interface TaskQueuePanelProps {
  projectId?: string;
  isOpen?: boolean;
  onClose?: () => void;
}

export function TaskQueuePanel({ projectId, isOpen = true, onClose }: TaskQueuePanelProps) {
  const [tasks, setTasks] = useState<TaskQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    try {
      setError(null);
      const response = await getTaskQueue(projectId, filter === 'all' ? undefined : filter);
      setTasks(response.tasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  }, [projectId, filter]);

  // Initial fetch and auto-refresh
  useEffect(() => {
    fetchTasks();

    if (autoRefresh) {
      const interval = setInterval(fetchTasks, 5000);
      return () => clearInterval(interval);
    }
  }, [fetchTasks, autoRefresh]);

  // Handle move job up
  const handleMoveUp = async (jobId: string) => {
    try {
      await moveJobUp(jobId);
      fetchTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move job up');
    }
  };

  // Handle move job down
  const handleMoveDown = async (jobId: string) => {
    try {
      await moveJobDown(jobId);
      fetchTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move job down');
    }
  };

  // Handle retry job
  const handleRetry = async (jobId: string) => {
    try {
      await retryJob(jobId);
      fetchTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retry job');
    }
  };

  // Handle delete job
  const handleDelete = async (jobId: string) => {
    try {
      await deleteJob(jobId);
      fetchTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete job');
    }
  };

  // Stats calculation
  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    processing: tasks.filter(t => t.status === 'processing').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    failed: tasks.filter(t => t.status === 'failed').length,
    cancelled: tasks.filter(t => t.status === 'cancelled').length,
  };

  if (!isOpen) return null;

  return (
    <div className="task-queue-panel bg-gray-900 border-l border-gray-700 w-96 flex flex-col h-full">
      {/* Header */}
      <div className="panel-header p-4 border-b border-gray-700 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">File d'attente</h2>
          <p className="text-xs text-gray-400 mt-1">
            {stats.total} tâche(s) • {stats.processing} en cours
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Filters and controls */}
      <div className="p-4 border-b border-gray-700 space-y-3">
        <div className="flex gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="flex-1 bg-gray-800 text-white text-sm rounded px-3 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
            title="Filtrer les tâches par statut"
          >
            <option value="all">Toutes les tâches</option>
            <option value="pending">En attente</option>
            <option value="processing">En cours</option>
            <option value="completed">Terminées</option>
            <option value="failed">Échouées</option>
            <option value="cancelled">Annulées</option>
          </select>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-2 rounded text-sm border transition-colors ${
              autoRefresh
                ? 'bg-green-500/20 border-green-500/50 text-green-400'
                : 'bg-gray-800 border-gray-600 text-gray-400'
            }`}
            title={autoRefresh ? 'Auto-refresh activé' : 'Auto-refresh désactivé'}
          >
            {autoRefresh ? '🔄' : '⏸️'}
          </button>
        </div>
        
        {/* Stats */}
        <div className="flex gap-2 text-xs">
          <span className="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded">
            ⏳ {stats.pending}
          </span>
          <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
            ⚙️ {stats.processing}
          </span>
          <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded">
            ✅ {stats.completed}
          </span>
          <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded">
            ❌ {stats.failed}
          </span>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Task list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading && tasks.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <p>Aucune tâche dans la file</p>
            <p className="text-xs mt-2">Les tâches de génération apparaîtront ici</p>
          </div>
        ) : (
          tasks.map((task, index) => (
            <TaskCard
              key={task.job_id}
              task={task}
              index={index}
              isFirst={index === 0}
              isLast={index === tasks.length - 1}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
              onRetry={handleRetry}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-700">
        <button
          onClick={fetchTasks}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded transition-colors"
        >
          Rafraîchir
        </button>
      </div>
    </div>
  );
}

/**
 * Task card component
 */
interface TaskCardProps {
  task: TaskQueueItem;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: (jobId: string) => void;
  onMoveDown: (jobId: string) => void;
  onRetry: (jobId: string) => void;
  onDelete: (jobId: string) => void;
}

function TaskCard({
  task,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onRetry,
  onDelete,
}: TaskCardProps) {
  const [expanded, setExpanded] = useState(false);

  const isPendingOrProcessing = task.status === 'pending' || task.status === 'processing';

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
      {/* Task header */}
      <div className="p-3">
        <div className="flex items-start gap-3">
          {/* Priority indicator */}
          <div className={`w-8 h-8 rounded flex items-center justify-center text-sm font-bold ${getPriorityColor(task.priority)}`}>
            {getPriorityIcon(task.priority)}
          </div>

          {/* Task info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getStatusColor(task.status)}`}>
                {getStatusIcon(task.status)} {task.status}
              </span>
              <span className="text-xs text-gray-400">
                #{task.shot_count} shots
              </span>
            </div>
            
            <p className="text-white text-sm mt-1 truncate">
              {task.prompt}
            </p>

            {/* Progress bar for processing tasks */}
            {task.status === 'processing' && (
              <div className="mt-2">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>{task.current_step || 'Traitement...'}</span>
                  <span>{task.progress}%</span>
                </div>
                <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 animate-pulse"
                    style={{ width: `${task.progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Error message for failed tasks */}
            {task.status === 'failed' && task.error && (
              <p className="text-red-400 text-xs mt-1">
                Erreur: {task.error}
              </p>
            )}
          </div>

          {/* Expand button */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            {expanded ? '▼' : '▶'}
          </button>
        </div>

        {/* Expandable details */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-gray-700 space-y-2">
            {/* Details row */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-400">Créé:</span>
                <span className="text-gray-300 ml-2">
                  {new Date(task.created_at).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Estimé:</span>
                <span className="text-gray-300 ml-2">
                  {formatEstimatedTime(task.estimated_time)}
                </span>
              </div>
              {task.started_at && (
                <div>
                  <span className="text-gray-400">Début:</span>
                  <span className="text-gray-300 ml-2">
                    {new Date(task.started_at).toLocaleString()}
                  </span>
                </div>
              )}
              {task.completed_at && (
                <div>
                  <span className="text-gray-400">Fin:</span>
                  <span className="text-gray-300 ml-2">
                    {new Date(task.completed_at).toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            {/* Priority info */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-400">Priorité:</span>
              <span className={`px-2 py-0.5 rounded ${getPriorityColor(task.priority)}`}>
                {task.priority}/10
              </span>
              {isPendingOrProcessing && (
                <span className="text-gray-400">
                  (1 = plus prioritaire)
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              {/* Move up/down buttons (only for pending jobs) */}
              {isPendingOrProcessing && (
                <>
                  <button
                    onClick={() => onMoveUp(task.job_id)}
                    disabled={isFirst}
                    className={`px-2 py-1 text-xs rounded border transition-colors ${
                      isFirst
                        ? 'bg-gray-700/50 border-gray-600/50 text-gray-500 cursor-not-allowed'
                        : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                    }`}
                    title="Monter dans la file"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => onMoveDown(task.job_id)}
                    disabled={isLast}
                    className={`px-2 py-1 text-xs rounded border transition-colors ${
                      isLast
                        ? 'bg-gray-700/50 border-gray-600/50 text-gray-500 cursor-not-allowed'
                        : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                    }`}
                    title="Descendre dans la file"
                  >
                    ↓
                  </button>
                </>
              )}

              {/* Retry button (for failed/cancelled jobs) */}
              {(task.status === 'failed' || task.status === 'cancelled') && (
                <button
                  onClick={() => onRetry(task.job_id)}
                  className="px-2 py-1 text-xs rounded border bg-yellow-500/20 border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/30 transition-colors"
                >
                  🔄 Réessayer
                </button>
              )}

              {/* Delete button (for completed/failed/cancelled jobs) */}
              {(task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled') && (
                <button
                  onClick={() => onDelete(task.job_id)}
                  className="px-2 py-1 text-xs rounded border bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30 transition-colors"
                >
                  🗑️ Supprimer
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TaskQueuePanel;

