
import { llmService } from '../llmService';
import { logger } from '@/utils/logger';

export interface AudioWorldizationRequest {
  sceneDescription: string;
  mood?: string;
  timeOfDay?: string;
  weather?: string;
  isInterior?: boolean;
}

export interface AudioLayerMapping {
  layer: 'ambient' | 'foley' | 'music' | 'sfx';
  description: string;
  intensity: number; // 0-1
  suggestedAssetPrompt: string;
}

export interface WorldizationResult {
  mappings: AudioLayerMapping[];
  mixAdvice: string;
}

/**
 * AudioWorldizationMapper
 * 
 * Uses AI to map visual scene descriptions into a multi-layered audio world.
 * Generates prompts for individual audio asset synthesis.
 */
export class AudioWorldizationMapper {
  private static SYSTEM_PROMPT = `
  You are an expert Cinematic Sound Designer. Your task is "Audio Worldization":
  Transforming a visual scene description into a 4-layer audio map.

  LAYERS:
  1. AMBIENT: Background environment (wind, room tone, distant traffic).
  2. FOLEY: Specific character/object sounds (footsteps, fabric, rustling).
  3. SFX: Impactful sound events (door slam, magic spark, car pass-by).
  4. MUSIC: The emotional underscore.

  OUTPUT FORMAT: Strict JSON only.
  {
    "mappings": [
      {
        "layer": "ambient|foley|sfx|music",
        "description": "Short explanation of the sound",
        "intensity": 0.0-1.0,
        "suggestedAssetPrompt": "Highly descriptive prompt for an AI audio generator"
      }
    ],
    "mixAdvice": "General advice for audio balance"
  }
  `;

  /**
   * Map scene context to audio layers
   */
  async mapSceneToAudio(request: AudioWorldizationRequest): Promise<WorldizationResult> {
    try {
      const userPrompt = `
      SCENE DESCRIPTION: "${request.sceneDescription}"
      MOOD: ${request.mood || 'neutral'}
      TIME OF DAY: ${request.timeOfDay || 'day'}
      WEATHER: ${request.weather || 'clear'}
      SETTING: ${request.isInterior ? 'Interior' : 'Exterior'}

      Respond with the Audio Worldization Map (JSON):
      `;

      const response = await llmService.generate(userPrompt, {
        systemPrompt: AudioWorldizationMapper.SYSTEM_PROMPT,
        temperature: 0.7,
      });

      // Extract JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Invalid AI response format");

      const result: WorldizationResult = JSON.parse(jsonMatch[0]);
      return result;

    } catch (error) {
      logger.error('[AudioWorldizationMapper] Mapping failed:', error);
      return {
        mappings: [],
        mixAdvice: "Failed to map audio world. Please try a different description."
      };
    }
  }
}

export const audioWorldizationMapper = new AudioWorldizationMapper();
export default audioWorldizationMapper;
