/**
 * Prompt Generation Service
 * Integrates the Prompt Library with the StoryCore pipeline
 */

import { promptLibrary, PromptTemplate } from '../library/PromptLibraryService';
import { ollamaClient } from './llm/OllamaClient';
import { useAppStore } from '../stores/useAppStore';

export interface ProjectPromptData {
  name: string;
  genre: string;
  colors: string;
  lighting: string;
}

export interface CharacterPromptData {
  description: string;
  age: string;
  gender: string;
  features: string;
  style: string;
}

export interface ScenePromptData {
  element: string;
  genre: string;
  shotType: string;
  lighting: string;
  genreValues?: Record<string, string>;
  shotValues?: Record<string, string>;
  lightingValues?: Record<string, string>;
}

export class PromptGenerationService {
  /**
   * Generate Master Coherence Sheet prompt
   */
  async generateMasterCoherence(projectData: ProjectPromptData): Promise<string> {
    const template = await promptLibrary.loadPrompt(
      '01-master-coherence/coherence-grid.json'
    );

    return promptLibrary.fillPrompt(template, {
      PROJECT_NAME: projectData.name,
      GENRE_STYLE: projectData.genre,
      PRIMARY_COLORS: projectData.colors,
      LIGHTING_TYPE: projectData.lighting
    });
  }

  /**
   * Generate character design sheet prompt
   */
  async generateCharacterSheet(characterData: CharacterPromptData): Promise<string> {
    const template = await promptLibrary.loadPrompt(
      '01-master-coherence/character-grid.json'
    );

    return promptLibrary.fillPrompt(template, {
      CHARACTER_DESCRIPTION: characterData.description,
      AGE: characterData.age,
      GENDER: characterData.gender,
      DISTINCTIVE_FEATURES: characterData.features,
      ART_STYLE: characterData.style
    });
  }

  /**
   * Generate environment design sheet prompt
   */
  async generateEnvironmentSheet(environmentData: {
    locationType: string;
    description: string;
    time: string;
    conditions: string;
    mood: string;
  }): Promise<string> {
    const template = await promptLibrary.loadPrompt(
      '01-master-coherence/environment-grid.json'
    );

    return promptLibrary.fillPrompt(template, {
      LOCATION_TYPE: environmentData.locationType,
      DESCRIPTION: environmentData.description,
      TIME: environmentData.time,
      CONDITIONS: environmentData.conditions,
      MOOD: environmentData.mood
    });
  }

  /**
   * Generate scene with specific shot type and lighting
   */
  async generateScene(sceneData: ScenePromptData): Promise<string> {
    // Load templates
    const genreTemplate = await promptLibrary.loadPrompt(
      `02-genres/${sceneData.genre}.json`
    );

    const shotTemplate = await promptLibrary.loadPrompt(
      `03-shot-types/${sceneData.shotType}.json`
    );

    const lightingTemplate = await promptLibrary.loadPrompt(
      `04-lighting/${sceneData.lighting}.json`
    );

    // Generate each part
    const genrePrompt = promptLibrary.fillPrompt(
      genreTemplate,
      sceneData.genreValues || {}
    );

    const shotPrompt = promptLibrary.fillPrompt(
      shotTemplate,
      sceneData.shotValues || {}
    );

    const lightingPrompt = promptLibrary.fillPrompt(
      lightingTemplate,
      sceneData.lightingValues || {}
    );

    // Combine prompts
    return `${shotPrompt}. ${genrePrompt}. ${lightingPrompt}`;
  }

  /**
   * Get available genres
   */
  async getAvailableGenres(): Promise<string[]> {
    const prompts = await promptLibrary.getPromptsByCategory('genres');
    return prompts.map(p => p.id.replace('genre-', ''));
  }

  /**
   * Get available shot types
   */
  async getAvailableShotTypes(): Promise<string[]> {
    const prompts = await promptLibrary.getPromptsByCategory('shot-types');
    return prompts.map(p => p.id.replace('shot-', ''));
  }

  /**
   * Get available lighting conditions
   */
  async getAvailableLighting(): Promise<string[]> {
    const prompts = await promptLibrary.getPromptsByCategory('lighting');
    return prompts.map(p => p.id.replace('lighting-', ''));
  }

  /**
   * Validate prompt values before generation
   */
  async validatePromptData(
    templatePath: string,
    values: Record<string, string | number>
  ): Promise<{ valid: boolean; errors: string[] }> {
    const template = await promptLibrary.loadPrompt(templatePath);
    return promptLibrary.validateValues(template, values);
  }

  /**
   * Enhanced prompt generation using Ollama (if available)
   */
  async generateAIEnhancedPrompt(basePrompt: string, context: string): Promise<string> {
    const ollamaStatus = useAppStore.getState().ollamaStatus;

    if (ollamaStatus !== 'connected') {
      console.warn('⚠️ [PromptGenerationService] Ollama not connected, returning base prompt');
      return basePrompt;
    }

    try {
      // Find a suitable model (prefer llama3 or similar)
      const models = await ollamaClient.listModels();
      const model = models.find(m => m.category === 'storytelling' || m.name.includes('llama'))?.name || models[0]?.name;

      if (!model) {
        return basePrompt;
      }

      const systemPrompt = `You are a creative writing assistant for StoryCore. 
      Your goal is to take a base prompt for image generation and enhance it with more descriptive detail, 
sensory information, and artistic style while maintaining the original intent.
      Keep the final output concise and optimized for Flux/Stable Diffusion.`;

      const response = await ollamaClient.generate(model, `${systemPrompt}\n\nContext: ${context}\nBase Prompt: ${basePrompt}`);
      return response || basePrompt;
    } catch (error) {
      console.error('❌ [PromptGenerationService] AI Enhancement failed:', error);
      return basePrompt;
    }
  }
}

// Export singleton instance
export const promptGenerationService = new PromptGenerationService();
