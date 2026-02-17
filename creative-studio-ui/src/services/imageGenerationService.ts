/**
 * Image Generation Service
 * 
 * Handles workflow and model selection, GPU memory validation,
 * and integration with ComfyUI for image generation.
 * 
 * Provides:
 * - Available workflow types
 * - Available checkpoints from ComfyUI
 * - Resolution validation based on GPU memory
 * - Workflow configuration helpers
 */

import { ComfyUIService, type WorkflowType } from './comfyuiService';

// ============================================================================
// Types
// ============================================================================

export interface WorkflowOption {
  id: WorkflowType;
  name: string;
  description: string;
  recommendedResolution: { width: number; height: number };
  minResolution: { width: number; height: number };
  maxResolution: { width: number; height: number };
  requiresLargeVRAM: boolean;
  bestFor: string[];
  icon: string;
}

export interface GenerationParams {
  prompt: string;
  negativePrompt?: string;
  width: number;
  height: number;
  steps: number;
  cfgScale: number;
  seed?: number;
  sampler: string;
  scheduler: string;
  workflowType: WorkflowType;
  checkpoint?: string;
}

export interface GPUInfo {
  name: string;
  vramTotal: number;
  vramFree: number;
}

export interface ResolutionValidation {
  valid: boolean;
  recommended: { width: number; height: number };
  warning?: string;
  error?: string;
}

// ============================================================================
// Workflow Options Configuration
// ============================================================================

export const WORKFLOW_OPTIONS: WorkflowOption[] = [
  {
    id: 'flux2',
    name: 'FLUX.2',
    description: 'Latest FLUX model for high-quality text rendering and photorealistic images',
    recommendedResolution: { width: 1024, height: 1024 },
    minResolution: { width: 512, height: 512 },
    maxResolution: { width: 1536, height: 1536 },
    requiresLargeVRAM: true,
    bestFor: ['text rendering', 'photorealistic', 'complex compositions'],
    icon: '⚡'
  },
  {
    id: 'z_image_turbo',
    name: 'Z-Image Turbo',
    description: 'Fast generation with good quality balance. Great for quick previews.',
    recommendedResolution: { width: 512, height: 512 },
    minResolution: { width: 256, height: 256 },
    maxResolution: { width: 1024, height: 1024 },
    requiresLargeVRAM: false,
    bestFor: ['fast generation', 'previews', 'iterative workflows'],
    icon: '🚀'
  },
  {
    id: 'z_image_turbo_coherence',
    name: 'Z-Image Turbo Coherence',
    description: 'Enhanced coherence for consistent character/scene generation',
    recommendedResolution: { width: 512, height: 512 },
    minResolution: { width: 256, height: 256 },
    maxResolution: { width: 1024, height: 1024 },
    requiresLargeVRAM: false,
    bestFor: ['character consistency', 'scene coherence', 'storyboards'],
    icon: '📚'
  },
  {
    id: 'sdxl',
    name: 'Stable Diffusion XL',
    description: 'Classic SDXL workflow with extensive model support',
    recommendedResolution: { width: 1024, height: 1024 },
    minResolution: { width: 512, height: 512 },
    maxResolution: { width: 1536, height: 1536 },
    requiresLargeVRAM: true,
    bestFor: ['versatility', 'legacy models', 'LORA support'],
    icon: '🎨'
  },
  {
    id: 'firered_image_edit',
    name: 'FireRed Image Edit',
    description: 'Specialized for image editing and text rendering. Best for precise edits.',
    recommendedResolution: { width: 1024, height: 768 },
    minResolution: { width: 512, height: 384 },
    maxResolution: { width: 2048, height: 1536 },
    requiresLargeVRAM: true,
    bestFor: ['image editing', 'text in images', 'inpainting', 'outpainting'],
    icon: '🔥'
  },
  {
    id: 'custom',
    name: 'Custom Workflow',
    description: 'Use your own ComfyUI workflow JSON',
    recommendedResolution: { width: 1024, height: 1024 },
    minResolution: { width: 256, height: 256 },
    maxResolution: { width: 2048, height: 2048 },
    requiresLargeVRAM: false,
    bestFor: ['advanced users', 'custom workflows', 'specialized tasks'],
    icon: '⚙️'
  }
];

