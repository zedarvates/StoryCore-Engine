/**
 * Ollama Configuration Service
 * 
 * Handles Ollama local LLM configuration with automatic model selection
 * based on system capabilities (RAM, GPU)
 * 
 * Configuration is now centralized in ../config/serverConfig.ts
 */

import { config } from '../config/serverConfig';

/**
 * Extended navigator interface for device memory
 */
interface NavigatorWithDeviceMemory extends Navigator {
  deviceMemory?: number;
}

/**
 * WebGL debug renderer info extension
 */
interface WebGLDebugRendererInfo {
  UNMASKED_RENDERER_WEBGL: number;
}

/**
 * Extended WebGL context with debug info
 */
interface WebGLDebugContext {
  getExtension(name: 'WEBGL_debug_renderer_info'): WebGLDebugRendererInfo | null;
  getParameter(pname: number): unknown;
}

/**
 * Ollama API response model
 */
interface OllamaModelResponse {
  name: string;
  size?: number;
  digest?: string;
}

export interface SystemCapabilities {
  totalRAM: number; // in GB
  availableRAM: number; // in GB
  hasGPU: boolean;
  gpuVRAM?: number; // in GB
}

export interface OllamaModelConfig {
  id: string;
  name: string;
  size: string; // e.g., "1b", "4b", "12b"
  minRAM: number; // minimum RAM in GB
  recommendedRAM: number; // recommended RAM in GB
  minVRAM?: number; // minimum VRAM in GB (if GPU)
  contextWindow: number;
  description: string;
}

/**
 * Available local models for Ollama (Gemma 2 and Llama 3.2)
 */
export const GEMMA3_MODELS: OllamaModelConfig[] = [
  {
    id: 'qwen3-vl:4b',
    name: 'Qwen 3 VL 4B (Base)',
    size: '4b',
    minRAM: 4,
    recommendedRAM: 8,
    minVRAM: 4,
    contextWindow: 32768,
    description: 'Latest vision-language model, recommended for best experience',
  },
  {
    id: 'gemma2:2b',
    name: 'Gemma 2 2B',
    size: '2b',
    minRAM: 2,
    recommendedRAM: 4,
    minVRAM: 1,
    contextWindow: 8192,
    description: 'Smallest model, fast responses, good for basic tasks',
  },
  {
    id: 'llama3.2:3b',
    name: 'Llama 3.2 3B',
    size: '3b',
    minRAM: 6,
    recommendedRAM: 8,
    minVRAM: 3,
    contextWindow: 8192,
    description: 'Balanced model, good quality and speed',
  },
  {
    id: 'llama3.2:1b',
    name: 'Llama 3.2 1B',
    size: '1b',
    minRAM: 16,
    recommendedRAM: 24,
    minVRAM: 8,
    contextWindow: 8192,
    description: 'Lightweight model, very fast responses',
  },
];

/**
 * Default Ollama configuration
 * Uses centralized config from serverConfig.ts
 */
export const DEFAULT_OLLAMA_CONFIG = {
  endpoint: config.ollama.baseUrl,  // 'http://localhost:11434' from config
  timeout: config.ollama.timeout,   // 300000ms from config (5 min)
  streamingEnabled: true,
  model: config.ollama.model,       // Default model from config
};

/**
 * Detect system capabilities (browser-based estimation)
 */
export async function detectSystemCapabilities(): Promise<SystemCapabilities> {
  // Get device memory (if available)
  const nav = navigator as NavigatorWithDeviceMemory;
  const deviceMemory = nav.deviceMemory;
  
  console.log('[System Capabilities] Device memory from API:', deviceMemory);
  
  // Estimate based on available information
  const totalRAM = deviceMemory || estimateRAMFromHardwareConcurrency();
  const availableRAM = totalRAM * 0.7; // Assume 70% available
  
  console.log('[System Capabilities] Total RAM:', totalRAM, 'GB, Available:', availableRAM, 'GB');
  
  // Check for GPU (WebGL as proxy)
  const hasGPU = detectGPU();
  const gpuVRAM = hasGPU ? estimateGPUVRAM() : undefined;

  console.log('[System Capabilities] Has GPU:', hasGPU, ', Estimated VRAM:', gpuVRAM, 'GB');

  return {
    totalRAM,
    availableRAM,
    hasGPU,
    gpuVRAM,
  };
}

/**
 * Estimate RAM from hardware concurrency (CPU cores)
 */
