/**
 * Tool Bar Component
 * 
 * Contextual toolbar with comprehensive editing tools for the sequence editor.
 * Includes primary tools, media tools, editing tools, effects tools, and project management.
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 17.1, 19.4
 */

import React, { useCallback, useEffect } from 'react';
import { useAppDispatch, useAppSelector, store } from '../../store';
import { setActiveTool } from '../../store/slices/toolsSlice';
import { markSaved, setSaveStatus } from '../../store/slices/projectSlice';
import { setActivePanel } from '../../store/slices/panelsSlice';
import { saveProjectToFile, generateProjectFilename } from '../../services/projectPersistence';
import type { ToolType } from '../../types';
import './toolBar.css';

// ============================================================================
// Types
// ============================================================================

interface Tool {
  id: ToolType;
  name: string;
  icon: string;
  shortcut?: string;
  category: 'primary' | 'media' | 'editing' | 'effects' | 'project';
  description: string;
}

// ============================================================================
// Tool Definitions
// ============================================================================

const TOOLS: Tool[] = [
  // Primary Tools
  {
    id: 'select',
    name: 'Select',
    icon: '⬚',
    shortcut: 'V',
    category: 'primary',
    description: 'Select and move shots',
  },
  {
    id: 'cut',
    name: 'Cut',
    icon: '✂',
    shortcut: 'C',
    category: 'primary',
    description: 'Split shots at playhead',
  },
  {
    id: 'move',
    name: 'Move',
    icon: '✋',
    shortcut: 'H',
    category: 'primary',
    description: 'Pan timeline view',
  },
  {
    id: 'zoom',
    name: 'Zoom',
    icon: '🔍',
    shortcut: 'Z',
    category: 'primary',
    description: 'Zoom timeline view',
  },
  
  // Media Tools
  {
    id: 'add-image',
    name: 'Add Image',
    icon: '🖼',
    shortcut: 'I',
    category: 'media',
    description: 'Add image to timeline',
  },
  {
    id: 'add-video',
    name: 'Add Video',
    icon: '🎬',
    shortcut: 'Shift+V',
    category: 'media',
    description: 'Add video to timeline',
  },
  {
    id: 'add-audio',
    name: 'Add Audio',
    icon: '🎵',
    shortcut: 'A',
    category: 'media',
    description: 'Add audio to timeline',
  },
  
  // Editing Tools
  {
    id: 'trim',
    name: 'Trim',
    icon: '⟷',
    shortcut: 'T',
    category: 'editing',
    description: 'Trim shot edges',
  },
  {
    id: 'ripple',
    name: 'Ripple Edit',
    icon: '⇉',
    shortcut: 'R',
    category: 'editing',
    description: 'Trim and shift subsequent shots',
  },
  {
    id: 'roll',
    name: 'Roll Edit',
    icon: '⇄',
    shortcut: 'N',
    category: 'editing',
    description: 'Adjust junction between shots',
  },
  {
    id: 'slip',
    name: 'Slip',
    icon: '⇔',
    shortcut: 'Y',
    category: 'editing',
    description: 'Adjust shot content timing',
  },
  {
    id: 'slide',
    name: 'Slide',
    icon: '⇆',
    shortcut: 'U',
    category: 'editing',
    description: 'Move shot and adjust adjacent',
  },
  
  // Effects Tools
  {
    id: 'transition',
    name: 'Transition',
    icon: '⟿',
    shortcut: 'Shift+T',
    category: 'effects',
    description: 'Add transition between shots',
  },
  {
    id: 'text',
    name: 'Text',
    icon: 'T',
    shortcut: 'Shift+X',
    category: 'effects',
    description: 'Add text overlay',
  },
  {
    id: 'keyframe',
    name: 'Keyframe',
    icon: '◆',
    shortcut: 'K',
    category: 'effects',
    description: 'Add animation keyframe',
  },
];

// ============================================================================
// Component
// ============================================================================

