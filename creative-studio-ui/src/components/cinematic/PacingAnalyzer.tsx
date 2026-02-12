/**
 * Pacing Analyzer
 * Analyzes and visualizes the pacing/tempo of a sequence
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Clock,
  Activity,
  Zap,
  Target,
  BarChart2
} from 'lucide-react';
import type { 
  Pacing, 
  PacingEnergy,
  EnhancedShot,
  CompleteSequence,
  PacingConfig 
} from '@/types/cinematicTypes';
import { PACING_CONFIGS } from '@/types/cinematicTypes';
import './PacingAnalyzer.css';

interface PacingAnalyzerProps {
  sequence: CompleteSequence;
  shots: EnhancedShot[];
  onUpdatePacing: (shotId: string, pacing: Pacing) => void;
  className?: string;
}

interface PacingSegment {
  shotId: string;
  title: string;
  startTime: number;
  endTime: number;
  duration: number;
  pacing: Pacing;
  energy: PacingEnergy;
  intensity: number;
}

type ViewMode = 'timeline' | 'waveform' | 'bars' | 'heatmap';

export function PacingAnalyzer({
  sequence,
  shots,
  onUpdatePacing,
  className
}: PacingAnalyzerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [selectedShotId, setSelectedShotId] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(true);

  const segments = useMemo((): PacingSegment[] => {
    let currentTime = 0;
    return shots.map(shot => {
      const duration = shot.duration || 5;
      const config = PACING_CONFIGS[shot.pacing || 'medium'];
      const segment: PacingSegment = {
        shotId: shot.id,
        title: shot.title,
        startTime: currentTime,
        endTime: currentTime + duration,
        duration,
        pacing: shot.pacing || 'medium',
        energy: config?.energy || 'medium',
        intensity: getIntensityFromPacing(shot.pacing || 'medium', duration)
      };
      currentTime += duration;
      return segment;
    });
  }, [shots]);

  const stats = useMemo(() => {
    const totalDuration = segments.reduce((sum, s) => sum + s.duration, 0);
    const pacingCounts: Record<Pacing, number> = { slow: 0, medium: 0, fast: 0, variable: 0 };
    
    segments.forEach(s => {
      pacingCounts[s.pacing]++;
    });

    const dominantPacing = Object.entries(pacingCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] as Pacing || 'medium';

    const avgDuration = segments.length > 0 
      ? Math.round(segments.reduce((sum, s) => sum + s.duration, 0) / segments.length * 10) / 10
      : 0;

    return {
      totalDuration,
      shotCount: segments.length,
      pacingCounts,
      dominantPacing,
      avgDuration
    };
  }, [segments]);

  const getPacingColor = (pacing: Pacing): string => {
    switch (pacing) {
      case 'slow': return '#6366f1';
      case 'medium': return '#10b981';
      case 'fast': return '#f59e0b';
      case 'variable': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  const getPacingLabel = (pacing: Pacing): string => {
    switch (pacing) {
      case 'slow': return 'Lent';
      case 'medium': return 'Normal';
      case 'fast': return 'Rapide';
      case 'variable': return 'Variable';
      default: return pacing;
    }
  };

  const handlePacingChange = useCallback((shotId: string, newPacing: Pacing) => {
    onUpdatePacing(shotId, newPacing);
  }, [onUpdatePacing]);

  return (
    <div className={`pacing-analyzer ${className || ''}`}>
      <div className="analyzer-header">
        <div className="header-left">
          <Clock className="w-5 h-5" />
          <h2>Analyse du Rythme</h2>
          <span className="duration-badge">{formatTime(stats.totalDuration)}</span>
        </div>
        <div className="header-actions">
          <select 
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as ViewMode)}
            className="view-select"
          >
            <option value="timeline">Timeline</option>
            <option value="waveform">Waveform</option>
            <option value="bars">Barres</option>
            <option value="heatmap">Heatmap</option>
          </select>
          <button 
            className={`btn-toggle ${showStats ? 'active' : ''}`}
            onClick={() => setShowStats(!showStats)}
          >
            <BarChart2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showStats && (
        <div className="stats-panel">
          <div className="stats-grid">
            <div className="stat-card">
              <Clock className="w-5 h-5" />
              <div className="stat-content">
                <span className="stat-value">{stats.totalDuration}s</span>
                <span className="stat-label">Durée totale</span>
              </div>
            </div>
            <div className="stat-card">
              <Target className="w-5 h-5" />
              <div className="stat-content">
                <span className="stat-value">{stats.shotCount}</span>
                <span className="stat-label">Plans</span>
              </div>
            </div>
            <div className="stat-card dominant">
              <Activity className="w-5 h-5" />
              <div className="stat-content">
                <span className="stat-value">{getPacingLabel(stats.dominantPacing)}</span>
                <span className="stat-label">Rythme dominant</span>
              </div>
            </div>
            <div className="stat-card">
              <Zap className="w-5 h-5" />
              <div className="stat-content">
                <span className="stat-value">{stats.avgDuration}s</span>
                <span className="stat-label">Moyenne/plan</span>
              </div>
            </div>
          </div>

          <div className="distribution-section">
            <h3>Distribution du rythme</h3>
            <div className="distribution-bars">
              {(['slow', 'medium', 'fast', 'variable'] as Pacing[]).map(pacing => {
                const count = stats.pacingCounts[pacing];
                const percentage = stats.shotCount > 0 ? Math.round((count / stats.shotCount) * 100) : 0;
                return (
                  <div key={pacing} className="distribution-item">
                    <div className="distribution-label">
                      <span>{getPacingLabel(pacing)}</span>
                      <span>{count} plans</span>
                    </div>
                    <div className="distribution-bar">
                      <div 
                        className="distribution-fill"
                        style={{ 
                          width: `${percentage}%`,
                          backgroundColor: getPacingColor(pacing)
                        }}
                      />
                    </div>
                    <span className="distribution-percent">{percentage}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="visualization-container">
        <TimelineView
          segments={segments}
          selectedShotId={selectedShotId}
          onSelectShot={setSelectedShotId}
          onPacingChange={handlePacingChange}
          getPacingColor={getPacingColor}
          getPacingLabel={getPacingLabel}
        />
      </div>

      <div className="legend">
        <div className="legend-item">
          <span className="legend-dot" style={{ backgroundColor: getPacingColor('slow') }} />
          <span>Lent (10-30+ s)</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ backgroundColor: getPacingColor('medium') }} />
          <span>Normal (3-10 s)</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ backgroundColor: getPacingColor('fast') }} />
          <span>Rapide (1-3 s)</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ backgroundColor: getPacingColor('variable') }} />
          <span>Variable</span>
        </div>
      </div>
    </div>
  );
}

interface TimelineViewProps {
  segments: PacingSegment[];
  selectedShotId: string | null;
  onSelectShot: (id: string | null) => void;
  onPacingChange: (shotId: string, pacing: Pacing) => void;
  getPacingColor: (pacing: Pacing) => string;
  getPacingLabel: (pacing: Pacing) => string;
}

function TimelineView({
  segments,
  selectedShotId,
  onSelectShot,
  onPacingChange,
  getPacingColor,
  getPacingLabel
}: TimelineViewProps) {
  const maxTime = segments[segments.length - 1]?.endTime || 100;

  return (
    <div className="timeline-view">
      <div className="timeline-track">
        {segments.map(segment => (
          <React.Fragment key={segment.shotId}>
            <div 
              className="time-marker"
              style={{ left: `${(segment.startTime / maxTime) * 100}%` }}
            >
              <span className="time-label">{formatTime(segment.startTime)}</span>
            </div>
            <div 
              className={`timeline-segment ${selectedShotId === segment.shotId ? 'selected' : ''}`}
              style={{ 
                width: `${(segment.duration / maxTime) * 100}%`,
                backgroundColor: getPacingColor(segment.pacing)
              }}
              onClick={() => onSelectShot(selectedShotId === segment.shotId ? null : segment.shotId)}
            >
              <div className="segment-content">
                <span className="segment-title">{segment.title}</span>
                <span className="segment-duration">{segment.duration}s</span>
              </div>
            </div>
          </React.Fragment>
        ))}
      </div>

      {selectedShotId && (
        <div className="shot-details">
          {(() => {
            const segment = segments.find(s => s.shotId === selectedShotId);
            if (!segment) return null;
            return (
              <>
                <h3>{segment.title}</h3>
                <div className="detail-row">
                  <span>Durée:</span>
                  <strong>{segment.duration}s</strong>
                </div>
                <div className="detail-row">
                  <span>Rythme:</span>
                  <span 
                    className="pacing-badge"
                    style={{ backgroundColor: getPacingColor(segment.pacing) }}
                  >
                    {getPacingLabel(segment.pacing)}
                  </span>
                </div>
                <div className="detail-controls">
                  <label>Changer:</label>
                  <div className="pacing-buttons">
                    {(['slow', 'medium', 'fast', 'variable'] as Pacing[]).map(pacing => (
                      <button
                        key={pacing}
                        className={`pacing-btn ${segment.pacing === pacing ? 'active' : ''}`}
                        style={{ 
                          borderColor: segment.pacing === pacing ? getPacingColor(pacing) : undefined,
                          backgroundColor: segment.pacing === pacing ? getPacingColor(pacing) + '20' : undefined
                        }}
                        onClick={() => onPacingChange(segment.shotId, pacing)}
                      >
                        {getPacingLabel(pacing)}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}

function getIntensityFromPacing(pacing: Pacing, duration: number): number {
  const baseIntensity = { slow: 0.25, medium: 0.5, fast: 0.85, variable: 0.55 }[pacing] || 0.5;
  const durationFactor = Math.min(duration / 10, 1);
  return baseIntensity * (1 - durationFactor * 0.2);
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins > 0) {
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  return `0:${secs.toString().padStart(2, '0')}`;
}

export default PacingAnalyzer;

