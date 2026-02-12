/**
 * Composition Store for StoryCore
 * 
 * Manages compositions, tracks, clips with support for:
 * - Unlimited nested compositions
 * - Full CRUD operations
 * - Clipboard (copy/paste)
 * - Undo/redo stack
 * - Parent-child composition relationships
 */

import { v4 as uuidv4 } from 'uuid';
import {
  Composition,
  Track,
  Clip,
  CompositionId,
  TrackId,
  ClipId,
  TimelineState,
  ClipboardState,
  ClipboardItem,
  UndoRedoAction,
  UndoActionType,
  SelectionState,
  NestedComposition,
  Duration,
  TimeStamp,
  TrackType,
  ClipType,
  VisualProperties,
  AudioProperties,
  Keyframe,
  HistoryEntry,
} from '../services/animation/CompositionTypes';

// ============================================================================
// State Interface
// ============================================================================

interface CompositionStoreState {
  /** All compositions indexed by ID */
  compositions: Map<CompositionId, Composition>;
  
  /** All tracks indexed by ID */
  tracks: Map<TrackId, Track>;
  
  /** All clips indexed by ID */
  clips: Map<ClipId, Clip>;
  
  /** Root composition ID (top-level) */
  rootCompositionId: CompositionId | null;
  
  /** Currently active composition ID */
  activeCompositionId: CompositionId | null;
  
  /** Timeline state */
  timeline: TimelineState;
  
  /** Clipboard state */
  clipboard: ClipboardState;
  
  /** Selection state */
  selection: SelectionState;
  
  /** Undo stack */
  undoStack: HistoryEntry[];
  
  /** Redo stack */
  redoStack: HistoryEntry[];
  
  /** Maximum undo history size */
  maxUndoHistory: number;
  
  /** Whether to skip next history entry (for batch operations) */
  skipNextHistory: boolean;
}

// ============================================================================
// Initial State
// ============================================================================

const initialState: CompositionStoreState = {
  compositions: new Map(),
  tracks: new Map(),
  clips: new Map(),
  rootCompositionId: null,
  activeCompositionId: null,
  timeline: {
    currentCompositionId: '',
    playhead: 0,
    zoom: 50,
    scrollOffset: 0,
    isPlaying: false,
    playbackRate: 1,
    visibleTimeStart: 0,
    visibleTimeEnd: 60000,
    selectedClipIds: [],
    selectedTrackIds: [],
  },
  clipboard: {
    items: [],
    hasContent: false,
  },
  selection: {
    selectedCompositionIds: [],
    selectedTrackIds: [],
    selectedClipIds: [],
    isMultiSelecting: false,
  },
  undoStack: [],
  redoStack: [],
  maxUndoHistory: 100,
  skipNextHistory: false,
};

// ============================================================================
// Store Class
// ============================================================================

class CompositionStore {
  private state: CompositionStoreState;
  private listeners: Set<(state: CompositionStoreState) => void> = new Set();
  private historyListeners: Set<(canUndo: boolean, canRedo: boolean) => void> = new Set();

  constructor() {
    this.state = { ...initialState };
  }

  // ==========================================================================
  // Subscription
  // ==========================================================================

