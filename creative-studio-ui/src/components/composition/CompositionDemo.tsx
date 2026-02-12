/**
 * Composition Demo Component
 * 
 * Example usage of the Composition Nesting System demonstrating:
 * - Creating compositions and tracks
 * - Adding clips
 * - Nested compositions
 * - Copy/paste operations
 * - Undo/redo
 */

import React, { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  Composition,
  Track,
  Clip,
  CompositionId,
  ClipId,
  ClipboardState,
  SelectionState,
} from '../../services/animation/CompositionTypes';
import compositionStore from '../../stores/compositionStore';

// ============================================================================
// Demo Component
// ============================================================================

export const CompositionDemo: React.FC = () => {
  const [compositions, setCompositions] = useState<Composition[]>([]);
  const [activeComposition, setActiveComposition] = useState<Composition | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [clips, setClips] = useState<Clip[]>([]);
  const [clipboard, setClipboard] = useState<ClipboardState>({ items: [], hasContent: false });
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [playhead, setPlayhead] = useState(0);
  const [zoom, setZoom] = useState(50);

  // Subscribe to store changes
  useEffect(() => {
    const unsub = compositionStore.subscribe((state) => {
      setCompositions(Array.from(state.compositions.values()));
      setActiveComposition(state.compositions.get(state.activeCompositionId ?? '') ?? null);
      if (state.activeCompositionId) {
        const compositionTracks = compositionStore.getTracksForComposition(state.activeCompositionId);
        setTracks(compositionTracks);
        
        const allClips: Clip[] = [];
        compositionTracks.forEach(track => {
          const trackClips = compositionStore.getClipsForTrack(track.id);
          allClips.push(...trackClips);
        });
        setClips(allClips);
      }
      setClipboard(compositionStore.getClipboardState());
    });

    const unsubHistory = compositionStore.subscribeToHistory((undo, redo) => {
      setCanUndo(undo);
      setCanRedo(redo);
    });

    // Initialize with a root composition
    compositionStore.createComposition('Main Composition', 1920, 1080, 60000, 30);

    return () => {
      unsub();
      unsubHistory();
    };
  }, []);

  // ==========================================================================
  // Handlers
  // ==========================================================================

  const handleCreateComposition = useCallback(() => {
    const nested = compositionStore.createComposition(
      `Nested ${compositions.length + 1}`,
      1920,
      1080,
      30000,
      30,
      activeComposition?.id ?? undefined
    );
    compositionStore.setActiveComposition(nested.id);
  }, [compositions.length, activeComposition]);

  const handleAddTrack = useCallback((type: 'video' | 'audio' | 'text') => {
    if (!activeComposition) return;
    compositionStore.addTrack(activeComposition.id, `New ${type} track`, type);
  }, [activeComposition]);

  const handleAddClip = useCallback((type: 'video' | 'audio' | 'text' | 'image') => {
    if (!activeComposition || tracks.length === 0) return;
    const track = tracks[0];
    const startTime = playhead;
    compositionStore.addClip(track.id, `New ${type} clip`, startTime, 5000, type);
  }, [activeComposition, tracks, playhead]);

  const handleCopyClips = useCallback(() => {
    const selectedClips = clips.filter(c => c.isSelected);
    if (selectedClips.length > 0) {
      compositionStore.copyClips(selectedClips.map(c => c.id));
    }
  }, [clips]);

  const handlePasteClips = useCallback(() => {
    if (!activeComposition || tracks.length === 0) return;
    const track = tracks[0];
    compositionStore.pasteClips(track.id, playhead);
  }, [activeComposition, tracks, playhead]);

  const handleUndo = useCallback(() => {
    compositionStore.undo();
  }, []);

  const handleRedo = useCallback(() => {
    compositionStore.redo();
  }, []);

  const handleSelectClip = useCallback((clipId: string) => {
    compositionStore.selectClip(clipId as ClipId, false);
  }, []);

  const handleDeleteClip = useCallback((clipId: string) => {
    compositionStore.deleteClip(clipId as ClipId);
  }, []);

  const handleSetPlayhead = useCallback((time: number) => {
    compositionStore.setPlayhead(time);
    setPlayhead(time);
  }, []);

  const handleSetZoom = useCallback((newZoom: number) => {
    compositionStore.setZoom(newZoom);
    setZoom(newZoom);
  }, []);

  // ==========================================================================
  // Render Helpers
  // ==========================================================================

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Composition Nesting Demo</h2>
      
      {/* Toolbar */}
      <div style={styles.toolbar}>
        <div style={styles.group}>
          <button style={styles.button} onClick={handleCreateComposition}>
            + New Composition
          </button>
          <button style={styles.button} onClick={() => handleAddTrack('video')}>
            + Video Track
          </button>
          <button style={styles.button} onClick={() => handleAddTrack('audio')}>
            + Audio Track
          </button>
          <button style={styles.button} onClick={() => handleAddTrack('text')}>
            + Text Track
          </button>
        </div>

        <div style={styles.group}>
          <button
            style={styles.button}
            onClick={() => handleAddClip('video')}
            disabled={tracks.length === 0}
          >
            + Add Clip
          </button>
          <button 
            style={styles.button} 
            onClick={handleCopyClips}
            disabled={clips.filter(c => c.isSelected).length === 0}
          >
            Copy
          </button>
          <button 
            style={styles.button} 
            onClick={handlePasteClips}
            disabled={!clipboard.hasContent}
          >
            Paste
          </button>
        </div>

        <div style={styles.group}>
          <button 
            style={styles.button} 
            onClick={handleUndo}
            disabled={!canUndo}
          >
            ↶ Undo
          </button>
          <button 
            style={styles.button} 
            onClick={handleRedo}
            disabled={!canRedo}
          >
            ↷ Redo
          </button>
        </div>

        <div style={styles.group}>
          <span style={styles.label}>Zoom:</span>
          <input
            type="range"
            min="1"
            max="200"
            value={zoom}
            onChange={(e) => handleSetZoom(Number(e.target.value))}
            style={styles.slider}
            aria-label="Zoom level"
          />
          <span style={styles.label}>{zoom}%</span>
        </div>
      </div>

      {/* Timeline */}
      <div style={styles.timelineContainer}>
        {/* Ruler */}
        <div style={styles.ruler}>
          <div style={styles.timeMarkers}>
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} style={styles.timeMarker}>
                {formatTime(i * 5000)}
              </div>
            ))}
          </div>
        </div>

        {/* Tracks */}
        <div style={styles.tracksContainer}>
          {tracks.map(track => (
            <div key={track.id} style={styles.track}>
              <div style={styles.trackHeader}>
                <span style={styles.trackName}>{track.name}</span>
                <span style={styles.trackType}>{track.type}</span>
              </div>
              <div style={styles.trackContent}>
                {clips
                  .filter(c => c.trackId === track.id)
                  .map(clip => (
                    <div
                      key={clip.id}
                      style={{
                        ...styles.clip,
                        left: `${clip.startTime / 1000 * zoom}px`,
                        width: `${(clip.endTime - clip.startTime) / 1000 * zoom}px`,
                        backgroundColor: clip.isSelected ? '#4a90d9' : 
                          clip.type === 'video' ? '#5c6bc0' :
                          clip.type === 'audio' ? '#26a69a' :
                          clip.type === 'text' ? '#ffa726' : '#789548',
                      }}
                      onClick={() => handleSelectClip(clip.id)}
                    >
                      <span style={styles.clipName}>{clip.name}</span>
                      <button
                        style={styles.deleteButton}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClip(clip.id);
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>

        {/* Playhead */}
        <div 
          style={{
            ...styles.playhead,
            left: `${playhead / 1000 * zoom + 100}px`,
          }}
        />
      </div>

      {/* Info Panel */}
      <div style={styles.infoPanel}>
        <h3 style={styles.sectionTitle}>Active Composition</h3>
        {activeComposition ? (
          <div style={styles.info}>
            <p><strong>Name:</strong> {activeComposition.name}</p>
            <p><strong>Duration:</strong> {formatTime(activeComposition.duration)}</p>
            <p><strong>FPS:</strong> {activeComposition.fps}</p>
            <p><strong>Tracks:</strong> {activeComposition.trackIds.length}</p>
            <p><strong>Nested:</strong> {activeComposition.nestedCompositionIds.length}</p>
          </div>
        ) : (
          <p style={styles.empty}>No composition selected</p>
        )}

        <h3 style={styles.sectionTitle}>All Compositions</h3>
        <ul style={styles.compositionList}>
          {compositions.map(comp => (
            <li key={comp.id} style={styles.compositionItem}>
              <button
                style={{
                  ...styles.compositionButton,
                  ...(activeComposition?.id === comp.id ? styles.activeComposition : {}),
                }}
                onClick={() => compositionStore.setActiveComposition(comp.id)}
              >
                {comp.name}
              </button>
              {comp.parentCompositionId && (
                <span style={styles.nestedBadge}>
                  Nested (depth: {compositionStore.getNestingDepth(comp.id)})
                </span>
              )}
            </li>
          ))}
        </ul>

        <h3 style={styles.sectionTitle}>Stats</h3>
        <div style={styles.stats}>
          <p>Total Compositions: {compositions.length}</p>
          <p>Total Tracks: {tracks.length}</p>
          <p>Total Clips: {clips.length}</p>
          <p>Clipboard Items: {clipboard.items.length}</p>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '20px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    backgroundColor: '#1e1e2e',
    color: '#cdd6f4',
    minHeight: '100vh',
  },
  title: {
    marginBottom: '20px',
    color: '#f5e0dc',
  },
  toolbar: {
    display: 'flex',
    gap: '20px',
    marginBottom: '20px',
    padding: '10px',
    backgroundColor: '#313244',
    borderRadius: '8px',
    flexWrap: 'wrap',
  },
  group: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  button: {
    padding: '8px 16px',
    backgroundColor: '#45475a',
    color: '#cdd6f4',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  slider: {
    width: '100px',
  },
  label: {
    fontSize: '14px',
    color: '#a6adc8',
  },
  timelineContainer: {
    position: 'relative',
    backgroundColor: '#181825',
    borderRadius: '8px',
    padding: '10px',
    marginBottom: '20px',
  },
  ruler: {
    height: '30px',
    borderBottom: '1px solid #45475a',
    marginLeft: '100px',
    position: 'relative',
  },
  timeMarkers: {
    display: 'flex',
    position: 'absolute',
    left: 0,
  },
  timeMarker: {
    width: `${50 * 5}px`,
    fontSize: '12px',
    color: '#a6adc8',
    borderLeft: '1px solid #45475a',
    paddingLeft: '4px',
  },
  tracksContainer: {
    marginLeft: '100px',
  },
  track: {
    display: 'flex',
    height: '60px',
    borderBottom: '1px solid #45475a',
    marginBottom: '2px',
  },
  trackHeader: {
    width: '100px',
    padding: '8px',
    backgroundColor: '#313244',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    position: 'absolute',
    left: 0,
    height: '60px',
  },
  trackName: {
    fontSize: '12px',
    fontWeight: 'bold',
  },
  trackType: {
    fontSize: '10px',
    color: '#a6adc8',
    textTransform: 'uppercase',
  },
  trackContent: {
    flex: 1,
    position: 'relative',
    height: '100%',
  },
  clip: {
    position: 'absolute',
    top: '10px',
    height: '40px',
    borderRadius: '4px',
    padding: '4px 8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  clipName: {
    fontSize: '12px',
    color: '#cdd6f4',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  deleteButton: {
    background: 'none',
    border: 'none',
    color: '#cdd6f4',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '0 4px',
  },
  playhead: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '2px',
    backgroundColor: '#f38ba8',
    pointerEvents: 'none',
    zIndex: 10,
  },
  infoPanel: {
    backgroundColor: '#313244',
    borderRadius: '8px',
    padding: '20px',
  },
  sectionTitle: {
    marginBottom: '10px',
    color: '#f5e0dc',
    borderBottom: '1px solid #45475a',
    paddingBottom: '5px',
  },
  info: {
    marginBottom: '20px',
  },
  empty: {
    color: '#a6adc8',
    fontStyle: 'italic',
  },
  compositionList: {
    listStyle: 'none',
    padding: 0,
    marginBottom: '20px',
  },
  compositionItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '5px',
  },
  compositionButton: {
    padding: '6px 12px',
    backgroundColor: '#45475a',
    color: '#cdd6f4',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    textAlign: 'left',
    flex: 1,
  },
  activeComposition: {
    backgroundColor: '#5c6bc0',
  },
  nestedBadge: {
    fontSize: '10px',
    color: '#a6adc8',
    backgroundColor: '#45475a',
    padding: '2px 6px',
    borderRadius: '3px',
  },
  stats: {
    fontSize: '14px',
    color: '#a6adc8',
  },
};

export default CompositionDemo;
