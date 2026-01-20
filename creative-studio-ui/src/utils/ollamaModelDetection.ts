/**
 * Ollama Model Detection Utility
 * 
 * Automatically detects available Ollama models and suggests the best one to use.
 */

export interface OllamaModel {
  name: string;
  size: string;
  modified: string;
}

export interface ModelSuggestion {
  model: string;
  reason: string;
  alternatives: string[];
}

/**
 * Get list of installed Ollama models
 */
export async function getInstalledOllamaModels(
  endpoint: string = 'http://localhost:11434'
): Promise<OllamaModel[]> {
  try {
    const response = await fetch(`${endpoint}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      console.error('[OllamaDetection] Failed to fetch models:', response.status);
      return [];
    }

    const data = await response.json();
    return data.models || [];
  } catch (error) {
    console.error('[OllamaDetection] Error fetching models:', error);
    return [];
  }
}

/**
 * Suggest the best model to use based on what's installed
 */
export async function suggestBestModel(
  endpoint: string = 'http://localhost:11434'
): Promise<ModelSuggestion | null> {
  const models = await getInstalledOllamaModels(endpoint);

  if (models.length === 0) {
    return null;
  }

  // Priority order for model selection (best for StoryCore use case)
  const preferredModels = [
    'qwen3-vl:8b',        // Best: Vision + Language, perfect for StoryCore
    'llama3.1:8b',        // High quality, good for complex narratives
    'llama3.2:3b',        // Balanced performance
    'gemma3:4b',          // Fast and efficient
    'gemma3:1b',          // Ultra fast
    'mistral:latest',     // Alternative high-quality option
    'qwen2.5-coder:latest', // Good for technical content
    'phi3:mini',          // Compact and efficient
  ];

  // Find the first preferred model that's installed
  for (const preferred of preferredModels) {
    const found = models.find(m => m.name === preferred);
    if (found) {
      return {
        model: found.name,
        reason: `Found ${found.name} installed - good balance of speed and quality`,
        alternatives: models
          .filter(m => m.name !== found.name)
          .map(m => m.name)
          .slice(0, 3),
      };
    }
  }

  // If no preferred model found, use the first available
  const firstModel = models[0];
  return {
    model: firstModel.name,
    reason: `Using ${firstModel.name} (first available model)`,
    alternatives: models
      .slice(1)
      .map(m => m.name)
      .slice(0, 3),
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
