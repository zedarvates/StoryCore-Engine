import { LLMProvider, LLMConfig, Message } from './interfaces';

interface OpenAICompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    text: string;
    index: number;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface OpenAIChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    index: number;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface OpenAIModelsResponse {
  object: string;
  data: Array<{
    id: string;
    object: string;
    created: number;
    owned_by: string;
  }>;
}

export class OpenAIProvider implements LLMProvider {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeout: number;

  constructor(apiKey: string, baseUrl = 'https://api.openai.com/v1', timeout = 30000) {
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('OpenAI API key is required');
    }
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.timeout = timeout;
  }

  async generateText(prompt: string, config?: Partial<LLMConfig>): Promise<string> {
    const mergedConfig = { ...this.getDefaultConfig(), ...config };
    const response = await this.callApi('/completions', {
      model: mergedConfig.model,
      prompt,
      temperature: mergedConfig.temperature,
      max_tokens: mergedConfig.maxTokens,
      ...mergedConfig.options,
    }) as OpenAICompletionResponse;
    return response.choices[0]?.text ?? '';
  }

  async generateCompletion(messages: Message[], config?: Partial<LLMConfig>): Promise<string> {
    const mergedConfig = { ...this.getDefaultConfig(), ...config };
    const response = await this.callApi('/chat/completions', {
      model: mergedConfig.model,
      messages,
      temperature: mergedConfig.temperature,
      max_tokens: mergedConfig.maxTokens,
      ...mergedConfig.options,
    }) as OpenAIChatResponse;
    return response.choices[0]?.message?.content ?? '';
  }

  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  private async callApi(endpoint: string, body: unknown): Promise<OpenAICompletionResponse | OpenAIChatResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        if (response.status === 403 || (response.status === 429 && errorText.includes('quota'))) {
          throw new Error('API quota exceeded. Please check your OpenAI billing.');
        }
        if (response.status === 401) {
          throw new Error('Invalid API key provided.');
        }
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      return await response.json() as OpenAICompletionResponse | OpenAIChatResponse;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private getDefaultConfig(): Partial<LLMConfig> {
    return {
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
      maxTokens: 1000,
      timeout: this.timeout,
    };
  }
}