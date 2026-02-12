/**
 * useFFmpeg React Hook
 * 
 * Provides a comprehensive React hook for FFmpeg video processing operations
 * with progress tracking, error handling, and state management.
 */

import { useState, useCallback, useRef, useEffect } from 'react';

import {
  ProgressCallback,
  ProgressStatus,
  ExportSettings,
  VideoFormat,
  VideoCodec,
  AudioCodec,
  BitrateMode,
  GPUEncoder,
  Resolution,
  FFmpegState,
  FFmpegExportState,
  ExportResponse,
  VideoInfo,
  ThumbnailOptions,
  AudioExtractionOptions,
  ConcatenationOptions,
  TrimOptions,
  WatermarkOptions,
  SpeedChangeOptions,
  GPUCapabilities,
  AsyncResult,
  Preset,
  PresetCategory,
  FormatOptions,
  CodecOptions,
} from '../services/ffmpeg/FFmpegTypes';

// =============================================================================
// API Service
// =============================================================================

interface FFmpegAPI {
  /** Transcode a video file */
  transcode(
    inputPath: string,
    outputPath: string,
    options: Partial<ExportSettings>,
    onProgress: (progress: ProgressCallback) => void
  ): Promise<ExportResponse>;
  
  /** Convert video format */
  convertFormat(
    inputPath: string,
    outputPath: string,
    targetFormat: VideoFormat,
    onProgress: (progress: ProgressCallback) => void
  ): Promise<ExportResponse>;
  
  /** Generate thumbnails */
  generateThumbnails(
    inputPath: string,
    options: ThumbnailOptions,
    onProgress: (progress: ProgressCallback) => void
  ): Promise<ExportResponse>;
  
  /** Extract audio */
  extractAudio(
    options: AudioExtractionOptions,
    onProgress: (progress: ProgressCallback) => void
  ): Promise<ExportResponse>;
  
  /** Concatenate videos */
  concatenateVideos(
    options: ConcatenationOptions,
    onProgress: (progress: ProgressCallback) => void
  ): Promise<ExportResponse>;
  
  /** Trim video */
  trimVideo(
    options: TrimOptions,
    onProgress: (progress: ProgressCallback) => void
  ): Promise<ExportResponse>;
  
  /** Add watermark */
  addWatermark(
    options: WatermarkOptions,
    onProgress: (progress: ProgressCallback) => void
  ): Promise<ExportResponse>;
  
  /** Change video speed */
  changeSpeed(
    options: SpeedChangeOptions,
    onProgress: (progress: ProgressCallback) => void
  ): Promise<ExportResponse>;
  
  /** Get video information */
  getVideoInfo(inputPath: string): Promise<VideoInfo>;
  
  /** Get GPU capabilities */
  getGPUCapabilities(): Promise<GPUCapabilities>;
  
  /** Check FFmpeg availability */
  checkAvailability(): Promise<boolean>;
  
  /** Cancel current operation */
  cancelOperation(): Promise<void>;
}

// =============================================================================
// Default Export Settings
// =============================================================================

const DEFAULT_EXPORT_SETTINGS: ExportSettings = {
  format: 'mp4',
  codec: 'libx264',
  resolution: { width: 1920, height: 1080 },
  fps: 30,
  bitrateMode: 'crf',
  quality: 23,
  videoBitrate: null,
  audioBitrate: '192k',
  audioCodec: 'aac',
  audioSampleRate: 44100,
  audioChannels: 2,
  gpuAcceleration: false,
  gpuEncoder: 'none',
  enableAudio: true,
  enableSubtitles: false,
  customArgs: [],
  preset: 'medium',
  metadata: {},
};

// =============================================================================
// Presets
// =============================================================================

