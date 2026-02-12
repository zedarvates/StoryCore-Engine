/**
 * Automation Service
 * Service API pour communiquer avec le backend d'automation StoryCore.
 * Inclut gestion des travaux avec rechargement des générations échouées.
 */

import axios, { AxiosInstance } from 'axios';

// Types pour les dialogues
export interface DialogueCharacterData {
  character_id: string;
  name: string;
  archetype: string;
  role?: string;
  personality_traits?: Record<string, number>;
}

export interface DialogueContextData {
  location: string;
  time_of_day: string;
  situation: string;
  weather?: string;
  mood: string;
}

export interface DialogueLineData {
  line_id: string;
  character_name: string;
  dialogue: string;
  emotion: string;
  is_thought: boolean;
}

export interface DialogueSceneData {
  scene_id: string;
  title: string;
  context: DialogueContextData;
  characters: string[];
  lines: DialogueLineData[];
  created_at: string;
}

// Types pour les Character Grids
export interface GridPanelData {
  panel_id: string;
  row: number;
  col: number;
  pose: string;
  expression: string;
  outfit: string;
}

export interface CharacterGridBundleData {
  bundle_id: string;
  character_id: string;
  character_name: string;
  grid_size: string;
  grid_image_path: string;
  panels: GridPanelData[];
  total_panels: number;
  metadata: Record<string, unknown>;
}

// Types pour les Prompts
export interface PromptEnhanceRequest {
  base_prompt: string;
  style?: 'realistic' | 'anime' | 'fantasy' | 'science_fiction' | 'oil_painting' | 'watercolor' | 'photographic' | 'cyberpunk' | 'gothic' | 'minimalist';
  lighting?: 'cinematic' | 'natural' | 'dramatic' | 'soft' | 'volumetric' | 'neon' | 'golden_hour' | 'blue_hour';
  mood?: 'neutral' | 'tense' | 'peaceful' | 'mysterious' | 'epic' | 'joyful' | 'somber' | 'horror' | 'romantic' | 'dreamy';
  quality?: string;
  add_negative?: boolean;
  add_style_tags?: boolean;
  add_camera_tags?: boolean;
}

export interface PromptEnhanceResponse {
  original_prompt: string;
  enhanced_prompt: string;
  negative_prompt: string;
  style_tags: string[];
  lighting_tags: string[];
  mood_tags: string[];
  quality_tags: string[];
}

// Types pour la gestion des travaux (job queue avec retry)
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface GenerationJob {
  job_id: string;
  type: 'dialogue' | 'grid' | 'prompt';
  status: JobStatus;
  params: Record<string, unknown>;
  result?: unknown;
  error?: string;
  retry_count: number;
  max_retries: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  progress?: number;
}

export interface JobQueueState {
  jobs: GenerationJob[];
  total_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
  pending_jobs: number;
}

// Configuration du client axios
const createAutomationClient = (): AxiosInstance => {
  return axios.create({
    baseURL: '/api/automation',
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: 60000, // 60 secondes pour les générations longues
  });
};

class AutomationService {
  private client: AxiosInstance;
  private jobRetryQueue: GenerationJob[] = [];

  constructor() {
    this.client = createAutomationClient();
  }

  // ==================== JOB QUEUE MANAGEMENT ====================

  /**
   * Ajoute un travail à la file d'attente avec retry
   */
  addToRetryQueue(job: GenerationJob): void {
    this.jobRetryQueue.push(job);
  }

  /**
   * Obtient les travaux en attente de retry
   */
  getRetryQueue(): GenerationJob[] {
    return this.jobRetryQueue;
  }

  /**
   * Efface la file d'attente des retries
   */
  clearRetryQueue(): void {
    this.jobRetryQueue = [];
  }

