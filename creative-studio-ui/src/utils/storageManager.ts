/**
 * Storage Manager - Gère localStorage avec limite de taille
 * Bascule vers IndexedDB si localStorage est plein ou pour les gros volumes
 */

const STORAGE_LIMIT = 100 * 1024 * 1024 * 1024; // 100GB
const _STORAGE_WARNING_THRESHOLD = 0.9;
const LOCAL_STORAGE_SAFE_LIMIT = 2 * 1024 * 1024; // 2MB

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
        if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
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

  /**
   * Persist item to storage.
   * Uses localStorage for small data, IndexedDB for large data.
   */
  static async setItem(key: string, value: string): Promise<boolean> {
    try {
      // For large data, go straight to IndexedDB
      if (value.length > LOCAL_STORAGE_SAFE_LIMIT) {
        return await this.setItemIndexedDB(key, value);
      }

      // Check if localStorage has space
      try {
        localStorage.setItem(key, value);
        return true;
      } catch (error) {
        // If localStorage is full or throws (QuotaExceededError)
        console.warn('❌ LocalStorage full or blocked, falling back to IndexedDB:', error);
        return await this.setItemIndexedDB(key, value);
      }
    } catch (error) {
      console.error('❌ StorageManager.setItem failed:', error);
      return false;
    }
  }

  /**
   * Retrieve item from storage.
   * Checks both localStorage and IndexedDB.
   */
  static async getItem(key: string): Promise<string | null> {
    try {
      // 1. Try localStorage first (fastest)
      const localValue = localStorage.getItem(key);
      if (localValue !== null) return localValue;

      // 2. Fallback to IndexedDB
      return await this.getItemIndexedDB(key);
    } catch (error) {
      console.error('❌ StorageManager.getItem failed:', error);
      return null;
    }
  }

  static removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
      // Fire and forget removal from IndexedDB as well
      this.removeItemIndexedDB(key);
    } catch (error) {
      console.error('Failed to remove item:', error);
    }
  }

  private static setItemIndexedDB(key: string, value: string): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const request = indexedDB.open('StoryCore', 1);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains('data')) {
            db.createObjectStore('data', { keyPath: 'key' });
          }
        };

        request.onerror = () => {
          console.error('IndexedDB open error');
          resolve(false);
        };

        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction(['data'], 'readwrite');
          const store = transaction.objectStore('data');
          const putRequest = store.put({ key, value, timestamp: Date.now() });

          putRequest.onsuccess = () => resolve(true);
          putRequest.onerror = () => resolve(false);
        };
      } catch (error) {
        console.error('IndexedDB setItem error:', error);
        resolve(false);
      }
    });
  }

  private static getItemIndexedDB(key: string): Promise<string | null> {
    return new Promise((resolve) => {
      try {
        const request = indexedDB.open('StoryCore', 1);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains('data')) {
            db.createObjectStore('data', { keyPath: 'key' });
          }
        };

        request.onsuccess = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains('data')) {
            resolve(null);
            return;
          }

          const transaction = db.transaction(['data'], 'readonly');
          const store = transaction.objectStore('data');
          const getRequest = store.get(key);

          getRequest.onsuccess = () => {
            resolve(getRequest.result ? getRequest.result.value : null);
          };
          getRequest.onerror = () => resolve(null);
        };

        request.onerror = () => resolve(null);
      } catch (error) {
        console.error('IndexedDB getItem error:', error);
        resolve(null);
      }
    });
  }

  private static removeItemIndexedDB(key: string): void {
    try {
      const request = indexedDB.open('StoryCore', 1);
      request.onsuccess = () => {
        const db = request.result;
        if (db.objectStoreNames.contains('data')) {
          const transaction = db.transaction(['data'], 'readwrite');
          const store = transaction.objectStore('data');
          store.delete(key);
        }
      };
    } catch (_e) {
      // Ignore errors on removal
    }
  }
}
