import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Play, Pause, RotateCcw, ZoomIn, ZoomOut, Plus, Trash2, Move, Square, Circle, Triangle } from 'lucide-react';

interface Keyframe {
  id: string;
  time: number; // seconds
  value: number;
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'bezier';
  bezierPoints?: { x1: number; y1: number; x2: number; y2: number }; // For custom Bézier curves
}

interface AnimatableProperty {
  id: string;
  name: string;
  unit: string;
  min: number;
  max: number;
  defaultValue: number;
  color: string;
  keyframes: Keyframe[];
  enabled: boolean;
}

interface KeyframeEditorProps {
  properties: AnimatableProperty[];
  duration: number;
  currentTime: number;
  onPropertyUpdate: (propertyId: string, updates: Partial<AnimatableProperty>) => void;
  onKeyframeAdd: (propertyId: string, keyframe: Omit<Keyframe, 'id'>) => void;
  onKeyframeUpdate: (propertyId: string, keyframeId: string, updates: Partial<Keyframe>) => void;
  onKeyframeRemove: (propertyId: string, keyframeId: string) => void;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
}

export function KeyframeEditor({
  properties,
  duration,
  currentTime,
  onPropertyUpdate,
  onKeyframeAdd,
  onKeyframeUpdate,
  onKeyframeRemove,
  onPlayPause,
  onSeek
}: KeyframeEditorProps) {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [showBezierEditor, setShowBezierEditor] = useState(false);
  const [selectedKeyframe, setSelectedKeyframe] = useState<{ propertyId: string; keyframeId: string } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();

  // Default properties for video editing
  const defaultProperties: Omit<AnimatableProperty, 'keyframes'>[] = [
    {
      id: 'position-x',
      name: 'Position X',
      unit: 'px',
      min: -1920,
      max: 1920,
      defaultValue: 0,
      color: '#ef4444',
      enabled: false
    },
    {
      id: 'position-y',
      name: 'Position Y',
      unit: 'px',
      min: -1080,
      max: 1080,
      defaultValue: 0,
      color: '#f97316',
      enabled: false
    },
    {
      id: 'scale',
      name: 'Scale',
      unit: 'x',
      min: 0.1,
      max: 3.0,
      defaultValue: 1.0,
      color: '#eab308',
      enabled: false
    },
    {
      id: 'rotation',
      name: 'Rotation',
      unit: '°',
      min: -180,
      max: 180,
      defaultValue: 0,
      color: '#22c55e',
      enabled: false
    },
    {
      id: 'opacity',
      name: 'Opacity',
      unit: '%',
      min: 0,
      max: 100,
      defaultValue: 100,
      color: '#3b82f6',
      enabled: false
    },
    {
      id: 'blur',
      name: 'Blur',
      unit: 'px',
      min: 0,
      max: 50,
      defaultValue: 0,
      color: '#8b5cf6',
      enabled: false
    }
  ];

  // Ensure all default properties exist
  const allProperties = useMemo(() => {
    const existingIds = new Set(properties.map(p => p.id));
    const missingProperties = defaultProperties
      .filter(p => !existingIds.has(p.id))
      .map(p => ({ ...p, keyframes: [] }));

    return [...properties, ...missingProperties];
  }, [properties]);

  // Animation loop for preview
  const animate = useCallback(() => {
    if (!isPlaying) return;

    // This would be handled by the parent component
    // For now, just continue the loop
    animationRef.current = requestAnimationFrame(animate);
  }, [isPlaying]);

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

  // Handle canvas drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Draw grid
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 1;

    // Vertical grid lines (time)
    const timeStep = Math.max(1, Math.floor(duration / 10));
    for (let t = 0; t <= duration; t += timeStep) {
      const x = (t / duration) * rect.width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, rect.height);
      ctx.stroke();
    }

    // Horizontal grid lines (value)
    for (let i = 0; i <= 10; i++) {
      const y = (i / 10) * rect.height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(rect.width, y);
      ctx.stroke();
    }

    // Draw curves for each enabled property
    allProperties.filter(p => p.enabled).forEach(property => {
      if (property.keyframes.length < 2) return;

      ctx.strokeStyle = property.color;
      ctx.lineWidth = 2;
      ctx.beginPath();

      // Sort keyframes by time
      const sortedKeyframes = [...property.keyframes].sort((a, b) => a.time - b.time);

      for (let i = 0; i < sortedKeyframes.length - 1; i++) {
        const kf1 = sortedKeyframes[i];
        const kf2 = sortedKeyframes[i + 1];

        const x1 = (kf1.time / duration) * rect.width;
        const y1 = rect.height - ((kf1.value - property.min) / (property.max - property.min)) * rect.height;

        const x2 = (kf2.time / duration) * rect.width;
        const y2 = rect.height - ((kf2.value - property.min) / (property.max - property.min)) * rect.height;

        if (i === 0) {
          ctx.moveTo(x1, y1);
        }

        // Draw curve based on easing
        if (kf1.easing === 'bezier' && kf1.bezierPoints) {
          // Cubic Bézier curve
          const cp1x = x1 + (x2 - x1) * kf1.bezierPoints.x1;
          const cp1y = y1 - (y1 - y2) * kf1.bezierPoints.y1;
          const cp2x = x1 + (x2 - x1) * kf1.bezierPoints.x2;
          const cp2y = y1 - (y1 - y2) * kf1.bezierPoints.y2;

          ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x2, y2);
        } else {
          // Linear or simple easing
          ctx.lineTo(x2, y2);
        }
      }

      ctx.stroke();

      // Draw keyframe points
      sortedKeyframes.forEach(keyframe => {
        const x = (keyframe.time / duration) * rect.width;
        const y = rect.height - ((keyframe.value - property.min) / (property.max - property.min)) * rect.height;

        ctx.fillStyle = property.color;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fill();

        // Highlight selected keyframe
        if (selectedKeyframe?.propertyId === property.id && selectedKeyframe?.keyframeId === keyframe.id) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });
    });

    // Draw current time indicator
    const currentX = (currentTime / duration) * rect.width;
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(currentX, 0);
    ctx.lineTo(currentX, rect.height);
    ctx.stroke();

  }, [allProperties, duration, currentTime, selectedKeyframe]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !selectedPropertyId) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const clickTime = (x / rect.width) * duration;
    const property = allProperties.find(p => p.id === selectedPropertyId);
    if (!property) return;

    const valueRange = property.max - property.min;
    const clickValue = property.max - (y / rect.height) * valueRange;

    // Check if clicking on existing keyframe
    const clickedKeyframe = property.keyframes.find(kf => {
      const kfX = (kf.time / duration) * rect.width;
      const kfY = rect.height - ((kf.value - property.min) / (property.max - property.min)) * rect.height;
      const distance = Math.sqrt(Math.pow(x - kfX, 2) + Math.pow(y - kfY, 2));
      return distance < 10;
    });

    if (clickedKeyframe) {
      setSelectedKeyframe({ propertyId: property.id, keyframeId: clickedKeyframe.id });
    } else {
      // Add new keyframe
      const newKeyframe: Omit<Keyframe, 'id'> = {
        time: Math.max(0, Math.min(duration, clickTime)),
        value: Math.max(property.min, Math.min(property.max, clickValue)),
        easing: 'linear'
      };
      onKeyframeAdd(property.id, newKeyframe);
    }
  }, [allProperties, selectedPropertyId, duration, onKeyframeAdd]);

  const handlePropertyToggle = useCallback((propertyId: string) => {
    const property = allProperties.find(p => p.id === propertyId);
    if (!property) return;

    onPropertyUpdate(propertyId, { enabled: !property.enabled });
  }, [allProperties, onPropertyUpdate]);

  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(5, prev + 0.5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(0.1, prev - 0.5));
  }, []);

  const formatValue = (value: number, unit: string) => {
    if (unit === 'x') return value.toFixed(2);
    if (unit === '%' || unit === '°') return Math.round(value);
    return Math.round(value);
  };

  return (
    <div className="keyframe-editor">
      <div className="editor-header">
        <h3>Keyframe Animation</h3>
        <div className="header-controls">
          <button
            className={`play-btn ${isPlaying ? 'playing' : ''}`}
            onClick={() => {
              setIsPlaying(!isPlaying);
              onPlayPause();
            }}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>

          <div className="zoom-controls">
            <button onClick={handleZoomOut}><ZoomOut size={14} /></button>
            <span>{Math.round(zoom * 100)}%</span>
            <button onClick={handleZoomIn}><ZoomIn size={14} /></button>
          </div>
        </div>
      </div>

      <div className="editor-content">
        {/* Properties Panel */}
        <div className="properties-panel">
          <h4>Properties</h4>
          <div className="properties-list">
            {allProperties.map(property => (
              <div
                key={property.id}
                className={`property-item ${property.enabled ? 'enabled' : ''} ${selectedPropertyId === property.id ? 'selected' : ''}`}
                onClick={() => setSelectedPropertyId(property.id)}
              >
                <div className="property-header">
                  <div
                    className="property-color"
                    style={{ backgroundColor: property.color }}
                  />
                  <span className="property-name">{property.name}</span>
                  <button
                    className="property-toggle"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePropertyToggle(property.id);
                    }}
                  >
                    {property.enabled ? <Square size={12} /> : <Circle size={12} />}
                  </button>
                </div>

                {property.enabled && (
                  <div className="property-controls">
                    <button
                      className="add-keyframe-btn"
                      onClick={() => {
                        const newKeyframe: Omit<Keyframe, 'id'> = {
                          time: currentTime,
                          value: property.defaultValue,
                          easing: 'linear'
                        };
                        onKeyframeAdd(property.id, newKeyframe);
                      }}
                    >
                      <Plus size={12} />
                      Add Keyframe
                    </button>

                    <div className="keyframes-list">
                      {property.keyframes
                        .sort((a, b) => a.time - b.time)
                        .map(keyframe => (
                        <div
                          key={keyframe.id}
                          className={`keyframe-item ${selectedKeyframe?.keyframeId === keyframe.id ? 'selected' : ''}`}
                          onClick={() => setSelectedKeyframe({ propertyId: property.id, keyframeId: keyframe.id })}
                        >
                          <span className="keyframe-time">{keyframe.time.toFixed(1)}s</span>
                          <span className="keyframe-value">
                            {formatValue(keyframe.value, property.unit)}{property.unit}
                          </span>
                          <button
                            className="delete-keyframe-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              onKeyframeRemove(property.id, keyframe.id);
                            }}
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Animation Canvas */}
        <div className="animation-canvas">
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            style={{
              width: '100%',
              height: '300px',
              border: '1px solid #2a2a2a',
              borderRadius: '4px',
              cursor: selectedPropertyId ? 'crosshair' : 'default'
            }}
          />

          {/* Timeline Ruler */}
          <div ref={timelineRef} className="timeline-ruler">
            {Array.from({ length: Math.ceil(duration) + 1 }, (_, i) => (
              <div key={i} className="time-marker">
                <div className="time-line" />
                <span className="time-label">{i}s</span>
              </div>
            ))}
          </div>
        </div>

        {/* Keyframe Editor Panel */}
        {selectedKeyframe && (
          <div className="keyframe-editor-panel">
            <h4>Keyframe Properties</h4>
            {(() => {
              const property = allProperties.find(p => p.id === selectedKeyframe.propertyId);
              const keyframe = property?.keyframes.find(k => k.id === selectedKeyframe.keyframeId);
              if (!property || !keyframe) return null;

              return (
                <div className="keyframe-properties">
                  <div className="property-row">
                    <label>Time:</label>
                    <input
                      type="number"
                      min="0"
                      max={duration}
                      step="0.1"
                      value={keyframe.time}
                      onChange={(e) => onKeyframeUpdate(
                        selectedKeyframe.propertyId,
                        selectedKeyframe.keyframeId,
                        { time: parseFloat(e.target.value) }
                      )}
                    />
                    <span>seconds</span>
                  </div>

                  <div className="property-row">
                    <label>Value:</label>
                    <input
                      type="number"
                      min={property.min}
                      max={property.max}
                      step={property.unit === 'x' ? '0.01' : '1'}
                      value={keyframe.value}
                      onChange={(e) => onKeyframeUpdate(
                        selectedKeyframe.propertyId,
                        selectedKeyframe.keyframeId,
                        { value: parseFloat(e.target.value) }
                      )}
                    />
                    <span>{property.unit}</span>
                  </div>

                  <div className="property-row">
                    <label>Easing:</label>
                    <select
                      value={keyframe.easing}
                      onChange={(e) => onKeyframeUpdate(
                        selectedKeyframe.propertyId,
                        selectedKeyframe.keyframeId,
                        { easing: e.target.value as any }
                      )}
                    >
                      <option value="linear">Linear</option>
                      <option value="ease-in">Ease In</option>
                      <option value="ease-out">Ease Out</option>
                      <option value="ease-in-out">Ease In Out</option>
                      <option value="bezier">Custom Bézier</option>
                    </select>
                  </div>

                  {keyframe.easing === 'bezier' && (
                    <div className="bezier-controls">
                      <h5>Bézier Curve Points</h5>
                      <div className="bezier-inputs">
                        <div>
                          <label>P1 (x, y):</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="1"
                            value={keyframe.bezierPoints?.x1 || 0.5}
                            onChange={(e) => onKeyframeUpdate(
                              selectedKeyframe.propertyId,
                              selectedKeyframe.keyframeId,
                              {
                                bezierPoints: {
                                  ...keyframe.bezierPoints,
                                  x1: parseFloat(e.target.value)
                                } as any
                              }
                            )}
                          />
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="1"
                            value={keyframe.bezierPoints?.y1 || 0.5}
                            onChange={(e) => onKeyframeUpdate(
                              selectedKeyframe.propertyId,
                              selectedKeyframe.keyframeId,
                              {
                                bezierPoints: {
                                  ...keyframe.bezierPoints,
                                  y1: parseFloat(e.target.value)
                                } as any
                              }
                            )}
                          />
                        </div>
                        <div>
                          <label>P2 (x, y):</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="1"
                            value={keyframe.bezierPoints?.x2 || 0.5}
                            onChange={(e) => onKeyframeUpdate(
                              selectedKeyframe.propertyId,
                              selectedKeyframe.keyframeId,
                              {
                                bezierPoints: {
                                  ...keyframe.bezierPoints,
                                  x2: parseFloat(e.target.value)
                                } as any
                              }
                            )}
                          />
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="1"
                            value={keyframe.bezierPoints?.y2 || 0.5}
                            onChange={(e) => onKeyframeUpdate(
                              selectedKeyframe.propertyId,
                              selectedKeyframe.keyframeId,
                              {
                                bezierPoints: {
                                  ...keyframe.bezierPoints,
                                  y2: parseFloat(e.target.value)
                                } as any
                              }
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}