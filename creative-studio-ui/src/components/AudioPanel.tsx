import React, { useState } from 'react';
import { useStore } from '../store';
import type { AudioTrack } from '../types';
import { Volume2, VolumeX, Music, Mic, Radio, Headphones, Trash2, Settings } from 'lucide-react';
import { WaveformDisplay, generateWaveformData } from './WaveformDisplay';
import { AudioPlayer } from './AudioPlayer';
import { AudioEffectsPanel } from './AudioEffectsPanel';

interface AudioPanelProps {
  shotId: string;
}

export const AudioPanel: React.FC<AudioPanelProps> = ({ shotId }) => {
  const shot = useStore((state) => state.shots.find((s) => s.id === shotId));
  const addAudioTrack = useStore((state) => state.addAudioTrack);
  const updateAudioTrack = useStore((state) => state.updateAudioTrack);
  const deleteAudioTrack = useStore((state) => state.deleteAudioTrack);

  const [showAddTrack, setShowAddTrack] = useState(false);

  if (!shot) {
    return (
      <div className="p-4 text-gray-500">
        No shot selected. Select a shot to manage audio tracks.
      </div>
    );
  }

  const handleAddTrack = (type: AudioTrack['type']) => {
    const newTrack: AudioTrack = {
      id: `track-${Date.now()}`,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} Track`,
      type,
      url: '',
      startTime: 0,
      duration: shot.duration,
      offset: 0,
      volume: 80,
      fadeIn: 0,
      fadeOut: 0,
      pan: 0,
      muted: false,
      solo: false,
      effects: [],
    };

    addAudioTrack(shotId, newTrack);
    setShowAddTrack(false);
  };

  const handleDeleteTrack = (trackId: string) => {
    if (confirm('Are you sure you want to delete this audio track?')) {
      deleteAudioTrack(shotId, trackId);
    }
  };

  const handleToggleMute = (trackId: string, currentMuted: boolean) => {
    updateAudioTrack(shotId, trackId, { muted: !currentMuted });
  };

  const handleToggleSolo = (trackId: string, currentSolo: boolean) => {
    updateAudioTrack(shotId, trackId, { solo: !currentSolo });
  };

  const getTrackIcon = (type: AudioTrack['type']) => {
    switch (type) {
      case 'music':
        return <Music className="w-4 h-4" />;
      case 'dialogue':
        return <Mic className="w-4 h-4" />;
      case 'voiceover':
        return <Headphones className="w-4 h-4" />;
      case 'sfx':
        return <Radio className="w-4 h-4" />;
      case 'ambient':
        return <Volume2 className="w-4 h-4" />;
      default:
        return <Volume2 className="w-4 h-4" />;
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Audio Tracks</h3>
        <p className="text-sm text-gray-600">
          Manage audio tracks for this shot
        </p>
      </div>

      {/* Audio Tracks List */}
      <div className="space-y-3">
        {shot.audioTracks.length === 0 ? (
          <div className="text-center py-8 border border-dashed rounded">
            <Volume2 className="w-12 h-12 mx-auto text-gray-400 mb-2" />
            <p className="text-gray-500 mb-4">No audio tracks</p>
            <button
              onClick={() => setShowAddTrack(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Add Audio Track
            </button>
          </div>
        ) : (
          <>
            {shot.audioTracks.map((track) => (
              <AudioTrackCard
                key={track.id}
                track={track}
                shotId={shotId}
                onDelete={() => handleDeleteTrack(track.id)}
                onToggleMute={() => handleToggleMute(track.id, track.muted)}
                onToggleSolo={() => handleToggleSolo(track.id, track.solo)}
                getIcon={getTrackIcon}
              />
            ))}

            <button
              onClick={() => setShowAddTrack(true)}
              className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded text-gray-600 hover:border-blue-500 hover:text-blue-600"
            >
              + Add Audio Track
            </button>
          </>
        )}
      </div>

      {/* Add Track Modal */}
      {showAddTrack && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Add Audio Track</h3>
            <p className="text-sm text-gray-600 mb-4">
              Select the type of audio track to add:
            </p>

            <div className="space-y-2">
              {(['music', 'dialogue', 'voiceover', 'sfx', 'ambient'] as const).map(
                (type) => (
                  <button
                    key={type}
                    onClick={() => handleAddTrack(type)}
                    className="w-full flex items-center gap-3 px-4 py-3 border rounded hover:bg-gray-50 hover:border-blue-500"
                  >
                    {getTrackIcon(type)}
                    <span className="capitalize">{type}</span>
                  </button>
                )
              )}
            </div>

            <button
              onClick={() => setShowAddTrack(false)}
              className="w-full mt-4 px-4 py-2 border rounded hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Audio Track Card Component
interface AudioTrackCardProps {
  track: AudioTrack;
  shotId: string;
  onDelete: () => void;
  onToggleMute: () => void;
  onToggleSolo: () => void;
  getIcon: (type: AudioTrack['type']) => React.ReactNode;
}

const AudioTrackCard: React.FC<AudioTrackCardProps> = ({
  track,
  shotId,
  onDelete,
  onToggleMute,
  onToggleSolo,
  getIcon,
}) => {
  const updateAudioTrack = useStore((state) => state.updateAudioTrack);
  const [showEffects, setShowEffects] = useState(false);

  const handleWaveformGenerated = async (waveformData: number[]) => {
    // Store waveform data in the track
    updateAudioTrack(shotId, track.id, { waveformData });
  };

  return (
    <div className="border rounded p-3 space-y-3 bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-gray-600">{getIcon(track.type)}</div>
          <input
            type="text"
            value={track.name}
            onChange={(e) =>
              updateAudioTrack(shotId, track.id, { name: e.target.value })
            }
            className="font-medium bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-1"
          />
        </div>
        <button
          onClick={onDelete}
          className="text-red-600 hover:text-red-800"
          title="Delete track"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Track Type Badge */}
      <div className="flex items-center gap-2">
        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded capitalize">
          {track.type}
        </span>
        {track.muted && (
          <span className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded">
            Muted
          </span>
        )}
        {track.solo && (
          <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded">
            Solo
          </span>
        )}
      </div>

      {/* Audio File */}
      <div>
        <label className="text-xs text-gray-600">Audio File</label>
        <input
          type="text"
          value={track.url}
          onChange={(e) =>
            updateAudioTrack(shotId, track.id, { url: e.target.value })
          }
          placeholder="Enter audio file URL or path"
          className="w-full px-2 py-1 text-sm border rounded"
        />
      </div>

      {/* Waveform Visualization */}
      {track.url && (
        <div>
          <label className="text-xs text-gray-600 mb-1 block">Waveform</label>
          <WaveformDisplay
            track={track}
            width={280}
            height={50}
            onGenerate={handleWaveformGenerated}
          />
        </div>
      )}

      {/* Audio Player Controls */}
      {track.url && (
        <div>
          <label className="text-xs text-gray-600 mb-1 block">Playback</label>
          <AudioPlayer track={track} />
        </div>
      )}

      {/* Timing Controls */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-xs text-gray-600">Start (s)</label>
          <input
            type="number"
            min={0}
            step={0.1}
            value={track.startTime}
            onChange={(e) =>
              updateAudioTrack(shotId, track.id, {
                startTime: parseFloat(e.target.value),
              })
            }
            className="w-full px-2 py-1 text-sm border rounded"
          />
        </div>
        <div>
          <label className="text-xs text-gray-600">Duration (s)</label>
          <input
            type="number"
            min={0.1}
            step={0.1}
            value={track.duration}
            onChange={(e) =>
              updateAudioTrack(shotId, track.id, {
                duration: parseFloat(e.target.value),
              })
            }
            className="w-full px-2 py-1 text-sm border rounded"
          />
        </div>
        <div>
          <label className="text-xs text-gray-600">Offset (s)</label>
          <input
            type="number"
            min={0}
            step={0.1}
            value={track.offset}
            onChange={(e) =>
              updateAudioTrack(shotId, track.id, {
                offset: parseFloat(e.target.value),
              })
            }
            className="w-full px-2 py-1 text-sm border rounded"
          />
        </div>
      </div>

      {/* Volume Control */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs text-gray-600">Volume</label>
          <span className="text-xs text-gray-500">{track.volume}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={track.volume}
          onChange={(e) =>
            updateAudioTrack(shotId, track.id, {
              volume: parseInt(e.target.value),
            })
          }
          className="w-full"
        />
      </div>

      {/* Pan Control */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs text-gray-600">Pan (L/R)</label>
          <span className="text-xs text-gray-500">
            {track.pan === 0
              ? 'Center'
              : track.pan < 0
              ? `${Math.abs(track.pan)}% L`
              : `${track.pan}% R`}
          </span>
        </div>
        <input
          type="range"
          min={-100}
          max={100}
          value={track.pan}
          onChange={(e) =>
            updateAudioTrack(shotId, track.id, {
              pan: parseInt(e.target.value),
            })
          }
          className="w-full"
        />
      </div>

      {/* Fade Controls */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-600">Fade In (s)</label>
          <input
            type="number"
            min={0}
            step={0.1}
            value={track.fadeIn}
            onChange={(e) =>
              updateAudioTrack(shotId, track.id, {
                fadeIn: parseFloat(e.target.value),
              })
            }
            className="w-full px-2 py-1 text-sm border rounded"
          />
        </div>
        <div>
          <label className="text-xs text-gray-600">Fade Out (s)</label>
          <input
            type="number"
            min={0}
            step={0.1}
            value={track.fadeOut}
            onChange={(e) =>
              updateAudioTrack(shotId, track.id, {
                fadeOut: parseFloat(e.target.value),
              })
            }
            className="w-full px-2 py-1 text-sm border rounded"
          />
        </div>
      </div>

      {/* Mute/Solo Buttons */}
      <div className="flex gap-2">
        <button
          onClick={onToggleMute}
          className={`flex-1 px-3 py-2 text-sm rounded border ${
            track.muted
              ? 'bg-gray-600 text-white border-gray-700'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          {track.muted ? <VolumeX className="w-4 h-4 mx-auto" /> : 'Mute'}
        </button>
        <button
          onClick={onToggleSolo}
          className={`flex-1 px-3 py-2 text-sm rounded border ${
            track.solo
              ? 'bg-yellow-500 text-white border-yellow-600'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          Solo
        </button>
      </div>

      {/* Effects Count */}
      {track.effects.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-600">
            {track.effects.length} effect{track.effects.length !== 1 ? 's' : ''}{' '}
            applied
          </div>
          <button
            onClick={() => setShowEffects(!showEffects)}
            className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
          >
            <Settings className="w-3 h-3 inline mr-1" />
            {showEffects ? 'Hide' : 'Show'} Effects
          </button>
        </div>
      )}

      {!track.effects.length && (
        <button
          onClick={() => setShowEffects(!showEffects)}
          className="w-full text-xs px-2 py-1 border border-dashed rounded text-gray-600 hover:border-blue-500 hover:text-blue-600"
        >
          <Settings className="w-3 h-3 inline mr-1" />
          Add Audio Effects
        </button>
      )}

      {/* Effects Panel */}
      {showEffects && (
        <div className="border-t pt-3 -mx-3 -mb-3">
          <AudioEffectsPanel shotId={shotId} trackId={track.id} />
        </div>
      )}
    </div>
  );
};
