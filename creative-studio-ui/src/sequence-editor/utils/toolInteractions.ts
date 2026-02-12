/**
 * Tool Interactions Utility
 * 
 * Handles tool-specific timeline interactions for all editing tools.
 * Provides handlers for select, trim, split, ripple, roll, slip, slide,
 * transition, text, and keyframe tools.
 * 
 * Requirements: 2.4, 10.1-10.10
 */

import type { Shot, Layer, TransitionLayerData, TextLayerData, KeyframeLayerData, Keyframe } from '../types';

// ============================================================================
// Types
// ============================================================================

export interface ToolInteractionContext {
  shots: Shot[];
  playheadPosition: number;
  zoomLevel: number;
  selectedElements: string[];
  fps: number;
}

export interface ShotMoveResult {
  shotId: string;
  newStartTime: number;
}

export interface ShotTrimResult {
  shotId: string;
  newStartTime?: number;
  newDuration: number;
}

export interface ShotSplitResult {
  originalShotId: string;
  newShots: [Shot, Shot];
}

export interface RippleEditResult {
  shotId: string;
  newDuration: number;
  affectedShots: ShotMoveResult[];
}

export interface RollEditResult {
  leftShotId: string;
  rightShotId: string;
  leftNewDuration: number;
  rightNewStartTime: number;
  rightNewDuration: number;
}

export interface SlipEditResult {
  shotId: string;
  newTrimStart: number;
  newTrimEnd: number;
}

export interface SlideEditResult {
  shotId: string;
  newStartTime: number;
  affectedShots: ShotMoveResult[];
}

// ============================================================================
// Select Tool (10.1)
// ============================================================================

/**
 * Handle shot selection with multi-select support
 */
export function handleSelectTool(
  shotId: string,
  multiSelect: boolean,
  currentSelection: string[]
): string[] {
  if (multiSelect) {
    if (currentSelection.includes(shotId)) {
      // Deselect if already selected
      return currentSelection.filter((id) => id !== shotId);
    } else {
      // Add to selection
      return [...currentSelection, shotId];
    }
  } else {
    // Single select
    return [shotId];
  }
}

/**
 * Handle shot drag-to-move
 */
export function handleShotMove(
  shotId: string,
  deltaFrames: number,
  shots: Shot[]
): ShotMoveResult | null {
  const shot = shots.find((s) => s.id === shotId);
  if (!shot) return null;
  
  const newStartTime = Math.max(0, shot.startTime + deltaFrames);
  
  return {
    shotId,
    newStartTime,
  };
}

// ============================================================================
// Trim Tool (10.2)
// ============================================================================

/**
 * Handle shot trim (resize start or end)
 */
export function handleShotTrim(
  shotId: string,
  edge: 'start' | 'end',
  deltaFrames: number,
  shots: Shot[],
  minDuration: number = 1
): ShotTrimResult | null {
  const shot = shots.find((s) => s.id === shotId);
  if (!shot) return null;
  
  if (edge === 'start') {
    // Trim start: adjust start time and duration
    const newStartTime = Math.max(0, shot.startTime + deltaFrames);
    const actualDelta = newStartTime - shot.startTime;
    const newDuration = Math.max(minDuration, shot.duration - actualDelta);
    
    return {
      shotId,
      newStartTime,
      newDuration,
    };
  } else {
    // Trim end: adjust duration only
    const newDuration = Math.max(minDuration, shot.duration + deltaFrames);
    
    return {
      shotId,
      newDuration,
    };
  }
}

// ============================================================================
// Cut/Split Tool (10.3)
// ============================================================================

/**
 * Split shot at playhead position
 */
