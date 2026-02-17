/**
 * Character Focus Tracker
 * Visualizes and manages character focus throughout a sequence
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Users,
  User,
  Focus,
  Eye,
  Video,
  Clock,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
  Crown,
  Shield,
  UserPlus,
  Settings,
  ChevronDown,
  ChevronRight,
  Maximize2,
  Minimize2
} from 'lucide-react';
import type { Character } from '@/types/character';
import type {
  CharacterFocus,
  CharacterPresence
} from '@/types/cinematicTypes';
import type {
  EnhancedShot,
  CompleteSequence
} from '@/types/cinematicTypes';
import './CharacterFocusTracker.css';

interface CharacterFocusTrackerProps {
  sequence: CompleteSequence;
  shots: EnhancedShot[];
  characters: Character[];
  onUpdateFocus: (shotId: string, characterId: string, focus: CharacterFocus) => void;
  className?: string;
}

interface CharacterTimelineEntry {
  shotId: string;
  shotTitle: string;
  timeStart: number;
  timeEnd: number;
  duration: number;
  characterId: string;
  characterName: string;
  focus: CharacterFocus;
}

type ViewMode = 'timeline' | 'heatmap' | 'stats' | 'grid';

export function CharacterFocusTracker({
  sequence,
  shots,
  characters,
  onUpdateFocus,
  className
}: CharacterFocusTrackerProps) {
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [expandedShots, setExpandedShots] = useState<Record<string, boolean>>({});
  const [showSettings, setShowSettings] = useState(false);

  // Build character timeline from shots
  const characterTimeline = useMemo((): CharacterTimelineEntry[] => {
    const entries: CharacterTimelineEntry[] = [];
    let currentTime = 0;
    for (const shot of shots) {
      const shotDuration = shot.duration || 5;
      const shotEnd = currentTime + shotDuration;
      for (const presence of shot.characters || []) {
        entries.push({
          shotId: shot.id,
          shotTitle: shot.name,
          timeStart: currentTime,
          timeEnd: shotEnd,
          duration: shotDuration,
          characterId: presence.characterId,
          // Resolve character name using characters prop; fallback to ID if not found
          characterName: characters.find(c => c.character_id === presence.characterId)?.name || presence.characterId,
          focus: presence.focus
        });
      }
      currentTime = shotEnd;
    }
    return entries;
  }, [shots, characters]);

  // Calculate screen time percentages per character
  const characterStats = useMemo(() => {
    const totalDuration = shots.reduce((sum, s) => sum + (s.duration || 5), 0);
    const characterDurations: Record<string, { name: string; duration: number; focusCounts: Record<CharacterFocus, number> }> = {};
    for (const entry of characterTimeline) {
      if (!characterDurations[entry.characterId]) {
        characterDurations[entry.characterId] = {
          name: entry.characterName,
          duration: 0,
          focusCounts: { lead: 0, supporting: 0, background: 0, off_screen: 0, group: 0 }
        };
      }
      characterDurations[entry.characterId].duration += entry.duration;
      characterDurations[entry.characterId].focusCounts[entry.focus]++;
    }
    const stats = Object.entries(characterDurations).map(([id, data]) => ({
      id,
      name: data.name,
      duration: data.duration,
      percentage: Math.round((data.duration / totalDuration) * 100),
      focusCounts: data.focusCounts,
      dominantFocus: Object.entries(data.focusCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0] as CharacterFocus || 'supporting'
    }));
    return stats.sort((a, b) => b.duration - a.duration);
  }, [characterTimeline, shots]);

  // Get timeline for selected character
  const selectedCharacterTimeline = useMemo(() => {
    if (!selectedCharacterId) return [];
    return characterTimeline.filter(e => e.characterId === selectedCharacterId);
  }, [characterTimeline, selectedCharacterId]);

  // Focus colors
  const getFocusColor = (focus: CharacterFocus): string => {
    switch (focus) {
      case 'lead': return '#f59e0b'; // Amber - protagonist
      case 'supporting': return '#3b82f6'; // Blue - secondary
      case 'background': return '#6b7280'; // Gray - extra
      case 'off_screen': return '#9ca3af'; // Light gray - voice only
      case 'group': return '#10b981'; // Green - ensemble
      default: return '#6b7280';
    }
  };

  const getFocusLabel = (focus: CharacterFocus): string => {
    switch (focus) {
      case 'lead': return 'Protagoniste';
      case 'supporting': return 'Secondaire';
      case 'background': return 'Fond';
      case 'off_screen': return 'Hors champ';
      case 'group': return 'Ensemble';
      default: return focus;
    }
  };

  // Toggle shot expanded
  const toggleShot = useCallback((shotId: string) => {
    setExpandedShots(prev => ({ ...prev, [shotId]: !prev[shotId] }));
  }, []);

  // Handle focus change in a shot
  const handleFocusChange = useCallback((shotId: string, characterId: string, newFocus: CharacterFocus) => {
    console.log('Focus change:', { shotId, characterId, newFocus });
    onUpdateFocus(shotId, characterId, newFocus);
  }, [onUpdateFocus]);

  // Stats for summary
  const summaryStats = useMemo(() => {
    const totalShots = shots.length;
    const shotsWithMultiple = characterTimeline.filter(
      (e, i, arr) => arr.findIndex(x => x.shotId === e.shotId) === i
    ).filter(e => {
      const shotChars = characterTimeline.filter(x => x.shotId === e.shotId);
      return shotChars.length > 1;
    }).length;
    const characterDurations: Record<string, number> = {};
    for (const entry of characterTimeline) {
      characterDurations[entry.characterId] = (characterDurations[entry.characterId] || 0) + entry.duration;
    }
    return {
      totalCharacters: Object.keys(characterDurations).length,
      totalShots,
      shotsWithMultipleCharacters: shotsWithMultiple,
      averageCharactersPerShot: Math.round((characterTimeline.length / totalShots) * 10) / 10
    };
  }, [characterTimeline, shots]);

  return (
    <div className={`character-focus-tracker ${className || ''}`}>
      {/* Header */}
      <div className="tracker-header">
        <div className="header-left">
          <Users className="w-5 h-5" />
          <h2>Character Focus Tracking</h2>
          <span className="char-count">{summaryStats.totalCharacters} personnages</span>
        </div>
        <div className="header-actions">
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as ViewMode)}
            className="view-select"
            aria-label="Select view mode"
          >
            <option value="timeline">Timeline</option>
            <option value="heatmap">Heatmap</option>
            <option value="stats">Statistiques</option>
            <option value="grid">Grille</option>
          </select>
          <button
            className={`btn-settings ${showSettings ? 'active' : ''}`}
            onClick={() => setShowSettings(!showSettings)}
            aria-label="Toggle settings panel"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="settings-panel">
          <h3>Paramètres d'affichage</h3>
          <div className="settings-grid">
            <label>
              <input type="checkbox" defaultChecked />
              Afficher le temps à l'écran
            </label>
            <label>
              <input type="checkbox" defaultChecked />
              Afficher le focus dominant
            </label>
            <label>
              <input type="checkbox" />
              Grouper par séquence
            </label>
            <label>
              <input type="checkbox" defaultChecked />
              Animation des transitions
            </label>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="tracker-content">
        {viewMode === 'timeline' && (
          <TimelineView
            shots={shots}
            characterTimeline={characterTimeline}
            characters={characters}
            selectedCharacterId={selectedCharacterId}
            onSelectCharacter={setSelectedCharacterId}
            expandedShots={expandedShots}
            onToggleShot={toggleShot}
            onFocusChange={handleFocusChange}
            getFocusColor={getFocusColor}
            getFocusLabel={getFocusLabel}
          />
        )}

        {viewMode === 'heatmap' && (
          <HeatmapView
            shots={shots}
            characterStats={characterStats}
            selectedCharacterId={selectedCharacterId}
            onSelectCharacter={setSelectedCharacterId}
            getFocusColor={getFocusColor}
          />
        )}

        {viewMode === 'stats' && (
          <StatsView
            characterStats={characterStats}
            summaryStats={summaryStats}
            characters={characters}
            getFocusColor={getFocusColor}
            getFocusLabel={getFocusLabel}
          />
        )}

        {viewMode === 'grid' && (
          <GridView
            shots={shots}
            characters={characters}
            characterTimeline={characterTimeline}
            onFocusChange={handleFocusChange}
            getFocusColor={getFocusColor}
            getFocusLabel={getFocusLabel}
          />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// TIMELINE VIEW
// ============================================================================

interface TimelineViewProps {
  shots: EnhancedShot[];
  characterTimeline: CharacterTimelineEntry[];
  characters: Character[];
  selectedCharacterId: string | null;
  onSelectCharacter: (id: string | null) => void;
  expandedShots: Record<string, boolean>;
  onToggleShot: (shotId: string) => void;
  onFocusChange: (shotId: string, characterId: string, focus: CharacterFocus) => void;
  getFocusColor: (focus: CharacterFocus) => string;
  getFocusLabel: (focus: CharacterFocus) => string;
}

function TimelineView({
  shots,
  characterTimeline,
  characters,
  selectedCharacterId,
  onSelectCharacter,
  expandedShots,
  onToggleShot,
  onFocusChange,
  getFocusColor,
  getFocusLabel
}: TimelineViewProps) {
  // Group entries by shot
  const shotsWithCharacters = useMemo(() => {
    return shots.map(shot => ({
      shot,
      characters: characterTimeline.filter(e => e.shotId === shot.id)
    }));
  }, [shots, characterTimeline]);

  return (
    <div className="timeline-view">
      {/* Character selector strip */}
      <div className="character-strip">
        {characters.map(char => (
          <button
            key={char.character_id}
            className={`char-chip ${selectedCharacterId === char.character_id ? 'selected' : ''}`}
            onClick={() => onSelectCharacter(
              selectedCharacterId === char.character_id ? null : char.character_id
            )}
          >
            <User className="w-3 h-3" />
            <span>{char.name}</span>
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div className="timeline-container">
        {shotsWithCharacters.map(({ shot, characters: shotChars }) => (
          <div
            key={shot.id}
            className={`timeline-row ${expandedShots[shot.id] ? 'expanded' : ''}`}
          >
            <div
              className="row-header"
              onClick={() => onToggleShot(shot.id)}
            >
              {expandedShots[shot.id]
                ? <ChevronDown className="w-4 h-4" />
                : <ChevronRight className="w-4 h-4" />
              }
              <span className="shot-title">{shot.name}</span>
              <span className="shot-time">{shot.duration}s</span>
            </div>

            {(expandedShots[shot.id] || shotChars.length === 0) && (
              <div className="row-content">
                {shotChars.length === 0 ? (
                  <div className="empty-message">Aucun personnage</div>
                ) : (
                  shotChars.map(entry => (
                    <div
                    key={`${entry.shotId}-${entry.characterId}`}
                    className={`character-entry ${selectedCharacterId === entry.characterId ? 'highlight' : ''} focus-${entry.focus}`}
                  >
                      <div className="entry-main">
                        <span className="char-name">{entry.characterName}</span>
                        <select
                          value={entry.focus}
                          onChange={(e) => onFocusChange(
                            entry.shotId,
                            entry.characterId,
                            e.target.value as CharacterFocus
                          )}
                          aria-label={`Select focus for ${entry.characterName}`}
                          className={`focus-select focus-${entry.focus}`}
                        >
                          <option value="lead">Protagoniste</option>
                          <option value="supporting">Secondaire</option>
                          <option value="background">Fond</option>
                          <option value="off_screen">Hors champ</option>
                          <option value="group">Ensemble</option>
                        </select>
                        <span
                          className={`focus-badge focus-${entry.focus}`}
                        >
                          {getFocusLabel(entry.focus)}
                        </span>
                        <span className="duration">{entry.duration}s</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// HEATMAP VIEW
// ============================================================================

interface HeatmapViewProps {
  shots: EnhancedShot[];
  characterStats: Array<{
    id: string;
    name: string;
    duration: number;
    percentage: number;
    focusCounts: Record<CharacterFocus, number>;
    dominantFocus: CharacterFocus;
  }>;
  selectedCharacterId: string | null;
  onSelectCharacter: (id: string | null) => void;
  getFocusColor: (focus: CharacterFocus) => string;
}

function HeatmapView({
  shots,
  characterStats,
  selectedCharacterId,
  onSelectCharacter,
  getFocusColor
}: HeatmapViewProps) {
  return (
    <div className="heatmap-view">
      <div className="heatmap-grid">
        <div className="heatmap-header">
          <div className="corner-cell">Personnage</div>
          {shots.map(shot => (
            <div key={shot.id} className="heatmap-col-header">
              <span>{shot.name.substring(0, 10)}</span>
              <span className="duration">{shot.duration}s</span>
            </div>
          ))}
        </div>

        {characterStats.map(char => (
          <div
            key={char.id}
            className={`heatmap-row ${selectedCharacterId === char.id ? 'selected' : ''}`}
            onClick={() => onSelectCharacter(
              selectedCharacterId === char.id ? null : char.id
            )}
          >
            <div className="heatmap-row-header">
              <User className="w-4 h-4" />
              <span>{char.name}</span>
            </div>
            {shots.map(shot => {
              const presence = shot.characters?.find(c => c.characterId === char.id);
              return (
                <div
                  key={shot.id}
                  className={`heatmap-cell ${presence ? `focus-${presence.focus}` : ''}`}
                  title={`${char.name} - ${shot.name}: ${presence?.focus || 'Absent'}`}
                >
                  {presence && <Focus className="w-3 h-3" />}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="heatmap-legend">
        <span className="legend-title">Focus:</span>
        <div className="legend-items">
          <span className="legend-item">
            <span className="dot" style={{ backgroundColor: getFocusColor('lead') }} />
            Protagoniste
          </span>
          <span className="legend-item">
            <span className="dot" style={{ backgroundColor: getFocusColor('supporting') }} />
            Secondaire
          </span>
          <span className="legend-item">
            <span className="dot" style={{ backgroundColor: getFocusColor('background') }} />
            Fond
          </span>
          <span className="legend-item">
            <span className="dot" style={{ backgroundColor: getFocusColor('off_screen') }} />
            Hors champ
          </span>
          <span className="legend-item">
            <span className="dot" style={{ backgroundColor: getFocusColor('group') }} />
            Ensemble
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// STATS VIEW
// ============================================================================

interface StatsViewProps {
  characterStats: Array<{
    id: string;
    name: string;
    duration: number;
    percentage: number;
    focusCounts: Record<CharacterFocus, number>;
    dominantFocus: CharacterFocus;
  }>;
  summaryStats: {
    totalCharacters: number;
    totalShots: number;
    shotsWithMultipleCharacters: number;
    averageCharactersPerShot: number;
  };
  characters: Character[];
  getFocusColor: (focus: CharacterFocus) => string;
  getFocusLabel: (focus: CharacterFocus) => string;
}

function StatsView({
  characterStats,
  summaryStats,
  characters,
  getFocusColor,
  getFocusLabel
}: StatsViewProps) {
  return (
    <div className="stats-view">
      {/* Summary cards */}
      <div className="summary-cards">
        <div className="summary-card">
          <Users className="w-6 h-6" />
          <div className="card-content">
            <span className="card-value">{summaryStats.totalCharacters}</span>
            <span className="card-label">Personnages</span>
          </div>
        </div>
        <div className="summary-card">
          <Video className="w-6 h-6" />
          <div className="card-content">
            <span className="card-value">{summaryStats.totalShots}</span>
            <span className="card-label">Plans totaux</span>
          </div>
        </div>
        <div className="summary-card">
          <Activity className="w-6 h-6" />
          <div className="card-content">
            <span className="card-value">{summaryStats.averageCharactersPerShot}</span>
            <span className="card-label">Pers./plan (moy)</span>
          </div>
        </div>
        <div className="summary-card">
          <BarChart3 className="w-6 h-6" />
          <div className="card-content">
            <span className="card-value">{summaryStats.shotsWithMultipleCharacters}</span>
            <span className="card-label">Plans multiples</span>
          </div>
        </div>
      </div>

      {/* Character bars */}
      <div className="character-bars">
        <h3>Temps à l'écran par personnage</h3>
        {characterStats.map(char => (
          <div key={char.id} className="character-bar-row">
            <div className="bar-header">
              <User className="w-4 h-4" />
              <span className="char-name">{char.name}</span>
              <span className="char-percentage">{char.percentage}%</span>
            </div>
            <div className="bar-container">
              <div
                className="bar-fill"
                style={{ width: `${char.percentage}%` }}
              />
            </div>
            <div className="bar-meta">
              <span>{char.duration}s</span>
              <span
                className={`dominant-focus focus-${char.dominantFocus}`}
              >
                {getFocusLabel(char.dominantFocus)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Focus distribution */}
      <div className="focus-distribution">
        <h3>Distribution du focus</h3>
        <div className="distribution-grid">
          {(['lead', 'supporting', 'background', 'off_screen', 'group'] as CharacterFocus[]).map(focus => {
            const count = characterStats.reduce((sum, char) =>
              sum + (char.focusCounts[focus] || 0), 0
            );
            return (
              <div key={focus} className="distribution-cell">
                <span
                  className={`focus-dot focus-${focus}`}
                />
                <span className="focus-label">{getFocusLabel(focus)}</span>
                <span className="focus-count">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// GRID VIEW
// ============================================================================

interface GridViewProps {
  shots: EnhancedShot[];
  characters: Character[];
  characterTimeline: CharacterTimelineEntry[];
  onFocusChange: (shotId: string, characterId: string, focus: CharacterFocus) => void;
  getFocusColor: (focus: CharacterFocus) => string;
  getFocusLabel: (focus: CharacterFocus) => string;
}

function GridView({
  shots,
  characters,
  characterTimeline,
  onFocusChange,
  getFocusColor,
  getFocusLabel
}: GridViewProps) {
  return (
    <div className="grid-view">
      <div className="grid-table">
        <div className="grid-header">
          <div className="corner-cell">Plan / Personnage</div>
          {characters.map(char => (
            <div key={char.character_id} className="grid-col-header">
              <User className="w-4 h-4" />
              <span>{char.name}</span>
            </div>
          ))}
        </div>

        {shots.map(shot => (
          <div key={shot.id} className="grid-row">
            <div className="grid-row-header">
              <span>{shot.name}</span>
              <span className="duration">{shot.duration}s</span>
            </div>
            {characters.map(char => {
              const presence = shot.characters?.find(c => c.characterId === char.character_id);
              return (
                <div key={char.character_id} className="grid-cell">
                  {presence ? (
                    <select
                      value={presence.focus}
                      onChange={(e) => onFocusChange(
                        shot.id,
                        char.character_id,
                        e.target.value as CharacterFocus
                      )}
                      aria-label={`Select focus for ${char.name} in ${shot.name}`}
                      className={`focus-select focus-${presence.focus}`}
                    >
                      <option value="lead">Lead</option>
                      <option value="supporting">Supp</option>
                      <option value="background">Bg</option>
                      <option value="off_screen">Off</option>
                      <option value="group">Group</option>
                    </select>
                  ) : (
                    <span className="absent">—</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export default CharacterFocusTracker;
