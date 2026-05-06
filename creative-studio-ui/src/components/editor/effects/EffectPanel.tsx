import React, { useState, useCallback } from 'react';
import { Settings, Eye, EyeOff, Trash2, Plus, _Sliders, Palette, Move, Zap, Sun } from 'lucide-react';
import './EffectPanel.css';

import { _Effect, AppliedEffect, EffectParameter } from '@/types/effect';

interface EffectPanelProps {
  effects: AppliedEffect[];
  onEffectAdd: (effect: Omit<AppliedEffect, 'id'>) => void;
  onEffectUpdate: (effectId: string, updates: Partial<AppliedEffect>) => void;
  onEffectRemove: (effectId: string) => void;
  onEffectReorder: (effectId: string, newIndex: number) => void;
}

export function EffectPanel({
  effects,
  onEffectAdd,
  onEffectUpdate,
  onEffectRemove,
  _onEffectReorder
}: EffectPanelProps) {
  const [selectedEffectId, setSelectedEffectId] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['color']));

  // Group effects by category
  const effectsByCategory = effects.reduce((acc, effect) => {
    const category = effect.category || 'other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(effect);
    return acc;
  }, {} as Record<string, AppliedEffect[]>);

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

  const handleParameterChange = useCallback((effectId: string, paramId: string, value: unknown) => {
    const effect = effects.find(e => e.id === effectId);
    if (!effect) return;

    const updatedParameters = effect.parameters.map(p =>
      p.id === paramId ? { ...p, value } : p
    );

    onEffectUpdate(effectId, {
      parameters: updatedParameters
    });
  }, [effects, onEffectUpdate]);

  const getEffectIcon = (category: string) => {
    switch (category) {
      case 'color': return <Palette size={16} />;
      case 'transform': return <Move size={16} />;
      case 'temporal': return <Zap size={16} />;
      default: return <Settings size={16} />;
    }
  };

  const renderParameterControl = (effectId: string, param: EffectParameter) => {
    if (param.type === 'range' || param.type === 'number') {
      return (
        <div key={param.id} className="control-group">
          <label>{param.name}</label>
          <input
            type="range"
            min={param.min ?? 0}
            max={param.max ?? 100}
            step={param.step ?? 1}
            value={param.value || 0}
            onChange={(e) => handleParameterChange(effectId, param.id, parseFloat(e.target.value))}
          />
          <span>{param.value || 0}{param.unit || ''}</span>
        </div>
      );
    }

    if (param.type === 'boolean') {
      return (
        <div key={param.id} className="control-group">
          <label>{param.name}</label>
          <input
            type="checkbox"
            checked={!!param.value}
            onChange={(e) => handleParameterChange(effectId, param.id, e.target.checked)}
          />
        </div>
      );
    }

    return null;
  };

  return (
    <div className="effect-panel">
      <div className="panel-header">
        <h3>Effets Appliqués</h3>
        <button
          className="add-effect-btn"
          onClick={() => {
            onEffectAdd({
              name: 'Nouveau Filtre',
              type: 'filter',
              enabled: true,
              parameters: [
                { id: 'intensity', name: 'Intensité', type: 'range', value: 50, min: 0, max: 100 }
              ],
              category: 'color',
              order: effects.length,
              icon: <Zap size={16} />,
              description: 'Nouveau filtre d\'effet'
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
              <span className="category-name">{category.charAt(0).toUpperCase() + category.slice(1)}</span>
              <span className="category-count">({categoryEffects.length})</span>
            </div>

            {expandedCategories.has(category) && (
              <div className="category-effects">
                {categoryEffects.map((effect) => (
                  <div
                    key={effect.id}
                    className={`effect-item ${selectedEffectId === effect.id ? 'selected' : ''}`}
                    onClick={() => setSelectedEffectId(effect.id)}
                  >
                    <div className="effect-header">
                      <div className="effect-info">
                        {getEffectIcon(effect.category)}
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
                        {effect.parameters.map(param => renderParameterControl(effect.id, param))}
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
            <p>Aucun effet appliqué</p>
            <button
              className="add-first-effect-btn"
              onClick={() => {
                onEffectAdd({
                  name: 'Luminosité/Contraste',
                  type: 'color-correction',
                  enabled: true,
                  parameters: [
                    { id: 'brightness', name: 'Luminosité', type: 'range', value: 0, min: -100, max: 100 },
                    { id: 'contrast', name: 'Contraste', type: 'range', value: 0, min: -100, max: 100 }
                  ],
                  category: 'color',
                  order: 0,
                  icon: <Sun size={16} />,
                  description: 'Ajuste la luminosité et le contraste'
                });
              }}
            >
              <Plus size={16} />
              Ajouter un effet
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
