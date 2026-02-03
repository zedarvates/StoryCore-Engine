/**
 * LayerPropertiesPanel Component - Controls for layer properties
 * Requirements: 9.4, 9.5, 9.6
 * 
 * Provides UI for:
 * - Layer selection and highlighting
 * - Layer lock/hide toggles
 * - Opacity and blend mode controls
 * - Layer reordering within tracks
 */

import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import {
  updateLayer,
  toggleLayerLock,
  toggleLayerHidden,
  setLayerOpacity,
  setLayerBlendMode,
} from '../../store/slices/timelineSlice';
import type { Layer, Shot } from '../../types';
import './layerPropertiesPanel.css';

interface LayerPropertiesPanelProps {
  shot: Shot;
  selectedLayerId: string | null;
}

// Available blend modes
const BLEND_MODES = [
  'normal',
  'multiply',
  'screen',
  'overlay',
  'darken',
  'lighten',
  'color-dodge',
  'color-burn',
  'hard-light',
  'soft-light',
  'difference',
  'exclusion',
  'hue',
  'saturation',
  'color',
  'luminosity',
];

export const LayerPropertiesPanel: React.FC<LayerPropertiesPanelProps> = ({
  shot,
  selectedLayerId,
}) => {
  const dispatch = useDispatch();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['general', 'appearance'])
  );

  const selectedLayer = selectedLayerId
    ? shot.layers.find((l) => l.id === selectedLayerId)
    : null;

  if (!selectedLayer) {
    return (
      <div className="layer-properties-panel">
        <div className="layer-properties-empty">
          <p>No layer selected</p>
          <p className="layer-properties-empty-hint">
            Select a layer to view and edit its properties
          </p>
        </div>
      </div>
    );
  }

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const handleOpacityChange = (value: number) => {
    dispatch(
      setLayerOpacity({
        shotId: shot.id,
        layerId: selectedLayer.id,
        opacity: value / 100,
      })
    );
  };

  const handleBlendModeChange = (blendMode: string) => {
    dispatch(
      setLayerBlendMode({
        shotId: shot.id,
        layerId: selectedLayer.id,
        blendMode,
      })
    );
  };

  const handleToggleLock = () => {
    dispatch(toggleLayerLock({ shotId: shot.id, layerId: selectedLayer.id }));
  };

  const handleToggleHidden = () => {
    dispatch(toggleLayerHidden({ shotId: shot.id, layerId: selectedLayer.id }));
  };

  const handleStartTimeChange = (value: number) => {
    dispatch(
      updateLayer({
        shotId: shot.id,
        layerId: selectedLayer.id,
        updates: { startTime: Math.max(0, value) },
      })
    );
  };

  const handleDurationChange = (value: number) => {
    dispatch(
      updateLayer({
        shotId: shot.id,
        layerId: selectedLayer.id,
        updates: { duration: Math.max(1, value) },
      })
    );
  };

  return (
    <div className="layer-properties-panel">
      <div className="layer-properties-header">
        <h3>Layer Properties</h3>
        <div className="layer-properties-quick-actions">
          <button
            className={`quick-action-button ${selectedLayer.locked ? 'active' : ''}`}
            onClick={handleToggleLock}
            title={selectedLayer.locked ? 'Unlock Layer' : 'Lock Layer'}
          >
            {selectedLayer.locked ? '🔒' : '🔓'}
          </button>
          <button
            className={`quick-action-button ${selectedLayer.hidden ? 'active' : ''}`}
            onClick={handleToggleHidden}
            title={selectedLayer.hidden ? 'Show Layer' : 'Hide Layer'}
          >
            {selectedLayer.hidden ? '👁️‍🗨️' : '👁️'}
          </button>
        </div>
      </div>

      <div className="layer-properties-content">
        {/* General Section */}
        <div className="property-section">
          <div
            className="property-section-header"
            onClick={() => toggleSection('general')}
          >
            <span className="property-section-icon">
              {expandedSections.has('general') ? '▼' : '▶'}
            </span>
            <span className="property-section-title">General</span>
          </div>
          {expandedSections.has('general') && (
            <div className="property-section-content">
              <div className="property-row">
                <label className="property-label">Type</label>
                <div className="property-value">
                  <span className="property-badge">{selectedLayer.type}</span>
                </div>
              </div>
              <div className="property-row">
                <label className="property-label">Start Time</label>
                <div className="property-value">
                  <input
                    type="number"
                    className="property-input"
                    value={selectedLayer.startTime}
                    onChange={(e) => handleStartTimeChange(Number(e.target.value))}
                    min={0}
                    disabled={selectedLayer.locked}
                  />
                  <span className="property-unit">frames</span>
                </div>
              </div>
              <div className="property-row">
                <label className="property-label">Duration</label>
                <div className="property-value">
                  <input
                    type="number"
                    className="property-input"
                    value={selectedLayer.duration}
                    onChange={(e) => handleDurationChange(Number(e.target.value))}
                    min={1}
                    disabled={selectedLayer.locked}
                  />
                  <span className="property-unit">frames</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Appearance Section */}
        <div className="property-section">
          <div
            className="property-section-header"
            onClick={() => toggleSection('appearance')}
          >
            <span className="property-section-icon">
              {expandedSections.has('appearance') ? '▼' : '▶'}
            </span>
            <span className="property-section-title">Appearance</span>
          </div>
          {expandedSections.has('appearance') && (
            <div className="property-section-content">
              <div className="property-row">
                <label className="property-label">Opacity</label>
                <div className="property-value">
                  <input
                    type="range"
                    className="property-slider"
                    value={Math.round(selectedLayer.opacity * 100)}
                    onChange={(e) => handleOpacityChange(Number(e.target.value))}
                    min={0}
                    max={100}
                    disabled={selectedLayer.locked}
                  />
                  <input
                    type="number"
                    className="property-input property-input-small"
                    value={Math.round(selectedLayer.opacity * 100)}
                    onChange={(e) => handleOpacityChange(Number(e.target.value))}
                    min={0}
                    max={100}
                    disabled={selectedLayer.locked}
                  />
                  <span className="property-unit">%</span>
                </div>
              </div>
              <div className="property-row">
                <label className="property-label">Blend Mode</label>
                <div className="property-value">
                  <select
                    className="property-select"
                    value={selectedLayer.blendMode}
                    onChange={(e) => handleBlendModeChange(e.target.value)}
                    disabled={selectedLayer.locked}
                  >
                    {BLEND_MODES.map((mode) => (
                      <option key={mode} value={mode}>
                        {mode.charAt(0).toUpperCase() + mode.slice(1).replace('-', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Layer Data Section */}
        <div className="property-section">
          <div
            className="property-section-header"
            onClick={() => toggleSection('data')}
          >
            <span className="property-section-icon">
              {expandedSections.has('data') ? '▼' : '▶'}
            </span>
            <span className="property-section-title">Layer Data</span>
          </div>
          {expandedSections.has('data') && (
            <div className="property-section-content">
              <div className="property-data-preview">
                <pre>{JSON.stringify(selectedLayer.data, null, 2)}</pre>
              </div>
              <p className="property-hint">
                Layer-specific data can be edited through specialized editors
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
