/**
 * Timeline Component - Multi-track Editing Canvas with Virtual Scrolling
 * 
 * Professional multi-track timeline with virtual scrolling for performance,
 * supporting media, audio, effects, transitions, text, and keyframe tracks.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 4.1, 4.2, 4.3, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7
 */

import React, { useCallback, useRef, useEffect, useState, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
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
} from '../../store/slices/timelineSlice';
import type { Track, Shot, LayerType, Layer, MediaLayerData } from '../../types';
import { VirtualTimelineCanvas } from './VirtualTimelineCanvas';
import { TrackHeader, TRACK_CONFIG } from './TrackHeader';
import { PlayheadIndicator } from './PlayheadIndicator';
import { TimelineControls } from './TimelineControls';
import { TimeRuler } from './TimeRuler';
import './timeline.css';

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

const DEFAULT_ZOOM = 10; // pixels per frame
const MIN_ZOOM = 1;
const MAX_ZOOM = 100;
const PLAYHEAD_SNAP_THRESHOLD = 5; // pixels
const TRACK_HEADERS_WIDTH = 200;

// ============================================================================
// Component
// ============================================================================

export const Timeline: React.FC = () => {
  const dispatch = useAppDispatch();
  const timelineRef = useRef<HTMLDivElement>(null);
  const contentAreaRef = useRef<HTMLDivElement>(null);
  
  const {
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
  const [containerHeight, setContainerHeight] = useState(0);
  const [useVirtualMode, setUseVirtualMode] = useState(true);
  const [draggingTrackIndex, setDraggingTrackIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const [snapToGrid, setSnapToGrid] = useState(true);

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
  const [isSnapping, setIsSnapping] = useState(false);

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
        setIsSnapping(true);
        break;
      }

      // Snap to shot end
      if (Math.abs(position - shotEnd) < SNAP_THRESHOLD_PIXELS) {
        snappedPos = shotEnd;
        setIsSnapping(true);
        break;
      }
    }

    if (Math.abs(snappedPos - position) > SNAP_THRESHOLD_PIXELS) {
      setIsSnapping(false);
    }

    return snappedPos;
  }, [snapToGrid, zoomLevel, shots, draggingShotId]);

  /**
   * Get all snap points (grid lines and shot boundaries)
   */
  const getSnapPoints = useCallback((): number[] => {
    const points: number[] = [];

    if (snapToGrid) {
      // Add grid snap points
      const gridInterval = zoomLevel; // Snap to frames
      for (let x = 0; x < timelineWidth; x += gridInterval) {
        points.push(x);
      }
    }

    // Add shot boundaries as snap points
    for (const shot of shots) {
      if (shot.id === draggingShotId) continue;
      points.push(shot.startTime * zoomLevel);
      points.push((shot.startTime + shot.duration) * zoomLevel);
    }

    return points;
  }, [snapToGrid, zoomLevel, shots, draggingShotId, timelineWidth]);

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
  // SHOT DRAG HANDLERS
  // ============================================================================

  const handleShotDragStart = useCallback((shotId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const shot = shots.find((s: Shot) => s.id === shotId);
    if (!shot) return;

    const rect = contentAreaRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left + scrollLeft;
    setDragOffset(x - shot.startTime * zoomLevel);
    setDraggingShotId(shotId);
    setSnappedPosition(shot.startTime * zoomLevel);
  }, [shots, scrollLeft]);

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
    setIsSnapping(false);
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
  }, [draggingShotId, handleShotDragMove, handleShotDragEnd]);

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
  const handleLayerSelect = useCallback((shotId: string, layerId: string, multiSelect: boolean) => {
    // For now, treat layer selection same as shot selection
    // In the future, this could be expanded to support multi-level selection
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
        setContainerHeight(timelineRef.current.clientHeight - 30);
      }
    };
    
    updateContainerDimensions();
    window.addEventListener('resize', updateContainerDimensions);
    
    return () => window.removeEventListener('resize', updateContainerDimensions);
  }, []);

  // Render track headers with controls
  const renderTrackHeaders = useCallback(() => {
    return tracks.map((track: Track, index: number) => (
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
        zoomLevel={zoomLevel}
      />
    ));
  }, [tracks, hoveredTrackId, draggingTrackIndex, dropTargetIndex, handleTrackLockToggle, handleTrackHideToggle, handleTrackResize, handleTrackReorder, handleAudioMuteToggle, handleAudioSoloToggle, zoomLevel]);

  // Add sample shots for demonstration
  useEffect(() => {
    if (shots.length === 0) {
      const sampleShots: Shot[] = [
        {
          id: 'shot-1',
          name: 'Opening Scene',
          startTime: 0,
          duration: 120, // 4 seconds at 30fps
          layers: [
            {
              id: 'layer-1',
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
          prompt: 'A beautiful sunset over mountains',
          parameters: {
            seed: 12345,
            denoising: 0.7,
            steps: 30,
            guidance: 7.5,
            sampler: 'euler',
            scheduler: 'normal',
          },
          generationStatus: 'pending',
        },
        {
          id: 'shot-2',
          name: 'Character Introduction',
          startTime: 120,
          duration: 90, // 3 seconds at 30fps
          layers: [
            {
              id: 'layer-2',
              type: 'media',
              startTime: 0,
              duration: 90,
              locked: false,
              hidden: false,
              opacity: 1,
              blendMode: 'normal',
              data: {
                sourceUrl: '',
                trim: { start: 0, end: 90 },
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
          prompt: 'A person walking through a forest',
          parameters: {
            seed: 67890,
            denoising: 0.7,
            steps: 30,
            guidance: 7.5,
            sampler: 'euler',
            scheduler: 'normal',
          },
          generationStatus: 'pending',
        },
        {
          id: 'shot-3',
          name: 'Action Sequence',
          startTime: 210,
          duration: 150, // 5 seconds at 30fps
          layers: [
            {
              id: 'layer-3',
              type: 'media',
              startTime: 0,
              duration: 150,
              locked: false,
              hidden: false,
              opacity: 1,
              blendMode: 'normal',
              data: {
                sourceUrl: '',
                trim: { start: 0, end: 150 },
                transform: {
                  position: { x: 0, y: 0 },
                  scale: { x: 1, y: 1 },
                  rotation: 0,
                  anchor: { x: 0.5, y: 0.5 },
                },
              } as MediaLayerData,
            },
            {
              id: 'layer-4',
              type: 'audio',
              startTime: 0,
              duration: 150,
              locked: false,
              hidden: false,
              opacity: 1,
              blendMode: 'normal',
              data: {
                sourceUrl: '',
                volume: 0.8,
                fadeIn: 0,
                fadeOut: 0,
              },
            }
          ],
          referenceImages: [],
          prompt: 'Epic battle scene with explosions',
          parameters: {
            seed: 11111,
            denoising: 0.7,
            steps: 30,
            guidance: 7.5,
            sampler: 'euler',
            scheduler: 'normal',
          },
          generationStatus: 'pending',
        },
      ];

      sampleShots.forEach((shot) => {
        dispatch(addShot(shot));
      });
    }
  }, [shots.length, dispatch]);

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

  // Filter visible tracks for virtual mode
  const visibleTracks: Track[] = useMemo(
    () => tracks.filter((track: Track) => !track.hidden),
    [tracks]
  );

  return (
    <div className="timeline-panel">
      {/* Timeline Controls */}
      <TimelineControls
        zoomLevel={zoomLevel}
        onZoomChange={handleZoomChange}
        onAddTrack={handleAddTrack}
        playheadPosition={playheadPosition}
        duration={duration}
        onToggleVirtualMode={() => setUseVirtualMode(!useVirtualMode)}
        useVirtualMode={useVirtualMode}
      />
      
      {/* Timeline Container */}
      <div
        ref={timelineRef}
        className="timeline-container"
        onClick={handleTimelineClick}
        onScroll={handleScroll}
      >
        {/* Track Headers */}
        <div className="timeline-track-headers">
          <div className="timeline-ruler-spacer" />
          {renderTrackHeaders()}
        </div>
        
        {/* Timeline Content Area */}
        <div
          ref={contentAreaRef}
          className="timeline-content-area"
        >
          {/* Time Ruler */}
          {renderTimeRuler()}
          
          {/* Track Content */}
          {useVirtualMode ? (
            /* Virtual Scrolling Mode */
            <VirtualTimelineCanvas
              tracks={tracks}
              shots={shots}
              zoomLevel={zoomLevel}
              playheadPosition={playheadPosition}
              selectedElements={selectedElements}
              timelineWidth={timelineWidth}
              onShotSelect={handleShotSelect}
            />
          ) : (
            /* DOM-based Rendering Mode (Legacy) */
            <div
              className="timeline-tracks-area"
              style={{ width: timelineWidth, height: totalTracksHeight }}
            >
              {visibleTracks.map((track: Track) => (
                <div
                  key={track.id}
                  className="timeline-track-row"
                  style={{ height: track.height }}
                >
                  {shots
                    .filter((shot: Shot) => shot.layers.some((layer: Layer) => layer.type === track.type))
                    .map((shot: Shot) => {
                      const isSelected = selectedElements.includes(shot.id);
                      const shotLeft = shot.startTime * zoomLevel;
                      const shotWidth = shot.duration * zoomLevel;
                      
                      return (
                        <div
                          key={`${track.id}-${shot.id}`}
                          className={`timeline-shot ${isSelected ? 'selected' : ''}`}
                          style={{
                            left: `${shotLeft}px`,
                            width: `${shotWidth}px`,
                            height: '28px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShotSelect(shot.id, e.ctrlKey || e.metaKey);
                          }}
                        >
                          <div
                            className="shot-content"
                            style={{
                              backgroundColor: track.color,
                              opacity: isSelected ? 1 : 0.8,
                            }}
                          >
                            <span className="shot-name">{shot.name}</span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              ))}
            </div>
          )}
          
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
      </div>
    </div>
  );
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format frame number to timecode string (MM:SS:FF)
 */
function formatTimecode(frame: number, fps: number = 24): string {
  const totalSeconds = Math.floor(frame / fps);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60);
  const frames = frame % fps;
  
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
}

export default Timeline;

