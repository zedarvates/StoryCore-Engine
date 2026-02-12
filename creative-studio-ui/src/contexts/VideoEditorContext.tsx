/**
 * Video Editor Context
 * Global state management for the video editor
 */
import React, { createContext, useContext, useCallback, useState } from 'react';
import {
  EditorProject,
  MediaFile,
  Track,
  Clip,
  ExportSettings,
  EditorMode,
  UndoRedoState,
} from '../types/video-editor';

interface VideoEditorContextType {
  // State
  project: EditorProject | null;
  mediaLibrary: MediaFile[];
  tracks: Track[];
  clips: Clip[];
  selectedClipIds: string[];
  selectedTrackId: string | null;
  activePanel: 'effects' | 'text' | 'audio' | 'media';
  editorMode: EditorMode;
  previewUrl: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isDirty: boolean;
  undoStack: UndoRedoState[];
  redoStack: UndoRedoState[];
  showExportDialog: boolean;
  showSettingsDialog: boolean;
  
  // Setters
  setProject: React.Dispatch<React.SetStateAction<EditorProject | null>>;
  setMediaLibrary: React.Dispatch<React.SetStateAction<MediaFile[]>>;
  setTracks: React.Dispatch<React.SetStateAction<Track[]>>;
  setClips: React.Dispatch<React.SetStateAction<Clip[]>>;
  setSelectedClipIds: React.Dispatch<React.SetStateAction<string[]>>;
  setSelectedTrackId: React.Dispatch<React.SetStateAction<string | null>>;
  setActivePanel: React.Dispatch<React.SetStateAction<'effects' | 'text' | 'audio' | 'media'>>;
  setEditorMode: React.Dispatch<React.SetStateAction<EditorMode>>;
  setPreviewUrl: React.Dispatch<React.SetStateAction<string | null>>;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  setCurrentTime: React.Dispatch<React.SetStateAction<number>>;
  setDuration: React.Dispatch<React.SetStateAction<number>>;
  setShowExportDialog: React.Dispatch<React.SetStateAction<boolean>>;
  setShowSettingsDialog: React.Dispatch<React.SetStateAction<boolean>>;
  
  // Actions
  importMedia: (files: FileList) => Promise<void>;
  addClipToTimeline: (mediaId: string, trackId: string, startTime: number, inPoint?: number, outPoint?: number) => void;
  moveClip: (clipId: string, newTrackId: string, newStartTime: number) => void;
  trimClip: (clipId: string, inPoint?: number, outPoint?: number) => void;
  splitClip: (clipId: string, splitTime: number) => void;
  deleteClips: (clipIds: string[]) => void;
  updateClip: (clipId: string, updates: Partial<Clip>) => void;
  updateTrack: (trackId: string, updates: Partial<Track>) => void;
  deleteMedia: (mediaId: string) => void;
  selectClip: (clipId: string, addToSelection: boolean) => void;
  selectTrack: (trackId: string | null) => void;
  undo: () => void;
  redo: () => void;
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  export: (settings: ExportSettings) => Promise<void>;
  
  // Computed
  selectedClips: Clip[];
  selectedTrack: Track | null;
  canUndo: boolean;
  canRedo: boolean;
}

const VideoEditorContext = createContext<VideoEditorContextType | null>(null);

export const useVideoEditor = () => {
  const context = useContext(VideoEditorContext);
  if (!context) {
    throw new Error('useVideoEditor must be used within a VideoEditorProvider');
  }
  return context;
};

interface VideoEditorProviderProps {
  children: React.ReactNode;
  initialProject?: EditorProject | null;
}

