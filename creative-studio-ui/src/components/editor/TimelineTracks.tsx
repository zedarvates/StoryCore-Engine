/**
 * Timeline Tracks Component
 * 
 * Provides 4 separate tracks for different media types:
 * - Video Track
 * - Image Track
 * - Audio Track
 * - Text Track
 * 
 * Each track supports drag & drop functionality
 */

import React, { useState } from 'react';
import { Video, Image, Music, Type } from 'lucide-react';
import './TimelineTracks.css';

interface TimelineClip {
  id: string;
  type: 'video' | 'image' | 'audio' | 'text';
  name: string;
  duration: number;
  startTime: number;
}

interface TimelineTracksProps {
  clips?: TimelineClip[];
  onDropMedia?: (trackType: 'video' | 'image' | 'audio' | 'text', file: File) => void;
  onClipClick?: (clip: TimelineClip) => void;
}

export function TimelineTracks({ clips = [], onDropMedia, onClipClick }: TimelineTracksProps) {
  const [dragOverTrack, setDragOverTrack] = useState<string | null>(null);

  const handleDragOver = (e: React.DragEvent, trackType: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTrack(trackType);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTrack(null);
  };

  const handleDrop = (e: React.DragEvent, trackType: 'video' | 'image' | 'audio' | 'text') => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTrack(null);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0 && onDropMedia) {
      files.forEach(file => onDropMedia(trackType, file));
    }
  };

  const getClipsForTrack = (trackType: string) => {
    return clips.filter(clip => clip.type === trackType);
  };

  const renderTrack = (
    trackType: 'video' | 'image' | 'audio' | 'text',
    icon: React.ReactNode,
    label: string,
    color: string
  ) => {
    const trackClips = getClipsForTrack(trackType);
    const isDragOver = dragOverTrack === trackType;

    return (
      <div className={`timeline-track-row ${isDragOver ? 'drag-over' : ''}`}>
        <div className="track-header" style={{ borderLeftColor: color }}>
          {icon}
          <span className="track-label">{label}</span>
          <span className="track-count">{trackClips.length}</span>
        </div>
        <div
          className="track-content"
          onDragOver={(e) => handleDragOver(e, trackType)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, trackType)}
        >
          {trackClips.length === 0 ? (
            <div className="track-empty">
              <span>Drag {label.toLowerCase()} here...</span>
            </div>
          ) : (
            <div className="track-clips">
              {trackClips.map(clip => (
                <div
                  key={clip.id}
                  className="track-clip"
                  style={{
                    width: `${clip.duration * 20}px`,
                    backgroundColor: color,
                  }}
                  onClick={() => onClipClick?.(clip)}
                  title={clip.name}
                >
                  <span className="clip-name">{clip.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="timeline-tracks-container">
      {renderTrack('video', <Video size={16} />, 'VIDEO TRACK', '#7c3aed')}
      {renderTrack('image', <Image size={16} />, 'IMAGE TRACK', '#06b6d4')}
      {renderTrack('audio', <Music size={16} />, 'AUDIO TRACK', '#10b981')}
      {renderTrack('text', <Type size={16} />, 'TEXT TRACK', '#f59e0b')}
    </div>
  );
}
