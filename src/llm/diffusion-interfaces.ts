export interface DiffusionConfig {
  provider: 'diffusion';
  modelPath: string;           // Path to local model (LDDA, etc.)
  modelType: 'llda' | 'sseds' | 'custom';
  steps: number;               // Diffusion steps for text gen (default: 10-20)
  scheduler?: 'dpm++' | 'ddim' | 'euler';
  temperature?: number;
  maxTokens?: number;
  device: 'cuda' | 'cpu' | 'metal';  // GPU/CPU/MPS support
}

export interface DiffusionResponse {
  text: string;
  usage: {
    tokens: number;
    latencyMs: number;
    steps: number;
  };
  model: string;
}

export interface DiffusionProviderOptions {
  batchSize?: number;
  quantization?: '4bit' | '8bit' | 'none';
  contextLength?: number;
}
