import { BACKEND_URL } from '../config/apiConfig';
import { getComfyUIServersService } from './comfyuiServersService';
import {
  LipSyncRequest,
  LipSyncResponse,
  LipSyncStatusResponse
} from '../types/lipSync';

/**
 * Lip Sync Service
 * 
 * Handles interaction with the Lip Sync backend API.
 * Provides methods for starting jobs, checking status, and monitoring progress.
 */
class LipSyncService {
  private baseUrl: string;

  constructor() {
    // Typically runs on 8001 based on lip_sync_api.py main()
    // For now, assume it's exposed through the main API at /api/lip-sync
    this.baseUrl = (import.meta.env.VITE_BACKEND_URL || BACKEND_URL) + '/api/lip-sync';
  }

  /**
   * Upload an asset (image or audio) to the backend
   */
  async uploadAsset(file: File): Promise<{ filename: string; url: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.baseUrl}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload asset');
    }

    return response.json();
  }

  /**
   * Start a new lip sync generation job
   */
  async generateLipSync(request: LipSyncRequest): Promise<LipSyncResponse> {
    // Automatically inject active ComfyUI server URL if not provided
    if (!request.comfyuiUrl) {
      try {
        const activeUrl = getComfyUIServersService().getActiveServerUrl();
        if (activeUrl) {
          request.comfyuiUrl = activeUrl;
        }
      } catch (error) {
        console.warn('[LipSyncService] Failed to get active ComfyUI server:', error);
      }
    }

    const response = await fetch(`${this.baseUrl}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        character_image: request.characterFaceImage,
        dialogue_audio: request.audioFile,
        model: request.model,
        enhancer: request.enhancer,
        pads: request.pads,
        nosmooth: request.nosmooth,
        style: request.style,
        project_id: request.projectId,
        comfyui_url: request.comfyuiUrl
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to start lip sync job');
    }

    return response.json();
  }

  /**
   * Check the status of a specific job
   */
  async checkStatus(jobId: string): Promise<LipSyncStatusResponse> {
    const response = await fetch(`${this.baseUrl}/status/${jobId}`);
    if (!response.ok) throw new Error('Failed to get lip sync status');
    return response.json();
  }

  /**
   * List all jobs for a project
   */
  async listJobs(projectId?: string): Promise<LipSyncStatusResponse[]> {
    const url = projectId ? `${this.baseUrl}/jobs?projectId=${projectId}` : `${this.baseUrl}/jobs`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to list lip sync jobs');
    return response.json();
  }

  /**
   * Wait for a job to complete, with optional progress callback
   */
  async waitForCompletion(
    jobId: string,
    onStatusUpdate?: (status: LipSyncStatusResponse) => void,
    maxAttempts: number = 180, // 6 minutes at 2s poll
    interval: number = 2000
  ): Promise<LipSyncStatusResponse> {
    let attempts = 0;

    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          const status = await this.checkStatus(jobId);
          if (onStatusUpdate) onStatusUpdate(status);

          if (status.status === 'completed') {
            resolve(status);
          } else if (status.status === 'failed') {
            reject(new Error(status.error || 'Lip sync job failed'));
          } else {
            attempts++;
            if (attempts >= maxAttempts) {
              reject(new Error('Lip sync job timed out'));
            } else {
              setTimeout(poll, interval);
            }
          }
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
