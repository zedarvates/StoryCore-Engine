/**
 * Track Management Utility
 * 
 * Handles advanced track management including grouping, organization,
 * effects tracks, master tracks, and annotation/marker tracks.
 * 
 * Requirements: 1.1, 1.3, 1.4, 9.1
 */

import type { Track, Layer } from '../types';

// ============================================================================
// Types
// ============================================================================

export interface TrackGroup {
  id: string;
  name: string;
  trackIds: string[];
  color: string;
  collapsed: boolean;
  locked: boolean;
  hidden: boolean;
}

export interface TrackCustomization {
  color: string;
  name: string;
  icon?: string;
  height: number;
}

export interface FXTrack extends Track {
  type: 'effects';
  effectChain: EffectNode[];
  sendReturns: SendReturn[];
}

export interface EffectNode {
  id: string;
  effectType: string;
  parameters: Record<string, unknown>;
  enabled: boolean;
  bypass: boolean;
}

export interface SendReturn {
  id: string;
  sourceTrackId: string;
  destinationTrackId: string;
  amount: number; // 0 to 1
  preFader: boolean;
}

export interface MasterTrack extends Track {
  type: 'master';
  effectChain: EffectNode[];
  outputSettings: OutputSettings;
}

export interface OutputSettings {
  volume: number; // 0 to 1
  pan: number; // -1 to 1
  mute: boolean;
  solo: boolean;
  limiter: {
    enabled: boolean;
    threshold: number;
    ceiling: number;
  };
}

export interface AnnotationTrack extends Track {
  type: 'annotation';
  annotations: Annotation[];
}

export interface Annotation {
  id: string;
  time: number; // Frame number
  duration?: number; // Optional for region annotations
  text: string;
  color: string;
  category: 'note' | 'todo' | 'warning' | 'info';
  author?: string;
  timestamp?: Date;
}

export interface MarkerTrack extends Track {
  type: 'marker';
  markers: Marker[];
}

export interface Marker {
  id: string;
  time: number; // Frame number
  label: string;
  color: string;
  type: 'chapter' | 'cue' | 'beat' | 'section' | 'custom';
  metadata?: Record<string, unknown>;
}

export interface LayerTrack extends Track {
  type: 'layer';
  purpose: 'organization' | 'reference' | 'backup';
  parentTrackId?: string;
}

// ============================================================================
// Track Grouping and Organization (10D.1)
// ============================================================================

/**
 * Create track group
 */
export function createTrackGroup(
  name: string,
  trackIds: string[],
  color: string = '#4A90E2'
): TrackGroup {
  return {
    id: `group-${Date.now()}`,
    name,
    trackIds,
    color,
    collapsed: false,
    locked: false,
    hidden: false,
  };
}

/**
 * Add track to group
 */
export function addTrackToGroup(
  groupId: string,
  trackId: string,
  groups: TrackGroup[]
): TrackGroup[] {
  return groups.map((group) => {
    if (group.id === groupId) {
      return {
        ...group,
        trackIds: [...group.trackIds, trackId],
      };
    }
    return group;
  });
}

/**
 * Remove track from group
 */
export function removeTrackFromGroup(
  groupId: string,
  trackId: string,
  groups: TrackGroup[]
): TrackGroup[] {
  return groups.map((group) => {
    if (group.id === groupId) {
      return {
        ...group,
        trackIds: group.trackIds.filter((id) => id !== trackId),
      };
    }
    return group;
  });
}

/**
 * Toggle group collapsed state
 */
export function toggleGroupCollapsed(
  groupId: string,
  groups: TrackGroup[]
): TrackGroup[] {
  return groups.map((group) => {
    if (group.id === groupId) {
      return {
        ...group,
        collapsed: !group.collapsed,
      };
    }
    return group;
  });
}

/**
 * Duplicate track
 */
export function duplicateTrack(
  track: Track,
  tracks: Track[]
): Track {
  const newTrack: Track = {
    ...track,
    id: `${track.id}-copy-${Date.now()}`,
  };
  
  return newTrack;
}

/**
 * Customize track appearance
 */
export function customizeTrack(
  trackId: string,
  customization: TrackCustomization,
  tracks: Track[]
): Track[] {
  return tracks.map((track) => {
    if (track.id === trackId) {
      return {
        ...track,
        color: customization.color,
        height: customization.height,
        icon: customization.icon || track.icon,
      };
    }
    return track;
  });
}

