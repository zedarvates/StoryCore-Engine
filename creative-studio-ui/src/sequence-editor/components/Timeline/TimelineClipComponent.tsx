/**
 * TimelineClipComponent — DOM-based clip renderer for the timeline
 * Remplaces canvas rendering with interactive DOM elements.
 * Inspired by LTX-Desktop's clip rendering approach.
 */
import React, { useCallback, useMemo } from 'react';
import type { Shot, Layer, LayerType, TimelineTransition } from '@/types';
import { LAYER_ICONS } from '../../constants/timelineConstants';
import { SpriteClipOverlay } from './SpriteClipOverlay';
import { Scene3DClipOverlay } from './Scene3DClipOverlay';
import './timeline.css';

// ============================================================================
// Types
// ============================================================================

export interface TimelineClipProps {
  /** The shot this clip belongs to */
  shot: Shot;
  /** The specific layer within the shot (null = shot root) */
  layer?: Layer | null;
  /** Track type this clip is rendered on */
  trackType: LayerType;
  /** Zoom level (pixels per frame) */
  zoomLevel: number;
  /** Is this clip selected */
  isSelected: boolean;
  /** Is the parent track locked */
  isTrackLocked: boolean;
  /** Active tool */
  activeTool?: string;
  /** Content offset for slip editing */
  contentOffset?: number;
  /** Click handler */
  onClick: (e: React.MouseEvent) => void;
  /** Double click handler */
  onDoubleClick?: (e: React.MouseEvent) => void;
  /** Mouse down on left resize handle */
  onResizeStartLeft?: (e: React.MouseEvent) => void;
  /** Mouse down on right resize handle */
  onResizeStartRight?: (e: React.MouseEvent) => void;
  /** Drag style for preview */
  dragStyle?: React.CSSProperties;
}

// ============================================================================
// Helpers
// ============================================================================

const TRACK_STYLE_MAP: Record<string, { bg: string; border: string; text: string }> = {
  media:       { bg: 'linear-gradient(90deg, #1e1b4b 0%, #312e81 100%)', border: '#8b5cf6', text: '#c4b5fd' },
  audio:       { bg: 'linear-gradient(90deg, #064e3b 0%, #065f46 100%)', border: '#10b981', text: '#6ee7b7' },
  effects:     { bg: 'linear-gradient(90deg, #3b1f47 0%, #4a235a 100%)', border: '#9b59b6', text: '#d8b4e2' },
  transitions: { bg: 'linear-gradient(90deg, #3d2e0a 0%, #5c3d0e 100%)', border: '#e67e22', text: '#f5c842' },
  text:        { bg: 'linear-gradient(90deg, #701a75 0%, #86198f 100%)', border: '#f472b6', text: '#f9a8d4' },
  keyframes:   { bg: 'linear-gradient(90deg, #3d0a0a 0%, #5c0e0e 100%)', border: '#e74c3c', text: '#fca5a5' },
};

const getTrackStyle = (type: string) =>
  TRACK_STYLE_MAP[type] ?? { bg: '#1a1a2e', border: '#666', text: '#ccc' };

const formatStatusLabel = (status: string | undefined | Shot['generationStatus']): string => {
  const s = String(status ?? 'pending');
  switch (s) {
    case 'processing': return 'GEN...';
    case 'complete': case 'done': return 'DONE';
    case 'error': case 'failed': return 'ERR';
    default: return 'GEN';
  }
};

const formatTransitionLabel = (t?: TimelineTransition): string | null => {
  if (!t) return null;
  if (t.type === 'none') return null;
  const sec = (t.duration / 24).toFixed(1);
  return `${t.type} (${sec}s)`;
};

// ============================================================================
// Component
// ============================================================================

