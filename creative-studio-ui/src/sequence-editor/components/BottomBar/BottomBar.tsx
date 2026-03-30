/**
 * BottomBar Component - Page navigation and LLM state (Point 6 of Spec)
 * Very thin bar with icons for Media, Edit, Fusion, Color, Fairlight, Deliver.
 */

import React from 'react';
import { 
  Database, Layout, Film, Palette, Music, Share2, Sparkles
} from 'lucide-react';
import './BottomBar.css';

export const BottomBar: React.FC = () => {
  const pages = [
    { id: 'media', icon: Database, label: 'Media' },
    { id: 'cut', icon: Layout, label: 'Cut' },
    { id: 'edit', icon: Film, label: 'Edit', active: true },
    { id: 'fusion', icon: Sparkles, label: 'Fusion' },
    { id: 'color', icon: Palette, label: 'Color' },
    { id: 'fairlight', icon: Music, label: 'Fairlight' },
    { id: 'deliver', icon: Share2, label: 'Deliver' }
  ];

  return (
    <footer className="bottom-bar">
      <div className="bottom-nav">
        {pages.map(page => (
          <button 
            key={page.id} 
            className={`bottom-nav-btn ${page.active ? 'active' : ''}`}
            title={page.label}
          >
            <page.icon className="w-3.5 h-3.5" />
          </button>
        ))}
      </div>
      
      {/* Assistant LLM Badge */}
      <div className="llm-badge">
        <div className="status-dot pulse" />
        <span className="badge-text">Assistant LLM</span>
        <span className="badge-version">v1.2</span>
      </div>
    </footer>
  );
};

export default BottomBar;
