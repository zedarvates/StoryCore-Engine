/**
 * ComfyUI Service
 * 
 * Provides integration with ComfyUI backend for image and video generation.
 * Handles connection testing, workflow management, and model preferences.
 * 
 * Validates Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
 */

import { COMFYUI_URL } from '../config/apiConfig';
import { logger } from '../utils/logger';
import { getComfyUIServersService } from './comfyuiServersService';

// ============================================================================
// Types
// ============================================================================

export type AuthenticationType = 'none' | 'basic' | 'token' | 'bearer' | 'api-key' | 'mcp';

export type WorkflowType = 'flux2' | 'z_image_turbo' | 'z_image_turbo_coherence' | 'sdxl' | 'firered_image_edit' | 'wan21_t2v' | 'wan21_i2v' | 'custom';

export interface ComfyUIConfig {
  serverUrl: string;
  authentication?: {
    type: AuthenticationType;
    username?: string;
    password?: string;
    token?: string;
  };
  server?: {
    autoStart?: boolean;
    corsHeaders?: boolean;
    gpuMemory?: number; // Manual GPU memory allocation in GB
    modelsPath?: string;
    workflowsPath?: string;
  };
  workflows: {
    imageGeneration: string;  // Workflow file for image generation
    videoGeneration: string;
    upscaling: string;
    inpainting: string;
    characterGeneration: string; // Workflow for character image generation
  };
  models: {
    preferredCheckpoint: string;
    preferredVAE: string;
    preferredCLIP?: string;
    preferredLora: string[];
  };
  performance: {
    batchSize: number;
    timeout: number;
    maxConcurrentJobs: number;
    precision?: 'FP16' | 'FP32' | 'FP8';
    steps?: number;
    denoisingStrength?: number;
  };
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  lastChecked?: Date;
  /** Selected workflow type for character image generation */
  selectedWorkflowType?: WorkflowType;
  /** Connection timeout in milliseconds */
  timeout?: number;
}

export interface ComfyUIServerInfo {
  version: string;
  availableWorkflows: WorkflowInfo[];
  availableModels: ModelInfo[];
  systemInfo: {
    gpuName: string;
    vramTotal: number;
    vramFree: number;
  };
}

export interface WorkflowInfo {
  id: string;
  name: string;
  type: 'image' | 'video' | 'upscale' | 'inpaint';
  description: string;
  requiredInputs: string[];
}

export interface ModelInfo {
  id: string;
  name: string;
  type: 'checkpoint' | 'vae' | 'lora' | 'clip' | 'controlnet';
  size: number;
  loaded: boolean;
}

// ============================================================================
// Default Configuration
// ============================================================================

export function getDefaultComfyUIConfig(): ComfyUIConfig {
  return {
    serverUrl: COMFYUI_URL, // ComfyUI Desktop default port from config
    authentication: {
      type: 'none',
    },
    server: {
      autoStart: false,
      corsHeaders: false,
      gpuMemory: undefined, // Auto-detect by default
      modelsPath: '',
      workflowsPath: '',
    },
    workflows: {
      imageGeneration: '',
      videoGeneration: '',
      upscaling: '',
      inpainting: '',
      characterGeneration: 'image_character_edit_z_turbo.json',
    },
    models: {
      preferredCheckpoint: '',
      preferredVAE: '',
      preferredCLIP: '',
      preferredLora: [],
    },
    performance: {
      batchSize: 1,
      timeout: 300000, // 5 minutes
      maxConcurrentJobs: 1,
      precision: 'FP16',
      steps: 20,
      denoisingStrength: 0.75,
    },
    connectionStatus: 'disconnected',
    selectedWorkflowType: 'z_image_turbo',
  };
}

// ============================================================================
// Mock Data for Development
// ============================================================================

const mockWorkflows: WorkflowInfo[] = [
  {
    id: 'workflow-image-gen-1',
    name: 'Standard Image Generation',
    type: 'image',
    description: 'Basic text-to-image generation workflow',
    requiredInputs: ['prompt', 'negative_prompt', 'width', 'height'],
  },
  {
    id: 'workflow-video-gen-1',
    name: 'Video Generation',
    type: 'video',
    description: 'Text-to-video generation with AnimateDiff',
    requiredInputs: ['prompt', 'negative_prompt', 'frames', 'fps'],
  },
  {
    id: 'workflow-upscale-1',
    name: '4x Upscaling',
    type: 'upscale',
    description: 'Upscale images 4x using ESRGAN',
    requiredInputs: ['image'],
  },
  {
    id: 'workflow-inpaint-1',
    name: 'Inpainting',
    type: 'inpaint',
    description: 'Fill masked areas with AI-generated content',
    requiredInputs: ['image', 'mask', 'prompt'],
  },
];