  /**
   * Supprime un travail de la file d'attente
   */
  removeFromRetryQueue(jobId: string): boolean {
    const index = this.jobRetryQueue.findIndex(j => j.job_id === jobId);
    if (index !== -1) {
      this.jobRetryQueue.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Retry un travail échoué
   */
  async retryJob(job: GenerationJob): Promise<boolean> {
    if (job.retry_count >= job.max_retries) {
      console.warn(`Job ${job.job_id} a atteint le nombre max de retries`);
      return false;
    }

    try {
      let result: unknown;

      switch (job.type) {
        case 'dialogue':
          result = await this.generateDialogue(job.params as any);
          break;
        case 'grid':
          result = await this.generateCharacterGrid(job.params as any);
          break;
        case 'prompt':
          result = await this.enhancePrompt(job.params as any);
          break;
      }

      // Mettre à jour le travail comme complété
      job.status = 'completed';
      job.result = result;
      job.completed_at = new Date().toISOString();
      job.retry_count++;

      // Retirer de la file d'attente si succès
      this.removeFromRetryQueue(job.job_id);

      return true;
    } catch (error: unknown) {
      job.error = error.message || 'Erreur inconnue';
      job.retry_count++;

      if (job.retry_count >= job.max_retries) {
        job.status = 'failed';
      }

      return false;
    }
  }

  /**
   * Traite automatiquement tous les travaux en attente
   */
  async processRetryQueue(onProgress?: (completed: number, total: number) => void): Promise<{
    success: number;
    failed: number;
  }> {
    const results = { success: 0, failed: 0 };
    const queue = [...this.jobRetryQueue];

    for (let i = 0; i < queue.length; i++) {
      const job = queue[i];
      const success = await this.retryJob(job);

      if (success) {
        results.success++;
      } else {
        results.failed++;
      }

      if (onProgress) {
        onProgress(i + 1, queue.length);
      }
    }

    return results;
  }

  // ==================== DIALOGUE METHODS ====================

  async generateDialogue(params: {
    characters: DialogueCharacterData[];
    context: DialogueContextData;
    dialogueType?: string;
    numLines?: number;
    template?: string;
    forceEmotions?: Record<string, string>;
  }): Promise<DialogueSceneData> {
    const response = await this.client.post('/dialogue/generate', {
      characters: params.characters,
      context: params.context,
      dialogue_type: params.dialogueType || 'conversation',
      num_lines: params.numLines || 10,
      template: params.template || 'linear',
      force_emotions: params.forceEmotions,
    });
    return response.data;
  }

  async getDialogueHistory(limit?: number): Promise<{
    total_scenes: number;
    scenes: Array<{
      scene_id: string;
      title: string;
      context: DialogueContextData;
      characters: string[];
      line_count: number;
      created_at: string;
    }>;
  }> {
    const response = await this.client.get('/dialogue/history', {
      params: { limit: limit || 50 },
    });
    return response.data;
  }

  async getDialogueScene(sceneId: string): Promise<DialogueSceneData> {
    const response = await this.client.get(`/dialogue/${sceneId}`);
    return response.data;
  }

  async clearDialogueHistory(): Promise<{ status: string; message: string }> {
    const response = await this.client.delete('/dialogue/history');
    return response.data;
  }

  // ==================== CHARACTER GRID METHODS ====================

  async generateCharacterGrid(params: {
    characterId: string;
    characterName: string;
    gridSize?: string;
    outfits?: string[];
    poses?: string[];
    expressions?: string[];
    cameraAngles?: string[];
    lightingTypes?: string[];
    resolution?: number;
  }): Promise<CharacterGridBundleData> {
    const response = await this.client.post('/character/grid/generate', {
      character_id: params.characterId,
      character_name: params.characterName,
      grid_size: params.gridSize || '3x3',
      outfits: params.outfits || ['casual'],
      poses: params.poses || ['standing', 'walking', 'fighting', 'casting'],
      expressions: params.expressions || ['neutral', 'happy', 'angry', 'determined'],
      camera_angles: params.cameraAngles || ['eye_level'],
      lighting_types: params.lightingTypes || ['cinematic'],
      resolution: params.resolution || 512,
    });
    return response.data;
  }

  async getCharacterGrid(bundleId: string): Promise<CharacterGridBundleData> {
    const response = await this.client.get(`/character/grid/${bundleId}`);
    return response.data;
  }

  async getCharacterAllGrids(characterId: string): Promise<{
    characterId: string;
    totalBundles: number;
    bundles: CharacterGridBundleData[];
  }> {
    const response = await this.client.get(`/character/${characterId}/grids`);
    return response.data;
  }

  async getCharacterLatestGrid(characterId: string): Promise<CharacterGridBundleData> {
    const response = await this.client.get(`/character/${characterId}/latest-grid`);
    return response.data;
  }

  async getGridLayouts(): Promise<{
    layouts: Array<{
      size: string;
      rows: number;
      cols: number;
      total: number;
      positions: Array<[number, number]>;
    }>;
  }> {
    const response = await this.client.get('/character/grid/layouts');
    return response.data;
  }

  async getGridOptions(): Promise<{
    poses: string[];
    expressions: string[];
    outfits: string[];
    camera_angles: string[];
    lighting_types: string[];
    grid_sizes: string[];
  }> {
    const response = await this.client.get('/character/grid/options');
    return response.data;
  }

  // ==================== PROMPT ENHANCEMENT METHODS ====================

  async enhancePrompt(params: PromptEnhanceRequest): Promise<PromptEnhanceResponse> {
    const response = await this.client.post('/prompt/enhance', {
      base_prompt: params.base_prompt,
      style: params.style || 'realistic',
      lighting: params.lighting || 'cinematic',
      mood: params.mood || 'neutral',
      quality: params.quality || 'high',
      add_negative: params.add_negative !== false,
      add_style_tags: params.add_style_tags !== false,
      add_camera_tags: params.add_camera_tags || false,
    });
    return response.data;
  }

  async getPromptStyles(): Promise<{
    styles: string[];
    lighting: string[];
    moods: string[];
  }> {
    const response = await this.client.get('/prompt/styles');
    return response.data;
  }

  // ==================== HEALTH CHECK ====================

  async healthCheck(): Promise<{
    status: string;
    service: string;
    version: string;
    timestamp: string;
    statistics: {
      dialogue_scenes: number;
      character_grids: number;
    };
  }> {
    const response = await this.client.get('/health');
    return response.data;
  }

  // ==================== STATIC HELPERS ====================

  static buildCharacterPrompt(characterName: string, options: {
    style?: string;
    mood?: string;
    lighting?: string;
  }): string {
    const parts = [characterName];
    if (options.style) parts.push(`style: ${options.style}`);
    if (options.mood) parts.push(`mood: ${options.mood}`);
    if (options.lighting) parts.push(`lighting: ${options.lighting}`);
    return parts.join(', ');
  }

  static createDefaultContext(): DialogueContextData {
    return {
      location: 'Unknown Location',
      time_of_day: 'day',
      situation: 'neutral',
      mood: 'neutral',
    };
  }

  static createJob(
    type: GenerationJob['type'],
    params: Record<string, unknown>,
    maxRetries: number = 3
  ): GenerationJob {
    return {
      job_id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      status: 'pending',
      params,
      retry_count: 0,
      max_retries: maxRetries,
      created_at: new Date().toISOString(),
    };
  }
}

// Export singleton instance
export const automationService = new AutomationService();

// Export static helpers
export const AutomationHelpers = {
  buildCharacterPrompt: AutomationService.buildCharacterPrompt,
  createDefaultContext: AutomationService.createDefaultContext,
  createJob: AutomationService.createJob,
};


