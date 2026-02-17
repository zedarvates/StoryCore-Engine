/**
 * AudioTimeline - Visual timeline for audio and shot management
 * 
 * Provides a zoomable timeline canvas with shot boundaries, draggable dialogue phrases,
 * playhead indicator, and snap-to-grid functionality.
 * 
 * Requirements: 4.1, 7.4
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { Shot, DialoguePhrase } from '../types/projectDashboard';

// ============================================================================
// Constants
// ============================================================================

const MIN_ZOOM = 10; // 10 seconds visible
const MAX_ZOOM = 300; // 300 seconds visible
const DEFAULT_ZOOM = 60; // 60 seconds visible
const TIMELINE_HEIGHT = 200;
const SHOT_TRACK_HEIGHT = 40;
const PHRASE_TRACK_HEIGHT = 60;
const PLAYHEAD_WIDTH = 2;
const SNAP_THRESHOLD = 0.5; // seconds
const GRID_INTERVAL = 5; // seconds

// ============================================================================
// Component Props
// ============================================================================

export interface AudioTimelineProps {
  shots: Shot[];
  phrases: DialoguePhrase[];
  duration: number;
  currentTime: number;
  onPhraseMove: (phraseId: string, newStartTime: number) => void;
  onPhraseResize: (phraseId: string, newDuration: number) => void;
  onTimelineClick: (time: number) => void;
  className?: string;
}

// ============================================================================
// Drag State Interface
// ============================================================================

interface DragState {
  phraseId: string;
  type: 'move' | 'resize-start' | 'resize-end';
  startX: number;
  startTime: number;
  originalStartTime: number;
  originalEndTime: number;
}

// ============================================================================
// Component
// ============================================================================

export const AudioTimeline: React.FC<AudioTimelineProps> = ({
  shots,
  phrases,
  duration,
  currentTime,
  onPhraseMove,
  onPhraseResize,
  onTimelineClick,
  className = '',
}) => {
  // ============================================================================
  // Refs
  // ============================================================================

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ============================================================================
  // State
  // ============================================================================

  const [zoom, setZoom] = useState(DEFAULT_ZOOM); // seconds visible
  const [scrollOffset, setScrollOffset] = useState(0);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [hoveredPhrase, setHoveredPhrase] = useState<string | null>(null);

  // ============================================================================
  // Computed Values
  // ============================================================================

  const pixelsPerSecond = canvasRef.current ? canvasRef.current.width / zoom : 0;

  /**
   * Convert time (seconds) to canvas x position
   */
  const timeToX = useCallback((time: number): number => {
    return time * pixelsPerSecond - scrollOffset;
  }, [pixelsPerSecond, scrollOffset]);

  /**
   * Convert canvas x position to time (seconds)
   */
  const xToTime = useCallback((x: number): number => {
    return (x + scrollOffset) / pixelsPerSecond;
  }, [pixelsPerSecond, scrollOffset]);

  /**
   * Snap time to grid if within threshold
   */
  const snapToGrid = useCallback((time: number): number => {
    const gridTime = Math.round(time / GRID_INTERVAL) * GRID_INTERVAL;
    if (Math.abs(time - gridTime) < SNAP_THRESHOLD) {
      return gridTime;
    }
    return time;
  }, []);

  /**
   * Check if phrase overlaps with any other phrase
   */
  const checkOverlap = useCallback((
    phraseId: string,
    startTime: number,
    endTime: number
  ): boolean => {
    return phrases.some(phrase => {
      if (phrase.id === phraseId) return false;
      return !(endTime <= phrase.startTime || startTime >= phrase.endTime);
    });
  }, [phrases]);

  // ============================================================================
  // Drawing Functions
  // ============================================================================

  /**
   * Draw the timeline canvas
   */
  const drawTimeline = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid lines
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    for (let t = 0; t <= duration; t += GRID_INTERVAL) {
      const x = timeToX(t);
      if (x >= 0 && x <= canvas.width) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();

        // Draw time labels
        ctx.fillStyle = '#666';
        ctx.font = '10px sans-serif';
        ctx.fillText(`${t}s`, x + 2, 12);
      }
    }

    // Draw shot track
    const shotTrackY = 20;
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(0, shotTrackY, canvas.width, SHOT_TRACK_HEIGHT);

    // Draw shot boundaries
    shots.forEach(shot => {
      const x = timeToX(shot.startTime);
      const width = (shot.duration * pixelsPerSecond);

      if (x + width >= 0 && x <= canvas.width) {
        // Shot background
        ctx.fillStyle = '#3a3a3a';
        ctx.fillRect(x, shotTrackY, width, SHOT_TRACK_HEIGHT);

        // Shot border
        ctx.strokeStyle = '#4a9eff';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, shotTrackY, width, SHOT_TRACK_HEIGHT);

        // Shot label
        ctx.fillStyle = '#fff';
        ctx.font = '12px sans-serif';
        const label = `Shot ${shot.id.slice(-4)}`;
        ctx.fillText(label, x + 5, shotTrackY + 25);
      }
    });

    // Draw phrase track
    const phraseTrackY = shotTrackY + SHOT_TRACK_HEIGHT + 10;
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(0, phraseTrackY, canvas.width, PHRASE_TRACK_HEIGHT);

    // Draw dialogue phrases
    phrases.forEach(phrase => {
      const x = timeToX(phrase.startTime);
      const width = ((phrase.endTime - phrase.startTime) * pixelsPerSecond);

      if (x + width >= 0 && x <= canvas.width) {
        const isHovered = hoveredPhrase === phrase.id;
        const isDragging = dragState?.phraseId === phrase.id;

        // Phrase background
        ctx.fillStyle = isDragging ? '#ff6b6b' : isHovered ? '#5a9eff' : '#4a9eff';
        ctx.fillRect(x, phraseTrackY, width, PHRASE_TRACK_HEIGHT);

        // Phrase border
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, phraseTrackY, width, PHRASE_TRACK_HEIGHT);

        // Phrase text
        ctx.fillStyle = '#fff';
        ctx.font = '11px sans-serif';
        const text = phrase.text.length > 20 ? phrase.text.slice(0, 20) + '...' : phrase.text;
        ctx.fillText(text, x + 5, phraseTrackY + 20);

        // Duration label
        ctx.font = '9px sans-serif';
        ctx.fillStyle = '#ccc';
        const durationText = `${(phrase.endTime - phrase.startTime).toFixed(1)}s`;
        ctx.fillText(durationText, x + 5, phraseTrackY + 35);

        // Resize handles
        if (isHovered || isDragging) {
          ctx.fillStyle = '#fff';
          // Left handle
          ctx.fillRect(x, phraseTrackY, 4, PHRASE_TRACK_HEIGHT);
          // Right handle
          ctx.fillRect(x + width - 4, phraseTrackY, 4, PHRASE_TRACK_HEIGHT);
        }
      }
    });

    // Draw playhead
    const playheadX = timeToX(currentTime);
    if (playheadX >= 0 && playheadX <= canvas.width) {
      ctx.fillStyle = '#ff4444';
      ctx.fillRect(playheadX - PLAYHEAD_WIDTH / 2, 0, PLAYHEAD_WIDTH, canvas.height);

      // Playhead time label
      ctx.fillStyle = '#ff4444';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(`${currentTime.toFixed(1)}s`, playheadX + 5, 12);
    }
  }, [
    shots,
    phrases,
    duration,
    currentTime,
    timeToX,
    pixelsPerSecond,
    hoveredPhrase,
    dragState,
  ]);

  // ============================================================================
  // Mouse Event Handlers
  // ============================================================================

  /**
   * Handle mouse down - start drag operation
   */
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const time = xToTime(x);

    const phraseTrackY = 20 + SHOT_TRACK_HEIGHT + 10;

    // Check if clicking on a phrase
    if (y >= phraseTrackY && y <= phraseTrackY + PHRASE_TRACK_HEIGHT) {
      for (const phrase of phrases) {
        const phraseX = timeToX(phrase.startTime);
        const phraseWidth = (phrase.endTime - phrase.startTime) * pixelsPerSecond;

        if (x >= phraseX && x <= phraseX + phraseWidth) {
          // Check if clicking on resize handles
          if (x <= phraseX + 4) {
            // Left handle - resize start
            setDragState({
              phraseId: phrase.id,
              type: 'resize-start',
              startX: x,
              startTime: time,
              originalStartTime: phrase.startTime,
              originalEndTime: phrase.endTime,
            });
          } else if (x >= phraseX + phraseWidth - 4) {
            // Right handle - resize end
            setDragState({
              phraseId: phrase.id,
              type: 'resize-end',
              startX: x,
              startTime: time,
              originalStartTime: phrase.startTime,
              originalEndTime: phrase.endTime,
            });
          } else {
            // Middle - move
            setDragState({
              phraseId: phrase.id,
              type: 'move',
              startX: x,
              startTime: time,
              originalStartTime: phrase.startTime,
              originalEndTime: phrase.endTime,
            });
          }
          return;
        }
      }
    }

    // If not clicking on a phrase, trigger timeline click
    onTimelineClick(time);
  }, [phrases, timeToX, xToTime, pixelsPerSecond, onTimelineClick]);

  /**
   * Handle mouse move - update drag operation or hover state
   */
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const time = xToTime(x);

    // Handle dragging
    if (dragState) {
      const timeDelta = time - dragState.startTime;

      if (dragState.type === 'move') {
        let newStartTime = snapToGrid(dragState.originalStartTime + timeDelta);
        const duration = dragState.originalEndTime - dragState.originalStartTime;
        const newEndTime = newStartTime + duration;

        // Clamp to timeline bounds
        if (newStartTime < 0) newStartTime = 0;
        if (newEndTime > duration) newStartTime = duration - duration;

        // Check for overlaps
        if (!checkOverlap(dragState.phraseId, newStartTime, newEndTime)) {
          onPhraseMove(dragState.phraseId, newStartTime);
        }
      } else if (dragState.type === 'resize-start') {
        let newStartTime = snapToGrid(dragState.originalStartTime + timeDelta);

        // Ensure minimum duration of 0.5 seconds
        if (newStartTime >= dragState.originalEndTime - 0.5) {
          newStartTime = dragState.originalEndTime - 0.5;
        }
        if (newStartTime < 0) newStartTime = 0;

        // Check for overlaps
        if (!checkOverlap(dragState.phraseId, newStartTime, dragState.originalEndTime)) {
          const newDuration = dragState.originalEndTime - newStartTime;
          onPhraseMove(dragState.phraseId, newStartTime);
          onPhraseResize(dragState.phraseId, newDuration);
        }
      } else if (dragState.type === 'resize-end') {
        let newEndTime = snapToGrid(dragState.originalEndTime + timeDelta);

        // Ensure minimum duration of 0.5 seconds
        if (newEndTime <= dragState.originalStartTime + 0.5) {
          newEndTime = dragState.originalStartTime + 0.5;
        }
        if (newEndTime > duration) newEndTime = duration;

        // Check for overlaps
        if (!checkOverlap(dragState.phraseId, dragState.originalStartTime, newEndTime)) {
          const newDuration = newEndTime - dragState.originalStartTime;
          onPhraseResize(dragState.phraseId, newDuration);
        }
      }

      return;
    }

    // Handle hover state
    const phraseTrackY = 20 + SHOT_TRACK_HEIGHT + 10;
    if (y >= phraseTrackY && y <= phraseTrackY + PHRASE_TRACK_HEIGHT) {
      let foundPhrase: string | null = null;

      for (const phrase of phrases) {
        const phraseX = timeToX(phrase.startTime);
        const phraseWidth = (phrase.endTime - phrase.startTime) * pixelsPerSecond;

        if (x >= phraseX && x <= phraseX + phraseWidth) {
          foundPhrase = phrase.id;
          break;
        }
      }

      setHoveredPhrase(foundPhrase);
    } else {
      setHoveredPhrase(null);
    }
  }, [
    dragState,
    phrases,
    duration,
    xToTime,
    timeToX,
    pixelsPerSecond,
    snapToGrid,
    checkOverlap,
    onPhraseMove,
    onPhraseResize,
  ]);

  /**
   * Handle mouse up - end drag operation
   */
  const handleMouseUp = useCallback(() => {
    setDragState(null);
  }, []);

  /**
   * Handle mouse leave - end drag operation and clear hover
   */
  const handleMouseLeave = useCallback(() => {
    setDragState(null);
    setHoveredPhrase(null);
  }, []);

  /**
   * Handle wheel - zoom in/out
   */
  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();

    const zoomDelta = e.deltaY > 0 ? 10 : -10;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom + zoomDelta));
    setZoom(newZoom);
  }, [zoom]);

  // ============================================================================
  // Effects
  // ============================================================================

  /**
   * Redraw timeline when dependencies change
   */
  useEffect(() => {
    drawTimeline();
  }, [drawTimeline]);

  /**
   * Handle canvas resize
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resizeObserver = new ResizeObserver(() => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = TIMELINE_HEIGHT;
      drawTimeline();
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [drawTimeline]);

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className={`audio-timeline ${className}`}>
      {/* Zoom Controls */}
      <div className="timeline-controls" style={styles.controls}>
        <button
          onClick={() => setZoom(Math.max(MIN_ZOOM, zoom - 10))}
          style={styles.button}
          disabled={zoom <= MIN_ZOOM}
        >
          Zoom In
        </button>
        <span style={styles.zoomLabel}>{zoom}s</span>
        <button
          onClick={() => setZoom(Math.min(MAX_ZOOM, zoom + 10))}
          style={styles.button}
          disabled={zoom >= MAX_ZOOM}
        >
          Zoom Out
        </button>
        <button
          onClick={() => setZoom(DEFAULT_ZOOM)}
          style={styles.button}
        >
          Reset
        </button>
      </div>

      {/* Timeline Canvas */}
      <div ref={containerRef} style={styles.container}>
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onWheel={handleWheel}
          style={styles.canvas}
        />
      </div>

      {/* Legend */}
      <div style={styles.legend}>
        <div style={styles.legendItem}>
          <div style={{ ...styles.legendColor, backgroundColor: '#4a9eff' }} />
          <span>Shot Boundary</span>
        </div>
        <div style={styles.legendItem}>
          <div style={{ ...styles.legendColor, backgroundColor: '#4a9eff' }} />
          <span>Dialogue Phrase</span>
        </div>
        <div style={styles.legendItem}>
          <div style={{ ...styles.legendColor, backgroundColor: '#ff4444' }} />
          <span>Playhead</span>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles: Record<string, React.CSSProperties> = {
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px',
    backgroundColor: '#2a2a2a',
    borderRadius: '4px',
    marginBottom: '10px',
  },
  button: {
    padding: '6px 12px',
    backgroundColor: '#4a9eff',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  zoomLabel: {
    color: '#fff',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  container: {
    width: '100%',
    height: `${TIMELINE_HEIGHT}px`,
    backgroundColor: '#1a1a1a',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  canvas: {
    display: 'block',
    cursor: 'crosshair',
  },
  legend: {
    display: 'flex',
    gap: '20px',
    padding: '10px',
    marginTop: '10px',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    color: '#ccc',
  },
  legendColor: {
    width: '16px',
    height: '16px',
    borderRadius: '2px',
  },
};

export default AudioTimeline;
