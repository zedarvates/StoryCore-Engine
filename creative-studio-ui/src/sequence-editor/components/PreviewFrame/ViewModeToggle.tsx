/**
 * View Mode Toggle Component
 * 
 * Toggle button to switch between Video Preview and 3D Scene View modes.
 * Requirements: 3.1, 3.7
 */

import React from 'react';
import './viewModeToggle.css';

export type ViewMode = 'video' | '3d-scene';

interface ViewModeToggleProps {
  currentMode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  disabled?: boolean;
}

export const ViewModeToggle: React.FC<ViewModeToggleProps> = ({
  currentMode,
  onModeChange,
  disabled = false,
}) => {
  return (
    <div className="view-mode-toggle">
      <button
        className={`view-mode-btn ${currentMode === 'video' ? 'active' : ''}`}
        onClick={() => onModeChange('video')}
        disabled={disabled}
        title="Video Preview Mode"
        aria-label="Switch to video preview mode"
      >
        <span className="view-mode-icon">🎬</span>
        <span className="view-mode-label">Video Preview</span>
      </button>
      <button
        className={`view-mode-btn ${currentMode === '3d-scene' ? 'active' : ''}`}
        onClick={() => onModeChange('3d-scene')}
        disabled={disabled}
        title="3D Scene View Mode"
        aria-label="Switch to 3D scene view mode"
      >
        <span className="view-mode-icon">🎭</span>
        <span className="view-mode-label">3D Scene View</span>
      </button>
    </div>
  );
};

export default ViewModeToggle;
