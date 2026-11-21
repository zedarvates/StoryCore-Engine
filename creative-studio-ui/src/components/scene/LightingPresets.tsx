/**
 * LightingPresets Component
 * 
 * Provides lighting presets for 3D scene rendering.
 * Includes day, night, dramatic, and interior lighting options.
 * 
 * File: creative-studio-ui/src/components/scene/LightingPresets.tsx
 */

import React, { useState, useCallback } from 'react';
import { Sun, Moon, Cloud, Flame, Zap, Palette, CloudRain, Snowflake } from 'lucide-react';
import './LightingPresets.css';

// ============================================================================
// Types
// ============================================================================

/**
 * Lighting preset configuration
 */
export interface LightingPreset {
  id: string;
  name: string;
  description: string;
  category: 'day' | 'night' | 'dramatic' | 'interior';
  icon: React.ReactNode;
  lights: {
    ambient: { intensity: number; color: string };
    directional?: { intensity: number; color: string; position: [number, number, number] };
    point?: { intensity: number; color: string; position: [number, number, number] };
  };
  fog?: { enabled: boolean; color: string; density: number };
  skyColor?: string;
}

/**
 * Props for the LightingPresets component
 */
export interface LightingPresetsProps {
  /** Current lighting configuration */
  currentPreset?: string;
  
  /** Handler for preset selection */
  onPresetSelect?: (preset: LightingPreset) => void;
  
  /** Handler for custom lighting changes */
  onCustomChange?: (settings: LightingPreset['lights']) => void;
}

// ============================================================================
// Lighting Presets
// ============================================================================

/**
 * Predefined lighting presets
 */
export const LIGHTING_PRESETS: LightingPreset[] = [
  // Day Presets
  {
    id: 'bright-daylight',
    name: 'Bright Daylight',
    description: 'High intensity white lighting',
    category: 'day',
    icon: <Sun size={18} />,
    lights: {
      ambient: { intensity: 0.6, color: '#ffffff' },
      directional: { intensity: 1.2, color: '#ffffff', position: [10, 20, 10] },
    },
    skyColor: '#87CEEB',
  },
  {
    id: 'golden-hour',
    name: 'Golden Hour',
    description: 'Warm sunset lighting',
    category: 'day',
    icon: <Sun size={18} />,
    lights: {
      ambient: { intensity: 0.4, color: '#ffeedd' },
      directional: { intensity: 1.0, color: '#ffaa55', position: [-10, 5, -10] },
    },
    skyColor: '#ff9966',
  },
  {
    id: 'blue-hour',
    name: 'Blue Hour',
    description: 'Cool twilight lighting',
    category: 'day',
    icon: <Cloud size={18} />,
    lights: {
      ambient: { intensity: 0.3, color: '#aaccff' },
      directional: { intensity: 0.4, color: '#6688cc', position: [-10, 5, -10] },
    },
    skyColor: '#4466aa',
  },

  // Night Presets
  {
    id: 'moonlight',
    name: 'Moonlight',
    description: 'Cool blue night lighting',
    category: 'night',
    icon: <Moon size={18} />,
    lights: {
      ambient: { intensity: 0.1, color: '#aabbff' },
      directional: { intensity: 0.3, color: '#99aacc', position: [10, 20, -10] },
    },
    skyColor: '#0a0a20',
  },
  {
    id: 'city-night',
    name: 'City Night',
    description: 'Warm orange street lights',
    category: 'night',
    icon: <Palette size={18} />,
    lights: {
      ambient: { intensity: 0.15, color: '#ffcc99' },
      directional: { intensity: 0.2, color: '#ffaa55', position: [5, 10, 5] },
      point: { intensity: 0.8, color: '#ff7700', position: [0, 2, 0] },
    },
    skyColor: '#1a1a2e',
  },

  // Dramatic Presets
  {
    id: 'high-contrast',
    name: 'High Contrast',
    description: 'Emphasized shadows',
    category: 'dramatic',
    icon: <Zap size={18} />,
    lights: {
      ambient: { intensity: 0.2, color: '#ffffff' },
      directional: { intensity: 1.5, color: '#ffffff', position: [10, 10, 5] },
    },
    skyColor: '#222222',
  },
  {
    id: 'foggy',
    name: 'Foggy',
    description: 'Reduced visibility, grey tint',
    category: 'dramatic',
    icon: <CloudRain size={18} />,
    lights: {
      ambient: { intensity: 0.4, color: '#cccccc' },
      directional: { intensity: 0.6, color: '#aaaaaa', position: [5, 10, 5] },
    },
    fog: { enabled: true, color: '#888888', density: 0.05 },
    skyColor: '#666666',
  },
  {
    id: 'sunset',
    name: 'Sunset',
    description: 'Orange/purple gradients',
    category: 'dramatic',
    icon: <Flame size={18} />,
    lights: {
      ambient: { intensity: 0.3, color: '#ffaa77' },
      directional: { intensity: 0.8, color: '#ff5522', position: [-15, 3, -15] },
    },
    skyColor: '#cc4433',
  },

  // Interior Presets
  {
    id: 'warm-indoor',
    name: 'Warm Indoor',
    description: 'Soft yellow ambient lighting',
    category: 'interior',
    icon: <Flame size={18} />,
    lights: {
      ambient: { intensity: 0.5, color: '#ffeecc' },
      directional: { intensity: 0.3, color: '#ffdd99', position: [5, 10, 5] },
      point: { intensity: 1.0, color: '#ffaa55', position: [0, 3, 0] },
    },
    skyColor: '#332211',
  },
  {
    id: 'bright-office',
    name: 'Bright Office',
    description: 'White high-intensity lighting',
    category: 'interior',
    icon: <Sun size={18} />,
    lights: {
      ambient: { intensity: 0.7, color: '#ffffff' },
      directional: { intensity: 0.5, color: '#ffffff', position: [0, 10, 0] },
    },
    skyColor: '#444444',
  },
  {
    id: 'candlelight',
    name: 'Candlelight',
    description: 'Warm flickering orange glow',
    category: 'interior',
    icon: <Flame size={18} />,
    lights: {
      ambient: { intensity: 0.2, color: '#ffaa44' },
      point: { intensity: 1.5, color: '#ff6622', position: [0, 1, 0] },
    },
    skyColor: '#221100',
  },
];

