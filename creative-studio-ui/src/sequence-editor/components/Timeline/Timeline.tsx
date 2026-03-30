/**
 * Timeline Component - Multi-track Editing Canvas with Unified Grid Scroll
 * 
 * Professional multi-track timeline using a single-container scroll system (5.2)
 * for perfect alignment between track headers, rulers, and the editing canvas.
 */

import React, { useCallback, useRef, useMemo, useEffect, useState } from 'react';
import { useProjectHistory } from '@/hooks/useUndoRedo';
import { useProjectStore } from '@/stores/useProjectStore';
import { useShallow } from 'zustand/react/shallow';
import { useDrop } from 'react-dnd';
import { DND_ITEM_TYPES, type DraggedAssetItem } from '../AssetLibrary/DraggableAsset';
import { v4 as uuidv4 } from 'uuid';
import { generateImage } from '@/services/imageGenerationService';

import type { Track, LayerType, Shot } from '@/sequence-editor/types';
import { VirtualTimelineCanvas } from './VirtualTimelineCanvas';
import { Reorder } from 'framer-motion';
import { TrackHeader } from './TrackHeader';
import { PlayheadIndicator } from './PlayheadIndicator';
import { TimeRuler } from './TimeRuler';
import { TimelineControls } from './TimelineControls';
import { Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

import './timeline.css';
import './timelineDialogs.css';

// ============================================================================
// Component
// ============================================================================

interface TimelineProps {
  onShotDoubleClick?: (shotId: string) => void;
}

export const Timeline: React.FC<TimelineProps> = ({ onShotDoubleClick }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const contentAreaRef = useRef<HTMLDivElement>(null);
  const { undo, redo } = useProjectHistory();
  
  // Unified Store Integration (Audit Task 21)
  const { 
    shots, 
    tracks, 
    playheadPosition, 
    zoomLevel, 
    selectedElements, 
    duration,
    activeTool,
    setZoomLevel,
    setCurrentTime,
    toggleRippleEdit,
    toggleSnapToGrid,
    toggleMagneticTimeline,
    rippleMode,
    snapMode,
    magneticMode,
    addShot,
    updateShot,
    deleteShot,
    addTrack,
    updateTrack,
    reorderTracks,
    toggleTrackLock,
    toggleTrackHidden,
    rippleEdit,
    rollEdit,
    slipEdit,
    slideEdit,
    setSelectedElements
  } = useProjectStore(useShallow(state => ({
    shots: state.shots,
    tracks: state.tracks,
    playheadPosition: state.currentTime,
    zoomLevel: state.zoomLevel,
    selectedElements: state.selectedElements,
    duration: state.timelineDuration,
    activeTool: state.activeTool,
    setZoomLevel: state.setZoomLevel,
    setCurrentTime: state.setCurrentTime,
    toggleRippleEdit: state.toggleRippleEdit,
    toggleSnapToGrid: state.toggleSnapToGrid,
    toggleMagneticTimeline: state.toggleMagneticTimeline,
    rippleMode: state.rippleMode,
    snapMode: state.snapMode,
    magneticMode: state.magneticMode,
    addShot: state.addShot,
    updateShot: state.updateShot,
    deleteShot: state.deleteShot,
    addTrack: state.addTrack,
    updateTrack: state.updateTrack,
    reorderTracks: state.reorderTracks,
    toggleTrackLock: state.toggleTrackLock,
    toggleTrackHidden: state.toggleTrackHidden,
    rippleEdit: state.rippleEdit,
    rollEdit: state.rollEdit,
    slipEdit: state.slipEdit,
    slideEdit: state.slideEdit,
    setSelectedElements: state.setSelectedElements
  })));

  const [hoveredTrackId, setHoveredTrackId] = useState<string | null>(null);
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);

  const timelineRulerRef = useRef<HTMLDivElement>(null);

  // Capture scroll container element after mount
  useEffect(() => {
    if (scrollContainerRef.current) {
      setScrollEl(scrollContainerRef.current);
    }
  }, []);


  // D&D Drop Logic
  const [{ isOver, canDrop }, drop] = useDrop<DraggedAssetItem, void, { isOver: boolean; canDrop: boolean }>(() => ({
    accept: DND_ITEM_TYPES.ASSET,
    drop: (item, monitor) => {
      const offset = monitor.getClientOffset();
      if (!offset || !contentAreaRef.current) return;

      const rect = contentAreaRef.current.getBoundingClientRect();
      const relativeX = offset.x - rect.left + (scrollContainerRef.current?.scrollLeft || 0);
      
      const startTime = Math.max(0, Math.floor(relativeX / zoomLevel));
      
      addShot({
        id: uuidv4(),
        name: item.asset.name,
        startTime,
        position: startTime,
        duration: 120, // 5 seconds
        layers: [],
        referenceImages: [],
        prompt: '',
        parameters: {
          seed: -1, denoising: 0.75, steps: 20, guidance: 7, sampler: 'DPM++ 2M Karras', scheduler: 'karras'
        },
        generationStatus: 'pending'
      } as Shot);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }), [zoomLevel, addShot]);

  // Calculations
  const totalTracksHeight = useMemo(() => tracks.reduce((sum, t) => sum + (t.height || 40), 0), [tracks]);
  const timelineWidth = useMemo(() => Math.max(2000, duration * zoomLevel + 500), [duration, zoomLevel]);

  useEffect(() => {
    if (timelineRulerRef.current) {
      timelineRulerRef.current.style.setProperty('--timeline-w', `${timelineWidth}px`);
    }
    if (contentAreaRef.current) {
      contentAreaRef.current.style.setProperty('--timeline-w', `${timelineWidth}px`);
    }
  }, [timelineWidth]);
  
  const timecode = useMemo(() => {
    const totalSeconds = Math.floor(playheadPosition / 24);
    return {
      hours: String(Math.floor(totalSeconds / 3600)).padStart(2, '0'),
      minutes: String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0'),
      seconds: String(totalSeconds % 60).padStart(2, '0'),
      frames: String(playheadPosition % 24).padStart(2, '0')
    };
  }, [playheadPosition]);

  // Handlers
  const handlePlayheadMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const initialFrame = playheadPosition;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaFrames = Math.round(deltaX / zoomLevel);
      const newFrame = Math.max(0, initialFrame + deltaFrames);
      setCurrentTime(newFrame);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [playheadPosition, zoomLevel, setCurrentTime]);

  const handleRulerSeek = useCallback((frame: number) => {
    setCurrentTime(frame);
  }, [setCurrentTime]);

  const handleShotMove = useCallback((shotId: string, newStartTime: number) => {
    updateShot(shotId, { startTime: newStartTime });
  }, [updateShot]);

  const handleShotResize = useCallback((shotId: string, newDuration: number, edge: 'start' | 'end') => {
    const shot = shots.find(s => s.id === shotId);
    if (!shot) return;

    if (activeTool === 'ripple' || rippleMode) {
       const delta = newDuration - shot.duration;
       rippleEdit({ shotId, delta, edge });
       return;
    }

    if (edge === 'start') {
      const delta = shot.duration - newDuration;
      updateShot(shotId, { 
        startTime: shot.startTime + delta,
        duration: newDuration 
      });
    } else {
      updateShot(shotId, { duration: newDuration });
    }
  }, [shots, activeTool, rippleMode, updateShot, rippleEdit]);

  const handleShotRoll = useCallback((shotAId: string, shotBId: string, delta: number) => {
    rollEdit({ shotAId, shotBId, delta });
  }, [rollEdit]);

  const handleShotSlip = useCallback((shotId: string, delta: number) => {
    slipEdit({ shotId, delta });
  }, [slipEdit]);

  const handleShotSlide = useCallback((shotId: string, delta: number) => {
    slideEdit({ shotId, delta });
  }, [slideEdit]);

  const handleShotGenerate = useCallback(async (shotId: string) => {
    const shot = shots.find(s => s.id === shotId);
    if (!shot) return;

    updateShot(shotId, { generationStatus: 'processing' });

    try {
      const imageUrl = await generateImage({
        prompt: shot.prompt || 'cinematic shot',
        width: 1024,
        height: 1024,
        steps: 20,
        cfgScale: 7,
        sampler: 'euler',
        scheduler: 'normal',
        workflowType: 'z_image_turbo'
      });

      updateShot(shotId, { 
        outputPath: imageUrl, 
        generationStatus: 'complete' 
      });
    } catch (error) {
      console.error('Generation failed:', error);
      updateShot(shotId, { generationStatus: 'error' });
    }
  }, [shots, updateShot]);

  const handleGenerateAll = useCallback(async () => {
    const shotsToGenerate = shots.filter(s => s.generationStatus !== 'complete');
    for (const shot of shotsToGenerate) {
      await handleShotGenerate(shot.id);
    }
  }, [shots, handleShotGenerate]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
        return;
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElements.length > 0) {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        e.preventDefault();
        selectedElements.forEach(id => deleteShot(id));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElements, deleteShot, undo, redo]);

  const handleToggleLock = useCallback((id: string) => toggleTrackLock(id), [toggleTrackLock]);
  const handleToggleHide = useCallback((id: string) => toggleTrackHidden(id), [toggleTrackHidden]);
  const handleTrackResize = useCallback((id: string, height: number) => updateTrack(id, { height }), [updateTrack]);
  const handleTrackReorder = useCallback((newTracks: Track[]) => reorderTracks(newTracks), [reorderTracks]);
  const handleAddTrack = useCallback((type: LayerType) => {
      addTrack({
          id: uuidv4(),
          type,
          height: 60,
          locked: false,
          hidden: false,
          color: '#4A90E2',
          icon: 'film'
      });
  }, [addTrack]);

  return (
    <div className="timeline-container" ref={scrollContainerRef}>
      <TimelineControls 
        zoomLevel={zoomLevel}
        onZoomChange={setZoomLevel}
        onAddTrack={handleAddTrack}
        playheadPosition={playheadPosition}
        duration={duration}
        snapToGrid={snapMode}
        onToggleSnapToGrid={toggleSnapToGrid}
        rippleEdit={rippleMode}
        onToggleRippleEdit={toggleRippleEdit}
        magneticTimeline={magneticMode}
        onToggleMagneticTimeline={toggleMagneticTimeline}
        onAddShot={(atPlayhead) => {
          const startTime = atPlayhead ? playheadPosition : (shots.length > 0 ? Math.max(...shots.map(s => s.startTime + s.duration)) : 0);
          addShot({
            id: uuidv4(),
            name: `Shot ${shots.length + 1}`,
            startTime,
            position: startTime,
            duration: 120,
            layers: [],
            referenceImages: [],
            prompt: '',
            parameters: {
              seed: -1, denoising: 0.75, steps: 20, guidance: 7, sampler: 'DPM++ 2M Karras', scheduler: 'karras'
            },
            generationStatus: 'pending'
          } as Shot);
        }}
        onDeleteShot={() => {
          selectedElements.forEach(id => deleteShot(id));
        }}
        onSplit={() => {}}
        onAutoMix={() => {}}
      />
      <div className="timeline-layout">
        {/* Row 1, Col 1: Sticky Corner */}
        <div className="timeline-sticky-corner">
          <div className="timeline-timecode-display">
            <span className="timecode-value">
              {timecode.hours}:{timecode.minutes}:{timecode.seconds}
              <span className="frames">:{timecode.frames}</span>
            </span>
            <span className="timecode-label">PROD-TIMECODE</span>
          </div>
          <div className="track-header-top">
            <Badge variant="outline" className="px-1 py-0 text-[10px] opacity-40 font-bold tracking-tighter">TRACKS</Badge>
            <button className="add-track-btn" onClick={() => handleAddTrack('media')} title="Add Track">
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Row 1, Col 2: Sticky Ruler */}
        <div className="timeline-sticky-ruler">
          <div className="timeline-header-spacer"></div>
          <div className="timeline-ruler-container" ref={timelineRulerRef}>
            <TimeRuler 
              duration={duration} 
              zoomLevel={zoomLevel} 
              onSeek={handleRulerSeek} 
              playheadPosition={playheadPosition} 
            />
          </div>
        </div>

        {/* Row 2, Col 1: Sticky Headers */}
        <div className="timeline-sticky-headers">
          <div className="track-list-scrollable">
            <Reorder.Group axis="y" values={tracks} onReorder={handleTrackReorder} className="timeline-track-list">
              {tracks.map((track, index) => (
                  <TrackHeader
                    key={track.id}
                    track={track}
                    index={index}
                    isHovered={hoveredTrackId === track.id}
                    isDragging={false}
                    isDropTarget={false}
                    onHover={setHoveredTrackId}
                    onLockToggle={() => handleToggleLock(track.id)}
                    onHideToggle={() => handleToggleHide(track.id)}
                    onResize={(newHeight) => handleTrackResize(track.id, newHeight)}
                    onReorder={() => {}}
                  />
              ))}
            </Reorder.Group>
          </div>
        </div>

        {/* Row 2, Col 2: Main Content (Tracks Canvas) */}
        <div className="timeline-main-content">
          <div 
            className={`timeline-content-area ${isOver && canDrop ? 'drop-active' : ''}`}
            ref={(node) => {
               if (node) {
                 contentAreaRef.current = node;
                 drop(node);
                 node.style.setProperty('--timeline-w', `${timelineWidth}px`);
               }
            }}
          >
            <VirtualTimelineCanvas
              tracks={tracks}
              shots={shots}
              zoomLevel={zoomLevel}
              timelineWidth={timelineWidth}
              playheadPosition={playheadPosition}
              selectedElements={selectedElements}
              onShotSelect={(id) => setSelectedElements([id])}
              onShotMove={handleShotMove}
              onShotResize={handleShotResize}
              onShotRoll={handleShotRoll}
              onShotSlip={handleShotSlip}
              onShotSlide={handleShotSlide}
              onShotDoubleClick={onShotDoubleClick}
              onShotGenerate={handleShotGenerate}
              onGenerateAll={handleGenerateAll}
              isPlaying={false} 
              scrollElement={scrollEl}
            />
            
            <PlayheadIndicator 
              position={playheadPosition * zoomLevel} 
              zoomLevel={zoomLevel} 
              height={totalTracksHeight || 400} 
              fps={24}
              isDragging={false}
              isPlaying={false}
              snapToGrid={true}
              onPositionChange={(f) => setCurrentTime(f)}
              onMouseDown={handlePlayheadMouseDown}
              onDragStart={() => {}}
              onDragEnd={() => {}}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