export const ToolBar: React.FC = () => {
  const dispatch = useAppDispatch();
  
  // Redux state
  const { activeTool } = useAppSelector((state) => state.tools);
  const { saveStatus } = useAppSelector((state) => state.project);
  
  // Handle tool selection
  const handleToolSelect = useCallback((toolId: ToolType) => {
    dispatch(setActiveTool(toolId));
  }, [dispatch]);
  
  // Handle save project
  const handleSaveProject = useCallback(() => {
    // Set saving status
    dispatch(setSaveStatus({ state: 'saving' }));
    
    // Use a timeout to allow the UI to update, then save
    setTimeout(() => {
      try {
        // Get the current Redux state using the store directly
        const state = store.getState();
        
        // Save the project to file
        const projectName = state.project.metadata?.name || 'untitled';
        const filename = generateProjectFilename(projectName);
        saveProjectToFile(state, filename);
        
        // Mark as saved
        dispatch(markSaved());
        
        // Show success notification via console (toast would need additional setup)
        console.log(`Project "${projectName}" saved successfully!`);
      } catch (error) {
        console.error('Failed to save project:', error);
        dispatch(setSaveStatus({ 
          state: 'error', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        }));
      }
    }, 100);
  }, [dispatch]);
  
  // Handle export - opens a file dialog for export options
  const handleExport = useCallback(() => {
    // Set saving status to indicate activity
    dispatch(setSaveStatus({ state: 'saving' }));
    
    try {
      // Get the current Redux state using the imported store
      const state = store.getState();
      
      const projectName = state.project.metadata?.name || 'untitled';
      const filename = `${projectName}-export.json`;
      
      // Save the project to file (export is same as save for JSON format)
      saveProjectToFile(state, filename);
      
      // Mark as saved
      dispatch(markSaved());
      
      // Log export completion
      console.log(`Project "${projectName}" exported successfully!`);
    } catch (error) {
      console.error('Failed to export project:', error);
      dispatch(setSaveStatus({ 
        state: 'error', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }));
    }
  }, [dispatch]);
  
  // Handle project settings - opens the settings panel
  const handleProjectSettings = useCallback(() => {
    // Open the project settings by activating the shotConfig panel with settings tab
    // In a full implementation, this would open a settings modal
    // For now, we activate the panel and log the action
    
    console.log('Opening project settings...');
    
    // Dispatch action to show settings (this would need a settings panel implementation)
    // For now, we can open the shot config panel which could contain settings
    dispatch(setActivePanel('shotConfig'));
    
    // Log for debugging using the imported store
    const state = store.getState();
    const projectName = state.project.metadata?.name || 'Untitled Project';
    const settings = state.project.settings;
    
    console.log('Project Settings:', {
      name: projectName,
      resolution: `${settings.resolution.width}x${settings.resolution.height}`,
      format: settings.format,
      fps: settings.fps,
      quality: settings.quality
    });
  }, [dispatch]);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      // Check for Ctrl/Cmd+S (Save)
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSaveProject();
        return;
      }
      
      // Check for tool shortcuts
      const key = e.shiftKey ? `Shift+${e.key.toUpperCase()}` : e.key.toUpperCase();
      
      const tool = TOOLS.find((t) => t.shortcut === key);
      if (tool) {
        e.preventDefault();
        handleToolSelect(tool.id);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleToolSelect, handleSaveProject]);
  
  // Get cursor style for active tool
  const getCursorClass = useCallback(() => {
    switch (activeTool) {
      case 'select':
        return 'cursor-default';
      case 'cut':
        return 'cursor-crosshair';
      case 'move':
        return 'cursor-grab';
      case 'zoom':
        return 'cursor-zoom-in';
      case 'trim':
        return 'cursor-ew-resize';
      case 'text':
        return 'cursor-text';
      default:
        return 'cursor-default';
    }
  }, [activeTool]);
  
  // Apply cursor to body
  useEffect(() => {
    const cursorClass = getCursorClass();
    document.body.classList.add(cursorClass);
    
    return () => {
      document.body.classList.remove(cursorClass);
    };
  }, [getCursorClass]);
  
  // Group tools by category
  const primaryTools = TOOLS.filter((t) => t.category === 'primary');
  const mediaTools = TOOLS.filter((t) => t.category === 'media');
  const editingTools = TOOLS.filter((t) => t.category === 'editing');
  const effectsTools = TOOLS.filter((t) => t.category === 'effects');
  
  return (
    <div className="tool-bar">
      {/* Primary Tools */}
      <div className="tool-group primary-tools">
        {primaryTools.map((tool) => (
          <button
            key={tool.id}
            className={`tool-btn ${activeTool === tool.id ? 'active' : ''}`}
            onClick={() => handleToolSelect(tool.id)}
            title={`${tool.description}${tool.shortcut ? ` (${tool.shortcut})` : ''}`}
            aria-label={tool.name}
          >
            <span className="tool-icon">{tool.icon}</span>
            <span className="tool-label">{tool.name}</span>
            {tool.shortcut && <span className="tool-shortcut">{tool.shortcut}</span>}
          </button>
        ))}
      </div>
      
      <div className="tool-separator" />
      
      {/* Media Tools */}
      <div className="tool-group media-tools">
        {mediaTools.map((tool) => (
          <button
            key={tool.id}
            className={`tool-btn ${activeTool === tool.id ? 'active' : ''}`}
            onClick={() => handleToolSelect(tool.id)}
            title={`${tool.description}${tool.shortcut ? ` (${tool.shortcut})` : ''}`}
            aria-label={tool.name}
          >
            <span className="tool-icon">{tool.icon}</span>
            <span className="tool-label">{tool.name}</span>
            {tool.shortcut && <span className="tool-shortcut">{tool.shortcut}</span>}
          </button>
        ))}
      </div>
      
      <div className="tool-separator" />
      
      {/* Editing Tools */}
      <div className="tool-group editing-tools">
        {editingTools.map((tool) => (
          <button
            key={tool.id}
            className={`tool-btn ${activeTool === tool.id ? 'active' : ''}`}
            onClick={() => handleToolSelect(tool.id)}
            title={`${tool.description}${tool.shortcut ? ` (${tool.shortcut})` : ''}`}
            aria-label={tool.name}
          >
            <span className="tool-icon">{tool.icon}</span>
            <span className="tool-label">{tool.name}</span>
            {tool.shortcut && <span className="tool-shortcut">{tool.shortcut}</span>}
          </button>
        ))}
      </div>
      
      <div className="tool-separator" />
      
      {/* Effects Tools */}
      <div className="tool-group effects-tools">
        {effectsTools.map((tool) => (
          <button
            key={tool.id}
            className={`tool-btn ${activeTool === tool.id ? 'active' : ''}`}
            onClick={() => handleToolSelect(tool.id)}
            title={`${tool.description}${tool.shortcut ? ` (${tool.shortcut})` : ''}`}
            aria-label={tool.name}
          >
            <span className="tool-icon">{tool.icon}</span>
            <span className="tool-label">{tool.name}</span>
            {tool.shortcut && <span className="tool-shortcut">{tool.shortcut}</span>}
          </button>
        ))}
      </div>
      
      {/* Spacer */}
      <div className="tool-spacer" />
      
      {/* Project Management Tools */}
      <div className="tool-group project-tools">
        <button
          className="tool-btn project-btn"
          onClick={handleProjectSettings}
          title="Project Settings"
          aria-label="Project Settings"
        >
          <span className="tool-icon">⚙</span>
          <span className="tool-label">Settings</span>
        </button>
        
        <button
          className="tool-btn project-btn save-btn"
          onClick={handleSaveProject}
          title="Save Project (Ctrl/Cmd+S)"
          aria-label="Save Project"
        >
          <span className="tool-icon">💾</span>
          <span className="tool-label">Save</span>
          <span className={`save-status ${saveStatus.state}`}>{saveStatus.state}</span>
        </button>
        
        <button
          className="tool-btn project-btn"
          onClick={handleExport}
          title="Export Project"
          aria-label="Export Project"
        >
          <span className="tool-icon">📤</span>
          <span className="tool-label">Export</span>
        </button>
      </div>
    </div>
  );
};

export default ToolBar;
