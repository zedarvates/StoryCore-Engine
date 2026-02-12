/**
 * Spring Physics Engine
 * 
 * Implements spring physics simulation for natural-looking animations.
 * Inspired by React Spring and Remotion's animation patterns.
 * 
 * Validates: Requirements 11.8 - Animation System
 */

import { SpringConfig, SpringAnimationConfig, AnimationInstance } from './AnimationTypes';

/**
 * Spring physics simulation result
 */
interface SpringResult {
  value: number;
  velocity: number;
  progress: number; // 0-1 completion
  isComplete: boolean;
}

/**
 * Spring Physics Engine Class
 * 
 * Simulates spring physics for smooth, natural animations.
 */
export class SpringEngine {
  private config: SpringConfig;
  private currentValue: number;
  private targetValue: number;
  private currentVelocity: number;
  private startValue: number;
  private startTime: number;
  private duration: number;
  private animationId: number | null = null;
  private onUpdate: ((value: number, velocity: number) => void) | null = null;
  private onComplete: (() => void) | null = null;
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private lastFrameTime: number = 0;
  private rafCallback: ((time: number) => void) | null = null;

  constructor(config?: Partial<SpringConfig>) {
    this.config = { ...{ mass: 1, stiffness: 100, damping: 10 }, ...config };
    this.currentValue = 0;
    this.targetValue = 0;
    this.currentVelocity = 0;
    this.startValue = 0;
    this.startTime = 0;
    this.duration = 0;
  }

  /**
   * Animate from one value to another using spring physics
   */
  animate(config: SpringAnimationConfig): AnimationInstance<number> {
    const instanceId = config.id;
    this.startValue = config.from;
    this.targetValue = config.to;
    this.currentValue = config.from;
    this.currentVelocity = config.velocity || 0;
    this.config = { 
      ...{ mass: 1, stiffness: 100, damping: 10 }, 
      ...config.config 
    };
    
    let loopCount = 0;
    const maxLoops = typeof config.loop === 'number' ? config.loop : Infinity;
    const direction = config.direction || 'normal';

    const animate = (): SpringResult => {
      // Calculate delta
      const delta = this.targetValue - this.currentValue;
      
      // Spring physics formula: F = -k*x - c*v
      // where k is stiffness, c is damping, x is displacement, v is velocity
      const springForce = -this.config.stiffness * delta;
      const dampingForce = -this.config.damping * this.currentVelocity;
      const acceleration = (springForce + dampingForce) / this.config.mass;
      
      // Update velocity and position
      this.currentVelocity += acceleration;
      this.currentValue += this.currentVelocity;

      // Calculate progress (distance traveled relative to total distance)
      const totalDistance = Math.abs(this.targetValue - this.startValue);
      const distanceTraveled = Math.abs(this.currentValue - this.startValue);
      const progress = totalDistance > 0 ? distanceTraveled / totalDistance : 1;

      // Check if animation is complete
      const isComplete = 
        Math.abs(delta) < 0.001 && 
        Math.abs(this.currentVelocity) < 0.01;

      return {
        value: this.currentValue,
        velocity: this.currentVelocity,
        progress: Math.min(progress, 1),
        isComplete
      };
    };

    const start = () => {
      this.startTime = performance.now();
      this.isRunning = true;
      this.isPaused = false;
      this.lastFrameTime = this.startTime;

      const loop = (currentTime: number) => {
        if (!this.isRunning) return;
        
        if (this.isPaused) {
          this.rafCallback = loop;
          return;
        }

        const deltaTime = (currentTime - this.lastFrameTime) / 1000; // Convert to seconds
        this.lastFrameTime = currentTime;

        // Limit delta time to prevent spiral of death
        const dt = Math.min(deltaTime, 0.1);

        // Run physics simulation
        const result = animate();

        // Notify update
        if (this.onUpdate) {
          this.onUpdate(result.value, result.velocity);
        }

        // Check completion or loop
        if (result.isComplete) {
          if (typeof config.loop === 'number' && loopCount < maxLoops) {
            loopCount++;
            
            // Handle direction
            if (direction === 'reverse') {
              this.targetValue = this.startValue;
              this.startValue = result.value;
            } else if (direction === 'alternate' && loopCount % 2 === 0) {
              this.targetValue = this.startValue;
              this.startValue = result.value;
            } else {
              // Reset for next loop
              this.startValue = result.value;
            }
            
            this.currentVelocity = 0;
          } else if (typeof config.loop === 'boolean' && config.loop) {
            // Infinite loop
            if (direction === 'reverse') {
              this.targetValue = this.startValue;
              this.startValue = result.value;
            } else if (direction === 'alternate') {
              if (loopCount % 2 === 0) {
                this.targetValue = this.startValue;
                this.startValue = result.value;
              } else {
                this.startValue = this.targetValue;
                this.targetValue = result.value;
              }
            } else {
              this.startValue = result.value;
            }
            
            this.currentVelocity = 0;
            loopCount++;
          } else {
            // Complete
            this.isRunning = false;
            if (this.onComplete) {
              this.onComplete();
            }
            return;
          }
        }

        // Continue animation
        this.animationId = requestAnimationFrame(loop);
      };

      this.animationId = requestAnimationFrame(loop);
    };

    const pause = () => {
      this.isPaused = true;
    };

    const stop = () => {
      this.isRunning = false;
      this.isPaused = false;
      if (this.animationId !== null) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
    };

    const reset = () => {
      stop();
      this.currentValue = config.from;
      this.currentVelocity = config.velocity || 0;
      this.startValue = config.from;
      this.targetValue = config.to;
    };

    const seek = (progress: number) => {
      // For spring animations, seek is approximate
      const totalDistance = this.targetValue - this.startValue;
      this.currentValue = this.startValue + (totalDistance * Math.min(Math.max(progress, 0), 1));
    };

    return {
      id: instanceId,
      config,
      state: {
        id: instanceId,
        isPlaying: false,
        isPaused: false,
        progress: 0,
        currentValue: this.currentValue,
        velocity: this.currentVelocity
      },
      start,
      pause: pause,
      stop,
      reset,
      seek
    };
  }

