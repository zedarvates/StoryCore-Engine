/**
 * ComfyUI Service for Electron Main Process
 * Handles ComfyUI server management and workflow execution
 */

import type { ComfyUIConfiguration } from '../configurationTypes';

// Simple in-memory configuration store for ComfyUI
const comfyuiConfigStore: Record<string, any> = {
  comfyui: {
    serverUrl: 'http://localhost:8188',
    defaultWorkflows: {},
    timeout: 30000,
    enableQueueMonitoring: true,
  },
};

export interface ComfyUIStatus {
  running: boolean;
  url: string | null;
  port: number | null;
  version?: string;
}

export interface WorkflowExecutionRequest {
  workflow: Record<string, any>;
  clientId?: string;
}

export class ComfyUIService {
  /**
   * Get current ComfyUI configuration
   */
  async getConfiguration(): Promise<ComfyUIConfiguration> {
    return comfyuiConfigStore.comfyui || {
      serverUrl: 'http://localhost:8188',
      defaultWorkflows: {},
      timeout: 30000,
      enableQueueMonitoring: true,
    };
  }

  /**
   * Update ComfyUI configuration
   */
  async updateConfiguration(config: Partial<ComfyUIConfiguration>): Promise<ComfyUIConfiguration> {
    const current = await this.getConfiguration();
    const updated = { ...current, ...config };
    comfyuiConfigStore.comfyui = updated;
    return updated;
  }

  /**
   * Get ComfyUI service status
   */
  async getServiceStatus(): Promise<ComfyUIStatus> {
    const config = await this.getConfiguration();
    try {
      const response = await this.fetchWithTimeout(`${config.serverUrl}/system_stats`, {
        method: 'GET',
      });

      if (!response.ok) {
        return {
          running: false,
          url: null,
          port: null,
        };
      }

      const data = (await response.json()) as any;
      const url = new URL(config.serverUrl);

      return {
        running: true,
        url: config.serverUrl,
        port: parseInt(url.port || '8188'),
        version: data.version || 'unknown',
      };
    } catch (error) {
      return {
        running: false,
        url: null,
        port: null,
      };
    }
  }

  /**
   * Test ComfyUI connection
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const status = await this.getServiceStatus();
      if (status.running) {
        return {
          success: true,
          message: `Connected to ComfyUI at ${status.url} (version: ${status.version})`,
        };
      } else {
        return {
          success: false,
          message: 'ComfyUI server is not running',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to connect to ComfyUI: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Execute a workflow on ComfyUI
   */
  async executeWorkflow(request: WorkflowExecutionRequest): Promise<{ success: boolean; queueId?: string; error?: string }> {
    try {
      const config = await this.getConfiguration();
      const response = await this.fetchWithTimeout(`${config.serverUrl}/prompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: request.clientId || 'storycore-electron',
          prompt: request.workflow,
        }),
      });

      if (!response.ok) {
        return {
          success: false,
          error: `ComfyUI returned ${response.status}`,
        };
      }

      const data = (await response.json()) as any;
      return {
        success: true,
        queueId: data.prompt_id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get queue status
   */
  async getQueueStatus(): Promise<{ success: boolean; queue?: any; error?: string }> {
    try {
      const config = await this.getConfiguration();
      const response = await this.fetchWithTimeout(`${config.serverUrl}/queue`, {
        method: 'GET',
      });

      if (!response.ok) {
        return {
          success: false,
          error: `ComfyUI returned ${response.status}`,
        };
      }

      const data = (await response.json()) as any;
      return {
        success: true,
        queue: data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Upload media to ComfyUI
   */
  async uploadMedia(filePath: string, filename: string): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      const config = await this.getConfiguration();
      const fs = await import('fs');
      const fileData = fs.readFileSync(filePath);

      const formData = new FormData();
      const blob = new Blob([fileData]);
      formData.append('image', blob, filename);

      const response = await fetch(`${config.serverUrl}/upload/image`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Upload failed with status ${response.status}`,
        };
      }

      const data = (await response.json()) as any;
      return {
        success: true,
        url: data.name,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Download output from ComfyUI
   */
  async downloadOutput(filename: string, outputPath: string): Promise<{ success: boolean; path?: string; error?: string }> {
    try {
      const config = await this.getConfiguration();
      const response = await this.fetchWithTimeout(`${config.serverUrl}/view?filename=${filename}`, {
        method: 'GET',
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Download failed with status ${response.status}`,
        };
      }

      const buffer = await response.arrayBuffer();
      const fs = await import('fs');
      fs.writeFileSync(outputPath, Buffer.from(buffer));

      return {
        success: true,
        path: outputPath,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Start ComfyUI service (if running locally)
   */
  async startService(): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      // This would need to be implemented based on how ComfyUI is deployed
      // For now, just check if it's already running
      const status = await this.getServiceStatus();
      if (status.running) {
        return {
          success: true,
          message: 'ComfyUI service is already running',
        };
      }
      return {
        success: false,
        error: 'ComfyUI service is not running. Please start it manually.',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Stop ComfyUI service (if running locally)
   */
  async stopService(): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      // This would need to be implemented based on how ComfyUI is deployed
      return {
        success: false,
        error: 'Stopping ComfyUI service is not supported in this version',
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
  private async fetchWithTimeout(url: string, options: RequestInit, timeout: number = 5000): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      return await fetch(url, {
        ...options,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    // Cleanup if needed
  }
}
