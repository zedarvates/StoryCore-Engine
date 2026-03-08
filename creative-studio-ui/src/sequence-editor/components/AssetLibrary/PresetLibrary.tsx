/**
 * Preset Library Component
 * 
 * Displays and manages custom user presets within the Asset Library.
 * Allows applying, deleting, and renaming presets.
 */

import React from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import { selectAllPresets, removePreset } from '../../store/slices/presetsSlice';
import { addMultipleEffects } from '../../store/slices/effectsSlice';
import { CustomPreset } from '../../types';
import './assetLibrary.css'; // Reusing asset library styles

export const PresetLibrary: React.FC = () => {
  const dispatch = useAppDispatch();
  const presets = useAppSelector(selectAllPresets);
  const { selectedElements } = useAppSelector((state) => state.timeline);
  const selectedClipId = selectedElements.length > 0 ? selectedElements[0] : null;

  const handleApplyPreset = (preset: CustomPreset) => {
    if (!selectedClipId) {
      alert('Please select a shot on the timeline first.');
      return;
    }

    if (preset.type === 'effects') {
      const effectsData = preset.data as Array<{ effectId: string }>;
      // We need to map applied effects to just effect IDs for the bulk add
      const effectIds = effectsData.map(e => e.effectId);
      dispatch(addMultipleEffects({ shotId: selectedClipId, effectIds }));
    } else if (preset.type === 'export') {
      alert('Export presets can be applied in the Export Panel.');
      // Future: Navigate to export panel and apply settings
    }
  };

  const handleDeletePreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this preset?')) {
      dispatch(removePreset(id));
    }
  };

  if (presets.length === 0) {
    return (
      <div className="preset-empty-state">
        <div className="empty-icon">💾</div>
        <h3>No presets yet</h3>
        <p>Save configurations from the Effects or Export panels to see them here.</p>
      </div>
    );
  }

  return (
    <div className="preset-grid">
      {presets.map((preset) => (
        <div 
          key={preset.id} 
          className={`preset-card ${preset.type}`}
          onClick={() => handleApplyPreset(preset)}
        >
          <div className="preset-header">
            <span className="preset-type-tag">{preset.type}</span>
            <button 
              className="preset-delete-btn"
              onClick={(e) => handleDeletePreset(preset.id, e)}
              title="Delete preset"
            >
              ×
            </button>
          </div>
          <div className="preset-card-content">
            <div className="preset-icon">
              {preset.type === 'effects' ? '✨' : preset.type === 'export' ? '📤' : '🎵'}
            </div>
            <span className="preset-card-name" title={preset.name}>{preset.name}</span>
            <span className="preset-date">
              {new Date(preset.createdAt).toLocaleDateString()}
            </span>
          </div>
          <div className="preset-overlay">
            <span>Apply Preset</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PresetLibrary;
