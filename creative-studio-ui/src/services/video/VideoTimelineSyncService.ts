/**
 * VideoTimelineSyncService - Synchronizes timeline and video playback
 * 
 * Handles bidirectional synchronization between:
 * - Timeline playhead position
 * - Video current time
 * 
 * Features:
 * - Debounced scrubbing
 * - Drift correction
 * - Event propagation
 * 
 * @module services/video/VideoTimelineSyncService
 */

import { VideoPlayerService } from './VideoPlayerService';

// ============================================
// Configuration
// ============================================

export interface VideoTimelineSyncConfig {
  /** Debounce delay for scrub operations (ms) */
  scrubDebounceMs: number;
  
  /** Max drift allowed before correction (seconds) */
  maxDriftSeconds: number;
  
  /** Interval for drift checking (ms) */
  driftCheckIntervalMs: number;
  
  /** Whether to auto-correct drift */
  enableDriftCorrection: boolean;
  
  /** Whether to sync video to timeline */
  syncVideoToTimeline: boolean;
  
  /** Whether to sync timeline to video */
  syncTimelineToVideo: boolean;
}

// Default configuration
const DEFAULT_CONFIG: VideoTimelineSyncConfig = {
  scrubDebounceMs: 50,
  maxDriftSeconds: 0.1,
  driftCheckIntervalMs: 100,
  enableDriftCorrection: true,
  syncVideoToTimeline: true,
  syncTimelineToVideo: true,
};

// ============================================
// Sync State
// ============================================

export interface TimelineSyncState {
  /** Current timeline position in seconds */
  timelinePosition: number;
  
  /** Current video position in seconds */
  videoPosition: number;
  
  /** Whether sync is active */
  isSynced: boolean;
  
  /** Last sync timestamp */
  lastSyncTime: number;
  
  /** Current drift in seconds */
  drift: number;
  
  /** Whether currently scrubbing */
  isScrubbing: boolean;
  
  /** Whether sync is enabled */
  isEnabled: boolean;
}

// ============================================
// Error Classes
// ============================================

export class SyncError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'SyncError';
  }
}

export class ServiceNotInitializedError extends SyncError {
  constructor() {
    super('Sync service not initialized', 'NOT_INITIALIZED');
  }
}

export class TimelineNotConnectedError extends SyncError {
  constructor() {
    super('Timeline not connected to sync service', 'TIMELINE_NOT_CONNECTED');
  }
}

// ============================================
// Callback Types
// ============================================

export interface TimelineCallbacks {
  /** Called when timeline position changes */
  onPositionChange?: (position: number) => void;
  
  /** Called when timeline is scrubbing */
  onScrubStart?: () => void;
  
  /** Called when timeline scrub ends */
  onScrubEnd?: (finalPosition: number) => void;
  
  /** Called when timeline requests video seek */
  onSeekRequest?: (position: number) => void;
}

export interface VideoCallbacks {
  /** Called when video time updates */
  onTimeUpdate?: (time: number) => void;
  
  /** Called when video play state changes */
  onPlayStateChange?: (isPlaying: boolean) => void;
  
  /** Called when video seeks */
  onSeek?: (time: number) => void;
}

// ============================================
// Service Class
// ============================================

export class VideoTimelineSyncService {
  private videoService: VideoPlayerService | null = null;
  private config: VideoTimelineSyncConfig;
  private state: TimelineSyncState;
  
  // Timeline reference
  private timelineElement: HTMLElement | null = null;
  private timelineCallbacks: TimelineCallbacks = {};
  
  // Internal state
  private isVideoPlaying: boolean = false;
  private lastVideoTime: number = 0;
  private lastTimelinePosition: number = 0;
  private driftCheckInterval: number | null = null;
  private scrubTimeout: number | null = null;
  
  // Bound handlers
  private boundVideoTimeUpdate: (data: unknown) => void;
  private boundVideoPlay: () => void;
  private boundVideoPause: () => void;
  private boundVideoSeeked: (data: unknown) => void;
  private boundTimelineMouseDown: () => void;
  private boundTimelineMouseMove: (e: MouseEvent) => void;
  private boundTimelineMouseUp: () => void;
  private boundTimelineClick: (e: MouseEvent) => void;
  