function estimateRAMFromHardwareConcurrency(): number {
  const cores = navigator.hardwareConcurrency || 4;
  
  // Rough estimation: 2GB per core for modern systems
  if (cores <= 2) return 4; // Low-end: 4GB
  if (cores <= 4) return 8; // Mid-range: 8GB
  if (cores <= 8) return 16; // High-end: 16GB
  return 32; // Workstation: 32GB+
}

/**
 * Detect GPU availability
 */
function detectGPU(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      console.warn('[GPU Detection] WebGL not available, no GPU detected');
      return false;
    }

    const debugInfo = (gl as WebGLDebugContext).getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) {
      console.warn('[GPU Detection] WebGL debug info not available, assuming has GPU');
      return true; // Has WebGL but can't get details
    }

    const renderer = (gl as WebGLDebugContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as string;
    
    console.log('[GPU Detection] Detected GPU:', renderer);
    
    // Check if it's a dedicated GPU (not integrated) - include RTX 50 series
    const isDedicated = /nvidia|amd|radeon|geforce|rtx|gtx/i.test(renderer);
    
    console.log('[GPU Detection] Is dedicated GPU:', isDedicated);
    return isDedicated;
  } catch (error) {
    console.error('[GPU Detection] Error detecting GPU:', error);
    return false;
  }
}

/**
 * Estimate GPU VRAM (rough estimation)
 */
function estimateGPUVRAM(): number {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      console.warn('[VRAM Detection] WebGL not available, defaulting to 2GB VRAM');
      return 2; // Default to 2GB
    }

    const debugInfo = (gl as WebGLDebugContext).getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) {
      console.warn('[VRAM Detection] WebGL debug info not available, defaulting to 4GB VRAM');
      return 4; // Default to 4GB
    }

    const renderer = ((gl as WebGLDebugContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as string).toLowerCase();
    
    console.log('[VRAM Detection] Detected GPU renderer:', renderer);
    
    // Rough estimation based on GPU model - RTX 50 series (newer GPUs)
    if (renderer.includes('rtx 5090') || renderer.includes('rtx 5080')) {
      console.log('[VRAM Detection] Matched RTX 5090/5080, returning 16GB VRAM');
      return 16;
    }
    if (renderer.includes('rtx 5070') || renderer.includes('rtx 5060') || renderer.includes('rtx 5070 ti') || renderer.includes('rtx 5060 ti')) {
      console.log('[VRAM Detection] Matched RTX 5060/5070 series, returning 16GB VRAM');
      return 16;
    }
    if (renderer.includes('rtx 4090') || renderer.includes('rtx 4080')) {
      console.log('[VRAM Detection] Matched RTX 4090/4080, returning 16GB VRAM');
      return 16;
    }
    if (renderer.includes('rtx 4070') || renderer.includes('rtx 3090')) {
      console.log('[VRAM Detection] Matched RTX 4070/3090, returning 12GB VRAM');
      return 12;
    }
    if (renderer.includes('rtx 3080') || renderer.includes('rtx 4060')) {
      console.log('[VRAM Detection] Matched RTX 3080/4060, returning 8GB VRAM');
      return 8;
    }
    if (renderer.includes('rtx 3070') || renderer.includes('rtx 3060')) {
      console.log('[VRAM Detection] Matched RTX 3070/3060, returning 6GB VRAM');
      return 6;
    }
    if (renderer.includes('gtx') || renderer.includes('rtx 20')) {
      console.log('[VRAM Detection] Matched GTX/RTX 20 series, returning 4GB VRAM');
      return 4;
    }
    
    console.warn('[VRAM Detection] Unknown GPU detected:', renderer, ', defaulting to 4GB VRAM');
    return 4; // Default to 4GB for unknown GPUs
  } catch (error) {
    console.error('[VRAM Detection] Error detecting VRAM:', error, ', defaulting to 2GB VRAM');
    return 2; // Default to 2GB on error
  }
}

/**
 * Select best Gemma 3 model based on system capabilities
 */
