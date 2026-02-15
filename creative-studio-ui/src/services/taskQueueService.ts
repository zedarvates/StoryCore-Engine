/**
 * Task Queue Service
 * 
 * Service for managing generation job queue operations.
 * Provides methods for listing jobs, updating priorities, and retrying failed jobs.
 */

import type {
  TaskQueueItem,
  TaskQueueResponse,
  PriorityUpdateResponse,
  RetryResponse,
  QueueStatsResponse,
} from '../types';
import { API_BASE_URL } from '../config/apiConfig';

/**
 * Fetch with authentication header
 */
async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('auth_token');
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  
  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers,
  });
  
  return response;
}

/**
 * Get all tasks in the queue
 */
export async function getTaskQueue(
  projectId?: string,
  statusFilter?: string
): Promise<TaskQueueResponse> {
  const params = new URLSearchParams();
  if (projectId) params.append('project_id', projectId);
  if (statusFilter) params.append('status_filter', statusFilter);
  
  const response = await fetchWithAuth(`/api/tasks/queue?${params.toString()}`);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to fetch task queue' }));
    throw new Error(error.detail || 'Failed to fetch task queue');
  }
  
  return response.json();
}

/**
 * Update job priority
 */
export async function updateJobPriority(
  jobId: string,
  priority: number
): Promise<PriorityUpdateResponse> {
  const response = await fetchWithAuth(`/api/tasks/${jobId}/priority`, {
    method: 'PUT',
    body: JSON.stringify({ priority: Math.max(1, Math.min(10, priority)) }),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to update priority' }));
    throw new Error(error.detail || 'Failed to update job priority');
  }
  
  return response.json();
}

/**
 * Move job up in queue (higher priority)
 */
export async function moveJobUp(jobId: string): Promise<PriorityUpdateResponse> {
  const response = await fetchWithAuth(`/api/tasks/${jobId}/move-up`, {
    method: 'POST',
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to move job up' }));
    throw new Error(error.detail || 'Failed to move job up in queue');
  }
  
  return response.json();
}

/**
 * Move job down in queue (lower priority)
 */
export async function moveJobDown(jobId: string): Promise<PriorityUpdateResponse> {
  const response = await fetchWithAuth(`/api/tasks/${jobId}/move-down`, {
    method: 'POST',
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to move job down' }));
    throw new Error(error.detail || 'Failed to move job down in queue');
  }
  
  return response.json();
}

/**
 * Retry a failed or cancelled job
 */
export async function retryJob(jobId: string): Promise<RetryResponse> {
  const response = await fetchWithAuth(`/api/tasks/${jobId}/retry`, {
    method: 'POST',
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to retry job' }));
    throw new Error(error.detail || 'Failed to retry job');
  }
  
  return response.json();
}

/**
 * Get queue statistics
 */
export async function getQueueStats(projectId?: string): Promise<QueueStatsResponse> {
  const params = projectId ? `?project_id=${projectId}` : '';
  const response = await fetchWithAuth(`/api/tasks/stats${params}`);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to fetch stats' }));
    throw new Error(error.detail || 'Failed to fetch queue statistics');
  }
  
  return response.json();
}

/**
 * Delete a completed, failed, or cancelled job
 */
export async function deleteJob(jobId: string): Promise<{ message: string; job_id: string }> {
  const response = await fetchWithAuth(`/api/tasks/${jobId}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to delete job' }));
    throw new Error(error.detail || 'Failed to delete job');
  }
  
  return response.json();
}

/**
 * Get status badge color based on status
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case 'pending':
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
    case 'processing':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/50 animate-pulse';
    case 'completed':
      return 'bg-green-500/20 text-green-400 border-green-500/50';
    case 'failed':
      return 'bg-red-500/20 text-red-400 border-red-500/50';
    case 'cancelled':
      return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    default:
      return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
  }
}

/**
 * Get priority badge color
 */
export function getPriorityColor(priority: number): string {
  if (priority <= 2) {
    return 'bg-red-500/20 text-red-400 border-red-500/50'; // High priority
  } else if (priority <= 4) {
    return 'bg-orange-500/20 text-orange-400 border-orange-500/50'; // Medium-high
  } else if (priority <= 6) {
    return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'; // Medium
  } else if (priority <= 8) {
    return 'bg-blue-500/20 text-blue-400 border-blue-500/50'; // Medium-low
  } else {
    return 'bg-gray-500/20 text-gray-400 border-gray-500/50'; // Low priority
  }
}

/**
 * Format estimated time
 */
export function formatEstimatedTime(seconds?: number | null): string {
  if (!seconds) return '-';
  
  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
}

/**
 * Get status icon
 */
export function getStatusIcon(status: string): string {
  switch (status) {
    case 'pending':
      return '⏳';
    case 'processing':
      return '⚙️';
    case 'completed':
      return '✅';
    case 'failed':
      return '❌';
    case 'cancelled':
      return '🚫';
    default:
      return '📋';
  }
}

/**
 * Get priority icon
 */
export function getPriorityIcon(priority: number): string {
  if (priority <= 2) return '🔴';
  if (priority <= 4) return '🟠';
  if (priority <= 6) return '🟡';
  if (priority <= 8) return '🔵';
  return '⚪';
}

export default {
  getTaskQueue,
  updateJobPriority,
  moveJobUp,
  moveJobDown,
  retryJob,
  getQueueStats,
  deleteJob,
  getStatusColor,
  getPriorityColor,
  formatEstimatedTime,
  getStatusIcon,
  getPriorityIcon,
};

