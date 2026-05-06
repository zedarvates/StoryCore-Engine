import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  ZoomIn, 
  ZoomOut, 
  Scissors, 
  Trash2, 
  _Eye, 
  _EyeOff, 
  Lock, 
  Unlock,
  Volume2,
  VolumeX,
  Type,
  Film,
  Music
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useVideoEditor } from '@/contexts/VideoEditorContext';
import { _Track, _Clip, _TrackType } from '@/types/video-editor';
import './Timeline.css';

const PIXELS_PER_SECOND = 50; // Base zoom

export const Timeline: React.FC = () => {
  const {
    tracks,
    clips,
    currentTime,
    duration,
    isPlaying,
    selectedClipIds,
    selectedTrackId,
    play,
    pause,
    seek,
    selectClip,
    selectTrack,
    splitClip,
    deleteClips,
    updateTrack,
  } = useVideoEditor();

  const [zoom, setZoom] = useState(1);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);

  const pixelsPerSecond = useMemo(() => PIXELS_PER_SECOND * zoom, [zoom]);
  const timelineWidth = useMemo(() => Math.max(duration * pixelsPerSecond + 400, 1200), [duration, pixelsPerSecond]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * 30);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${frames.toString().padStart(2, '0')}`;
  };

  const handleTimelineClick = (e: React.MouseEvent) => {
    if (!canvasRef.current || isScrubbing) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = x / pixelsPerSecond;
    seek(Math.max(0, Math.min(duration, time)));
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.timeline-ruler')) {
      setIsScrubbing(true);
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const x = e.clientX - rect.left;
        seek(Math.max(0, Math.min(duration, x / pixelsPerSecond)));
      }
    }
  }, [duration, pixelsPerSecond, seek]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isScrubbing && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      seek(Math.max(0, Math.min(duration, x / pixelsPerSecond)));
    }
  }, [isScrubbing, duration, pixelsPerSecond, seek]);

  const handleMouseUp = useCallback(() => {
    setIsScrubbing(false);
  }, []);

  useEffect(() => {
    if (isScrubbing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isScrubbing, handleMouseMove, handleMouseUp]);

  // Center playhead in view when playing
  useEffect(() => {
    if (isPlaying && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const playheadX = currentTime * pixelsPerSecond;
      const scrollLeft = container.scrollLeft;
      const containerWidth = container.clientWidth;
      
      if (playheadX > scrollLeft + containerWidth - 100) {
        container.scrollLeft = playheadX - containerWidth + 200;
      } else if (playheadX < scrollLeft) {
        container.scrollLeft = playheadX - 100;
      }
    }
  }, [currentTime, isPlaying, pixelsPerSecond]);

  const renderRuler = () => {
    const ticks = [];
    const step = zoom > 2 ? 1 : zoom > 0.5 ? 5 : 10;
    
    for (let i = 0; i <= duration + 10; i += step) {
      ticks.push(
        <div 
          key={i} 
          className="ruler-tick" 
          style={{ left: i * pixelsPerSecond }}
        >
          <span className="tick-label">{formatTime(i)}</span>
        </div>
      );
    }
    return <div className="timeline-ruler">{ticks}</div>;
  };

  const renderClips = (trackId: string) => {
    return clips
      .filter(clip => clip.trackId === trackId)
      .map(clip => {
        const isSelected = selectedClipIds.includes(clip.id);
        return (
          <motion.div
            key={clip.id}
            className={`timeline-clip ${isSelected ? 'selected' : ''}`}
            style={{
              left: clip.startTime * pixelsPerSecond,
              width: clip.duration * pixelsPerSecond,
            }}
            onClick={(e) => {
              e.stopPropagation();
              selectClip(clip.id, e.shiftKey || e.ctrlKey || e.metaKey);
            }}
            layoutId={clip.id}
          >
            <div className="clip-content">
              <div className="clip-header">
                <span className="clip-title">{clip.id.split('-')[0]}</span>
              </div>
              <div className="clip-thumbnail" />
            </div>
            <div className="clip-handles">
              <div className="clip-handle-left" />
              <div className="clip-handle-right" />
            </div>
          </motion.div>
        );
      });
  };

  return (
    <div className="video-editor-timeline-root" onMouseDown={handleMouseDown}>
      {/* Timeline Controls */}
      <div className="timeline-controls">
        <div className="playback-controls">
          <button className="control-btn" title="Reculer" onClick={() => seek(0)}>
            <SkipBack className="w-5 h-5" />
          </button>
          <button 
            className="control-btn active" 
            onClick={isPlaying ? pause : play}
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
          </button>
          <button className="control-btn" title="Avancer" onClick={() => seek(duration)}>
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        <div className="timeline-time-display">
          <span className="current">{formatTime(currentTime)}</span>
          <span className="separator">/</span>
          <span className="duration">{formatTime(duration)}</span>
        </div>

        <div className="timeline-divider" />

        <div className="edit-actions playback-controls">
          <button 
            className="control-btn" 
            title="Couper (Split)" 
            onClick={() => selectedClipIds.length > 0 && splitClip(selectedClipIds[0], currentTime)}
            disabled={selectedClipIds.length === 0}
          >
            <Scissors className="w-4 h-4" />
          </button>
          <button 
            className="control-btn" 
            title="Supprimer" 
            onClick={() => deleteClips(selectedClipIds)}
            disabled={selectedClipIds.length === 0}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div className="timeline-zoom-controls">
          <ZoomOut className="w-4 h-4" />
          <input 
            type="range" 
            className="zoom-slider" 
            min="0.1" 
            max="10" 
            step="0.1" 
            value={zoom} 
            onChange={(e) => setZoom(parseFloat(e.target.value))}
          />
          <ZoomIn className="w-4 h-4" />
          <span className="zoom-value">{Math.round(zoom * 100)}%</span>
        </div>
      </div>

      {/* Timeline Body */}
      <div className="timeline-body">
        {/* Track Headers */}
        <div className="timeline-track-headers">
          <div className="timeline-ruler-header" style={{ height: '28px' }} />
          {tracks.map(track => (
            <div 
              key={track.id} 
              className={`track-header-item ${selectedTrackId === track.id ? 'active' : ''}`}
              onClick={() => selectTrack(track.id)}
            >
              <div className="track-icon">
                {track.type === 'video' ? <Film className="w-4 h-4" /> : 
                 track.type === 'audio' ? <Music className="w-4 h-4" /> : <Type className="w-4 h-4" />}
              </div>
              <span className="track-name">{track.name}</span>
              <div className="track-controls">
                <button 
                  className="track-control-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    updateTrack(track.id, { muted: !track.muted });
                  }}
                >
                  {track.muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>
                <button 
                  className="track-control-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    updateTrack(track.id, { locked: !track.locked });
                  }}
                >
                  {track.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Scrollable Tracks Area */}
        <div className="timeline-scroll-container" ref={scrollContainerRef}>
          <div 
            className="timeline-canvas" 
            ref={canvasRef}
            style={{ width: timelineWidth }}
            onClick={handleTimelineClick}
          >
            {renderRuler()}
            
            <div className="timeline-tracks-area">
              {tracks.map(track => (
                <div key={track.id} className="timeline-track-lane">
                  {renderClips(track.id)}
                </div>
              ))}
            </div>

            {/* Playhead */}
            <div 
              className="timeline-playhead" 
              style={{ left: currentTime * pixelsPerSecond }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Timeline;
