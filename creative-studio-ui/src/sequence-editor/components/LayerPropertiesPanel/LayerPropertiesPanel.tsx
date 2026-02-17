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

  const handleTransformChange = (
    property: 'position' | 'scale' | 'rotation' | 'anchor',
    value: any
  ) => {
    const currentData = selectedLayer.data as any;
    const currentTransform = currentData.transform || {
      position: { x: 0, y: 0 },
      scale: { x: 1, y: 1 },
      rotation: 0,
      anchor: { x: 0.5, y: 0.5 },
    };

    let newTransform = { ...currentTransform };
    if (typeof value === 'object') {
      newTransform[property] = { ...newTransform[property], ...value };
    } else {
      newTransform[property] = value;
    }

    dispatch(
      updateLayer({
        shotId: shot.id,
        layerId: selectedLayer.id,
        updates: {
          data: {
            ...currentData,
            transform: newTransform,
          },
        },
      })
    );
  };

  const handleAudioChange = (property: string, value: any) => {
    const currentData = selectedLayer.data as any;
    dispatch(
      updateLayer({
        shotId: shot.id,
        layerId: selectedLayer.id,
        updates: {
          data: {
            ...currentData,
            [property]: value,
          },
        },
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

        {/* Transform Section (for Media and Text layers) */}
        {(selectedLayer.type === 'media' || selectedLayer.type === 'text') && (
          <div className="property-section">
            <div
              className="property-section-header"
              onClick={() => toggleSection('transform')}
            >
              <span className="property-section-icon">
                {expandedSections.has('transform') ? '▼' : '▶'}
              </span>
              <span className="property-section-title">Transform</span>
            </div>
            {expandedSections.has('transform') && (
              <div className="property-section-content">
                <div className="property-row">
                  <label className="property-label">Position</label>
                  <div className="property-value-grid">
                    <div className="property-value-pair">
                      <span className="property-unit-label">X</span>
                      <input
                        type="number"
                        className="property-input property-input-small"
                        value={((selectedLayer.data as any).transform?.position?.x ?? 0).toFixed(1)}
                        onChange={(e) => handleTransformChange('position', { x: Number(e.target.value) })}
                        disabled={selectedLayer.locked}
                      />
                    </div>
                    <div className="property-value-pair">
                      <span className="property-unit-label">Y</span>
                      <input
                        type="number"
                        className="property-input property-input-small"
                        value={((selectedLayer.data as any).transform?.position?.y ?? 0).toFixed(1)}
                        onChange={(e) => handleTransformChange('position', { y: Number(e.target.value) })}
                        disabled={selectedLayer.locked}
                      />
                    </div>
                  </div>
                </div>

                <div className="property-row">
                  <label className="property-label">Scale</label>
                  <div className="property-value-grid">
                    <div className="property-value-pair">
                      <span className="property-unit-label">W</span>
                      <input
                        type="number"
                        className="property-input property-input-small"
                        value={Math.round(((selectedLayer.data as any).transform?.scale?.x ?? 1) * 100)}
                        onChange={(e) => handleTransformChange('scale', { x: Number(e.target.value) / 100 })}
                        min={1}
                        max={1000}
                        disabled={selectedLayer.locked}
                      />
                      <span className="property-unit">%</span>
                    </div>
                    <div className="property-value-pair">
                      <span className="property-unit-label">H</span>
                      <input
                        type="number"
                        className="property-input property-input-small"
                        value={Math.round(((selectedLayer.data as any).transform?.scale?.y ?? 1) * 100)}
                        onChange={(e) => handleTransformChange('scale', { y: Number(e.target.value) / 100 })}
                        min={1}
                        max={1000}
                        disabled={selectedLayer.locked}
                      />
                      <span className="property-unit">%</span>
                    </div>
                  </div>
                </div>

                <div className="property-row">
                  <label className="property-label">Rotation</label>
                  <div className="property-value">
                    <input
                      type="range"
                      className="property-slider"
                      value={(selectedLayer.data as any).transform?.rotation ?? 0}
                      onChange={(e) => handleTransformChange('rotation', Number(e.target.value))}
                      min={-180}
                      max={180}
                      disabled={selectedLayer.locked}
                    />
                    <input
                      type="number"
                      className="property-input property-input-small"
                      value={(selectedLayer.data as any).transform?.rotation ?? 0}
                      onChange={(e) => handleTransformChange('rotation', Number(e.target.value))}
                      min={-180}
                      max={180}
                      disabled={selectedLayer.locked}
                    />
                    <span className="property-unit">°</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Text Style Section (New for R&D) */}
        {selectedLayer.type === 'text' && (
          <div className="property-section">
            <div
              className="property-section-header"
              onClick={() => toggleSection('textStyle')}
            >
              <span className="property-section-icon">
                {expandedSections.has('textStyle') ? '▼' : '▶'}
              </span>
              <span className="property-section-title">Text Style</span>
            </div>
            {expandedSections.has('textStyle') && (
              <div className="property-section-content">
                {/* Font Family */}
                <div className="property-row">
                  <label className="property-label">Font</label>
                  <div className="property-value">
                    <select
                      className="property-select"
                      value={(selectedLayer.data as any).style?.fontFamily || (selectedLayer.data as any).font || 'Arial'}
                      onChange={(e) => {
                        const currentData = selectedLayer.data as any;
                        const currentStyle = currentData.style || {};
                        const newStyle = { ...currentStyle, fontFamily: e.target.value };

                        dispatch(
                          updateLayer({
                            shotId: shot.id,
                            layerId: selectedLayer.id,
                            updates: {
                              data: {
                                ...currentData,
                                style: newStyle,
                                font: e.target.value // Legacy sync
                              },
                            },
                          })
                        );
                      }}
                      disabled={selectedLayer.locked}
                    >
                      <option value="Arial">Arial</option>
                      <option value="Helvetica">Helvetica</option>
                      <option value="Times New Roman">Times New Roman</option>
                      <option value="Courier New">Courier New</option>
                      <option value="Impact">Impact</option>
                      <option value="Inter">Inter</option>
                      <option value="Roboto">Roboto</option>
                    </select>
                  </div>
                </div>

                {/* Font Weight */}
                <div className="property-row">
                  <label className="property-label">Weight</label>
                  <div className="property-value">
                    <select
                      className="property-select"
                      value={(selectedLayer.data as any).style?.fontWeight || 'normal'}
                      onChange={(e) => {
                        const currentData = selectedLayer.data as any;
                        const currentStyle = currentData.style || {};
                        const newStyle = { ...currentStyle, fontWeight: e.target.value };

                        dispatch(
                          updateLayer({
                            shotId: shot.id,
                            layerId: selectedLayer.id,
                            updates: { data: { ...currentData, style: newStyle } },
                          })
                        );
                      }}
                      disabled={selectedLayer.locked}
                    >
                      <option value="normal">Normal</option>
                      <option value="bold">Bold</option>
                      <option value="100">Thin</option>
                      <option value="300">Light</option>
                      <option value="900">Black</option>
                    </select>
                  </div>
                </div>

                {/* Font Size */}
                <div className="property-row">
                  <label className="property-label">Size</label>
                  <div className="property-value">
                    <input
                      type="number"
                      className="property-input"
                      value={(selectedLayer.data as any).style?.fontSize || (selectedLayer.data as any).size || 24}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        const currentData = selectedLayer.data as any;
                        const currentStyle = currentData.style || {};
                        const newStyle = { ...currentStyle, fontSize: val };

                        dispatch(
                          updateLayer({
                            shotId: shot.id,
                            layerId: selectedLayer.id,
                            updates: {
                              data: {
                                ...currentData,
                                style: newStyle,
                                size: val // Legacy sync
                              },
                            },
                          })
                        );
                      }}
                      min={1}
                      disabled={selectedLayer.locked}
                    />
                    <span className="property-unit">px</span>
                  </div>
                </div>

                {/* Colors */}
                <div className="property-row">
                  <label className="property-label">Color</label>
                  <div className="property-value">
                    <input
                      type="color"
                      className="property-color-picker"
                      value={(selectedLayer.data as any).style?.fillColor || (selectedLayer.data as any).color || '#ffffff'}
                      onChange={(e) => {
                        const val = e.target.value;
                        const currentData = selectedLayer.data as any;
                        const currentStyle = currentData.style || {};
                        const newStyle = { ...currentStyle, fillColor: val };

                        dispatch(
                          updateLayer({
                            shotId: shot.id,
                            layerId: selectedLayer.id,
                            updates: {
                              data: {
                                ...currentData,
                                style: newStyle,
                                color: val // Legacy sync
                              },
                            },
                          })
                        );
                      }}
                      disabled={selectedLayer.locked}
                    />
                  </div>
                </div>

                {/* Stroke */}
                <div className="property-row">
                  <label className="property-label">Stroke</label>
                  <div className="property-value-grid">
                    <input
                      type="color"
                      className="property-color-picker"
                      value={(selectedLayer.data as any).style?.strokeColor || '#000000'}
                      onChange={(e) => {
                        const val = e.target.value;
                        const currentData = selectedLayer.data as any;
                        const currentStyle = currentData.style || {};
                        const newStyle = { ...currentStyle, strokeColor: val };
                        dispatch(updateLayer({ shotId: shot.id, layerId: selectedLayer.id, updates: { data: { ...currentData, style: newStyle } } }));
                      }}
                      disabled={selectedLayer.locked}
                    />
                    <div className="property-value-pair">
                      <span className="property-unit-label">W</span>
                      <input
                        type="number"
                        className="property-input property-input-small"
                        value={(selectedLayer.data as any).style?.strokeWidth || 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          const currentData = selectedLayer.data as any;
                          const currentStyle = currentData.style || {};
                          const newStyle = { ...currentStyle, strokeWidth: val };
                          dispatch(updateLayer({ shotId: shot.id, layerId: selectedLayer.id, updates: { data: { ...currentData, style: newStyle } } }));
                        }}
                        min={0}
                        disabled={selectedLayer.locked}
                      />
                    </div>
                  </div>
                </div>

                {/* Alignment */}
                <div className="property-row">
                  <label className="property-label">Align</label>
                  <div className="property-value layer-properties-quick-actions" style={{ justifyContent: 'flex-start' }}>
                    {['left', 'center', 'right'].map((align) => (
                      <button
                        key={align}
                        className={`quick-action-button ${((selectedLayer.data as any).style?.textAlign || 'left') === align ? 'active' : ''}`}
                        onClick={() => {
                          const currentData = selectedLayer.data as any;
                          const currentStyle = currentData.style || {};
                          const newStyle = { ...currentStyle, textAlign: align };
                          dispatch(updateLayer({ shotId: shot.id, layerId: selectedLayer.id, updates: { data: { ...currentData, style: newStyle } } }));
                        }}
                      >
                        {align === 'left' ? 'L' : align === 'center' ? 'C' : 'R'}
                      </button>
                    ))}
                  </div>
                </div>


              </div>
            )}
          </div>
        )}

        {/* Audio Section (for Audio layers) */}
        {selectedLayer.type === 'audio' && (
          <div className="property-section">
            <div
              className="property-section-header"
              onClick={() => toggleSection('audio')}
            >
              <span className="property-section-icon">
                {expandedSections.has('audio') ? '▼' : '▶'}
              </span>
              <span className="property-section-title">Audio</span>
            </div>
            {expandedSections.has('audio') && (
              <div className="property-section-content">
                <div className="property-row">
                  <label className="property-label">Volume</label>
                  <div className="property-value">
                    <input
                      type="range"
                      className="property-slider"
                      value={Math.round(((selectedLayer.data as any).volume ?? 1) * 100)}
                      onChange={(e) => handleAudioChange('volume', Number(e.target.value) / 100)}
                      min={0}
                      max={200}
                      disabled={selectedLayer.locked}
                    />
                    <input
                      type="number"
                      className="property-input property-input-small"
                      value={Math.round(((selectedLayer.data as any).volume ?? 1) * 100)}
                      onChange={(e) => handleAudioChange('volume', Number(e.target.value) / 100)}
                      min={0}
                      max={200}
                      disabled={selectedLayer.locked}
                    />
                    <span className="property-unit">%</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Layer Data Section (Now optional/advanced) */}
        <div className="property-section">
          <div
            className="property-section-header"
            onClick={() => toggleSection('data')}
          >
            <span className="property-section-icon">
              {expandedSections.has('data') ? '▼' : '▶'}
            </span>
            <span className="property-section-title">Advanced Data</span>
          </div>
          {expandedSections.has('data') && (
            <div className="property-section-content">
              <div className="property-data-preview">
                <pre>{JSON.stringify(selectedLayer.data, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div >
  );
};
