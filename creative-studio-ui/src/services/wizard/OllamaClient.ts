/**
 * Ollama Client
 * 
 * Handles communication with Ollama API for text generation.
 * Supports streaming and non-streaming responses with prompt templates.
 * 
 * Requirements: 3.2, 4.2, 5.2, 6.2, 7.2
 */

import type { OllamaRequest, OllamaResponse } from './types';
import { WizardError } from './types';
import { getLogger } from './logger';

/**
 * Ollama generation options
 */
export interface OllamaGenerationOptions {
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  seed?: number;
  stream?: boolean;
}

/**
 * Streaming callback type
 */
export type StreamCallback = (chunk: string) => void;

/**
 * Prompt template type
 */
export type PromptTemplateType = 
  | 'character'
  | 'scene'
  | 'dialogue'
  | 'world'
  | 'storyboard';

/**
 * Ollama Client Class
 */
export class OllamaClient {
  private endpoint: string;
  private model: string;
  private logger = getLogger();
  private defaultOptions: OllamaGenerationOptions;

  constructor(
    endpoint: string = 'http://localhost:11434',
    model: string = 'gemma2:2b',
    defaultOptions?: OllamaGenerationOptions
  ) {
    this.endpoint = endpoint;
    this.model = model;
    this.defaultOptions = {
      temperature: 0.7,
      top_p: 0.9,
      max_tokens: 2000,
      stream: false,
      ...defaultOptions,
    };
  }

  /**
   * Generate completion using Ollama API
   * 
   * @param prompt - The prompt to send to the model
   * @param options - Generation options
   * @returns Generated text
   */
  async generate(
    prompt: string,
    options?: OllamaGenerationOptions
  ): Promise<string> {
    const mergedOptions = { ...this.defaultOptions, ...options };

    this.logger.info('ollama', 'Generating completion', {
      model: this.model,
      promptLength: prompt.length,
      options: mergedOptions,
    });

    const request: OllamaRequest = {
      model: this.model,
      prompt,
      stream: false,
      options: {
        temperature: mergedOptions.temperature,
        top_p: mergedOptions.top_p,
        num_predict: mergedOptions.max_tokens,
        seed: mergedOptions.seed,
      },
    };

    try {
      const response = await fetch(`${this.endpoint}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(60000), // 60 second timeout
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new WizardError(
          `Ollama API request failed: ${response.status} ${response.statusText}`,
          'generation',
          true,
          true,
          {
            status: response.status,
            statusText: response.statusText,
            error: errorText,
            endpoint: this.endpoint,
          }
        );
      }

      const data: OllamaResponse = await response.json();

      this.logger.info('ollama', 'Generation completed', {
        model: this.model,
        responseLength: data.response.length,
        totalDuration: data.total_duration,
      });

      return data.response;
    } catch (error) {
      if (error instanceof WizardError) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('ollama', 'Generation failed', error as Error);

      throw new WizardError(
        `Failed to generate completion: ${errorMessage}`,
        'generation',
        true,
        true,
        {
          originalError: error,
          endpoint: this.endpoint,
          model: this.model,
        }
      );
    }
  }

  /**
   * Generate completion with streaming
   * 
   * @param prompt - The prompt to send to the model
   * @param onChunk - Callback for each chunk of generated text
   * @param options - Generation options
   * @returns Complete generated text
   */
  async generateStreaming(
    prompt: string,
    onChunk: StreamCallback,
    options?: OllamaGenerationOptions
  ): Promise<string> {
    const mergedOptions = { ...this.defaultOptions, ...options, stream: true };

    this.logger.info('ollama', 'Generating streaming completion', {
      model: this.model,
      promptLength: prompt.length,
      options: mergedOptions,
    });

    const request: OllamaRequest = {
      model: this.model,
      prompt,
      stream: true,
      options: {
        temperature: mergedOptions.temperature,
        top_p: mergedOptions.top_p,
        num_predict: mergedOptions.max_tokens,
        seed: mergedOptions.seed,
      },
    };

    try {
      const response = await fetch(`${this.endpoint}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(120000), // 120 second timeout for streaming
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new WizardError(
          `Ollama API streaming request failed: ${response.status} ${response.statusText}`,
          'generation',
          true,
          true,
          {
            status: response.status,
            statusText: response.statusText,
            error: errorText,
            endpoint: this.endpoint,
          }
        );
      }

      return await this.processStream(response, onChunk);
    } catch (error) {
      if (error instanceof WizardError) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('ollama', 'Streaming generation failed', error as Error);

      throw new WizardError(
        `Failed to generate streaming completion: ${errorMessage}`,
        'generation',
        true,
        true,
        {
          originalError: error,
          endpoint: this.endpoint,
          model: this.model,
        }
      );
    }
  }

