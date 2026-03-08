/**
 * Audio Mixer Panel Component
 * 
 * Provides UI for audio mixing and generation:
 * - Multi-track audio generation (Music, SFX, Voice)
 * - Auto-mix with ducking controls
 * - Audio export with format selection
 * - Waveform visualization
 * - Surround sound support (5.1, 7.1, Subwoofer)
 * 
 * Requirements: Phase 3 - Integrate audio backend features into UI
 * Phase 2 - Connected to Redux store
 * Enhanced: Surround Sound System
 */

import React, { useState, useCallback } from 'react';
import { useAppSelector } from '../../store';
import { SurroundMixer } from './SurroundMixer';
import { WaveformVisualizer } from './WaveformVisualizer';
import './audioMixerPanel.css';
import './waveformVisualizer.css';

// =============================================================================
// Types
// =============================================================================

type AudioProfileType = 'music' | 'sfx' | 'voice';

interface AudioTrack {
  id: string;
  name: string;
  type: AudioProfileType;
  volume: number;
  pan: number;
  muted: boolean;
  solo: boolean;
}

interface MixConfiguration {
  masterVolume: number;
  autoMixEnabled: boolean;
  duckingEnabled: boolean;
  duckingLevel: number;
}

// =============================================================================
// Constants
// =============================================================================

const MUSIC_THEMES = [
  'Action', 'Drama', 'Comedy', 'Romance', 'Horror', 
  'Documentary', 'Sci-Fi', 'Fantasy', 'Thriller', 'Adventure'
];

const LOCATIONS = [
  'Indoor', 'Outdoor', 'Urban', 'Rural', 'Underwater', 
  'Space', 'Forest', 'Desert', 'Mountain', 'City'
];

const SFX_CATEGORIES = [
  'Footsteps', 'Door', 'Vehicle', 'Nature', 'Weather',
  'Weapon', 'Impact', 'Electronic', 'Human', 'Animal'
];

const VOICE_TYPES = [
  'Narrator', 'Dialogue', 'Announcer', 'Character', 'Voice-over'
];

const VOICE_STYLES = [
  'Neutral', 'Energetic', 'Calm', 'Aggressive', 'Mysterious', 'Friendly'
];

const EXPORT_FORMATS = [
  { id: 'wav', name: 'WAV', description: 'Lossless quality' },
  { id: 'mp3', name: 'MP3', description: 'Compressed' },
  { id: 'flac', name: 'FLAC', description: 'Lossless' },
  { id: 'aac', name: 'AAC', description: 'High efficiency' },
];

// =============================================================================
// Component
// =============================================================================

