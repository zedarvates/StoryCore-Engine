/**
 * VoiceGenerationPanel - Configure and trigger voice generation
 * 
 * Provides UI controls for voice generation parameters including voice type,
 * speed, pitch, and preview/generate functionality with loading states.
 * 
 * Requirements: 5.1, 5.4
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { DialoguePhrase, VoiceParameters } from '../types/projectDashboard';
import { Button } from './ui/button';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Slider } from './ui/slider';
import { generateVoice, estimateAudioDuration } from '../services/voiceGenerationService';

// ============================================================================
// Component Props
// ============================================================================

export interface VoiceGenerationPanelProps {
  phrase: DialoguePhrase;
  onGenerate: (voiceParams: VoiceParameters) => Promise<void>;
  onPreview?: (audioUrl: string) => void;
  isGenerating?: boolean;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export const VoiceGenerationPanel: React.FC<VoiceGenerationPanelProps> = ({
  phrase,
  onGenerate,
  onPreview,
  isGenerating: externalIsGenerating = false,
  className = '',
}) => {
  // ============================================================================
  // State
  // ============================================================================

  const [voiceType, setVoiceType] = useState<'male' | 'female' | 'neutral'>(
    phrase.voiceParameters?.voiceType || 'neutral'
  );
  const [speed, setSpeed] = useState<number>(
    phrase.voiceParameters?.speed || 1.0
  );
  const [pitch, setPitch] = useState<number>(
    phrase.voiceParameters?.pitch || 0
  );
  const [language, setLanguage] = useState<string>(
    phrase.voiceParameters?.language || 'en'
  );
  const [isPreviewGenerating, setIsPreviewGenerating] = useState(false);
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // ============================================================================
  // Computed Values
  // ============================================================================

  const isGenerating = externalIsGenerating || isPreviewGenerating;
  const estimatedDuration = estimateAudioDuration(phrase.text, speed);
  const hasGeneratedAudio = !!phrase.generatedAudioUrl;

  // Current voice parameters
  const currentVoiceParams: VoiceParameters = {
    voiceType,
    speed,
    pitch,
    language,
  };

  // ============================================================================
  // Effects
  // ============================================================================

  /**
   * Update local state when phrase voice parameters change
   */
  useEffect(() => {
    if (phrase.voiceParameters) {
      setVoiceType(phrase.voiceParameters.voiceType);
      setSpeed(phrase.voiceParameters.speed);
      setPitch(phrase.voiceParameters.pitch);
      setLanguage(phrase.voiceParameters.language);
    }
  }, [phrase.voiceParameters]);

  /**
   * Cleanup audio URL on unmount
   */
  useEffect(() => {
    return () => {
      if (previewAudioUrl) {
        URL.revokeObjectURL(previewAudioUrl);
      }
    };
  }, [previewAudioUrl]);

  // ============================================================================
  // Event Handlers
  // ============================================================================

  /**
   * Handle voice type change
   */
  const handleVoiceTypeChange = useCallback((value: string) => {
    setVoiceType(value as 'male' | 'female' | 'neutral');
    setError(null);
  }, []);

  /**
   * Handle speed change
   */
  const handleSpeedChange = useCallback((value: number[]) => {
    setSpeed(value[0]);
    setError(null);
  }, []);

  /**
   * Handle pitch change
   */
  const handlePitchChange = useCallback((value: number[]) => {
    setPitch(value[0]);
    setError(null);
  }, []);

  /**
   * Handle language change
   */
  const handleLanguageChange = useCallback((value: string) => {
    setLanguage(value);
    setError(null);
  }, []);

  /**
   * Handle preview button click
   */
  const handlePreview = useCallback(async () => {
    if (!phrase.text || phrase.text.trim().length === 0) {
      setError('Cannot preview: phrase text is empty');
      return;
    }

    try {
      setIsPreviewGenerating(true);
      setError(null);
      setProgress(0);

      // Generate voice with current parameters
      const result = await generateVoice({
        text: phrase.text,
        voiceParams: currentVoiceParams,
        onProgress: setProgress,
      });

      if (result.success && result.audioUrl) {
        // Clean up previous preview audio
        if (previewAudioUrl) {
          URL.revokeObjectURL(previewAudioUrl);
        }

        setPreviewAudioUrl(result.audioUrl);
        
        // Trigger preview callback
        onPreview?.(result.audioUrl);

        // Auto-play preview
        if (audioRef.current) {
          audioRef.current.src = result.audioUrl;
          audioRef.current.play().catch(err => {
            console.warn('Auto-play failed:', err);
          });
        }
      } else {
        setError(result.error || 'Preview generation failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Preview failed';
      setError(errorMessage);
      console.error('Preview error:', err);
    } finally {
      setIsPreviewGenerating(false);
      setProgress(0);
    }
  }, [phrase.text, currentVoiceParams, previewAudioUrl, onPreview]);

  /**
   * Handle generate button click
   */
  const handleGenerate = useCallback(async () => {
    if (!phrase.text || phrase.text.trim().length === 0) {
      setError('Cannot generate: phrase text is empty');
      return;
    }

    try {
      setError(null);
      await onGenerate(currentVoiceParams);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Generation failed';
      setError(errorMessage);
      console.error('Generation error:', err);
    }
  }, [phrase.text, currentVoiceParams, onGenerate]);

  /**
   * Handle stop preview
   */
  const handleStopPreview = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, []);

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className={`voice-generation-panel ${className}`} style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h3 style={styles.title}>Voice Generation</h3>
        {hasGeneratedAudio && (
          <span style={styles.badge}>Audio Generated</span>
        )}
      </div>

      {/* Phrase Text Display */}
      <div style={styles.textDisplay}>
        <Label>Phrase Text</Label>
        <div style={styles.textContent}>
          {phrase.text || <span style={styles.emptyText}>No text</span>}
        </div>
        <div style={styles.textInfo}>
          <span style={styles.infoLabel}>Estimated Duration:</span>
          <span style={styles.infoValue}>{estimatedDuration}s</span>
        </div>
      </div>

      {/* Voice Type Selection */}
      <div style={styles.field}>
        <Label htmlFor="voice-type">Voice Type</Label>
        <Select
          value={voiceType}
          onValueChange={handleVoiceTypeChange}
          disabled={isGenerating}
        >
          <SelectTrigger id="voice-type">
            <SelectValue placeholder="Select voice type..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="male">Male</SelectItem>
            <SelectItem value="female">Female</SelectItem>
            <SelectItem value="neutral">Neutral</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Language Selection */}
      <div style={styles.field}>
        <Label htmlFor="language">Language</Label>
        <Select
          value={language}
          onValueChange={handleLanguageChange}
          disabled={isGenerating}
        >
          <SelectTrigger id="language">
            <SelectValue placeholder="Select language..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="es">Spanish</SelectItem>
            <SelectItem value="fr">French</SelectItem>
            <SelectItem value="de">German</SelectItem>
            <SelectItem value="it">Italian</SelectItem>
            <SelectItem value="pt">Portuguese</SelectItem>
            <SelectItem value="ja">Japanese</SelectItem>
            <SelectItem value="zh">Chinese</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Speed Slider */}
      <div style={styles.field}>
        <div style={styles.sliderHeader}>
          <Label htmlFor="speed-slider">Speed</Label>
          <span style={styles.sliderValue}>{speed.toFixed(2)}x</span>
        </div>
        <Slider
          id="speed-slider"
          min={0.5}
          max={2.0}
          step={0.1}
          value={[speed]}
          onValueChange={handleSpeedChange}
          disabled={isGenerating}
          aria-label="Speech speed"
        />
        <div style={styles.sliderLabels}>
          <span style={styles.sliderLabel}>0.5x (Slower)</span>
          <span style={styles.sliderLabel}>2.0x (Faster)</span>
        </div>
      </div>

      {/* Pitch Slider */}
      <div style={styles.field}>
        <div style={styles.sliderHeader}>
          <Label htmlFor="pitch-slider">Pitch</Label>
          <span style={styles.sliderValue}>
            {pitch > 0 ? '+' : ''}{pitch} semitones
          </span>
        </div>
        <Slider
          id="pitch-slider"
          min={-12}
          max={12}
          step={1}
          value={[pitch]}
          onValueChange={handlePitchChange}
          disabled={isGenerating}
          aria-label="Voice pitch"
        />
        <div style={styles.sliderLabels}>
          <span style={styles.sliderLabel}>-12 (Lower)</span>
          <span style={styles.sliderLabel}>+12 (Higher)</span>
        </div>
      </div>

      {/* Progress Bar */}
      {isGenerating && progress > 0 && (
        <div style={styles.progressContainer}>
          <div style={styles.progressBar}>
            <div
              style={{
                ...styles.progressFill,
                width: `${progress}%`,
              }}
            />
          </div>
          <span style={styles.progressText}>{progress}%</span>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div style={styles.error} role="alert">
          {error}
        </div>
      )}

      {/* Action Buttons */}
      <div style={styles.actions}>
        <Button
          variant="outline"
          onClick={handlePreview}
          disabled={isGenerating || !phrase.text}
          aria-label="Preview voice"
        >
          {isPreviewGenerating ? 'Generating Preview...' : 'Preview'}
        </Button>
        
        {previewAudioUrl && (
          <Button
            variant="outline"
            onClick={handleStopPreview}
            disabled={isGenerating}
            aria-label="Stop preview"
          >
            Stop Preview
          </Button>
        )}

        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !phrase.text}
          aria-label="Generate voice"
        >
          {externalIsGenerating ? 'Generating...' : 'Generate'}
        </Button>
      </div>

      {/* Hidden Audio Element for Preview */}
      <audio
        ref={audioRef}
        style={{ display: 'none' }}
        controls={false}
        aria-label="Voice preview audio"
      />
    </div>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    padding: '24px',
    backgroundColor: '#1a1a1a',
    borderRadius: '8px',
    border: '1px solid #333',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '16px',
    borderBottom: '1px solid #333',
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 600,
    color: '#fff',
  },
  badge: {
    padding: '4px 12px',
    backgroundColor: '#22c55e',
    color: '#fff',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 600,
  },
  textDisplay: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  textContent: {
    padding: '12px',
    backgroundColor: '#2a2a2a',
    borderRadius: '4px',
    border: '1px solid #444',
    color: '#fff',
    fontSize: '14px',
    lineHeight: '1.5',
    minHeight: '60px',
  },
  emptyText: {
    color: '#666',
    fontStyle: 'italic',
  },
  textInfo: {
    display: 'flex',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: '#2a2a2a',
    borderRadius: '4px',
  },
  infoLabel: {
    fontSize: '13px',
    color: '#999',
    fontWeight: 500,
  },
  infoValue: {
    fontSize: '13px',
    color: '#fff',
    fontWeight: 600,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  sliderHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sliderValue: {
    fontSize: '14px',
    color: '#fff',
    fontWeight: 600,
    padding: '2px 8px',
    backgroundColor: '#2a2a2a',
    borderRadius: '4px',
  },
  sliderLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '4px',
  },
  sliderLabel: {
    fontSize: '12px',
    color: '#666',
  },
  progressContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  progressBar: {
    flex: 1,
    height: '8px',
    backgroundColor: '#2a2a2a',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    transition: 'width 0.3s ease',
  },
  progressText: {
    fontSize: '12px',
    color: '#999',
    fontWeight: 600,
    minWidth: '40px',
    textAlign: 'right',
  },
  error: {
    padding: '12px',
    backgroundColor: '#ff444420',
    border: '1px solid #ff4444',
    borderRadius: '4px',
    color: '#ff4444',
    fontSize: '14px',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    paddingTop: '8px',
    borderTop: '1px solid #333',
  },
};

export default VoiceGenerationPanel;