  /**
   * Process streaming response
   */
  private async processStream(
    response: Response,
    onChunk: StreamCallback
  ): Promise<string> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new WizardError(
        'No response body available for streaming',
        'generation',
        false,
        false
      );
    }

    const decoder = new TextDecoder();
    let fullResponse = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter((line) => line.trim());

        for (const line of lines) {
          try {
            const data: OllamaResponse = JSON.parse(line);
            if (data.response) {
              fullResponse += data.response;
              onChunk(data.response);
            }

            if (data.done) {
              this.logger.info('ollama', 'Streaming generation completed', {
                model: this.model,
                responseLength: fullResponse.length,
                totalDuration: data.total_duration,
              });
            }
          } catch (parseError) {
            // Skip invalid JSON lines
            this.logger.debug('ollama', 'Skipped invalid JSON line in stream', {
              line,
            });
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return fullResponse;
  }

  /**
   * Get prompt template for specific wizard type
   * 
   * Requirements: 3.2, 4.2, 5.2, 6.2, 7.2
   */
  getPromptTemplate(type: PromptTemplateType): string {
    switch (type) {
      case 'character':
        return this.getCharacterPromptTemplate();
      case 'scene':
        return this.getScenePromptTemplate();
      case 'dialogue':
        return this.getDialoguePromptTemplate();
      case 'world':
        return this.getWorldPromptTemplate();
      case 'storyboard':
        return this.getStoryboardPromptTemplate();
      default:
        throw new Error(`Unknown prompt template type: ${type}`);
    }
  }

  /**
   * Character generation prompt template
   * 
   * Requirements: 3.2
   */
  private getCharacterPromptTemplate(): string {
    return `You are a character development expert for storytelling. Create a detailed, well-rounded character profile based on the provided information.

Generate a comprehensive character profile in JSON format with the following structure:
{
  "name": "character name",
  "backstory": "detailed backstory (2-3 paragraphs)",
  "motivations": ["primary motivation", "secondary motivation"],
  "personality_traits": ["trait 1", "trait 2", "trait 3"],
  "relationships": ["relationship description 1", "relationship description 2"],
  "character_arc": "potential character development arc",
  "dialogue_style": "description of how this character speaks",
  "strengths": ["strength 1", "strength 2"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "fears": ["fear 1", "fear 2"],
  "goals": ["short-term goal", "long-term goal"]
}

Ensure the character is internally consistent, believable, and has depth. Consider their background, personality, and role in the story.

Character Information:
{input}

Generate the character profile:`;
  }

  /**
   * Scene generation prompt template
   * 
   * Requirements: 4.2
   */
  private getScenePromptTemplate(): string {
    return `You are a scene breakdown specialist for visual storytelling. Break down the provided scene concept into individual shots with detailed descriptions.

Generate a shot-by-shot breakdown in JSON format with the following structure:
{
  "scene_title": "scene title",
  "scene_description": "overall scene description",
  "shots": [
    {
      "shot_number": 1,
      "title": "shot title",
      "description": "detailed shot description",
      "duration": 5.0,
      "camera_angle": "camera angle (e.g., wide, medium, close-up)",
      "camera_movement": "camera movement (e.g., static, pan, dolly)",
      "action": "what happens in this shot",
      "dialogue": "any dialogue in this shot (or empty string)",
      "visual_notes": "important visual elements"
    }
  ]
}

Consider pacing, visual flow, and narrative structure. Each shot should advance the story or reveal character.

Scene Information:
{input}

Generate the shot breakdown:`;
  }

  /**
   * Dialogue generation prompt template
   * 
   * Requirements: 6.2
   */
  private getDialoguePromptTemplate(): string {
    return `You are a dialogue writing specialist. Create natural, character-appropriate dialogue for the given scene context.

Generate dialogue in JSON format with the following structure:
{
  "scene_context": "brief scene context",
  "dialogue_tracks": [
    {
      "speaker": "character name",
      "text": "dialogue text",
      "emotion": "emotional tone (e.g., happy, sad, angry, neutral)",
      "subtext": "what the character really means or feels",
      "delivery_notes": "how the line should be delivered"
    }
  ]
}

Ensure dialogue:
- Reveals character personality and background
- Sounds natural and conversational
- Advances the plot or develops relationships
- Has appropriate emotional tone
- Includes subtext and nuance

Scene Context:
{input}

Generate the dialogue:`;
  }

  /**
   * World building prompt template
   * 
   * Requirements: 7.2
   */
  private getWorldPromptTemplate(): string {
    return `You are a world-building expert for storytelling. Create a rich, detailed world definition based on the provided concept.

Generate a world definition in JSON format with the following structure:
{
  "name": "world name",
  "setting": "overall setting description (2-3 paragraphs)",
  "time_period": "time period or era",
  "locations": [
    {
      "name": "location name",
      "description": "detailed location description",
      "significance": "why this location matters to the story",
      "atmosphere": "mood and feeling of this location"
    }
  ],
  "rules": [
    "fundamental rule or law of this world",
    "another important rule"
  ],
  "lore": "historical background and mythology (2-3 paragraphs)",
  "culture": {
    "social_structure": "how society is organized",
    "values": ["core value 1", "core value 2"],
    "customs": ["custom 1", "custom 2"],
    "conflicts": ["major conflict or tension in this world"]
  },
  "technology_magic": "description of technology level or magic system",
  "threats": ["threat or danger 1", "threat or danger 2"]
}

Ensure the world is:
- Internally consistent
- Rich with detail
- Supports interesting stories
- Has clear rules and logic
- Feels lived-in and real

World Concept:
{input}

Generate the world definition:`;
  }

  /**
   * Storyboard generation prompt template
   * 
   * Requirements: 5.2
   */
  private getStoryboardPromptTemplate(): string {
    return `You are a storyboard artist and visual storytelling expert. Convert the provided script into a detailed shot sequence for visual generation.

Generate a storyboard in JSON format with the following structure:
{
  "title": "storyboard title",
  "total_duration": 30.0,
  "visual_style": "overall visual style description",
  "shots": [
    {
      "shot_number": 1,
      "title": "shot title",
      "description": "detailed visual description for image generation",
      "duration": 5.0,
      "composition": "composition notes (rule of thirds, symmetry, etc.)",
      "lighting": "lighting description (natural, dramatic, soft, etc.)",
      "color_palette": "dominant colors and mood",
      "visual_prompt": "optimized prompt for AI image generation",
      "camera_angle": "camera angle",
      "focal_point": "what should draw the viewer's attention"
    }
  ]
}

For each shot:
- Create a clear, detailed visual description
- Consider composition and framing
- Specify lighting and mood
- Provide an optimized prompt for image generation
- Ensure visual continuity between shots

Script:
{input}

Generate the storyboard:`;
  }

  /**
   * Build prompt from template and input data
   */
  // Using 'any' for input parameter to support flexible input data structures for different wizard types
  buildPrompt(type: PromptTemplateType, input: Record<string, any>): string {
    const template = this.getPromptTemplate(type);
    const inputStr = JSON.stringify(input, null, 2);
    return template.replace('{input}', inputStr);
  }

  /**
   * Generate with template
   */
  async generateWithTemplate(
    type: PromptTemplateType,
    input: Record<string, any>,
    options?: OllamaGenerationOptions
  ): Promise<string> {
    const prompt = this.buildPrompt(type, input);
    return this.generate(prompt, options);
  }

  /**
   * Generate with template (streaming)
   */
  async generateWithTemplateStreaming(
    type: PromptTemplateType,
    input: Record<string, any>,
    onChunk: StreamCallback,
    options?: OllamaGenerationOptions
  ): Promise<string> {
    const prompt = this.buildPrompt(type, input);
    return this.generateStreaming(prompt, onChunk, options);
  }

  /**
   * Parse JSON response from Ollama
   * Handles cases where the model returns JSON wrapped in markdown code blocks
   */
  // Using 'any' for return type to support parsing various JSON response structures
  parseJSONResponse(response: string): any {
    // Try to parse directly first
    try {
      return JSON.parse(response);
    } catch {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = response.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[1]);
        } catch {
          // Fall through to error
        }
      }

      // Try to find JSON object in the response
      const objectMatch = response.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        try {
          return JSON.parse(objectMatch[0]);
        } catch {
          // Fall through to error
        }
      }

      throw new WizardError(
        'Failed to parse JSON response from Ollama',
        'generation',
        false,
        true,
        { response: response.substring(0, 500) }
      );
    }
  }

  /**
   * Update model
   */
  setModel(model: string): void {
    this.model = model;
    this.logger.info('ollama', 'Model updated', { model });
  }

  /**
   * Get current model
   */
  getModel(): string {
    return this.model;
  }

  /**
   * Update endpoint
   */
  setEndpoint(endpoint: string): void {
    this.endpoint = endpoint;
    this.logger.info('ollama', 'Endpoint updated', { endpoint });
  }

  /**
   * Get current endpoint
   */
  getEndpoint(): string {
    return this.endpoint;
  }

  /**
   * Update default options
   */
  setDefaultOptions(options: Partial<OllamaGenerationOptions>): void {
    this.defaultOptions = { ...this.defaultOptions, ...options };
    this.logger.info('ollama', 'Default options updated', this.defaultOptions);
  }

  /**
   * Get default options
   */
  getDefaultOptions(): OllamaGenerationOptions {
    return { ...this.defaultOptions };
  }
}

