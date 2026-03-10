/**
 * Audio Mixer Panel Component
 * Audio levels and effects
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useVideoEditor } from '../../../contexts/VideoEditorContext';
import { Track, Clip } from '../../../types/video-editor';
import { cinematicAudioService } from '../../../services/CinematicAudioService';
import './AudioMixerPanel.css';

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

export const AudioMixerPanel: React.FC = () => {
  const { tracks, clips, updateTrack, isolateVoice, autoDucking, aiJobs } = useVideoEditor();
  const [masterVolume, setMasterVolume] = useState(80);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sfxPrompt, setSfxPrompt] = useState("");
  const [activeTab, setActiveTab] = useState<'mixer' | 'ai'>('mixer');

  const audioTracks = tracks.filter((t: Track) => t.type === 'audio');
  const videoClips = clips.filter((c: Clip) => !('volume' in c));

  const activeAudioJob = useMemo(() => {
    return Object.values(aiJobs).find(job => 
      (job.status === 'pending' || job.status === 'processing') && 
      (job.type === 'voice_isolation' || job.type === 'auto_ducking')
    );
  }, [aiJobs]);

  const handleTrackVolumeChange = useCallback(
    (trackId: string, newVolume: number) => {
      updateTrack(trackId, { volume: newVolume / 100 });
    },
    [updateTrack]
  );

  const handleGenerateSFX = async () => {
    if (!sfxPrompt) return;
    setIsGenerating(true);
    try {
      const result = await cinematicAudioService.generateSFX(sfxPrompt);
      if (result.success) {
        console.log('SFX Generated:', result.url);
        // Add to media library (mock)
      }
    } finally {
      setIsGenerating(false);
      setSfxPrompt("");
    }
  };

  const handleV2ASync = async () => {
    setIsGenerating(true);
    try {
      // Analyze video clips to find motion events
      const analysisPrompt = videoClips.length > 0 
        ? `Generate synchronized foley for ${videoClips.length} clips with varying motion intensity.`
        : "Generate ambient city soundscape with distant traffic and wind.";
      
      const result = await cinematicAudioService.syncVideoAudio(analysisPrompt);
      if (result.success) {
        console.log('V2A Sync Completed:', result.url);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="audio-mixer-panel">
      <div className="panel-header">
        <h3>Audio Mixer</h3>
      </div>

      <div className="panel-tabs">
        <button 
          className={`mixer-tab ${activeTab === 'mixer' ? 'active' : ''}`}
          onClick={() => setActiveTab('mixer')}
        >
          Mixer
        </button>
        <button 
          className={`mixer-tab ${activeTab === 'ai' ? 'active' : ''}`}
          onClick={() => setActiveTab('ai')}
        >
          AI Tools ✨
        </button>
      </div>

      <div className="panel-content">
        {activeTab === 'mixer' && (
          <>
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
              <h4>Audio Effects</h4>
              <div className="effect-buttons">
                <button className="effect-btn" title="Normalize">📊 Normalize</button>
                <button className="effect-btn" title="Compress">📉 Compress</button>
                <button className="effect-btn" title="EQ">🎚️ EQ</button>
                <button className="effect-btn" title="Reverb">🔊 Reverb</button>
              </div>
            </div>
          </>
        )}

        {activeTab === 'ai' && (
          <div className="mixer-section ai-tools-section">
            {activeAudioJob && (
              <div className="active-job-progress">
                <div className="job-info">
                  <span>{activeAudioJob.type.replace('_', ' ').toUpperCase()} IN PROGRESS...</span>
                  <span>{Math.round(activeAudioJob.progress)}%</span>
                </div>
                <div className="progress-bar-container">
                  <div className="progress-bar-fill" style={{ width: `${activeAudioJob.progress}%` }} />
                </div>
              </div>
            )}
            <h4>✨ Cinematic AI Audio</h4>
            <div className="ai-sfx-generator">
              <input 
                type="text" 
                placeholder="Describe sound effect (e.g. Cinematic Boom)"
                value={sfxPrompt}
                onChange={(e) => setSfxPrompt(e.target.value)}
                className="ai-input"
                disabled={isGenerating}
              />
              <button 
                className="ai-gen-btn" 
                onClick={handleGenerateSFX}
                disabled={isGenerating || !sfxPrompt}
              >
                {isGenerating ? "⏳..." : "Generate SFX"}
              </button>
            </div>
            
            <div className="ai-actions">
              <button 
                className={`ai-action-btn ${isGenerating ? 'loading' : ''}`} 
                title="Sync Foley to Video"
                onClick={() => {
                  handleV2ASync();
                  if (clips[0] && tracks[1]) autoDucking(clips[0].mediaId, tracks[1].id, 15);
                }}
                disabled={isGenerating}
              >
                🎬 V2A Sync
              </button>
              <button 
                className="ai-action-btn" 
                title="Remove Background Noise"
                onClick={() => clips[0] && isolateVoice(clips[0].mediaId, 1.0)}
              >
                🌊 AI De-noise
              </button>
              <button 
                className="ai-action-btn" 
                title="Separate Vocals"
                onClick={() => clips[0] && isolateVoice(clips[0].mediaId, 0.5)}
              >
                 🎤 AI Stem Split
              </button>
            </div>

            <div className="ai-status">
               <p className="status-text">
                 {isGenerating ? "StoryCore AI is crafting soundscapes..." : "Ready to generate cinematic audio."}
               </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AudioMixerPanel;
