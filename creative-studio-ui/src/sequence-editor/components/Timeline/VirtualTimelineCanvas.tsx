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
import { useAppDispatch, useAppSelector } from '../../store';
import { splitShot } from '../../store/slices/timelineSlice';
import { LAYER_ICONS, getTrackShots, getLayerIndex } from '../../constants/timelineConstants';
import type { Track, ToolType } from '@/sequence-editor/types';
import type { Shot, Layer, LayerType } from '@/types';
import { cinematicTensionService, type TensionNode } from '@/services/CinematicTensionService';
import '@/sequence-editor/components/Timeline/VirtualTimelineCanvas.css';
 
// Canvas roundRect Polyfill for Older Browsers
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, radii) {
    if (w < 2 * 0 || h < 2 * 0) return this;
    
    let r: number[] = [0, 0, 0, 0];
    
    if (typeof radii === 'number') {
      r = [radii, radii, radii, radii];
    } else if (Array.isArray(radii)) {
      if (radii.length === 1) {
        const val = Number(radii[0]) || 0;
        r = [val, val, val, val];
      } else if (radii.length === 2) {
        const v1 = Number(radii[0]) || 0;
        const v2 = Number(radii[1]) || 0;
        r = [v1, v2, v1, v2];
      } else if (radii.length === 3) {
        const v1 = Number(radii[0]) || 0;
        const v2 = Number(radii[1]) || 0;
        const v3 = Number(radii[2]) || 0;
        r = [v1, v2, v3, v2];
      } else if (radii.length >= 4) {
        r = [
          Number(radii[0]) || 0,
          Number(radii[1]) || 0,
          Number(radii[2]) || 0,
          Number(radii[3]) || 0
        ];
      }
    }

    // Ensure radii don't exceed half the width or height
    const top = Math.min(r[0], h / 2, w / 2);
    const right = Math.min(r[1], h / 2, w / 2);
    const bottom = Math.min(r[2], h / 2, w / 2);
    const left = Math.min(r[3], h / 2, w / 2);

    this.moveTo(x + top, y);
    this.lineTo(x + w - right, y);
    this.quadraticCurveTo(x + w, y, x + w, y + right);
    this.lineTo(x + w, y + h - bottom);
    this.quadraticCurveTo(x + w, y + h, x + w - bottom, y + h);
    this.lineTo(x + left, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - left);
    this.lineTo(x, y + top);
    this.quadraticCurveTo(x, y, x + top, y);
    this.closePath();
    return this;
  };
}

// ============================================================================
// Constants
// ============================================================================


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
  /** Optional scroll element for the virtualizer */
  scrollElement?: HTMLElement | null;
  /** Function to handle shot selection */
  onShotSelect: (shotId: string, multiSelect: boolean) => void;
  /** Function to handle layer selection */
  onLayerSelect?: (shotId: string, layerId: string, multiSelect: boolean) => void;
  /** Function to handle shot move */
  onShotMove?: (shotId: string, newStartTime: number) => void;
  /** Function to handle shot resize */
  onShotResize?: (shotId: string, newDuration: number, edge: 'start' | 'end') => void;
  /** Function to handle shot roll edit */
  onShotRoll?: (shotAId: string, shotBId: string, delta: number) => void;
  /** Function to handle shot slip edit */
  onShotSlip?: (shotId: string, delta: number) => void;
  /** Function to handle shot slide edit */
  onShotSlide?: (shotId: string, delta: number) => void;
  /** Function to handle shot double click (e.g. enter sequence) */
  onShotDoubleClick?: (shotId: string) => void;
  /** Whether playback is active */
  isPlaying?: boolean;
  /** Function to handle shot generation trigger */
  onShotGenerate?: (shotId: string) => void;
  /** Function to handle multi-shot generation */
  onGenerateAll?: (shotIds: string[]) => void;
}



/**
 * Draw grid lines on canvas
 */
