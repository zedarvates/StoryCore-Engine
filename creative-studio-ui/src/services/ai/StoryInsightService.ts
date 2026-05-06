import { llmService } from '../llmService';
import { ollamaClient } from '../llm/OllamaClient';
import { projectMemory } from '../ProjectMemoryService';
import type { Shot, Project } from '@/types';
import type { Character } from '@/types/character';

export class StoryInsightService {
  /**
   * Unifies and harmonizes a shot's prompt to ensure consistency with the story context,
   * active characters, and previous shots.
   */
  public async unifyVisualCoherence(
    shot: Shot,
    project: Project,
    allShots: Shot[],
    characters: Character[]
  ): Promise<string> {
    try {
      // 1. GATHER CONTEXT
      const shotIndex = allShots.findIndex((w) => w.id === shot.id);
      const prevShot = shotIndex > 0 ? allShots[shotIndex - 1] : null;

      // Extract characters relevant to this shot (naively by parsing name, or explicit casting)
      const currentCharacters = characters.filter((c) => 
        shot.prompt?.toLowerCase().includes(c.name.toLowerCase()) || 
        shot.composition?.characterIds.includes(c.character_id)
      );

      const characterNames = currentCharacters.map(c => c.name).join(', ');
      
      // Get memory insights to ensure we keep stable project guidelines
      let structuralStyle = "Cinematic style";
      try {
          const insights = await projectMemory.getRelevantInsights('cinematic visual style', 3);
          if (insights.length > 0) {
              structuralStyle = insights.map(i => i.text).join('; ');
          }
      } catch (err) {
          console.warn("[StoryInsightService] Memory not accessible", err);
      }

      // 2. CONSTRUCT PROMPT FOR LLM
      const systemPrompt = `You are an expert AI Cinematographer and script supervisor.
Your job is to rewrite the user's prompt to ensure strict visual coherence across a sequence, maintaining lighting, styling, and character consistency.

Guidelines:
1. Make the prompt descriptive, visually dense, and optimized for image/video generation models.
2. Incorporate the global project style constraints cleanly.
3. Smooth out transitions from the previous shot if there is one.
4. ONLY return the revised prompt and nothing else. No introductions, no explanations.`;

      const userPrompt = `
[Context]
Project Description: ${project.metadata?.description || '(No project description)'}
Global Style Directives: ${structuralStyle}

[Sequence Data]
Previous Shot Prompt: ${prevShot ? prevShot.prompt : '(First shot of the sequence)'}
Characters in scene: ${characterNames || '(No specific characters cast)'}

[Target Shot]
Current Draft Prompt: "${shot.prompt || 'A cinematic shot'}"
Intended Action/Mood: ${shot.name || ''}

Rewrite the Target Shot's prompt to be perfectly coherent with the surrounding context, enhancing it for premium cinematic quality.`;

      // 3. EXECUTE LLM
      const bestModel = await ollamaClient.getBestAvailableModel('storytelling');
      
      const response = await llmService.generate(`${systemPrompt}\n\n${userPrompt}`, {
        model: bestModel,
        temperature: 0.4, // slight creativity but mostly adherence to constraints
        maxTokens: 250
      });

      const refinedPrompt = response.trim();
      
      // Basic sanity check, return original if the LLM failed and returned empty
      if (!refinedPrompt || refinedPrompt.length < 5) {
        return shot.prompt || 'Cinematic shot';
      }

      return refinedPrompt;

    } catch (error) {
      console.error('[StoryInsightService] Failed to unify visual coherence', error);
      // Fallback to basic string modification if LLM fails
      return `${shot.prompt || ''}, high quality, cinematic lighting, visually coherent`;
    }
  }

  /**
   * Expands a simple descriptive prompt into a highly technical cinematic prompt.
   */
  public async expandTechnicalPrompt(
    basePrompt: string,
    project: Project
  ): Promise<string> {
    try {
      const systemPrompt = `You are a professional Cinematographer and Prompt Engineer.
Your job is to take a simple descriptive prompt and expand it into a highly technical, cinematic prompt optimized for AI video generation.
Include specific camera movement, lens type (e.g., 50mm, anamorphic), lighting setup (e.g., volumetric, chiaroscuro, rim lighting), and framing (e.g., extreme close-up, Dutch angle).
ONLY return the expanded technical prompt and nothing else. No introductions.`;

      const userPrompt = `Base Prompt: "${basePrompt}"
Project Context: ${project?.metadata?.description || 'N/A'}
Generate the expanded technical prompt now.`;

      const bestModel = await ollamaClient.getBestAvailableModel('storytelling');
      
      const response = await llmService.generate(`${systemPrompt}\n\n${userPrompt}`, {
        model: bestModel,
        temperature: 0.6,
        maxTokens: 250
      });

      const expanded = response.trim();
      if (!expanded || expanded.length < 5) return basePrompt;
      return expanded;
    } catch (error) {
      console.error('[StoryInsightService] Failed to expand prompt', error);
      return `${basePrompt}, highly detailed, 8k resolution, cinematic camera movement, professional lighting setup, 35mm lens, shallow depth of field, photorealistic`;
    }
  }
}

export const storyInsightService = new StoryInsightService();
