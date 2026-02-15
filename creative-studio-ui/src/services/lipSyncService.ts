
/**
 * Lip Sync Service
 * 
 * Service for lip synchronization API calls.
 * Handles communication with backend for lip sync generation.
 */

import {
  LipSyncRequest,
  LipSyncResponse,
  LipSyncStatusResponse,
  LipSyncModelInfo,
  LipSyncConnectionTest,
  LipSyncModel,
  LipSyncStatus,
  DEFAULT_LIP_SYNC_OPTIONS
} from '../types/lipSync';

// Use actual string values for comparison
const LIP_SYNC_STATUS_COMPLETED = 'completed';
const LIP_SYNC_STATUS_FAILED = 'failed';

const API_BASE_URL = '/api';

async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('auth_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  
  const response = await fetch(url, {
    ...options,
    headers,
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  
  return response;
}

export class LipSyncService {
  /**
   * Generate lip-synced video
   */
  async generateLipSync(request: LipSyncRequest): Promise<LipSyncResponse> {
    const response = await fetchWithAuth(`${API_BASE_URL}/lipsync/generate`, {
      method: 'POST',
      body: JSON.stringify({
        project_id: request.projectId,
        character_face_image: request.characterFaceImage,
        audio_file: request.audioFile,
        model: request.model,
        enhancer: request.enhancer ?? true,
        pads: request.pads ?? '0 0 0 0',
        nosmooth: request.nosmooth ?? false,
        reference_pose: request.referencePose,
        style: request.style ?? 'neutral'
      })
    });
    return response.json();
  }

  /**
   * Check job status
   */
  async checkStatus(jobId: string): Promise<LipSyncStatusResponse> {
    const response = await fetchWithAuth(`${API_BASE_URL}/lipsync/status/${jobId}`);
    return response.json();
  }

  /**
   * List all lip sync jobs
   */
  async listJobs(projectId?: string): Promise<LipSyncStatusResponse[]> {
    const params = projectId ? `?project_id=${projectId}` : '';
    const response = await fetchWithAuth(`${API_BASE_URL}/lipsync/jobs${params}`);
    return response.json();
  }

  /**
   * Delete a job
   */
  async deleteJob(jobId: string): Promise<void> {
    await fetchWithAuth(`${API_BASE_URL}/lipsync/jobs/${jobId}`, {
      method: 'DELETE'
    });
  }

  /**
   * Get available models
   */
  async getAvailableModels(): Promise<{ models: LipSyncModelInfo[] }> {
    const response = await fetchWithAuth(`${API_BASE_URL}/lipsync/models`);
    return response.json();
  }

  /**
   * Test connection to ComfyUI
   */
  async testConnection(): Promise<LipSyncConnectionTest> {
    const response = await fetchWithAuth(`${API_BASE_URL}/lipsync/test-connection`, {
      method: 'POST'
    });
    return response.json();
  }

  /**
   * Create a lip sync request from form data
   */
  createRequest(
    projectId: string,
    characterFaceImage: string,
    audioFile: string,
    options?: Partial<typeof DEFAULT_LIP_SYNC_OPTIONS>
  ): LipSyncRequest {
    return {
      projectId,
      characterFaceImage,
      audioFile,
      model: options?.model ?? DEFAULT_LIP_SYNC_OPTIONS.model,
      enhancer: options?.enhancer ?? DEFAULT_LIP_SYNC_OPTIONS.enhancer,
      pads: options?.pads ?? DEFAULT_LIP_SYNC_OPTIONS.pads,
      nosmooth: options?.nosmooth ?? DEFAULT_LIP_SYNC_OPTIONS.nosmooth,
      style: options?.style ?? DEFAULT_LIP_SYNC_OPTIONS.style
    };
  }

  /**
   * Poll for job completion
   */
  async waitForCompletion(
    jobId: string,
    onProgress?: (status: LipSyncStatusResponse) => void,
    maxAttempts: number = 60,
    intervalMs: number = 2000
  ): Promise<LipSyncStatusResponse> {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      const status = await this.checkStatus(jobId);
      
      if (onProgress) {
        onProgress(status);
      }
      
      if (status.status === LIP_SYNC_STATUS_COMPLETED || status.status === LIP_SYNC_STATUS_FAILED) {
        return status;
      }
      
      await new Promise(resolve => setTimeout(resolve, intervalMs));
      attempts++;
    }
    
    throw new Error('Lip sync job timed out');
  }
}

// Export singleton instance
export const lipSyncService = new LipSyncService();

