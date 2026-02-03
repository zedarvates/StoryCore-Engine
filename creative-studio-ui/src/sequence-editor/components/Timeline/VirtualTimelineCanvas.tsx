/**
 * VirtualTimelineCanvas Component
 * 
 * High-performance timeline canvas using @tanstack/react-virtual for virtual scrolling
 * and canvas-based rendering for efficient handling of large timelines (1000+ shots).
 * Supports shot thumbnails, multiple layers, layer stacking, and layer selection.
 * 
 * Requirements: 1.1, 1.3, 1.8, 4.3, 9.1, 9.2, 9.3, 9.4, 9.5, 9.7
 */

import React, { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Track, Shot, Layer, LayerType } from '../../types';

// ============================================================================
// Constants
// ============================================================================

// Track type configuration with colors and icons
export const TRACK_CONFIG: Record<LayerType, { color: string; icon: string; height: number; name: string }> = {
  media: { color: '#4A90E2', icon: '🎬', height: 60, name: 'Media' },
  audio: { color: '#50C878', icon: '🔊', height: 40, name: 'Audio' },
  effects: { color: '#9B59B6', icon: '✨', height: 40, name: 'Effects' },
  transitions: { color: '#E67E22', icon: '↔️', height: 30, name: 'Transitions' },
  text: { color: '#F39C12', icon: '📝', height: 40, name: 'Text' },
  keyframes: { color: '#E74C3C', icon: '🔑', height: 30, name: 'Keyframes' },
};

// Layer type configuration
export const LAYER_ICONS: Record<LayerType, string> = {
  media: '🎬',
  audio: '🔊',
  effects: '✨',
  transitions: '↔️',
  text: '📝',
  keyframes: '🔑',
};

// Timeline rendering constants
const SHOT_CORNER_RADIUS = 4;
const SHOT_PADDING = 2;
const LAYER_STACK_HEIGHT = 26;
const MIN_SHOT_WIDTH = 20;
const PLAYHEAD_WIDTH = 2;
const THUMBNAIL_HEIGHT = 20;
const THUMBNAIL_WIDTH = 40;

// ============================================================================
// Types
// ============================================================================

interface VirtualTimelineCanvasProps {
  /** Array of tracks to render */
  tracks: Track[];
  /** Array of shots to display */
  shots: Shot[];
  /** Current zoom level (pixels per frame) */
  zoomLevel: number;
  /** Current playhead position in frames */
  playheadPosition: number;
  /** Currently selected element IDs */
  selectedElements: string[];
  /** Timeline width in pixels */
  timelineWidth: number;
  /** Function to handle shot selection */
  onShotSelect: (shotId: string, multiSelect: boolean) => void;
  /** Function to handle layer selection */
  onLayerSelect?: (shotId: string, layerId: string, multiSelect: boolean) => void;
  /** Function to handle shot move */
  onShotMove?: (shotId: string, newStartTime: number) => void;
  /** Function to handle shot resize */
  onShotResize?: (shotId: string, newDuration: number, edge: 'start' | 'end') => void;
  /** Current scroll offset */
  scrollLeft?: number;
  /** Whether playback is active */
  isPlaying?: boolean;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get shots that have layers matching the specified track type
 */
export function getTrackShots(shots: Shot[], trackType: LayerType): Array<{ shot: Shot; layer: Layer }> {
  const result: Array<{ shot: Shot; layer: Layer }> = [];
  
  shots.forEach((shot) => {
    shot.layers
      .filter((layer) => layer.type === trackType)
      .forEach((layer) => {
        result.push({ shot, layer });
      });
  });
  
  return result;
}

/**
 * Get layer index for stacking within a shot
 */
function getLayerIndex(shot: Shot, trackType: LayerType, targetLayer: Layer): number {
  return shot.layers
    .filter((l) => l.type === trackType)
    .indexOf(targetLayer);
}

/**
 * Format timecode from frame number
 */
function formatTimecode(frame: number, fps: number = 24): string {
  const totalSeconds = Math.floor(frame / fps);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60);
  const frames = frame % fps;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
}

/**
 * Draw grid lines on canvas
 */
function drawGridLines(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  zoomLevel: number,
  fps: number = 24
): void {
  // Draw vertical grid lines based on zoom level
  const gridSpacing = zoomLevel >= 50 ? zoomLevel : zoomLevel >= 20 ? zoomLevel * 5 : zoomLevel * 10;
  const majorGridSpacing = gridSpacing * 10;
  
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;
  
  // Minor grid lines
  for (let x = 0; x <= width; x += gridSpacing) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  
  // Major grid lines with time labels
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  for (let x = 0; x <= width; x += majorGridSpacing) {
    const frame = Math.round(x / zoomLevel);
    const timecode = formatTimecode(frame, fps);
    
    // Draw line
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
    
    // Draw time label
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '10px SF Mono, Monaco, Consolas, monospace';
    ctx.fillText(timecode, x + 4, 12);
  }
}

