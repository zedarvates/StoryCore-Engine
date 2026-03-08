/**
 * Compact Director Panel
 * Consolidated controls for rapid scene orchestration
 */

import React, { useState } from 'react';
import { useAppDispatch } from '../../store';
import { toggleCompactMode } from '../../store/slices/panelsSlice';
import './compactDirectorPanel.css';

export const CompactDirectorPanel: React.FC = () => {
  const dispatch = useAppDispatch();
  const [activeShot, setActiveShot] = useState(0);
  const [prompt, setPrompt] = useState('');
  
  // Interface Settings State
  const [settings] = useState({
    mode: 'Multi-shot Manual',
    ratio: '16:9',
    resolution: '1080p',
    style: 'Action',
    audio: 'On',
    sampling: '1/4'
  });

  const handleClose = () => {
    dispatch(toggleCompactMode());
  };

  // SVG Curve Helper
  const CurvePreview = ({ path }: { path: string }) => (
    <div className="shot-curve-preview">
      <svg className="shot-curve-svg" viewBox="0 0 100 40">
        <path d={path} className="curve-path" />
      </svg>
    </div>
  );

  const mockPaths = [
    "M0,35 Q25,5 50,35 T100,35",
    "M0,35 Q25,25 50,15 T100,5",
    "M0,5 Q25,15 50,25 T100,35",
    "M0,20 Q50,0 100,20",
    "M0,35 L50,5 L100,35",
    "M0,20 C20,0 80,40 100,20"
  ];

  return (
    <div className="compact-director-overlay">
      <button className="close-compact-btn" onClick={handleClose} title="Close Compact Mode">
        ✕
      </button>

      {/* Floating Left Side Vertical Bar */}
      <div className="compact-sidebar">
        <div className="sidebar-btn"><span title="Projects">📁</span></div>
        <div className="sidebar-btn"><span title="Assets">📦</span></div>
        <div className="sidebar-btn"><span title="Layers">📑</span></div>
        <div className="sidebar-btn active"><span title="Image">🖼️</span></div>
        <div className="sidebar-btn"><span title="Video">🎬</span></div>
        <div className="sidebar-btn"><span title="Dialogues / Paroles">🗣️</span></div>
      </div>

      {/* Shot Thumbnails Row */}
      <div className="shot-thumbnails-row">
        {[1, 2, 3, 4, 5, 6].map((num, idx) => (
          <div 
            key={num} 
            className={`shot-card ${activeShot === idx ? 'active' : ''}`}
            onClick={() => setActiveShot(idx)}
          >
            <div className="shot-label">Shot {num}</div>
            <div className="shot-title">Auto</div>
            <CurvePreview path={mockPaths[idx]} />
            <div className="shot-duration-tag">2s</div>
          </div>
        ))}
      </div>

      {/* Director Panel Section */}
      <div className="director-controls-panel">
        <div className="control-group">
          <div className="control-label">👤 Director Panel</div>
          <div className="character-slots">
            <div className="char-slot" title="Add Character">+</div>
            <div className="char-slot"></div>
            <div className="char-slot"></div>
            <div className="char-slot"></div>
          </div>
        </div>

        <div className="control-group">
          <div className="control-label">Movement</div>
          <div className="movement-selector">
            <span className="shot-label">Auto</span>
            <span className="select-val">Steady Cam</span>
          </div>
        </div>

        <div className="control-group" style={{ flex: 1 }}>
          <div className="control-label">
            Adaptive Motion Path 
            <span className="ai-badge">AI ASSISTED</span>
          </div>
          <div className="curve-editor-container">
             <div className="ai-dynamic-label">Speed Mapping: Dynamic Action Sync</div>
             <svg width="100%" height="100%" viewBox="0 0 400 60">
                <path d="M10,50 Q100,10 200,50 T390,50" className="curve-path" style={{ stroke: '#fbbf24' }} />
                <circle cx="10" cy="50" r="4" fill="#fbbf24" />
                <circle cx="105" cy="15" r="4" fill="#fbbf24" />
                <circle cx="200" cy="50" r="4" fill="#fbbf24" />
                <circle cx="295" cy="15" r="4" fill="#fbbf24" />
                <circle cx="390" cy="50" r="4" fill="#fbbf24" />
             </svg>
          </div>
        </div>

        <div className="control-group">
          <div className="control-label">Speed Ramp</div>
          <div className="speed-ramp-selector">
            <span className="shot-label">Auto</span>
            <span className="select-val">Smooth</span>
          </div>
        </div>

        <div className="control-group">
          <div className="control-label">Duration</div>
          <div className="duration-selector">
            <span className="shot-label">Frames</span>
            <span className="select-val">48f</span>
          </div>
        </div>
      </div>

      {/* Prompt Bar */}
      <div className="compact-prompt-bar">
        <input 
          type="text" 
          className="compact-prompt-input" 
          placeholder="Describe your scene - use @ to add characters & props"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <div className="prompt-actions">
           <button className="sidebar-btn" style={{ width: 32, height: 32 }} title="Smart Capture (Live Snap)">
             <span>📸</span>
           </button>
           <button className="sidebar-btn" style={{ width: 32, height: 32 }} title="Add Reference">
             <span>+</span>
           </button>
        </div>
      </div>

      {/* Bottom Actions Bar */}
      <div className="compact-actions-bar">
        <div className="setting-pill interactive">
          <span>📽️</span> {settings.mode}
        </div>
        <div className="setting-pill interactive">
          <span>📺</span> {settings.ratio}
        </div>
        <div className="setting-pill interactive">
          <span>💎</span> {settings.resolution}
        </div>
        <div className="setting-pill interactive">
          <span>🔥</span> {settings.style}
        </div>
        <div className="setting-pill interactive">
          <span>🔊</span> {settings.audio}
        </div>
        <div className="setting-pill interactive">
          <span>⏳</span> {settings.sampling} +
        </div>

        <div className="frame-controls">
          <button className="frame-btn">
            <span>+</span>
            <span>Start Frame</span>
          </button>
          <button className="frame-btn">
            <span>+</span>
            <span>End Frame</span>
          </button>
        </div>

        <button className="generate-btn">
          GENERATE ✦
        </button>
      </div>
    </div>
  );
};

export default CompactDirectorPanel;
