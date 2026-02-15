/**
 * Timeline Controls Component
 * 
 * Comprehensive timeline control bar with playback controls, zoom controls,
 * track management, edit mode toggles, and playback shortcuts.
 * 
 * Requirements: 1.1, 1.2, 1.4, 3.4, 3.5, 16.1, 16.2, 16.3, 16.4, 16.5, 17.2
 */

import React, { useCallback, useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import { play, pause, stop } from '../../store/slices/previewSlice';
import { setPlayheadPosition } from '../../store/slices/timelineSlice';
import type { LayerType, PlaybackState } from '../../types';
import { GoToTimeDialog } from './GoToTimeDialog';

interface TimelineControlsProps {
  zoomLevel: number;
  onZoomChange: (zoom: number) => void;
  onAddTrack: (type: LayerType) => void;
  onDeleteTrack?: () => void;
  playheadPosition: number;
  duration: number; // Total duration in frames
  onToggleVirtualMode?: () => void;
  useVirtualMode?: boolean;
  // Edit mode toggles
  snapToGrid?: boolean;
  onToggleSnapToGrid?: () => void;
  rippleEdit?: boolean;
  onToggleRippleEdit?: () => void;
  magneticTimeline?: boolean;
  onToggleMagneticTimeline?: () => void;
  onSplit?: () => void;
  onAutoMix?: () => void;
}

export const TimelineControls: React.FC<TimelineControlsProps> = ({
  zoomLevel,
  onZoomChange,
  onAddTrack,
  onDeleteTrack,
  playheadPosition,
  duration,
  onToggleVirtualMode,
  useVirtualMode = true,
  snapToGrid = true,
  onToggleSnapToGrid,
  rippleEdit = false,
  onToggleRippleEdit,
  magneticTimeline = false,
  onToggleMagneticTimeline,
  onSplit,
  onAutoMix,
}) => {
  const dispatch = useAppDispatch();
  const [showAddTrackMenu, setShowAddTrackMenu] = useState(false);
  const [showGoToTimeDialog, setShowGoToTimeDialog] = useState(false);

  // Get playback state from Redux
  const playbackState: PlaybackState = useAppSelector((state) => state.preview.playbackState);
  const isPlaying = playbackState === 'playing';
  const isPaused = playbackState === 'paused';

  // Track type options
  const trackTypes: { type: LayerType; label: string; icon: string }[] = [
    { type: 'media', label: 'Media Track', icon: '🎬' },
    { type: 'audio', label: 'Audio Track', icon: '🔊' },
    { type: 'effects', label: 'Effects Track', icon: '✨' },
    { type: 'transitions', label: 'Transitions Track', icon: '↔️' },
    { type: 'text', label: 'Text Track', icon: '📝' },
    { type: 'keyframes', label: 'Keyframes Track', icon: '🔑' },
  ];

  // Playback control handlers
  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      dispatch(pause());
    } else {
      dispatch(play());
    }
  }, [dispatch, isPlaying]);

  const handleStop = useCallback(() => {
    dispatch(stop());
    dispatch(setPlayheadPosition(0));
  }, [dispatch]);

  const handleGoToStart = useCallback(() => {
    dispatch(setPlayheadPosition(0));
  }, [dispatch]);

  const handleGoToEnd = useCallback(() => {
    dispatch(setPlayheadPosition(duration));
  }, [dispatch, duration]);

  const handlePreviousFrame = useCallback(() => {
    dispatch(setPlayheadPosition(Math.max(0, playheadPosition - 1)));
  }, [dispatch, playheadPosition]);

  const handleNextFrame = useCallback(() => {
    dispatch(setPlayheadPosition(Math.min(duration, playheadPosition + 1)));
  }, [dispatch, playheadPosition, duration]);

  // Keyboard shortcuts for playback
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Ctrl/Cmd + G - Go to Time
      if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
        e.preventDefault();
        setShowGoToTimeDialog(true);
        return;
      }

      switch (e.key) {
        case ' ': // Space - Play/Pause
          e.preventDefault();
          handlePlayPause();
          break;
        case 'k': // K - Stop
        case 'K':
          e.preventDefault();
          handleStop();
          break;
        case 'j': // J - Previous frame (backward)
        case 'J':
          e.preventDefault();
          handlePreviousFrame();
          break;
        case 'l': // L - Next frame (forward)
        case 'L':
          e.preventDefault();
          handleNextFrame();
          break;
        case 'Home': // Home - Go to start
          e.preventDefault();
          handleGoToStart();
          break;
        case 'End': // End - Go to end
          e.preventDefault();
          handleGoToEnd();
          break;
        case 'ArrowLeft': // Left arrow - Previous frame
          if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            handlePreviousFrame();
          }
          break;
        case 'ArrowRight': // Right arrow - Next frame
          if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            handleNextFrame();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePlayPause, handleStop, handlePreviousFrame, handleNextFrame, handleGoToStart, handleGoToEnd]);

  // Handle zoom in
  const handleZoomIn = useCallback(() => {
    onZoomChange(Math.min(100, zoomLevel * 1.5));
  }, [zoomLevel, onZoomChange]);

  // Handle zoom out
  const handleZoomOut = useCallback(() => {
    onZoomChange(Math.max(1, zoomLevel / 1.5));
  }, [zoomLevel, onZoomChange]);

  // Handle fit to window
  const handleFitToWindow = useCallback(() => {
    onZoomChange(10);
  }, [onZoomChange]);

  // Handle add track
  const handleAddTrack = useCallback((type: LayerType) => {
    onAddTrack(type);
    setShowAddTrackMenu(false);
  }, [onAddTrack]);

  // Handle delete track
  const handleDeleteTrack = useCallback(() => {
    if (onDeleteTrack) {
      onDeleteTrack();
    }
  }, [onDeleteTrack]);

  // Handle go to time
  const handleGoToTime = useCallback((frame: number) => {
    dispatch(setPlayheadPosition(frame));
    setShowGoToTimeDialog(false);
  }, [dispatch]);

  // Format current time
  const formatTime = (frames: number) => {
    const fps = 24;
    const totalSeconds = Math.floor(frames / fps);
    const seconds = totalSeconds % 60;
    const minutes = Math.floor(totalSeconds / 60);
    const frameNum = frames % fps;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}:${String(frameNum).padStart(2, '0')}`;
  };

  return (
    <div className="timeline-controls-bar">
      {/* Playback controls */}
      <div className="timeline-controls-group">
        <button
          className="timeline-control-btn"
          title="Go to start (Home)"
          onClick={handleGoToStart}
        >
          ⏮️
        </button>
        <button
          className="timeline-control-btn"
          title="Previous frame (J or Left Arrow)"
          onClick={handlePreviousFrame}
        >
          ⏪
        </button>
        <button
          className={`timeline-control-btn playback-btn ${isPlaying ? 'playing' : ''}`}
          title={isPlaying ? "Pause (Space)" : "Play (Space)"}
          onClick={handlePlayPause}
        >
          {isPlaying ? '⏸️' : '▶️'}
        </button>
        <button
          className="timeline-control-btn"
          title="Stop (K)"
          onClick={handleStop}
        >
          ⏹️
        </button>
        <button
          className="timeline-control-btn"
          title="Next frame (L or Right Arrow)"
          onClick={handleNextFrame}
        >
          ⏩
        </button>
        <button
          className="timeline-control-btn"
          title="Go to end (End)"
          onClick={handleGoToEnd}
        >
          ⏭️
        </button>
      </div>

      {/* Timecode display with duration */}
      <div className="timeline-timecode">
        <span className="current-time">{formatTime(playheadPosition)}</span>
        <span className="time-separator"> / </span>
        <span className="total-duration">{formatTime(duration)}</span>
      </div>

      {/* Go to Time button */}
      <button
        className="timeline-control-btn"
        onClick={() => setShowGoToTimeDialog(true)}
        title="Go to specific time (Ctrl/Cmd + G)"
      >
        🎯
      </button>

      {/* Zoom controls */}
      <div className="timeline-controls-group">
        <button
          className="timeline-control-btn"
          onClick={handleZoomOut}
          title="Zoom out (Ctrl/Cmd + -)"
        >
          🔍-
        </button>

        <div className="zoom-level-display">
          {Math.round(zoomLevel * 10)}%
        </div>

        <button
          className="timeline-control-btn"
          onClick={handleZoomIn}
          title="Zoom in (Ctrl/Cmd + +)"
        >
          🔍+
        </button>

        <button
          className="timeline-control-btn"
          onClick={handleFitToWindow}
          title="Fit to window"
        >
          ⊡
        </button>
      </div>

      {/* Track management */}
      <div className="timeline-controls-group timeline-track-controls">
        {/* Add Track dropdown */}
        <div className="add-track-dropdown">
          <button
            className="timeline-control-btn add-track-btn"
            onClick={() => setShowAddTrackMenu(!showAddTrackMenu)}
            title="Add new track"
          >
            + Track
          </button>

          {showAddTrackMenu && (
            <div className="add-track-menu">
              {trackTypes.map(({ type, label, icon }) => (
                <button
                  key={type}
                  className="add-track-menu-item"
                  onClick={() => handleAddTrack(type)}
                >
                  <span className="track-type-icon">{icon}</span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Delete Track button */}
        <button
          className="timeline-control-btn add-track-btn delete-track-btn"
          onClick={handleDeleteTrack}
          title="Delete selected track (Delete)"
          disabled={!onDeleteTrack}
        >
          - Track
        </button>
      </div>

      {/* Edit mode toggles */}
      <div className="timeline-controls-group">
        <button
          className={`timeline-control-btn toggle-btn ${snapToGrid ? 'active' : ''}`}
          onClick={onToggleSnapToGrid}
          title="Snap to Grid (S) - Align edits to grid"
        >
          <span className="toggle-icon">⊡</span>
          <span className="toggle-label">Snap</span>
          <span className="toggle-shortcut">S</span>
        </button>

        <button
          className={`timeline-control-btn toggle-btn ${rippleEdit ? 'active' : ''}`}
          onClick={onToggleRippleEdit}
          title="Ripple Edit (R) - Automatically shift downstream edits"
        >
          <span className="toggle-icon">≋</span>
          <span className="toggle-label">Ripple</span>
          <span className="toggle-shortcut">R</span>
        </button>

        <button
          className={`timeline-control-btn toggle-btn ${magneticTimeline ? 'active' : ''}`}
          onClick={onToggleMagneticTimeline}
          title="Magnetic Timeline (M) - Auto-align edits to nearby content"
        >
          <span className="toggle-icon">🧲</span>
          <span className="toggle-label">Magnetic</span>
          <span className="toggle-shortcut">M</span>
        </button>
      </div>

      {/* Additional tools */}
      <div className="timeline-controls-group">
        <button
          className="timeline-control-btn toggle-btn"
          onClick={onSplit}
          title="Split clip at playhead (Ctrl/Cmd + B)"
        >
          ✂️
        </button>
        <button
          className="timeline-control-btn toggle-btn"
          onClick={onAutoMix}
          title="Apply AI Auto-Mix to all audio tracks"
        >
          ✨ Mix
        </button>

        <button
          className="timeline-control-btn toggle-btn"
          title="Delete selected (Delete)"
        >
          🗑️
        </button>
      </div>

      {/* Virtual mode toggle (for large timelines) */}
      {onToggleVirtualMode && (
        <div className="timeline-controls-group">
          <button
            className={`timeline-control-btn toggle-btn ${useVirtualMode ? 'active' : ''}`}
            onClick={onToggleVirtualMode}
            title="Toggle virtual scrolling mode"
          >
            <span className="toggle-icon">{useVirtualMode ? '⚡' : '🐌'}</span>
            <span className="toggle-label">{useVirtualMode ? 'Virtual' : 'DOM'}</span>
          </button>
        </div>
      )}

      {/* Go to Time Dialog */}
      <GoToTimeDialog
        isOpen={showGoToTimeDialog}
        onClose={() => setShowGoToTimeDialog(false)}
        onGoToTime={handleGoToTime}
        maxFrame={duration}
        fps={24}
      />
    </div>
  );
};

export default TimelineControls;

