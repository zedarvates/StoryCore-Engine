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
  VideoClip,
  AudioClip,
  ExportSettings,
  ExportJob,
  ExportJobStatus,
  EditorMode,
  UndoRedoState,
  TextLayer,
  AIEnhancementSettings
} from '../types/video-editor';
import { videoEditorAPI } from '../services/videoEditorAPI';

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
  exportStatus: ExportJobStatus | null;
  exportProgress: number;
  exportError: string | null;
  exportDownloadUrl: string | null;
  aiJobs: Record<string, { id: string; type: string; status: string; progress: number }>;
  
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
  updateClip: (clipId: string, updates: Partial<Clip & VideoClip & AudioClip>) => void;
  updateTrack: (trackId: string, updates: Partial<Track>) => void;
  deleteMedia: (mediaId: string) => void;
  selectClip: (clipId: string, addToSelection: boolean) => void;
  selectTrack: (trackId: string | null) => void;
  undo: () => void;
  redo: () => void;
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  export: (settings: ExportSettings) => Promise<ExportJob | undefined>;
  
  // AI Actions
  transcribeMedia: (mediaId: string) => Promise<void>;
  enhanceClip: (clipId: string, options: { type: string; intensity: number }) => Promise<void>;
  smartCrop: (mediaId: string, targetRatio: string) => Promise<void>;
  isolateVoice: (mediaId: string, intensity?: number) => Promise<void>;
  autoDucking: (mediaId: string, targetTrackId: string, reduction?: number) => Promise<void>;
  
  // Computed
  selectedClips: Clip[];
  selectedTrack: Track | null;
  canUndo: boolean;
  canRedo: boolean;
}

export const VideoEditorContext = createContext<VideoEditorContextType | null>(null);

export const useVideoEditor = () => {
  const context = useContext(VideoEditorContext);
  if (!context) {
    throw new Error('useVideoEditor must be used within a VideoEditorProvider');
  }
  return context;
};

interface VideoEditorProviderProps {
  children: React.ReactNode;
  projectId?: string;
  initialProject?: EditorProject | null;
}

