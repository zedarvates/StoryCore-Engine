/**
 * StatusBar Component - Project Status Bar
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
 * 
 * Displays project metadata and save status at the bottom right of the interface.
 * Shows project path, format, resolution, FPS, and save status with color coding.
 */

import React, { useMemo } from 'react';
import { useAppSelector } from '../../store';
import './statusBar.css';

export const StatusBar: React.FC = () => {
  const { metadata, settings, saveStatus } = useAppSelector((state) => state.project);
  
  // Format resolution string
  const resolutionString = useMemo(() => {
    return `${settings.resolution.width}x${settings.resolution.height}`;
  }, [settings.resolution]);

  // Format last save time as relative time
  const lastSaveText = useMemo(() => {
    if (!saveStatus.lastSaveTime) {
      return 'Never saved';
    }

    const now = new Date();
    const saveTime = new Date(saveStatus.lastSaveTime);
    const diffMs = now.getTime() - saveTime.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 60) {
      return 'Saved just now';
    } else if (diffMinutes < 60) {
      return `Saved ${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `Saved ${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else {
      return `Saved ${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    }
  }, [saveStatus.lastSaveTime]);

  // Get status color class based on save state
  const getStatusColorClass = () => {
    switch (saveStatus.state) {
      case 'saved':
        return 'status-saved';
      case 'modified':
        return 'status-modified';
      case 'saving':
        return 'status-saving';
      case 'error':
        return 'status-error';
      default:
        return 'status-saved';
    }
  };

  // Get status text
  const getStatusText = () => {
    switch (saveStatus.state) {
      case 'saved':
        return lastSaveText;
      case 'modified':
        return 'Modified';
      case 'saving':
        return 'Saving...';
      case 'error':
        return saveStatus.error || 'Save error';
      default:
        return 'Unknown';
    }
  };

  // Get project path for display (truncate if too long)
  const displayPath = useMemo(() => {
    if (!metadata?.path) {
      return 'Untitled Project';
    }
    
    // Show last 40 characters if path is too long
    if (metadata.path.length > 40) {
      return '...' + metadata.path.slice(-37);
    }
    
    return metadata.path;
  }, [metadata?.path]);

  return (
    <div className="status-bar" role="status" aria-live="polite">
      {/* Project metadata section */}
      <div className="status-bar-metadata">
        <div 
          className="status-item status-path" 
          title={metadata?.path || 'No project loaded'}
        >
          <span className="status-label">Project:</span>
          <span className="status-value">{displayPath}</span>
        </div>
        
        <div className="status-separator">|</div>
        
        <div className="status-item" title="Video format">
          <span className="status-label">Format:</span>
          <span className="status-value">{settings.format.toUpperCase()}</span>
        </div>
        
        <div className="status-separator">|</div>
        
        <div className="status-item" title="Video resolution">
          <span className="status-label">Resolution:</span>
          <span className="status-value">{resolutionString}</span>
        </div>
        
        <div className="status-separator">|</div>
        
        <div className="status-item" title="Frames per second">
          <span className="status-label">FPS:</span>
          <span className="status-value">{settings.fps}</span>
        </div>
      </div>

      {/* Save status section */}
      <div className="status-bar-save">
        <div 
          className={`save-status ${getStatusColorClass()}`}
          title={saveStatus.error || getStatusText()}
        >
          <span className="save-indicator" />
          <span className="save-text">{getStatusText()}</span>
        </div>
      </div>
    </div>
  );
};

export default StatusBar;
