/**
 * PresetPanel - UI for browsing and applying grid presets
 * 
 * Displays a grid of preset thumbnails with hover previews,
 * allows applying presets, saving custom presets, and deleting custom presets.
 */

import React, { useState } from 'react';
import { usePresetStore } from '../../stores/gridEditor/presetStore';
import { useGridEditorStore } from '../../stores/gridEditorStore';
import { Preset } from '../../types/gridEditor';

interface PresetPanelProps {
  onClose?: () => void;
}

export const PresetPanel: React.FC<PresetPanelProps> = ({ onClose }) => {
  const {
    getAllPresets,
    selectPreset,
    selectedPresetId,
    deleteCustomPreset,
    addCustomPreset,
  } = usePresetStore();
  
  const { applyPreset, panels } = useGridEditorStore();
  
  const [hoveredPresetId, setHoveredPresetId] = useState<string | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetDescription, setNewPresetDescription] = useState('');
  
  const allPresets = getAllPresets();
  
  const handleApplyPreset = (preset: Preset) => {
    selectPreset(preset.id);
    applyPreset(preset);
  };
  
  const handleDeletePreset = (presetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (window.confirm('Are you sure you want to delete this custom preset?')) {
      deleteCustomPreset(presetId);
    }
  };
  
  const handleSaveCustomPreset = () => {
    if (!newPresetName.trim()) {
      alert('Please enter a preset name');
      return;
    }
    
    // Create preset from current panel configuration
    const presetData = {
      name: newPresetName.trim(),
      description: newPresetDescription.trim() || 'Custom preset',
      thumbnail: undefined,
      panelTransforms: panels.map(p => p.transform),
      panelCrops: panels.map(p => p.crop),
    };
    
    addCustomPreset(presetData);
    
    // Reset form
    setNewPresetName('');
    setNewPresetDescription('');
    setShowSaveDialog(false);
  };
  
  const isCustomPreset = (presetId: string) => {
    return presetId.startsWith('preset-custom-');
  };
  
  return (
    <div className="preset-panel">
      <div className="preset-panel-header">
        <h2>Grid Presets</h2>
        {onClose && (
          <button
            className="close-button"
            onClick={onClose}
            aria-label="Close preset panel"
          >
            ×
          </button>
        )}
      </div>
      
      <div className="preset-panel-actions">
        <button
          className="save-preset-button"
          onClick={() => setShowSaveDialog(true)}
        >
          Save as Preset
        </button>
      </div>
      
      {showSaveDialog && (
        <div className="save-preset-dialog">
          <h3>Save Custom Preset</h3>
          <div className="form-group">
            <label htmlFor="preset-name">Name:</label>
            <input
              id="preset-name"
              type="text"
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              placeholder="My Custom Preset"
              maxLength={50}
            />
          </div>
          <div className="form-group">
            <label htmlFor="preset-description">Description:</label>
            <textarea
              id="preset-description"
              value={newPresetDescription}
              onChange={(e) => setNewPresetDescription(e.target.value)}
              placeholder="Describe this preset..."
              maxLength={200}
              rows={3}
            />
          </div>
          <div className="dialog-actions">
            <button onClick={handleSaveCustomPreset}>Save</button>
            <button onClick={() => setShowSaveDialog(false)}>Cancel</button>
          </div>
        </div>
      )}
      
      <div className="preset-grid">
        {allPresets.map((preset) => (
          <div
            key={preset.id}
            className={`preset-card ${selectedPresetId === preset.id ? 'selected' : ''} ${
              hoveredPresetId === preset.id ? 'hovered' : ''
            }`}
            onClick={() => handleApplyPreset(preset)}
            onMouseEnter={() => setHoveredPresetId(preset.id)}
            onMouseLeave={() => setHoveredPresetId(null)}
          >
            <div className="preset-thumbnail">
              {preset.thumbnail ? (
                <img src={preset.thumbnail} alt={preset.name} />
              ) : (
                <div className="preset-placeholder">
                  <div className="preset-grid-icon">
                    {/* 3x3 grid icon */}
                    {Array.from({ length: 9 }).map((_, i) => (
                      <div key={i} className="grid-cell" />
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="preset-info">
              <h3 className="preset-name">{preset.name}</h3>
              <p className="preset-description">{preset.description}</p>
            </div>
            
            {isCustomPreset(preset.id) && (
              <button
                className="delete-preset-button"
                onClick={(e) => handleDeletePreset(preset.id, e)}
                aria-label="Delete preset"
                title="Delete this custom preset"
              >
                🗑️
              </button>
            )}
            
            {hoveredPresetId === preset.id && (
              <div className="preset-preview-overlay">
                <span>Click to apply</span>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {allPresets.length === 0 && (
        <div className="empty-state">
          <p>No presets available</p>
        </div>
      )}
    </div>
  );
};