  constructor(config: Partial<VideoTimelineSyncConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = {
      timelinePosition: 0,
      videoPosition: 0,
      isSynced: true,
      lastSyncTime: 0,
      drift: 0,
      isScrubbing: false,
      isEnabled: true,
    };
    
    // Bind handlers once
    this.boundVideoTimeUpdate = this.onVideoTimeUpdate.bind(this);
    this.boundVideoPlay = this.onVideoPlay.bind(this);
    this.boundVideoPause = this.onVideoPause.bind(this);
    this.boundVideoSeeked = this.onVideoSeeked.bind(this);
    this.boundTimelineMouseDown = this.onTimelineMouseDown.bind(this);
    this.boundTimelineMouseMove = this.onTimelineMouseMove.bind(this);
    this.boundTimelineMouseUp = this.onTimelineMouseUp.bind(this);
    this.boundTimelineClick = this.onTimelineClick.bind(this);
  }
  
  // ============================================
  // Initialization
  // ============================================
  
  /**
   * Connect to a VideoPlayerService
   */
  connectToVideoService(videoService: VideoPlayerService): void {
    if (this.videoService) {
      this.disconnectFromVideoService();
    }
    
    this.videoService = videoService;
    
    // Register video event handlers
    videoService.on('time:update', this.boundVideoTimeUpdate);
    videoService.on('play', this.boundVideoPlay);
    videoService.on('pause', this.boundVideoPause);
    videoService.on('seeked', this.boundVideoSeeked);
    
    // Sync initial state
    this.state.videoPosition = videoService.getCurrentTime();
    this.state.timelinePosition = this.state.videoPosition;
  }
  
  /**
   * Disconnect from VideoPlayerService
   */
  disconnectFromVideoService(): void {
    if (!this.videoService) return;
    
    // Unregister video event handlers
    this.videoService.off('time:update', this.boundVideoTimeUpdate);
    this.videoService.off('play', this.boundVideoPlay);
    this.videoService.off('pause', this.boundVideoPause);
    this.videoService.off('seeked', this.boundVideoSeeked);
    
    this.videoService = null;
    this.stopDriftChecking();
  }
  
  /**
   * Connect to a timeline element
   */
  connectToTimeline(timelineElement: HTMLElement, callbacks?: TimelineCallbacks): void {
    if (this.timelineElement) {
      this.disconnectFromTimeline();
    }
    
    this.timelineElement = timelineElement;
    
    if (callbacks) {
      this.timelineCallbacks = callbacks;
    }
    
    // Register timeline event handlers
    timelineElement.addEventListener('mousedown', this.boundTimelineMouseDown);
    timelineElement.addEventListener('click', this.boundTimelineClick);
  }
  
  /**
   * Disconnect from timeline element
   */
  disconnectFromTimeline(): void {
    if (!this.timelineElement) return;
    
    // Unregister timeline event handlers
    this.timelineElement.removeEventListener('mousedown', this.boundTimelineMouseDown);
    this.timelineElement.removeEventListener('mousemove', this.boundTimelineMouseMove);
    this.timelineElement.removeEventListener('mouseup', this.boundTimelineMouseUp);
    this.timelineElement.removeEventListener('mouseleave', this.boundTimelineMouseUp);
    this.timelineElement.removeEventListener('click', this.boundTimelineClick);
    
    this.timelineElement = null;
    this.timelineCallbacks = {};
  }
  
  // ============================================
  // Video Event Handlers
  // ============================================
  
  private onVideoTimeUpdate(data: unknown): void {
    if (!this.videoService) return;
    
    const time = data as number;
    this.state.videoPosition = time;
    
    // Calculate drift
    this.state.drift = time - this.lastTimelinePosition;
    this.state.lastSyncTime = Date.now();
    
    // Check for excessive drift
    if (this.config.enableDriftCorrection && 
        Math.abs(this.state.drift) > this.config.maxDriftSeconds) {
      this.correctDrift();
    }
    
    // Update timeline if not scrubbing and syncing is enabled
    if (!this.state.isScrubbing && this.config.syncTimelineToVideo) {
      this.updateTimelinePosition(time);
    }
    
    this.lastVideoTime = time;
    
    // Invoke callback
    this.timelineCallbacks.onPositionChange?.(time);
  }
  