export const AudioMixerPanel: React.FC = () => {
  const projectId = useAppSelector((state) => state.project.metadata?.id);
  
  // Active tab - include 'surround' tab
  const [activeTab, setActiveTab] = useState<'mix' | 'surround' | 'generate' | 'export'>('mix');
  
  // Track state
  const [tracks, setTracks] = useState<AudioTrack[]>([
    { id: 'music-1', name: 'Background Music', type: 'music', volume: 0.8, pan: 0, muted: false, solo: false },
    { id: 'sfx-1', name: 'Sound Effects', type: 'sfx', volume: 0.7, pan: 0, muted: false, solo: false },
    { id: 'voice-1', name: 'Voice Over', type: 'voice', volume: 1.0, pan: 0, muted: false, solo: false },
  ]);
  
  // Mix configuration
  const [mixConfig, setMixConfig] = useState<MixConfiguration>({
    masterVolume: 0.8,
    autoMixEnabled: true,
    duckingEnabled: true,
    duckingLevel: -20,
  });
  
  // Generation state
  const [profileType, setProfileType] = useState<AudioProfileType>('music');
  const [selectedTheme, setSelectedTheme] = useState('Action');
  const [selectedLocation, setSelectedLocation] = useState('Indoor');
  const [duration, setDuration] = useState(30);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [exportFormat, setExportFormat] = useState('wav');
  const [isExporting, setIsExporting] = useState(false);
  
  // Sentiment Analysis state
  const projectDescription = useAppSelector((state) => state.project.metadata?.description || '');
  const [analysisText, setAnalysisText] = useState(projectDescription);
  const [detectedSentiment, setDetectedSentiment] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // =============================================================================
  // Handlers
  // =============================================================================
  
  const handleVolumeChange = useCallback((trackId: string, volume: number) => {
    setTracks(prev => prev.map(t => 
      t.id === trackId ? { ...t, volume } : t
    ));
  }, []);
  
  const handlePanChange = useCallback((trackId: string, pan: number) => {
    setTracks(prev => prev.map(t => 
      t.id === trackId ? { ...t, pan } : t
    ));
  }, []);
  
  const handleToggleMute = useCallback((trackId: string) => {
    setTracks(prev => prev.map(t => 
      t.id === trackId ? { ...t, muted: !t.muted } : t
    ));
  }, []);
  
  const handleToggleSolo = useCallback((trackId: string) => {
    setTracks(prev => prev.map(t => 
      t.id === trackId ? { ...t, solo: !t.solo } : t
    ));
  }, []);

  const handleSmartPredict = useCallback(async () => {
    if (!analysisText) return;
    
    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/audio/analyze-sentiment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: analysisText }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setDetectedSentiment(data.sentiment);
        
        // Auto-apply suggested profile
        if (data.suggested_audio_profile) {
          const profile = data.suggested_audio_profile;
          if (profile.theme) setSelectedTheme(profile.theme);
          // You could also set intensity/tempo if those state variables existed
          console.log('Smart Predict suggests:', profile);
        }
      }
    } catch (error) {
      console.error('Sentiment analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [analysisText]);
  
  const handleGenerateAudio = useCallback(async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/audio/generate-multitrack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId || 'default',
          profile_type: profileType,
          themes: [selectedTheme],
          location: selectedLocation,
          duration_seconds: duration,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Audio generated:', data);
      }
    } catch (error) {
      console.error('Audio generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [projectId, profileType, selectedTheme, selectedLocation, duration]);
  
  const handleAutoMix = useCallback(async () => {
    try {
      const response = await fetch('/api/audio/automix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId || 'default',
          track_ids: tracks.map(t => t.id),
          auto_mix_enabled: mixConfig.autoMixEnabled,
          ducking_enabled: mixConfig.duckingEnabled,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Auto-mix result:', data);
        // Apply mix settings from response
        if (data.configuration?.tracks) {
          setTracks(prev => prev.map(t => {
            const mixTrack = data.configuration.tracks.find((mt: { id: string }) => mt.id === t.id);
            return mixTrack ? { ...t, volume: mixTrack.volume, pan: mixTrack.pan } : t;
          }));
        }
      }
    } catch (error) {
      console.error('Auto-mix failed:', error);
    }
  }, [projectId, tracks, mixConfig]);
  
  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/audio/export-mix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId || 'default',
          format: exportFormat,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Export result:', data);
        // Handle download
        if (data.output_path) {
          window.open(data.output_path, '_blank');
        }
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  }, [projectId, exportFormat]);
  
  // =============================================================================
  // Render
  // =============================================================================
  
  return (
    <div className="audio-mixer-panel">
      {/* Tabs */}
      <div className="audio-mixer-tabs">
        <button
          className={`mixer-tab ${activeTab === 'mix' ? 'active' : ''}`}
          onClick={() => setActiveTab('mix')}
        >
          Mix
        </button>
        <button
          className={`mixer-tab ${activeTab === 'surround' ? 'active' : ''}`}
          onClick={() => setActiveTab('surround')}
        >
          Surround
        </button>
        <button
          className={`mixer-tab ${activeTab === 'generate' ? 'active' : ''}`}
          onClick={() => setActiveTab('generate')}
        >
          Generate
        </button>
        <button
          className={`mixer-tab ${activeTab === 'export' ? 'active' : ''}`}
          onClick={() => setActiveTab('export')}
        >
          Export
        </button>
      </div>
      
      {/* Content */}
      <div className="audio-mixer-content">
        {/* Mix Tab */}
        {activeTab === 'mix' && (
          <div className="mixer-section">
            {/* Master Volume */}
            <div className="master-section">
              <div className="master-header">
                <span className="master-label">Master</span>
                <span className="master-value">{Math.round(mixConfig.masterVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={mixConfig.masterVolume * 100}
                onChange={(e) => setMixConfig(prev => ({ ...prev, masterVolume: parseInt(e.target.value) / 100 }))}
                className="master-slider"
                aria-label="Master volume"
              />
            </div>
            
            {/* Auto-Mix Options */}
            <div className="mix-options">
              <label className="mix-option">
                <input
                  type="checkbox"
                  checked={mixConfig.autoMixEnabled}
                  onChange={(e) => setMixConfig(prev => ({ ...prev, autoMixEnabled: e.target.checked }))}
                />
                <span>Auto-Mix</span>
              </label>
              <label className="mix-option">
                <input
                  type="checkbox"
                  checked={mixConfig.duckingEnabled}
                  onChange={(e) => setMixConfig(prev => ({ ...prev, duckingEnabled: e.target.checked }))}
                />
                <span>Voice Ducking</span>
              </label>
            </div>
            
            <button className="apply-mix-btn" onClick={handleAutoMix}>
              Apply Auto-Mix
            </button>
            
            {/* Track List */}
            <div className="track-list">
              {tracks.map(track => (
                <div key={track.id} className={`track-item ${track.muted ? 'muted' : ''}`}>
                  <div className="track-header">
                    <span className="track-name">{track.name}</span>
                    <span className="track-type">{track.type}</span>
                  </div>
                  
                  <div className="track-controls">
                    <div className="track-fader">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={track.volume * 100}
                        onChange={(e) => handleVolumeChange(track.id, parseInt(e.target.value) / 100)}
                        className="fader-slider"
                        aria-label={`${track.name} volume`}
                      />
                      <span className="fader-value">{Math.round(track.volume * 100)}%</span>
                    </div>
                    
                    <div className="track-waveform">
                      <WaveformVisualizer 
                        height={40} 
                        color={track.type === 'music' ? '#3b82f6' : track.type === 'voice' ? '#10b981' : '#f59e0b'}
                        currentTime={0}
                        duration={30}
                      />
                    </div>
                    
                    <div className="track-pan">
                      <span>Pan</span>
                      <input
                        type="range"
                        min="-100"
                        max="100"
                        value={track.pan * 100}
                        onChange={(e) => handlePanChange(track.id, parseInt(e.target.value) / 100)}
                        className="pan-slider"
                        aria-label={`${track.name} pan`}
                      />
                    </div>
                    
                    <div className="track-buttons">
                      <button
                        className={`track-btn mute-btn ${track.muted ? 'active' : ''}`}
                        onClick={() => handleToggleMute(track.id)}
                      >
                        M
                      </button>
                      <button
                        className={`track-btn solo-btn ${track.solo ? 'active' : ''}`}
                        onClick={() => handleToggleSolo(track.id)}
                      >
                        S
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Surround Tab */}
        {activeTab === 'surround' && (
          <SurroundMixer />
        )}
        
        {/* Generate Tab */}
        {activeTab === 'generate' && (
          <div className="generate-section">
            <div className="section-header-row">
              <h4>Generate Audio</h4>
              <div className="sentiment-badge-container">
                {detectedSentiment && (
                  <span className={`sentiment-badge ${detectedSentiment}`}>
                    ✨ {detectedSentiment.toUpperCase()}
                  </span>
                )}
              </div>
            </div>

            <div className="form-group analysis-group">
              <label>Analyze Narrative for Suggestions</label>
              <div className="analysis-input-wrapper">
                <textarea
                  className="analysis-textarea"
                  value={analysisText}
                  onChange={(e) => setAnalysisText(e.target.value)}
                  placeholder="Paste your script or scene description here..."
                />
                <button 
                  className={`predict-btn ${isAnalyzing ? 'loading' : ''}`}
                  onClick={handleSmartPredict}
                  disabled={isAnalyzing || !analysisText}
                >
                  {isAnalyzing ? 'Analyzing...' : 'Smart Predict'}
                </button>
              </div>
            </div>
            
            <div className="form-group">
              <label>Audio Type</label>
              <div className="type-buttons">
                <button
                  className={`type-btn ${profileType === 'music' ? 'active' : ''}`}
                  onClick={() => setProfileType('music')}
                >
                  🎵 Music
                </button>
                <button
                  className={`type-btn ${profileType === 'sfx' ? 'active' : ''}`}
                  onClick={() => setProfileType('sfx')}
                >
                  🔊 SFX
                </button>
                <button
                  className={`type-btn ${profileType === 'voice' ? 'active' : ''}`}
                  onClick={() => setProfileType('voice')}
                >
                  🎤 Voice
                </button>
              </div>
            </div>
            
            {profileType === 'music' && (
              <>
                <div className="form-group">
                  <label>Theme</label>
                  <select
                    value={selectedTheme}
                    onChange={(e) => setSelectedTheme(e.target.value)}
                    className="form-select"
                    title="Select music theme"
                  >
                    {MUSIC_THEMES.map(theme => (
                      <option key={theme} value={theme}>{theme}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Location</label>
                  <select
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    className="form-select"
                    title="Select location"
                  >
                    {LOCATIONS.map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
            
            {profileType === 'sfx' && (
              <div className="form-group">
                <label>Category</label>
                <select className="form-select" title="Select SFX category">
                  {SFX_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            )}
            
            {profileType === 'voice' && (
              <>
                <div className="form-group">
                  <label>Voice Type</label>
                  <select className="form-select" title="Select voice type">
                    {VOICE_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Style</label>
                  <select className="form-select" title="Select voice style">
                    {VOICE_STYLES.map(style => (
                      <option key={style} value={style}>{style}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
            
            <div className="form-group">
              <label>Duration: {duration}s</label>
              <input
                type="range"
                min="10"
                max="300"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value))}
                className="duration-slider"
                aria-label="Audio duration in seconds"
              />
            </div>
            
            <button
              className="generate-btn"
              onClick={handleGenerateAudio}
              disabled={isGenerating}
            >
              {isGenerating ? 'Generating...' : 'Generate Audio'}
            </button>
          </div>
        )}
        
        {/* Export Tab */}
        {activeTab === 'export' && (
          <div className="export-section">
            <h4>Export Audio</h4>
            
            <div className="form-group">
              <label>Format</label>
              <div className="format-grid">
                {EXPORT_FORMATS.map(fmt => (
                  <button
                    key={fmt.id}
                    className={`format-btn ${exportFormat === fmt.id ? 'active' : ''}`}
                    onClick={() => setExportFormat(fmt.id)}
                  >
                    <span className="format-name">{fmt.name}</span>
                    <span className="format-desc">{fmt.description}</span>
                  </button>
                ))}
              </div>
            </div>
            
            <button
              className="export-btn"
              onClick={handleExport}
              disabled={isExporting}
            >
              {isExporting ? 'Exporting...' : 'Export Mix'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AudioMixerPanel;