export const EXPORT_PRESETS: Record<PresetCategory, Preset[]> = {
  social: [
    {
      name: 'Instagram Portrait',
      description: 'Optimized for Instagram 4:5 aspect ratio',
      category: 'social',
      settings: {
        ...DEFAULT_EXPORT_SETTINGS,
        format: 'mp4',
        codec: 'libx264',
        resolution: { width: 1080, height: 1350 },
        fps: 30,
        quality: 23,
        videoBitrate: '8M',
      },
    },
    {
      name: 'TikTok/Reels',
      description: 'Optimized for TikTok and Instagram Reels',
      category: 'social',
      settings: {
        ...DEFAULT_EXPORT_SETTINGS,
        format: 'mp4',
        codec: 'libx264',
        resolution: { width: 1080, height: 1920 },
        fps: 30,
        quality: 23,
        videoBitrate: '10M',
      },
    },
    {
      name: 'Twitter/X',
      description: 'Optimized for Twitter video upload',
      category: 'social',
      settings: {
        ...DEFAULT_EXPORT_SETTINGS,
        format: 'mp4',
        codec: 'libx264',
        resolution: { width: 1280, height: 720 },
        fps: 30,
        quality: 25,
        videoBitrate: '5M',
      },
    },
  ],
  web: [
    {
      name: 'Web Video HD',
      description: 'Standard HD video for web embedding',
      category: 'web',
      settings: {
        ...DEFAULT_EXPORT_SETTINGS,
        format: 'mp4',
        codec: 'libx264',
        resolution: { width: 1920, height: 1080 },
        fps: 30,
        quality: 23,
        videoBitrate: '5M',
      },
    },
    {
      name: 'Web Video SD',
      description: 'SD video for slower connections',
      category: 'web',
      settings: {
        ...DEFAULT_EXPORT_SETTINGS,
        format: 'mp4',
        codec: 'libx264',
        resolution: { width: 854, height: 480 },
        fps: 24,
        quality: 26,
        videoBitrate: '2M',
      },
    },
    {
      name: 'WebM VP9',
      description: 'Modern web format with VP9 codec',
      category: 'web',
      settings: {
        ...DEFAULT_EXPORT_SETTINGS,
        format: 'webm',
        codec: 'libvpx-vp9',
        resolution: { width: 1920, height: 1080 },
        fps: 30,
        quality: 30,
        videoBitrate: null,
        audioCodec: 'libopus',
      },
    },
  ],
  broadcast: [
    {
      name: 'Broadcast HD',
      description: 'Broadcast-quality HD',
      category: 'broadcast',
      settings: {
        ...DEFAULT_EXPORT_SETTINGS,
        format: 'mp4',
        codec: 'libx264',
        resolution: { width: 1920, height: 1080 },
        fps: 30,
        quality: 18,
        videoBitrate: '15M',
        preset: 'slow',
      },
    },
    {
      name: 'Broadcast 4K',
      description: 'Ultra-high definition broadcast',
      category: 'broadcast',
      settings: {
        ...DEFAULT_EXPORT_SETTINGS,
        format: 'mp4',
        codec: 'libx265',
        resolution: { width: 3840, height: 2160 },
        fps: 30,
        quality: 20,
        videoBitrate: '35M',
        audioBitrate: '256k',
      },
    },
  ],
  cinema: [
    {
      name: 'Cinema ProRes',
      description: 'ProRes for post-production',
      category: 'cinema',
      settings: {
        ...DEFAULT_EXPORT_SETTINGS,
        format: 'mov',
        codec: 'prores_ks',
        resolution: { width: 1920, height: 1080 },
        fps: 24,
        bitrateMode: 'vbr',
        quality: 0,
        audioCodec: 'pcm_s16le',
      },
    },
    {
      name: 'Cinema Lossless',
      description: 'Maximum quality lossless export',
      category: 'cinema',
      settings: {
        ...DEFAULT_EXPORT_SETTINGS,
        format: 'mkv',
        codec: 'libx264',
        resolution: { width: 1920, height: 1080 },
        fps: 24,
        quality: 0,
        videoBitrate: null,
        audioCodec: 'flac',
      },
    },
  ],
  archive: [
    {
      name: 'Archive Master',
      description: 'High-quality archive copy',
      category: 'archive',
      settings: {
        ...DEFAULT_EXPORT_SETTINGS,
        format: 'mp4',
        codec: 'libx264',
        resolution: { width: 1920, height: 1080 },
        fps: 30,
        quality: 18,
        videoBitrate: '20M',
        preset: 'slow',
      },
    },
  ],
  custom: [],
};

// =============================================================================
// Format Options
// =============================================================================