/**
 * Rename track
 */
export function renameTrack(
  trackId: string,
  newName: string,
  tracks: Track[]
): Track[] {
  return tracks.map((track) => {
    if (track.id === trackId) {
      return {
        ...track,
        // Track name would be stored in track metadata
      };
    }
    return track;
  });
}

/**
 * Reorder tracks within a group
 */
export function reorderTracksInGroup(
  groupId: string,
  newOrder: string[],
  groups: TrackGroup[]
): TrackGroup[] {
  return groups.map((group) => {
    if (group.id === groupId) {
      return {
        ...group,
        trackIds: newOrder,
      };
    }
    return group;
  });
}

// ============================================================================
// Effects and Master Tracks (10D.2)
// ============================================================================

/**
 * Create FX track
 */
export function createFXTrack(
  name: string = 'FX Track'
): FXTrack {
  return {
    id: `fx-track-${Date.now()}`,
    type: 'effects',
    height: 60,
    locked: false,
    hidden: false,
    color: '#9B59B6',
    icon: 'magic',
    effectChain: [],
    sendReturns: [],
  };
}

/**
 * Add effect to FX track
 */
export function addEffectToFXTrack(
  trackId: string,
  effectType: string,
  parameters: Record<string, unknown>,
  tracks: FXTrack[]
): FXTrack[] {
  return tracks.map((track) => {
    if (track.id === trackId) {
      const newEffect: EffectNode = {
        id: `effect-${Date.now()}`,
        effectType,
        parameters,
        enabled: true,
        bypass: false,
      };
      
      return {
        ...track,
        effectChain: [...track.effectChain, newEffect],
      };
    }
    return track;
  });
}

/**
 * Remove effect from FX track
 */
export function removeEffectFromFXTrack(
  trackId: string,
  effectId: string,
  tracks: FXTrack[]
): FXTrack[] {
  return tracks.map((track) => {
    if (track.id === trackId) {
      return {
        ...track,
        effectChain: track.effectChain.filter((effect) => effect.id !== effectId),
      };
    }
    return track;
  });
}

/**
 * Reorder effects in FX track
 */
export function reorderEffectsInFXTrack(
  trackId: string,
  newOrder: string[],
  tracks: FXTrack[]
): FXTrack[] {
  return tracks.map((track) => {
    if (track.id === trackId) {
      const orderedEffects = newOrder
        .map((effectId) => track.effectChain.find((e) => e.id === effectId))
        .filter((effect): effect is EffectNode => effect !== undefined);
      
      return {
        ...track,
        effectChain: orderedEffects,
      };
    }
    return track;
  });
}

/**
 * Create master track
 */
export function createMasterTrack(): MasterTrack {
  return {
    id: 'master-track',
    type: 'master',
    height: 80,
    locked: false,
    hidden: false,
    color: '#E74C3C',
    icon: 'volume',
    effectChain: [],
    outputSettings: {
      volume: 1.0,
      pan: 0,
      mute: false,
      solo: false,
      limiter: {
        enabled: true,
        threshold: -3,
        ceiling: -0.1,
      },
    },
  };
}

/**
 * Update master track output settings
 */
export function updateMasterTrackSettings(
  settings: Partial<OutputSettings>,
  masterTrack: MasterTrack
): MasterTrack {
  return {
    ...masterTrack,
    outputSettings: {
      ...masterTrack.outputSettings,
      ...settings,
    },
  };
}

/**
 * Create send/return routing
 */
export function createSendReturn(
  sourceTrackId: string,
  destinationTrackId: string,
  amount: number = 0.5,
  preFader: boolean = false
): SendReturn {
  return {
    id: `send-return-${Date.now()}`,
    sourceTrackId,
    destinationTrackId,
    amount: Math.max(0, Math.min(1, amount)),
    preFader,
  };
}

/**
 * Add send/return to FX track
 */
export function addSendReturnToFXTrack(
  trackId: string,
  sendReturn: SendReturn,
  tracks: FXTrack[]
): FXTrack[] {
  return tracks.map((track) => {
    if (track.id === trackId) {
      return {
        ...track,
        sendReturns: [...track.sendReturns, sendReturn],
      };
    }
    return track;
  });
}