/**
 * Singleton instance
 */
let ollamaClientInstance: OllamaClient | null = null;

/**
 * Get the singleton Ollama client instance
 * Automatically configures from stored LLM settings if available
 */
export async function getOllamaClient(): Promise<OllamaClient> {
  if (!ollamaClientInstance) {
    // Try to load configuration from settings
    try {
      const { loadLLMSettings } = await import('@/utils/secureStorage');
      const llmConfig = await loadLLMSettings();
      
      if (llmConfig && llmConfig.provider === 'local') {
        // Use configuration from settings
        const endpoint = llmConfig.apiEndpoint || 'http://localhost:11434';
        const model = llmConfig.model || 'gemma2:2b';
        const options = {
          temperature: llmConfig.parameters?.temperature ?? 0.7,
          top_p: llmConfig.parameters?.topP ?? 0.9,
          max_tokens: llmConfig.parameters?.maxTokens ?? 2000,
        };
        
        ollamaClientInstance = new OllamaClient(endpoint, model, options);
      } else {
        // Fallback to default configuration
        ollamaClientInstance = new OllamaClient();
      }
    } catch (error) {
      console.warn('[OllamaClient] Failed to load LLM settings, using defaults:', error);
      ollamaClientInstance = new OllamaClient();
    }
  }
  return ollamaClientInstance;
}

