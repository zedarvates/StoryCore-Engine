import React, { useState, useCallback, useEffect } from 'react';
import type { RecapStyleType, TTSProviderType, RecapTimeline } from './types';
import { RECAP_STYLES, TTS_PROVIDERS } from './types';
import recapEngineService from './recapEngineService';
import './RecapEngine.css';

// ============================================================================
// Sub-components
// ============================================================================

// ── Style Selector ──────────────────────────────────────────────────────────

const StyleSelector: React.FC<{
  selected: RecapStyleType;
  onChange: (s: RecapStyleType) => void;
}> = ({ selected, onChange }) => (
  <div className="recap-style-grid">
    {(Object.entries(RECAP_STYLES) as [RecapStyleType, typeof RECAP_STYLES[RecapStyleType]][]).map(([key, meta]) => (
      <button
        key={key}
        className={`recap-style-card ${selected === key ? 'selected' : ''}`}
        style={{ '--card-accent': meta.color } as React.CSSProperties}
        onClick={() => onChange(key)}
        title={meta.description}
        id={`recap-style-${key}`}
      >
        <span className="recap-style-card__icon">{meta.icon}</span>
        <span className="recap-style-card__label">{meta.label}</span>
        <span className="recap-style-card__desc">{meta.description}</span>
      </button>
    ))}
  </div>
);

// ── TTS Provider Selector ───────────────────────────────────────────────────

const TTSSelector: React.FC<{
  selected: TTSProviderType;
  onChange: (p: TTSProviderType) => void;
}> = ({ selected, onChange }) => (
  <div className="recap-tts-grid">
    {(Object.entries(TTS_PROVIDERS) as [TTSProviderType, typeof TTS_PROVIDERS[TTSProviderType]][]).map(([key, meta]) => (
      <button
        key={key}
        className={`recap-tts-card ${selected === key ? 'selected' : ''}`}
        onClick={() => onChange(key)}
        title={meta.description}
        id={`recap-tts-${key}`}
      >
        <div className="recap-tts-card__label">{meta.label}</div>
        <div className="recap-tts-card__meta">
          <span className={`recap-quality-badge recap-quality-badge--${meta.quality}`}>
            {meta.quality}
          </span>
          {meta.offline && (
            <span className="recap-offline-badge">offline</span>
          )}
        </div>
      </button>
    ))}
  </div>
);

// ── Timeline Card ────────────────────────────────────────────────────────────

