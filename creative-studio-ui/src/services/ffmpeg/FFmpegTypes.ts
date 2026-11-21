// Renderer contracts for the media processing options in backend/ffmpeg_service.py.

export type VideoFormat = 'mp4' | 'webm' | 'mov' | 'gif' | 'mkv' | 'avi' | 'webm_alpha' | 'prores';
export type VideoCodec = 'libx264' | 'libx265' | 'libvpx' | 'libvpx-vp9' | 'libaom-av1' | 'prores_ks' | 'gif';
export type AudioCodec = 'aac' | 'libmp3lame' | 'libopus' | 'pcm_s16le' | 'flac';
type BitrateMode = 'crf' | 'vbr' | 'cqp' | 'cbr';
type GPUEncoder = 'none' | 'nvenc' | 'amf' | 'vaapi';
type Resolution = { width: number; height: number };

export interface ExportSettings {
  format: VideoFormat;
  codec: VideoCodec;
  resolution: Resolution;
  fps: number;
  bitrateMode: BitrateMode;
  quality: number;
  videoBitrate: string | null;
  audioBitrate: string | null;
  audioCodec: AudioCodec;
  audioSampleRate: number;
  audioChannels: number;
  gpuAcceleration: boolean;
  gpuEncoder: GPUEncoder;
  enableAudio: boolean;
  enableSubtitles: boolean;
  customArgs: string[];
  preset: string;
  metadata: Record<string, string>;
}

type ProgressStatus = 'idle' | 'preparing' | 'processing' | 'completed' | 'error' | 'cancelled';

export interface ProgressCallback {
  progress: number;
  status: string;
  fps: number;
  bitrate: string | null;
  message: string | null;
}

export interface FFmpegState {
  status: ProgressStatus;
  progress: number;
  message: string | null;
  timeElapsed: number;
  timeRemaining: number | null;
  fps: number;
  bitrate: string | null;
  error: string | null;
  outputPath: string | null;
}

export interface FFmpegExportState extends FFmpegState {
  settings: ExportSettings;
  estimatedFileSize: number | null;
}

export type AsyncResult<T> = { success: true; data: T } | { success: false; error: string };
export type ExportResponse = AsyncResult<string>;

export interface VideoInfo {
  path: string;
  duration: number;
  bitrate: number;
  width: number;
  height: number;
  fps: number;
  codec: string;
  audio_codec: string | null;
  audio_channels: number;
  audio_sample_rate: number;
  pixel_format: string;
  rotation: number;
  size: number;
  format: string;
}

export interface ThumbnailOptions {
  outputPath: string;
  timestamp?: number;
  width?: number;
  height?: number;
  format?: string;
  quality?: number;
  count?: number;
  timestamps?: number[];
  pattern?: string;
}

export interface AudioExtractionOptions {
  inputPath: string;
  outputPath: string;
  format?: string;
  codec?: string;
  sampleRate?: number;
  bitrate?: string;
  channels?: number;
  startTime?: number;
  duration?: number;
}

export interface ConcatenationOptions {
  inputFiles: string[];
  outputPath: string;
  format?: VideoFormat;
  codec?: VideoCodec;
  transitionDuration?: number;
  audioFade?: number;
}

export interface TrimOptions {
  inputPath: string;
  outputPath: string;
  startTime: number;
  endTime?: number;
}

export interface WatermarkOptions {
  inputPath: string;
  watermarkPath: string;
  outputPath: string;
  position?: string;
  opacity?: number;
  scale?: number;
}

export interface SpeedChangeOptions {
  inputPath: string;
  outputPath: string;
  speedFactor: number;
  adjustAudio?: boolean;
}

export interface GPUCapabilities {
  nvenc: boolean;
  amf: boolean;
  vaapi: boolean;
  cuda: boolean;
}

export type PresetCategory = 'social' | 'web' | 'broadcast' | 'cinema' | 'archive' | 'custom';

export interface Preset {
  name: string;
  description: string;
  category: PresetCategory;
  settings: ExportSettings;
}

export interface FormatOptions {
  id: VideoFormat;
  name: string;
  extension: string;
  mimeType: string;
  defaultCodec: VideoCodec;
  supportedCodecs: VideoCodec[];
  supportsAlpha: boolean;
  supportsAudio: boolean;
  maxResolution: Resolution;
  useCases: string[];
}
