/**
 * Video Editor Type Definitions
 * Comprehensive types for the CapCut-style video editor
 */

// Editor Mode
export const EditorMode = {
  VIDEO: 'video',
  IMAGE: 'image',
  AUDIO: 'audio',
} as const;

export type EditorMode = typeof EditorMode[keyof typeof EditorMode];

// Track Type
export const TrackType = {
  VIDEO: 'video',
  AUDIO: 'audio',
  TEXT: 'text',
  EFFECTS: 'effects',
  OVERLAY: 'overlay',
} as const;

export type TrackType = typeof TrackType[keyof typeof TrackType];

// Blend Mode
export const BlendMode = {
  NORMAL: 'normal',
  MULTIPLY: 'multiply',
  SCREEN: 'screen',
  OVERLAY: 'overlay',
  DARKEN: 'darken',
  LIGHTEN: 'lighten',
  COLOR_DODGE: 'color-dodge',
  COLOR_BURN: 'color-burn',
  HARD_LIGHT: 'hard-light',
  SOFT_LIGHT: 'soft-light',
  DIFFERENCE: 'difference',
  EXCLUSION: 'exclusion',
  HUE: 'hue',
  SATURATION: 'saturation',
  COLOR: 'color',
  LUMINOSITY: 'luminosity',
} as const;

export type BlendMode = typeof BlendMode[keyof typeof BlendMode];

// Export Format
export const ExportFormat = {
  MP4: 'mp4',
  WEBM: 'webm',
  MOV: 'mov',
  GIF: 'gif',
  MKV: 'mkv',
} as const;

export type ExportFormat = typeof ExportFormat[keyof typeof ExportFormat];

// Export Codec
export const ExportCodec = {
  H264: 'h264',
  H265: 'h265',
  VP9: 'vp9',
  AV1: 'av1',
  PRORES: 'prores',
} as const;

export type ExportCodec = typeof ExportCodec[keyof typeof ExportCodec];

// Export Preset
export const ExportPreset = {
  YOUTUBE_1080P: 'youtube_1080p',
  YOUTUBE_4K: 'youtube_4k',
  TIKTOK: 'tiktok',
  INSTAGRAM_FEED: 'instagram_feed',
  INSTAGRAM_STORY: 'instagram_story',
  FACEBOOK: 'facebook',
  TWITTER: 'twitter',
  CUSTOM: 'custom',
} as const;

export type ExportPreset = typeof ExportPreset[keyof typeof ExportPreset];

// Aspect Ratio
export const AspectRatio = {
  RATIO_16_9: '16:9',
  RATIO_9_16: '9:16',
  RATIO_1_1: '1:1',
  RATIO_4_5: '4:5',
  RATIO_4_3: '4:3',
  RATIO_21_9: '21:9',
} as const;

export type AspectRatio = typeof AspectRatio[keyof typeof AspectRatio];

// Transition Type
export const TransitionType = {
  NONE: 'none',
  FADE_IN: 'fade_in',
  FADE_OUT: 'fade_out',
  DISSOLVE: 'dissolve',
  WIPE_LEFT: 'wipe_left',
  WIPE_RIGHT: 'wipe_right',
  WIPE_UP: 'wipe_up',
  WIPE_DOWN: 'wipe_down',
  SLIDE_LEFT: 'slide_left',
  SLIDE_RIGHT: 'slide_right',
  SLIDE_UP: 'slide_up',
  SLIDE_DOWN: 'slide_down',
  ZOOM_IN: 'zoom_in',
  ZOOM_OUT: 'zoom_out',
  BLUR: 'blur',
} as const;

export type TransitionType = typeof TransitionType[keyof typeof TransitionType];

// Filter Type
export const FilterType = {
  NONE: 'none',
  BLACK_WHITE: 'black_white',
  SEPIA: 'sepia',
  VINTAGE: 'vintage',
  VIGNETTE: 'vignette',
  BLUR: 'blur',
  SHARPEN: 'sharpen',
  EMBOSS: 'emboss',
  EDGE_DETECT: 'edge_detect',
  FILM_GRAIN: 'film_grain',
  CHROMA_KEY: 'chroma_key',
  GRAYSCALE: 'grayscale',
  WARM: 'warm',
  COOL: 'cool',
  DRAMATIC: 'dramatic',
} as const;

export type FilterType = typeof FilterType[keyof typeof FilterType];

// Text Animation
export const TextAnimation = {
  NONE: 'none',
  FADE_IN: 'fade_in',
  FADE_OUT: 'fade_out',
  SLIDE_IN_LEFT: 'slide_in_left',
  SLIDE_IN_RIGHT: 'slide_in_right',
  SLIDE_IN_UP: 'slide_in_up',
  SLIDE_IN_DOWN: 'slide_in_down',
  SLIDE_IN_TOP: 'slide_in_top',
  SLIDE_IN_BOTTOM: 'slide_in_bottom',
  TYPEWRITER: 'typewriter',
  BOUNCE: 'bounce',
  SCALE: 'scale',
  ROTATE: 'rotate',
  FILL_COLOR: 'fill_color',
} as const;

export type TextAnimation = typeof TextAnimation[keyof typeof TextAnimation];

// Media Type
export const MediaType = {
  VIDEO: 'video',
  AUDIO: 'audio',
  IMAGE: 'image',
} as const;

export type MediaType = typeof MediaType[keyof typeof MediaType];

// Basic Types
export interface TimeRange {
  start: number;
  end: number;
}

export interface Resolution {
  width: number;
  height: number;
}

export interface Position {
  x: number;
  y: number;
}

export interface Scale {
  x: number;
  y: number;
}

export interface Transform {
  position: Position;
  scale: Scale;
  rotation: number;
  anchor: Position;
}

