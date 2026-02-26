/**
 * Surround Mixer Component
 * 
 * Professional surround sound mixer with support for:
 * - Stereo, 2.1, 5.1, 7.1 speaker configurations
 * - Surwoofer/LFE channel management
 * - Individual speaker volume and delay controls
 * - Visual speaker position diagram
 * - Room acoustics simulation
 * 
 * Requirements: Enhanced Audio System - Surround Sound
 */

import React, { useState, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  setSpeakerConfig,
  setSpeakerVolume,
  setSpeakerMuted,
  setSpeakerDelay,
  toggleSpeakerSolo,
  setRoomAcoustics,
  startCalibration,
  selectSpeakerConfig,
  selectSpeakerConfiguration,
  selectSpeakerSettings,
  selectSubwooferSettings,
  selectRoomAcoustics,
  selectIsCalibrating,
  selectCalibrationProgress,
  selectActiveChannels,
  SpeakerChannel,
  SpeakerConfig,
  SPEAKER_CONFIGURATIONS,
} from '../../store/slices/audioSlice';
import './surroundMixer.css';

// =============================================================================
// Types
// =============================================================================

interface SpeakerPosition {
  channel: SpeakerChannel;
  label: string;
  x: number;  // percentage position
  y: number;
  shortLabel: string;
}

// =============================================================================
// Constants
// =============================================================================

const SPEAKER_POSITIONS: SpeakerPosition[] = [
  { channel: 'frontLeft', label: 'Front Left', x: 15, y: 20, shortLabel: 'FL' },
  { channel: 'frontRight', label: 'Front Right', x: 85, y: 20, shortLabel: 'FR' },
  { channel: 'center', label: 'Center', x: 50, y: 15, shortLabel: 'C' },
  { channel: 'lfe', label: 'Subwoofer (LFE)', x: 50, y: 85, shortLabel: 'LFE' },
  { channel: 'surroundLeft', label: 'Surround Left', x: 5, y: 50, shortLabel: 'SL' },
  { channel: 'surroundRight', label: 'Surround Right', x: 95, y: 50, shortLabel: 'SR' },
  { channel: 'backLeft', label: 'Back Left', x: 15, y: 80, shortLabel: 'BL' },
  { channel: 'backRight', label: 'Back Right', x: 85, y: 80, shortLabel: 'BR' },
];

const CONFIG_LABELS: Record<SpeakerConfig, string> = {
  stereo: 'Stereo (2.0)',
  '2.1': 'Stereo + Subwoofer (2.1)',
  '5.1': 'Surround 5.1',
  '7.1': 'Surround 7.1',
};

const ROOM_SIZES = [
  { id: 'small', label: 'Small Room', reverb: 0.3 },
  { id: 'medium', label: 'Medium Room', reverb: 0.5 },
  { id: 'large', label: 'Large Hall', reverb: 1.0 },
  { id: 'hall', label: 'Concert Hall', reverb: 1.5 },
  { id: 'stadium', label: 'Stadium', reverb: 2.5 },
];

// =============================================================================
// Component
// =============================================================================

