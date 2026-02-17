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
import { Video, Image, Music, Type, Sparkles, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '../ui/dropdown-menu';
import './TimelineTracks.css';

export interface AmbianceProfile {
  id: string;
  name: string;
  file_path: string;
  type: 'audio';
  icon?: string;
}

const DEFAULT_AMBIANCE_PROFILES: AmbianceProfile[] = [
  { id: 'studio', name: 'Studio / Intérieur', file_path: 'assets/audio/ambiances/studio_room_tone.wav', type: 'audio' },
  { id: 'urban', name: 'Urbain / Ville', file_path: 'assets/audio/ambiances/city_street_day.wav', type: 'audio' },
  { id: 'nature', name: 'Nature / Forêt', file_path: 'assets/audio/ambiances/forest_wind_birds.wav', type: 'audio' },
  { id: 'scifi', name: 'Espace / Labo SF', file_path: 'assets/audio/ambiances/spaceship_hum.wav', type: 'audio' },
  { id: 'office', name: 'Bureau / Murmures', file_path: 'assets/audio/ambiances/office_murmur.wav', type: 'audio' },
  { id: 'custom_ai', name: 'Générer par IA...', file_path: '', type: 'audio', icon: 'sparkles' },
];

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
  onFillGaps?: (trackType: 'video' | 'image' | 'audio' | 'text', profile: AmbianceProfile) => void;
}

export function TimelineTracks({ clips = [], onDropMedia, onClipClick, onFillGaps }: TimelineTracksProps) {
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
    label: string
  ) => {
    const trackClips = getClipsForTrack(trackType);
    const isDragOver = dragOverTrack === trackType;

    return (
      <div className={`timeline-track-row ${isDragOver ? 'drag-over' : ''}`}>
        <div className={`track-header track-${trackType}`}>
          <div className="track-header-main">
            {icon}
            <span className="track-label">{label}</span>
            <span className="track-count">{trackClips.length}</span>
          </div>
          {onFillGaps && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="track-fill-btn"
                  title="Smart Fill Ambiance (Choisir un profil)"
                >
                  <Sparkles size={14} />
                  <ChevronDown size={10} className="ml-1 opacity-50" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Combler avec une ambiance :</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {DEFAULT_AMBIANCE_PROFILES.map((profile) => (
                  <React.Fragment key={profile.id}>
                    {profile.id === 'custom_ai' && <DropdownMenuSeparator />}
                    <DropdownMenuItem
                      onSelect={() => onFillGaps(trackType, profile)}
                      className={profile.id === 'custom_ai' ? 'text-purple-400 font-medium' : ''}
                    >
                      <div className="flex items-center gap-2">
                        {profile.id === 'custom_ai' ? <Sparkles size={12} className="text-purple-400" /> : null}
                        {profile.name}
                      </div>
                    </DropdownMenuItem>
                  </React.Fragment>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
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
                  className={`track-clip track-clip-${trackType}`}
                  style={{ width: `${clip.duration * 20}px` }}
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
      {renderTrack('video', <Video size={16} />, 'VIDEO TRACK')}
      {renderTrack('image', <Image size={16} />, 'IMAGE TRACK')}
      {renderTrack('audio', <Music size={16} />, 'AUDIO TRACK')}
      {renderTrack('text', <Type size={16} />, 'TEXT TRACK')}
    </div>
  );
}
