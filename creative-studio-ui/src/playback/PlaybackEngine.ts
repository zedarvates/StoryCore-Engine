import type { Shot, Transition, Effect, TextLayer, Animation, Keyframe } from '../types';

/**
 * PlaybackEngine - Renders shots with transitions, effects, text layers, and animations
 * Provides real-time preview of the video sequence
 */
export class PlaybackEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private currentTime: number = 0;
  private isPlaying: boolean = false;
  private animationFrameId: number | null = null;
  private shots: Shot[] = [];
  private playbackSpeed: number = 1;
  private onTimeUpdate?: (time: number) => void;
  private onPlayStateChange?: (isPlaying: boolean) => void;
  private imageCache: Map<string, HTMLImageElement> = new Map();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get 2D context from canvas');
    }
    this.ctx = ctx;
  }

  /**
   * Set the shots to be rendered
   */
  setShots(shots: Shot[]): void {
    this.shots = [...shots].sort((a, b) => a.position - b.position);
  }

  /**
   * Start playback
   */
  play(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.onPlayStateChange?.(true);
    this.animate();
  }

  /**
   * Pause playback
   */
  pause(): void {
    this.isPlaying = false;
    this.onPlayStateChange?.(false);
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Stop playback and reset to start
   */
  stop(): void {
    this.pause();
    this.currentTime = 0;
    this.onTimeUpdate?.(0);
    this.renderFrame(0);
  }

  /**
   * Seek to specific time
   */
  seek(time: number): void {
    this.currentTime = Math.max(0, Math.min(time, this.getTotalDuration()));
    this.onTimeUpdate?.(this.currentTime);
    if (!this.isPlaying) {
      this.renderFrame(this.currentTime);
    }
  }

  /**
   * Set playback speed
   */
  setPlaybackSpeed(speed: number): void {
    this.playbackSpeed = Math.max(0.25, Math.min(2, speed));
  }

  /**
   * Get total duration of all shots
   */
  getTotalDuration(): number {
    return this.shots.reduce((acc, shot) => {
      let duration = acc + shot.duration;
      if (shot.transitionOut) {
        duration += shot.transitionOut.duration;
      }
      return duration;
    }, 0);
  }

  /**
   * Set time update callback
   */
  onTime(callback: (time: number) => void): void {
    this.onTimeUpdate = callback;
  }

  /**
   * Set play state change callback
   */
  onPlayState(callback: (isPlaying: boolean) => void): void {
    this.onPlayStateChange = callback;
  }

  /**
   * Main animation loop
   */
  private animate(): void {
    if (!this.isPlaying) return;

    const deltaTime = (1 / 60) * this.playbackSpeed; // Apply playback speed
    this.currentTime += deltaTime;

    const totalDuration = this.getTotalDuration();
    if (this.currentTime >= totalDuration) {
      this.stop();
      return;
    }

    this.renderFrame(this.currentTime);
    this.onTimeUpdate?.(this.currentTime);

    this.animationFrameId = requestAnimationFrame(() => this.animate());
  }

  /**
   * Render a single frame at the given time
   */
  private renderFrame(time: number): void {
    // Clear canvas
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Find current shot and next shot (for transitions)
    const { currentShot, nextShot, shotTime, isInTransition, transitionProgress } = 
      this.getShotAtTime(time);

    if (!currentShot) return;

    // Save context state
    this.ctx.save();

    // Render current shot
    if (isInTransition && nextShot && currentShot.transitionOut) {
      this.renderTransition(
        currentShot,
        nextShot,
        currentShot.transitionOut,
        transitionProgress
      );
    } else {
      this.renderShot(currentShot, shotTime);
    }

    // Restore context state
    this.ctx.restore();
  }

  /**
   * Get the shot at a specific time
   */
  private getShotAtTime(time: number): {
    currentShot: Shot | null;
    nextShot: Shot | null;
    shotTime: number;
    isInTransition: boolean;
    transitionProgress: number;
  } {
    let accumulatedTime = 0;

    for (let i = 0; i < this.shots.length; i++) {
      const shot = this.shots[i];
      const shotEnd = accumulatedTime + shot.duration;

      // Check if we're in the shot
      if (time >= accumulatedTime && time < shotEnd) {
        return {
          currentShot: shot,
          nextShot: null,
          shotTime: time - accumulatedTime,
          isInTransition: false,
          transitionProgress: 0,
        };
      }

      // Check if we're in a transition
      if (shot.transitionOut && i < this.shots.length - 1) {
        const transitionEnd = shotEnd + shot.transitionOut.duration;
        if (time >= shotEnd && time < transitionEnd) {
          const transitionTime = time - shotEnd;
          const progress = transitionTime / shot.transitionOut.duration;
          return {
            currentShot: shot,
            nextShot: this.shots[i + 1],
            shotTime: shot.duration,
            isInTransition: true,
            transitionProgress: progress,
          };
        }
        accumulatedTime = transitionEnd;
      } else {
        accumulatedTime = shotEnd;
      }
    }

    return {
      currentShot: null,
      nextShot: null,
      shotTime: 0,
      isInTransition: false,
      transitionProgress: 0,
    };
  }

  /**
   * Render a single shot
   */
  private renderShot(shot: Shot, shotTime: number): void {
    // Apply animations
    this.applyAnimations(shot, shotTime);

    // Draw shot image
    if (shot.image) {
      this.drawImage(shot.image);
    }

    // Apply effects
    shot.effects.forEach((effect) => {
      if (effect.enabled) {
        this.applyEffect(effect);
      }
    });

    // Render text layers
    shot.textLayers.forEach((layer) => {
      if (shotTime >= layer.startTime && shotTime < layer.startTime + layer.duration) {
        this.renderTextLayer(layer, shotTime - layer.startTime);
      }
    });
  }

  /**
   * Render a transition between two shots
   */
  private renderTransition(
    fromShot: Shot,
    toShot: Shot,
    transition: Transition,
    progress: number
  ): void {
    const easedProgress = this.applyEasing(progress, transition.easing || 'linear');

    switch (transition.type) {
      case 'fade':
        this.renderFadeTransition(fromShot, toShot, easedProgress);
        break;
      case 'dissolve':
        this.renderDissolveTransition(fromShot, toShot, easedProgress);
        break;
      case 'wipe':
        this.renderWipeTransition(fromShot, toShot, easedProgress, transition.direction);
        break;
      case 'slide':
        this.renderSlideTransition(fromShot, toShot, easedProgress, transition.direction);
        break;
      default:
        // Default to crossfade
        this.renderFadeTransition(fromShot, toShot, easedProgress);
    }
  }

  /**
   * Render fade transition
   */
  private renderFadeTransition(fromShot: Shot, toShot: Shot, progress: number): void {
    // Draw from shot
    this.ctx.globalAlpha = 1 - progress;
    if (fromShot.image) {
      this.drawImage(fromShot.image);
    }

    // Draw to shot
    this.ctx.globalAlpha = progress;
    if (toShot.image) {
      this.drawImage(toShot.image);
    }

    this.ctx.globalAlpha = 1;
  }

  /**
   * Render dissolve transition (same as fade for now)
   */
  private renderDissolveTransition(fromShot: Shot, toShot: Shot, progress: number): void {
    this.renderFadeTransition(fromShot, toShot, progress);
  }

  /**
   * Render wipe transition
   */
  private renderWipeTransition(
    fromShot: Shot,
    toShot: Shot,
    progress: number,
    direction?: string
  ): void {
    const width = this.canvas.width;
    const height = this.canvas.height;

    // Draw from shot
    if (fromShot.image) {
      this.drawImage(fromShot.image);
    }

    // Create clipping path for wipe
    this.ctx.save();
    this.ctx.beginPath();

    switch (direction) {
      case 'left':
        this.ctx.rect(0, 0, width * progress, height);
        break;
      case 'right':
        this.ctx.rect(width * (1 - progress), 0, width * progress, height);
        break;
      case 'up':
        this.ctx.rect(0, 0, width, height * progress);
        break;
      case 'down':
        this.ctx.rect(0, height * (1 - progress), width, height * progress);
        break;
      default:
        this.ctx.rect(0, 0, width * progress, height);
    }

    this.ctx.clip();

    // Draw to shot within clip
    if (toShot.image) {
      this.drawImage(toShot.image);
    }

    this.ctx.restore();
  }

  /**
   * Render slide transition
   */
  private renderSlideTransition(
    fromShot: Shot,
    toShot: Shot,
    progress: number,
    direction?: string
  ): void {
    const width = this.canvas.width;
    const height = this.canvas.height;

    this.ctx.save();

    // Draw from shot (sliding out)
    this.ctx.save();
    switch (direction) {
      case 'left':
        this.ctx.translate(-width * progress, 0);
        break;
      case 'right':
        this.ctx.translate(width * progress, 0);
        break;
      case 'up':
        this.ctx.translate(0, -height * progress);
        break;
      case 'down':
        this.ctx.translate(0, height * progress);
        break;
      default:
        this.ctx.translate(-width * progress, 0);
    }
    if (fromShot.image) {
      this.drawImage(fromShot.image);
    }
    this.ctx.restore();

    // Draw to shot (sliding in)
    this.ctx.save();
    switch (direction) {
      case 'left':
        this.ctx.translate(width * (1 - progress), 0);
        break;
      case 'right':
        this.ctx.translate(-width * (1 - progress), 0);
        break;
      case 'up':
        this.ctx.translate(0, height * (1 - progress));
        break;
      case 'down':
        this.ctx.translate(0, -height * (1 - progress));
        break;
      default:
        this.ctx.translate(width * (1 - progress), 0);
    }
    if (toShot.image) {
      this.drawImage(toShot.image);
    }
    this.ctx.restore();

    this.ctx.restore();
  }

  /**
   * Draw an image on the canvas
   */
  private drawImage(imageUrl: string): void {
    let img = this.imageCache.get(imageUrl);

    if (!img) {
      img = new Image();
      img.src = imageUrl;
      this.imageCache.set(imageUrl, img);
    }

    if (img.complete) {
      this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
    }
  }

  /**
   * Apply visual effect
   */
  private applyEffect(effect: Effect): void {
    const intensity = effect.intensity / 100;

    switch (effect.name) {
      case 'brightness':
        this.ctx.filter = `brightness(${100 + (effect.parameters.value || 0) * intensity}%)`;
        break;
      case 'contrast':
        this.ctx.filter = `contrast(${100 + (effect.parameters.value || 0) * intensity}%)`;
        break;
      case 'saturation':
        this.ctx.filter = `saturate(${100 + (effect.parameters.value || 0) * intensity}%)`;
        break;
      case 'blur':
        this.ctx.filter = `blur(${(effect.parameters.value || 0) * intensity}px)`;
        break;
      case 'grayscale':
        this.ctx.filter = `grayscale(${intensity * 100}%)`;
        break;
      case 'sepia':
        this.ctx.filter = `sepia(${intensity * 100}%)`;
        break;
      case 'hue-rotate':
        this.ctx.filter = `hue-rotate(${(effect.parameters.value || 0) * intensity}deg)`;
        break;
      case 'invert':
        this.ctx.filter = `invert(${intensity * 100}%)`;
        break;
    }
  }

  /**
   * Apply animations to the context
   */
  private applyAnimations(shot: Shot, shotTime: number): void {
    shot.animations.forEach((animation) => {
      const value = this.interpolateKeyframes(animation.keyframes, shotTime);
      this.applyAnimationValue(animation.property, value);
    });
  }

  /**
   * Apply animation value to context
   */
  private applyAnimationValue(property: Animation['property'], value: unknown): void {
    switch (property) {
      case 'position':
        if (typeof value === 'object' && 'x' in value && 'y' in value) {
          this.ctx.translate(value.x, value.y);
        }
        break;
      case 'scale':
        if (typeof value === 'number') {
          this.ctx.scale(value, value);
        }
        break;
      case 'rotation':
        if (typeof value === 'number') {
          this.ctx.rotate((value * Math.PI) / 180);
        }
        break;
      case 'opacity':
        if (typeof value === 'number') {
          this.ctx.globalAlpha = value;
        }
        break;
    }
  }

  /**
   * Interpolate between keyframes
   */
  private interpolateKeyframes(keyframes: Keyframe[], time: number): unknown {
    if (keyframes.length === 0) return 0;
    if (keyframes.length === 1) return keyframes[0].value;

    const sorted = [...keyframes].sort((a, b) => a.time - b.time);

    // Before first keyframe
    if (time <= sorted[0].time) return sorted[0].value;

    // After last keyframe
    if (time >= sorted[sorted.length - 1].time) return sorted[sorted.length - 1].value;

    // Find surrounding keyframes
    let prev = sorted[0];
    let next = sorted[sorted.length - 1];

    for (let i = 0; i < sorted.length - 1; i++) {
      if (time >= sorted[i].time && time <= sorted[i + 1].time) {
        prev = sorted[i];
        next = sorted[i + 1];
        break;
      }
    }

    // Calculate progress between keyframes
    const progress = (time - prev.time) / (next.time - prev.time);
    const easedProgress = this.applyEasing(progress, prev.easing);

    // Interpolate value
    if (typeof prev.value === 'number' && typeof next.value === 'number') {
      return prev.value + (next.value - prev.value) * easedProgress;
    } else if (typeof prev.value === 'object' && typeof next.value === 'object') {
      return {
        x: prev.value.x + (next.value.x - prev.value.x) * easedProgress,
        y: prev.value.y + (next.value.y - prev.value.y) * easedProgress,
      };
    }

    return prev.value;
  }

  /**
   * Render text layer
   */
  private renderTextLayer(layer: TextLayer, layerTime: number): void {
    this.ctx.save();

    // Apply text animation
    let opacity = 1;
    if (layer.animation) {
      opacity = this.calculateTextAnimationValue(layer.animation, layerTime);
    }

    this.ctx.globalAlpha = opacity;

    // Set text style
    let fontStyle = '';
    if (layer.style?.bold) fontStyle += 'bold ';
    if (layer.style?.italic) fontStyle += 'italic ';
    this.ctx.font = `${fontStyle}${layer.fontSize}px ${layer.font}`;
    this.ctx.fillStyle = layer.color;
    this.ctx.textAlign = layer.alignment;
    this.ctx.textBaseline = 'middle';

    // Calculate position
    const x = (layer.position.x / 100) * this.canvas.width;
    const y = (layer.position.y / 100) * this.canvas.height;

    // Draw background if specified
    if (layer.backgroundColor) {
      const metrics = this.ctx.measureText(layer.content);
      const padding = 10;
      this.ctx.fillStyle = layer.backgroundColor;
      this.ctx.fillRect(
        x - metrics.width / 2 - padding,
        y - layer.fontSize / 2 - padding,
        metrics.width + padding * 2,
        layer.fontSize + padding * 2
      );
      this.ctx.fillStyle = layer.color;
    }

    // Draw stroke if specified
    if (layer.style?.stroke) {
      this.ctx.strokeStyle = layer.style.stroke.color;
      this.ctx.lineWidth = layer.style.stroke.width;
      this.ctx.strokeText(layer.content, x, y);
    }

    // Draw shadow if specified
    if (layer.style?.shadow) {
      this.ctx.shadowColor = layer.style.shadow.color;
      this.ctx.shadowBlur = layer.style.shadow.blur;
      this.ctx.shadowOffsetX = layer.style.shadow.x;
      this.ctx.shadowOffsetY = layer.style.shadow.y;
    }

    // Draw text
    this.ctx.fillText(layer.content, x, y);

    this.ctx.restore();
  }

  /**
   * Calculate text animation value
   */
  private calculateTextAnimationValue(animation: TextLayer['animation'], time: number): number {
    if (!animation) return 1;

    const progress = Math.min(time / animation.duration, 1);
    const easedProgress = this.applyEasing(progress, animation.easing);

    switch (animation.type) {
      case 'fade-in':
        return easedProgress;
      case 'fade-out':
        return 1 - easedProgress;
      default:
        return 1;
    }
  }

  /**
   * Apply easing function
   */
  private applyEasing(t: number, easing: string): number {
    switch (easing) {
      case 'linear':
        return t;
      case 'ease-in':
        return t * t;
      case 'ease-out':
        return t * (2 - t);
      case 'ease-in-out':
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      default:
        return t;
    }
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.pause();
    this.imageCache.clear();
  }
}


