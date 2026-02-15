/**
 * Sequence Service - Frontend API for Sequence Generation
 * Handles communication with StoryCore-Engine backend for sequence generation
 */

import { logger } from '@/utils/logger';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export interface SequenceGenerationRequest {
  project_id: string;
  prompt: string;
  shot_count: number;
  style?: string;
  mood?: string;
  characters?: string[];
  settings?: Record<string, unknown>;
}

export type GenerationStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface GenerationJobResponse {
  job_id: string;
  status: GenerationStatus;
  progress: number;
  current_step?: string;
  estimated_time_remaining?: number;
  result?: SequenceResult;
  error?: string;
}

export interface SequenceResult {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  shots: ShotResult[];
  total_duration: number;
  prompt: string;
  style?: string;
  mood?: string;
  created_at: string;
}

export interface ShotResult {
  id: string;
  order_index: number;
  name: string;
  prompt: string;
  duration_seconds: number;
  shot_type: string;
}

export interface JobListResponse {
  jobs: JobSummary[];
  total: number;
}

export interface JobSummary {
  job_id: string;
  project_id: string;
  status: GenerationStatus;
  progress: number;
  created_at: string;
}

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

export interface SequenceData {
  id: string;
  name: string;
  order: number;
  duration: number;
  shots_count: number;
  resume: string;
  shot_ids: string[];
  created_at?: string;
  updated_at?: string;
}

export class SequenceService {
  private authToken = '';

  setAuthToken(token: string) {
    this.authToken = token;
  }

  private getHeaders(): Record<string, string> {
    return this.authToken ? { 'Authorization': `Bearer ${this.authToken}` } : {};
  }

  private isElectronAvailable(): boolean {
    return !!window.electronAPI?.fs;
  }

  async loadSequences(projectPath: string): Promise<SequenceData[]> {
    if (this.isElectronAvailable()) {
      const electronFs = window.electronAPI!.fs;
      const sequencesDir = `${projectPath}/sequences`;
      try {
        const files = await electronFs.readdir(sequencesDir);
        const sequenceFiles = files.filter((f: string) => f.startsWith('sequence_') && f.endsWith('.json'));
        const sequences = await Promise.all(
          sequenceFiles.map(async (file: string) => {
            const content = await electronFs.readFile(`${sequencesDir}/${file}`);
            const data = JSON.parse(new TextDecoder().decode(content));
            return {
              ...data,
              shot_ids: data.shot_ids || []
            } as SequenceData;
          })
        );
        return sequences.sort((a, b) => (a.order || 0) - (b.order || 0));
      } catch (error) {
        logger.error('[SequenceService] Failed to load sequences via Electron:', error);
        return [];
      }
    } else {
      // Fallback to Web API
      const result = await apiRequest<{ sequences: SequenceData[] }>(`/sequences?project_path=${encodeURIComponent(projectPath)}`, {
        headers: this.getHeaders()
      });
      return result.sequences || [];
    }
  }

  async getSequence(projectPath: string, sequenceId: string): Promise<SequenceData | null> {
    if (this.isElectronAvailable()) {
      const sequences = await this.loadSequences(projectPath);
      return sequences.find(s => s.id === sequenceId) || null;
    } else {
      try {
        return await apiRequest<SequenceData>(`/sequences/${sequenceId}?project_path=${encodeURIComponent(projectPath)}`, {
          headers: this.getHeaders()
        });
      } catch (error) {
        return null;
      }
    }
  }

