import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface VideoThumbnailPreviewProps {
  videoUrl: string;
  time: number;
  width?: number;
  height?: number;
  mouseX?: number;
  mouseY?: number;
  visible?: boolean;
  onThumbnailGenerated?: (blob: Blob) => void;
}

// Simple in-memory cache for thumbnails
class ThumbnailCache {
  private cache: Map<string, string> = new Map();
  private maxSize: number = 50;

  generateKey(videoUrl: string, time: number): string {
    return `${videoUrl}:${Math.floor(time * 10) / 10}`; // Round to 0.1s precision
  }

  get(videoUrl: string, time: number): string | null {
    const key = this.generateKey(videoUrl, time);
    return this.cache.get(key) || null;
  }

  set(videoUrl: string, time: number, thumbnailUrl: string): void {
    const key = this.generateKey(videoUrl, time);
    
    // LRU eviction if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      const oldUrl = this.cache.get(firstKey);
      if (oldUrl) {
        URL.revokeObjectURL(oldUrl);
      }
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, thumbnailUrl);
  }

  clear(): void {
    // Revoke all object URLs
    this.cache.forEach((url) => {
      URL.revokeObjectURL(url);
    });
    this.cache.clear();
  }
}

// Singleton cache instance
const thumbnailCache = new ThumbnailCache();

export const VideoThumbnailPreview: React.FC<VideoThumbnailPreviewProps> = ({
  videoUrl,
  time,
  width = 160,
  height = 90,
  mouseX = 0,
  mouseY = 0,
  visible = true,
  onThumbnailGenerated,
}) => {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Format timecode
  const formatTimecode = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  }, []);

  // Generate thumbnail
  const generateThumbnail = useCallback(async () => {
    // Check cache first
    const cachedUrl = thumbnailCache.get(videoUrl, time);
    if (cachedUrl) {
      setThumbnailUrl(cachedUrl);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Create video element if not exists
      if (!videoRef.current) {
        videoRef.current = document.createElement('video');
        videoRef.current.crossOrigin = 'anonymous';
        videoRef.current.preload = 'metadata';
      }

      // Create canvas if not exists
      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas');
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;

      // Set video source if changed
      if (video.src !== videoUrl) {
        video.src = videoUrl;
      }

      // Wait for video to load metadata
      await new Promise<void>((resolve, reject) => {
        const handleLoadedMetadata = () => {
          video.removeEventListener('loadedmetadata', handleLoadedMetadata);
          resolve();
        };

        const handleError = () => {
          video.removeEventListener('error', handleError);
          reject(new Error('Failed to load video'));
        };

        if (video.readyState >= 1) {
          resolve();
        } else {
          video.addEventListener('loadedmetadata', handleLoadedMetadata);
          video.addEventListener('error', handleError);
        }
      });

      // Seek to time
      video.currentTime = time;

      // Wait for seek to complete
      await new Promise<void>((resolve, reject) => {
        const handleSeeked = () => {
          video.removeEventListener('seeked', handleSeeked);
          resolve();
        };

        const handleError = () => {
          video.removeEventListener('error', handleError);
          reject(new Error('Failed to seek video'));
        };

        video.addEventListener('seeked', handleSeeked);
        video.addEventListener('error', handleError);

        // Timeout after 5 seconds
        setTimeout(() => {
          video.removeEventListener('seeked', handleSeeked);
          video.removeEventListener('error', handleError);
          reject(new Error('Seek timeout'));
        }, 5000);
      });

      // Draw frame to canvas
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      // Calculate aspect ratio
      const videoAspect = video.videoWidth / video.videoHeight;
      const canvasAspect = width / height;

      let drawWidth = width;
      let drawHeight = height;
      let offsetX = 0;
      let offsetY = 0;

      if (videoAspect > canvasAspect) {
        // Video is wider
        drawHeight = width / videoAspect;
        offsetY = (height - drawHeight) / 2;
      } else {
        // Video is taller
        drawWidth = height * videoAspect;
        offsetX = (width - drawWidth) / 2;
      }

      // Clear canvas
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, width, height);

      // Draw video frame
      ctx.drawImage(video, offsetX, offsetY, drawWidth, drawHeight);

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create blob'));
            }
          },
          'image/jpeg',
          0.8
        );
      });

      // Create object URL
      const url = URL.createObjectURL(blob);
      setThumbnailUrl(url);

      // Cache the thumbnail
      thumbnailCache.set(videoUrl, time, url);

      // Notify parent
      onThumbnailGenerated?.(blob);

      setIsLoading(false);
    } catch (err) {
      console.error('Failed to generate thumbnail:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsLoading(false);
    }
  }, [videoUrl, time, width, height, onThumbnailGenerated]);

  // Generate thumbnail when props change
  useEffect(() => {
    if (visible) {
      generateThumbnail();
    }
  }, [visible, generateThumbnail]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (thumbnailUrl && !thumbnailCache.get(videoUrl, time)) {
        URL.revokeObjectURL(thumbnailUrl);
      }
    };
  }, [thumbnailUrl, videoUrl, time]);

  if (!visible) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.15 }}
        className="fixed z-50 pointer-events-none"
        style={{
          left: mouseX + 10,
          top: mouseY - height - 40,
        }}
      >
        <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl overflow-hidden">
          {/* Thumbnail */}
          <div
            className="relative bg-black"
            style={{ width, height }}
          >
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              </div>
            )}

            {error && (
              <div className="absolute inset-0 flex items-center justify-center p-2">
                <div className="text-center">
                  <div className="text-red-500 text-2xl mb-1">⚠️</div>
                  <p className="text-xs text-gray-400">Erreur</p>
                </div>
              </div>
            )}

            {thumbnailUrl && !isLoading && !error && (
              <img
                src={thumbnailUrl}
                alt="Video preview"
                className="w-full h-full object-contain"
              />
            )}
          </div>

          {/* Timecode */}
          <div className="px-2 py-1 bg-gray-800 border-t border-gray-700">
            <span className="text-xs font-mono text-gray-300">
              {formatTimecode(time)}
            </span>
          </div>
        </div>

        {/* Arrow pointing down */}
        <div
          className="absolute left-1/2 -translate-x-1/2 w-0 h-0"
          style={{
            bottom: -8,
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderTop: '8px solid #374151', // gray-700
          }}
        />
      </motion.div>
    </AnimatePresence>
  );
};

// Hook for using thumbnail preview
export const useVideoThumbnailPreview = () => {
  const [previewState, setPreviewState] = useState<{
    visible: boolean;
    videoUrl: string;
    time: number;
    mouseX: number;
    mouseY: number;
  }>({
    visible: false,
    videoUrl: '',
    time: 0,
    mouseX: 0,
    mouseY: 0,
  });

  const showPreview = useCallback(
    (videoUrl: string, time: number, mouseX: number, mouseY: number) => {
      setPreviewState({
        visible: true,
        videoUrl,
        time,
        mouseX,
        mouseY,
      });
    },
    []
  );

  const hidePreview = useCallback(() => {
    setPreviewState((prev) => ({ ...prev, visible: false }));
  }, []);

  const updatePosition = useCallback((mouseX: number, mouseY: number) => {
    setPreviewState((prev) => ({ ...prev, mouseX, mouseY }));
  }, []);

  return {
    previewState,
    showPreview,
    hidePreview,
    updatePosition,
  };
};

export default VideoThumbnailPreview;
