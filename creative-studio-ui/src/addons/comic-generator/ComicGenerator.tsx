import React, { useState, useCallback } from 'react';
import type {
  ComicStyleType,
  ComicPage,
  ComicPanel,
  NarrativeBeatType,
} from './types';
import {
  COMIC_STYLES,
  NARRATIVE_BEAT_COLORS,
  NARRATIVE_BEAT_LABELS,
} from './types';
import comicGeneratorService from './comicGeneratorService';
import './ComicGenerator.css';

// ============================================================================
// Sub-components
// ============================================================================

interface StyleSelectorProps {
  selected: ComicStyleType;
  onChange: (style: ComicStyleType) => void;
}

const StyleSelector: React.FC<StyleSelectorProps> = ({ selected, onChange }) => (
  <div className="comic-style-selector">
    {Object.entries(COMIC_STYLES).map(([key, meta]) => (
      <button
        key={key}
        className={`comic-style-card ${selected === key ? 'selected' : ''}`}
        onClick={() => onChange(key as ComicStyleType)}
        title={meta.layoutHint}
      >
        <span className="comic-style-card__icon">{meta.icon}</span>
        <span className="comic-style-card__label">{meta.label}</span>
        <span className="comic-style-card__desc">{meta.description}</span>
      </button>
    ))}
  </div>
);


interface PanelCardProps {
  panel: ComicPanel;
  selected: boolean;
  onClick: () => void;
  onRegenerate: () => void;
  isRegenerating: boolean;
}

const PanelCard: React.FC<PanelCardProps> = ({
  panel,
  selected,
  onClick,
  onRegenerate,
  isRegenerating,
}) => {
  const beatColor = NARRATIVE_BEAT_COLORS[panel.narrative_beat] || '#888';

  return (
    <div
      className={`comic-panel-card ${selected ? 'selected' : ''}`}
      onClick={onClick}
    >
      {/* Image or SVG placeholder */}
      {panel.generated_image_path ? (
        panel.generated_image_path.endsWith('.svg') ? (
          <div className="comic-panel-image--svg">
            <iframe
              src={comicGeneratorService.getPanelImageUrl(panel.generated_image_path)}
              title={`Panel ${panel.panel_index + 1}`}
              style={{ width: '100%', aspectRatio: '1', border: 'none', display: 'block' }}
              sandbox="allow-same-origin"
            />
          </div>
        ) : (
          <img
            className="comic-panel-image"
            src={comicGeneratorService.getPanelImageUrl(panel.generated_image_path)}
            alt={`Panel ${panel.panel_index + 1}`}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        )
      ) : (
        <div className="comic-panel-placeholder">
          <span style={{ fontSize: '2rem' }}>🎨</span>
          <span>Panel {panel.panel_index + 1}</span>
        </div>
      )}

      {/* Info section */}
      <div className="comic-panel-info">
        <div
          className="comic-panel-beat"
          style={{ color: beatColor }}
        >
          ⚡ {NARRATIVE_BEAT_LABELS[panel.narrative_beat]}
        </div>

        <div className="comic-panel-location">
          📍 {panel.location}
        </div>

        {/* Dialogue */}
        {panel.dialogue.length > 0 && (
          <div className="comic-panel-dialogue">
            {panel.dialogue.slice(0, 2).map((line, i) => (
              <div
                key={i}
                className="comic-panel-dialogue-line"
                style={{ borderColor: beatColor + '80' }}
              >
                <div className="comic-panel-dialogue-speaker">{line.character}</div>
                <div className="comic-panel-dialogue-text">"{line.text}"</div>
              </div>
            ))}
          </div>
        )}

        {/* Regenerate button */}
        <button
          className={`btn-comic btn-comic--secondary ${isRegenerating ? 'btn-comic--spinning' : ''}`}
          style={{ marginTop: '0.5rem', fontSize: '0.7rem', padding: '0.35rem 0.7rem', width: '100%' }}
          onClick={(e) => { e.stopPropagation(); onRegenerate(); }}
          disabled={isRegenerating}
          title="Regenerate this panel with a new seed"
        >
          <span className="btn-icon">🔄</span>
          {isRegenerating ? 'Generating…' : 'Regen'}
        </button>
      </div>
    </div>
  );
};


interface PageViewerProps {
  page: ComicPage;
  onRegen: (panelIndex: number) => void;
  regenIndex: number | null;
}

