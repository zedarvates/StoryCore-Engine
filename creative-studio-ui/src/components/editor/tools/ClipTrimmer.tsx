import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Scissors, Play, Pause, SkipBack, SkipForward } from 'lucide-react';

interface TimelineClip {
  id: string;
  startTime: number;
  endTime: number;
  duration: number;
  trimStart: number;
  trimEnd: number;
  src: string;
  type: 'video' | 'audio';
}

interface ClipTrimmerProps {
  clip: TimelineClip;
  onTrim: (trimStart: number, trimEnd: number) => void;
  onClose: () => void;
}

export function ClipTrimmer({ clip, onTrim, onClose }: ClipTrimmerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(clip.trimStart);
  const [trimStart, setTrimStart] = useState(clip.trimStart);
  const [trimEnd, setTrimEnd] = useState(clip.trimEnd);
  const [isDragging, setIsDragging] = useState<'start' | 'end' | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Initialize trim points
  useEffect(() => {
    setTrimStart(clip.trimStart);
    setTrimEnd(clip.trimEnd);
    setCurrentTime(clip.trimStart);
  }, [clip]);

  // Handle video playback
  const togglePlayback = useCallback(() => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.currentTime = currentTime;
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, currentTime]);

  // Handle timeline scrubbing
  const handleTimelineClick = useCallback((e: React.MouseEvent) => {
    if (!timelineRef.current) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = trimStart + (percentage * (trimEnd - trimStart));

    setCurrentTime(Math.max(trimStart, Math.min(trimEnd, newTime)));
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  }, [trimStart, trimEnd]);

  // Handle trim handle drag
  const handleTrimDrag = useCallback((e: MouseEvent, type: 'start' | 'end') => {
    if (!timelineRef.current) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const dragX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, dragX / rect.width));
    const newTime = clip.startTime + (percentage * clip.duration);

    if (type === 'start') {
      const newTrimStart = Math.max(clip.startTime, Math.min(trimEnd - 1, newTime));
      setTrimStart(newTrimStart);
      if (currentTime < newTrimStart) setCurrentTime(newTrimStart);
    } else {
      const newTrimEnd = Math.max(trimStart + 1, Math.min(clip.endTime, newTime));
      setTrimEnd(newTrimEnd);
      if (currentTime > newTrimEnd) setCurrentTime(newTrimEnd);
    }
  }, [clip, trimStart, trimEnd, currentTime]);

  // Mouse event handlers for dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        handleTrimDrag(e, isDragging as 'start' | 'end');
      }
    };

    const handleMouseUp = () => {
      setIsDragging(null);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleTrimDrag]);

  // Video time update
  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      const time = videoRef.current.currentTime;
      if (time >= trimStart && time <= trimEnd) {
        setCurrentTime(time);
      } else if (time > trimEnd) {
        setCurrentTime(trimEnd);
        setIsPlaying(false);
        videoRef.current.pause();
      }
    }
  }, [trimStart, trimEnd]);

  const handleApplyTrim = () => {
    onTrim(trimStart, trimEnd);
    onClose();
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const frames = Math.floor((time % 1) * 30); // Assuming 30fps
    return `${minutes}:${seconds.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
  };

  const getTrimPercentage = (time: number) => {
    return ((time - clip.startTime) / clip.duration) * 100;
  };

  return (
    <div className="clip-trimmer-overlay">
      <div className="clip-trimmer-modal">
        <div className="trimmer-header">
          <h3>Trim Clip: {clip.id}</h3>
          <button onClick={onClose} className="close-btn">×</button>
        </div>

        <div className="trimmer-content">
          {/* Video Preview */}
          <div className="video-preview">
            <video
              ref={videoRef}
              src={clip.src}
              onTimeUpdate={handleTimeUpdate}
              onEnded={() => setIsPlaying(false)}
            />
          </div>

          {/* Playback Controls */}
          <div className="playback-controls">
            <button title="Move Left" onClick={() => setCurrentTime(trimStart)}>
              <SkipBack size={16} />
            </button>
            <button onClick={togglePlayback}>
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button title="Move Right" onClick={() => setCurrentTime(trimEnd)}>
              <SkipForward size={16} />
            </button>
            <span className="time-display">
              {formatTime(currentTime)} / {formatTime(trimEnd - trimStart)}
            </span>
          </div>

          {/* Timeline with Trim Handles */}
          <div className="timeline-container">
            <div className="timeline-ruler">
              <div className="time-markers">
                <span>{formatTime(trimStart)}</span>
                <span>{formatTime(trimEnd)}</span>
              </div>
            </div>

            <div
              ref={timelineRef}
              className="timeline-track"
              onClick={handleTimelineClick}
            >
              {/* Trimmed region highlight */}
              <div
                className="trim-region"
                style={{
                  ['--left' as any]: `${getTrimPercentage(trimStart)}%`,
                  ['--width' as any]: `${getTrimPercentage(trimEnd) - getTrimPercentage(trimStart)}%`
                }}
              />

              {/* Current time indicator */}
              <div
                className="current-time-indicator"
                style={{ ['--left' as any]: `${getTrimPercentage(currentTime)}%` }}
              />

              {/* Trim handles */}
              <div
                className="trim-handle trim-start"
                style={{ ['--left' as any]: `${getTrimPercentage(trimStart)}%` }}
                onMouseDown={() => setIsDragging('start')}
              >
                <div className="handle-line" />
                <div className="handle-grip" />
              </div>

              <div
                className="trim-handle trim-end"
                style={{ ['--left' as any]: `${getTrimPercentage(trimEnd)}%` }}
                onMouseDown={() => setIsDragging('end')}
              >
                <div className="handle-line" />
                <div className="handle-grip" />
              </div>
            </div>
          </div>

          {/* Trim Info */}
          <div className="trim-info">
            <div className="info-item">
              <label>Trim Start:</label>
              <span>{formatTime(trimStart)}</span>
            </div>
            <div className="info-item">
              <label>Trim End:</label>
              <span>{formatTime(trimEnd)}</span>
            </div>
            <div className="info-item">
              <label>Duration:</label>
              <span>{formatTime(trimEnd - trimStart)}</span>
            </div>
          </div>
        </div>

        <div className="trimmer-footer">
          <button onClick={onClose} className="cancel-btn">Cancel</button>
          <button onClick={handleApplyTrim} className="apply-btn">
            <Scissors size={16} />
            Apply Trim
          </button>
        </div>
      </div>
    </div>
  );
}