/**
 * Recap Engine — API Service
 * Communique avec le backend FastAPI du Recap Engine.
 */

import type { RecapTimeline, RecapStyleType, TTSProviderType } from './types';

const BASE_URL = '/api/addons/recap_engine';

// ============================================================================
// Request Types
// ============================================================================

interface GenerateFromComicRequest {
  project_id: string;
  comic_json_path: string;
  story_context: string;
  characters?: Record<string, unknown>[];
  style?: RecapStyleType;
  tts_provider?: TTSProviderType;
}

interface RenderRequest {
  project_id: string;
  timeline_id: string;
}

interface ExportRequest {
  project_id: string;
  timeline_id: string;
  include_subtitles?: boolean;
  output_path?: string;
}

// ============================================================================
// API Client
// ============================================================================

class RecapEngineService {
  private baseUrl: string;

  constructor(baseUrl: string = BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /** Vérifie l'état de l'addon et la disponibilité de ffmpeg. */
  async getStatus(): Promise<{
    addon: string;
    status: string;
    ffmpeg_available: boolean;
    supported_styles: string[];
    supported_tts: string[];
  }> {
    const res = await fetch(`${this.baseUrl}/status`);
    if (!res.ok) throw new Error(`Status error: ${res.status}`);
    return res.json();
  }

  /** Récupère l'état de toutes les timelines d'un projet. */
  async getProjectState(projectId: string): Promise<{
    exists: boolean;
    project_id: string;
    active_timeline_id?: string;
    timelines: RecapTimeline[];
  }> {
    const res = await fetch(`${this.baseUrl}/state/${encodeURIComponent(projectId)}`);
    if (!res.ok) throw new Error(`State error: ${res.status}`);
    return res.json();
  }

  /** Génère un recap depuis un fichier JSON de BD exporté. */
  async generateFromComic(req: GenerateFromComicRequest): Promise<{
    success: boolean;
    timeline_id: string;
    title: string;
    scenes_count: number;
    estimated_duration: number;
    estimated_duration_min: number;
    style: string;
  }> {
    const res = await fetch(`${this.baseUrl}/generate/comic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: req.project_id,
        comic_json_path: req.comic_json_path,
        story_context: req.story_context,
        characters: req.characters || [],
        style: req.style || 'manga_recap',
        tts_provider: req.tts_provider || 'gtts',
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }
    return res.json();
  }

  /** Génère un recap depuis les dossiers page_XXX d'un chapitre. */
  async generateFromPages(data: {
    project_id: string;
    chapter_id: string;
    story_context: string;
    characters?: Record<string, unknown>[];
    style?: RecapStyleType;
  }): Promise<{
    success: boolean;
    timeline_id: string;
    scenes_count: number;
    estimated_duration: number;
    estimated_duration_min: number;
  }> {
    const res = await fetch(`${this.baseUrl}/generate/pages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        style: data.style || 'manga_recap',
        characters: data.characters || [],
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }
    return res.json();
  }

  /** Lance le rendu vidéo MP4 d'une timeline. */
  async renderVideo(req: RenderRequest): Promise<{
    success: boolean;
    video_path?: string;
    duration?: number;
    file_size_mb?: number;
    render_time?: number;
    message?: string;
    timeline_id?: string;
  }> {
    const res = await fetch(`${this.baseUrl}/render`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }
    return res.json();
  }

  /** Export final avec sous-titres SRT. */
  async exportVideo(req: ExportRequest): Promise<{
    success: boolean;
    video_path?: string;
    subtitle_path?: string;
    duration?: number;
  }> {
    const res = await fetch(`${this.baseUrl}/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...req,
        include_subtitles: req.include_subtitles ?? true,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }
    return res.json();
  }

  /** Détails d'une timeline (scènes, styles, progression). */
  async getTimeline(projectId: string, timelineId: string): Promise<RecapTimeline & {
    scenes?: unknown[];
    character_styles?: Record<string, unknown>;
  }> {
    const res = await fetch(
      `${this.baseUrl}/timeline/${encodeURIComponent(projectId)}/${encodeURIComponent(timelineId)}`
    );
    if (!res.ok) throw new Error(`Timeline not found: ${res.status}`);
    return res.json();
  }

  /** URL de la vidéo finale pour lecture directe. */
  getVideoUrl(projectId: string, timelineId: string): string {
    return `${this.baseUrl}/video/${encodeURIComponent(projectId)}/${encodeURIComponent(timelineId)}`;
  }

  /** Liste les voix TTS disponibles. */
  async listVoices(provider: TTSProviderType = 'edge_tts', language: string = 'fr'): Promise<{
    provider: string;
    language: string;
    voices: { name: string; gender: string }[];
  }> {
    const res = await fetch(
      `${this.baseUrl}/voices?provider=${provider}&language=${language}`
    );
    if (!res.ok) throw new Error(`Voices error: ${res.status}`);
    return res.json();
  }
}

export const recapEngineService = new RecapEngineService();
export default recapEngineService;
