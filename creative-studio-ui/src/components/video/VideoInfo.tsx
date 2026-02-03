/**
 * VideoInfo Component - Video information display
 * 
 * Displays video metadata and performance metrics:
 * - Resolution, frame rate, codec
 * - Current shot information
 * - Buffer status
 * - Performance metrics (FPS, dropped frames)
 * 
 * @module components/video/VideoInfo
 */

import React from 'react';
import { formatTime } from '../../types/video';
import './VideoInfo.css';

// ============================================
// Props
// ============================================

export interface VideoInfoProps {
  /** Video file name */
  fileName?: string;
  
  /** Video resolution */
  resolution?: { width: number; height: number };
  
  /** Frame rate in fps */
  frameRate?: number;
  
  /** Video codec */
  codec?: string;
  
  /** Bitrate in kbps */
  bitrate?: number;
  
  /** Duration in seconds */
  duration?: number;
  
  /** Current time in seconds */
  currentTime?: number;
  
  /** Current frame number */
  currentFrame?: number;
  
  /** Total frames */
  totalFrames?: number;
  
  /** Buffer progress (0-1) */
  bufferProgress?: number;
  
  /** Current FPS */
  currentFps?: number;
  
  /** Dropped frames count */
  droppedFrames?: number;
  
  /** Whether video has audio */
  hasAudio?: boolean;
  
  /** Audio codec if present */
  audioCodec?: string;
  
  /** Custom class name */
  className?: string;
  
  /** Show file name */
  showFileName?: boolean;
  
  /** Show technical details */
  showTechnicalDetails?: boolean;
  
  /** Show performance metrics */
  showPerformanceMetrics?: boolean;
  
  /** Show buffer status */
  showBufferStatus?: boolean;
  
  /** Layout variant */
  variant?: 'compact' | 'detailed' | 'minimal';
}

// ============================================
// Default Props
// ============================================

const DEFAULT_PROPS: Partial<VideoInfoProps> = {
  showFileName: true,
  showTechnicalDetails: true,
  showPerformanceMetrics: true,
  showBufferStatus: true,
  variant: 'detailed',
};

// ============================================
// Helper Functions
// ============================================

const formatResolution = (width?: number, height?: number): string => {
  if (!width || !height) return 'Unknown';
  return `${width}x${height}`;
};

const formatBitrate = (kbps?: number): string => {
  if (!kbps) return 'Unknown';
  if (kbps >= 1000) {
    return `${(kbps / 1000).toFixed(1)} Mbps`;
  }
  return `${kbps} kbps`;
};

const formatFrameRate = (fps?: number): string => {
  if (!fps) return 'Unknown';
  return `${fps.toFixed(2)} fps`;
};

// ============================================
// Component
// ============================================

export const VideoInfo: React.FC<VideoInfoProps> = (props) => {
  const {
    fileName,
    resolution,
    frameRate,
    codec,
    bitrate,
    duration,
    currentTime,
    currentFrame,
    totalFrames,
    bufferProgress,
    currentFps,
    droppedFrames,
    hasAudio,
    audioCodec,
    className,
    showFileName,
    showTechnicalDetails,
    showPerformanceMetrics,
    showBufferStatus,
    variant,
  } = { ...DEFAULT_PROPS, ...props };
  
  // Calculate buffer percentage
  const bufferPercent = bufferProgress !== undefined 
    ? Math.round(bufferProgress * 100) 
    : 0;
  
  // Format current time
  const formattedTime = currentTime !== undefined 
    ? formatTime(currentTime, (duration ?? 0) > 3600) 
    : '00:00';
  
  // Format duration
  const formattedDuration = duration !== undefined 
    ? formatTime(duration, duration > 3600) 
    : '00:00';
  
  // Combined class names
  const containerClassName = [
    'video-info',
    `video-info-${variant}`,
    className,
  ].filter(Boolean).join(' ');
  
  return (
    <div className={containerClassName} role="region" aria-label="Video information">
      {/* File name */}
      {showFileName && fileName && (
        <div className="video-info-section video-info-filename">
          <span className="video-info-label">File:</span>
          <span className="video-info-value video-info-filename-value" title={fileName}>
            {fileName.length > 30 ? `...${fileName.slice(-27)}` : fileName}
          </span>
        </div>
      )}
      
      {/* Technical details */}
      {showTechnicalDetails && (
        <div className="video-info-section video-info-technical">
          {/* Resolution */}
          <div className="video-info-item">
            <span className="video-info-label">Resolution:</span>
            <span className="video-info-value">
              {formatResolution(resolution?.width, resolution?.height)}
            </span>
          </div>
          
          {/* Frame rate */}
          <div className="video-info-item">
            <span className="video-info-label">Frame Rate:</span>
            <span className="video-info-value">
              {formatFrameRate(frameRate)}
            </span>
          </div>
          
          {/* Codec */}
          {codec && (
            <div className="video-info-item">
              <span className="video-info-label">Codec:</span>
              <span className="video-info-value">{codec.toUpperCase()}</span>
            </div>
          )}
          
          {/* Bitrate */}
          {bitrate !== undefined && (
            <div className="video-info-item">
              <span className="video-info-label">Bitrate:</span>
              <span className="video-info-value">{formatBitrate(bitrate)}</span>
            </div>
          )}
          
          {/* Audio */}
          {hasAudio && (
            <div className="video-info-item">
              <span className="video-info-label">Audio:</span>
              <span className="video-info-value">
                {audioCodec ? audioCodec.toUpperCase() : 'Yes'}
              </span>
            </div>
          )}
        </div>
      )}
      
      {/* Time display */}
      <div className="video-info-section video-info-time">
        <div className="video-info-item">
          <span className="video-info-label">Time:</span>
          <span className="video-info-value video-info-time-value">
            {formattedTime} / {formattedDuration}
          </span>
        </div>
        
        {currentFrame !== undefined && totalFrames !== undefined && (
          <div className="video-info-item">
            <span className="video-info-label">Frame:</span>
            <span className="video-info-value">
              {currentFrame} / {totalFrames}
            </span>
          </div>
        )}
      </div>
      
      {/* Buffer status */}
      {showBufferStatus && bufferProgress !== undefined && (
        <div className="video-info-section video-info-buffer">
          <div className="video-info-item">
            <span className="video-info-label">Buffer:</span>
            <div className="video-info-buffer-bar">
              <div
                className="video-info-buffer-progress"
                style={{ width: `${bufferPercent}%` }}
              />
            </div>
            <span className="video-info-value video-info-buffer-value">
              {bufferPercent}%
            </span>
          </div>
        </div>
      )}
      
      {/* Performance metrics */}
      {showPerformanceMetrics && (
        <div className="video-info-section video-info-performance">
          <div className="video-info-item">
            <span className="video-info-label">FPS:</span>
            <span className={`video-info-value ${(currentFps ?? 30) < 25 ? 'video-info-warning' : ''}`}>
              {currentFps?.toFixed(1) ?? '--'}
            </span>
          </div>
          
          {droppedFrames !== undefined && droppedFrames > 0 && (
            <div className="video-info-item">
              <span className="video-info-label">Dropped:</span>
              <span className="video-info-value video-info-warning">
                {droppedFrames}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VideoInfo;

