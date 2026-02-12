/**
 * ComfyUI Client
 * 
 * Handles communication with ComfyUI API for image generation and processing.
 * Supports workflow execution, image download, and storage.
 * 
 * Requirements: 3.3, 5.3, 8.2
 */

import type { ComfyUIRequest, ComfyUIResponse, ComfyUIImageOutput } from './types';
import { WizardError } from './types';
import { getLogger } from './logger';
import type { ComfyUIInstanceConfig } from '../../types/comfyui-instance';

/**
 * ComfyUI workflow template type
 */
export type WorkflowTemplateType = 'character_reference' | 'storyboard_frame' | 'style_transfer';

/**
 * ComfyUI Client Class
 */
export class ComfyUIClient {
  private config: ComfyUIInstanceConfig;
  private endpoint: string;
  private clientId: string;
  private logger = getLogger();

  constructor(config: string | ComfyUIInstanceConfig = 'http://localhost:8000') {
    // Support backward compatibility with string endpoint
    if (typeof config === 'string') {
      this.config = {
        id: 'legacy_client',
        name: 'Legacy Client',
        port: 8000, // ComfyUI Desktop default port
        host: 'localhost',
        maxConcurrentWorkflows: 1,
        timeoutMs: 300000,
        enableQueueMonitoring: true,
      };
      this.endpoint = config;
    } else {
      this.config = config;
      this.endpoint = `http://${config.host || 'localhost'}:${config.port || 8000}`;
    }

    this.clientId = this.generateClientId();
  }

  /**
   * Generate unique client ID
   */
  private generateClientId(): string {
    return `wizard_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Queue a prompt (workflow) for execution
   * 
   * @param workflow - ComfyUI workflow JSON
   * @returns Prompt ID and execution number
   */
  async queuePrompt(workflow: Record<string, unknown>): Promise<{
    promptId: string;
    number: number;
  }> {
    this.logger.info('comfyui', 'Queueing prompt', {
      clientId: this.clientId,
      workflowNodes: Object.keys(workflow).length,
    });

    const request: ComfyUIRequest = {
      prompt: workflow,
      client_id: this.clientId,
    };

    try {
      const response = await fetch(`${this.endpoint}/prompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(this.config.timeoutMs || 30000),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new WizardError(
          `ComfyUI API request failed: ${response.status} ${response.statusText}`,
          'generation',
          true,
          true,
          {
            status: response.status,
            statusText: response.statusText,
            error: errorText,
            endpoint: this.endpoint,
          }
        );
      }

      const data: ComfyUIResponse = await response.json();

      // Check for node errors
      if (data.node_errors && Object.keys(data.node_errors).length > 0) {
        this.logger.error('comfyui', 'Workflow has node errors', undefined, {
          nodeErrors: data.node_errors,
        });

        throw new WizardError(
          'ComfyUI workflow contains errors',
          'generation',
          false,
          true,
          {
            nodeErrors: data.node_errors,
          }
        );
      }

      this.logger.info('comfyui', 'Prompt queued successfully', {
        promptId: data.prompt_id,
        number: data.number,
      });

