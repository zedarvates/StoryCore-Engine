import React from 'react';
import { Play, Pause, Square } from 'lucide-react';
import { useAudioTrack } from '../hooks/useAudioEngine';
import type { AudioTrack } from '../types';

interface AudioPlayerProps {
  track: AudioTrack;
  className?: string;
}

/**
 * Simple audio player component with play/pause/stop controls
 */
export const AudioPlayer: React.FC<AudioPlayerProps> = ({ track, className = '' }) => {
  const { isLoaded, isPlaying, error, play, pause, stop } = useAudioTrack(track);

  if (error) {
    return (
      <div className={`text-xs text-red-600 ${className}`}>
        Error: {error}
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className={`text-xs text-gray-500 ${className}`}>
        Loading audio...
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        onClick={isPlaying ? pause : play}
        className="p-1 rounded hover:bg-gray-200 transition-colors"
        title={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4 text-gray-700" />
        ) : (
          <Play className="w-4 h-4 text-gray-700" />
        )}
      </button>
      <button
        onClick={stop}
        className="p-1 rounded hover:bg-gray-200 transition-colors"
        title="Stop"
        disabled={!isPlaying}
      >
        <Square className="w-4 h-4 text-gray-700" />
      </button>
      <span className="text-xs text-gray-600">
        {isPlaying ? 'Playing' : 'Ready'}
      </span>
    </div>
  );
};
