/**
 * Ollama Configuration Service
 * 
 * Handles Ollama local LLM configuration with automatic model selection
 * based on system capabilities (RAM, GPU)
 */

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
 */
export const DEFAULT_OLLAMA_CONFIG = {
  endpoint: 'http://localhost:11434',
  timeout: 60000, // 60 seconds for local models
  streamingEnabled: true,
};

/**
 * Detect system capabilities (browser-based estimation)
 */
export async function detectSystemCapabilities(): Promise<SystemCapabilities> {
  // Get device memory (if available)
  const deviceMemory = (navigator as any).deviceMemory; // in GB
  
  // Estimate based on available information
  const totalRAM = deviceMemory || estimateRAMFromHardwareConcurrency();
  const availableRAM = totalRAM * 0.7; // Assume 70% available
  
  // Check for GPU (WebGL as proxy)
  const hasGPU = detectGPU();
  const gpuVRAM = hasGPU ? estimateGPUVRAM() : undefined;

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
    if (!gl) return false;

    const debugInfo = (gl as any).getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return true; // Has WebGL but can't get details

    const renderer = (gl as any).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
    
    // Check if it's a dedicated GPU (not integrated)
    const isDedicated = /nvidia|amd|radeon|geforce|rtx|gtx/i.test(renderer);
    return isDedicated;
  } catch {
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
    if (!gl) return 2; // Default to 2GB

    const debugInfo = (gl as any).getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return 4; // Default to 4GB

    const renderer = (gl as any).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).toLowerCase();
    
    // Rough estimation based on GPU model
    if (renderer.includes('rtx 4090') || renderer.includes('rtx 4080')) return 16;
    if (renderer.includes('rtx 4070') || renderer.includes('rtx 3090')) return 12;
    if (renderer.includes('rtx 3080') || renderer.includes('rtx 4060')) return 8;
    if (renderer.includes('rtx 3070') || renderer.includes('rtx 3060')) return 6;
    if (renderer.includes('gtx') || renderer.includes('rtx 20')) return 4;
    
    return 4; // Default to 4GB for unknown GPUs
  } catch {
    return 2; // Default to 2GB on error
  }
}

/**
 * Select best Gemma 3 model based on system capabilities
 */
export function selectBestModel(capabilities: SystemCapabilities): OllamaModelConfig {
  // Sort models by size (largest first)
  const sortedModels = [...GEMMA3_MODELS].sort((a, b) => {
    const sizeA = parseInt(a.size);
    const sizeB = parseInt(b.size);
    return sizeB - sizeA;
  });

  // Find the largest model that fits the system
  for (const model of sortedModels) {
    // Check RAM requirements
    if (capabilities.availableRAM >= model.minRAM) {
      // If GPU available, check VRAM requirements
      if (capabilities.hasGPU && model.minVRAM) {
        if (capabilities.gpuVRAM && capabilities.gpuVRAM >= model.minVRAM) {
          return model;
        }
      } else if (!capabilities.hasGPU) {
        // CPU-only: use RAM requirements
        return model;
      }
    }
  }

  // Fallback to smallest model
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
    // Using 'any' for model data from Ollama API response which has flexible structure
    return data.models?.map((m: any) => m.name) || [];
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