/**
 * Draw shot thumbnail on canvas
 */
function drawThumbnail(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  thumbnailUrl?: string
): void {
  // Draw thumbnail background
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(x + 2, y + 2, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);
  
  // Draw placeholder or actual thumbnail
  if (thumbnailUrl) {
    // In a real implementation, this would draw the actual image
    // For now, draw a placeholder pattern
    ctx.fillStyle = '#333';
    ctx.fillRect(x + 4, y + 4, THUMBNAIL_WIDTH - 8, THUMBNAIL_HEIGHT - 8);
  } else {
    // Draw placeholder icon
    ctx.fillStyle = '#333';
    ctx.fillRect(x + 4, y + 4, THUMBNAIL_WIDTH - 8, THUMBNAIL_HEIGHT - 8);
    
    // Draw play icon
    ctx.fillStyle = '#666';
    ctx.beginPath();
    ctx.moveTo(x + THUMBNAIL_WIDTH / 2 - 4, y + THUMBNAIL_HEIGHT / 2 - 6);
    ctx.lineTo(x + THUMBNAIL_WIDTH / 2 + 6, y + THUMBNAIL_HEIGHT / 2);
    ctx.lineTo(x + THUMBNAIL_WIDTH / 2 - 4, y + THUMBNAIL_HEIGHT / 2 + 6);
    ctx.closePath();
    ctx.fill();
  }
}

/**
 * Draw a layer on the canvas
 */
function drawLayer(
  ctx: CanvasRenderingContext2D,
  shot: Shot,
  layer: Layer,
  trackType: LayerType,
  trackHeight: number,
  zoomLevel: number,
  isSelected: boolean,
  trackColor: string,
  isLocked: boolean,
  isHidden: boolean
): void {
  const x = shot.startTime * zoomLevel;
  const width = Math.max(shot.duration * zoomLevel, MIN_SHOT_WIDTH);
  const layerIndex = getLayerIndex(shot, trackType, layer);
  const y = layerIndex * LAYER_STACK_HEIGHT + SHOT_PADDING;
  const height = LAYER_STACK_HEIGHT - SHOT_PADDING * 2;
  
  // Skip if hidden
  if (isHidden) return;
  
  // Calculate opacity
  let alpha = isSelected ? 1 : 0.8;
  if (isLocked) alpha = 0.5;
  
  // Draw layer background with rounded corners
  ctx.fillStyle = trackColor;
  ctx.globalAlpha = alpha;
  
  // Rounded rectangle path
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, SHOT_CORNER_RADIUS);
  ctx.fill();
  
  // Draw selection outline
  if (isSelected) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  
  // Draw layer icon and name
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#ffffff';
  ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textBaseline = 'middle';
  
  const textPadding = 4;
  const iconPadding = 2;
  
  // Draw layer icon
  const icon = LAYER_ICONS[layer.type] || '📁';
  ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText(icon, x + iconPadding, y + height / 2);
  
  // Draw layer name
  ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
  const iconWidth = 16;
  const nameX = x + iconWidth + iconPadding;
  const maxTextWidth = width - iconWidth - textPadding * 2;
  
  let text = shot.name || 'Untitled';
  if (maxTextWidth > 0) {
    while (ctx.measureText(text).width > maxTextWidth && text.length > 3) {
      text = text.slice(0, -4) + '...';
    }
  }
  
  if (width > iconWidth + textPadding * 2 + 20) {
    ctx.fillText(text, nameX, y + height / 2);
  }
  
  // Draw thumbnail if there's enough space
  if (width > THUMBNAIL_WIDTH + 60) {
    drawThumbnail(ctx, x + width - THUMBNAIL_WIDTH - 4, y + (height - THUMBNAIL_HEIGHT) / 2, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);
  }
  
  // Draw duration indicator
  if (width > 60) {
    const durationText = `${Math.round(shot.duration / 24)}s`;
    const durationWidth = ctx.measureText(durationText).width;
    const thumbnailOffset = width > THUMBNAIL_WIDTH + 60 ? THUMBNAIL_WIDTH + 8 : 0;
    
    if (width > iconWidth + textPadding * 2 + 20 + durationWidth + thumbnailOffset) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.textAlign = 'right';
      ctx.fillText(durationText, x + width - textPadding - thumbnailOffset, y + height / 2);
      ctx.textAlign = 'left';
    }
  }
  
  // Draw resize handles if selected and not locked
  if (isSelected && !isLocked) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    // Left handle
    ctx.fillRect(x, y, 6, height);
    // Right handle
    ctx.fillRect(x + width - 6, y, 6, height);
  }
  
  // Draw locked indicator
  if (isLocked) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(x, y, width, height);
    
    // Lock icon
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('🔒', x + width - 4, y + height / 2);
    ctx.textAlign = 'left';
  }
}

