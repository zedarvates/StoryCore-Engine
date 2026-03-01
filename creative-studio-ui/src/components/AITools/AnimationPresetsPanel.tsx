/**
 * Animation Presets Panel Component
 * 
 * Drag & drop animation presets for images and videos.
 * Phase 8: UI Integration
 */

import React, { useState, useEffect } from 'react';
import './AnimationPresetsPanel.css';

interface AnimationPreset {
  id: string;
  name: string;
  category: string;
  description: string;
  default_duration: number;
}

interface AnimationConfig {
  preset: string;
  duration: number;
  intensity: number;
  easing: string;
  fps: number;
}

interface AnimationPresetsPanelProps {
  inputPath: string;
  outputPath?: string;
  onApply?: (config: AnimationConfig) => void;
  onPreview?: (preset: AnimationPreset) => void;
}

const API_BASE = 'http://localhost:8001/api/ai/creative';

export const AnimationPresetsPanel: React.FC<AnimationPresetsPanelProps> = ({
  inputPath,
  outputPath,
  onApply,
  onPreview
}) => {
  const [presets, setPresets] = useState<AnimationPreset[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPreset, setSelectedPreset] = useState<AnimationPreset | null>(null);
  const [config, setConfig] = useState<AnimationConfig>({
    preset: 'ken_burns',
    duration: 3.0,
    intensity: 1.0,
    easing: 'ease_in_out',
    fps: 30
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedPreset, setDraggedPreset] = useState<AnimationPreset | null>(null);

  // Categories for filtering
  const categories = [
    { id: 'all', label: 'All', icon: '📁' },
    { id: 'motion', label: 'Motion', icon: '🎬' },
    { id: 'transition', label: 'Transition', icon: '🔄' },
    { id: 'effect', label: 'Effect', icon: '✨' },
    { id: 'entrance', label: 'Entrance', icon: '🚪' },
    { id: 'exit', label: 'Exit', icon: '🚶' }
  ];

  // Easing options
  const easingOptions = [
    { id: 'linear', label: 'Linear' },
    { id: 'ease_in', label: 'Ease In' },
    { id: 'ease_out', label: 'Ease Out' },
    { id: 'ease_in_out', label: 'Ease In Out' },
    { id: 'bounce', label: 'Bounce' }
  ];

  // Fetch presets on mount
  useEffect(() => {
    fetchPresets();
  }, []);

  const fetchPresets = async () => {
    try {
      const response = await fetch(`${API_BASE}/animations`);
      const data = await response.json();
      setPresets(data);
    } catch (error) {
      console.error('Failed to fetch presets:', error);
    }
  };

  const handlePresetSelect = (preset: AnimationPreset) => {
    setSelectedPreset(preset);
    setConfig(prev => ({
      ...prev,
      preset: preset.id,
      duration: preset.default_duration
    }));
  };

  const handleApply = async () => {
    if (!inputPath || !selectedPreset) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/animate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input_path: inputPath,
          output_path: outputPath || inputPath.replace(/\.[^.]+$/, '_animated.mp4'),
          ...config
        })
      });

      const result = await response.json();
      
      if (result.success) {
        onApply?.(config);
      } else {
        console.error('Animation failed:', result.message);
      }
    } catch (error) {
      console.error('Failed to apply animation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, preset: AnimationPreset) => {
    setIsDragging(true);
    setDraggedPreset(preset);
    e.dataTransfer.setData('text/plain', preset.id);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDraggedPreset(null);
  };

  // Filter presets by category
  const filteredPresets = selectedCategory === 'all'
    ? presets
    : presets.filter(p => p.category === selectedCategory);

  return (
    <div className="animation-presets-panel">
      <div className="panel-header">
        <h3>🎬 Animation Presets</h3>
        <p className="subtitle">Drag & drop onto images or videos</p>
      </div>

      {/* Category Tabs */}
      <div className="category-tabs">
        {categories.map(cat => (
          <button
            key={cat.id}
            className={`category-tab ${selectedCategory === cat.id ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat.id)}
          >
            <span className="tab-icon">{cat.icon}</span>
            <span className="tab-label">{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Presets Grid */}
      <div className="presets-grid">
        {filteredPresets.map(preset => (
          <div
            key={preset.id}
            className={`preset-card ${selectedPreset?.id === preset.id ? 'selected' : ''} ${draggedPreset?.id === preset.id ? 'dragging' : ''}`}
            draggable
            onDragStart={(e) => handleDragStart(e, preset)}
            onDragEnd={handleDragEnd}
            onClick={() => handlePresetSelect(preset)}
          >
            <div className="preset-icon">
              {preset.category === 'motion' && '🎬'}
              {preset.category === 'transition' && '🔄'}
              {preset.category === 'effect' && '✨'}
              {preset.category === 'entrance' && '🚪'}
              {preset.category === 'exit' && '🚶'}
            </div>
            <div className="preset-info">
              <span className="preset-name">{preset.name}</span>
              <span className="preset-duration">{preset.default_duration}s</span>
            </div>
          </div>
        ))}
      </div>

      {/* Selected Preset Config */}
      {selectedPreset && (
        <div className="preset-config">
          <h4>{selectedPreset.name}</h4>
          <p className="preset-description">{selectedPreset.description}</p>

          <div className="config-row">
            <label>Duration</label>
            <input
              type="range"
              min="0.5"
              max="10"
              step="0.5"
              value={config.duration}
              onChange={(e) => setConfig(prev => ({ ...prev, duration: parseFloat(e.target.value) }))}
            />
            <span className="value">{config.duration}s</span>
          </div>

          <div className="config-row">
            <label>Intensity</label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={config.intensity}
              onChange={(e) => setConfig(prev => ({ ...prev, intensity: parseFloat(e.target.value) }))}
            />
            <span className="value">{config.intensity.toFixed(1)}</span>
          </div>

          <div className="config-row">
            <label>Easing</label>
            <select
              value={config.easing}
              onChange={(e) => setConfig(prev => ({ ...prev, easing: e.target.value }))}
            >
              {easingOptions.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="config-row">
            <label>FPS</label>
            <select
              value={config.fps}
              onChange={(e) => setConfig(prev => ({ ...prev, fps: parseInt(e.target.value) }))}
            >
              <option value="24">24 fps</option>
              <option value="30">30 fps</option>
              <option value="60">60 fps</option>
            </select>
          </div>

          <div className="config-actions">
            <button
              className="preview-btn"
              onClick={() => onPreview?.(selectedPreset)}
            >
              👁️ Preview
            </button>
            <button
              className="apply-btn"
              onClick={handleApply}
              disabled={isLoading || !inputPath}
            >
              {isLoading ? '⏳ Processing...' : '✨ Apply Animation'}
            </button>
          </div>
        </div>
      )}

      {/* Drop Zone Indicator */}
      {isDragging && (
        <div className="drop-zone-overlay">
          <div className="drop-zone">
            <span className="drop-icon">🎯</span>
            <span>Drop to apply animation</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnimationPresetsPanel;