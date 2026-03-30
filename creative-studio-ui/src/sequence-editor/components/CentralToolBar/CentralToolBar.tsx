/**
 * CentralToolBar Component - Between Workspace and Timeline (Point 4 of Spec)
 * Thin bar with Tabs, Editing Icons (Arrow, Razor, Magnet), and a Zoom Slider.
 */

import React from 'react';
import { 
  MousePointer2, Scissors, Magnet, Hand, Link2, 
  Search, Settings 
} from 'lucide-react';
import './CentralToolBar.css';

interface CentralToolBarProps {
  onZoomChange?: (value: number) => void;
  zoomLevel?: number;
}

export const CentralToolBar: React.FC<CentralToolBarProps> = ({ 
  onZoomChange, 
  zoomLevel = 1 
}) => {
  return (
    <div className="central-tool-bar">
      {/* Left: Editing Icons */}
      <div className="toolbar-left">
        <button className="tool-btn active" title="Select Tool (V)">
          <MousePointer2 className="w-4 h-4" />
        </button>
        <button className="tool-btn" title="Blade Tool (B)">
          <Scissors className="w-4 h-4" />
        </button>
        <button className="tool-btn" title="Hand Tool (H)">
          <Hand className="w-4 h-4" />
        </button>
        <div className="tool-separator" />
        <button className="tool-btn" title="Magnet/Snapping (N)">
          <Magnet className="w-4 h-4" />
        </button>
        <button className="tool-btn" title="Link Clips">
          <Link2 className="w-4 h-4" />
        </button>
      </div>

      {/* Center: Sequence Name / Tabs */}
      <div className="toolbar-center">
        <div className="tab-pill">
          <span>Main Sequence</span>
          <div className="status-dot green" />
        </div>
      </div>

      {/* Right: Zoom & View Controls */}
      <div className="toolbar-right">
        <div className="zoom-control">
          <Search className="w-3.5 h-3.5 opacity-40 ml-2" />
          <input 
            type="range" 
            min="1" max="100" 
            className="zoom-slider"
            title="Timeline Zoom"
            value={zoomLevel}
            onChange={(e) => onZoomChange?.(parseInt(e.target.value))}
          />
        </div>
        <div className="toolbar-separator" />
        <button className="tool-btn" title="Timeline Options">
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default CentralToolBar;
