/**
 * Image Loader Service
 * 
 * Handles efficient image loading with caching and mipmap generation
 * Optimizes performance for high-resolution images in the grid editor
 * Supports progressive loading for better user experience
 * 
 * Validates Requirements: 13.1, 13.2, 13.3
 */

/**
 * Image data with metadata
 */
export interface ImageData {
  image: HTMLImageElement;
  width: number;
  height: number;
  url: string;
  level: number; // Mipmap level (0 = full resolution)
}

/**
 * Progressive loading callback
 */
export type ProgressiveLoadCallback = (imageData: ImageData) => void;

/**
 * Mipmap level configuration
 */
export interface MipmapConfig {
  maxLevels: number; // Maximum number of mipmap levels
  minSize: number; // Minimum dimension size for mipmaps
  quality: number; // JPEG quality for compressed mipmaps (0-1)
}

/**
 * Image loader configuration
 */
export interface ImageLoaderConfig {
  cacheSize: number; // Maximum number of images to cache
  preloadDistance: number; // Distance threshold for preloading
  mipmap: MipmapConfig;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: ImageLoaderConfig = {
  cacheSize: 100,
  preloadDistance: 2, // Preload images within 2 panels
  mipmap: {
    maxLevels: 5,
    minSize: 64,
    quality: 0.9,
  },
};

/**
 * Cache entry with LRU tracking
 */
interface CacheEntry {
  data: ImageData;
  lastAccessed: number;
  size: number; // Approximate memory size in bytes
}

/**
 * Mipmap cache entry
 */
interface MipmapCacheEntry {
  mipmaps: ImageData[];
  lastAccessed: number;
  totalSize: number;
}

/**
 * Image Loader Service Class
 * 
 * Provides methods for:
 * - Image loading with caching
 * - Mipmap generation for high-resolution images
 * - Automatic mipmap selection based on zoom level
 * - Preloading for visible panels
 */
export class ImageLoaderService {
  private config: ImageLoaderConfig;
  private cache: Map<string, CacheEntry>;
  private mipmapCache: Map<string, MipmapCacheEntry>;
  private loadingPromises: Map<string, Promise<HTMLImageElement>>;
  private totalCacheSize: number;
  private maxCacheSize: number;

  constructor(config?: Partial<ImageLoaderConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.cache = new Map();
    this.mipmapCache = new Map();
    this.loadingPromises = new Map();
    this.totalCacheSize = 0;
    this.maxCacheSize = 500 * 1024 * 1024; // 500MB default max cache size
  }

  /**
   * Load image from URL
   * Validates Requirement 13.1
   * 
   * @param url - Image URL to load
   * @returns Loaded image element
   */
  async loadImage(url: string): Promise<HTMLImageElement> {
    // Check cache first
    const cached = this.cache.get(url);
    if (cached) {
      cached.lastAccessed = Date.now();
      return cached.data.image;
    }

    // Check if already loading
    const existingPromise = this.loadingPromises.get(url);
    if (existingPromise) {
      return existingPromise;
    }

    // Start loading
    const promise = this.loadImageInternal(url);
    this.loadingPromises.set(url, promise);

    try {
      const image = await promise;
      this.loadingPromises.delete(url);

      // Add to cache
      const imageData: ImageData = {
        image,
        width: image.naturalWidth,
        height: image.naturalHeight,
        url,
        level: 0,
      };

      const size = this.estimateImageSize(image);
      this.addToCache(url, imageData, size);

      return image;
    } catch (error) {
      this.loadingPromises.delete(url);
      throw error;
    }
  }

  /**
   * Load image with mipmaps for efficient rendering at different zoom levels
   * Validates Requirements 13.1, 13.2
   * 
   * @param url - Image URL to load
   * @returns Array of mipmap levels (0 = full resolution)
   */
  async loadImageWithMipmaps(url: string): Promise<ImageData[]> {
    // Check mipmap cache first
    const cached = this.mipmapCache.get(url);
    if (cached) {
      cached.lastAccessed = Date.now();
      return cached.mipmaps;
    }

    // Load original image
    const originalImage = await this.loadImage(url);

    // Generate mipmaps
    const mipmaps = await this.generateMipmaps(originalImage, this.config.mipmap.maxLevels);

    // Add to mipmap cache
    const totalSize = mipmaps.reduce(
      (sum, mipmap) => sum + this.estimateImageSize(mipmap.image),
      0
    );

    this.mipmapCache.set(url, {
      mipmaps,
      lastAccessed: Date.now(),
      totalSize,
    });

    return mipmaps;
  }

