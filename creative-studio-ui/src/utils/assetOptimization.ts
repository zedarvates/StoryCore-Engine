/**
 * Asset Optimization Utilities
 * 
 * Provides utilities for optimizing generated assets:
 * - Image compression before display
 * - Video streaming for large files
 * - Progress update debouncing
 * - Asset caching
 * 
 * Requirements: Performance
 */

/**
 * Image compression options
 */
export interface ImageCompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

/**
 * Compress an image before display
 * 
 * @param imageUrl - URL or data URL of the image
 * @param options - Compression options
 * @returns Promise resolving to compressed image data URL
 */
export async function compressImage(
  imageUrl: string,
  options: ImageCompressionOptions = {}
): Promise<string> {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.85,
    format = 'jpeg',
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      let { width, height } = img;
      
      if (width > maxWidth || height > maxHeight) {
        const aspectRatio = width / height;
        
        if (width > height) {
          width = Math.min(width, maxWidth);
          height = width / aspectRatio;
        } else {
          height = Math.min(height, maxHeight);
          width = height * aspectRatio;
        }
      }
      
      // Create canvas and draw resized image
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to compressed format
      const mimeType = `image/${format}`;
      const compressedDataUrl = canvas.toDataURL(mimeType, quality);
      
      resolve(compressedDataUrl);
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    img.src = imageUrl;
  });
}

/**
 * Check if a video should be streamed based on file size
 * 
 * @param fileSize - File size in bytes
 * @param threshold - Threshold in bytes (default: 10MB)
 * @returns True if video should be streamed
 */
export function shouldStreamVideo(fileSize: number, threshold: number = 10 * 1024 * 1024): boolean {
  return fileSize > threshold;
}

/**
 * Create a streaming video URL with range support
 * 
 * @param videoUrl - Original video URL
 * @returns Streaming-optimized URL
 */
export function createStreamingVideoUrl(videoUrl: string): string {
  // For local files, return as-is (browser handles streaming)
  if (videoUrl.startsWith('blob:') || videoUrl.startsWith('data:')) {
    return videoUrl;
  }
  
  // For remote URLs, ensure range requests are supported
  // This is a placeholder - actual implementation would depend on backend
  return videoUrl;
}

/**
 * Debounce function for progress updates
 * 
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(later, wait);
  };
}

/**
 * Asset cache for storing optimized assets
 */
class AssetCache {
  private cache: Map<string, { data: string; timestamp: number; size: number }>;
  private maxSize: number;
  private maxAge: number;
  
  constructor(maxSize: number = 50 * 1024 * 1024, maxAge: number = 3600000) {
    this.cache = new Map();
    this.maxSize = maxSize; // 50MB default
    this.maxAge = maxAge; // 1 hour default
  }
  
  /**
   * Get an asset from cache
   */
  get(key: string): string | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    // Check if entry is expired
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }
  
  /**
   * Set an asset in cache
   */
  set(key: string, data: string): void {
    const size = new Blob([data]).size;
    
    // Evict old entries if cache is full
    this.evictIfNeeded(size);
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      size,
    });
  }
  
  /**
   * Check if an asset is in cache
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }
  
  /**
   * Clear the cache
   */
  clear(): void {
    this.cache.clear();
  }
  
  /**
   * Get current cache size
   */
  getSize(): number {
    let totalSize = 0;
    for (const entry of this.cache.values()) {
      totalSize += entry.size;
    }
    return totalSize;
  }
  
  /**
   * Evict old entries if needed to make room
   */
  private evictIfNeeded(newSize: number): void {
    const currentSize = this.getSize();
    
    if (currentSize + newSize <= this.maxSize) {
      return;
    }
    
    // Sort entries by timestamp (oldest first)
    const entries = Array.from(this.cache.entries()).sort(
      (a, b) => a[1].timestamp - b[1].timestamp
    );
    
    // Evict oldest entries until we have enough space
    let freedSize = 0;
    for (const [key, entry] of entries) {
      this.cache.delete(key);
      freedSize += entry.size;
      
      if (currentSize - freedSize + newSize <= this.maxSize) {
        break;
      }
    }
  }
}

// Global asset cache instance
export const assetCache = new AssetCache();

/**
 * Get optimized image from cache or compress and cache it
 * 
 * @param imageUrl - Original image URL
 * @param options - Compression options
 * @returns Promise resolving to optimized image URL
 */
export async function getOptimizedImage(
  imageUrl: string,
  options: ImageCompressionOptions = {}
): Promise<string> {
  const cacheKey = `img:${imageUrl}:${JSON.stringify(options)}`;
  
  // Check cache first
  const cached = assetCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  
  // Compress and cache
  const compressed = await compressImage(imageUrl, options);
  assetCache.set(cacheKey, compressed);
  
  return compressed;
}

/**
 * Preload an image
 * 
 * @param imageUrl - Image URL to preload
 * @returns Promise that resolves when image is loaded
 */
export function preloadImage(imageUrl: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to preload image'));
    img.src = imageUrl;
  });
}

/**
 * Calculate estimated file size from data URL
 * 
 * @param dataUrl - Data URL
 * @returns Estimated file size in bytes
 */
export function estimateDataUrlSize(dataUrl: string): number {
  // Remove data URL prefix
  const base64 = dataUrl.split(',')[1] || dataUrl;
  
  // Calculate size (base64 is ~33% larger than binary)
  return Math.floor((base64.length * 3) / 4);
}

/**
 * Format file size for display
 * 
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