export function selectBestModel(capabilities: SystemCapabilities): OllamaModelConfig {
  console.log('[Model Selection] Starting model selection with capabilities:', capabilities);
  
  // Sort models by size (largest first)
  const sortedModels = [...GEMMA3_MODELS].sort((a, b) => {
    const sizeA = parseInt(a.size);
    const sizeB = parseInt(b.size);
    return sizeB - sizeA;
  });

  console.log('[Model Selection] Available models (sorted):', sortedModels.map(m => m.id));

  // Find the largest model that fits the system
  for (const model of sortedModels) {
    console.log(`[Model Selection] Checking model: ${model.id}, minRAM: ${model.minRAM}GB, minVRAM: ${model.minVRAM}GB`);
    
    // Check RAM requirements
    if (capabilities.availableRAM >= model.minRAM) {
      console.log(`[Model Selection] ${model.id} RAM check passed (available: ${capabilities.availableRAM}GB >= min: ${model.minRAM}GB)`);
      
      // If GPU available, check VRAM requirements
      if (capabilities.hasGPU && model.minVRAM) {
        if (capabilities.gpuVRAM && capabilities.gpuVRAM >= model.minVRAM) {
          console.log(`[Model Selection] Selected: ${model.id} (VRAM check passed: ${capabilities.gpuVRAM}GB >= ${model.minVRAM}GB)`);
          return model;
        } else {
          console.log(`[Model Selection] ${model.id} VRAM check failed (available: ${capabilities.gpuVRAM}GB < min: ${model.minVRAM}GB)`);
        }
      } else if (!capabilities.hasGPU) {
        // CPU-only: use RAM requirements
        console.log(`[Model Selection] Selected: ${model.id} (CPU-only mode)`);
        return model;
      }
    } else {
      console.log(`[Model Selection] ${model.id} RAM check failed (available: ${capabilities.availableRAM}GB < min: ${model.minRAM}GB)`);
    }
  }

  // Fallback to smallest model
  console.log('[Model Selection] No model fit, falling back to smallest model:', GEMMA3_MODELS[0].id);
  return GEMMA3_MODELS[0];
}

/**
 * Get model recommendation with explanation
 */
export interface ModelRecommendation {
  model: OllamaModelConfig;
  reason: string;
  alternatives: OllamaModelConfig[];
  warnings: string[];
}

export async function getModelRecommendation(): Promise<ModelRecommendation> {
  const capabilities = await detectSystemCapabilities();
  const recommended = selectBestModel(capabilities);
  
  const warnings: string[] = [];
  const alternatives: OllamaModelConfig[] = [];

  // Check if recommended model is optimal
  if (capabilities.availableRAM < recommended.recommendedRAM) {
    warnings.push(
      `Your system has ${capabilities.availableRAM.toFixed(1)}GB available RAM. ` +
      `${recommended.recommendedRAM}GB is recommended for optimal performance.`
    );
  }

  // Find alternative models
  for (const model of GEMMA3_MODELS) {
    if (model.id !== recommended.id && capabilities.availableRAM >= model.minRAM) {
      alternatives.push(model);
    }
  }

  // Generate reason
  let reason = `Selected ${recommended.name} based on your system: `;
  reason += `${capabilities.totalRAM.toFixed(0)}GB RAM`;
  if (capabilities.hasGPU && capabilities.gpuVRAM) {
    reason += `, ${capabilities.gpuVRAM.toFixed(0)}GB VRAM`;
  }
  reason += `. ${recommended.description}`;

  return {
    model: recommended,
    reason,
    alternatives,
    warnings,
  };
}

/**
 * Check if Ollama is running
 */
export async function checkOllamaStatus(endpoint: string = DEFAULT_OLLAMA_CONFIG.endpoint): Promise<boolean> {
  try {
    // Try via Electron API first to avoid console noise
    if (window.electronAPI?.llm?.testConnection) {
      const result = await window.electronAPI.llm.testConnection({
        id: 'ollama',
        name: 'Ollama',
        baseUrl: endpoint,
        type: 'ollama'
      });
      return result.success;
    }

    // Fallback for browser
    const response = await fetch(`${endpoint}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get installed models from Ollama
 */
export async function getInstalledModels(endpoint: string = DEFAULT_OLLAMA_CONFIG.endpoint): Promise<string[]> {
  try {
    const response = await fetch(`${endpoint}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    
    if (!response.ok) return [];
    
    const data = await response.json();
    return (data.models?.map((m: OllamaModelResponse) => m.name) || []);
  } catch {
    return [];
  }
}

/**
 * Check if a specific model is installed
 */
export async function isModelInstalled(
  modelId: string,
  endpoint: string = DEFAULT_OLLAMA_CONFIG.endpoint
): Promise<boolean> {
  const installed = await getInstalledModels(endpoint);
  return installed.includes(modelId);
}

/**
 * Get Ollama configuration for LLMService
 */
export async function getOllamaLLMConfig(): Promise<{
  provider: 'local';
  apiEndpoint: string;
  model: string;
  apiKey: string;
}> {
  const recommendation = await getModelRecommendation();
  
  return {
    provider: 'local',
    apiEndpoint: DEFAULT_OLLAMA_CONFIG.endpoint,
    model: recommendation.model.id,
    apiKey: '', // Ollama doesn't require API key
  };
}
