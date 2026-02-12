/**
 * Grid API Service
 * 
 * Handles backend communication for grid editor image generation and configuration management
 * Integrates with StoryCore-Engine backend for panel generation and grid configuration persistence
 * 
 * Validates Requirements: 11.1, 11.6
 */

import type {
  GridConfiguration,
  Transform,
  CropRegion,
} from '@/types/gridEditor';
import { getCachedPlaceholder } from '@/utils/placeholderImage';

/**
 * Panel generation configuration
 */
export interface PanelGenerationConfig {
  panelId: string;
  prompt: string;
  seed: number;
  transform: Transform;
  crop: CropRegion | null;
  styleReference: string; // Master Coherence Sheet reference
  width?: number;
  height?: number;
  steps?: number;
  cfgScale?: number;
  sampler?: string;
  scheduler?: string;
  // Preset-specific parameters
  presetId?: string;
  presetName?: string;
  presetStyleParams?: {
    aspectRatio?: string; // e.g., "16:9", "4:3", "1:1"
    compositionStyle?: string; // e.g., "cinematic", "comic", "portrait"
    cropStyle?: string; // e.g., "letterbox", "dynamic", "centered"
    transformStyle?: string; // e.g., "dramatic", "stable", "dynamic"
    [key: string]: unknown; // Allow additional custom parameters
  };
}

/**
 * Generated image response
 */
export interface GeneratedImage {
  panelId: string;
  imageUrl: string;
  metadata: {
    seed: number;
    generationTime: number;
    qualityScore: number;
    width: number;
    height: number;
  };
}

/**
 * Batch generation request
 */
export interface BatchGenerationRequest {
  panels: PanelGenerationConfig[];
  parallel?: boolean;
  maxConcurrent?: number;
}

/**
 * Batch generation response
 */
export interface BatchGenerationResponse {
  batchId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalPanels: number;
  completedPanels: number;
  failedPanels: number;
  results: GeneratedImage[];
  errors: Array<{
    panelId: string;
    error: string;
  }>;
}

/**
 * Configuration upload response
 */
export interface ConfigurationUploadResponse {
  success: boolean;
  configId: string;
  url: string;
  timestamp: string;
}

/**
 * API response wrapper
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Grid API Service configuration
 */
export interface GridAPIConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: GridAPIConfig = {
  baseUrl: import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000',
  timeout: 60000, // 60 seconds for generation tasks
  retryAttempts: 3,
};

/**
 * Grid API Service Class
 * 
 * Provides methods for:
 * - Individual panel image generation
 * - Batch panel generation
 * - Grid configuration upload/download
 * - Generation status tracking
 */
export class GridAPIService {
  private config: GridAPIConfig;

