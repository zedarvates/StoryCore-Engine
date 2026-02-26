/**
 * useTimelineInteractions Hook
 * 
 * Provides advanced interaction handlers for timeline elements including:
 * - Double-click for direct editing
 * - Edge detection for resize operations
 * - Context menu coordination
 * - Video extension handling
 * - TTS/Speech configuration
 * 
 * Requirements: Timeline editing enhancement
 */

import { useCallback, useState, useRef, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import {
  updateShot,
  selectElement,
} from '../store/slices/timelineSlice';
import type { Shot, LayerType, SpeechLayerData } from '../types';

// ============================================================================
// Constants
// ============================================================================

const RESIZE_EDGE_THRESHOLD = 8; // Pixels from edge to trigger resize
const MIN_DURATION = 1; // Minimum duration in frames

// ============================================================================
// Types
// ============================================================================

export type ResizeEdge = 'start' | 'end' | null;

export interface InteractionState {
  isResizing: boolean;
  resizeEdge: ResizeEdge;
  resizingShotId: string | null;
  isDragging: boolean;
  dragStartX: number;
  dragStartFrame: number;
}

export interface VideoExtensionOptions {
  mode: 'freeze-frame' | 'loop' | 'extend-ai';
  duration: number; // Additional frames
  applyTransition?: boolean;
  transitionType?: 'fade' | 'dissolve' | 'cut';
}

export interface SpeechConfigOptions {
  characterId?: string;
  characterName?: string;
  ttsMethod: string;
  voiceId?: string;
  speed: number;
  pitch: number;
  emotion?: string;
}

export interface TimelineInteractionHandlers {
  onShotMouseDown: (e: React.MouseEvent, shotId: string, layerId?: string) => void;
  onShotDoubleClick: (e: React.MouseEvent, shotId: string, layerId?: string) => void;
  onShotContextMenu: (e: React.MouseEvent, shotId: string, layerId?: string) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: (e: React.MouseEvent) => void;
  getCursorForPosition: (x: number, shotId: string) => string;
}

export interface UseTimelineInteractionsOptions {
  zoomLevel: number;
  scrollLeft: number;
  onOpenVideoExtensionDialog?: (shotId: string, layerId: string, options: VideoExtensionOptions) => void;
  onOpenSpeechConfigDialog?: (shotId: string, layerId: string, options: SpeechConfigOptions) => void;
  onOpenContextMenu?: (position: { x: number; y: number }, target: string, shotId: string, layerId?: string) => void;
}

export interface UseTimelineInteractionsResult {
  interactionState: InteractionState;
  handlers: TimelineInteractionHandlers;
  getEdgeFromPosition: (x: number, shotId: string) => ResizeEdge;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useTimelineInteractions(
  options: UseTimelineInteractionsOptions
): UseTimelineInteractionsResult {
  const {
    zoomLevel,
    scrollLeft,
    onOpenVideoExtensionDialog,
    onOpenSpeechConfigDialog,
    onOpenContextMenu,
  } = options;

  const dispatch = useAppDispatch();
  const { shots, selectedElements } = useAppSelector((state) => state.timeline);

  const [interactionState, setInteractionState] = useState<InteractionState>({
    isResizing: false,
    resizeEdge: null,
    resizingShotId: null,
    isDragging: false,
    dragStartX: 0,
    dragStartFrame: 0,
  });

  // Track initial shot state during resize
  const initialShotRef = useRef<{ startTime: number; duration: number } | null>(null);

  // ============================================================================
  // Edge Detection
  // ============================================================================

  const getEdgeFromPosition = useCallback(
    (x: number, shotId: string): ResizeEdge => {
      const shot = shots.find((s) => s.id === shotId);
      if (!shot || shot.layers.some((l) => l.locked)) return null;

      const shotStartX = shot.startTime * zoomLevel;
      const shotEndX = (shot.startTime + shot.duration) * zoomLevel;

      // Check if near start edge
      if (Math.abs(x - shotStartX) < RESIZE_EDGE_THRESHOLD) {
        return 'start';
      }

      // Check if near end edge
      if (Math.abs(x - shotEndX) < RESIZE_EDGE_THRESHOLD) {
        return 'end';
      }

      return null;
    },
    [shots, zoomLevel]
  );

  const getCursorForPosition = useCallback(
    (x: number, shotId: string): string => {
      const edge = getEdgeFromPosition(x, shotId);
      if (edge) return 'ew-resize';
      return 'pointer';
    },
    [getEdgeFromPosition]
  );

  // ============================================================================
  // Shot Interaction Handlers
  // ============================================================================

  const onShotMouseDown = useCallback(
    (e: React.MouseEvent, shotId: string, layerId?: string) => {
      e.stopPropagation();

      const shot = shots.find((s) => s.id === shotId);
      if (!shot) return;

      // Check if layer is locked
      if (layerId) {
        const layer = shot.layers.find((l) => l.id === layerId);
        if (layer?.locked) return;
      }

      const rect = (e.target as HTMLElement).getBoundingClientRect();
      const x = e.clientX - rect.left + scrollLeft;

      // Check for resize edge
      const edge = getEdgeFromPosition(x, shotId);

      if (edge && !e.ctrlKey && !e.metaKey) {
        // Start resize
        setInteractionState({
          isResizing: true,
          resizeEdge: edge,
          resizingShotId: shotId,
          isDragging: false,
          dragStartX: e.clientX,
          dragStartFrame: edge === 'start' ? shot.startTime : shot.startTime + shot.duration,
        });

        initialShotRef.current = {
          startTime: shot.startTime,
          duration: shot.duration,
        };
      } else {
        // Start drag or select
        dispatch(selectElement(shotId));

        setInteractionState({
          isResizing: false,
          resizeEdge: null,
          resizingShotId: null,
          isDragging: true,
          dragStartX: e.clientX,
          dragStartFrame: shot.startTime,
        });
      }
    },
    [shots, scrollLeft, getEdgeFromPosition, dispatch]
  );

  const onShotDoubleClick = useCallback(
    (e: React.MouseEvent, shotId: string, layerId?: string) => {
      e.stopPropagation();

      const shot = shots.find((s) => s.id === shotId);
      if (!shot) return;

      // Find the relevant layer
      const layer = layerId
        ? shot.layers.find((l) => l.id === layerId)
        : shot.layers[0];

      if (!layer) return;

      // Handle based on layer type
      if (layer.type === 'media') {
        // Open video extension dialog
        if (onOpenVideoExtensionDialog) {
          onOpenVideoExtensionDialog(shotId, layer.id, {
            mode: 'freeze-frame',
            duration: 0,
            applyTransition: false,
          });
        }
      } else if (layer.type === 'text') {
        // Open text editor - could be handled by parent component
        console.log('[TimelineInteraction] Open text editor for shot:', shotId);
      } else if (layer.type === 'audio') {
        // Check if it's speech data
        const audioData = layer.data;
        if ('text' in audioData) {
          // It's speech/TTS
          if (onOpenSpeechConfigDialog) {
            const speechData = audioData as SpeechLayerData;
            onOpenSpeechConfigDialog(shotId, layer.id, {
              characterId: speechData.characterId,
              characterName: speechData.characterName,
              ttsMethod: speechData.ttsMethod || 'default',
              voiceId: speechData.voiceId,
              speed: speechData.speed || 1.0,
              pitch: speechData.pitch || 0,
              emotion: speechData.emotion,
            });
          }
        } else {
          // Regular audio
          console.log('[TimelineInteraction] Open audio editor for shot:', shotId);
        }
      } else {
        console.log('[TimelineInteraction] Double-click on layer type:', layer.type);
      }
    },
    [shots, onOpenVideoExtensionDialog, onOpenSpeechConfigDialog]
  );

  const onShotContextMenu = useCallback(
    (e: React.MouseEvent, shotId: string, layerId?: string) => {
      e.preventDefault();
      e.stopPropagation();

      const shot = shots.find((s) => s.id === shotId);
      if (!shot) return;

      // Select the shot if not already selected
      if (!selectedElements.includes(shotId)) {
        dispatch(selectElement(shotId));
      }

      // Determine context menu type based on layer
      const layer = layerId
        ? shot.layers.find((l) => l.id === layerId)
        : shot.layers[0];

      const targetType = layer?.type || 'shot';

      if (onOpenContextMenu) {
        onOpenContextMenu(
          { x: e.clientX, y: e.clientY },
          targetType,
          shotId,
          layerId
        );
      }
    },
    [shots, selectedElements, dispatch, onOpenContextMenu]
  );

  // ============================================================================
  // Mouse Move/Up Handlers
  // ============================================================================

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (interactionState.isResizing && interactionState.resizingShotId) {
        const shot = shots.find((s) => s.id === interactionState.resizingShotId);
        if (!shot || !initialShotRef.current) return;

        const deltaX = e.clientX - interactionState.dragStartX;
        const deltaFrames = Math.round(deltaX / zoomLevel);

        if (interactionState.resizeEdge === 'start') {
          // Resizing start edge
          const newStartTime = Math.max(
            0,
            initialShotRef.current.startTime + deltaFrames
          );
          const newDuration = initialShotRef.current.duration - (newStartTime - initialShotRef.current.startTime);

          if (newDuration >= MIN_DURATION) {
            dispatch(
              updateShot({
                id: shot.id,
                updates: {
                  startTime: newStartTime,
                  duration: newDuration,
                },
              })
            );
          }
        } else if (interactionState.resizeEdge === 'end') {
          // Resizing end edge
          const newDuration = Math.max(
            MIN_DURATION,
            initialShotRef.current.duration + deltaFrames
          );

          dispatch(
            updateShot({
              id: shot.id,
              updates: {
                duration: newDuration,
              },
            })
          );
        }
      } else if (interactionState.isDragging) {
        // Handle drag move if needed
        const deltaX = e.clientX - interactionState.dragStartX;
        const deltaFrames = Math.round(deltaX / zoomLevel);

        // This could update shot position during drag
        // For now, we just track the state
      }
    },
    [interactionState, shots, zoomLevel, dispatch]
  );

  const onMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (interactionState.isResizing || interactionState.isDragging) {
        setInteractionState({
          isResizing: false,
          resizeEdge: null,
          resizingShotId: null,
          isDragging: false,
          dragStartX: 0,
          dragStartFrame: 0,
        });

        initialShotRef.current = null;
      }
    },
    [interactionState]
  );

  // ============================================================================
  // Global Event Handlers
  // ============================================================================

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (interactionState.isResizing || interactionState.isDragging) {
        onMouseMove(e as unknown as React.MouseEvent);
      }
    };

    const handleGlobalMouseUp = (e: MouseEvent) => {
      onMouseUp(e as unknown as React.MouseEvent);
    };

    if (interactionState.isResizing || interactionState.isDragging) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [interactionState.isResizing, interactionState.isDragging, onMouseMove, onMouseUp]);

  // ============================================================================
  // Return
  // ============================================================================

  return {
    interactionState,
    handlers: {
      onShotMouseDown,
      onShotDoubleClick,
      onShotContextMenu,
      onMouseMove,
      onMouseUp,
      getCursorForPosition,
    },
    getEdgeFromPosition,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get the layer type for a shot
 */
export function getShotLayerType(shot: Shot): LayerType | null {
  if (shot.layers.length === 0) return null;
  return shot.layers[0].type;
}

/**
 * Check if a shot can be extended (video/media type)
 */
export function canExtendShot(shot: Shot): boolean {
  return shot.layers.some(
    (layer) => layer.type === 'media' && !layer.locked
  );
}

/**
 * Check if a shot can have TTS applied (text/audio type)
 */
export function canApplyTTS(shot: Shot): boolean {
  return shot.layers.some(
    (layer) => layer.type === 'text' || layer.type === 'audio'
  );
}

/**
 * Calculate suggested extension duration based on video content
 */
export function suggestExtensionDuration(shot: Shot, fps: number = 24): number {
  // Default to 2 seconds
  return fps * 2;
}

export default useTimelineInteractions;