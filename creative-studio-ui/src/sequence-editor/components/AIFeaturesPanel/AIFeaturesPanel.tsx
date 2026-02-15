/**
 * AI Features Panel Component
 * 
 * Provides UI for AI-powered features:
 * - Smart Crop (AI-powered aspect ratio cropping)
 * - Text-to-Speech (TTS with voice selection)
 * - Transcription (audio to text)
 * - Translation (text translation)
 * 
 * Requirements: Phase 3 - Integrate advanced backend features into UI
 * Phase 2 - Connected to Redux store
 */

import React, { useState, useCallback } from 'react';
// cSpell:ignore Ultrawide Katja
import './aiFeaturesPanel.css';

// =============================================================================
// Types
// =============================================================================

type AIFeature = 'smartCrop' | 'tts' | 'transcription' | 'translation';

interface AspectRatio {
  id: string;
  name: string;
  width: number;
  height: number;
  label: string;
}

const ASPECT_RATIOS: AspectRatio[] = [
  { id: '16:9', name: 'YouTube', width: 16, height: 9, label: '16:9' },
  { id: '9:16', name: 'TikTok/Reels', width: 9, height: 16, label: '9:16' },
  { id: '1:1', name: 'Instagram Square', width: 1, height: 1, label: '1:1' },
  { id: '4:5', name: 'Instagram Portrait', width: 4, height: 5, label: '4:5' },
  { id: '4:3', name: 'Standard TV', width: 4, height: 3, label: '4:3' },
  { id: '21:9', name: 'Ultrawide', width: 21, height: 9, label: '21:9' },
];

interface Voice {
  id: string;
  name: string;
  language: string;
  gender: 'male' | 'female' | 'neutral';
}

const VOICES: Voice[] = [
  { id: 'fr-FR-Denise', name: 'Denise', language: 'French', gender: 'female' },
  { id: 'fr-FR-Henri', name: 'Henri', language: 'French', gender: 'male' },
  { id: 'en-US-Jenny', name: 'Jenny', language: 'English', gender: 'female' },
  { id: 'en-US-Ryan', name: 'Ryan', language: 'English', gender: 'male' },
  { id: 'en-GB-Amelia', name: 'Amelia', language: 'English (UK)', gender: 'female' },
  { id: 'de-DE-Katja', name: 'Katja', language: 'German', gender: 'female' },
  { id: 'es-ES-Elvira', name: 'Elvira', language: 'Spanish', gender: 'female' },
  { id: 'it-IT-Elsa', name: 'Elsa', language: 'Italian', gender: 'female' },
];

interface Language {
  code: string;
  name: string;
}

const LANGUAGES: Language[] = [
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'es', name: 'Spanish' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
];

// =============================================================================
// Component
// =============================================================================