const PageViewer: React.FC<PageViewerProps> = ({ page, onRegen, regenIndex }) => {
  const [selectedPanel, setSelectedPanel] = useState<number | null>(null);

  const gridClass =
    page.style === 'webtoon'
      ? 'comic-panels-grid--1x4'
      : page.panels.length === 3
      ? 'comic-panels-grid--3col'
      : 'comic-panels-grid--2x2';

  return (
    <div className="comic-page-viewer">
      {/* Page header */}
      <div className="comic-page-header">
        <div className="comic-page-meta">
          <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>
            Page {page.page_number}
          </span>
          <span className="comic-badge comic-badge--style">
            {COMIC_STYLES[page.style]?.icon} {COMIC_STYLES[page.style]?.label}
          </span>
          <span
            className="comic-badge comic-badge--beat"
            style={{
              color: NARRATIVE_BEAT_COLORS[page.emotional_tone as NarrativeBeatType] || '#888',
              borderColor: (NARRATIVE_BEAT_COLORS[page.emotional_tone as NarrativeBeatType] || '#888') + '60',
              background: (NARRATIVE_BEAT_COLORS[page.emotional_tone as NarrativeBeatType] || '#888') + '15',
            }}
          >
            {page.emotional_tone}
          </span>
        </div>
      </div>

      {/* Panel grid */}
      <div className={`comic-panels-grid ${gridClass}`}>
        {page.panels.map((panel) => (
          <PanelCard
            key={panel.id}
            panel={panel}
            selected={selectedPanel === panel.panel_index}
            onClick={() => setSelectedPanel(
              selectedPanel === panel.panel_index ? null : panel.panel_index
            )}
            onRegenerate={() => onRegen(panel.panel_index)}
            isRegenerating={regenIndex === panel.panel_index}
          />
        ))}
      </div>

      {/* Summary */}
      <div className="comic-page-summary">
        <span className="comic-page-summary__icon">📖</span>
        <span>{page.narrative_summary}</span>
      </div>

      {/* Selected panel detail */}
      {selectedPanel !== null && page.panels[selectedPanel] && (
        <PanelDetail panel={page.panels[selectedPanel]} />
      )}
    </div>
  );
};


interface PanelDetailProps {
  panel: ComicPanel;
}

