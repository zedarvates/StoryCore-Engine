import { VideoTimelineMetadata, Scene } from '../../types/asset-integration';

/**
 * Callback type for timeline updates
 */
export type TimelineUpdateCallback = (path: string, timeline: VideoTimelineMetadata) => void;

/**
 * Callback type for cache updates
 */
export type TimelineCacheUpdateCallback = (cacheCleared: boolean) => void;

/**
 * Timeline Service with Observer pattern for real-time synchronization
 */
export class TimelineService {
  private static instance: TimelineService;
  private cache: Map<string, VideoTimelineMetadata> = new Map();
  
  // Subscribers for different events
  private timelineUpdateSubscribers: Set<TimelineUpdateCallback> = new Set();
  private cacheUpdateSubscribers: Set<TimelineCacheUpdateCallback> = new Set();

  private constructor() {
    console.log('[TimelineService] Service initialized with Observer pattern');
  }

  static getInstance(): TimelineService {
    if (!TimelineService.instance) {
      TimelineService.instance = new TimelineService();
    }
    return TimelineService.instance;
  }

  /**
   * Subscribe to timeline updates
   * Returns unsubscribe function
   */
  public subscribeToTimelineUpdates(callback: TimelineUpdateCallback): () => void {
    this.timelineUpdateSubscribers.add(callback);
    return () => {
      this.timelineUpdateSubscribers.delete(callback);
    };
  }

  /**
   * Subscribe to cache updates
   * Returns unsubscribe function
   */
  public subscribeToCacheUpdates(callback: TimelineCacheUpdateCallback): () => void {
    this.cacheUpdateSubscribers.add(callback);
    return () => {
      this.cacheUpdateSubscribers.delete(callback);
    };
  }

  /**
   * Notify subscribers of timeline update
   */
  private notifyTimelineUpdate(path: string, timeline: VideoTimelineMetadata): void {
    this.timelineUpdateSubscribers.forEach(callback => {
      try {
        callback(path, timeline);
      } catch (error) {
        console.error('[TimelineService] Error in timeline update subscriber:', error);
      }
    });
  }

  /**
   * Notify subscribers of cache update
   */
  private notifyCacheUpdate(cacheCleared: boolean): void {
    this.cacheUpdateSubscribers.forEach(callback => {
      try {
        callback(cacheCleared);
      } catch (error) {
        console.error('[TimelineService] Error in cache update subscriber:', error);
      }
    });
  }

  async loadTimeline(path: string): Promise<VideoTimelineMetadata> {
    if (this.cache.has(path)) {
      return this.cache.get(path)!;
    }

    try {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`Failed to load timeline: ${response.statusText}`);
      }
      const data: VideoTimelineMetadata = await response.json();

      // Basic validation
      if (!data.metadata || !data.scenes) {
        throw new Error('Invalid timeline structure');
      }

      this.cache.set(path, data);
      
      // Notify subscribers
      this.notifyTimelineUpdate(path, data);
      
      return data;
    } catch (error) {
      console.error('Error loading timeline:', error);
      throw error;
    }
  }

  async saveTimeline(timeline: VideoTimelineMetadata, path: string): Promise<void> {
    try {
      // Update timestamps
      timeline.metadata.updated_at = new Date().toISOString();

      // Update cache
      this.cache.set(path, timeline);
      
      // Notify subscribers
      this.notifyTimelineUpdate(path, timeline);

      // Simulate save - requires Electron API
      throw new Error('Save functionality requires Electron API integration');
    } catch (error) {
      console.error('Error saving timeline:', error);
      throw error;
    }
  }

  async listAvailableTimelines(): Promise<string[]> {
    // Note: Files must be in public/ folder to be accessible
    // For now, return empty array to avoid errors
    // TODO: Implement proper file system access via Electron API
    return [];
  }

  createNewScene(sceneNumber: number, startTime: number, duration: number): Scene {
    return {
      scene_number: sceneNumber,
      start_time: startTime,
      end_time: startTime + duration,
      duration: duration,
      description: `Scene ${sceneNumber}`,
      timing: {
        timestamps: [
          { time: startTime, frame: Math.floor(startTime * 24), description: 'Scene start' },
          { time: startTime + duration, frame: Math.floor((startTime + duration) * 24), description: 'Scene end' }
        ]
      },
      elements: {
        audio: [],
        video: [{
          type: 'visual',
          start_time: startTime,
          end_time: startTime + duration,
          description: 'Default visual element',
          layer: 1,
          opacity: 1.0
        }]
      },
      characters: [],
      camera: [],
      dialogue: [],
      effects: [],
      transitions: []
    };
  }

  calculateTotalDuration(scenes: Scene[]): number {
    if (scenes.length === 0) return 0;
    const maxEndTime = Math.max(...scenes.map(scene => scene.end_time));
    return maxEndTime;
  }

  validateTimeline(timeline: VideoTimelineMetadata): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check metadata
    if (!timeline.metadata.title) {
      errors.push('Timeline title is required');
    }
    if (timeline.metadata.frame_rate <= 0) {
      errors.push('Frame rate must be positive');
    }

    // Check scenes
    if (timeline.scenes.length === 0) {
      errors.push('At least one scene is required');
    }

    // Check scene timing
    for (let i = 0; i < timeline.scenes.length; i++) {
      const scene = timeline.scenes[i];
      if (scene.start_time >= scene.end_time) {
        errors.push(`Scene ${scene.scene_number}: start time must be before end time`);
      }
      if (scene.duration <= 0) {
        errors.push(`Scene ${scene.scene_number}: duration must be positive`);
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  clearCache(): void {
    this.cache.clear();
    
    // Notify subscribers
    this.notifyCacheUpdate(true);
  }
}