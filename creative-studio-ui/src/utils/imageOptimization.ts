/**
 * Image optimization utilities
 * Handles thumbnail generation and image compression
 */

import { LRUCache } from './memoization';

// Cache for generated thumbnails
const thumbnailCache = new LRUCache<string, string>(100);

export interface ThumbnailOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

/**
 * Generate thumbnail from image file
 */
export async function generateThumbnail(
  file: File,
  options: ThumbnailOptions = {}
): Promise<string> {
  const {
    maxWidth = 200,
    maxHeight = 200,
    quality = 0.8,
    format = 'jpeg',
  } = options;

  // Check cache
  const cacheKey = `${file.name}-${file.lastModified}-${maxWidth}x${maxHeight}`;
  const cached = thumbnailCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        try {
          const thumbnail = resizeImage(img, maxWidth, maxHeight, quality, format);
          thumbnailCache.set(cacheKey, thumbnail);
          resolve(thumbnail);
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Generate thumbnail from image URL
 */
export async function generateThumbnailFromUrl(
  url: string,
  options: ThumbnailOptions = {}
): Promise<string> {
  const {
    maxWidth = 200,
    maxHeight = 200,
    quality = 0.8,
    format = 'jpeg',
  } = options;

  // Check cache
  const cacheKey = `${url}-${maxWidth}x${maxHeight}`;
  const cached = thumbnailCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const thumbnail = resizeImage(img, maxWidth, maxHeight, quality, format);
        thumbnailCache.set(cacheKey, thumbnail);
        resolve(thumbnail);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
}

/**
 * Resize image using canvas
 */
function resizeImage(
  img: HTMLImageElement,
  maxWidth: number,
  maxHeight: number,
  quality: number,
  format: 'jpeg' | 'png' | 'webp'
): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  // Calculate dimensions maintaining aspect ratio
  let width = img.width;
  let height = img.height;

  if (width > height) {
    if (width > maxWidth) {
      height = (height * maxWidth) / width;
      width = maxWidth;
    }
  } else {
    if (height > maxHeight) {
      width = (width * maxHeight) / height;
      height = maxHeight;
    }
  }

  canvas.width = width;
  canvas.height = height;

  // Use better image smoothing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Draw image
  ctx.drawImage(img, 0, 0, width, height);

  // Convert to data URL
  const mimeType = format === 'png' ? 'image/png' : `image/${format}`;
  return canvas.toDataURL(mimeType, quality);
}

/**
 * Compress image file
 */
export async function compressImage(
  file: File,
  maxSizeMB: number = 1,
  options: ThumbnailOptions = {}
): Promise<Blob> {
  const { quality = 0.8, format = 'jpeg' } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            throw new Error('Could not get canvas context');
          }

          // Start with original dimensions
          let width = img.width;
          let height = img.height;
          let currentQuality = quality;

          // Function to create blob and check size
          const createBlob = (q: number): Promise<Blob | null> => {
            canvas.width = width;
            canvas.height = height;

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);

            return new Promise((res) => {
              canvas.toBlob(
                (blob) => res(blob),
                format === 'png' ? 'image/png' : `image/${format}`,
                q
              );
            });
          };

          // Iteratively reduce quality/size until under limit
          const compress = async () => {
            const blob = await createBlob(currentQuality);

            if (!blob) {
              reject(new Error('Failed to create blob'));
              return;
            }

            const sizeMB = blob.size / (1024 * 1024);

            if (sizeMB <= maxSizeMB || currentQuality <= 0.1) {
              resolve(blob);
              return;
            }

            // Reduce quality
            currentQuality -= 0.1;

            // If quality is too low, reduce dimensions
            if (currentQuality < 0.3) {
              width = Math.floor(width * 0.9);
              height = Math.floor(height * 0.9);
              currentQuality = quality;
            }

            compress();
          };

          compress();
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Preload images
 */
export function preloadImages(urls: string[]): Promise<void[]> {
  return Promise.all(
    urls.map(
      (url) =>
        new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => reject(new Error(`Failed to load ${url}`));
          img.src = url;
        })
    )
  );
}

/**
 * Clear thumbnail cache
 */
export function clearThumbnailCache(): void {
  thumbnailCache.clear();
}
