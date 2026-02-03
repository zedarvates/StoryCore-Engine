// Video Types for StoryCore Engine
// Defines all types related to video playback, thumbnails, and synchronization

// ============================================
// Video Source Types
// ============================================

export interface VideoSource {
  /** Unique identifier for the video source */
  id: string;
  
  /** URL or file path to the video */
  src: string;
  
  /** Video MIME type (e.g., 'video/mp4', 'video/webm') */
  mimeType: string;
  
  /** Original file name */
  fileName: string;
  
  /** File size in bytes */
  fileSize: number;
  
  /** Timestamp when video was added */
  addedAt: number;
}

/**
 * Represents a video file with all its metadata
 */
export interface VideoFile extends VideoSource {
  /** Video duration in seconds */
  duration: number;
  
  /** Video dimensions */
  dimensions: {
    width: number;
    height: number;
  };
  
  /** Frame rate (frames per second) */
  frameRate: number;
  
  /** Video codec (e.g., 'h264', 'h265', 'vp9') */
  codec: string;
  
  /** Bitrate in kbps */
  bitrate: number;
  
  /** Whether video has audio track */
  hasAudio: boolean;
  
  /** Audio codec if present */
  audioCodec?: string;
  
  /** Audio sample rate if present */
  audioSampleRate?: number;
  
  /** Number of audio channels if present */
  audioChannels?: number;
}

// ============================================
// Playback State Types
// ============================================

export type PlaybackState = 'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'seeking' | 'error';

export interface PlaybackStatus {
  /** Current playback state */
  state: PlaybackState;
  
  /** Current playback position in seconds */
  currentTime: number;
  
  /** Current frame number (derived from time and frameRate) */
  currentFrame: number;
  
  /** Total duration in seconds */
  duration: number;
  
  /** Total number of frames */
  totalFrames: number;
  
  /** Current playback rate (0.25x, 0.5x, 1x, 2x, 4x) */
  playbackRate: number;
  
  /** Whether video is muted */
  isMuted: boolean;
  
  /** Whether video is looping */
  isLooping: boolean;
  
  /** Current volume (0.0 to 1.0) */
  volume: number;
  
  /** Buffer progress (0.0 to 1.0) */
  bufferProgress: number;
  
  /** Whether video is currently buffering */
  isBuffering: boolean;
  
  /** Error message if in error state */
  error?: string;
}

export interface PlaybackControls {
  play: () => void;
  pause: () => void;
  stop: () => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  seekToFrame: (frame: number) => void;
  stepForward: (frames?: number) => void;
  stepBackward: (frames?: number) => void;
  setPlaybackRate: (rate: PlaybackRate) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleLoop: () => void;
}

export type PlaybackRate = 0.25 | 0.5 | 1 | 2 | 4;

// ============================================
// Frame Types
// ============================================

export interface FrameInfo {
  /** Frame number (0-indexed) */
  frameNumber: number;
  
  /** Timestamp in seconds */
  timestamp: number;
  
  /** Frame as data URL for thumbnail */
  dataUrl?: string;
  
  /** Width of the frame */
  width: number;
  
  /** Height of the frame */
  height: number;
}

/**
 * Represents a frame capture for thumbnail display
 */
export interface ThumbnailFrame extends FrameInfo {
  /** Quality level (1-100) */
  quality: number;
  
  /** Whether this is a keyframe */
  isKeyframe: boolean;
  
  /** Shot ID this frame belongs to (if applicable) */
  shotId?: string;
}

/**
 * Pre-generated thumbnail cache entry
 */
export interface CachedThumbnail {
  /** Unique key for cache lookup */
  key: string;
  
  /** Thumbnail data URL */
  dataUrl: string;
  
  /** Width of thumbnail */
  width: number;
  
  /** Height of thumbnail */
  height: number;
  
  /** Timestamp when cached */
  cachedAt: number;
  
  /** Last access timestamp */
  lastAccessedAt: number;
  
  /** Access count */
  accessCount: number;
}

// ============================================
// Timeline Synchronization Types
// ============================================

export interface TimelineSyncState {
  /** Whether timeline and video are synchronized */
  isSynced: boolean;
  
  /** Last sync timestamp */
  lastSyncTime: number;
  
  /** Sync offset in seconds (for drift correction) */
  syncOffset: number;
  
  /** Whether currently scrubbing */
  isScrubbing: boolean;
  