const mockModels: ModelInfo[] = [
  {
    id: 'sd15-base',
    name: 'Stable Diffusion 1.5',
    type: 'checkpoint',
    size: 4265380000,
    loaded: true,
  },
  {
    id: 'sdxl-base',
    name: 'Stable Diffusion XL Base',
    type: 'checkpoint',
    size: 6938078000,
    loaded: false,
  },
  {
    id: 'vae-ft-mse',
    name: 'VAE-ft-MSE-840000',
    type: 'vae',
    size: 334643000,
    loaded: true,
  },
  {
    id: 'clip-l',
    name: 'CLIP-L (OpenAI)',
    type: 'clip',
    size: 246144000,
    loaded: true,
  },
  {
    id: 'clip-g',
    name: 'CLIP-G (OpenCLIP)',
    type: 'clip',
    size: 1371840000,
    loaded: false,
  },
  {
    id: 'lora-detail',
    name: 'Detail Tweaker LoRA',
    type: 'lora',
    size: 144449000,
    loaded: true,
  },
];

// ============================================================================
// ComfyUI Service Class
// ============================================================================

export class ComfyUIService {
  private static instance: ComfyUIService;

  private constructor() { }

  public static getInstance(): ComfyUIService {
    if (!ComfyUIService.instance) {
      ComfyUIService.instance = new ComfyUIService();
    }
    return ComfyUIService.instance;
  }

  public getBaseUrl(): string {
    return this.getConfiguredEndpoint() || 'http://localhost:8000';
  }

  /**
   * Get available checkpoint models from ComfyUI
   */
  public async getAvailableModels(): Promise<string[]> {
    const endpoint = this.getConfiguredEndpoint();
    if (!endpoint) {
      logger.warn('[ComfyUIService] No endpoint configured');
      return [];
    }

    try {
      const response = await fetch(`${endpoint}/object_info/CheckpointLoaderSimple`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        const data = await response.json();
        const models = data?.CheckpointLoaderSimple?.input?.required?.ckpt_name?.[0] || [];
        logger.debug('[ComfyUIService] Available models:', models);
        return models;
      }
    } catch (error) {
      // Changed to info to avoid spamming the console when ComfyUI is simply not running
      logger.info('[ComfyUIService] Failed to fetch models (ComfyUI may not be running):', error);
    }

    return [];
  }

  /**
   * Get the first available checkpoint model
   */
  public async getDefaultModel(): Promise<string> {
    const models = await this.getAvailableModels();
    if (models.length > 0) {
      logger.debug('✅ [ComfyUIService] Using default model:', models[0]);
      return models[0];
    }

    // Fallback to a common model name
    logger.warn('[ComfyUIService] No models found, using fallback');
    return 'model.safetensors';
  }

  /**
   * Check if ComfyUI is configured and available
   */
  public async isAvailable(): Promise<{ available: boolean; message: string }> {
    // Check if we have a valid endpoint
    const endpoint = this.getConfiguredEndpoint();

    if (!endpoint) {
      return {
        available: false,
        message: 'ComfyUI is not configured. Please configure it in Settings > ComfyUI.'
      };
    }

    // Use Electron IPC if available to avoid browser console noise
    if (window.electronAPI?.comfyui?.getServiceStatus) {
      try {
        const electronStatus = await window.electronAPI.comfyui.getServiceStatus(endpoint);
        return { 
          available: electronStatus.running, 
          message: electronStatus.running ? 'ComfyUI is ready' : 'ComfyUI server is not reachable.' 
        };
      } catch (_err) {
        return { available: false, message: 'ComfyUI connection error.' };
      }
    }

    // Fallback to fetch (will log red error in browser console if connection refused)
    try {
      logger.debug(`🔍 [ComfyUIService] Testing availability at: ${endpoint}/system_stats`);
      const response = await fetch(`${endpoint}/system_stats`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000), // 2 second timeout
      });

      if (response.ok) {
        logger.debug(`✅ [ComfyUIService] Server reachable at ${endpoint}`);
        return { available: true, message: 'ComfyUI is ready' };
      }
      
