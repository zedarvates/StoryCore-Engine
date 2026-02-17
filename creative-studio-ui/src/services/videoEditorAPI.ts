// Video Editor API Service
// Backend API communication for the video editor

import {
  EditorProject,
  MediaFile,
  ExportSettings,
  ExportJob,
  Track,
  Clip,
} from '../types/video-editor';

const API_BASE = '/api/video-editor';

interface CreateProjectParams {
  name: string;
  resolution: { width: number; height: number };
  frameRate: number;
}

interface UpdateProjectParams {
  tracks?: Track[];
  clips?: Clip[];
  media?: MediaFile[];
}

class VideoEditorAPI {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 600000); // 10 minutes

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Request failed' }));
        throw new Error(error.message || `HTTP ${response.status}`);
      }

      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Video editor request timed out after 10 minutes');
      }
      throw error;
    }
  }

  // Project Operations
  async createProject(params: CreateProjectParams): Promise<EditorProject> {
    return this.request<EditorProject>('/projects', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async getProject(projectId: string): Promise<EditorProject> {
    return this.request<EditorProject>(`/projects/${projectId}`);
  }

  async updateProject(projectId: string, params: UpdateProjectParams): Promise<EditorProject> {
    return this.request<EditorProject>(`/projects/${projectId}`, {
      method: 'PUT',
      body: JSON.stringify(params),
    });
  }

  async deleteProject(projectId: string): Promise<void> {
    await this.request(`/projects/${projectId}`, { method: 'DELETE' });
  }

  async listProjects(): Promise<EditorProject[]> {
    return this.request<EditorProject[]>('/projects');
  }

  // Media Operations
  async importMedia(projectId: string, file: File): Promise<MediaFile> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.baseUrl}/projects/${projectId}/media`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to import media');
    }

    return response.json();
  }

  async deleteMedia(projectId: string, mediaId: string): Promise<void> {
    await this.request(`/projects/${projectId}/media/${mediaId}`, {
      method: 'DELETE',
    });
  }

  async getMedia(projectId: string, mediaId: string): Promise<MediaFile> {
    return this.request<MediaFile>(`/projects/${projectId}/media/${mediaId}`);
  }

  // Clip Operations
  async addClip(
    projectId: string,
    trackId: string,
    mediaId: string,
    startTime: number,
    inPoint?: number,
    outPoint?: number
  ): Promise<Clip> {
    return this.request<Clip>(`/projects/${projectId}/tracks/${trackId}/clips`, {
      method: 'POST',
      body: JSON.stringify({
        mediaId,
        startTime,
        inPoint,
        outPoint,
      }),
    });
  }

  async updateClip(
    projectId: string,
    clipId: string,
    updates: Partial<Clip>
  ): Promise<Clip> {
    return this.request<Clip>(`/projects/${projectId}/clips/${clipId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteClip(projectId: string, clipId: string): Promise<void> {
    await this.request(`/projects/${projectId}/clips/${clipId}`, {
      method: 'DELETE',
    });
  }

  async moveClip(
    projectId: string,
    clipId: string,
    newTrackId: string,
    newStartTime: number
  ): Promise<Clip> {
    return this.request<Clip>(`/projects/${projectId}/clips/${clipId}/move`, {
      method: 'POST',
      body: JSON.stringify({
        trackId: newTrackId,
        startTime: newStartTime,
      }),
    });
  }

  async splitClip(projectId: string, clipId: string, splitTime: number): Promise<Clip[]> {
    return this.request<Clip[]>(`/projects/${projectId}/clips/${clipId}/split`, {
      method: 'POST',
      body: JSON.stringify({ splitTime }),
    });
  }

  // Export Operations
  async exportProject(
    projectId: string,
    settings: ExportSettings
  ): Promise<ExportJob> {
    return this.request<ExportJob>(`/projects/${projectId}/export`, {
      method: 'POST',
      body: JSON.stringify(settings),
    });
  }

  async getExportProgress(jobId: string): Promise<ExportJob> {
    return this.request<ExportJob>(`/export/${jobId}/progress`);
  }

  async cancelExport(jobId: string): Promise<void> {
    await this.request(`/export/${jobId}/cancel`, { method: 'POST' });
  }

  getExportDownload(jobId: string): string {
    return `${this.baseUrl}/export/${jobId}/download`;
  }

  // AI Features
  async generateCaptions(
    projectId: string,
    language: string = 'en'
  ): Promise<{ taskId: string }> {
    return this.request<{ taskId: string }>(`/projects/${projectId}/ai/captions`, {
      method: 'POST',
      body: JSON.stringify({ language }),
    });
  }

  async getCaptionsStatus(projectId: string): Promise<{
    status: 'pending' | 'processing' | 'completed' | 'failed';
    captions?: unknown[];
  }> {
    return this.request(`/projects/${projectId}/ai/captions/status`);
  }

  async generateSpeech(
    projectId: string,
    text: string,
    voice: string,
    options?: {
      rate?: number;
      pitch?: number;
      volume?: number;
    }
  ): Promise<{ audioUrl: string }> {
    return this.request<{ audioUrl: string }>(`/projects/${projectId}/ai/tts`, {
      method: 'POST',
      body: JSON.stringify({ text, voice, ...options }),
    });
  }


  async generateVideoFromReference(
    projectId: string,
    shotId: string,
    referenceImage: string,
    parameters: unknown // Decoupled from ComfyUIParameters to avoid circular deps
  ): Promise<{ taskId: string }> {
    return this.request<{ taskId: string }>(`/projects/${projectId}/ai/generate-video`, {
      method: 'POST',
      body: JSON.stringify({ shotId, referenceImage, parameters }),
    });
  }

  async extendVideo(
    projectId: string,
    shotId: string,
    sourceVideoUrl: string,
    parameters: unknown // Decoupled from ComfyUIParameters to avoid circular deps
  ): Promise<{ taskId: string }> {
    return this.request<{ taskId: string }>(`/projects/${projectId}/ai/extend-video`, {
      method: 'POST',
      body: JSON.stringify({ shotId, sourceVideoUrl, parameters }),
    });
  }

  async getVideoGenerationStatus(
    projectId: string,
    taskId: string
  ): Promise<{
    status: 'processing' | 'completed' | 'failed';
    progress: number;
    resultPath?: string;
    error?: string;
  }> {
    return this.request(`/projects/${projectId}/ai/generation-status/${taskId}`);
  }

  async detectScenes(
    projectId: string,
    sensitivity?: number
  ): Promise<{ scenes: { start: number; end: number }[] }> {
    return this.request<{ scenes: { start: number; end: number }[] }>(
      `/projects/${projectId}/ai/scene-detection`,
      {
        method: 'POST',
        body: JSON.stringify({ sensitivity }),
      }
    );
  }

  async listProjectAssets(projectId: string): Promise<{ assets: unknown[] }> {
    return this.request<{ assets: unknown[] }>(`/projects/${projectId}/vault/assets`);
  }

  // Track Operations
  async addTrack(
    projectId: string,
    type: string,
    name: string
  ): Promise<Track> {
    return this.request<Track>(`/projects/${projectId}/tracks`, {
      method: 'POST',
      body: JSON.stringify({ type, name }),
    });
  }

  async updateTrack(
    projectId: string,
    trackId: string,
    updates: Partial<Track>
  ): Promise<Track> {
    return this.request<Track>(`/projects/${projectId}/tracks/${trackId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteTrack(projectId: string, trackId: string): Promise<void> {
    await this.request(`/projects/${projectId}/tracks/${trackId}`, {
      method: 'DELETE',
    });
  }

  async reorderTracks(projectId: string, trackIds: string[]): Promise<void> {
    await this.request(`/projects/${projectId}/tracks/reorder`, {
      method: 'POST',
      body: JSON.stringify({ trackIds }),
    });
  }

  async autoAssemble(
    projectId: string,
    shots: Array<{ id: string; duration: number; file_path: string; title?: string }>
  ): Promise<{ status: string; track_id: string }> {
    return this.request<{ status: string; track_id: string }>(`/projects/${projectId}/auto-assemble`, {
      method: 'POST',
      body: JSON.stringify({ shots }),
    });
  }

  async fillGaps(
    projectId: string,
    trackId: string,
    fillerData: { name: string; file_path: string; type: string }
  ): Promise<{ status: string; filled_clips: string[]; project: EditorProject }> {
    return this.request<{ status: string; filled_clips: string[]; project: EditorProject }>(
      `/projects/${projectId}/tracks/${trackId}/fill-gaps`,
      {
        method: 'POST',
        body: JSON.stringify(fillerData),
      }
    );
  }

  async generateAmbiance(
    projectId: string,
    prompt: string
  ): Promise<{ status: string; file_path: string }> {
    return this.request<{ status: string; file_path: string }>(
      `/projects/${projectId}/ai/generate-ambiance`,
      {
        method: 'POST',
        body: JSON.stringify({ prompt }),
      }
    );
  }

  async smartCrop(
    mediaId: string,
    targetRatio: string = "9:16",
    focusMode: 'center' | 'face' | 'motion' = 'center'
  ): Promise<{ job_id: string; status: string; crop_regions?: any }> {
    return this.request<{ job_id: string; status: string; crop_regions?: any }>(
      `/ai/smart-crop`,
      {
        method: 'POST',
        body: JSON.stringify({
          media_id: mediaId,
          target_ratio: targetRatio,
          focus_mode: focusMode
        }),
      }
    );
  }

  async getAiJobStatus(jobId: string): Promise<any> {
    return this.request<any>(`/jobs/${jobId}`);
  }
}

// Singleton instance
export const videoEditorAPI = new VideoEditorAPI();

// Hook for React components
export function useVideoEditorAPI() {
  return { api: videoEditorAPI };
}

export default VideoEditorAPI;


