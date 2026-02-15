/**
 * VideoReplicationService
 * Upload reference video and recreate with Digital Human support
 */

import { getPerformanceMonitoringService } from './performanceMonitoringService';
import { videoFrameCache, estimateSize } from '../utils/memoryMonitor';
import { logger } from '../utils/logger';

// ============================================================================
// Types
// ============================================================================

export interface ReferenceVideo {
  id: string;
  fileUrl: string;
  duration: number;
  resolution: { width: number; height: number };
  fps: number;
  uploadedAt: Date;
  structure?: VideoStructureAnalysis;
  digitalHumanAnalysis?: DigitalHumanAnalysis;
}

export interface VideoStructureAnalysis {
  totalDuration: number;
  shots: ShotInfo[];
  transitions: TransitionInfo[];
  keyframeCount: number;
  sceneChanges: SceneChange[];
}

export interface ShotInfo {
  id: string;
  startTime: number;
  endTime: number;
  duration: number;
  keyframeUrl?: string;
  composition: CompositionInfo;
  cameraMovement?: string;
}

export interface CompositionInfo {
  ruleOfThirds: boolean;
  centerComposition: boolean;
  leadingLines: boolean[];
  framing: 'close-up' | 'medium' | 'wide' | 'extreme-wide';
  aspectRatio: string;
}

export interface TransitionInfo {
  id: string;
  fromShotId: string;
  toShotId: string;
  type: 'cut' | 'dissolve' | 'fade' | 'wipe' | 'custom';
  duration: number;
}

export interface SceneChange {
  timestamp: number;
  confidence: number;
  keyframeUrl?: string;
}

export interface Keyframe {
  timestamp: number;
  url: string;
  type: 'scene-change' | 'shot-boundary' | 'significant-motion' | 'manual';
  quality: number;
}

export interface DigitalHumanAnalysis {
  hasDigitalHuman: boolean;
  subjects: HumanSubject[];
  overallQuality: number;
  style: 'realistic' | 'stylized' | 'anime' | 'cartoon';
}

export interface HumanSubject {
  id: string;
  boundingBox: { x: number; y: number; width: number; height: number };
  pose: string;
  expression: string;
  clothing: string;
  confidence: number;
}

export interface HumanFeatures {
  poseData: string; // JSON or URL to pose data
  expressionData: string;
  clothingDescription: string;
  silhouetteUrl?: string;
  movementPattern: string;
}

export interface ReplicationProject {
  id: string;
  referenceVideoId: string;
  createdAt: Date;
  shots: ReplicatedShot[];
  settings: ReplicationSettings;
}

export interface ReplicatedShot {
  id: string;
  originalShotId: string;
  referenceKeyframeUrl?: string;
  generatedImageUrls?: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  digitalHumanApplied: boolean;
}

export interface ReplicationSettings {
  preserveTiming: boolean;
  applyDigitalHuman: boolean;
  transferComposition: boolean;
  transferStyle: boolean;
  styleIntensity: number;
  outputResolution: { width: number; height: number };
}

export interface ReplicationOptions {
  preserveTiming: boolean;
  applyDigitalHuman: boolean;
  transferComposition: boolean;
  transferStyle: boolean;
  styleIntensity: number; // 0-1
}

export interface Shot {
  id: string;
  sequenceId: string;
  startTime: number;
  endTime: number;
  duration: number;
  generatedImageUrls?: string[];
  referenceImageUrls?: string[];
  prompt?: string;
  styleOverrides?: Record<string, string>;
}

export interface Sequence {
  id: string;
  shotIds: string[];
  name?: string;
  description?: string;
}

// ============================================================================
// VideoReplicationService Class
// ============================================================================

export class VideoReplicationService {
  private static instance: VideoReplicationService;
  private referenceVideos: Map<string, ReferenceVideo> = new Map();
  private replicationProjects: Map<string, ReplicationProject> = new Map();

  private constructor() {
    logger.debug('[VideoReplicationService] Initialized');
  }

  static getInstance(): VideoReplicationService {
    if (!VideoReplicationService.instance) {
      VideoReplicationService.instance = new VideoReplicationService();
    }
    return VideoReplicationService.instance;
  }

  // ============================================================================
  // Reference Video Upload
  // ============================================================================