export const VideoEditorProvider: React.FC<VideoEditorProviderProps> = ({
  children,
  projectId,
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
  const [exportStatus, setExportStatus] = useState<ExportJobStatus | null>(null);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportDownloadUrl, setExportDownloadUrl] = useState<string | null>(null);
  const [aiJobs, setAiJobs] = useState<Record<string, { id: string; type: string; status: string; progress: number }>>({});

  const autoSaveRef = React.useRef<NodeJS.Timeout | null>(null);
  const exportPollingRef = React.useRef<NodeJS.Timeout | null>(null);
  const aiPollingRef = React.useRef<Record<string, NodeJS.Timeout>>({});

  const trackAIJob = useCallback((jobId: string, type: string) => {
    setAiJobs(prev => ({
      ...prev,
      [jobId]: { id: jobId, type, status: 'pending', progress: 0 }
    }));

    const poll = async () => {
      try {
        const job = await videoEditorAPI.getAIJobStatus(jobId);
        setAiJobs(prev => ({
          ...prev,
          [jobId]: { 
            ...prev[jobId], 
            status: job.status, 
            progress: job.progress || (job.status === 'completed' ? 100 : 0) 
          }
        }));

        if (job.status === 'completed' || job.status === 'failed') {
          if (aiPollingRef.current[jobId]) {
            clearInterval(aiPollingRef.current[jobId]);
            delete aiPollingRef.current[jobId];
          }
          
          if (job.status === 'completed') {
            console.log(`AI Job ${type} (${jobId}) completed:`, job);
            // Handle completion results specific to job types if needed
          }
        }
      } catch (error) {
        console.error(`Error polling AI job ${jobId}:`, error);
        if (aiPollingRef.current[jobId]) {
          clearInterval(aiPollingRef.current[jobId]);
          delete aiPollingRef.current[jobId];
        }
      }
    };

    aiPollingRef.current[jobId] = setInterval(poll, 2000);
  }, []);

  // Initialize default tracks
  const initializeDefaultTracks = useCallback((_newProject: EditorProject) => {
    const defaultTracks: Track[] = [
      {
        id: `track-video-${Date.now()}`,
        type: 'video',
        name: 'Video 1',
        clips: [],
        locked: false,
        hidden: false,
        muted: false,
        height: 60,
        volume: 1,
      },
      {
        id: `track-audio-${Date.now()}`,
        type: 'audio',
        name: 'Audio 1',
        clips: [],
        locked: false,
        hidden: false,
        muted: false,
        height: 40,
        volume: 1,
      },
    ];
    setTracks(defaultTracks);
    setClips([]);
  }, []);

  // Project Loading
  React.useEffect(() => {
    const loadProject = async () => {
      if (initialProject) return;

      if (!projectId) {
        try {
          const newProject = await videoEditorAPI.createProject({
            name: 'Untitled Project',
            resolution: { width: 1920, height: 1080 },
            frameRate: 30,
          });
          setProject(newProject);
          initializeDefaultTracks(newProject);
        } catch (error) {
          console.error('Failed to create project:', error);
        }
      } else {
        try {
          const loadedProject = await videoEditorAPI.getProject(projectId);
          setProject(loadedProject);
          setTracks(loadedProject.tracks || []);
          setClips(loadedProject.clips || []);
          setMediaLibrary(loadedProject.media || []);
        } catch (error) {
          console.error('Failed to load project:', error);
        }
      }
    };
    loadProject();
  }, [projectId, initialProject, initializeDefaultTracks]);

  // Auto-save
  React.useEffect(() => {
    if (isDirty && project) {
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
      
      autoSaveRef.current = setTimeout(async () => {
        try {
          await videoEditorAPI.updateProject(project.id, { 
            tracks, 
            clips, 
            media: mediaLibrary 
          });
          setIsDirty(false);
        } catch (error) {
          console.error('Auto-save failed:', error);
        }
      }, 30000); // 30 seconds
    }
    return () => { if (autoSaveRef.current) clearTimeout(autoSaveRef.current); };
  }, [isDirty, project, tracks, clips, mediaLibrary]);

  // Calculate duration
  React.useEffect(() => {
    if (clips.length > 0) {
      const maxTime = clips.reduce((max, clip) => Math.max(max, clip.startTime + clip.duration), 0);
      setDuration(Math.max(maxTime, 30)); // Minimum 30s timeline
    } else {
      setDuration(30);
    }
  }, [clips]);
  
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
  
  // Media actions
  const importMedia = useCallback(async (files: FileList) => {
    if (!project) return;
    
    try {
      const importedMedia: MediaFile[] = [];
      for (const file of Array.from(files)) {
        const media = await videoEditorAPI.importMedia(project.id, file);
        importedMedia.push(media);
      }
      setMediaLibrary(prev => [...prev, ...importedMedia]);
      setIsDirty(true);
    } catch (error) {
      console.error('Failed to import media:', error);
      throw error;
    }
  }, [project]);
  
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
  const updateClip = useCallback((clipId: string, updates: Partial<Clip & VideoClip & AudioClip & TextLayer>) => {
    saveToUndoStack(
      clips.map((c: Clip) => c.id === clipId ? { ...c, ...updates } as Clip : c),
      tracks
    );
    setClips((prev: Clip[]) => prev.map((c: Clip) => c.id === clipId ? { ...c, ...updates } as Clip : c));
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
  
  // Export action
  const handleExport = useCallback(async (settings: ExportSettings) => {
    if (!project) return;
    
    try {
      console.log('Exporting with settings:', settings);
      setExportStatus(ExportJobStatus.QUEUED);
      setExportProgress(0);
      setExportError(null);
      setExportDownloadUrl(null);
      
      const job = await videoEditorAPI.exportProject(project.id, settings);
      
      setExportStatus(ExportJobStatus.PROCESSING);
      
      // Start polling
      const poll = async () => {
        try {
          const status = await videoEditorAPI.getExportProgress(job.id);
          setExportProgress(status.progress);
          setExportStatus(status.status);
          
          if (status.status === ExportJobStatus.COMPLETED) {
            setExportDownloadUrl(status.outputPath || null);
            if (exportPollingRef.current) clearInterval(exportPollingRef.current);
          } else if (status.status === ExportJobStatus.FAILED) {
            setExportError(status.error || 'Export failed');
            if (exportPollingRef.current) clearInterval(exportPollingRef.current);
          }
        } catch (error) {
          console.error('Polling export progress failed:', error);
        }
      };
      
      exportPollingRef.current = setInterval(poll, 2000);
      
      setShowExportDialog(false);
      return job;
    } catch (error) {
      console.error('Export failed:', error);
      setExportStatus(ExportJobStatus.FAILED);
      setExportError(error instanceof Error ? error.message : 'Export failed');
      throw error;
    }
  }, [project]);

  // AI Actions Implementation
  const transcribeMedia = useCallback(async (mediaId: string) => {
    try {
      if (!project) return;
      console.log('Transcribing media:', mediaId);
      const job = await videoEditorAPI.transcribeMedia({ media_id: mediaId, project_id: project.id });
      console.log('Transcription job started:', job.job_id);
      trackAIJob(job.job_id, 'transcription');
    } catch (error) {
      console.error('Transcription failed:', error);
    }
  }, [project, trackAIJob]);

  const enhanceClip = useCallback(async (clipId: string, options: { type: string; intensity: number }) => {
    try {
      const clip = clips.find(c => c.id === clipId);
      if (!clip) return;
      console.log('Enhancing clip:', clipId, options);
      const job = await videoEditorAPI.enhanceVideo({ 
        media_id: clip.mediaId, 
        enhancements: [{ type: options.type, strength: options.intensity / 100 }] 
      });
      console.log('Enhancement job started:', job.job_id);
      trackAIJob(job.job_id, 'enhancement');
    } catch (error) {
      console.error('Enhancement failed:', error);
    }
  }, [clips, trackAIJob]);

  const smartCrop = useCallback(async (mediaId: string, targetRatio: string) => {
    try {
      if (!project) return;
      console.log('Smart cropping media:', mediaId, targetRatio);
      const job = await videoEditorAPI.smartCrop(mediaId, targetRatio);
      console.log('Smart crop job started:', job.job_id);
      trackAIJob(job.job_id, 'smart_crop');
    } catch (error) {
      console.error('Smart crop failed:', error);
    }
  }, [project, trackAIJob]);

  const isolateVoice = useCallback(async (mediaId: string, intensity: number = 1.0) => {
    try {
      console.log('Isolating voice:', mediaId, intensity);
      const job = await videoEditorAPI.isolateVoice({ media_id: mediaId, intensity });
      console.log('Voice isolation job started:', job.job_id);
      trackAIJob(job.job_id, 'voice_isolation');
    } catch (error) {
      console.error('Voice isolation failed:', error);
    }
  }, [trackAIJob]);

  const autoDucking = useCallback(async (mediaId: string, targetTrackId: string, reduction: number = 15) => {
    try {
      console.log('Auto ducking:', mediaId, targetTrackId, reduction);
      const job = await videoEditorAPI.autoDucking({ music_id: mediaId, speech_id: targetTrackId, reduction_db: reduction });
      console.log('Auto ducking job started:', job.job_id);
      trackAIJob(job.job_id, 'auto_ducking');
    } catch (error) {
      console.error('Auto ducking failed:', error);
    }
  }, [trackAIJob]);

  // Clean up polling on unmount
  React.useEffect(() => {
    const aiPolls = aiPollingRef.current;
    return () => {
      if (exportPollingRef.current) clearInterval(exportPollingRef.current);
      Object.values(aiPolls).forEach(clearInterval);
    };
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
    exportStatus,
    exportProgress,
    exportError,
    exportDownloadUrl,
    aiJobs,
    
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
    export: handleExport,
    transcribeMedia,
    enhanceClip,
    smartCrop,
    isolateVoice,
    autoDucking,
    
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

