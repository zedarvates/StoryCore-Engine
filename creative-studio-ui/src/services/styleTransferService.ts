/**
 * Style Transfer Service
 * 
 * Handles API communication for style transfer operations
 * Connects frontend UI to the Python backend wizard
 */

import {
  StyleTransferMode,
  WorkflowConfig,
  PromptConfig,
  VideoConfig,
  StyleTransferResult,
  StyleTransferProgress,
  DEFAULT_WORKFLOW_CONFIG,
  DEFAULT_PROMPT_CONFIG
} from '../types/styleTransfer';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface StyleTransferRequest {
  mode: StyleTransferMode;
  sourceImage: File;
  styleImage?: File;
  config: WorkflowConfig | PromptConfig | VideoConfig;
}

export interface StyleTransferOptions {
  onProgress?: (progress: StyleTransferProgress) => void;
  onComplete?: (result: StyleTransferResult) => void;
  onError?: (error: string) => void;
}

/**
 * Execute style transfer in workflow mode
 */
export async function executeWorkflowTransfer(
  sourceImage: File,
  styleImage: File,
  config: WorkflowConfig,
  options?: StyleTransferOptions
): Promise<StyleTransferResult> {
  const formData = new FormData();
  formData.append('mode', 'workflow');
  formData.append('source_image', sourceImage);
  formData.append('style_image', styleImage);
  formData.append('config', JSON.stringify(config));

  return executeTransfer(formData, options);
}

/**
 * Execute style transfer in prompt mode
 */
export async function executePromptTransfer(
  sourceImage: File,
  config: PromptConfig,
  options?: StyleTransferOptions
): Promise<StyleTransferResult> {
  const formData = new FormData();
  formData.append('mode', 'prompt');
  formData.append('source_image', sourceImage);
  formData.append('config', JSON.stringify(config));

  return executeTransfer(formData, options);
}

/**
 * Execute style transfer in video mode
 */
export async function executeVideoTransfer(
  sourceVideo: File,
  referenceImage: File,
  config: VideoConfig,
  options?: StyleTransferOptions
): Promise<StyleTransferResult> {
  const formData = new FormData();
  formData.append('mode', 'video');
  formData.append('source_video', sourceVideo);
  formData.append('reference_image', referenceImage);
  formData.append('config', JSON.stringify(config));

  return executeTransfer(formData, options);
}

/**
 * Core transfer execution with progress tracking
 */
async function executeTransfer(
  formData: FormData,
  options?: StyleTransferOptions
): Promise<StyleTransferResult> {
  try {
    // Start the transfer
    const response = await fetch(`${API_BASE_URL}/api/style-transfer`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Transfer failed: ${error}`);
    }

    const result: StyleTransferResult = await response.json();
    
    if (result.success) {
      options?.onComplete?.(result);
    } else {
      options?.onError?.(result.error || 'Unknown error');
    }

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Transfer failed';
    options?.onError?.(errorMessage);
    throw error;
  }
}

/**
 * Check the status of a running transfer
 */
export async function checkTransferStatus(
  jobId: string
): Promise<StyleTransferProgress | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/style-transfer/status/${jobId}`);
    
    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to check transfer status:', error);
    return null;
  }
}

/**
 * Cancel a running transfer
 */
