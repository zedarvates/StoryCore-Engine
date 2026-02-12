/**
 * Toolbar Component
 * Editor toolbar with tools and actions
 */

import React from 'react';
import { useVideoEditor } from '../../contexts/VideoEditorContext';
import { EditorMode } from '../../types/video-editor';
import './Toolbar.css';

interface ToolbarProps {
  onExport: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ onExport }) => {
  const {
    project,
    isDirty,
    canUndo,
    canRedo,
    undo,
    redo,
    editorMode,
    setEditorMode,
  } = useVideoEditor();

  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <div className="toolbar-logo">
          <span className="logo-icon">🎬</span>
          <span className="logo-text">StoryCore</span>
        </div>
        <div className="toolbar-project">
          <span className="project-name">{project?.name || 'Untitled'}</span>
          {isDirty && <span className="unsaved-indicator">●</span>}
        </div>
      </div>

      <div className="toolbar-center">
        <div className="toolbar-mode-group">
          <button
            className={`toolbar-btn mode-btn ${editorMode === EditorMode.VIDEO ? 'active' : ''}`}
            onClick={() => setEditorMode(EditorMode.VIDEO)}
            title="Video Mode"
          >
            <span className="btn-icon">🎥</span>
            <span className="btn-label">Video</span>
          </button>
          <button
            className={`toolbar-btn mode-btn ${editorMode === EditorMode.IMAGE ? 'active' : ''}`}
            onClick={() => setEditorMode(EditorMode.IMAGE)}
            title="Image Mode"
          >
            <span className="btn-icon">🖼️</span>
            <span className="btn-label">Image</span>
          </button>
          <button
            className={`toolbar-btn mode-btn ${editorMode === EditorMode.AUDIO ? 'active' : ''}`}
            onClick={() => setEditorMode(EditorMode.AUDIO)}
            title="Audio Mode"
          >
            <span className="btn-icon">🎵</span>
            <span className="btn-label">Audio</span>
          </button>
        </div>

        <div className="toolbar-divider" />

        <div className="toolbar-actions">
          <button
            className="toolbar-btn action-btn"
            onClick={undo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
          >
            <span className="btn-icon">↩️</span>
          </button>
          <button
            className="toolbar-btn action-btn"
            onClick={redo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
          >
            <span className="btn-icon">↪️</span>
          </button>
        </div>

        <div className="toolbar-divider" />

        <div className="toolbar-tools">
          <button className="toolbar-btn tool-btn" title="Select (V)">
            <span className="btn-icon">🖱️</span>
          </button>
          <button className="toolbar-btn tool-btn" title="Cut (C)">
            <span className="btn-icon">✂️</span>
          </button>
          <button className="toolbar-btn tool-btn" title="Text (T)">
            <span className="btn-icon">📝</span>
          </button>
          <button className="toolbar-btn tool-btn" title="Hand (H)">
            <span className="btn-icon">✋</span>
          </button>
        </div>
      </div>

      <div className="toolbar-right">
        <button className="toolbar-btn primary export-btn" onClick={onExport}>
          <span className="btn-icon">📤</span>
          <span className="btn-label">Export</span>
        </button>
        <button className="toolbar-btn settings-btn" title="Settings">
          <span className="btn-icon">⚙️</span>
        </button>
      </div>
    </div>
  );
};

export default Toolbar;

