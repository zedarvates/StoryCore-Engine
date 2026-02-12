/**
 * Transcription Panel Component - Text-Based Editing
 * Like Adobe Premiere Text-Based Editing feature
 */

import React, { useState, useCallback } from 'react';
import {
  transcriptionService,
  Transcript,
  MontageStyle,
  MontageRequest,
  MontageResult,
  SegmentType
} from '../../services/transcriptionService';
import styles from './TranscriptionPanel.module.css';

interface TranscriptionPanelProps {
  audioUrl?: string;
  onMontageComplete?: (result: MontageResult) => void;
}

export const TranscriptionPanel: React.FC<TranscriptionPanelProps> = ({
  audioUrl,
  onMontageComplete
}) => {
  const [audioId, setAudioId] = useState('');
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [montageResult, setMontageResult] = useState<MontageResult | null>(null);
  const [montageStyle, setMontageStyle] = useState<MontageStyle>('chronological');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isGeneratingMontage, setIsGeneratingMontage] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState('fr');

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleTranscribe = useCallback(async () => {
    if (!audioUrl) {
      setError('Veuillez selectionner un fichier audio');
      return;
    }

    setIsTranscribing(true);
    setError(null);

    try {
      const id = `audio_${Date.now()}`;
      setAudioId(id);
      
      const result = await transcriptionService.transcribe(
        id,
        audioUrl,
        language,
        true
      );
      
      setTranscript(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transcription echouee');
    } finally {
      setIsTranscribing(false);
    }
  }, [audioUrl, language]);

  const handleGenerateMontage = useCallback(async () => {
    if (!transcript) {
      setError('Veuillez d\'abord transcrire l\'audio');
      return;
    }

    setIsGeneratingMontage(true);
    setError(null);

    try {
      const request: MontageRequest = {
        transcriptId: transcript.transcriptId,
        style: montageStyle,
        includeSpeakers: undefined,
        excludeSpeakers: undefined,
        maxDuration: undefined
      };

      const result = await transcriptionService.generateMontage(request);
      setMontageResult(result);
      
      if (onMontageComplete) {
        onMontageComplete(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation montage echouee');
    } finally {
      setIsGeneratingMontage(false);
    }
  }, [transcript, montageStyle, onMontageComplete]);

  const handleExportSrt = useCallback(async () => {
    if (!transcript) return;
    
    try {
      const srt = await transcriptionService.exportSrt(transcript.transcriptId);
      const blob = new Blob([srt], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${transcript.transcriptId}.srt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Echec de l\'export SRT');
    }
  }, [transcript]);

  const handleExportVtt = useCallback(async () => {
    if (!transcript) return;
    
    try {
      const vtt = await transcriptionService.exportVtt(transcript.transcriptId);
      const blob = new Blob([vtt], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${transcript.transcriptId}.vtt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Echec de l\'export VTT');
    }
  }, [transcript]);

  const filteredSegments = transcript && searchQuery
    ? transcriptionService.searchInTranscript(transcript, searchQuery)
    : (transcript?.segments || []);

  const segmentsBySpeaker = transcript
    ? transcriptionService.getSegmentsBySpeaker(transcript)
    : {};

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3>Transcription & Montage Texte</h3>
        <p>Transcrivez l'audio et montez par copier-coller</p>
      </div>

      <div className={styles.section}>
        <h4>Transcription</h4>
        
        <div className={styles.field}>
          <label>Langue:</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className={styles.select}
          >
            <option value="fr">Francais</option>
            <option value="en">Anglais</option>
            <option value="es">Espagnol</option>
            <option value="de">Allemand</option>
            <option value="auto">Auto-detection</option>
          </select>
        </div>

        <button
          onClick={handleTranscribe}
          disabled={isTranscribing || !audioUrl}
          className={styles.buttonPrimary}
        >
          {isTranscribing ? 'Transcription...' : 'Transcrire l\'audio'}
        </button>
      </div>

      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}

      {transcript && (
        <>
          <div className={styles.section}>
            <h4>Resultats ({transcript.wordCount} mots, {transcript.speakerCount} locuteurs)</h4>
            
            <div className={styles.exportButtons}>
              <button
                onClick={handleExportSrt}
                className={styles.buttonSecondary}
              >
                Export SRT
              </button>
              <button
                onClick={handleExportVtt}
                className={styles.buttonSecondary}
              >
                Export VTT
              </button>
            </div>
          </div>

          <div className={styles.section}>
            <h4>Generation Montage</h4>
            
            <div className={styles.field}>
              <label>Style de montage:</label>
              <select
                value={montageStyle}
                onChange={(e) => setMontageStyle(e.target.value as MontageStyle)}
                className={styles.select}
              >
                <option value="chronologique">Chronologique</option>
                <option value="highlights">Points forts</option>
                <option value="compact">Compact</option>
                <option value="conversation">Par conversation</option>
              </select>
            </div>

            <button
              onClick={handleGenerateMontage}
              disabled={isGeneratingMontage}
              className={styles.buttonPrimary}
            >
              {isGeneratingMontage ? 'Generation...' : 'Generer le montage'}
            </button>
          </div>

          {montageResult && (
            <div className={styles.section}>
              <h4>Montage Genere ({montageResult.totalDuration.toFixed(1)}s)</h4>
              
              <div className={styles.montageSummary}>
                {montageResult.summary}
              </div>

              <div className={styles.shotsList}>
                {montageResult.shots.map((shot) => (
                  <div key={shot.shotId} className={styles.shotItem}>
                    <div className={styles.shotTime}>
                      {formatTime(shot.sourceStart)} - {formatTime(shot.sourceEnd)}
                    </div>
                    <div className={styles.shotText}>
                      {shot.text}
                    </div>
                    {shot.speaker && (
                      <div className={styles.shotSpeaker}>
                        {shot.speaker}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className={styles.section}>
            <h4>Transcript</h4>
            
            <div className={styles.searchBox}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher dans le transcript..."
                className={styles.input}
              />
            </div>

            <div className={styles.segmentsList}>
              {filteredSegments.map((segment) => (
                <div key={segment.segmentId} className={styles.segmentItem}>
                  <div className={styles.segmentHeader}>
                    <span className={styles.segmentTime}>
                      {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
                    </span>
                    {segment.speaker && (
                      <span className={styles.segmentSpeaker}>
                        {segment.speaker.speakerLabel}
                      </span>
                    )}
                    <span className={styles.segmentType}>
                      {segment.segmentType}
                    </span>
                  </div>
                  <div className={styles.segmentText}>
                    {segment.text}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {Object.keys(segmentsBySpeaker).length > 0 && (
            <div className={styles.section}>
              <h4>Par Locuteur</h4>
              
              {Object.entries(segmentsBySpeaker).map(([speaker, segments]) => (
                <div key={speaker} className={styles.speakerSection}>
                  <div className={styles.speakerHeader}>
                    {speaker} ({segments.length} segments)
                  </div>
                  {segments.slice(0, 3).map((segment) => (
                    <div key={segment.segmentId} className={styles.segmentMini}>
                      <span className={styles.timeMini}>
                        {formatTime(segment.startTime)}
                      </span>
                      <span className={styles.textMini}>
                        {segment.text.substring(0, 80)}...
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TranscriptionPanel;

