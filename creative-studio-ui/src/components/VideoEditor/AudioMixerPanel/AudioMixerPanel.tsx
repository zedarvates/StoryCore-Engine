/**
 * Audio Mixer Panel Component
 * Audio levels and effects
 */

import React, { useState, useCallback } from 'react';
import { useVideoEditor } from '@contexts/VideoEditorContext';
import { AudioClip, Track, Clip } from '../../../types/video-editor';
import './AudioMixerPanel.css';

export const AudioMixerPanel: React.FC = () => {
  const { tracks, clips, updateClip, updateTrack } = useVideoEditor();
  const [masterVolume, setMasterVolume] = useState(80);

  const audioTracks = tracks.filter((t: Track) => t.type === 'audio');
  const audioClips = clips.filter((c: Clip): c is AudioClip => 'volume' in c);

  const handleVolumeChange = useCallback(
    (clipId: string, newVolume: number) => {
      const clip = clips.find((c: Clip) => c.id === clipId);
      if (clip && 'volume' in clip) {
        updateClip(clipId, { volume: newVolume / 100 } as Partial<Clip>);
      }
    },
    [clips, updateClip]
  );

  const handleTrackVolumeChange = useCallback(
    (trackId: string, newVolume: number) => {
      updateTrack(trackId, { volume: newVolume / 100 });
    },
    [updateTrack]
  );

  const VolumeSlider: React.FC<{
    value: number;
    onChange: (value: number) => void;
    label?: string;
    color?: string;
  }> = ({ value, onChange, label, color }) => (
    <div className="volume-slider">
      {label && <span className="slider-label">{label}</span>}
      <label className="sr-only" htmlFor={`volume-${label || 'slider'}`}>{label || 'Volume'}</label>
      <input
        id={`volume-${label || 'slider'}`}
        type="range"
        className="volume-range"
        min={0}
        max={100}
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(Number.parseInt(e.target.value))}
        style={{ accentColor: color || '#007bff' }}
        aria-label={label || 'Volume slider'}
      />
      <span className="slider-value">{value}%</span>
    </div>
  );

  return (
    <div className="audio-mixer-panel">
      <div className="panel-header">
        <h3>Audio Mixer</h3>
      </div>

      <div className="panel-content">
        <div className="mixer-section">
          <h4>Master Audio</h4>
          <VolumeSlider
            value={masterVolume}
            onChange={setMasterVolume}
            color="#28a745"
            label="Master"
          />
        </div>

        <div className="mixer-section">
          <h4>Track Volumes</h4>
          {audioTracks.length === 0 ? (
            <p className="empty-message">No audio tracks</p>
          ) : (
            audioTracks.map((track: Track) => (
              <div key={track.id} className="track-volume">
                <VolumeSlider
                  value={Math.round((track.volume || 1) * 100)}
                  onChange={(v: number) => handleTrackVolumeChange(track.id, v)}
                  label={track.name}
                  color="#50C878"
                />
              </div>
            ))
          )}
        </div>

        <div className="mixer-section">
          <h4>Clip Volumes</h4>
          {audioClips.length === 0 ? (
            <p className="empty-message">No audio clips</p>
          ) : (
            audioClips.map((clip: AudioClip) => (
              <div key={clip.id} className="clip-volume">
                <VolumeSlider
                  value={Math.round((clip.volume || 1) * 100)}
                  onChange={(v: number) => handleVolumeChange(clip.id, v)}
                  label={`Clip ${clip.id.slice(-4)}`}
                  color="#F39C12"
                />
              </div>
            ))
          )}
        </div>

        <div className="mixer-section">
          <h4>Audio Effects</h4>
          <div className="effect-buttons">
            <button className="effect-btn" title="Normalize">
              📊 Normalize
            </button>
            <button className="effect-btn" title="Compress">
              📉 Compress
            </button>
            <button className="effect-btn" title="EQ">
              🎚️ EQ
            </button>
            <button className="effect-btn" title="Reverb">
              🔊 Reverb
            </button>
            <button className="effect-btn" title="Noise Reduction">
              🔇 De-noise
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioMixerPanel;

