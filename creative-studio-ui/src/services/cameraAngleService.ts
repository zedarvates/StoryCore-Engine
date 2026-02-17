/**
 * Camera Angle Service
 * 
 * Provides API communication for the AI-powered camera angle editor feature.
 * Handles generation jobs, status polling, result retrieval, and preset management.
 */

import { API_BASE_URL } from '@/config/apiConfig';
import type {
  CameraAngleRequest,
  CameraAngleJobResponse,
  CameraAngleResultResponse,
  CameraAnglePresetsResponse,
  CameraAngleCancelResponse,
  CameraAngleApiError,
} from '@/types/cameraAngle';

// ============================================================================
// Types
// ============================================================================

/**
 * API response wrapper
 */
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Service configuration
 */
interface CameraAngleServiceConfig {
  baseUrl: string;
  timeout: number;
  pollInterval: number;
  maxPollAttempts: number;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CONFIG: CameraAngleServiceConfig = {
  baseUrl: API_BASE_URL,
  timeout: 300000, // 5 minutes (for long generation tasks)
  pollInterval: 2000, // 2 seconds
  maxPollAttempts: 150, // 5 minutes max polling
};

// ============================================================================
// Camera Angle Service Class
// ============================================================================

/**
 * Service for camera angle API operations
 */
class CameraAngleService {
  private config: CameraAngleServiceConfig;
  private abortControllers: Map<string, AbortController> = new Map();

  constructor(config: Partial<CameraAngleServiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  /**
   * Get default headers for API requests
   */
  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  /**
   * Handle API errors
   */
  private handleError(error: unknown, context: string): CameraAngleApiError {
    console.error(`CameraAngleService - ${context}:`, error);

    if (error instanceof Error) {
      // Check for fetch abort
      if (error.name === 'AbortError') {
        return {
          message: 'Request was cancelled',
          code: 'CANCELLED',
        };
      }

      // Network errors
      if (error.message.includes('fetch') || error.message.includes('network')) {
        return {
          message: 'Network error. Please check your connection.',
          code: 'NETWORK_ERROR',
        };
      }

      return {
        message: error.message,
        code: 'API_ERROR',
      };
    }

    return {
      message: 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR',
    };
  }

  /**
   * Make an API request with proper error handling
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    abortKey?: string
  ): Promise<T> {
    const controller = new AbortController();
    const signal = controller.signal;

    if (abortKey) {
      // Cancel any existing request with the same key
      const existingController = this.abortControllers.get(abortKey);
      if (existingController) {
        existingController.abort();
      }
      this.abortControllers.set(abortKey, controller);
    }

    try {
      const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options.headers,
        },
        signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.detail || errorData.message || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      return await response.json();
    } finally {
      if (abortKey) {
        this.abortControllers.delete(abortKey);
      }
    }
  }

  /**
   * Cancel a pending request
   */
  cancelRequest(abortKey: string): void {
    const controller = this.abortControllers.get(abortKey);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(abortKey);
    }
  }

  // ==========================================================================
  // API Methods
  // ==========================================================================

  /**
   * Start a camera angle generation job
   * 
   * @param request - Generation request with image and angle selections
   * @returns Job ID for tracking
   */
  async generate(request: CameraAngleRequest): Promise<CameraAngleJobResponse> {
    try {
      const response = await this.request<CameraAngleJobResponse>(
        '/api/camera-angle/generate',
        {
          method: 'POST',
          body: JSON.stringify(request),
        },
        'generate'
      );

      return response;
    } catch (error) {
      throw this.handleError(error, 'generate');
    }
  }

  /**
   * Get the status of a generation job
   * 
   * @param jobId - Job identifier
   * @returns Current job status
   */
  async getStatus(jobId: string): Promise<CameraAngleJobResponse> {
    try {
      const response = await this.request<CameraAngleJobResponse>(
        `/api/camera-angle/job/${jobId}`,
        {
          method: 'GET',
        }
      );

      return response;
    } catch (error) {
      throw this.handleError(error, 'getStatus');
    }
  }

