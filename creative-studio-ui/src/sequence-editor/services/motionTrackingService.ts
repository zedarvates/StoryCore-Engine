/**
 * AI Motion Tracking Service
 * 
 * Provides automatic motion tracking and object tracking across frames.
 */

export interface TrackingPoint {
  x: number;
  y: number;
  confidence: number;
}

export interface TrackingData {
  trackId: string;
  objectName: string;
  frames: Map<number, TrackingPoint>;
  boundingBoxes: Map<number, BoundingBox>;
  confidence: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

export interface TrackingOptions {
  method: 'point' | 'object' | 'feature';
  algorithm: 'optical-flow' | 'feature-matching' | 'deep-learning';
  sensitivity: number; // 0-1
  adaptiveTracking: boolean;
}

export interface TrackingProgress {
  currentFrame: number;
  totalFrames: number;
  percentage: number;
  status: 'tracking' | 'complete' | 'lost' | 'error';
  error?: string;
}

export interface TrackingExport {
  format: 'json' | 'csv' | 'after-effects' | 'nuke';
  data: string;
}

class MotionTrackingService {
  private activeTracks: Map<string, TrackingData> = new Map();
  private trackingCallbacks: Map<string, (progress: TrackingProgress) => void> = new Map();

  /**
   * Start automatic motion tracking
   */
  async startTracking(
    shotId: string,
    startFrame: number,
    endFrame: number,
    initialPoint: { x: number; y: number },
    options: TrackingOptions,
    onProgress?: (progress: TrackingProgress) => void
  ): Promise<TrackingData> {
    const trackId = `track-${Date.now()}`;
    
    if (onProgress) {
      this.trackingCallbacks.set(trackId, onProgress);
    }

    const trackingData: TrackingData = {
      trackId,
      objectName: `Track ${this.activeTracks.size + 1}`,
      frames: new Map(),
      boundingBoxes: new Map(),
      confidence: 0
    };

    const totalFrames = endFrame - startFrame + 1;
    let currentPoint = initialPoint;
    let totalConfidence = 0;

    try {
      for (let frame = startFrame; frame <= endFrame; frame++) {
        // Simulate tracking
        await this.simulateTracking(options.algorithm);

        // Generate tracking point with some drift
        const drift = this.calculateDrift(frame - startFrame, options.sensitivity);
        currentPoint = {
          x: currentPoint.x + drift.x,
          y: currentPoint.y + drift.y
        };

        const confidence = this.calculateConfidence(frame, startFrame, endFrame, options);
        totalConfidence += confidence;

        trackingData.frames.set(frame, {
          ...currentPoint,
          confidence
        });

        // Generate bounding box for object tracking
        if (options.method === 'object') {
          trackingData.boundingBoxes.set(frame, {
            x: currentPoint.x - 50,
            y: currentPoint.y - 50,
            width: 100,
            height: 100,
            rotation: 0
          });
        }

        if (onProgress) {
          onProgress({
            currentFrame: frame,
            totalFrames,
            percentage: ((frame - startFrame + 1) / totalFrames) * 100,
            status: confidence > 0.5 ? 'tracking' : 'lost'
          });
        }
      }

      trackingData.confidence = totalConfidence / totalFrames;
      this.activeTracks.set(trackId, trackingData);

      if (onProgress) {
        onProgress({
          currentFrame: endFrame,
          totalFrames,
          percentage: 100,
          status: 'complete'
        });
      }

      return trackingData;
    } catch (error) {
      if (onProgress) {
        onProgress({
          currentFrame: 0,
          totalFrames,
          percentage: 0,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      throw error;
    } finally {
      this.trackingCallbacks.delete(trackId);
    }
  }

  /**
   * Track multiple objects simultaneously
   */
  async trackMultipleObjects(
    shotId: string,
    startFrame: number,
    endFrame: number,
    initialPoints: Array<{ x: number; y: number; name: string }>,
    options: TrackingOptions,
    onProgress?: (trackName: string, progress: TrackingProgress) => void
  ): Promise<TrackingData[]> {
    const tracks: TrackingData[] = [];

    for (const point of initialPoints) {
      const trackData = await this.startTracking(
        shotId,
        startFrame,
        endFrame,
        point,
        options,
        onProgress ? (prog) => onProgress(point.name, prog) : undefined
      );
      trackData.objectName = point.name;
      tracks.push(trackData);
    }

    return tracks;
  }

  /**
   * Export tracking data in various formats
   */
  exportTrackingData(trackId: string, format: 'json' | 'csv' | 'after-effects' | 'nuke'): TrackingExport {
    const trackData = this.activeTracks.get(trackId);
    if (!trackData) {
      throw new Error(`Track ${trackId} not found`);
    }

    let data: string;

    switch (format) {
      case 'json':
        data = this.exportAsJSON(trackData);
        break;
      case 'csv':
        data = this.exportAsCSV(trackData);
        break;
      case 'after-effects':
        data = this.exportAsAfterEffects(trackData);
        break;
      case 'nuke':
        data = this.exportAsNuke(trackData);
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    return { format, data };
  }

  /**
   * Get all active tracks
   */
  getActiveTracks(): TrackingData[] {
    return Array.from(this.activeTracks.values());
  }

  /**
   * Get specific track by ID
   */
  getTrack(trackId: string): TrackingData | undefined {
    return this.activeTracks.get(trackId);
  }

  /**
   * Delete a track
   */
  deleteTrack(trackId: string): void {
    this.activeTracks.delete(trackId);
  }

  /**
   * Clear all tracks
   */
  clearAllTracks(): void {
    this.activeTracks.clear();
  }

  /**
   * Update track name
   */
  updateTrackName(trackId: string, newName: string): void {
    const track = this.activeTracks.get(trackId);
    if (track) {
      track.objectName = newName;
    }
  }

  private calculateDrift(frameOffset: number, sensitivity: number): { x: number; y: number } {
    // Simulate natural object movement
    const amplitude = (1 - sensitivity) * 5;
    return {
      x: Math.sin(frameOffset * 0.1) * amplitude,
      y: Math.cos(frameOffset * 0.1) * amplitude
    };
  }

  private calculateConfidence(frame: number, startFrame: number, endFrame: number, options: TrackingOptions): number {
    // Confidence decreases over time, but adaptive tracking helps
    const progress = (frame - startFrame) / (endFrame - startFrame);
    const baseConfidence = 1 - (progress * 0.3);
    const adaptiveBoost = options.adaptiveTracking ? 0.2 : 0;
    return Math.max(0.3, Math.min(1, baseConfidence + adaptiveBoost));
  }

  private exportAsJSON(trackData: TrackingData): string {
    const frames: unknown[] = [];
    trackData.frames.forEach((point, frameNumber) => {
      frames.push({
        frame: frameNumber,
        x: point.x,
        y: point.y,
        confidence: point.confidence
      });
    });

    return JSON.stringify({
      trackId: trackData.trackId,
      objectName: trackData.objectName,
      confidence: trackData.confidence,
      frames
    }, null, 2);
  }

  private exportAsCSV(trackData: TrackingData): string {
    let csv = 'Frame,X,Y,Confidence\n';
    trackData.frames.forEach((point, frameNumber) => {
      csv += `${frameNumber},${point.x},${point.y},${point.confidence}\n`;
    });
    return csv;
  }

  private exportAsAfterEffects(trackData: TrackingData): string {
    // After Effects keyframe format
    let ae = `Adobe After Effects 8.0 Keyframe Data\n\n`;
    ae += `\tUnits Per Second\t24\n`;
    ae += `\tSource Width\t1920\n`;
    ae += `\tSource Height\t1080\n`;
    ae += `\tSource Pixel Aspect Ratio\t1\n`;
    ae += `\tComp Pixel Aspect Ratio\t1\n\n`;
    ae += `Position\n`;
    ae += `\tFrame\tX pixels\tY pixels\tZ pixels\n`;

    trackData.frames.forEach((point, frameNumber) => {
      ae += `\t${frameNumber}\t${point.x}\t${point.y}\t0\n`;
    });

    return ae;
  }

  private exportAsNuke(trackData: TrackingData): string {
    // Nuke tracker format
    let nuke = `Tracker4 {\n`;
    nuke += ` name ${trackData.objectName}\n`;
    nuke += ` tracks 1\n`;
    nuke += ` track1 {\n`;

    trackData.frames.forEach((point, frameNumber) => {
      nuke += `  {${frameNumber} ${point.x} ${point.y}}\n`;
    });

    nuke += ` }\n`;
    nuke += `}\n`;

    return nuke;
  }

  private async simulateTracking(algorithm: string): Promise<void> {
    const delays = {
      'optical-flow': 50,
      'feature-matching': 100,
      'deep-learning': 200
    };
    const delay = delays[algorithm as keyof typeof delays] || 100;
    return new Promise(resolve => setTimeout(resolve, delay));
  }
}

export const motionTrackingService = new MotionTrackingService();

