/**
 * UndoRedoPersistence - IndexedDB-based persistence for undo/redo history
 * 
 * This service provides:
 * - Persistent storage of undo/redo history in IndexedDB
 * - Automatic restoration on page load
 * - Cleanup of old history entries
 * - Support for multiple projects/contexts
 * 
 * Requirements: 7.8
 */

import { HistoryEntry } from './UndoRedoManager';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Persisted history data structure
 */
export interface PersistedHistory<T = any> {
  id: string;
  projectId: string;
  undoStack: HistoryEntry<T>[];
  redoStack: HistoryEntry<T>[];
  savedStateId: string | null;
  lastModified: number;
}

/**
 * Configuration for persistence service
 */
export interface PersistenceConfig {
  /** Database name (default: 'undoRedoHistory') */
  dbName?: string;
  
  /** Store name (default: 'history') */
  storeName?: string;
  
  /** Database version (default: 1) */
  version?: number;
  
  /** Maximum age of history entries in days (default: 30) */
  maxAgeDays?: number;
}

// ============================================================================
// UndoRedoPersistence Class
// ============================================================================

/**
 * Service for persisting undo/redo history to IndexedDB
 * 
 * Requirements: 7.8
 * 
 * @example
 * const persistence = new UndoRedoPersistence();
 * await persistence.initialize();
 * 
 * // Save history
 * await persistence.saveHistory('project-1', undoStack, redoStack, savedStateId);
 * 
 * // Load history
 * const history = await persistence.loadHistory('project-1');
 */
export class UndoRedoPersistence {
  private db: IDBDatabase | null = null;
  private config: Required<PersistenceConfig>;

