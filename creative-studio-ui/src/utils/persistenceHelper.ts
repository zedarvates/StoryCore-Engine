/**
 * Persistence Helper
 * 
 * Robust storage persistence with retry logic and fallback
 */

import { StorageManager } from './storageManager';
import { logger as Logger } from './logger';

interface PersistenceOptions {
  maxRetries?: number;
  retryDelay?: number;
  fallbackToMemory?: boolean;
}

/**
 * In-memory fallback storage for when localStorage is unavailable
 */
const memoryStorage = new Map<string, string>();

/**
 * Persist data to storage with retry logic
 */
export async function persistData(
  key: string,
  data: unknown,
  options: PersistenceOptions = {}
): Promise<boolean> {
  const {
    maxRetries = 3,
    retryDelay = 100,
    fallbackToMemory = true,
  } = options;

  const jsonData = JSON.stringify(data);

  // Try to persist to storage with retries
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const success = StorageManager.setItem(key, jsonData);
      if (success) {
        Logger.info(`✅ Persisted "${key}" to storage (attempt ${attempt}/${maxRetries})`);
        return true;
      }
    } catch (error) {
      Logger.warn(
        `⚠️ Attempt ${attempt}/${maxRetries} failed to persist "${key}":`,
        error
      );

      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries) {
        await new Promise((resolve) =>
          setTimeout(resolve, retryDelay * attempt)
        );
      }
    }
  }

  // Fallback to memory storage
  if (fallbackToMemory) {
    try {
      memoryStorage.set(key, jsonData);
      Logger.warn(
        `⚠️ Failed to persist "${key}" to storage after ${maxRetries} attempts. Using memory storage.`
      );
      return true;
    } catch (error) {
      Logger.error(`❌ Failed to persist "${key}" to memory storage:`, error);
      return false;
    }
  }

  Logger.error(
    `❌ Failed to persist "${key}" after ${maxRetries} attempts and no fallback available`
  );
  return false;
}

/**
 * Retrieve data from storage with fallback to memory
 */
export function retrieveData<T>(key: string, defaultValue?: T): T | null {
  try {
    // Try to get from localStorage first
    const stored = StorageManager.getItem(key);
    if (stored) {
      return JSON.parse(stored) as T;
    }

    // Fallback to memory storage
    const memoryData = memoryStorage.get(key);
    if (memoryData) {
      Logger.info(`📦 Retrieved "${key}" from memory storage`);
      return JSON.parse(memoryData) as T;
    }

    // Return default value if provided
    if (defaultValue !== undefined) {
      return defaultValue;
    }

    return null;
  } catch (error) {
    Logger.error(`❌ Failed to retrieve "${key}":`, error);
    return defaultValue ?? null;
  }
}

/**
 * Clear data from both storage and memory
 */
export function clearData(key: string): void {
  try {
    StorageManager.removeItem(key);
    memoryStorage.delete(key);
    Logger.info(`🗑️ Cleared "${key}" from storage and memory`);
  } catch (error) {
    Logger.error(`❌ Failed to clear "${key}":`, error);
  }
}

/**
 * Get storage statistics
 */
export function getStorageStats() {
  const stats = StorageManager.getStats();
  const memorySize = Array.from(memoryStorage.values()).reduce(
    (sum, val) => sum + val.length,
    0
  );

  return {
    localStorage: stats,
    memory: {
      used: memorySize,
      items: memoryStorage.size,
    },
  };
}

/**
 * Clear all memory storage
 */
export function clearMemoryStorage(): void {
  memoryStorage.clear();
  Logger.info('🗑️ Cleared all memory storage');
}

/**
 * Migrate data from memory storage to localStorage
 */
export async function migrateMemoryToStorage(): Promise<number> {
  let migrated = 0;

  for (const [key, value] of memoryStorage.entries()) {
    try {
      const success = StorageManager.setItem(key, value);
      if (success) {
        memoryStorage.delete(key);
        migrated++;
      }
    } catch (error) {
      Logger.warn(`Failed to migrate "${key}" to storage:`, error);
    }
  }

  if (migrated > 0) {
    Logger.info(`✅ Migrated ${migrated} items from memory to storage`);
  }

  return migrated;
}

