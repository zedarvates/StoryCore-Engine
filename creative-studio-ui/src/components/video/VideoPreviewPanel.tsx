/**
 * VideoPreviewPanel - Integrated video preview panel for Sequence Plan Editor
 * Combines video canvas, controls, and info display into a unified panel.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { VideoCanvas, VideoCanvasProps } from './VideoCanvas';
import { PlaybackControls, PlaybackControlsProps } from './PlaybackControls';
import { VideoInfo, VideoInfoProps } from './VideoInfo';
import { useVideoPlayer } from '../../hooks/useVideoPlayer';
import { VideoPlayerService } from '../../services/video/VideoPlayerService';
import './VideoPreviewPanel.css';

export interface VideoPreviewPanelProps {
  videoElement?: HTMLVideoElement | null;
  autoInitialize?: boolean;
  variant?: 'full' | 'compact' | 'minimal';
  showControls?: boolean;
  showInfo?: boolean;
  showTimeline?: boolean;
  className?: string;
  title?: string;
  onVideoReady?: (service: VideoPlayerService) => void;
  onPlayheadChange?: (time: number, frame: number) => void;
  onShotChange?: (shotId: string) => void;
  children?: React.ReactNode;
}

export const VideoPreviewPanel: React.FC<VideoPreviewPanelProps> = (props) => {
  const {
    videoElement,
    autoInitialize = true,
    variant = 'full',
    showControls = true,
    showInfo = true,
    showTimeline = false,
    className,
    title = 'Video Preview',
    onVideoReady,
    onPlayheadChange,
    onShotChange,
    children,
  } = props;
  
  const panelRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'info'>('preview');
  
  const {
    isPlaying,
    isBuffering,
    currentTime,
    currentFrame,
    duration,
    totalFrames,
    currentFps,
    formattedTimecode,
    isMuted,
    isLooping,
    hasError,
    errorMessage,
    togglePlay,
    seek,
    seekToFrame,
    stepForward,
    stepBackward,
    setPlaybackRate,
    toggleMute,
    toggleLoop,
    service,
  } = useVideoPlayer(videoElement, autoInitialize);
  
  useEffect(() => {
    if (service && onVideoReady) {
      onVideoReady(service);
    }
  }, [service, onVideoReady]);
  
  useEffect(() => {
    if (onPlayheadChange) {
      onPlayheadChange(currentTime, currentFrame);
    }
  }, [currentTime, currentFrame, onPlayheadChange]);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          stepBackward(e.shiftKey ? 30 : 1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          stepForward(e.shiftKey ? 30 : 1);
          break;
        case 'Home':
          e.preventDefault();
          seekToFrame(0);
          break;
        case 'End':
          e.preventDefault();
          seekToFrame(totalFrames - 1);
          break;
        case 'm':
          toggleMute();
          break;
        case 'l':
          toggleLoop();
          break;
        case 'f':
          toggleFullscreen();
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, stepForward, stepBackward, seekToFrame, toggleMute, toggleLoop, totalFrames]);
  
  const toggleFullscreen = useCallback(() => {
    if (!panelRef.current) return;
    if (!document.fullscreenElement) {
      panelRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);
  
  const handleTimelineSeek = useCallback((time: number) => {
    seek(time);
  }, [seek]);
  
  const videoCanvasProps: Partial<VideoCanvasProps> = {
    videoElement,
    autoInitialize,
    showLoadingIndicator: isBuffering,
    showPlayButton: !isPlaying && !isBuffering,
    timeFormat: 'timecode',
    showFrameNumber: true,
    onClick: togglePlay,
    className: `video-preview-canvas variant-${variant}`,
  };
  
  const playbackControlsProps: Partial<PlaybackControlsProps> = {
    autoInitialize: false,
    showFrameNavigation: true,
    showTimeDisplay: true,
    showMuteToggle: true,
    showLoopToggle: true,
    showSpeedSelector: true,
    compact: variant === 'compact',
    className: `video-preview-controls variant-${variant}`,
  };
  
  const videoInfoProps: Partial<VideoInfoProps> = {
    variant: variant === 'compact' ? 'compact' : 'detailed',
    showPerformanceMetrics: true,
    showBufferStatus: true,
    className: `video-preview-info variant-${variant}`,
  };
  
  const combinedClassName = [
    'video-preview-panel',
    `variant-${variant}`,
    isFullscreen ? 'fullscreen' : '',
    hasError ? 'has-error' : '',
    className,
  ].filter(Boolean).join(' ');
  
  if (hasError) {
    return (
      <div className={combinedClassName} ref={panelRef}>
        <div className="video-preview-error">
          <h3>Video Error</h3>
          <p>{errorMessage || 'An unknown error occurred'}</p>
          <button onClick={() => window.location.reload()}>Reload</button>
        </div>
      </div>
    );
  }
  
  if (!videoElement) {
    return (
      <div className={combinedClassName} ref={panelRef}>
        <div className="video-preview-placeholder">
          <h3>No Video Selected</h3>
          <p>Select a shot or video to preview</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className={combinedClassName} ref={panelRef}>
      <div className="video-preview-header">
        <h3 className="video-preview-title">{title}</h3>
        <div className="video-preview-tabs">
          <button
            className={`video-preview-tab ${activeTab === 'preview' ? 'active' : ''}`}
            onClick={() => setActiveTab('preview')}
          >
            Preview
          </button>
          <button
            className={`video-preview-tab ${activeTab === 'info' ? 'active' : ''}`}
            onClick={() => setActiveTab('info')}
          >
            Info
          </button>
        </div>
        <div className="video-preview-actions">
          <button className="video-preview-action" onClick={toggleFullscreen} title="Toggle fullscreen (F)">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
            </svg>
          </button>
        </div>
      </div>
      
      <div className="video-preview-content">
        {activeTab === 'preview' ? (
          <>
            <div className="video-preview-main">
              <VideoCanvas {...videoCanvasProps} />
              {showTimeline && (
                <div className="video-preview-timeline">
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    value={currentTime}
                    onChange={(e) => handleTimelineSeek(Number(e.target.value))}
                    className="video-timeline-slider"
                    aria-label="Timeline scrubber"
                    title="Drag to seek"
                  />
                </div>
              )}
            </div>
            {showControls && <PlaybackControls {...playbackControlsProps} />}
          </>
        ) : (
          <VideoInfo {...videoInfoProps} />
        )}
      </div>
      
      <div className="video-preview-footer">
        <div className="video-preview-time">
          <span className="video-preview-current">{formattedTimecode}</span>
          <span className="video-preview-separator">/</span>
          <span className="video-preview-total">{formatTimecode(totalFrames, 30)}</span>
        </div>
        <div className="video-preview-status">
          {isPlaying && <span className="status-playing">Playing</span>}
          {isBuffering && <span className="status-buffering">Buffering</span>}
          {isMuted && <span className="status-muted">Muted</span>}
          {isLooping && <span className="status-looping">Looping</span>}
          <span className="status-fps">{currentFps.toFixed(1)} FPS</span>
        </div>
      </div>
      
      {children && <div className="video-preview-children">{children}</div>}
    </div>
  );
};

function formatTimecode(frameNumber: number, frameRate: number): string {
  const totalSeconds = Math.floor(frameNumber / frameRate);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const frames = Math.floor((frameNumber % frameRate));
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
}

export default VideoPreviewPanel;