/**
 * Draw playhead on canvas
 */
function drawPlayhead(
  ctx: CanvasRenderingContext2D,
  position: number,
  height: number,
  isPlaying: boolean
): void {
  const x = position;
  
  // Draw playhead line
  ctx.strokeStyle = '#4A90E2';
  ctx.lineWidth = PLAYHEAD_WIDTH;
  ctx.shadowColor = '#4A90E2';
  ctx.shadowBlur = 4;
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, height);
  ctx.stroke();
  ctx.shadowBlur = 0;
  
  // Draw playhead handle
  ctx.fillStyle = '#4A90E2';
  ctx.beginPath();
  ctx.moveTo(x - 8, 0);
  ctx.lineTo(x + 8, 0);
  ctx.lineTo(x, 12);
  ctx.closePath();
  ctx.fill();
  
  // Pulse animation when playing
  if (isPlaying) {
    ctx.strokeStyle = 'rgba(74, 144, 226, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 4, 0);
    ctx.lineTo(x - 4, height);
    ctx.moveTo(x + 4, 0);
    ctx.lineTo(x + 4, height);
    ctx.stroke();
  }
}

// ============================================================================
// Main VirtualTimelineCanvas Component
// ============================================================================

export const VirtualTimelineCanvas: React.FC<VirtualTimelineCanvasProps> = ({
  tracks,
  shots,
  zoomLevel,
  playheadPosition,
  selectedElements,
  timelineWidth,
  onShotSelect,
  onLayerSelect,
  onShotMove,
  onShotResize,
  isPlaying = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRefs = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const [containerSize, setContainerSize] = useState({ width: 800, height: 400 });
  
  // Filter out hidden tracks
  const visibleTracks = useMemo(
    () => tracks.filter((track) => !track.hidden),
    [tracks]
  );
  
  // Calculate total height of all tracks
  const totalHeight = useMemo(
    () => visibleTracks.reduce((sum, track) => sum + track.height, 0),
    [visibleTracks]
  );
  
  // Setup virtualizer for vertical scrolling
  const rowVirtualizer = useVirtualizer({
    count: visibleTracks.length,
    getScrollElement: () => containerRef.current,
    estimateSize: (index) => visibleTracks[index]?.height || 40,
    overscan: 3,
    // Enable measurement for test environments
    measureElement:
      typeof window !== 'undefined' && window.document
        ? undefined
        : () => 40,
  });
  
  // Update container size on resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    
    updateSize();
    const resizeObserver = new ResizeObserver(updateSize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    return () => resizeObserver.disconnect();
  }, []);
  
  // Draw each track canvas
  useEffect(() => {
    visibleTracks.forEach((track) => {
      const canvas = canvasRefs.current.get(track.id);
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      const trackLayers = getTrackShots(shots, track.type);
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw background
      ctx.fillStyle = track.color + '15';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw grid lines
      drawGridLines(ctx, canvas.width, canvas.height, zoomLevel);
      
      // Draw layers
      trackLayers.forEach(({ shot, layer }) => {
        const isSelected = selectedElements.includes(shot.id);
        drawLayer(
          ctx,
          shot,
          layer,
          track.type,
          track.height,
          zoomLevel,
          isSelected,
          track.color,
          layer.locked,
          layer.hidden
        );
      });
      
      // Draw playhead
      const playheadX = playheadPosition * zoomLevel;
      if (playheadX >= 0 && playheadX <= canvas.width) {
        drawPlayhead(ctx, playheadX, canvas.height, isPlaying);
      }
    });
  }, [visibleTracks, shots, zoomLevel, playheadPosition, selectedElements, isPlaying]);
  
  // Handle canvas click for shot/layer selection
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>, track: Track) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const trackLayers = getTrackShots(shots, track.type);
      
      // If onLayerSelect is provided, try to find the specific layer clicked
      if (onLayerSelect) {
        for (const { shot, layer } of trackLayers) {
          const shotStart = shot.startTime * zoomLevel;
          const shotEnd = (shot.startTime + shot.duration) * zoomLevel;
          const layerIndex = getLayerIndex(shot, track.type, layer);
          const layerTop = layerIndex * LAYER_STACK_HEIGHT + SHOT_PADDING;
          const layerBottom = layerTop + LAYER_STACK_HEIGHT - SHOT_PADDING * 2;
          
          // Check if click is within layer bounds (both X and Y)
          if (x >= shotStart && x <= shotEnd && y >= layerTop && y <= layerBottom) {
            // Layer clicked
            onLayerSelect(shot.id, layer.id, e.ctrlKey || e.metaKey);
            return;
          }
        }
      }
      
      // If no specific layer was clicked or onLayerSelect not provided,
      // check if any shot was clicked (more lenient - just check X coordinate)
      for (const { shot } of trackLayers) {
        const shotStart = shot.startTime * zoomLevel;
        const shotEnd = (shot.startTime + shot.duration) * zoomLevel;
        
        if (x >= shotStart && x <= shotEnd) {
          if (onLayerSelect) {
            // If onLayerSelect is provided but we didn't find exact layer,
            // call it with the first layer of the shot
            const firstLayer = shot.layers.find(l => l.type === track.type);
            if (firstLayer) {
              onLayerSelect(shot.id, firstLayer.id, e.ctrlKey || e.metaKey);
            }
          } else {
            onShotSelect(shot.id, e.ctrlKey || e.metaKey);
          }
          return;
        }
      }
    },
    [shots, zoomLevel, onShotSelect, onLayerSelect]
  );
  
  // Resize canvas observer
  useEffect(() => {
    visibleTracks.forEach((track) => {
      const container = document.getElementById(`track-container-${track.id}`);
      const canvas = canvasRefs.current.get(track.id);
      if (!container || !canvas) return;
      
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width } = entry.contentRect;
          canvas.width = width;
          canvas.height = track.height;
        }
      });
      
      resizeObserver.observe(container);
    });
  }, [visibleTracks]);
  
  return (
    <div ref={containerRef} className="virtual-timeline-canvas">
      {/* Canvas for drawing static elements (grid, playhead, etc.) */}
      <div
        className="static-overlay-canvas"
        style={{
          width: timelineWidth,
          height: totalHeight,
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: 'none',
          zIndex: 5,
        }}
      >
        <canvas
          width={timelineWidth}
          height={totalHeight}
          className="overlay-canvas"
        />
      </div>
      
      {/* Virtual list of tracks */}
      <div
        className="timeline-track-list"
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {/* Render all visible tracks (fallback for test environment) */}
        {rowVirtualizer.getVirtualItems().length === 0 && visibleTracks.map((track, index) => {
          const trackLayers = getTrackShots(shots, track.type);
          
          return (
            <div
              key={track.id}
              className="virtual-track-row"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${track.height}px`,
                transform: `translateY(${visibleTracks.slice(0, index).reduce((sum, t) => sum + t.height, 0)}px)`,
              }}
            >
              <div
                id={`track-container-${track.id}`}
                className="track-canvas-container"
                style={{ width: '100%', height: track.height }}
              >
                <canvas
                  ref={(el) => {
                    if (el) canvasRefs.current.set(track.id, el);
                    else canvasRefs.current.delete(track.id);
                  }}
                  className="track-canvas"
                  width={timelineWidth}
                  height={track.height}
                  onClick={(e) => handleCanvasClick(e, track)}
                  style={{
                    width: timelineWidth,
                    height: track.height,
                    cursor: 'pointer',
                  }}
                />
                
                {/* Layer count indicator */}
                {trackLayers.length > 0 && (
                  <div className="layer-count-badge" title={`${trackLayers.length} layers`}>
                    {trackLayers.length}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        
        {/* Virtual items (normal rendering) */}
        {rowVirtualizer.getVirtualItems().map((virtualItem) => {
          const track = visibleTracks[virtualItem.index];
          const trackLayers = getTrackShots(shots, track.type);
          
          return (
            <div
              key={track.id}
              className="virtual-track-row"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${track.height}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <div
                id={`track-container-${track.id}`}
                className="track-canvas-container"
                style={{ width: '100%', height: track.height }}
              >
                <canvas
                  ref={(el) => {
                    if (el) canvasRefs.current.set(track.id, el);
                    else canvasRefs.current.delete(track.id);
                  }}
                  className="track-canvas"
                  width={timelineWidth}
                  height={track.height}
                  onClick={(e) => handleCanvasClick(e, track)}
                  style={{
                    width: timelineWidth,
                    height: track.height,
                    cursor: 'pointer',
                  }}
                />
                
                {/* Layer count indicator */}
                {trackLayers.length > 0 && (
                  <div className="layer-count-badge" title={`${trackLayers.length} layers`}>
                    {trackLayers.length}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VirtualTimelineCanvas;

