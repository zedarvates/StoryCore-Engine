/**
 * Audio Mixing Panel Component
 * 
 * A React component for displaying and controlling audio mixing
 * in StoryCore with a professional DAW-like interface.
 */

import React, { useState, useCallback } from 'react';
import { useAudioMixing, useAudioTrack } from '../../hooks/useAudioMixing';
import { AudioTrack, AudioEffect } from '../../services/audio-mixing/AudioMixingTypes';

// ============================================================================
// Styles
// ============================================================================

const styles: Record<string, React.CSSProperties> = {
  panel: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100%',
    backgroundColor: '#1a1a1a',
    color: '#ffffff',
    fontFamily: 'system-ui, sans-serif',
    fontSize: '12px'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 15px',
    backgroundColor: '#2a2a2a',
    borderBottom: '1px solid #3a3a3a'
  },
  title: {
    fontSize: '14px',
    fontWeight: 600
  },
  controls: {
    display: 'flex',
    gap: '8px'
  },
  button: {
    padding: '6px 12px',
    backgroundColor: '#4a4a4a',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '11px',
    transition: 'background-color 0.2s'
  },
  primaryButton: {
    padding: '6px 12px',
    backgroundColor: '#4a90d9',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '11px',
    transition: 'background-color 0.2s'
  },
  tracksContainer: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '10px'
  },
  track: {
    display: 'flex',
    backgroundColor: '#2a2a2a',
    borderRadius: '6px',
    marginBottom: '8px',
    padding: '10px',
    gap: '10px'
  },
  trackHeader: {
    width: '150px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px'
  },
  trackName: {
    fontWeight: 500,
    fontSize: '12px'
  },
  trackType: {
    fontSize: '10px',
    color: '#888',
    textTransform: 'uppercase' as const
  },
  trackControls: {
    display: 'flex',
    gap: '4px',
    marginTop: '4px'
  },
  smallButton: {
    padding: '3px 6px',
    backgroundColor: '#3a3a3a',
    color: '#aaa',
    border: 'none',
    borderRadius: '3px',
    cursor: 'pointer',
    fontSize: '10px'
  },
  activeButton: {
    padding: '3px 6px',
    backgroundColor: '#4a90d9',
    color: '#fff',
    border: 'none',
    borderRadius: '3px',
    cursor: 'pointer',
    fontSize: '10px'
  },
  trackFaders: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px'
  },
  faderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  faderLabel: {
    width: '40px',
    fontSize: '10px',
    color: '#888'
  },
  fader: {
    flex: 1,
    height: '60px',
    backgroundColor: '#1a1a1a',
    borderRadius: '3px',
    position: 'relative' as const,
    cursor: 'pointer'
  },
  faderFill: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#4a90d9',
    borderRadius: '3px'
  },
  faderValue: {
    position: 'absolute' as const,
    bottom: '2px',
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: '9px',
    color: '#fff'
  },
  panKnob: {
    width: '40px',
    height: '40px',
    backgroundColor: '#3a3a3a',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer'
  },
  panIndicator: {
    width: '30px',
    height: '3px',
    backgroundColor: '#4a90d9',
    borderRadius: '2px'
  },
  meter: {
    width: '8px',
    height: '60px',
    backgroundColor: '#1a1a1a',
    borderRadius: '3px',
    overflow: 'hidden' as const,
    display: 'flex',
    flexDirection: 'column-reverse' as const
  },
  meterFill: {
    width: '100%',
    backgroundColor: '#4a90d9',
    transition: 'height 0.1s'
  },
  effectsSection: {
    backgroundColor: '#222',
    borderRadius: '6px',
    padding: '8px',
    marginTop: '8px'
  },
  effectsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
    fontSize: '11px',
    fontWeight: 500
  },
  effect: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 6px',
    backgroundColor: '#2a2a2a',
    borderRadius: '4px',
    marginBottom: '4px',
    fontSize: '10px'
  },
  effectEnabled: {
    width: '16px',
    height: '16px',
    borderRadius: '3px',
    backgroundColor: '#4a90d9',
    cursor: 'pointer'
  },
  effectDisabled: {
    width: '16px',
    height: '16px',
    borderRadius: '3px',
    backgroundColor: '#3a3a3a',
    cursor: 'pointer'
  },
  masterSection: {
    display: 'flex',
    backgroundColor: '#2a2a2a',
    borderRadius: '6px',
    padding: '15px',
    margin: '10px',
    gap: '20px'
  },
  masterFader: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '8px'
  },
  masterMeter: {
    width: '20px',
    height: '120px',
    backgroundColor: '#1a1a1a',
    borderRadius: '3px',
    overflow: 'hidden' as const,
    display: 'flex',
    flexDirection: 'column-reverse' as const
  },
  addTrackButton: {
    width: '100%',
    padding: '10px',
    backgroundColor: 'transparent',
    border: '2px dashed #3a3a3a',
    borderRadius: '6px',
    color: '#888',
    cursor: 'pointer',
    fontSize: '12px',
    marginTop: '8px'
  }
};

// ============================================================================
// AudioMixingPanel Component
// ============================================================================

