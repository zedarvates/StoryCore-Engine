/**
 * Effects Panel Component
 * Color correction and filter controls
 */

import React, { useState, useCallback } from 'react';
import { useVideoEditor } from '../../../contexts/VideoEditorContext';
import { ColorCorrection, VideoFilter, Clip } from '../../../types/video-editor';
import './EffectsPanel.css';

const PRESET_FILTERS: { id: VideoFilter; name: string; icon: string }[] = [
  { id: 'none', name: 'None', icon: '○' },
  { id: 'black_white', name: 'Grayscale', icon: '⬛' },
  { id: 'sepia', name: 'Sepia', icon: '🟤' },
  { id: 'vintage', name: 'Vintage', icon: '📷' },
  { id: 'vignette', name: 'Vignette', icon: '🔘' },
  { id: 'blur', name: 'Blur', icon: '💧' },
  { id: 'sharpen', name: 'Sharpen', icon: '🔪' },
  { id: 'warm', name: 'Warm', icon: '🔥' },
  { id: 'cool', name: 'Cool', icon: '❄️' },
  { id: 'dramatic', name: 'Dramatic', icon: '🎭' },
];

export const EffectsPanel: React.FC = () => {
  const { clips, selectedClipIds, updateClip } = useVideoEditor();
  const [activeTab, setActiveTab] = useState<'color' | 'filters'>('color');

  const selectedClip = clips.find((c: string) => selectedClipIds.includes(c));
  const corrections = selectedClip?.corrections || {
    brightness: 0,
    contrast: 0,
    saturation: 0,
    temperature: 0,
    tint: 0,
    shadows: 0,
    highlights: 0,
  };

  const handleCorrectionChange = useCallback(
    (key: keyof ColorCorrection, value: number) => {
      if (!selectedClip) return;
      updateClip(selectedClip.id, {
        corrections: { ...corrections, [key]: value },
      });
    },
    [selectedClip, corrections, updateClip]
  );

  const handleFilterChange = useCallback(
    (filterId: VideoFilter) => {
      if (!selectedClip) return;
      updateClip(selectedClip.id, {
        filter: filterId,
      });
    },
    [selectedClip, updateClip]
  );

  const handleReset = useCallback(() => {
    if (!selectedClip) return;
    updateClip(selectedClip.id, {
      corrections: {
        brightness: 0,
        contrast: 0,
        saturation: 0,
        temperature: 0,
        tint: 0,
        shadows: 0,
        highlights: 0,
      },
      filter: 'none',
    });
  }, [selectedClip, updateClip]);

  const SliderControl: React.FC<{
    label: string;
    value: number;
    min: number;
    max: number;
    onChange: (value: number) => void;
  }> = ({ label, value, min, max, onChange }) => (
    <div className="slider-control">
      <div className="slider-header">
        <span className="slider-label">{label}</span>
        <span className="slider-value">{value > 0 ? '+' : ''}{value}</span>
      </div>
      <label className="sr-only" htmlFor={`slider-${label}`}>{label}</label>
      <input
        id={`slider-${label}`}
        type="range"
        className="slider-input"
        min={min}
        max={max}
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(Number.parseFloat(e.target.value))}
        aria-label={label}
      />
    </div>
  );

  return (
    <div className="effects-panel">
      <div className="panel-header">
        <h3>Effects</h3>
        <button className="reset-btn" onClick={handleReset}>
          Reset
        </button>
      </div>

      <div className="panel-tabs">
        <button
          className={`tab-btn ${activeTab === 'color' ? 'active' : ''}`}
          onClick={() => setActiveTab('color')}
        >
          Color
        </button>
        <button
          className={`tab-btn ${activeTab === 'filters' ? 'active' : ''}`}
          onClick={() => setActiveTab('filters')}
        >
          Filters
        </button>
      </div>

      {!selectedClip ? (
        <div className="panel-empty">
          <p>Select a clip to edit effects</p>
        </div>
      ) : (
        <div className="panel-content">
          {activeTab === 'color' && (
            <div className="color-corrections">
              <SliderControl
                label="Brightness"
                value={corrections.brightness}
                min={-100}
                max={100}
                onChange={(v) => handleCorrectionChange('brightness', v)}
              />
              <SliderControl
                label="Contrast"
                value={corrections.contrast}
                min={-100}
                max={100}
                onChange={(v) => handleCorrectionChange('contrast', v)}
              />
              <SliderControl
                label="Saturation"
                value={corrections.saturation}
                min={-100}
                max={100}
                onChange={(v) => handleCorrectionChange('saturation', v)}
              />
              <SliderControl
                label="Temperature"
                value={corrections.temperature}
                min={-100}
                max={100}
                onChange={(v) => handleCorrectionChange('temperature', v)}
              />
              <SliderControl
                label="Tint"
                value={corrections.tint}
                min={-100}
                max={100}
                onChange={(v) => handleCorrectionChange('tint', v)}
              />
              <SliderControl
                label="Shadows"
                value={corrections.shadows}
                min={-100}
                max={100}
                onChange={(v) => handleCorrectionChange('shadows', v)}
              />
              <SliderControl
                label="Highlights"
                value={corrections.highlights}
                min={-100}
                max={100}
                onChange={(v) => handleCorrectionChange('highlights', v)}
              />
            </div>
          )}

          {activeTab === 'filters' && (
            <div className="filter-presets">
              <div className="filter-grid">
                {PRESET_FILTERS.map((filter) => (
                  <button
                    key={filter.id}
                    className={`filter-btn ${selectedClip.filter === filter.id ? 'active' : ''}`}
                    onClick={() => handleFilterChange(filter.id)}
                  >
                    <span className="filter-icon">{filter.icon}</span>
                    <span className="filter-name">{filter.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EffectsPanel;

