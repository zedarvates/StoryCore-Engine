/**
 * Track Header Component
 * 
 * Displays track information, controls, and handles for track management.
 * Supports drag-and-drop reordering, vertical resizing, and audio track controls.
 * 
 * Requirements: 1.3, 1.4, 1.5, 1.6, 1.7
 */

import React, { useCallback, useState, useRef, useEffect } from 'react';
import type { Track, LayerType } from '../../types';

interface TrackHeaderProps {
  track: Track;
  index: number;
  isHovered: boolean;
  isDragging: boolean;
  isDropTarget: boolean;
  onHover: (id: string | null) => void;
  onLockToggle: () => void;
  onHideToggle: () => void;
  onResize: (newHeight: number) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onMuteToggle?: () => void;
  onSoloToggle?: () => void;
  onRecordToggle?: () => void;
  zoomLevel: number;
}

// Track type configuration
export const TRACK_CONFIG: Record<LayerType, { color: string; icon: string; name: string; minHeight: number }> = {
  media: { color: '#4A90E2', icon: 'film', name: 'Media', minHeight: 40 },
  audio: { color: '#50C878', icon: 'volume', name: 'Audio', minHeight: 30 },
  effects: { color: '#9B59B6', icon: 'magic', name: 'Effects', minHeight: 30 },
  transitions: { color: '#E67E22', icon: 'shuffle', name: 'Transitions', minHeight: 25 },
  text: { color: '#F39C12', icon: 'text', name: 'Text', minHeight: 30 },
  keyframes: { color: '#E74C3C', icon: 'key', name: 'Keyframes', minHeight: 25 },
};

export const TrackHeader: React.FC<TrackHeaderProps> = ({
  track,
  index,
  isHovered,
  isDragging,
  isDropTarget,
  onHover,
  onLockToggle,
  onHideToggle,
  onResize,
  onReorder,
  onMuteToggle,
  onSoloToggle,
  onRecordToggle,
  zoomLevel,
}) => {
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStartY, setResizeStartY] = useState(0);
  const [resizeStartHeight, setResizeStartHeight] = useState(track.height);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  const config = TRACK_CONFIG[track.type] || { color: '#888888', icon: '📁', name: track.type, minHeight: 30 };

  // Handle resize start
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeStartY(e.clientY);
    setResizeStartHeight(track.height);
  }, [track.height]);

  // Handle resize move
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = e.clientY - resizeStartY;
      const newHeight = Math.max(config.minHeight, resizeStartHeight + deltaY);
      onResize(newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, resizeStartY, resizeStartHeight, onResize, config.minHeight]);

  // Handle drag start for reordering
  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.setData('trackIndex', index.toString());
    e.dataTransfer.effectAllowed = 'move';
    if (headerRef.current) {
      headerRef.current.classList.add('dragging');
    }
  }, [index]);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setDragOverIndex(null);
    if (headerRef.current) {
      headerRef.current.classList.remove('dragging');
    }
  }, []);

  // Handle drag over for reordering
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle drag enter
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    // Calculate which index we're dragging over
    // This will be handled by the parent component
  }, []);

  // Handle drop for reordering
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const fromIndex = parseInt(e.dataTransfer.getData('trackIndex'), 10);
    if (!isNaN(fromIndex) && fromIndex !== index) {
      onReorder(fromIndex, index);
    }
    setDragOverIndex(null);
  }, [index, onReorder]);

  // Get audio-specific state
  const isAudioTrack = track.type === 'audio';
  // For demo, we'll track mute/solo state locally (would normally come from track state)
  const [isMuted, setIsMuted] = useState(false);
  const [isSolo, setIsSolo] = useState(false);

  const handleMuteClick = useCallback(() => {
    setIsMuted(!isMuted);
    onMuteToggle?.();
  }, [isMuted, onMuteToggle]);

  const handleSoloClick = useCallback(() => {
    setIsSolo(!isSolo);
    onSoloToggle?.();
  }, [isSolo, onSoloToggle]);

  return (
    <div
      ref={headerRef}
      className={`
        track-header 
        ${track.locked ? 'locked' : ''} 
        ${track.hidden ? 'hidden' : ''} 
        ${isHovered ? 'hovered' : ''}
        ${isDragging ? 'dragging' : ''}
        ${isDropTarget ? 'drop-target' : ''}
        ${isResizing ? 'resizing' : ''}
      `}
      style={{
        height: track.height,
        backgroundColor: track.locked 
          ? 'var(--bg-locked, #1a1a1a)' 
          : isDropTarget 
            ? 'var(--accent-color, #4A90E2)' 
            : 'var(--bg-secondary, #2a2a2a)',
        opacity: track.hidden ? 0.5 : 1,
      }}
      draggable={!track.locked && !isResizing}
      onMouseEnter={() => onHover(track.id)}
      onMouseLeave={() => onHover(null)}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag handle (visible on hover) */}
      <div className="track-drag-handle" title="Drag to reorder">
        ⋮⋮
      </div>

      {/* Track icon */}
      <div className="track-icon" title={config.name}>
        <span className="track-icon-emoji">{config.icon}</span>
      </div>

      {/* Track name */}
      <div className="track-name">
        {config.name}
        {track.hidden && ' (Hidden)'}
        {track.locked && ' (Locked)'}
      </div>

      {/* Track controls */}
      <div className="track-controls">
        {/* Lock button */}
        <button
          className={`track-control-btn ${track.locked ? 'active' : ''}`}
          onClick={onLockToggle}
          title={track.locked ? 'Unlock track' : 'Lock track'}
          disabled={track.hidden}
        >
          <span className="btn-icon">{track.locked ? '🔒' : '🔓'}</span>
        </button>

        {/* Hide button */}
        <button
          className={`track-control-btn ${track.hidden ? 'active' : ''}`}
          onClick={onHideToggle}
          title={track.hidden ? 'Show track' : 'Hide track'}
        >
          <span className="btn-icon">{track.hidden ? '👁️' : '👁️'}</span>
        </button>

        {/* Audio track controls */}
        {isAudioTrack && (
          <>
            {/* Mute button */}
            <button
              className={`track-control-btn audio-btn mute-btn ${isMuted ? 'active' : ''}`}
              onClick={handleMuteClick}
              title={isMuted ? 'Unmute track' : 'Mute track'}
            >
              <span className="btn-icon">M</span>
            </button>

            {/* Solo button */}
            <button
              className={`track-control-btn audio-btn solo-btn ${isSolo ? 'active' : ''}`}
              onClick={handleSoloClick}
              title={isSolo ? 'Unsolo track' : 'Solo track'}
            >
              <span className="btn-icon">S</span>
            </button>

            {/* Record arm button */}
            {onRecordToggle && (
              <button
                className="track-control-btn audio-btn record-btn"
                title="Record arm track"
              >
                <span className="btn-icon">⏺</span>
              </button>
            )}
          </>
        )}
      </div>

      {/* Track color indicator */}
      <div
        className="track-color-indicator"
        style={{ backgroundColor: track.color }}
      />

      {/* Resize handle */}
      <div
        className={`track-resize-handle ${isResizing ? 'active' : ''}`}
        onMouseDown={handleResizeStart}
        title="Drag to resize track height"
      >
        <div className="resize-grip" />
      </div>
    </div>
  );
};

export default TrackHeader;

