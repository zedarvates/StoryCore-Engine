/**
 * Professional Timeline Controls Component
 * 
 * Comprehensive timeline control bar with playback controls, zoom controls,
 * track management, edit mode toggles, and playback shortcuts.
 * Substitutes emojis for high-end Lucide icons to match DaVinci Resolve vision.
 */

import React, { useCallback, useState, useEffect } from 'react';
import { useProjectStore } from '@/stores/useProjectStore';
import { useShallow } from 'zustand/react/shallow';
import type { LayerType } from '../../types';
import { useProjectHistory } from '@/hooks/useUndoRedo';
import { GoToTimeDialog } from './GoToTimeDialog';
import { GenerateButton } from '../GenerateButton/GenerateButton';

// Icons
import { 
  SkipBack, ChevronLeft, Play, Pause, Square, ChevronRight, SkipForward,
  Target, ZoomOut, ZoomIn, Maximize, Plus, Minus,
  Magnet, Link, Shuffle as ShuffleIcon, Scissors, Wand2, Trash2, 
  MonitorPlay, Layout,
  Video, Mic, Sparkles, MoveHorizontal, Type, Key,
  Undo2, Redo2
} from 'lucide-react';

interface TimelineControlsProps {
  zoomLevel: number;
  onZoomChange: (zoom: number) => void;
  onAddTrack: (type: LayerType) => void;
  onDeleteTrack?: () => void;
  playheadPosition: number;
  duration: number;
  snapToGrid?: boolean;
  onToggleSnapToGrid?: () => void;
  rippleEdit?: boolean;
  onToggleRippleEdit?: () => void;
  magneticTimeline?: boolean;
  onToggleMagneticTimeline?: () => void;
  onAddShot?: (atPlayhead?: boolean) => void;
  onDeleteShot?: () => void;
  onSplit?: () => void;
  onAutoMix?: () => void;
  viewMode?: 'timeline' | 'storyboard';
  onViewModeChange?: (mode: 'timeline' | 'storyboard') => void;
  className?: string;
}