export const AudioMixingPanel: React.FC = () => {
  const {
    state,
    initialize,
    play,
    pause,
    stop,
    seek,
    setMasterVolume,
    setMasterMuted,
    addTrack,
    removeTrack,
    updateTrack,
    setTrackVolume,
    setTrackPan,
    setTrackMuted,
    setTrackSolo,
    addEffect,
    removeEffect,
    updateEffect
  } = useAudioMixing();

  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);

  // Initialize audio context on first interaction
  const handlePlay = useCallback(async () => {
    if (state.audioContextState === 'suspended') {
      await initialize();
    }
    play();
  }, [initialize, play, state.audioContextState]);

  // Add a new track
  const handleAddTrack = useCallback(() => {
    const trackColors = ['#4a90d9', '#50c878', '#ff6b6b', '#ffd93d', '#9b59b6', '#3498db'];
    const trackTypes: Array<'voice' | 'music' | 'sfx' | 'ambient' | 'narration'> = ['voice', 'music', 'sfx', 'ambient', 'narration'];

    addTrack({
      name: `Track ${state.tracks.size + 1}`,
      type: trackTypes[state.tracks.size % trackTypes.length],
      src: '',
      volume: 0.8,
      pan: 0,
      muted: false,
      solo: false,
      locked: false,
      startTime: 0,
      duration: 0,
      fadeIn: 0,
      fadeOut: 0,
      effects: [],
      color: trackColors[state.tracks.size % trackColors.length]
    });
  }, [addTrack, state.tracks.size]);

  // Render a single track
  const renderTrack = useCallback((track: AudioTrack) => {
    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setTrackVolume(track.id, parseFloat(e.target.value));
    };

    const handlePanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setTrackPan(track.id, parseFloat(e.target.value));
    };

    const toggleMute = () => {
      setTrackMuted(track.id, !track.muted);
    };

    const toggleSolo = () => {
      setTrackSolo(track.id, !track.solo);
    };

    const handleRemove = () => {
      removeTrack(track.id);
    };

    const peakLevel = 0; // Placeholder for meter visualization

    return (
      <div 
        key={track.id} 
        style={{
          ...styles.track,
          borderLeft: `3px solid ${track.color}`
        }}
        onClick={() => setSelectedTrackId(track.id)}
      >
        {/* Track Header */}
        <div style={styles.trackHeader}>
          <div style={styles.trackName}>{track.name}</div>
          <div style={styles.trackType}>{track.type}</div>
          <div style={styles.trackControls}>
            <button 
              style={track.muted ? styles.activeButton : styles.smallButton}
              onClick={toggleMute}
            >
              M
            </button>
            <button 
              style={track.solo ? styles.activeButton : styles.smallButton}
              onClick={toggleSolo}
            >
              S
            </button>
            <button 
              style={styles.smallButton}
              onClick={handleRemove}
            >
              ×
            </button>
          </div>
        </div>

        {/* Track Faders */}
        <div style={styles.trackFaders}>
          {/* Volume Fader */}
          <div style={styles.faderRow}>
            <span style={styles.faderLabel}>Vol</span>
            <div style={styles.fader}>
              <div style={{
                ...styles.faderFill,
                height: `${track.volume * 100}%`
              }} />
              <span style={styles.faderValue}>{Math.round(track.volume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={track.volume}
              onChange={handleVolumeChange}
              style={{ width: '100px' }}
            />
          </div>

          {/* Pan */}
          <div style={styles.faderRow}>
            <span style={styles.faderLabel}>Pan</span>
            <div style={styles.panKnob}>
              <div style={{
                ...styles.panIndicator,
                transform: `translateX(${track.pan * 12}px)`
              }} />
            </div>
            <input
              type="range"
              min="-1"
              max="1"
              step="0.01"
              value={track.pan}
              onChange={handlePanChange}
              style={{ width: '100px' }}
            />
          </div>
        </div>

        {/* Level Meter */}
        <div style={styles.meter}>
          <div style={{
            ...styles.meterFill,
            height: `${peakLevel * 100}%`
          }} />
        </div>

        {/* Effects */}
        {track.effects.length > 0 && (
          <div style={styles.effectsSection}>
            <div style={styles.effectsHeader}>
              <span>Effects</span>
            </div>
            {track.effects.map(effect => (
              <div key={effect.id} style={styles.effect}>
                <div 
                  style={effect.enabled ? styles.effectEnabled : styles.effectDisabled}
                  onClick={() => updateEffect(track.id, effect.id, { enabled: !effect.enabled })}
                />
                <span>{effect.type}</span>
                <button
                  style={styles.smallButton}
                  onClick={() => removeEffect(track.id, effect.id)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }, [setTrackVolume, setTrackPan, setTrackMuted, setTrackSolo, removeTrack, addEffect, removeEffect, updateEffect]);

  return (
    <div style={styles.panel}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.title}>Audio Mixer</span>
        <div style={styles.controls}>
          <button style={styles.button} onClick={stop}>■</button>
          <button style={state.isPlaying ? styles.primaryButton : styles.button} onClick={handlePlay}>
            {state.isPlaying ? 'Pause' : 'Play'}
          </button>
        </div>
      </div>

      {/* Master Section */}
      <div style={styles.masterSection}>
        <div style={styles.masterFader}>
          <span style={{ fontSize: '11px' }}>Master</span>
          <div style={styles.masterMeter}>
            <div style={{ ...styles.meterFill, height: '50%' }} />
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={state.masterVolume}
            onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
            style={{ width: '100px' }}
          />
          <span style={{ fontSize: '10px' }}>{Math.round(state.masterVolume * 100)}%</span>
        </div>
      </div>

      {/* Tracks */}
      <div style={styles.tracksContainer}>
        {Array.from(state.tracks.values()).map(track => renderTrack(track))}

        <button style={styles.addTrackButton} onClick={handleAddTrack}>
          + Add Track
        </button>
      </div>
    </div>
  );
};

export default AudioMixingPanel;