export async function cancelTransfer(jobId: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/style-transfer/cancel/${jobId}`, {
      method: 'POST',
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to cancel transfer:', error);
    return false;
  }
}

/**
 * Get available style presets
 */
export function getStylePresets(): Record<string, { name: string; description: string; prompt: string }> {
  return {
    photorealistic: {
      name: 'Photorealistic',
      description: 'Ultra-realistic photography style',
      prompt: 'photorealistic, highly detailed, 8k resolution, professional photography, sharp focus, natural lighting'
    },
    cinematic: {
      name: 'Cinematic',
      description: 'Movie-like cinematic look',
      prompt: 'cinematic lighting, film grain, anamorphic lens, color grading, dramatic atmosphere, movie still'
    },
    anime: {
      name: 'Anime',
      description: 'Japanese animation style',
      prompt: 'anime style, cel shading, vibrant colors, clean lines, studio ghibli inspired, detailed background'
    },
    oil_painting: {
      name: 'Oil Painting',
      description: 'Classic oil painting aesthetic',
      prompt: 'oil painting, rich textures, visible brushstrokes, classical art style, canvas texture, artistic masterpiece'
    },
    cyberpunk: {
      name: 'Cyberpunk',
      description: 'Futuristic cyberpunk aesthetic',
      prompt: 'cyberpunk style, neon lights, futuristic city, high tech, dystopian atmosphere, glowing accents'
    },
    watercolor: {
      name: 'Watercolor',
      description: 'Soft watercolor painting',
      prompt: 'watercolor painting, soft edges, flowing colors, artistic wash, paper texture, delicate and dreamy'
    },
    sketch: {
      name: 'Sketch',
      description: 'Hand-drawn sketch style',
      prompt: 'pencil sketch, hand drawn, cross hatching, artistic drawing, monochrome, detailed linework'
    },
    vintage: {
      name: 'Vintage',
      description: 'Retro vintage aesthetic',
      prompt: 'vintage style, retro aesthetic, faded colors, film photography, nostalgic atmosphere, grainy texture'
    },
    noir: {
      name: 'Noir',
      description: 'Film noir black and white',
      prompt: 'film noir, black and white, high contrast, dramatic shadows, 1940s style, mysterious atmosphere'
    },
    fantasy: {
      name: 'Fantasy',
      description: 'Epic fantasy art style',
      prompt: 'fantasy art, magical atmosphere, epic composition, mystical lighting, enchanted scene, detailed illustration'
    }
  };
}

/**
 * Validate configuration for workflow mode
 */
export function validateWorkflowConfig(config: WorkflowConfig): string[] {
  const errors: string[] = [];

  if (config.steps < 1 || config.steps > 50) {
    errors.push('Steps must be between 1 and 50');
  }

  if (config.cfgScale < 0.5 || config.cfgScale > 3.0) {
    errors.push('CFG scale must be between 0.5 and 3.0');
  }

  if (config.width % 64 !== 0 || config.height % 64 !== 0) {
    errors.push('Dimensions must be multiples of 64');
  }

  if (config.width < 512 || config.width > 2048) {
    errors.push('Width must be between 512 and 2048');
  }

  if (config.height < 512 || config.height > 2048) {
    errors.push('Height must be between 512 and 2048');
  }

  return errors;
}

/**
 * Validate configuration for prompt mode
 */
export function validatePromptConfig(config: PromptConfig): string[] {
  const errors: string[] = [];

  if (!config.prompt || config.prompt.trim().length === 0) {
    errors.push('Prompt is required');
  }

  if (config.prompt.length > 1000) {
    errors.push('Prompt is too long (max 1000 characters)');
  }

  // Reuse workflow validation for shared fields
  const workflowErrors = validateWorkflowConfig(config as WorkflowConfig);
  errors.push(...workflowErrors);

  return errors;
}

/**
 * Get default configurations
 */
export function getDefaultWorkflowConfig(): WorkflowConfig {
  return { ...DEFAULT_WORKFLOW_CONFIG };
}

export function getDefaultPromptConfig(): PromptConfig {
  return { ...DEFAULT_PROMPT_CONFIG };
}

/**
 * Poll for progress updates (for real-time progress)
 */
export function startProgressPolling(
  jobId: string,
  onProgress: (progress: StyleTransferProgress) => void,
  intervalMs: number = 1000
): () => void {
  let isActive = true;

  const poll = async () => {
    if (!isActive) return;

    const progress = await checkTransferStatus(jobId);
    
    if (progress) {
      onProgress(progress);

      // Stop polling if complete or failed
      if (progress.status === 'completed' || progress.status === 'failed') {
        isActive = false;
        return;
      }
    }

    if (isActive) {
      setTimeout(poll, intervalMs);
    }
  };

  // Start polling
  poll();

  // Return cleanup function
  return () => {
    isActive = false;
  };
}

/**
 * Download result image
 */
export async function downloadResult(resultUrl: string, filename?: string): Promise<void> {
  try {
    const response = await fetch(resultUrl);
    const blob = await response.blob();
    
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'style-transfer-result.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to download result:', error);
    throw error;
  }
}

/**
 * Check if ComfyUI backend is available
 */
export async function checkBackendStatus(): Promise<{ available: boolean; message: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });

    if (response.ok) {
      return { available: true, message: 'Backend is ready' };
    } else {
      return { available: false, message: 'Backend is not responding' };
    }
  } catch (error) {
    return { 
      available: false, 
      message: error instanceof Error ? error.message : 'Cannot connect to backend'
    };
  }
}
