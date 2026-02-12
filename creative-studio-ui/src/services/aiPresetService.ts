import type { Shot } from '../types';
import { analyzeScene, type SceneAnalysis, type SceneType } from '../utils/sceneAnalysis';
import { getBuiltinPresets, type SurroundPreset } from '../components/SurroundPresetsPanel';
import { LLMProvider, Message } from '../../../src/llm/interfaces';

/**
 * AI preset suggestion result
 */
export interface AIPresetSuggestion {
  preset: SurroundPreset;
  analysis: SceneAnalysis;
  confidence: number;
  reasoning: string;
  alternativePresets?: SurroundPreset[];
}

/**
 * LLM API configuration (legacy - kept for backward compatibility)
 */
interface LLMConfig {
  enabled: boolean;
  apiUrl?: string;
  apiKey?: string;
  model?: string;
}

/**
 * AI Preset Service
 *
 * Provides intelligent surround sound preset suggestions based on scene analysis.
 * Uses LLM provider for enhanced analysis via dependency injection.
 *
 * Requirements: 20.11
 */
export class AIPresetService {
  private readonly llmProvider?: LLMProvider;
  private readonly legacyConfig?: LLMConfig;

  constructor(provider?: LLMProvider);
  constructor(llmConfig?: LLMConfig);
  constructor(providerOrConfig?: LLMProvider | LLMConfig) {
    if (providerOrConfig && 'generateText' in providerOrConfig) {
      this.llmProvider = providerOrConfig;
    } else if (providerOrConfig) {
      this.legacyConfig = providerOrConfig as LLMConfig;
    }
  }

  /**
   * Suggest a surround sound preset for a shot
   */
  async suggestPreset(shot: Shot): Promise<AIPresetSuggestion> {
    // Perform local scene analysis
    const analysis = analyzeScene(shot);

    // If LLM provider is available, enhance with LLM analysis
    if (this.llmProvider) {
      try {
        const llmAnalysis = await this.callLLMProvider(shot);
        return this.mergeLLMAnalysis(analysis, llmAnalysis);
      } catch (error) {
        console.warn('LLM provider call failed, falling back to local analysis:', error);
        // Fall through to local analysis
      }
    } else if (this.legacyConfig?.enabled && this.legacyConfig.apiUrl) {
      // Backward compatibility: use legacy direct API call
      try {
        const llmAnalysis = await this.callLegacyLLMAPI(shot);
        return this.mergeLLMAnalysis(analysis, llmAnalysis);
      } catch (error) {
        console.warn('Legacy LLM API call failed, falling back to local analysis:', error);
      }
    }

    // Use local analysis to suggest preset
    return this.createSuggestionFromAnalysis(analysis);
  }

  /**
   * Create preset suggestion from scene analysis
   */
  private createSuggestionFromAnalysis(analysis: SceneAnalysis): AIPresetSuggestion {
    const presets = getBuiltinPresets();
    const preset = presets.find((p) => p.id === analysis.suggestedPreset);

    if (!preset) {
      // Fallback to cinematic preset
      const fallbackPreset = presets.find((p) => p.id === 'cinematic')!;
      return {
        preset: fallbackPreset,
        analysis,
        confidence: 50,
        reasoning: 'Using default cinematic preset',
        alternativePresets: presets.slice(0, 3),
      };
    }

    // Find alternative presets
    const alternativePresets = this.findAlternativePresets(analysis.sceneType, preset);

    return {
      preset,
      analysis,
      confidence: analysis.confidence,
      reasoning: analysis.reasoning,
      alternativePresets,
    };
  }