// ============================================================================
// Resolution Presets
// ============================================================================

export const RESOLUTION_PRESETS = [
  { label: 'Square (1:1)', width: 512, height: 512 },
  { label: 'Square HD (1:1)', width: 1024, height: 1024 },
  { label: 'Portrait (2:3)', width: 512, height: 768 },
  { label: 'Portrait HD (2:3)', width: 768, height: 1152 },
  { label: 'Landscape (3:2)', width: 768, height: 512 },
  { label: 'Landscape HD (3:2)', width: 1152, height: 768 },
  { label: 'Widescreen (16:9)', width: 1024, height: 576 },
  { label: 'Widescreen HD (16:9)', width: 1920, height: 1080 },
  { label: 'Vertical (9:16)', width: 576, height: 1024 },
  { label: 'Vertical HD (9:16)', width: 1080, height: 1920 },
];

// ============================================================================
// Sampler Options
// ============================================================================

export const SAMPLER_OPTIONS = [
  'euler', 'euler_ancestral', 'euler_cfg_plus', 'euler_cfg_ancestral',
  'dpm_2', 'dpm_2_ancestral', 'dpm_3m_sde', 'dpm_4',
  'dpmpp_2m', 'dpmpp_2m_sde', 'dpmpp_3m_sde',
  'dpmpp_sde', 'dpmpp_sde_gpu', 'dpmpp_2m_sde_gpu',
  'uni_pc', 'uni_pc_bh2', 'lcm', 'res_multistep',
  'ipndm', 'ipndm_v', 'deis', 'ddpm', 'adm', 'tmnd', 'ddim', 'plms',
  'cfi', 'cfi_rd', 'prognosticator', 'prognosticator_fine_deprecated'
];

// ============================================================================
// Scheduler Options
// ============================================================================

export const SCHEDULER_OPTIONS = [
  'normal', 'karras', 'exponential', 'simple', 'ddim_uniform', 'polyexponential'
];

// ============================================================================
// Default Generation Parameters
// ============================================================================

export const DEFAULT_GENERATION_PARAMS: Omit<GenerationParams, 'prompt' | 'workflowType'> = {
  negativePrompt: 'low quality, blurry, distorted, deformed, bad anatomy, watermark, signature',
  width: 1024,
  height: 1024,
  steps: 20,
  cfgScale: 7.0,
  sampler: 'euler',
  scheduler: 'normal'
};

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Get available checkpoints from ComfyUI
 */
export async function getAvailableCheckpoints(): Promise<string[]> {
  try {
    const checkpoints = await ComfyUIService.getInstance().getAvailableModels();
    return checkpoints;
  } catch (error) {
    console.warn('[ImageGenerationService] Failed to fetch checkpoints:', error);
    return [];
  }
}

/**
 * Get GPU information from ComfyUI
 */
export async function getGPUInfo(): Promise<GPUInfo | null> {
  try {
    const availability = await ComfyUIService.getInstance().isAvailable();
    if (!availability.available) {
      return null;
    }
    
    // Try to get system stats from ComfyUI
    const endpoint = ComfyUIService.getInstance().getBaseUrl();
    const response = await fetch(`${endpoint}/system_stats`);
    
    if (response.ok) {
      const stats = await response.json();
      const gpu = stats?.devices?.[0];
      if (gpu) {
        return {
          name: gpu.name || 'Unknown GPU',
          vramTotal: gpu.vram_total || 0,
          vramFree: gpu.vram_free || 0
        };
      }
    }
    
    // Return mock data if not available
    return {
      name: 'Unknown GPU',
      vramTotal: 8 * 1024, // Assume 8GB if not available
      vramFree: 4 * 1024
    };
  } catch (error) {
    console.warn('[ImageGenerationService] Failed to get GPU info:', error);
    return null;
  }
}