export const TimelineClipComponent: React.FC<TimelineClipProps> = React.memo(({
  shot,
  layer,
  trackType,
  zoomLevel,
  isSelected,
  isTrackLocked,
  activeTool = 'select',
  contentOffset = 0,
  onClick,
  onDoubleClick,
  onResizeStartLeft,
  onResizeStartRight,
  dragStyle,
}) => {
  const isLocked = isTrackLocked || layer?.locked;

  // Position et dimensions (en pixels)
  const startPx = (shot.startTime || 0) * zoomLevel;
  const widthPx = Math.max(8, (shot.duration || 1) * zoomLevel);
  const layerHeight = 22; // hauteur d'un layer

  const style = useMemo(() => {
    const ts = getTrackStyle(trackType);
    return {
      position: 'absolute' as const,
      left: `${startPx}px`,
      width: `${widthPx}px`,
      height: layer ? `${layerHeight}px` : '100%',
      top: layer ? `${layerIndex * layerHeight}px` : '0',
      background: ts.bg,
      borderLeft: `3px solid ${ts.border}`,
      borderRadius: '4px',
      overflow: 'hidden',
      cursor: isLocked ? 'default' : getCursorForTool(activeTool, isSelected),
      opacity: isLocked ? 0.5 : (layer?.hidden ? 0.3 : layer?.opacity ?? 1),
      transition: 'none', // no CSS transitions during drag
      zIndex: isSelected ? 50 : 20,
      ...dragStyle,
    };
  }, [startPx, widthPx, trackType, isLocked, layer, activeTool, isSelected, dragStyle]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isLocked) return;
    onClick(e);
  }, [isLocked, onClick]);

  const transitionIn = shot.transitions?.in;
  const transitionOut = shot.transitions?.out;
  const hasEffects = shot.effects && shot.effects.length > 0;
  const genStatus = shot.generationStatus;
  const isGenerating = genStatus === 'processing';
  const isComplete = genStatus === 'complete' || genStatus === 'done';

  return (
    <div
      className={`track-layer ${trackType} ${isSelected ? 'selected' : ''} ${isLocked ? 'locked' : ''}`}
      style={style}
      onMouseDown={handleMouseDown}
      onDoubleClick={onDoubleClick}
      title={`${shot.name || 'Shot'} — ${formatTimecode(shot.startTime, 24)} à ${formatTimecode(shot.startTime + shot.duration, 24)}`}
    >
      {/* Transition in overlay */}
      {transitionIn && transitionIn.type !== 'none' && (
        <div
          className="clip-transition-in"
          style={{ width: `${transitionIn.duration * zoomLevel}px` }}
        />
      )}

      {/* Transition out overlay */}
      {transitionOut && transitionOut.type !== 'none' && (
        <div
          className="clip-transition-out"
          style={{ width: `${transitionOut.duration * zoomLevel}px` }}
        />
      )}

      {/* Sprite overlay (Phase 10) */}
      {shot.spriteConfig && (
        <SpriteClipOverlay config={shot.spriteConfig} width={widthPx} height={layer ? layerHeight : 28} />
      )}

      {/* 3D Scene overlay (Phase 10) */}
      {shot.scene3DConfig && (
        <Scene3DClipOverlay config={shot.scene3DConfig} width={widthPx} height={layer ? layerHeight : 28} />
      )}

      {/* Resize handles */}
      {isSelected && !isLocked && (
        <>
          <div className="resize-handle-left" onMouseDown={onResizeStartLeft} />
          <div className="resize-handle-right" onMouseDown={onResizeStartRight} />
        </>
      )}

      {/* Content row */}
      <div style={{
        display: 'flex', alignItems: 'center', height: '100%',
        padding: '0 8px', gap: '4px', fontSize: '10px',
        fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
        color: getTrackStyle(trackType).text,
        minWidth: 0,
      }}>
        {/* Layer icon */}
        <span style={{ flexShrink: 0, opacity: 0.7 }}>
          {LAYER_ICONS[trackType] ?? '🎬'}
        </span>

        {/* Shot name / prompt */}
        {widthPx > 40 && (
          <span style={{
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            flex: 1, minWidth: 0, fontSize: '9px', fontWeight: 600,
            opacity: 0.8,
          }}>
            {shot.name || shot.prompt?.slice(0, 50) || `Shot ${shot.id.slice(0, 6)}`}
          </span>
        )}

        {/* Spacer */}
        <div style={{ flex: 1, minWidth: 4 }} />

        {/* Effects indicator */}
        {hasEffects && widthPx > 60 && (
          <span style={{ flexShrink: 0, color: '#9b59b6', fontSize: '10px' }} title="Has effects">
            ✨
          </span>
        )}

        {/* Transition indicator */}
        {(transitionIn || transitionOut) && widthPx > 60 && (
          <span style={{ flexShrink: 0, color: '#e67e22', fontSize: '10px' }} title={formatTransitionLabel(transitionIn ?? transitionOut) ?? ''}>
            ⚡
          </span>
        )}

        {/* Generation status */}
        {widthPx > 60 && (
          <span style={{
            flexShrink: 0,
            color: isGenerating ? '#3498db' : isComplete ? '#2ecc71' : '#f1c40f',
            fontSize: '10px',
          }} title={`Status: ${genStatus}`}>
            {isGenerating ? '🔄' : isComplete ? '✅' : '✨'}
          </span>
        )}
      </div>

      {/* Slip/Slide offset indicator */}
      {isSelected && (activeTool === 'slip' || activeTool === 'slide') && contentOffset !== 0 && (
        <div style={{
          position: 'absolute', bottom: '-18px', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.8)', color: '#fff', borderRadius: '3px',
          padding: '1px 6px', fontSize: '10px', fontWeight: 700,
          whiteSpace: 'nowrap', zIndex: 60,
        }}>
          {activeTool === 'slip' ? 'Slip' : 'Slide'}: {contentOffset >= 0 ? '+' : ''}{Math.round(contentOffset / zoomLevel)}f
        </div>
      )}
    </div>
  );
});

TimelineClipComponent.displayName = 'TimelineClipComponent';

// ============================================================================
// Utilities
// ============================================================================

function getCursorForTool(tool: string, isSelected: boolean): string {
  if (!isSelected) return 'pointer';
  switch (tool) {
    case 'ripple': return 'col-resize';
    case 'roll': return 'col-resize';
    case 'slip': return 'ew-resize';
    case 'slide': return 'grab';
    case 'cut': return 'crosshair';
    default: return 'grab';
  }
}

function formatTimecode(frame: number, fps: number = 24): string {
  const totalSeconds = Math.floor(frame / fps);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60);
  const fr = frame % fps;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}:${String(fr).padStart(2, '0')}`;
}

export default TimelineClipComponent;