  async createSequence(projectPath: string, sequence: SequenceData): Promise<SequenceData> {
    if (this.isElectronAvailable()) {
      const electronFs = window.electronAPI!.fs;
      const sequencesDir = `${projectPath}/sequences`;
      const fileName = `sequence_${sequence.id.substring(0, 8)}.json`;
      const data = { ...sequence, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      await electronFs.writeFile(`${sequencesDir}/${fileName}`, JSON.stringify(data, null, 2));
      return data;
    } else {
      return await apiRequest<SequenceData>(`/sequences?project_path=${encodeURIComponent(projectPath)}`, {
        method: 'POST',
        body: JSON.stringify(sequence),
        headers: this.getHeaders()
      });
    }
  }

  async updateSequence(projectPath: string, sequenceId: string, updates: Partial<SequenceData>): Promise<SequenceData> {
    if (this.isElectronAvailable()) {
      const sequence = await this.getSequence(projectPath, sequenceId);
      if (!sequence) throw new Error(`Sequence ${sequenceId} not found`);

      const updated = { ...sequence, ...updates, updated_at: new Date().toISOString() };
      const electronFs = window.electronAPI!.fs;
      const fileName = `sequence_${sequenceId.substring(0, 8)}.json`;
      await electronFs.writeFile(`${projectPath}/sequences/${fileName}`, JSON.stringify(updated, null, 2));
      return updated;
    } else {
      return await apiRequest<SequenceData>(`/sequences/${sequenceId}?project_path=${encodeURIComponent(projectPath)}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
        headers: this.getHeaders()
      });
    }
  }

  async deleteSequence(projectPath: string, sequenceId: string): Promise<void> {
    if (this.isElectronAvailable()) {
      // Ideally we find the specific file
      const electronFs = window.electronAPI!.fs;
      const fileName = `sequence_${sequenceId.substring(0, 8)}.json`;
      // Note: electronAPI.fs might need a delete method if it exists
      if ('removeFile' in electronFs && typeof electronFs.removeFile === 'function') {
        await (electronFs as unknown as { removeFile: (path: string) => Promise<void> }).removeFile(`${projectPath}/sequences/${fileName}`);
      }
    } else {
      await apiRequest(`/sequences/${sequenceId}?project_path=${encodeURIComponent(projectPath)}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });
    }
  }

  async generateSequence(req: SequenceGenerationRequest) {
    return apiRequest<GenerationJobResponse>('/sequences/generate', {
      method: 'POST',
      body: JSON.stringify(req),
      headers: this.getHeaders()
    });
  }

  async getJobStatus(jobId: string) {
    return apiRequest<GenerationJobResponse>(`/sequences/${jobId}/status`, {
      headers: this.getHeaders()
    });
  }

  async getResult(jobId: string) {
    return apiRequest<SequenceResult>(`/sequences/${jobId}/result`, {
      headers: this.getHeaders()
    });
  }

  async cancelJob(jobId: string) {
    return apiRequest<GenerationJobResponse>(`/sequences/${jobId}/cancel`, {
      method: 'POST',
      headers: this.getHeaders()
    });
  }

  async listJobs(projectId?: string) {
    const params = projectId ? `?project_id=${projectId}` : '';
    return apiRequest<JobListResponse>(`/sequences${params}`, {
      headers: this.getHeaders()
    });
  }

  streamProgress(
    jobId: string,
    onProgress: (data: GenerationJobResponse) => void,
    onComplete?: (data: GenerationJobResponse) => void,
    onError?: (error: string) => void
  ) {
    const eventSource = new EventSource(`${API_BASE}/sequences/${jobId}/stream`);

    eventSource.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (['completed', 'failed', 'cancelled'].includes(data.status)) {
          if (onComplete) onComplete(data);
          eventSource.close();
        } else {
          onProgress(data);
        }
      } catch (e) {
        logger.error('[SequenceService] Failed to parse SSE data:', e);
      }
    };

    eventSource.onerror = () => {
      if (onError) onError('Connection failed');
      eventSource.close();
    };

    return () => eventSource.close();
  }

  async waitForCompletion(
    jobId: string,
    onProgress?: (status: GenerationJobResponse) => void,
    maxWaitMs = 300000,
    pollMs = 1000
  ): Promise<SequenceResult> {
    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
      const status = await this.getJobStatus(jobId);
      if (onProgress) onProgress(status);
      if (status.status === 'completed' && status.result) return status.result;
      if (status.status === 'failed') throw new Error(status.error || 'Generation failed');
      if (status.status === 'cancelled') throw new Error('Cancelled');
      await new Promise(r => setTimeout(r, pollMs));
    }
    throw new Error('Timeout waiting for completion');
  }
}

export const sequenceService = new SequenceService();