export const FORMAT_OPTIONS: FormatOptions[] = [
  {
    id: 'mp4',
    name: 'MP4 (H.264)',
    extension: '.mp4',
    mimeType: 'video/mp4',
    defaultCodec: 'libx264',
    supportedCodecs: ['libx264', 'libx265', 'libvpx-vp9'],
    supportsAlpha: false,
    supportsAudio: true,
    maxResolution: { width: 7680, height: 4320 },
    useCases: ['Web', 'Mobile', 'Broadcast', 'Archive'],
  },
  {
    id: 'webm',
    name: 'WebM (VP9)',
    extension: '.webm',
    mimeType: 'video/webm',
    defaultCodec: 'libvpx-vp9',
    supportedCodecs: ['libvpx', 'libvpx-vp9', 'libaom-av1'],
    supportsAlpha: false,
    supportsAudio: true,
    maxResolution: { width: 7680, height: 4320 },
    useCases: ['Web', 'Streaming'],
  },
  {
    id: 'mov',
    name: 'QuickTime (MOV)',
    extension: '.mov',
    mimeType: 'video/quicktime',
    defaultCodec: 'prores_ks',
    supportedCodecs: ['libx264', 'prores_ks'],
    supportsAlpha: true,
    supportsAudio: true,
    maxResolution: { width: 7680, height: 4320 },
    useCases: ['Apple devices', 'Post-production'],
  },
  {
    id: 'gif',
    name: 'Animated GIF',
    extension: '.gif',
    mimeType: 'image/gif',
    defaultCodec: 'gif',
    supportedCodecs: ['gif'],
    supportsAlpha: true,
    supportsAudio: false,
    maxResolution: { width: 1920, height: 1080 },
    useCases: ['Social media', 'Web animations'],
  },
  {
    id: 'webm_alpha',
    name: 'WebM with Alpha',
    extension: '.webm',
    mimeType: 'video/webm',
    defaultCodec: 'libvpx-vp9',
    supportedCodecs: ['libvpx-vp9'],
    supportsAlpha: true,
    supportsAudio: true,
    maxResolution: { width: 4096, height: 2160 },
    useCases: ['Video overlay', 'Compositing'],
  },
];

// =============================================================================
// useFFmpeg Hook
// =============================================================================

export interface UseFFmpegReturn {
  // State
  state: FFmpegState;
  
  // Actions
  transcode: (
    inputPath: string,
    outputPath: string,
    options?: Partial<ExportSettings>
  ) => Promise<AsyncResult<string>>;
  
  convertFormat: (
    inputPath: string,
    outputPath: string,
    targetFormat: VideoFormat
  ) => Promise<AsyncResult<string>>;
  
  generateThumbnails: (
    inputPath: string,
    options: Omit<ThumbnailOptions, 'outputPath'>,
    outputPath: string
  ) => Promise<AsyncResult<string>>;
  
  extractAudio: (
    options: Omit<AudioExtractionOptions, 'inputPath'>,
    inputPath: string
  ) => Promise<AsyncResult<string>>;
  
  concatenateVideos: (
    inputFiles: string[],
    outputPath: string,
    format?: VideoFormat
  ) => Promise<AsyncResult<string>>;
  
  trim: (
    inputPath: string,
    outputPath: string,
    startTime: number,
    endTime?: number
  ) => Promise<AsyncResult<string>>;
  
  addWatermark: (
    inputPath: string,
    watermarkPath: string,
    outputPath: string,
    options?: Partial<WatermarkOptions>
  ) => Promise<AsyncResult<string>>;
  
  changeSpeed: (
    inputPath: string,
    outputPath: string,
    speedFactor: number,
    adjustAudio?: boolean
  ) => Promise<AsyncResult<string>>;
  
  getVideoInfo: (inputPath: string) => Promise<AsyncResult<VideoInfo>>;
  
  cancel: () => Promise<void>;
  
  // Utilities
  presets: typeof EXPORT_PRESETS;
  formatOptions: typeof FORMAT_OPTIONS;
}