      logger.warn(`⚠️ [ComfyUIService] Server at ${endpoint} returned status: ${response.status}`);
      return { 
        available: false, 
        message: `ComfyUI server returned status ${response.status}` 
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.debug(`❌ [ComfyUIService] Connection failed at ${endpoint}: ${errorMsg}`);
      return { 
        available: false, 
        message: 'ComfyUI server is not reachable.' 
      };
    }
  }

  /**
   * Get configured endpoint from settings or return null
   */
  private getConfiguredEndpoint(): string | null {
    // 1. Try active server from the new registry first
    try {
      const registry = getComfyUIServersService();
      const activeUrl = registry.getActiveServerUrl();
      if (activeUrl) {
        return activeUrl;
      }
    } catch (error) {
      logger.warn('[ComfyUIService] Failed to get active server from registry:', error);
    }

    // 2. Fallback to legacy localStorage settings
    try {
      const settings = localStorage.getItem('storycore-settings');
      if (settings) {
        const parsed = JSON.parse(settings);
        if (parsed.comfyui?.config?.serverUrl) {
          return parsed.comfyui.config.serverUrl;
        }
      }
    } catch (error) {
      logger.warn('[ComfyUIService] Failed to read legacy ComfyUI settings:', error);
    }

    // 3. Ultimate Fallback to default port 8000
    // We use 127.0.0.1 instead of localhost for better predictability across OSes
    return 'http://127.0.0.1:8000';
  }

  /**
   * Get active server settings if available
   */
  public getActiveServerSettings() {
    try {
      return getComfyUIServersService().getActiveServer();
    } catch {
      return null;
    }
  }

  public async generateImage(params: {
    prompt: string;
    negativePrompt?: string;
    width: number;
    height: number;
    steps: number;
    cfgScale: number;
    seed?: number;
    model: string;
    sampler: string;
    scheduler: string;
  }, onProgress?: (progress: number, message: string) => void): Promise<string> {
    return this.generateAsset('image', params, onProgress);
  }

  /**
   * Upscale an existing image using ComfyUI
   */
  public async upscaleImage(params: {
    imagePath: string; // Path relative to project or absolute if ComfyUI input dir
    upscaleFactor?: number; // 2, 4, etc.
    modelName?: string; // e.g., 'RealESRGAN_x4plus.safetensors'
  }, onProgress?: (progress: number, message: string) => void): Promise<string> {
    logger.debug('🚀 [ComfyUIService] Starting image upscaling');
    return this.generateAsset('upscale', params, onProgress);
  }

  /**
   * Generate video using ComfyUI
   */
  public async generateVideo(params: {
    inputImagePath: string;
    prompt: string;
    frameCount: number;
    frameRate: number;
    width: number;
    height: number;
    motionStrength: number;
  }, onProgress?: (progress: number, message: string) => void): Promise<string> {
    logger.debug('🚀 [ComfyUIService] Starting video generation');
    return this.generateAsset('video', params, onProgress);
  }

  /**
   * Generic asset generation helper
   */
  private async generateAsset(type: 'image' | 'video' | 'upscale', params: unknown, onProgress?: (progress: number, message: string) => void): Promise<string> {
    const endpoint = this.getConfiguredEndpoint();
    if (!endpoint) throw new Error('ComfyUI endpoint not configured');

    const availability = await this.isAvailable();
    if (!availability.available) throw new Error(availability.message);

    const activeServer = this.getActiveServerSettings();
    const serverPerformance = activeServer?.performance || {};
    const inputParams = params as Record<string, unknown>;
    
    // Merge performance defaults from server
    const effectiveParams: Record<string, unknown> = {
      ...inputParams,
      steps: (inputParams.steps as number) || serverPerformance.steps || 20,
      denoise: (inputParams.denoise as number) || serverPerformance.denoisingStrength || 1.0,
      batchSize: (inputParams.batchSize as number) || serverPerformance.batchSize || 1,
      cfgScale: (inputParams.cfgScale as number) || 1.0,
    };

     const workflowType = inputParams.workflowType as string || (type === 'upscale' ? 'upscale' : 'flux-turbo');
     
     let workflow: Record<string, unknown>;
     
     if (type === 'image') {
       workflow = workflowType === 'flux-turbo' 
         ? this.buildFluxTurboWorkflow(effectiveParams as Parameters<typeof ComfyUIService.prototype.buildFluxTurboWorkflow>[0]) 
         : this.buildSimpleWorkflow(effectiveParams as Parameters<typeof ComfyUIService.prototype.buildSimpleWorkflow>[0]);
     } else if (type === 'video') {
       workflow = this.buildVideoWorkflow(effectiveParams);
     } else {
       workflow = this.buildUpscaleWorkflow(effectiveParams as { imagePath: string; upscaleFactor?: number; modelName?: string });
     }
 
     logger.debug(`🏗️ [ComfyUIService] Built ${workflowType} workflow for ${type}`);

    const imageSize = type === 'image'
      ? {
        width: (params as { width: number }).width,
        height: (params as { height: number }).height
      }
      : undefined;

    // Handle MCP execution if enabled
    if (activeServer?.authentication?.type === 'mcp') {
      try {
        // Resolve tool name from server config mapping
        const toolMapping = activeServer.mcpConfig?.toolMappings;
        let toolName = 'execute_workflow'; // Default
        
        if (type === 'image') toolName = toolMapping?.imageGeneration || 'execute_workflow';
        else if (type === 'video') toolName = toolMapping?.videoGeneration || 'execute_workflow';
        else if (type === 'upscale') toolName = toolMapping?.upscaling || 'execute_workflow';

        logger.debug(`🛠️ [ComfyUIService] Calling MCP tool: ${toolName} for task: ${type}`);

        const result = await window.electronAPI.comfyui.callTool(activeServer.id, toolName, {
          workflow,
          client_id: `${type}_gen_${Date.now()}`
        });
        
        if (result && result.prompt_id) {
          return this.waitForImage(endpoint, result.prompt_id, 600000, onProgress, imageSize);
        } else {
          throw new Error('MCP execution returned no prompt_id');
        }
      } catch (mcpError) {
        logger.error('[ComfyUIService] MCP execution failed:', mcpError);
        throw new Error(`MCP execution failed: ${mcpError instanceof Error ? mcpError.message : String(mcpError)}`);
      }
    }

    const response = await fetch(`${endpoint}/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: workflow,
        client_id: `${type}_gen_${Date.now()}`,
      }),
    });

    if (!response.ok) throw new Error(`ComfyUI ${type} request failed: ${response.status}`);

    const data = await response.json();

    return this.waitForImage(endpoint, data.prompt_id, 600000, onProgress, imageSize);
  }

  private buildVideoWorkflow(params: unknown): Record<string, unknown> {
    // Check if it's a Wan 2.1 request
    const p = params as Record<string, unknown>;
    if (p.modelType === 'wan21') {
      return this.buildWan21Workflow(p as { prompt: string; inputImage?: string; width: number; height: number; frames: number; motionStrength: number });
    }

    // Fallback placeholder...
    return {
      "3": {
        "inputs": {
          "seed": Math.floor(Math.random() * 1000000),
          "steps": 20,
          "cfg": 2.5,
          "sampler_name": "euler",
          "scheduler": "karras",
          "denoise": 1,
          "model": ["4", 0],
          "positive": ["6", 0],
          "negative": ["7", 0],
          "latent_image": ["5", 0]
        },
        "class_type": "KSampler"
      },
    };
  }

  /**
   * Build Wan 2.1 Video Workflow
   * Supports T2V and I2V (image-to-video)
   */
  private buildWan21Workflow(params: {
    prompt: string;
    inputImage?: string;
    width: number;
    height: number;
    frames: number;
    motionStrength: number;
  }): Record<string, unknown> {
    const seed = Math.floor(Math.random() * 1000000);

    return {
      "1": {
        "inputs": {
          "unet_name": "wan2.1_t2v_1.3b_bf16.safetensors",
          "weight_dtype": "default"
        },
        "class_type": "UNETLoader"
      },
      "2": {
        "inputs": {
          "vae_name": "wan2.1_vae.safetensors"
        },
        "class_type": "VAELoader"
      },
      "3": {
        "inputs": {
          "text": params.prompt,
          "clip": ["1", 1]
        },
        "class_type": "CLIPTextEncode"
      },
      "4": {
        "inputs": {
          "width": params.width,
          "height": params.height,
          "length": params.frames,
          "batch_size": 1
        },
        "class_type": "EmptyLatentImage"
      },
      "5": {
        "inputs": {
          "seed": seed,
          "steps": 30,
          "cfg": 6.0,
          "sampler_name": "uni_pc",
          "scheduler": "wan_noise",
          "denoise": 1.0,
          "model": ["1", 0],
          "positive": ["3", 0],
          "negative": ["6", 0],
          "latent_image": ["4", 0]
        },
        "class_type": "KSampler"
      },
      "6": {
        "inputs": {
          "text": "low quality, blurry, distorted misaligned limbs, extra fingers",
          "clip": ["1", 1]
        },
        "class_type": "CLIPTextEncode"
      },
      "7": {
        "inputs": {
          "samples": ["5", 0],
          "vae": ["2", 0]
        },
        "class_type": "VAEDecode"
      },
      "8": {
        "inputs": {
          "filename_prefix": "wan2.1_gen",
          "images": ["7", 0]
        },
        "class_type": "SaveImage"
      }
    };
  }

  /**
   * Build Flux Turbo workflow (Z-Image Turbo)
   * Uses UNETLoader + CLIPLoader + VAELoader separately
   */
  private buildFluxTurboWorkflow(params: {
    prompt: string;
    negativePrompt?: string;
    width: number;
    height: number;
    steps: number;
    cfgScale: number;
    seed?: number;
  }): Record<string, unknown> {
    const seed = params.seed || Math.floor(Math.random() * 1000000);
    const activeServer = this.getActiveServerSettings();

    return {
      "9": {
        "inputs": {
          "filename_prefix": "character_portrait",
          "images": ["57:8", 0]
        },
        "class_type": "SaveImage",
        "_meta": { "title": "Save Image" }
      },
      "58": {
        "inputs": {
          "value": params.prompt
        },
        "class_type": "PrimitiveStringMultiline",
        "_meta": { "title": "Prompt" }
      },
      "57:30": {
        "inputs": {
          "clip_name": "qwen_3_4b.safetensors",
          "type": "lumina2",
          "device": "default"
        },
        "class_type": "CLIPLoader",
        "_meta": { "title": "Load CLIP" }
      },
      "57:29": {
        "inputs": {
          "vae_name": activeServer?.models?.preferredVAE || "ae.safetensors"
        },
        "class_type": "VAELoader",
        "_meta": { "title": "Load VAE" }
      },
      "57:33": {
        "inputs": {
          "conditioning": ["57:27", 0]
        },
        "class_type": "ConditioningZeroOut",
        "_meta": { "title": "ConditioningZeroOut" }
      },
      "57:8": {
        "inputs": {
          "samples": ["57:3", 0],
          "vae": ["57:29", 0]
        },
        "class_type": "VAEDecode",
        "_meta": { "title": "VAE Decode" }
      },
      "57:28": {
        "inputs": {
          "unet_name": activeServer?.models?.preferredCheckpoint || "z_image_turbo_bf16.safetensors",
          "weight_dtype": activeServer?.performance?.precision === 'FP8' ? "fp8_e4m3fn" : "default"
        },
        "class_type": "UNETLoader",
        "_meta": { "title": "Load Diffusion Model" }
      },
      "57:27": {
        "inputs": {
          "text": ["58", 0],
          "clip": ["57:30", 0]
        },
        "class_type": "CLIPTextEncode",
        "_meta": { "title": "CLIP Text Encode (Prompt)" }
      },
      "57:13": {
        "inputs": {
          "width": params.width,
          "height": params.height,
          "batch_size": 1
        },
        "class_type": "EmptyLatentImage",
        "_meta": { "title": "EmptySD3LatentImage" }
      },
      "57:3": {
        "inputs": {
          "seed": seed,
          "steps": params.steps,
          "cfg": params.cfgScale,
          "sampler_name": "res_multistep",
          "scheduler": "simple",
          "denoise": 1,
          "model": ["57:11", 0],
          "positive": ["57:27", 0],
          "negative": ["57:33", 0],
          "latent_image": ["57:13", 0]
        },
        "class_type": "KSampler",
        "_meta": { "title": "KSampler" }
      },
      "57:11": {
        "inputs": {
          "shift": 3,
          "model": ["57:28", 0]
        },
        "class_type": "ModelSamplingAuraFlow",
        "_meta": { "title": "ModelSamplingAuraFlow" }
      }
    };
  }

  /**
   * Build Upscale Workflow (ESRGAN based)
   */
  private buildUpscaleWorkflow(params: {
    imagePath: string;
    upscaleFactor?: number;
    modelName?: string;
  }): Record<string, unknown> {
    const modelName = params.modelName || 'RealESRGAN_x4plus.safetensors';
    
    return {
      "1": {
        "inputs": {
          "image": params.imagePath
        },
        "class_type": "LoadImage"
      },
      "2": {
        "inputs": {
          "upscale_model": ["3", 0],
          "image": ["1", 0]
        },
        "class_type": "ImageUpscaleWithModel"
      },
      "3": {
        "inputs": {
          "model_name": modelName
        },
        "class_type": "UpscaleModelLoader"
      },
      "4": {
        "inputs": {
          "filename_prefix": "upscaled_portrait",
          "images": ["2", 0]
        },
        "class_type": "SaveImage"
      }
    };
  }

  /**
   * Build a simple ComfyUI workflow for text-to-image
   */
  private buildSimpleWorkflow(params: {
    prompt: string;
    negativePrompt?: string;
    width: number;
    height: number;
    steps: number;
    cfgScale: number;
    seed?: number;
    model: string;
    sampler: string;
    scheduler: string;
  }): Record<string, unknown> {
    const seed = params.seed || Math.floor(Math.random() * 1000000);

    return {
      "3": {
        "inputs": {
          "seed": seed,
          "steps": params.steps,
          "cfg": params.cfgScale,
          "sampler_name": params.sampler,
          "scheduler": params.scheduler,
          "denoise": 1,
          "model": ["4", 0],
          "positive": ["6", 0],
          "negative": ["7", 0],
          "latent_image": ["5", 0]
        },
        "class_type": "KSampler"
      },
      "4": {
        "inputs": {
          "ckpt_name": params.model
        },
        "class_type": "CheckpointLoaderSimple"
      },
      "5": {
        "inputs": {
          "width": params.width,
          "height": params.height,
          "batch_size": 1
        },
        "class_type": "EmptyLatentImage"
      },
      "6": {
        "inputs": {
          "text": params.prompt,
          "clip": ["4", 1]
        },
        "class_type": "CLIPTextEncode"
      },
      "7": {
        "inputs": {
          "text": params.negativePrompt || "",
          "clip": ["4", 1]
        },
        "class_type": "CLIPTextEncode"
      },
      "8": {
        "inputs": {
          "samples": ["3", 0],
          "vae": ["4", 2]
        },
        "class_type": "VAEDecode"
      },
      "9": {
        "inputs": {
          "filename_prefix": "character_portrait",
          "images": ["8", 0]
        },
        "class_type": "SaveImage"
      }
    };
  }

  /**
   * Calculate adaptive timeout based on image size in megapixels
   * @param width Image width in pixels
   * @param height Image height in pixels
   * @returns Timeout in milliseconds
   */
  private calculateAdaptiveTimeout(width?: number, height?: number): number {
    if (!width || !height) {
      return 600000; // 10 minutes default if size unknown
    }

    const megapixels = (width * height) / 1000000;

    if (megapixels <= 1) {
      return 300000; // 5 minutes for 1MP or less
    } else if (megapixels <= 2) {
      return 480000; // 8 minutes for 1-2MP
    } else {
      return 600000; // 10 minutes for 2+MP
    }
  }

  /**
   * Wait for image generation to complete and return the image URL
   * @param endpoint ComfyUI endpoint URL
   * @param promptId The prompt ID to wait for
   * @param maxWait Maximum wait time in milliseconds (default: 10 minutes)
   * @param onProgress Optional progress callback
   * @param imageSize Optional image size for adaptive timeout calculation
   */
  private async waitForImage(
    endpoint: string,
    promptId: string,
    maxWait: number = 600000,
    onProgress?: (progress: number, message: string) => void,
    imageSize?: { width: number; height: number }
  ): Promise<string> {
    const startTime = Date.now();
    let lastProgress = 0;
    let lastProgressTime = Date.now();
    let effectiveMaxWait = maxWait;

    // Apply adaptive timeout based on image size if provided
    if (imageSize) {
      effectiveMaxWait = this.calculateAdaptiveTimeout(imageSize.width, imageSize.height);
      logger.debug(`⏱️ [ComfyUIService] Adaptive timeout: ${effectiveMaxWait}ms for ${imageSize.width}x${imageSize.height} image`);
    }

    logger.debug('⏱️ [ComfyUIService] Starting to wait for image...');

    while (Date.now() - startTime < effectiveMaxWait) {
      try {
        // Check history for completed prompt
        const historyResponse = await fetch(`${endpoint}/history/${promptId}`);

        if (historyResponse.ok) {
          const history = await historyResponse.json();

          if (history[promptId] && history[promptId].outputs) {
            onProgress?.(100, 'Image generated successfully');
            const outputs = history[promptId].outputs;

            for (const nodeId in outputs) {
              if (outputs[nodeId].images && outputs[nodeId].images.length > 0) {
                const image = outputs[nodeId].images[0];
                const imageUrl = `${endpoint}/view?filename=${image.filename}&subfolder=${image.subfolder || ''}&type=${image.type || 'output'}`;
                logger.debug('✅ [ComfyUIService] Final image URL:', imageUrl);
                return imageUrl;
              }
            }
          } else {
            // If not in history yet, it might be in the queue
            try {
              const queueResponse = await fetch(`${endpoint}/queue`);
              if (queueResponse.ok) {
                const queueData = await queueResponse.json();
                const running: unknown[] = queueData.queue_running || [];
                const pending: unknown[] = queueData.queue_pending || [];

                const isRunning = running.some((item) => Array.isArray(item) && item[1] === promptId);
                const isPending = pending.some((item) => Array.isArray(item) && item[1] === promptId);

                if (isRunning) {
                  const currentProgress = 50;

                  // Extend timeout if progress is being made (30 seconds per progress update)
                  if (currentProgress > lastProgress) {
                    const now = Date.now();
                    // Only extend if at least 5 seconds have passed since last progress
                    if (now - lastProgressTime > 5000) {
                      effectiveMaxWait += 30000; // Add 30 seconds
                      lastProgress = currentProgress;
                      lastProgressTime = now;
                      logger.debug(`⏱️ [ComfyUIService] Progress detected, extended timeout to ${effectiveMaxWait}ms`);
                    }
                  }

                  onProgress?.(currentProgress, 'Processing in ComfyUI...');
                } else if (isPending) {
                  onProgress?.(10, 'Queued in ComfyUI...');
                }
              }
            } catch (queueError) {
              logger.warn('[ComfyUIService] Failed to check queue:', queueError);
            }
          }
        }

        // Wait before checking again
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError') || errorMsg.includes('ERR_CONNECTION_REFUSED')) {
          logger.error('❌ [ComfyUIService] Connection lost during image polling:', error);
          throw new Error('Connection to ComfyUI lost. The server may have crashed or was closed.');
        }
        logger.error('[ComfyUIService] Error checking image status:', error);
      }
    }

    logger.error('[ComfyUIService] Image generation timed out after', effectiveMaxWait, 'ms');
    throw new Error('Image generation timed out');
  }
}

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Validate URL format
 * Validates Requirements: 4.2
 */
export function validateUrl(url: string): { valid: boolean; error?: string } {
  if (!url) {
    return { valid: false, error: 'Server URL is required' };
  }

  try {
    const parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return { valid: false, error: 'Server URL must use HTTP or HTTPS protocol' };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid server URL format' };
  }
}

/**
 * Build request headers with authentication
 */
function buildHeaders(auth?: ComfyUIConfig['authentication']): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (auth?.type === 'basic' && auth.username && auth.password) {
    const credentials = btoa(`${auth.username}:${auth.password}`);
    headers['Authorization'] = `Basic ${credentials}`;
  } else if ((auth?.type === 'token' || auth?.type === 'bearer') && auth.token) {
    headers['Authorization'] = `Bearer ${auth.token}`;
  } else if (auth?.type === 'api-key' && auth.token) {
    headers['X-Api-Key'] = auth.token;
  }

  return headers;
}

/**
 * Parse system stats from ComfyUI server
 * Validates Requirements: 4.3
 */
interface ComfyUISystemStats {
  system?: {
    os?: string;
    python_version?: string;
    pytorch_version?: string;
  };
  devices?: Array<{
    name?: string;
    type?: string;
    vram_total?: number;
    vram_free?: number;
  }>;
}

function parseSystemInfo(stats: ComfyUISystemStats): ComfyUIServerInfo['systemInfo'] {
  // Try to find GPU device info
  const gpuDevice = stats.devices?.find(d => d.type === 'cuda' || d.type === 'gpu') || stats.devices?.[0];

  return {
    gpuName: gpuDevice?.name || 'Unknown GPU',
    vramTotal: gpuDevice?.vram_total || 0,
    vramFree: gpuDevice?.vram_free || 0,
  };
}

/**
 * Fetch available workflows from ComfyUI server
 * Validates Requirements: 4.3
 */
async function fetchWorkflows(): Promise<WorkflowInfo[]> {
  // ComfyUI doesn't have a standard workflows endpoint, so we return mock data
  // In a real implementation, this would query a custom endpoint or workflow directory
  return mockWorkflows;
}

/**
 * Fetch available models from ComfyUI server
 * Validates Requirements: 4.3
 */
async function fetchModels(
  serverUrl: string,
  auth?: ComfyUIConfig['authentication']
): Promise<ModelInfo[]> {
  try {
    // Try to fetch model list from ComfyUI
    // ComfyUI has endpoints like /object_info that list available nodes and models
    const response = await fetch(`${serverUrl}/object_info`, {
      headers: buildHeaders(auth),
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      await response.json();
      // Parse model information from object_info
      // This is a simplified version - real implementation would parse the full structure
      return mockModels;
    }
  } catch (error) {
    logger.warn('[ComfyUIService] Failed to fetch models, using defaults:', error);
  }

  return mockModels;
}

/**
 * Test connection to ComfyUI server with health check
 * Validates Requirements: 4.2, 4.3, 4.4, 4.5
 * 
 * Note: ComfyUI is an OPTIONAL service. Connection failures should be handled gracefully
 * and should NOT produce console errors when the service is simply not running.
 */
export async function testComfyUIConnection(
  config: Partial<ComfyUIConfig>
): Promise<{ success: boolean; message: string; serverInfo?: ComfyUIServerInfo; isOffline?: boolean }> {
  // Validate URL format first
  if (!config.serverUrl) {
    return {
      success: false,
      message: 'Server URL is required',
    };
  }

  const urlValidation = validateUrl(config.serverUrl);
  if (!urlValidation.valid) {
    return {
      success: false,
      message: urlValidation.error || 'Invalid URL',
    };
  }

  // Check if we're online first - avoid unnecessary network errors
  if (!navigator.onLine) {
    return {
      success: false,
      message: 'Offline - ComfyUI connection will be retried when online.',
    };
  }

  try {
    // Handle MCP connection type
    if (config.authentication?.type === 'mcp') {
      return {
        success: true,
        message: 'Comfy-MCP connection configured. Ready for agentic workflows.',
        serverInfo: {
          version: 'MCP-Bridge',
          availableWorkflows: [],
          availableModels: [],
          systemInfo: { gpuName: 'MCP-Network', vramTotal: 0, vramFree: 0 }
        }
      };
    }

    // Build request headers with authentication
    const headers = buildHeaders(config.authentication);

    // Attempt to fetch system stats from ComfyUI
    // This is the primary health check endpoint
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout (reduced for faster feedback)

    // Use Electron IPC as a pre-check if available to avoid red logs in browser console
    if (window.electronAPI?.comfyui?.getServiceStatus) {
      try {
        const status = await window.electronAPI.comfyui.getServiceStatus();
        if (!status.running) {
           clearTimeout(timeoutId);
           return { success: false, message: `ComfyUI server is not running`, isOffline: true };
        }
      } catch (_err) {
        // Fall through to fetch if IPC fails
      }
    }

    try {
      const response = await fetch(`${config.serverUrl}/system_stats`, {
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Handle specific HTTP errors
        if (response.status === 401 || response.status === 403) {
          return {
            success: false,
            message: 'Authentication failed. Please check your credentials.',
          };
        } else if (response.status === 404) {
          return {
            success: false,
            message: 'ComfyUI server found but /system_stats endpoint not available. Server may be outdated.',
          };
        } else {
          return {
            success: false,
            message: `Server returned error: ${response.status} ${response.statusText}`,
          };
        }
      }

      // Parse system stats
      const stats: ComfyUISystemStats = await response.json();
      const systemInfo = parseSystemInfo(stats);

      // Fetch workflows and models
      const [workflows, models] = await Promise.all([
        fetchWorkflows(),
        fetchModels(config.serverUrl, config.authentication),
      ]);

      // Determine version from system info or default
      const version = stats.system?.pytorch_version || '0.1.0';

      return {
        success: true,
        message: 'Connected successfully to ComfyUI server',
        serverInfo: {
          version,
          availableWorkflows: workflows,
          availableModels: models,
          systemInfo,
        },
      };
    } catch (fetchError) {
      clearTimeout(timeoutId);

      // Handle fetch-specific errors silently (ComfyUI is optional)
      // These are EXPECTED errors when ComfyUI is not running - do not log as errors
      if (fetchError instanceof Error) {
        if (fetchError.name === 'AbortError') {
          return {
            success: false,
            message: 'Connection timeout. Server took too long to respond (>5s).',
          };
        } else if (
          fetchError.message.includes('Failed to fetch') || 
          fetchError.message.includes('NetworkError') ||
          fetchError.message.includes('ERR_CONNECTION_REFUSED') ||
          fetchError.message.includes('Network request failed')
        ) {
          // ComfyUI is not running - this is expected and OK for optional service
          // Return silently without logging - this is a normal state
          return {
            success: false,
            message: 'ComfyUI is not running. Start ComfyUI to enable image generation features.',
            isOffline: true,
          };
        }
      }

      // Log unexpected errors at debug level only (not console.error)
      logger.debug('[ComfyUIService] Connection test failed - this is normal for optional service');
      return {
        success: false,
        message: 'Cannot reach ComfyUI server. Service is optional.',
        isOffline: true,
      };
    }
  } catch {
    // Handle unexpected errors gracefully (ComfyUI is optional)
    // Don't log to console - this is expected for optional service
    logger.debug('[ComfyUIService] Connection test error - service is optional');
    return {
      success: false,
      message: 'ComfyUI connection failed. Service is optional.',
      isOffline: true,
    };
  }
}

/**
 * Get available workflows from server
 * Validates Requirements: 4.3
 */
export async function getAvailableWorkflows(): Promise<WorkflowInfo[]> {
  return fetchWorkflows();
}

/**
 * Get available models from server
 * Validates Requirements: 4.3
 */
export async function getAvailableModels(
  serverUrl: string,
  auth?: ComfyUIConfig['authentication']
): Promise<ModelInfo[]> {
  return fetchModels(serverUrl, auth);
}

/**
 * Get connection diagnostics for troubleshooting
 * Validates Requirements: 4.5
 */
export interface ConnectionDiagnostics {
  urlValid: boolean;
  urlError?: string;
  serverReachable: boolean;
  authenticationValid: boolean;
  endpointsAvailable: {
    systemStats: boolean;
    prompt: boolean;
    objectInfo: boolean;
  };
  responseTime?: number;
  errorDetails?: string;
  suggestions: string[];
}

export async function getConnectionDiagnostics(
  config: Partial<ComfyUIConfig>
): Promise<ConnectionDiagnostics> {
  const diagnostics: ConnectionDiagnostics = {
    urlValid: false,
    serverReachable: false,
    authenticationValid: false,
    endpointsAvailable: {
      systemStats: false,
      prompt: false,
      objectInfo: false,
    },
    suggestions: [],
  };

  // Step 1: Validate URL
  if (!config.serverUrl) {
    diagnostics.urlError = 'Server URL is required';
    diagnostics.suggestions.push('Enter a valid ComfyUI server URL (e.g., http://localhost:8000)');
    return diagnostics;
  }

  const urlValidation = validateUrl(config.serverUrl);
  diagnostics.urlValid = urlValidation.valid;
  diagnostics.urlError = urlValidation.error;

  if (!urlValidation.valid) {
    diagnostics.suggestions.push('Check that the URL format is correct (must start with http:// or https://)');
    return diagnostics;
  }

  // Step 2: Test server reachability
  const startTime = Date.now();
  try {
    const headers = buildHeaders(config.authentication);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(`${config.serverUrl}/system_stats`, {
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      diagnostics.responseTime = Date.now() - startTime;
      diagnostics.serverReachable = true;

      if (response.status === 401 || response.status === 403) {
        diagnostics.authenticationValid = false;
        diagnostics.errorDetails = 'Authentication failed';
        diagnostics.suggestions.push('Check your username/password or token');
        diagnostics.suggestions.push('Verify that authentication is required for this server');
      } else if (response.ok) {
        diagnostics.authenticationValid = true;
        diagnostics.endpointsAvailable.systemStats = true;
      } else {
        diagnostics.errorDetails = `Server returned ${response.status}: ${response.statusText}`;
        diagnostics.suggestions.push('Server is reachable but returned an error');
        diagnostics.suggestions.push('Check ComfyUI server logs for details');
      }
    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        diagnostics.errorDetails = 'Connection timeout';
        diagnostics.suggestions.push('Server is not responding within 5 seconds');
        diagnostics.suggestions.push('Check if ComfyUI is running and not overloaded');
      } else {
        throw fetchError;
      }
    }

    // Step 3: Test other endpoints if server is reachable
    if (diagnostics.serverReachable && diagnostics.authenticationValid) {
      // Test /prompt endpoint
      try {
        const promptResponse = await fetch(`${config.serverUrl}/prompt`, {
          method: 'GET',
          headers,
          signal: AbortSignal.timeout(3000),
        });
        diagnostics.endpointsAvailable.prompt = promptResponse.ok || promptResponse.status === 405; // 405 = Method Not Allowed is OK
      } catch {
        // Endpoint not available
      }

      // Test /object_info endpoint
      try {
        const objectInfoResponse = await fetch(`${config.serverUrl}/object_info`, {
          headers,
          signal: AbortSignal.timeout(3000),
        });
        diagnostics.endpointsAvailable.objectInfo = objectInfoResponse.ok;
      } catch {
        // Endpoint not available
      }
    }
  } catch (error) {
    diagnostics.serverReachable = false;

    if (error instanceof Error) {
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        diagnostics.errorDetails = 'Cannot reach server';
        diagnostics.suggestions.push('Check that ComfyUI is running on the specified URL');
        diagnostics.suggestions.push('Verify there are no firewall or network issues');
        diagnostics.suggestions.push('Try accessing the URL in your browser');
      } else {
        diagnostics.errorDetails = error.message;
        diagnostics.suggestions.push('Unexpected error occurred');
        diagnostics.suggestions.push('Check browser console for details');
      }
    }
  }

  // Add general suggestions if connection failed
  if (!diagnostics.serverReachable) {
    diagnostics.suggestions.push('Ensure ComfyUI is installed and running');
    diagnostics.suggestions.push('Default ComfyUI URL is http://127.0.0.1:8000');
  }

  return diagnostics;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Format VRAM for display
 */
export function formatVRAM(mb: number): string {
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(1)} GB`;
  }
  return `${mb} MB`;
}

// Export singleton instance
export const comfyuiService = ComfyUIService.getInstance();



