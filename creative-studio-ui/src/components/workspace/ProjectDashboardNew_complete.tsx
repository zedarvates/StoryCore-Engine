/**
 * New Project Dashboard Component
 * 
 * Redesigned dashboard with:
 * - Compact Quick Access at top
 * - Smaller Pipeline Status
 * - Large Global Story Resume (editable with LLM)
 * - Vertical Recent Activity on right
 * - Chatterbox LLM Assistant
 * - Sequence Plans display with +/- buttons
 * - Click on sequence to open editor
 */
import { LegacyAny } from '@/types/legacy';


import { useState, useMemo } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { useStore } from '@/store';
import {
  Film,
  Users,
  FileText,
  Plus,
  Sparkles,
  CheckCircle2,
  Trash2,
  Edit3,
  RefreshCw,
  BookOpen,
  Settings,
  Clapperboard,
} from 'lucide-react';
import './ProjectDashboardNew.css';

// ============================================================================
// TYPES AND CONFIGURATIONS
// ============================================================================

export type FilmType = 'short_film' | 'medium_film' | 'feature_film';

interface FilmTypeConfig {
  type: FilmType;
  name: string;
  minDuration: number;
  maxDuration: number;
  introLongTake: boolean;
  endingLongTake: boolean;
  avgSequences: number;
  avgChapters: number;
  description: string;
}