export function useFFmpeg(): UseFFmpegReturn {
  const [state, setState] = useState<FFmpegState>({
    status: 'idle',
    progress: 0,
    message: null,
    timeElapsed: 0,
    timeRemaining: null,
    fps: 0,
    bitrate: null,
    error: null,
    outputPath: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const startTimeRef = useRef<number>(0);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const updateState = useCallback((updates: Partial<FFmpegState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const createProgressCallback = useCallback(
    (operationName: string): ((progress: ProgressCallback) => void) => {
      return (progress: ProgressCallback) => {
        const timeElapsed = (Date.now() - startTimeRef.current) / 1000;
        
        let timeRemaining: number | null = null;
        if (progress.progress > 0 && progress.progress < 100) {
          const estimatedTotal = timeElapsed / (progress.progress / 100);
          timeRemaining = estimatedTotal - timeElapsed;
        }

        setState(prev => ({
          ...prev,
          status: progress.status === 'completed' ? 'completed' : 'processing',
          progress: progress.progress,
          message: progress.message || `${operationName}: ${progress.status}`,
          timeElapsed,
          timeRemaining,
          fps: progress.fps,
          bitrate: progress.bitrate,
          error: progress.status === 'error' ? progress.message : null,
        }));
      };
    },
    []
  );

  const executeOperation = useCallback(
    async <T>(
      operation: (onProgress: (progress: ProgressCallback) => void) => Promise<T>,
      operationName: string
    ): Promise<AsyncResult<T>> => {
      // Cancel any existing operation
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      startTimeRef.current = Date.now();

      updateState({
        status: 'preparing',
        progress: 0,
        message: `Preparing ${operationName}...`,
        error: null,
        outputPath: null,
      });

      try {
        updateState({ status: 'processing', message: `Starting ${operationName}...` });

        const result = await operation(createProgressCallback(operationName));

        updateState({
          status: 'completed',
          progress: 100,
          message: `${operationName} completed successfully`,
        });

        return { success: true, data: result };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        updateState({
          status: 'error',
          error: errorMessage,
          message: `${operationName} failed: ${errorMessage}`,
        });

        return { success: false, error: errorMessage };
      }
    },
    [createProgressCallback, updateState]
  );

  // ==========================================================================
  // Main Operations
  // ==========================================================================

  const transcode = useCallback(
    async (
      inputPath: string,
      outputPath: string,
      options?: Partial<ExportSettings>
    ): Promise<AsyncResult<string>> => {
      return executeOperation(
        async (onProgress) => {
          const response = await fetch('/api/ffmpeg/transcode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              inputPath,
              outputPath,
              options: { ...DEFAULT_EXPORT_SETTINGS, ...options },
            }),
          });

          if (!response.ok) {
            throw new Error(`Transcode failed: ${response.statusText}`);
          }

          // Handle SSE progress
          const reader = response.body?.getReader();
          if (!reader) throw new Error('No response body');

          const decoder = new TextDecoder();
          let done = false;

          while (!done) {
            const { value, done: doneReading } = await reader.read();
            done = doneReading;
            if (value) {
              const chunk = decoder.decode(value);
              try {
                const progress = JSON.parse(chunk);
                onProgress(progress);
                if (progress.status === 'completed') {
                  break;
                }
              } catch {
                // Skip non-JSON chunks
              }
            }
          }

          return outputPath;
        },
        'Transcoding'
      );
    },
    [executeOperation]
  );

  const convertFormat = useCallback(
    async (
      inputPath: string,
      outputPath: string,
      targetFormat: VideoFormat
    ): Promise<AsyncResult<string>> => {
      return executeOperation(
        async (onProgress) => {
          const response = await fetch('/api/ffmpeg/convert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              inputPath,
              outputPath,
              targetFormat,
            }),
          });

          if (!response.ok) {
            throw new Error(`Format conversion failed: ${response.statusText}`);
          }

          return outputPath;
        },
        'Converting format'
      );
    },
    [executeOperation]
  );

  const generateThumbnails = useCallback(
    async (
      inputPath: string,
      options: Omit<ThumbnailOptions, 'outputPath'>,
      outputPath: string
    ): Promise<AsyncResult<string>> => {
      return executeOperation(
        async (onProgress) => {
          const response = await fetch('/api/ffmpeg/thumbnails', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              inputPath,
              options: { ...options, outputPath },
            }),
          });

          if (!response.ok) {
            throw new Error(`Thumbnail generation failed: ${response.statusText}`);
          }

          return outputPath;
        },
        'Generating thumbnails'
      );
    },
    [executeOperation]
  );

  const extractAudio = useCallback(
    async (
      options: Omit<AudioExtractionOptions, 'inputPath'>,
      inputPath: string
    ): Promise<AsyncResult<string>> => {
      return executeOperation(
        async (onProgress) => {
          const response = await fetch('/api/ffmpeg/extract-audio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              inputPath,
              options: { ...options, inputPath },
            }),
          });

          if (!response.ok) {
            throw new Error(`Audio extraction failed: ${response.statusText}`);
          }

          return options.outputPath;
        },
        'Extracting audio'
      );
    },
    [executeOperation]
  );

  const concatenateVideos = useCallback(
    async (
      inputFiles: string[],
      outputPath: string,
      format: VideoFormat = 'mp4'
    ): Promise<AsyncResult<string>> => {
      return executeOperation(
        async (onProgress) => {
          const response = await fetch('/api/ffmpeg/concatenate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              inputFiles,
              outputPath,
              format,
            }),
          });

          if (!response.ok) {
            throw new Error(`Concatenation failed: ${response.statusText}`);
          }

          return outputPath;
        },
        'Concatenating videos'
      );
    },
    [executeOperation]
  );

  const trim = useCallback(
    async (
      inputPath: string,
      outputPath: string,
      startTime: number,
      endTime?: number
    ): Promise<AsyncResult<string>> => {
      return executeOperation(
        async (onProgress) => {
          const response = await fetch('/api/ffmpeg/trim', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              inputPath,
              outputPath,
              startTime,
              endTime,
            }),
          });

          if (!response.ok) {
            throw new Error(`Trim failed: ${response.statusText}`);
          }

          return outputPath;
        },
        'Trimming video'
      );
    },
    [executeOperation]
  );

  const addWatermark = useCallback(
    async (
      inputPath: string,
      watermarkPath: string,
      outputPath: string,
      options?: Partial<WatermarkOptions>
    ): Promise<AsyncResult<string>> => {
      return executeOperation(
        async (onProgress) => {
          const response = await fetch('/api/ffmpeg/watermark', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              inputPath,
              watermarkPath,
              outputPath,
              options: {
                position: 'bottomright',
                opacity: 0.5,
                scale: 0.15,
                ...options,
              },
            }),
          });

          if (!response.ok) {
            throw new Error(`Watermark failed: ${response.statusText}`);
          }

          return outputPath;
        },
        'Adding watermark'
      );
    },
    [executeOperation]
  );

  const changeSpeed = useCallback(
    async (
      inputPath: string,
      outputPath: string,
      speedFactor: number,
      adjustAudio: boolean = true
    ): Promise<AsyncResult<string>> => {
      return executeOperation(
        async (onProgress) => {
          const response = await fetch('/api/ffmpeg/speed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              inputPath,
              outputPath,
              speedFactor,
              adjustAudio,
            }),
          });

          if (!response.ok) {
            throw new Error(`Speed change failed: ${response.statusText}`);
          }

          return outputPath;
        },
        'Changing video speed'
      );
    },
    [executeOperation]
  );

  const getVideoInfo = useCallback(
    async (inputPath: string): Promise<AsyncResult<VideoInfo>> => {
      try {
        const response = await fetch(`/api/ffmpeg/info?path=${encodeURIComponent(inputPath)}`);
        
        if (!response.ok) {
          throw new Error(`Failed to get video info: ${response.statusText}`);
        }

        const info = await response.json();
        return { success: true, data: info };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
    []
  );

  const cancel = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    try {
      await fetch('/api/ffmpeg/cancel', { method: 'POST' });
    } catch {
      // Ignore cancel API errors
    }

    updateState({
      status: 'cancelled',
      message: 'Operation cancelled',
      progress: 0,
    });
  }, [updateState]);

  return {
    state,
    transcode,
    convertFormat,
    generateThumbnails,
    extractAudio,
    concatenateVideos,
    trim,
    addWatermark,
    changeSpeed,
    getVideoInfo,
    cancel,
    presets: EXPORT_PRESETS,
    formatOptions: FORMAT_OPTIONS,
  };
}

