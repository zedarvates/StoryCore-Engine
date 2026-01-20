/**
 * Local Model Service
 * 
 * Handles local LLM model management including:
 * - Listing available models
 * - Checking installed models
 * - Downloading models
 * - Model recommendations based on system capabilities
 */

export interface LocalModel {
  id: string;
  name: string;
  displayName: string;
  size: string; // e.g., "1.5GB", "7GB"
  sizeBytes: number;
  description: string;
  capabilities: string[];
  minRAM: number; // GB
  recommendedRAM: number; // GB
  requiresGPU: boolean;
  contextWindow: number;
  family: 'gemma' | 'llama' | 'mistral' | 'phi' | 'qwen' | 'other';
}

export interface ModelDownloadProgress {
  modelId: string;
  status: 'pending' | 'downloading' | 'completed' | 'error';
  progress: number; // 0-100
  downloadedBytes: number;
  totalBytes: number;
  error?: string;
}

export interface SystemCapabilities {
  totalRAM: number; // GB
  availableRAM: number; // GB
  hasGPU: boolean;
  gpuMemory?: number; // GB
}

/**
 * Available local models catalog
 */
export const LOCAL_MODELS: LocalModel[] = [
  // Gemma 2 Family (not Gemma 3!)
  {
    id: 'gemma2:2b',
    name: 'gemma2:2b',
    displayName: 'Gemma 2 2B',
    size: '1.6GB',
    sizeBytes: 1.6 * 1024 * 1024 * 1024,
    description: 'Lightweight model, fast inference, good for basic tasks',
    capabilities: ['text-generation', 'chat', 'basic-reasoning'],
    minRAM: 2,
    recommendedRAM: 4,
    requiresGPU: false,
    contextWindow: 8192,
    family: 'gemma',
  },
  {
    id: 'gemma2:9b',
    name: 'gemma2:9b',
    displayName: 'Gemma 2 9B',
    size: '5.5GB',
    sizeBytes: 5.5 * 1024 * 1024 * 1024,
    description: 'Balanced model, excellent performance for most tasks',
    capabilities: ['text-generation', 'chat', 'reasoning', 'creative-writing', 'code-generation'],
    minRAM: 8,
    recommendedRAM: 16,
    requiresGPU: false,
    contextWindow: 8192,
    family: 'gemma',
  },
  {
    id: 'gemma2:27b',
    name: 'gemma2:27b',
    displayName: 'Gemma 2 27B',
    size: '16GB',
    sizeBytes: 16 * 1024 * 1024 * 1024,
    description: 'High-quality model, state-of-the-art performance',
    capabilities: ['text-generation', 'chat', 'advanced-reasoning', 'creative-writing', 'code-generation'],
    minRAM: 24,
    recommendedRAM: 32,
    requiresGPU: false,
    contextWindow: 8192,
    family: 'gemma',
  },
  // Gemma 3 Family (latest)
  {
    id: 'gemma3:1b',
    name: 'gemma3:1b',
    displayName: 'Gemma 3 1B',
    size: '815MB',
    sizeBytes: 0.815 * 1024 * 1024 * 1024,
    description: 'Ultra-lightweight Gemma 3, extremely fast inference, perfect for quick tasks',
    capabilities: ['text-generation', 'chat', 'basic-reasoning', 'fast-inference'],
    minRAM: 2,
    recommendedRAM: 4,
    requiresGPU: false,
    contextWindow: 8192,
    family: 'gemma',
  },
  {
    id: 'gemma3:4b',
    name: 'gemma3:4b',
    displayName: 'Gemma 3 4B',
    size: '3.3GB',
    sizeBytes: 3.3 * 1024 * 1024 * 1024,
    description: 'Latest Gemma 3, excellent balance of speed and quality for production use',
    capabilities: ['text-generation', 'chat', 'reasoning', 'creative-writing', 'fast-inference'],
    minRAM: 4,
    recommendedRAM: 8,
    requiresGPU: false,
    contextWindow: 8192,
    family: 'gemma',
  },
  // Gemma 1 Family (original)
  {
    id: 'gemma:2b',
    name: 'gemma:2b',
    displayName: 'Gemma 2B',
    size: '1.4GB',
    sizeBytes: 1.4 * 1024 * 1024 * 1024,
    description: 'Original Gemma, lightweight and efficient',
    capabilities: ['text-generation', 'chat', 'basic-reasoning'],
    minRAM: 2,
    recommendedRAM: 4,
    requiresGPU: false,
    contextWindow: 8192,
    family: 'gemma',
  },
  {
    id: 'gemma:7b',
    name: 'gemma:7b',
    displayName: 'Gemma 7B',
    size: '4.8GB',
    sizeBytes: 4.8 * 1024 * 1024 * 1024,
    description: 'Original Gemma, good balance of size and performance',
    capabilities: ['text-generation', 'chat', 'reasoning', 'creative-writing'],
    minRAM: 8,
    recommendedRAM: 16,
    requiresGPU: false,
    contextWindow: 8192,
    family: 'gemma',
  },
  {
    id: 'gemma:latest',
    name: 'gemma:latest',
    displayName: 'Gemma Latest',
    size: '5.0GB',
    sizeBytes: 5.0 * 1024 * 1024 * 1024,
    description: 'Latest Gemma version, good balance of size and performance',
    capabilities: ['text-generation', 'chat', 'reasoning', 'creative-writing'],
    minRAM: 8,
    recommendedRAM: 16,
    requiresGPU: false,
    contextWindow: 8192,
    family: 'gemma',
  },
  // Llama 3.1 Family
  {
    id: 'llama3.1:8b',
    name: 'llama3.1:8b',
    displayName: 'Llama 3.1 8B',
    size: '4.7GB',
    sizeBytes: 4.7 * 1024 * 1024 * 1024,
    description: 'Meta\'s latest model, excellent for general tasks and coding',
    capabilities: ['text-generation', 'chat', 'reasoning', 'creative-writing', 'code-generation'],
    minRAM: 8,
    recommendedRAM: 16,
    requiresGPU: false,
    contextWindow: 128000,
    family: 'llama',
  },
  {
    id: 'llama3.1:70b',
    name: 'llama3.1:70b',
    displayName: 'Llama 3.1 70B',
    size: '40GB',
    sizeBytes: 40 * 1024 * 1024 * 1024,
    description: 'Meta\'s largest model, state-of-the-art performance',
    capabilities: ['text-generation', 'chat', 'advanced-reasoning', 'creative-writing', 'code-generation', 'expert-tasks'],
    minRAM: 48,
    recommendedRAM: 64,
    requiresGPU: true,
    contextWindow: 128000,
    family: 'llama',
  },
  // Llama 3 Family (original)
  {
    id: 'llama3:8b',
    name: 'llama3:8b',
    displayName: 'Llama 3 8B',
    size: '4.7GB',
    sizeBytes: 4.7 * 1024 * 1024 * 1024,
    description: 'Meta\'s powerful model, excellent for general tasks',
    capabilities: ['text-generation', 'chat', 'reasoning', 'creative-writing', 'code-generation'],
    minRAM: 8,
    recommendedRAM: 16,
    requiresGPU: false,
    contextWindow: 8192,
    family: 'llama',
  },
  {
    id: 'llama3:70b',
    name: 'llama3:70b',
    displayName: 'Llama 3 70B',
    size: '40GB',
    sizeBytes: 40 * 1024 * 1024 * 1024,
    description: 'Meta\'s large model, exceptional performance',
    capabilities: ['text-generation', 'chat', 'advanced-reasoning', 'creative-writing', 'code-generation', 'expert-tasks'],
    minRAM: 48,
    recommendedRAM: 64,
    requiresGPU: true,
    contextWindow: 8192,
    family: 'llama',
  },
  // Mistral Family
  {
    id: 'mistral:7b',
    name: 'mistral:7b',
    displayName: 'Mistral 7B',
    size: '4.1GB',
    sizeBytes: 4.1 * 1024 * 1024 * 1024,
    description: 'Fast and efficient, great for production use',
    capabilities: ['text-generation', 'chat', 'reasoning', 'code-generation'],
    minRAM: 8,
    recommendedRAM: 16,
    requiresGPU: false,
    contextWindow: 8192,
    family: 'mistral',
  },
  {
    id: 'mistral:latest',
    name: 'mistral:latest',
    displayName: 'Mistral Latest',
    size: '4.4GB',
    sizeBytes: 4.4 * 1024 * 1024 * 1024,
    description: 'Latest Mistral version, fast and efficient, great for production use',
    capabilities: ['text-generation', 'chat', 'reasoning', 'code-generation', 'fast-inference'],
    minRAM: 8,
    recommendedRAM: 16,
    requiresGPU: false,
    contextWindow: 8192,
    family: 'mistral',
  },
  // Phi 3 Family
  {
    id: 'phi3:mini',
    name: 'phi3:mini',
    displayName: 'Phi 3 Mini',
    size: '2.3GB',
    sizeBytes: 2.3 * 1024 * 1024 * 1024,
    description: 'Microsoft\'s compact model, surprisingly capable',
    capabilities: ['text-generation', 'chat', 'reasoning'],
    minRAM: 4,
    recommendedRAM: 8,
    requiresGPU: false,
    contextWindow: 4096,
    family: 'phi',
  },
  {
    id: 'phi3:medium',
    name: 'phi3:medium',
    displayName: 'Phi 3 Medium',
    size: '7.9GB',
    sizeBytes: 7.9 * 1024 * 1024 * 1024,
    description: 'Microsoft\'s balanced model, excellent quality',
    capabilities: ['text-generation', 'chat', 'advanced-reasoning', 'code-generation'],
    minRAM: 16,
    recommendedRAM: 32,
    requiresGPU: false,
    contextWindow: 4096,
    family: 'phi',
  },
  // Qwen 2 Family
  {
    id: 'qwen2:7b',
    name: 'qwen2:7b',
    displayName: 'Qwen 2 7B',
    size: '4.4GB',
    sizeBytes: 4.4 * 1024 * 1024 * 1024,
    description: 'Alibaba\'s multilingual model, great for international use',
    capabilities: ['text-generation', 'chat', 'reasoning', 'multilingual'],
    minRAM: 8,
    recommendedRAM: 16,
    requiresGPU: false,
    contextWindow: 32768,
    family: 'qwen',
  },
  // Qwen 2.5 Coder Family
  {
    id: 'qwen2.5-coder:latest',
    name: 'qwen2.5-coder:latest',
    displayName: 'Qwen 2.5 Coder',
    size: '4.7GB',
    sizeBytes: 4.7 * 1024 * 1024 * 1024,
    description: 'Alibaba\'s specialized coding model, excellent for code generation and technical content',
    capabilities: ['text-generation', 'chat', 'reasoning', 'code-generation', 'code-analysis', 'debugging', 'multilingual'],
    minRAM: 8,
    recommendedRAM: 16,
    requiresGPU: false,
    contextWindow: 32768,
    family: 'qwen',
  },
  // Qwen 3 VL Family (Vision + Language)
  {
    id: 'qwen3-vl:8b',
    name: 'qwen3-vl:8b',
    displayName: '⭐ Qwen 3 VL 8B (RECOMMENDED)',
    size: '6.1GB',
    sizeBytes: 6.1 * 1024 * 1024 * 1024,
    description: 'Alibaba\'s latest vision-language model, excellent for StoryCore visual storytelling and multimodal tasks',
    capabilities: ['text-generation', 'chat', 'reasoning', 'multilingual', 'vision-understanding', 'image-analysis', 'visual-storytelling'],
    minRAM: 8,
    recommendedRAM: 16,
    requiresGPU: false,
    contextWindow: 32768,
    family: 'qwen',
  },
  // GPT-OSS Family (Open Source GPT)
  {
    id: 'gpt-oss:20b',
    name: 'gpt-oss:20b',
    displayName: 'GPT-OSS 20B',
    size: '13GB',
    sizeBytes: 13 * 1024 * 1024 * 1024,
    description: 'Open-source GPT model, very powerful for complex tasks and advanced reasoning',
    capabilities: ['text-generation', 'chat', 'advanced-reasoning', 'creative-writing', 'code-generation', 'expert-tasks'],
    minRAM: 16,
    recommendedRAM: 24,
    requiresGPU: false,
    contextWindow: 8192,
    family: 'other',
  },
];