function drawGridLines(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  zoomLevel: number,
  gridVisible: boolean = true
): void {
  // Skip if grid is hidden
  if (!gridVisible) return;

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
    
    // Major grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'; // Slightly more visible for major lines
    for (let x = 0; x <= width; x += majorGridSpacing) {
      // Draw line
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
  }

/**
 * Draw shot thumbnail on canvas
 */
// Image cache for thumbnails to avoid flickering and repeated loads
const MAX_CACHE_SIZE = 500;
const thumbnailCache = new Map<string, HTMLImageElement>();

function drawThumbnail(
  ctx: CanvasRenderingContext2D,
  url: string | undefined,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  if (!url) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(x, y, width, height);
    return;
  }

  let img = thumbnailCache.get(url);
  if (!img) {
    // Limit cache size - remove first (oldest) entry
    if (thumbnailCache.size >= MAX_CACHE_SIZE) {
      const firstKey = thumbnailCache.keys().next().value;
      if (firstKey) thumbnailCache.delete(firstKey);
    }

    img = new Image();
    img.src = url;
    img.onload = () => {
      // Re-verify size before saving
      if (thumbnailCache.size >= MAX_CACHE_SIZE) {
        const firstKey = thumbnailCache.keys().next().value;
        if (firstKey) thumbnailCache.delete(firstKey);
      }
      thumbnailCache.set(url, img!);
    };
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(x, y, width, height);
    return;
  }

  if (img.complete && img.naturalWidth > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 4);
    ctx.clip();
    
    let drawW, drawH, offsetX, offsetY;
    const imgAspect = img.naturalWidth / img.naturalHeight;
    const canvasAspect = width / height;

    if (imgAspect > canvasAspect) {
      drawH = height;
      drawW = height * imgAspect;
      offsetX = (width - drawW) / 2;
      offsetY = 0;
    } else {
      drawW = width;
      drawH = width / imgAspect;
      offsetX = 0;
      offsetY = (height - drawH) / 2;
    }
    
    ctx.drawImage(img, x + offsetX, y + offsetY, drawW, drawH);
    ctx.restore();
  } else {
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(x, y, width, height);
  }
}

/**
 * Draw a layer on the canvas
 */
