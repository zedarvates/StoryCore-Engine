import React, { useState } from 'react';
import {
  Layers,
  Eye,
  EyeOff,
  Settings,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Copy,
  MoveUp,
  MoveDown,
} from 'lucide-react';
import { Effect, EffectParameter } from './EffectsLibrary';
import './EffectStack.css';

interface AppliedEffect extends Effect {
  enabled: boolean;
  order: number;
}

interface EffectStackProps {
  effects: AppliedEffect[];
  onEffectsChange: (effects: AppliedEffect[]) => void;
  onEffectSelect: (effect: AppliedEffect) => void;
  selectedEffectId?: string;
  className?: string;
}

export const EffectStack: React.FC<EffectStackProps> = ({
  effects,
  onEffectsChange,
  onEffectSelect,
  selectedEffectId,
  className = '',
}) => {
  const [expandedEffects, setExpandedEffects] = useState<Set<string>>(new Set());

  const toggleEffectExpansion = (effectId: string) => {
    const newExpanded = new Set(expandedEffects);
    if (newExpanded.has(effectId)) {
      newExpanded.delete(effectId);
    } else {
      newExpanded.add(effectId);
    }
    setExpandedEffects(newExpanded);
  };

  const toggleEffectEnabled = (effectId: string) => {
    const updatedEffects = effects.map(effect =>
      effect.id === effectId
        ? { ...effect, enabled: !effect.enabled }
        : effect
    );
    onEffectsChange(updatedEffects);
  };

  const removeEffect = (effectId: string) => {
    const updatedEffects = effects.filter(effect => effect.id !== effectId);
    onEffectsChange(updatedEffects);
  };

  const moveEffect = (effectId: string, direction: 'up' | 'down') => {
    const currentIndex = effects.findIndex(effect => effect.id === effectId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= effects.length) return;

    const updatedEffects = [...effects];
    const [movedEffect] = updatedEffects.splice(currentIndex, 1);
    updatedEffects.splice(newIndex, 0, movedEffect);

    // Update order values
    const reorderedEffects = updatedEffects.map((effect, index) => ({
      ...effect,
      order: index
    }));

    onEffectsChange(reorderedEffects);
  };

  const duplicateEffect = (effectId: string) => {
    const effectToDuplicate = effects.find(effect => effect.id === effectId);
    if (!effectToDuplicate) return;

    const duplicatedEffect: AppliedEffect = {
      ...effectToDuplicate,
      id: `${effectToDuplicate.id}_${Date.now()}`,
      name: `${effectToDuplicate.name} (Copie)`,
      order: effects.length,
    };

    onEffectsChange([...effects, duplicatedEffect]);
  };

  const updateEffectParameter = (effectId: string, paramId: string, value: any) => {
    const updatedEffects = effects.map(effect =>
      effect.id === effectId
        ? {
            ...effect,
            parameters: effect.parameters.map(param =>
              param.id === paramId ? { ...param, value } : param
            )
          }
        : effect
    );
    onEffectsChange(updatedEffects);
  };

  const renderParameterControl = (effect: AppliedEffect, param: EffectParameter) => {
    const handleChange = (value: any) => {
      updateEffectParameter(effect.id, param.id, value);
    };

    switch (param.type) {
      case 'range':
        return (
          <div key={param.id} className="parameter-control">
            <label className="parameter-label">
              {param.name}
              <span className="parameter-value">
                {param.value}{param.unit || ''}
              </span>
            </label>
            <input
              type="range"
              min={param.min}
              max={param.max}
              step={param.step}
              value={param.value}
              onChange={(e) => handleChange(parseFloat(e.target.value))}
              className="parameter-slider"
              aria-label={param.name}
            />
          </div>
        );

      case 'color':
        return (
          <div key={param.id} className="parameter-control">
            <label className="parameter-label">{param.name}</label>
            <input
              type="color"
              value={param.value}
              onChange={(e) => handleChange(e.target.value)}
              className="parameter-color"
              aria-label={`${param.name} color`}
            />
          </div>
        );

      case 'select':
        return (
          <div key={param.id} className="parameter-control">
            <label className="parameter-label">{param.name}</label>
            <select
              value={param.value}
              onChange={(e) => handleChange(e.target.value)}
              className="parameter-select"
              aria-label={param.name}
            >
              {param.options?.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        );

      case 'boolean':
        return (
          <div key={param.id} className="parameter-control">
            <label className="parameter-toggle">
              <input
                type="checkbox"
                checked={param.value}
                onChange={(e) => handleChange(e.target.checked)}
                className="parameter-checkbox"
              />
              <span className="parameter-name">{param.name}</span>
            </label>
          </div>
        );

      case 'number':
        return (
          <div key={param.id} className="parameter-control">
            <label className="parameter-label">{param.name}</label>
            <input
              type="number"
              min={param.min}
              max={param.max}
              step={param.step}
              value={param.value}
              onChange={(e) => handleChange(parseFloat(e.target.value))}
              className="parameter-number"
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`effect-stack ${className}`}>
      <div className="stack-header">
        <h3 className="stack-title">
          <Layers size={16} />
          Pile d'Effets
          <span className="effect-count">({effects.length})</span>
        </h3>
      </div>

      <div className="stack-content">
        {effects.length === 0 ? (
          <div className="empty-stack">
            <Layers size={24} />
            <p>Aucun effet appliqué</p>
            <small>Sélectionnez un effet dans la bibliothèque</small>
          </div>
        ) : (
          <div className="effects-list">
            {effects.map((effect, index) => (
              <div
                key={effect.id}
                className={`effect-item ${selectedEffectId === effect.id ? 'selected' : ''} ${!effect.enabled ? 'disabled' : ''}`}
                onClick={() => onEffectSelect(effect)}
              >
                <div className="effect-header">
                  <div className="effect-drag-handle">
                    <GripVertical size={14} />
                  </div>

                  <div className="effect-icon">
                    {effect.icon}
                  </div>

                  <div className="effect-info">
                    <h4 className="effect-name">{effect.name}</h4>
                    <span className="effect-category">{effect.category}</span>
                  </div>

                  <div className="effect-actions">
                    <button
                      className="action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleEffectEnabled(effect.id);
                      }}
                      title={effect.enabled ? 'Désactiver' : 'Activer'}
                    >
                      {effect.enabled ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>

                    <button
                      className="action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleEffectExpansion(effect.id);
                      }}
                      title="Paramètres"
                    >
                      <Settings size={14} />
                    </button>

                    <button
                      className="action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicateEffect(effect.id);
                      }}
                      title="Dupliquer"
                    >
                      <Copy size={14} />
                    </button>

                    <div className="move-actions">
                      <button
                        className="action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveEffect(effect.id, 'up');
                        }}
                        disabled={index === 0}
                        title="Monter"
                      >
                        <MoveUp size={12} />
                      </button>

                      <button
                        className="action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveEffect(effect.id, 'down');
                        }}
                        disabled={index === effects.length - 1}
                        title="Descendre"
                      >
                        <MoveDown size={12} />
                      </button>
                    </div>

                    <button
                      className="action-btn danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeEffect(effect.id);
                      }}
                      title="Supprimer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {expandedEffects.has(effect.id) && (
                  <div className="effect-parameters">
                    {effect.parameters.map(param => renderParameterControl(effect, param))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};