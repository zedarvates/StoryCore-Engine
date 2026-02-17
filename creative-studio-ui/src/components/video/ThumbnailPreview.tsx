/**
 * ThumbnailPreview Component
 * 
 * Displays a video thumbnail with loading state and error handling
 * Uses the ThumbnailCache system for efficient loading
 * 
 * Validates: Requirement 5.6
 */

import React from 'react';
import { useVideoThumbnail } from '../../hooks/useThumbnailCache';
import './ThumbnailPreview.css';

export interface ThumbnailPreviewProps {
  videoUrl: string;
  time: number;
  width?: number;
  height?: number;
  quality?: 'low' | 'medium' | 'high';
  preloadAdjacent?: boolean;
  framerate?: number;
  className?: string;
  alt?: string;
}

/**
 * ThumbnailPreview component with cache integration
 * Validates: Requirement 5.6
 */
export const ThumbnailPreview: React.FC<ThumbnailPreviewProps> = ({
  videoUrl,
  time,
  width = 160,
  height = 90,
  quality = 'medium',
  preloadAdjacent = false,
  framerate = 30,
  className = '',
  alt = 'Video thumbnail'
}) => {
  const { thumbnailUrl, isLoading, error, reload } = useVideoThumbnail(videoUrl, time, {
    quality,
    preloadAdjacent,
    framerate
  });

  if (error) {
    return (
      <div
        className={`thumbnail-preview thumbnail-error ${className}`}
        style={{ width, height }}
      >
        <div className="error-content">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p>Failed to load thumbnail</p>
          <button onClick={reload} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (isLoading || !thumbnailUrl) {
    return (
      <div
        className={`thumbnail-preview thumbnail-loading ${className}`}
        style={{ width, height }}
      >
        <div className="loading-spinner">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="spinner"
          >
            <circle cx="12" cy="12" r="10" opacity="0.25" />
            <path
              d="M12 2 A10 10 0 0 1 22 12"
              opacity="0.75"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <img
      src={thumbnailUrl}
      alt={alt}
      width={width}
      height={height}
      className={`thumbnail-preview ${className}`}
      loading="lazy"
    />
  );
};

/**
 * Skeleton loader for thumbnail
 */
export const ThumbnailSkeleton: React.FC<{
  width?: number;
  height?: number;
  className?: string;
}> = ({ width = 160, height = 90, className = '' }) => {
  return (
    <div
      className={`thumbnail-skeleton ${className}`}
      style={{ width, height }}
    >
      <div className="skeleton-shimmer" />
    </div>
  );
};