// ============================================================================
// Component
// ============================================================================

export function LightingPresets({
  currentPreset,
  onPresetSelect,
  onCustomChange,
}: LightingPresetsProps) {
  const [activePreset, setActivePreset] = useState<string>(currentPreset || 'bright-daylight');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showIntensitySliders, setShowIntensitySliders] = useState(false);

  const handlePresetSelect = useCallback(
    (preset: LightingPreset) => {
      setActivePreset(preset.id);
      setShowDropdown(false);
      onPresetSelect?.(preset);
    },
    [onPresetSelect]
  );

  const groupedPresets = LIGHTING_PRESETS.reduce((acc, preset) => {
    if (!acc[preset.category]) {
      acc[preset.category] = [];
    }
    acc[preset.category].push(preset);
    return acc;
  }, {} as Record<string, LightingPreset[]>);

  const categoryIcons: Record<string, React.ReactNode> = {
    day: <Sun size={14} />,
    night: <Moon size={14} />,
    dramatic: <Zap size={14} />,
    interior: <Flame size={14} />,
  };

  const categoryLabels: Record<string, string> = {
    day: 'Day',
    night: 'Night',
    dramatic: 'Dramatic',
    interior: 'Interior',
  };

  return (
    <div className="lighting-presets">
      {/* Main Toggle Button */}
      <button
        className="lighting-presets__trigger"
        onClick={() => setShowDropdown(!showDropdown)}
        title="Select lighting preset"
      >
        <Palette size={18} />
        <span className="lighting-presets__label">
          {LIGHTING_PRESETS.find((p) => p.id === activePreset)?.name || 'Lighting'}
        </span>
      </button>

      {/* Intensity Toggle */}
      <button
        className={`lighting-presets__btn ${showIntensitySliders ? 'lighting-presets__btn--active' : ''}`}
        onClick={() => setShowIntensitySliders(!showIntensitySliders)}
        title="Adjust lighting intensity"
      >
        <Sun size={16} />
      </button>

      {/* Dropdown Menu */}
      {showDropdown && (
        <>
          <div className="lighting-presets__overlay" onClick={() => setShowDropdown(false)} />
          <div className="lighting-presets__menu">
            {Object.entries(groupedPresets).map(([category, presets]) => (
              <div key={category} className="lighting-presets__section">
                <div className="lighting-presets__section-header">
                  {categoryIcons[category]}
                  <span>{categoryLabels[category]}</span>
                </div>
                <div className="lighting-presets__grid">
                  {presets.map((preset) => (
                    <button
                      key={preset.id}
                      className={`lighting-presets__option ${
                        activePreset === preset.id ? 'lighting-presets__option--active' : ''
                      }`}
                      onClick={() => handlePresetSelect(preset)}
                      title={preset.description}
                    >
                      {preset.icon}
                      <span className="lighting-presets__option-name">{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Intensity Sliders */}
      {showIntensitySliders && (
        <div className="lighting-presets__sliders">
          <div className="lighting-presets__slider-group">
            <label>
              <Sun size={12} />
              Ambient
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              defaultValue={LIGHTING_PRESETS.find((p) => p.id === activePreset)?.lights.ambient.intensity || 0.5}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                const preset = LIGHTING_PRESETS.find((p) => p.id === activePreset);
                onCustomChange?.({
                  ambient: { intensity: value, color: preset?.lights.ambient.color || '#ffffff' },
                  directional: preset?.lights.directional,
                  point: preset?.lights.point,
                });
              }}
              aria-label="Ambient light intensity"
            />
          </div>
          <div className="lighting-presets__slider-group">
            <label>
              <Zap size={12} />
              Directional
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              defaultValue={LIGHTING_PRESETS.find((p) => p.id === activePreset)?.lights.directional?.intensity || 1}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                const preset = LIGHTING_PRESETS.find((p) => p.id === activePreset);
                onCustomChange?.({
                  ambient: preset?.lights.ambient || { intensity: 0.5, color: '#ffffff' },
                  directional: { intensity: value, color: '#ffffff', position: [10, 20, 10] },
                  point: preset?.lights.point,
                });
              }}
              aria-label="Directional light intensity"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default LightingPresets;