  /**
   * Find alternative presets based on scene type
   */
  private findAlternativePresets(
    sceneType: SceneType,
    excludePreset: SurroundPreset
  ): SurroundPreset[] {
    const presets = getBuiltinPresets();

    // Define related scene types
    const relatedTypes: Record<SceneType, string[]> = {
      dialogue: ['voiceover', 'cinematic'],
      action: ['cinematic', 'ambient'],
      ambient: ['music', 'cinematic'],
      music: ['ambient', 'cinematic'],
      voiceover: ['dialogue', 'cinematic'],
      cinematic: ['action', 'music'],
    };

    const related = relatedTypes[sceneType] || [];

    return presets
      .filter((p) => p.id !== excludePreset.id && related.includes(p.id))
      .slice(0, 2);
  }

  /**
   * Call LLM provider for enhanced scene analysis
   */
  private async callLLMProvider(shot: Shot): Promise<LLMAnalysisResult> {
    if (!this.llmProvider) {
      throw new Error('LLM provider not available');
    }

    const prompt = this.buildLLMPrompt(shot);
    const messages: Message[] = [
      {
        role: 'system',
        content: 'You are an expert audio engineer specializing in surround sound mixing for film and video. Analyze scenes and recommend appropriate surround sound configurations.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ];

    const response = await this.llmProvider.generateCompletion(messages, {
      temperature: 0.3,
      maxTokens: 500,
    });

    return this.parseLLMResponse({ choices: [{ message: { content: response } }] });
  }

  /**
   * Call legacy LLM API for backward compatibility
   */
  private async callLegacyLLMAPI(shot: Shot): Promise<LLMAnalysisResult> {
    if (!this.legacyConfig?.apiUrl || !this.legacyConfig?.apiKey) {
      throw new Error('Legacy LLM API not configured');
    }

    const prompt = this.buildLLMPrompt(shot);

    const response = await fetch(this.legacyConfig.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.legacyConfig.apiKey}`,
      },
      body: JSON.stringify({
        model: this.legacyConfig.model || 'gpt-4',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert audio engineer specializing in surround sound mixing for film and video. Analyze scenes and recommend appropriate surround sound configurations.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM API error: ${response.statusText}`);
    }

    const data = await response.json();
    return this.parseLLMResponse(data);
  }

  /**
   * Build LLM prompt for scene analysis
   */
  private buildLLMPrompt(shot: Shot): string {
    return `Analyze this video scene and recommend a surround sound preset:

Title: ${shot.title}
Description: ${shot.description}
Duration: ${shot.duration} seconds

Available presets:
1. Dialogue - Center-focused for clear speech (5.1)
2. Action - Full surround for immersive action (7.1)
3. Ambient - Surround-heavy for atmosphere (5.1)
4. Music - Balanced stereo with subtle surround (5.1)
5. Voiceover - Center-only for narration (5.1)
6. Cinematic - Wide soundstage for film (7.1)

Please respond in JSON format:
{
  "sceneType": "dialogue|action|ambient|music|voiceover|cinematic",
  "confidence": 0-100,
  "reasoning": "Brief explanation",
  "suggestedPreset": "preset name",
  "alternativePresets": ["preset1", "preset2"]
}`;
  }

  /**
   * Parse LLM API response
   */
  private parseLLMResponse(data: unknown): LLMAnalysisResult {
    try {
      let content: string;

      // Handle different response formats
      if (typeof data === 'string') {
        // Direct string response from LLMProvider
        content = data;
      } else if (data.choices && data.choices[0]?.message?.content) {
        // Legacy API format
        content = data.choices[0].message.content;
      } else {
        throw new Error('Invalid LLM response format');
      }

      const jsonMatch = content.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error('No JSON found in LLM response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        sceneType: parsed.sceneType,
        confidence: parsed.confidence,
        reasoning: parsed.reasoning,
        suggestedPreset: parsed.suggestedPreset,
        alternativePresets: parsed.alternativePresets || [],
      };
    } catch (error) {
      throw new Error(`Failed to parse LLM response: ${error}`);
    }
  }

