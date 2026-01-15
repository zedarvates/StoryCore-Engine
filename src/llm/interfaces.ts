export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LLMConfig {
  provider: string;
  baseUrl?: string;
  apiKey?: string; // Should be encrypted when stored
  model: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
  // Provider-specific options
  options?: Record<string, unknown>;
}

export interface LLMProvider {
  generateText(prompt: string, config?: Partial<LLMConfig>): Promise<string>;
  generateCompletion(messages: Message[], config?: Partial<LLMConfig>): Promise<string>;
  isAvailable(): Promise<boolean>;
}