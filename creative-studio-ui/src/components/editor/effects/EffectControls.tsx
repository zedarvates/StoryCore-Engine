import React, { useState, useEffect } from 'react';
import {
  Settings,
  RotateCcw,
  Save,
  Eye,
  EyeOff,
  Copy,
  Trash2,
  ChevronDown,
  ChevronUp,
  Sliders,
} from 'lucide-react';
import { Effect, EffectParameter } from './EffectsLibrary';
import { EffectKeyframes } from './EffectKeyframes';
import './EffectControls.css';

interface AppliedEffect extends Effect {
  enabled: boolean;
  order: number;
}

interface EffectControlsProps {
  selectedEffect?: AppliedEffect;
  onEffectChange?: (effect: AppliedEffect) => void;
  onEffectDelete?: (effectId: string) => void;
  onEffectDuplicate?: (effectId: string) => void;
  onEffectToggle?: (effectId: string) => void;
  className?: string;
  // Alternative interface for multiple effects
  effects?: AppliedEffect[];
  onEffectUpdate?: (effectId: string, updates: Partial<AppliedEffect>) => void;
  currentTime?: number;
  duration?: number;
}

export const EffectControls: React.FC<EffectControlsProps> = ({
  selectedEffect,
  onEffectChange,
  onEffectDelete,
  onEffectDuplicate,
  onEffectToggle,
  className = '',
  effects,
  onEffectUpdate,
  currentTime = 0,
  duration = 30,
}) => {
  // Determine which interface is being used
  const isMultipleEffectsMode = effects !== undefined;
  const currentEffects = isMultipleEffectsMode ? effects : (selectedEffect ? [selectedEffect] : []);
  const [selectedEffectId, setSelectedEffectId] = useState<string | null>(currentEffects.length > 0 ? currentEffects[0].id : null);

  const selectedEffectData = selectedEffectId ? currentEffects.find(e => e.id === selectedEffectId) : null;
  const [localParameters, setLocalParameters] = useState<EffectParameter[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['basic']));

  useEffect(() => {
    if (selectedEffectData) {
      setLocalParameters([...selectedEffectData.parameters]);
      setHasUnsavedChanges(false);
    }
  }, [selectedEffectData]);

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const updateParameter = (paramId: string, value: unknown) => {
    setLocalParameters(prev =>
      prev.map(param =>
        param.id === paramId ? { ...param, value } : param
      )
    );
    setHasUnsavedChanges(true);
  };

  const resetParameter = (paramId: string) => {
    if (!selectedEffect) return;

    const originalParam = selectedEffect.parameters.find(p => p.id === paramId);
    if (originalParam) {
      updateParameter(paramId, originalParam.value);
    }
  };

  const resetAllParameters = () => {
    if (!selectedEffect) return;

    setLocalParameters(selectedEffect.parameters.map(param => ({
      ...param,
      value: param.value
    })));
    setHasUnsavedChanges(true);
  };

  const applyChanges = () => {
    if (!selectedEffectData) return;

    if (isMultipleEffectsMode && onEffectUpdate && selectedEffectId) {
      onEffectUpdate(selectedEffectId, { parameters: localParameters });
    } else if (onEffectChange) {
      const updatedEffect: AppliedEffect = {
        ...selectedEffectData,
        parameters: localParameters
      };
      onEffectChange(updatedEffect);
    }
    setHasUnsavedChanges(false);
  };

  const renderParameterControl = (param: EffectParameter) => {
    const handleChange = (value: unknown) => {
      updateParameter(param.id, value);
    };

    const handleReset = () => {
      resetParameter(param.id);
    };

    const isModified = selectedEffect &&
      param.value !== selectedEffect.parameters.find(p => p.id === param.id)?.value;

    switch (param.type) {
      case 'range':
        return (
          <div key={param.id} className="control-group">
            <div className="control-header">
              <label className="control-label">
                {param.name}
                {param.unit && <span className="unit">({param.unit})</span>}
              </label>
              <div className="control-actions">
                <span className="value-display">{param.value}</span>
                {isModified && (
                  <button
                    className="reset-btn"
                    onClick={handleReset}
                    title="Réinitialiser"
                  >
                    <RotateCcw size={12} />
                  </button>
                )}
              </div>
            </div>
            <input
              type="range"
              min={param.min}
              max={param.max}
              step={param.step}
              value={param.value}
              onChange={(e) => handleChange(parseFloat(e.target.value))}
              className="control-slider"
              aria-label={param.name}
            />
            <div className="range-limits">
              <span>{param.min}</span>
              <span>{param.max}</span>
            </div>
          </div>
        );

      case 'color':
        return (
          <div key={param.id} className="control-group">
            <div className="control-header">
              <label className="control-label">{param.name}</label>
              <div className="control-actions">
                <span className="value-display">{param.value}</span>
                {isModified && (
                  <button
                    className="reset-btn"
                    onClick={handleReset}
                    title="Réinitialiser"
                  >
                    <RotateCcw size={12} />
                  </button>
                )}
              </div>
            </div>
            <div className="color-control">
              <input
                type="color"
                value={param.value}
                onChange={(e) => handleChange(e.target.value)}
                className="control-color"
                aria-label={`${param.name} color picker`}
              />
              <input
                type="text"
                value={param.value}
                onChange={(e) => handleChange(e.target.value)}
                className="control-color-text"
                placeholder="#000000"
                aria-label={`${param.name} hex value`}
              />
            </div>
          </div>
        );

      case 'select':
        return (
          <div key={param.id} className="control-group">
            <div className="control-header">
              <label className="control-label">{param.name}</label>
              <div className="control-actions">
                {isModified && (
                  <button
                    className="reset-btn"
                    onClick={handleReset}
                    title="Réinitialiser"
                  >
                    <RotateCcw size={12} />
                  </button>
                )}
              </div>
            </div>
            <select
              value={param.value}
              onChange={(e) => handleChange(e.target.value)}
              className="control-select"
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
          <div key={param.id} className="control-group">
            <label className="control-toggle">
              <input
                type="checkbox"
                checked={param.value}
                onChange={(e) => handleChange(e.target.checked)}
                className="control-checkbox"
              />
              <span className="toggle-label">{param.name}</span>
              {isModified && (
                <button
                  className="reset-btn"
                  onClick={handleReset}
                  title="Réinitialiser"
                >
                  <RotateCcw size={12} />
                </button>
              )}
            </label>
          </div>
        );

      case 'number':
        return (
          <div key={param.id} className="control-group">
            <div className="control-header">
              <label className="control-label">
                {param.name}
                {param.unit && <span className="unit">({param.unit})</span>}
              </label>
              <div className="control-actions">
                {isModified && (
                  <button
                    className="reset-btn"
                    onClick={handleReset}
                    title="Réinitialiser"
                  >
                    <RotateCcw size={12} />
                  </button>
                )}
              </div>
            </div>
            <input
              type="number"
              min={param.min}
              max={param.max}
              step={param.step}
              value={param.value}
              onChange={(e) => handleChange(parseFloat(e.target.value) || 0)}
              className="control-number"
              aria-label={param.name}
            />
          </div>
        );

      default:
        return null;
    }
  };

  const groupParametersByCategory = (parameters: EffectParameter[]) => {
    const groups: Record<string, EffectParameter[]> = {
      basic: [],
      advanced: [],
      color: [],
      transform: [],
      temporal: [],
    };

    parameters.forEach(param => {
      const category = 'basic';
      groups[category].push(param);
    });

    return Object.entries(groups).filter(([, params]) => params.length > 0);
  };

  if (!selectedEffectData) {
    return (
      <div className={`effect-controls empty ${className}`}>
        <div className="empty-state">
          <Settings size={32} />
          <h3>Aucun effet sélectionné</h3>
          <p>Sélectionnez un effet dans la pile pour ajuster ses paramètres</p>
        </div>
      </div>
    );
  }

  const parameterGroups = groupParametersByCategory(localParameters);

  return (
    <div className={`effect-controls ${className}`}>
      <div className="controls-header">
        {isMultipleEffectsMode && currentEffects.length > 1 && (
          <div className="effect-selector-row">
            <div className="effect-selector">
              <select
                value={selectedEffectId || ''}
                onChange={(e) => setSelectedEffectId(e.target.value)}
                className="effect-select"
                title="Select effect"
              >
                {currentEffects.map(effect => (
                  <option key={effect.id} value={effect.id}>
                    {effect.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="effect-info-row">
          <div className="effect-info">
            <div className="effect-icon">
              {selectedEffectData.icon}
            </div>
            <div className="effect-details">
              <h3 className="effect-name">{selectedEffectData.name}</h3>
              <span className="effect-category">{selectedEffectData.category}</span>
            </div>
          </div>

          <div className="header-actions">
            <button
              className={`action-btn ${selectedEffectData.enabled ? 'active' : ''}`}
              onClick={() => onEffectToggle?.(selectedEffectData.id)}
              title={selectedEffectData.enabled ? 'Désactiver' : 'Activer'}
            >
              {selectedEffectData.enabled ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>

            <button
              className="action-btn"
              onClick={() => onEffectDuplicate?.(selectedEffectData.id)}
              title="Dupliquer"
            >
              <Copy size={16} />
            </button>

            <button
              className="action-btn danger"
              onClick={() => onEffectDelete?.(selectedEffectData.id)}
              title="Supprimer"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="controls-content">
        {parameterGroups.map(([groupId, params]) => (
          <div key={groupId} className="parameter-section">
            <button
              className="section-header"
              onClick={() => toggleSection(groupId)}
            >
              <Sliders size={14} />
              <span className="section-title">
                {groupId === 'basic' ? 'Paramètres de base' :
                 groupId === 'advanced' ? 'Paramètres avancés' :
                 groupId === 'color' ? 'Paramètres de couleur' :
                 groupId === 'transform' ? 'Transformations' :
                 groupId === 'temporal' ? 'Effets temporels' :
                 groupId.charAt(0).toUpperCase() + groupId.slice(1)}
              </span>
              {expandedSections.has(groupId) ?
                <ChevronUp size={14} /> :
                <ChevronDown size={14} />
              }
            </button>

            {expandedSections.has(groupId) && (
              <div className="section-content">
                {params.map(param => renderParameterControl(param))}
              </div>
            )}
          </div>
        ))}

        {/* Keyframes Section */}
        <div className="control-section">
          <button
            className="section-header"
            onClick={() => toggleSection('keyframes')}
          >
            <Sliders size={16} className="section-icon" />
            <span>Animation (Keyframes)</span>
            {expandedSections.has('keyframes') ? (
              <ChevronUp size={16} />
            ) : (
              <ChevronDown size={16} />
            )}
          </button>

          {expandedSections.has('keyframes') && (
            <div className="section-content">
              {localParameters
                .filter(param => param.type === 'range' || param.type === 'number') // Only numeric parameters can have keyframes
                .map(param => (
                <EffectKeyframes
                  key={param.id}
                  parameter={{
                    id: param.id,
                    name: param.name,
                    min: param.min || 0,
                    max: param.max || 100,
                    defaultValue: typeof param.value === 'number' ? param.value : 0,
                    keyframes: param.keyframes || [],
                  }}
                  duration={duration}
                  currentTime={currentTime}
                  onKeyframesChange={(keyframes) => {
                    updateParameter(param.id, { ...param, keyframes });
                  }}
                  onValueChange={(value) => {
                    updateParameter(param.id, value);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {hasUnsavedChanges && (
        <div className="controls-footer">
          <button
            className="reset-all-btn"
            onClick={resetAllParameters}
          >
            <RotateCcw size={14} />
            Tout réinitialiser
          </button>

          <button
            className="apply-btn"
            onClick={applyChanges}
          >
            <Save size={14} />
            Appliquer
          </button>
        </div>
      )}
    </div>
  );
};
