/**
 * Audio Remix Panel Component - Intelligent Music Remixing
 */

import React, { useState, useCallback } from 'react';
import {
  musicRemixService,
  RemixStyle,
  MusicStructure,
  RemixRequest,
  RemixResult
} from '../../services/musicRemixService';
import styles from './AudioRemixPanel.module.css';

interface AudioRemixPanelProps {
  audioUrl?: string;
  videoDuration?: number;
  onRemixComplete?: (result: RemixResult) => void;
}

export const AudioRemixPanel: React.FC<AudioRemixPanelProps> = ({
  audioUrl,
  videoDuration,
  onRemixComplete
}) => {
  const [audioId, setAudioId] = useState('');
  const [targetDuration, setTargetDuration] = useState(videoDuration || 60);
  const [style, setStyle] = useState<RemixStyle>('smooth');
  const [preserveIntro, setPreserveIntro] = useState(true);
  const [preserveOutro, setPreserveOutro] = useState(true);
  const [crossfadeDuration, setCrossfadeDuration] = useState(2.0);
  
  const [structure, setStructure] = useState<MusicStructure | null>(null);
  const [remixResult, setRemixResult] = useState<RemixResult | null>(null);
  const [preview, setPreview] = useState<{
    originalDuration: number;
    targetDuration: number;
    cutsNeeded: number;
    timeSaved: number;
  } | null>(null);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRemixing, setIsRemixing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnalyze = useCallback(async () => {
    if (!audioUrl) {
      setError('Veuillez selection un fichier audio');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const result = await musicRemixService.analyzeStructure(audioUrl);
      setStructure(result);
      
      setPreview({
        originalDuration: result.duration,
        targetDuration,
        cutsNeeded: targetDuration < result.duration ? 1 : 0,
        timeSaved: Math.max(0, result.duration - targetDuration)
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analyse echouee');
    } finally {
      setIsAnalyzing(false);
    }
  }, [audioUrl, targetDuration]);

  const handleRemix = useCallback(async () => {
    if (!audioUrl || !audioId) {
      setError('Veuillez analyser d\'abord un fichier audio');
      return;
    }

    setIsRemixing(true);
    setError(null);

    try {
      const request: RemixRequest = {
        audioId,
        audioUrl,
        targetDuration,
        style,
        preserveIntro,
        preserveOutro,
        crossfadeDuration
      };

      const result = await musicRemixService.remix(request);
      setRemixResult(result);
      
      if (onRemixComplete) {
        onRemixComplete(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Remixage echoue');
    } finally {
      setIsRemixing(false);
    }
  }, [audioId, audioUrl, targetDuration, style, preserveIntro, preserveOutro, crossfadeDuration, onRemixComplete]);

  const getSectionColor = (sectionType: string): string => {
    const colors: Record<string, string> = {
      intro: '#4caf50',
      verse: '#2196f3',
      chorus: '#ff9800',
      bridge: '#9c27b0',
      outro: '#f44336'
    };
    return colors[sectionType] || '#666';
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3>Audio Remix</h3>
        <p>Adaptez votre musique a la duree de la video</p>
      </div>

      <div className={styles.section}>
        <h4>Configuration</h4>
        
        <div className={styles.field}>
          <label>URL du fichier audio:</label>
          <input
            type="text"
            value={audioUrl || ''}
            onChange={(e) => {
              setAudioId(`audio_${Date.now()}`);
            }}
            placeholder="/assets/audio/musique.mp3"
            className={styles.input}
          />
        </div>

        <div className={styles.field}>
          <label>Duree cible (secondes):</label>
          <div className={styles.durationInput}>
            <input
              type="number"
              value={targetDuration}
              onChange={(e) => setTargetDuration(parseFloat(e.target.value) || 60)}
              min={10}
              max={600}
              className={styles.input}
            />
            <span className={styles.durationDisplay}>
              ({formatDuration(targetDuration)})
            </span>
          </div>
        </div>

        <div className={styles.field}>
          <label>Style de remixage:</label>
          <select
            value={style}
            onChange={(e) => setStyle(e.target.value as RemixStyle)}
            className={styles.select}
          >
            <option value="smooth">Fluide (Crossfade doux)</option>
            <option value="beat-cut">Beat Cut (Coupe au beat)</option>
            <option value="structural">Structurel (Respecter la structure)</option>
            <option value="dynamic">Dynamique</option>
          </select>
        </div>

        <div className={styles.checkboxGroup}>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={preserveIntro}
              onChange={(e) => setPreserveIntro(e.target.checked)}
            />
            <span>Preserver l intro</span>
          </label>
          
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={preserveOutro}
              onChange={(e) => setPreserveOutro(e.target.checked)}
            />
            <span>Preserver l outro</span>
          </label>
        </div>

        <div className={styles.field}>
          <label>Duree du crossfade (secondes):</label>
          <input
            type="range"
            min={0.5}
            max={5}
            step={0.5}
            value={crossfadeDuration}
            onChange={(e) => setCrossfadeDuration(parseFloat(e.target.value))}
            className={styles.range}
          />
          <span className={styles.rangeValue}>{crossfadeDuration}s</span>
        </div>
      </div>

      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}

      <div className={styles.actions}>
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing || !audioUrl}
          className={styles.buttonSecondary}
        >
          {isAnalyzing ? 'Analyse...' : 'Analyser'}
        </button>

        <button
          onClick={handleRemix}
          disabled={isRemixing || !structure}
          className={styles.buttonPrimary}
        >
          {isRemixing ? 'Remixage...' : 'Remixer'}
        </button>
      </div>

      {structure && (
        <div className={styles.section}>
          <h4>Structure Musicale</h4>
          
          <div className={styles.structureGrid}>
            <div className={styles.structureItem}>
              <span className={styles.label}>Duree totale</span>
              <span className={styles.value}>{formatDuration(structure.duration)}</span>
            </div>
            <div className={styles.structureItem}>
              <span className={styles.label}>Tempo</span>
              <span className={styles.value}>{structure.tempo} BPM</span>
            </div>
            <div className={styles.structureItem}>
              <span className={styles.label}> tonalite</span>
              <span className={styles.value}>{structure.keySignature}</span>
            </div>
            <div className={styles.structureItem}>
              <span className={styles.label}>Sections</span>
              <span className={styles.value}>{structure.sections.length}</span>
            </div>
          </div>

          <div className={styles.sections}>
            <h5>Sections detectees:</h5>
            <div className={styles.sectionBars}>
              {structure.sections.map((section, idx) => (
                <div
                  key={idx}
                  className={styles.sectionBar}
                  style={{
                    flex: section.endTime - section.startTime,
                    backgroundColor: getSectionColor(section.sectionType)
                  }}
                >
                  <span className={styles.sectionLabel}>
                    {section.sectionType}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {preview && (
        <div className={styles.section}>
          <h4>Apercu</h4>
          
          <div className={styles.previewStats}>
            <div className={styles.previewStat}>
              <span className={styles.previewLabel}>Duree originale:</span>
              <span className={styles.previewValue}>
                {formatDuration(preview.originalDuration)}
              </span>
            </div>
            <div className={styles.previewStat}>
              <span className={styles.previewLabel}>Duree cible:</span>
              <span className={styles.previewValue}>
                {formatDuration(preview.targetDuration)}
              </span>
            </div>
            <div className={styles.previewStat}>
              <span className={styles.previewLabel}>Temps economise:</span>
              <span className={`${styles.previewValue} ${styles.positive}`}>
                {preview.timeSaved > 0 ? `-${formatDuration(preview.timeSaved)}` : '0:00'}
              </span>
            </div>
          </div>
        </div>
      )}

      {remixResult && (
        <div className={styles.section}>
          <h4>Resultat du Remix</h4>
          
          <div className={styles.resultStats}>
            <div className={styles.resultStat}>
              <span>Duree finale:</span>
              <strong>{formatDuration(remixResult.finalDuration)}</strong>
            </div>
            <div className={styles.resultStat}>
              <span>Coupes:</span>
              <strong>{remixResult.cuts.length}</strong>
            </div>
            <div className={styles.resultStat}>
              <span>Score qualite:</span>
              <strong>{(remixResult.qualityScore * 100).toFixed(0)}%</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AudioRemixPanel;