/**
 * Validate resolution based on GPU memory
 * Returns validation result with warnings or errors
 */
export function validateResolution(
  width: number,
  height: number,
  workflowType: WorkflowType,
  gpuInfo: GPUInfo | null
): ResolutionValidation {
  const workflow = WORKFLOW_OPTIONS.find(w => w.id === workflowType);
  
  if (!workflow) {
    return {
      valid: false,
      recommended: { width: 1024, height: 1024 },
      error: 'Unknown workflow type'
    };
  }
  
  // Check minimum resolution
  if (width < workflow.minResolution.width || height < workflow.minResolution.height) {
    return {
      valid: false,
      recommended: workflow.recommendedResolution,
      error: `Minimum resolution for ${workflow.name} is ${workflow.minResolution.width}x${workflow.minResolution.height}`
    };
  }
  
  // Check maximum resolution
  if (width > workflow.maxResolution.width || height > workflow.maxResolution.height) {
    return {
      valid: false,
      recommended: workflow.recommendedResolution,
      error: `Maximum resolution for ${workflow.name} is ${workflow.maxResolution.width}x${workflow.maxResolution.height}`
    };
  }
  
  // Calculate estimated VRAM usage (rough estimate in GB)
  const megapixels = (width * height) / 1000000;
  const estimatedVRAM = megapixels * 0.5; // Rough estimate: 0.5GB per megapixel
  
  // Check against GPU VRAM if available
  if (gpuInfo && gpuInfo.vramTotal > 0) {
    const availableVRAM = gpuInfo.vramFree;
    const requiredVRAM = workflow.requiresLargeVRAM ? estimatedVRAM * 1.5 : estimatedVRAM;
    
    if (requiredVRAM > availableVRAM) {
      return {
        valid: true,
        recommended: workflow.recommendedResolution,
        warning: `High resolution may use more VRAM than available (${requiredVRAM.toFixed(1)}GB estimated, ${availableVRAM.toFixed(1)}GB available)`
      };
    }
    
    // Warn for high memory usage
    if (requiredVRAM > availableVRAM * 0.8) {
      return {
        valid: true,
        recommended: workflow.recommendedResolution,
        warning: `High VRAM usage (${requiredVRAM.toFixed(1)}GB). Consider reducing resolution.`
      };
    }
  }
  
  return {
    valid: true,
    recommended: workflow.recommendedResolution
  };
}

/**
 * Get workflow option by ID
 */
export function getWorkflowOption(id: WorkflowType): WorkflowOption | undefined {
  return WORKFLOW_OPTIONS.find(w => w.id === id);
}

/**
 * Get default parameters for a workflow type
 */
export function getDefaultParamsForWorkflow(workflowType: WorkflowType): Partial<GenerationParams> {
  const workflow = getWorkflowOption(workflowType);
  
  if (!workflow) {
    return DEFAULT_GENERATION_PARAMS;
  }
  
  return {
    width: workflow.recommendedResolution.width,
    height: workflow.recommendedResolution.height,
    steps: 20,
    cfgScale: 7.0,
    sampler: 'euler',
    scheduler: 'normal'
  };
}

/**
 * Generate image with selected workflow
 */
export async function generateImage(
  params: GenerationParams,
  onProgress?: (progress: number, message: string) => void
): Promise<string> {
  const service = ComfyUIService.getInstance();
  
  // Use the service's generateImage method
  // The workflow type is handled internally by the service
  return service.generateImage({
    prompt: params.prompt,
    negativePrompt: params.negativePrompt,
    width: params.width,
    height: params.height,
    steps: params.steps,
    cfgScale: params.cfgScale,
    seed: params.seed,
    model: params.checkpoint || 'default',
    sampler: params.sampler,
    scheduler: params.scheduler
  }, onProgress);
}