  /**
   * Get the results of a completed job
   * 
   * @param jobId - Job identifier
   * @returns Generation results with all angle variations
   */
  async getResult(jobId: string): Promise<CameraAngleResultResponse> {
    try {
      const response = await this.request<CameraAngleResultResponse>(
        `/api/camera-angle/result/${jobId}`,
        {
          method: 'GET',
        }
      );

      return response;
    } catch (error) {
      throw this.handleError(error, 'getResult');
    }
  }

  /**
   * Get available camera angle presets
   * 
   * @returns List of available presets with metadata
   */
  async getPresets(): Promise<CameraAnglePresetsResponse> {
    try {
      const response = await this.request<CameraAnglePresetsResponse>(
        '/api/camera-angle/presets',
        {
          method: 'GET',
        }
      );

      return response;
    } catch (error) {
      throw this.handleError(error, 'getPresets');
    }
  }

  /**
   * Cancel a running job
   * 
   * @param jobId - Job identifier
   * @returns Cancellation confirmation
   */
  async cancelJob(jobId: string): Promise<CameraAngleCancelResponse> {
    try {
      // Cancel any pending status requests
      this.cancelRequest(`poll-${jobId}`);

      const response = await this.request<CameraAngleCancelResponse>(
        `/api/camera-angle/cancel/${jobId}`,
        {
          method: 'POST',
        }
      );

      return response;
    } catch (error) {
      throw this.handleError(error, 'cancelJob');
    }
  }

  // ==========================================================================
  // Polling Methods
  // ==========================================================================

  /**
   * Poll job status until completion or failure
   * 
   * @param jobId - Job identifier
   * @param onProgress - Progress callback
   * @param onComplete - Completion callback
   * @param onError - Error callback
   * @returns Cleanup function to stop polling
   */
  pollJobStatus(
    jobId: string,
    onProgress?: (status: CameraAngleJobResponse) => void,
    onComplete?: (result: CameraAngleResultResponse) => void,
    onError?: (error: CameraAngleApiError) => void
  ): () => void {
    let attempts = 0;
    let cancelled = false;

    const poll = async () => {
      if (cancelled) return;

      try {
        const status = await this.getStatus(jobId);
        onProgress?.(status);

        if (status.status === 'completed') {
          // Fetch results
          const result = await this.getResult(jobId);
          onComplete?.(result);
          return;
        }

        if (status.status === 'failed' || status.status === 'cancelled') {
          onError?.({
            message: status.error || `Job ${status.status}`,
            code: status.status.toUpperCase(),
          });
          return;
        }

        // Continue polling
        attempts++;
        if (attempts < this.config.maxPollAttempts) {
          setTimeout(poll, this.config.pollInterval);
        } else {
          onError?.({
            message: 'Polling timeout exceeded',
            code: 'TIMEOUT',
          });
        }
      } catch (error) {
        if (cancelled) return;
        
        const apiError = this.handleError(error, 'pollJobStatus');
        onError?.(apiError);
      }
    };

    // Start polling
    poll();

    // Return cleanup function
    return () => {
      cancelled = true;
    };
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Convert a file to base64 string
   */
  static fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      reader.readAsDataURL(file);
    });
  }

  /**
   * Convert a URL to base64 string
   */
  static async urlToBase64(url: string): Promise<string> {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result);
        };
        reader.onerror = () => {
          reject(new Error('Failed to convert URL to base64'));
        };
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      throw new Error(`Failed to fetch image from URL: ${error}`);
    }
  }

  /**
   * Download a base64 image
   */
  static downloadBase64Image(base64: string, filename: string): void {
    const link = document.createElement('a');
    link.href = base64;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const cameraAngleService = new CameraAngleService();

// Also export the class for testing or custom configurations
export { CameraAngleService };
export type { CameraAngleServiceConfig, ApiResponse };