  /**
   * Generate mipmap levels for an image
   * Validates Requirement 13.2
   * 
   * @param image - Source image
   * @param levels - Number of mipmap levels to generate
   * @returns Array of mipmap image data
   */
  async generateMipmaps(
    image: HTMLImageElement,
    levels: number
  ): Promise<ImageData[]> {
    const mipmaps: ImageData[] = [];

    // Level 0 is the original image
    mipmaps.push({
      image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      url: image.src,
      level: 0,
    });

    let currentWidth = image.naturalWidth;
    let currentHeight = image.naturalHeight;

    // Generate downscaled versions
    for (let level = 1; level < levels; level++) {
      // Halve dimensions for each level
      currentWidth = Math.max(this.config.mipmap.minSize, Math.floor(currentWidth / 2));
      currentHeight = Math.max(this.config.mipmap.minSize, Math.floor(currentHeight / 2));

      // Stop if we've reached minimum size
      if (
        currentWidth === this.config.mipmap.minSize &&
        currentHeight === this.config.mipmap.minSize
      ) {
        break;
      }

      // Create downscaled image
      const mipmapImage = await this.createDownscaledImage(
        image,
        currentWidth,
        currentHeight
      );

      mipmaps.push({
        image: mipmapImage,
        width: currentWidth,
        height: currentHeight,
        url: image.src,
        level,
      });
    }

    return mipmaps;
  }

  /**
   * Get appropriate mipmap level for current zoom
   * Validates Requirement 13.3
   * 
   * @param imageUrl - Image URL
   * @param zoom - Current zoom level (1.0 = 100%)
   * @returns Best mipmap for the zoom level
   */
  async getMipmapForZoom(imageUrl: string, zoom: number): Promise<ImageData> {
    // Load mipmaps if not cached
    const mipmaps = await this.loadImageWithMipmaps(imageUrl);

    // Select appropriate mipmap based on zoom
    // At zoom 1.0, use full resolution (level 0)
    // At zoom 0.5, use level 1 (half resolution)
    // At zoom 0.25, use level 2 (quarter resolution), etc.

    const targetLevel = Math.max(0, Math.floor(-Math.log2(zoom)));
    const selectedLevel = Math.min(targetLevel, mipmaps.length - 1);

    return mipmaps[selectedLevel];
  }

  /**
   * Preload images for visible panels
   * Validates Requirement 13.3
   * 
   * @param urls - Array of image URLs to preload
   * @returns Promise that resolves when all images are loaded
   */
  async preloadImages(urls: string[]): Promise<void> {
    const promises = urls.map((url) => this.loadImage(url).catch(() => {
      // Ignore errors during preload
      console.warn(`Failed to preload image: ${url}`);
    }));

    await Promise.all(promises);
  }

