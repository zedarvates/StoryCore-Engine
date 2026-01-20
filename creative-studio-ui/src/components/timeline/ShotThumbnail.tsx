/**
 * ShotThumbnail - Async thumbnail loading component with caching
 * Integrates with ThumbnailCache for efficient loading
 */

import { memo, useEffect, useState } from 'react';
import { useThumbnailCache } from '@/utils/indexeddb/useThumbnailCache';

interface ShotThumbnailProps {
  videoUrl?: string;
  imageUrl?: string;
  timestamp?: number;
  alt: string;
  className?: string;
}

export const ShotThumbnail = memo<ShotThumbnailProps>(({
  videoUrl,
  imageUrl,
  timestamp = 0,
  alt,
  className = ''
}) => {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(imageUrl || null);
  const [isLoading, setIsLoading] = useState(!imageUrl);

  // Use thumbnail cache for video thumbnails
  const { data: cachedThumbnail, loading: cacheLoading } = useThumbnailCache(
    videoUrl || '',
    timestamp,
    {
      preloadAdjacent: true,
      adjacentCount: 3
    }
  );

  useEffect(() => {
    // If we have an image URL, use it directly
    if (imageUrl) {
      setThumbnailUrl(imageUrl);
      setIsLoading(false);
      return;
    }

    // If we have a cached thumbnail from video, use it
    if (cachedThumbnail && cachedThumbnail.blob) {
      const url = URL.createObjectURL(cachedThumbnail.blob);
      setThumbnailUrl(url);
      setIsLoading(false);

      // Cleanup blob URL on unmount
      return () => {
        URL.revokeObjectURL(url);
      };
    }

    // Update loading state
    setIsLoading(cacheLoading);
  }, [imageUrl, cachedThumbnail, cacheLoading]);

  if (isLoading) {
    return (
      <div className={`${className} animate-pulse bg-gray-700`}>
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gray-500 border-t-gray-300 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!thumbnailUrl) {
    return (
      <div className={`${className} bg-gray-800 flex items-center justify-center`}>
        <svg
          className="w-8 h-8 text-gray-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
      </div>
    );
  }

  return (
    <img
      src={thumbnailUrl}
      alt={alt}
      className={`${className} object-cover`}
      loading="lazy"
    />
  );
}, (prevProps, nextProps) => {
  // Custom comparison for memo optimization
  return (
    prevProps.videoUrl === nextProps.videoUrl &&
    prevProps.imageUrl === nextProps.imageUrl &&
    prevProps.timestamp === nextProps.timestamp &&
    prevProps.alt === nextProps.alt
  );
});

ShotThumbnail.displayName = 'ShotThumbnail';