// =============================================================================
// useFFmpegExport Hook
// =============================================================================

export interface UseFFmpegExportReturn extends UseFFmpegReturn {
  exportState: FFmpegExportState;
  startExport: (settings: ExportSettings) => Promise<AsyncResult<string>>;
  applyPreset: (presetName: string, category: PresetCategory) => ExportSettings;
  updateSettings: (updates: Partial<ExportSettings>) => void;
  getSettings: () => ExportSettings;
}

export function useFFmpegExport(): UseFFmpegExportReturn {
  const ffmpeg = useFFmpeg();
  
  const [exportSettings, setExportSettings] = useState<ExportSettings>(DEFAULT_EXPORT_SETTINGS);
  
  const [exportState, setExportState] = useState<FFmpegExportState>({
    ...ffmpeg.state,
    settings: exportSettings,
    estimatedFileSize: null,
  });

  // Sync export state with ffmpeg state
  useEffect(() => {
    setExportState(prev => ({
      ...prev,
      ...ffmpeg.state,
      settings: exportSettings,
    }));
  }, [ffmpeg.state, exportSettings]);

  const startExport = useCallback(
    async (settings: ExportSettings): Promise<AsyncResult<string>> => {
      setExportSettings(settings);
      
      const outputPath = generateOutputPath(settings);
      
      return ffmpeg.transcode(
        '', // Input path should be set externally
        outputPath,
        settings
      );
    },
    [ffmpeg, exportSettings]
  );

  const applyPreset = useCallback(
    (presetName: string, category: PresetCategory): ExportSettings => {
      const preset = EXPORT_PRESETS[category].find(p => p.name === presetName);
      if (preset) {
        const newSettings = { ...preset.settings };
        setExportSettings(newSettings);
        return newSettings;
      }
      return exportSettings;
    },
    [exportSettings]
  );

  const updateSettings = useCallback((updates: Partial<ExportSettings>) => {
    setExportSettings(prev => ({ ...prev, ...updates }));
  }, []);

  const getSettings = useCallback(() => exportSettings, [exportSettings]);

  return {
    ...ffmpeg,
    exportState,
    startExport,
    applyPreset,
    updateSettings,
    getSettings,
  };
}