export function handleShotSplit(
  shotId: string,
  splitFrame: number,
  shots: Shot[]
): ShotSplitResult | null {
  const shot = shots.find((s) => s.id === shotId);
  if (!shot) return null;
  
  // Check if split position is within shot bounds
  const relativeFrame = splitFrame - shot.startTime;
  if (relativeFrame <= 0 || relativeFrame >= shot.duration) {
    return null; // Split position outside shot
  }
  
  // Create two new shots from original
  const leftShot: Shot = {
    ...shot,
    id: `${shot.id}-left-${Date.now()}`,
    name: `${shot.name} (1)`,
    duration: relativeFrame,
    layers: shot.layers.map((layer) => ({
      ...layer,
      id: `${layer.id}-left`,
      duration: Math.min(layer.duration, relativeFrame),
    })),
  };
  
  const rightShot: Shot = {
    ...shot,
    id: `${shot.id}-right-${Date.now()}`,
    name: `${shot.name} (2)`,
    startTime: shot.startTime + relativeFrame,
    duration: shot.duration - relativeFrame,
    layers: shot.layers.map((layer) => ({
      ...layer,
      id: `${layer.id}-right`,
      startTime: Math.max(0, layer.startTime - relativeFrame),
      duration: Math.max(0, layer.duration - relativeFrame),
    })),
  };
  
  return {
    originalShotId: shotId,
    newShots: [leftShot, rightShot],
  };
}

// ============================================================================
// Ripple Edit Tool (10.4)
// ============================================================================

/**
 * Trim shot and shift subsequent shots (ripple edit)
 */
export function handleRippleEdit(
  shotId: string,
  edge: 'start' | 'end',
  deltaFrames: number,
  shots: Shot[],
  minDuration: number = 1
): RippleEditResult | null {
  const shot = shots.find((s) => s.id === shotId);
  if (!shot) return null;
  
  let newDuration: number;
  let rippleDelta: number;
  
  if (edge === 'start') {
    // Trim start: adjust duration and ripple subsequent shots
    newDuration = Math.max(minDuration, shot.duration - deltaFrames);
    rippleDelta = shot.duration - newDuration;
  } else {
    // Trim end: adjust duration and ripple subsequent shots
    newDuration = Math.max(minDuration, shot.duration + deltaFrames);
    rippleDelta = newDuration - shot.duration;
  }
  
  // Find all shots that start after this shot
  const shotEnd = shot.startTime + shot.duration;
  const affectedShots: ShotMoveResult[] = shots
    .filter((s) => s.startTime >= shotEnd && s.id !== shotId)
    .map((s) => ({
      shotId: s.id,
      newStartTime: s.startTime + rippleDelta,
    }));
  
  return {
    shotId,
    newDuration,
    affectedShots,
  };
}

// ============================================================================
// Roll Edit Tool (10.5)
// ============================================================================

/**
 * Adjust junction between two adjacent shots (roll edit)
 */
export function handleRollEdit(
  leftShotId: string,
  rightShotId: string,
  deltaFrames: number,
  shots: Shot[],
  minDuration: number = 1
): RollEditResult | null {
  const leftShot = shots.find((s) => s.id === leftShotId);
  const rightShot = shots.find((s) => s.id === rightShotId);
  
  if (!leftShot || !rightShot) return null;
  
  // Check if shots are adjacent
  const leftEnd = leftShot.startTime + leftShot.duration;
  if (leftEnd !== rightShot.startTime) {
    return null; // Shots not adjacent
  }
  
  // Calculate new durations
  const leftNewDuration = Math.max(minDuration, leftShot.duration + deltaFrames);
  const actualDelta = leftNewDuration - leftShot.duration;
  const rightNewDuration = Math.max(minDuration, rightShot.duration - actualDelta);
  const rightNewStartTime = leftShot.startTime + leftNewDuration;
  
  return {
    leftShotId,
    rightShotId,
    leftNewDuration,
    rightNewStartTime,
    rightNewDuration,
  };
}

// ============================================================================
// Slip Tool (10.6)
// ============================================================================

/**
 * Modify internal content of shot without moving position (slip edit)
 */
export function handleSlipEdit(
  shotId: string,
  deltaFrames: number,
  shots: Shot[]
): SlipEditResult | null {
  const shot = shots.find((s) => s.id === shotId);
  if (!shot) return null;
  
  // For media layers, adjust trim points
  const mediaLayer = shot.layers.find((l) => l.type === 'media');
  if (!mediaLayer || mediaLayer.type !== 'media') return null;
  
  const mediaData = mediaLayer.data as any;
  const currentTrimStart = mediaData.trim?.start || 0;
  const currentTrimEnd = mediaData.trim?.end || shot.duration;
  
  // Adjust trim points (slip the content)
  const newTrimStart = Math.max(0, currentTrimStart + deltaFrames);
  const newTrimEnd = currentTrimEnd + deltaFrames;
  
  return {
    shotId,
    newTrimStart,
    newTrimEnd,
  };
}

