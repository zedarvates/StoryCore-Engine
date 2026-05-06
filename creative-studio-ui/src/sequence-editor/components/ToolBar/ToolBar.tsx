/**
 * Professional Tool Bar Component
 * 
 * Comprehensive editing tools and context-sensitive actions for the sequence editor.
 * Features a high-end "DaVinci Resolve" aesthetic with professional iconography.
 */

import React, { useCallback } from 'react';
import { useAppDispatch, useAppSelector, store, useUndoRedo } from '../../store';
import { setActiveTool } from '../../store/slices/toolsSlice';
import { markSaved, setSaveStatus } from '../../store/slices/projectSlice';
import { 
  setActivePanel, toggleLayerManager, toggleCompactMode, 
  setAssetCategory, setLibraryVisible, toggleProductionStudioMode
} from '../../store/slices/panelsSlice';
import { saveProjectToFile, generateProjectFilename } from '../../services/projectPersistence';
import type { ToolType } from '../../types';

// Icons
import { 
  Database, Sparkles, List, Music, 
  MousePointer2, Scissors, Hand, Search, 
  Image as ImageIcon, Video as VideoIcon, Volume2, 
  ChevronsLeftRight, ArrowRightToLine, ArrowLeftRight, 
  MoveHorizontal, MoveVertical, 
  Shuffle, Type, Key, 
  Undo2, Redo2, 
  Home, Settings, Save, Download, Box, LayoutPanelLeft,
  Grid3X3, MapPin, AlignLeft, Clapperboard
} from 'lucide-react';
import './toolBar.css';
import { toggleGrid, toggleMarkers, togglePrompts } from '../../store/slices/panelsSlice';

// ============================================================================
// Types
// ============================================================================

interface Tool {
  id: ToolType;
  name: string;
  icon: React.ReactNode;
  shortcut?: string;
  category: 'primary' | 'media' | 'editing' | 'effects' | 'project' | 'navigation';
  description: string;
}

// ============================================================================
// Tool Definitions (Professional Icons)
// ============================================================================

const TOOLS: Tool[] = [
  // Primary Tools
  { id: 'select', name: 'Select', icon: <MousePointer2 className="w-4 h-4" />, shortcut: 'V', category: 'primary', description: 'Select and move shots' },
  { id: 'cut', name: 'Cut', icon: <Scissors className="w-4 h-4" />, shortcut: 'C', category: 'primary', description: 'Split shots at playhead' },
  { id: 'move', name: 'Move', icon: <Hand className="w-4 h-4" />, shortcut: 'H', category: 'primary', description: 'Pan timeline view' },
  { id: 'zoom', name: 'Zoom', icon: <Search className="w-4 h-4" />, shortcut: 'Z', category: 'primary', description: 'Zoom timeline view' },

  // Media Tools
  { id: 'add-image', name: 'Add Image', icon: <ImageIcon className="w-4 h-4" />, shortcut: 'I', category: 'media', description: 'Add image to timeline' },
  { id: 'add-video', name: 'Add Video', icon: <VideoIcon className="w-4 h-4" />, shortcut: 'Shift+V', category: 'media', description: 'Add video to timeline' },
  { id: 'add-audio', name: 'Add Audio', icon: <Volume2 className="w-4 h-4" />, shortcut: 'A', category: 'media', description: 'Add audio to timeline' },

  // Editing Tools
  { id: 'trim', name: 'Trim', icon: <ChevronsLeftRight className="w-4 h-4" />, shortcut: 'T', category: 'editing', description: 'Trim shot edges' },
  { id: 'ripple', name: 'Ripple', icon: <ArrowRightToLine className="w-4 h-4" />, shortcut: 'R', category: 'editing', description: 'Trim and shift subsequent' },
  { id: 'roll', name: 'Roll', icon: <ArrowLeftRight className="w-4 h-4" />, shortcut: 'N', category: 'editing', description: 'Adjust junction between shots' },
  { id: 'slip', name: 'Slip', icon: <MoveHorizontal className="w-4 h-4" />, shortcut: 'Y', category: 'editing', description: 'Adjust shot content timing' },
  { id: 'slide', name: 'Slide', icon: <MoveVertical className="w-4 h-4" />, shortcut: 'U', category: 'editing', description: 'Move shot and adjust adjacent' },

  // Effects Tools
  { id: 'transition', name: 'Transition', icon: <Shuffle className="w-4 h-4" />, shortcut: 'Shift+T', category: 'effects', description: 'Add transition between shots' },
  { id: 'text', name: 'Text', icon: <Type className="w-4 h-4" />, shortcut: 'Shift+X', category: 'effects', description: 'Add text overlay' },
  { id: 'keyframe', name: 'Keyframe', icon: <Key className="w-4 h-4" />, shortcut: 'K', category: 'effects', description: 'Add animation keyframe' },
];

