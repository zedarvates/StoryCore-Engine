import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Scissors, Zap, RotateCcw, ChevronRight } from 'lucide-react';
import './TransitionLibrary.css';

interface Transition {
  id: string;
  name: string;
  type: 'fade' | 'wipe' | 'push' | 'zoom' | 'custom';
  duration: number;
  preview: string;
  category: 'basic' | 'advanced' | 'stylized';
}

interface TransitionLibraryProps {
  onTransitionSelect: (transition: Transition) => void;
  selectedTransition?: Transition;
}

const TRANSITIONS: Transition[] = [
  // Basic Transitions
  { id: 'fade', name: 'Fade', type: 'fade', duration: 0.5, preview: '⬜➡️⬛', category: 'basic' },
  { id: 'crossfade', name: 'Crossfade', type: 'fade', duration: 1.0, preview: '⬜⬛➡️⬛⬜', category: 'basic' },

  // Wipe Transitions
  { id: 'wipe-left', name: 'Wipe Left', type: 'wipe', duration: 0.8, preview: '⬅️⬜', category: 'basic' },
  { id: 'wipe-right', name: 'Wipe Right', type: 'wipe', duration: 0.8, preview: '⬜➡️', category: 'basic' },
  { id: 'wipe-up', name: 'Wipe Up', type: 'wipe', duration: 0.8, preview: '⬆️⬜', category: 'basic' },
  { id: 'wipe-down', name: 'Wipe Down', type: 'wipe', duration: 0.8, preview: '⬜⬇️', category: 'basic' },

  // Push Transitions
  { id: 'push-left', name: 'Push Left', type: 'push', duration: 0.6, preview: '⬅️⬜⬜', category: 'advanced' },
  { id: 'push-right', name: 'Push Right', type: 'push', duration: 0.6, preview: '⬜⬜➡️', category: 'advanced' },

  // Zoom Transitions
  { id: 'zoom-in', name: 'Zoom In', type: 'zoom', duration: 0.7, preview: '🔍⬜', category: 'advanced' },
  { id: 'zoom-out', name: 'Zoom Out', type: 'zoom', duration: 0.7, preview: '⬜🔍', category: 'advanced' },

  // Stylized Transitions
  { id: 'spin', name: 'Spin', type: 'custom', duration: 1.2, preview: '🔄', category: 'stylized' },
  { id: 'bounce', name: 'Bounce', type: 'custom', duration: 0.8, preview: '🏀', category: 'stylized' },
  { id: 'ripple', name: 'Ripple', type: 'custom', duration: 1.0, preview: '💫', category: 'stylized' },
  { id: 'pixelate', name: 'Pixelate', type: 'custom', duration: 0.5, preview: '▫️', category: 'stylized' },
];

export function TransitionLibrary({ onTransitionSelect, selectedTransition }: TransitionLibraryProps) {
  const [activeCategory, setActiveCategory] = useState<'basic' | 'advanced' | 'stylized'>('basic');
  const [previewTransition, setPreviewTransition] = useState<Transition | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const filteredTransitions = TRANSITIONS.filter(t => t.category === activeCategory);

  const handleTransitionClick = (transition: Transition) => {
    setPreviewTransition(transition);
    onTransitionSelect(transition);
  };

  const handlePreviewPlay = () => {
    if (previewRef.current && previewTransition) {
      // Simulate transition preview animation
      const element = previewRef.current;
      element.style.animation = 'none';
      setTimeout(() => {
        element.style.animation = `transition-${previewTransition.type} ${previewTransition.duration}s ease-in-out`;
      }, 10);
    }
  };

  return (
    <div className="transition-library">
      <div className="transition-header">
        <h3>Transitions</h3>
        <div className="category-tabs">
          <button
            className={`tab ${activeCategory === 'basic' ? 'active' : ''}`}
            onClick={() => setActiveCategory('basic')}
          >
            Basic
          </button>
          <button
            className={`tab ${activeCategory === 'advanced' ? 'active' : ''}`}
            onClick={() => setActiveCategory('advanced')}
          >
            Advanced
          </button>
          <button
            className={`tab ${activeCategory === 'stylized' ? 'active' : ''}`}
            onClick={() => setActiveCategory('stylized')}
          >
            Stylized
          </button>
        </div>

        {/* Help message */}
        <div className="transition-help">
          {selectedTransition ? (
            <span className="help-selected">
              ✅ {selectedTransition.name} sélectionnée - Cliquez entre deux shots pour l'appliquer
            </span>
          ) : (
            <span className="help-default">
              Sélectionnez une transition puis cliquez entre deux shots pour l'appliquer
            </span>
          )}
        </div>
      </div>

      <div className="transition-grid">
        {filteredTransitions.map(transition => (
          <div
            key={transition.id}
            className={`transition-item ${selectedTransition?.id === transition.id ? 'selected' : ''}`}
            onClick={() => handleTransitionClick(transition)}
          >
            <div className="transition-preview">
              <div className="preview-icon">{transition.preview}</div>
              <div className="preview-overlay">
                <Play size={16} />
              </div>
            </div>
            <div className="transition-info">
              <span className="transition-name">{transition.name}</span>
              <span className="transition-duration">{transition.duration}s</span>
            </div>
          </div>
        ))}
      </div>

      {previewTransition && (
        <div className="transition-preview-panel">
          <div className="preview-header">
            <h4>Preview: {previewTransition.name}</h4>
            <button onClick={handlePreviewPlay} className="preview-play-btn">
              <Play size={16} />
              Preview
            </button>
          </div>

          <div className="preview-container">
            <div
              ref={previewRef}
              className="preview-canvas"
              style={{
                width: '320px',
                height: '180px',
                background: 'linear-gradient(45deg, #ff6b6b, #4ecdc4)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div
                className="preview-clip clip-a"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  background: '#ff6b6b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '24px',
                  fontWeight: 'bold'
                }}
              >
                A
              </div>
              <div
                className="preview-clip clip-b"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  background: '#4ecdc4',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '24px',
                  fontWeight: 'bold'
                }}
              >
                B
              </div>
            </div>
          </div>

          <div className="preview-controls">
            <div className="control-group">
              <label>Duration:</label>
              <input
                type="range"
                min="0.1"
                max="3.0"
                step="0.1"
                value={previewTransition.duration}
                onChange={(e) => {
                  const newDuration = parseFloat(e.target.value);
                  setPreviewTransition({
                    ...previewTransition,
                    duration: newDuration
                  });
                }}
              />
              <span>{previewTransition.duration}s</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}