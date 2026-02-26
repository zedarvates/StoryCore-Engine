/**
 * Video Editor Layout
 * 
 * Main layout component for the StoryCore video editor.
 * Integrates the sprite system with the existing editor.
 */

import React, { useState, useCallback } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Save,
  Download,
  Settings,
  Layers
} from 'lucide-react';

import { RightSidebar } from './RightSidebar';
import { SpriteCanvas } from './SpritesPanel/SpriteCanvas';
import { useSpriteStore } from '../../stores/spriteStore';

// ============================================================================
// Types
// ============================================================================

interface VideoEditorLayoutProps {
  /** Project name */
  projectName?: string;
  /** Video duration in seconds */
  duration?: number;
  /** Callback when save */
  onSave?: () => void;
  /** Callback when export */
  onExport?: () => void;
  /** Class name */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export const VideoEditorLayout: React.FC<VideoEditorLayoutProps> = ({
  projectName = 'Mon Projet',
  duration = 120,
  onSave,
  onExport,
  className
}) => {
  // State
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [zoom] = useState(1);
  
  // Sprite store
  const { sprites, play, pause } = useSpriteStore();

  // ==========================================================================
  // Handlers
  // ==========================================================================

  const handlePlayPause = useCallback(() => {
    setIsPlaying(!isPlaying);
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <div className={`flex flex-col h-screen bg-slate-900 ${className || ''}`}>
      {/* Header */}
      <header className="h-12 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <h1 className="text-sm font-medium text-white">{projectName}</h1>
          <span className="text-xs text-slate-500">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={onSave}
            className="p-2 rounded hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Sauvegarder"
          >
            <Save className="w-4 h-4" />
          </button>
          <button
            onClick={onExport}
            className="p-2 rounded hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Exporter"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Tools */}
        <aside className="w-12 bg-slate-800 border-r border-slate-700 flex flex-col items-center py-2 gap-1">
          <ToolButton icon={<Layers className="w-5 h-5" />} label="Sprites" active />
          <ToolButton icon={<Settings className="w-5 h-5" />} label="Paramètres" />
        </aside>

        {/* Center - Preview */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Preview Area */}
          <div className="flex-1 bg-black relative flex items-center justify-center">
            <SpriteCanvas
              width={1280}
              height={720}
              sprites={Array.from(sprites.values()).map(s => ({
                sprite: s.sprite,
                transform: s.transform,
                effects: s.effects
              }))}
              backgroundColor="#0f172a"
              showGrid
            />
            
            {/* Preview Overlay */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-white bg-black/50 px-2 py-1 rounded">
                  1280 x 720
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-white bg-black/50 px-2 py-1 rounded">
                  Zoom: {(zoom * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="h-32 bg-slate-800 border-t border-slate-700">
            <Timeline 
              currentTime={currentTime}
              duration={duration}
              isPlaying={isPlaying}
              onTimeChange={setCurrentTime}
              onPlayPause={handlePlayPause}
            />
          </div>
        </main>

        {/* Right Sidebar - Panels */}
        <RightSidebar className="w-72" defaultPanel="sprites" />
      </div>

      {/* Status Bar */}
      <footer className="h-8 bg-slate-800 border-t border-slate-700 flex items-center justify-between px-4 text-xs text-slate-400">
        <div className="flex items-center gap-4">
          <span>Sprites: {sprites.size}</span>
          <span>|</span>
          <span>Prêt</span>
        </div>
        <div className="flex items-center gap-4">
          <span>StoryCore Engine v2.0</span>
        </div>
      </footer>
    </div>
  );
};

// ============================================================================
// Sub-Components
// ============================================================================

interface ToolButtonProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

const ToolButton: React.FC<ToolButtonProps> = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
      active
        ? 'bg-violet-600 text-white'
        : 'text-slate-400 hover:text-white hover:bg-slate-700'
    }`}
    title={label}
  >
    {icon}
  </button>
);

// ============================================================================

interface TimelineProps {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onTimeChange: (time: number) => void;
  onPlayPause: () => void;
}

const Timeline: React.FC<TimelineProps> = ({
  currentTime,
  duration,
  isPlaying,
  onTimeChange,
  onPlayPause
}) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Timeline Controls */}
      <div className="h-10 flex items-center justify-between px-4 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onTimeChange(0)}
            className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            onClick={onPlayPause}
            className="p-2 rounded-full bg-violet-600 text-white hover:bg-violet-500"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={() => onTimeChange(duration)}
            className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <span>{formatTime(currentTime)}</span>
          <span>/</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Timeline Track */}
      <div className="flex-1 px-4 py-2">
        <div className="h-full bg-slate-700 rounded relative">
          {/* Playhead */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-violet-500"
            style={{ left: `${(currentTime / duration) * 100}%` }}
          />
          
          {/* Time markers */}
          <div className="absolute inset-0 flex justify-between px-2">
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
              <div
                key={ratio}
                className="w-px h-full bg-slate-600"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoEditorLayout;