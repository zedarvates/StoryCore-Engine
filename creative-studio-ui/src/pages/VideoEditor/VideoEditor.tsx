/**
 * Video Editor Page - Main Editor Interface
 * CapCut-style editor with preview, timeline, and properties panels
 */

import React, { useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { VideoEditorProvider, useVideoEditor } from '@/contexts/VideoEditorContext';
import { MediaLibrary } from '@/components/VideoEditor/MediaLibrary';
import { Timeline } from '@/components/VideoEditor/Timeline';
import { EffectsPanel } from '@/components/VideoEditor/EffectsPanel';
import { TextPanel } from '@/components/VideoEditor/TextPanel';
import { AudioMixerPanel } from '@/components/VideoEditor/AudioMixerPanel';
import { ExportDialog } from '@/components/VideoEditor/ExportDialog';
import { PreviewPlayer } from '@/components/VideoEditor/PreviewPlayer';
import { Toolbar } from '@/components/VideoEditor/Toolbar';
import { StatusBar } from '@/components/VideoEditor/StatusBar';
import { useVideoEditorAPI } from '@/services/videoEditorAPI';

import './VideoEditor.css';

interface VideoEditorProps {
  projectId?: string;
}

export const VideoEditor: React.FC<VideoEditorProps> = ({ projectId }) => {
  const { id } = useParams<{ id: string }>();
  const editorProjectId = projectId || id;

  return (
    <VideoEditorProvider projectId={editorProjectId}>
      <VideoEditorContent />
    </VideoEditorProvider>
  );
};

const VideoEditorContent: React.FC = () => {
  const {
    project,
    activePanel,
    previewUrl,
    currentTime,
    showExportDialog,
    isPlaying,
    setCurrentTime,
    setDuration,
    setShowExportDialog,
    undo,
    redo,
    play,
    pause,
    export: handleExport,
    deleteClips,
    selectedClipIds,
    tracks,
    clips,
    mediaLibrary,
  } = useVideoEditor();

  const { api } = useVideoEditorAPI();
  const previewRef = useRef<HTMLVideoElement>(null);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey;
      
      if (isMod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      
      if ((isMod && e.key === 'y') || (isMod && e.shiftKey && e.key === 'z')) {
        e.preventDefault();
        redo();
      }
      
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedClipIds.length > 0) {
          e.preventDefault();
          deleteClips(selectedClipIds);
        }
      }
      
      if (e.key === ' ') {
        e.preventDefault();
        if (isPlaying) {
          pause();
        } else {
          play();
        }
      }
      
      if (isMod && e.key === 's') {
        e.preventDefault();
        if (project) { 
          api.updateProject(project.id, { tracks, clips, media: mediaLibrary });
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedClipIds, isPlaying, undo, redo, deleteClips, play, pause, project, tracks, clips, mediaLibrary, api]);

  if (!project) {
    return (
      <div className="video-editor-loading">
        <div className="loading-spinner" />
        <p>Loading project...</p>
      </div>
    );
  }

  return (
    <div className="video-editor">
      <Toolbar onExport={() => setShowExportDialog(true)} />
      <div className="video-editor-content">
        <aside className="editor-panel left-panel">
          <MediaLibrary />
        </aside>
        <main className="preview-area">
          <PreviewPlayer 
            ref={previewRef} 
            src={previewUrl || undefined} 
            currentTime={currentTime} 
            onTimeUpdate={setCurrentTime} 
            onDurationChange={setDuration} 
          />
        </main>
        <aside className="editor-panel right-panel">
          {activePanel === 'media' && <MediaLibrary />}
          {activePanel === 'effects' && <EffectsPanel />}
          {activePanel === 'text' && <TextPanel />}
          {activePanel === 'audio' && <AudioMixerPanel />}
        </aside>
      </div>
      <div className="timeline-area">
        <Timeline />
      </div>
      <StatusBar />
      {showExportDialog && (
        <ExportDialog 
          onClose={() => setShowExportDialog(false)} 
          onExport={handleExport} 
        />
      )}
    </div>
  );
};

export default VideoEditor;
