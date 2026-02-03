/**
 * Integration Example - Shows how to use the Redux store in components
 * 
 * This file demonstrates best practices for integrating the Redux store
 * with React components in the Sequence Editor Interface.
 */

import { useEffect } from 'react';
import { useAppDispatch, useAppSelector, useUndoRedo, useProjectPersistence, store } from '../index';
import { addShot, updateShot, setPlayheadPosition } from '../slices/timelineSlice';
import { setActiveTool } from '../slices/toolsSlice';
import { play, pause, stop } from '../slices/previewSlice';
import type { Shot } from '../../types';

/**
 * Example 1: Timeline Component
 * Shows how to read and update timeline state
 */
export function TimelineExample() {
  const dispatch = useAppDispatch();
  
  // Select state from store
  const shots = useAppSelector((state) => state.timeline.shots);
  const playheadPosition = useAppSelector((state) => state.timeline.playheadPosition);
  const selectedElements = useAppSelector((state) => state.timeline.selectedElements);
  
  const handleAddShot = () => {
    const newShot: Shot = {
      id: `shot-${Date.now()}`,
      name: 'New Shot',
      startTime: playheadPosition,
      duration: 100,
      layers: [],
      referenceImages: [],
      prompt: '',
      parameters: {
        seed: 42,
        denoising: 0.75,
        steps: 20,
        guidance: 7.5,
        sampler: 'euler',
        scheduler: 'normal',
      },
      generationStatus: 'pending',
    };
    
    dispatch(addShot(newShot));
  };
  
  const handleUpdateShot = (shotId: string, prompt: string) => {
    dispatch(updateShot({
      id: shotId,
      updates: { prompt },
    }));
  };
  
  const handleSeek = (position: number) => {
    dispatch(setPlayheadPosition(position));
  };
  
  return (
    <div>
      <button onClick={handleAddShot}>Add Shot</button>
      <button onClick={() => handleSeek(0)}>Go to Start</button>
      <div>Total Shots: {shots.length}</div>
      <div>Playhead: {playheadPosition}</div>
      <div>Selected: {selectedElements.length}</div>
      {shots.map((shot: Shot) => (
        <div key={shot.id}>
          <span>{shot.name}</span>
          <button onClick={() => handleUpdateShot(shot.id, 'Updated prompt')}>
            Update Prompt
          </button>
        </div>
      ))}
    </div>
  );
}

/**
 * Example 2: Tool Bar Component
 * Shows how to manage active tool state
 */
export function ToolBarExample() {
  const dispatch = useAppDispatch();
  const activeTool = useAppSelector((state) => state.tools.activeTool);
  
  const tools = [
    { id: 'select', name: 'Select', shortcut: 'Q' },
    { id: 'trim', name: 'Trim', shortcut: 'W' },
    { id: 'split', name: 'Split', shortcut: 'E' },
    { id: 'transition', name: 'Transition', shortcut: 'R' },
    { id: 'text', name: 'Text', shortcut: 'T' },
    { id: 'keyframe', name: 'Keyframe', shortcut: 'Y' },
  ] as const;
  
  return (
    <div className="tool-bar">
      {tools.map((tool) => (
        <button
          key={tool.id}
          className={activeTool === tool.id ? 'active' : ''}
          onClick={() => dispatch(setActiveTool(tool.id as any))}
          title={`${tool.name} (${tool.shortcut})`}
        >
          {tool.name}
        </button>
      ))}
    </div>
  );
}

/**
 * Example 3: Preview Controls Component
 * Shows how to manage playback state
 */
export function PreviewControlsExample() {
  const dispatch = useAppDispatch();
  const playbackState = useAppSelector((state) => state.preview.playbackState);
  const playbackSpeed = useAppSelector((state) => state.preview.playbackSpeed);
  
  const handlePlayPause = () => {
    if (playbackState === 'playing') {
      dispatch(pause());
    } else {
      dispatch(play());
    }
  };
  
  const handleStop = () => {
    dispatch(stop());
  };
  
  return (
    <div className="preview-controls">
      <button onClick={handlePlayPause}>
        {playbackState === 'playing' ? 'Pause' : 'Play'}
      </button>
      <button onClick={handleStop}>Stop</button>
      <span>Speed: {playbackSpeed}x</span>
    </div>
  );
}

/**
 * Example 4: Undo/Redo Buttons
 * Shows how to use the useUndoRedo hook
 */
export function UndoRedoExample() {
  const { undo, redo, canUndo, canRedo, undoDescription, redoDescription } = useUndoRedo();
  
  return (
    <div className="undo-redo-controls">
      <button
        onClick={undo}
        disabled={!canUndo}
        title={undoDescription || 'Nothing to undo'}
      >
        Undo {undoDescription && `(${undoDescription})`}
      </button>
      <button
        onClick={redo}
        disabled={!canRedo}
        title={redoDescription || 'Nothing to redo'}
      >
        Redo {redoDescription && `(${redoDescription})`}
      </button>
    </div>
  );
}

