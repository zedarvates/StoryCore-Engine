/**
 * useToolInteractions Hook
 * 
 * Provides tool-specific interaction handlers for the sequence editor timeline.
 * Connects toolbar tool selection to actual timeline operations.
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 */

import { useCallback, useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { setActiveTool } from '../store/slices/toolsSlice';
import {
  setZoomLevel,
  setSelectedElements,
  addShot,
  updateShot,
  splitShot,
  addTrack,
} from '../store/slices/timelineSlice';
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
} from '../utils/toolInteractions';
import type { ToolType, Shot, Layer, LayerType } from '../types';

interface ToolInteractionsOptions {
  onAddImage?: () => void;
  onAddVideo?: () => void;
  onAddAudio?: () => void;
}

interface ToolInteractionsResult {
  activeTool: ToolType;
  setTool: (tool: ToolType) => void;
  handleToolAction: (action: string, data?: unknown) => void;
  getCursorStyle: () => string;
  isToolActive: (tool: ToolType) => boolean;
}

export function useToolInteractions(
  options: ToolInteractionsOptions = {}
): ToolInteractionsResult {
  const dispatch = useAppDispatch();
  const { activeTool } = useAppSelector((state) => state.tools);
  const { shots, playheadPosition, zoomLevel, selectedElements, duration } = useAppSelector(
    (state) => state.timeline
  );

  // Set active tool
  const setTool = useCallback(
    (tool: ToolType) => {
      dispatch(setActiveTool(tool));
    },
    [dispatch]
  );

  // Check if tool is active
  const isToolActive = useCallback(
    (tool: ToolType) => activeTool === tool,
    [activeTool]
  );

  // Get cursor style based on active tool
  const getCursorStyle = useCallback((): string => {
    switch (activeTool) {
      case 'select':
        return 'default';
      case 'cut':
        return 'crosshair';
      case 'move':
        return 'grab';
      case 'zoom':
        return 'zoom-in';
      case 'trim':
      case 'ripple':
      case 'roll':
      case 'slip':
      case 'slide':
        return 'ew-resize';
      case 'text':
        return 'text';
      case 'keyframe':
        return 'pointer';
      default:
        return 'default';
    }
  }, [activeTool]);

  // Handle tool-specific actions
  const handleToolAction = useCallback(
    (action: string, data?: unknown) => {
      switch (action) {
        // Primary tools
        case 'select-shot':
          if (typeof data === 'string') {
            const newSelection = handleSelectTool(data, false, selectedElements);
            dispatch(setSelectedElements(newSelection));
          }
          break;

        case 'multi-select-shots':
          if (Array.isArray(data)) {
            dispatch(setSelectedElements(data));
          }
          break;

        case 'move-shot':
          if (data && typeof data === 'object') {
            const { shotId, deltaFrames } = data as { shotId: string; deltaFrames: number };
            const result = handleShotMove(shotId, deltaFrames, shots);
            if (result) {
              dispatch(
                updateShot({
                  id: shotId,
                  updates: { startTime: result.newStartTime },
                })
              );
            }
          }
          break;

        case 'cut-shot': {
          // Split shot at playhead
          const shotAtPlayhead = findShotAtFrame(playheadPosition, shots);
          if (shotAtPlayhead) {
            const splitResult = handleShotSplit(
              shotAtPlayhead.id,
              playheadPosition,
              shots
            );
            if (splitResult) {
              dispatch(
                splitShot({
                  shotId: shotAtPlayhead.id,
                  leftShot: splitResult.newShots[0],
                  rightShot: splitResult.newShots[1],
                })
              );
            }
          }
          break;
        }

        case 'zoom-in':
          dispatch(setZoomLevel(Math.min(100, zoomLevel * 1.5)));
          break;

        case 'zoom-out':
          dispatch(setZoomLevel(Math.max(1, zoomLevel / 1.5)));
          break;

        case 'zoom-fit':
          dispatch(setZoomLevel(10));
          break;

        // Media tools
        case 'add-image':
          options.onAddImage?.();
          // Create a placeholder image shot
          const imageShot: Shot = {
            id: `shot-image-${Date.now()}`,
            name: 'Image Shot',
            startTime: playheadPosition,
            duration: 72, // 3 seconds at 24fps
            layers: [
              {
                id: `layer-${Date.now()}`,
                type: 'media',
                startTime: 0,
                duration: 72,
                locked: false,
                hidden: false,
                opacity: 1,
                blendMode: 'normal',
                data: {
                  sourceUrl: '',
                  trim: { start: 0, end: 72 },
                  transform: {
                    position: { x: 0, y: 0 },
                    scale: { x: 1, y: 1 },
                    rotation: 0,
                    anchor: { x: 0.5, y: 0.5 },
                  },
                },
              },
            ],
            referenceImages: [],
            prompt: '',
            parameters: {
              seed: -1,
              denoising: 0.7,
              steps: 20,
              guidance: 7.0,
              sampler: 'euler',
              scheduler: 'normal',
            },
            generationStatus: 'pending',
          };
          dispatch(addShot(imageShot));
          break;

        case 'add-video':
          options.onAddVideo?.();
          const videoShot: Shot = {
            id: `shot-video-${Date.now()}`,
            name: 'Video Shot',
            startTime: playheadPosition,
            duration: 120, // 5 seconds
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
                },
              },
            ],
            referenceImages: [],
            prompt: '',
            parameters: {
              seed: -1,
              denoising: 0.7,
              steps: 20,
              guidance: 7.0,
              sampler: 'euler',
              scheduler: 'normal',
            },
            generationStatus: 'pending',
          };
          dispatch(addShot(videoShot));
          break;

        case 'add-audio':
          options.onAddAudio?.();
          // Add audio track
          dispatch(
            addTrack({
              id: `track-audio-${Date.now()}`,
              type: 'audio',
              height: 40,
              locked: false,
              hidden: false,
              color: '#50C878',
              icon: 'volume',
            })
          );
          break;

        // Editing tools
        case 'trim-shot':
          if (data && typeof data === 'object') {
            const { shotId, edge, deltaFrames } = data as {
              shotId: string;
              edge: 'start' | 'end';
              deltaFrames: number;
            };
            const result = handleShotTrim(shotId, edge, deltaFrames, shots);
            if (result) {
              dispatch(
                updateShot({
                  id: shotId,
                  updates: {
                    startTime: result.newStartTime,
                    duration: result.newDuration,
                  },
                })
              );
            }
          }
          break;

        case 'ripple-edit':
          if (data && typeof data === 'object') {
            const { shotId, edge, deltaFrames } = data as {
              shotId: string;
              edge: 'start' | 'end';
              deltaFrames: number;
            };
            const result = handleRippleEdit(shotId, edge, deltaFrames, shots);
            if (result) {
              dispatch(
                updateShot({
                  id: shotId,
                  updates: { duration: result.newDuration },
                })
              );
              // Move affected shots
              result.affectedShots.forEach((move) => {
                dispatch(
                  updateShot({
                    id: move.shotId,
                    updates: { startTime: move.newStartTime },
                  })
                );
              });
            }
          }
          break;

        case 'roll-edit':
          if (data && typeof data === 'object') {
            const { leftShotId, rightShotId, deltaFrames } = data as {
              leftShotId: string;
              rightShotId: string;
              deltaFrames: number;
            };
            const result = handleRollEdit(leftShotId, rightShotId, deltaFrames, shots);
            if (result) {
              dispatch(
                updateShot({
                  id: leftShotId,
                  updates: { duration: result.leftNewDuration },
                })
              );
              dispatch(
                updateShot({
                  id: rightShotId,
                  updates: {
                    startTime: result.rightNewStartTime,
                    duration: result.rightNewDuration,
                  },
                })
              );
            }
          }
          break;

        case 'slip-edit':
          if (data && typeof data === 'object') {
            const { shotId, deltaFrames } = data as {
              shotId: string;
              deltaFrames: number;
            };
            const result = handleSlipEdit(shotId, deltaFrames, shots);
            if (result) {
              // Update trim points in layer data
              const shot = shots.find((s) => s.id === shotId);
              if (shot) {
                const mediaLayer = shot.layers.find((l) => l.type === 'media');
                if (mediaLayer) {
                  const layerData = { ...mediaLayer.data } as any;
                  if (layerData.trim) {
                    layerData.trim.start = result.newTrimStart;
                    layerData.trim.end = result.newTrimEnd;
                    dispatch(
                      updateShot({
                        id: shotId,
                        updates: {
                          layers: shot.layers.map((l) =>
                            l.id === mediaLayer.id
                              ? { ...l, data: layerData }
                              : l
                          ),
                        },
                      })
                    );
                  }
                }
              }
            }
          }
          break;

        case 'slide-edit':
          if (data && typeof data === 'object') {
            const { shotId, deltaFrames } = data as {
              shotId: string;
              deltaFrames: number;
            };
            const result = handleSlideEdit(shotId, deltaFrames, shots);
            if (result) {
              dispatch(
                updateShot({
                  id: shotId,
                  updates: { startTime: result.newStartTime },
                })
              );
              result.affectedShots.forEach((move) => {
                dispatch(
                  updateShot({
                    id: move.shotId,
                    updates: { startTime: move.newStartTime },
                  })
                );
              });
            }
          }
          break;

        // Effects tools
        case 'add-transition':
          if (data && typeof data === 'object') {
            const { leftShotId, rightShotId, transitionType, transitionDuration } = data as {
              leftShotId: string;
              rightShotId: string;
              transitionType: 'fade' | 'dissolve' | 'wipe' | 'slide' | 'smooth-cut';
              transitionDuration: number;
            };
            const result = handleAddTransition(
              leftShotId,
              rightShotId,
              transitionType,
              transitionDuration,
              shots
            );
            if (result) {
              dispatch(
                updateShot({
                  id: result.shotId,
                  updates: {
                    layers: [...(shots.find((s) => s.id === result.shotId)?.layers || []), result.layer],
                  },
                })
              );
            }
          }
          break;

        case 'add-text':
          if (data && typeof data === 'object') {
            const { shotId, text } = data as { shotId: string; text: string };
            const result = handleAddText(shotId, playheadPosition, shots, text);
            if (result) {
              dispatch(
                updateShot({
                  id: result.shotId,
                  updates: {
                    layers: [...(shots.find((s) => s.id === result.shotId)?.layers || []), result.layer],
                  },
                })
              );
            }
          }
          break;

        case 'add-keyframe':
          if (data && typeof data === 'object') {
            const { shotId, property, value } = data as {
              shotId: string;
              property: string;
              value: unknown;
            };
            const result = handleAddKeyframe(shotId, playheadPosition, property, value, shots);
            if (result) {
              const existingShot = shots.find((s) => s.id === shotId);
              const existingLayerIndex = existingShot?.layers.findIndex(
                (l) => l.id === result.layer.id
              );
              if (existingShot && existingLayerIndex !== undefined && existingLayerIndex >= 0) {
                // Update existing keyframe layer
                dispatch(
                  updateShot({
                    id: shotId,
                    updates: {
                      layers: existingShot.layers.map((l) =>
                        l.id === result.layer.id ? result.layer : l
                      ),
                    },
                  })
                );
              } else if (existingShot) {
                // Add new keyframe layer
                dispatch(
                  updateShot({
                    id: shotId,
                    updates: {
                      layers: [...existingShot.layers, result.layer],
                    },
                  })
                );
              }
            }
          }
          break;

        default:
          console.log(`[useToolInteractions] Unknown action: ${action}`);
      }
    },
    [dispatch, shots, playheadPosition, zoomLevel, selectedElements, options]
  );

  // Keyboard shortcuts for tool switching
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Tool shortcuts
      const key = e.shiftKey ? `Shift+${e.key.toUpperCase()}` : e.key.toUpperCase();

      const toolShortcuts: Record<string, ToolType> = {
        V: 'select',
        C: 'cut',
        H: 'move',
        Z: 'zoom',
        I: 'add-image',
        A: 'add-audio',
        T: 'trim',
        R: 'ripple',
        N: 'roll',
        Y: 'slip',
        U: 'slide',
        'Shift+T': 'transition',
        'Shift+X': 'text',
        K: 'keyframe',
      };

      if (toolShortcuts[key]) {
        e.preventDefault();
        setTool(toolShortcuts[key]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setTool]);

  return {
    activeTool,
    setTool,
    handleToolAction,
    getCursorStyle,
    isToolActive,
  };
}

export default useToolInteractions;