// ============================================================================
// Slide Tool (10.7)
// ============================================================================

/**
 * Move shot while preserving transitions and adjusting adjacent shots (slide edit)
 */
export function handleSlideEdit(
  shotId: string,
  deltaFrames: number,
  shots: Shot[]
): SlideEditResult | null {
  const shot = shots.find((s) => s.id === shotId);
  if (!shot) return null;
  
  const newStartTime = Math.max(0, shot.startTime + deltaFrames);
  
  // Find adjacent shots that need adjustment
  const sortedShots = [...shots].sort((a, b) => a.startTime - b.startTime);
  const shotIndex = sortedShots.findIndex((s) => s.id === shotId);
  
  const affectedShots: ShotMoveResult[] = [];
  
  if (deltaFrames > 0) {
    // Moving right: adjust shots between old and new position
    for (let i = shotIndex + 1; i < sortedShots.length; i++) {
      const nextShot = sortedShots[i];
      if (nextShot.startTime < newStartTime + shot.duration) {
        affectedShots.push({
          shotId: nextShot.id,
          newStartTime: nextShot.startTime + deltaFrames,
        });
      } else {
        break;
      }
    }
  } else if (deltaFrames < 0) {
    // Moving left: adjust shots between new and old position
    for (let i = shotIndex - 1; i >= 0; i--) {
      const prevShot = sortedShots[i];
      if (prevShot.startTime + prevShot.duration > newStartTime) {
        affectedShots.push({
          shotId: prevShot.id,
          newStartTime: prevShot.startTime + deltaFrames,
        });
      } else {
        break;
      }
    }
  }
  
  return {
    shotId,
    newStartTime,
    affectedShots,
  };
}

// ============================================================================
// Transition Tool (10.8)
// ============================================================================

/**
 * Add transition layer between adjacent shots
 */
export function handleAddTransition(
  leftShotId: string,
  rightShotId: string,
  transitionType: 'fade' | 'dissolve' | 'wipe' | 'slide' | 'smooth-cut',
  duration: number,
  shots: Shot[]
): { shotId: string; layer: Layer } | null {
  const leftShot = shots.find((s) => s.id === leftShotId);
  const rightShot = shots.find((s) => s.id === rightShotId);
  
  if (!leftShot || !rightShot) return null;
  
  // Check if shots are adjacent
  const leftEnd = leftShot.startTime + leftShot.duration;
  if (leftEnd !== rightShot.startTime) {
    return null; // Shots not adjacent
  }
  
  // Create transition layer on the right shot
  const transitionLayer: Layer = {
    id: `transition-${Date.now()}`,
    type: 'transitions',
    startTime: 0, // Start of right shot
    duration: Math.min(duration, rightShot.duration),
    locked: false,
    hidden: false,
    opacity: 1,
    blendMode: 'normal',
    data: {
      transitionType,
      duration: Math.min(duration, rightShot.duration),
      easing: 'ease-in-out',
    } as TransitionLayerData,
  };
  
  return {
    shotId: rightShotId,
    layer: transitionLayer,
  };
}

// ============================================================================
// Text Tool (10.9)
// ============================================================================

/**
 * Add text overlay layer at playhead position
 */
export function handleAddText(
  shotId: string,
  playheadPosition: number,
  shots: Shot[],
  defaultText: string = 'New Text'
): { shotId: string; layer: Layer } | null {
  const shot = shots.find((s) => s.id === shotId);
  if (!shot) return null;
  
  // Calculate relative position within shot
  const relativePosition = playheadPosition - shot.startTime;
  if (relativePosition < 0 || relativePosition >= shot.duration) {
    return null; // Playhead not within shot
  }
  
  // Create text layer
  const textLayer: Layer = {
    id: `text-${Date.now()}`,
    type: 'text',
    startTime: relativePosition,
    duration: Math.min(60, shot.duration - relativePosition), // Default 2 seconds at 30fps
    locked: false,
    hidden: false,
    opacity: 1,
    blendMode: 'normal',
    data: {
      content: defaultText,
      font: 'Arial',
      size: 48,
      color: '#FFFFFF',
      position: { x: 0.5, y: 0.5 }, // Center of frame
    } as TextLayerData,
  };
  
  return {
    shotId,
    layer: textLayer,
  };
}

