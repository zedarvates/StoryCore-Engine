import React, { useState, useCallback, useRef, useEffect } from 'react';
import './Timeline.css';

export interface TimelineClipData {
  id: string;
  type: 'video' | 'audio' | 'image' | 'text' | 'transition' | 'effect';
  trackId: string;
  startTime: number;
  endTime: number;
  sourceStart: number;
  sourceEnd: number;
  thumbnail?: string;
  name: string;
  locked: boolean;
  visible: boolean;
  effects: string[];
  transitions?: {
    in?: string;
    out?: string;
  };
  color?: string;
}

export interface TimelineTrackData {
  id: string;
  name: string;
  type: 'video' | 'audio';
  clips: TimelineClipData[];
  muted: boolean;
  locked: boolean;
  height: number;
}

export interface TimelineData {
  id: string;
  tracks: TimelineTrackData[];
  duration: number;
  frameRate: number;
  resolution: { width: number; height: number };
  currentTime?: number;
}

interface TimelineProps {
  data: TimelineData;
  onChange?: (data: TimelineData) => void;
  onClipSelect?: (clipId: string | null) => void;
  onTimeChange?: (time: number) => void;
  currentTime?: number;
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
  isPlaying?: boolean;
  onPlayPause?: (isPlaying: boolean) => void;
}

interface DragState {
  clipId: string | null;
  trackId: string | null;
  type: 'move' | 'trim-start' | 'trim-end' | null;
  startX: number;
  startTime: number;
  originalClip?: TimelineClipData;
}

