import { BACKEND_URL } from '../config/apiConfig';

export interface LipSyncRequest {
  character_image: string; // Base64 or path
  dialogue_audio: string;  // Base64 or path
  preset?: string;
  enhancer?: boolean;
}

export interface LipSyncJob {
  job_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  output_path?: string;
  error?: string;
}

class LipSyncService {
  private baseUrl: string;

  constructor() {
    // Typically runs on 8001 based on lip_sync_api.py main()
    // But we should use the centralized backend and proxy if possible
    // For now, assume it's exposed through the main API at /api/lip-sync
    this.baseUrl = (import.meta.env.VITE_BACKEND_URL || BACKEND_URL) + '/api';
  }

  async startLipSync(request: LipSyncRequest): Promise<{ job_id: string }> {
    const response = await fetch(`${this.baseUrl}/lip-sync/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) throw new Error('Failed to start lip sync job');
    return response.json();
  }

  async getStatus(jobId: string): Promise<LipSyncJob> {
    const response = await fetch(`${this.baseUrl}/lip-sync/status/${jobId}`);
    if (!response.ok) throw new Error('Failed to get lip sync status');
    return response.json();
  }

  async monitorJob(
    jobId: string,
    onProgress?: (progress: number) => void
  ): Promise<LipSyncJob> {
    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          const job = await this.getStatus(jobId);
          if (onProgress) onProgress(job.progress);

          if (job.status === 'completed') resolve(job);
          else if (job.status === 'failed') reject(new Error(job.error || 'Job failed'));
          else setTimeout(poll, 2000);
        } catch (error) {
          reject(error);
        }
      };
      poll();
    });
  }
}

export const lipSyncService = new LipSyncService();
export default lipSyncService;
