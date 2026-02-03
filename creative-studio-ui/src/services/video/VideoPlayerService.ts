/**
 * VideoPlayerService - Core video playback service for StoryCore Engine
 * 
 * Handles all video playback operations including:
 * - Play/pause/stop controls
 * - Frame-accurate seeking
 * - Frame-by-frame navigation
 * - Playback rate control
 * - Loop and mute toggles
 * - Event emission for state changes
 * 
 * @module services/video/VideoPlayerService
 */

import {
  PlaybackState,
  PlaybackStatus,
  PlaybackControls,
  PlaybackRate,
  PLAYBACK_RATES,
  FrameInfo,
  formatTime,
  formatTimecode,
  secondsToFrame,
  frameToSeconds,
} from '../../types/video';

// ============================================
// Configuration
// ============================================

type VideoPlayerConfig = {
  defaultPlaybackRate: PlaybackRate;
  defaultVolume: number;
  defaultMuted: boolean;
  defaultLooping: boolean;
  frameRate: number;
  useHighPrecisionTime: boolean;
  bufferThresholdSeconds: number;
  maxBufferedSeconds: number;
};

const DEFAULT_CONFIG: VideoPlayerConfig = {
  defaultPlaybackRate: 1,
  defaultVolume: 1.0,
  defaultMuted: false,
  defaultLooping: false,
  frameRate: 30,
  useHighPrecisionTime: true,
  bufferThresholdSeconds: 0.5,
  maxBufferedSeconds: 30,
};

// ============================================
// Error Classes
// ============================================

export class VideoPlayerError extends Error {
  code: string;
  originalError?: Error;
  
  constructor(message: string, code: string, originalError?: Error) {
    super(message);
    this.name = 'VideoPlayerError';
    this.code = code;
    this.originalError = originalError;
  }
}

export class VideoNotLoadedError extends VideoPlayerError {
  constructor() {
    super('Video source not loaded', 'VIDEO_NOT_LOADED');
  }
}

export class InvalidSeekError extends VideoPlayerError {
  constructor(time: number, min: number, max: number) {
    super(
      `Invalid seek time: ${time}. Must be between ${min} and ${max}`,
      'INVALID_SEEK_TIME'
    );
  }
}

export class InvalidFrameError extends VideoPlayerError {
  constructor(frame: number, min: number, max: number) {
    super(
      `Invalid frame: ${frame}. Must be between ${min} and ${max}`,
      'INVALID_FRAME'
    );
  }
}

// ============================================
// Event Types
// ============================================

export type VideoPlayerEventType = 
  | 'state:change'
  | 'time:update'
  | 'frame:update'
  | 'rate:change'
  | 'volume:change'
  | 'muted:change'
  | 'loop:change'
  | 'play'
  | 'pause'
  | 'ended'
  | 'seeking'
  | 'seeked'
  | 'waiting'
  | 'canplay'
  | 'fps:update'
  | 'dropped:frame'
  | 'buffer:update'
  | 'error';

export type VideoPlayerEventCallback = (data?: unknown) => void;

// ============================================
// Service Class
// ============================================

export class VideoPlayerService {
  private videoEl: HTMLVideoElement | null = null;
  private configData: VideoPlayerConfig;
  private statusData: PlaybackStatus;
  private animationId: number | null = null;
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private currentFps: number = 30;
  private frameTimes: number[] = [];
  private droppedFramesData: number = 0;
  private lastPerfCheck: number = 0;
  
  // Event listeners storage
  private listeners: Map<VideoPlayerEventType, Set<VideoPlayerEventCallback>> = new Map();
  
  // Event handlers - bound once for performance
  private handleTimeUpdateBound: () => void;
  private handlePlayBound: () => void;
  private handlePauseBound: () => void;
  private handleEndedBound: () => void;
  private handleWaitingBound: () => void;
  private handleCanPlayBound: () => void;
  private handleErrorBound: () => void;
  