  /** Whether sync is enabled */
  syncEnabled: boolean;
}

export interface TimelineVideoSyncEvents {
  'playhead:move': (position: number) => void;
  'video:timeupdate': (time: number) => void;
  'video:play': () => void;
  'video:pause': () => void;
  'video:seek': (time: number) => void;
  'sync:drift': (drift: number) => void;
  'sync:lost': () => void;
  'sync:restored': () => void;
}

// ============================================
// Thumbnail Cache Types
// ============================================

export interface ThumbnailCacheConfig {
  /** Maximum number of thumbnails in cache */
  maxEntries: number;
  
  /** Maximum cache size in bytes */
  maxSizeBytes: number;
  
  /** TTL for cache entries in milliseconds */
  ttlMs: number;
  
  /** Number of thumbnails to preload ahead */
  preloadAhead: number;
  
  /** Quality of generated thumbnails (1-100) */
  quality: number;
  
  /** Thumbnail width */
  thumbnailWidth: number;
  
  /** Thumbnail height */
  thumbnailHeight: number;
}

export interface ThumbnailRequest {
  /** Video source ID */
  videoId: string;
  
  /** Frame number to capture */
  frameNumber: number;
  
  /** Timestamp to capture (alternative to frame number) */
  timestamp?: number;
  
  /** Desired width */
  width?: number;
  
  /** Desired height */
  height?: number;
  
  /** Quality (1-100) */
  quality?: number;
  
  /** Shot ID this thumbnail belongs to */
  shotId?: string;
  
  /** Priority (lower = higher priority) */
  priority?: number;
  
  /** Callback when thumbnail is ready */
  onComplete?: (thumbnail: CachedThumbnail) => void;
  
  /** Callback on error */
  onError?: (error: Error) => void;
}

export interface ThumbnailGenerationOptions {
  /** Source video element */
  videoElement: HTMLVideoElement;
  
  /** Target frame number */
  frameNumber: number;
  
  /** Target timestamp */
  timestamp?: number;
  
  /** Output width */
  width?: number;
  
  /** Output height */
  height?: number;
  
  /** Quality (1-100) */
  quality?: number;
}

// ============================================
// Hover Preview Types
// ============================================

export interface HoverPreviewConfig {
  /** Delay before showing preview (ms) */
  showDelayMs: number;
  
  /** Delay before hiding preview (ms) */
  hideDelayMs: number;
  
  /** Preview width in pixels */
  previewWidth: number;
  
  /** Preview height in pixels */
  previewHeight: number;
  
  /** Maximum preview duration in seconds */
  maxPreviewDuration: number;
  
  /** Whether to show metadata overlay */
  showMetadata: boolean;
  
  /** Whether to show play button overlay */
  showPlayButton: boolean;
}

export interface HoverPreviewState {
  /** Whether preview is currently visible */
  isVisible: boolean;
  
  /** Current hover target element */
  targetElement?: HTMLElement;
  
  /** Shot ID being previewed */
  shotId?: string;
  
  /** Frame number being previewed */
  frameNumber?: number;
  
  /** Preview thumbnail data URL */
  thumbnailUrl?: string;
  
  /** X position for preview popup */
  x: number;
  
  /** Y position for preview popup */
  y: number;
}

// ============================================
// Video Canvas Types
// ============================================

export interface VideoCanvasConfig {
  /** Canvas element */
  canvas: HTMLCanvasElement;
  
  /** Source video element */
  video: HTMLVideoElement;
  
  /** Whether to maintain aspect ratio */
  maintainAspectRatio: boolean;
  
  /** Object fit mode */
  objectFit: 'contain' | 'cover' | 'fill';
  
  /** Background color when video doesn't fill canvas */
  backgroundColor: string;
  
  /** Enable hardware acceleration */
  enableHardwareAcceleration: boolean;
  
  /** Custom CSS transform */
  transform?: string;
}

export interface VideoFrameCaptureOptions {
  /** Output format */
  format: 'png' | 'jpeg' | 'webp';
  
  /** Output quality (0-1 for lossy formats) */
  quality: number;
  
  /** Output width */
  width?: number;
  
  /** Output height */
  height?: number;
  
  /** Whether to preserve aspect ratio */
  preserveAspectRatio: boolean;
}

// ============================================
// Video Info Display Types
// ============================================

