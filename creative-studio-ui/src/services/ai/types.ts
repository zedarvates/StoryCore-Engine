/**
 * Catalog of supported AI directorial intents
 */
export type IntentName = 
  | 'CREATE_PROJECT' | 'OPEN_PROJECT' | 'SAVE_PROJECT' | 'SAVE_AS' | 'CLOSE_PROJECT' | 'EXPORT_PROJECT'
  | 'ADD_SCENE' | 'DELETE_SCENE' | 'DUPLICATE_SCENE' | 'RENAME_SCENE'
  | 'GENERATE_IMAGE' | 'GENERATE_VIDEO' | 'GENERATE_AUDIO' | 'MODIFY_GENERATION' | 'CREATE_MUSIC_VIDEO'
  | 'STABILIZE_CLIP' | 'REMOVE_BACKGROUND' | 'ADD_STICKER' | 'ADJUST_SPEED' | 'AUTO_LYRICS'
  | 'PLAY_TIMELINE' | 'STOP_TIMELINE' | 'ADD_CLIP' | 'REMOVE_CLIP' | 'MOVE_CLIP'
  | 'UNDO' | 'REDO' | 'OPEN_SETTINGS' | 'TOGGLE_AUTOSAVE' | 'SHOW_STATUS'
  | 'CONTEXT_ANALYSIS' | 'WORKFLOW_SUGGESTION' | 'BATCH_OPERATION' | 'PLUGIN_ACTION' | 'CAPTURE_SCREEN'
  | 'LIP_SYNC' | 'GENERATE_RECAP' | 'OPEN_MCP'
  | 'NONE';

/**
 * Structured entities extracted from user intent
 */
export interface IntentEntities {
  // Project entities
  project_name?: string;
  project_path?: string;
  
  // Scene/Shot entities
  scene_id?: string;
  scene_name?: string;
  shot_id?: string;
  index?: number;
  position?: number;
  
  // Generation & Style
  prompt?: string;
  negative_prompt?: string;
  style?: string;
  style_intensity?: number;
  framing?: 'ECU' | 'CU' | 'MCU' | 'MS' | 'MLS' | 'LS' | 'ELS';
  camera_angle?: 'Low' | 'Eye' | 'High' | 'Bird' | 'Worm' | 'Dutch';
  camera_movement?: 'Static' | 'Pan' | 'Tilt' | 'Dolly In' | 'Dolly Out' | 'Zoom In' | 'Zoom Out' | 'Tracking';
  
  // Timing & Duration
  duration?: number | string; // e.g. 96 (frames) or "short"
  start_time?: number;
  end_time?: number;
  
  // Audio
  audio_type?: 'sfx' | 'music' | 'voiceover' | 'ambient';
  volume?: number;
  
  // Playback
  time?: number;
  speed?: number;
  
  // System
  model?: string;
  provider?: string;
}

/**
 * Classification response from Orchestration Engine
 */
export interface IntentResponse {
  intent: IntentName;
  confidence: number;
  entities: IntentEntities;
  context_awareness: Record<string, unknown>;
  requires_confirmation: boolean;
  execution_priority: 'low' | 'medium' | 'high' | 'critical';
  feedback: string;
  suggestions?: string[];
}