/**
 * Local Model Service Class
 */
export class LocalModelService {
  private endpoint: string;

  constructor(endpoint: string = 'http://localhost:11434') {
    this.endpoint = endpoint;
  }

  /**
   * Check if Ollama is running
   */
  async isOllamaRunning(): Promise<boolean> {
    try {
      const response = await fetch(`${this.endpoint}/api/tags`, {
        method: 'GET',
        mode: 'cors',
      });
      return response.ok;
    } catch (error) {
      console.warn('Ollama connection check failed:', error);
      return false;
    }
  }

  /**
   * Get list of installed models
   */
  async getInstalledModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.endpoint}/api/tags`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch installed models');
      }

      const data = await response.json();
      return data.models?.map((m: any) => m.name) || [];
    } catch (error) {
      console.error('Failed to get installed models:', error);
      return [];
    }
  }

  /**
   * Check if a specific model is installed
   */
  async isModelInstalled(modelId: string): Promise<boolean> {
    const installed = await this.getInstalledModels();
    return installed.includes(modelId);
  }

  /**
   * Download a model
   */
  async downloadModel(
    modelId: string,
    onProgress?: (progress: ModelDownloadProgress) => void
  ): Promise<boolean> {
    try {
      // Initial progress update
      if (onProgress) {
        onProgress({
          modelId,
          status: 'downloading',
          progress: 0,
          downloadedBytes: 0,
          totalBytes: 0,
        });
      }

      const response = await fetch(`${this.endpoint}/api/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: modelId,
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to download model: ${response.statusText} - ${errorText}`);
      }

      // Process streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let totalBytes = 0;
      let downloadedBytes = 0;
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('Download stream completed');
          break;
        }

        // Decode chunk and add to buffer
        buffer += decoder.decode(value, { stream: true });
        
        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const data = JSON.parse(line);
            
            console.log('Download progress data:', data);

            // Update totals
            if (data.total) {
              totalBytes = data.total;
            }
            if (data.completed !== undefined) {
              downloadedBytes = data.completed;
            }

            // Calculate progress
            let progressPercent = 0;
            if (totalBytes > 0) {
              progressPercent = (downloadedBytes / totalBytes) * 100;
            } else if (data.status === 'downloading') {
              // Show indeterminate progress if no total
              progressPercent = 50;
            }

            const progress: ModelDownloadProgress = {
              modelId,
              status: data.status === 'success' ? 'completed' : 'downloading',
              progress: progressPercent,
              downloadedBytes,
              totalBytes,
            };

            if (onProgress) {
              onProgress(progress);
            }

            // Check for completion
            if (data.status === 'success') {
              console.log('Model download completed successfully');
              if (onProgress) {
                onProgress({
                  modelId,
                  status: 'completed',
                  progress: 100,
                  downloadedBytes: totalBytes,
                  totalBytes,
                });
              }
              return true;
            }

            // Check for errors
            if (data.error) {
              throw new Error(data.error);
            }
          } catch (e) {
            if (e instanceof SyntaxError) {
              console.warn('Failed to parse JSON line:', line);
            } else {
              throw e;
            }
          }
        }
      }

      // If we exit the loop without explicit success, consider it complete
      console.log('Download stream ended, assuming success');
      if (onProgress) {
        onProgress({
          modelId,
          status: 'completed',
          progress: 100,
          downloadedBytes: totalBytes,
          totalBytes,
        });
      }
      return true;

    } catch (error) {
      console.error('Failed to download model:', error);
      const errorMessage = error instanceof Error ? error.message : 'Download failed';
      
      if (onProgress) {
        onProgress({
          modelId,
          status: 'error',
          progress: 0,
          downloadedBytes: 0,
          totalBytes: 0,
          error: errorMessage,
        });
      }
      return false;
    }
  }

  /**
   * Delete a model
   */
  async deleteModel(modelId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.endpoint}/api/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: modelId,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to delete model:', error);
      return false;
    }
  }

  /**
   * Get system capabilities
   */
  async getSystemCapabilities(): Promise<SystemCapabilities> {
    // Try to detect system capabilities
    // Note: This is limited in browser environment
    const memory = (navigator as any).deviceMemory || 8; // GB, fallback to 8GB
    
    return {
      totalRAM: memory,
      availableRAM: memory * 0.7, // Estimate 70% available
      hasGPU: await this.detectGPU(),
    };
  }

  /**
   * Detect if GPU is available
   */
  private async detectGPU(): Promise<boolean> {
    try {
      // Try WebGL detection
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return !!gl;
    } catch {
      return false;
    }
  }

  /**
   * Get recommended models based on system capabilities
   */
  async getRecommendedModels(): Promise<LocalModel[]> {
    const capabilities = await this.getSystemCapabilities();
    
    return LOCAL_MODELS.filter(model => {
      // Filter by RAM requirements
      if (model.minRAM > capabilities.availableRAM) {
        return false;
      }
      
      // Filter by GPU requirements
      if (model.requiresGPU && !capabilities.hasGPU) {
        return false;
      }
      
      return true;
    }).sort((a, b) => {
      // Sort by recommended RAM (prefer models that fit well)
      const aFit = Math.abs(a.recommendedRAM - capabilities.availableRAM);
      const bFit = Math.abs(b.recommendedRAM - capabilities.availableRAM);
      return aFit - bFit;
    });
  }

  /**
   * Get best model for system
   */
  async getBestModel(): Promise<LocalModel | null> {
    const recommended = await this.getRecommendedModels();
    return recommended[0] || null;
  }

  /**
   * Get model by ID
   */
  getModelById(modelId: string): LocalModel | undefined {
    return LOCAL_MODELS.find(m => m.id === modelId);
  }

  /**
   * Get models by family
   */
  getModelsByFamily(family: LocalModel['family']): LocalModel[] {
    return LOCAL_MODELS.filter(m => m.family === family);
  }

  /**
   * Format bytes to human-readable size
   */
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }
}

/**
 * Get singleton instance
 */
let localModelServiceInstance: LocalModelService | null = null;

export function getLocalModelService(endpoint?: string): LocalModelService {
  if (!localModelServiceInstance || endpoint) {
    localModelServiceInstance = new LocalModelService(endpoint);
  }
  return localModelServiceInstance;
}
