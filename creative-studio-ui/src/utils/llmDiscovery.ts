/**
 * LLM Model Detection Utility
 * cspell:ignore lmstudio nemo qwen
 * 
 * Automatically detects available LLM models (Ollama, LM Studio) and suggests the best one to use.
 */

import { LegacyAny } from '@/types/legacy';
export interface LLMModel {
  name: string;
  provider: 'ollama' | 'lmstudio';
  size?: string;
  modified?: string;
}

export interface ModelSuggestion {
  model: string;
  provider: 'ollama' | 'lmstudio';
  reason: string;
  alternatives: string[];
}

/**
 * Get list of installed models from multiple providers
 */
export async function getInstalledModels(): Promise<LLMModel[]> {
  const models: LLMModel[] = [];

  // 1. Try Ollama (via Electron API if available)
  try {
    if (window.electronAPI) {
      const ollamaModels = await window.electronAPI.llm.getModels({ 
        id: 'ollama', 
        name: 'Ollama', 
        baseUrl: 'http://localhost:11434', 
        type: 'ollama' 
      });
      models.push(...ollamaModels.map((m: LegacyAny) => ({
        name: typeof m === 'string' ? m : m.name,
        provider: 'ollama' as const
      })));
    } else {
      // Browser fallback
      const response = await fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(5000) });
      if (response.ok) {
        const data = await response.json();
        const ollamaModels = data.models || [];
        models.push(...ollamaModels.map((m: LegacyAny) => ({
          name: m.name,
          provider: 'ollama' as const
        })));
      }
    }
  } catch (error) {
    console.warn('[LLMDiscovery] Ollama not available:', error);
  }

  // 2. Try LM Studio (via Electron API if available)
  try {
    if (window.electronAPI) {
      const lmStudioModels = await window.electronAPI.llm.getModels({ 
        id: 'lmstudio', 
        name: 'LM Studio', 
        baseUrl: 'http://localhost:1234', 
        type: 'lmstudio' 
      });
      models.push(...lmStudioModels.map((m: LegacyAny) => ({
        name: typeof m === 'string' ? m : m.id || m.name,
        provider: 'lmstudio' as const
      })));
    } else {
      // Browser fallback
      const response = await fetch('http://localhost:1234/v1/models', { signal: AbortSignal.timeout(5000) });
      if (response.ok) {
        const data = await response.json();
        const lmStudioModels = data.data || [];
        models.push(...lmStudioModels.map((m: LegacyAny) => ({
          name: m.id,
          provider: 'lmstudio' as const
        })));
      }
    }
  } catch (error) {
    console.warn('[LLMDiscovery] LM Studio not available:', error);
  }

  return models;
}

/**
 * Legacy compatibility alias
 */
export async function getInstalledOllamaModels(_endpoint?: string): Promise<LegacyAny[]> {
  const models = await getInstalledModels();
  return models.filter(m => m.provider === 'ollama');
}

/**
 * Suggest the best model to use based on what's installed
 */
export async function suggestBestModel(): Promise<ModelSuggestion | null> {
  const models = await getInstalledModels();

  if (models.length === 0) {
    return null;
  }

  // Priority order for model selection
  const preferredModels = [
    'google/gemma-4-e2b',
    'llama3.1:8b',
    'mistral:latest',
    'mistral-nemo:latest',
    'gemma3:4b',
    'llama3.2:3b',
    'qwen2.5-coder:latest',
    'qwen3-vl:4b',
    'phi3:mini',
  ];

  // Find the first preferred model
  for (const preferred of preferredModels) {
    const found = models.find(m => 
      m.name === preferred || 
      m.name.split(':')[0] === preferred.split(':')[0] ||
      m.name.includes(preferred.split(':')[0])
    );
    
    if (found) {
      return {
        model: found.name,
        provider: found.provider,
        reason: `Found ${found.name} on ${found.provider} - excellent performance`,
        alternatives: models
          .filter(m => m.name !== found.name)
          .map(m => m.name)
          .slice(0, 3),
      };
    }
  }

  // Fallback to first available
  const firstModel = models[0];
  return {
    model: firstModel.name,
    provider: firstModel.provider,
    reason: `Using ${firstModel.name} from ${firstModel.provider}`,
    alternatives: models.slice(1).map(m => m.name).slice(0, 3),
  };
}

/**
 * Check if a specific model is installed
 */
export async function isModelInstalled(
  modelName: string,
  endpoint: string = 'http://localhost:11434'
): Promise<boolean> {
  const models = await getInstalledOllamaModels(endpoint);
  return models.some(m => m.name === modelName);
}

/**
 * Get model names only (for dropdowns)
 */
export async function getModelNames(
  endpoint: string = 'http://localhost:11434'
): Promise<string[]> {
  const models = await getInstalledOllamaModels(endpoint);
  return models.map(m => m.name);
}

/**
 * Validate if a model name exists
 */
export async function validateModelName(
  modelName: string,
  endpoint: string = 'http://localhost:11434'
): Promise<{ valid: boolean; message: string }> {
  const isInstalled = await isModelInstalled(modelName, endpoint);

  if (isInstalled) {
    return {
      valid: true,
      message: `Model ${modelName} is installed and ready to use`,
    };
  }

  const models = await getInstalledOllamaModels(endpoint);
  
  if (models.length === 0) {
    return {
      valid: false,
      message: 'No models installed. Please install a model using: ollama pull <model-name>',
    };
  }

  return {
    valid: false,
    message: `Model ${modelName} not found. Available models: ${models.map(m => m.name).join(', ')}`,
  };
}