const TimelineCard: React.FC<{
  timeline: RecapTimeline;
  isActive: boolean;
  onSelect: () => void;
  onRender: () => void;
  onExport: () => void;
  isRendering: boolean;
  isExporting: boolean;
}> = ({ timeline, isActive, onSelect, onRender, onExport, isRendering, isExporting }) => {
  const durationMin = Math.round(timeline.actual_duration / 60 * 10) / 10;
  const hasVideo = !!timeline.final_video_path;

  return (
    <div
      className={`recap-timeline-card ${isActive ? 'active' : ''}`}
      onClick={onSelect}
    >
      <div style={{ fontSize: '1.5rem' }}>
        {RECAP_STYLES[(timeline.style as RecapStyleType)]?.icon || '🎬'}
      </div>
      <div className="recap-timeline-card__info">
        <div className="recap-timeline-card__title">{timeline.title}</div>
        <div className="recap-timeline-card__meta">
          {timeline.scenes_count} scènes · ~{durationMin} min
          {hasVideo && ' · ✅ Rendue'}
        </div>
        {timeline.render_progress > 0 && timeline.render_progress < 1 && (
          <div className="recap-progress" style={{ marginTop: '0.4rem' }}>
            <div className="recap-progress__bar">
              <div
                className="recap-progress__fill recap-progress__fill--gold"
                style={{ width: `${Math.round(timeline.render_progress * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>
      <div className="recap-timeline-card__actions">
        {!hasVideo && (
          <button
            className={`btn-recap btn-recap--render ${isRendering ? 'btn-recap--spinning' : ''}`}
            onClick={(e) => { e.stopPropagation(); onRender(); }}
            disabled={isRendering || isExporting}
            title="Lancer le rendu vidéo"
            id={`recap-render-${timeline.timeline_id.slice(0, 8)}`}
          >
            <span className="btn-icon">{isRendering ? '⏳' : '🎥'}</span>
            {isRendering ? 'Rendu…' : 'Render'}
          </button>
        )}
        {hasVideo && (
          <button
            className={`btn-recap btn-recap--export ${isExporting ? 'btn-recap--spinning' : ''}`}
            onClick={(e) => { e.stopPropagation(); onExport(); }}
            disabled={isExporting}
            title="Exporter la vidéo finale"
            id={`recap-export-${timeline.timeline_id.slice(0, 8)}`}
          >
            <span className="btn-icon">{isExporting ? '⏳' : '📦'}</span>
            {isExporting ? 'Export…' : 'Export'}
          </button>
        )}
      </div>
    </div>
  );
};

// ── Character Style Pills ─────────────────────────────────────────────────

const CharacterStylePills: React.FC<{
  styles: Record<string, { name: string; frame_color: string; narrator_role: string; voice_id: string }>;
}> = ({ styles }) => (
  <div className="recap-char-styles">
    {Object.entries(styles).map(([id, cs]) => (
      <div key={id} className="recap-char-pill">
        <div
          className="recap-char-pill__dot"
          style={{ backgroundColor: cs.frame_color, color: cs.frame_color }}
        />
        <span>{cs.name}</span>
        <span style={{ fontSize: '0.6rem', opacity: 0.6 }}>{cs.narrator_role}</span>
      </div>
    ))}
  </div>
);

// ── Video Player ──────────────────────────────────────────────────────────

const VideoPlayer: React.FC<{
  projectId: string;
  timelineId: string;
}> = ({ projectId, timelineId }) => {
  const url = recapEngineService.getVideoUrl(projectId, timelineId);
  return (
    <div className="recap-video-container">
      <video controls src={url} id={`recap-video-${timelineId.slice(0, 8)}`}>
        Votre navigateur ne supporte pas la vidéo HTML5.
      </video>
    </div>
  );
};

// ── Loading Dots ─────────────────────────────────────────────────────────

const LoadingDots: React.FC<{ label?: string }> = ({ label = 'Chargement…' }) => (
  <div className="recap-loading">
    <div className="recap-loading__dots">
      <div className="recap-loading__dot" />
      <div className="recap-loading__dot" />
      <div className="recap-loading__dot" />
    </div>
    <span style={{ fontSize: '0.82rem', color: 'var(--recap-text-muted)' }}>{label}</span>
  </div>
);

// ============================================================================
// Main Component
// ============================================================================

interface RecapEngineProps {
  projectId: string;
  storyContext?: string;
  characters?: Record<string, unknown>[];
  comicJsonPath?: string;  // Chemin vers le JSON BD exporté
  chapterId?: string;       // Chapitre pour génération depuis dossiers
  onVideoReady?: (videoPath: string) => void;
}

type TabType = 'generate' | 'timelines' | 'preview';

interface LocalState {
  // Config génération
  selectedStyle: RecapStyleType;
  selectedTTS: TTSProviderType;
  storyContextOverride: string;
  comicPath: string;
  language: string;

  // État
  activeTab: TabType;
  isGenerating: boolean;
  isRendering: boolean;
  isExporting: boolean;
  isLoading: boolean;
  error: string | null;
  successMsg: string | null;

  // Données
  timelines: RecapTimeline[];
  activeTimelineId: string | null;
  ffmpegAvailable: boolean;
  activeTimelineDetail: (RecapTimeline & { scenes?: unknown[]; character_styles?: Record<string, { name: string; frame_color: string; narrator_role: string; voice_id: string }> }) | null;
}

const RecapEngine: React.FC<RecapEngineProps> = ({
  projectId,
  storyContext = '',
  characters = [],
  comicJsonPath = '',
  chapterId,
  onVideoReady,
}) => {
  const [state, setState] = useState<LocalState>({
    selectedStyle: 'manga_recap',
    selectedTTS: 'gtts',
    storyContextOverride: storyContext,
    comicPath: comicJsonPath,
    language: 'fr',
    activeTab: 'generate',
    isGenerating: false,
    isRendering: false,
    isExporting: false,
    isLoading: true,
    error: null,
    successMsg: null,
    timelines: [],
    activeTimelineId: null,
    ffmpegAvailable: false,
    activeTimelineDetail: null,
  });

  const update = useCallback((patch: Partial<LocalState>) => {
    setState(prev => ({ ...prev, ...patch }));
  }, []);

  // ── Init / Load State ──────────────────────────────────────────────────

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        const [status, projectState] = await Promise.all([
          recapEngineService.getStatus(),
          recapEngineService.getProjectState(projectId),
        ]);

        if (!mounted) return;
        update({
          ffmpegAvailable: status.ffmpeg_available,
          timelines: projectState.timelines || [],
          activeTimelineId: projectState.active_timeline_id || null,
          isLoading: false,
          activeTab: projectState.timelines?.length > 0 ? 'timelines' : 'generate',
        });
      } catch {
        if (mounted) update({ isLoading: false });
      }
    };
    init();
    return () => { mounted = false; };
  }, [projectId, update]);

  // ── Generate Recap ────────────────────────────────────────────────────

  const handleGenerate = useCallback(async () => {
    update({ isGenerating: true, error: null, successMsg: null });
    try {
      let result;

      if (state.comicPath) {
        result = await recapEngineService.generateFromComic({
          project_id: projectId,
          comic_json_path: state.comicPath,
          story_context: state.storyContextOverride || storyContext,
          characters,
          style: state.selectedStyle,
          tts_provider: state.selectedTTS,
        });
      } else if (chapterId) {
        result = await recapEngineService.generateFromPages({
          project_id: projectId,
          chapter_id: chapterId,
          story_context: state.storyContextOverride || storyContext,
          characters,
          style: state.selectedStyle,
        });
      } else {
        throw new Error('Aucune source BD configurée. Fournissez un comic_json_path ou chapter_id.');
      }

      if (result.timeline_id) {
        // Recharger la liste de timelines
        const projectState = await recapEngineService.getProjectState(projectId);
        update({
          timelines: projectState.timelines || [],
          activeTimelineId: result.timeline_id,
          activeTab: 'timelines',
          successMsg: `✅ Recap généré ! ${result.scenes_count} scènes · ~${result.estimated_duration_min} min`,
        });
      }
    } catch (err) {
      update({ error: err instanceof Error ? err.message : 'Erreur de génération' });
    } finally {
      update({ isGenerating: false });
    }
  }, [state, projectId, storyContext, characters, chapterId, update]);

  // ── Render Video ──────────────────────────────────────────────────────

  const handleRender = useCallback(async (timelineId: string) => {
    update({ isRendering: true, error: null, successMsg: null });
    try {
      const result = await recapEngineService.renderVideo({
        project_id: projectId,
        timeline_id: timelineId,
      });

      if (result.success) {
        const msg = result.video_path
          ? `✅ Vidéo rendue ! (${result.file_size_mb?.toFixed(1)} MB · ${result.render_time?.toFixed(0)}s)`
          : `⏳ Rendu lancé en arrière-plan…`;

        // Recharger les timelines
        const projectState = await recapEngineService.getProjectState(projectId);
        update({
          timelines: projectState.timelines || [],
          successMsg: msg,
        });

        if (result.video_path) {
          onVideoReady?.(result.video_path);
        }
      }
    } catch (err) {
      update({ error: err instanceof Error ? err.message : 'Erreur de rendu' });
    } finally {
      update({ isRendering: false });
    }
  }, [projectId, update, onVideoReady]);

  // ── Export ────────────────────────────────────────────────────────────

  const handleExport = useCallback(async (timelineId: string) => {
    update({ isExporting: true, error: null, successMsg: null });
    try {
      const result = await recapEngineService.exportVideo({
        project_id: projectId,
        timeline_id: timelineId,
        include_subtitles: true,
      });

      if (result.success) {
        update({
          successMsg: `📦 Export réussi !`,
          activeTab: 'preview',
        });
      }
    } catch (err) {
      update({ error: err instanceof Error ? err.message : 'Erreur export' });
    } finally {
      update({ isExporting: false });
    }
  }, [projectId, update]);

  // ── Select Timeline Detail ─────────────────────────────────────────────

  const handleSelectTimeline = useCallback(async (timelineId: string) => {
    update({ activeTimelineId: timelineId, activeTimelineDetail: null });
    try {
      const detail = await recapEngineService.getTimeline(projectId, timelineId);
      update({ activeTimelineDetail: detail });
    } catch { /* ignore */ }
  }, [projectId, update]);

  // ──────────────────────────────────────────────────────────────────────

  const activeTimeline = state.timelines.find(t => t.timeline_id === state.activeTimelineId);

  return (
    <div className="recap-engine">
      {/* ── Header ── */}
      <div className="recap-header">
        <div className="recap-title">
          <span className="recap-title__icon">🎬</span>
          <div>
            <h2>Recap Engine</h2>
            <p className="recap-title__sub">
              BD → Voix off → Animation → Vidéo YouTube — StoryCore Addon
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div className={`recap-status-badge ${state.ffmpegAvailable ? 'recap-status-badge--ok' : 'recap-status-badge--warn'}`}>
            <span>{state.ffmpegAvailable ? '✓' : '⚠️'}</span>
            ffmpeg {state.ffmpegAvailable ? 'OK' : 'Absent'}
          </div>
          <div className="recap-status-badge recap-status-badge--ok">
            ✓ TTS Ready
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="recap-tabs">
        <button
          className={`recap-tab ${state.activeTab === 'generate' ? 'active' : ''}`}
          onClick={() => update({ activeTab: 'generate' })}
          id="recap-tab-generate"
        >
          ✨ Générer
        </button>
        <button
          className={`recap-tab ${state.activeTab === 'timelines' ? 'active' : ''}`}
          onClick={() => update({ activeTab: 'timelines' })}
          id="recap-tab-timelines"
        >
          📋 Timelines {state.timelines.length > 0 && `(${state.timelines.length})`}
        </button>
        <button
          className={`recap-tab ${state.activeTab === 'preview' ? 'active' : ''}`}
          onClick={() => update({ activeTab: 'preview' })}
          disabled={!activeTimeline?.final_video_path}
          id="recap-tab-preview"
        >
          ▶️ Prévisualiser
        </button>
      </div>

      {/* ── Error ── */}
      {state.error && (
        <div className="recap-error">
          <span>❌</span>
          <div>
            <div style={{ fontWeight: 700, marginBottom: '0.2rem' }}>Erreur</div>
            <div style={{ color: 'rgba(239,68,68,0.9)' }}>{state.error}</div>
          </div>
        </div>
      )}

      {/* ── Success ── */}
      {state.successMsg && (
        <div className="recap-success">
          <span>{state.successMsg}</span>
        </div>
      )}

      {/* ── Loading ── */}
      {state.isLoading && <LoadingDots label="Chargement du Recap Engine…" />}

      {/* ════════════════════════════════════════════════════════════
          TAB : GENERATE
      ════════════════════════════════════════════════════════════ */}

      {!state.isLoading && state.activeTab === 'generate' && (
        <>
          {/* Style visuel */}
          <div className="recap-section">
            <div className="recap-section__title">🎭 Style Visuel</div>
            <StyleSelector
              selected={state.selectedStyle}
              onChange={(s) => update({ selectedStyle: s })}
            />
          </div>

          {/* Paramètres */}
          <div className="recap-section">
            <div className="recap-section__title">⚙️ Paramètres</div>
            <div className="recap-form">
              <div className="recap-form__row">
                <div className="recap-field recap-field--full">
                  <label className="recap-label">Contexte narratif (voix off intro)</label>
                  <textarea
                    className="recap-textarea"
                    value={state.storyContextOverride}
                    onChange={(e) => update({ storyContextOverride: e.target.value })}
                    placeholder="Décris l'univers et l'histoire à recapper… Ex : Dans un Tokyo futuriste de 2087, Akira découvre qu'il est le dernier porteur du Gène Omega..."
                    id="recap-context-input"
                  />
                </div>
              </div>

              <div className="recap-form__row">
                <div className="recap-field">
                  <label className="recap-label">Source BD (chemin JSON exporté)</label>
                  <input
                    type="text"
                    className="recap-input"
                    value={state.comicPath}
                    onChange={(e) => update({ comicPath: e.target.value })}
                    placeholder="data/assets/comics/.../comic_export.json"
                    id="recap-comic-path-input"
                  />
                </div>
                <div className="recap-field">
                  <label className="recap-label">Langue TTS</label>
                  <select
                    className="recap-select"
                    value={state.language}
                    onChange={(e) => update({ language: e.target.value })}
                    id="recap-lang-select"
                  >
                    <option value="fr">Français</option>
                    <option value="en">English</option>
                    <option value="ja">日本語</option>
                    <option value="es">Español</option>
                    <option value="de">Deutsch</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* TTS Provider */}
          <div className="recap-section">
            <div className="recap-section__title">🎙️ Voix Off (TTS)</div>
            <TTSSelector
              selected={state.selectedTTS}
              onChange={(p) => update({ selectedTTS: p })}
            />
          </div>

          {/* ffmpeg warning */}
          {!state.ffmpegAvailable && (
            <div className="recap-error" style={{ fontSize: '0.8rem' }}>
              <span>⚠️</span>
              <div>
                <strong>ffmpeg introuvable.</strong> Installez ffmpeg pour le rendu vidéo.
                La génération du script et de l'audio fonctionnera sans ffmpeg,
                mais le rendu MP4 nécessite ffmpeg dans le PATH.
              </div>
            </div>
          )}

          {/* Action */}
          <div className="recap-actions">
            <button
              className={`btn-recap btn-recap--primary ${state.isGenerating ? 'btn-recap--spinning' : ''}`}
              onClick={handleGenerate}
              disabled={state.isGenerating || !projectId || (!state.comicPath && !chapterId)}
              id="recap-generate-btn"
            >
              <span className="btn-icon">✨</span>
              {state.isGenerating ? 'Génération…' : 'Générer le Recap'}
            </button>

            {!state.comicPath && !chapterId && (
              <span style={{ fontSize: '0.75rem', color: 'var(--recap-text-muted)' }}>
                Ajoutez un chemin vers le JSON de la BD ou configurez un chapter_id
              </span>
            )}
          </div>

          {state.isGenerating && (
            <div className="recap-section" style={{ alignItems: 'center', padding: '2rem' }}>
              <LoadingDots label="Construction du script narratif + génération TTS…" />
              <div style={{ fontSize: '0.75rem', color: 'var(--recap-text-muted)', textAlign: 'center' }}>
                Chaque panel devient une scène · Association voix par personnage · Calcul des timings
              </div>
            </div>
          )}
        </>
      )}

      {/* ════════════════════════════════════════════════════════════
          TAB : TIMELINES
      ════════════════════════════════════════════════════════════ */}

      {!state.isLoading && state.activeTab === 'timelines' && (
        <>
          {state.timelines.length === 0 ? (
            <div className="recap-empty">
              <span className="recap-empty__icon">🎬</span>
              <div className="recap-empty__title">Aucun recap généré</div>
              <div className="recap-empty__desc">
                Configurez la source BD dans l'onglet <strong>Générer</strong> et lancez
                la génération pour créer votre premier recap vidéo.
              </div>
            </div>
          ) : (
            <>
              <div className="recap-timeline-list">
                {state.timelines.map((tl) => (
                  <TimelineCard
                    key={tl.timeline_id}
                    timeline={tl}
                    isActive={state.activeTimelineId === tl.timeline_id}
                    onSelect={() => handleSelectTimeline(tl.timeline_id)}
                    onRender={() => handleRender(tl.timeline_id)}
                    onExport={() => handleExport(tl.timeline_id)}
                    isRendering={state.isRendering}
                    isExporting={state.isExporting}
                  />
                ))}
              </div>

              {/* Détails de la timeline sélectionnée */}
              {state.activeTimelineDetail && (
                <div className="recap-section">
                  <div className="recap-section__title">
                    📋 Scènes — {state.activeTimelineDetail.title}
                  </div>

                  {/* Character palette */}
                  {state.activeTimelineDetail.character_styles &&
                    Object.keys(state.activeTimelineDetail.character_styles).length > 0 && (
                    <>
                      <div
                        className="recap-section__title"
                        style={{ fontSize: '0.7rem', marginTop: '0.5rem' }}
                      >
                        🎨 Palette personnages
                      </div>
                      <CharacterStylePills styles={state.activeTimelineDetail.character_styles} />
                    </>
                  )}

                  {/* Scene list */}
                  <div
                    className="recap-section__title"
                    style={{ fontSize: '0.7rem', marginTop: '0.5rem' }}
                  >
                    🎬 Timeline des scènes
                  </div>
                  <div className="recap-scene-list">
                    {(state.activeTimelineDetail.scenes || []).map((scene: unknown, i: number) => {
                      const s = scene as {
                        scene_id: string;
                        page: number;
                        panel: number;
                        narration: string;
                        duration: number;
                        camera_move: string;
                        render_status: string;
                      };
                      return (
                        <div key={s.scene_id} className="recap-scene-row">
                          <div className="recap-scene-row__num">#{i + 1}</div>
                          <div className="recap-scene-row__text">
                            P{s.page}·{s.panel} — {s.narration}
                          </div>
                          <div className="recap-scene-row__duration">{s.duration.toFixed(1)}s</div>
                          <div className={`recap-scene-status recap-scene-status--${s.render_status}`}>
                            {s.render_status}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Progress */}
                  {activeTimeline && activeTimeline.render_progress > 0 && (
                    <div className="recap-progress">
                      <div className="recap-progress__label">
                        <span>Progression rendu</span>
                        <span>{Math.round(activeTimeline.render_progress * 100)}%</span>
                      </div>
                      <div className="recap-progress__bar">
                        <div
                          className={`recap-progress__fill ${
                            activeTimeline.render_progress >= 1
                              ? 'recap-progress__fill--green'
                              : 'recap-progress__fill--gold'
                          }`}
                          style={{ width: `${Math.round(activeTimeline.render_progress * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ════════════════════════════════════════════════════════════
          TAB : PREVIEW
      ════════════════════════════════════════════════════════════ */}

      {!state.isLoading && state.activeTab === 'preview' && (
        <>
          {activeTimeline?.final_video_path ? (
            <div className="recap-section">
              <div className="recap-section__title">▶️ Prévisualisation — {activeTimeline.title}</div>
              <VideoPlayer
                projectId={projectId}
                timelineId={activeTimeline.timeline_id}
              />
              <div style={{
                display: 'flex',
                gap: '0.5rem',
                fontSize: '0.78rem',
                color: 'var(--recap-text-muted)',
                flexWrap: 'wrap',
              }}>
                <span>🎬 {activeTimeline.scenes_count} scènes</span>
                <span>⏱ ~{Math.round(activeTimeline.actual_duration / 60 * 10) / 10} min</span>
                <span>📁 {activeTimeline.final_video_path}</span>
              </div>
            </div>
          ) : (
            <div className="recap-empty">
              <span className="recap-empty__icon">🎥</span>
              <div className="recap-empty__title">Aucune vidéo disponible</div>
              <div className="recap-empty__desc">
                Sélectionnez une timeline dans l'onglet <strong>Timelines</strong>
                et lancez le <strong>rendu vidéo</strong> pour pouvoir prévisualiser.
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default RecapEngine;