const NAVIGATION_TOOLS = [
  { id: 'mediaPool', name: 'Media Pool', icon: <Database className="w-4 h-4" />, label: 'Media Pool' },
  { id: 'effects', name: 'Effects', icon: <Sparkles className="w-4 h-4" />, label: 'Effects' },
  { id: 'index', name: 'Index', icon: <List className="w-4 h-4" />, label: 'Index' },
  { id: 'soundLibrary', name: 'Sound Library', icon: <Music className="w-4 h-4" />, label: 'Sound' },
];

// ============================================================================
// Component
// ============================================================================

interface ToolBarProps {
  onBack?: () => void;
  onAction?: () => void;
  onExportToggle?: () => void;
  onSettingsToggle?: () => void;
}

export const ToolBar: React.FC<ToolBarProps> = ({ 
  onBack, onAction, onExportToggle, onSettingsToggle 
}) => {
  const dispatch = useAppDispatch();
  const { activeTool } = useAppSelector((state) => state.tools);
  const { saveStatus } = useAppSelector((state) => state.project);
  const { showLayerManager, activePanel, activeAssetCategory } = useAppSelector((state) => state.panels);
  const { undo, redo, canUndo, canRedo } = useUndoRedo();

  // Handlers
  const handleToolSelect = useCallback((toolId: ToolType) => {
    dispatch(setActiveTool(toolId));
    if (onAction) onAction();
  }, [dispatch, onAction]);

  const handlePanelToggle = useCallback((panelId: string) => {
    console.log(`[ToolBar] Toggling panel: ${panelId}`);
    
    const categoryMap: Record<string, string> = {
      mediaPool: 'environments',
      effects: 'effects',
      soundLibrary: 'audio-sound',
      index: 'templates'
    };

    const category = categoryMap[panelId];
    if (category) {
      dispatch(setAssetCategory(category));
      dispatch(setActivePanel('assetLibrary')); 
      dispatch(setLibraryVisible(true));
    } else if (panelId === 'index') {
       dispatch(setActivePanel('timeline')); 
    }
  }, [dispatch]);

  const handleSaveProject = useCallback(() => {
    dispatch(setSaveStatus({ state: 'saving' }));
    setTimeout(() => {
      try {
        const state = store.getState();
        const projectName = state.project.metadata?.name || 'untitled';
        saveProjectToFile(state, generateProjectFilename(projectName));
        dispatch(markSaved());
        if (onAction) onAction();
      } catch (e) {
        console.error('Save failed:', e);
        dispatch(setSaveStatus({ state: 'error', error: 'Save failed' }));
      }
    }, 100);
  }, [dispatch, onAction]);

  const handleToggleAdvanced = useCallback(() => {
    dispatch(toggleLayerManager());
    if (onAction) onAction();
  }, [dispatch, onAction]);

  return (
    <div className="tool-bar">
      {/* 1. Dashboard Navigation */}
      <div className="tool-group navigation-tools">
        {onBack && (
          <button className="tool-btn back-btn" onClick={onBack} title="Back to Dashboard">
            <Home className="w-4 h-4" />
          </button>
        )}
        <div className="tool-separator-v" />
        {NAVIGATION_TOOLS.map(item => {
          const categoryMap: Record<string, string> = {
            mediaPool: 'environments',
            effects: 'effects',
            soundLibrary: 'audio-sound',
            index: 'templates'
          };
          const isActive = activePanel === 'assetLibrary' && 
                          activeAssetCategory === categoryMap[item.id];

          return (
            <button 
              key={item.id} 
              className={`tool-btn nav-item ${isActive ? 'active' : ''}`}
              onClick={() => handlePanelToggle(item.id)}
              title={item.name}
            >
              <div className="nav-item-content">
                {item.icon}
                <span className="nav-label">{item.label}</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="tool-spacer-mini" />

      {/* 2. Primary Tools */}
      <div className="tool-group tool-group-pill">
        {TOOLS.filter(t => t.category === 'primary').map(tool => (
          <button
            key={tool.id}
            className={`tool-btn-icon ${activeTool === tool.id ? 'active' : ''}`}
            onClick={() => handleToolSelect(tool.id)}
            title={`${tool.name} (${tool.shortcut})`}
          >
            {tool.icon}
          </button>
        ))}
      </div>

      <div className="tool-separator-v" />

      {/* 3. Media & Editing Tools */}
      <div className="tool-group tool-group-pill">
        {TOOLS.filter(t => ['media', 'editing'].includes(t.category)).map(tool => (
          <button
            key={tool.id}
            className={`tool-btn-icon ${activeTool === tool.id ? 'active' : ''}`}
            onClick={() => handleToolSelect(tool.id)}
            title={`${tool.name} (${tool.shortcut})`}
          >
            {tool.icon}
          </button>
        ))}
      </div>

      <div className="tool-separator-v" />

      {/* 4. Effects Tools */}
      <div className="tool-group tool-group-pill">
        {TOOLS.filter(t => t.category === 'effects').map(tool => (
          <button
            key={tool.id}
            className={`tool-btn-icon ${activeTool === tool.id ? 'active' : ''}`}
            onClick={() => handleToolSelect(tool.id)}
            title={`${tool.name} (${tool.shortcut})`}
          >
            {tool.icon}
          </button>
        ))}
      </div>

      {/* 5. Undo/Redo */}
      <div className="tool-group tool-group-pill ml-2">
        <button className="tool-btn-icon" onClick={() => undo()} disabled={!canUndo} title="Undo">
          <Undo2 className="w-4 h-4" />
        </button>
        <button className="tool-btn-icon" onClick={() => redo()} disabled={!canRedo} title="Redo">
          <Redo2 className="w-4 h-4" />
        </button>
      </div>

      <div className="tool-spacer" />

      {/* 6. Layout & Project Management */}
      <div className="tool-group project-tools">
        <button 
          className={`tool-btn px-3 ${showLayerManager ? 'active' : ''}`} 
          onClick={handleToggleAdvanced} 
          title="Advanced Mode (@)"
        >
          <LayoutPanelLeft className="w-4 h-4 mr-2" />
          <span className="text-xs font-bold">Advanced</span>
        </button>

        <button 
          className={`tool-btn px-3 ${useAppSelector(state => state.panels.compactMode) ? 'active text-amber-500' : ''}`}
          onClick={() => dispatch(toggleCompactMode())}
          title="Compact Director Dashboard (K)"
        >
          <Box className="w-4 h-4 mr-2" />
          <span className="text-xs font-bold">Director</span>
        </button>
        
        <button 
          className={`tool-btn px-3 ${useAppSelector(state => state.panels.productionStudioMode) ? 'active studio-active border-amber-500/50' : ''}`}
          onClick={() => dispatch(toggleProductionStudioMode())}
          title="Production Studio (CapCut Style) (Shift+S)"
        >
          <Clapperboard className="w-4 h-4 mr-2 text-amber-400" />
          <span className="text-xs font-bold text-amber-100">Studio Mode</span>
        </button>

        <div className="tool-separator-v" />

        {/* 7. View Toggles (Point 5.1/5.2 Grid/Marker control) */}
        <div className="tool-group tool-group-pill bg-primary/5 mx-2">
          <button 
            className={`tool-btn-icon ${useAppSelector(state => state.panels.gridVisible) ? 'active text-primary' : 'opacity-40'}`} 
            onClick={() => dispatch(toggleGrid())} 
            title="Toggle Timeline Grid (G)"
          >
            <Grid3X3 className="w-3.5 h-3.5" />
          </button>
          <button 
            className={`tool-btn-icon ${useAppSelector(state => state.panels.markersVisible) ? 'active text-primary' : 'opacity-40'}`} 
            onClick={() => dispatch(toggleMarkers())} 
            title="Toggle Timeline Markers (M)"
          >
            <MapPin className="w-3.5 h-3.5" />
          </button>
          <button 
            className={`tool-btn-icon ${useAppSelector(state => state.panels.promptsVisible) ? 'active text-primary' : 'opacity-40'}`} 
            onClick={() => dispatch(togglePrompts())} 
            title="Toggle Shot Prompts (P)"
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="tool-separator-v" />

        <button className="tool-btn-icon" onClick={handleSaveProject} title="Save Project">
          <Save className={`w-4 h-4 ${saveStatus.state === 'modified' ? 'text-amber-400' : ''}`} />
        </button>

        <button className="tool-btn-icon" onClick={onExportToggle} title="Export Cinematic Bundle">
          <Download className="w-4 h-4" />
        </button>

        <button className="tool-btn-icon" onClick={onSettingsToggle} title="Project Settings">
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default ToolBar;
