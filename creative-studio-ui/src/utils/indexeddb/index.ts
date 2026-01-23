/**
 * IndexedDB utilities for persistent storage
 * Provides a simple API for storing and retrieving data with TypeScript support
 */

export interface IDBConfig {
  name: string;
  version: number;
  stores: IDBStoreConfig[];
}

export interface IDBStoreConfig {
  name: string;
  keyPath: string;
  indexes?: IDBIndexConfig[];
}

export interface IDBIndexConfig {
  name: string;
  keyPath: string | string[];
  unique?: boolean;
}

export class IndexedDB {
  private db: IDBDatabase | null = null;
  private config: IDBConfig;

  constructor(config: IDBConfig) {
    this.config = config;
  }

  async open(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.config.name, this.config.version);

      request.onerror = () => {
        reject(new Error(`Failed to open database: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        for (const storeConfig of this.config.stores) {
          if (!db.objectStoreNames.contains(storeConfig.name)) {
            const store = db.createObjectStore(storeConfig.name, {
              keyPath: storeConfig.keyPath
            });

            // Create indexes
            if (storeConfig.indexes) {
              for (const indexConfig of storeConfig.indexes) {
                store.createIndex(indexConfig.name, indexConfig.keyPath, {
                  unique: indexConfig.unique || false
                });
              }
            }
          }
        }
      };
    });
  }

  async put(storeName: string, value: any): Promise<void> {
    if (!this.db) throw new Error('Database not opened');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(value);

      request.onerror = () => {
        reject(new Error(`Failed to put data: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  async get<T = any>(storeName: string, key: any): Promise<T | undefined> {
    if (!this.db) throw new Error('Database not opened');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onerror = () => {
        reject(new Error(`Failed to get data: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        resolve(request.result);
      };
    });
  }

  async getAll<T = any>(storeName: string): Promise<T[]> {
    if (!this.db) throw new Error('Database not opened');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onerror = () => {
        reject(new Error(`Failed to get all data: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        resolve(request.result);
      };
    });
  }

  async delete(storeName: string, key: any): Promise<void> {
    if (!this.db) throw new Error('Database not opened');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onerror = () => {
        reject(new Error(`Failed to delete data: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  async clear(storeName: string): Promise<void> {
    if (!this.db) throw new Error('Database not opened');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onerror = () => {
        reject(new Error(`Failed to clear store: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  async getByIndex<T = any>(
    storeName: string,
    indexName: string,
    key: any
  ): Promise<T[]> {
    if (!this.db) throw new Error('Database not opened');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(key);

      request.onerror = () => {
        reject(new Error(`Failed to get by index: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        resolve(request.result);
      };
    });
  }

  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  get isOpen(): boolean {
    return this.db !== null;
  }
}
