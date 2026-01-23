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

interface ClipSplitterProps {
  clip: TimelineClip;
  onSplit: (splitTime: number) => void;
  onClose: () => void;
  currentTime?: number; // Current playhead position
}

export function ClipSplitter({ clip, onSplit, onClose, currentTime = 0 }: ClipSplitterProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [splitTime, setSplitTime] = useState(currentTime);
  const [localCurrentTime, setLocalCurrentTime] = useState(currentTime);

  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Initialize split time
  useEffect(() => {
    const initialTime = Math.max(clip.trimStart, Math.min(clip.trimEnd, currentTime));
    setSplitTime(initialTime);
    setLocalCurrentTime(initialTime);
  }, [clip, currentTime]);

  // Handle video playback
  const togglePlayback = useCallback(() => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.currentTime = localCurrentTime;
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, localCurrentTime]);

  // Handle timeline scrubbing
  const handleTimelineClick = useCallback((e: React.MouseEvent) => {
    if (!timelineRef.current) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = clip.trimStart + (percentage * (clip.trimEnd - clip.trimStart));

    const clampedTime = Math.max(clip.trimStart, Math.min(clip.trimEnd, newTime));
    setSplitTime(clampedTime);
    setLocalCurrentTime(clampedTime);

    if (videoRef.current) {
      videoRef.current.currentTime = clampedTime;
    }
  }, [clip]);

  // Video time update
  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current && isPlaying) {
      const time = videoRef.current.currentTime;
      const clampedTime = Math.max(clip.trimStart, Math.min(clip.trimEnd, time));
      setLocalCurrentTime(clampedTime);

      // Stop at trim end
      if (time >= clip.trimEnd) {
        setIsPlaying(false);
        videoRef.current.pause();
      }
    }
  }, [clip, isPlaying]);

  // Skip to split position
  const skipToSplit = useCallback(() => {
    setLocalCurrentTime(splitTime);
    if (videoRef.current) {
      videoRef.current.currentTime = splitTime;
    }
  }, [splitTime]);

  // Frame-by-frame navigation
  const frameStep = useCallback((direction: 'forward' | 'backward') => {
    const frameRate = 30; // Assuming 30fps
    const step = 1 / frameRate;
    const newTime = direction === 'forward'
      ? Math.min(clip.trimEnd, splitTime + step)
      : Math.max(clip.trimStart, splitTime - step);

    setSplitTime(newTime);
    setLocalCurrentTime(newTime);

    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  }, [clip, splitTime]);

  const handleApplySplit = () => {
    onSplit(splitTime);
    onClose();
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const frames = Math.floor((time % 1) * 30); // Assuming 30fps
    return `${minutes}:${seconds.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
  };

  const getSplitPercentage = (time: number) => {
    return ((time - clip.trimStart) / (clip.trimEnd - clip.trimStart)) * 100;
  };

  return (
    <div className="clip-splitter-overlay">
      <div className="clip-splitter-modal">
        <div className="splitter-header">
          <h3>Split Clip: {clip.id}</h3>
          <button onClick={onClose} className="close-btn">×</button>
        </div>

        <div className="splitter-content">
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
            <button title="Move Left" onClick={() => frameStep('backward')}>
              <SkipBack size={16} />
            </button>
            <button onClick={togglePlayback}>
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button title="Move Right" onClick={() => frameStep('forward')}>
              <SkipForward size={16} />
            </button>
            <button title="Go to Split Point" onClick={skipToSplit}>
              🎯
            </button>
            <span className="time-display">
              {formatTime(localCurrentTime)} / {formatTime(clip.trimEnd - clip.trimStart)}
            </span>
          </div>

          {/* Timeline with Split Indicator */}
          <div className="timeline-container">
            <div className="timeline-ruler">
              <div className="time-markers">
                <span>{formatTime(clip.trimStart)}</span>
                <span>{formatTime(clip.trimEnd)}</span>
              </div>
            </div>

            <div
              ref={timelineRef}
              className="timeline-track"
              onClick={handleTimelineClick}
            >
              {/* Split point indicator */}
              <div
                className="split-indicator"
                style={{ ['--left' as any]: `${getSplitPercentage(splitTime)}%` }}
              >
                <div className="split-line" />
                <div className="split-handle" />
                <div className="split-label">Split Here</div>
              </div>

              {/* Current time indicator */}
              <div
                className="current-time-indicator"
                style={{ ['--left' as any]: `${getSplitPercentage(localCurrentTime)}%` }}
              />
            </div>
          </div>

          {/* Split Info */}
          <div className="split-info">
            <div className="info-item">
              <label>Split Time:</label>
              <span>{formatTime(splitTime)}</span>
            </div>
            <div className="info-item">
              <label>Clip 1 Duration:</label>
              <span>{formatTime(splitTime - clip.trimStart)}</span>
            </div>
            <div className="info-item">
              <label>Clip 2 Duration:</label>
              <span>{formatTime(clip.trimEnd - splitTime)}</span>
            </div>
          </div>
        </div>

        <div className="splitter-footer">
          <button onClick={onClose} className="cancel-btn">Cancel</button>
          <button onClick={handleApplySplit} className="apply-btn">
            <Scissors size={16} />
            Split Clip
          </button>
        </div>
      </div>
    </div>
  );
}