// AI Performance Service for StoryCore-Engine

export interface JobStatus {
  job_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  message: string;
  started_at: string;
  completed_at?: string;
  result?: Record<string, unknown>;
  error?: string;
}

export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hit_rate: number;
}

export interface QueueStats {
  queued: number;
  processing: number;
  completed: number;
  failed: number;
  workers_active: number;
}

class AIPerformanceService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
  }

  // =============================================================================
  // Job Progress Tracking
  // =============================================================================

  async createJob(message: string = "Starting..."): Promise<{ job_id: string }> {
    const response = await fetch(`${this.baseUrl}/api/ai/performance/jobs/create?message=${encodeURIComponent(message)}`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error('Failed to create job');
    return response.json();
  }

  async getJobStatus(jobId: string): Promise<JobStatus> {
    const response = await fetch(`${this.baseUrl}/api/ai/performance/jobs/${jobId}`);
    if (!response.ok) throw new Error('Failed to get job status');
    return response.json();
  }

  async updateJobProgress(jobId: string, progress: number, message: string): Promise<JobStatus> {
    const response = await fetch(`${this.baseUrl}/api/ai/performance/jobs/${jobId}/progress?progress=${progress}&message=${encodeURIComponent(message)}`, {
      method: 'PUT'
    });
    if (!response.ok) throw new Error('Failed to update job progress');
    return response.json();
  }

  // Polling helper
  async waitForJob(jobId: string, onProgress?: (status: JobStatus) => void): Promise<JobStatus> {
    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          const status = await this.getJobStatus(jobId);
          if (onProgress) onProgress(status);

          if (status.status === 'completed') {
            resolve(status);
          } else if (status.status === 'failed') {
            reject(new Error(status.error || 'Job failed'));
          } else if (status.status === 'cancelled') {
            reject(new Error('Job was cancelled'));
          } else {
            setTimeout(poll, 1000);
          }
        } catch (err) {
          reject(err);
        }
      };
      poll();
    });
  }

  // =============================================================================
  // Cache Management
  // =============================================================================

  async getCacheStats(): Promise<CacheStats> {
    const response = await fetch(`${this.baseUrl}/api/ai/performance/cache/stats`);
    if (!response.ok) throw new Error('Failed to get cache stats');
    return response.json();
  }

  async clearCache(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/ai/performance/cache/clear`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error('Failed to clear cache');
  }

  // =============================================================================
  // Batch Processing
  // =============================================================================

  async submitBatch(items: Record<string, unknown>[], jobType: string, maxWorkers: number = 4): Promise<{ batch_id: string }> {
    const response = await fetch(`${this.baseUrl}/api/ai/performance/batch/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, job_type: jobType, max_workers: maxWorkers })
    });
    if (!response.ok) throw new Error('Failed to submit batch');
    return response.json();
  }

  // =============================================================================
  // Job Queue
  // =============================================================================

  async submitToQueue(jobType: string, params: Record<string, unknown>, priority: number = 0): Promise<{ job_id: string }> {
    const response = await fetch(`${this.baseUrl}/api/ai/performance/queue/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_type: jobType, params, priority })
    });
    if (!response.ok) throw new Error('Failed to submit to queue');
    return response.json();
  }

  async getQueueStats(): Promise<QueueStats> {
    const response = await fetch(`${this.baseUrl}/api/ai/performance/queue/stats`);
    if (!response.ok) throw new Error('Failed to get queue stats');
    return response.json();
  }
}

export const aiPerformanceService = new AIPerformanceService();