export const Timeline: React.FC<TimelineProps> = ({
  data,
  onChange,
  onClipSelect,
  onTimeChange,
  currentTime = 0,
  zoom = 1,
  onZoomChange,
  isPlaying = false,
  onPlayPause,
}) => {
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [hoveredClipId, setHoveredClipId] = useState<string | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const pixelsPerSecond = 100 * zoom;
  
  const timeToPixels = useCallback((time: number): number => time * pixelsPerSecond, [pixelsPerSecond]);
  const pixelsToTime = useCallback((pixels: number): number => pixels / pixelsPerSecond, [pixelsPerSecond]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * data.frameRate);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
  };

  const formatTimeShort = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (isPlaying && !dragState) {
      const animate = (timestamp: number) => {
        if (lastTimeRef.current === 0) {
          lastTimeRef.current = timestamp;
        }
        const delta = (timestamp - lastTimeRef.current) / 1000;
        lastTimeRef.current = timestamp;
        
        const newTime = (data.currentTime || 0) + delta;
        if (newTime >= data.duration) {
          onTimeChange?.(0);
          onPlayPause?.(false);
        } else {
          onTimeChange?.(newTime);
        }
        
        animationRef.current = requestAnimationFrame(animate);
      };
      
      lastTimeRef.current = 0;
      animationRef.current = requestAnimationFrame(animate);
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, data.currentTime, data.duration, onTimeChange, onPlayPause, dragState]);

  const handleClipClick = (clipId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedClipId(clipId);
    onClipSelect?.(clipId);
  };

  const handleTimelineClick = (e: React.MouseEvent) => {
    if (!timelineRef.current || dragState) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + timelineRef.current.scrollLeft;
    const time = Math.max(0, pixelsToTime(x));
    
    onTimeChange?.(time);
    setSelectedClipId(null);
    onClipSelect?.(null);
  };

  const handleMouseDown = (clipId: string, trackId: string, e: React.MouseEvent, type: 'move' | 'trim-start' | 'trim-end' = 'move') => {
    e.stopPropagation();
    
    const clip = data.tracks
      .find(t => t.id === trackId)?.clips
      .find(c => c.id === clipId);
    
    if (clip && !clip.locked) {
      setDragState({
        clipId,
        trackId,
        type,
        startX: e.clientX,
        startTime: type === 'trim-start' ? clip.startTime : clip.endTime,
        originalClip: { ...clip }
      });
      setSelectedClipId(clipId);
      onClipSelect?.(clipId);
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState || !dragState.originalClip) return;
    
    const deltaX = e.clientX - dragState.startX;
    const deltaTime = pixelsToTime(deltaX);
    const newTimeline = { ...data };
    const track = newTimeline.tracks.find(t => t.id === dragState.trackId);
    
    if (!track) return;
    
    const clipIndex = track.clips.findIndex(c => c.id === dragState.clipId);
    if (clipIndex === -1) return;
    
    const clip = { ...track.clips[clipIndex] };
    
    if (dragState.type === 'move') {
      const newStart = Math.max(0, dragState.originalClip.startTime + deltaTime);
      const duration = dragState.originalClip.endTime - dragState.originalClip.startTime;
      clip.startTime = newStart;
      clip.endTime = newStart + duration;
    } else if (dragState.type === 'trim-start') {
      const newStart = Math.max(0, Math.min(dragState.startTime + deltaTime, clip.endTime - 0.1));
      clip.startTime = newStart;
      clip.sourceStart = dragState.originalClip.sourceStart + deltaTime;
    } else if (dragState.type === 'trim-end') {
      const newEnd = Math.max(clip.startTime + 0.1, dragState.startTime + deltaTime);
      clip.endTime = newEnd;
      clip.sourceEnd = dragState.originalClip.sourceEnd + deltaTime;
    }
    
    track.clips[clipIndex] = clip;
    onChange?.(newTimeline);
  }, [dragState, data, pixelsToTime, onChange]);

  const handleMouseUp = useCallback(() => {
    setDragState(null);
  }, []);

  useEffect(() => {
    if (dragState) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragState, handleMouseMove, handleMouseUp]);

  const handleSplit = () => {
    if (!selectedClipId || !data.currentTime) return;
    
    const newTimeline = { ...data };
    let splitTime = data.currentTime;
    
    for (const track of newTimeline.tracks) {
      const clipIndex = track.clips.findIndex(c => c.id === selectedClipId);
      if (clipIndex !== -1) {
        const clip = track.clips[clipIndex];
        if (splitTime > clip.startTime && splitTime < clip.endTime) {
          const clipA = {
            ...clip,
            id: `${clip.id}_a`,
            endTime: splitTime,
            sourceEnd: clip.sourceStart + (splitTime - clip.startTime),
            transitions: clip.transitions ? { ...clip.transitions, out: undefined } : undefined
          };
          
          const clipB = {
            ...clip,
            id: `${clip.id}_b`,
            startTime: splitTime,
            sourceStart: clip.sourceStart + (splitTime - clip.startTime),
            transitions: clip.transitions ? { ...clip.transitions, in: undefined } : undefined
          };
          
          track.clips[clipIndex] = clipA;
          track.clips.splice(clipIndex + 1, 0, clipB);
          
          onChange?.(newTimeline);
          break;
        }
      }
    }
  };

  const handleDelete = () => {
    if (!selectedClipId) return;
    
    const newTimeline = { ...data };
    for (const track of newTimeline.tracks) {
      const clipIndex = track.clips.findIndex(c => c.id === selectedClipId);
      if (clipIndex !== -1) {
        track.clips.splice(clipIndex, 1);
        onChange?.(newTimeline);
        setSelectedClipId(null);
        onClipSelect?.(null);
        break;
      }
    }
  };

  const renderRuler = () => {
    const duration = data.duration || 60;
    const step = zoom < 0.5 ? 10 : zoom < 1 ? 5 : zoom < 2 ? 2 : 1;
    
    return (
      <div className="timeline-ruler" style={{ width: timeToPixels(duration) }}>
        {Array.from({ length: Math.ceil(duration / step) + 1 }, (_, i) => {
          const time = i * step;
          return (
            <div
              key={i}
              className="ruler-mark"
              style={{ left: timeToPixels(time) }}
            >
              <span className="ruler-label">{formatTimeShort(time)}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderTrack = (track: TimelineTrackData) => (
    <div key={track.id} className="timeline-track" style={{ height: track.height }}>
      <div className="track-header">
        <span className="track-name">{track.name}</span>
        <div className="track-controls">
          <button
            className={`track-mute ${track.muted ? 'active' : ''}`}
            onClick={() => {
              const newTimeline = { ...data };
              const t = newTimeline.tracks.find(tr => tr.id === track.id);
              if (t) {
                t.muted = !t.muted;
                onChange?.(newTimeline);
              }
            }}
            title={track.muted ? 'Unmute' : 'Mute'}
          >
            {track.muted ? '🔇' : '🔊'}
          </button>
          <button
            className={`track-lock ${track.locked ? 'active' : ''}`}
            onClick={() => {
              const newTimeline = { ...data };
              const t = newTimeline.tracks.find(tr => tr.id === track.id);
              if (t) {
                t.locked = !t.locked;
                onChange?.(newTimeline);
              }
            }}
            title={track.locked ? 'Unlock' : 'Lock'}
          >
            {track.locked ? '🔒' : '🔓'}
          </button>
        </div>
      </div>
      <div className="track-clips">
        {track.clips.map(clip => (
          <div
            key={clip.id}
            className={`timeline-clip ${clip.type} ${selectedClipId === clip.id ? 'selected' : ''} ${clip.locked ? 'locked' : ''} ${hoveredClipId === clip.id ? 'hovered' : ''}`}
            style={{
              left: timeToPixels(clip.startTime),
              width: Math.max(2, timeToPixels(clip.endTime - clip.startTime)),
              backgroundColor: clip.color || undefined
            }}
            onClick={(e) => handleClipClick(clip.id, e)}
            onMouseEnter={() => setHoveredClipId(clip.id)}
            onMouseLeave={() => setHoveredClipId(null)}
            onMouseDown={(e) => handleMouseDown(clip.id, track.id, e, 'move')}
          >
            {clip.thumbnail && (
              <div 
                className="clip-thumbnail" 
                style={{ backgroundImage: `url(${clip.thumbnail})` }}
              />
            )}
            <div
              className="clip-handle left"
              onMouseDown={(e) => handleMouseDown(clip.id, track.id, e, 'trim-start')}
            />
            <div className="clip-content">
              <span className="clip-name">{clip.name}</span>
              {clip.effects.length > 0 && (
                <span className="clip-effects">FX:{clip.effects.length}</span>
              )}
            </div>
            <div
              className="clip-handle right"
              onMouseDown={(e) => handleMouseDown(clip.id, track.id, e, 'trim-end')}
            />
            {clip.transitions?.in && (
              <div className="transition-indicator in" title={`In: ${clip.transitions.in}`}>◀</div>
            )}
            {clip.transitions?.out && (
              <div className="transition-indicator out" title={`Out: ${clip.transitions.out}`}>▶</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderPlayhead = () => (
    <div
      ref={playheadRef}
      className="playhead"
      style={{ left: timeToPixels(currentTime) }}
    >
      <div className="playhead-head" />
      <div className="playhead-line" />
    </div>
  );

  return (
    <div className="timeline-container">
      <div className="timeline-toolbar">
        <div className="toolbar-group">
          <button
            className={`toolbar-btn ${isPlaying ? 'active' : ''}`}
            onClick={() => onPlayPause?.(!isPlaying)}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button
            className="toolbar-btn"
            onClick={() => onTimeChange?.(0)}
            title="Go to start"
          >
            ⏮
          </button>
          <button
            className="toolbar-btn"
            onClick={() => onTimeChange?.(data.duration || 0)}
            title="Go to end"
          >
            ⏭
          </button>
        </div>
        
        <div className="toolbar-group">
          <button
            className="toolbar-btn"
            onClick={handleSplit}
            disabled={!selectedClipId}
            title="Split clip at playhead (S)"
          >
            ✂️
          </button>
          <button
            className="toolbar-btn"
            onClick={handleDelete}
            disabled={!selectedClipId}
            title="Delete selected (Del)"
          >
            🗑
          </button>
        </div>
        
        <div className="zoom-control">
          <button onClick={() => onZoomChange?.(Math.max(0.1, zoom * 0.8))}>−</button>
          <span className="zoom-label">{Math.round(zoom * 100)}%</span>
          <button onClick={() => onZoomChange?.(Math.min(5, zoom * 1.2))}>+</button>
        </div>
      </div>
      
      <div className="timeline-content" onClick={handleTimelineClick}>
        <div className="timeline-scroll" ref={timelineRef}>
          {renderRuler()}
          <div className="timeline-tracks">
            {data.tracks.map(renderTrack)}
          </div>
          {renderPlayhead()}
        </div>
      </div>
      
      <div className="timeline-time-display">
        <span className="current-time">{formatTime(currentTime)}</span>
        <span className="separator">/</span>
        <span className="total-time">{formatTime(data.duration || 0)}</span>
        <span className="frame-info">
          Frame {Math.floor(currentTime * data.frameRate)}
        </span>
      </div>
    </div>
  );
};

export default Timeline;
