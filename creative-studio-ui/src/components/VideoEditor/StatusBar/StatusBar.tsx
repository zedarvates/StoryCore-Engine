/**
 * Status Bar Component
 * Timeline status and playback information
 */

import React from 'react';
import { useVideoEditor } from '../../contexts/VideoEditorContext';
import './StatusBar.css';

export const StatusBar: React.FC = () => {
  const {
    currentTime,
    duration,
    project,
    tracks,
    clips,
  } = useVideoEditor();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * 30);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
  };

  const trackCount = tracks.length;
  const clipCount = clips.length;
  const resolution = project?.resolution
    ? `${project.resolution.width}×${project.resolution.height}`
    : '1920×1080';

  return (
    <div className="status-bar">
      <div className="status-bar-left">
        <span className="status-item time-current">
          {formatTime(currentTime)}
        </span>
        <span className="status-separator">/</span>
        <span className="status-item time-duration">
          {formatTime(duration)}
        </span>
      </div>

      <div className="status-bar-center">
        <span className="status-item" title="Resolution">
          {resolution}
        </span>
        <span className="status-separator">|</span>
        <span className="status-item" title="Frame Rate">
          {project?.frameRate || 30} fps
        </span>
        <span className="status-separator">|</span>
        <span className="status-item" title="Tracks">
          {trackCount} tracks
        </span>
        <span className="status-separator">|</span>
        <span className="status-item" title="Clips">
          {clipCount} clips
        </span>
      </div>

      <div className="status-bar-right">
        <span className="status-item shortcut" title="Keyboard Shortcuts">
          ⌨️
        </span>
        <span className="status-item" title="Zoom">
          100%
        </span>
      </div>
    </div>
  );
};

export default StatusBar;