  subscribe(listener: (state: CompositionStoreState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  subscribeToHistory(listener: (canUndo: boolean, canRedo: boolean) => void): () => void {
    this.historyListeners.add(listener);
    return () => this.historyListeners.delete(listener);
  }

  private notify(): void {
    const canUndo = this.state.undoStack.length > 0;
    const canRedo = this.state.redoStack.length > 0;
    this.listeners.forEach(listener => listener(this.state));
    this.historyListeners.forEach(listener => listener(canUndo, canRedo));
  }

  private getState(): CompositionStoreState {
    return { ...this.state };
  }

  // ==========================================================================
  // UUID Generator
  // ==========================================================================

  private generateId<T extends string>(): T {
    return uuidv4() as T;
  }

  // ==========================================================================
  // Composition CRUD Operations
  // ==========================================================================

  /**
   * Create a new composition
   */
  createComposition(
    name: string,
    width: number = 1920,
    height: number = 1080,
    duration: Duration = 60000,
    fps: number = 30,
    parentId: CompositionId | null = null
  ): Composition {
    const id = this.generateId<CompositionId>();
    const now = new Date();

    const composition: Composition = {
      id,
      name,
      width,
      height,
      duration,
      fps,
      trackIds: [],
      parentCompositionId: parentId,
      nestedCompositionIds: [],
      currentTime: 0,
      isActive: true,
      metadata: {},
      createdAt: now,
      updatedAt: now,
    };

    // Create default tracks
    const videoTrack = this.createTrackInternal(id, 'Video', 'video', 0);
    const audioTrack = this.createTrackInternal(id, 'Audio', 'audio', 1);

    composition.trackIds = [videoTrack.id, audioTrack.id];

    // Add to parent composition if nested
    if (parentId) {
      const parent = this.state.compositions.get(parentId);
      if (parent) {
        parent.nestedCompositionIds.push(id);
        parent.updatedAt = now;
      }
    }

    // Set as root if no parent
    if (!parentId && !this.state.rootCompositionId) {
      this.state.rootCompositionId = id;
    }

    this.state.compositions.set(id, composition);
    this.state.tracks.set(videoTrack.id, videoTrack);
    this.state.tracks.set(audioTrack.id, audioTrack);

    this.recordHistory('create_composition', 'composition', id, null, composition);
    this.notify();

    return composition;
  }

  /**
   * Create track internally (used by composition creation)
   */
  private createTrackInternal(
    compositionId: CompositionId,
    name: string,
    type: TrackType,
    sortOrder: number
  ): Track {
    const id = this.generateId<TrackId>();
    const track: Track = {
      id,
      name,
      compositionId,
      clipIds: [],
      type,
      isVisible: true,
      isLocked: false,
      height: 60,
      sortOrder,
      volume: 1,
      isMuted: false,
    };
    return track;
  }

  /**
   * Add a track to a composition
   */
  addTrack(
    compositionId: CompositionId,
    name: string,
    type: TrackType = 'video'
  ): Track {
    const composition = this.state.compositions.get(compositionId);
    if (!composition) {
      throw new Error(`Composition ${compositionId} not found`);
    }

    const id = this.generateId<TrackId>();
    const sortOrder = composition.trackIds.length;

    const track: Track = {
      id,
      name,
      compositionId,
      clipIds: [],
      type,
      isVisible: true,
      isLocked: false,
      height: 60,
      sortOrder,
      volume: 1,
      isMuted: false,
    };

    composition.trackIds.push(track.id);
    composition.updatedAt = new Date();
    this.state.tracks.set(id, track);

    this.recordHistory('create_track', 'track', id, null, track);
    this.notify();

    return track;
  }

  /**
   * Delete a track
   */
  deleteTrack(trackId: TrackId): boolean {
    const track = this.state.tracks.get(trackId);
    if (!track) return false;

    // Delete all clips on the track
    track.clipIds.forEach(clipId => this.deleteClipInternal(clipId));

    // Remove from composition
    const composition = this.state.compositions.get(track.compositionId);
    if (composition) {
      composition.trackIds = composition.trackIds.filter(id => id !== trackId);
      composition.updatedAt = new Date();
    }

    this.state.tracks.delete(trackId);
    this.recordHistory('delete_track', 'track', trackId, track, null);
    this.notify();

    return true;
  }

  /**
   * Get composition by ID
   */
  getComposition(id: CompositionId): Composition | undefined {
    return this.state.compositions.get(id);
  }

  /**
   * Get all compositions
   */
  getAllCompositions(): Composition[] {
    return Array.from(this.state.compositions.values());
  }

  /**
   * Update composition
   */
  updateComposition(
    id: CompositionId,
    updates: Partial<Omit<Composition, 'id' | 'createdAt'>>
  ): Composition | null {
    const composition = this.state.compositions.get(id);
    if (!composition) return null;

    const previousState = { ...composition };
    Object.assign(composition, updates, { updatedAt: new Date() });

    this.recordHistory('update_composition', 'composition', id, previousState, composition);
    this.notify();

    return composition;
  }

  /**
   * Delete a composition
   */
  deleteComposition(id: CompositionId): boolean {
    const composition = this.state.compositions.get(id);
    if (!composition) return false;

    // Recursively delete nested compositions
    composition.nestedCompositionIds.forEach(nestedId => {
      this.deleteComposition(nestedId);
    });

    // Delete all tracks and clips
    composition.trackIds.forEach(trackId => {
      this.deleteTrack(trackId);
    });

    // Remove from parent
    if (composition.parentCompositionId) {
      const parent = this.state.compositions.get(composition.parentCompositionId);
      if (parent) {
        parent.nestedCompositionIds = parent.nestedCompositionIds.filter(
          nestedId => nestedId !== id
        );
        parent.updatedAt = new Date();
      }
    }

    // Update root if needed
    if (this.state.rootCompositionId === id) {
      this.state.rootCompositionId = null;
    }

    this.state.compositions.delete(id);
    this.recordHistory('delete_composition', 'composition', id, composition, null);
    this.notify();

    return true;
  }

  // ==========================================================================
  // Clip CRUD Operations
  // ==========================================================================

  /**
   * Add a clip to a track
   */
  addClip(
    trackId: TrackId,
    name: string,
    startTime: TimeStamp,
    duration: Duration,
    type: ClipType,
    assetId?: string
  ): Clip {
    const track = this.state.tracks.get(trackId);
    if (!track) {
      throw new Error(`Track ${trackId} not found`);
    }

    const id = this.generateId<ClipId>();
    const endTime = startTime + duration;

    const clip: Clip = {
      id,
      name,
      trackId,
      compositionId: track.compositionId,
      startTime,
      endTime,
      sourceStartTime: 0,
      sourceEndTime: duration,
      type,
      assetId,
      visualProperties: this.getDefaultVisualProperties(),
      audioProperties: this.getDefaultAudioProperties(),
      effectIds: [],
      keyframes: [],
      isSelected: false,
      isLocked: false,
    };

    track.clipIds.push(clip.id);
    this.state.clips.set(id, clip);

    this.recordHistory('create_clip', 'clip', id, null, clip);
    this.notify();

    return clip;
  }

  /**
   * Get default visual properties
   */
  private getDefaultVisualProperties(): VisualProperties {
    return {
      opacity: 1,
      scale: 1,
      rotation: 0,
      x: 0,
      y: 0,
    };
  }

  /**
   * Get default audio properties
   */
  private getDefaultAudioProperties(): AudioProperties {
    return {
      volume: 1,
      pan: 0,
      fadeIn: 0,
      fadeOut: 0,
    };
  }

  /**
   * Get clip by ID
   */
  getClip(id: ClipId): Clip | undefined {
    return this.state.clips.get(id);
  }

  /**
   * Get all clips for a track
   */
  getClipsForTrack(trackId: TrackId): Clip[] {
    const track = this.state.tracks.get(trackId);
    if (!track) return [];

    return track.clipIds
      .map(id => this.state.clips.get(id))
      .filter((clip): clip is Clip => clip !== undefined);
  }

  /**
   * Move a clip to a new track and/or time
   */
  moveClip(
    clipId: ClipId,
    newTrackId: TrackId,
    newStartTime: TimeStamp
  ): Clip | null {
    const clip = this.state.clips.get(clipId);
    if (!clip) return null;

    const oldTrackId = clip.trackId;
    const oldStartTime = clip.startTime;

    // Remove from old track
    const oldTrack = this.state.tracks.get(oldTrackId);
    if (oldTrack) {
      oldTrack.clipIds = oldTrack.clipIds.filter(id => id !== clipId);
    }

    // Add to new track
    const newTrack = this.state.tracks.get(newTrackId);
    if (!newTrack) {
      // Revert
      if (oldTrack) oldTrack.clipIds.push(clipId);
      return null;
    }

    // Calculate new end time
    const duration = clip.endTime - clip.startTime;
    
    // Update clip
    clip.trackId = newTrackId;
    clip.compositionId = newTrack.compositionId;
    clip.startTime = newStartTime;
    clip.endTime = newStartTime + duration;

    newTrack.clipIds.push(clipId);

    this.recordHistory('move_clip', 'clip', clipId, 
      { trackId: oldTrackId, startTime: oldStartTime },
      { trackId: newTrackId, startTime: newStartTime }
    );
    this.notify();

    return clip;
  }

  /**
   * Resize a clip
   */
  resizeClip(
    clipId: ClipId,
    newStartTime: TimeStamp,
    newEndTime: TimeStamp
  ): Clip | null {
    const clip = this.state.clips.get(clipId);
    if (!clip) return null;

    const previousState = {
      startTime: clip.startTime,
      endTime: clip.endTime,
    };

    clip.startTime = newStartTime;
    clip.endTime = newEndTime;
    clip.sourceEndTime = newEndTime - newStartTime;

    this.recordHistory('resize_clip', 'clip', clipId, previousState, {
      startTime: newStartTime,
      endTime: newEndTime,
    });
    this.notify();

    return clip;
  }

  /**
   * Update a clip
   */
  updateClip(clipId: ClipId, updates: Partial<Clip>): Clip | null {
    const clip = this.state.clips.get(clipId);
    if (!clip) return null;

    const previousState = { ...clip };
    Object.assign(clip, updates);

    this.recordHistory('update_clip', 'clip', clipId, previousState, clip);
    this.notify();

    return clip;
  }

  /**
   * Delete a clip internally (used by track deletion)
   */
  private deleteClipInternal(clipId: ClipId): boolean {
    const clip = this.state.clips.get(clipId);
    if (!clip) return false;

    // Remove from track
    const track = this.state.tracks.get(clip.trackId);
    if (track) {
      track.clipIds = track.clipIds.filter(id => id !== clipId);
    }

    this.state.clips.delete(clipId);
    return true;
  }

  /**
   * Delete a clip
   */
  deleteClip(clipId: ClipId): boolean {
    const clip = this.state.clips.get(clipId);
    if (!clip) return false;

    const result = this.deleteClipInternal(clipId);
    if (result) {
      this.recordHistory('delete_clip', 'clip', clipId, clip, null);
      this.notify();
    }

    return result;
  }

  // ==========================================================================
  // Nested Composition Operations
  // ==========================================================================

  /**
   * Add a nested composition to a parent composition
   */
  addNestedComposition(
    parentCompositionId: CompositionId,
    nestedCompositionId: CompositionId
  ): boolean {
    const parent = this.state.compositions.get(parentCompositionId);
    const nested = this.state.compositions.get(nestedCompositionId);
    
    if (!parent || !nested) return false;

    if (parent.nestedCompositionIds.includes(nestedCompositionId)) return false;

    parent.nestedCompositionIds.push(nestedCompositionId);
    nested.parentCompositionId = parentCompositionId;
    parent.updatedAt = new Date();
    nested.updatedAt = new Date();

    this.recordHistory('add_nested_composition', 'composition', nestedCompositionId, null, {
      parentCompositionId,
    });
    this.notify();

    return true;
  }

  /**
   * Remove a nested composition from its parent
   */
  removeNestedComposition(nestedCompositionId: CompositionId): boolean {
    const nested = this.state.compositions.get(nestedCompositionId);
    if (!nested || !nested.parentCompositionId) return false;

    const parent = this.state.compositions.get(nested.parentCompositionId);
    if (parent) {
      parent.nestedCompositionIds = parent.nestedCompositionIds.filter(
        id => id !== nestedCompositionId
      );
      parent.updatedAt = new Date();
    }

    nested.parentCompositionId = null;
    nested.updatedAt = new Date();

    this.recordHistory('remove_nested_composition', 'composition', nestedCompositionId, {
      parentCompositionId: parent?.id ?? null,
    }, null);
    this.notify();

    return true;
  }

  /**
   * Get the full nesting path from root to a composition
   */
  getNestingPath(compositionId: CompositionId): CompositionId[] {
    const path: CompositionId[] = [];
    let currentId: CompositionId | null = compositionId;

    while (currentId) {
      path.unshift(currentId);
      const composition = this.state.compositions.get(currentId);
      currentId = composition?.parentCompositionId ?? null;
    }

    return path;
  }

  /**
   * Get all nested compositions recursively
   */
  getNestedCompositions(compositionId: CompositionId): Composition[] {
    const composition = this.state.compositions.get(compositionId);
    if (!composition) return [];

    const nested: Composition[] = [];
    
    composition.nestedCompositionIds.forEach(id => {
      const nestedComp = this.state.compositions.get(id);
      if (nestedComp) {
        nested.push(nestedComp);
        nested.push(...this.getNestedCompositions(id));
      }
    });

    return nested;
  }

  /**
   * Get nesting depth of a composition
   */
  getNestingDepth(compositionId: CompositionId): number {
    let depth = 0;
    let currentId: CompositionId | null = compositionId;

    while (currentId) {
      const composition = this.state.compositions.get(currentId);
      currentId = composition?.parentCompositionId ?? null;
      depth++;
    }

    return depth - 1; // Subtract 1 because we start from the composition itself
  }

  // ==========================================================================
  // Clipboard Operations
  // ==========================================================================

  /**
   * Copy a clip to clipboard
   */
  copyClip(clipId: ClipId): boolean {
    const clip = this.state.clips.get(clipId);
    if (!clip) return false;

    const item: ClipboardItem = {
      type: 'clip',
      data: { ...clip },
      sourceId: clipId,
      copiedAt: new Date(),
    };

    this.state.clipboard.items = [item];
    this.state.clipboard.hasContent = true;
    this.notify();

    return true;
  }

  /**
   * Copy multiple clips to clipboard
   */
  copyClips(clipIds: ClipId[]): boolean {
    const items: ClipboardItem[] = [];

    clipIds.forEach(clipId => {
      const clip = this.state.clips.get(clipId);
      if (clip) {
        items.push({
          type: 'clip',
          data: { ...clip },
          sourceId: clipId,
          copiedAt: new Date(),
        });
      }
    });

    this.state.clipboard.items = items;
    this.state.clipboard.hasContent = items.length > 0;
    this.notify();

    return items.length > 0;
  }

  /**
   * Paste clipboard content to a track
   */
  pasteClips(trackId: TrackId, insertTime: TimeStamp): Clip[] {
    if (!this.state.clipboard.hasContent) return [];

    const pasted: Clip[] = [];

    this.state.clipboard.items.forEach(item => {
      if (item.type === 'clip') {
        const sourceClip = item.data as Clip;
        const newClip = this.addClip(
          trackId,
          `${sourceClip.name} (Copy)`,
          insertTime,
          sourceClip.endTime - sourceClip.startTime,
          sourceClip.type,
          sourceClip.assetId
        );

        // Copy properties
        newClip.visualProperties = { ...sourceClip.visualProperties };
        newClip.audioProperties = { ...sourceClip.audioProperties };
        newClip.keyframes = [...sourceClip.keyframes];
        newClip.effectIds = [...sourceClip.effectIds];

        pasted.push(newClip);
      }
    });

    this.recordHistory('paste_clip', 'clip', pasted.map(c => c.id)[0] ?? '', null, pasted);
    this.notify();

    return pasted;
  }

  /**
   * Get clipboard state
   */
  getClipboardState(): ClipboardState {
    return { ...this.state.clipboard };
  }

  /**
   * Clear clipboard
   */
  clearClipboard(): void {
    this.state.clipboard.items = [];
    this.state.clipboard.hasContent = false;
    this.notify();
  }

  // ==========================================================================
  // Timeline Operations
  // ==========================================================================

  /**
   * Set the active composition
   */
  setActiveComposition(compositionId: CompositionId): void {
    const composition = this.state.compositions.get(compositionId);
    if (composition) {
      this.state.activeCompositionId = compositionId;
      this.state.timeline.currentCompositionId = compositionId;
      this.state.timeline.playhead = composition.currentTime;
      this.notify();
    }
  }

  /**
   * Set playhead position
   */
  setPlayhead(time: TimeStamp): void {
    this.state.timeline.playhead = time;
    
    const composition = this.state.compositions.get(this.state.timeline.currentCompositionId);
    if (composition) {
      composition.currentTime = time;
    }

    this.notify();
  }

  /**
   * Set zoom level
   */
  setZoom(zoom: number): void {
    this.state.timeline.zoom = Math.max(1, Math.min(200, zoom));
    this.notify();
  }

  /**
   * Play/pause
   */
  setPlaying(isPlaying: boolean): void {
    this.state.timeline.isPlaying = isPlaying;
    this.notify();
  }

  /**
   * Get timeline state
   */
  getTimelineState(): TimelineState {
    return { ...this.state.timeline };
  }

  // ==========================================================================
  // Selection Operations
  // ==========================================================================

  /**
   * Select a clip
   */
  selectClip(clipId: ClipId, multiSelect: boolean = false): void {
    if (multiSelect) {
      this.state.selection.selectedClipIds.push(clipId);
    } else {
      this.state.selection.selectedClipIds = [clipId];
    }
    this.notify();
  }

  /**
   * Deselect a clip
   */
  deselectClip(clipId: ClipId): void {
    this.state.selection.selectedClipIds = this.state.selection.selectedClipIds.filter(
      id => id !== clipId
    );
    this.notify();
  }

  /**
   * Clear all selections
   */
  clearSelection(): void {
    this.state.selection.selectedClipIds = [];
    this.state.selection.selectedTrackIds = [];
    this.state.selection.selectedCompositionIds = [];
    this.notify();
  }

  /**
   * Get selection state
   */
  getSelectionState(): SelectionState {
    return { ...this.state.selection };
  }

  // ==========================================================================
  // Undo/Redo Operations
  // ==========================================================================

  /**
   * Record a history entry
   */
  private recordHistory(
    operation: UndoActionType,
    entityType: 'composition' | 'track' | 'clip',
    entityId: string,
    previousValue: unknown,
    newValue: unknown,
    parentId?: string
  ): void {
    if (this.state.skipNextHistory) return;

    const entry: HistoryEntry = {
      id: this.generateId<string>(),
      operation,
      entityType,
      entityId,
      previousValue,
      newValue,
      parentId,
      timestamp: new Date(),
    };

    this.state.undoStack.push(entry);

    // Limit history size
    if (this.state.undoStack.length > this.state.maxUndoHistory) {
      this.state.undoStack.shift();
    }

    // Clear redo stack on new action
    this.state.redoStack = [];
  }

  /**
   * Undo the last action
   */
  undo(): boolean {
    const entry = this.state.undoStack.pop();
    if (!entry) return false;

    this.state.redoStack.push(entry);
    this.applyHistoryEntry(entry, false);
    this.notify();

    return true;
  }

  /**
   * Redo the last undone action
   */
  redo(): boolean {
    const entry = this.state.redoStack.pop();
    if (!entry) return false;

    this.state.undoStack.push(entry);
    this.applyHistoryEntry(entry, true);
    this.notify();

    return true;
  }

  /**
   * Apply a history entry
   */
  private applyHistoryEntry(entry: HistoryEntry, isRedo: boolean): void {
    const { entityType, entityId, previousValue, newValue } = entry;
    const value = isRedo ? newValue : previousValue;

    switch (entityType) {
      case 'composition':
        if (value === null) {
          this.state.compositions.delete(entityId as CompositionId);
        } else {
          this.state.compositions.set(entityId as CompositionId, value as Composition);
        }
        break;

      case 'track':
        if (value === null) {
          this.state.tracks.delete(entityId as TrackId);
        } else {
          this.state.tracks.set(entityId as TrackId, value as Track);
        }
        break;

      case 'clip':
        if (value === null) {
          this.state.clips.delete(entityId as ClipId);
        } else {
          this.state.clips.set(entityId as ClipId, value as Clip);
        }
        break;
    }
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.state.undoStack.length > 0;
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.state.redoStack.length > 0;
  }

  /**
   * Begin batch operation (skips history until endBatch is called)
   */
  beginBatch(): void {
    this.state.skipNextHistory = true;
  }

  /**
   * End batch operation
   */
  endBatch(): void {
    this.state.skipNextHistory = false;
  }

  /**
   * Clear all history
   */
  clearHistory(): void {
    this.state.undoStack = [];
    this.state.redoStack = [];
    this.notify();
  }

  // ==========================================================================
  // Track Operations
  // ==========================================================================

  /**
   * Get track by ID
   */
  getTrack(id: TrackId): Track | undefined {
    return this.state.tracks.get(id);
  }

  /**
   * Get all tracks for a composition
   */
  getTracksForComposition(compositionId: CompositionId): Track[] {
    const composition = this.state.compositions.get(compositionId);
    if (!composition) return [];

    return composition.trackIds
      .map(id => this.state.tracks.get(id))
      .filter((track): track is Track => track !== undefined)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  /**
   * Update a track
   */
  updateTrack(trackId: TrackId, updates: Partial<Track>): Track | null {
    const track = this.state.tracks.get(trackId);
    if (!track) return null;

    const previousState = { ...track };
    Object.assign(track, updates);

    this.recordHistory('update_track', 'track', trackId, previousState, track);
    this.notify();

    return track;
  }

  // ==========================================================================
  // Serialization
  // ==========================================================================

  /**
   * Export composition with all nested content
   */
  exportComposition(compositionId: CompositionId): object | null {
    const composition = this.state.compositions.get(compositionId);
    if (!composition) return null;

    const tracks = this.getTracksForComposition(compositionId);
    const nested = this.getNestedCompositions(compositionId);

    return {
      composition: { ...composition },
      tracks: tracks.map(t => ({ ...t })),
      clips: Array.from(this.state.clips.values())
        .filter(c => c.compositionId === compositionId)
        .map(c => ({ ...c })),
      nested: nested.map(c => this.exportComposition(c.id)),
    };
  }

  /**
   * Import composition
   */
  importComposition(data: object, parentId: CompositionId | null = null): Composition | null {
    try {
      const { composition, tracks, clips, nested } = data as {
        composition: Composition;
        tracks: Track[];
        clips: Clip[];
        nested: unknown[];
      };

      // Generate new IDs
      const newId = this.generateId<CompositionId>();
      const idMap = new Map<string, string>();

      // Create new composition
      const newComposition: Composition = {
        ...composition,
        id: newId,
        parentCompositionId: parentId,
        trackIds: [],
        nestedCompositionIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.state.compositions.set(newId, newComposition);

      // Import tracks
      tracks.forEach((track, index) => {
        const newTrackId = this.generateId<TrackId>();
        idMap.set(track.id, newTrackId);

        const newTrack: Track = {
          ...track,
          id: newTrackId,
          compositionId: newId,
          clipIds: [],
        };

        this.state.tracks.set(newTrackId, newTrack);
        newComposition.trackIds.push(newTrackId);
      });

      // Import clips
      clips.forEach(clip => {
        const newClipId = this.generateId<ClipId>();
        idMap.set(clip.id, newClipId);

        const newClip: Clip = {
          ...clip,
          id: newClipId,
          trackId: idMap.get(clip.trackId) ?? clip.trackId,
          compositionId: newId,
        };

        this.state.clips.set(newClipId, newClip);

        const track = this.state.tracks.get(newClip.trackId);
        if (track) {
          track.clipIds.push(newClipId);
        }
      });

      // Update track references in clips
      this.state.clips.forEach(clip => {
        if (idMap.has(clip.trackId)) {
          clip.trackId = idMap.get(clip.trackId) as TrackId;
        }
      });

      // Import nested
      if (nested && nested.length > 0) {
        nested.forEach(childData => {
          const child = this.importComposition(childData as object, newId);
          if (child) {
            newComposition.nestedCompositionIds.push(child.id);
          }
        });
      }

      // Add to parent
      if (parentId) {
        const parent = this.state.compositions.get(parentId);
        if (parent) {
          parent.nestedCompositionIds.push(newId);
        }
      }

      // Set as root if no parent
      if (!parentId && !this.state.rootCompositionId) {
        this.state.rootCompositionId = newId;
      }

      this.notify();
      return newComposition;
    } catch (error) {
      console.error('Failed to import composition:', error);
      return null;
    }
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const compositionStore = new CompositionStore();
export default compositionStore;