  constructor(config: PersistenceConfig = {}) {
    this.config = {
      dbName: config.dbName || 'undoRedoHistory',
      storeName: config.storeName || 'history',
      version: config.version || 1,
      maxAgeDays: config.maxAgeDays || 30
    };
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  /**
   * Initialize the IndexedDB database
   * 
   * @returns Promise that resolves when database is ready
   */
  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.config.dbName, this.config.version);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.config.storeName)) {
          const store = db.createObjectStore(this.config.storeName, {
            keyPath: 'id'
          });

          // Create indexes
          store.createIndex('projectId', 'projectId', { unique: false });
          store.createIndex('lastModified', 'lastModified', { unique: false });
        }
      };
    });
  }

  // ============================================================================
  // Save Operations
  // ============================================================================

  /**
   * Save undo/redo history to IndexedDB
   * 
   * Requirements: 7.8
   * 
   * @param projectId - Unique identifier for the project/context
   * @param undoStack - Array of undo history entries
   * @param redoStack - Array of redo history entries
   * @param savedStateId - ID of the last saved state
   * @returns Promise that resolves when save is complete
   */
  async saveHistory<T>(
    projectId: string,
    undoStack: HistoryEntry<T>[],
    redoStack: HistoryEntry<T>[],
    savedStateId: string | null
  ): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }

    const history: PersistedHistory<T> = {
      id: `history-${projectId}`,
      projectId,
      undoStack: undoStack.map(entry => ({
        ...entry,
        inverseAction: undefined // Don't persist functions
      })),
      redoStack: redoStack.map(entry => ({
        ...entry,
        inverseAction: undefined
      })),
      savedStateId,
      lastModified: Date.now()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.config.storeName], 'readwrite');
      const store = transaction.objectStore(this.config.storeName);
      const request = store.put(history);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to save history'));
    });
  }

  // ============================================================================
  // Load Operations
  // ============================================================================

  /**
   * Load undo/redo history from IndexedDB
   * 
   * Requirements: 7.8
   * 
   * @param projectId - Unique identifier for the project/context
   * @returns Promise that resolves with the persisted history, or null if not found
   */
  async loadHistory<T>(projectId: string): Promise<PersistedHistory<T> | null> {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.config.storeName], 'readonly');
      const store = transaction.objectStore(this.config.storeName);
      const request = store.get(`history-${projectId}`);

      request.onsuccess = () => {
        const result = request.result as PersistedHistory<T> | undefined;
        resolve(result || null);
      };

      request.onerror = () => reject(new Error('Failed to load history'));
    });
  }

  /**
   * Load all history entries for a project
   * 
   * @param projectId - Unique identifier for the project
   * @returns Promise that resolves with array of history entries
   */
  async loadAllHistoryForProject<T>(projectId: string): Promise<PersistedHistory<T>[]> {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.config.storeName], 'readonly');
      const store = transaction.objectStore(this.config.storeName);
      const index = store.index('projectId');
      const request = index.getAll(projectId);

      request.onsuccess = () => {
        resolve(request.result as PersistedHistory<T>[]);
      };

      request.onerror = () => reject(new Error('Failed to load project history'));
    });
  }

  // ============================================================================
  // Delete Operations
  // ============================================================================

  /**
   * Delete history for a specific project
   * 
   * @param projectId - Unique identifier for the project
   * @returns Promise that resolves when deletion is complete
   */
  async deleteHistory(projectId: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.config.storeName], 'readwrite');
      const store = transaction.objectStore(this.config.storeName);
      const request = store.delete(`history-${projectId}`);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to delete history'));
    });
  }

  /**
   * Delete all history entries
   * 
   * @returns Promise that resolves when deletion is complete
   */
  async deleteAllHistory(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.config.storeName], 'readwrite');
      const store = transaction.objectStore(this.config.storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to clear history'));
    });
  }

  // ============================================================================
  // Cleanup Operations
  // ============================================================================

  /**
   * Clean up old history entries
   * 
   * Removes entries older than maxAgeDays
   * 
   * @returns Promise that resolves with the number of deleted entries
   */
  async cleanupOldHistory(): Promise<number> {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }

    const maxAge = this.config.maxAgeDays * 24 * 60 * 60 * 1000; // Convert to milliseconds
    const cutoffTime = Date.now() - maxAge;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.config.storeName], 'readwrite');
      const store = transaction.objectStore(this.config.storeName);
      const index = store.index('lastModified');
      const request = index.openCursor(IDBKeyRange.upperBound(cutoffTime));

      let deletedCount = 0;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result as IDBCursorWithValue;

        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        } else {
          resolve(deletedCount);
        }
      };

      request.onerror = () => reject(new Error('Failed to cleanup old history'));
    });
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Check if database is initialized
   * 
   * @returns True if database is ready
   */
  isInitialized(): boolean {
    return this.db !== null;
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * Get database statistics
   * 
   * @returns Promise that resolves with statistics
   */
  async getStatistics(): Promise<{
    totalEntries: number;
    totalSize: number;
    oldestEntry: number | null;
    newestEntry: number | null;
  }> {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.config.storeName], 'readonly');
      const store = transaction.objectStore(this.config.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const entries = request.result as PersistedHistory[];
        
        const stats = {
          totalEntries: entries.length,
          totalSize: JSON.stringify(entries).length,
          oldestEntry: entries.length > 0
            ? Math.min(...entries.map(e => e.lastModified))
            : null,
          newestEntry: entries.length > 0
            ? Math.max(...entries.map(e => e.lastModified))
            : null
        };

        resolve(stats);
      };

      request.onerror = () => reject(new Error('Failed to get statistics'));
    });
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let persistenceInstance: UndoRedoPersistence | null = null;

/**
 * Get the singleton persistence instance
 * 
 * @param config - Configuration options (only used on first call)
 * @returns Persistence instance
 */
export function getPersistenceInstance(config?: PersistenceConfig): UndoRedoPersistence {
  if (!persistenceInstance) {
    persistenceInstance = new UndoRedoPersistence(config);
  }
  return persistenceInstance;
}

/**
 * Initialize the persistence service
 * 
 * @param config - Configuration options
 * @returns Promise that resolves when initialized
 */
export async function initializePersistence(config?: PersistenceConfig): Promise<UndoRedoPersistence> {
  const instance = getPersistenceInstance(config);
  await instance.initialize();
  return instance;
}