/**
 * Remove send/return from FX track
 */
export function removeSendReturnFromFXTrack(
  trackId: string,
  sendReturnId: string,
  tracks: FXTrack[]
): FXTrack[] {
  return tracks.map((track) => {
    if (track.id === trackId) {
      return {
        ...track,
        sendReturns: track.sendReturns.filter((sr) => sr.id !== sendReturnId),
      };
    }
    return track;
  });
}

// ============================================================================
// Annotation and Marker Tracks (10D.3)
// ============================================================================

/**
 * Create annotation track
 */
export function createAnnotationTrack(
  name: string = 'Annotations'
): AnnotationTrack {
  return {
    id: `annotation-track-${Date.now()}`,
    type: 'annotation',
    height: 40,
    locked: false,
    hidden: false,
    color: '#F39C12',
    icon: 'comment',
    annotations: [],
  };
}

/**
 * Add annotation
 */
export function addAnnotation(
  trackId: string,
  time: number,
  text: string,
  category: Annotation['category'] = 'note',
  duration?: number,
  tracks: AnnotationTrack[]
): AnnotationTrack[] {
  return tracks.map((track) => {
    if (track.id === trackId) {
      const newAnnotation: Annotation = {
        id: `annotation-${Date.now()}`,
        time,
        duration,
        text,
        color: getAnnotationColor(category),
        category,
        timestamp: new Date(),
      };
      
      return {
        ...track,
        annotations: [...track.annotations, newAnnotation],
      };
    }
    return track;
  });
}

/**
 * Remove annotation
 */
export function removeAnnotation(
  trackId: string,
  annotationId: string,
  tracks: AnnotationTrack[]
): AnnotationTrack[] {
  return tracks.map((track) => {
    if (track.id === trackId) {
      return {
        ...track,
        annotations: track.annotations.filter((a) => a.id !== annotationId),
      };
    }
    return track;
  });
}

/**
 * Update annotation
 */
export function updateAnnotation(
  trackId: string,
  annotationId: string,
  updates: Partial<Annotation>,
  tracks: AnnotationTrack[]
): AnnotationTrack[] {
  return tracks.map((track) => {
    if (track.id === trackId) {
      return {
        ...track,
        annotations: track.annotations.map((annotation) => {
          if (annotation.id === annotationId) {
            return {
              ...annotation,
              ...updates,
            };
          }
          return annotation;
        }),
      };
    }
    return track;
  });
}

/**
 * Get annotation color by category
 */
function getAnnotationColor(category: Annotation['category']): string {
  const colors: Record<Annotation['category'], string> = {
    note: '#3498DB',
    todo: '#F39C12',
    warning: '#E74C3C',
    info: '#2ECC71',
  };
  
  return colors[category];
}

/**
 * Create marker track
 */
export function createMarkerTrack(
  name: string = 'Markers'
): MarkerTrack {
  return {
    id: `marker-track-${Date.now()}`,
    type: 'marker',
    height: 30,
    locked: false,
    hidden: false,
    color: '#E67E22',
    icon: 'bookmark',
    markers: [],
  };
}

/**
 * Add marker
 */
export function addMarker(
  trackId: string,
  time: number,
  label: string,
  type: Marker['type'] = 'custom',
  tracks: MarkerTrack[]
): MarkerTrack[] {
  return tracks.map((track) => {
    if (track.id === trackId) {
      const newMarker: Marker = {
        id: `marker-${Date.now()}`,
        time,
        label,
        color: getMarkerColor(type),
        type,
      };
      
      return {
        ...track,
        markers: [...track.markers, newMarker],
      };
    }
    return track;
  });
}

/**
 * Remove marker
 */
export function removeMarker(
  trackId: string,
  markerId: string,
  tracks: MarkerTrack[]
): MarkerTrack[] {
  return tracks.map((track) => {
    if (track.id === trackId) {
      return {
        ...track,
        markers: track.markers.filter((m) => m.id !== markerId),
      };
    }
    return track;
  });
}

/**
 * Update marker
 */
