import { LLMProvider, LLMConfig, Message } from './interfaces';

interface GeminiContent {
  parts: Array<{ text: string }>;
  role?: 'user' | 'model';
}

interface GeminiGenerateContentRequest {
  contents: GeminiContent | GeminiContent[];
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
    topP?: number;
    topK?: number;
  };
  systemInstruction?: {
    parts: Array<{ text: string }>;
  };
}

interface GeminiGenerateContentResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
      role: string;
    };
    finishReason: string;
    index: number;
    safetyRatings: Array<{
      category: string;
      probability: string;
    }>;
  }>;
  promptFeedback?: {
    blockReason?: string;
    safetyRatings: Array<{
      category: string;
      probability: string;
    }>;
  };
}

export class GeminiProvider implements LLMProvider {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeout: number;

  constructor(apiKey: string, baseUrl = 'https://generativelanguage.googleapis.com/v1beta', timeout = 30000) {
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('Gemini API key is required');
    }
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.timeout = timeout;
  }

  async generateText(prompt: string, config?: Partial<LLMConfig>): Promise<string> {
    const mergedConfig = { ...this.getDefaultConfig(), ...config };
    const request: GeminiGenerateContentRequest = {
      contents: { parts: [{ text: prompt }] },
      generationConfig: {
        temperature: mergedConfig.temperature,
        maxOutputTokens: mergedConfig.maxTokens,
        topP: mergedConfig.options?.topP as number | undefined,
        topK: mergedConfig.options?.topK as number | undefined,
      },
    };

    const response = await this.callApi(mergedConfig.model, request);
    return response.candidates[0]?.content?.parts[0]?.text ?? '';
  }

  async generateCompletion(messages: Message[], config?: Partial<LLMConfig>): Promise<string> {
    const mergedConfig = { ...this.getDefaultConfig(), ...config };
    const contents: GeminiContent[] = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    const request: GeminiGenerateContentRequest = {
      contents,
      generationConfig: {
        temperature: mergedConfig.temperature,
        maxOutputTokens: mergedConfig.maxTokens,
        topP: mergedConfig.options?.topP as number | undefined,
        topK: mergedConfig.options?.topK as number | undefined,
      },
    };

    const response = await this.callApi(mergedConfig.model, request);
    return response.candidates[0]?.content?.parts[0]?.text ?? '';
  }

  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const simpleRequest: GeminiGenerateContentRequest = {
        contents: { parts: [{ text: 'Hello' }] },
      };
      const response = await fetch(`${this.baseUrl}/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(simpleRequest),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  private async callApi(model: string, body: GeminiGenerateContentRequest): Promise<GeminiGenerateContentResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
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
          throw new Error('API quota exceeded. Please check your Google AI billing.');
        }
        if (response.status === 401) {
          throw new Error('Invalid API key provided.');
        }
        if (response.status === 400 && errorText.includes('blocked')) {
          throw new Error('Content blocked by safety filters.');
        }
        throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result: GeminiGenerateContentResponse = await response.json();
      if (result.promptFeedback?.blockReason) {
        throw new Error('Prompt blocked by safety filters.');
      }
      return result;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private getDefaultConfig(): Partial<LLMConfig> {
    return {
      model: 'gemini-1.5-flash',
      temperature: 0.7,
      maxTokens: 1000,
      timeout: this.timeout,
    };
  }
}