/**
 * Example 5: Status Bar Component
 * Shows how to display save status
 */
export function StatusBarExample() {
  const { saveStatus, lastSaveTimeFormatted } = useProjectPersistence();
  
  const getStatusIcon = () => {
    switch (saveStatus.state) {
      case 'saved':
        return '✓';
      case 'modified':
        return '●';
      case 'saving':
        return '⟳';
      case 'error':
        return '✗';
      default:
        return '';
    }
  };
  
  const getStatusColor = () => {
    switch (saveStatus.state) {
      case 'saved':
        return 'green';
      case 'modified':
        return 'yellow';
      case 'saving':
        return 'blue';
      case 'error':
        return 'red';
      default:
        return 'gray';
    }
  };
  
  return (
    <div className="status-bar">
      <span style={{ color: getStatusColor() }}>
        {getStatusIcon()} {saveStatus.state}
      </span>
      {lastSaveTimeFormatted && <span>{lastSaveTimeFormatted}</span>}
      {saveStatus.error && <span className="error">{saveStatus.error}</span>}
    </div>
  );
}

/**
 * Example 6: Project Loader Component
 * Shows how to load saved project on startup
 */
export function ProjectLoaderExample() {
  const { loadProject } = useProjectPersistence();
  
  useEffect(() => {
    // Load saved project on component mount
    const loaded = loadProject();
    if (loaded) {
      console.log('Project loaded successfully');
    } else {
      console.log('No saved project found');
    }
  }, [loadProject]);
  
  return null; // This component doesn't render anything
}

/**
 * Example 7: Keyboard Shortcuts Handler
 * Shows how to integrate keyboard shortcuts with store actions
 */
export function KeyboardShortcutsExample() {
  const { undo, redo } = useUndoRedo();
  const dispatch = useAppDispatch();
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;
      
      // Undo: Ctrl/Cmd+Z
      if (modKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      
      // Redo: Ctrl/Cmd+Shift+Z
      if (modKey && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();
      }
      
      // Tool shortcuts
      if (!modKey && !e.shiftKey && !e.altKey) {
        switch (e.key.toLowerCase()) {
          case 'q':
            dispatch(setActiveTool('select'));
            break;
          case 'w':
            dispatch(setActiveTool('trim'));
            break;
          case 'e':
            dispatch(setActiveTool('split'));
            break;
          case 'r':
            dispatch(setActiveTool('transition'));
            break;
          case 't':
            dispatch(setActiveTool('text'));
            break;
          case 'y':
            dispatch(setActiveTool('keyframe'));
            break;
        }
      }
      
      // Playback shortcuts
      if (e.key === ' ') {
        e.preventDefault();
        const playbackState = store.getState().preview.playbackState;
        if (playbackState === 'playing') {
          dispatch(pause());
        } else {
          dispatch(play());
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, dispatch]);
  
  return null;
}

/**
 * Example 8: Complete Application Component
 * Shows how to integrate all pieces together
 */
export function SequenceEditorExample() {
  return (
    <div className="sequence-editor">
      {/* Load project on startup */}
      <ProjectLoaderExample />
      
      {/* Global keyboard shortcuts */}
      <KeyboardShortcutsExample />
      
      {/* Top bar */}
      <div className="top-bar">
        <ToolBarExample />
        <UndoRedoExample />
      </div>
      
      {/* Main workspace */}
      <div className="main-workspace">
        <TimelineExample />
        <PreviewControlsExample />
      </div>
      
      {/* Bottom status bar */}
      <StatusBarExample />
    </div>
  );
}

/**
 * Example 9: Custom Selector Hook
 * Shows how to create reusable selectors
 */
export function useTimelineSelectors() {
  const shots = useAppSelector((state) => state.timeline.shots);
  const selectedElements = useAppSelector((state) => state.timeline.selectedElements);
  
  // Derived state
  const selectedShots = shots.filter((shot: Shot) => selectedElements.includes(shot.id));
  const totalDuration = shots.reduce((sum: number, shot: Shot) => sum + shot.duration, 0);
  const shotCount = shots.length;
  
  return {
    shots,
    selectedShots,
    totalDuration,
    shotCount,
  };
}

/**
 * Example 10: Using Custom Selector Hook
 */
export function TimelineStatsExample() {
  const { shotCount, totalDuration, selectedShots } = useTimelineSelectors();
  
  return (
    <div className="timeline-stats">
      <div>Total Shots: {shotCount}</div>
      <div>Total Duration: {totalDuration} frames</div>
      <div>Selected: {selectedShots.length}</div>
    </div>
  );
}

// Note: This file is for demonstration purposes only.
// Actual components should be created in the components/ directory.
