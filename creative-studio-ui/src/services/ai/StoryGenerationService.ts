import { logger } from '../../utils/logger';

export interface StoryPrompt {
  genre: StoryGenre;
  structure: StoryStructure;
  length: 'short' | 'medium' | 'long';
  prompt: string;
  characters?: CharacterData[];
  style?: string;
}

export interface CharacterData {
  id: string;
  name: string;
  role: string;
  personality?: string[];
}

export interface StoryGenre {
  value: string;
  label: string;
}

export interface StoryStructure {
  value: string;
  label: string;
}

export interface StoryResult {
  id: string;
  title: string;
  synopsis: string;
  genre: string;
  arcs: ArcData[];
  scenes: SceneData[];
  characters: CharacterData[];
  metadata: StoryMetadata;
}

export interface StoryMetadata {
  createdAt: string;
  updatedAt: string;
  structure: string;
  estimatedDuration: number;
  pacingScore: number;
}

export interface SceneData {
  id: string;
  title: string;
  description: string;
  location?: string;
  timeOfDay?: string;
  characters: string[];
  beatIds: string[];
  visualDirection: string;
  audioMood: string;
  estimatedDuration?: number;
}

export interface ArcData {
  id: string;
  name: string;
  theme: string;
  conflict: string;
  resolution: string;
  beats: BeatData[];
}

export interface BeatData {
  id: string;
  name: string;
  description: string;
  emotionalBeat: string;
  narrativeFunction: string;
}

export interface StoryExportOptions {
  format: 'json' | 'pdf' | 'fdx' | 'html';
  includeMetadata: boolean;
  includeDialogue: boolean;
  includeStageDirections: boolean;
}

export interface StructureAnalysis {
  totalBeats: number;
  totalScenes: number;
  pacingScore: number;
  pacingAnalysis: 'fast' | 'moderate' | 'slow' | 'balanced';
  structureCompliance: number;
  arcDistribution: number[];
  recommendations: string[];
}

export interface StoryRefinementRequest {
  storyId: string;
  feedback: {
    type: 'genre' | 'structure' | 'pacing' | 'characters' | 'general';
    description: string;
    suggestions?: string[];
  };
}

class StoryGenerationService {
  private baseUrl: string = '/api';
  private apiVersion: string = 'v1';
  
  private get endpoint(): string {
    return `${this.baseUrl}/${this.apiVersion}`;
  }
  
  async generateStory(prompt: StoryPrompt): Promise<StoryResult> {
    try {
      logger.info('Generating story', { genre: prompt.genre, structure: prompt.structure });
      
      const response = await fetch(`${this.endpoint}/story/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.prompt,
          genre: typeof prompt.genre === 'string' ? prompt.genre : prompt.genre.value,
          structure: typeof prompt.structure === 'string' ? prompt.structure : prompt.structure.value,
          length: prompt.length,
          characters: prompt.characters,
          style: prompt.style,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(`HTTP ${response.status}: ${error.message || error.detail || 'Generation failed'}`);
      }
      
      const result = await response.json();
      logger.info('Story generated successfully', { storyId: result.id });
      
      return this.transformStoryResult(result);
    } catch (error) {
      logger.error('Story generation failed', error);
      throw error;
    }
  }
  
  async getStory(storyId: string): Promise<StoryResult | null> {
    try {
      const response = await fetch(`${this.endpoint}/story/${storyId}`);
      
      if (response.status === 404) {
        return null;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch story`);
      }
      
      const result = await response.json();
      return this.transformStoryResult(result);
    } catch (error) {
      logger.error('Failed to fetch story', error);
      throw error;
    }
  }
  
  async listStories(filters?: {
    genre?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ stories: StoryResult[]; total: number }> {
    try {
      const params = new URLSearchParams();
      if (filters?.genre) params.append('genre', filters.genre);
      if (filters?.limit) params.append('limit', String(filters.limit));
      if (filters?.offset) params.append('offset', String(filters.offset));
      
      const response = await fetch(`${this.endpoint}/stories?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to list stories`);
      }
      
      const result = await response.json();
      return {
        stories: result.map((s: any) => this.transformStoryResult(s)),
        total: result.total,
      };
    } catch (error) {
      logger.error('Failed to list stories', error);
      throw error;
    }
  }
  
  async exportStory(storyId: string, options: StoryExportOptions): Promise<Blob | object> {
    try {
      const params = new URLSearchParams({
        format: options.format,
        include_metadata: String(options.includeMetadata),
        include_dialogue: String(options.includeDialogue),
        include_stage_directions: String(options.includeStageDirections),
      });
      
      const response = await fetch(`${this.endpoint}/story/${storyId}/export?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Export failed`);
      }
      
      if (options.format === 'json') {
        return await response.json();
      }
      
      return await response.blob();
    } catch (error) {
      logger.error('Story export failed', error);
      throw error;
    }
  }
  
  async analyzeStructure(storyId: string): Promise<StructureAnalysis> {
    try {
      const response = await fetch(`${this.endpoint}/story/${storyId}/structure`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Structure analysis failed`);
      }
      
      return await response.json();
    } catch (error) {
      logger.error('Structure analysis failed', error);
      throw error;
    }
  }
  
  async refineStory(request: StoryRefinementRequest): Promise<StoryResult> {
    try {
      const response = await fetch(`${this.endpoint}/story/${request.storyId}/refine`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request.feedback),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Refinement failed`);
      }
      
      const result = await response.json();
      logger.info('Story refined successfully', { storyId: request.storyId });
      
      return this.transformStoryResult(result);
    } catch (error) {
      logger.error('Story refinement failed', error);
      throw error;
    }
  }
  
  async addScene(storyId: string, sceneData: Partial<SceneData>): Promise<SceneData> {
    try {
      const response = await fetch(`${this.endpoint}/story/${storyId}/scenes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sceneData),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to add scene`);
      }
      
      return await response.json();
    } catch (error) {
      logger.error('Failed to add scene', error);
      throw error;
    }
  }
  
  async updateScene(storyId: string, sceneId: string, updates: Partial<SceneData>): Promise<SceneData> {
    try {
      const response = await fetch(`${this.endpoint}/story/${storyId}/scenes/${sceneId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to update scene`);
      }
      
      return await response.json();
    } catch (error) {
      logger.error('Failed to update scene', error);
      throw error;
    }
  }
  
  async deleteStory(storyId: string): Promise<void> {
    try {
      const response = await fetch(`${this.endpoint}/story/${storyId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to delete story`);
      }
      
      logger.info('Story deleted successfully', { storyId });
    } catch (error) {
      logger.error('Failed to delete story', error);
      throw error;
    }
  }
  
  private transformStoryResult(data: any): StoryResult {
    return {
      id: data.id,
      title: data.title,
      synopsis: data.synopsis,
      genre: data.genre,
      arcs: data.arcs || [],
      scenes: data.scenes || [],
      characters: data.characters || [],
      metadata: {
        createdAt: data.created_at || new Date().toISOString(),
        updatedAt: data.updated_at || new Date().toISOString(),
        structure: data.structure || 'unknown',
        estimatedDuration: data.estimated_duration || 0,
        pacingScore: data.pacing_score || 0.5,
      },
    };
  }
}

export interface StoryGenerationProgress {
  stage: 'analyzing' | 'generating_arcs' | 'generating_scenes' | 'finalizing';
  progress: number;
  message: string;
}

export type StoryGenerationCallback = (progress: StoryGenerationProgress) => void;

export const storyGenerationService = new StoryGenerationService();
export default storyGenerationService;