// ============================================================================
// Keyframe Tool (10.10)
// ============================================================================

/**
 * Add keyframe marker at playhead position
 */
export function handleAddKeyframe(
  shotId: string,
  playheadPosition: number,
  property: string,
  value: unknown,
  shots: Shot[]
): { shotId: string; layer: Layer } | null {
  const shot = shots.find((s) => s.id === shotId);
  if (!shot) return null;
  
  // Calculate relative position within shot
  const relativePosition = playheadPosition - shot.startTime;
  if (relativePosition < 0 || relativePosition >= shot.duration) {
    return null; // Playhead not within shot
  }
  
  // Check if keyframe layer already exists for this property
  const existingKeyframeLayer = shot.layers.find(
    (l) => l.type === 'keyframes' && (l.data as KeyframeLayerData).property === property
  );
  
  if (existingKeyframeLayer) {
    // Add keyframe to existing layer
    const keyframeData = existingKeyframeLayer.data as KeyframeLayerData;
    const newKeyframe: Keyframe = {
      time: relativePosition,
      value,
      easing: 'ease-in-out',
    };
    
    // Check if keyframe already exists at this time
    const existingIndex = keyframeData.keyframes.findIndex((k) => k.time === relativePosition);
    if (existingIndex !== -1) {
      // Update existing keyframe
      keyframeData.keyframes[existingIndex] = newKeyframe;
    } else {
      // Add new keyframe
      keyframeData.keyframes.push(newKeyframe);
      keyframeData.keyframes.sort((a, b) => a.time - b.time);
    }
    
    return {
      shotId,
      layer: existingKeyframeLayer,
    };
  } else {
    // Create new keyframe layer
    const keyframeLayer: Layer = {
      id: `keyframe-${Date.now()}`,
      type: 'keyframes',
      startTime: 0,
      duration: shot.duration,
      locked: false,
      hidden: false,
      opacity: 1,
      blendMode: 'normal',
      data: {
        property,
        keyframes: [
          {
            time: relativePosition,
            value,
            easing: 'ease-in-out',
          },
        ],
        interpolation: 'ease-in-out',
      } as KeyframeLayerData,
    };
    
    return {
      shotId,
      layer: keyframeLayer,
    };
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Find shot at given frame position
 */
export function findShotAtFrame(frame: number, shots: Shot[]): Shot | null {
  return shots.find((shot) => {
    const shotEnd = shot.startTime + shot.duration;
    return frame >= shot.startTime && frame < shotEnd;
  }) || null;
}

/**
 * Find adjacent shots (left and right)
 */
export function findAdjacentShots(
  shotId: string,
  shots: Shot[]
): { left: Shot | null; right: Shot | null } {
  const shot = shots.find((s) => s.id === shotId);
  if (!shot) return { left: null, right: null };
  
  const sortedShots = [...shots].sort((a, b) => a.startTime - b.startTime);
  const index = sortedShots.findIndex((s) => s.id === shotId);
  
  return {
    left: index > 0 ? sortedShots[index - 1] : null,
    right: index < sortedShots.length - 1 ? sortedShots[index + 1] : null,
  };
}

/**
 * Check if two shots are adjacent
 */
export function areShotsAdjacent(shot1: Shot, shot2: Shot): boolean {
  const shot1End = shot1.startTime + shot1.duration;
  const shot2End = shot2.startTime + shot2.duration;
  
  return shot1End === shot2.startTime || shot2End === shot1.startTime;
}

/**
 * Get shot at edge (for trim/roll operations)
 */
export function getShotEdge(
  shotId: string,
  clickX: number,
  shotLeft: number,
  shotWidth: number,
  edgeThreshold: number = 10
): 'start' | 'end' | 'middle' {
  const relativeX = clickX - shotLeft;
  
  if (relativeX < edgeThreshold) {
    return 'start';
  } else if (relativeX > shotWidth - edgeThreshold) {
    return 'end';
  } else {
    return 'middle';
  }
}