const FILM_TYPE_CONFIGS: FilmTypeConfig[] = [
  {
    type: 'short_film',
    name: 'Court-métrage (3-20 min)',
    minDuration: 3,
    maxDuration: 20,
    introLongTake: true,
    endingLongTake: true,
    avgSequences: 3,
    avgChapters: 3,
    description: 'Le plan-séquence est souvent utilisé comme signature. 1 plan-séquence intro + 1 plan-séquence fin recommandés.',
  },
  {
    type: 'medium_film',
    name: 'Moyen métrage (20-60 min)',
    minDuration: 20,
    maxDuration: 60,
    introLongTake: true,
    endingLongTake: true,
    avgSequences: 5,
    avgChapters: 5,
    description: 'Un plan-séquence notable pour l\'intro et un autre pour la fin.',
  },
  {
    type: 'feature_film',
    name: 'Long métrage (60+ min)',
    minDuration: 60,
    maxDuration: 300,
    introLongTake: false,
    endingLongTake: false,
    avgSequences: 12,
    avgChapters: 8,
    description: '0-1 plan-séquence notable pour poser le ton à l\'intro (usage ponctuel).',
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function detectFilmType(story: LegacyAny): FilmType {
  const contentLength = story?.content?.length || 0;
  const estimatedMinutes = contentLength / 150;
  
  if (estimatedMinutes < 20) return 'short_film';
  if (estimatedMinutes < 60) return 'medium_film';
  return 'feature_film';
}

export function getFilmTypeConfig(filmType: FilmType): FilmTypeConfig {
  return FILM_TYPE_CONFIGS.find(c => c.type === filmType)!;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface ProjectDashboardNewProps {
  onOpenEditor: (sequenceId?: string) => void;
}

interface SequenceData {
  id: string;
  name: string;
  duration: number;
  shots: number;
  resume: string;
  order: number;
  metadata?: Record<string, unknown>;
}

export function ProjectDashboardNew({
  onOpenEditor,
}: ProjectDashboardNewProps) {
  // Store hooks
  const project = useAppStore((state) => state.project);
  const shots = useAppStore((state) => state.shots);
  const setShowSequenceEditor = useAppStore((state) => state.setShowSequenceEditor);

  // States
  const stories = useStore((state) => state.stories);
  const characters = useStore((state) => state.characters);
  
  const [isLoadingSequences] = useState(false);
  const [isSyncing] = useState(false);
  const [forceUpdate] = useState(0);

  const recentActivity = [
    { id: '1', action: 'Created new long take', time: '2m ago', icon: Sparkles },
    { id: '2', action: 'Synchronized project', time: '1h ago', icon: RefreshCw },
    { id: '3', action: 'Added character: Roger', time: '2h ago', icon: Users },
  ];

  // Generate sequences from project shots
  const sequences = useMemo<SequenceData[]>(() => {
    if (!shots || shots.length === 0) {
      return [];
    }

    const sequenceMap: Record<string, LegacyAny[]> = {};
    shots.forEach(shot => {
      const seqId = (shot as LegacyAny).sequence_id || 'default';
      if (!sequenceMap[seqId]) {
        sequenceMap[seqId] = [];
      }
      sequenceMap[seqId].push(shot);
    });

    const sequenceArray: SequenceData[] = [];
    let order = 1;

    for (const sequenceId in sequenceMap) {
      const seqShots = sequenceMap[sequenceId];
      const totalDuration = seqShots.reduce((sum, shot) => sum + (shot.duration || 0), 0);
      const firstShot = seqShots[0];

      sequenceArray.push({
        id: sequenceId,
        name: `Sequence ${order}`,
        duration: totalDuration,
        shots: seqShots.length,
        resume: firstShot?.description || `Sequence ${order} with ${seqShots.length} shot(s)`,
        order: order,
        metadata: firstShot?.metadata || {},
      });

      order++;
    }

    return sequenceArray.sort((a, b) => a.order - b.order);
  }, [shots, forceUpdate]);

  // Get film type for current story
  const currentFilmType = useMemo(() => {
    if (stories.length === 0) return null;
    return detectFilmType(stories[0]);
  }, [stories]);

  // Get film configuration
  const filmConfig = useMemo(() => {
    if (!currentFilmType) return null;
    return getFilmTypeConfig(currentFilmType);
  }, [currentFilmType]);

  return (
    <div className="project-dashboard-new">
      {/* Header */}
      <div className="dashboard-header">
        <div className="quick-access-compact">
          <button className="quick-btn quick-btn-primary" title="Configuration du projet">
            <span>Project Setup</span>
            <Settings className="w-4 h-4" />
          </button>
          <button className="quick-btn" title="Voir les scènes">
            <span>Scenes ({shots?.length || 0})</span>
            <Film className="w-4 h-4" />
          </button>
          <button className="quick-btn" title="Voir les personnages">
            <span>Characters ({characters?.length || 0})</span>
            <Users className="w-4 h-4" />
          </button>
        </div>

        {/* Pipeline Status */}
        <div className="pipeline-status-compact">
          {/* Open Folder Button */}
          {typeof (project?.path || project?.metadata?.path) === 'string' && (
            <button 
              className="quick-btn glass-panel border-white/5 hover:border-primary/50 group" 
              onClick={() => {
                const path = (project?.path || project?.metadata?.path) as string;
                if (path && window.electronAPI?.app?.openFolder) {
                  window.electronAPI.app.openFolder(path);
                }
              }}
              style={{ marginRight: '10px' }}
              title="Open Project Folder in Explorer"
            >
              <Settings className="w-4 h-4 text-white/40 group-hover:text-primary transition-colors" />
              <span>Folder</span>
            </button>
          )}
          <div className="status-item">
            <Film className="w-4 h-4" />
            <span>Sequences: {sequences.length}</span>
          </div>
          <div className="status-item">
            <FileText className="w-4 h-4" />
            <span>Shots: {shots?.length || 0}</span>
          </div>
          <div className="status-item status-ready">
            <CheckCircle2 className="w-4 h-4" />
            <span>Ready</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="dashboard-main">
        <div className="dashboard-left">
          {/* Film Type Info Banner */}
          {filmConfig && (
            <div className="film-type-banner">
              <Clapperboard className="w-5 h-5" />
              <div>
                <strong>{filmConfig.name}</strong>
                <p>{filmConfig.description}</p>
              </div>
            </div>
          )}

          {/* Stories Section */}
          <div className="stories-section">
            <div className="section-header">
              <h3>Stories</h3>
              <button className="btn-create-story" title="Créer une nouvelle histoire">
                <BookOpen className="w-4 h-4" />
                <span>Create New Story</span>
              </button>
            </div>
          </div>

          {/* Plan Sequences */}
          <div className="plan-sequences-section">
            <div className="section-header">
              <h3>Plan Sequences</h3>
              <div className="sequence-controls">
                <button
                  className="btn-sequence-control sync"
                  disabled={isSyncing || sequences.length === 0}
                  title="Synchroniser les séquences"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Sync</span>
                </button>
                <button
                  className="btn-sequence-control refresh"
                  disabled={isLoadingSequences}
                  title="Rafraîchir les séquences"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Refresh</span>
                </button>
                <button className="btn-sequence-control new-plan" title="Créer un nouveau plan">
                  <FileText className="w-4 h-4" />
                  <span>New Plan</span>
                </button>
                <button className="btn-sequence-control add" title="Ajouter une séquence">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="sequences-grid">
              {sequences.length === 0 ? (
                <div className="no-sequences-message">
                  <p>No sequences yet. Click + to add your first sequence.</p>
                </div>
              ) : (
                sequences.map((seq) => (
                  <div key={seq.id} className="sequence-card">
                    <div className="sequence-header">
                      <h4>{seq.name}</h4>
                      <div className="sequence-actions">
                        <button 
                          title="Edit"
                          onClick={() => {
                            setShowSequenceEditor(true);
                            onOpenEditor(seq.id);
                          }}
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="sequence-info">
                      <span>Order: #{seq.order}</span>
                      <span>Duration: {seq.duration}s</span>
                      <span>Shots: {seq.shots}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="dashboard-right">
          <div className="recent-activity-section">
            <h3>Recent Activity</h3>
            <div className="activity-list">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="activity-item">
                  <activity.icon className="activity-icon" />
                  <div className="activity-content">
                    <p className="activity-action">{activity.action}</p>
                    <span className="activity-time">{activity.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