/**
 * Get the singleton Ollama client instance synchronously
 * Note: This may use default configuration if settings haven't been loaded yet
 * Prefer using getOllamaClient() for proper configuration loading
 */
export function getOllamaClientSync(): OllamaClient {
  if (!ollamaClientInstance) {
    ollamaClientInstance = new OllamaClient();
  }
  return ollamaClientInstance;
}

/**
 * Create a new Ollama client instance
 */
export function createOllamaClient(
  endpoint?: string,
  model?: string,
  defaultOptions?: OllamaGenerationOptions
): OllamaClient {
  return new OllamaClient(endpoint, model, defaultOptions);
}

/**
 * Set the singleton Ollama client instance
 */
export function setOllamaClient(client: OllamaClient): void {
  ollamaClientInstance = client;
}

/**
 * Reset the singleton instance to force reloading configuration
 * Useful when LLM settings are updated
 */
export function resetOllamaClient(): void {
  ollamaClientInstance = null;
}

/**
 * Update the Ollama client configuration from LLM settings
 * Call this when LLM settings are changed
 */
export async function updateOllamaClientFromSettings(): Promise<void> {
  try {
    const { loadLLMSettings } = await import('@/utils/secureStorage');
    const llmConfig = await loadLLMSettings();
    
    if (llmConfig && llmConfig.provider === 'local') {
      const endpoint = llmConfig.apiEndpoint || 'http://localhost:11434';
      const model = llmConfig.model || 'gemma2:2b';
      const options = {
        temperature: llmConfig.parameters?.temperature ?? 0.7,
        top_p: llmConfig.parameters?.topP ?? 0.9,
        max_tokens: llmConfig.parameters?.maxTokens ?? 2000,
      };
      
      // Create new client with updated configuration
      ollamaClientInstance = new OllamaClient(endpoint, model, options);
    } else if (ollamaClientInstance) {
      // If provider changed from local to something else, reset the client
      ollamaClientInstance = null;
    }
  } catch (error) {
    console.error('[OllamaClient] Failed to update from settings:', error);
  }
}
