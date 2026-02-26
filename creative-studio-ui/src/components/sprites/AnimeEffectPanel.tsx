/**
 * Anime Effect Panel Component
 * 
 * Panel for managing anime-style visual effects for sprites.
 * Supports Speed Lines, Impact Frames, Motion Trails, and more.
 */

import React, { useCallback, useState } from 'react';
import {
  Zap,
  Sparkles,
  Wind,
  Star,
  Eye,
  EyeOff,
  Trash2,
  ChevronDown,
  ChevronUp,
  Settings
} from 'lucide-react';

import {
  AnimeEffect,
  createDefaultSpeedLinesEffect,
  createDefaultImpactFrameEffect,
  createDefaultMotionTrailEffect,
  createDefaultEmotionEffect,
  ANIME_EFFECT_PRESETS,
  AnimeEffectPreset
} from '../../types/animeEffect';

// Simple cn utility
const cn = (...classes: (string | boolean | undefined)[]) => 
  classes.filter(Boolean).join(' ');

// ============================================================================
// Types
// ============================================================================

export interface AnimeEffectPanelProps {
  /** Current effects stack */
  effects: AnimeEffect[];
  
  /** Callback when effects change */
  onEffectsChange: (effects: AnimeEffect[]) => void;
  
  /** Selected effect ID */
  selectedEffectId?: string;
  
  /** Callback when effect is selected */
  onEffectSelect?: (effectId: string) => void;
  
  /** Global intensity for all effects */
  globalIntensity?: number;
  
  /** Callback when global intensity changes */
  onGlobalIntensityChange?: (intensity: number) => void;
  
  /** Whether the panel is disabled */
  disabled?: boolean;
  
  /** Additional class name */
  className?: string;
}

type EffectCategory = 'action' | 'emotion' | 'ambient' | 'focus';

// ============================================================================
// Effect Type Configuration
// ============================================================================

const EFFECT_TYPES: { type: AnimeEffect['type']; label: string; icon: React.ReactNode; category: EffectCategory }[] = [
  { type: 'speed_lines', label: 'Lignes de Vitesse', icon: <Wind size={16} />, category: 'action' },
  { type: 'impact_frame', label: 'Frame d\'Impact', icon: <Star size={16} />, category: 'action' },
  { type: 'motion_trail', label: 'Traînée de Mouvement', icon: <Zap size={16} />, category: 'action' },
  { type: 'emotion', label: 'Effet d\'Émotion', icon: <Sparkles size={16} />, category: 'emotion' }
];

// ============================================================================
// Component
// ============================================================================

