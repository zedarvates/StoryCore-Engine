/**
 * Automation Service
 * API service to communicate with the StoryCore automation backend.
 * Includes job management with retry for failed generations.
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

// Parameter types for generation methods
export interface DialogueGenerationParams {
  characters: DialogueCharacterData[];
  context: DialogueContextData;
  dialogueType?: string;
  numLines?: number;
  template?: string;
  forceEmotions?: Record<string, string>;
}

export interface GridGenerationParams {
  characterId: string;
  characterName: string;
  gridSize?: string;
  outfits?: string[];
  poses?: string[];
  expressions?: string[];
  cameraAngles?: string[];
  lightingTypes?: string[];
  resolution?: number;
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

// Types pour Grok Imagine
export interface GrokGenerationParams {
  scene: Record<string, unknown>;
  references?: Array<Record<string, unknown>>;
  config_overrides?: Record<string, unknown>;
}

export interface CinematicPromptParams {
  narrative_description: string;
  visual_style: string;
  shot_type?: string;
  camera_movement?: string;
  lighting_mood?: string;
  characters?: string[];
}

export interface GrokGenerationResponse {
  status: 'success' | 'error';
  video?: string;
  images?: string[];
  audio?: string;
  error?: string;
  metadata: Record<string, unknown>;
}

// Types pour la gestion des travaux (job queue avec retry)
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface GenerationJob {
  job_id: string;
  type: 'dialogue' | 'grid' | 'prompt' | 'grok';
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

export interface AudioRhythmMarker {
  time: number;
  type: 'major' | 'minor';
  energy: number;
}

export interface AudioRhythmData {
  audio_id: string;
  bpm: number;
  duration: number;
  markers: AudioRhythmMarker[];
}

export interface JLCutShot {
  id: string;
  duration: number;
  audio_offset?: number;
  audio_duration?: number;
}

export interface InvisibleEditingResponse {
  shots: JLCutShot[];
  applied_pattern: string;
  total_overlap: number;
}

export interface CinematicVisualResult {
  job_id: string;
  shot_id: string;
  enhanced_prompt: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

// --- Phase 2: Narrative Intelligence & Distribution ---
export interface PaperBeat {
  segment_title: string;
  transcript_quote: string;
  narrative_function: string;
  visual_suggestion: string;
  estimated_duration: number;
}

export interface PaperEditResponse {
  project_id: string;
  structure_found: string;
  beats: PaperBeat[];
  themes_identified: string[];
}

export interface PlatformPost {
  platform: string;
  caption: string;
  hashtags: string[];
  hook_timer: string;
}

export interface SocialMediaAdaptResponse {
  posts: PlatformPost[];
  viral_score: number;
}

export interface JobQueueState {
  jobs: GenerationJob[];
  total_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
  pending_jobs: number;
}

// Axios client configuration
const createAutomationClient = (): AxiosInstance => {
  return axios.create({
    baseURL: '/api/automation',
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: 60000, // 60 seconds for long generations
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
   * Adds a job to the retry queue
   */
  addToRetryQueue(job: GenerationJob): void {
    this.jobRetryQueue.push(job);
  }

  /**
   * Gets jobs pending retry
   */
  getRetryQueue(): GenerationJob[] {
    return this.jobRetryQueue;
  }

  /**
   * Clears the retry queue
   */
  clearRetryQueue(): void {
    this.jobRetryQueue = [];
  }

  /**
   * Removes a job from the queue
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
   * Retries a failed job
   */
  async retryJob(job: GenerationJob): Promise<boolean> {
    if (job.retry_count >= job.max_retries) {
      console.warn(`Job ${job.job_id} has reached the maximum number of retries`);
      return false;
    }

    try {
      let result: unknown;

      switch (job.type) {
        case 'dialogue':
          result = await this.generateDialogue(job.params as unknown as DialogueGenerationParams);
          break;
        case 'grid':
          result = await this.generateCharacterGrid(job.params as unknown as GridGenerationParams);
          break;
        case 'prompt':
          result = await this.enhancePrompt(job.params as unknown as PromptEnhanceRequest);
          break;
        case 'grok':
          result = await this.generateGrokImagine(job.params as unknown as GrokGenerationParams);
          break;
      }

      // Update job as completed
      job.status = 'completed';
      job.result = result;
      job.completed_at = new Date().toISOString();
      job.retry_count++;

      // Remove from queue on success
      this.removeFromRetryQueue(job.job_id);

      return true;
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      job.error = err.message || 'Unknown error';
      job.retry_count++;

      if (job.retry_count >= job.max_retries) {
        job.status = 'failed';
      }

      return false;
    }
  }

  /**
   * Automatically processes all pending jobs
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

  /**
   * Specifically for Phase 1: Cinematic Assembly
   * Converts a narrative description into a technical visual prompt
   */
  async enhanceCinematicVisualPrompt(params: CinematicPromptParams): Promise<string> {
    const llmClient = axios.create({
      baseURL: (import.meta.env.VITE_API_URL || 'http://localhost:8001') + '/api/llm'
    });

    // 1. Render the cinematic template
    const renderResponse = await llmClient.post('/render-template', {
      template_name: 'cinematic_visual_prompting',
      variables: {
        narrative_description: params.narrative_description,
        visual_style: params.visual_style || 'Cinematic Realism',
        shot_type: params.shot_type || 'Medium Shot',
        camera_movement: params.camera_movement || 'Static',
        lighting_mood: params.lighting_mood || 'Cinematic',
        characters: params.characters?.join(', ') || 'None'
      }
    });

    const renderedPrompt = renderResponse.data.rendered_prompt;

    // 2. Generate the enhanced prompt
    const generateResponse = await llmClient.post('/generate', {
      prompt: renderedPrompt,
      max_tokens: 1024,
      temperature: 0.7
    });

    return generateResponse.data.text;
  }

  async getPromptStyles(): Promise<{
    styles: string[];
    lighting: string[];
    moods: string[];
  }> {
    const response = await this.client.get('/prompt/styles');
    return response.data;
  }

  // ==================== GROK IMAGINE METHODS ====================

  async generateGrokImagine(params: GrokGenerationParams): Promise<GrokGenerationResponse> {
    const response = await this.client.post('/api/addons/grok-imagine/generate', params);
    return response.data;
  }

  async getGrokStatus(): Promise<Record<string, unknown>> {
    const response = await this.client.get('/api/addons/grok-imagine/status');
    return response.data;
  }

  // ==================== AUDIO RHYTHM LOCK (P1) ====================
  
  /**
   * Analyzes an audio file for beat markers and energy
   */
  async analyzeAudioRhythm(projectId: string, audioId: string): Promise<AudioRhythmData> {
    const client = axios.create({
      baseURL: (import.meta.env.VITE_API_URL || 'http://localhost:8001') + '/api/audio'
    });
    const response = await client.post('/analyze-rhythm', { project_id: projectId, audio_id: audioId });
    return response.data;
  }

  /**
   * Applies J-cuts or L-cuts to a sequence of shots
   */
  async applyInvisibleEditing(shots: JLCutShot[], overlap: number = 1.0, pattern: 'j-cut' | 'l-cut' | 'smart' = 'j-cut'): Promise<InvisibleEditingResponse> {
    const response = await this.client.post('/invisible-editing/apply', {
      shots,
      overlap_duration: overlap,
      pattern
    });
    return response.data;
  }

  // ==================== PHASE 2: NARRATIVE & DISTRIBUTION ====================

  /**
   * Generates a "Paper Edit" from a transcript using Narrative Intelligence (Phase 2)
   */
  async createPaperEdit(transcript: string, structure: string = 'Classic 3-Act', duration: number = 2.0): Promise<PaperEditResponse> {
    const response = await this.client.post('/narrative/paper-edit', {
      transcript,
      structure_type: structure,
      target_duration_minutes: duration
    });
    return response.data;
  }

  /**
   * Generates a social media distribution pack (Phase 2)
   */
  async generateSocialPack(summary: string, platforms: string[] = ['TikTok', 'YouTube Shorts', 'LinkedIn']): Promise<SocialMediaAdaptResponse> {
    const response = await this.client.post('/distribution/social-pack', {
      project_summary: summary,
      platforms
    });
    return response.data;
  }

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