export interface ColorCorrection {
  brightness: number;
  contrast: number;
  saturation: number;
  temperature: number;
  tint: number;
  exposure: number;
  highlights: number;
  shadows: number;
  whites: number;
  blacks: number;
  gamma: number;
  hue: number;
}

export interface Filter {
  id: string;
  type: FilterType;
  intensity: number;
  params?: Record<string, number>;
}

export interface Keyframe {
  id: string;
  time: number;
  property: string;
  value: number | string | boolean | Position | Scale;
  easing: string;
}

export interface Transition {
  id: string;
  type: TransitionType;
  duration: number;
  easing: string;
}

// Media File
export interface MediaMetadata {
  duration?: number;
  frameRate?: number;
  resolution?: Resolution;
  codec?: string;
  bitrate?: number;
  audioCodec?: string;
  audioChannels?: number;
  audioSampleRate?: number;
  fileSize: number;
  thumbnail?: string;
}

export interface MediaFile {
  id: string;
  name: string;
  type: MediaType;
  path: string;
  url?: string;
  metadata: MediaMetadata;
  tags: string[];
  createdAt: Date;
  duration?: number;
}

// Clips
export interface Clip {
  id: string;
  mediaId: string;
  trackId: string;
  startTime: number;
  inPoint: number;
  outPoint?: number;
  duration: number;
  keyframes: Keyframe[];
  effects: ClipEffect[];
  transitionIn?: Transition;
  transitionOut?: Transition;
  locked?: boolean;
  visible?: boolean;
}

export interface ClipEffect {
  id: string;
  type: string;
  params: Record<string, unknown>;
}

export interface VideoClip extends Clip {
  transform?: Transform;
  colorCorrection?: ColorCorrection;
  filters?: Filter[];
  speed?: number;
  reverse?: boolean;
}

export interface AudioClip extends Clip {
  volume: number;
  fadeIn?: number;
  fadeOut?: number;
  audioEffects?: AudioEffect[];
  normalize?: boolean;
}

export interface AudioEffect {
  id: string;
  type: 'equalizer' | 'compressor' | 'reverb' | 'delay' | 'noise_reduction';
  params: Record<string, number>;
}

export interface ImageClip extends Clip {
  transform?: Transform;
  opacity?: number;
  blendMode?: BlendMode;
}

export interface OverlayClip extends Clip {
  opacity: number;
  blendMode: BlendMode;
  position: Position;
  scale: Scale;
}

export interface TextLayer extends Clip {
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  color: string;
  backgroundColor?: string;
  shadow?: {
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
  };
  outline?: {
    color: string;
    width: number;
  };
  animation: TextAnimation;
  animationDuration: number;
  position: Position;
  maxWidth?: number;
  opacity?: number;
}

// Tracks
export interface Track {
  id: string;
  type: TrackType;
  name: string;
  clips: string[];
  locked: boolean;
  hidden: boolean;
  muted: boolean;
  solo?: boolean;
  height: number;
  volume?: number;
  opacity?: number;
}

// Project
export interface EditorProject {
  id: string;
  name: string;
  resolution: Resolution;
  frameRate: number;
  duration: number;
  tracks: Track[];
  media: MediaFile[];
  createdAt: Date;
  updatedAt: Date;
}

// Export Settings
export interface ExportSettings {
  format: ExportFormat;
  codec: ExportCodec;
  resolution: Resolution;
  frameRate: number;
  bitrate?: number;
  videoBitrate?: string;
  audioBitrate?: string;
  preset: ExportPreset;
  quality?: number;
  includeAudio: boolean;
  audioCodec?: ExportCodec;
  audioSampleRate?: number;
}

export interface ExportJob {
  id: string;
  projectId: string;
  status: ExportJobStatus;
  progress: number;
  settings: ExportSettings;
  outputPath?: string;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
}

export const ExportJobStatus = {
  QUEUED: 'queued',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;

export type ExportJobStatus = typeof ExportJobStatus[keyof typeof ExportJobStatus];

export interface ExportQueue {
  jobs: ExportJob[];
  currentJob?: ExportJob;
}

// AI Features
export interface AutoCaptionSettings {
  enabled: boolean;
  language: string;
  maxLineWidth: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  backgroundColor?: string;
  position: 'bottom' | 'top' | 'middle';
  style: 'default' | 'outline' | 'background';
}

export interface SmartCropSettings {
  enabled: boolean;
  targetRatio: AspectRatio;
  mode: 'center' | 'face' | 'motion';
  padding: number;
}

export interface SceneDetectionSettings {
  enabled: boolean;
  sensitivity: number;
  minSceneDuration: number;
  mergeSimilar: boolean;
}

export interface TTSettings {
  enabled: boolean;
  voice: string;
  language: string;
  rate: number;
  pitch: number;
  volume: number;
}

export interface AIFeatures {
  autoCaptions: AutoCaptionSettings;
  smartCrop: SmartCropSettings;
  sceneDetection: SceneDetectionSettings;
  tts: TTSettings;
}

// Undo/Redo
export interface UndoRedoState {
  clips: Clip[];
  tracks: Track[];
  timestamp: number;
}

// Selection
export interface Selection {
  clipIds: string[];
  trackIds: string[];
  timeRange?: TimeRange;
}

// History
export interface HistoryEntry {
  id: string;
  type: 'clip_add' | 'clip_delete' | 'clip_move' | 'clip_trim' | 'track_add' | 'track_delete' | 'effect_add';
  timestamp: number;
  data: unknown;
}

// Text Style
export type TextStyle = 'title' | 'subtitle' | 'lower_third' | 'caption' | 'credits';

// Video Filter (alias for FilterType)
export type VideoFilter = FilterType;



