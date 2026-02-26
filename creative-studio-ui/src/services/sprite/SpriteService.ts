/**
 * Sprite Service
 * 
 * Handles sprite asset management, animation processing, and sprite sheet extraction.
 */

import { 
  AnimatedSprite, 
  SpriteFrame, 
  SpriteRect, 
  SpriteSheetConfig,
  OrientedAnimation,
  SpriteOrientation
} from '@/types/sprite';
import { backendApi } from '@/services/backendApiService';

export class SpriteService {
  /**
   * Loads a sprite from the backend
   */
  async loadSprite(spriteId: string): Promise<AnimatedSprite | null> {
    try {
      const response = await backendApi.invokeCliCommand('get_sprite', { sprite_id: spriteId });
      if (response.success && response.data) {
        return response.data as unknown as AnimatedSprite;
      }
      return null;
    } catch (error) {
      console.error('Error loading sprite:', error);
      return null;
    }
  }

  /**
   * Extracts frames from a sprite sheet based on configuration
   */
  extractFramesFromSheet(config: SpriteSheetConfig): SpriteFrame[] {
    const frames: SpriteFrame[] = [];
    
    for (let r = 0; r < config.rows; r++) {
      for (let c = 0; c < config.columns; c++) {
        const rect: SpriteRect = {
          x: config.margin + c * (config.frameWidth + config.spacingX),
          y: config.margin + r * (config.frameHeight + config.spacingY),
          width: config.frameWidth,
          height: config.frameHeight
        };
        
        frames.push({
          id: `frame_${r}_${c}_${Date.now()}`,
          sourceRect: rect,
          duration: 100, // Default duration
          anchorPoint: { x: 0.5, y: 1 } // Default bottom center
        });
      }
    }
    
    return frames;
  }

  /**
   * Generates animations from a sprite sheet config
   */
  generateAnimationsFromSheet(config: SpriteSheetConfig): Map<string, OrientedAnimation> {
    const animationMap = new Map<string, OrientedAnimation>();
    
    config.animations.forEach(anim => {
      const frames: SpriteFrame[] = [];
      const startIdx = anim.startRow * config.columns + anim.startColumn;
      
      const allFrames = this.extractFramesFromSheet(config);
      
      for (let i = 0; i < anim.frameCount; i++) {
        const frame = allFrames[startIdx + i];
        if (frame) {
          frames.push({
            ...frame,
            duration: anim.frameDuration
          });
        }
      }
      
      const orientation = anim.orientation || 's';
      const key = `${anim.name}_${orientation}`;
      
      animationMap.set(key, {
        id: `anim_${Date.now()}_${key}`,
        name: anim.name,
        orientation: orientation,
        frames: frames,
        loop: anim.loop,
        loopCount: -1,
        speed: 1,
        totalDuration: frames.reduce((acc, f) => acc + f.duration, 0)
      });
    });
    
    return animationMap;
  }

  // --- Animation Controls ---

  playAnimation(spriteId: string, animationId: string): void {
    console.log(`Playing animation ${animationId} for sprite ${spriteId}`);
  }

  pauseAnimation(spriteId: string): void {
    console.log(`Pausing animation for sprite ${spriteId}`);
  }

  resumeAnimation(spriteId: string): void {
    console.log(`Resuming animation for sprite ${spriteId}`);
  }

  stopAnimation(spriteId: string): void {
    console.log(`Stopping animation for sprite ${spriteId}`);
  }

  setAnimationSpeed(spriteId: string, speed: number): void {
    console.log(`Setting animation speed to ${speed} for sprite ${spriteId}`);
  }

  setOrientation(spriteId: string, orientation: SpriteOrientation): void {
    console.log(`Setting orientation to ${orientation} for sprite ${spriteId}`);
  }

  // --- Effect Management ---

  addEffect(spriteId: string, effect: unknown): void {
    console.log(`Adding effect to sprite ${spriteId}`, effect);
  }

  removeEffect(spriteId: string, effectId: string): void {
    console.log(`Removing effect ${effectId} from sprite ${spriteId}`);
  }

  // --- Import/Export ---

  async exportSprite(spriteId: string): Promise<string> {
    console.log(`Exporting sprite ${spriteId}`);
    return JSON.stringify({ id: spriteId, exportedAt: new Date().toISOString() });
  }

  async importSprite(data: string): Promise<AnimatedSprite | null> {
    try {
      const parsed = JSON.parse(data);
      console.log(`Importing sprite`, parsed);
      return parsed as AnimatedSprite;
    } catch {
      return null;
    }
  }
}

export const spriteService = new SpriteService();