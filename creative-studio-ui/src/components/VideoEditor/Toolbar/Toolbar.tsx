import { 
  Projector, 
  Film, 
  Image as ImageIcon, 
  Music, 
  Undo2, 
  Redo2, 
  MousePointer2, 
  Scissors, 
  Type, 
  Hand, 
  Download, 
  Settings 
} from 'lucide-react';
import { useVideoEditor } from '@/contexts/VideoEditorContext';
import { EditorMode } from '@/types/video-editor';
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
          <Projector className="w-5 h-5 text-blue-500" />
          <span className="logo-text">Story<span>Core</span></span>
        </div>
        <div className="toolbar-project">
          <span className="project-name">{project?.name || 'Sans titre'}</span>
          {isDirty && <div className="dirty-indicator" title="Modifications non enregistrées" />}
        </div>
      </div>

      <div className="toolbar-center">
        <div className="toolbar-mode-group">
          <button
            className={`mode-btn ${editorMode === EditorMode.VIDEO ? 'active' : ''}`}
            onClick={() => setEditorMode(EditorMode.VIDEO)}
            title="Mode Vidéo"
          >
            <Film className="w-4 h-4" />
            <span className="btn-label">Vidéo</span>
          </button>
          <button
            className={`mode-btn ${editorMode === EditorMode.IMAGE ? 'active' : ''}`}
            onClick={() => setEditorMode(EditorMode.IMAGE)}
            title="Mode Image"
          >
            <ImageIcon className="w-4 h-4" />
            <span className="btn-label">Image</span>
          </button>
          <button
            className={`mode-btn ${editorMode === EditorMode.AUDIO ? 'active' : ''}`}
            onClick={() => setEditorMode(EditorMode.AUDIO)}
            title="Mode Audio"
          >
            <Music className="w-4 h-4" />
            <span className="btn-label">Audio</span>
          </button>
        </div>

        <div className="toolbar-divider" />

        <div className="toolbar-actions">
          <button
            className="toolbar-btn"
            onClick={undo}
            disabled={!canUndo}
            title="Annuler (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            className="toolbar-btn"
            onClick={redo}
            disabled={!canRedo}
            title="Rétablir (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        <div className="toolbar-divider" />

        <div className="toolbar-tools">
          <button className="toolbar-btn" title="Sélection (V)">
            <MousePointer2 className="w-4 h-4 text-blue-400" />
          </button>
          <button className="toolbar-btn" title="Cutter (C)">
            <Scissors className="w-4 h-4" />
          </button>
          <button className="toolbar-btn" title="Texte (T)">
            <Type className="w-4 h-4" />
          </button>
          <button className="toolbar-btn" title="Main (H)">
            <Hand className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="toolbar-right">
        <button className="toolbar-btn primary export-btn" onClick={onExport}>
          <Download className="w-4 h-4" />
          <span className="btn-label">Exporter</span>
        </button>
        <button className="toolbar-btn" title="Paramètres">
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Toolbar;

