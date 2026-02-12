/**
 * Video Editor Page - Main Editor Interface
 * CapCut-style editor with preview, timeline, and properties panels
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { VideoEditorContext } from '../contexts/VideoEditorContext';
import { MediaLibrary } from '../components/VideoEditor/MediaLibrary';
import { Timeline } from '../sequence-editor/components/Timeline';
import { EffectsPanel } from '../components/VideoEditor/EffectsPanel';
import { TextPanel } from '../components/VideoEditor/TextPanel';
import { AudioMixerPanel } from '../components/VideoEditor/AudioMixerPanel';
import { ExportDialog } from '../components/VideoEditor/ExportDialog';
import { PreviewPlayer } from '../components/VideoEditor/PreviewPlayer';
import { Toolbar } from '../components/VideoEditor/Toolbar';
import { StatusBar } from '../components/VideoEditor/StatusBar';
import { useVideoEditorAPI } from '../services/videoEditorAPI';
import {
  EditorProject,
  MediaFile,
  Track,
  Clip,
  ExportSettings,
  EditorMode,
  UndoRedoState,
} from '../types/video-editor';
import './VideoEditor.css';

interface VideoEditorProps {
  projectId?: string;
}

export const VideoEditor: React.FC<VideoEditorProps> = ({ projectId }) => {
  const { id } = useParams<{ id: string }>();
  const editorProjectId = projectId || id;
  const { api } = useVideoEditorAPI();
  
  const [project, setProject] = useState<EditorProject | null>(null);
  const [mediaLibrary, setMediaLibrary] = useState<MediaFile[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [clips, setClips] = useState<Clip[]>([]);
  
  const [selectedClipIds, setSelectedClipIds] = useState<string[]>([]);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<'effects' | 'text' | 'audio' | 'media'>('media');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [editorMode, setEditorMode] = useState<EditorMode>(EditorMode.VIDEO);
  
  const [undoStack, setUndoStack] = useState<UndoRedoState[]>([]);
  const [redoStack, setRedoStack] = useState<UndoRedoState[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  
  const [showExportDialog, setShowExportDialog] = useState(false);
  
  const previewRef = useRef<HTMLVideoElement>(null);
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null);
  
  // Project Loading
  useEffect(() => {
    const loadProject = async () => {
      if (!editorProjectId) {
        const newProject = await api.createProject({
          name: 'Untitled Project',
          resolution: { width: 1920, height: 1080 },
          frameRate: 30,
        });
        setProject(newProject);
        initializeDefaultTracks(newProject);
      } else {
        const loadedProject = await api.getProject(editorProjectId);
        setProject(loadedProject);
        setTracks(loadedProject.tracks);
        setClips(loadedProject.clips);
        setMediaLibrary(loadedProject.media || []);
      }
    };
    loadProject();
  }, [editorProjectId]);
  
  const initializeDefaultTracks = (newProject: EditorProject) => {
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
  };
  
  // Auto-save
  useEffect(() => {
    if (isDirty && project) {
      autoSaveRef.current = setTimeout(() => {
        api.updateProject(project.id, { tracks, clips, media: mediaLibrary });
        setIsDirty(false);
      }, 30000);
    }
    return () => { if (autoSaveRef.current) clearTimeout(autoSaveRef.current); };
  }, [isDirty, project, tracks, clips, mediaLibrary]);
  
  // Import Media
  const handleImportMedia = useCallback(async (files: FileList) => {
    const importedMedia: MediaFile[] = [];
    for (const file of Array.from(files)) {
      const media = await api.importMedia(project!.id, file);
      importedMedia.push(media);
    }
    setMediaLibrary(prev => [...prev, ...importedMedia]);
    setIsDirty(true);
  }, [project]);
  
  // Add Clip to Timeline
  const handleAddClipToTimeline = useCallback((
    mediaId: string,
    trackId: string,
    startTime: number,
    inPoint?: number,
    outPoint?: number
  ) => {
    const newClip: Clip = {
      id: `clip-${Date.now()}`,
      mediaId,
      trackId,
      startTime,
      inPoint: inPoint || 0,
      outPoint: outPoint,
      duration: (outPoint || 0) - (inPoint || 0),
      keyframes: [],
      effects: [],
    };
    setClips(prev => [...prev, newClip]);
    setTracks(prev => prev.map(t => 
      t.id === trackId ? { ...t, clips: [...t.clips, newClip.id] } : t
    ));
    setIsDirty(true);
  }, []);
  
  // Move Clip
  const handleMoveClip = useCallback((clipId: string, newTrackId: string, newStartTime: number) => {
    setUndoStack(prev => [...prev.slice(-19), { clips: [...clips], tracks: [...tracks], timestamp: Date.now() }]);
    setRedoStack([]);
    setClips(prev => prev.map(clip => 
      clip.id === clipId ? { ...clip, trackId: newTrackId, startTime: newStartTime } : clip
    ));
    setIsDirty(true);
  }, [clips, tracks]);
  
  // Split Clip
  const handleSplitClip = useCallback((clipId: string, splitTime: number) => {
    const clip = clips.find(c => c.id === clipId);
    if (!clip) return;
    
    const clipStart = clip.startTime;
    const clipEnd = clip.startTime + clip.duration;
    if (splitTime <= clipStart || splitTime >= clipEnd) return;
    
    const firstDuration = splitTime - clipStart;
    const secondClip: Clip = {
      ...clip,
      id: `clip-${Date.now()}`,
      startTime: splitTime,
      inPoint: clip.inPoint + firstDuration,
      duration: clip.duration - firstDuration,
    };
    
    setClips(prev => prev.map(c => c.id === clipId 
      ? { ...c, outPoint: clip.inPoint + firstDuration, duration: firstDuration } 
      : c
    ).concat(secondClip));
    setIsDirty(true);
  }, [clips]);
  
  // Delete Clips
  const handleDeleteClips = useCallback((clipIds: string[]) => {
    setUndoStack(prev => [...prev.slice(-19), { clips: [...clips], tracks: [...tracks], timestamp: Date.now() }]);
    setClips(prev => prev.filter(c => !clipIds.includes(c.id)));
    setSelectedClipIds(prev => prev.filter(id => !clipIds.includes(id)));
    setIsDirty(true);
  }, [clips, tracks]);
  
  // Select Clip
  const handleSelectClip = useCallback((clipId: string, addToSelection: boolean) => {
    setSelectedClipIds(prev => 
      addToSelection 
        ? (prev.includes(clipId) ? prev.filter(id => id !== clipId) : [...prev, clipId])
        : [clipId]
    );
  }, []);
  
  // Playback
  const handlePlay = useCallback(() => {
    if (previewRef.current) { previewRef.current.play(); setIsPlaying(true); }
  }, []);
  
  const handlePause = useCallback(() => {
    if (previewRef.current) { previewRef.current.pause(); setIsPlaying(false); }
  }, []);
  
  const handleSeek = useCallback((time: number) => {
    if (previewRef.current) { previewRef.current.currentTime = time; setCurrentTime(time); }
  }, []);
  
  // Export
  const handleExport = useCallback(async (settings: ExportSettings) => {
    if (!project) return;
    const job = await api.exportProject(project.id, settings);
    pollExportProgress(job.id);
  }, [project]);
  
  const pollExportProgress = useCallback(async (jobId: string) => {
    const checkProgress = async () => {
      const result = await api.getExportProgress(jobId);
      if (result.status === 'completed') {
        globalThis.open(result.downloadUrl, '_blank');
      } else if (result.status === 'failed') {
        console.error('Export failed:', result.error);
      } else {
        setTimeout(checkProgress, 1000);
      }
    };
    checkProgress();
  }, []);
  
  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey;
      
      if (isMod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (undoStack.length > 0) {
          const prev = undoStack[undoStack.length - 1];
          setRedoStack(prev => [...prev, { clips: [...clips], tracks: [...tracks], timestamp: Date.now() }]);
          setClips(prev.clips);
          setTracks(prev.tracks);
          setUndoStack(prev => prev.slice(0, -1));
        }
      }
      
      if ((isMod && e.key === 'y') || (isMod && e.shiftKey && e.key === 'z')) {
        e.preventDefault();
        if (redoStack.length > 0) {
          const next = redoStack[redoStack.length - 1];
          setUndoStack(prev => [...prev, { clips: [...clips], tracks: [...tracks], timestamp: Date.now() }]);
          setClips(next.clips);
          setTracks(next.tracks);
          setRedoStack(prev => prev.slice(0, -1));
        }
      }
      
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedClipIds.length > 0) {
          e.preventDefault();
          handleDeleteClips(selectedClipIds);
        }
      }
      
      if (e.key === ' ') {
        e.preventDefault();
        isPlaying ? handlePause() : handlePlay();
      }
      
      if (isMod && e.key === 's') {
        e.preventDefault();
        if (project) { api.updateProject(project.id, { tracks, clips, media: mediaLibrary }); setIsDirty(false); }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedClipIds, isPlaying, undoStack, redoStack, clips, tracks, project, mediaLibrary]);
  
  const contextValue = {
    project, mediaLibrary, tracks, clips,
    selectedClipIds, selectedTrackId, activePanel, editorMode,
    previewUrl, isPlaying, currentTime, duration, isDirty,
    setProject, setMediaLibrary, setTracks, setClips,
    setSelectedClipIds, setSelectedTrackId, setActivePanel, setEditorMode,
    setPreviewUrl, setIsPlaying, setCurrentTime, setDuration,
    setShowExportDialog,
    importMedia: handleImportMedia,
    addClipToTimeline: handleAddClipToTimeline,
    moveClip: handleMoveClip,
    splitClip: handleSplitClip,
    deleteClips: handleDeleteClips,
    selectClip: handleSelectClip,
    selectTrack: setSelectedTrackId,
    play: handlePlay, pause: handlePause, seek: handleSeek,
    export: handleExport,
  };
  
  if (!project) {
    return (
      <div className="video-editor-loading">
        <div className="loading-spinner" />
        <p>Loading project...</p>
      </div>
    );
  }
  
  return (
    <VideoEditorContext.Provider value={contextValue}>
      <div className="video-editor">
        <Toolbar onExport={() => setShowExportDialog(true)} />
        <div className="video-editor-content">
          <aside className="editor-panel left-panel"><MediaLibrary /></aside>
          <main className="preview-area">
            <PreviewPlayer ref={previewRef} src={previewUrl || undefined} currentTime={currentTime} onTimeUpdate={setCurrentTime} onDurationChange={setDuration} />
          </main>
          <aside className="editor-panel right-panel">
            {activePanel === 'media' && <MediaLibrary />}
            {activePanel === 'effects' && <EffectsPanel />}
            {activePanel === 'text' && <TextPanel />}
            {activePanel === 'audio' && <AudioMixerPanel />}
          </aside>
        </div>
        <div className="timeline-area"><Timeline /></div>
        <StatusBar />
        {showExportDialog && <ExportDialog onClose={() => setShowExportDialog(false)} onExport={handleExport} />}
      </div>
    </VideoEditorContext.Provider>
  );
};

export default VideoEditor;

