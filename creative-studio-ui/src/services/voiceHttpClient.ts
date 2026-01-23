/**
 * Voice HTTP Client
 * 
 * Handles HTTP communication with the backend for voice recording synchronization
 * Uses the fetch API for making HTTP requests
 */

import type { VoiceRecording, PhraseData } from '@/types';

/**
 * Voice HTTP Client Configuration
 */
export interface VoiceHttpConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
}

/**
 * Default configuration for Voice HTTP Client
 */
const DEFAULT_VOICE_CONFIG: VoiceHttpConfig = {
  baseUrl: import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000',
  timeout: 15000, // 15 seconds
  retryAttempts: 3,
};

/**
 * API response types for voice operations
 */
export interface VoiceApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Voice recording upload response
 */
export interface VoiceUploadResponse {
  recordingId: string;
  status: 'uploaded' | 'processing' | 'completed' | 'failed';
  message: string;
  timestamp: string;
}

/**
 * Phrase synchronization response
 */
export interface PhraseSyncResponse {
  phraseId: string;
  recordingId: string;
  syncStatus: 'synced' | 'pending' | 'failed';
  timestamp: string;
}

/**
 * Voice HTTP Client Class
 */
export class VoiceHttpClient {
  private config: VoiceHttpConfig;

  constructor(config?: Partial<VoiceHttpConfig>) {
    this.config = { ...DEFAULT_VOICE_CONFIG, ...config };
  }

  /**
   * Upload voice recording to backend
   * 
   * @param recording - Voice recording data
   * @returns Upload response with recording ID
   */
  async uploadVoiceRecording(
    recording: VoiceRecording
  ): Promise<VoiceApiResponse<VoiceUploadResponse>> {
    try {
      const formData = new FormData();
      formData.append('audio', recording.audioBlob, recording.filename);
      formData.append('metadata', JSON.stringify({
        userId: recording.userId,
        sessionId: recording.sessionId,
        timestamp: recording.timestamp,
        duration: recording.duration,
        sampleRate: recording.sampleRate,
      }));

      const response = await this.fetchWithRetry('/api/voice/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.message || 'Failed to upload voice recording',
        };
      }

      const data = await response.json();
      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Synchronize phrase data with backend
   * 
   * @param phrase - Phrase data to synchronize
   * @returns Synchronization response
   */
  async syncPhraseData(
    phrase: PhraseData
  ): Promise<VoiceApiResponse<PhraseSyncResponse>> {
    try {
      const response = await this.fetchWithRetry('/api/voice/phrase/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(phrase),
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.message || 'Failed to synchronize phrase data',
        };
      }

      const data = await response.json();
      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get voice recording status
   * 
   * @param recordingId - ID of the recording to check
   * @returns Status response
   */
  async getRecordingStatus(
    recordingId: string
  ): Promise<VoiceApiResponse<VoiceUploadResponse>> {
    try {
      const response = await this.fetchWithRetry(
        `/api/voice/status/${recordingId}`
      );

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.message || 'Failed to get recording status',
        };
      }

      const data = await response.json();
      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get all recordings for a session
   * 
   * @param sessionId - Session ID to get recordings for
   * @returns List of voice recordings
   */
  async getSessionRecordings(
    sessionId: string
  ): Promise<VoiceApiResponse<VoiceRecording[]>> {
    try {
      const response = await this.fetchWithRetry(
        `/api/voice/session/${sessionId}`
      );

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.message || 'Failed to get session recordings',
        };
      }

      const data = await response.json();
      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Delete a voice recording
   * 
   * @param recordingId - ID of the recording to delete
   * @returns Deletion response
   */
  async deleteRecording(
    recordingId: string
  ): Promise<VoiceApiResponse<void>> {
    try {
      const response = await this.fetchWithRetry(
        `/api/voice/delete/${recordingId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.message || 'Failed to delete recording',
        };
      }

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Fetch with retry logic for voice operations
   * 
   * @param url - URL to fetch
   * @param options - Fetch options
   * @returns Fetch response
   */
  private async fetchWithRetry(
    url: string,
    options?: RequestInit
  ): Promise<Response> {
    const fullUrl = `${this.config.baseUrl}${url}`;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.config.retryAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          this.config.timeout
        );

        const response = await fetch(fullUrl, {
          ...options,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        // Don't retry on abort (timeout)
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('Request timeout');
        }

        // Wait before retry (exponential backoff)
        if (attempt < this.config.retryAttempts - 1) {
          await this.delay(Math.pow(2, attempt) * 1000);
        }
      }
    }

    throw lastError || new Error('Failed after retries');
  }

  /**
   * Delay helper
   * 
   * @param ms - Milliseconds to delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Update voice HTTP configuration
   * 
   * @param config - New configuration
   */
  updateConfig(config: Partial<VoiceHttpConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   * 
   * @returns Current voice HTTP configuration
   */
  getConfig(): VoiceHttpConfig {
    return { ...this.config };
  }
}

/**
 * Default Voice HTTP Client instance
 */
export const voiceHttpClient = new VoiceHttpClient();

/**
 * Mock Voice HTTP Client for development/testing
 */
export class MockVoiceHttpClient extends VoiceHttpClient {
  private mockDelayMs: number = 500;

  constructor(config?: Partial<VoiceHttpConfig>) {
    super(config);
  }

  async uploadVoiceRecording(
    recording: VoiceRecording
  ): Promise<VoiceApiResponse<VoiceUploadResponse>> {
    await this.wait(this.mockDelayMs);

    return {
      success: true,
      data: {
        recordingId: `recording-${Date.now()}`,
        status: 'uploaded',
        message: 'Voice recording uploaded successfully (mock)',
        timestamp: new Date().toISOString(),
      },
    };
  }

  async syncPhraseData(
    phrase: PhraseData
  ): Promise<VoiceApiResponse<PhraseSyncResponse>> {
    await this.wait(this.mockDelayMs);

    return {
      success: true,
      data: {
        phraseId: phrase.id,
        recordingId: `recording-${phrase.id}`,
        syncStatus: 'synced',
        timestamp: new Date().toISOString(),
      },
    };
  }

  async getRecordingStatus(
    recordingId: string
  ): Promise<VoiceApiResponse<VoiceUploadResponse>> {
    await this.wait(this.mockDelayMs / 2);

    const statuses: Array<'uploaded' | 'processing' | 'completed' | 'failed'> = [
      'uploaded',
      'processing',
      'completed',
    ];
    const status = statuses[Math.floor(Math.random() * statuses.length)];

    return {
      success: true,
      data: {
        recordingId,
        status,
        message: `Recording ${status} (mock)`,
        timestamp: new Date().toISOString(),
      },
    };
  }

  async getSessionRecordings(
    sessionId: string
  ): Promise<VoiceApiResponse<VoiceRecording[]>> {
    await this.wait(this.mockDelayMs);

    return {
      success: true,
      data: [],
    };
  }

  async deleteRecording(
    recordingId: string
  ): Promise<VoiceApiResponse<void>> {
    await this.wait(this.mockDelayMs / 2);

    return {
      success: true,
    };
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  setMockDelay(ms: number): void {
    this.mockDelayMs = ms;
  }
}

/**
 * Create Voice HTTP Client based on environment
 */
export function createVoiceHttpClient(useMock: boolean = false): VoiceHttpClient {
  if (useMock || import.meta.env.MODE === 'test') {
    return new MockVoiceHttpClient();
  }
  return new VoiceHttpClient();
}