export const SurroundMixer: React.FC = () => {
  const dispatch = useAppDispatch();
  
  // Redux state
  const speakerConfig = useAppSelector(selectSpeakerConfig);
  const speakerConfiguration = useAppSelector(selectSpeakerConfiguration);
  const speakerSettings = useAppSelector(selectSpeakerSettings);
  const subwooferSettings = useAppSelector(selectSubwooferSettings);
  const roomAcoustics = useAppSelector(selectRoomAcoustics);
  const isCalibrating = useAppSelector(selectIsCalibrating);
  const calibrationProgress = useAppSelector(selectCalibrationProgress);
  const activeChannels = useAppSelector(selectActiveChannels);
  
  // Local state
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedSpeaker, setSelectedSpeaker] = useState<SpeakerChannel | null>(null);
  
  // ==========================================================================
  // Handlers
  // ==========================================================================
  
  const handleConfigChange = useCallback((config: SpeakerConfig) => {
    dispatch(setSpeakerConfig(config));
  }, [dispatch]);
  
  const handleSpeakerVolumeChange = useCallback((channel: SpeakerChannel, volume: number) => {
    dispatch(setSpeakerVolume({ channel, volume }));
  }, [dispatch]);
  
  const handleSpeakerMuteToggle = useCallback((channel: SpeakerChannel) => {
    const settings = speakerSettings[channel];
    dispatch(setSpeakerMuted({ channel, muted: !settings.muted }));
  }, [dispatch, speakerSettings]);
  
  const handleSpeakerDelayChange = useCallback((channel: SpeakerChannel, delay: number) => {
    dispatch(setSpeakerDelay({ channel, delay }));
  }, [dispatch]);
  
  const handleSpeakerSoloToggle = useCallback((channel: SpeakerChannel) => {
    dispatch(toggleSpeakerSolo(channel));
  }, [dispatch]);
  
  const handleRoomSizeChange = useCallback((size: 'small' | 'medium' | 'large' | 'hall' | 'stadium') => {
    const roomConfig = ROOM_SIZES.find(r => r.id === size);
    dispatch(setRoomAcoustics({
      roomSize: size,
      reverbTime: roomConfig?.reverb || 0.5,
    }));
  }, [dispatch]);
  
  const handleCalibration = useCallback(() => {
    dispatch(startCalibration());
    // Simulate calibration process
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      if (progress >= 100) {
        clearInterval(interval);
        dispatch({ type: 'audio/finishCalibration' });
      } else {
        dispatch({ type: 'audio/setCalibrationProgress', payload: progress });
      }
    }, 500);
  }, [dispatch]);
  
  // ==========================================================================
  // Render
  // ==========================================================================
  
  const activeSpeakerPositions = SPEAKER_POSITIONS.filter(pos => 
    activeChannels.includes(pos.channel)
  );
  
  return (
    <div className="surround-mixer">
      {/* Header */}
      <div className="surround-header">
        <h3>Surround Sound Mixer</h3>
        <button
          className="advanced-toggle"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          {showAdvanced ? 'Simple' : 'Advanced'}
        </button>
      </div>
      
      {/* Speaker Configuration Selector */}
      <div className="config-selector">
        <label>Speaker Configuration</label>
        <div className="config-buttons">
          {(Object.keys(SPEAKER_CONFIGURATIONS) as SpeakerConfig[]).map(config => (
            <button
              key={config}
              className={`config-btn ${speakerConfig === config ? 'active' : ''}`}
              onClick={() => handleConfigChange(config)}
            >
              <span className="config-name">{CONFIG_LABELS[config]}</span>
              <span className="config-channels">
                {SPEAKER_CONFIGURATIONS[config].channelCount} ch
              </span>
            </button>
          ))}
        </div>
      </div>
      
      {/* Speaker Diagram */}
      <div className="speaker-diagram">
        <div className="diagram-container">
          {/* Room outline */}
          <div className="room-outline">
            <span className="room-label-front">FRONT</span>
            <span className="room-label-back">BACK</span>
          </div>
          
          {/* Listener position (sweet spot) */}
          <div 
            className="listener-position"
            style={{
              left: `${50 + roomAcoustics.listenerPosition.x * 30}%`,
              top: `${50 + roomAcoustics.listenerPosition.y * 30}%`,
            }}
          >
            👤
          </div>
          
          {/* Speaker positions */}
          {activeSpeakerPositions.map(pos => {
            const settings = speakerSettings[pos.channel];
            const isSelected = selectedSpeaker === pos.channel;
            const isLFE = pos.channel === 'lfe';
            
            return (
              <div
                key={pos.channel}
                className={`speaker-node ${isSelected ? 'selected' : ''} ${settings.muted ? 'muted' : ''} ${settings.solo ? 'solo' : ''} ${isLFE ? 'lfe' : ''}`}
                style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                onClick={() => setSelectedSpeaker(pos.channel)}
              >
                <span className="speaker-label">{pos.shortLabel}</span>
                <div className="speaker-level">
                  <div 
                    className="level-fill"
                    style={{ height: `${settings.volume * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Selected Speaker Controls */}
      {selectedSpeaker && speakerSettings[selectedSpeaker] && (
        <div className="speaker-controls">
          <div className="speaker-control-header">
            <span className="speaker-name">
              {SPEAKER_POSITIONS.find(p => p.channel === selectedSpeaker)?.label}
            </span>
            <div className="speaker-buttons">
              <button
                className={`speaker-btn mute ${speakerSettings[selectedSpeaker].muted ? 'active' : ''}`}
                onClick={() => handleSpeakerMuteToggle(selectedSpeaker)}
              >
                M
              </button>
              <button
                className={`speaker-btn solo ${speakerSettings[selectedSpeaker].solo ? 'active' : ''}`}
                onClick={() => handleSpeakerSoloToggle(selectedSpeaker)}
              >
                S
              </button>
            </div>
          </div>
          
          <div className="speaker-volume">
            <label>Volume: {Math.round(speakerSettings[selectedSpeaker].volume * 100)}%</label>
            <input
              type="range"
              min="0"
              max="100"
              value={speakerSettings[selectedSpeaker].volume * 100}
              onChange={(e) => handleSpeakerVolumeChange(selectedSpeaker, parseInt(e.target.value) / 100)}
              className="volume-slider"
            />
          </div>
          
          {showAdvanced && (
            <div className="speaker-delay">
              <label>Delay: {speakerSettings[selectedSpeaker].delay}ms</label>
              <input
                type="range"
                min="0"
                max="100"
                value={speakerSettings[selectedSpeaker].delay}
                onChange={(e) => handleSpeakerDelayChange(selectedSpeaker, parseInt(e.target.value))}
                className="delay-slider"
              />
              <span className="delay-hint">For speaker distance calibration</span>
            </div>
          )}
        </div>
      )}
      
      {/* Subwoofer/LFE Section */}
      {speakerConfiguration.hasLFE && (
        <div className="subwoofer-section">
          <div className="section-header">
            <h4>🔊 Subwoofer / LFE</h4>
            <span className={`status ${subwooferSettings.enabled ? 'active' : 'inactive'}`}>
              {subwooferSettings.enabled ? 'Active' : 'Inactive'}
            </span>
          </div>
          
          <div className="subwoofer-controls">
            <div className="control-row">
              <div className="control-group">
                <label>Volume</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={subwooferSettings.volume * 100}
                  onChange={(e) => dispatch({ 
                    type: 'audio/setSubwooferVolume', 
                    payload: parseInt(e.target.value) / 100 
                  })}
                  className="sub-volume-slider"
                />
                <span>{Math.round(subwooferSettings.volume * 100)}%</span>
              </div>
              
              <div className="control-group">
                <label>Crossover</label>
                <input
                  type="range"
                  min="40"
                  max="200"
                  value={subwooferSettings.crossoverFrequency}
                  onChange={(e) => dispatch({ 
                    type: 'audio/setCrossoverFrequency', 
                    payload: parseInt(e.target.value) 
                  })}
                  className="crossover-slider"
                />
                <span>{subwooferSettings.crossoverFrequency}Hz</span>
              </div>
            </div>
            
            {showAdvanced && (
              <div className="control-row advanced">
                <div className="control-group">
                  <label>Phase</label>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={subwooferSettings.phase}
                    onChange={(e) => dispatch({ 
                      type: 'audio/setSubwooferPhase', 
                      payload: parseInt(e.target.value) 
                    })}
                    className="phase-slider"
                  />
                  <span>{subwooferSettings.phase}°</span>
                </div>
                
                <div className="control-group">
                  <label>Gain</label>
                  <input
                    type="range"
                    min="-10"
                    max="10"
                    value={subwooferSettings.gain}
                    onChange={(e) => dispatch({ 
                      type: 'audio/setSubwooferGain', 
                      payload: parseInt(e.target.value) 
                    })}
                    className="gain-slider"
                  />
                  <span>{subwooferSettings.gain > 0 ? '+' : ''}{subwooferSettings.gain}dB</span>
                </div>
              </div>
            )}
            
            {showAdvanced && (
              <div className="lowpass-section">
                <h5>Low-Pass Filter</h5>
                <div className="control-row">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={subwooferSettings.lowPassFilter.enabled}
                      onChange={(e) => dispatch({
                        type: 'audio/setLowPassFilter',
                        payload: { enabled: e.target.checked }
                      })}
                    />
                    <span>Enable LPF</span>
                  </label>
                  
                  <div className="control-group">
                    <label>Freq</label>
                    <input
                      type="range"
                      min="40"
                      max="200"
                      value={subwooferSettings.lowPassFilter.frequency}
                      onChange={(e) => dispatch({
                        type: 'audio/setLowPassFilter',
                        payload: { frequency: parseInt(e.target.value) }
                      })}
                      disabled={!subwooferSettings.lowPassFilter.enabled}
                    />
                    <span>{subwooferSettings.lowPassFilter.frequency}Hz</span>
                  </div>
                  
                  <div className="control-group">
                    <label>Slope</label>
                    <select
                      value={subwooferSettings.lowPassFilter.slope}
                      onChange={(e) => dispatch({
                        type: 'audio/setLowPassFilter',
                        payload: { slope: parseInt(e.target.value) }
                      })}
                      disabled={!subwooferSettings.lowPassFilter.enabled}
                    >
                      <option value={12}>12 dB/oct</option>
                      <option value={18}>18 dB/oct</option>
                      <option value={24}>24 dB/oct</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Room Acoustics */}
      {showAdvanced && (
        <div className="room-acoustics">
          <div className="section-header">
            <h4>🏠 Room Acoustics</h4>
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={roomAcoustics.enabled}
                onChange={(e) => dispatch(setRoomAcoustics({ enabled: e.target.checked }))}
              />
              <span>Enable</span>
            </label>
          </div>
          
          <div className="acoustics-controls">
            <div className="control-group">
              <label>Room Size</label>
              <div className="room-size-buttons">
                {ROOM_SIZES.map(room => (
                  <button
                    key={room.id}
                    className={`room-btn ${roomAcoustics.roomSize === room.id ? 'active' : ''}`}
                    onClick={() => handleRoomSizeChange(room.id as 'small' | 'medium' | 'large' | 'hall' | 'stadium')}
                    disabled={!roomAcoustics.enabled}
                  >
                    {room.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="control-group">
              <label>Reverb Time (RT60): {roomAcoustics.reverbTime}s</label>
              <input
                type="range"
                min="0.1"
                max="3"
                step="0.1"
                value={roomAcoustics.reverbTime}
                onChange={(e) => dispatch(setRoomAcoustics({ reverbTime: parseFloat(e.target.value) }))}
                disabled={!roomAcoustics.enabled}
              />
            </div>
            
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={roomAcoustics.earlyReflections}
                onChange={(e) => dispatch(setRoomAcoustics({ earlyReflections: e.target.checked }))}
                disabled={!roomAcoustics.enabled}
              />
              <span>Early Reflections</span>
            </label>
          </div>
        </div>
      )}
      
      {/* Calibration */}
      <div className="calibration-section">
        <button
          className="calibrate-btn"
          onClick={handleCalibration}
          disabled={isCalibrating}
        >
          {isCalibrating ? (
            <>
              <span className="spinner"></span>
              Calibrating... {calibrationProgress}%
            </>
          ) : (
            '🎯 Auto-Calibrate Speakers'
          )}
        </button>
        <p className="calibration-hint">
          Automatically adjust speaker delays based on distance
        </p>
      </div>
      
      {/* Channel Summary */}
      <div className="channel-summary">
        <div className="summary-header">
          <span>Configuration: {CONFIG_LABELS[speakerConfig]}</span>
          <span>{speakerConfiguration.channelCount} channels</span>
        </div>
        <div className="channel-meters">
          {activeChannels.map(channel => (
            <div key={channel} className="channel-meter">
              <span className="meter-label">
                {SPEAKER_POSITIONS.find(p => p.channel === channel)?.shortLabel}
              </span>
              <div className="meter-bar">
                <div 
                  className="meter-fill"
                  style={{ width: `${speakerSettings[channel].volume * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SurroundMixer;