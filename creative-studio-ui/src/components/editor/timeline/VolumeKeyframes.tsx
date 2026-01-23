import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Volume2, Plus, X } from 'lucide-react';
import './VolumeKeyframes.css';

interface VolumeKeyframe {
  id: string;
  time: number;
  volume: number;
}

interface VolumeKeyframesProps {
  duration: number;
  currentTime: number;
  keyframes: VolumeKeyframe[];
  onKeyframesChange: (keyframes: VolumeKeyframe[]) => void;
  height?: number;
  className?: string;
}

export const VolumeKeyframes: React.FC<VolumeKeyframesProps> = ({
  duration,
  currentTime,
  keyframes,
  onKeyframesChange,
  height = 40,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggedKeyframe, setDraggedKeyframe] = useState<string | null>(null);
  const [isAddingKeyframe, setIsAddingKeyframe] = useState(false);

  // Get volume at current time (interpolated between keyframes)
  const getCurrentVolume = useCallback((time: number): number => {
    if (keyframes.length === 0) return 1;

    // Sort keyframes by time
    const sortedKeyframes = [...keyframes].sort((a, b) => a.time - b.time);

    // Find keyframes before and after current time
    const beforeKeyframe = sortedKeyframes.filter(kf => kf.time <= time).pop();
    const afterKeyframe = sortedKeyframes.filter(kf => kf.time > time)[0];

    if (!beforeKeyframe && !afterKeyframe) return 1;
    if (!beforeKeyframe) return afterKeyframe.volume;
    if (!afterKeyframe) return beforeKeyframe.volume;

    // Linear interpolation between keyframes
    const timeDiff = afterKeyframe.time - beforeKeyframe.time;
    const volumeDiff = afterKeyframe.volume - beforeKeyframe.volume;
    const progress = (time - beforeKeyframe.time) / timeDiff;

    return beforeKeyframe.volume + (volumeDiff * progress);
  }, [keyframes]);

  // Add a new keyframe at current time
  const addKeyframe = useCallback(() => {
    const currentVolume = getCurrentVolume(currentTime);
    const newKeyframe: VolumeKeyframe = {
      id: `kf_${Date.now()}`,
      time: currentTime,
      volume: currentVolume,
    };

    onKeyframesChange([...keyframes, newKeyframe]);
  }, [currentTime, keyframes, getCurrentVolume, onKeyframesChange]);

  // Remove a keyframe
  const removeKeyframe = useCallback((keyframeId: string) => {
    onKeyframesChange(keyframes.filter(kf => kf.id !== keyframeId));
  }, [keyframes, onKeyframesChange]);

  // Update keyframe position/volume
  const updateKeyframe = useCallback((keyframeId: string, updates: Partial<VolumeKeyframe>) => {
    onKeyframesChange(
      keyframes.map(kf =>
        kf.id === keyframeId ? { ...kf, ...updates } : kf
      )
    );
  }, [keyframes, onKeyframesChange]);

  // Handle mouse events for dragging keyframes
  const handleMouseDown = useCallback((keyframeId: string) => {
    setDraggedKeyframe(keyframeId);
  }, []);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (!draggedKeyframe || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Calculate new time and volume
    const newTime = Math.max(0, Math.min(duration, (x / rect.width) * duration));
    const newVolume = Math.max(0, Math.min(1, 1 - (y / rect.height)));

    updateKeyframe(draggedKeyframe, { time: newTime, volume: newVolume });
  }, [draggedKeyframe, duration, updateKeyframe]);

  const handleMouseUp = useCallback(() => {
    setDraggedKeyframe(null);
  }, []);

  // Handle double-click to add keyframe
  const handleDoubleClick = useCallback((event: React.MouseEvent) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const newTime = Math.max(0, Math.min(duration, (x / rect.width) * duration));

    const newKeyframe: VolumeKeyframe = {
      id: `kf_${Date.now()}`,
      time: newTime,
      volume: getCurrentVolume(newTime),
    };

    onKeyframesChange([...keyframes, newKeyframe]);
  }, [duration, keyframes, getCurrentVolume, onKeyframesChange]);

  // Draw the volume curve
  useEffect(() => {
    // This would draw the interpolated curve between keyframes
    // For now, we'll use CSS to show the keyframes
  }, [keyframes]);

  return (
    <div className={`volume-keyframes ${className}`}>
      <div className="keyframes-header">
        <div className="keyframes-label">
          <Volume2 size={14} />
          <span>Volume</span>
        </div>

        <button
          className="add-keyframe-btn"
          onClick={addKeyframe}
          title="Add keyframe at current time"
        >
          <Plus size={14} />
        </button>
      </div>

      <div
        ref={containerRef}
        className="keyframes-container"
        style={{ height }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
      >
        {/* Volume curve background */}
        <div className="volume-curve">
          {keyframes
            .sort((a, b) => a.time - b.time)
            .map((keyframe, index, sortedKeyframes) => {
              const nextKeyframe = sortedKeyframes[index + 1];
              if (!nextKeyframe) return null;

              const startX = (keyframe.time / duration) * 100;
              const endX = (nextKeyframe.time / duration) * 100;
              const startY = (1 - keyframe.volume) * 100;
              const endY = (1 - nextKeyframe.volume) * 100;

              return (
                <svg
                  key={`curve-${keyframe.id}-${nextKeyframe.id}`}
                  className="curve-segment"
                  style={{
                    position: 'absolute',
                    left: `${startX}%`,
                    top: 0,
                    width: `${endX - startX}%`,
                    height: '100%',
                  }}
                >
                  <line
                    x1="0%"
                    y1={`${startY}%`}
                    x2="100%"
                    y2={`${endY}%`}
                    stroke="#3b82f6"
                    strokeWidth="2"
                  />
                </svg>
              );
            })}
        </div>

        {/* Keyframe points */}
        {keyframes.map((keyframe) => (
          <div
            key={keyframe.id}
            className={`keyframe-point ${draggedKeyframe === keyframe.id ? 'dragging' : ''}`}
            style={{
              left: `${(keyframe.time / duration) * 100}%`,
              top: `${(1 - keyframe.volume) * 100}%`,
            }}
            onMouseDown={() => handleMouseDown(keyframe.id)}
            title={`Time: ${formatTime(keyframe.time)}, Volume: ${Math.round(keyframe.volume * 100)}%`}
          >
            <div className="keyframe-handle">
              <button
                className="keyframe-delete"
                onClick={(e) => {
                  e.stopPropagation();
                  removeKeyframe(keyframe.id);
                }}
                title="Delete keyframe"
              >
                <X size={8} />
              </button>
            </div>
          </div>
        ))}

        {/* Current time indicator */}
        <div
          className="current-time-indicator"
          style={{ left: `${(currentTime / duration) * 100}%` }}
        />
      </div>

      {/* Volume value display */}
      <div className="volume-display">
        <span className="current-volume">
          {Math.round(getCurrentVolume(currentTime) * 100)}%
        </span>
      </div>
    </div>
  );
};

// Utility function to format time
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}