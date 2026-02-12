import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, Settings, RotateCcw, Save } from 'lucide-react';

interface Transition {
  id: string;
  name: string;
  type: 'fade' | 'wipe' | 'push' | 'zoom' | 'custom';
  duration: number;
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
  direction?: 'left' | 'right' | 'up' | 'down' | 'in' | 'out';
  intensity?: number; // 0-1 for effect strength
  color?: string; // For color transitions
}

interface TransitionEditorProps {
  transition: Transition;
  onTransitionChange: (transition: Transition) => void;
  onClose: () => void;
  clipA?: { src: string; thumbnail?: string };
  clipB?: { src: string; thumbnail?: string };
}

export function TransitionEditor({
  transition,
  onTransitionChange,
  onClose,
  clipA,
  clipB
}: TransitionEditorProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [localTransition, setLocalTransition] = useState(transition);
  const canvasRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();

  // Update local transition when prop changes
  useEffect(() => {
    setLocalTransition(transition);
  }, [transition]);

  // Handle transition property changes
  const handlePropertyChange = useCallback((property: keyof Transition, value: unknown) => {
    const updated = { ...localTransition, [property]: value };
    setLocalTransition(updated);
    onTransitionChange(updated);
  }, [localTransition, onTransitionChange]);

  // Animation loop for preview
  const animate = useCallback(() => {
    if (!isPlaying) return;

    setCurrentTime(prev => {
      const next = prev + 0.016; // ~60fps
      if (next >= localTransition.duration) {
        setIsPlaying(false);
        return localTransition.duration;
      }
      return next;
    });

    animationRef.current = requestAnimationFrame(animate);
  }, [isPlaying, localTransition.duration]);

  // Start/stop animation
  useEffect(() => {
    if (isPlaying) {
      animationRef.current = requestAnimationFrame(animate);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, animate]);

  // Preview controls
  const handlePlayPause = useCallback(() => {
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleRestart = useCallback(() => {
    setCurrentTime(0);
    setIsPlaying(false);
  }, []);

  const handleSkipToStart = useCallback(() => {
    setCurrentTime(0);
  }, []);

  const handleSkipToEnd = useCallback(() => {
    setCurrentTime(localTransition.duration);
  }, [localTransition.duration]);

  // Calculate transition progress (0-1)
  const progress = Math.min(currentTime / localTransition.duration, 1);

  // Apply easing function
  const applyEasing = (t: number): number => {
    switch (localTransition.easing) {
      case 'ease-in':
        return t * t;
      case 'ease-out':
        return t * (2 - t);
      case 'ease-in-out':
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      default:
        return t;
    }
  };

  const easedProgress = applyEasing(progress);

  // Render transition preview based on type
  const renderTransitionPreview = () => {
    const style: React.CSSProperties = {
      position: 'relative',
      width: '100%',
      height: '200px',
      overflow: 'hidden',
      borderRadius: '8px',
      background: '#1a1a1a'
    };

    return (
      <div ref={canvasRef} style={style}>
        {/* Clip A (outgoing) */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: clipA?.thumbnail ? `url(${clipA.thumbnail})` : '#ff6b6b',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: getClipAOpacity(),
            transform: getClipATransform(),
            transition: 'none'
          }}
        >
          {!clipA?.thumbnail && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'white',
              fontSize: '48px',
              fontWeight: 'bold'
            }}>
              A
            </div>
          )}
        </div>

        {/* Clip B (incoming) */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: clipB?.thumbnail ? `url(${clipB.thumbnail})` : '#4ecdc4',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: getClipBOpacity(),
            transform: getClipBTransform(),
            transition: 'none'
          }}
        >
          {!clipB?.thumbnail && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'white',
              fontSize: '48px',
              fontWeight: 'bold'
            }}>
              B
            </div>
          )}
        </div>

        {/* Transition-specific overlays */}
        {renderTransitionOverlay()}
      </div>
    );
  };

  // Helper functions for different transition types
  const getClipAOpacity = (): number => {
    switch (localTransition.type) {
      case 'fade':
        return 1 - easedProgress;
      case 'wipe':
      case 'push':
      case 'zoom':
        return 1;
      default:
        return 1 - easedProgress;
    }
  };

  const getClipBOpacity = (): number => {
    switch (localTransition.type) {
      case 'fade':
        return easedProgress;
      case 'wipe':
      case 'push':
      case 'zoom':
        return 1;
      default:
        return easedProgress;
    }
  };

  const getClipATransform = (): string => {
    switch (localTransition.type) {
      case 'push':
        const pushDistance = 100 * easedProgress;
        switch (localTransition.direction) {
          case 'left': return `translateX(-${pushDistance}%)`;
          case 'right': return `translateX(${pushDistance}%)`;
          case 'up': return `translateY(-${pushDistance}%)`;
          case 'down': return `translateY(${pushDistance}%)`;
          default: return 'translateX(0)';
        }
      case 'zoom':
        if (localTransition.direction === 'in') {
          return `scale(${1 + easedProgress * 0.5})`;
        } else if (localTransition.direction === 'out') {
          return `scale(${1 - easedProgress * 0.5})`;
        }
        return 'scale(1)';
      default:
        return 'translateX(0) scale(1)';
    }
  };

  const getClipBTransform = (): string => {
    switch (localTransition.type) {
      case 'push':
        const pushDistance = 100 * (1 - easedProgress);
        switch (localTransition.direction) {
          case 'left': return `translateX(${pushDistance}%)`;
          case 'right': return `translateX(-${pushDistance}%)`;
          case 'up': return `translateY(${pushDistance}%)`;
          case 'down': return `translateY(-${pushDistance}%)`;
          default: return 'translateX(0)';
        }
      case 'zoom':
        if (localTransition.direction === 'in') {
          return `scale(${1 - easedProgress * 0.5})`;
        } else if (localTransition.direction === 'out') {
          return `scale(${1 + easedProgress * 0.5})`;
        }
        return 'scale(1)';
      default:
        return 'translateX(0) scale(1)';
    }
  };

  const renderTransitionOverlay = () => {
    switch (localTransition.type) {
      case 'wipe':
        const wipePosition = easedProgress * 100;
        return (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'rgba(0,0,0,0.7)',
              clipPath: getWipeClipPath()
            }}
          />
        );
      default:
        return null;
    }
  };

  const getWipeClipPath = (): string => {
    const wipePosition = easedProgress * 100;
    switch (localTransition.direction) {
      case 'left': return `inset(0 ${100 - wipePosition}% 0 0)`;
      case 'right': return `inset(0 0 0 ${wipePosition}%)`;
      case 'up': return `inset(${100 - wipePosition}% 0 0 0)`;
      case 'down': return `inset(0 0 ${wipePosition}% 0)`;
      default: return 'inset(0 0 0 0)';
    }
  };

  return (
    <div className="transition-editor-overlay">
      <div className="transition-editor-modal">
        <div className="editor-header">
          <h3>Edit Transition: {localTransition.name}</h3>
          <button onClick={onClose} className="close-btn">×</button>
        </div>

        <div className="editor-content">
          {/* Preview Section */}
          <div className="preview-section">
            <div className="preview-header">
              <h4>Preview</h4>
              <div className="preview-controls">
                <button onClick={handleSkipToStart} title="Go to Start">
                  <SkipBack size={16} />
                </button>
                <button onClick={handlePlayPause}>
                  {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                </button>
                <button onClick={handleRestart} title="Restart">
                  <RotateCcw size={16} />
                </button>
                <button onClick={handleSkipToEnd} title="Go to End">
                  <SkipForward size={16} />
                </button>
              </div>
            </div>

            {renderTransitionPreview()}

            {/* Progress Bar */}
            <div className="progress-container">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${progress * 100}%` }}
                />
                <div
                  className="progress-handle"
                  style={{ left: `${progress * 100}%` }}
                />
              </div>
              <div className="time-display">
                {currentTime.toFixed(2)}s / {localTransition.duration.toFixed(2)}s
              </div>
            </div>
          </div>

          {/* Properties Panel */}
          <div className="properties-panel">
            <h4>Properties</h4>

            <div className="property-group">
              <label>Duration (seconds)</label>
              <input
                type="range"
                min="0.1"
                max="5.0"
                step="0.1"
                value={localTransition.duration}
                onChange={(e) => handlePropertyChange('duration', parseFloat(e.target.value))}
              />
              <span>{localTransition.duration.toFixed(1)}s</span>
            </div>

            <div className="property-group">
              <label>Easing</label>
              <select
                value={localTransition.easing}
                onChange={(e) => handlePropertyChange('easing', e.target.value)}
              >
                <option value="linear">Linear</option>
                <option value="ease-in">Ease In</option>
                <option value="ease-out">Ease Out</option>
                <option value="ease-in-out">Ease In Out</option>
              </select>
            </div>

            {(localTransition.type === 'wipe' || localTransition.type === 'push') && (
              <div className="property-group">
                <label>Direction</label>
                <select
                  value={localTransition.direction || 'left'}
                  onChange={(e) => handlePropertyChange('direction', e.target.value)}
                >
                  <option value="left">Left</option>
                  <option value="right">Right</option>
                  <option value="up">Up</option>
                  <option value="down">Down</option>
                </select>
              </div>
            )}

            {localTransition.type === 'zoom' && (
              <div className="property-group">
                <label>Direction</label>
                <select
                  value={localTransition.direction || 'in'}
                  onChange={(e) => handlePropertyChange('direction', e.target.value)}
                >
                  <option value="in">Zoom In</option>
                  <option value="out">Zoom Out</option>
                </select>
              </div>
            )}

            <div className="property-group">
              <label>Intensity</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={localTransition.intensity || 1}
                onChange={(e) => handlePropertyChange('intensity', parseFloat(e.target.value))}
              />
              <span>{((localTransition.intensity || 1) * 100).toFixed(0)}%</span>
            </div>

            {localTransition.type === 'fade' && (
              <div className="property-group">
                <label>Transition Color</label>
                <input
                  type="color"
                  value={localTransition.color || '#000000'}
                  onChange={(e) => handlePropertyChange('color', e.target.value)}
                />
              </div>
            )}
          </div>
        </div>

        <div className="editor-footer">
          <button onClick={onClose} className="cancel-btn">Cancel</button>
          <button onClick={() => onTransitionChange(localTransition)} className="apply-btn">
            <Save size={16} />
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  );
}
