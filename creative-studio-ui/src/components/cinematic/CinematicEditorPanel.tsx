/**
 * Cinematic Sequence Editor Panel
 * Integrated cinematic tools for the sequence editor
 * Requirements: Camera movements, beats, mood tracking, pacing analysis
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Video,
  Music,
  Users,
  MapPin,
  Clock,
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  Edit3,
  Save,
  Sparkles,
  Layout,
  Type,
  Volume2,
  Lightbulb,
  History,
  Move,
  RotateCcw,
  Settings,
  Play,
  Pause,
  Eye,
  VolumeX,
  Image,
  FileText,
  Zap,
  Target,
  TrendingUp,
  Heart,
  Moon,
  Sun,
  Smile,
  Frown,
  AlertTriangle,
  Award,
  Brain,
  Layers,
  LayoutGrid
} from 'lucide-react';
import { CameraMovementSelector } from './CameraMovementSelector';
import { BeatSelector } from './BeatSelector';
import { EnhancedSequenceCard } from './EnhancedSequenceCard';
import { CinematicElementsLibrary } from './CinematicElementsLibrary';
import { SceneSequenceEditor } from './SceneSequenceEditor';
import { CharacterBoardGenerator } from './CharacterBoardGenerator';
import { CinematicPostTools } from './CinematicPostTools';
import {
  EnhancedShot,
  CompleteSequence,
  ChapterWithBeats,
  BeatType,
  CameraMovement,
  MoodType,
  ToneType,
  PacingType,
  TransitionType,
  CharacterFocusTrack,
  CharacterPresence, // Added import
  CharacterFocus, // Added import
  MoodArc,
  DirectorNote,
  getCameraMovementConfig,
  moodColors,
  toneColors,
  pacingConfig,
  beatConfig,
  generateBeatSuggestions
} from '@/types/cinematicTypes';
import type { Shot, Character } from '@/types';
import './CinematicEditorPanel.css';

interface CinematicEditorPanelProps {
  sequenceId?: string;
  shots: Shot[];
  characters: Character[];
  onUpdateShot: (shotId: string, updates: Partial<Shot>) => void;
  onUpdateSequence: (updates: Partial<CompleteSequence>) => void;
  className?: string;
}

interface CinematicShotData extends EnhancedShot {
  // Integration with base Shot type
  sequence_id?: string;
}

export function CinematicEditorPanel({
  sequenceId,
  shots,
  characters,
  onUpdateShot,
  onUpdateSequence,
  className
}: CinematicEditorPanelProps) {
  const [selectedTab, setSelectedTab] = useState<'shots' | 'beats' | 'pacing' | 'directors' | 'elements' | 'sequence' | 'board' | 'postprod'>('shots');
  const [selectedShotId, setSelectedShotId] = useState<string | null>(null);
  const [selectedCharacterName, setSelectedCharacterName] = useState<string>("Héro Anonyme");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    overview: true,
    camera: true,
    mood: true,
    beats: false,
    characters: false,
    pacing: false,
    directors: false
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);

  // Convert base shots to cinematic shots
  const cinematicShots = useMemo((): CinematicShotData[] => {
    return shots.map((shot, index) => {
      const metadata = (shot.metadata || {}) as any;

      return {
        id: shot.id,
        name: shot.title || `Plan ${index + 1}`,
        title: shot.title || `Plan ${index + 1}`,
        description: shot.description || '',
        order: shot.position || index + 1,
        position: shot.position || index + 1,
        duration: shot.duration || 5,
        sequence_id: (shot as any).sequence_id, // Cast as it might be missing in base type

        // Cinematic defaults
        cameraMovement: (metadata.cameraMovement as CameraMovement) || null,
        mood: (metadata.mood as MoodType) || 'neutral',
        tone: (metadata.tone as ToneType) || 'neutral',
        pacing: (metadata.pacing as PacingType) || 'medium',
        beatId: metadata.beatId || null,

        // Character Conversion
        characters: (metadata.characterIds as string[])?.map(id => ({
          characterId: id,
          focus: 'lead', // Default to lead as placeholder
          timeStart: 0,
          timeEnd: shot.duration || 5,
          prominence: 1
        })) || [],

        locationId: metadata.locationId || null,

        // Director notes
        directorNotes: metadata.directorNotes || [],
        directorNote: typeof metadata.directorNote === 'string' ? metadata.directorNote : metadata.directorNote?.note || null, // legacy string

        // Audio
        audioMood: metadata.audioMood || null,
        ttsPrompt: metadata.ttsPrompt || null,

        // Version
        version: metadata.version || 1,
        content: metadata.content,
        beatType: metadata.beatType
      };
    });
  }, [shots]);

  // Calculate sequence metrics
  const sequenceMetrics = useMemo(() => {
    const totalDuration = cinematicShots.reduce((sum, s) => sum + s.duration, 0);
    const moodCounts = cinematicShots.reduce((acc, s) => {
      acc[s.mood] = (acc[s.mood] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const dominantMood = Object.entries(moodCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';

    return {
      totalDuration,
      shotCount: cinematicShots.length,
      dominantMood,
      moodCounts
    };
  }, [cinematicShots]);

  // Mood arc for the sequence
  const moodArc = useMemo((): MoodArc | null => {
    if (cinematicShots.length === 0) return null;

    return {
      id: `arc-${sequenceId || 'temp'}-${Date.now()}`,
      beats: [],
      overallTrend: 'flat',
      startMood: cinematicShots[0]?.mood || 'neutral',
      endMood: cinematicShots[cinematicShots.length - 1]?.mood || 'neutral',
      dominantMood: sequenceMetrics.dominantMood as MoodType,
      progression: cinematicShots.map(s => ({
        time: cinematicShots.filter(s2 => s2.position <= s.position)
          .reduce((sum, s2) => sum + s2.duration, 0),
        mood: s.mood
      }))
    };
  }, [cinematicShots, sequenceMetrics.dominantMood]);

  // Generate beat suggestions based on content
  const beatSuggestions = useMemo(() => {
    return generateBeatSuggestions(cinematicShots);
  }, [cinematicShots]);

  // Toggle section
  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  }, []);

  // Handle shot update
  const handleShotUpdate = useCallback((shotId: string, updates: Partial<CinematicShotData>) => {
    // Convert cinematic updates to base Shot format
    const baseUpdates: Partial<Shot> = {
      metadata: {
        ...(shots.find(s => s.id === shotId)?.metadata || {}),
        cameraMovement: updates.cameraMovement,
        mood: updates.mood,
        tone: updates.tone,
        pacing: updates.pacing,
        beatId: updates.beatId,
        transition: updates.transition,
        characterIds: updates.characters?.map(c => c.characterId),
        location: updates.locationId,
        directorNote: updates.directorNote,
        audioMood: updates.audioMood,
        ttsPrompt: updates.ttsPrompt,
        version: (updates.version || 1) + 1,
        lastModified: new Date().toISOString()
      }
    };
    onUpdateShot(shotId, baseUpdates);
  }, [shots, onUpdateShot]);

  // Handle camera movement change
  const handleCameraChange = useCallback((movement: CameraMovement | null) => {
    if (!selectedShotId) return;
    handleShotUpdate(selectedShotId, { cameraMovement: movement });
  }, [selectedShotId, handleShotUpdate]);

  // Handle mood change
  const handleMoodChange = useCallback((mood: MoodType) => {
    if (!selectedShotId) return;
    handleShotUpdate(selectedShotId, { mood });
  }, [selectedShotId, handleShotUpdate]);

  // Handle beat change
  const handleBeatChange = useCallback((beatId: string | null, beatType?: BeatType) => {
    if (!selectedShotId) return;
    handleShotUpdate(selectedShotId, { beatId, beatType });
  }, [selectedShotId, handleShotUpdate]);

  // Add director note
  const handleAddDirectorNote = useCallback((noteContent: string) => {
    if (!selectedShotId) return;

    const newNote: DirectorNote = {
      id: crypto.randomUUID(),
      note: noteContent,
      type: 'creative',
      priority: 'medium',
      status: 'pending',
      timestamp: new Date().toISOString(),
      author: 'Director'
    };

    // Update directorNotes array AND directorNote legacy string for compatibility
    const currentShot = cinematicShots.find(s => s.id === selectedShotId);
    const currentNotes = currentShot?.directorNotes || [];

    handleShotUpdate(selectedShotId, {
      directorNotes: [...currentNotes, newNote],
      directorNote: noteContent // Sync legacy field
    });
  }, [selectedShotId, cinematicShots, handleShotUpdate]);

  // Selected shot
  const selectedShot = useMemo(() =>
    cinematicShots.find(s => s.id === selectedShotId),
    [cinematicShots, selectedShotId]
  );

  return (
    <div className={`cinematic-editor-panel ${className || ''}`}>
      {/* Header */}
      <div className="cinematic-panel-header">
        <div className="cinematic-title">
          <FilmIcon className="w-5 h-5" />
          <h2>Édition Cinématographique</h2>
        </div>
        <div className="cinematic-meta">
          <span className="meta-item">
            <Clock className="w-4 h-4" />
            {Math.floor(sequenceMetrics.totalDuration / 60)}:{String(sequenceMetrics.totalDuration % 60).padStart(2, '0')}
          </span>
          <span className="meta-item">
            <Video className="w-4 h-4" />
            {sequenceMetrics.shotCount} plans
          </span>
          <span className="meta-item mood-badge" style={{ backgroundColor: moodColors[sequenceMetrics.dominantMood as MoodType]?.bg }}>
            <Heart className="w-4 h-4" />
            {sequenceMetrics.dominantMood}
          </span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="cinematic-tabs">
        <button
          className={`tab ${selectedTab === 'shots' ? 'active' : ''}`}
          onClick={() => setSelectedTab('shots')}
        >
          <Layers className="w-4 h-4" />
          Plans
        </button>
        <button
          className={`tab ${selectedTab === 'beats' ? 'active' : ''}`}
          onClick={() => setSelectedTab('beats')}
        >
          <Brain className="w-4 h-4" />
          Beats
        </button>
        <button
          className={`tab ${selectedTab === 'pacing' ? 'active' : ''}`}
          onClick={() => setSelectedTab('pacing')}
        >
          <TrendingUp className="w-4 h-4" />
          Rythme
        </button>
        <button
          className={`tab ${selectedTab === 'directors' ? 'active' : ''}`}
          onClick={() => setSelectedTab('directors')}
        >
          <FileText className="w-4 h-4" />
          Notes
        </button>
        <button
          className={`tab ${selectedTab === 'elements' ? 'active' : ''}`}
          onClick={() => setSelectedTab('elements')}
        >
          <Users className="w-4 h-4" />
          Éléments
        </button>
        <button
          className={`tab ${selectedTab === 'sequence' ? 'active' : ''}`}
          onClick={() => setSelectedTab('sequence')}
        >
          <Layout className="w-4 h-4" />
          Séquence
        </button>
        <button
          className={`tab ${selectedTab === 'board' ? 'active' : ''}`}
          onClick={() => setSelectedTab('board')}
        >
          <LayoutGrid className="w-4 h-4" />
          Planche
        </button>
        <button
          className={`tab ${selectedTab === 'postprod' ? 'active' : ''}`}
          onClick={() => setSelectedTab('postprod')}
        >
          <Zap className="w-4 h-4" />
          Post-Prod
        </button>
      </div>

      {/* Content */}
      <div className="cinematic-panel-content">
        {/* Shot Timeline */}
        {selectedTab === 'shots' && (
          <div className="shots-editor">
            {/* Timeline View */}
            <div className="timeline-container">
              <div className="timeline-header">
                <h3>Timeline des Plans</h3>
                <div className="timeline-controls">
                  <button
                    className="control-btn"
                    onClick={() => setIsPlaying(!isPlaying)}
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button className="control-btn">
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="timeline-tracks">
                {/* Video track */}
                <div className="track video-track">
                  <div className="track-label">
                    <Video className="w-3 h-3" />
                    Plans
                  </div>
                  <div className="track-content">
                    {cinematicShots.map((shot, index) => (
                      <div
                        key={shot.id}
                        className={`timeline-shot ${selectedShotId === shot.id ? 'selected' : ''}`}
                        style={{
                          width: `${(shot.duration / sequenceMetrics.totalDuration) * 100}%`,
                          backgroundColor: moodColors[shot.mood]?.bg,
                          borderLeftColor: moodColors[shot.mood]?.border
                        }}
                        onClick={() => setSelectedShotId(shot.id)}
                      >
                        <span className="shot-number">{index + 1}</span>
                        <span className="shot-title">{shot.title}</span>
                        <span className="shot-duration">{shot.duration}s</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mood track */}
                <div className="track mood-track">
                  <div className="track-label">
                    <Heart className="w-3 h-3" />
                    Émotion
                  </div>
                  <div className="track-content mood-track-content">
                    {cinematicShots.map((shot) => (
                      <div
                        key={shot.id}
                        className="mood-segment"
                        style={{
                          width: `${(shot.duration / sequenceMetrics.totalDuration) * 100}%`,
                          backgroundColor: moodColors[shot.mood]?.bg
                        }}
                        title={`${shot.mood} (${shot.duration}s)`}
                      >
                        <span className="mood-icon">
                          {shot.mood === 'happy' && <Smile className="w-3 h-3" />}
                          {shot.mood === 'sad' && <Frown className="w-3 h-3" />}
                          {shot.mood === 'tense' && <AlertTriangle className="w-3 h-3" />}
                          {shot.mood === 'romantic' && <Heart className="w-3 h-3" />}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Camera movement track */}
                <div className="track camera-track">
                  <div className="track-label">
                    <Video className="w-3 h-3" />
                    Caméra
                  </div>
                  <div className="track-content">
                    {cinematicShots.map((shot) => {
                      const cameraConfig = shot.cameraMovement
                        ? getCameraMovementConfig(shot.cameraMovement)
                        : null;
                      return (
                        <div
                          key={shot.id}
                          className="camera-segment"
                          style={{
                            width: `${(shot.duration / sequenceMetrics.totalDuration) * 100}%`
                          }}
                          title={cameraConfig?.name || 'Plan fixe'}
                        >
                          {cameraConfig?.icon && <cameraConfig.icon className="w-4 h-4" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Shot Editor */}
            {selectedShot && (
              <div className="shot-editor-panel">
                <div className="shot-editor-header">
                  <h3>Édition: {selectedShot.title}</h3>
                  <span className="shot-time">
                    Position: {selectedShot.position} | Durée: {selectedShot.duration}s
                  </span>
                </div>

                <div className="shot-editor-content">
                  {/* Camera Section */}
                  <div className="editor-section">
                    <div
                      className="section-header"
                      onClick={() => toggleSection('camera')}
                    >
                      <Video className="w-4 h-4" />
                      <h4>Mouvement de Caméra</h4>
                      {expandedSections.camera
                        ? <ChevronDown className="w-4 h-4" />
                        : <ChevronRight className="w-4 h-4" />
                      }
                    </div>
                    {expandedSections.camera && (
                      <CameraMovementSelector
                        value={selectedShot.cameraMovement}
                        onChange={handleCameraChange}
                      />
                    )}
                  </div>

                  {/* Mood Section */}
                  <div className="editor-section">
                    <div
                      className="section-header"
                      onClick={() => toggleSection('mood')}
                    >
                      <Heart className="w-4 h-4" />
                      <h4>Mood & Ton</h4>
                      {expandedSections.mood
                        ? <ChevronDown className="w-4 h-4" />
                        : <ChevronRight className="w-4 h-4" />
                      }
                    </div>
                    {expandedSections.mood && (
                      <div className="mood-selector">
                        <div className="mood-grid">
                          {(['neutral', 'happy', 'sad', 'tense', 'romantic', 'mysterious', 'epic', 'intimate', 'dark', 'whimsical'] as MoodType[]).map(mood => (
                            <button
                              key={mood}
                              className={`mood-btn ${selectedShot.mood === mood ? 'active' : ''}`}
                              style={{
                                backgroundColor: moodColors[mood]?.bg,
                                borderColor: moodColors[mood]?.border
                              }}
                              onClick={() => handleMoodChange(mood)}
                            >
                              {mood}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Beat Section */}
                  <div className="editor-section">
                    <div
                      className="section-header"
                      onClick={() => toggleSection('beats')}
                    >
                      <Brain className="w-4 h-4" />
                      <h4>Beat Narratif</h4>
                      {expandedSections.beats
                        ? <ChevronDown className="w-4 h-4" />
                        : <ChevronRight className="w-4 h-4" />
                      }
                    </div>
                    {expandedSections.beats && (
                      <BeatSelector
                        value={selectedShot.beatType}
                        onChange={(type) => handleBeatChange(selectedShot.beatId, type)}
                      />
                    )}
                  </div>

                  {/* Characters Section */}
                  <div className="editor-section">
                    <div
                      className="section-header"
                      onClick={() => toggleSection('characters')}
                    >
                      <Users className="w-4 h-4" />
                      <h4>Personnages</h4>
                      {expandedSections.characters
                        ? <ChevronDown className="w-4 h-4" />
                        : <ChevronRight className="w-4 h-4" />
                      }
                    </div>
                    {expandedSections.characters && (
                      <div className="character-selector">
                        {characters.map(char => (
                          <label key={char.character_id} className="character-checkbox">
                            <input
                              type="checkbox"
                              checked={selectedShot.characters?.some(c => c.characterId === char.character_id)}
                              onChange={(e) => {
                                const newCharPresence: CharacterPresence = {
                                  characterId: char.character_id,
                                  focus: 'supporting',
                                  timeStart: 0,
                                  timeEnd: selectedShot.duration,
                                  prominence: 0.5
                                };
                                const newChars = e.target.checked
                                  ? [...(selectedShot.characters || []), newCharPresence]
                                  : selectedShot.characters?.filter(c => c.characterId !== char.character_id) || [];
                                handleShotUpdate(selectedShot.id, { characters: newChars });
                              }}
                            />
                            <span>{char.name}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Beats Tab */}
        {selectedTab === 'beats' && (
          <div className="beats-editor">
            <div className="beats-overview">
              <h3>Structure Narrative</h3>
              <p className="beats-summary">
                {beatSuggestions.length} beats détectés dans {cinematicShots.length} plans
              </p>
            </div>
            <div className="beats-list">
              {beatSuggestions.map((beat, index) => (
                <div key={beat.id || index} className="beat-card">
                  <div className="beat-header">
                    <span className="beat-position">#{beat.position}</span>
                    <span className="beat-type">{beat.type}</span>
                    {beat.importance && (
                      <span className={`beat-importance ${beat.importance}`}>
                        {beat.importance}
                      </span>
                    )}
                  </div>
                  <p className="beat-description">{beat.description}</p>
                  <div className="beat-meta">
                    <span>{beat.duration}s</span>
                    <span>{beat.suggestedShots} plans suggérés</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pacing Tab */}
        {selectedTab === 'pacing' && (
          <div className="pacing-editor">
            <div className="pacing-overview">
              <h3>Analyse du Rythme</h3>
              {moodArc && (
                <div className="mood-arc-visualizer">
                  <div className="arc-header">
                    <span>Arc Émotionnel</span>
                  </div>
                  <div className="arc-visual">
                    {moodArc.progression.map((point, i) => (
                      <div
                        key={i}
                        className="arc-point"
                        style={{
                          left: `${(point.time / sequenceMetrics.totalDuration) * 100}%`,
                          backgroundColor: moodColors[point.mood]?.bg
                        }}
                        title={`${point.mood} à ${Math.floor(point.time / 60)}:${String(Math.floor(point.time % 60)).padStart(2, '0')}`}
                      />
                    ))}
                  </div>
                  <div className="arc-labels">
                    <span>DÉBUT: {moodArc.startMood}</span>
                    <span>FIN: {moodArc.endMood}</span>
                  </div>
                </div>
              )}
            </div>
            <div className="pacing-breakdown">
              <h4>Distribution du Rythme</h4>
              <div className="pacing-chart">
                {(['slow', 'medium', 'fast', 'varying'] as PacingType[]).map(pacing => {
                  const count = cinematicShots.filter(s => s.pacing === pacing).length;
                  const percentage = (count / cinematicShots.length) * 100;
                  return (
                    <div key={pacing} className="pacing-bar">
                      <span className="pacing-label">{pacing}</span>
                      <div className="pacing-fill-container">
                        <div
                          className="pacing-fill"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: pacingConfig[pacing]?.color
                          }}
                        />
                      </div>
                      <span className="pacing-count">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Director's Notes Tab */}
        {selectedTab === 'directors' && (
          <div className="directors-notes-editor">
            <div className="notes-header">
              <h3>Notes de Réalisation</h3>
              <button className="btn-add-note">
                <Plus className="w-4 h-4" />
                Ajouter une note
              </button>
            </div>
            <div className="notes-list">
              {cinematicShots.map(shot => (
                <div key={shot.id}>
                  {/* Render typed notes */}
                  {shot.directorNotes?.map(note => (
                    <div key={note.id} className="director-note-card">
                      <div className="note-shot-info">
                        <Video className="w-3 h-3" />
                        <span>{shot.title}</span>
                      </div>
                      <p className="note-content">{note.note}</p>
                      <div className="note-meta">
                        <span>{note.author || 'Director'}</span>
                        <span>{new Date(note.timestamp).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                  {/* Render legacy note if no typed notes */}
                  {(!shot.directorNotes || shot.directorNotes.length === 0) && shot.directorNote && (
                    <div className="director-note-card legacy">
                      <div className="note-shot-info">
                        <Video className="w-3 h-3" />
                        <span>{shot.title}</span>
                      </div>
                      <p className="note-content">{shot.directorNote}</p>
                      <div className="note-meta">
                        <span>Legacy Note</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Elements Tab */}
        {selectedTab === 'elements' && (
          <div className="elements-tab-content h-full overflow-hidden">
            <CinematicElementsLibrary onSelectBoard={(name) => {
              setSelectedCharacterName(name);
              setSelectedTab('board');
            }} />
          </div>
        )}

        {/* Sequence Tab */}
        {selectedTab === 'sequence' && (
          <div className="sequence-tab-content h-full overflow-hidden">
            <SceneSequenceEditor />
          </div>
        )}

        {/* Board Tab */}
        {selectedTab === 'board' && (
          <div className="board-tab-content h-full overflow-hidden">
            <CharacterBoardGenerator characterName={selectedCharacterName} />
          </div>
        )}

        {/* Post-Prod Tab */}
        {selectedTab === 'postprod' && (
          <div className="postprod-tab-content h-full overflow-hidden">
            <CinematicPostTools />
          </div>
        )}
      </div>
    </div>
  );
}

// Film Icon component (inline for simplicity)
function FilmIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
      <line x1="7" y1="2" x2="7" y2="22" />
      <line x1="17" y1="2" x2="17" y2="22" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <line x1="2" y1="7" x2="7" y2="7" />
      <line x1="2" y1="17" x2="7" y2="17" />
      <line x1="17" y1="17" x2="22" y2="17" />
      <line x1="17" y1="7" x2="22" y2="7" />
    </svg>
  );
}

export default CinematicEditorPanel;