  /**
   * Upload and analyze reference video
   */
  async uploadReferenceVideo(file: File): Promise<ReferenceVideo> {
    const timer = getPerformanceMonitoringService().createTimer('uploadReferenceVideo');
    
    logger.debug('[VideoReplicationService] Uploading reference video:', file.name);

    const id = this.generateId();
    const fileUrl = URL.createObjectURL(file);

    // Get video metadata
    const metadata = await this.extractVideoMetadata(fileUrl);

    const referenceVideo: ReferenceVideo = {
      id,
      fileUrl,
      duration: metadata.duration,
      resolution: metadata.resolution,
      fps: metadata.fps,
      uploadedAt: new Date(),
    };

    // Analyze video structure
    referenceVideo.structure = await this.analyzeVideoStructure(fileUrl);

    // Extract keyframes
    const keyframes = await this.extractKeyframes(fileUrl);
    referenceVideo.structure.keyframeCount = keyframes.length;

    // Analyze digital human elements
    referenceVideo.digitalHumanAnalysis = await this.analyzeDigitalHuman(fileUrl);

    this.referenceVideos.set(id, referenceVideo);

    // Track replication progress (100% on upload complete)
    const duration = timer.stop({ videoId: id, duration: metadata.duration, fps: metadata.fps });
    getPerformanceMonitoringService().trackVideoReplication(100, duration);

    logger.debug('[VideoReplicationService] Reference video uploaded:', id);
    return referenceVideo;
  }

  /**
   * Extract video metadata (duration, resolution, fps)
   */
  private extractVideoMetadata(
    videoUrl: string
  ): Promise<{ duration: number; resolution: { width: number; height: number }; fps: number }> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.src = videoUrl;
      video.crossOrigin = 'anonymous';

      video.onloadedmetadata = () => {
        // Estimate fps (default to 30 if can't detect)
        const fps = 30; // Could be detected via more sophisticated methods
        resolve({
          duration: video.duration,
          resolution: { width: video.videoWidth, height: video.videoHeight },
          fps,
        });
      };

