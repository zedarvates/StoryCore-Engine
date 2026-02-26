/**
 * Recap Engine — Type Definitions & Constants
 * Mirror du backend Python (types.py) pour le frontend TypeScript.
 */

// ============================================================================
// Enums
// ============================================================================

export type RecapStyleType = 'manga_recap' | 'anime_epic' | 'comic_book' | 'cinematic';

export type CameraMoveType =
  | 'zoom_in'
  | 'zoom_out'
  | 'pan_left'
  | 'pan_right'
  | 'slow_push'
  | 'shake'
  | 'static';

export type TransitionType =
  | 'fade_black'
  | 'fade_white'
  | 'dissolve'
  | 'slide_left'
  | 'cut'
  | 'sepia_wash';

export type TTSProviderType = 'gtts' | 'edge_tts' | 'piper' | 'elevenlabs' | 'mock';

export type RenderStatusType = 'pending' | 'rendering' | 'done' | 'error';

// ============================================================================
// Data Models
// ============================================================================

export interface RecapCharacterStyle {
  character_id: string;
  character_name: string;
  frame_color: string;
  frame_glow: string;
  bubble_style: string;
  highlight_effect: string;
  voice_id: string;
  voice_pitch: number;
  voice_speed: number;
  narrator_role: 'character' | 'narrator' | 'villain' | 'hero' | 'ally';
}

export interface RecapScene {
  scene_id: string;
  panel_id: string;
  source_page_number: number;
  source_panel_index: number;
  narration_text: string;
  subtitle_text: string;
  image_path: string;
  duration: number;
  camera_move: CameraMoveType;
  camera_intensity: number;
  transition_in: TransitionType;
  transition_out: TransitionType;
  narration_preview?: string;
  render_status: RenderStatusType;
  rendered_clip_path?: string;
  audio_path?: string;
}

export interface RecapTimeline {
  timeline_id: string;
  project_id: string;
  title: string;
  subtitle: string;
  style: RecapStyleType;
  scenes_count: number;
  actual_duration: number;
  actual_duration_min: number;
  render_progress: number;
  final_video_path?: string;
  created_at?: string;
  scenes?: RecapScene[];
  character_styles?: Record<string, {
    name: string;
    frame_color: string;
    narrator_role: string;
    voice_id: string;
  }>;
}

// ============================================================================
// Constants
// ============================================================================

export const RECAP_STYLES: Record<RecapStyleType, {
  label: string;
  icon: string;
  description: string;
  color: string;
}> = {
  manga_recap: {
    label: 'Manga Recap',
    icon: '⛩️',
    description: 'Style YouTube manga recap classique : zoom lents, voix off dramatique',
    color: '#ff6b6b',
  },
  anime_epic: {
    label: 'Anime Epic',
    icon: '🌟',
    description: 'Tons épiques, transitions dramatiques, musique intense',
    color: '#ffd700',
  },
  comic_book: {
    label: 'Comic Book',
    icon: '💥',
    description: 'Style comics occidental, bulles stylisées, couleurs vives',
    color: '#4ecdc4',
  },
  cinematic: {
    label: 'Cinématic',
    icon: '🎬',
    description: 'Aspect cinématographique neutre, fondu au noir, narration posée',
    color: '#a8edea',
  },
};

export const TTS_PROVIDERS: Record<TTSProviderType, {
  label: string;
  quality: 'low' | 'medium' | 'high' | 'premium';
  offline: boolean;
  description: string;
}> = {
  gtts: {
    label: 'Google TTS',
    quality: 'medium',
    offline: false,
    description: 'Google Text-to-Speech — simple, fiable, nécessite connexion',
  },
  edge_tts: {
    label: 'Edge TTS (Neural)',
    quality: 'high',
    offline: false,
    description: 'Microsoft Edge — voix neurales haute qualité, recommandé',
  },
  piper: {
    label: 'Piper (local)',
    quality: 'medium',
    offline: true,
    description: 'Piper TTS — entièrement local, 100% offline',
  },
  elevenlabs: {
    label: 'ElevenLabs',
    quality: 'premium',
    offline: false,
    description: 'ElevenLabs — clonage vocal premium, API key requise',
  },
  mock: {
    label: 'Mode Test',
    quality: 'low',
    offline: true,
    description: 'Audio silencieux — pour tester le rendu sans TTS',
  },
};

export const CAMERA_MOVE_LABELS: Record<CameraMoveType, string> = {
  zoom_in: '🔍 Zoom avant',
  zoom_out: '🔎 Zoom arrière',
  pan_left: '⬅️ Panoramique gauche',
  pan_right: '➡️ Panoramique droite',
  slow_push: '🎯 Push lent',
  shake: '💥 Tremblement',
  static: '🖼️ Fixe',
};

export const RENDER_STATUS_LABELS: Record<RenderStatusType, { label: string; color: string }> = {
  pending: { label: 'En attente', color: '#888' },
  rendering: { label: 'Rendu…', color: '#ffaa00' },
  done: { label: 'Rendu', color: '#44cc88' },
  error: { label: 'Erreur', color: '#ff4444' },
};
