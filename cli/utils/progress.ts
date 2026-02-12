/**
 * Progress Tracker Utility for StoryCore CLI
 * Provides progress callbacks and console output for long-running operations
 */

export interface ProgressOptions {
  total: number;
  width?: number;
  title?: string;
  callback?: ProgressCallback;
}

export type ProgressCallback = (progress: ProgressState) => void;

export interface ProgressState {
  current: number;
  total: number;
  percent: number;
  message: string;
  elapsed: number;
  eta: number;
  speed: number;
}

/**
 * Progress Tracker class
 */
export class ProgressTracker {
  private static _instance: ProgressTracker;
  private current: number = 0;
  private total: number = 100;
  private title: string = '';
  private width: number = 30;
  private callback?: ProgressCallback;
  private startTime: number = 0;
  private lastUpdate: number = 0;
  private isRunning: boolean = false;
  private lastMessage: string = '';

  private constructor() {}

  /**
   * Get singleton instance
   */
  static get instance(): ProgressTracker {
    if (!ProgressTracker._instance) {
      ProgressTracker._instance = new ProgressTracker();
    }
    return ProgressTracker._instance;
  }

  /**
   * Get progress tracker instance (exported convenience)
   */
  static getTracker(): ProgressTracker {
    return ProgressTracker.instance;
  }

  /**
   * Start progress tracking
   */
  start(options: ProgressOptions): void {
    this.current = 0;
    this.total = options.total;
    this.width = options.width || 30;
    this.title = options.title || 'Progress';
    this.callback = options.callback;
    this.startTime = Date.now();
    this.lastUpdate = this.startTime;
    this.isRunning = true;

    this.display();
  }

  /**
   * Update progress
   */
  update(current: number, message?: string): void {
    if (!this.isRunning) return;

    this.current = Math.min(current, this.total);
    if (message) {
      this.lastMessage = message;
    }

    // Throttle display updates to 100ms
    const now = Date.now();
    if (now - this.lastUpdate >= 100 || this.current >= this.total) {
      this.display();
      this.lastUpdate = now;
    }

    // Call callback if provided
    if (this.callback) {
      this.callback(this.getState());
    }
  }

  /**
   * Increment progress by 1
   */
  increment(message?: string): void {
    this.update(this.current + 1, message);
  }

  /**
   * Increment progress by a delta
   */
  incrementBy(delta: number, message?: string): void {
    this.update(this.current + delta, message);
  }

  /**
   * Set progress message
   */
  setMessage(message: string): void {
    this.lastMessage = message;
    this.display();
  }

  /**
   * Get current progress state
   */
  getState(): ProgressState {
    const elapsed = Date.now() - this.startTime;
    const percent = this.total > 0 ? Math.round((this.current / this.total) * 100) : 0;
    const eta = this.current > 0 ? (elapsed / this.current) * (this.total - this.current) : 0;
    const speed = elapsed > 0 ? this.current / (elapsed / 1000) : 0;

    return {
      current: this.current,
      total: this.total,
      percent,
      message: this.lastMessage,
      elapsed,
      eta,
      speed
    };
  }

  /**
   * Stop progress tracking
   */
  stop(message?: string): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    this.current = this.total;
    this.display();

    if (message) {
      console.log(`\n${message}`);
    } else {
      console.log();
    }
  }

  /**
   * Complete the progress
   */
  complete(message: string = 'Done'): void {
    this.stop(`✓ ${message}`);
  }

  /**
   * Display progress bar
   */
  private display(): void {
    const percent = this.total > 0 ? Math.round((this.current / this.total) * 100) : 0;
    const bar = this.createBar(percent);
    const elapsed = this.formatTime(Date.now() - this.startTime);
    
    const output = `\r${this.title}: ${bar} ${percent}% | ${this.current}/${this.total} | ${elapsed}`;
    const message = this.lastMessage ? ` | ${this.lastMessage}` : '';
    
    process.stdout.write(output + message + ' '.repeat(50));
  }

  /**
   * Create ASCII progress bar
   */
  private createBar(percent: number): string {
    const filled = Math.round((this.width * percent) / 100);
    const empty = this.width - filled;
    return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
  }

  /**
   * Format milliseconds to readable time
   */
  private formatTime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Check if progress is running
   */
  getIsRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Get current progress percentage
   */
  getPercent(): number {
    return this.total > 0 ? Math.round((this.current / this.total) * 100) : 0;
  }

  /**
   * Get current count
   */
  getCurrent(): number {
    return this.current;
  }

  /**
   * Get total count
   */
  getTotal(): number {
    return this.total;
  }

  /**
   * Reset progress tracker
   */
  reset(): void {
    this.current = 0;
    this.total = 100;
    this.title = '';
    this.callback = undefined;
    this.isRunning = false;
    this.lastMessage = '';
  }
}

// Export singleton instance
export const progressTracker = ProgressTracker.getTracker();

/**
 * Create a progress bar for async operations
 */
export function withProgress<T>(
  operation: () => Promise<T>,
  options: ProgressOptions
): Promise<T> {
  const tracker = ProgressTracker.getTracker();
  tracker.start(options);

  return operation().then(
    (result) => {
      tracker.complete();
      return result;
    },
    (error) => {
      tracker.stop(`✗ Failed: ${error.message}`);
      throw error;
    }
  );
}
