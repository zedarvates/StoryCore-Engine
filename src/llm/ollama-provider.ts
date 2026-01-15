import { LLMProvider, LLMConfig, Message } from './interfaces';

interface OllamaResponse {
  response: string;
  done: boolean;
  context?: number[];
}

interface OllamaChatResponse {
  message: {
    role: string;
    content: string;
  };
  done: boolean;
}

type OllamaApiResponse = OllamaResponse | OllamaChatResponse;

export class OllamaProvider implements LLMProvider {
  private baseUrl: string;
  private timeout: number;

  constructor(baseUrl = 'http://localhost:11434', timeout = 30000) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
  }

  async generateText(prompt: string, config?: Partial<LLMConfig>): Promise<string> {
    const mergedConfig = { ...this.getDefaultConfig(), ...config };
    const response = await this.callApi('/api/generate', {
      model: mergedConfig.model,
      prompt,
      stream: false,
      options: mergedConfig.options,
    });
    return (response as OllamaResponse).response;
  }

  async generateCompletion(messages: Message[], config?: Partial<LLMConfig>): Promise<string> {
    const mergedConfig = { ...this.getDefaultConfig(), ...config };
    const response = await this.callApi('/api/chat', {
      model: mergedConfig.model,
      messages,
      stream: false,
      options: mergedConfig.options,
    });
    return (response as OllamaChatResponse).message.content;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  private async callApi(endpoint: string, body: unknown): Promise<OllamaApiResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data: OllamaApiResponse = await response.json();
      return data;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private getDefaultConfig(): Partial<LLMConfig> {
    return {
      model: 'llama2',
      temperature: 0.7,
      timeout: this.timeout,
    };
  }
}