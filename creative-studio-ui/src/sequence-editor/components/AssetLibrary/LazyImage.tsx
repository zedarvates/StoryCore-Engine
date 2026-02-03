/**
 * Lazy Image Component
 * 
 * Lazy loads images using Intersection Observer and caches them in IndexedDB.
 * Requirements: 5.3
 */

import React, { useState, useEffect, useRef } from 'react';
import { fetchAndCacheThumbnail } from '../../utils/thumbnailCache';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  onError?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className = '',
  onError,
}) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    // Create Intersection Observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Load image when it enters viewport
            loadImage();
            // Stop observing once loaded
            if (observerRef.current && imgRef.current) {
              observerRef.current.unobserve(imgRef.current);
            }
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before entering viewport
        threshold: 0.01,
      }
    );

    // Start observing
    if (imgRef.current) {
      observerRef.current.observe(imgRef.current);
    }

    // Cleanup
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [src]);

  const loadImage = async () => {
    try {
      setIsLoading(true);
      setHasError(false);
      
      // Fetch and cache the thumbnail
      const cachedSrc = await fetchAndCacheThumbnail(src);
      setImageSrc(cachedSrc);
    } catch (error) {
      console.error('Failed to load image:', error);
      setHasError(true);
      setImageSrc(src); // Fallback to original src
    } finally {
      setIsLoading(false);
    }
  };

  const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setHasError(true);
    setIsLoading(false);
    
    // Call custom error handler if provided
    if (onError) {
      onError(e);
    } else {
      // Default fallback
      (e.target as HTMLImageElement).src = 'data:image/svg+xml,' + encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="150" height="150" viewBox="0 0 150 150">
          <rect fill="#3a3a3a" width="150" height="150"/>
          <text fill="#666" font-family="sans-serif" font-size="14" x="50%" y="50%" text-anchor="middle" dy=".3em">No Preview</text>
        </svg>
      `);
    }
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  return (
    <div className={`lazy-image-container ${className}`} ref={imgRef as any}>
      {isLoading && !imageSrc && (
        <div className="lazy-image-placeholder">
          <div className="lazy-image-spinner" />
        </div>
      )}
      {imageSrc && (
        <img
          src={imageSrc}
          alt={alt}
          className={`lazy-image ${isLoading ? 'loading' : 'loaded'}`}
          onLoad={handleLoad}
          onError={handleError}
        />
      )}
    </div>
  );
};

export default LazyImage;
