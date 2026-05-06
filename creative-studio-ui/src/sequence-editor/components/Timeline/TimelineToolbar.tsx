/**
 * TimelineToolbar — Barre d'outils NLE professionnelle
 * Inspirée de Premiere Pro / DaVinci Resolve / LTX-Desktop.
 *
 * Raccourcis : V=Select, B=Blade, R=Ripple, N=Roll, Y=Slip, U=Slide, T=Text, K=Keyframe
 */
import React, { useCallback } from 'react';
import { useProjectStore } from '@/stores/useProjectStore';
import { useShallow } from 'zustand/react/shallow';
import type { ToolType } from '../../types';
import {
  MousePointer2, Scissors, MoveRight, ChevronsLeftRight,
  AlignEndHorizontal, AlignStartVertical as AlignCenterHorizontal,
  Type, Key, Diamond, Music, Video, Image,
} from 'lucide-react';

// ============================================================================
// Tool Definitions
// ============================================================================

interface ToolDefinition {
  id: ToolType;
  label: string;
  shortcut: string;
  icon: React.ReactNode;
  group: 'edit' | 'media';
}

const TOOLS: ToolDefinition[] = [
  { id: 'select', label: 'Select', shortcut: 'V', icon: <MousePointer2 className="w-4 h-4" />, group: 'edit' },
  { id: 'cut',    label: 'Blade',  shortcut: 'B', icon: <Scissors className="w-4 h-4" />, group: 'edit' },
  { id: 'ripple', label: 'Ripple', shortcut: 'R', icon: <MoveRight className="w-4 h-4" />, group: 'edit' },
  { id: 'roll',   label: 'Roll',   shortcut: 'N', icon: <ChevronsLeftRight className="w-4 h-4" />, group: 'edit' },
  { id: 'slip',   label: 'Slip',   shortcut: 'Y', icon: <AlignEndHorizontal className="w-4 h-4" />, group: 'edit' },
  { id: 'slide',  label: 'Slide',  shortcut: 'U', icon: <AlignCenterHorizontal className="w-4 h-4" />, group: 'edit' },
  { id: 'text',   label: 'Text',   shortcut: 'T', icon: <Type className="w-4 h-4" />, group: 'edit' },
  { id: 'keyframe', label: 'Keyframe', shortcut: 'K', icon: <Diamond className="w-4 h-4" />, group: 'edit' },
];

interface TimelineToolbarProps {
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export const TimelineToolbar: React.FC<TimelineToolbarProps> = ({ className = '' }) => {
  const { activeTool, setActiveTool } = useProjectStore(useShallow(state => ({
    activeTool: state.activeTool as ToolType,
    setActiveTool: state.setActiveTool,
  })));

  const handleSelectTool = useCallback((toolId: ToolType) => {
    setActiveTool(toolId);
  }, [setActiveTool]);

  return (
    <div className={`timeline-toolbar ${className}`}>
      {TOOLS.map((tool) => (
        <button
          key={tool.id}
          className={`timeline-tool-btn ${activeTool === tool.id ? 'active' : ''}`}
          onClick={() => handleSelectTool(tool.id)}
          title={`${tool.label} (${tool.shortcut})`}
        >
          {tool.icon}
          <span className="tool-shortcut-hint">{tool.shortcut}</span>
        </button>
      ))}
    </div>
  );
};

export default TimelineToolbar;
