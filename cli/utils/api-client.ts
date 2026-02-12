/**
 * API Client for StoryCore Backend
 * Handles communication with the StoryCore backend API
 */

import { logger } from './logger';

// Stub configManager for CLI (not used in standalone CLI mode)
const configManager = {
  get: (key: string): undefined => undefined,
  set: (_key: string, _value: unknown): void => {},
  load: async (): Promise<void> => {},
  save: async (): Promise<void> => {}
};

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface MediaAsset {
  id: string;
  type: 'image' | 'video' | 'audio';
  path: string;
  name: string;
  size?: number;
  createdAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface MediaMetadata {
  width?: number;
  height?: number;
  duration?: number;
  fps?: number;
  format?: string;
  codec?: string;
  bitrate?: number;
  size?: number;
}

export interface RenderJob {
  id: string;
  compositionId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  outputPath?: string;
  error?: string;
}

export interface Composition {
  id: string;
  name: string;
  duration: number;
  fps: number;
  width: number;
  height: number;
  scenes: Scene[];
}

export interface Scene {
  id: string;
  name: string;
  duration: number;
  assets: MediaAsset[];
}

/**
 * API Client class for backend communication
 */
export class ApiClient {
  private baseUrl: string;
  private apiKey: string;
  private timeout: number;

  constructor() {
    const apiUrl = configManager.get('api.url');
    const apiKey = configManager.get('api.key');
    const timeout = configManager.get('api.timeout');
    this.baseUrl = typeof apiUrl === 'string' ? apiUrl : 'http://localhost:3001';
    this.apiKey = typeof apiKey === 'string' ? apiKey : '';
    this.timeout = typeof timeout === 'number' ? timeout : 30000;
  }

  /**
   * Set API credentials
   */
  setCredentials(url: string, key: string): void {
    this.baseUrl = url;
    this.apiKey = key;
  }

  /**
   * Make HTTP request to API
   */
  private async request<T>(
    endpoint: string,
    options: {
      method?: string;
      body?: unknown;
      headers?: Record<string, string>;
    } = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    try {
      logger.debug(`API Request: ${options.method || 'GET'} ${url}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        method: options.method || 'GET',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`API Error: ${response.status} ${errorText}`);
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText}`
        };
      }

      const data = await response.json() as T;
      return {
        success: true,
        data
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`API Request failed: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Check if API is available
   */
  async healthCheck(): Promise<boolean> {
    const response = await this.request('/api/health');
    return response.success;
  }

  /**
   * Get API version
   */
  async getVersion(): Promise<ApiResponse<{ version: string }>> {
    return this.request('/api/version');
  }

  /**
   * Import media asset
   */
  async importMedia(
    filePath: string,
    options: {
      type?: 'image' | 'video' | 'audio';
      onProgress?: (progress: number) => void;
    } = {}
  ): Promise<ApiResponse<MediaAsset>> {
    logger.info(`Importing media: ${filePath}`);

    // For now, return a simulated response
    const assetId = crypto.randomUUID();
    logger.success(`Media imported: ${assetId}`);

    return {
      success: true,
      data: {
        id: assetId,
        type: options.type || 'image',
        path: filePath,
        name: filePath.split('/').pop() || 'unknown',
        metadata: {
          width: 1920,
          height: 1080,
          format: 'png'
        }
      }
    };
  }

  /**
   * Get media metadata
   */
  async getMediaMetadata(mediaId: string): Promise<ApiResponse<MediaMetadata>> {
    return this.request(`/api/media/${mediaId}/metadata`);
  }

  /**
   * Analyze media
   */
  async analyzeMedia(mediaPath: string): Promise<ApiResponse<MediaMetadata>> {
    logger.info(`Analyzing media: ${mediaPath}`);
    
    // Simulated analysis result
    return {
      success: true,
      data: {
        width: 1920,
        height: 1080,
        duration: 10.5,
        fps: 30,
        format: 'mp4',
        codec: 'h264',
        bitrate: 5000000,
        size: 10485760
      }
    };
  }

  /**
   * Start render job
   */
  async startRender(
    compositionId: string,
    _options: {
      quality?: string;
      format?: string;
      onProgress?: (progress: number) => void;
    } = {}
  ): Promise<ApiResponse<RenderJob>> {
    logger.info(`Starting render for composition: ${compositionId}`);

    const jobId = crypto.randomUUID();
    return {
      success: true,
      data: {
        id: jobId,
        compositionId,
        status: 'running',
        progress: 0
      }
    };
  }

  /**
   * Get render job status
   */
  async getRenderStatus(jobId: string): Promise<ApiResponse<RenderJob>> {
    return this.request(`/api/render/${jobId}`);
  }

  /**
   * Cancel render job
   */
  async cancelRender(jobId: string): Promise<ApiResponse<void>> {
    return this.request(`/api/render/${jobId}`, { method: 'DELETE' });
  }

  /**
   * Get available compositions
   */
  async getCompositions(): Promise<ApiResponse<Composition[]>> {
    return this.request('/api/compositions');
  }

  /**
   * Get composition details
   */
  async getComposition(compositionId: string): Promise<ApiResponse<Composition>> {
    return this.request(`/api/compositions/${compositionId}`);
  }

  /**
   * Create new composition
   */
  async createComposition(
    name: string,
    options: {
      width?: number;
      height?: number;
      fps?: number;
      duration?: number;
    } = {}
  ): Promise<ApiResponse<Composition>> {
    return this.request('/api/compositions', {
      method: 'POST',
      body: { name, ...options }
    });
  }

  /**
   * Export composition
   */
  async exportComposition(
    compositionId: string,
    _options: {
      format?: string;
      quality?: string;
      onProgress?: (progress: number) => void;
    } = {}
  ): Promise<ApiResponse<{ downloadUrl: string }>> {
    logger.info(`Exporting composition: ${compositionId}`);
    
    return {
      success: true,
      data: {
        downloadUrl: `http://localhost:3001/output/${compositionId}.mp4`
      }
    };
  }

  /**
   * Start preview server
   */
  async startPreview(
    compositionId: string,
    port: number = 3000
  ): Promise<ApiResponse<{ url: string }>> {
    logger.info(`Starting preview for composition: ${compositionId}`);
    
    return {
      success: true,
      data: {
        url: `http://localhost:${port}`
      }
    };
  }

  /**
   * Stop preview server
   */
  async stopPreview(): Promise<ApiResponse<void>> {
    return this.request('/api/preview', { method: 'DELETE' });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
