import React, { useState, useCallback } from 'react';
import { Settings, Eye, EyeOff, Trash2, Plus, Sliders, Palette, Move, RotateCw, Zap } from 'lucide-react';
import './EffectPanel.css';

interface Effect {
  id: string;
  name: string;
  type: 'color' | 'transform' | 'temporal' | 'filter';
  enabled: boolean;
  parameters: Record<string, number | string | boolean>;
  category: string;
}

interface EffectPanelProps {
  effects: Effect[];
  onEffectAdd: (effect: Omit<Effect, 'id'>) => void;
  onEffectUpdate: (effectId: string, updates: Partial<Effect>) => void;
  onEffectRemove: (effectId: string) => void;
  onEffectReorder: (effectId: string, newIndex: number) => void;
}

export function EffectPanel({
  effects,
  onEffectAdd,
  onEffectUpdate,
  onEffectRemove,
  onEffectReorder
}: EffectPanelProps) {
  const [selectedEffectId, setSelectedEffectId] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['color']));

  // Group effects by category
  const effectsByCategory = effects.reduce((acc, effect) => {
    if (!acc[effect.category]) {
      acc[effect.category] = [];
    }
    acc[effect.category].push(effect);
    return acc;
  }, {} as Record<string, Effect[]>);

  const toggleCategory = useCallback((category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  }, []);

  const handleParameterChange = useCallback((effectId: string, param: string, value: any) => {
    const effect = effects.find(e => e.id === effectId);
    if (!effect) return;

    onEffectUpdate(effectId, {
      parameters: {
        ...effect.parameters,
        [param]: value
      }
    });
  }, [effects, onEffectUpdate]);

  const getEffectIcon = (type: Effect['type']) => {
    switch (type) {
      case 'color': return <Palette size={16} />;
      case 'transform': return <Move size={16} />;
      case 'temporal': return <Zap size={16} />;
      case 'filter': return <Sliders size={16} />;
      default: return <Settings size={16} />;
    }
  };

  const renderEffectControls = (effect: Effect) => {
    switch (effect.type) {
      case 'color':
        return (
          <div className="effect-controls color-controls">
            <div className="control-group">
              <label>Brightness</label>
              <input
                type="range"
                min="-100"
                max="100"
                value={effect.parameters.brightness || 0}
                onChange={(e) => handleParameterChange(effect.id, 'brightness', parseInt(e.target.value))}
              />
              <span>{effect.parameters.brightness || 0}</span>
            </div>
            <div className="control-group">
              <label>Contrast</label>
              <input
                type="range"
                min="-100"
                max="100"
                value={effect.parameters.contrast || 0}
                onChange={(e) => handleParameterChange(effect.id, 'contrast', parseInt(e.target.value))}
              />
              <span>{effect.parameters.contrast || 0}</span>
            </div>
            <div className="control-group">
              <label>Saturation</label>
              <input
                type="range"
                min="-100"
                max="100"
                value={effect.parameters.saturation || 0}
                onChange={(e) => handleParameterChange(effect.id, 'saturation', parseInt(e.target.value))}
              />
              <span>{effect.parameters.saturation || 0}</span>
            </div>
            <div className="control-group">
              <label>Hue</label>
              <input
                type="range"
                min="0"
                max="360"
                value={effect.parameters.hue || 0}
                onChange={(e) => handleParameterChange(effect.id, 'hue', parseInt(e.target.value))}
              />
              <span>{effect.parameters.hue || 0}°</span>
            </div>
          </div>
        );

      case 'transform':
        return (
          <div className="effect-controls transform-controls">
            <div className="control-group">
              <label>Position X</label>
              <input
                type="range"
                min="-500"
                max="500"
                value={effect.parameters.positionX || 0}
                onChange={(e) => handleParameterChange(effect.id, 'positionX', parseInt(e.target.value))}
              />
              <span>{effect.parameters.positionX || 0}px</span>
            </div>
            <div className="control-group">
              <label>Position Y</label>
              <input
                type="range"
                min="-500"
                max="500"
                value={effect.parameters.positionY || 0}
                onChange={(e) => handleParameterChange(effect.id, 'positionY', parseInt(e.target.value))}
              />
              <span>{effect.parameters.positionY || 0}px</span>
            </div>
            <div className="control-group">
              <label>Scale</label>
              <input
                type="range"
                min="0.1"
                max="3.0"
                step="0.1"
                value={effect.parameters.scale || 1}
                onChange={(e) => handleParameterChange(effect.id, 'scale', parseFloat(e.target.value))}
              />
              <span>{effect.parameters.scale || 1}x</span>
            </div>
            <div className="control-group">
              <label>Rotation</label>
              <input
                type="range"
                min="-180"
                max="180"
                value={effect.parameters.rotation || 0}
                onChange={(e) => handleParameterChange(effect.id, 'rotation', parseInt(e.target.value))}
              />
              <span>{effect.parameters.rotation || 0}°</span>
            </div>
          </div>
        );

      case 'temporal':
        return (
          <div className="effect-controls temporal-controls">
            <div className="control-group">
              <label>Speed</label>
              <input
                type="range"
                min="0.1"
                max="4.0"
                step="0.1"
                value={effect.parameters.speed || 1}
                onChange={(e) => handleParameterChange(effect.id, 'speed', parseFloat(e.target.value))}
              />
              <span>{effect.parameters.speed || 1}x</span>
            </div>
            <div className="control-group">
              <label>Reverse</label>
              <input
                type="checkbox"
                checked={effect.parameters.reverse || false}
                onChange={(e) => handleParameterChange(effect.id, 'reverse', e.target.checked)}
              />
            </div>
          </div>
        );

      case 'filter':
        return (
          <div className="effect-controls filter-controls">
            <div className="control-group">
              <label>Intensity</label>
              <input
                type="range"
                min="0"
                max="100"
                value={effect.parameters.intensity || 50}
                onChange={(e) => handleParameterChange(effect.id, 'intensity', parseInt(e.target.value))}
              />
              <span>{effect.parameters.intensity || 50}%</span>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="effect-panel">
      <div className="panel-header">
        <h3>Effects</h3>
        <button
          className="add-effect-btn"
          onClick={() => {
            // This would typically open a menu to select effect type
            onEffectAdd({
              name: 'New Effect',
              type: 'color',
              enabled: true,
              parameters: {},
              category: 'adjustment'
            });
          }}
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="effects-list">
        {Object.entries(effectsByCategory).map(([category, categoryEffects]) => (
          <div key={category} className="effect-category">
            <div
              className="category-header"
              onClick={() => toggleCategory(category)}
            >
              <span className="category-name">{category}</span>
              <span className="category-count">({categoryEffects.length})</span>
            </div>

            {expandedCategories.has(category) && (
              <div className="category-effects">
                {categoryEffects.map((effect, index) => (
                  <div
                    key={effect.id}
                    className={`effect-item ${selectedEffectId === effect.id ? 'selected' : ''}`}
                    onClick={() => setSelectedEffectId(effect.id)}
                  >
                    <div className="effect-header">
                      <div className="effect-info">
                        {getEffectIcon(effect.type)}
                        <span className="effect-name">{effect.name}</span>
                      </div>

                      <div className="effect-actions">
                        <button
                          className={`visibility-btn ${effect.enabled ? 'visible' : 'hidden'}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEffectUpdate(effect.id, { enabled: !effect.enabled });
                          }}
                        >
                          {effect.enabled ? <Eye size={14} /> : <EyeOff size={14} />}
                        </button>

                        <button
                          className="delete-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEffectRemove(effect.id);
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {selectedEffectId === effect.id && (
                      <div className="effect-details">
                        {renderEffectControls(effect)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {effects.length === 0 && (
          <div className="no-effects">
            <p>No effects applied</p>
            <button
              className="add-first-effect-btn"
              onClick={() => {
                onEffectAdd({
                  name: 'Brightness/Contrast',
                  type: 'color',
                  enabled: true,
                  parameters: { brightness: 0, contrast: 0 },
                  category: 'adjustment'
                });
              }}
            >
              <Plus size={16} />
              Add Effect
            </button>
          </div>
        )}
      </div>
    </div>
  );
}