export interface VideoDisplayInfo {
  /** Video file name */
  fileName: string;
  
  /** Formatted duration string (HH:MM:SS) */
  formattedDuration: string;
  
  /** Formatted current time string */
  formattedCurrentTime: string;
  
  /** Resolution string (e.g., "1920x1080") */
  resolution: string;
  
  /** Frame rate string (e.g., "30 fps") */
  frameRate: string;
  
  /** Codec string */
  codec: string;
  
  /** Bitrate string */
  bitrate: string;
  
  /** Whether has audio */
  hasAudio: boolean;
  
  /** Buffer status */
  bufferStatus: {
    percent: number;
    formatted: string;
  };
  
  /** Performance metrics */
  performance: {
    currentFps: number;
    droppedFrames: number;
    averageFrameTime: number;
  };
}

// ============================================
// Video Format Support Types
// ============================================

export interface SupportedVideoFormat {
  /** MIME type */
  mimeType: string;
  
  /** File extensions */
  extensions: string[];
  
  /** Codecs supported */
  codecs: string[];
  
  /** Whether browser supports this format */
  isSupported: boolean;
  
  /** Notes about support */
  notes?: string;
}

export interface VideoFormatInfo {
  /** Detected MIME type */
  mimeType: string;
  
  /** Detected codec */
  codec: string;
  
  /** Whether format is supported */
  isSupported: boolean;
  
  /** Warnings about format */
  warnings: string[];
  
  /** Recommendations */
  recommendations: string[];
}

// ============================================
// Event Types
// ============================================

export interface VideoPlayerEventMap {
  // State change events
  'state:change': PlaybackState;
  'time:update': number;
  'frame:update': number;
  'duration:change': number;
  'rate:change': PlaybackRate;
  'volume:change': number;
  'muted:change': boolean;
  'loop:change': boolean;
  
  // Playback events
  'play': void;
  'pause': void;
  'ended': void;
  'seeking': number;
  'seeked': number;
  'waiting': void;
  'canplay': void;
  'canplaythrough': void;
  
  // Error events
  'error': Error;
  'format:unsupported': string;
  
  // Performance events
  'fps:update': number;
  'dropped:frame': number;
  'buffer:update': number;
}

// ============================================
// Utility Types
// ============================================

/**
 * Converts seconds to frame number
 */
export function secondsToFrame(time: number, frameRate: number): number {
  return Math.floor(time * frameRate);
}

/**
 * Converts frame number to seconds
 */
export function frameToSeconds(frame: number, frameRate: number): number {
  return frame / frameRate;
}

/**
 * Formats seconds to HH:MM:SS or MM:SS
 */
export function formatTime(seconds: number, showHours: boolean = false): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  
  if (showHours || h > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * Formats frame number to timecode (HH:MM:SS:FF)
 */
export function formatTimecode(frame: number, frameRate: number, showHours: boolean = true): string {
  const totalSeconds = frame / frameRate;
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  const f = frame % Math.round(frameRate);
  
  if (showHours || h > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}:${f.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}:${f.toString().padStart(2, '0')}`;
}

/**
 * Playback rate options
 */
export const PLAYBACK_RATES: PlaybackRate[] = [0.25, 0.5, 1, 2, 4];

/**
 * Default thumbnail cache configuration
 */
export const DEFAULT_THUMBNAIL_CACHE_CONFIG: ThumbnailCacheConfig = {
  maxEntries: 1000,
  maxSizeBytes: 100 * 1024 * 1024, // 100MB
  ttlMs: 60 * 60 * 1000, // 1 hour
  preloadAhead: 5,
  quality: 85,
  thumbnailWidth: 160,
  thumbnailHeight: 90,
};

/**
 * Default hover preview configuration
 */
export const DEFAULT_HOVER_PREVIEW_CONFIG: HoverPreviewConfig = {
  showDelayMs: 100,
  hideDelayMs: 200,
  previewWidth: 240,
  previewHeight: 135,
  maxPreviewDuration: 5,
  showMetadata: true,
  showPlayButton: true,
};

/**
 * Default video canvas configuration
 */
export const DEFAULT_VIDEO_CANVAS_CONFIG: Partial<VideoCanvasConfig> = {
  maintainAspectRatio: true,
  objectFit: 'contain',
  backgroundColor: '#000000',
  enableHardwareAcceleration: true,
};