export const AnimeEffectPanel: React.FC<AnimeEffectPanelProps> = ({
  effects,
  onEffectsChange,
  selectedEffectId,
  onEffectSelect,
  globalIntensity = 1,
  onGlobalIntensityChange,
  disabled = false,
  className
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<EffectCategory>>(new Set(['action']));
  const [showPresets, setShowPresets] = useState(false);

  // Add new effect
  const addEffect = useCallback((type: AnimeEffect['type']) => {
    let newEffect: AnimeEffect;
    
    switch (type) {
      case 'speed_lines':
        newEffect = createDefaultSpeedLinesEffect();
        break;
      case 'impact_frame':
        newEffect = createDefaultImpactFrameEffect();
        break;
      case 'motion_trail':
        newEffect = createDefaultMotionTrailEffect();
        break;
      case 'emotion':
        newEffect = createDefaultEmotionEffect();
        break;
      default:
        return;
    }
    
    onEffectsChange([...effects, newEffect]);
    onEffectSelect?.(newEffect.id);
  }, [effects, onEffectsChange, onEffectSelect]);

  // Remove effect
  const removeEffect = useCallback((effectId: string) => {
    onEffectsChange(effects.filter(e => e.id !== effectId));
    if (selectedEffectId === effectId) {
      onEffectSelect?.('');
    }
  }, [effects, onEffectsChange, selectedEffectId, onEffectSelect]);

  // Toggle effect enabled
  const toggleEffectEnabled = useCallback((effectId: string) => {
    onEffectsChange(
      effects.map(e => 
        e.id === effectId ? { ...e, enabled: !e.enabled } : e
      )
    );
  }, [effects, onEffectsChange]);

  // Update effect
  const updateEffect = useCallback((effectId: string, updates: Partial<AnimeEffect>) => {
    onEffectsChange(
      effects.map(e => 
        e.id === effectId ? { ...e, ...updates } as AnimeEffect : e
      )
    );
  }, [effects, onEffectsChange]);

  // Apply preset
  const applyPreset = useCallback((preset: AnimeEffectPreset) => {
    const newEffects = preset.effects.map(e => ({
      ...e,
      id: `${e.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }));
    onEffectsChange([...effects, ...newEffects]);
    setShowPresets(false);
  }, [effects, onEffectsChange]);

  // Toggle category expansion
  const toggleCategory = (category: EffectCategory) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  // Get effect icon
  const getEffectIcon = (type: AnimeEffect['type']) => {
    const config = EFFECT_TYPES.find(t => t.type === type);
    return config?.icon || <Settings size={16} />;
  };

  // Get effect label
  const getEffectLabel = (type: AnimeEffect['type']) => {
    const config = EFFECT_TYPES.find(t => t.type === type);
    return config?.label || type;
  };

  // Group effects by category
  const effectsByCategory = effects.reduce((acc, effect) => {
    const config = EFFECT_TYPES.find(t => t.type === effect.type);
    const category = config?.category || 'ambient';
    if (!acc[category]) acc[category] = [];
    acc[category].push(effect);
    return acc;
  }, {} as Record<EffectCategory, AnimeEffect[]>);

  const categories: EffectCategory[] = ['action', 'emotion', 'ambient', 'focus'];

  return (
    <div className={cn('flex flex-col bg-slate-900 rounded-lg', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700">
        <h3 className="text-sm font-medium text-white">Effets Anime</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPresets(!showPresets)}
            className={cn(
              'px-2 py-1 text-xs rounded transition-colors',
              showPresets 
                ? 'bg-violet-600 text-white' 
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            )}
            disabled={disabled}
          >
            Presets
          </button>
        </div>
      </div>

      {/* Global Intensity */}
      <div className="px-3 py-2 border-b border-slate-700">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-slate-400">Intensité Globale</span>
          <span className="text-xs text-violet-400">{(globalIntensity * 100).toFixed(0)}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={globalIntensity}
          onChange={(e) => onGlobalIntensityChange?.(parseFloat(e.target.value))}
          className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-500"
          disabled={disabled}
        />
      </div>

      {/* Presets Panel */}
      {showPresets && (
        <div className="px-3 py-2 border-b border-slate-700 bg-slate-800">
          <div className="text-xs text-slate-400 mb-2">Presets d'Effets</div>
          <div className="grid grid-cols-1 gap-2">
            {ANIME_EFFECT_PRESETS.map(preset => (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset)}
                className="flex items-center gap-2 p-2 rounded bg-slate-700 hover:bg-slate-600 text-left transition-colors"
                disabled={disabled}
              >
                <div className="flex-1">
                  <div className="text-sm font-medium text-white">{preset.name}</div>
                  <div className="text-xs text-slate-400">{preset.description}</div>
                </div>
                <div className="flex gap-1">
                  {preset.tags.slice(0, 2).map(tag => (
                    <span 
                      key={tag}
                      className="px-1.5 py-0.5 text-[10px] bg-slate-600 text-slate-300 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add Effect Buttons */}
      <div className="px-3 py-2 border-b border-slate-700">
        <div className="text-xs text-slate-400 mb-2">Ajouter un Effet</div>
        <div className="flex flex-wrap gap-1">
          {EFFECT_TYPES.map(({ type, label, icon }) => (
            <button
              key={type}
              onClick={() => addEffect(type)}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
              disabled={disabled}
            >
              {icon}
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Effects List */}
      <div className="flex-1 overflow-y-auto">
        {effects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-slate-500">
            <Sparkles size={24} className="mb-2 opacity-50" />
            <p className="text-sm">Aucun effet ajouté</p>
            <p className="text-xs">Cliquez sur un type d'effet ci-dessus</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700">
            {categories.map(category => {
              const categoryEffects = effectsByCategory[category] || [];
              if (categoryEffects.length === 0) return null;

              return (
                <div key={category} className="py-1">
                  {/* Category Header */}
                  <button
                    onClick={() => toggleCategory(category)}
                    className="flex items-center justify-between w-full px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                  >
                    <span className="capitalize">{category}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-500">({categoryEffects.length})</span>
                      {expandedCategories.has(category) ? (
                        <ChevronUp size={14} />
                      ) : (
                        <ChevronDown size={14} />
                      )}
                    </div>
                  </button>

                  {/* Category Effects */}
                  {expandedCategories.has(category) && (
                    <div className="space-y-1 px-2">
                      {categoryEffects.map(effect => (
                        <div
                          key={effect.id}
                          className={cn(
                            'flex items-center gap-2 p-2 rounded cursor-pointer transition-colors',
                            selectedEffectId === effect.id
                              ? 'bg-violet-600/20 border border-violet-500/50'
                              : 'bg-slate-800 hover:bg-slate-700 border border-transparent'
                          )}
                          onClick={() => onEffectSelect?.(effect.id)}
                        >
                          {/* Effect Icon */}
                          <div className={cn(
                            'flex-shrink-0',
                            effect.enabled ? 'text-violet-400' : 'text-slate-600'
                          )}>
                            {getEffectIcon(effect.type)}
                          </div>

                          {/* Effect Info */}
                          <div className="flex-1 min-w-0">
                            <div className={cn(
                              'text-sm truncate',
                              effect.enabled ? 'text-white' : 'text-slate-500'
                            )}>
                              {getEffectLabel(effect.type)}
                            </div>
                            <div className="text-xs text-slate-500">
                              Intensité: {(effect.intensity * 100).toFixed(0)}%
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleEffectEnabled(effect.id);
                              }}
                              className="p-1 rounded hover:bg-slate-600 transition-colors"
                              title={effect.enabled ? 'Désactiver' : 'Activer'}
                            >
                              {effect.enabled ? (
                                <Eye size={14} className="text-slate-300" />
                              ) : (
                                <EyeOff size={14} className="text-slate-500" />
                              )}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeEffect(effect.id);
                              }}
                              className="p-1 rounded hover:bg-red-600/20 transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 size={14} className="text-slate-400 hover:text-red-400" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected Effect Controls */}
      {selectedEffectId && (
        <div className="border-t border-slate-700 px-3 py-2">
          <EffectControls
            effect={effects.find(e => e.id === selectedEffectId)}
            onUpdate={(updates) => updateEffect(selectedEffectId, updates)}
          />
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Effect Controls Sub-Component
// ============================================================================

interface EffectControlsProps {
  effect: AnimeEffect | undefined;
  onUpdate: (updates: Partial<AnimeEffect>) => void;
}

const EffectControls: React.FC<EffectControlsProps> = ({ effect, onUpdate }) => {
  if (!effect) return null;

  return (
    <div className="space-y-3">
      <div className="text-xs font-medium text-slate-400">Propriétés de l'effet</div>
      
      {/* Intensity */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-xs text-slate-400">Intensité</label>
          <span className="text-xs text-violet-400">{(effect.intensity * 100).toFixed(0)}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={effect.intensity}
          onChange={(e) => onUpdate({ intensity: parseFloat(e.target.value) })}
          className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-500"
        />
      </div>

      {/* Duration */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-xs text-slate-400">Durée (ms)</label>
          <span className="text-xs text-violet-400">{effect.duration}</span>
        </div>
        <input
          type="range"
          min="0"
          max="2000"
          step="50"
          value={effect.duration}
          onChange={(e) => onUpdate({ duration: parseInt(e.target.value) })}
          className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-500"
        />
      </div>

      {/* Speed */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-xs text-slate-400">Vitesse</label>
          <span className="text-xs text-violet-400">{effect.speed.toFixed(1)}x</span>
        </div>
        <input
          type="range"
          min="0.1"
          max="3"
          step="0.1"
          value={effect.speed}
          onChange={(e) => onUpdate({ speed: parseFloat(e.target.value) })}
          className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-500"
        />
      </div>

      {/* Z-Index */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-xs text-slate-400">Couche (Z)</label>
          <span className="text-xs text-violet-400">{effect.zIndex}</span>
        </div>
        <input
          type="range"
          min="-10"
          max="10"
          step="1"
          value={effect.zIndex}
          onChange={(e) => onUpdate({ zIndex: parseInt(e.target.value) })}
          className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-500"
        />
      </div>

      {/* Blend Mode */}
      <div className="space-y-1">
        <label className="text-xs text-slate-400">Mode de Fusion</label>
        <select
          value={effect.blendMode}
          onChange={(e) => onUpdate({ blendMode: e.target.value as AnimeEffect['blendMode'] })}
          className="w-full px-2 py-1 text-xs bg-slate-700 border border-slate-600 rounded text-slate-200"
        >
          <option value="normal">Normal</option>
          <option value="multiply">Multiply</option>
          <option value="screen">Screen</option>
          <option value="overlay">Overlay</option>
          <option value="additive">Additive</option>
        </select>
      </div>
    </div>
  );
};

export default AnimeEffectPanel;