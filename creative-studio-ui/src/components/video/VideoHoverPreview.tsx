/**
 * VideoHoverPreview Component - Hover thumbnail preview for timeline shots
 * 
 * Displays a thumbnail preview when hovering over timeline shots
 * with smooth fade animations and shot metadata.
 * 
 * @module components/video/VideoHoverPreview
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { formatTime, formatTimecode } from '../../types/video';
import './VideoHoverPreview.css';

// ============================================
// Props
// ============================================

export interface VideoHoverPreviewProps {
  /** Thumbnail image source */
  thumbnailUrl?: string;
  
  /** Shot name */
  shotName?: string;
  
  /** Shot number */
  shotNumber?: number;
  
  /** Current frame number */
  currentFrame?: number;
  
  /** Total frames */
  totalFrames?: number;
  
  /** Duration in seconds */
  duration?: number;
  
  /** Frame rate */
  frameRate?: number;
  
  /** Timestamp to display */
  timestamp?: string;
  
  /** Whether preview is visible */
  isVisible?: boolean;
  
  /** Preview position */
  position?: 'top' | 'bottom';
  
  /** X position (pixels) */
  x?: number;
  
  /** Y position (pixels) */
  y?: number;
  
  /** Custom class name */
  className?: string;
  
  /** Custom styles */
  style?: React.CSSProperties;
  
  /** Show frame number */
  showFrameNumber?: boolean;
  
  /** Show timestamp */
  showTimestamp?: boolean;
  
  /** Show shot name */
  showShotName?: boolean;
  
  /** Animation duration in ms */
  animationDuration?: number;
  
  /** Callback when preview is clicked */
  onClick?: () => void;
  
  /** Callback when preview is dismissed */
  onDismiss?: () => void;
}

// ============================================
// Default Props
// ============================================

const DEFAULT_PROPS: Partial<VideoHoverPreviewProps> = {
  currentFrame: 0,
  totalFrames: 0,
  duration: 0,
  frameRate: 30,
  isVisible: false,
  position: 'top',
  showFrameNumber: true,
  showTimestamp: true,
  showShotName: true,
  animationDuration: 150,
};

// ============================================
// Component
// ============================================

export const VideoHoverPreview: React.FC<VideoHoverPreviewProps> = (props) => {
  const {
    thumbnailUrl,
    shotName,
    shotNumber,
    currentFrame,
    totalFrames,
    duration,
    frameRate,
    isVisible,
    position,
    x,
    y,
    className,
    style,
    showFrameNumber,
    showTimestamp,
    showShotName,
    animationDuration,
    onClick,
    onDismiss,
  } = { ...DEFAULT_PROPS, ...props };
  
  // Refs
  const previewRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Handle visibility change
  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true);
    } else {
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, animationDuration);
      
      return () => {
        clearTimeout(timer);
      };
    }
  }, [isVisible, animationDuration]);
  
  // Handle mouse enter/leave
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);
  
  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    onDismiss?.();
  }, [onDismiss]);
  
  // Calculate position styles
  const positionStyle: React.CSSProperties = {
    left: x ?? 0,
    top: position === 'top' ? y ?? 0 : undefined,
    bottom: position === 'bottom' ? y ?? 0 : undefined,
  };
  
  // Generate timecode
  const timecode = formatTimecode(currentFrame ?? 0, frameRate ?? 30);
  
  // Generate timestamp string
  const timestampStr = formatTime(currentFrame ?? 0, (duration ?? 0) > 3600);
  
  // Combined class names
  const containerClassName = [
    'video-hover-preview',
    isVisible && isAnimating ? 'video-hover-preview-visible' : '',
    isHovered ? 'video-hover-preview-hovered' : '',
    position === 'bottom' ? 'video-hover-preview-bottom' : '',
    className,
  ].filter(Boolean).join(' ');
  
  // Handle click
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.();
  };
  
  // Don't render if not visible and not animating
  if (!isVisible && !isAnimating) {
    return null;
  }
  
  return (
    <div
      ref={previewRef}
      className={containerClassName}
      style={{
        ...positionStyle,
        ...style,
        '--animation-duration': `${animationDuration}ms`,
      } as React.CSSProperties}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      role="tooltip"
      aria-live="polite"
    >
      {/* Arrow pointer */}
      <div className="video-hover-preview-arrow" />
      
      {/* Main content */}
      <div className="video-hover-preview-content">
        {/* Thumbnail */}
        <div className="video-hover-preview-thumbnail">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={`Frame ${currentFrame}`}
              className="video-hover-preview-image"
              loading="eager"
            />
          ) : (
            <div className="video-hover-preview-placeholder">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
              </svg>
            </div>
          )}
          
          {/* Frame overlay */}
          {showFrameNumber && (
            <div className="video-hover-preview-frame-overlay">
              <span className="video-hover-preview-frame-number">
                {timecode}
              </span>
            </div>
          )}
        </div>
        
        {/* Info section */}
        <div className="video-hover-preview-info">
          {/* Shot name */}
          {showShotName && (shotName || shotNumber) && (
            <div className="video-hover-preview-shot">
              {shotNumber && (
                <span className="video-hover-preview-shot-number">
                  #{shotNumber}
                </span>
              )}
              {shotName && (
                <span className="video-hover-preview-shot-name">
                  {shotName}
                </span>
              )}
            </div>
          )}
          
          {/* Timestamp */}
          {showTimestamp && (
            <div className="video-hover-preview-timestamp">
              <span className="video-hover-preview-time">
                {timestampStr}
              </span>
              {totalFrames !== undefined && totalFrames > 0 && (
                <span className="video-hover-preview-frame-count">
                  / {formatTime(duration ?? 0, (duration ?? 0) > 3600)}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoHoverPreview;
