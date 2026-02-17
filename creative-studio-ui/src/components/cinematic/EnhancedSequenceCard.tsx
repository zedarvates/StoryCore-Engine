/**
 * Enhanced Sequence Card Component
 * Displays a sequence with all cinematic data
 */

import React, { useState, useMemo } from 'react';
import {
  CompleteSequence,
  EnhancedShot,
  BeatType,
  CameraMovement,
  getBeatConfig,
  getCameraMovementConfig,
} from '@/types/cinematicTypes';
import { Camera, Clock, Users, MapPin, Video, Music, FileText } from 'lucide-react';
import './EnhancedSequenceCard.css';

interface EnhancedSequenceCardProps {
  sequence: CompleteSequence;
  onClick: () => void;
  onEditShot?: (shot: EnhancedShot) => void;
  onAddBeat?: (sequenceId: string) => void;
  className?: string;
}

export function EnhancedSequenceCard({
  sequence,
  onClick,
  onEditShot,
  onAddBeat,
  className = '',
}: EnhancedSequenceCardProps) {
  const [expanded, setExpanded] = useState(false);

  const stats = useMemo(() => {
    const totalDuration = sequence.shots.reduce((sum, s) => sum + s.duration, 0);
    const avgDuration = sequence.shots.length > 0 ? totalDuration / sequence.shots.length : 0;

    return {
      shots: sequence.shots.length,
      beats: sequence.beats.length,
      duration: totalDuration,
      avgShotDuration: avgDuration,
      characters: new Set(sequence.shots.flatMap(s => s.characters.map(c => c.characterId))).size,
      locations: sequence.locationIds.length,
    };
  }, [sequence]);

  const dominantBeat = useMemo(() => {
    if (sequence.beats.length === 0) return null;
    const sorted = [...sequence.beats].sort((a, b) => {
      const impOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return impOrder[a.importance] - impOrder[b.importance];
    });
    return sorted[0];
  }, [sequence.beats]);

  return (
    <div className={`enhanced-sequence-card ${className}`} onClick={onClick}>
      <div className="sequence-card-header">
        <div className="sequence-title">
          <h3>{sequence.name}</h3>
          <span className="sequence-order">#{sequence.order}</span>
        </div>

        <div className="sequence-quick-stats">
          <span className="stat">
            <Video className="w-4 h-4" />
            {stats.shots} plans
          </span>
          <span className="stat">
            <Clock className="w-4 h-4" />
            {Math.floor(stats.duration / 60)}:{String(Math.floor(stats.duration % 60)).padStart(2, '0')}
          </span>
        </div>
      </div>

      <div className="sequence-description">
        <p>{sequence.description || 'Aucune description'}</p>
      </div>

      <div className="cinematic-tags">
        {dominantBeat && (
          <span className={`tag beat-tag ${dominantBeat.type}`}>
            <FileText className="w-3 h-3" />
            {getBeatConfig(dominantBeat.type as BeatType)?.name || dominantBeat.type}
          </span>
        )}

        {sequence.moodArc && (
          <span className={`tag mood-tag ${sequence.moodArc.dominantMood}`}>
            <Music className="w-3 h-3" />
            {sequence.moodArc.dominantMood}
          </span>
        )}

        {sequence.pacingAnalysis && (
          <span className={`tag pacing-tag ${sequence.pacingAnalysis.overallPace}`}>
            <Clock className="w-3 h-3" />
            {sequence.pacingAnalysis.overallPace}
          </span>
        )}

        {stats.characters > 0 && (
          <span className="tag character-tag">
            <Users className="w-3 h-3" />
            {stats.characters} pers.
          </span>
        )}

        {stats.locations > 0 && (
          <span className="tag location-tag">
            <MapPin className="w-3 h-3" />
            {stats.locations} lieux
          </span>
        )}
      </div>

      {sequence.moodArc && (
        <div className="mood-arc">
          <div className="mood-label">Arc emotionnel</div>
          <div className="mood-bar">
            <div
              className="mood-start"
              style={{ background: getMoodColor(sequence.moodArc.startMood) }}
            />
            <div className="mood-end"
              style={{ background: getMoodColor(sequence.moodArc.endMood) }}
            />
          </div>
        </div>
      )}

      {sequence.beats.length > 0 && (
        <div className="beats-timeline">
          <div className="timeline-header">
            <FileText className="w-4 h-4" />
            <span>Beats ({sequence.beats.length})</span>
          </div>
          <div className="beats-list">
            {sequence.beats.slice(0, 4).map((beat) => (
              <div key={beat.id} className={`beat-item ${beat.importance}`}>
                <span className="beat-type">{beat.type}</span>
                <span className="beat-duration">
                  {beat.duration ? `${beat.duration}s` : 'N/A'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {sequence.shots.length > 0 && (
        <div className="shots-preview">
          <div className="preview-header">
            <Camera className="w-4 h-4" />
            <span>Plans ({sequence.shots.length})</span>
          </div>
          <div className="shots-grid">
            {sequence.shots.slice(0, 3).map((shot) => (
              <div
                key={shot.id}
                className="shot-preview"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditShot?.(shot);
                }}
              >
                <div className="shot-title">{shot.title}</div>
                <div className="shot-meta">
                  {shot.cameraMovement && (
                    <span className="camera-tag">
                      {getCameraMovementConfig(shot.cameraMovement as CameraMovement)?.name}
                    </span>
                  )}
                  <span className="duration">{shot.duration}s</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {sequence.directorNotes && sequence.directorNotes.length > 0 && (
        <div className="director-notes-indicator">
          <FileText className="w-4 h-4" />
          <span>{sequence.directorNotes.length} note(s)</span>
        </div>
      )}

      <div className="sequence-actions">
        <button
          className="action-btn expand"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
        >
          {expanded ? 'Reduire' : 'Voir plus'}
        </button>
        {onAddBeat && (
          <button
            className="action-btn add-beat"
            onClick={(e) => {
              e.stopPropagation();
              onAddBeat(sequence.id);
            }}
          >
            + Beat
          </button>
        )}
      </div>

      {expanded && sequence.beats.length > 0 && (
        <div className="expanded-content">
          <div className="full-beats">
            <h4>Tous les Beats</h4>
            {sequence.beats.map((beat) => (
              <div key={beat.id} className={`beat-detail ${beat.importance}`}>
                <span className="beat-order">#{beat.order}</span>
                <span className="beat-name">{beat.type}</span>
                <span className="beat-desc">{beat.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function getMoodColor(mood: string): string {
  const colors: Record<string, string> = {
    happy: '#ffd93d',
    sad: '#6c5ce7',
    tense: '#ff7675',
    romantic: '#fd79a8',
    mysterious: '#a29bfe',
    epic: '#fdcb6e',
    intimate: '#e17055',
    dark: '#2d3436',
    whimsical: '#55efc4',
    melancholic: '#74b9ff',
    anxious: '#fab1a0',
    triumphant: '#00b894',
    nostalgic: '#ffeaa7',
    peaceful: '#81ecec',
    chaotic: '#ff4757',
    mystical: '#d63031',
    ironic: '#b2bec3',
  };
  return colors[mood] || '#b2bec3';
}

export default EnhancedSequenceCard;

