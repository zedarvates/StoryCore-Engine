/**
 * Toolbar Component - Main toolbar for Grid Editor
 * 
 * Provides:
 * - Tool selection buttons (Select, Crop, Rotate, Scale, Pan, Annotate)
 * - Undo/Redo buttons with enabled/disabled states
 * - Zoom controls (Fit, 1:1, +, -)
 * - Active tool highlighting
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
 */

import React, { useState } from 'react';
import { useGridStore, Tool } from '../../stores/gridEditorStore';
import { useUndoRedoStore } from '../../stores/undoRedoStore';
import { useViewportStore } from '../../stores/viewportStore';
import { ExportImportControls } from './ExportImportControls';
import { QuickHelpModal } from './QuickHelpModal';

// ============================================================================
// Type Definitions
// ============================================================================

export interface ToolbarProps {
  /**
   * Optional className for styling
   */
  className?: string;

  /**
   * Grid bounds for fit-to-view calculation
   */
  gridBounds?: { width: number; height: number };

  /**
   * Callback when tool changes
   */
  onToolChange?: (tool: Tool) => void;
}

// ============================================================================
// Tool Button Configuration
// ============================================================================

interface ToolConfig {
  id: Tool;
  label: string;
  icon: string;
  shortcut: string;
  title: string;
}

const TOOL_CONFIGS: ToolConfig[] = [
  {
    id: 'select',
    label: 'Select',
    icon: '⬚',
    shortcut: 'V',
    title: 'Select Tool (V) - Click to select panels, drag to move, Ctrl+Click for multi-select',
  },
  {
    id: 'crop',
    label: 'Crop',
    icon: '✂',
    shortcut: 'C',
    title: 'Crop Tool (C) - Define crop region for selected panels, drag handles to adjust',
  },
  {
    id: 'rotate',
    label: 'Rotate',
    icon: '↻',
    shortcut: 'R',
    title: 'Rotate Tool (R) - Rotate selected panels, drag to rotate or enter angle value',
  },
  {
    id: 'scale',
    label: 'Scale',
    icon: '⇲',
    shortcut: 'S',
    title: 'Scale Tool (S) - Resize selected panels, drag corners to scale, Shift for uniform',
  },
  {
    id: 'pan',
    label: 'Pan',
    icon: '✋',
    shortcut: 'Space',
    title: 'Pan Tool (Space) - Navigate the canvas, drag to move viewport, scroll to zoom',
  },
  {
    id: 'annotate',
    label: 'Annotate',
    icon: '✎',
    shortcut: 'A',
    title: 'Annotate Tool (A) - Draw annotations, add text notes, mark areas of interest',
  },
];

// ============================================================================
// Toolbar Component
// ============================================================================

