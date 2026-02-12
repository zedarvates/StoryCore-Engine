/**
 * Thumbnail Cache Utility
 * 
 * Manages thumbnail caching using IndexedDB for offline access.
 * Requirements: 5.3
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Database schema
interface ThumbnailDB extends DBSchema {
  thumbnails: {
    key: string;
    value: {
      url: string;
      blob: Blob;
      timestamp: number;
    };
  };
}

const DB_NAME = 'sequence-editor-thumbnails';
const DB_VERSION = 1;
const STORE_NAME = 'thumbnails';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

let dbPromise: Promise<IDBPDatabase<ThumbnailDB>> | null = null;

/**
 * Initialize the IndexedDB database
 */
async function getDB(): Promise<IDBPDatabase<ThumbnailDB>> {
  if (!dbPromise) {
    dbPromise = openDB<ThumbnailDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      },
    });
  }
  return dbPromise;
}

/**
 * Cache a thumbnail in IndexedDB
 */
export async function cacheThumbnail(url: string, blob: Blob): Promise<void> {
  try {
    const db = await getDB();
    await db.put(STORE_NAME, {
      url,
      blob,
      timestamp: Date.now(),
    }, url);
  } catch (error) {
    console.error('Failed to cache thumbnail:', error);
  }
}

/**
 * Get a cached thumbnail from IndexedDB
 */
export async function getCachedThumbnail(url: string): Promise<string | null> {
  try {
    const db = await getDB();
    const cached = await db.get(STORE_NAME, url);
    
    if (!cached) {
      return null;
    }
    
    // Check if cache is expired
    const age = Date.now() - cached.timestamp;
    if (age > CACHE_DURATION) {
      // Remove expired cache
      await db.delete(STORE_NAME, url);
      return null;
    }
    
    // Convert blob to object URL
    return URL.createObjectURL(cached.blob);
  } catch (error) {
    console.error('Failed to get cached thumbnail:', error);
    return null;
  }
}

/**
 * Fetch and cache a thumbnail
 */
export async function fetchAndCacheThumbnail(url: string): Promise<string> {
  try {
    // Check cache first
    const cached = await getCachedThumbnail(url);
    if (cached) {
      return cached;
    }
    
    // Check if URL is a local file path or data URL
    if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('file:')) {
      // Don't try to fetch local URLs, just return them
      return url;
    }
    
    // Check if URL is relative or absolute
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      // Relative URL - might not be accessible in offline mode
      // Return as-is and let the browser handle it
      return url;
    }
    
    // Fetch from network (only for http/https URLs)
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch thumbnail: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    
    // Cache the blob
    await cacheThumbnail(url, blob);
    
    // Return object URL
    return URL.createObjectURL(blob);
  } catch (error) {
    // Silently fail in offline mode - don't log errors for expected failures
    // Only log if it's not a network error
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      // Network error in offline mode - expected, don't log
    } else {
      console.warn('Thumbnail fetch failed, using fallback:', error);
    }
    // Return original URL as fallback
    return url;
  }
}

/**
 * Clear all cached thumbnails
 */
export async function clearThumbnailCache(): Promise<void> {
  try {
    const db = await getDB();
    await db.clear(STORE_NAME);
  } catch (error) {
    console.error('Failed to clear thumbnail cache:', error);
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  count: number;
  size: number;
}> {
  try {
    const db = await getDB();
    const keys = await db.getAllKeys(STORE_NAME);
    const values = await db.getAll(STORE_NAME);
    
    const size = values.reduce((total, item) => total + item.blob.size, 0);
    
    return {
      count: keys.length,
      size,
    };
  } catch (error) {
    console.error('Failed to get cache stats:', error);
    return { count: 0, size: 0 };
  }
}
