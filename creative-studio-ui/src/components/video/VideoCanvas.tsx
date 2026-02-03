/**
 * VideoCanvas Component - HTML5 Canvas-based video renderer
 * 
 * Renders video frames to canvas with:
 * - Responsive sizing
 * - Frame-accurate rendering
 * - Hardware acceleration support
 * - Custom filters and effects
 * 
 * @module components/video/VideoCanvas
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useVideoPlayer } from '../../hooks/useVideoPlayer';
import { formatTime, formatTimecode } from '../../types/video';
import './VideoCanvas.css';

// ============================================
// Props
// ============================================

export interface VideoCanvasProps {
  /** Video source element */
  videoElement?: HTMLVideoElement | null;
  
  /** Whether to auto-initialize with video element */
  autoInitialize?: boolean;
  
  /** CSS class name */
  className?: string;
  
  /** Whether to maintain aspect ratio */
  maintainAspectRatio?: boolean;
  
  /** Object fit mode */
  objectFit?: 'contain' | 'cover' | 'fill';
  
  /** Background color */
  backgroundColor?: string;
  
  /** Enable hardware acceleration */
  enableHardwareAcceleration?: boolean;
  
  /** Custom CSS styles */
  style?: React.CSSProperties;
  
  /** Show loading indicator */
  showLoadingIndicator?: boolean;
  
  /** Show play button overlay when paused */
  showPlayButton?: boolean;
  
  /** Custom play button render */
  renderPlayButton?: (isPlaying: boolean) => React.ReactNode;
  
  /** Time display format */
  timeFormat?: 'time' | 'timecode' | 'frames' | 'none';
  
  /** Show frame number */
  showFrameNumber?: boolean;
  
  /** Callback when canvas is ready */
  onReady?: (canvas: HTMLCanvasElement) => void;
  
  /** Callback on click */
  onClick?: () => void;
  
  /** Callback on double click */
  onDoubleClick?: () => void;
  
  /** Children to render (replaces default overlay) */
  children?: React.ReactNode;
}

// ============================================
// Default Props
// ============================================

const DEFAULT_PROPS: Partial<VideoCanvasProps> = {
  autoInitialize: true,
  maintainAspectRatio: true,
  objectFit: 'contain',
  backgroundColor: '#000000',
  enableHardwareAcceleration: true,
  showLoadingIndicator: true,
  showPlayButton: true,
  timeFormat: 'timecode',
  showFrameNumber: true,
};

// ============================================
// Component
// ============================================

