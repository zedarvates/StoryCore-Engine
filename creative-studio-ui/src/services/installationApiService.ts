/**
 * Installation API Service
 * 
 * Handles communication with backend for ComfyUI installation wizard
 * Provides WebSocket support for real-time progress updates
 */

import type {
  InitializeResponse,
  FileCheckResponse,
  InstallRequest,
  ProgressUpdate,
  VerificationResponse,
} from '@/types/installation';

/**
 * Installation API configuration
 */
export interface InstallationApiConfig {
  baseUrl: string;
  timeout: number;
  wsUrl: string;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: InstallationApiConfig = {
  baseUrl: import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000',
  timeout: 300000, // 5 minutes for installation
  wsUrl: import.meta.env.VITE_WS_URL || 'ws://localhost:5000',
};

/**
 * API response wrapper
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Installation API Service Class
 */
export class InstallationApiService {
  private config: InstallationApiConfig;
  private ws: WebSocket | null = null;

  constructor(config?: Partial<InstallationApiConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize installation wizard
   * Creates download zone and returns configuration
   */
  async initialize(): Promise<ApiResponse<InitializeResponse>> {
    try {
      const response = await this.fetchWithTimeout('/api/installation/initialize', {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.message || 'Failed to initialize installation',
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
   * Check if ZIP file exists and is valid
   */
  async checkFile(path: string): Promise<ApiResponse<FileCheckResponse>> {
    try {
      const response = await this.fetchWithTimeout(
        `/api/installation/check-file?path=${encodeURIComponent(path)}`
      );

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.message || 'Failed to check file',
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
   * Start installation with WebSocket progress updates
   */
  async install(
    request: InstallRequest,
    onProgress: (update: ProgressUpdate) => void,
    onError?: (error: Error) => void
  ): Promise<() => void> {
    // Close existing WebSocket if any
    if (this.ws) {
      this.ws.close();
    }

    // Create WebSocket connection
    const wsUrl = `${this.config.wsUrl}/api/installation/install`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      // Send installation request
      this.ws?.send(JSON.stringify(request));
    };

    this.ws.onmessage = (event) => {
      try {
        const update: ProgressUpdate = JSON.parse(event.data);
        onProgress(update);

        // Close connection when installation completes or fails
        if (update.error || update.progress >= 100) {
          this.ws?.close();
        }
      } catch (error) {
        onError?.(
          error instanceof Error ? error : new Error('Failed to parse progress update')
        );
      }
    };

    this.ws.onerror = (_event) => {
      onError?.(new Error('WebSocket connection failed'));
      this.ws?.close();
    };

    this.ws.onclose = () => {
      this.ws = null;
    };

    // Return cleanup function
    return () => {
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }
    };
  }

  /**
   * Verify installation and CORS configuration
   */
  async verify(): Promise<ApiResponse<VerificationResponse>> {
    try {
      const response = await this.fetchWithTimeout('/api/installation/verify');

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.message || 'Failed to verify installation',
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
   * Fetch with timeout
   */
  private async fetchWithTimeout(
    url: string,
    options?: RequestInit
  ): Promise<Response> {
    const fullUrl = `${this.config.baseUrl}${url}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(fullUrl, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<InstallationApiConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): InstallationApiConfig {
    return { ...this.config };
  }

  /**
   * Close WebSocket connection
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

/**
 * Default installation API service instance
 */
export const installationApi = new InstallationApiService();

/**
 * Mock installation API service for development/testing
 */
export class MockInstallationApiService extends InstallationApiService {
  private mockDelayMs: number = 1000;

  async initialize(): Promise<ApiResponse<InitializeResponse>> {
    await this.wait(this.mockDelayMs);

    return {
      success: true,
      data: {
        downloadZonePath: 'C:\\Users\\User\\Downloads\\comfyui_download_zone',
        downloadUrl: 'https://github.com/comfyanonymous/ComfyUI/releases/download/latest/ComfyUI_windows_portable_nvidia.7z',
        expectedFileName: 'ComfyUI_windows_portable_nvidia.7z',
        expectedFileSize: 2500000000,
      },
    };
  }

  async checkFile(_path: string): Promise<ApiResponse<FileCheckResponse>> {
    await this.wait(this.mockDelayMs / 2);

    // Simulate random file detection
    const exists = Math.random() > 0.5;
    const valid = exists && Math.random() > 0.3;

    return {
      success: true,
      data: {
        exists,
        valid,
        fileName: exists ? 'ComfyUI_windows_portable_nvidia.7z' : null,
        fileSize: exists ? 2500000000 : null,
        validationError: !valid && exists ? 'File size mismatch' : null,
      },
    };
  }

  async install(
    _request: InstallRequest,
    onProgress: (update: ProgressUpdate) => void,
    _onError?: (error: Error) => void
  ): Promise<() => void> {
    // Simulate installation progress
    let progress = 0;
    const steps = [
      'Extracting ComfyUI Portable...',
      'Configuring CORS settings...',
      'Downloading models...',
      'Installing workflows...',
      'Verifying installation...',
      'Installation complete!',
    ];

    const interval = setInterval(() => {
      if (progress >= 100) {
        clearInterval(interval);
        return;
      }

      progress += 20;
      const stepIndex = Math.floor((progress / 100) * steps.length);
      const step = steps[Math.min(stepIndex, steps.length - 1)];

      onProgress({
        step,
        progress: Math.min(progress, 100),
        message: step,
        error: null,
      });
    }, this.mockDelayMs);

    return () => {
      clearInterval(interval);
    };
  }

  async verify(): Promise<ApiResponse<VerificationResponse>> {
    await this.wait(this.mockDelayMs);

    return {
      success: true,
      data: {
        installed: true,
        running: true,
        corsEnabled: true,
        url: 'http://localhost:8188',
        models: ['sd_xl_base_1.0.safetensors', 'sd_xl_refiner_1.0.safetensors'],
        workflows: ['text2img.json', 'img2img.json'],
        errors: [],
      },
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
 * Create installation API service based on environment
 */
export function createInstallationApi(useMock: boolean = false): InstallationApiService {
  if (useMock || import.meta.env.MODE === 'test') {
    return new MockInstallationApiService();
  }
  return new InstallationApiService();
}