      video.onerror = () => {
        reject(new Error('Failed to load video metadata'));
      };
    });
  }

  /**
   * Analyze shot composition, transitions, and scene changes
   */
  async analyzeVideoStructure(videoUrl: string): Promise<VideoStructureAnalysis> {
    logger.debug('[VideoReplicationService] Analyzing video structure:', videoUrl);

    // Simulated analysis - in production, this would use computer vision
    const shots = await this.detectShots(videoUrl);
    const transitions = await this.detectTransitions(videoUrl, shots);
    const sceneChanges = await this.detectSceneChanges(videoUrl);

    const totalDuration = await this.getVideoDuration(videoUrl);

    return {
      totalDuration,
      shots,
      transitions,
      keyframeCount: sceneChanges.length,
      sceneChanges,
    };
  }

  /**
   * Detect individual shots in the video
   */
  private async detectShots(videoUrl: string): Promise<ShotInfo[]> {
    // Simulated shot detection - in production, use scene detection algorithms
    const shots: ShotInfo[] = [];
    const duration = await this.getVideoDuration(videoUrl);

    // Simulate shot boundaries at regular intervals
    const shotCount = Math.max(3, Math.floor(duration / 3));
    const avgShotDuration = duration / shotCount;

    for (let i = 0; i < shotCount; i++) {
      const startTime = i * avgShotDuration;
      const endTime = Math.min((i + 1) * avgShotDuration, duration);

      shots.push({
        id: this.generateId(),
        startTime,
        endTime,
        duration: endTime - startTime,
        composition: {
          ruleOfThirds: Math.random() > 0.5,
          centerComposition: Math.random() > 0.5,
          leadingLines: [Math.random() > 0.5, Math.random() > 0.5],
          framing: this.getRandomFraming(),
          aspectRatio: '16:9',
        },
        cameraMovement: this.getRandomCameraMovement(),
      });
    }

    return shots;
  }

  /**
   * Detect transitions between shots
   */
  private async detectTransitions(
    videoUrl: string,
    shots: ShotInfo[]
  ): Promise<TransitionInfo[]> {
    const transitions: TransitionInfo[] = [];

    for (let i = 0; i < shots.length - 1; i++) {
      transitions.push({
        id: this.generateId(),
        fromShotId: shots[i].id,
        toShotId: shots[i + 1].id,
        type: this.getRandomTransitionType(),
        duration: Math.random() * 0.5 + 0.1, // 0.1 to 0.6 seconds
      });
    }

    return transitions;
  }

  /**
   * Detect scene changes in the video
   */
  private async detectSceneChanges(videoUrl: string): Promise<SceneChange[]> {
    // Simulated scene change detection
    const sceneChanges: SceneChange[] = [];
    const duration = await this.getVideoDuration(videoUrl);

    // Simulate scene changes at random intervals
    const sceneChangeCount = Math.floor(duration / 5);
    for (let i = 0; i < sceneChangeCount; i++) {
      sceneChanges.push({
        timestamp: (i + 1) * 5 * Math.random() + 1,
        confidence: 0.8 + Math.random() * 0.2,
      });
    }

    return sceneChanges;
  }

  /**
   * Extract keyframes from video
   */
  async extractKeyframes(videoUrl: string): Promise<Keyframe[]> {
    logger.debug('[VideoReplicationService] Extracting keyframes:', videoUrl);

    const keyframes: Keyframe[] = [];
    const duration = await this.getVideoDuration(videoUrl);

    // Extract keyframes at regular intervals
    const interval = Math.max(1, Math.floor(duration / 10));
    for (let t = 0; t <= duration; t += interval) {
      const url = await this.captureFrame(videoUrl, t);
      keyframes.push({
        timestamp: t,
        url,
        type: t === 0 ? 'scene-change' : 'significant-motion',
        quality: 0.9,
      });
    }

    return keyframes;
  }

  /**
   * Capture a single frame from video at specified timestamp
   */
  private captureFrame(videoUrl: string, timestamp: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      video.src = videoUrl;
      video.crossOrigin = 'anonymous';
      video.currentTime = timestamp;

      video.onloadeddata = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx?.drawImage(video, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };

      video.onerror = () => {
        reject(new Error(`Failed to capture frame at ${timestamp}s`));
      };
    });
  }

  /**
   * Get video duration
   */
  private getVideoDuration(videoUrl: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.src = videoUrl;
      video.onloadedmetadata = () => resolve(video.duration);
      video.onerror = () => reject(new Error('Failed to get video duration'));
    });
  }

  // ============================================================================
  // Digital Human Analysis
  // ============================================================================

  /**
   * Detect and analyze digital human elements in video
   */
  async analyzeDigitalHuman(videoUrl: string): Promise<DigitalHumanAnalysis> {
    logger.debug('[VideoReplicationService] Analyzing digital human:', videoUrl);

    const subjects = await this.detectHumanSubjects(videoUrl);

    // Determine style based on detected characteristics
    const style = this.determineHumanStyle(subjects);

    return {
      hasDigitalHuman: subjects.length > 0,
      subjects,
      overallQuality: subjects.reduce((sum, s) => sum + s.confidence, 0) / Math.max(1, subjects.length),
      style,
    };
  }

  /**
   * Detect human subjects in video frames
   */
  async detectHumanSubjects(videoUrl: string): Promise<HumanSubject[]> {
    // Simulated human detection - in production, use ML models
    const subjects: HumanSubject[] = [];
    const duration = await this.getVideoDuration(videoUrl);

    // Simulate detecting 1-2 subjects per shot
    const shotCount = Math.floor(duration / 3);
    for (let i = 0; i < shotCount; i++) {
      if (Math.random() > 0.3) {
        // 70% chance of detecting a subject in each shot
        subjects.push({
          id: this.generateId(),
          boundingBox: {
            x: Math.random() * 0.3 + 0.2,
            y: Math.random() * 0.2 + 0.1,
            width: Math.random() * 0.2 + 0.1,
            height: Math.random() * 0.3 + 0.2,
          },
          pose: this.getRandomPose(),
          expression: this.getRandomExpression(),
          clothing: this.getRandomClothing(),
          confidence: 0.7 + Math.random() * 0.3,
        });
      }
    }

    return subjects;
  }

  /**
   * Extract detailed features from a detected human subject
   */
  async extractHumanFeatures(subjectId: string): Promise<HumanFeatures> {
    logger.debug('[VideoReplicationService] Extracting features for subject:', subjectId);

    // Simulated feature extraction - in production, use pose estimation and analysis
    return {
      poseData: JSON.stringify({
        keypoints: this.generateRandomPoseKeypoints(),
        confidence: 0.85 + Math.random() * 0.15,
      }),
      expressionData: JSON.stringify({
        emotion: this.getRandomExpression(),
        intensity: 0.7 + Math.random() * 0.3,
      }),
      clothingDescription: this.getRandomClothing(),
      silhouetteUrl: undefined, // Would be generated from frame
      movementPattern: this.getRandomMovementPattern(),
    };
  }

  /**
   * Determine the visual style of detected humans
   */
  private determineHumanStyle(subjects: HumanSubject[]): 'realistic' | 'stylized' | 'anime' | 'cartoon' {
    if (subjects.length === 0) return 'realistic';

    // Simulated style detection based on features
    const styles = ['realistic', 'stylized', 'anime', 'cartoon'];
    return styles[Math.floor(Math.random() * styles.length)] as 'realistic' | 'stylized' | 'anime' | 'cartoon';
  }

  // ============================================================================
  // Shot Replication
  // ============================================================================

  /**
   * Create a new replication project from a reference video
   */
  async createReplicationProject(referenceVideoId: string): Promise<ReplicationProject> {
    logger.debug('[VideoReplicationService] Creating replication project from:', referenceVideoId);

    const referenceVideo = this.referenceVideos.get(referenceVideoId);
    if (!referenceVideo) {
      throw new Error(`Reference video not found: ${referenceVideoId}`);
    }

    const project: ReplicationProject = {
      id: this.generateId(),
      referenceVideoId,
      createdAt: new Date(),
      shots: [],
      settings: {
        preserveTiming: true,
        applyDigitalHuman: true,
        transferComposition: true,
        transferStyle: true,
        styleIntensity: 0.8,
        outputResolution: referenceVideo.resolution,
      },
    };

    // Create replicated shot entries for each shot in the reference
    if (referenceVideo.structure?.shots) {
      for (const shot of referenceVideo.structure.shots) {
        project.shots.push({
          id: this.generateId(),
          originalShotId: shot.id,
          generatedImageUrls: [],
          status: 'pending',
          digitalHumanApplied: false,
        });
      }
    }

    this.replicationProjects.set(project.id, project);
    return project;
  }

  /**
   * Start replication process for selected shots
   */
  async startReplication(
    projectId: string,
    settings: ReplicationSettings,
    shotIds?: string[]
  ): Promise<{ projectId: string; processedCount: number }> {
    logger.debug('[VideoReplicationService] Starting replication for project:', projectId);

    const project = this.replicationProjects.get(projectId);
    if (!project) {
      throw new Error(`Replication project not found: ${projectId}`);
    }

    const shotsToProcess = shotIds || project.shots.map(s => s.id);
    let processedCount = 0;

    for (const shotId of shotsToProcess) {
      const shot = project.shots.find(s => s.id === shotId);
      if (!shot) continue;

      shot.status = 'processing';
      
      // Apply digital human if enabled
      if (settings.applyDigitalHuman && project.referenceVideoId) {
        const video = this.referenceVideos.get(project.referenceVideoId);
        if (video?.digitalHumanAnalysis?.hasDigitalHuman) {
          // Extract features for each subject
          for (const subject of video.digitalHumanAnalysis.subjects) {
            const features = await this.extractHumanFeatures(subject.id);
            await this.applyDigitalHuman(shot.id, features);
          }
          shot.digitalHumanApplied = true;
        }
      }

      // Build replication options
      const options: ReplicationOptions = {
        preserveTiming: settings.preserveTiming,
        applyDigitalHuman: settings.applyDigitalHuman,
        transferComposition: settings.transferComposition,
        transferStyle: settings.transferStyle,
        styleIntensity: settings.styleIntensity,
      };

      // Replicate the shot
      await this.replicateShot(shot.originalShotId, options);
      
      shot.status = 'completed';
      processedCount++;
    }

    logger.debug('[VideoReplicationService] Replication complete:', processedCount, 'shots processed');
    return { projectId, processedCount };
  }

  /**
   * Replicate an individual shot from the reference
   */
  async replicateShot(shotId: string, options: ReplicationOptions): Promise<Shot> {
    logger.debug('[VideoReplicationService] Replicating shot:', shotId, options);

    // Simulated shot replication - in production, integrate with generation services
    const shot: Shot = {
      id: shotId,
      sequenceId: this.generateId(), // Would be linked to existing sequence
      startTime: 0,
      endTime: 3,
      duration: 3,
      generatedImageUrls: [],
      referenceImageUrls: [],
    };

    // Apply options
    if (options.transferComposition) {
      shot.prompt = this.buildCompositionPrompt();
    }

    if (options.transferStyle) {
      shot.styleOverrides = {
        styleIntensity: String(options.styleIntensity),
      };
    }

    return shot;
  }

  /**
   * Replicate an entire sequence of shots
   */
  async replicateSequence(sequenceId: string, options: ReplicationOptions): Promise<Sequence> {
    logger.debug('[VideoReplicationService] Replicating sequence:', sequenceId, options);

    const sequence: Sequence = {
      id: sequenceId,
      shotIds: [],
    };

    // Simulated sequence replication
    const shotCount = Math.floor(Math.random() * 5) + 3;
    for (let i = 0; i < shotCount; i++) {
      sequence.shotIds.push(this.generateId());
    }

    return sequence;
  }

  /**
   * Apply digital human features to a shot
   */
  async applyDigitalHuman(shotId: string, humanFeatures: HumanFeatures): Promise<boolean> {
    logger.debug('[VideoReplicationService] Applying digital human to shot:', shotId);

    // Simulated digital human application
    // In production, this would integrate with character generation services
    try {
      // Apply pose data
      // Apply expression data
      // Apply clothing description
      return true;
    } catch (error) {
      console.error('[VideoReplicationService] Failed to apply digital human:', error);
      return false;
    }
  }

  // ============================================================================
  // Style & Composition Transfer
  // ============================================================================

  /**
   * Transfer composition style from source video to target shot
   */
  transferCompositionStyle(sourceVideoUrl: string, targetShotId: string): void {
    logger.debug('[VideoReplicationService] Transferring composition style:', { sourceVideoUrl, targetShotId });

    // Get composition info from source
    // Apply to target shot
    // In production, integrate with styleTransferService
  }

  /**
   * Transfer transition patterns from source video to target sequence
   */
  transferTransitions(sourceVideoUrl: string, targetSequenceId: string): void {
    logger.debug('[VideoReplicationService] Transferring transitions:', { sourceVideoUrl, targetSequenceId });

    // Get transition info from source
    // Apply to target sequence
    // In production, integrate with sequenceService
  }

  /**
   * Match overall visual style from source to target sequence
   */
  matchVisualStyle(sourceVideoUrl: string, targetSequenceId: string): void {
    logger.debug('[VideoReplicationService] Matching visual style:', { sourceVideoUrl, targetSequenceId });

    // Analyze style from source
    // Apply to target sequence
    // In production, integrate with styleTransferService and consistencyEngine
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `vr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get random framing type
   */
  private getRandomFraming(): 'close-up' | 'medium' | 'wide' | 'extreme-wide' {
    const framings: ('close-up' | 'medium' | 'wide' | 'extreme-wide')[] = [
      'close-up',
      'medium',
      'wide',
      'extreme-wide',
    ];
    return framings[Math.floor(Math.random() * framings.length)];
  }

  /**
   * Get random camera movement
   */
  private getRandomCameraMovement(): string {
    const movements = ['static', 'pan-left', 'pan-right', 'tilt-up', 'tilt-down', 'zoom-in', 'zoom-out', 'dolly'];
    return movements[Math.floor(Math.random() * movements.length)];
  }

  /**
   * Get random transition type
   */
  private getRandomTransitionType(): 'cut' | 'dissolve' | 'fade' | 'wipe' | 'custom' {
    const types: ('cut' | 'dissolve' | 'fade' | 'wipe' | 'custom')[] = ['cut', 'dissolve', 'fade', 'wipe'];
    return types[Math.floor(Math.random() * types.length)];
  }

  /**
   * Get random pose
   */
  private getRandomPose(): string {
    const poses = [
      'standing',
      'sitting',
      'walking',
      'running',
      'gesturing',
      'pointing',
      'holding-object',
      'arms-crossed',
    ];
    return poses[Math.floor(Math.random() * poses.length)];
  }

  /**
   * Get random expression
   */
  private getRandomExpression(): string {
    const expressions = [
      'neutral',
      'happy',
      'sad',
      'angry',
      'surprised',
      'contemplative',
      'smiling',
      'serious',
    ];
    return expressions[Math.floor(Math.random() * expressions.length)];
  }

  /**
   * Get random clothing description
   */
  private getRandomClothing(): string {
    const clothing = [
      'casual-t-shirt',
      'formal-suit',
      'casual-hoodie',
      'dress',
      'business-attire',
      'athletic-wear',
      'winter-coat',
      'summer-attire',
    ];
    return clothing[Math.floor(Math.random() * clothing.length)];
  }

  /**
   * Get random movement pattern
   */
  private getRandomMovementPattern(): string {
    const patterns = ['stationary', 'walking', 'running', 'gesticulating', 'dancing', 'subtle-movement'];
    return patterns[Math.floor(Math.random() * patterns.length)];
  }

  /**
   * Generate random pose keypoints
   */
  private generateRandomPoseKeypoints(): Record<string, { x: number; y: number }> {
    return {
      nose: { x: 0.5 + (Math.random() - 0.5) * 0.1, y: 0.2 + (Math.random() - 0.5) * 0.05 },
      leftShoulder: { x: 0.4 + (Math.random() - 0.5) * 0.1, y: 0.25 + (Math.random() - 0.5) * 0.05 },
      rightShoulder: { x: 0.6 + (Math.random() - 0.5) * 0.1, y: 0.25 + (Math.random() - 0.5) * 0.05 },
      leftElbow: { x: 0.35 + (Math.random() - 0.5) * 0.15, y: 0.4 + (Math.random() - 0.5) * 0.1 },
      rightElbow: { x: 0.65 + (Math.random() - 0.5) * 0.15, y: 0.4 + (Math.random() - 0.5) * 0.1 },
      leftHand: { x: 0.3 + (Math.random() - 0.5) * 0.1, y: 0.55 + (Math.random() - 0.5) * 0.1 },
      rightHand: { x: 0.7 + (Math.random() - 0.5) * 0.1, y: 0.55 + (Math.random() - 0.5) * 0.1 },
      leftHip: { x: 0.45 + (Math.random() - 0.5) * 0.05, y: 0.5 + (Math.random() - 0.5) * 0.05 },
      rightHip: { x: 0.55 + (Math.random() - 0.5) * 0.05, y: 0.5 + (Math.random() - 0.5) * 0.05 },
      leftKnee: { x: 0.45 + (Math.random() - 0.5) * 0.08, y: 0.7 + (Math.random() - 0.5) * 0.1 },
      rightKnee: { x: 0.55 + (Math.random() - 0.5) * 0.08, y: 0.7 + (Math.random() - 0.5) * 0.1 },
      leftFoot: { x: 0.45 + (Math.random() - 0.5) * 0.1, y: 0.9 + (Math.random() - 0.5) * 0.05 },
      rightFoot: { x: 0.55 + (Math.random() - 0.5) * 0.1, y: 0.9 + (Math.random() - 0.5) * 0.05 },
    };
  }

  /**
   * Build composition prompt based on shot info
   */
  private buildCompositionPrompt(): string {
    return 'Compose shot using rule of thirds, dynamic framing, cinematic lighting';
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  /**
   * Clean up resources for a reference video
   */
  cleanupReferenceVideo(videoId: string): void {
    const video = this.referenceVideos.get(videoId);
    if (video?.fileUrl) {
      URL.revokeObjectURL(video.fileUrl);
    }
    this.referenceVideos.delete(videoId);
  }

  /**
   * Clean up all resources
   */
  dispose(): void {
    this.referenceVideos.forEach((video) => {
      if (video.fileUrl) {
        URL.revokeObjectURL(video.fileUrl);
      }
    });
    this.referenceVideos.clear();
    this.replicationProjects.clear();
  }
}

// Export singleton instance
export const videoReplicationService = VideoReplicationService.getInstance();