export const Toolbar: React.FC<ToolbarProps> = ({
  className = '',
  gridBounds = { width: 1920, height: 1080 },
  onToolChange,
}) => {
  // ============================================================================
  // Store Hooks
  // ============================================================================

  const activeTool = useGridStore((state) => state.activeTool);
  const setActiveTool = useGridStore((state) => state.setActiveTool);

  const canUndo = useUndoRedoStore((state) => state.canUndo());
  const canRedo = useUndoRedoStore((state) => state.canRedo());
  const undo = useUndoRedoStore((state) => state.undo);
  const redo = useUndoRedoStore((state) => state.redo);

  const zoom = useViewportStore((state) => state.zoom);
  const zoomIn = useViewportStore((state) => state.zoomIn);
  const zoomOut = useViewportStore((state) => state.zoomOut);
  const fitToView = useViewportStore((state) => state.fitToView);
  const zoomToActual = useViewportStore((state) => state.zoomToActual);

  // Help modal state
  const [showHelp, setShowHelp] = useState(false);

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleToolClick = (tool: Tool) => {
    setActiveTool(tool);
    onToolChange?.(tool);
  };

  const handleUndo = () => {
    if (canUndo) {
      undo();
    }
  };

  const handleRedo = () => {
    if (canRedo) {
      redo();
    }
  };

  const handleFitToView = () => {
    fitToView(gridBounds);
  };

  const handleZoomToActual = () => {
    zoomToActual();
  };

  const handleZoomIn = () => {
    zoomIn();
  };

  const handleZoomOut = () => {
    zoomOut();
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div
      className={`grid-editor-toolbar ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 16px',
        backgroundColor: '#2a2a2a',
        borderBottom: '1px solid #444',
        userSelect: 'none',
      }}
    >
      {/* Tool Buttons */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          paddingRight: '16px',
          borderRight: '1px solid #444',
        }}
      >
        {TOOL_CONFIGS.map((toolConfig) => (
          <ToolButton
            key={toolConfig.id}
            config={toolConfig}
            isActive={activeTool === toolConfig.id}
            onClick={() => handleToolClick(toolConfig.id)}
          />
        ))}
      </div>

      {/* Undo/Redo Buttons */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          paddingRight: '16px',
          borderRight: '1px solid #444',
        }}
      >
        <ActionButton
          label="Undo"
          icon="↶"
          title="Undo (Ctrl+Z) - Revert last action"
          disabled={!canUndo}
          onClick={handleUndo}
        />
        <ActionButton
          label="Redo"
          icon="↷"
          title="Redo (Ctrl+Shift+Z) - Restore undone action"
          disabled={!canRedo}
          onClick={handleRedo}
        />
      </div>

      {/* Zoom Controls */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          alignItems: 'center',
        }}
      >
        <ActionButton
          label="Fit"
          icon="⊡"
          title="Fit to View (F) - Zoom to fit entire grid in viewport"
          onClick={handleFitToView}
        />
        <ActionButton
          label="1:1"
          icon="1:1"
          title="Zoom to Actual Size (100%) - View at original resolution"
          onClick={handleZoomToActual}
        />
        <ActionButton
          label="-"
          icon="-"
          title="Zoom Out (-) - Decrease zoom level"
          onClick={handleZoomOut}
        />
        <div
          style={{
            minWidth: '60px',
            textAlign: 'center',
            color: '#ccc',
            fontSize: '12px',
            fontFamily: 'monospace',
          }}
          title="Current zoom level"
        >
          {Math.round(zoom * 100)}%
        </div>
        <ActionButton
          label="+"
          icon="+"
          title="Zoom In (+) - Increase zoom level"
          onClick={handleZoomIn}
        />
      </div>

      {/* Export/Import Controls */}
      <div
        style={{
          marginLeft: 'auto',
          paddingLeft: '16px',
          borderLeft: '1px solid #444',
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
        }}
      >
        <ExportImportControls compact={true} />
        
        {/* Help Button */}
        <button
          type="button"
          onClick={() => setShowHelp(true)}
          title="Quick Help (?) - Keyboard shortcuts and tips"
          aria-label="Aide rapide"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            backgroundColor: '#3a3a3a',
            color: '#4a90e2',
            border: '1px solid #555',
            borderRadius: '50%',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '700',
            transition: 'all 0.2s ease',
            outline: 'none',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#444';
            e.currentTarget.style.borderColor = '#4a90e2';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#3a3a3a';
            e.currentTarget.style.borderColor = '#555';
          }}
        >
          ?
        </button>
      </div>

      {/* Help Modal */}
      <QuickHelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
};

// ============================================================================
// Tool Button Component
// ============================================================================

interface ToolButtonProps {
  config: ToolConfig;
  isActive: boolean;
  onClick: () => void;
}

const ToolButton: React.FC<ToolButtonProps> = ({ config, isActive, onClick }) => {
  return (
    <button
      type="button"
      title={config.title}
      aria-label={config.title}
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '60px',
        padding: '8px 12px',
        backgroundColor: isActive ? '#4a90e2' : '#3a3a3a',
        color: isActive ? '#fff' : '#ccc',
        border: isActive ? '2px solid #5aa3ff' : '1px solid #555',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '11px',
        fontWeight: isActive ? '600' : '400',
        transition: 'all 0.2s ease',
        outline: 'none',
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = '#444';
          e.currentTarget.style.borderColor = '#666';
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = '#3a3a3a';
          e.currentTarget.style.borderColor = '#555';
        }
      }}
    >
      <div style={{ fontSize: '18px', marginBottom: '4px' }} aria-hidden="true">{config.icon}</div>
      <div>{config.label}</div>
    </button>
  );
};

// ============================================================================
// Action Button Component
// ============================================================================

interface ActionButtonProps {
  label: string;
  icon: string;
  title: string;
  disabled?: boolean;
  onClick: () => void;
}

const ActionButton: React.FC<ActionButtonProps> = ({
  label,
  icon,
  title,
  disabled = false,
  onClick,
}) => {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '40px',
        padding: '8px 12px',
        backgroundColor: disabled ? '#2a2a2a' : '#3a3a3a',
        color: disabled ? '#666' : '#ccc',
        border: '1px solid #555',
        borderRadius: '4px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: '14px',
        fontWeight: '500',
        transition: 'all 0.2s ease',
        outline: 'none',
        opacity: disabled ? 0.5 : 1,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = '#444';
          e.currentTarget.style.borderColor = '#666';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = '#3a3a3a';
          e.currentTarget.style.borderColor = '#555';
        }
      }}
    >
      {icon === label ? label : icon}
    </button>
  );
};

// ============================================================================
// Export
// ============================================================================

export default Toolbar;
