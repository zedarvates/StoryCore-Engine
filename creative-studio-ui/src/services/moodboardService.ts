import { llmConfigService } from './llmConfigService';
import { logger } from '@/utils/logger';
import type { ProjectData } from '@/types/project';
import type { MoodboardSuggestion, MoodboardData } from '@/types/moodboard';

/**
 * Moodboard Service
 * 
 * Provides intelligent style suggestions and management for the project moodboard.
 */
export class MoodboardService {
  private static instance: MoodboardService;

  private constructor() {}

  static getInstance(): MoodboardService {
    if (!MoodboardService.instance) {
      MoodboardService.instance = new MoodboardService();
    }
    return MoodboardService.instance;
  }

  /**
   * Generates style suggestions based on project content (World, Characters, Setup)
   */
  async generateSuggestions(project: ProjectData): Promise<MoodboardSuggestion[]> {
    const service = llmConfigService.getService();
    if (!service) {
      throw new Error('LLM Service not available');
    }

    // Extract context
    const worldSetting = project.world?.setting || 'Unknown';
    const genre = project.projectSetup?.genre?.join(', ') || 'Unknown';
    const characterBreif = project.characters?.map(c => c.name).join(', ') || 'None';
    
    const prompt = `
      You are a world-class Art Director. Based on the following project metadata, suggest 3 distinct visual styles (Moodboards).
      
      Project Title: ${project.project_name}
      Genre: ${genre}
      World Setting: ${worldSetting}
      Characters Involved: ${characterBreif}
      Description: ${project.global_resume || project.projectSetup?.projectDescription || 'No description available'}

      For each suggestion, provide:
      1. A catchy Title for the style.
      2. A detailed Description of the vision.
      3. An Art Style name (e.g., "Neo-Noir Cyberpunk", "High-Fantasy Watercolor").
      4. A Color Palette (5 hex codes).
      5. Reasoning why this fits the project.

      Return the result in valid JSON format as an array of objects.
    `;

    try {
      // Corrected API usage: first arg is prompt string, second is options
      const response = await service.generateText(prompt, {
        temperature: 0.7,
        maxTokens: 2000,
      });

      // Simple parsing of JSON from text
      const jsonStart = response.indexOf('[');
      const jsonEnd = response.lastIndexOf(']') + 1;
      const jsonString = response.substring(jsonStart, jsonEnd);
      
      interface LLMSuggestion {
        title?: string;
        Title?: string;
        description?: string;
        Description?: string;
        artStyle?: string;
        ArtStyle?: string;
        colorPalette?: string[];
        ColorPalette?: string[];
        reasoning?: string;
        Reasoning?: string;
      }

      const suggestions: LLMSuggestion[] = JSON.parse(jsonString);

      return suggestions.map((s, index) => ({
        id: `suggestion-${Date.now()}-${index}`,
        title: s.title || s.Title || 'Untitled Style',
        description: s.description || s.Description || '',
        suggestedStyle: {
          artStyle: s.artStyle || s.ArtStyle || 'Standard',
          colorPalette: s.colorPalette || s.ColorPalette || [],
          typography: {
            headers: 'Inter',
            body: 'Roboto',
          }
        },
        suggestedVision: {
          description: s.description || s.Description || '',
          keywords: [genre, worldSetting].filter(k => k !== 'Unknown'),
        },
        reasoning: s.reasoning || s.Reasoning || ''
      }));

    } catch (error) {
      logger.error('[MoodboardService] Failed to generate suggestions:', error);
      return [];
    }
  }

  /**
   * Initialize a default moodboard for a project
   */
  createEmptyMoodboard(projectId: string): MoodboardData {
    return {
      id: `mb-${Date.now()}`,
      projectId,
      vision: {
        description: '',
        keywords: []
      },
      visualStyle: {
        artStyle: 'Standard',
        colorPalette: ['#ffffff', '#000000'],
        typography: {
          headers: 'Outfit',
          body: 'Inter'
        }
      },
      references: [],
      inspirationNotes: [],
      updatedAt: Date.now()
    };
  }
}

export const moodboardService = MoodboardService.getInstance();