function drawLayer(
  ctx: CanvasRenderingContext2D,
  shot: Shot,
  layer: Layer,
  layerIndex: number,
  trackType: LayerType,
  trackHeight: number,
  zoomLevel: number,
  isSelected: boolean,
  trackColor: string,
  isLocked: boolean,
  isHidden: boolean,
  dragOffset: number = 0,
  sequenceNumber: number | undefined = 0,
  showPrompt: boolean = false,
  contentOffset: number = 0,
  activeTool: ToolType = 'select'
): void {
  const x = shot.startTime * zoomLevel + dragOffset;
  const width = Math.max(shot.duration * zoomLevel, MIN_SHOT_WIDTH);
  const y = layerIndex * LAYER_STACK_HEIGHT + SHOT_PADDING;
  const height = LAYER_STACK_HEIGHT - SHOT_PADDING * 2;
  
  const stackOffset = layerIndex * 2; // Offset for layered rendering on the same track if applicable// Skip if hidden
  if (isHidden) return;
  
  // Calculate opacity
  let alpha = isSelected ? 1 : 0.8;
  if (isLocked) alpha = 0.5;
  
  // Draw layer background with high-end gradient (Premium Aesthetics)
  const gradient = ctx.createLinearGradient(x, y, x, y + height);
  gradient.addColorStop(0, trackColor);
  gradient.addColorStop(1, trackColor.replace('rgb', 'rgba').replace(')', ', 0.6)')); // Fade at bottom
  
  ctx.fillStyle = gradient;
  ctx.globalAlpha = alpha;
  
  // Rounded rectangle path
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, SHOT_CORNER_RADIUS);
  ctx.fill();

  // Subtle inner highlight/border for glassmorphism
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1;
  ctx.stroke();
  
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
  
  let text = (sequenceNumber ? `#${sequenceNumber} ` : '') + (shot.name || 'Untitled');
  if (maxTextWidth > 0) {
    while (ctx.measureText(text).width > maxTextWidth && text.length > 3) {
      text = text.slice(0, -4) + '...';
    }
  }
  
  if (width > iconWidth + textPadding * 2 + 20) {
    ctx.fillText(text, nameX, y + height / 2);
    
    // Draw preset badge if available
    if (shot.presetId) {
      ctx.font = 'bold 8px -apple-system, BlinkMacSystemFont, sans-serif';
      const presetText = shot.presetId.split('-').map(w => w[0].toUpperCase()).join('');
      const badgeWidth = ctx.measureText(presetText).width + 6;
      const badgeX = nameX + ctx.measureText(text).width + 8;
      
      if (width > badgeX + badgeWidth + 40) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath();
        ctx.roundRect(badgeX, y + (height - 12) / 2, badgeWidth, 12, 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillText(presetText, badgeX + 3, y + height / 2);
      }
    }
  }
  
  // Draw thumbnail if there's enough space (Requirement: Visual Feedback)
  // Apply contentOffset to the interior content only
  if (width > THUMBNAIL_WIDTH + 60) {
    ctx.save();
    // Clip to shot bounds
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.clip();
    
    drawThumbnail(
        ctx, 
        shot.outputPath || (shot.referenceImages && shot.referenceImages.length > 0 ? shot.referenceImages[0].url : undefined), 
        x + width - THUMBNAIL_WIDTH - 4 + contentOffset, // Shift content based on slip
        y + (height - THUMBNAIL_HEIGHT) / 2, 
        THUMBNAIL_WIDTH, 
        THUMBNAIL_HEIGHT
    );
    ctx.restore();
  }
  
  // Draw audio waveform placeholder if audio track
  if (trackType === 'audio' && width > 40) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, width, height);
      ctx.clip();
      
      ctx.strokeStyle = '#ffffff40';
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(x + contentOffset, y + height/2);
      ctx.lineTo(x + width + contentOffset, y + height/2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
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
  
  // Draw prompt if there's enough space (Requirement: Prompt Visibility)
  if (showPrompt && width > 120 && shot.prompt) {
    ctx.font = 'italic 9px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    const promptText = shot.prompt.length > 50 ? shot.prompt.substring(0, 47) + '...' : shot.prompt;
    const promptY = y + height - 6;
    const promptX = x + iconWidth + iconPadding;
    
    if (width > iconWidth + textPadding * 4 + 40) {
        ctx.fillText(promptText, promptX, promptY);
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
  }

  // Draw Transition/Effect Indicators (Requirement: Feature Visibility)
  const INDICATOR_SIZE = 12;
  const INDICATOR_Y = y + 4;
  let indicatorX = x + width - 14;

  // Effects Icon
  if (shot.effects && shot.effects.length > 0) {
    ctx.fillStyle = '#9b59b6'; // Purple for effects
    ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('✨', indicatorX, INDICATOR_Y + 4);
    indicatorX -= INDICATOR_SIZE;
  }

  // Transitions Icon
  if (shot.transitions && (shot.transitions.in || shot.transitions.out)) {
    ctx.fillStyle = '#e67e22'; // Orange for transitions
    ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('⚡', indicatorX, INDICATOR_Y + 4);
    indicatorX -= INDICATOR_SIZE + 4;
  }

  // Generation Trigger/Status Icon (Requirement: Prompt Interaction)
  if (width > 40) {
      const isGenerating = String(shot.generationStatus) === 'processing' || String(shot.generationStatus) === 'generating';
      const isComplete = String(shot.generationStatus) === 'complete' || String(shot.generationStatus) === 'done';
      
      ctx.fillStyle = isGenerating ? '#3498db' : isComplete ? '#2ecc71' : '#f1c40f'; // Blue=Gen, Green=Done, Gold=Pending
      ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'right';
      
      // Sparkle emoji as "Generate" trigger indicator
      ctx.fillText(isGenerating ? '🔄' : '✨', indicatorX, INDICATOR_Y + 4);
      
      // If it's a wide shot, we can even show a tiny "GEN" label
      if (width > 150) {
          ctx.font = 'bold 7px -apple-system, BlinkMacSystemFont, sans-serif';
          ctx.globalAlpha = 0.6;
          ctx.fillText(isGenerating ? 'GEN...' : 'GENERATE', indicatorX - 12, INDICATOR_Y + 4);
          ctx.globalAlpha = 1.0;
      }
      indicatorX -= INDICATOR_SIZE + 20;
  }

  // Sub-Sequence Branching Indicator (Phase 6 Orchestration)
  if (shot.subSequenceId) {
      ctx.save();
      ctx.fillStyle = '#3498db';
      ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('🌿', indicatorX, INDICATOR_Y + 4);
      ctx.restore();
  }
  // Draw Slip/Slide Frame Offset Overlay (Requirement: Precise Feedback)
  if (isSelected && (activeTool === 'slip' || activeTool === 'slide') && contentOffset !== 0) {
      const deltaFrames = Math.round(contentOffset / zoomLevel);
      const sign = deltaFrames >= 0 ? '+' : '';
      const offsetText = `${activeTool === 'slip' ? 'Slip' : 'Slide'}: ${sign}${deltaFrames}f`;
      
      ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, sans-serif';
      const textWidth = ctx.measureText(offsetText).width;
      
      // Draw semi-transparent background for text
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.beginPath();
      ctx.roundRect(x + (width - textWidth - 12) / 2, y + height + 2, textWidth + 12, 16, 4);
      ctx.fill();
      
      // Draw text
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(offsetText, x + width / 2, y + height + 10);
      ctx.textAlign = 'left';
  }
}

/**
 * Draw narrative tension curve on canvas
 * Phase 6: AI-Directorial Controls
 */
function drawTensionCurve(
  ctx: CanvasRenderingContext2D,
  nodes: TensionNode[],
  width: number,
  height: number,
  zoomLevel: number,
  scrollLeft: number
): void {
  if (nodes.length < 2) return;

  ctx.save();
  ctx.beginPath();
  
  // Luxury gradient for the intensity curve
  const tensionGradient = ctx.createLinearGradient(0, height, 0, 0);
  tensionGradient.addColorStop(0, 'rgba(231, 76, 60, 0.1)'); // Low intensity: Subdued Red
  tensionGradient.addColorStop(1, 'rgba(231, 76, 60, 0.6)'); // High intensity: Vibrant Red

  ctx.strokeStyle = '#e74c3c';
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  
  // Use a softer glow for high intensity
  ctx.shadowColor = 'rgba(231, 76, 60, 0.4)';
  ctx.shadowBlur = 8;

  let first = true;
  nodes.forEach(node => {
    const x = (node.frame * zoomLevel) - scrollLeft;
    // Map value 0-1 to height (from bottom to top)
    const y = height - (node.value * height * 0.8) - 10;

    if (first) {
      ctx.moveTo(x, y);
      first = false;
    } else {
      ctx.lineTo(x, y);
    }
  });

  ctx.stroke();
  
  // Fill under the curve for better visibility
  ctx.lineTo(nodes[nodes.length-1].frame * zoomLevel - scrollLeft, height);
  ctx.lineTo(nodes[0].frame * zoomLevel - scrollLeft, height);
  ctx.fillStyle = tensionGradient;
  ctx.globalAlpha = 0.3;
  ctx.fill();
  
  ctx.restore();
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
  onShotRoll,
  onShotSlip,
  onShotSlide,
  onShotDoubleClick,
  isPlaying = false,
  onShotGenerate,
  onGenerateAll,
  scrollElement = null,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRefs = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const dispatch = useAppDispatch();
  const { 
    activeTool 
  } = useAppSelector(state => state.tools);
  const { 
    gridVisible, promptsVisible
  } = useAppSelector(state => state.panels);
  
  // Drag and Drop state
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeEdge, setResizeEdge] = useState<'start' | 'end' | null>(null);
  const [draggedShotId, setDraggedShotId] = useState<string | null>(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [currentDragX, setCurrentDragX] = useState(0);
  const [dragTrackId, setDragTrackId] = useState<string | null>(null);
  
  // Filter out hidden tracks
  const visibleTracks = useMemo(
    () => tracks.filter((track) => !track.hidden),
    [tracks]
  );
  
  // Calculate total height of all tracks
  const totalHeight = useMemo(
    () => visibleTracks.reduce((sum, track) => sum+ track.height, 0),
    [visibleTracks]
  );
  
  // Setup virtualizer for vertical scrolling
  const rowVirtualizer = useVirtualizer({
    count: visibleTracks.length,
    getScrollElement: () => scrollElement || containerRef.current,
    estimateSize: (index) => visibleTracks[index]?.height || 40,
    overscan: 3,
    // Enable measurement for test environments
    measureElement:
      typeof window !== 'undefined' && window.document
        ? undefined
        : () => 40,
  });
  
  // Update container size on resize - logically still useful for canvas updates
  useEffect(() => {
    const updateSize = () => {
      // Logic for size-dependent re-renders if needed
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
      
      // Calculate sequence numbers based on startTime
      const sortedShotIds = [...shots]
        .sort((a, b) => a.startTime - b.startTime)
        .map(s => s.id);
      
      const shotIndices = new Map(sortedShotIds.map((id, index) => [id, index + 1]));

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw background
      ctx.fillStyle = track.color + '15';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw grid lines
      drawGridLines(ctx, canvas.width, canvas.height, zoomLevel, gridVisible);
      
      // ====================================================================
      // Horizontal Culling Logic (Audit Task 5 Optimization)
      // ====================================================================
      const scrollLeft = scrollElement?.scrollLeft || containerRef.current?.scrollLeft || 0;
      const viewportWidth = scrollElement?.clientWidth || containerRef.current?.clientWidth || 800; // fallback width
      const viewportEnd = scrollLeft + viewportWidth;
      
      // Draw layers
      trackLayers.forEach(({ shot, layer }, index: number) => {
        const shotWidth = shot.duration * zoomLevel;
        const shotStart = shot.startTime * zoomLevel;
        const shotEnd = shotStart + shotWidth;
        
        // Skip shots that are horizontally outside the viewport (Audit Task 5)
        if (shotEnd < scrollLeft || shotStart > viewportEnd) {
          return; 
        }

        const isSelected = selectedElements.includes(shot.id);
        const isDraggingThis = isDragging && draggedShotId === shot.id;
        const isResizingThis = isResizing && draggedShotId === shot.id;
        
        let dragOffset = 0;
        const deltaX = currentDragX - dragStartX;
        const deltaFrames = Math.round(deltaX / zoomLevel);

        // Live preview for resizing
        const previewShot = { ...shot };
        if (isResizingThis) {
          if (resizeEdge === 'start') {
            const newStart = Math.max(0, shot.startTime + deltaFrames);
            const actualShift = newStart - shot.startTime;
            previewShot.startTime = newStart;
            previewShot.duration = Math.max(1, shot.duration - actualShift);
          } else {
            previewShot.duration = Math.max(1, shot.duration + deltaFrames);
          }
        }
        
        if (isDraggingThis && activeTool === 'select' && dragTrackId === track.id) {
          dragOffset = deltaX;
          previewShot.startTime = Math.max(0, shot.startTime + deltaFrames);
        }

        let contentOffset = (Number(shot.metadata?.contentOffset) || 0) * zoomLevel;
        
        if (isDraggingThis && activeTool === 'slip') {
          contentOffset += deltaX;
          // Shot position doesn't change
        }

        // Slide preview logic: Neighbors resize visually
        if (isDragging && activeTool === 'slide' && draggedShotId) {
            const drShot = shots.find(s => s.id === draggedShotId);
            if (drShot && drShot.id !== shot.id) {
                // Check if this shot is a neighbor of the dragged shot on THIS track
                const isPrev = drShot.startTime + drShot.duration === shot.startTime;
                const isNext = drShot.startTime === shot.startTime + shot.duration;
                
                if (isPrev) {
                    previewShot.duration = Math.max(1, shot.duration - deltaFrames);
                    previewShot.startTime = shot.startTime + deltaFrames;
                } else if (isNext) {
                    previewShot.duration = Math.max(1, shot.duration + deltaFrames);
                }
            } else if (drShot && drShot.id === shot.id) {
                // The shot itself moves
                previewShot.startTime = shot.startTime + deltaFrames;
            }
        }

        ctx.save();
        if (isDraggingThis || isResizingThis) {
          ctx.globalAlpha = 0.6;
          ctx.shadowBlur = 10;
          ctx.shadowColor = 'rgba(0,0,0,0.5)';
        }

        drawLayer(
          ctx,
          previewShot,
          layer,
          index, // Pass the index directly
          track.type,
          track.height,
          zoomLevel,
          isSelected,
          track.color,
          layer.locked,
          layer.hidden,
          dragOffset,
          shotIndices.get(shot.id),
          promptsVisible,
          contentOffset,
          activeTool
        );
        ctx.restore();
      });

      // ====================================================================
      // Narrative Tension Overlay (Phase 6 Orchestration)
      // ====================================================================
      if (track.id === 'track-narrative-meta' || track.type === 'media') {
         const tensionNodes = cinematicTensionService.calculateTimelineTension(shots);
         drawTensionCurve(ctx, tensionNodes, canvas.width, canvas.height, zoomLevel, scrollLeft);
      }
    });
  }, [shots, zoomLevel, selectedElements, isDragging, draggedShotId, dragTrackId, currentDragX, dragStartX, isResizing, resizeEdge, playheadPosition, promptsVisible, gridVisible, activeTool, visibleTracks, scrollElement]);
  
  // Handle canvas click for shot/layer selection
  // Handle canvas mouse down for shot/layer selection and drag start
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>, track: Track) => {
      const rect = e.currentTarget.getBoundingClientRect();
      // Mouse position relative to the track container
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const trackLayers = getTrackShots(shots, track.type);
      
      // Try to find the specific layer clicked - Iterate in reverse to find top-most layer if stacked
      for (let i = trackLayers.length - 1; i >= 0; i--) {
        const { shot, layer } = trackLayers[i];
        const shotStart = shot.startTime * zoomLevel;
        const shotEnd = (shot.startTime + shot.duration) * zoomLevel;
        
        // Calculate vertical stack position
        const layerIndex = getLayerIndex(shot, track.type, layer);
        const layerTop = layerIndex * LAYER_STACK_HEIGHT + SHOT_PADDING;
        const layerBottom = layerTop + LAYER_STACK_HEIGHT - SHOT_PADDING * 2;
        
        // Check if mouse is within shot boundaries
        if (x >= shotStart && x <= shotEnd && y >= layerTop && y <= layerBottom) {
          // INTERACTIVE ZONES HIT DETECTION (Requirement: Precise Interaction)
          const INDICATOR_SIZE = 24; // larger hit area for fingers/precise clicks
          const isSparkleHit = x >= shotEnd - INDICATOR_SIZE * 2 && y >= layerTop && y <= layerTop + INDICATOR_SIZE;
          const isPromptHit = x >= shotStart + 20 && y >= layerBottom - 12;

          if (isSparkleHit && onShotGenerate) {
              onShotGenerate(shot.id);
              return;
          }
          
          if (isPromptHit && onShotDoubleClick) {
              onShotDoubleClick(shot.id); // Typically opens the prompt editor
              return;
          }

          // Handle Cut Tool (Point 7.2)
          if (activeTool === 'cut') {
            const splitTime = Math.round(x / zoomLevel);
            console.log(`[Timeline] Cutting shot ${shot.id} at frame ${splitTime}`);
            dispatch(splitShot({ id: shot.id, frame: Math.round(x / zoomLevel) }));
            return;
          }

          // Regular selection or navigation
          onShotSelect(shot.id, e.ctrlKey || e.metaKey);
          if (onLayerSelect) {
            onLayerSelect(shot.id, layer.id, e.ctrlKey || e.metaKey);
          }
          
          if (!layer.locked) {
            const handleWidth = 8; // width of the resize handle area
            
            // Check for ripple/roll edge first
            if ((activeTool === 'select' || activeTool === 'ripple') && x <= shotStart + handleWidth) {
              setIsResizing(true);
              setResizeEdge('start');
              setDraggedShotId(shot.id);
              setDragStartX(x);
              setCurrentDragX(x);
            } else if ((activeTool === 'select' || activeTool === 'ripple') && x >= shotEnd - handleWidth) {
              setIsResizing(true);
              setResizeEdge('end');
              setDraggedShotId(shot.id);
              setDragStartX(x);
              setCurrentDragX(x);
            } else if (activeTool === 'roll' && (x <= shotStart + handleWidth || x >= shotEnd - handleWidth)) {
               // Find adjacent shot for roll
               const isStart = x <= shotStart + handleWidth;
               const adjacentShot = isStart 
                 ? trackLayers.find(tl => tl.shot.startTime + tl.shot.duration === shot.startTime)?.shot
                 : trackLayers.find(tl => tl.shot.startTime === shot.startTime + shot.duration)?.shot;
               
               if (adjacentShot && onShotRoll) {
                 setIsResizing(true);
                 setResizeEdge(isStart ? 'start' : 'end');
                 setDraggedShotId(shot.id);
                 setDragStartX(x);
                 setCurrentDragX(x);
               }
            } else if (activeTool === 'slip') {
                setIsDragging(true);
                setDraggedShotId(shot.id);
                setDragStartX(x);
                setCurrentDragX(x);
              } else if (activeTool === 'slide') {
                setIsDragging(true);
                setDraggedShotId(shot.id);
                setDragStartX(x);
                setCurrentDragX(x);
              } else if (activeTool === 'select') {
              // Regular move dragging
              setIsDragging(true);
              setDraggedShotId(shot.id);
              setDragTrackId(track.id);
              setDragStartX(x);
              setCurrentDragX(x);
            }
          }
          return;
        }
      }
      
      // Clear selection if clicking on empty track area and NOT multi-selecting
      if (!e.ctrlKey && !e.metaKey) {
        onShotSelect('', false);
      }
    },
    [shots, zoomLevel, activeTool, dispatch, onShotSelect, onLayerSelect, onShotRoll]
  );

  // Handle double click on shot
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>, track: Track) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const trackLayers = getTrackShots(shots, track.type);
      
      for (let i = trackLayers.length - 1; i >= 0; i--) {
        const { shot, layer } = trackLayers[i];
        const shotStart = shot.startTime * zoomLevel;
        const shotEnd = (shot.startTime + shot.duration) * zoomLevel;
        
        const layerIndex = getLayerIndex(shot, track.type, layer);
        const layerTop = layerIndex * LAYER_STACK_HEIGHT + SHOT_PADDING;
        const layerBottom = layerTop + LAYER_STACK_HEIGHT - SHOT_PADDING * 2;
        
        if (x >= shotStart && x <= shotEnd && y >= layerTop && y <= layerBottom) {
          if (onShotDoubleClick) {
            onShotDoubleClick(shot.id);
          }
          return;
        }
      }
    },
    [shots, zoomLevel, onShotDoubleClick]
  );