export function updateMarker(
  trackId: string,
  markerId: string,
  updates: Partial<Marker>,
  tracks: MarkerTrack[]
): MarkerTrack[] {
  return tracks.map((track) => {
    if (track.id === trackId) {
      return {
        ...track,
        markers: track.markers.map((marker) => {
          if (marker.id === markerId) {
            return {
              ...marker,
              ...updates,
            };
          }
          return marker;
        }),
      };
    }
    return track;
  });
}

/**
 * Get marker color by type
 */
function getMarkerColor(type: Marker['type']): string {
  const colors: Record<Marker['type'], string> = {
    chapter: '#9B59B6',
    cue: '#3498DB',
    beat: '#E74C3C',
    section: '#2ECC71',
    custom: '#95A5A6',
  };
  
  return colors[type];
}

/**
 * Find markers in time range
 */
export function findMarkersInRange(
  startTime: number,
  endTime: number,
  track: MarkerTrack
): Marker[] {
  return track.markers.filter(
    (marker) => marker.time >= startTime && marker.time <= endTime
  );
}

/**
 * Find nearest marker to time
 */
export function findNearestMarker(
  time: number,
  track: MarkerTrack,
  maxDistance: number = Infinity
): Marker | null {
  let nearestMarker: Marker | null = null;
  let minDistance = maxDistance;
  
  for (const marker of track.markers) {
    const distance = Math.abs(marker.time - time);
    if (distance < minDistance) {
      minDistance = distance;
      nearestMarker = marker;
    }
  }
  
  return nearestMarker;
}

/**
 * Create layer/calque track for organization
 */
export function createLayerTrack(
  name: string,
  purpose: LayerTrack['purpose'] = 'organization',
  parentTrackId?: string
): LayerTrack {
  return {
    id: `layer-track-${Date.now()}`,
    type: 'layer',
    height: 50,
    locked: false,
    hidden: false,
    color: '#95A5A6',
    icon: 'layers',
    purpose,
    parentTrackId,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get all tracks in a group
 */
export function getTracksInGroup(
  groupId: string,
  groups: TrackGroup[],
  tracks: Track[]
): Track[] {
  const group = groups.find((g) => g.id === groupId);
  if (!group) return [];
  
  return tracks.filter((track) => group.trackIds.includes(track.id));
}

/**
 * Get track by ID
 */
export function getTrackById(
  trackId: string,
  tracks: Track[]
): Track | null {
  return tracks.find((track) => track.id === trackId) || null;
}

/**
 * Check if track is in any group
 */
export function isTrackInGroup(
  trackId: string,
  groups: TrackGroup[]
): boolean {
  return groups.some((group) => group.trackIds.includes(trackId));
}

/**
 * Get group containing track
 */
export function getGroupContainingTrack(
  trackId: string,
  groups: TrackGroup[]
): TrackGroup | null {
  return groups.find((group) => group.trackIds.includes(trackId)) || null;
}

/**
 * Lock/unlock all tracks in group
 */
export function toggleGroupLock(
  groupId: string,
  groups: TrackGroup[],
  tracks: Track[]
): { groups: TrackGroup[]; tracks: Track[] } {
  const group = groups.find((g) => g.id === groupId);
  if (!group) return { groups, tracks };
  
  const newLockState = !group.locked;
  
  const updatedGroups = groups.map((g) => {
    if (g.id === groupId) {
      return { ...g, locked: newLockState };
    }
    return g;
  });
  
  const updatedTracks = tracks.map((track) => {
    if (group.trackIds.includes(track.id)) {
      return { ...track, locked: newLockState };
    }
    return track;
  });
  
  return { groups: updatedGroups, tracks: updatedTracks };
}

/**
 * Hide/show all tracks in group
 */
export function toggleGroupVisibility(
  groupId: string,
  groups: TrackGroup[],
  tracks: Track[]
): { groups: TrackGroup[]; tracks: Track[] } {
  const group = groups.find((g) => g.id === groupId);
  if (!group) return { groups, tracks };
  
  const newHiddenState = !group.hidden;
  
  const updatedGroups = groups.map((g) => {
    if (g.id === groupId) {
      return { ...g, hidden: newHiddenState };
    }
    return g;
  });
  
  const updatedTracks = tracks.map((track) => {
    if (group.trackIds.includes(track.id)) {
      return { ...track, hidden: newHiddenState };
    }
    return track;
  });
  
  return { groups: updatedGroups, tracks: updatedTracks };
}

