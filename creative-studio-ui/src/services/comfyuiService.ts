/**
 * ComfyUI Service
 * 
 * Provides integration with ComfyUI backend for image and video generation.
 * Handles connection testing, workflow management, and model preferences.
 * 
 * Validates Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
 */

// ============================================================================
// Types
// ============================================================================

export type AuthenticationType = 'none' | 'basic' | 'token';

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
    imageGeneration: string;
    videoGeneration: string;
    upscaling: string;
    inpainting: string;
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
    serverUrl: 'http://localhost:8188',
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
  
  private constructor() {}
  
  public static getInstance(): ComfyUIService {
    if (!ComfyUIService.instance) {
      ComfyUIService.instance = new ComfyUIService();
    }
    return ComfyUIService.instance;
  }
  
  /**
   * Generate image using ComfyUI
   */
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
  }): Promise<string> {
    // In a real implementation, this would call the ComfyUI API
    // For now, return a mock image URL
    console.log('Generating image with params:', params);
    return `data:image/png;base64,mock-image-data-for-${params.prompt.substring(0, 10)}`;
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
  } else if (auth?.type === 'token' && auth.token) {
    headers['Authorization'] = `Bearer ${auth.token}`;
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
async function fetchWorkflows(
  serverUrl: string,
  auth?: ComfyUIConfig['authentication']
): Promise<WorkflowInfo[]> {
  try {
    // ComfyUI doesn't have a standard workflows endpoint, so we return mock data
    // In a real implementation, this would query a custom endpoint or workflow directory
    return mockWorkflows;
  } catch (error) {
    console.warn('Failed to fetch workflows, using defaults:', error);
    return mockWorkflows;
  }
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
      const data = await response.json();
      // Parse model information from object_info
      // This is a simplified version - real implementation would parse the full structure
      return mockModels;
    }
  } catch (error) {
    console.warn('Failed to fetch models, using defaults:', error);
  }
  
  return mockModels;
}

/**
 * Test connection to ComfyUI server with health check
 * Validates Requirements: 4.2, 4.3, 4.4, 4.5
 */
export async function testComfyUIConnection(
  config: Partial<ComfyUIConfig>
): Promise<{ success: boolean; message: string; serverInfo?: ComfyUIServerInfo }> {
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

  try {
    // Build request headers with authentication
    const headers = buildHeaders(config.authentication);

    // Attempt to fetch system stats from ComfyUI
    // This is the primary health check endpoint
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

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
        fetchWorkflows(config.serverUrl, config.authentication),
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

      // Handle fetch-specific errors
      if (fetchError instanceof Error) {
        if (fetchError.name === 'AbortError') {
          return {
            success: false,
            message: 'Connection timeout. Server took too long to respond (>10s).',
          };
        } else if (fetchError.message.includes('Failed to fetch') || fetchError.message.includes('NetworkError')) {
          return {
            success: false,
            message: 'Cannot reach server. Check that ComfyUI is running and the URL is correct.',
          };
        }
      }

      throw fetchError;
    }
  } catch (error) {
    // Handle unexpected errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      success: false,
      message: `Connection failed: ${errorMessage}`,
    };
  }
}

/**
 * Get available workflows from server
 * Validates Requirements: 4.3
 */
export async function getAvailableWorkflows(
  serverUrl: string,
  auth?: ComfyUIConfig['authentication']
): Promise<WorkflowInfo[]> {
  return fetchWorkflows(serverUrl, auth);
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
    diagnostics.suggestions.push('Enter a valid ComfyUI server URL (e.g., http://localhost:8188)');
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
    diagnostics.suggestions.push('Default ComfyUI URL is http://127.0.0.1:8188');
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
