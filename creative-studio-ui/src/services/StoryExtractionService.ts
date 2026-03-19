import { useMemoryStore } from '@/stores/memoryStore';
import { ollamaClient } from '@/services/llm/OllamaClient';

export interface ExtractedProjectData {
  projectName?: string;
  summary: string;
  genre: string[];
  tone: string[];
  characters: {
    name: string;
    archetype: string;
    description: string;
    visual_prompts: string[];
  }[];
  locations: {
    name: string;
    type: string;
    description: string;
    atmosphere: string;
  }[];
  objects: {
    name: string;
    description: string;
  }[];
  stories: {
    title: string;
    summary: string;
  }[];
  moodboard: string[];
  prompts: {
    image: string[];
    video: string[];
    animation: string[];
  };
}

/**
 * Service to extract structured story components from a text pitch
 */
export class StoryExtractionService {
  private static instance: StoryExtractionService;

  private constructor() {}

  static getInstance(): StoryExtractionService {
    if (!StoryExtractionService.instance) {
      StoryExtractionService.instance = new StoryExtractionService();
    }
    return StoryExtractionService.instance;
  }

  /**
   * Extract project components from a pitch using LLM
   */
  async extractFromPitch(pitch: string): Promise<ExtractedProjectData | null> {
    const workingContext = useMemoryStore.getState().workingContext;

    const prompt = `Analyze this story pitch and extract structured project components for a film/video production:
    "${pitch}"

    [PRODUCTION CONTEXT]
    ${workingContext}

    Provide a JSON response with the following structure:
    {
      "projectName": "Catchy title",
      "summary": "Detailed narrative summary (2-3 paragraphs)",
      "genre": ["Genre 1", "Genre 2"],
      "tone": ["Tone 1", "Tone 2"],
      "characters": [
        { "name": "Name", "archetype": "Hero/Villain/etc", "description": "Short bio", "visual_prompts": ["Prompt 1"] }
      ],
      "locations": [
        { "name": "Name", "type": "Interior/Exterior", "description": "Visual details", "atmosphere": "Vibe" }
      ],
      "objects": [
        { "name": "Name", "description": "Purpose/Look" }
      ],
      "stories": [
        { "title": "Episode 1 / Scene 1", "summary": "What happens" }
      ],
      "moodboard": ["Keyword 1", "Keyword 2", "Visual Style"],
      "prompts": {
        "image": ["Universal image prompt for the project style"],
        "video": ["Prompt for cinematic video movement"],
        "animation": ["Prompt for character/object animation"]
      }
    }

    Ensure all fields are populated even if you have to creatively extrapolate based on the pitch. Return ONLY the JSON.`;

    try {
      const model = await ollamaClient.getBestAvailableModel('storytelling');
      const response = await ollamaClient.generate(model, prompt, { temperature: 0.7 });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as ExtractedProjectData;
      }
    } catch (e) {
      console.error('[StoryExtractionService] Extraction failed:', e);
    }
    return null;
  }
}

export const storyExtractionService = StoryExtractionService.getInstance();