  private onVideoPlay(): void {
    this.isVideoPlaying = true;
    this.startDriftChecking();
    this.timelineCallbacks.onPlayStateChange?.(true);
  }
  
  private onVideoPause(): void {
    this.isVideoPlaying = false;
    this.stopDriftChecking();
    this.timelineCallbacks.onPlayStateChange?.(false);
  }
  
  private onVideoSeeked(data: unknown): void {
    const time = data as number;
    this.state.videoPosition = time;
    this.lastVideoTime = time;
    
    // Update timeline to match video position
    if (this.config.syncTimelineToVideo) {
      this.updateTimelinePosition(time);
    }
    
    // Invoke callback
    this.timelineCallbacks.onSeek?.(time);
  }
  
  // ============================================
  // Timeline Event Handlers
  // ============================================
  
  private onTimelineMouseDown(): void {
    if (!this.timelineElement) return;
    
    this.state.isScrubbing = true;
    
    // Add move/up listeners
    document.addEventListener('mousemove', this.boundTimelineMouseMove);
    document.addEventListener('mouseup', this.boundTimelineMouseUp);
    this.timelineElement.addEventListener('mouseleave', this.boundTimelineMouseUp);
    
    // Invoke callback
    this.timelineCallbacks.onScrubStart?.();
  }
  
  private onTimelineMouseMove(e: MouseEvent): void {
    if (!this.state.isScrubbing || !this.timelineElement) return;
    
    const position = this.getTimelinePositionFromEvent(e);
    
    if (this.config.scrubDebounceMs > 0) {
      // Debounce updates
      if (this.scrubTimeout !== null) {
        clearTimeout(this.scrubTimeout);
      }
      
      this.scrubTimeout = window.setTimeout(() => {
        this.updateTimelinePosition(position);
        this.scrubTimeout = null;
      }, this.config.scrubDebounceMs);
    } else {
      this.updateTimelinePosition(position);
    }
  }
  
  private onTimelineMouseUp(): void {
    if (!this.state.isScrubbing || !this.timelineElement) return;
    
    this.state.isScrubbing = false;
    
    // Remove move/up listeners
    document.removeEventListener('mousemove', this.boundTimelineMouseMove);
    document.removeEventListener('mouseup', this.boundTimelineMouseUp);
    this.timelineElement.removeEventListener('mouseleave', this.boundTimelineMouseUp);
    
    // Seek video to current position
    if (this.config.syncVideoToTimeline) {
      this.timelineCallbacks.onSeekRequest?.(this.state.timelinePosition);
      this.videoService?.seek(this.state.timelinePosition);
    }
    
    // Invoke callback
    this.timelineCallbacks.onScrubEnd?.(this.state.timelinePosition);
  }
  
  private onTimelineClick(e: MouseEvent): void {
    if (this.state.isScrubbing) return;
    
    const position = this.getTimelinePositionFromEvent(e);
    this.updateTimelinePosition(position);
    
    // Seek video to clicked position
    if (this.config.syncVideoToTimeline) {
      this.timelineCallbacks.onSeekRequest?.(position);
      this.videoService?.seek(position);
    }
  }
  
  // ============================================
  // Position Management
  // ============================================
  
  /**
   * Get position from mouse event
   */
  private getTimelinePositionFromEvent(e: MouseEvent): number {
    if (!this.timelineElement) return 0;
    
    const rect = this.timelineElement.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const duration = this.videoService?.getDuration() || 0;
    
    return percentage * duration;
  }
  
  /**
   * Update timeline position display
   */
  private updateTimelinePosition(position: number): void {
    this.state.timelinePosition = position;
    this.lastTimelinePosition = position;
  }
  
  /**
   * Set timeline position programmatically
   */
  setTimelinePosition(position: number): void {
    this.updateTimelinePosition(position);
    
    if (this.config.syncVideoToTimeline && !this.state.isScrubbing) {
      this.timelineCallbacks.onSeekRequest?.(position);
      this.videoService?.seek(position);
    }
  }
  