// =============================================================================
// Utility Functions
// =============================================================================

function generateOutputPath(settings: ExportSettings): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const extension = settings.format === 'webm_alpha' ? '.webm' : `.${settings.format}`;
  return `export/storycore_export_${timestamp}${extension}`;
}

/**
 * Estimate file size based on settings and duration
 */
export function estimateFileSize(
  duration: number,
  settings: ExportSettings
): number {
  const { videoBitrate, audioBitrate, resolution } = settings;
  
  // Parse bitrate values
  const videoRate = parseBitrate(videoBitrate) || 5000000; // Default 5 Mbps
  const audioRate = parseBitrate(audioBitrate) || 192000; // Default 192 kbps
  
  // Total bitrate
  const totalBitrate = videoRate + audioRate;
  
  // Estimate in bytes
  const fileSize = (totalBitrate * duration) / 8;
  
  return Math.round(fileSize);
}

function parseBitrate(bitrate: string | null): number | null {
  if (!bitrate) return null;
  
  const match = bitrate.match(/^(\d+(?:\.\d+)?)([kKmM])$/);
  if (!match) return null;
  
  const value = parseFloat(match[1]);
  const unit = match[2].toLowerCase();
  
  if (unit === 'k') return value * 1000;
  if (unit === 'm') return value * 1000000;
  return value;
}

/**
 * Get recommended export settings based on use case
 */
export function getRecommendedSettings(
  useCase: 'social' | 'web' | 'broadcast' | 'cinema' | 'archive'
): ExportSettings {
  const presetsByCategory: Record<string, Preset[]> = {
    social: EXPORT_PRESETS.social,
    web: EXPORT_PRESETS.web,
    broadcast: EXPORT_PRESETS.broadcast,
    cinema: EXPORT_PRESETS.cinema,
    archive: EXPORT_PRESETS.archive,
  };

  const presets = presetsByCategory[useCase];
  if (presets && presets.length > 0) {
    return { ...presets[0].settings };
  }

  return { ...DEFAULT_EXPORT_SETTINGS };
}

// =============================================================================
// Named Exports for Tree Shaking
// =============================================================================

export type {
  FFmpegAPI,
};
