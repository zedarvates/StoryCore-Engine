/**
 * Timeline Interaction Handler
 * 
 * Handles mouse interactions on the timeline based on the active tool.
 * Integrates with toolInteractions utility to perform tool-specific operations.
 * 
 * Requirements: 2.4, 10.1-10.10
 */

import React, { useCallback, useState, useRef, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  updateShot,
  deleteShot,
  addShot,
  setSelectedElements,
} from '../../store/slices/timelineSlice';
import type { Shot, Layer, ToolType } from '../../types';
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
}

// ============================================================================
// Component
// ============================================================================

export const TimelineInteractionHandler: React.FC<TimelineInteractionHandlerProps> = ({
  children,
  zoomLevel,
  onShotSelect,
}) => {
  const dispatch = useAppDispatch();
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { activeTool } = useAppSelector((state) => state.tools);
  const { shots, playheadPosition, selectedElements } = useAppSelector((state) => state.timeline);
  
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    shotId: null,
    startX: 0,
    startFrame: 0,
    edge: null,
    initialDuration: 0,
    initialStartTime: 0,
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
      const result = handleShotMove(shotId, deltaFrames, shots);
      if (result) {
        dispatch(updateShot({
          id: result.shotId,
          updates: { startTime: result.newStartTime },
        }));
      }
    } else {
      // Click to select
      const newSelection = handleSelectTool(shotId, multiSelect, selectedElements);
      dispatch(setSelectedElements(newSelection));
      onShotSelect(shotId, multiSelect);
    }
  }, [shots, selectedElements, dispatch, onShotSelect]);
  
  /**
   * Handle Trim Tool interactions
   */
  const handleTrimToolInteraction = useCallback((
    shotId: string,
    edge: 'start' | 'end',
    deltaFrames: number
  ) => {
    const result = handleShotTrim(shotId, edge, deltaFrames, shots);
    if (result) {
      const updates: Partial<Shot> = { duration: result.newDuration };
      if (result.newStartTime !== undefined) {
        updates.startTime = result.newStartTime;
      }
      dispatch(updateShot({ id: result.shotId, updates }));
      
      // Show duration tooltip
      setTooltipText(`Duration: ${result.newDuration} frames`);
      setShowDurationTooltip(true);
    }
  }, [shots, dispatch]);
  
  /**
   * Handle Cut/Split Tool interactions
   */
  const handleCutToolInteraction = useCallback((
    shotId: string,
    splitFrame: number
  ) => {
    const result = handleShotSplit(shotId, splitFrame, shots);
    if (result) {
      // Delete original shot
      dispatch(deleteShot(result.originalShotId));
      
      // Add two new shots
      dispatch(addShot(result.newShots[0]));
      dispatch(addShot(result.newShots[1]));
      
      // Select the right shot
      dispatch(setSelectedElements([result.newShots[1].id]));
    }
  }, [shots, dispatch]);
  
  /**
   * Handle Ripple Edit Tool interactions
   */
  const handleRippleToolInteraction = useCallback((
    shotId: string,
    edge: 'start' | 'end',
    deltaFrames: number
  ) => {
    const result = handleRippleEdit(shotId, edge, deltaFrames, shots);
    if (result) {
      // Update the trimmed shot
      dispatch(updateShot({
        id: result.shotId,
        updates: { duration: result.newDuration },
      }));
      
      // Update affected shots
      result.affectedShots.forEach((affected: { shotId: string; newStartTime: number }) => {
        dispatch(updateShot({
          id: affected.shotId,
          updates: { startTime: affected.newStartTime },
        }));
      });
      
      setTooltipText(`Ripple: ${result.affectedShots.length} shots affected`);
      setShowDurationTooltip(true);
    }
  }, [shots, dispatch]);
  
  /**
   * Handle Roll Edit Tool interactions
   */
  const handleRollToolInteraction = useCallback((
    leftShotId: string,
    rightShotId: string,
    deltaFrames: number
  ) => {
    const result = handleRollEdit(leftShotId, rightShotId, deltaFrames, shots);
    if (result) {
      // Update left shot
      dispatch(updateShot({
        id: result.leftShotId,
        updates: { duration: result.leftNewDuration },
      }));
      
      // Update right shot
      dispatch(updateShot({
        id: result.rightShotId,
        updates: {
          startTime: result.rightNewStartTime,
          duration: result.rightNewDuration,
        },
      }));
      
      setTooltipText(`Roll: Junction adjusted`);
      setShowDurationTooltip(true);
    }
  }, [shots, dispatch]);
  
  /**
   * Handle Slip Edit Tool interactions
   */
  const handleSlipToolInteraction = useCallback((
    shotId: string,
    deltaFrames: number
  ) => {
    const result = handleSlipEdit(shotId, deltaFrames, shots);
    if (result) {
      const shot = shots.find((s: Shot) => s.id === shotId);
      if (shot) {
        const updatedLayers = shot.layers.map((layer: Layer) => {
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
        
        dispatch(updateShot({
          id: shotId,
          updates: { layers: updatedLayers },
        }));
        
        setTooltipText(`Slip: Content adjusted`);
        setShowDurationTooltip(true);
      }
    }
  }, [shots, dispatch]);
  
  /**
   * Handle Slide Edit Tool interactions
   */
  const handleSlideToolInteraction = useCallback((
    shotId: string,
    deltaFrames: number
  ) => {
    const result = handleSlideEdit(shotId, deltaFrames, shots);
    if (result) {
      // Update the slid shot
      dispatch(updateShot({
        id: result.shotId,
        updates: { startTime: result.newStartTime },
      }));
      
      // Update affected shots
      result.affectedShots.forEach((affected: { shotId: string; newStartTime: number }) => {
        dispatch(updateShot({
          id: affected.shotId,
          updates: { startTime: affected.newStartTime },
        }));
      });
      
      setTooltipText(`Slide: ${result.affectedShots.length} shots adjusted`);
      setShowDurationTooltip(true);
    }
  }, [shots, dispatch]);
  
  /**
   * Handle Transition Tool interactions
   */
  const handleTransitionToolInteraction = useCallback((
    shotId: string
  ) => {
    const shot = shots.find((s) => s.id === shotId);
    if (!shot) return;
    
    const { left, right } = findAdjacentShots(shotId, shots);
    
    if (left && shot) {
      // Add transition between left and current shot
      const result = handleAddTransition(left.id, shotId, 'fade', 30, shots);
      if (result) {
        const updatedShot = shots.find((s) => s.id === result.shotId);
        if (updatedShot) {
          dispatch(updateShot({
            id: result.shotId,
            updates: {
              layers: [...updatedShot.layers, result.layer],
            },
          }));
        }
      }
    } else if (right) {
      // Add transition between current and right shot
      const result = handleAddTransition(shotId, right.id, 'fade', 30, shots);
      if (result) {
        const updatedShot = shots.find((s) => s.id === result.shotId);
        if (updatedShot) {
          dispatch(updateShot({
            id: result.shotId,
            updates: {
              layers: [...updatedShot.layers, result.layer],
            },
          }));
        }
      }
    }
  }, [shots, dispatch]);
  
  /**
   * Handle Text Tool interactions
   */
  const handleTextToolInteraction = useCallback((
    clickFrame: number
  ) => {
    const shot = findShotAtFrame(clickFrame, shots);
    if (!shot) return;
    
    const result = handleAddText(shot.id, clickFrame, shots);
    if (result) {
      // Add the new text layer to the shot
      dispatch(updateShot({
        id: result.shotId,
        updates: {
          layers: [...shot.layers, result.layer],
        },
      }));
      
      // Select the newly created text layer for editing
      // This will make the TextEditor panel show the new layer
      const store = require('../../store').store;
      const state = store.getState();
      
      // Log for debugging
      console.log('Text layer added:', {
        layerId: result.layer.id,
        shotId: result.shotId,
        content: (result.layer.data as any).content
      });
      
      // In a full implementation, we would:
      // 1. Set the selected text layer in the store
      // 2. Open the text editor panel
      // 3. Show a toast notification
      
      // For now, dispatch a notification action if it exists
      try {
        // Try to set the text layer as selected if the action exists
        const { setSelectedTextLayer } = require('../../store/slices/textLayersSlice');
        if (setSelectedTextLayer) {
          dispatch(setSelectedTextLayer(result.layer.id));
        }
      } catch (e) {
        // Action doesn't exist, ignore
      }
    }
  }, [shots, dispatch]);
  
  /**
   * Handle Keyframe Tool interactions
   */
  const handleKeyframeToolInteraction = useCallback((
    clickFrame: number
  ) => {
    const shot = findShotAtFrame(clickFrame, shots);
    if (!shot) return;
    
    // Default to opacity property
    const result = handleAddKeyframe(shot.id, clickFrame, 'opacity', 1.0, shots);
    if (result) {
      const existingLayerIndex = shot.layers.findIndex((l) => l.id === result.layer.id);
      
      if (existingLayerIndex !== -1) {
        // Update existing layer
        const updatedLayers = [...shot.layers];
        updatedLayers[existingLayerIndex] = result.layer;
        
        dispatch(updateShot({
          id: result.shotId,
          updates: { layers: updatedLayers },
        }));
      } else {
        // Add new layer
        dispatch(updateShot({
          id: result.shotId,
          updates: {
            layers: [...shot.layers, result.layer],
          },
        }));
      }
      
      console.log('Keyframe added at frame', clickFrame);
    }
  }, [shots, dispatch]);
  
  // ============================================================================
  // Mouse Event Handlers
  // ============================================================================
  
  const handleMouseDown = useCallback((e: React.MouseEvent, shotId: string, shotLeft: number, shotWidth: number) => {
    e.stopPropagation();
    
    const shot = shots.find((s) => s.id === shotId);
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
          });
        }
        break;
      
      case 'roll':
        if (edge === 'end') {
          const { right } = findAdjacentShots(shotId, shots);
          if (right) {
            setDragState({
              isDragging: true,
              shotId: `${shotId}|${right.id}`, // Store both IDs
              startX: e.clientX,
              startFrame: shot.startTime,
              edge: 'end',
              initialDuration: shot.duration,
              initialStartTime: shot.startTime,
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
        if (dragState.edge) {
          handleTrimToolInteraction(dragState.shotId, dragState.edge, deltaFrames);
        }
        break;
      
      case 'ripple':
        if (dragState.edge) {
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
    setDragState({
      isDragging: false,
      shotId: null,
      startX: 0,
      startFrame: 0,
      edge: null,
      initialDuration: 0,
      initialStartTime: 0,
    });
    
    // Hide tooltip after a delay
    setTimeout(() => {
      setShowDurationTooltip(false);
    }, 1000);
  }, []);
  
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
      {children}
      
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
