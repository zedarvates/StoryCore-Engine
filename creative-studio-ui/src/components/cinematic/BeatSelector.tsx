/**
 * Beat Selector Component
 * UI component for selecting and configuring narrative beats
 */

import React, { useMemo } from 'react';
import { 
  BeatType, 
  BeatConfig, 
  BeatImportance,
  BEAT_CONFIGS,
  getBeatConfig
} from '@/types/cinematicTypes';
import './BeatSelector.css';

interface BeatSelectorProps {
  value?: BeatType;
  onChange: (beat: BeatType) => void;
  importance?: BeatImportance;
  onImportanceChange?: (importance: BeatImportance) => void;
  disabled?: boolean;
  showDetails?: boolean;
  className?: string;
}

const BEAT_ICONS: Record<BeatType, React.ReactNode> = {
  opening: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="5 3 19 12 5 21 5 3"/>
    </svg>
  ),
  setup: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="16" x2="12" y2="12"/>
    </svg>
  ),
  confrontation: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
    </svg>
  ),
  climax: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
  resolution: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
  transition: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  ),
  emotional: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  ),
  reversal: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="15 3 21 3 21 9"/>
      <polyline points="9 21 3 21 3 15"/>
      <line x1="21" y1="3" x2="14" y2="10"/>
    </svg>
  ),
  callback: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  ),
  closing: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
    </svg>
  ),
};

const IMPORTANCE_COLORS: Record<BeatImportance, string> = {
  low: '#4ecdc4',
  medium: '#ffe66d',
  high: '#ff6b6b',
  critical: '#e94560',
};

export function BeatSelector({
  value,
  onChange,
  importance,
  onImportanceChange,
  disabled = false,
  showDetails = true,
  className = '',
}: BeatSelectorProps) {
  const selectedConfig = useMemo(
    () => (value ? getBeatConfig(value) : null),
    [value]
  );

  const beats = Object.entries(BEAT_CONFIGS);

  const groupedBeats = useMemo(() => {
    const groups: Record<string, [string, BeatConfig][]> = {
      'Structure': beats.filter(([key]) => 
        ['opening', 'setup', 'closing'].includes(key)
      ),
      'Tension': beats.filter(([key]) => 
        ['confrontation', 'climax', 'reversal'].includes(key)
      ),
      'Emotion': beats.filter(([key]) => 
        ['emotional', 'resolution'].includes(key)
      ),
      'Liaison': beats.filter(([key]) => 
        ['transition', 'callback'].includes(key)
      ),
    };
    return groups;
  }, []);

  return (
    <div className={`beat-selector ${className}`}>
      {value && showDetails && selectedConfig && (
        <div className="beat-details" style={{ borderColor: importance ? IMPORTANCE_COLORS[importance] : '#e94560' }}>
          <div className="beat-details-header">
            <div className="beat-icon" style={{ background: IMPORTANCE_COLORS[importance || 'medium'] }}>
              {BEAT_ICONS[value]}
            </div>
            <div className="beat-info">
              <h4>{selectedConfig.name}</h4>
              <p>{selectedConfig.description}</p>
            </div>
          </div>
          
          <div className="beat-meta">
            <span className="duration">{selectedConfig.duration}</span>
            <span className="purpose">{selectedConfig.purpose}</span>
          </div>

          {selectedConfig.emotionalTone && selectedConfig.emotionalTone.length > 0 && (
            <div className="beat-tones">
              {selectedConfig.emotionalTone.map((tone) => (
                <span key={tone} className="tone-tag">{tone}</span>
              ))}
            </div>
          )}

          {onImportanceChange && (
            <div className="importance-selector">
              <label>Importance:</label>
              <div className="importance-buttons">
                {(['low', 'medium', 'high', 'critical'] as BeatImportance[]).map((imp) => (
                  <button
                    key={imp}
                    type="button"
                    className={`importance-btn ${importance === imp ? 'active' : ''} ${imp}`}
                    onClick={() => onImportanceChange(imp)}
                  >
                    {imp.charAt(0).toUpperCase() + imp.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="beat-grid">
        {Object.entries(groupedBeats).map(([category, items]) => (
          <div key={category} className="beat-category">
            <h5 className="category-title">{category}</h5>
            <div className="category-items">
              {items.map(([key, config]) => (
                <button
                  key={key}
                  type="button"
                  className={`beat-button ${value === key ? 'selected' : ''}`}
                  onClick={() => onChange(key as BeatType)}
                  disabled={disabled}
                >
                  <div className="beat-icon">{BEAT_ICONS[key as BeatType]}</div>
                  <span className="beat-name">{config.name.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default BeatSelector;