export const AIFeaturesPanel: React.FC = () => {
  
  // Active feature tab
  const [activeFeature, setActiveFeature] = useState<AIFeature>('smartCrop');
  
  // Smart Crop state
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<string>('16:9');
  const [focusMode, setFocusMode] = useState<'auto' | 'face' | 'center'>('auto');
  const [isProcessingCrop, setIsProcessingCrop] = useState(false);
  
  // TTS state
  const [ttsText, setTtsText] = useState('');
  const [selectedVoice, setSelectedVoice] = useState('fr-FR-Denise');
  const [ttsSpeed, setTtsSpeed] = useState(1.0);
  const [ttsPitch, setTtsPitch] = useState(1.0);
  const [isProcessingTTS, setIsProcessingTTS] = useState(false);
  
  // Transcription state
  const [transcriptionLanguage, setTranscriptionLanguage] = useState('auto');
  const [enableSpeakers, setEnableSpeakers] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionResult, setTranscriptionResult] = useState('');
  
  // Translation state
  const [translationText, setTranslationText] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('en');
  const [targetLanguage, setTargetLanguage] = useState('fr');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationResult, setTranslationResult] = useState('');
  
  // =============================================================================
  // Handlers
  // =============================================================================
  
  // Smart Crop handlers
  const handleSmartCrop = useCallback(async () => {
    setIsProcessingCrop(true);
    try {
      const response = await fetch('/api/video-editor/ai/smart-crop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_id: '', // Will be filled with selected media
          target_ratio: selectedAspectRatio,
          focus_mode: focusMode,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Smart crop result:', data);
      }
    } catch (error) {
      console.error('Smart crop failed:', error);
    } finally {
      setIsProcessingCrop(false);
    }
  }, [selectedAspectRatio, focusMode]);
  
  // TTS handlers
  const handleTTS = useCallback(async () => {
    if (!ttsText.trim()) return;
    
    setIsProcessingTTS(true);
    try {
      const response = await fetch('/api/video-editor/ai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: ttsText,
          voice: selectedVoice,
          speed: ttsSpeed,
          pitch: ttsPitch,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('TTS result:', data);
      }
    } catch (error) {
      console.error('TTS generation failed:', error);
    } finally {
      setIsProcessingTTS(false);
    }
  }, [ttsText, selectedVoice, ttsSpeed, ttsPitch]);
  
  // Transcription handlers
  const handleTranscription = useCallback(async () => {
    setIsTranscribing(true);
    setTranscriptionResult('');
    try {
      const response = await fetch('/api/video-editor/ai/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_id: '', // Will be filled with selected media
          language: transcriptionLanguage === 'auto' ? null : transcriptionLanguage,
          enable_speakers: enableSpeakers,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        // Poll for results
        const pollResult = async () => {
          const statusResponse = await fetch(`/api/jobs/${data.job_id}/status`);
          const statusData = await statusResponse.json();
          if (statusData.status === 'completed') {
            setTranscriptionResult(statusData.text || '');
          } else if (statusData.status === 'failed') {
            setTranscriptionResult('Transcription failed');
          } else {
            setTimeout(pollResult, 1000);
          }
        };
        setTimeout(pollResult, 1000);
      }
    } catch (error) {
      console.error('Transcription failed:', error);
      setTranscriptionResult('Error during transcription');
    } finally {
      setIsTranscribing(false);
    }
  }, [transcriptionLanguage, enableSpeakers]);
  
  // Translation handlers
  const handleTranslation = useCallback(async () => {
    if (!translationText.trim()) return;
    
    setIsTranslating(true);
    try {
      const response = await fetch('/api/video-editor/ai/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: translationText,
          source_language: sourceLanguage,
          target_language: targetLanguage,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setTranslationResult(data.translated_text || '');
      }
    } catch (error) {
      console.error('Translation failed:', error);
    } finally {
      setIsTranslating(false);
    }
  }, [translationText, sourceLanguage, targetLanguage]);
  
  // =============================================================================
  // Render
  // =============================================================================
  
  return (
    <div className="ai-features-panel">
      {/* Feature Tabs */}
      <div className="ai-features-tabs">
        <button
          className={`feature-tab ${activeFeature === 'smartCrop' ? 'active' : ''}`}
          onClick={() => setActiveFeature('smartCrop')}
        >
          <span className="tab-icon">✂️</span>
          <span className="tab-label">Smart Crop</span>
        </button>
        <button
          className={`feature-tab ${activeFeature === 'tts' ? 'active' : ''}`}
          onClick={() => setActiveFeature('tts')}
        >
          <span className="tab-icon">🎤</span>
          <span className="tab-label">TTS</span>
        </button>
        <button
          className={`feature-tab ${activeFeature === 'transcription' ? 'active' : ''}`}
          onClick={() => setActiveFeature('transcription')}
        >
          <span className="tab-icon">📝</span>
          <span className="tab-label">Transcript</span>
        </button>
        <button
          className={`feature-tab ${activeFeature === 'translation' ? 'active' : ''}`}
          onClick={() => setActiveFeature('translation')}
        >
          <span className="tab-icon">🌐</span>
          <span className="tab-label">Translate</span>
        </button>
      </div>
      
      {/* Feature Content */}
      <div className="ai-features-content">
        {/* Smart Crop */}
        {activeFeature === 'smartCrop' && (
          <div className="feature-section">
            <h4>AI Smart Crop</h4>
            <p className="feature-description">
              Automatically crop and reframe your video for different aspect ratios using AI.
            </p>
            
            <div className="form-group">
              <label>Target Aspect Ratio</label>
              <div className="aspect-ratio-grid">
                {ASPECT_RATIOS.map(ratio => (
                  <button
                    key={ratio.id}
                    className={`aspect-ratio-btn ${selectedAspectRatio === ratio.id ? 'selected' : ''}`}
                    onClick={() => setSelectedAspectRatio(ratio.id)}
                  >
                    <span className="ratio-label">{ratio.label}</span>
                    <span className="ratio-name">{ratio.name}</span>
                  </button>
                ))}
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="focusMode">Focus Mode</label>
              <select
                id="focusMode"
                aria-label="Select focus mode for smart crop"
                value={focusMode}
                onChange={(e) => setFocusMode(e.target.value as 'auto' | 'face' | 'center')}
                className="form-select"
              >
                <option value="auto">Auto Detect</option>
                <option value="face">Face Detection</option>
                <option value="center">Center Subject</option>
              </select>
            </div>
            
            <button
              className="process-btn"
              onClick={handleSmartCrop}
              disabled={isProcessingCrop}
            >
              {isProcessingCrop ? 'Processing...' : 'Apply Smart Crop'}
            </button>
          </div>
        )}
        
        {/* TTS */}
        {activeFeature === 'tts' && (
          <div className="feature-section">
            <h4>Text-to-Speech</h4>
            <p className="feature-description">
              Convert text to natural-sounding speech with AI voices.
            </p>
            
            <div className="form-group">
              <label htmlFor="ttsTextArea">Text</label>
              <textarea
                id="ttsTextArea"
                value={ttsText}
                onChange={(e) => setTtsText(e.target.value)}
                placeholder="Enter text to convert to speech..."
                className="form-textarea"
                rows={4}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="voiceSelect">Voice</label>
              <select
                id="voiceSelect"
                aria-label="Select voice for TTS"
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
                className="form-select"
              >
                {VOICES.map(voice => (
                  <option key={voice.id} value={voice.id}>
                    {voice.name} ({voice.language}, {voice.gender})
                  </option>
                ))}
              </select>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="ttsSpeed">Speed: {ttsSpeed.toFixed(1)}x</label>
                <input
                  id="ttsSpeed"
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={ttsSpeed}
                  onChange={(e) => setTtsSpeed(Number.parseFloat(e.target.value))}
                  className="form-slider"
                  title="Speech speed"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="ttsPitch">Pitch: {ttsPitch.toFixed(1)}</label>
                <input
                  id="ttsPitch"
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={ttsPitch}
                  onChange={(e) => setTtsPitch(Number.parseFloat(e.target.value))}
                  className="form-slider"
                  title="Speech pitch"
                />
              </div>
            </div>
            
            <button
              className="process-btn"
              onClick={handleTTS}
              disabled={isProcessingTTS || !ttsText.trim()}
            >
              {isProcessingTTS ? 'Generating...' : 'Generate Speech'}
            </button>
          </div>
        )}
        
        {/* Transcription */}
        {activeFeature === 'transcription' && (
          <div className="feature-section">
            <h4>Transcription</h4>
            <p className="feature-description">
              Automatically transcribe audio from video to text.
            </p>
            
            <div className="form-group">
              <label htmlFor="transcriptionLang">Language</label>
              <select
                id="transcriptionLang"
                aria-label="Select transcription language"
                value={transcriptionLanguage}
                onChange={(e) => setTranscriptionLanguage(e.target.value)}
                className="form-select"
              >
                <option value="auto">Auto Detect</option>
                {LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={enableSpeakers}
                  onChange={(e) => setEnableSpeakers(e.target.checked)}
                />
                <span>Identify Speakers</span>
              </label>
            </div>
            
            <button
              className="process-btn"
              onClick={handleTranscription}
              disabled={isTranscribing}
            >
              {isTranscribing ? 'Transcribing...' : 'Start Transcription'}
            </button>
            
            {transcriptionResult && (
              <div className="result-box">
                <label>Transcription Result</label>
                <div className="result-content">{transcriptionResult}</div>
              </div>
            )}
          </div>
        )}
        
        {/* Translation */}
        {activeFeature === 'translation' && (
          <div className="feature-section">
            <h4>Translation</h4>
            <p className="feature-description">
              Translate text between languages using AI.
            </p>
            
            <div className="form-group">
              <label htmlFor="translationTextArea">Text to Translate</label>
              <textarea
                id="translationTextArea"
                aria-label="Text to translate"
                value={translationText}
                onChange={(e) => setTranslationText(e.target.value)}
                placeholder="Enter text to translate..."
                className="form-textarea"
                rows={3}
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="sourceLangSelect">From</label>
                <select
                  id="sourceLangSelect"
                  aria-label="Select source language"
                  value={sourceLanguage}
                  onChange={(e) => setSourceLanguage(e.target.value)}
                  className="form-select"
                >
                  {LANGUAGES.map(lang => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="targetLangSelect">To</label>
                <select
                  id="targetLangSelect"
                  aria-label="Select target language"
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value)}
                  className="form-select"
                >
                  {LANGUAGES.map(lang => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <button
              className="process-btn"
              onClick={handleTranslation}
              disabled={isTranslating || !translationText.trim()}
            >
              {isTranslating ? 'Translating...' : 'Translate'}
            </button>
            
            {translationResult && (
              <div className="result-box">
                <label>Translation Result</label>
                <div className="result-content">{translationResult}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AIFeaturesPanel;