  constructor(config?: Partial<GridAPIConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Generate image for a single panel
   * Validates Requirement 11.1
   * 
   * @param panelConfig - Panel generation configuration
   * @returns Generated image with metadata
   */
  async generatePanelImage(
    panelConfig: PanelGenerationConfig
  ): Promise<ApiResponse<GeneratedImage>> {
    try {
      const response = await this.fetchWithRetry('/api/grid/generate-panel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(panelConfig),
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.message || 'Failed to generate panel image',
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
   * Generate images for multiple panels in batch
   * Validates Requirement 11.1, 11.6
   * 
   * @param request - Batch generation request
   * @returns Batch generation response with results and errors
   */
  async batchGeneratePanels(
    request: BatchGenerationRequest
  ): Promise<ApiResponse<BatchGenerationResponse>> {
    try {
      const response = await this.fetchWithRetry('/api/grid/batch-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.message || 'Failed to batch generate panels',
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
   * Get status of batch generation
   * 
   * @param batchId - Batch ID to check
   * @returns Batch generation status
   */
  async getBatchStatus(
    batchId: string
  ): Promise<ApiResponse<BatchGenerationResponse>> {
    try {
      const response = await this.fetchWithRetry(
        `/api/grid/batch-status/${batchId}`
      );

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.message || 'Failed to get batch status',
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
   * Upload grid configuration to backend
   * Validates Requirement 11.6
   * 
   * @param config - Grid configuration to upload
   * @returns Upload response with config ID and URL
   */
  async uploadGridConfiguration(
    config: GridConfiguration
  ): Promise<ApiResponse<ConfigurationUploadResponse>> {
    try {
      const response = await this.fetchWithRetry('/api/grid/upload-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.message || 'Failed to upload grid configuration',
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
   * Download grid configuration from backend
   * Validates Requirement 11.6
   * 
   * @param configId - Configuration ID to download
   * @returns Grid configuration
   */
  async downloadGridConfiguration(
    configId: string
  ): Promise<ApiResponse<GridConfiguration>> {
    try {
      const response = await this.fetchWithRetry(
        `/api/grid/download-config/${configId}`
      );

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.message || 'Failed to download grid configuration',
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
   * Cancel ongoing generation task
   * 
   * @param taskId - Task ID to cancel (panel ID or batch ID)
   * @returns Cancellation response
   */
  async cancelGeneration(taskId: string): Promise<ApiResponse<void>> {
    try {
      const response = await this.fetchWithRetry(
        `/api/grid/cancel/${taskId}`,
        {
          method: 'POST',
        }
      );

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.message || 'Failed to cancel generation',
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
   * Generate panels with preset parameters
   * Validates Requirement 14.7
   * 
   * Applies preset-specific style parameters to generation request
   * 
   * @param presetId - Preset ID to apply
   * @param presetName - Preset name for reference
   * @param panels - Panel configurations
   * @param presetStyleParams - Preset-specific style parameters
   * @returns Batch generation response
   */
  async generateWithPreset(
    presetId: string,
    presetName: string,
    panels: PanelGenerationConfig[],
    presetStyleParams?: Record<string, unknown>
  ): Promise<ApiResponse<BatchGenerationResponse>> {
    try {
      // Enhance panel configs with preset parameters
      const enhancedPanels = panels.map(panel => ({
        ...panel,
        presetId,
        presetName,
        presetStyleParams: {
          ...presetStyleParams,
          ...panel.presetStyleParams,
        },
      }));

      // Use batch generation with preset-enhanced configs
      return await this.batchGeneratePanels({
        panels: enhancedPanels,
        parallel: true,
        maxConcurrent: 3,
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Fetch with retry logic and timeout
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
   * Update service configuration
   * 
   * @param config - New configuration
   */
  updateConfig(config: Partial<GridAPIConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   * 
   * @returns Current configuration
   */
  getConfig(): GridAPIConfig {
    return { ...this.config };
  }
}

/**
 * Mock Grid API Service for development/testing
 */
export class MockGridAPIService extends GridAPIService {
  private mockDelayMs: number = 2000;
  private mockFailureRate: number = 0; // 0-1, probability of failure

  constructor(config?: Partial<GridAPIConfig>) {
    super(config);
  }

  async generatePanelImage(
    panelConfig: PanelGenerationConfig
  ): Promise<ApiResponse<GeneratedImage>> {
    await this.wait(this.mockDelayMs);

    if (Math.random() < this.mockFailureRate) {
      return {
        success: false,
        error: 'Mock generation failure',
      };
    }

    return {
      success: true,
      data: {
        panelId: panelConfig.panelId,
        imageUrl: this.generateMockImageUrl(panelConfig.panelId),
        metadata: {
          seed: panelConfig.seed,
          generationTime: this.mockDelayMs,
          qualityScore: 0.85 + Math.random() * 0.15,
          width: panelConfig.width || 512,
          height: panelConfig.height || 512,
        },
      },
    };
  }

  async batchGeneratePanels(
    request: BatchGenerationRequest
  ): Promise<ApiResponse<BatchGenerationResponse>> {
    await this.wait(this.mockDelayMs * 2);

    const results: GeneratedImage[] = [];
    const errors: Array<{ panelId: string; error: string }> = [];

    for (const panelConfig of request.panels) {
      if (Math.random() < this.mockFailureRate) {
        errors.push({
          panelId: panelConfig.panelId,
          error: 'Mock generation failure',
        });
      } else {
        results.push({
          panelId: panelConfig.panelId,
          imageUrl: this.generateMockImageUrl(panelConfig.panelId),
          metadata: {
            seed: panelConfig.seed,
            generationTime: this.mockDelayMs,
            qualityScore: 0.85 + Math.random() * 0.15,
            width: panelConfig.width || 512,
            height: panelConfig.height || 512,
          },
        });
      }
    }

    return {
      success: true,
      data: {
        batchId: `batch-${Date.now()}`,
        status: 'completed',
        totalPanels: request.panels.length,
        completedPanels: results.length,
        failedPanels: errors.length,
        results,
        errors,
      },
    };
  }

  async getBatchStatus(
    batchId: string
  ): Promise<ApiResponse<BatchGenerationResponse>> {
    await this.wait(this.mockDelayMs / 4);

    return {
      success: true,
      data: {
        batchId,
        status: 'completed',
        totalPanels: 9,
        completedPanels: 9,
        failedPanels: 0,
        results: [],
        errors: [],
      },
    };
  }

  async uploadGridConfiguration(
    _config: GridConfiguration
  ): Promise<ApiResponse<ConfigurationUploadResponse>> {
    await this.wait(this.mockDelayMs / 2);

    return {
      success: true,
      data: {
        success: true,
        configId: `config-${Date.now()}`,
        url: `/api/grid/configs/config-${Date.now()}.json`,
        timestamp: new Date().toISOString(),
      },
    };
  }

  async downloadGridConfiguration(
    _configId: string
  ): Promise<ApiResponse<GridConfiguration>> {
    await this.wait(this.mockDelayMs / 2);

    // Return a mock configuration
    return {
      success: true,
      data: {
        version: '1.0',
        projectId: 'mock-project',
        panels: [],
        presets: [],
        metadata: {
          createdAt: new Date().toISOString(),
          modifiedAt: new Date().toISOString(),
          author: 'Mock User',
        },
      },
    };
  }

  async cancelGeneration(_taskId: string): Promise<ApiResponse<void>> {
    await this.wait(this.mockDelayMs / 4);

    return {
      success: true,
    };
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private generateMockImageUrl(panelId: string): string {
    // Generate a local placeholder image as data URI to avoid CSP violations
    return getCachedPlaceholder(512, 512, `Panel ${panelId}`);
  }

  setMockDelay(ms: number): void {
    this.mockDelayMs = ms;
  }

  setMockFailureRate(rate: number): void {
    this.mockFailureRate = Math.max(0, Math.min(1, rate));
  }
}

/**
 * Create Grid API service based on environment
 */
export function createGridAPIService(
  useMock: boolean = false
): GridAPIService {
  if (useMock || import.meta.env.MODE === 'test') {
    return new MockGridAPIService();
  }
  return new GridAPIService();
}

/**
 * Default Grid API service instance
 */
export const gridApi = createGridAPIService(
  import.meta.env.MODE === 'development'
);


