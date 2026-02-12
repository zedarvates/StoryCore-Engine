/**
 * Lip Sync Addon for StoryCore Creative Studio
 * Provides UI for lip synchronization using Wav2Lip
 * Simplified version without external dependencies
 */

import React, { useState, useRef, useCallback } from 'react';
import styles from './LipSync.module.css';

interface LipSyncState {
  characterImage: string | null;
  dialogueAudio: string | null;
  isProcessing: boolean;
  progress: number;
  result: string | null;
  error: string | null;
}

interface LipSyncPreset {
  id: string;
  name: string;
  description: string;
  params: {
    enhancer: boolean;
    nosmooth: boolean;
    upsample: boolean;
    pads: [number, number, number, number];
  };
}

const PRESETS: LipSyncPreset[] = [
  {
    id: 'default',
    name: 'Default',
    description: 'Standard lip sync quality',
    params: { enhancer: true, nosmooth: false, upsample: true, pads: [0, 10, 0, 0] }
  },
  {
    id: 'high-quality',
    name: 'High Quality',
    description: 'Best quality with GFPGAN enhancement',
    params: { enhancer: true, nosmooth: false, upsample: true, pads: [0, 0, 0, 0] }
  },
  {
    id: 'fast',
    name: 'Fast Processing',
    description: 'Quick processing without enhancement',
    params: { enhancer: false, nosmooth: true, upsample: false, pads: [0, 10, 0, 0] }
  }
];

export const LipSyncAddon: React.FC = () => {
  const [state, setState] = useState<LipSyncState>({
    characterImage: null,
    dialogueAudio: null,
    isProcessing: false,
    progress: 0,
    result: null,
    error: null
  });

  const [selectedPreset, setSelectedPreset] = useState<LipSyncPreset>(PRESETS[0]);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setState(prev => ({ ...prev, characterImage: imageUrl, error: null }));
    }
  };

  const handleAudioChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const audioUrl = URL.createObjectURL(file);
      setState(prev => ({ ...prev, dialogueAudio: audioUrl, error: null }));
    }
  };

  const executeLipSync = async () => {
    if (!state.characterImage || !state.dialogueAudio) {
      setState(prev => ({ ...prev, error: 'Please upload both character image and dialogue audio' }));
      return;
    }

    setState(prev => ({ ...prev, isProcessing: true, progress: 0, error: null, result: null }));

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setState(prev => ({ 
          ...prev, 
          progress: Math.min(prev.progress + Math.random() * 15, 90) 
        }));
      }, 500);

      // Call API
      const response = await fetch('/api/v1/lip-sync/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterImage: state.characterImage,
          dialogueAudio: state.dialogueAudio,
          preset: selectedPreset.id,
          params: selectedPreset.params
        })
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        throw new Error('Lip sync failed');
      }

      const data = await response.json();

      setState(prev => ({
        ...prev,
        isProcessing: false,
        progress: 100,
        result: data.outputPath
      }));

    } catch (err) {
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      }));
    }
  };

  const resetAll = () => {
    setState({
      characterImage: null,
      dialogueAudio: null,
      isProcessing: false,
      progress: 0,
      result: null,
      error: null
    });
    if (imageInputRef.current) imageInputRef.current.value = '';
    if (audioInputRef.current) audioInputRef.current.value = '';
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Lip Sync Generator</h2>
      
      {/* Preset Selection */}
      <div className={styles.section}>
        <h3>Quality Preset</h3>
        <div className={styles.presetGrid}>
          {PRESETS.map(preset => (
            <button
              key={preset.id}
              className={`${styles.presetButton} ${selectedPreset.id === preset.id ? styles.active : ''}`}
              onClick={() => setSelectedPreset(preset)}
            >
              <span className={styles.presetName}>{preset.name}</span>
              <span className={styles.presetDesc}>{preset.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Upload Section */}
      <div className={styles.uploadGrid}>
        {/* Character Image */}
        <div className={styles.uploadSection}>
          <h3>Character Face</h3>
          <div 
            className={`${styles.dropzone} ${state.characterImage ? styles.hasFile : ''}`}
            onClick={() => imageInputRef.current?.click()}
          >
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              aria-label="Character image upload"
              className={styles.hiddenInput}
            />
            {state.characterImage ? (
              <div className={styles.preview}>
                <img src={state.characterImage} alt="Character" />
                <span className={styles.fileName}>Click to replace</span>
              </div>
            ) : (
              <div className={styles.placeholder}>
                <span className={styles.icon}>🖼️</span>
                <p>Drop or click to upload face image</p>
                <span className={styles.hint}>PNG, JPG (1024x1024)</span>
              </div>
            )}
          </div>
        </div>

        {/* Dialogue Audio */}
        <div className={styles.uploadSection}>
          <h3>Dialogue Audio</h3>
          <div 
            className={`${styles.dropzone} ${state.dialogueAudio ? styles.hasFile : ''}`}
            onClick={() => audioInputRef.current?.click()}
          >
            <input
              ref={audioInputRef}
              type="file"
              accept="audio/*"
              onChange={handleAudioChange}
              aria-label="Dialogue audio upload"
              className={styles.hiddenInput}
            />
            {state.dialogueAudio ? (
              <div className={styles.preview}>
                <audio src={state.dialogueAudio} controls />
                <span className={styles.fileName}>Click to replace</span>
              </div>
            ) : (
              <div className={styles.placeholder}>
                <span className={styles.icon}>🎙️</span>
                <p>Drop or click to upload audio</p>
                <span className={styles.hint}>WAV, MP3 (16kHz)</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {state.error && (
        <div className={styles.error}>
          ⚠️ {state.error}
        </div>
      )}

      {/* Progress */}
      {state.isProcessing && (
        <div className={styles.progressSection}>
          <div className={styles.progressBar}>
            <div 
              className={styles.progressFill} 
              style={{ width: `${state.progress}%` }}
            />
          </div>
          <span className={styles.progressText}>
            Processing... {Math.round(state.progress)}%
          </span>
          <p className={styles.progressHint}>
            Running Wav2Lip + GFPGAN enhancement...
          </p>
        </div>
      )}

      {/* Result */}
      {state.result && (
        <div className={styles.resultSection}>
          <h3>Lip Sync Complete!</h3>
          <div className={styles.resultPreview}>
            <video src={state.result} controls />
          </div>
          <div className={styles.resultActions}>
            <a href={state.result} download="lip_sync_result.mp4" className={styles.downloadButton}>
              Download Result
            </a>
            <button onClick={resetAll} className={styles.resetButton}>
              Generate Another
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      {!state.isProcessing && !state.result && (
        <div className={styles.actions}>
          <button 
            className={styles.primaryButton}
            onClick={executeLipSync}
            disabled={!state.characterImage || !state.dialogueAudio}
          >
            Generate Lip Sync
          </button>
          <button className={styles.secondaryButton} onClick={resetAll}>
            Reset
          </button>
        </div>
      )}

      {/* Info Section */}
      <div className={styles.info}>
        <h4>Tips for Best Results</h4>
        <ul>
          <li>Use high-quality face images with clear mouth visible</li>
          <li>Audio should be clean with minimal background noise</li>
          <li>16kHz audio sample rate works best</li>
          <li>For best quality, use the High Quality preset</li>
          <li>Processing takes ~30 seconds for 10 seconds of video</li>
        </ul>
      </div>
    </div>
  );
};

export default LipSyncAddon;