export const TimelineControls: React.FC<TimelineControlsProps> = ({
  zoomLevel,
  onZoomChange,
  onAddTrack,
  onDeleteTrack,
  playheadPosition,
  duration,
  snapToGrid = true,
  onToggleSnapToGrid,
  rippleEdit = false,
  onToggleRippleEdit,
  magneticTimeline = false,
  onToggleMagneticTimeline,
  onAddShot,
  onDeleteShot,
  onSplit,
  onAutoMix,
  viewMode = 'timeline',
  onViewModeChange,
}) => {
  const { 
    undo, redo, canUndo, canRedo, undoDescription, redoDescription 
  } = useProjectHistory();
  
  const { 
    isPlaying, 
    playAction, 
    pauseAction, 
    stopAction, 
    setCurrentTime 
  } = useProjectStore(useShallow(state => ({
    isPlaying: state.isPlaying,
    playAction: state.play,
    pauseAction: state.pause,
    stopAction: state.stop,
    setCurrentTime: state.setCurrentTime
  })));

  const [showAddTrackMenu, setShowAddTrackMenu] = useState(false);
  const [showGoToTimeDialog, setShowGoToTimeDialog] = useState(false);

  const trackTypes: { type: LayerType; label: string; icon: React.ReactNode }[] = [
    { type: 'media', label: 'Media Track', icon: <Video className="w-4 h-4" /> },
    { type: 'audio', label: 'Audio Track', icon: <Mic className="w-4 h-4" /> },
    { type: 'effects', label: 'Effects Track', icon: <Sparkles className="w-4 h-4" /> },
    { type: 'transitions', label: 'Transitions Track', icon: <MoveHorizontal className="w-4 h-4" /> },
    { type: 'text', label: 'Text Track', icon: <Type className="w-4 h-4" /> },
    { type: 'keyframes', label: 'Keyframes Track', icon: <Key className="w-4 h-4" /> },
  ];

  const handlePlayPause = useCallback(() => {
    if (isPlaying) pauseAction(); else playAction();
  }, [isPlaying, pauseAction, playAction]);

  const handleStop = useCallback(() => {
    stopAction();
    setCurrentTime(0);
  }, [stopAction, setCurrentTime]);

  const handleGoToStart = useCallback(() => setCurrentTime(0), [setCurrentTime]);
  const handleGoToEnd = useCallback(() => setCurrentTime(duration), [setCurrentTime, duration]);
  const handlePreviousFrame = useCallback(() => setCurrentTime(Math.max(0, playheadPosition - 1)), [setCurrentTime, playheadPosition]);
  const handleNextFrame = useCallback(() => setCurrentTime(Math.min(duration, playheadPosition + 1)), [setCurrentTime, playheadPosition, duration]);

  // Register global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid triggering shortcuts when typing in inputs/textareas
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Navigation
      if (e.key === 'Space' || e.key === ' ') {
        e.preventDefault();
        handlePlayPause();
      } else if (e.key === 'Home') {
        e.preventDefault();
        handleGoToStart();
      } else if (e.key === 'End') {
        e.preventDefault();
        handleGoToEnd();
      } else if (e.key === 'ArrowLeft' || e.key === 'j' || e.key === 'J') {
        e.preventDefault();
        handlePreviousFrame();
      } else if (e.key === 'ArrowRight' || e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        handleNextFrame();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePlayPause, handleGoToStart, handleGoToEnd, handlePreviousFrame, handleNextFrame]);

  const formatTime = (frames: number) => {
    const fps = 24;
    const totalSeconds = Math.floor(frames / fps);
    const s = totalSeconds % 60;
    const m = Math.floor(totalSeconds / 60);
    const f = frames % fps;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`;
  };

  return (
    <div className="timeline-controls-bar">
      {/* 1. Playback Controls */}
      <div className="timeline-controls-group">
        <button className="timeline-control-btn" onClick={handleGoToStart} title="Home"><SkipBack className="w-4 h-4" /></button>
        <button className="timeline-control-btn" onClick={handlePreviousFrame} title="Prev Frame"><ChevronLeft className="w-4 h-4" /></button>
        <button className={`timeline-control-btn playback-btn ${isPlaying ? 'playing' : ''}`} onClick={handlePlayPause} title="Play/Pause">
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
        </button>
        <button className="timeline-control-btn" onClick={handleStop} title="Stop"><Square className="w-4 h-4" /></button>
        <button className="timeline-control-btn" onClick={handleNextFrame} title="Next Frame"><ChevronRight className="w-4 h-4" /></button>
        <button className="timeline-control-btn" onClick={handleGoToEnd} title="End"><SkipForward className="w-4 h-4" /></button>
      </div>

      {/* 1b. History Controls */}
      <div className="timeline-controls-group border-l border-white/10 pl-2">
        <button 
          className={`timeline-control-btn ${!canUndo ? 'opacity-30 cursor-not-allowed' : 'hover:text-indigo-400'}`} 
          onClick={undo} 
          disabled={!canUndo} 
          title={undoDescription ? `Undo ${undoDescription} (Ctrl+Z)` : "Undo (Ctrl+Z)"}
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button 
          className={`timeline-control-btn ${!canRedo ? 'opacity-30 cursor-not-allowed' : 'hover:text-indigo-400'}`} 
          onClick={redo} 
          disabled={!canRedo} 
          title={redoDescription ? `Redo ${redoDescription} (Ctrl+Y)` : "Redo (Ctrl+Y)"}
        >
          <Redo2 className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Timing Display */}
      <div className="timeline-timecode glassmorphic-dark px-3 rounded-full">
        <span className="current-time">{formatTime(playheadPosition)}</span>
        <span className="time-separator text-white/20 mx-2">|</span>
        <span className="total-duration opacity-50">{formatTime(duration)}</span>
      </div>

      <button className="timeline-control-btn" onClick={() => setShowGoToTimeDialog(true)} title="Go to Time"><Target className="w-4 h-4" /></button>

      {/* 3. Zoom Controls */}
      <div className="timeline-controls-group bg-white/5 rounded-lg px-1 border border-white/5">
        <button className="timeline-control-btn" onClick={() => onZoomChange(Math.max(1, zoomLevel / 1.5))} title="Zoom Out"><ZoomOut className="w-4 h-4" /></button>
        <div className="zoom-level-display text-[10px] font-bold w-10 text-center">{Math.round(zoomLevel * 10)}%</div>
        <button className="timeline-control-btn" onClick={() => onZoomChange(Math.min(100, zoomLevel * 1.5))} title="Zoom In"><ZoomIn className="w-4 h-4" /></button>
        <button className="timeline-control-btn" onClick={() => onZoomChange(10)} title="Fit to Window"><Maximize className="w-4 h-4" /></button>
      </div>

      {/* 4. Track Management */}
      <div className="timeline-controls-group">
        <div className="relative">
          <button className="tool-btn px-3 flex items-center gap-2 h-8" onClick={() => setShowAddTrackMenu(!showAddTrackMenu)}>
            <span className="text-[10px] font-bold uppercase tracking-wider">+ Track</span>
          </button>
          {showAddTrackMenu && (
            <div className="add-track-menu glassmorphic !bg-[#151525]/95">
              {trackTypes.map(({ type, label, icon }) => (
                <button key={type} className="add-track-menu-item" onClick={() => { onAddTrack(type); setShowAddTrackMenu(false); }}>
                  <span className="mr-2 text-indigo-400">{icon}</span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button className="timeline-control-btn text-red-400/50 hover:text-red-400" onClick={onDeleteTrack} disabled={!onDeleteTrack} title="Delete Track"><Minus className="w-4 h-4" /> - Track</button>
      </div>

      {/* 5. DaVinci Style Edit Toggles (Magnet, Ripple, etc.) */}
      <div className="timeline-controls-group border-l border-white/10 pl-4 ml-2">
        <button className={`timeline-control-btn ${snapToGrid ? 'active text-indigo-400' : 'opacity-40'}`} onClick={onToggleSnapToGrid} title="Snap to Grid (S)"><Magnet className="w-4 h-4" /></button>
        <button className={`timeline-control-btn ${rippleEdit ? 'active text-indigo-400' : 'opacity-40'}`} onClick={onToggleRippleEdit} title="Ripple Edit (R)"><ShuffleIcon className="w-4 h-4 rotate-90" /></button>
        <button className={`timeline-control-btn ${magneticTimeline ? 'active text-indigo-400' : 'opacity-40'}`} onClick={onToggleMagneticTimeline} title="Magnetic Timeline (M)"><Link className="w-4 h-4" /></button>
      </div>

      {/* 6. Context Tools */}
      <div className="timeline-controls-group border-l border-white/10 pl-4">
        <button className="timeline-control-btn hover:text-indigo-400" onClick={() => onAddShot?.(true)} title="Insert Shot"><Plus className="w-5 h-5" /></button>
        <button className="timeline-control-btn hover:text-indigo-400" onClick={onSplit} title="Split Clip"><Scissors className="w-4 h-4" /></button>
        <button className="timeline-control-btn hover:text-indigo-400" onClick={onAutoMix} title="AI Auto-Mix"><Wand2 className="w-4 h-4" /></button>
        <button className="timeline-control-btn hover:text-red-400" onClick={onDeleteShot} disabled={!onDeleteShot} title="Delete Selected"><Trash2 className="w-4 h-4" /></button>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="flex border border-white/10 rounded-lg overflow-hidden bg-white/5">
          <button className={`p-1.5 ${viewMode === 'timeline' ? 'active bg-indigo-600 text-white' : 'text-white/40'}`} onClick={() => onViewModeChange?.('timeline')} title="Timeline View"><MonitorPlay className="w-4 h-4" /></button>
          <button className={`p-1.5 ${viewMode === 'storyboard' ? 'active bg-indigo-600 text-white' : 'text-white/40'}`} onClick={() => onViewModeChange?.('storyboard')} title="Storyboard View"><Layout className="w-4 h-4" /></button>
        </div>
        <GenerateButton />
      </div>

      <GoToTimeDialog isOpen={showGoToTimeDialog} onClose={() => setShowGoToTimeDialog(false)} onGoToTime={(f) => { setCurrentTime(f); setShowGoToTimeDialog(false); }} maxFrame={duration} fps={24}/>
    </div>
  );
};

export default TimelineControls;
