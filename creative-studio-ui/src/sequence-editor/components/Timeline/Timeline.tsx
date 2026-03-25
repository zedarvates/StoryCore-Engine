/**
 * Timeline Component - Multi-track Editing Canvas with Virtual Scrolling
 * 
 * Professional multi-track timeline with virtual scrolling for performance,
 * supporting media, audio, effects, transitions, text, and keyframe tracks.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 4.1, 4.2, 4.3, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7
 */

import React, { useCallback, useRef, useEffect, useState, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '@/sequence-editor/store';
import {
  setPlayheadPosition,
  setZoomLevel,
  selectElement,
  addTrack,
  updateTrack,
  toggleTrackLock,
  toggleTrackHidden,
  setSelectedElements,
  addShot,
  reorderTracks,
  updateShot,
  splitShot,
  reorderShots,
  deleteShot,
} from '@/sequence-editor/store/slices/timelineSlice';
import type { Track, Shot, LayerType, Layer, MediaLayerData } from '@/sequence-editor/types';
import type { VideoExtensionOptions, SpeechConfigOptions } from '@/sequence-editor/hooks/useTimelineInteractions';
import { handleShotSplit } from '@/sequence-editor/utils/toolInteractions';
import { VirtualTimelineCanvas } from './VirtualTimelineCanvas';
import { Reorder } from 'framer-motion';
import { setActivePanel, setShotConfigTarget } from '../../store/slices/panelsSlice';
import { TrackHeader } from './TrackHeader';
import { PlayheadIndicator } from './PlayheadIndicator';
import { TimelineControls } from './TimelineControls';
import { TimeRuler } from './TimeRuler';
import { TimelineContextMenu } from './TimelineContextMenu';
import { VideoExtensionDialog } from './VideoExtensionDialog';
import { SpeechConfigDialog } from './SpeechConfigDialog';
import { Film, GripVertical, Plus, Layout, Image as ImageIcon, Video as VideoIcon, Edit } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { videoEditorAPI } from '@/services/videoEditorAPI';
import './timeline.css';
import './timelineDialogs.css';

// ============================================================================
// Constants
// ============================================================================

const TRACK_DEFAULTS: Record<LayerType, { color: string; icon: string; height: number }> = {
  media: { color: '#4A90E2', icon: 'film', height: 60 },
  audio: { color: '#50C878', icon: 'volume', height: 40 },
  effects: { color: '#9B59B6', icon: 'magic', height: 40 },
  transitions: { color: '#E67E22', icon: 'shuffle', height: 30 },
  text: { color: '#F39C12', icon: 'text', height: 40 },
  keyframes: { color: '#E74C3C', icon: 'key', height: 30 },
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 100;
const TRACK_HEADERS_WIDTH = 200;

// ============================================================================
// Component
// ============================================================================

export const Timeline: React.FC = () => {
  const dispatch = useAppDispatch();
  const timelineRef = useRef<HTMLDivElement>(null);
  const contentAreaRef = useRef<HTMLDivElement>(null);

  const {
    projectId,
    shots,
    tracks,
    playheadPosition,
    zoomLevel,
    selectedElements,
    duration,
  } = useAppSelector((state) => state.timeline);

  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const [hoveredTrackId, setHoveredTrackId] = useState<string | null>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [viewMode, setViewMode] = useState<'timeline' | 'storyboard'>('timeline');
  const [draggingTrackIndex, setDraggingTrackIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const snapToGrid = true;

  // ============================================================================
  // CALCULATED VALUES (must be before callbacks that use them)
  // ============================================================================

  // Calculate timeline width based on zoom and duration
  const timelineWidth: number = useMemo(
    () => Math.max(duration * zoomLevel + 200, containerWidth),
    [duration, zoomLevel, containerWidth]
  );

  // Calculate total tracks height
  const totalTracksHeight: number = useMemo(
    () => tracks.reduce((sum: number, track: Track) => sum + (track.hidden ? 0 : track.height), 0),
    [tracks]
  );

  // ============================================================================
  // SNAPPING & SELECTION STATES
  // ============================================================================

  // Selection box state for marquee selection
  const [selectionBox, setSelectionBox] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    active: boolean;
  } | null>(null);

  // Shot dragging state
  const [draggingShotId, setDraggingShotId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [snappedPosition, setSnappedPosition] = useState<number | null>(null);

  // ============================================================================
  // SNAPPING LOGIC
  // ============================================================================

  /**
   * Calculate snapped position based on grid and nearby shots
   */
  const calculateSnappedPosition = useCallback((position: number): number => {
    if (!snapToGrid) return position;

    const frame = position / zoomLevel;
    const snappedFrame = Math.round(frame);
    let snappedPos = snappedFrame * zoomLevel;

    // Check proximity to other shots for magnetic snapping
    const SNAP_THRESHOLD_FRAMES = 5; // Snap within 5 frames
    const SNAP_THRESHOLD_PIXELS = SNAP_THRESHOLD_FRAMES * zoomLevel;

    for (const shot of shots) {
      if (shot.id === draggingShotId) continue;

      const shotStart = shot.startTime * zoomLevel;
      const shotEnd = (shot.startTime + shot.duration) * zoomLevel;

      // Snap to shot start
      if (Math.abs(position - shotStart) < SNAP_THRESHOLD_PIXELS) {
        snappedPos = shotStart;
        break;
      }

      // Snap to shot end
      if (Math.abs(position - shotEnd) < SNAP_THRESHOLD_PIXELS) {
        snappedPos = shotEnd;
        break;
      }
    }

    return snappedPos;
  }, [snapToGrid, zoomLevel, shots, draggingShotId]);



  // ============================================================================
  // SELECTION BOX HANDLERS
  // ============================================================================

  const handleSelectionBoxMouseDown = useCallback((e: React.MouseEvent) => {
    // Only start selection if clicking on empty area (not on a shot)
    if ((e.target as HTMLElement).closest('.timeline-shot')) return;

    const rect = contentAreaRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left + scrollLeft;
    const y = e.clientY - rect.top + scrollTop;

    setSelectionBox({
      startX: x,
      startY: y,
      currentX: x,
      currentY: y,
      active: true,
    });
  }, [scrollLeft, scrollTop]);

  const handleSelectionBoxMouseMove = useCallback((e: React.MouseEvent) => {
    if (!selectionBox?.active) return;

    const rect = contentAreaRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left + scrollLeft;
    const y = e.clientY - rect.top + scrollTop;

    setSelectionBox(prev => prev ? { ...prev, currentX: x, currentY: y } : null);
  }, [selectionBox, scrollLeft, scrollTop]);

  const handleSelectionBoxMouseUp = useCallback(() => {
    if (!selectionBox?.active) return;

    // Calculate selection bounds
    const minX = Math.min(selectionBox.startX, selectionBox.currentX);
    const maxX = Math.max(selectionBox.startX, selectionBox.currentX);
    const minY = Math.min(selectionBox.startY, selectionBox.currentY);
    const maxY = Math.max(selectionBox.startY, selectionBox.currentY);

    // Find all shots within selection box
    const selectedIds: string[] = [];

    for (const shot of shots) {
      const shotLeft = shot.startTime * zoomLevel;
      const shotRight = (shot.startTime + shot.duration) * zoomLevel;
      const shotCenterY = totalTracksHeight / 2; // Simplified Y check

      // Check if shot intersects with selection box
      if (shotRight > minX && shotLeft < maxX && shotCenterY > minY && shotCenterY < maxY) {
        selectedIds.push(shot.id);
      }
    }

    // Update selection
    if (selectedIds.length > 0) {
      dispatch(setSelectedElements(selectedIds));
    } else {
      dispatch(setSelectedElements([]));
    }

    setSelectionBox(null);
  }, [selectionBox, shots, zoomLevel, totalTracksHeight, dispatch]);

  // ============================================================================
  // ZOOM AND PAN HANDLERS
  // ============================================================================

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      // Adjust zoom level (1% = 0.1, max 1000% = 100)
      const zoomDelta = e.deltaY > 0 ? -1 : 1;
      const newZoom = Math.max(0.1, Math.min(100, zoomLevel + zoomDelta));
      dispatch(setZoomLevel(newZoom));
    }
  }, [zoomLevel, dispatch]);

  const handleContainerMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1) { // Middle mouse button
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  }, []);

  const handleContainerMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning && timelineRef.current) {
      const deltaX = panStart.x - e.clientX;
      const deltaY = panStart.y - e.clientY;
      timelineRef.current.scrollLeft += deltaX;
      timelineRef.current.scrollTop += deltaY;
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  }, [isPanning, panStart]);

  const handleContainerMouseUp = useCallback((e: React.MouseEvent) => {
    if (e.button === 1) {
      setIsPanning(false);
    }
  }, []);

  // ============================================================================
  // SHOT DRAG HANDLERS
  // ============================================================================



  const handleShotDragMove = useCallback((e: React.MouseEvent) => {
    if (!draggingShotId) return;

    const rect = contentAreaRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left + scrollLeft - dragOffset;
    const snapped = calculateSnappedPosition(x);
    setSnappedPosition(snapped);
  }, [draggingShotId, dragOffset, scrollLeft, calculateSnappedPosition]);

  const handleShotDragEnd = useCallback(() => {
    if (!draggingShotId || snappedPosition === null) return;

    const newStartFrame = Math.round(snappedPosition / zoomLevel);
    const shot = shots.find((s: Shot) => s.id === draggingShotId);

    if (shot && newStartFrame !== shot.startTime) {
      dispatch(updateShot({
        id: draggingShotId,
        updates: { startTime: newStartFrame }
      }));
    }

    setDraggingShotId(null);
    setDragOffset(0);
    setSnappedPosition(null);
  }, [draggingShotId, snappedPosition, zoomLevel, shots, dispatch]);

  // Setup global mouse handlers for shot dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (draggingShotId) {
        handleShotDragMove(e as unknown as React.MouseEvent);
      }
    };

    const handleMouseUp = () => {
      if (draggingShotId) {
        handleShotDragEnd();
      }
    };

    if (draggingShotId) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingShotId, handleShotDragMove, handleShotDragEnd, zoomLevel]);

  // ============================================================================
  // KEYBOARD SHORTCUTS FOR SELECTION
  // ============================================================================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+A: Select all
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        const allShotIds = shots.map((s: Shot) => s.id);
        dispatch(setSelectedElements(allShotIds));
      }

      // Escape: Deselect all
      if (e.key === 'Escape') {
        dispatch(setSelectedElements([]));
      }

      // Delete/Backspace: Delete selected
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElements.length > 0) {
        // Implement delete logic here
        console.log('Delete selected shots:', selectedElements);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shots, selectedElements, dispatch]);

  // Handle playhead drag start
  const handlePlayheadMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingPlayhead(true);
  }, []);

  // Handle playhead drag start callback
  const handlePlayheadDragStart = useCallback(() => {
    setIsDraggingPlayhead(true);
  }, []);

  // Handle playhead drag end callback
  const handlePlayheadDragEnd = useCallback(() => {
    setIsDraggingPlayhead(false);
  }, []);

  // Handle playhead position change during drag
  const handlePlayheadDrag = useCallback((clientX: number) => {
    if (!timelineRef.current) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const trackLeft = rect.left + TRACK_HEADERS_WIDTH;
    const x = clientX - trackLeft + scrollLeft;

    // Calculate frame from position
    const frame = Math.max(0, Math.round(x / zoomLevel));

    // Snap to nearest frame
    dispatch(setPlayheadPosition(frame));
  }, [dispatch, zoomLevel, scrollLeft]);

  // Handle playhead drag end
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingPlayhead) {
        handlePlayheadDrag(e.clientX);
      }
    };

    const handleMouseUp = () => {
      if (isDraggingPlayhead) {
        setIsDraggingPlayhead(false);
      }
    };

    if (isDraggingPlayhead) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingPlayhead, handlePlayheadDrag]);

  // Handle timeline click for playhead positioning (click-to-seek)
  const handleTimelineClick = useCallback((e: React.MouseEvent) => {
    if (isDraggingPlayhead) return;

    if (!timelineRef.current) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const trackLeft = rect.left + TRACK_HEADERS_WIDTH;
    const x = e.clientX - trackLeft + scrollLeft;

    // Calculate frame from position
    let frame = x / zoomLevel;

    // Apply snap to grid if enabled
    if (snapToGrid) {
      frame = Math.round(frame);
    } else {
      frame = Math.floor(frame);
    }

    frame = Math.max(0, frame);

    dispatch(setPlayheadPosition(frame));
  }, [dispatch, zoomLevel, scrollLeft, isDraggingPlayhead, snapToGrid]);

  // Handle ruler seek (click-to-seek on ruler)
  const handleRulerSeek = useCallback((frame: number) => {
    dispatch(setPlayheadPosition(frame));
  }, [dispatch]);

  // Handle zoom
  const handleZoomChange = useCallback((newZoom: number) => {
    dispatch(setZoomLevel(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom))));
  }, [dispatch]);

  // Handle track lock toggle
  const handleTrackLockToggle = useCallback((trackId: string) => {
    dispatch(toggleTrackLock(trackId));
  }, [dispatch]);

  // Handle track hide toggle
  const handleTrackHideToggle = useCallback((trackId: string) => {
    dispatch(toggleTrackHidden(trackId));
  }, [dispatch]);

  // Handle track resize
  const handleTrackResize = useCallback((trackId: string, newHeight: number) => {
    dispatch(updateTrack({ id: trackId, updates: { height: newHeight } }));
  }, [dispatch]);

  // Handle track reordering
  const handleTrackReorder = useCallback((fromIndex: number, toIndex: number) => {
    const newTracks = [...tracks];
    const [movedTrack] = newTracks.splice(fromIndex, 1);
    newTracks.splice(toIndex, 0, movedTrack);
    dispatch(reorderTracks(newTracks));
    setDraggingTrackIndex(null);
    setDropTargetIndex(null);
  }, [dispatch, tracks]);

  // Handle audio track mute/solo
  const handleAudioMuteToggle = useCallback((trackId: string) => {
    // This would update audio track state - implemented via track metadata
    console.log('Mute toggle for track:', trackId);
  }, []);

  const handleAudioSoloToggle = useCallback((trackId: string) => {
    // This would update audio track state - implemented via track metadata
    console.log('Solo toggle for track:', trackId);
  }, []);

  // Handle layer selection


  // Handle shot selection (wrapper for layer selection)
  const handleShotSelect = useCallback((shotId: string, multiSelect: boolean) => {
    if (multiSelect) {
      if (selectedElements.includes(shotId)) {
        dispatch(setSelectedElements(selectedElements.filter((id: string) => id !== shotId)));
      } else {
        dispatch(setSelectedElements([...selectedElements, shotId]));
      }
    } else {
      dispatch(selectElement(shotId));
    }
  }, [dispatch, selectedElements]);

  // Handle shot add
  const handleAddShot = useCallback((atPlayhead: boolean = false) => {
    const newShotId = `shot-${Date.now()}`;
    
    // Determine start time: either at playhead or at the very end
    const insertTime = atPlayhead ? playheadPosition : (
      shots.length > 0
        ? shots.reduce((max, s) => Math.max(max, s.startTime + s.duration), 0)
        : 0
    );

    const newShot: Shot = {
      id: newShotId,
      name: `Shot ${shots.length + 1}`,
      startTime: insertTime,
      duration: 120, // 5 seconds at 24fps
      layers: [
        {
          id: `layer-${Date.now()}`,
          type: 'media',
          startTime: 0,
          duration: 120,
          locked: false,
          hidden: false,
          opacity: 1,
          blendMode: 'normal',
          data: {
            sourceUrl: '',
            trim: { start: 0, end: 120 },
            transform: {
              position: { x: 0, y: 0 },
              scale: { x: 1, y: 1 },
              rotation: 0,
              anchor: { x: 0.5, y: 0.5 },
            },
          } as MediaLayerData,
        }
      ],
      referenceImages: [],
      prompt: '',
      parameters: {
        seed: Math.floor(Math.random() * 1000000),
        denoising: 0.7,
        steps: 30,
        guidance: 7.5,
        sampler: 'euler',
        scheduler: 'normal',
      },
      generationStatus: 'pending',
    };

    if (atPlayhead && shots.length > 0) {
      // Ripple effect: shift all shots that start after or at the insert point
      const shiftedShots = shots.map(s => {
        if (s.startTime >= insertTime) {
          return { ...s, startTime: s.startTime + 120 };
        }
        // If the playhead is INSIDE a shot, we might want to split it, 
        // but for now let's just shift shots that are AFTER the insert point.
        return s;
      });
      
      dispatch(addShot(newShot));
      // Re-sort and update all start times to ensure consistency
      const allShots = [...shiftedShots, newShot].sort((a, b) => a.startTime - b.startTime);
      
      // Enforce continuity if needed
      let currentTime = 0;
      const rippled = allShots.map(s => {
        const updated = { ...s, startTime: currentTime };
        currentTime += s.duration;
        return updated;
      });
      
      dispatch(reorderShots(rippled));
    } else {
      dispatch(addShot(newShot));
    }
  }, [dispatch, shots, playheadPosition]);

  // Handle track add
  const handleAddTrack = useCallback((type: LayerType) => {
    const trackId = `track-${Date.now()}`;
    const defaults = TRACK_DEFAULTS[type];

    dispatch(addTrack({
      id: trackId,
      type,
      height: defaults.height,
      locked: false,
      hidden: false,
      color: defaults.color,
      icon: defaults.icon,
    }));
  }, [dispatch]);

  // Handle shot splitting
  const handleSplit = useCallback(() => {
    const shotAtPlayhead = shots.find((s: Shot) =>
      playheadPosition >= s.startTime &&
      playheadPosition < (s.startTime + s.duration)
    );

    if (shotAtPlayhead) {
      const splitResult = handleShotSplit(shotAtPlayhead.id, playheadPosition, shots);
      if (splitResult) {
        dispatch(splitShot({
          shotId: shotAtPlayhead.id,
          leftShot: splitResult.newShots[0],
          rightShot: splitResult.newShots[1]
        }));
      }
    }
  }, [shots, playheadPosition, dispatch]);

  // Handle auto-mixing
  const handleAutoMix = useCallback(() => {
    const audioLayers = shots.flatMap((s: Shot) => s.layers.filter((l: Layer) => l.type === 'audio'));
    if (audioLayers.length === 0) {
      alert('No audio layers found to mix!');
      return;
    }

    console.log('[Timeline] Triggering Auto-Mix for', audioLayers.length, 'audio layers');
    // In a real implementation, this would call the backend API
    alert('AI Auto-Mix triggered! Analyzing audio levels and applying ducking...');
  }, [shots]);

  // Handle shot deletion
  const handleDeleteShot = useCallback(() => {
    let shotIdsToDelete: string[] = [];

    if (selectedElements.length > 0) {
      shotIdsToDelete = selectedElements.filter(id => shots.some(s => s.id === id));
    } else {
      // Find shot at playhead
      const shotAtPlayhead = shots.find(s => 
        playheadPosition >= s.startTime && 
        playheadPosition < (s.startTime + s.duration)
      );
      if (shotAtPlayhead) {
        shotIdsToDelete = [shotAtPlayhead.id];
      }
    }

    if (shotIdsToDelete.length > 0) {
      if (confirm(`Delete ${shotIdsToDelete.length} shot(s)?`)) {
        // Simple ripple for now - could be improved based on editor mode
        shotIdsToDelete.forEach(id => dispatch(deleteShot(id)));
        console.log('[Timeline] Deleted shots:', shotIdsToDelete);
      }
    } else {
      alert('Select a shot or place playhead over a shot to delete.');
    }
  }, [selectedElements, shots, playheadPosition, dispatch]);

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    setScrollLeft(target.scrollLeft);
    setScrollTop(target.scrollTop);
  }, []);

  // Update container dimensions on resize
  useEffect(() => {
    const updateContainerDimensions = () => {
      if (timelineRef.current) {
        setContainerWidth(timelineRef.current.clientWidth - TRACK_HEADERS_WIDTH);
      }
    };

    updateContainerDimensions();
    window.addEventListener('resize', updateContainerDimensions);

    return () => window.removeEventListener('resize', updateContainerDimensions);
  }, []);

  // Render track headers with controls
  const renderTrackHeaders = useCallback(() => {
    return (
      <Reorder.Group
        axis="y"
        values={tracks}
        onReorder={(newTracks) => dispatch(reorderTracks(newTracks))}
        className="timeline-track-list"
      >
        {tracks.map((track: Track, index: number) => (
          <TrackHeader
            key={track.id}
            track={track}
            index={index}
            isHovered={hoveredTrackId === track.id}
            isDragging={draggingTrackIndex === index}
            isDropTarget={dropTargetIndex === index}
            onHover={(id: string | null) => setHoveredTrackId(id)}
            onLockToggle={() => handleTrackLockToggle(track.id)}
            onHideToggle={() => handleTrackHideToggle(track.id)}
            onResize={(newHeight) => handleTrackResize(track.id, newHeight)}
            onReorder={handleTrackReorder}
            onMuteToggle={() => handleAudioMuteToggle(track.id)}
            onSoloToggle={() => handleAudioSoloToggle(track.id)}
          />
        ))}
      </Reorder.Group>
    );
  }, [tracks, hoveredTrackId, draggingTrackIndex, dropTargetIndex, handleTrackLockToggle, handleTrackHideToggle, handleTrackResize, handleTrackReorder, handleAudioMuteToggle, handleAudioSoloToggle, dispatch]);

  // Handle shot reordering within the storyboard
  const handleShotReorder = useCallback((newShots: Shot[]) => {
    // Update start times to maintain sequence if they were contiguous
    let currentTime = 0;
    const isContiguous = shots.length > 1 && 
      shots.every((s, i) => i === 0 || s.startTime === shots[i-1].startTime + shots[i-1].duration);

    const updatedShots = newShots.map(shot => {
      const updated = isContiguous ? { ...shot, startTime: currentTime } : shot;
      if (isContiguous) currentTime += shot.duration;
      return updated;
    });

    dispatch(reorderShots(updatedShots));
  }, [shots, dispatch]);

  // Render storyboard view for easy reordering
  const renderStoryboardView = () => {
    return (
      <div className="storyboard-view p-6 bg-background/50 overflow-y-auto h-full">
        <div className="storyboard-header mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Layout className="w-5 h-5 text-primary" />
              Storyboard Editor
            </h2>
            <p className="text-sm text-muted-foreground">Drag and drop shots to reorder the sequence</p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="px-3 py-1">
              {shots.length} Shots
            </Badge>
          </div>
        </div>

        <Reorder.Group
          axis="y"
          values={shots}
          onReorder={handleShotReorder}
          className="storyboard-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        >
          {shots.map((shot, index) => (
            <Reorder.Item
              key={shot.id}
              value={shot}
              className={`storyboard-item group relative bg-secondary/30 rounded-xl border border-white/10 overflow-hidden hover:border-primary/50 transition-all cursor-grab active:cursor-grabbing ${selectedElements.includes(shot.id) ? 'border-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]' : ''}`}
              whileHover={{ scale: 1.02, y: -4 }}
              whileDrag={{ scale: 1.05, boxShadow: "0 20px 40px rgba(0,0,0,0.5)", zIndex: 100 }}
              onClick={(e) => {
                e.stopPropagation();
                handleShotSelect(shot.id, e.ctrlKey || e.metaKey);
              }}
            >
              <div className="aspect-video bg-black/40 relative">
                {/* Visual Linking: Show generated map or fallback to first reference image */}
                {(shot.outputPath || (shot.referenceImages && shot.referenceImages.length > 0)) ? (
                  <img 
                    src={shot.outputPath || shot.referenceImages[0].url} 
                    alt={shot.name} 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-secondary/50 to-background">
                    <Film className="w-12 h-12 text-muted-foreground opacity-20" />
                  </div>
                )}
                <div className="absolute top-2 left-2 flex gap-1">
                  <Badge className="bg-black/60 backdrop-blur-md border-none text-[10px]">
                    #{index + 1}
                  </Badge>
                  <Badge variant="secondary" className="bg-primary/80 backdrop-blur-md border-none text-[10px]">
                    {(shot.duration / 24).toFixed(1)}s
                  </Badge>
                </div>
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShotSelect(shot.id, false);
                      dispatch(setActivePanel('shotConfig'));
                      dispatch(setShotConfigTarget(shot.id));
                    }}
                    className="p-1.5 bg-black/60 backdrop-blur-md rounded-md hover:bg-primary/80 text-white transition-colors"
                    title="Edit Shot Config"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <div className="p-1.5 bg-black/60 backdrop-blur-md rounded-md text-white/50">
                    <GripVertical className="w-4 h-4" />
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-white/5 bg-secondary/20">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-sm truncate pr-2 m-0 text-white/90">{shot.name}</h4>
                </div>
                {/* Linked Prompt View */}
                <div className="space-y-2">
                   <div className="flex items-start gap-2">
                      <ImageIcon size={12} className="text-primary mt-1 shrink-0" />
                      <p className="text-[11px] leading-tight text-foreground/80 line-clamp-3 italic bg-black/20 p-2 rounded border border-white/5 w-full m-0">
                        {shot.prompt || <span className="text-muted-foreground/50 opacity-50">No image prompt linked...</span>}
                      </p>
                   </div>
                   {shot.animationPrompt && (
                     <div className="flex items-start gap-2">
                        <VideoIcon size={12} className="text-orange-400 mt-1 shrink-0" />
                        <p className="text-[11px] leading-tight text-foreground/60 line-clamp-2 m-0">
                          {shot.animationPrompt}
                        </p>
                     </div>
                   )}
                </div>
              </div>
            </Reorder.Item>
          ))}
          
          <button
            onClick={() => handleAddShot(false)}
            className="storyboard-add-btn border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center p-8 hover:border-primary/50 hover:bg-primary/5 transition-all text-muted-foreground hover:text-primary min-h-[200px]"
          >
            <Plus className="w-8 h-8 mb-2 opacity-50" />
            <span className="text-sm font-medium">Add New Shot</span>
          </button>
        </Reorder.Group>
      </div>
    );
  };

  // Sample shots logic removed as it caused duplicate key errors.
  // Use project shots directly.


  // Render time ruler using TimeRuler component
  const renderTimeRuler = useCallback(() => {
    return (
      <TimeRuler
        zoomLevel={zoomLevel}
        duration={duration}
        fps={24}
        snapToGrid={snapToGrid}
        playheadPosition={playheadPosition}
        onSeek={handleRulerSeek}
      />
    );
  }, [zoomLevel, duration, snapToGrid, playheadPosition, handleRulerSeek]);


  // ============================================================================
  // DIALOG STATES
  // ============================================================================

  const [contextMenuState, setContextMenuState] = useState<{
    position: { x: number; y: number } | null;
    target: LayerType | 'shot' | 'track' | 'timeline' | null;
    shotId: string | null;
    layerId: string | null;
  }>({
    position: null,
    target: null,
    shotId: null,
    layerId: null,
  });

  const [videoExtensionState, setVideoExtensionState] = useState<{
    isOpen: boolean;
    shotId: string | null;
    layerId: string | null;
  }>({
    isOpen: false,
    shotId: null,
    layerId: null,
  });

  const [speechConfigState, setSpeechConfigState] = useState<{
    isOpen: boolean;
    shotId: string | null;
    layerId: string | null;
    currentConfig?: SpeechConfigOptions;
    existingText?: string;
  }>({
    isOpen: false,
    shotId: null,
    layerId: null,
  });

  // ============================================================================
  // CONTEXT MENU HANDLERS
  // ============================================================================

  // Note: handleOpenContextMenu can be passed to child components for right-click menu support
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleOpenContextMenu = useCallback(
    (
      position: { x: number; y: number },
      target: string,
      shotId?: string,
      layerId?: string
    ) => {
      setContextMenuState({
        position,
        target: target as LayerType | 'shot' | 'track' | 'timeline',
        shotId: shotId || null,
        layerId: layerId || null,
      });
    },
    []
  );

  const handleContextMenuAction = useCallback(
    (action: string, data?: { shotId?: string; layerId?: string }) => {
      const shotId = data?.shotId || contextMenuState.shotId;
      const layerId = data?.layerId || contextMenuState.layerId;

      switch (action) {
        case 'extendVideo':
        case 'extendFreeze':
        case 'extendLoop':
        case 'extendAI':
          if (shotId) {
            // Mode determined by action type
            setVideoExtensionState({
              isOpen: true,
              shotId,
              layerId,
            });
          }
          break;

        case 'configureSpeech':
        case 'selectCharacter':
        case 'changeVoice':
          if (shotId) {
            setSpeechConfigState({
              isOpen: true,
              shotId,
              layerId,
            });
          }
          break;

        case 'delete':
          if (shotId) {
            console.log('[Timeline] Delete shot:', shotId);
            // Implement delete logic
          }
          break;

        case 'split':
          handleSplit();
          break;

        default:
          console.log('[Timeline] Context menu action:', action, { shotId, layerId });
      }

      setContextMenuState({ position: null, target: null, shotId: null, layerId: null });
    },
    [contextMenuState, handleSplit]
  );

  // ============================================================================
  // VIDEO EXTENSION HANDLER
  // ============================================================================

  const handleVideoExtension = useCallback(
    async (options: VideoExtensionOptions) => {
      const { shotId } = videoExtensionState;
      if (!shotId) return;

      const shot = shots.find((s) => s.id === shotId);
      if (!shot) return;

      console.log('[Timeline] Video extension:', { shotId, options });

      if (options.mode === 'extend-ai') {
        const mediaLayer = shot.layers.find(l => l.type === 'media') as (Layer & { data: MediaLayerData });
        const sourceVideoUrl = mediaLayer?.data?.sourceUrl || '';

        try {
          // Trigger the AI extension on the backend
          const result = await videoEditorAPI.extendVideo(
            projectId,
            shotId,
            sourceVideoUrl,
            {
              extensionDuration: options.duration / 24, // Assuming 24fps
              workflow: 'smart_vision_ltx2_i2v_unlimited_length_gguf', // cspell:ignore gguf
            }
          );

          console.log('[Timeline] AI Extension result:', result);
          
          dispatch(
            updateShot({
              id: shotId,
              updates: {
                generationStatus: 'processing',
              },
            })
          );
        } catch (error) {
          console.error('[Timeline] AI Extension failed:', error);
        }
      } else {
        // Fallback for non-AI modes (freeze-frame, loop, etc.)
        dispatch(
          updateShot({
            id: shotId,
            updates: {
              duration: shot.duration + options.duration,
            },
          })
        );
      }

      setVideoExtensionState({ isOpen: false, shotId: null, layerId: null });
    },
    [videoExtensionState, shots, dispatch, projectId]
  );

  // ============================================================================
  // SPEECH CONFIG HANDLER
  // ============================================================================

  const handleSpeechConfigApply = useCallback(
    (config: SpeechConfigOptions, text?: string) => {
      const { shotId, layerId } = speechConfigState;
      if (!shotId) return;

      console.log('[Timeline] Speech config:', { shotId, layerId, config, text });

      // Update the shot layer with speech configuration
      const shot = shots.find((s) => s.id === shotId);
      if (shot && layerId) {
        const updatedLayers = shot.layers.map((layer) => {
          if (layer.id === layerId) {
            return {
              ...layer,
              data: {
                ...layer.data,
                text: text || '',
                characterId: config.characterId,
                characterName: config.characterName,
                ttsMethod: config.ttsMethod,
                voiceId: config.voiceId,
                speed: config.speed,
                pitch: config.pitch,
                emotion: config.emotion,
                volume: 1,
              },
            };
          }
          return layer;
        });

        dispatch(
          updateShot({
            id: shotId,
            updates: { layers: updatedLayers },
          })
        );
      }

      setSpeechConfigState({ isOpen: false, shotId: null, layerId: null });
    },
    [speechConfigState, shots, dispatch]
  );

  return (
    <div className="timeline-panel">
      {/* Timeline Controls */}
      <TimelineControls
        zoomLevel={zoomLevel}
        onZoomChange={handleZoomChange}
        onAddTrack={handleAddTrack}
        onAddShot={(atPlayhead) => handleAddShot(!!atPlayhead)}
        onDeleteShot={handleDeleteShot}
        playheadPosition={playheadPosition}
        duration={duration}
        onSplit={handleSplit}
        onAutoMix={handleAutoMix}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Timeline Container / Storyboard View Selection */}
      <div
        ref={timelineRef}
        className={`timeline-container ${isPanning ? 'panning' : ''} ${viewMode === 'storyboard' ? 'storyboard-active' : ''}`}
        onClick={viewMode === 'timeline' ? handleTimelineClick : undefined}
        onScroll={viewMode === 'timeline' ? handleScroll : undefined}
        onWheel={viewMode === 'timeline' ? handleWheel : undefined}
        onMouseDown={viewMode === 'timeline' ? handleContainerMouseDown : undefined}
        onMouseMove={viewMode === 'timeline' ? handleContainerMouseMove : undefined}
        onMouseUp={viewMode === 'timeline' ? handleContainerMouseUp : undefined}
        onMouseLeave={viewMode === 'timeline' ? handleContainerMouseUp : undefined}
      >
        {viewMode === 'storyboard' ? (
          renderStoryboardView()
        ) : (
          <>
            {/* Track Headers */}
            <div className="timeline-track-headers">
              <div className="timeline-ruler-spacer" />
              {renderTrackHeaders()}
            </div>

            {/* Timeline Content Area */}
            <div
              ref={contentAreaRef}
              className="timeline-content-area"
              onMouseDown={handleSelectionBoxMouseDown}
              onMouseMove={handleSelectionBoxMouseMove}
              onMouseUp={handleSelectionBoxMouseUp}
            >
              {/* Time Ruler */}
              {renderTimeRuler()}

              {/* Track Content */}
              <VirtualTimelineCanvas
                tracks={tracks}
                shots={shots}
                zoomLevel={zoomLevel}
                playheadPosition={playheadPosition}
                selectedElements={selectedElements}
                timelineWidth={timelineWidth}
                onShotSelect={handleShotSelect}
                onShotMove={(shotId, newStartTime) => {
                  const shotIndex = shots.findIndex(s => s.id === shotId);
                  if (shotIndex === -1) return;

                  // Simple move for now, but check if we need to reorder
                  // Sort shots by start time to detect relative order change
                  const sortedShots = [...shots].sort((a, b) => a.startTime - b.startTime);
                  
                  // Update the dragged shot's start time
                  const updatedShots = shots.map(s => s.id === shotId ? { ...s, startTime: newStartTime } : s);
                  
                  // Resort based on new start times
                  const newlySorted = [...updatedShots].sort((a, b) => a.startTime - b.startTime);
                  
                  // Check if order changed
                  const orderChanged = newlySorted.some((s, i) => s.id !== sortedShots[i].id);
                  
                  if (orderChanged) {
                    // Ripple effect: if they were contiguous, keep them contiguous
                    let currentTime = 0;
                    const rippleShots = newlySorted.map(s => {
                      const updated = { ...s, startTime: currentTime };
                      currentTime += s.duration;
                      return updated;
                    });
                    dispatch(reorderShots(rippleShots));
                  }
                }}
                onShotResize={(shotId, newDuration, edge) => {
                  const currentShot = shots.find(s => s.id === shotId);
                  if (!currentShot) return;
                  
                  const isProlonged = newDuration > currentShot.duration;
                  const currentEnd = currentShot.startTime + currentShot.duration;
                  const newStartTime = edge === 'start' ? currentEnd - newDuration : currentShot.startTime;
                  
                  const updatedShots = shots.map(s => s.id === shotId ? { ...s, duration: newDuration, startTime: Math.max(0, newStartTime) } : s);
                  const sorted = [...updatedShots].sort((a, b) => a.startTime - b.startTime);
                  
                  let currentTime = 0;
                  const rippleShots = sorted.map(s => {
                    const updated = { ...s, startTime: currentTime };
                    currentTime += s.duration;
                    return updated;
                  });
                  
                  dispatch(reorderShots(rippleShots));

                  // Trigger prolongation workflow if the shot was lengthened and contains media
                  if (isProlonged && currentShot.layers.some(l => l.type === 'media')) {
                    setVideoExtensionState({
                      isOpen: true,
                      shotId,
                      layerId: currentShot.layers.find(l => l.type === 'media')?.id || null,
                    });
                  }
                }}
              />

              {/* Playhead Indicator */}
              <PlayheadIndicator
                position={playheadPosition * zoomLevel}
                height={totalTracksHeight}
                zoomLevel={zoomLevel}
                fps={24}
                isDragging={isDraggingPlayhead}
                isPlaying={false}
                snapToGrid={snapToGrid}
                onMouseDown={handlePlayheadMouseDown}
                onPositionChange={(frame) => dispatch(setPlayheadPosition(frame))}
                onDragStart={handlePlayheadDragStart}
                onDragEnd={handlePlayheadDragEnd}
              />
            </div>
          </>
        )}
      </div>

      {/* Context Menu */}
      <TimelineContextMenu
        position={contextMenuState.position}
        target={contextMenuState.target}
        shotId={contextMenuState.shotId || undefined}
        layerId={contextMenuState.layerId || undefined}
        onClose={() => setContextMenuState({ position: null, target: null, shotId: null, layerId: null })}
        onAction={handleContextMenuAction}
      />

      {/* Video Extension Dialog */}
      <VideoExtensionDialog
        isOpen={videoExtensionState.isOpen}
        shotId={videoExtensionState.shotId || ''}
        shot={shots.find((s) => s.id === videoExtensionState.shotId)}
        currentDuration={shots.find((s) => s.id === videoExtensionState.shotId)?.duration || 0}
        onApply={handleVideoExtension}
        onClose={() => setVideoExtensionState({ isOpen: false, shotId: null, layerId: null })}
      />

      {/* Speech Config Dialog */}
      <SpeechConfigDialog
        isOpen={speechConfigState.isOpen}
        shotId={speechConfigState.shotId || ''}
        layerId={speechConfigState.layerId || ''}
        currentConfig={speechConfigState.currentConfig}
        existingText={speechConfigState.existingText}
        onApply={handleSpeechConfigApply}
        onClose={() => setSpeechConfigState({ isOpen: false, shotId: null, layerId: null })}
      />
    </div>
  );
};

// ============================================================================
// Utility Functions
// ============================================================================



export default Timeline;

