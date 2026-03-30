/**
 * Cinematic Tension Service
 * 
 * Analyzes sequence metadata to generate narrative tension metrics.
 * Based on March 2026 Production Roadmap (Phase 6).
 */

import { Shot } from '@/types';

export interface TensionNode {
  frame: number;
  value: number; // 0.0 to 1.0
  type: 'peak' | 'valley' | 'transition';
}

export class CinematicTensionService {
  private static instance: CinematicTensionService;

  public static getInstance() {
    if (!CinematicTensionService.instance) {
      CinematicTensionService.instance = new CinematicTensionService();
    }
    return CinematicTensionService.instance;
  }

  /**
   * Generates a continuous tension curve for the entire timeline
   */
  public calculateTimelineTension(shots: Shot[]): TensionNode[] {
    if (shots.length === 0) return [];

    const curve: TensionNode[] = [];
    const sortedShots = [...shots].sort((a, b) => a.startTime - b.startTime);

    sortedShots.forEach((shot, index) => {
      // 1. Base tension from shot position (rising action model)
      const storyProgress = index / shots.length;
      let baseTension = 0.2 + (storyProgress * 0.4);

      // 2. Shot type modifier
      const angleVal = (shot.cinematography as any)?.cameraAngle || 'eye';
      const angle = String(angleVal).toLowerCase();
      if (angle.includes('close')) baseTension += 0.2;
      if (angle.includes('wide')) baseTension -= 0.1;

      // 3. Duration modifier (shorter shots = higher tension)
      const duration = shot.duration || 120; // fallback to 5s if unknown
      if (duration < 72) baseTension += 0.15; // < 3s
      if (duration > 240) baseTension -= 0.1; // > 10s

      // Add node at start of shot
      curve.push({
        frame: shot.startTime,
        value: Math.min(1.0, Math.max(0.0, baseTension)),
        type: baseTension > 0.7 ? 'peak' : 'transition'
      });

      // Add node at midpoint for smoothing
      curve.push({
        frame: shot.startTime + (shot.duration / 2),
        value: Math.min(1.0, Math.max(0.0, baseTension + 0.05)),
        type: 'transition'
      });
    });

    return curve;
  }

  /**
   * Identifies narrative "Dead Zones" where tension is too low for the genre
   */
  public findDeadZones(shots: Shot[], minTension: number = 0.3): number[] {
    const curve = this.calculateTimelineTension(shots);
    return curve.filter(node => node.value < minTension).map(node => node.frame);
  }
}

export const cinematicTensionService = CinematicTensionService.getInstance();
