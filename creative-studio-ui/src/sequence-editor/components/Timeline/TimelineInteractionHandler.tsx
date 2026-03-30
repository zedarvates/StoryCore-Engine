/**
 * Timeline Interaction Handler
 * 
 * Handles mouse interactions on the timeline based on the active tool.
 * Integrates with toolInteractions utility to perform tool-specific operations.
 * 
 * Requirements: 2.4, 10.1-10.10
 */

import React, { useCallback, useState, useRef, useEffect } from 'react';
import { useProjectStore } from '@/stores/useProjectStore';
import { useShallow } from 'zustand/react/shallow';
import { generateId } from '@/utils/idGenerator';
import type { Shot } from '@/types';
import {
  handleSelectTool,
  handleShotMove,
  handleShotTrim,
  handleShotSplit,
  handleRippleEdit,
  handleRollEdit,
  handleSlipEdit,
  handleSlideEdit,
  handleAddTransition,
  handleAddText,
  handleAddKeyframe,
  findShotAtFrame,
  findAdjacentShots,
  getShotEdge,
} from '../../utils/toolInteractions';

// ============================================================================
// Types
// ============================================================================

interface TimelineInteractionHandlerProps {
  children: React.ReactNode;
  zoomLevel: number;
  onShotSelect: (shotId: string, multiSelect: boolean) => void;
}

interface DragState {
  isDragging: boolean;
  shotId: string | null;
  startX: number;
  startFrame: number;
  edge: 'start' | 'end' | 'middle' | null;
  initialDuration: number;
  initialStartTime: number;
  initialShotsSnapshot: Shot[];
}

// ============================================================================
// Component
// ============================================================================