  constructor(config: Partial<VideoPlayerConfig> = {}) {
    this.configData = { ...DEFAULT_CONFIG, ...config };
    this.statusData = {
      state: 'idle',
      currentTime: 0,
      currentFrame: 0,
      duration: 0,
      totalFrames: 0,
      playbackRate: this.configData.defaultPlaybackRate,
      isMuted: this.configData.defaultMuted,
      isLooping: this.configData.defaultLooping,
      volume: this.configData.defaultVolume,
      bufferProgress: 0,
      isBuffering: false,
    };
    
    // Bind event handlers once
    this.handleTimeUpdateBound = this.onTimeUpdate.bind(this);
    this.handlePlayBound = this.onPlay.bind(this);
    this.handlePauseBound = this.onPause.bind(this);
    this.handleEndedBound = this.onEnded.bind(this);
    this.handleWaitingBound = this.onWaiting.bind(this);
    this.handleCanPlayBound = this.onCanPlay.bind(this);
    this.handleErrorBound = this.onError.bind(this);
  }
  
  // ============================================
  // Event System
  // ============================================
  
  on(event: VideoPlayerEventType, callback: VideoPlayerEventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }
  
  off(event: VideoPlayerEventType, callback: VideoPlayerEventCallback): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(callback);
    }
  }
  
  once(event: VideoPlayerEventType, callback: VideoPlayerEventCallback): void {
    const self = this;
    const wrapper: VideoPlayerEventCallback = function(data) {
      self.off(event, wrapper);
      callback(data);
    };
    this.on(event, wrapper);
  }
  
  private emitStateChange(state: PlaybackState): void {
    const handlers = this.listeners.get('state:change');
    if (handlers) {
      handlers.forEach(cb => cb(state));
    }
  }
  
  private emitTimeUpdate(time: number): void {
    const handlers = this.listeners.get('time:update');
    if (handlers) {
      handlers.forEach(cb => cb(time));
    }
  }
  
  private emitFrameUpdate(frame: number): void {
    const handlers = this.listeners.get('frame:update');
    if (handlers) {
      handlers.forEach(cb => cb(frame));
    }
  }
  
  private emitRateChange(rate: PlaybackRate): void {
    const handlers = this.listeners.get('rate:change');
    if (handlers) {
      handlers.forEach(cb => cb(rate));
    }
  }
  
  private emitVolumeChange(volume: number): void {
    const handlers = this.listeners.get('volume:change');
    if (handlers) {
      handlers.forEach(cb => cb(volume));
    }
  }
  
  private emitMutedChange(muted: boolean): void {
    const handlers = this.listeners.get('muted:change');
    if (handlers) {
      handlers.forEach(cb => cb(muted));
    }
  }
  
  private emitLoopChange(looping: boolean): void {
    const handlers = this.listeners.get('loop:change');
    if (handlers) {
      handlers.forEach(cb => cb(looping));
    }
  }
  
  private emitPlay(): void {
    const handlers = this.listeners.get('play');
    if (handlers) {
      handlers.forEach(cb => cb());
    }
  }
  
  private emitPause(): void {
    const handlers = this.listeners.get('pause');
    if (handlers) {
      handlers.forEach(cb => cb());
    }
  }
  
  private emitEnded(): void {
    const handlers = this.listeners.get('ended');
    if (handlers) {
      handlers.forEach(cb => cb());
    }
  }
  
  private emitSeeking(time: number): void {
    const handlers = this.listeners.get('seeking');
    if (handlers) {
      handlers.forEach(cb => cb(time));
    }
  }
  
  private emitSeeked(time: number): void {
    const handlers = this.listeners.get('seeked');
    if (handlers) {
      handlers.forEach(cb => cb(time));
    }
  }
  
  private emitWaiting(): void {
    const handlers = this.listeners.get('waiting');
    if (handlers) {
      handlers.forEach(cb => cb());
    }
  }
  
  private emitCanPlay(): void {
    const handlers = this.listeners.get('canplay');
    if (handlers) {
      handlers.forEach(cb => cb());
    }
  }
  
  private emitFpsUpdate(fps: number): void {
    const handlers = this.listeners.get('fps:update');
    if (handlers) {
      handlers.forEach(cb => cb(fps));
    }
  }
  
  private emitDroppedFrame(count: number): void {
    const handlers = this.listeners.get('dropped:frame');
    if (handlers) {
      handlers.forEach(cb => cb(count));
    }
  }
  
  private emitBufferUpdate(progress: number): void {
    const handlers = this.listeners.get('buffer:update');
    if (handlers) {
      handlers.forEach(cb => cb(progress));
    }
  }
  
  private emitError(error: VideoPlayerError): void {
    const handlers = this.listeners.get('error');
    if (handlers) {
      handlers.forEach(cb => cb(error));
    }
  }
  
  // ============================================
  // Initialization
  // ============================================
  
  initialize(videoElement: HTMLVideoElement): void {
    if (this.videoEl) {
      this.detach();
    }
    
    this.videoEl = videoElement;
    this.attachEventListeners();
    
    this.videoEl.volume = this.statusData.volume;
    this.videoEl.muted = this.statusData.isMuted;
    this.videoEl.loop = this.statusData.isLooping;
    this.videoEl.playbackRate = this.configData.frameRate;
    
    this.statusData.state = 'ready';
    this.statusData.duration = this.videoEl.duration || 0;
    this.statusData.totalFrames = this.calcTotalFrames();
    
    this.emitStateChange(this.statusData.state);
    this.emitCanPlay();
  }
  
  private attachEventListeners(): void {
    if (!this.videoEl) return;
    
    this.videoEl.addEventListener('timeupdate', this.handleTimeUpdateBound);
    this.videoEl.addEventListener('play', this.handlePlayBound);
    this.videoEl.addEventListener('pause', this.handlePauseBound);
    this.videoEl.addEventListener('ended', this.handleEndedBound);
    this.videoEl.addEventListener('waiting', this.handleWaitingBound);
    this.videoEl.addEventListener('canplay', this.handleCanPlayBound);
    this.videoEl.addEventListener('error', this.handleErrorBound);
  }
  
  detach(): void {
    if (!this.videoEl) return;
    
    this.pause();
    this.stopAnimationLoop();
    
    this.videoEl.removeEventListener('timeupdate', this.handleTimeUpdateBound);
    this.videoEl.removeEventListener('play', this.handlePlayBound);
    this.videoEl.removeEventListener('pause', this.handlePauseBound);
    this.videoEl.removeEventListener('ended', this.handleEndedBound);
    this.videoEl.removeEventListener('waiting', this.handleWaitingBound);
    this.videoEl.removeEventListener('canplay', this.handleCanPlayBound);
    this.videoEl.removeEventListener('error', this.handleErrorBound);
    
    this.videoEl = null;
    this.statusData.state = 'idle';
  }
  
  // ============================================
  // Playback Controls
  // ============================================
  
  async play(): Promise<void> {
    if (!this.videoEl) {
      throw new VideoNotLoadedError();
    }
    
    if (this.statusData.state === 'playing') {
      return;
    }
    
    if (this.statusData.state === 'error') {
      throw new VideoPlayerError('Cannot play in error state', 'ERROR_STATE');
    }
    
    try {
      this.statusData.state = 'loading';
      this.emitStateChange(this.statusData.state);
      
      await this.videoEl.play();
    } catch (error) {
      this.statusData.state = 'error';
      this.statusData.error = error instanceof Error ? error.message : 'Unknown play error';
      this.emitStateChange(this.statusData.state);
      const err = new VideoPlayerError(
        `Failed to play: ${this.statusData.error}`,
        'PLAY_FAILED',
        error instanceof Error ? error : undefined
      );
      this.emitError(err);
      throw err;
    }
  }
  
  pause(): void {
    if (!this.videoEl) {
      throw new VideoNotLoadedError();
    }
    
    if (this.statusData.state !== 'playing' && this.statusData.state !== 'loading') {
      return;
    }
    
    this.videoEl.pause();
    this.stopAnimationLoop();
  }
  
  stop(): void {
    if (!this.videoEl) {
      throw new VideoNotLoadedError();
    }
    
    this.videoEl.pause();
    this.videoEl.currentTime = 0;
    this.stopAnimationLoop();
    
    this.statusData.state = 'ready';
    this.statusData.currentTime = 0;
    this.statusData.currentFrame = 0;
    this.statusData.isBuffering = false;
    
    this.emitStateChange(this.statusData.state);
    this.emitTimeUpdate(this.statusData.currentTime);
    this.emitFrameUpdate(this.statusData.currentFrame);
  }
  
  async togglePlay(): Promise<void> {
    if (this.statusData.state === 'playing') {
      this.pause();
    } else {
      await this.play();
    }
  }
  
  seek(time: number): Promise<void> {
    if (!this.videoEl) {
      throw new VideoNotLoadedError();
    }
    
    const minTime = 0;
    const maxTime = this.statusData.duration;
    
    if (time < minTime || time > maxTime) {
      throw new InvalidSeekError(time, minTime, maxTime);
    }
    
    this.statusData.state = 'seeking';
    this.statusData.isBuffering = true;
    this.emitStateChange(this.statusData.state);
    this.emitSeeking(time);
    
    const videoEl = this.videoEl;
    
    return new Promise((resolve, reject) => {
      const onSeeked = () => {
        videoEl.removeEventListener('seeked', onSeeked);
        videoEl.removeEventListener('error', onError);
        
        this.statusData.currentTime = videoEl.currentTime;
        this.statusData.currentFrame = this.calcCurrentFrame();
        this.statusData.isBuffering = false;
        this.statusData.state = videoEl.paused ? 'ready' : 'playing';
        
        this.emitStateChange(this.statusData.state);
        this.emitTimeUpdate(this.statusData.currentTime);
        this.emitFrameUpdate(this.statusData.currentFrame);
        this.emitSeeked(this.statusData.currentTime);
        
        resolve();
      };
      
      const onError = () => {
        videoEl.removeEventListener('seeked', onSeeked);
        videoEl.removeEventListener('error', onError);
        
        this.statusData.state = 'error';
        this.statusData.isBuffering = false;
        this.statusData.error = 'Seek failed';
        
        this.emitStateChange(this.statusData.state);
        reject(new VideoPlayerError('Seek operation failed', 'SEEK_FAILED'));
      };
      
      videoEl.addEventListener('seeked', onSeeked, { once: true });
      videoEl.addEventListener('error', onError, { once: true });
      
      videoEl.currentTime = time;
    });
  }
  
  async seekToFrame(frame: number): Promise<void> {
    const minFrame = 0;
    const maxFrame = this.statusData.totalFrames - 1;
    
    if (frame < minFrame || frame > maxFrame) {
      throw new InvalidFrameError(frame, minFrame, maxFrame);
    }
    
    const time = frameToSeconds(frame, this.configData.frameRate);
    await this.seek(time);
  }
  
  async stepForward(frames: number = 1): Promise<void> {
    const targetFrame = Math.min(this.statusData.currentFrame + frames, this.statusData.totalFrames - 1);
    await this.seekToFrame(targetFrame);
  }
  
  async stepBackward(frames: number = 1): Promise<void> {
    const targetFrame = Math.max(this.statusData.currentFrame - frames, 0);
    await this.seekToFrame(targetFrame);
  }
  
  setPlaybackRate(rate: PlaybackRate): void {
    if (!this.videoEl) {
      throw new VideoNotLoadedError();
    }
    
    if (!PLAYBACK_RATES.includes(rate)) {
      throw new VideoPlayerError(
        `Invalid playback rate: ${rate}. Valid rates: ${PLAYBACK_RATES.join(', ')}`,
        'INVALID_PLAYBACK_RATE'
      );
    }
    
    this.statusData.playbackRate = rate;
    this.videoEl.playbackRate = rate;
    this.emitRateChange(rate);
  }
  
  setVolume(volume: number): void {
    if (!this.videoEl) {
      throw new VideoNotLoadedError();
    }
    
    const clampedVolume = Math.max(0, Math.min(1, volume));
    this.statusData.volume = clampedVolume;
    this.videoEl.volume = clampedVolume;
    this.emitVolumeChange(clampedVolume);
  }
  
  toggleMute(): void {
    if (!this.videoEl) {
      throw new VideoNotLoadedError();
    }
    
    this.statusData.isMuted = !this.statusData.isMuted;
    this.videoEl.muted = this.statusData.isMuted;
    this.emitMutedChange(this.statusData.isMuted);
  }
  
  toggleLoop(): void {
    if (!this.videoEl) {
      throw new VideoNotLoadedError();
    }
    
    this.statusData.isLooping = !this.statusData.isLooping;
    this.videoEl.loop = this.statusData.isLooping;
    this.emitLoopChange(this.statusData.isLooping);
  }
  
  // ============================================
  // Status & Information
  // ============================================
  
  getStatus(): PlaybackStatus {
    return { ...this.statusData };
  }
  
  getState(): PlaybackState {
    return this.statusData.state;
  }
  
  getCurrentTime(): number {
    return this.statusData.currentTime;
  }
  
  getCurrentFrame(): number {
    return this.statusData.currentFrame;
  }
  
  getFormattedTime(): string {
    return formatTime(this.statusData.currentTime, this.statusData.duration > 3600);
  }
  
  getFormattedTimecode(): string {
    return formatTimecode(
      this.statusData.currentFrame,
      this.configData.frameRate,
      this.statusData.duration > 3600
    );
  }
  
  getDuration(): number {
    return this.statusData.duration;
  }
  
  getTotalFrames(): number {
    return this.statusData.totalFrames;
  }
  
  getCurrentFps(): number {
    return this.currentFps;
  }
  
  getDroppedFrames(): number {
    return this.droppedFramesData;
  }
  
  getCurrentFrameInfo(): FrameInfo {
    return {
      frameNumber: this.statusData.currentFrame,
      timestamp: this.statusData.currentTime,
      width: this.videoEl?.videoWidth || 0,
      height: this.videoEl?.videoHeight || 0,
    };
  }
  
  isPlaying(): boolean {
    return this.statusData.state === 'playing';
  }
  
  isMuted(): boolean {
    return this.statusData.isMuted;
  }
  
  isLooping(): boolean {
    return this.statusData.isLooping;
  }
  
  isReady(): boolean {
    return this.statusData.state === 'ready' || this.statusData.state === 'playing';
  }
  
  isLoaded(): boolean {
    return this.videoEl !== null;
  }
  
  // ============================================
  // Event Handlers
  // ============================================
  
  private onTimeUpdate(): void {
    if (!this.videoEl) return;
    
    this.statusData.currentTime = this.videoEl.currentTime;
    this.statusData.currentFrame = this.calcCurrentFrame();
    this.updatePerfMetrics();
    this.updateBufferProgress();
    
    this.emitTimeUpdate(this.statusData.currentTime);
    this.emitFrameUpdate(this.statusData.currentFrame);
  }
  
  private onPlay(): void {
    this.statusData.state = 'playing';
    this.statusData.isBuffering = false;
    this.startAnimationLoop();
    this.emitStateChange(this.statusData.state);
    this.emitPlay();
  }
  
  private onPause(): void {
    this.statusData.state = 'ready';
    this.stopAnimationLoop();
    this.emitStateChange(this.statusData.state);
    this.emitPause();
  }
  
  private onEnded(): void {
    this.stopAnimationLoop();
    
    if (this.statusData.isLooping) {
      this.seek(0).then(() => this.play());
    } else {
      this.statusData.state = 'ready';
      this.emitStateChange(this.statusData.state);
    }
    
    this.emitEnded();
  }
  
  private onWaiting(): void {
    this.statusData.state = 'loading';
    this.statusData.isBuffering = true;
    this.emitStateChange(this.statusData.state);
    this.emitWaiting();
  }
  
  private onCanPlay(): void {
    if (this.statusData.state === 'loading' && this.videoEl) {
      this.statusData.state = 'ready';
      this.statusData.isBuffering = false;
      this.statusData.duration = this.videoEl.duration || 0;
      this.statusData.totalFrames = this.calcTotalFrames();
      this.emitStateChange(this.statusData.state);
      this.emitCanPlay();
    }
  }
  
  private onError(): void {
    if (!this.videoEl) return;
    
    const error = this.videoEl.error;
    this.statusData.state = 'error';
    this.statusData.error = error?.message || 'Unknown video error';
    this.statusData.isBuffering = false;
    
    this.emitStateChange(this.statusData.state);
    
    const errorObj = error ? new Error(error.message) : new Error('Unknown video error');
    errorObj.name = 'VideoPlayerError';
    
    const err = new VideoPlayerError(
      `Video error: ${this.statusData.error}`,
      error?.code ? `VIDEO_ERROR_${error.code}` : 'VIDEO_ERROR',
      errorObj
    );
    this.emitError(err);
  }
  
  // ============================================
  // Animation & Performance
  // ============================================
  
  private startAnimationLoop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    
    this.lastFrameTime = performance.now();
    this.frameCount = 0;
    this.frameTimes = [];
    
    const animate = (timestamp: number) => {
      if (this.statusData.state !== 'playing') {
        return;
      }
      
      const deltaTime = timestamp - this.lastFrameTime;
      this.frameTimes.push(deltaTime);
      
      if (this.frameTimes.length > 60) {
        this.frameTimes.shift();
      }
      
      this.frameCount++;
      if (this.frameCount >= 30) {
        const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
        this.currentFps = 1000 / avgFrameTime;
        this.emitFpsUpdate(this.currentFps);
        this.frameCount = 0;
      }
      
      this.lastFrameTime = timestamp;
      
      if (deltaTime > 33) {
        this.droppedFramesData++;
        this.emitDroppedFrame(this.droppedFramesData);
      }
      
      this.animationId = requestAnimationFrame(animate);
    };
    
    this.animationId = requestAnimationFrame(animate);
  }
  
  private stopAnimationLoop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
  
  private updatePerfMetrics(): void {
    const now = performance.now();
    if (now - this.lastPerfCheck > 1000) {
      this.lastPerfCheck = now;
      this.emitFpsUpdate(this.currentFps);
    }
  }
  
  private updateBufferProgress(): void {
    if (!this.videoEl || this.statusData.duration === Infinity) {
      return;
    }
    
    const buffered = this.videoEl.buffered;
    if (buffered.length > 0) {
      const bufferedEnd = buffered.end(buffered.length - 1);
      this.statusData.bufferProgress = bufferedEnd / this.statusData.duration;
      this.emitBufferUpdate(this.statusData.bufferProgress);
    }
  }
  
  // ============================================
  // Helper Methods
  // ============================================
  
  private calcCurrentFrame(): number {
    if (!this.videoEl) return 0;
    return secondsToFrame(this.videoEl.currentTime, this.configData.frameRate);
  }
  
  private calcTotalFrames(): number {
    if (!this.videoEl || !this.videoEl.duration) return 0;
    return Math.floor(this.videoEl.duration * this.configData.frameRate);
  }
  
  getVideoElement(): HTMLVideoElement | null {
    return this.videoEl;
  }
  
  getControls(): PlaybackControls {
    return {
      play: () => this.play(),
      pause: () => this.pause(),
      stop: () => this.stop(),
      togglePlay: () => this.togglePlay(),
      seek: (time: number) => this.seek(time),
      seekToFrame: (frame: number) => this.seekToFrame(frame),
      stepForward: (frames?: number) => this.stepForward(frames),
      stepBackward: (frames?: number) => this.stepBackward(frames),
      setPlaybackRate: (rate: PlaybackRate) => this.setPlaybackRate(rate),
      setVolume: (volume: number) => this.setVolume(volume),
      toggleMute: () => this.toggleMute(),
      toggleLoop: () => this.toggleLoop(),
    };
  }
  
  // ============================================
  // Cleanup
  // ============================================
  
  destroy(): void {
    this.detach();
    this.listeners.clear();
    this.statusData = {
      state: 'idle',
      currentTime: 0,
      currentFrame: 0,
      duration: 0,
      totalFrames: 0,
      playbackRate: 1,
      isMuted: false,
      isLooping: false,
      volume: 1,
      bufferProgress: 0,
      isBuffering: false,
    };
  }
}

// ============================================
// Singleton Instance
// ============================================

let defaultInstance: VideoPlayerService | null = null;

export function getDefaultVideoPlayerService(): VideoPlayerService {
  if (!defaultInstance) {
    defaultInstance = new VideoPlayerService();
  }
  return defaultInstance;
}

export function resetDefaultVideoPlayerService(): void {
  if (defaultInstance) {
    defaultInstance.destroy();
    defaultInstance = null;
  }
}

