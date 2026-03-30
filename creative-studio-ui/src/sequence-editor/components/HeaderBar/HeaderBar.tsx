/**
 * HeaderBar Component - Topmost thin navigation (Point 2 of Spec)
 * 
 * Features menus on the left, layout icons in the center, and inspector/mixer controls on the right.
 */

import React from 'react';
import { 
  Database, Sparkles, List, 
  Share2, SlidersHorizontal, FileText, LayoutPanelTop,
  ChevronDown, User, ArrowLeft, Activity
} from 'lucide-react';
import './HeaderBar.css';

interface HeaderBarProps {
  onMediaPoolToggle?: () => void;
  onEffectsToggle?: () => void;
  onIndexToggle?: () => void;
  onInspectorToggle?: () => void;
  onMixerToggle?: () => void;
  onMetadataToggle?: () => void;
  onHealthToggle?: () => void;
  onBack?: () => void;
  title?: string;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  onMediaPoolToggle,
  onEffectsToggle,
  onIndexToggle,
  onInspectorToggle,
  onMixerToggle,
  onMetadataToggle,
  onHealthToggle,
  onBack,
  title
}) => {
  const menus = [
    'Trim', 'Timeline', 'Clip', 'Mark', 
    'View', 'Playback', 'Fusion', 'Color', 'Fairlight', 'Workspace'
  ];

  return (
    <header className="header-bar">
      {/* Left: Text Menus */}
      <div className="header-left">
        {onBack && (
          <button className="back-btn" onClick={onBack} title="Back to Dashboard">
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        <div className="app-logo">
          <div className="logo-icon" />
          <span className="logo-text">{title || 'Storycore'}</span>
          <span className="logo-accent">ENG/Pro</span>
        </div>
        <nav className="menu-nav">
          {menus.map(menu => (
            <button key={menu} className="menu-btn">
              {menu}
              <ChevronDown className="w-2 h-2 ml-1 opacity-20" />
            </button>
          ))}
        </nav>
      </div>

      {/* Center: Logic/Layout Toggles */}
      <div className="header-center">
        <div className="layout-toggle-group">
          <button className="layout-btn active" onClick={onMediaPoolToggle} title="Media Pool">
            <Database className="w-3.5 h-3.5" />
            <span>Media Pool</span>
          </button>
          <button className="layout-btn" onClick={onEffectsToggle} title="Effects Library">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Effects</span>
          </button>
          <button className="layout-btn" onClick={onIndexToggle} title="Edit Index">
            <List className="w-3.5 h-3.5" />
            <span>Index</span>
          </button>
        </div>
      </div>

      {/* Right: Action Buttons */}
      <div className="header-right">
        <button className="quick-export-btn">
          <Share2 className="w-4 h-4 mr-1.5" />
          <span>Quick Export</span>
        </button>
        <div className="header-separator" />
        <button className="icon-action-btn" onClick={onMixerToggle} title="Mixer">
          <SlidersHorizontal className="w-4 h-4" />
        </button>
        <button className="icon-action-btn" onClick={onMetadataToggle} title="Metadata">
          <FileText className="w-4 h-4" />
        </button>
        <button className="icon-action-btn" onClick={onHealthToggle} title="Story Health Audit">
          <Activity className="w-4 h-4" />
        </button>
        <button className="icon-action-btn active" onClick={onInspectorToggle} title="Inspector">
          <LayoutPanelTop className="w-4 h-4" />
        </button>
        <div className="header-user">
           <User className="w-4 h-4 opacity-40" />
        </div>
      </div>
    </header>
  );
};

export default HeaderBar;