  /**
   * Set callback for animation updates
   */
  setOnUpdate(callback: (value: number, velocity: number) => void): void {
    this.onUpdate = callback;
  }

  /**
   * Set callback for animation completion
   */
  setOnComplete(callback: () => void): void {
    this.onComplete = callback;
  }

  /**
   * Calculate final spring value without animation
   */
  static calculateFinalValue(from: number, to: number, config: SpringConfig): number {
    return to;
  }

  /**
   * Estimate animation duration based on spring parameters
   */
  static estimateDuration(from: number, to: number, config: SpringConfig): number {
    const delta = Math.abs(to - from);
    // Rough estimate based on spring characteristics
    const dampingRatio = config.damping / (2 * Math.sqrt(config.mass * config.stiffness));
    
    if (dampingRatio < 1) {
      // Underdamped - oscillatory
      const naturalFrequency = Math.sqrt(config.stiffness / config.mass);
      const dampedFrequency = naturalFrequency * Math.sqrt(1 - dampingRatio * dampingRatio);
      // Approximate time for 3 oscillations
      return (3 * 2 * Math.PI / dampedFrequency) * 1000;
    } else {
      // Overdamped - exponential decay
      const root1 = (-config.damping + Math.sqrt(config.damping * config.damping - 4 * config.mass * config.stiffness)) / (2 * config.mass);
      const root2 = (-config.damping - Math.sqrt(config.damping * config.damping - 4 * config.mass * config.stiffness)) / (2 * config.mass);
      const slowestRoot = Math.max(root1, root2);
      // Time constant for 95% completion
      return Math.abs(3 / slowestRoot) * 1000;
    }
  }
}

/**
 * Create a spring animation instance
 */
export function createSpringAnimation(config: SpringAnimationConfig): AnimationInstance<number> {
  const engine = new SpringEngine(config.config);
  return engine.animate(config);
}
