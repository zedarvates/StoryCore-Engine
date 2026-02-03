/**
 * FrameAccuratePlayer - Frame-accurate video playback
 */

import { VideoPlayerService } from './VideoPlayerService';

type FrameAccurateConfig = {
  targetFrameRate: number;
  frameTolerance: number;
  detectFrameDrops: boolean;
  fpsUpdateInterval: number;
};

const DEFAULT_CONFIG: FrameAccurateConfig = {
  targetFrameRate: 30,
  frameTolerance: 1,
  detectFrameDrops: true,
  fpsUpdateInterval: 500,
};

export class FrameAccurateError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = 'FrameAccurateError';
    this.code = code;
  }
}

export interface FrameInfo {
  frameNumber: number;
  previousFrameNumber: number;
  frameTime: number;
  previousFrameTime: number;
  wasDropped: boolean;
  droppedFrames: number;
  currentFps: number;
  targetFps: number;
}

export class FrameAccuratePlayer {
  private videoService: VideoPlayerService | null = null;
  private config: FrameAccurateConfig;
  private animationFrameId: number | null = null;
  private lastFrameTime: number = 0;
  private lastFrameNumber: number = 0;
  private frameCount: number = 0;
  private currentFps: number = 30;
  private totalDroppedFrames: number = 0;
  private lastFpsUpdate: number = 0;
  private _isPlaying: boolean = false;
  private _isInitialized: boolean = false;
  private onFrameUpdate?: (info: FrameInfo) => void;
  private onFpsUpdate?: (fps: number) => void;
  private onDroppedFrames?: (count: number) => void;

  constructor(config?: Partial<FrameAccurateConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  initialize(videoService: VideoPlayerService): void {
    this.videoService = videoService;
    this._isInitialized = true;
    this.lastFrameNumber = videoService.getCurrentFrame();
    this.lastFrameTime = performance.now();
  }

  destroy(): void {
    this.stopPlaybackLoop();
    this._isInitialized = false;
    this.videoService = null;
  }

  frameToTime(frame: number): number {
    return frame / this.config.targetFrameRate;
  }

  timeToFrame(time: number): number {
    return Math.round(time * this.config.targetFrameRate);
  }

  async seekToFrame(frame: number): Promise<FrameInfo> {
    if (!this.isInitialized || !this.videoService) {
      throw new FrameAccurateError('Not initialized', 'NOT_INITIALIZED');
    }
    await this.videoService.seekToFrame(frame);
    return this.getCurrentFrameInfo();
  }

  async stepForward(frames: number = 1): Promise<FrameInfo> {
    if (!this.videoService) throw new FrameAccurateError('Not initialized', 'NOT_INITIALIZED');
    const currentFrame = this.videoService.getCurrentFrame();
    return this.seekToFrame(Math.min(currentFrame + frames, this.videoService.getTotalFrames() - 1));
  }

  async stepBackward(frames: number = 1): Promise<FrameInfo> {
    if (!this.videoService) throw new FrameAccurateError('Not initialized', 'NOT_INITIALIZED');
    const currentFrame = this.videoService.getCurrentFrame();
    return this.seekToFrame(Math.max(currentFrame - frames, 0));
  }

  async play(): Promise<void> {
    if (!this.videoService) throw new FrameAccurateError('Not initialized', 'NOT_INITIALIZED');
    this._isPlaying = true;
    this.lastFrameTime = performance.now();
    this.frameCount = 0;
    await this.videoService.play();
    this.startPlaybackLoop();
  }

  pause(): void {
    this._isPlaying = false;
    this.stopPlaybackLoop();
    this.videoService?.pause();
  }

  async togglePlay(): Promise<void> {
    if (this.isPlaying) this.pause();
    else await this.play();
  }

  stop(): void {
    this._isPlaying = false;
    this.stopPlaybackLoop();
    this.videoService?.stop();
    this.totalDroppedFrames = 0;
  }

  private startPlaybackLoop(): void {
    if (this.animationFrameId !== null) cancelAnimationFrame(this.animationFrameId);
    
    const loop = (timestamp: number) => {
      if (!this._isPlaying || !this.videoService) return;
      
      const targetFrameTime = 1000 / this.config.targetFrameRate;
      const elapsed = timestamp - this.lastFrameTime;
      
      this.frameCount++;
      if (timestamp - this.lastFpsUpdate >= this.config.fpsUpdateInterval) {
        this.currentFps = (this.frameCount * 1000) / (timestamp - this.lastFpsUpdate);
        this.onFpsUpdate?.(this.currentFps);
        this.frameCount = 0;
        this.lastFpsUpdate = timestamp;
      }
      
      const expectedFrames = Math.floor(elapsed / targetFrameTime);
      if (expectedFrames > 1 && this.config.detectFrameDrops) {
        const dropped = expectedFrames - 1;
        this.totalDroppedFrames += dropped;
        this.onDroppedFrames?.(dropped);
      }
      
      this.emitFrameUpdate();
      this.lastFrameTime = timestamp;
      this.animationFrameId = requestAnimationFrame(loop);
    };
    
    this.animationFrameId = requestAnimationFrame(loop);
  }

  private stopPlaybackLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private emitFrameUpdate(): void {
    if (!this.videoService) return;
    const info: FrameInfo = {
      frameNumber: this.videoService.getCurrentFrame(),
      previousFrameNumber: this.lastFrameNumber,
      frameTime: this.frameToTime(this.videoService.getCurrentFrame()),
      previousFrameTime: this.frameToTime(this.lastFrameNumber),
      wasDropped: false,
      droppedFrames: this.totalDroppedFrames,
      currentFps: this.currentFps,
      targetFps: this.config.targetFrameRate,
    };
    this.onFrameUpdate?.(info);
  }

  getCurrentFrameInfo(): FrameInfo {
    if (!this.videoService) throw new FrameAccurateError('Not initialized', 'NOT_INITIALIZED');
    return {
      frameNumber: this.videoService.getCurrentFrame(),
      previousFrameNumber: this.lastFrameNumber,
      frameTime: this.frameToTime(this.videoService.getCurrentFrame()),
      previousFrameTime: this.frameToTime(this.lastFrameNumber),
      wasDropped: false,
      droppedFrames: this.totalDroppedFrames,
      currentFps: this.currentFps,
      targetFps: this.config.targetFrameRate,
    };
  }

  getStatus() {
    return {
      isPlaying: this._isPlaying,
      isInitialized: this._isInitialized,
      currentFps: this.currentFps,
      targetFps: this.config.targetFrameRate,
      droppedFrames: this.totalDroppedFrames,
    };
  }

  onFrame(callback: (info: FrameInfo) => void): void {
    this.onFrameUpdate = callback;
  }

  onFps(callback: (fps: number) => void): void {
    this.onFpsUpdate = callback;
  }

  onDropped(callback: (count: number) => void): void {
    this.onDroppedFrames = callback;
  }

  get isPlaying(): boolean { return this._isPlaying; }
  get isInitialized(): boolean { return this._isInitialized; }
  getTotalDroppedFrames(): number { return this.totalDroppedFrames; }
  resetDroppedFrames(): void { this.totalDroppedFrames = 0; }
}

export default FrameAccuratePlayer;