// Snapping constants
const SNAP_THRESHOLD = 10;

// ... (in VirtualTimelineCanvas component)

  // Calculate snap points
  const snapPoints = useMemo(() => {
    const points = new Set<number>();
    // Playhead is a major snap point
    points.add(playheadPosition * zoomLevel);
    
    // Every shot boundary is a snap point
    shots.forEach(shot => {
      if (shot.id !== draggedShotId) {
        points.add(shot.startTime * zoomLevel);
        points.add((shot.startTime + shot.duration) * zoomLevel);
      }
    });
    
    return Array.from(points);
  }, [shots, zoomLevel, playheadPosition, draggedShotId]);

  const [activeSnapPoint, setActiveSnapPoint] = useState<number | null>(null);

  // Helper to find closest snap point
  const findSnapPoint = useCallback((currentX: number, shotWidth: number): number | null => {
    let closestDist = SNAP_THRESHOLD;
    let bestPoint = null;

    snapPoints.forEach(point => {
      // Check start of shot
      const distStart = Math.abs(currentX - point);
      if (distStart < closestDist) {
        closestDist = distStart;
        bestPoint = point;
      }
      
      // Check end of shot (if dragging, not resizing)
      if (isDragging) {
        const distEnd = Math.abs((currentX + shotWidth) - point);
        if (distEnd < closestDist) {
          closestDist = distEnd;
          bestPoint = point - shotWidth;
        }
      }
    });

    return bestPoint;
  }, [snapPoints, isDragging]);

  // Snap line and Overlay Drawing
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw active snap line
    if (activeSnapPoint !== null) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(activeSnapPoint, 0);
      ctx.lineTo(activeSnapPoint, canvas.height);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw global playhead
    const playheadX = playheadPosition * zoomLevel;
    if (playheadX >= 0 && playheadX <= canvas.width) {
      drawPlayhead(ctx, playheadX, canvas.height, isPlaying);
    }
  }, [activeSnapPoint, playheadPosition, zoomLevel, isPlaying, totalHeight]);

  // Handle canvas mouse move for dragging, resizing, and cursor updates
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>, track?: Track) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (isDragging || isResizing) {
        const currentShot = shots.find(s => s.id === draggedShotId);
        if (currentShot) {
          const shotWidth = currentShot.duration * zoomLevel;
          const snappedX = findSnapPoint(x, shotWidth);
          
          if (snappedX !== null) {
            setCurrentDragX(snappedX);
            setActiveSnapPoint(snappedX);
          } else {
            setCurrentDragX(x);
            setActiveSnapPoint(null);
          }
        }
        return;
      }

      // Cursor management
      if (track) {
        const trackLayers = getTrackShots(shots, track.type);
        let cursor = 'default';
        const handleWidth = 8;

        for (const { shot, layer } of trackLayers) {
          const shotStart = shot.startTime * zoomLevel;
          const shotEnd = (shot.startTime + shot.duration) * zoomLevel;
          
          const layerIndex = getLayerIndex(shot, track.type, layer);
          const layerTop = layerIndex * LAYER_STACK_HEIGHT + SHOT_PADDING;
          const layerBottom = layerTop + LAYER_STACK_HEIGHT - SHOT_PADDING * 2;

          if (x >= shotStart && x <= shotEnd && y >= layerTop && y <= layerBottom) {
            cursor = 'grab';
            if (!layer.locked) {
              if (x <= shotStart + handleWidth || x >= shotEnd - handleWidth) {
                cursor = 'col-resize';
              }
            }
            break;
          }
        }
        e.currentTarget.style.cursor = cursor;
      }
    },
    [isDragging, isResizing, shots, zoomLevel, draggedShotId, findSnapPoint]
  );

  // Handle canvas mouse up to end dragging
  const handleMouseUp = useCallback(
    () => {
      if ((isDragging || isResizing) && draggedShotId) {
        const deltaX = currentDragX - dragStartX;
        const currentShot = shots.find(s => s.id === draggedShotId);
        
        if (currentShot) {
          const deltaFrames = Math.round(deltaX / zoomLevel);
          
          if (isResizing && resizeEdge && onShotResize) {
            let newDuration = currentShot.duration;
            let newStartTime = currentShot.startTime;
            
            if (resizeEdge === 'start') {
              // Dragging start edge: shift startTime AND adjust duration conversely
              newStartTime = Math.max(0, currentShot.startTime + deltaFrames);
              // Ensure we don't resize past the end
              const allowedShift = currentShot.duration - Math.max(1, MIN_SHOT_WIDTH / zoomLevel);
              if (newStartTime > currentShot.startTime + allowedShift) {
                newStartTime = Math.round(currentShot.startTime + allowedShift);
              }
              const actualShift = newStartTime - currentShot.startTime;
              newDuration = currentShot.duration - actualShift;
              
              if (newDuration !== currentShot.duration) {
                onShotResize(draggedShotId, newDuration, 'start');
                // Note: we might need to update startTime too in the handler
              }
            } else {
              // Dragging end edge: just adjust duration
              newDuration = Math.max(Math.round(MIN_SHOT_WIDTH / zoomLevel), currentShot.duration + deltaFrames);
              if (newDuration !== currentShot.duration) {
                onShotResize(draggedShotId, newDuration, 'end');
              }
            }
          } else if (isResizing && resizeEdge && activeTool === 'roll' && onShotRoll) {
            const deltaFrames = Math.round(deltaX / zoomLevel);
            const isStart = resizeEdge === 'start';
            const track = tracks.find(t => t.id === dragTrackId);
            if (track) {
              const trackLayers = getTrackShots(shots, track.type);
              const adjShot = isStart
                ? trackLayers.find(tl => tl.shot.startTime + tl.shot.duration === currentShot.startTime)?.shot
                : trackLayers.find(tl => tl.shot.startTime === currentShot.startTime + currentShot.duration)?.shot;
              
              if (adjShot) {
                onShotRoll(isStart ? adjShot.id : currentShot.id, isStart ? currentShot.id : adjShot.id, deltaFrames);
              }
            }
          } else if (isDragging && activeTool === 'slip' && onShotSlip) {
            onShotSlip(draggedShotId, deltaFrames);
          } else if (isDragging && activeTool === 'slide' && onShotSlide) {
            onShotSlide(draggedShotId, deltaFrames);
          } else if (isDragging && onShotMove) {
            const newStartTime = Math.max(0, currentShot.startTime + deltaFrames);
            if (newStartTime !== currentShot.startTime) {
              onShotMove(draggedShotId, newStartTime);
            }
          }
        }
      }
      
      setIsDragging(false);
      setIsResizing(false);
      setResizeEdge(null);
      setDraggedShotId(null);
      setDragTrackId(null);
    },
    [dragStartX, dragTrackId, draggedShotId, isDragging, isResizing, onShotMove, onShotResize, onShotRoll, onShotSlide, onShotSlip, resizeEdge, shots, zoomLevel, activeTool, currentDragX, tracks]
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
    <div 
      ref={containerRef} 
      className="virtual-timeline-canvas"
      style={{
        '--tw': `${timelineWidth}px`,
        '--th': `${totalHeight}px`,
        '--vth': `${rowVirtualizer.getTotalSize()}px`
      } as React.CSSProperties}
    >
      {/* Canvas for drawing static elements (grid, playhead, etc.) */}
      <div className="static-overlay-canvas-wrapper">
        <canvas
          ref={overlayCanvasRef}
          width={timelineWidth}
          height={totalHeight}
          className="overlay-canvas"
        />
      </div>
      
      {/* Virtual list of tracks */}
      <div className="timeline-track-list-container">
        {/* Render all visible tracks (fallback for test environment) */}
        {rowVirtualizer.getVirtualItems().length === 0 && visibleTracks.map((track, index) => {
          const trackLayers = getTrackShots(shots, track.type);
          
          return (
            <div
              key={track.id}
              className="virtual-track-row"
              style={{
                '--rh': `${track.height}px`,
                '--ry': `${visibleTracks.slice(0, index).reduce((sum, t) => sum + t.height, 0)}px`,
              } as React.CSSProperties}
            >
              <div
                id={`track-container-${track.id}`}
                className="track-canvas-container"
              >
                <canvas
                  ref={(el) => {
                    if (el) canvasRefs.current.set(track.id, el);
                    else canvasRefs.current.delete(track.id);
                  }}
                  className={`track-canvas tool-${activeTool}`}
                  width={timelineWidth}
                  height={track.height}
                  onMouseDown={(e) => handleMouseDown(e, track)}
                  onMouseMove={(e) => handleMouseMove(e, track)}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onDoubleClick={(e) => handleDoubleClick(e, track)}
                  style={{
                    width: timelineWidth,
                    height: track.height,
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
                '--rh': `${track.height}px`,
                '--ry': `${virtualItem.start}px`,
              } as React.CSSProperties}
            >
              <div
                id={`track-container-${track.id}`}
                className="track-canvas-container"
              >
                <canvas
                  ref={(el) => {
                    if (el) canvasRefs.current.set(track.id, el);
                    else canvasRefs.current.delete(track.id);
                  }}
                  className={`track-canvas tool-${activeTool}`}
                  width={timelineWidth}
                  height={track.height}
                  onMouseDown={(e) => handleMouseDown(e, track)}
                  onMouseMove={(e) => handleMouseMove(e, track)}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onDoubleClick={(e) => handleDoubleClick(e, track)}
                  style={{
                    width: timelineWidth,
                    height: track.height,
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