  /**
   * Get current state
   */
  getState(): TimelineSyncState {
    return { ...this.state };
  }
  
  /**
   * Get current timeline position
   */
  getTimelinePosition(): number {
    return this.state.timelinePosition;
  }
  
  /**
   * Get current video position
   */
  getVideoPosition(): number {
    return this.state.videoPosition;
  }
  
  // ============================================
  // Drift Correction
  // ============================================
  
  /**
   * Start periodic drift checking
   */
  private startDriftChecking(): void {
    if (this.driftCheckInterval !== null) return;
    
    this.driftCheckInterval = window.setInterval(() => {
      this.checkAndCorrectDrift();
    }, this.config.driftCheckIntervalMs);
  }
  
  /**
   * Stop drift checking
   */
  private stopDriftChecking(): void {
    if (this.driftCheckInterval !== null) {
      clearInterval(this.driftCheckInterval);
      this.driftCheckInterval = null;
    }
  }
  
  /**
   * Check for drift and correct if needed
   */
  private checkAndCorrectDrift(): void {
    if (!this.videoService || !this.config.enableDriftCorrection) return;
    
    const currentVideoTime = this.videoService.getCurrentTime();
    const drift = currentVideoTime - this.state.timelinePosition;
    
    if (Math.abs(drift) > this.config.maxDriftSeconds) {
      this.correctDrift();
    }
  }
  
  /**
   * Correct drift between timeline and video
   */
  private correctDrift(): void {
    if (!this.videoService) return;
    
    // Use video time as authoritative source
    const videoTime = this.videoService.getCurrentTime();
    this.state.videoPosition = videoTime;
    this.state.drift = videoTime - this.state.timelinePosition;
    
    // Update timeline to match video
    if (this.config.syncTimelineToVideo) {
      this.updateTimelinePosition(videoTime);
    }
    
    this.state.isSynced = true;
    this.state.lastSyncTime = Date.now();
  }
  
  // ============================================
  // Configuration
  // ============================================
  
  /**
   * Update configuration
   */
  updateConfig(config: Partial<VideoTimelineSyncConfig>): void {
    this.config = { ...this.config, ...config };
  }
  
  /**
   * Enable or disable sync
   */
  setEnabled(enabled: boolean): void {
    this.state.isEnabled = enabled;
    
    if (!enabled) {
      this.stopDriftChecking();
    } else if (this.isVideoPlaying) {
      this.startDriftChecking();
    }
  }
  
  /**
   * Toggle sync direction
   */
  setSyncDirections(config: { videoToTimeline?: boolean; timelineToVideo?: boolean }): void {
    if (config.videoToTimeline !== undefined) {
      this.config.syncTimelineToVideo = config.videoToTimeline;
    }
    if (config.timelineToVideo !== undefined) {
      this.config.syncVideoToTimeline = config.timelineToVideo;
    }
  }
  
  // ============================================
  // Cleanup
  // ============================================
  
  /**
   * Destroy the service
   */
  destroy(): void {
    // Clear timeouts
    if (this.scrubTimeout !== null) {
      clearTimeout(this.scrubTimeout);
      this.scrubTimeout = null;
    }
    
    // Stop drift checking
    this.stopDriftChecking();
    
    // Disconnect from video service
    this.disconnectFromVideoService();
    
    // Disconnect from timeline
    this.disconnectFromTimeline();
    
    // Reset state
    this.state = {
      timelinePosition: 0,
      videoPosition: 0,
      isSynced: false,
      lastSyncTime: 0,
      drift: 0,
      isScrubbing: false,
      isEnabled: false,
    };
  }
}

// ============================================
// Singleton Instance
// ============================================

let defaultInstance: VideoTimelineSyncService | null = null;

/**
 * Get or create the default VideoTimelineSyncService instance
 */
export function getDefaultVideoTimelineSyncService(): VideoTimelineSyncService {
  if (!defaultInstance) {
    defaultInstance = new VideoTimelineSyncService();
  }
  return defaultInstance;
}

/**
 * Reset the default instance (for testing)
 */
export function resetDefaultVideoTimelineSyncService(): void {
  if (defaultInstance) {
    defaultInstance.destroy();
    defaultInstance = null;
  }
}