export const VideoCanvas: React.FC<VideoCanvasProps> = (props) => {
  const {
    videoElement,
    autoInitialize,
    className,
    maintainAspectRatio,
    objectFit,
    backgroundColor,
    enableHardwareAcceleration,
    style,
    showLoadingIndicator,
    showPlayButton,
    renderPlayButton,
    timeFormat,
    showFrameNumber,
    onReady,
    onClick,
    onDoubleClick,
    children,
  } = { ...DEFAULT_PROPS, ...props };
  
  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // State
  const [isReady, setIsReady] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  
  // Use video player hook
  const {
    isPlaying,
    isBuffering,
    currentTime,
    currentFrame,
    duration,
    totalFrames,
    isLoaded,
    play,
    pause,
    togglePlay,
    service,
  } = useVideoPlayer(videoElement, autoInitialize);
  
  // ============================================
  // Render Frame to Canvas
  // ============================================
  
  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoElement;
    
    if (!canvas || !video || video.readyState < 2) {
      return;
    }
    
    const ctx = canvas.getContext('2d', {
      alpha: false,
      desynchronized: true,
    });
    
    if (!ctx) {
      return;
    }
    
    // Clear canvas
    ctx.fillStyle = backgroundColor || '#000000';
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
    
    // Calculate render dimensions
    const videoRatio = video.videoWidth / video.videoHeight;
    const canvasRatio = canvasSize.width / canvasSize.height;
    
    let renderX = 0;
    let renderY = 0;
    let renderWidth = canvasSize.width;
    let renderHeight = canvasSize.height;
    
    if (objectFit === 'contain') {
      if (videoRatio > canvasRatio) {
        renderHeight = canvasSize.width / videoRatio;
        renderY = (canvasSize.height - renderHeight) / 2;
      } else {
        renderWidth = canvasSize.height * videoRatio;
        renderX = (canvasSize.width - renderWidth) / 2;
      }
    } else if (objectFit === 'cover') {
      if (videoRatio > canvasRatio) {
        renderWidth = canvasSize.height * videoRatio;
        renderX = (canvasSize.width - renderWidth) / 2;
      } else {
        renderHeight = canvasSize.width / videoRatio;
        renderY = (canvasSize.height - renderHeight) / 2;
      }
    }
    
    // Draw video frame
    ctx.drawImage(video, renderX, renderY, renderWidth, renderHeight);
  }, [videoElement, canvasSize, backgroundColor, objectFit]);
  
  // ============================================
  // Animation Loop
  // ============================================
  
  const animate = useCallback(() => {
    renderFrame();
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [renderFrame]);
  
  useEffect(() => {
    if (isPlaying && !animationFrameRef.current) {
      animationFrameRef.current = requestAnimationFrame(animate);
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isPlaying, animate]);
  
  // ============================================
  // Resize Handler
  // ============================================
  
  const handleResize = useCallback(() => {
    if (!containerRef.current || !canvasRef.current) {
      return;
    }
    
    const container = containerRef.current;
    const canvas = canvasRef.current;
    
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    const newWidth = rect.width;
    const newHeight = rect.height;
    
    // Only update if size changed
    if (newWidth !== canvasSize.width || newHeight !== canvasSize.height) {
      setIsResizing(true);
      
      canvas.width = newWidth * dpr;
      canvas.height = newHeight * dpr;
      canvas.style.width = `${newWidth}px`;
      canvas.style.height = `${newHeight}px`;
      
      const ctx = canvas.getContext('2d', {
        alpha: false,
        desynchronized: true,
      });
      
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
      
      setCanvasSize({ width: newWidth, height: newHeight });
      setIsResizing(false);
      
      // Render frame after resize
      if (!isPlaying) {
        renderFrame();
      }
    }
  }, [canvasSize, isPlaying, renderFrame]);
  
  useEffect(() => {
    handleResize();
    
    const resizeObserver = new ResizeObserver(handleResize);
    
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [handleResize]);
  
  // ============================================
  // Initialization
  // ============================================
  
  useEffect(() => {
    if (canvasRef.current && service) {
      setIsReady(true);
      onReady?.(canvasRef.current);
    }
  }, [service, onReady]);
  
  // ============================================
  // Render Time Display
  // ============================================
  
  const renderTimeDisplay = () => {
    if (timeFormat === 'none') {
      return null;
    }
    
    let currentDisplay: string;
    let totalDisplay: string;
    
    if (timeFormat === 'time') {
      currentDisplay = formatTime(currentTime, duration > 3600);
      totalDisplay = formatTime(duration, duration > 3600);
    } else if (timeFormat === 'timecode') {
      currentDisplay = formatTimecode(currentFrame, 30, duration > 3600);
      totalDisplay = formatTimecode(totalFrames, 30, duration > 3600);
    } else if (timeFormat === 'frames') {
      currentDisplay = currentFrame.toString();
      totalDisplay = totalFrames.toString();
    } else {
      currentDisplay = formatTime(currentTime, duration > 3600);
      totalDisplay = formatTime(duration, duration > 3600);
    }
    
    return (
      <div className="video-canvas-time-display">
        {showFrameNumber && (
          <span className="video-canvas-frame">
            F: {currentDisplay}
          </span>
        )}
        <span className="video-canvas-time">
          {currentDisplay} / {totalDisplay}
        </span>
      </div>
    );
  };
  
  // ============================================
  // Render Loading Indicator
  // ============================================
  
  const renderLoadingIndicator = () => {
    if (!showLoadingIndicator || !isBuffering) {
      return null;
    }
    
    return (
      <div className="video-canvas-loading" data-testid="loading-spinner">
        <div className="video-canvas-loading-spinner" />
      </div>
    );
  };
  
  // ============================================
  // Render Play Button
  // ============================================
  
  const renderPlayButtonOverlay = () => {
    if (!showPlayButton || isPlaying || isBuffering) {
      return null;
    }
    
    const buttonContent = renderPlayButton
      ? renderPlayButton(isPlaying)
      : (
        <div className="video-canvas-play-button">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      );
    
    return (
      <button
        className="video-canvas-play-overlay"
        onClick={onClick || togglePlay}
        type="button"
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {buttonContent}
      </button>
    );
  };
  
  // ============================================
  // Handle Click
  // ============================================
  
  const handleClick = () => {
    onClick?.();
    togglePlay();
  };
  
  const handleDoubleClick = () => {
    onDoubleClick?.();
    // Toggle fullscreen or other action
  };
  
  // ============================================
  // Render
  // ============================================
  
  const containerStyle: React.CSSProperties = {
    ...style,
    backgroundColor,
    aspectRatio: maintainAspectRatio ? undefined : undefined,
  };
  
  const combinedClassName = [
    'video-canvas-container',
    className,
    isResizing ? 'video-canvas-resizing' : '',
    isPlaying ? 'video-canvas-playing' : '',
    isBuffering ? 'video-canvas-buffering' : '',
  ].filter(Boolean).join(' ');
  
  return (
    <div
      ref={containerRef}
      className={combinedClassName}
      style={containerStyle}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      role="button"
      tabIndex={0}
      aria-label={isPlaying ? 'Video playing - click to pause' : 'Video paused - click to play'}
    >
      <canvas
        ref={canvasRef}
        className="video-canvas"
        width={canvasSize.width}
        height={canvasSize.height}
      />
      
      {renderLoadingIndicator()}
      {renderPlayButtonOverlay()}
      {renderTimeDisplay()}
      
      {children}
    </div>
  );
};

// ============================================
// Export
// ============================================

export default VideoCanvas;