export const TimelineInteractionHandler: React.FC<TimelineInteractionHandlerProps> = ({
  children,
  zoomLevel,
  onShotSelect,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Unified Store (Task 21)
  const { 
    activeTool, 
    shots, 
    playheadPosition, 
    selectedElements,
    updateShot,
    deleteShot,
    addShot,
    setSelectedElements,
    pushHistory
  } = useProjectStore(useShallow((state) => ({
    activeTool: state.activeTool,
    shots: state.shots,
    playheadPosition: state.currentTime,
    selectedElements: state.selectedElements,
    updateShot: state.updateShot,
    deleteShot: state.deleteShot,
    addShot: state.addShot,
    setSelectedElements: state.setSelectedElements,
    pushHistory: state.pushHistory
  })));
  
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    shotId: null,
    startX: 0,
    startFrame: 0,
    edge: null,
    initialDuration: 0,
    initialStartTime: 0,
    initialShotsSnapshot: [],
  });
  
  const [showDurationTooltip, setShowDurationTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [tooltipText, setTooltipText] = useState('');
  
  // ============================================================================
  // Tool-Specific Handlers
  // ============================================================================
  
  /**
   * Handle Select Tool interactions
   */
  const handleSelectToolInteraction = useCallback((
    shotId: string,
    multiSelect: boolean,
    isDrag: boolean,
    deltaFrames: number
  ) => {
    if (isDrag && deltaFrames !== 0) {
      // Drag to move
      const result = handleShotMove(shotId, deltaFrames, shots as any);
      if (result) {
        updateShot(result.shotId, { startTime: result.newStartTime } as any, true);
      }
    } else {
      // Click to select
      const newSelection = handleSelectTool(shotId, multiSelect, selectedElements);
      setSelectedElements(newSelection);
      onShotSelect(shotId, multiSelect);
    }
  }, [shots, selectedElements, updateShot, setSelectedElements, onShotSelect]);
  
  /**
   * Handle Trim Tool interactions
   */
  const handleTrimToolInteraction = useCallback((
    shotId: string,
    edge: 'start' | 'end',
    deltaFrames: number
  ) => {
    const result = handleShotTrim(shotId, edge, deltaFrames, shots as any);
    if (result) {
      const updates: any = { duration: result.newDuration };
      if (result.newStartTime !== undefined) {
        updates.startTime = result.newStartTime;
      }
      updateShot(result.shotId, updates, true);
      
      // Show duration tooltip
      setTooltipText(`Duration: ${result.newDuration} frames`);
      setShowDurationTooltip(true);
    }
  }, [shots, updateShot]);
  
  /**
   * Handle Cut/Split Tool interactions
   */
  const handleCutToolInteraction = useCallback((
    shotId: string,
    splitFrame: number
  ) => {
    const result = handleShotSplit(shotId, splitFrame, shots as any);
    if (result) {
      // Delete original shot
      deleteShot(result.originalShotId);
      
      // Add two new shots
      addShot(result.newShots[0] as any);
      addShot(result.newShots[1] as any);
      
      // Select the right shot
      setSelectedElements([result.newShots[1].id]);
    }
  }, [shots, deleteShot, addShot, setSelectedElements]);
  
  /**
   * Handle Ripple Edit Tool interactions
   */
  const handleRippleToolInteraction = useCallback((
    shotId: string,
    edge: 'start' | 'end',
    deltaFrames: number
  ) => {
    const result = handleRippleEdit(shotId, edge, deltaFrames, shots as any);
    if (result) {
      // Update the trimmed shot
      updateShot(result.shotId, { duration: result.newDuration } as any, true);
      
      // Update affected shots
      result.affectedShots.forEach((affected: { shotId: string; newStartTime: number }) => {
        updateShot(affected.shotId, { startTime: affected.newStartTime } as any, true);
      });
      
      setTooltipText(`Ripple: ${result.affectedShots.length} shots affected`);
      setShowDurationTooltip(true);
    }
  }, [shots, updateShot]);
  
  /**
   * Handle Roll Edit Tool interactions
   */
  const handleRollToolInteraction = useCallback((
    leftShotId: string,
    rightShotId: string,
    deltaFrames: number
  ) => {
    const result = handleRollEdit(leftShotId, rightShotId, deltaFrames, shots as any);
    if (result) {
      // Update left shot
      updateShot(result.leftShotId, { duration: result.leftNewDuration } as any, true);
      
      // Update right shot
      updateShot(result.rightShotId, {
        startTime: result.rightNewStartTime,
        duration: result.rightNewDuration,
      } as any, true);
      
      setTooltipText(`Roll: Junction adjusted`);
      setShowDurationTooltip(true);
    }
  }, [shots, updateShot]);
  
  /**
   * Handle Slip Edit Tool interactions
   */
  const handleSlipToolInteraction = useCallback((
    shotId: string,
    deltaFrames: number
  ) => {
    const result = handleSlipEdit(shotId, deltaFrames, shots as any);
    if (result) {
      const shot = (shots as any[]).find((s: Shot) => s.id === shotId);
      if (shot) {
        const updatedLayers = shot.layers.map((layer: any) => {
          if (layer.type === 'media') {
            return {
              ...layer,
              data: {
                ...layer.data,
                trim: {
                  start: result.newTrimStart,
                  end: result.newTrimEnd,
                },
              },
            };
          }
          return layer;
        });
        
        updateShot(shotId, { layers: updatedLayers } as any, true);
        
        setTooltipText(`Slip: Content adjusted`);
        setShowDurationTooltip(true);
      }
    }
  }, [shots, updateShot]);
  
  /**
   * Handle Slide Edit Tool interactions
   */
  const handleSlideToolInteraction = useCallback((
    shotId: string,
    deltaFrames: number
  ) => {
    const result = handleSlideEdit(shotId, deltaFrames, shots as any);
    if (result) {
      // Update the slid shot
      updateShot(result.shotId, { startTime: result.newStartTime } as any, true);
      
      // Update affected shots
      result.affectedShots.forEach((affected: { shotId: string; newStartTime: number }) => {
        updateShot(affected.shotId, { startTime: affected.newStartTime } as any, true);
      });
      
      setTooltipText(`Slide: ${result.affectedShots.length} shots adjusted`);
      setShowDurationTooltip(true);
    }
  }, [shots, updateShot]);
  
  /**
   * Handle Transition Tool interactions
   */
  const handleTransitionToolInteraction = useCallback((
    shotId: string
  ) => {
    const shot = (shots as any[]).find((s) => s.id === shotId);
    if (!shot) return;
    
    const { left, right } = findAdjacentShots(shotId, shots as any);
    
    if (left && shot) {
      // Add transition between left and current shot
      const result = handleAddTransition(left.id, shotId, 'fade', 30, shots as any);
      if (result) {
        const updatedShot = (shots as any[]).find((s) => s.id === result.shotId);
        if (updatedShot) {
          updateShot(result.shotId, {
            layers: [...updatedShot.layers, result.layer],
          } as any);
        }
      }
    } else if (right) {
      // Add transition between current and right shot
      const result = handleAddTransition(shotId, right.id, 'fade', 30, shots as any);
      if (result) {
        const updatedShot = (shots as any[]).find((s) => s.id === result.shotId);
        if (updatedShot) {
          updateShot(result.shotId, {
            layers: [...updatedShot.layers, result.layer],
          } as any);
        }
      }
    }
  }, [shots, updateShot]);
  
  /**
   * Handle Text Tool interactions
   */
  const handleTextToolInteraction = useCallback((
    clickFrame: number
  ) => {
    const shot = findShotAtFrame(clickFrame, shots as any);
    if (!shot) return;
    
    const result = handleAddText(shot.id, clickFrame, shots as any);
    if (result) {
      // Add the new text layer to the shot
      updateShot(result.shotId, {
        layers: [...shot.layers, result.layer],
      } as any);
      
      // Log for debugging
      console.log('Text layer added:', {
        layerId: result.layer.id,
        shotId: result.shotId,
        content: (result.layer.data as any).content
      });
    }
  }, [shots, updateShot]);
  
  /**
   * Handle Keyframe Tool interactions
   */
  const handleKeyframeToolInteraction = useCallback((
    clickFrame: number
  ) => {
    const shot = findShotAtFrame(clickFrame, shots as any);
    if (!shot) return;
    
    // Default to opacity property
    const result = handleAddKeyframe(shot.id, clickFrame, 'opacity', 1.0, shots as any);
    if (result) {
      const existingLayerIndex = shot.layers.findIndex((l: any) => l.id === result.layer.id);
      
      if (existingLayerIndex !== -1) {
        // Update existing layer
        const updatedLayers = [...shot.layers];
        updatedLayers[existingLayerIndex] = result.layer;
        
        updateShot(result.shotId, { layers: updatedLayers } as any);
      } else {
        // Add new layer
        updateShot(result.shotId, {
          layers: [...shot.layers, result.layer],
        } as any);
      }
      
      console.log('Keyframe added at frame', clickFrame);
    }
  }, [shots, updateShot]);
  
  // ============================================================================
  // Mouse Event Handlers
  // ============================================================================
  
  const handleMouseDown = useCallback((e: React.MouseEvent, shotId: string, shotLeft: number, shotWidth: number) => {
    e.stopPropagation();
    
    const shot = (shots as any[]).find((s) => s.id === shotId);
    if (!shot) return;
    
    const multiSelect = e.ctrlKey || e.metaKey;
    
    // Determine edge for trim/ripple/roll tools
    const edge = getShotEdge(shotId, e.clientX, shotLeft, shotWidth);
    
    // Handle tool-specific interactions
    switch (activeTool) {
      case 'select':
        if (edge === 'middle') {
          // Start drag to move
          setDragState({
            isDragging: true,
            shotId,
            startX: e.clientX,
            startFrame: shot.startTime,
            edge: 'middle',
            initialDuration: shot.duration,
            initialStartTime: shot.startTime,
            initialShotsSnapshot: [...shots],
          });
        } else {
          // Just select
          handleSelectToolInteraction(shotId, multiSelect, false, 0);
        }
        break;
      
      case 'trim':
        if (edge !== 'middle') {
          setDragState({
            isDragging: true,
            shotId,
            startX: e.clientX,
            startFrame: shot.startTime,
            edge,
            initialDuration: shot.duration,
            initialStartTime: shot.startTime,
            initialShotsSnapshot: [...shots],
          });
        }
        break;
      
      case 'cut':
        // Split at playhead
        handleCutToolInteraction(shotId, playheadPosition);
        break;
      
      case 'ripple':
        if (edge !== 'middle') {
          setDragState({
            isDragging: true,
            shotId,
            startX: e.clientX,
            startFrame: shot.startTime,
            edge,
            initialDuration: shot.duration,
            initialStartTime: shot.startTime,
            initialShotsSnapshot: [...shots],
          });
        }
        break;
      
      case 'roll':
        if (edge === 'end') {
          const { right } = findAdjacentShots(shotId, shots as any);
          if (right) {
            setDragState({
              isDragging: true,
              shotId: `${shotId}|${right.id}`,
              startX: e.clientX,
              startFrame: shot.startTime,
              edge: 'end',
              initialDuration: shot.duration,
              initialStartTime: shot.startTime,
              initialShotsSnapshot: [...shots],
            });
          }
        }
        break;
      
      case 'slip':
        if (edge === 'middle') {
          setDragState({
            isDragging: true,
            shotId,
            startX: e.clientX,
            startFrame: shot.startTime,
            edge: 'middle',
            initialDuration: shot.duration,
            initialStartTime: shot.startTime,
            initialShotsSnapshot: [...shots],
          });
        }
        break;
      
      case 'slide':
        if (edge === 'middle') {
          setDragState({
            isDragging: true,
            shotId,
            startX: e.clientX,
            startFrame: shot.startTime,
            edge: 'middle',
            initialDuration: shot.duration,
            initialStartTime: shot.startTime,
            initialShotsSnapshot: [...shots],
          });
        }
        break;
      
      case 'transition':
        handleTransitionToolInteraction(shotId);
        break;
      
      default:
        // Default to select behavior
        handleSelectToolInteraction(shotId, multiSelect, false, 0);
        break;
    }
  }, [
    activeTool,
    shots,
    playheadPosition,
    handleSelectToolInteraction,
    handleCutToolInteraction,
    handleTransitionToolInteraction,
  ]);
  
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState.isDragging || !dragState.shotId) return;
    
    const deltaX = e.clientX - dragState.startX;
    const deltaFrames = Math.round(deltaX / zoomLevel);
    
    if (deltaFrames === 0) return;
    
    // Update tooltip position
    setTooltipPosition({ x: e.clientX + 10, y: e.clientY - 30 });
    
    // Handle tool-specific drag operations
    switch (activeTool) {
      case 'select':
        if (dragState.edge === 'middle') {
          handleSelectToolInteraction(dragState.shotId, false, true, deltaFrames);
        }
        break;
      
      case 'trim':
        if (dragState.edge && dragState.edge !== 'middle') {
          handleTrimToolInteraction(dragState.shotId, dragState.edge, deltaFrames);
        }
        break;
      
      case 'ripple':
        if (dragState.edge && dragState.edge !== 'middle') {
          handleRippleToolInteraction(dragState.shotId, dragState.edge, deltaFrames);
        }
        break;
      
      case 'roll':
        if (dragState.shotId.includes('|')) {
          const [leftId, rightId] = dragState.shotId.split('|');
          handleRollToolInteraction(leftId, rightId, deltaFrames);
        }
        break;
      
      case 'slip':
        handleSlipToolInteraction(dragState.shotId, deltaFrames);
        break;
      
      case 'slide':
        handleSlideToolInteraction(dragState.shotId, deltaFrames);
        break;
    }
  }, [
    dragState,
    zoomLevel,
    activeTool,
    handleSelectToolInteraction,
    handleTrimToolInteraction,
    handleRippleToolInteraction,
    handleRollToolInteraction,
    handleSlipToolInteraction,
    handleSlideToolInteraction,
  ]);
  
  const handleMouseUp = useCallback(() => {
    if (dragState.isDragging) {
      // Manual push to history ONLY IF something actually changed
      const hasChanged = JSON.stringify(dragState.initialShotsSnapshot) !== JSON.stringify(shots);
      
      if (hasChanged) {
        pushHistory({
          id: generateId(),
          timestamp: Date.now(),
          action: `Timeline Edit (${activeTool})`,
          previousState: { shots: dragState.initialShotsSnapshot },
          nextState: { shots: [...shots] }
        });
      }
    }

    setDragState({
      isDragging: false,
      shotId: null,
      startX: 0,
      startFrame: 0,
      edge: null,
      initialDuration: 0,
      initialStartTime: 0,
      initialShotsSnapshot: [],
    });
    
    // Hide tooltip after a delay
    setTimeout(() => {
      setShowDurationTooltip(false);
    }, 1000);
  }, [dragState, shots, activeTool, pushHistory]);
  
  // Handle timeline click for text and keyframe tools
  const handleTimelineClick = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickFrame = Math.round(x / zoomLevel);
    
    switch (activeTool) {
      case 'text':
        handleTextToolInteraction(clickFrame);
        break;
      
      case 'keyframe':
        handleKeyframeToolInteraction(clickFrame);
        break;
    }
  }, [activeTool, zoomLevel, handleTextToolInteraction, handleKeyframeToolInteraction]);
  
  // Set up global mouse event listeners
  useEffect(() => {
    if (dragState.isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragState.isDragging, handleMouseMove, handleMouseUp]);
  
  // ============================================================================
  // Render
  // ============================================================================
  
  return (
    <div
      ref={containerRef}
      className="timeline-interaction-handler"
      onClick={handleTimelineClick}
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as any, { onMouseDown: handleMouseDown });
        }
        return child;
      })}
      
      {/* Duration Tooltip */}
      {showDurationTooltip && (
        <div
          className="timeline-tooltip"
          style={{
            position: 'fixed',
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            pointerEvents: 'none',
            zIndex: 10000,
          }}
        >
          {tooltipText}
        </div>
      )}
    </div>
  );
};

export default TimelineInteractionHandler;