const PanelDetail: React.FC<PanelDetailProps> = ({ panel }) => {
  const beatColor = NARRATIVE_BEAT_COLORS[panel.narrative_beat] || '#888';

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '10px',
      padding: '1rem',
    }}>
      <div className="comic-section-header">
        <div className="comic-section-title">
          🔍 Panel {panel.panel_index + 1} Details
        </div>
        <span style={{ color: beatColor, fontWeight: 700, fontSize: '0.75rem' }}>
          {NARRATIVE_BEAT_LABELS[panel.narrative_beat]}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.8rem' }}>
        <div>
          <div style={{ color: '#9e9e9e', marginBottom: '0.25rem', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Characters</div>
          <div>{panel.characters.join(', ') || 'None'}</div>
        </div>
        <div>
          <div style={{ color: '#9e9e9e', marginBottom: '0.25rem', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Location</div>
          <div>{panel.location}</div>
        </div>
      </div>

      <div style={{ marginTop: '0.75rem', fontSize: '0.8rem' }}>
        <div style={{ color: '#9e9e9e', marginBottom: '0.25rem', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Visual Description</div>
        <div style={{ color: '#b39ddb', fontStyle: 'italic' }}>{panel.visual_cue}</div>
      </div>

      <div style={{ marginTop: '0.75rem', fontSize: '0.8rem' }}>
        <div style={{ color: '#9e9e9e', marginBottom: '0.25rem', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Image Prompt</div>
        <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '6px', padding: '0.5rem', fontFamily: 'monospace', fontSize: '0.72rem', color: '#80cbc4' }}>
          {panel.image_prompt}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

interface ComicGeneratorProps {
  projectId: string;
  storyContext?: string;
  characters?: Record<string, unknown>[];
  locations?: Record<string, unknown>[];
  objects?: Record<string, unknown>[];
  onPageGenerated?: (page: ComicPage) => void;
}

interface LocalState {
  currentPage: ComicPage | null;
  isGenerating: boolean;
  error: string | null;
  selectedStyle: ComicStyleType;
  panelsCount: number;
  generateImages: boolean;
  narrativeDirection: string;
  storyContextOverride: string;
  regenIndex: number | null;
  isExporting: boolean;
  lastExportPath: string | null;
  progression: number;
  totalPages: number;
}

const ComicGenerator: React.FC<ComicGeneratorProps> = ({
  projectId,
  storyContext = '',
  characters = [],
  locations = [],
  objects = [],
  onPageGenerated,
}) => {
  const [state, setState] = useState<LocalState>({
    currentPage: null,
    isGenerating: false,
    error: null,
    selectedStyle: 'manga',
    panelsCount: 4,
    generateImages: false,
    narrativeDirection: '',
    storyContextOverride: storyContext,
    regenIndex: null,
    isExporting: false,
    lastExportPath: null,
    progression: 0,
    totalPages: 0,
  });

  const update = useCallback((patch: Partial<LocalState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  // -- Generate Next Page --
  const handleGenerate = useCallback(async () => {
    update({ isGenerating: true, error: null });
    try {
      const result = await comicGeneratorService.generatePage({
        project_id: projectId,
        story_context: state.storyContextOverride || storyContext,
        characters,
        locations,
        objects,
        style: state.selectedStyle,
        generate_images: state.generateImages,
        panels_count: state.panelsCount,
        narrative_direction: state.narrativeDirection || undefined,
      });

      if (result.success && result.page) {
        update({
          currentPage: result.page,
          progression: Math.min(1, state.progression + 0.05),
          totalPages: state.totalPages + 1,
        });
        onPageGenerated?.(result.page);
      }
    } catch (err) {
      update({ error: err instanceof Error ? err.message : 'Generation failed' });
    } finally {
      update({ isGenerating: false });
    }
  }, [state, projectId, storyContext, characters, locations, objects, onPageGenerated, update]);

  // -- Regenerate Panel --
  const handleRegenPanel = useCallback(async (panelIndex: number) => {
    if (!state.currentPage) return;
    update({ regenIndex: panelIndex });
    try {
      const result = await comicGeneratorService.regeneratePanel({
        project_id: projectId,
        page_id: state.currentPage.id,
        chapter_id: state.currentPage.chapter_id,
        page_number: state.currentPage.page_number,
        panel_index: panelIndex,
        generate_image: state.generateImages,
      });
      if (result.success && result.new_image_path && state.currentPage) {
        const updatedPage = { ...state.currentPage };
        updatedPage.panels = updatedPage.panels.map((p) =>
          p.panel_index === panelIndex
            ? { ...p, generated_image_path: result.new_image_path! }
            : p
        );
        update({ currentPage: updatedPage });
      }
    } catch (err) {
      console.error('Regen failed:', err);
    } finally {
      update({ regenIndex: null });
    }
  }, [state.currentPage, state.generateImages, projectId, update]);

  // -- Export --
  const handleExport = useCallback(async (format: 'json' | 'pdf') => {
    update({ isExporting: true });
    try {
      const result = await comicGeneratorService.exportComic({
        project_id: projectId,
        format,
      });
      if (result.success) {
        update({ lastExportPath: result.output_path });
      }
    } catch (err) {
      update({ error: err instanceof Error ? err.message : 'Export failed' });
    } finally {
      update({ isExporting: false });
    }
  }, [projectId, update]);

  const styleInfo = COMIC_STYLES[state.selectedStyle];

  return (
    <div className="comic-generator">
      {/* ── Header ── */}
      <div className="comic-generator__header">
        <div className="comic-generator__title">
          <span className="icon">🎨</span>
          <div>
            <h2>Comic Generator</h2>
            <p className="comic-generator__subtitle">
              Génération de planches BD alimentée par l'IA — StoryCore Addon
            </p>
          </div>
        </div>

        {state.totalPages > 0 && (
          <div className="comic-progression">
            <span className="comic-progression__label">
              {state.totalPages} page{state.totalPages > 1 ? 's' : ''}
            </span>
            <div className="comic-progression__bar">
              <div
                className="comic-progression__fill"
                style={{ width: `${Math.round(state.progression * 100)}%` }}
              />
            </div>
            <span className="comic-progression__label">
              {Math.round(state.progression * 100)}%
            </span>
          </div>
        )}
      </div>

      {/* ── Style Selector ── */}
      <div>
        <div className="comic-section-header">
          <div className="comic-section-title">🎭 Visual Style</div>
          <span style={{ fontSize: '0.75rem', color: '#9e9e9e' }}>
            {styleInfo.icon} {styleInfo.label} — {styleInfo.panelRange[0]}–{styleInfo.panelRange[1]} panels/page
          </span>
        </div>
        <StyleSelector
          selected={state.selectedStyle}
          onChange={(s) => update({ selectedStyle: s })}
        />
      </div>

      {/* ── Controls ── */}
      <div className="comic-controls">
        <div className="comic-section-title" style={{ marginBottom: '0.75rem' }}>
          ⚙️ Generation Settings
        </div>

        <div className="comic-controls__row">
          <div className="comic-controls__field" style={{ flex: 2 }}>
            <label className="comic-controls__label">Story Context</label>
            <textarea
              className="comic-controls__input comic-controls__textarea"
              value={state.storyContextOverride}
              onChange={(e) => update({ storyContextOverride: e.target.value })}
              placeholder="Describe the current scene or story arc being adapted…"
            />
          </div>

          <div className="comic-controls__field">
            <label className="comic-controls__label">Narrative Direction</label>
            <select
              className="comic-controls__select"
              value={state.narrativeDirection}
              onChange={(e) => update({ narrativeDirection: e.target.value })}
            >
              <option value="">Auto (AI decides)</option>
              <option value="setup">Setup</option>
              <option value="tension">Tension</option>
              <option value="revelation">Révélation</option>
              <option value="climax">Climax</option>
              <option value="resolution">Résolution</option>
            </select>
          </div>
        </div>

        <div className="comic-controls__row">
          <div className="comic-controls__field">
            <label className="comic-controls__label">Panels per page</label>
            <input
              type="number"
              className="comic-controls__input"
              min={styleInfo.panelRange[0]}
              max={styleInfo.panelRange[1]}
              value={state.panelsCount}
              onChange={(e) => update({ panelsCount: parseInt(e.target.value) || 4 })}
            />
          </div>

          <div className="comic-controls__field" style={{ justifyContent: 'flex-end' }}>
            <label className="comic-controls__label">Image Generation</label>
            <div className="comic-controls__checkbox-row">
              <input
                type="checkbox"
                id="comicGenImages"
                checked={state.generateImages}
                onChange={(e) => update({ generateImages: e.target.checked })}
              />
              <label htmlFor="comicGenImages" style={{ fontSize: '0.85rem', cursor: 'pointer' }}>
                Generate via ComfyUI
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* ── Error ── */}
      {state.error && (
        <div className="comic-error">
          <span className="comic-error__icon">❌</span>
          <div>
            <div className="comic-error__title">Generation Error</div>
            <div className="comic-error__message">{state.error}</div>
          </div>
        </div>
      )}

      {/* ── Action buttons ── */}
      <div className="comic-actions">
        <button
          className={`btn-comic btn-comic--primary ${state.isGenerating ? 'btn-comic--spinning' : ''}`}
          onClick={handleGenerate}
          disabled={state.isGenerating || !projectId}
          id="comic-generate-btn"
        >
          <span className="btn-icon">✨</span>
          {state.isGenerating ? 'Generating…' : 'Generate Next Page'}
        </button>

        {state.totalPages > 0 && (
          <>
            <button
              className={`btn-comic btn-comic--export ${state.isExporting ? 'btn-comic--spinning' : ''}`}
              onClick={() => handleExport('json')}
              disabled={state.isExporting}
              id="comic-export-json-btn"
            >
              <span className="btn-icon">📥</span>
              Export JSON
            </button>

            <button
              className={`btn-comic btn-comic--export ${state.isExporting ? 'btn-comic--spinning' : ''}`}
              onClick={() => handleExport('pdf')}
              disabled={state.isExporting}
              id="comic-export-pdf-btn"
            >
              <span className="btn-icon">📄</span>
              Export PDF
            </button>
          </>
        )}
      </div>

      {/* ── Export success ── */}
      {state.lastExportPath && (
        <div style={{
          background: 'rgba(0, 200, 83, 0.1)',
          border: '1px solid rgba(0, 200, 83, 0.25)',
          borderRadius: '8px',
          padding: '0.75rem 1rem',
          fontSize: '0.8rem',
          color: '#69f0ae',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          ✅ Exported to: <code style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{state.lastExportPath}</code>
        </div>
      )}

      {/* ── Current Page ── */}
      {state.currentPage ? (
        <div>
          <div className="comic-section-header">
            <div className="comic-section-title">📋 Current Page</div>
          </div>
          <PageViewer
            page={state.currentPage}
            onRegen={handleRegenPanel}
            regenIndex={state.regenIndex}
          />
        </div>
      ) : !state.isGenerating && (
        <div className="comic-empty">
          <span className="comic-empty__icon">🎨</span>
          <div className="comic-empty__title">No pages generated yet</div>
          <div className="comic-empty__desc">
            Configure the style and settings above, then click <strong>Generate Next Page</strong> to
            create your first comic page based on the project's narrative data.
          </div>
        </div>
      )}

      {/* ── Loading ── */}
      {state.isGenerating && (
        <div className="comic-empty">
          <span className="comic-empty__icon" style={{ animation: 'spin 1.5s linear infinite', display: 'block' }}>🌀</span>
          <div className="comic-empty__title">Generating…</div>
          <div className="comic-empty__desc">
            Adapting the narrative, writing panel scripts, and drafting visual cues…
          </div>
        </div>
      )}
    </div>
  );
};

export default ComicGenerator;