  /**
   * Load image progressively with low-resolution preview first
   * Validates Requirements 13.1, 13.2, 13.3
   * 
   * This method provides a better user experience by:
   * 1. Loading a low-resolution preview first (fast)
   * 2. Progressively loading higher resolutions
   * 3. Calling the callback for each resolution level
   * 
   * @param url - Image URL to load
   * @param onProgress - Callback called for each resolution level loaded
   * @returns Promise that resolves with full-resolution image
   */
  async loadImageProgressively(
    url: string,
    onProgress?: ProgressiveLoadCallback
  ): Promise<ImageData> {
    // Load full image first (to generate mipmaps)
    const fullImage = await this.loadImage(url);

    // Generate mipmaps
    const mipmaps = await this.generateMipmaps(fullImage, this.config.mipmap.maxLevels);

    // Call progress callback with each mipmap level, starting from lowest resolution
    if (onProgress) {
      // Start with lowest resolution (highest level number)
      for (let i = mipmaps.length - 1; i >= 0; i--) {
        onProgress(mipmaps[i]);
        
        // Small delay to allow rendering
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 16)); // ~60fps
        }
      }
    }

    // Return full resolution image
    return mipmaps[0];
  }

  /**
   * Load multiple images progressively
   * Validates Requirements 13.1, 13.2, 13.3
   * 
   * Loads images in priority order, showing low-res previews first
   * 
   * @param urls - Array of image URLs to load
   * @param onProgress - Callback called for each image and resolution level
   * @returns Promise that resolves when all images are loaded
   */
  async loadImagesProgressively(
    urls: string[],
    onProgress?: (url: string, imageData: ImageData) => void
  ): Promise<Map<string, ImageData>> {
    const results = new Map<string, ImageData>();

    // Load all images progressively
    await Promise.all(
      urls.map(async (url) => {
        try {
          const imageData = await this.loadImageProgressively(url, (data) => {
            if (onProgress) {
              onProgress(url, data);
            }
          });
          results.set(url, imageData);
        } catch (error) {
          console.error(`Failed to load image progressively: ${url}`, error);
        }
      })
    );

    return results;
  }

  /**
   * Preload images with progressive loading
   * Validates Requirements 13.1, 13.2, 13.3
   * 
   * Similar to preloadImages but uses progressive loading for better UX
   * 
   * @param urls - Array of image URLs to preload
   * @param onProgress - Optional callback for progress updates
   * @returns Promise that resolves when all images are loaded
   */
  async preloadImagesProgressively(
    urls: string[],
    onProgress?: (url: string, imageData: ImageData) => void
  ): Promise<void> {
    await this.loadImagesProgressively(urls, onProgress);
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.cache.clear();
    this.mipmapCache.clear();
    this.totalCacheSize = 0;
  }

  /**
   * Clear cache for specific URL
   * 
   * @param url - Image URL to remove from cache
   */
  clearCacheForUrl(url: string): void {
    const cached = this.cache.get(url);
    if (cached) {
      this.totalCacheSize -= cached.size;
      this.cache.delete(url);
    }

    this.mipmapCache.delete(url);
  }

  /**
   * Get cache statistics
   * 
   * @returns Cache statistics
   */
  getCacheStats(): {
    imageCount: number;
    mipmapCount: number;
    totalSize: number;
    maxSize: number;
  } {
    return {
      imageCount: this.cache.size,
      mipmapCount: this.mipmapCache.size,
      totalSize: this.totalCacheSize,
      maxSize: this.maxCacheSize,
    };
  }

  /**
   * Internal image loading implementation
   * 
   * @param url - Image URL to load
   * @returns Loaded image element
   */
  private loadImageInternal(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();

      image.onload = () => {
        resolve(image);
      };

      image.onerror = () => {
        reject(new Error(`Failed to load image: ${url}`));
      };

      // Enable CORS if needed
      image.crossOrigin = 'anonymous';
      image.src = url;
    });
  }

  /**
   * Create downscaled version of an image
   * 
   * @param image - Source image
   * @param width - Target width
   * @param height - Target height
   * @returns Downscaled image
   */
  private async createDownscaledImage(
    image: HTMLImageElement,
    width: number,
    height: number
  ): Promise<HTMLImageElement> {
    // Create canvas for downscaling
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    // Use high-quality image smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Draw downscaled image
    ctx.drawImage(image, 0, 0, width, height);

    // Convert canvas to image
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to create blob'));
            return;
          }

          const url = URL.createObjectURL(blob);
          const downscaledImage = new Image();

          downscaledImage.onload = () => {
            URL.revokeObjectURL(url);
            resolve(downscaledImage);
          };

          downscaledImage.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load downscaled image'));
          };

          downscaledImage.src = url;
        },
        'image/jpeg',
        this.config.mipmap.quality
      );
    });
  }

  /**
   * Add image to cache with LRU eviction
   * 
   * @param url - Image URL
   * @param data - Image data
   * @param size - Estimated size in bytes
   */
  private addToCache(url: string, data: ImageData, size: number): void {
    // Evict old entries if cache is full
    while (
      this.totalCacheSize + size > this.maxCacheSize &&
      this.cache.size > 0
    ) {
      this.evictLRU();
    }

    // Add to cache
    this.cache.set(url, {
      data,
      lastAccessed: Date.now(),
      size,
    });

    this.totalCacheSize += size;
  }

  /**
   * Evict least recently used cache entry
   */
  private evictLRU(): void {
    let oldestUrl: string | null = null;
    let oldestTime = Infinity;

    for (const [url, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestUrl = url;
      }
    }

    if (oldestUrl) {
      const entry = this.cache.get(oldestUrl);
      if (entry) {
        this.totalCacheSize -= entry.size;
        this.cache.delete(oldestUrl);
      }
    }
  }

  /**
   * Estimate memory size of an image
   * 
   * @param image - Image element
   * @returns Estimated size in bytes
   */
  private estimateImageSize(image: HTMLImageElement): number {
    // Estimate: width * height * 4 bytes per pixel (RGBA)
    return image.naturalWidth * image.naturalHeight * 4;
  }

  /**
   * Update service configuration
   * 
   * @param config - New configuration
   */
  updateConfig(config: Partial<ImageLoaderConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   * 
   * @returns Current configuration
   */
  getConfig(): ImageLoaderConfig {
    return { ...this.config };
  }

  /**
   * Set maximum cache size
   * 
   * @param sizeInBytes - Maximum cache size in bytes
   */
  setMaxCacheSize(sizeInBytes: number): void {
    this.maxCacheSize = sizeInBytes;

    // Evict entries if current size exceeds new limit
    while (this.totalCacheSize > this.maxCacheSize && this.cache.size > 0) {
      this.evictLRU();
    }
  }
}

/**
 * Default image loader service instance
 */
export const imageLoader = new ImageLoaderService();
