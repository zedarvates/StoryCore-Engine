/**
 * StorageBatchingManager - Optimizes storage operations by batching writes
 * Reduces storage warnings and improves performance during bulk operations
 */

interface BatchEntry {
  key: string;
  value: unknown;
  timestamp: number;
}

class StorageBatchingManager {
  private static pendingWrites = new Map<string, BatchEntry>();
  private static flushTimer: ReturnType<typeof setTimeout> | null = null;
  private static readonly FLUSH_DELAY_MS = 100;
  private static readonly MAX_BATCH_SIZE = 50;

  /**
   * Queue a write operation to be batched
   */
  static queueWrite(key: string, value: unknown): void {
    // Don't batch critical writes
    if (this.isCriticalKey(key)) {
      this.writeImmediate(key, value);
      return;
    }

    this.pendingWrites.set(key, {
      key,
      value,
      timestamp: Date.now(),
    });

    // Start flush timer if not already running
    if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => this.flush(), this.FLUSH_DELAY_MS);
    }

    // Log storage usage warning if approaching limit
    this.logStorageUsage();
  }

  /**
   * Flush all pending writes to storage
   */
  private static async flush(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    const entries = Array.from(this.pendingWrites.values());
    
    if (entries.length === 0) return;

    // Process in batches to avoid blocking
    const batchSize = Math.min(this.MAX_BATCH_SIZE, entries.length);
    const batch = entries.slice(0, batchSize);

    for (const entry of batch) {
      try {
        await this.writeToStorage(entry.key, entry.value);
        this.pendingWrites.delete(entry.key);
      } catch (error) {
        console.error(`[StorageBatching] Failed to write ${entry.key}:`, error);
      }
    }

    // If more entries remain, schedule another flush
    if (this.pendingWrites.size > 0) {
      this.flushTimer = setTimeout(() => this.flush(), this.FLUSH_DELAY_MS);
    }
  }

  /**
   * Write directly to storage (critical operations)
   */
  private static writeImmediate(key: string, value: unknown): void {
    try {
      this.writeToStorage(key, value);
    } catch (error) {
      console.error(`[StorageBatching] Immediate write failed for ${key}:`, error);
    }
  }

  /**
   * Actual storage write with encoding
   */
  private static async writeToStorage(key: string, value: unknown): Promise<void> {
    const serialized = JSON.stringify(value);
    
    if (window.electronAPI?.fs) {
      // Use Electron API if available
      const encoder = new TextEncoder();
      const uint8Array = encoder.encode(serialized);
      await window.electronAPI.fs.writeFile(key, uint8Array as any);
    } else {
      // Fallback to localStorage
      localStorage.setItem(key, serialized);
    }
  }

  /**
   * Check if key is critical and should not be batched
   */
  private static isCriticalKey(key: string): boolean {
    const criticalPatterns = [
      'current-project',
      'last-opened',
      'user-preferences',
      'temp-',
    ];

    return criticalPatterns.some(pattern => key.includes(pattern));
  }

  /**
   * Log current storage usage
   */
  private static logStorageUsage(): void {
    try {
      let totalUsed = 0;
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          totalUsed += new Blob([localStorage.getItem(key) || '']).size;
        }
      }

      const limit = 5 * 1024 * 1024; // 5MB default limit
      const percentage = (totalUsed / limit) * 100;

      if (percentage > 10) {
        console.warn(
          `[StorageBatching] Storage usage at ${percentage.toFixed(1)}% ` +
          `{used: ${totalUsed}, limit: ${limit}}`
        );
      }
    } catch (error) {
      // Ignore errors during usage logging
    }
  }

  /**
   * Get count of pending writes
   */
  static getPendingCount(): number {
    return this.pendingWrites.size;
  }

  /**
   * Clear all pending writes (for cleanup)
   */
  static clear(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    this.pendingWrites.clear();
  }
}

export { StorageBatchingManager };
