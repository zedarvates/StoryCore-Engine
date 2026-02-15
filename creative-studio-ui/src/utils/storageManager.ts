/**
 * Storage Manager - Gère localStorage avec limite de taille
 * Bascule vers IndexedDB si localStorage est plein
 */

const STORAGE_LIMIT = 5 * 1024 * 1024; // 5MB
const STORAGE_WARNING_THRESHOLD = 0.8; // 80%

export interface StorageStats {
  used: number;
  limit: number;
  percentage: number;
  available: number;
}

export class StorageManager {
  private static getStorageSize(): number {
    let size = 0;
    try {
      for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          size += localStorage[key].length + key.length;
        }
      }
    } catch (error) {
      console.error('Failed to calculate storage size:', error);
    }
    return size;
  }

  static getStats(): StorageStats {
    const used = this.getStorageSize();
    const limit = STORAGE_LIMIT;
    const percentage = (used / limit) * 100;
    const available = limit - used;

    return { used, limit, percentage, available };
  }

  static canStore(data: string): boolean {
    const stats = this.getStats();
    const dataSize = data.length;
    return stats.available > dataSize;
  }

  static setItem(key: string, value: string): boolean {
    try {
      const stats = this.getStats();
      
      // Avertissement si proche de la limite
      if (stats.percentage > STORAGE_WARNING_THRESHOLD) {
        console.warn(
          `⚠️ Storage usage at ${stats.percentage.toFixed(1)}%`,
          stats
        );
      }

      // Check if we can store
      if (!this.canStore(value)) {
        console.error(
          `❌ Storage limit exceeded. Need ${value.length} bytes, ` +
          `available ${stats.available} bytes`
        );
        
        // Try to clean up old data
        this.cleanup();
        
        // Retry
        if (this.canStore(value)) {
          localStorage.setItem(key, value);
          return true;
        }
        
        // Switch to IndexedDB
        return this.setItemIndexedDB(key, value);
      }

      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.error('Failed to set item in localStorage:', error);
      
      // Switch to IndexedDB
      return this.setItemIndexedDB(key, value);
    }
  }

  static getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error('Failed to get item from localStorage:', error);
      return null;
    }
  }

  static removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to remove item from localStorage:', error);
    }
  }

  private static cleanup(): void {
    try {
      // Delete oldest data
      const keys = Object.keys(localStorage);
      const timestampKeys = keys.filter(key => key.includes('timestamp'));
      
      if (timestampKeys.length === 0) {
        // If no timestamp, delete the oldest 10% by key
        const toDelete = Math.ceil(keys.length * 0.1);
        for (let i = 0; i < toDelete && i < keys.length; i++) {
          localStorage.removeItem(keys[i]);
        }
      } else {
        // Delete the oldest 10% by timestamp
        const sorted = timestampKeys.sort((a, b) => {
          const timeA = parseInt(localStorage.getItem(a) || '0');
          const timeB = parseInt(localStorage.getItem(b) || '0');
          return timeA - timeB;
        });

        const toDelete = Math.ceil(sorted.length * 0.1);
        for (let i = 0; i < toDelete; i++) {
          localStorage.removeItem(sorted[i]);
        }
      }
      
      console.log('✅ Storage cleanup completed');
    } catch (error) {
      console.error('Failed to cleanup storage:', error);
    }
  }

  private static setItemIndexedDB(key: string, value: string): boolean {
    try {
      const request = indexedDB.open('StoryCore', 1);
      
      request.onerror = () => {
        console.error('Failed to open IndexedDB');
      };
      
      request.onsuccess = () => {
        const db = request.result;
        
        // Create object store if necessary
        if (!db.objectStoreNames.contains('data')) {
          const version = db.version + 1;
          db.close();
          const upgradeRequest = indexedDB.open('StoryCore', version);
          upgradeRequest.onupgradeneeded = (event) => {
            const upgradeDb = (event.target as IDBOpenDBRequest).result;
            if (!upgradeDb.objectStoreNames.contains('data')) {
              upgradeDb.createObjectStore('data', { keyPath: 'key' });
            }
          };
          return;
        }
        
        const transaction = db.transaction(['data'], 'readwrite');
        const store = transaction.objectStore('data');
        store.put({ key, value, timestamp: Date.now() });
        
        console.log(`✅ Stored in IndexedDB: ${key}`);
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('data')) {
          db.createObjectStore('data', { keyPath: 'key' });
        }
      };
      
      return true;
    } catch (error) {
      console.error('Failed to store in IndexedDB:', error);
      return false;
    }
  }
}