      return {
        promptId: data.prompt_id,
        number: data.number,
      };
    } catch (error) {
      if (error instanceof WizardError) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('comfyui', 'Failed to queue prompt', error as Error);

      throw new WizardError(
        `Failed to queue ComfyUI prompt: ${errorMessage}`,
        'generation',
        true,
        true,
        {
          originalError: error,
          endpoint: this.endpoint,
        }
      );
    }
  }

  /**
   * Get image from ComfyUI output
   * 
   * @param filename - Image filename
   * @param subfolder - Subfolder path
   * @param type - Image type (output, input, temp)
   * @returns Image as Blob
   */
  async getImage(
    filename: string,
    subfolder: string = '',
    type: string = 'output'
  ): Promise<Blob> {
    this.logger.info('comfyui', 'Fetching image', {
      filename,
      subfolder,
      type,
    });

    try {
      const params = new URLSearchParams({
        filename,
        subfolder,
        type,
      });

      const response = await fetch(`${this.endpoint}/view?${params.toString()}`, {
        method: 'GET',
        signal: AbortSignal.timeout(this.config.timeoutMs || 30000),
      });

      if (!response.ok) {
        throw new WizardError(
          `Failed to fetch image: ${response.status} ${response.statusText}`,
          'filesystem',
          true,
          true,
          {
            status: response.status,
            statusText: response.statusText,
            filename,
            subfolder,
            type,
          }
        );
      }

      const blob = await response.blob();

      this.logger.info('comfyui', 'Image fetched successfully', {
        filename,
        size: blob.size,
        type: blob.type,
      });

      return blob;
    } catch (error) {
      if (error instanceof WizardError) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('comfyui', 'Failed to fetch image', error as Error);

      throw new WizardError(
        `Failed to get image from ComfyUI: ${errorMessage}`,
        'filesystem',
        true,
        true,
        {
          originalError: error,
          filename,
          subfolder,
          type,
        }
      );
    }
  }

  /**
   * Download image and save to file system
   * 
   * @param filename - Image filename
   * @param savePath - Path to save the image
   * @param subfolder - Subfolder path
   * @param type - Image type
   * @returns Saved file path
   */
  async downloadImage(
    filename: string,
    savePath: string,
    subfolder: string = '',
    type: string = 'output'
  ): Promise<string> {
    this.logger.info('comfyui', 'Downloading image', {
      filename,
      savePath,
      subfolder,
      type,
    });

    try {
      const blob = await this.getImage(filename, subfolder, type);

      // In browser environment, we'll create a download link
      // In a real implementation with file system access, this would write to disk
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = savePath;
      link.click();
      URL.revokeObjectURL(url);

      this.logger.info('comfyui', 'Image downloaded successfully', {
        filename,
        savePath,
        size: blob.size,
      });

      return savePath;
    } catch (error) {
      if (error instanceof WizardError) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('comfyui', 'Failed to download image', error as Error);

      throw new WizardError(
        `Failed to download image: ${errorMessage}`,
        'filesystem',
        true,
        true,
        {
          originalError: error,
          filename,
          savePath,
        }
      );
    }
  }

  /**
   * Wait for prompt execution to complete
   * Polls the history endpoint until the prompt is done
   * 
   * @param promptId - Prompt ID to wait for
   * @param timeoutMs - Maximum time to wait in milliseconds
   * @param pollIntervalMs - Polling interval in milliseconds
   * @returns Execution history
   */
  async waitForCompletion(
    promptId: string,
    timeoutMs: number = 300000, // 5 minutes default
    pollIntervalMs: number = 1000 // 1 second default
  ): Promise<any> {
    this.logger.info('comfyui', 'Waiting for prompt completion', {
      promptId,
      timeoutMs,
      pollIntervalMs,
    });

    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      try {
        const response = await fetch(`${this.endpoint}/history/${promptId}`, {
          method: 'GET',
          signal: AbortSignal.timeout(5000), // Keep short timeout for polling
        });

        if (response.ok) {
          const history = await response.json();

          if (history[promptId]) {
            const status = history[promptId].status;

            if (status?.completed) {
              this.logger.info('comfyui', 'Prompt completed successfully', {
                promptId,
                duration: Date.now() - startTime,
              });

              return history[promptId];
            }

            if (status?.status_str === 'error') {
              throw new WizardError(
                'ComfyUI workflow execution failed',
                'generation',
                false,
                true,
                {
                  promptId,
                  error: status.messages || 'Unknown error',
                }
              );
            }
          }
        }

        // Wait before next poll
        await this.delay(pollIntervalMs);
      } catch (error) {
        if (error instanceof WizardError) {
          throw error;
        }

        // Continue polling on fetch errors
        this.logger.debug('comfyui', 'Polling error, retrying', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        await this.delay(pollIntervalMs);
      }
    }

    throw new WizardError(
      `Timeout waiting for ComfyUI prompt completion (${timeoutMs}ms)`,
      'timeout',
      true,
      true,
      {
        promptId,
        timeoutMs,
      }
    );
  }

  /**
   * Execute workflow and wait for completion
   * 
   * @param workflow - ComfyUI workflow JSON
   * @param timeoutMs - Maximum time to wait
   * @returns Execution result with output images
   */
  async executeWorkflow(
    workflow: Record<string, unknown>,
    timeoutMs: number = 300000
  ): Promise<{
    promptId: string;
    outputs: ComfyUIImageOutput[];
  }> {
    this.logger.info('comfyui', 'Executing workflow', {
      workflowNodes: Object.keys(workflow).length,
      timeoutMs,
    });

    // Queue the prompt
    const { promptId } = await this.queuePrompt(workflow);

    // Wait for completion
    const history = await this.waitForCompletion(promptId, timeoutMs);

    // Extract output images
    const outputs: ComfyUIImageOutput[] = [];

    if (history.outputs) {
      for (const nodeId of Object.keys(history.outputs)) {
        const nodeOutput = history.outputs[nodeId];

        if (nodeOutput.images) {
          for (const image of nodeOutput.images) {
            outputs.push({
              filename: image.filename,
              subfolder: image.subfolder || '',
              type: image.type || 'output',
            });
          }
        }
      }
    }

    this.logger.info('comfyui', 'Workflow executed successfully', {
      promptId,
      outputCount: outputs.length,
    });

    return {
      promptId,
      outputs,
    };
  }

  /**
   * Get workflow template for character reference generation
   * 
   * Requirements: 3.3
   */
  getCharacterReferenceTemplate(): Record<string, unknown> {
    return {
      "3": {
        "class_type": "KSampler",
        "inputs": {
          "seed": 0,
          "steps": 20,
          "cfg": 7.0,
          "sampler_name": "euler",
          "scheduler": "normal",
          "denoise": 1.0,
          "model": ["4", 0],
          "positive": ["6", 0],
          "negative": ["7", 0],
          "latent_image": ["5", 0]
        }
      },
      "4": {
        "class_type": "CheckpointLoaderSimple",
        "inputs": {
          "ckpt_name": "sd_xl_base_1.0.safetensors"
        }
      },
      "5": {
        "class_type": "EmptyLatentImage",
        "inputs": {
          "width": 1024,
          "height": 1024,
          "batch_size": 1
        }
      },
      "6": {
        "class_type": "CLIPTextEncode",
        "inputs": {
          "text": "{character_description}",
          "clip": ["4", 1]
        }
      },
      "7": {
        "class_type": "CLIPTextEncode",
        "inputs": {
          "text": "low quality, blurry, distorted, deformed",
          "clip": ["4", 1]
        }
      },
      "8": {
        "class_type": "VAEDecode",
        "inputs": {
          "samples": ["3", 0],
          "vae": ["4", 2]
        }
      },
      "9": {
        "class_type": "SaveImage",
        "inputs": {
          "filename_prefix": "character_ref",
          "images": ["8", 0]
        }
      }
    };
  }

  /**
   * Get workflow template for storyboard frame generation
   * 
   * Requirements: 5.3
   */
  getStoryboardFrameTemplate(): Record<string, unknown> {
    return {
      "3": {
        "class_type": "KSampler",
        "inputs": {
          "seed": 0,
          "steps": 25,
          "cfg": 7.5,
          "sampler_name": "euler",
          "scheduler": "normal",
          "denoise": 1.0,
          "model": ["4", 0],
          "positive": ["6", 0],
          "negative": ["7", 0],
          "latent_image": ["5", 0]
        }
      },
      "4": {
        "class_type": "CheckpointLoaderSimple",
        "inputs": {
          "ckpt_name": "sd_xl_base_1.0.safetensors"
        }
      },
      "5": {
        "class_type": "EmptyLatentImage",
        "inputs": {
          "width": 1920,
          "height": 1080,
          "batch_size": 1
        }
      },
      "6": {
        "class_type": "CLIPTextEncode",
        "inputs": {
          "text": "{shot_description}",
          "clip": ["4", 1]
        }
      },
      "7": {
        "class_type": "CLIPTextEncode",
        "inputs": {
          "text": "low quality, blurry, text, watermark, signature",
          "clip": ["4", 1]
        }
      },
      "8": {
        "class_type": "VAEDecode",
        "inputs": {
          "samples": ["3", 0],
          "vae": ["4", 2]
        }
      },
      "9": {
        "class_type": "SaveImage",
        "inputs": {
          "filename_prefix": "storyboard_frame",
          "images": ["8", 0]
        }
      }
    };
  }

  /**
   * Get workflow template for style transfer
   * 
   * Requirements: 8.2
   */
  getStyleTransferTemplate(): Record<string, unknown> {
    return {
      "3": {
        "class_type": "KSampler",
        "inputs": {
          "seed": 0,
          "steps": 20,
          "cfg": 7.0,
          "sampler_name": "euler",
          "scheduler": "normal",
          "denoise": 0.75,
          "model": ["4", 0],
          "positive": ["6", 0],
          "negative": ["7", 0],
          "latent_image": ["10", 0]
        }
      },
      "4": {
        "class_type": "CheckpointLoaderSimple",
        "inputs": {
          "ckpt_name": "sd_xl_base_1.0.safetensors"
        }
      },
      "6": {
        "class_type": "CLIPTextEncode",
        "inputs": {
          "text": "{style_description}",
          "clip": ["4", 1]
        }
      },
      "7": {
        "class_type": "CLIPTextEncode",
        "inputs": {
          "text": "low quality, blurry, distorted",
          "clip": ["4", 1]
        }
      },
      "8": {
        "class_type": "LoadImage",
        "inputs": {
          "image": "{source_image}"
        }
      },
      "9": {
        "class_type": "VAEEncode",
        "inputs": {
          "pixels": ["8", 0],
          "vae": ["4", 2]
        }
      },
      "10": {
        "class_type": "LatentUpscale",
        "inputs": {
          "samples": ["9", 0],
          "upscale_method": "nearest-exact",
          "width": 1024,
          "height": 1024,
          "crop": "disabled"
        }
      },
      "11": {
        "class_type": "VAEDecode",
        "inputs": {
          "samples": ["3", 0],
          "vae": ["4", 2]
        }
      },
      "12": {
        "class_type": "SaveImage",
        "inputs": {
          "filename_prefix": "style_transfer",
          "images": ["11", 0]
        }
      }
    };
  }

  /**
   * Get workflow template by type
   */
  getWorkflowTemplate(type: WorkflowTemplateType): Record<string, unknown> {
    switch (type) {
      case 'character_reference':
        return this.getCharacterReferenceTemplate();
      case 'storyboard_frame':
        return this.getStoryboardFrameTemplate();
      case 'style_transfer':
        return this.getStyleTransferTemplate();
      default:
        throw new Error(`Unknown workflow template type: ${type}`);
    }
  }

  /**
   * Build workflow from template with parameters
   */
  buildWorkflow(
    type: WorkflowTemplateType,
    params: Record<string, unknown>
  ): Record<string, unknown> {
    const template = this.getWorkflowTemplate(type);
    const workflow = JSON.parse(JSON.stringify(template)); // Deep clone

    // Replace placeholders in the workflow
    const workflowStr = JSON.stringify(workflow);
    let replacedStr = workflowStr;

    for (const [key, value] of Object.entries(params)) {
      const placeholder = `{${key}}`;
      replacedStr = replacedStr.replace(new RegExp(placeholder, 'g'), String(value));
    }

    return JSON.parse(replacedStr);
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Update endpoint
   */
  setEndpoint(endpoint: string): void {
    this.endpoint = endpoint;
    this.logger.info('comfyui', 'Endpoint updated', { endpoint });
  }

  /**
   * Get current endpoint
   */
  getEndpoint(): string {
    return this.endpoint;
  }

  /**
   * Get client ID
   */
  getClientId(): string {
    return this.clientId;
  }

  /**
   * Regenerate client ID
   */
  regenerateClientId(): void {
    this.clientId = this.generateClientId();
    this.logger.info('comfyui', 'Client ID regenerated', { clientId: this.clientId });
  }

  /**
   * Get client configuration
   */
  getConfig(): ComfyUIInstanceConfig {
    return { ...this.config };
  }

  /**
   * Update client configuration
   */
  updateConfig(config: Partial<ComfyUIInstanceConfig>): void {
    this.config = { ...this.config, ...config };
    this.endpoint = `http://${this.config.host || 'localhost'}:${this.config.port}`;

    this.logger.info('comfyui', 'Client configuration updated', {
      port: this.config.port,
      host: this.config.host,
      endpoint: this.endpoint,
    });
  }
}

/**
 * Singleton instance
 */
let comfyuiClientInstance: ComfyUIClient | null = null;

/**
 * Get the singleton ComfyUI client instance
 */
export function getComfyUIClient(): ComfyUIClient {
  if (!comfyuiClientInstance) {
    comfyuiClientInstance = new ComfyUIClient();
  }
  return comfyuiClientInstance;
}

/**
 * Create a new ComfyUI client instance
 */
export function createComfyUIClient(config?: string | ComfyUIInstanceConfig): ComfyUIClient {
  return new ComfyUIClient(config);
}

/**
 * Set the singleton ComfyUI client instance
 */
export function setComfyUIClient(client: ComfyUIClient): void {
  comfyuiClientInstance = client;
}