export const VideoEditorProvider: React.FC<VideoEditorProviderProps> = ({
  children,
  initialProject = null,
}) => {
  const [project, setProject] = useState<EditorProject | null>(initialProject);
  const [mediaLibrary, setMediaLibrary] = useState<MediaFile[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [clips, setClips] = useState<Clip[]>([]);
  const [selectedClipIds, setSelectedClipIds] = useState<string[]>([]);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<'effects' | 'text' | 'audio' | 'media'>('media');
  const [editorMode, setEditorMode] = useState<EditorMode>(EditorMode.VIDEO);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDirty, setIsDirty] = useState(false);
  const [undoStack, setUndoStack] = useState<UndoRedoState[]>([]);
  const [redoStack, setRedoStack] = useState<UndoRedoState[]>([]);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  
  // Computed values
  const selectedClips = clips.filter(clip => selectedClipIds.includes(clip.id));
  const selectedTrack = tracks.find(track => track.id === selectedTrackId) || null;
  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;
  
  // Save to undo stack
  const saveToUndoStack = useCallback((newClips: Clip[], newTracks: Track[]) => {
    setUndoStack(prev => [...prev.slice(-19), {
      clips: [...newClips],
      tracks: [...newTracks],
      timestamp: Date.now(),
    }]);
    setRedoStack([]);
    setIsDirty(true);
  }, []);
  
  // Undo action
  const undo = useCallback(() => {
    if (undoStack.length === 0) return;
    
    const previousState = undoStack[undoStack.length - 1];
    const currentState: UndoRedoState = {
      clips: [...clips],
      tracks: [...tracks],
      timestamp: Date.now(),
    };
    
    setRedoStack(prev => [...prev, currentState]);
    setClips(previousState.clips);
    setTracks(previousState.tracks);
    setUndoStack(prev => prev.slice(0, -1));
  }, [undoStack, clips, tracks]);
  
  // Redo action
  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    
    const nextState = redoStack[redoStack.length - 1];
    const currentState: UndoRedoState = {
      clips: [...clips],
      tracks: [...tracks],
      timestamp: Date.now(),
    };
    
    setUndoStack(prev => [...prev, currentState]);
    setClips(nextState.clips);
    setTracks(nextState.tracks);
    setRedoStack(prev => prev.slice(0, -1));
  }, [redoStack, clips, tracks]);
  
  // Media actions (to be implemented with API)
  const importMedia = useCallback(async (files: FileList) => {
    // Placeholder - should be connected to API
    console.log('Importing media:', files);
  }, []);
  
  // Clip actions
  const addClipToTimeline = useCallback((
    mediaId: string,
    trackId: string,
    startTime: number,
    inPoint?: number,
    outPoint?: number
  ) => {
    const newClip: Clip = {
      id: `clip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      mediaId,
      trackId,
      startTime,
      inPoint: inPoint || 0,
      outPoint: outPoint,
      duration: (outPoint || 0) - (inPoint || 0),
      keyframes: [],
      effects: [],
    };
    
    saveToUndoStack([...clips, newClip], tracks.map(t => 
      t.id === trackId 
        ? { ...t, clips: [...t.clips, newClip.id] }
        : t
    ));
    
    setClips(prev => [...prev, newClip]);
    setTracks(prev => prev.map(t => 
      t.id === trackId 
        ? { ...t, clips: [...t.clips, newClip.id] }
        : t
    ));
  }, [clips, tracks, saveToUndoStack]);
  
  const moveClip = useCallback((clipId: string, newTrackId: string, newStartTime: number) => {
    saveToUndoStack(
      clips.map(clip => clip.id === clipId ? { ...clip, trackId: newTrackId, startTime: newStartTime } : clip),
      tracks
    );
    setClips(prev => prev.map(clip => 
      clip.id === clipId ? { ...clip, trackId: newTrackId, startTime: newStartTime } : clip
    ));
  }, [clips, tracks, saveToUndoStack]);
  
  const trimClip = useCallback((clipId: string, inPoint?: number, outPoint?: number) => {
    const clip = clips.find(c => c.id === clipId);
    if (!clip) return;
    
    saveToUndoStack(
      clips.map(c => c.id === clipId 
        ? { ...c, inPoint: inPoint ?? c.inPoint, outPoint: outPoint ?? c.outPoint }
        : c
      ),
      tracks
    );
    setClips(prev => prev.map(c => 
      c.id === clipId 
        ? { ...c, inPoint: inPoint ?? c.inPoint, outPoint: outPoint ?? c.outPoint }
        : c
    ));
  }, [clips, tracks, saveToUndoStack]);
  
  const splitClip = useCallback((clipId: string, splitTime: number) => {
    const clip = clips.find(c => c.id === clipId);
    if (!clip) return;
    
    const clipStart = clip.startTime;
    const clipEnd = clip.startTime + clip.duration;
    
    if (splitTime <= clipStart || splitTime >= clipEnd) return;
    
    const firstDuration = splitTime - clipStart;
    const secondClip: Clip = {
      ...clip,
      id: `clip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      startTime: splitTime,
      inPoint: clip.inPoint + firstDuration,
      duration: clip.duration - firstDuration,
    };
    
    const updatedFirstClip: Clip = {
      ...clip,
      outPoint: clip.inPoint + firstDuration,
      duration: firstDuration,
    };
    
    const newClips = clips.map(c => c.id === clipId ? updatedFirstClip : c).concat(secondClip);
    
    saveToUndoStack(newClips, tracks);
    setClips(newClips);
  }, [clips, tracks, saveToUndoStack]);
  
  const deleteClips = useCallback((clipIds: string[]) => {
    saveToUndoStack(
      clips.filter((c: Clip) => !clipIds.includes(c.id)),
      tracks.map((t: Track) => ({ ...t, clips: t.clips.filter((id: string) => !clipIds.includes(id)) }))
    );
    setClips((prev: Clip[]) => prev.filter((c: Clip) => !clipIds.includes(c.id)));
    setTracks((prev: Track[]) => prev.map((t: Track) => ({ ...t, clips: t.clips.filter((id: string) => !clipIds.includes(id)) })));
    setSelectedClipIds((prev: string[]) => prev.filter((id: string) => !clipIds.includes(id)));
  }, [clips, tracks, saveToUndoStack]);
  
  const selectClip = useCallback((clipId: string, addToSelection: boolean) => {
    setSelectedClipIds(prev => 
      addToSelection 
        ? (prev.includes(clipId) ? prev.filter(id => id !== clipId) : [...prev, clipId])
        : [clipId]
    );
  }, []);
  
  const selectTrack = useCallback((trackId: string | null) => {
    setSelectedTrackId(trackId);
  }, []);
  
  // Update clip action
  const updateClip = useCallback((clipId: string, updates: Partial<Clip>) => {
    saveToUndoStack(
      clips.map((c: Clip) => c.id === clipId ? { ...c, ...updates } : c),
      tracks
    );
    setClips((prev: Clip[]) => prev.map((c: Clip) => c.id === clipId ? { ...c, ...updates } : c));
  }, [clips, tracks, saveToUndoStack]);
  
  // Update track action
  const updateTrack = useCallback((trackId: string, updates: Partial<Track>) => {
    saveToUndoStack(
      clips,
      tracks.map((t: Track) => t.id === trackId ? { ...t, ...updates } : t)
    );
    setTracks((prev: Track[]) => prev.map((t: Track) => t.id === trackId ? { ...t, ...updates } : t));
  }, [clips, tracks, saveToUndoStack]);
  
  // Delete media action
  const deleteMedia = useCallback((mediaId: string) => {
    setMediaLibrary((prev: MediaFile[]) => prev.filter((m: MediaFile) => m.id !== mediaId));
  }, []);
  
  // Playback actions
  const play = useCallback(() => {
    setIsPlaying(true);
  }, []);
  
  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);
  
  const seek = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);
  
  // Export action (placeholder)
  const exportSettings = useCallback(async (settings: ExportSettings) => {
    console.log('Exporting with settings:', settings);
    // Should be connected to API
  }, []);
  
  const value: VideoEditorContextType = {
    // State
    project,
    mediaLibrary,
    tracks,
    clips,
    selectedClipIds,
    selectedTrackId,
    activePanel,
    editorMode,
    previewUrl,
    isPlaying,
    currentTime,
    duration,
    isDirty,
    undoStack,
    redoStack,
    showExportDialog,
    showSettingsDialog,
    
    // Setters
    setProject,
    setMediaLibrary,
    setTracks,
    setClips,
    setSelectedClipIds,
    setSelectedTrackId,
    setActivePanel,
    setEditorMode,
    setPreviewUrl,
    setIsPlaying,
    setCurrentTime,
    setDuration,
    setShowExportDialog,
    setShowSettingsDialog,
    
    // Actions
    importMedia,
    addClipToTimeline,
    moveClip,
    trimClip,
    splitClip,
    deleteClips,
    updateClip,
    updateTrack,
    deleteMedia,
    selectClip,
    selectTrack,
    undo,
    redo,
    play,
    pause,
    seek,
    export: exportSettings,
    
    // Computed
    selectedClips,
    selectedTrack,
    canUndo,
    canRedo,
  };
  
  return (
    <VideoEditorContext.Provider value={value}>
      {children}
    </VideoEditorContext.Provider>
  );
};

export default VideoEditorContext;