  /**
   * Merge LLM analysis with local analysis
   */
  private mergeLLMAnalysis(
    localAnalysis: SceneAnalysis,
    llmAnalysis: LLMAnalysisResult
  ): AIPresetSuggestion {
    const presets = getBuiltinPresets();

    // Find preset by name (case-insensitive)
    const preset = presets.find(
      (p) => p.name.toLowerCase() === llmAnalysis.suggestedPreset.toLowerCase()
    );

    if (!preset) {
      // Fallback to local analysis
      return this.createSuggestionFromAnalysis(localAnalysis);
    }

    // Find alternative presets
    const alternativePresets = llmAnalysis.alternativePresets
      .map((name) => presets.find((p) => p.name.toLowerCase() === name.toLowerCase()))
      .filter((p): p is SurroundPreset => p !== undefined)
      .slice(0, 2);

    // Combine confidence scores (weighted average: 60% LLM, 40% local)
    const combinedConfidence = Math.round(
      llmAnalysis.confidence * 0.6 + localAnalysis.confidence * 0.4
    );

    return {
      preset,
      analysis: {
        ...localAnalysis,
        sceneType: llmAnalysis.sceneType as SceneType,
        confidence: combinedConfidence,
        reasoning: llmAnalysis.reasoning,
      },
      confidence: combinedConfidence,
      reasoning: `${llmAnalysis.reasoning} (AI-enhanced analysis)`,
      alternativePresets,
    };
  }

  /**
   * Update LLM configuration (legacy method for backward compatibility)
   */
  updateConfig(config: Partial<LLMConfig>): void {
    if (this.legacyConfig) {
      this.legacyConfig = { ...this.legacyConfig, ...config };
    }
  }

  /**
   * Check if LLM is enabled and configured
   */
  isLLMEnabled(): boolean {
    if (this.llmProvider) {
      return true; // Assume provider is configured if injected
    }
    return !!(
      this.legacyConfig?.enabled &&
      this.legacyConfig?.apiUrl &&
      this.legacyConfig?.apiKey
    );
  }

  /**
   * Set LLM provider (new method for dependency injection)
   */
  setLLMProvider(provider: LLMProvider): void {
    this.llmProvider = provider;
    this.legacyConfig = undefined; // Clear legacy config when provider is set
  }
}

/**
 * LLM analysis result
 */
interface LLMAnalysisResult {
  sceneType: string;
  confidence: number;
  reasoning: string;
  suggestedPreset: string;
  alternativePresets: string[];
}

/**
 * Global AI preset service instance
 */
let aiPresetServiceInstance: AIPresetService | null = null;

/**
 * Get the global AI preset service instance
 */
export function getAIPresetService(): AIPresetService {
  if (!aiPresetServiceInstance) {
    aiPresetServiceInstance = new AIPresetService();
  }
  return aiPresetServiceInstance;
}

/**
 * Initialize AI preset service with LLM configuration (legacy)
 */
export function initializeAIPresetService(config: LLMConfig): AIPresetService;

/**
 * Initialize AI preset service with LLM provider
 */
export function initializeAIPresetService(provider: LLMProvider): AIPresetService;

export function initializeAIPresetService(configOrProvider: LLMConfig | LLMProvider): AIPresetService {
  if ('generateText' in configOrProvider) {
    aiPresetServiceInstance = new AIPresetService(configOrProvider);
  } else {
    aiPresetServiceInstance = new AIPresetService(configOrProvider);
  }
  return aiPresetServiceInstance;
}

/**
 * Quick preset suggestion (uses local analysis only)
 */
export function quickSuggestPreset(shot: Shot): AIPresetSuggestion {
  const analysis = analyzeScene(shot);
  const presets = getBuiltinPresets();
  const preset = presets.find((p) => p.id === analysis.suggestedPreset);

  if (!preset) {
    const fallbackPreset = presets.find((p) => p.id === 'cinematic')!;
    return {
      preset: fallbackPreset,
      analysis,
      confidence: 50,
      reasoning: 'Using default cinematic preset',
    };
  }

  return {
    preset,
    analysis,
    confidence: analysis.confidence,
    reasoning: analysis.reasoning,
  };
}

