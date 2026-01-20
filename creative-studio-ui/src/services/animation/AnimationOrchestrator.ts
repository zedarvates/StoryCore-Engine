/**
 * AnimationOrchestrator Service
 * 
 * Manages multiple concurrent animations to prevent visual conflicts.
 * Provides queuing, prioritization, and conflict resolution.
 * 
 * Validates: Requirements 11.8
 */

type AnimationPriority = 'low' | 'normal' | 'high' | 'critical';

interface AnimationTask {
  id: string;
  priority: AnimationPriority;
  duration: number;
  execute: () => Promise<void> | void;
  canInterrupt: boolean;
  conflictsWith?: string[];
}

interface RunningAnimation {
  task: AnimationTask;
  startTime: number;
  promise: Promise<void>;
}

/**
 * Orchestrates multiple animations to prevent conflicts
 * 
 * Validates: Requirements 11.8
 */
export class AnimationOrchestrator {
  private runningAnimations: Map<string, RunningAnimation> = new Map();
  private queuedAnimations: AnimationTask[] = [];
  private maxConcurrent: number = 3;

  /**
   * Register an animation to be executed
   * 
   * @param task - Animation task to execute
   * @returns Promise that resolves when animation completes
   */
  async execute(task: AnimationTask): Promise<void> {
    // Check for conflicts with running animations
    const conflicts = this.findConflicts(task);

    if (conflicts.length > 0) {
      // Handle conflicts based on priority
      const shouldInterrupt = this.shouldInterruptConflicts(task, conflicts);

      if (shouldInterrupt) {
        // Cancel conflicting animations
        await this.cancelAnimations(conflicts);
      } else {
        // Queue this animation
        this.queueAnimation(task);
        return this.waitForExecution(task.id);
      }
    }

    // Check if we've reached max concurrent animations
    if (this.runningAnimations.size >= this.maxConcurrent) {
      // Queue based on priority
      this.queueAnimation(task);
      return this.waitForExecution(task.id);
    }

    // Execute immediately
    return this.executeTask(task);
  }

  /**
   * Find animations that conflict with the given task
   */
  private findConflicts(task: AnimationTask): string[] {
    const conflicts: string[] = [];

    this.runningAnimations.forEach((running, id) => {
      if (task.conflictsWith?.includes(id)) {
        conflicts.push(id);
      }
    });

    return conflicts;
  }

  /**
   * Determine if conflicts should be interrupted
   */
  private shouldInterruptConflicts(
    task: AnimationTask,
    conflicts: string[]
  ): boolean {
    const priorityOrder: AnimationPriority[] = [
      'low',
      'normal',
      'high',
      'critical',
    ];

    const taskPriorityIndex = priorityOrder.indexOf(task.priority);

    for (const conflictId of conflicts) {
      const running = this.runningAnimations.get(conflictId);
      if (!running) continue;

      const conflictPriorityIndex = priorityOrder.indexOf(
        running.task.priority
      );

      // Don't interrupt if conflict has higher or equal priority
      if (conflictPriorityIndex >= taskPriorityIndex) {
        return false;
      }

      // Don't interrupt if conflict cannot be interrupted
      if (!running.task.canInterrupt) {
        return false;
      }
    }

    return true;
  }

  /**
   * Cancel running animations
   */
  private async cancelAnimations(ids: string[]): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const id of ids) {
      const running = this.runningAnimations.get(id);
      if (running) {
        this.runningAnimations.delete(id);
        // Note: In a real implementation, we'd need a way to actually cancel the animation
        // For now, we just remove it from tracking
      }
    }

    await Promise.all(promises);
  }

  /**
   * Queue an animation for later execution
   */
  private queueAnimation(task: AnimationTask): void {
    // Insert based on priority
    const priorityOrder: AnimationPriority[] = [
      'critical',
      'high',
      'normal',
      'low',
    ];

    const insertIndex = this.queuedAnimations.findIndex(
      (queued) =>
        priorityOrder.indexOf(queued.priority) >
        priorityOrder.indexOf(task.priority)
    );

    if (insertIndex === -1) {
      this.queuedAnimations.push(task);
    } else {
      this.queuedAnimations.splice(insertIndex, 0, task);
    }
  }

  /**
   * Wait for a queued animation to execute
   */
  private async waitForExecution(taskId: string): Promise<void> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const running = this.runningAnimations.get(taskId);
        if (running) {
          clearInterval(checkInterval);
          running.promise.then(resolve);
        }
      }, 50);
    });
  }

  /**
   * Execute an animation task
   */
  private async executeTask(task: AnimationTask): Promise<void> {
    const promise = Promise.resolve(task.execute());

    this.runningAnimations.set(task.id, {
      task,
      startTime: Date.now(),
      promise,
    });

    try {
      await promise;
    } finally {
      this.runningAnimations.delete(task.id);
      this.processQueue();
    }
  }

  /**
   * Process queued animations
   */
  private processQueue(): void {
    while (
      this.queuedAnimations.length > 0 &&
      this.runningAnimations.size < this.maxConcurrent
    ) {
      const task = this.queuedAnimations.shift();
      if (task) {
        this.executeTask(task);
      }
    }
  }

  /**
   * Cancel all animations
   */
  async cancelAll(): Promise<void> {
    const ids = Array.from(this.runningAnimations.keys());
    await this.cancelAnimations(ids);
    this.queuedAnimations = [];
  }

  /**
   * Get current animation status
   */
  getStatus(): {
    running: number;
    queued: number;
    runningIds: string[];
  } {
    return {
      running: this.runningAnimations.size,
      queued: this.queuedAnimations.length,
      runningIds: Array.from(this.runningAnimations.keys()),
    };
  }

  /**
   * Set maximum concurrent animations
   */
  setMaxConcurrent(max: number): void {
    this.maxConcurrent = Math.max(1, max);
    this.processQueue();
  }
}

/**
 * Global animation orchestrator instance
 */
export const animationOrchestrator = new AnimationOrchestrator();

/**
 * Helper to create animation tasks
 */
export function createAnimationTask(
  id: string,
  execute: () => Promise<void> | void,
  options: {
    priority?: AnimationPriority;
    duration?: number;
    canInterrupt?: boolean;
    conflictsWith?: string[];
  } = {}
): AnimationTask {
  return {
    id,
    execute,
    priority: options.priority || 'normal',
    duration: options.duration || 300,
    canInterrupt: options.canInterrupt !== false,
    conflictsWith: options.conflictsWith,
  };
}
