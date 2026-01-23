import React, { useMemo } from 'react';

interface TimelineRulerProps {
  duration: number;
  zoom: number;
  currentTime: number;
  fps?: number;
}

export function TimelineRuler({ duration, zoom, currentTime, fps = 30 }: TimelineRulerProps) {
  // Calculate major and minor tick intervals based on zoom
  const tickIntervals = useMemo(() => {
    const totalWidth = duration * zoom * 100; // pixels per second * zoom

    // Major ticks (with time labels)
    let majorInterval = 1; // seconds
    if (totalWidth < 500) majorInterval = 5;
    else if (totalWidth < 1000) majorInterval = 2;
    else if (totalWidth > 2000) majorInterval = 0.5;

    // Minor ticks (without labels)
    const minorInterval = majorInterval / 5;

    return { major: majorInterval, minor: minorInterval };
  }, [duration, zoom]);

  // Generate tick marks
  const ticks = useMemo(() => {
    const ticks = [];
    const { major, minor } = tickIntervals;

    // Calculate visible time range (this could be enhanced with scrolling)
    const startTime = 0;
    const endTime = duration;

    // Major ticks
    for (let time = startTime; time <= endTime; time += major) {
      const position = (time / duration) * 100;
      ticks.push({
        time,
        position,
        type: 'major',
        label: formatTime(time)
      });
    }

    // Minor ticks
    for (let time = startTime; time <= endTime; time += minor) {
      // Skip if there's already a major tick at this position
      if (time % major !== 0) {
        const position = (time / duration) * 100;
        ticks.push({
          time,
          position,
          type: 'minor',
          label: null
        });
      }
    }

    return ticks;
  }, [duration, tickIntervals]);

  // Current time indicator
  const currentTimePosition = (currentTime / duration) * 100;

  return (
    <div className="timeline-ruler">
      <div className="ruler-track">
        {ticks.map((tick, index) => (
          <div
            key={`${tick.type}-${tick.time}-${index}`}
            className={`ruler-tick ${tick.type}`}
            style={{ left: `${tick.position}%` }}
          >
            {tick.type === 'major' && tick.label && (
              <span className="tick-label">{tick.label}</span>
            )}
          </div>
        ))}

        {/* Current time indicator */}
        <div
          className="current-time-indicator"
          style={{ left: `${currentTimePosition}%` }}
        >
          <div className="time-line" />
          <div className="time-caret" />
        </div>
      </div>
    </div>
  );
}

// Format time as MM:SS, HH:MM:SS, or HH:MM:SS:FF (with frames)
function formatTime(seconds: number, showFrames: boolean = false): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const frames = showFrames ? Math.floor((seconds % 1) * 30) : 0; // Assuming 30fps

  if (hours > 0) {
    if (showFrames) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
    } else {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
  } else {
    if (showFrames) {
      return `${minutes}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  }
}
