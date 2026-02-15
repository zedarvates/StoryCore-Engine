/**
 * Effects Panel Component
 * 
 * Provides UI for video effects and filters:
 * - Filter effects (color correction, blur, etc.)
 * - Effect intensity controls
 * - Enable/disable effects
 * 
 * Requirements: Phase 3 - Add effects UI controls
 * Phase 2 - Connected to Redux store
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import { 
  addEffect, 
  removeEffect, 
  toggleEffect, 
  setEffectIntensity,
  AVAILABLE_EFFECTS,
  selectShotEffects
} from '../../store/slices/effectsSlice';
import './effectsPanel.css';

// =============================================================================
// Types
// =============================================================================

interface Effect {
  id: string;
  name: string;
  category: 'color' | 'blur' | 'stylize' | 'distort' | 'noise';
  description: string;
  icon: string;
}

const EFFECTS: Effect[] = AVAILABLE_EFFECTS.map(e => ({
  id: e.id,
  name: e.name,
  category: e.category,
  description: e.description,
  icon: e.icon
}));

// =============================================================================
// Component
// =============================================================================

export const EffectsPanel: React.FC = () => {
  const dispatch = useAppDispatch();
  const { selectedElements } = useAppSelector((state) => state.timeline);
  
  // Get selected clip ID from timeline state
  const selectedClipId = selectedElements.length > 0 ? selectedElements[0] : null;
  
  // Get effects from Redux store
  const appliedEffects = useAppSelector(state => 
    selectedClipId ? selectShotEffects(state, selectedClipId) : []
  );
  
  // Local state for UI filtering
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Sync selected clip ID with timeline selection
  useEffect(() => {
    if (selectedElements.length > 0) {
      // Update local state when timeline selection changes
    }
  }, [selectedElements]);
  
  // Get effects by category
  const filteredEffects = EFFECTS.filter(effect => {
    const matchesCategory = selectedCategory === 'all' || effect.category === selectedCategory;
    const matchesSearch = effect.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });
  
  // Categories
  const categories = [
    { id: 'all', label: 'All', icon: '✨' },
    { id: 'color', label: 'Color', icon: '🎨' },
    { id: 'blur', label: 'Blur', icon: '🔮' },
    { id: 'stylize', label: 'Stylize', icon: '✨' },
    { id: 'distort', label: 'Distort', icon: '🌊' },
    { id: 'noise', label: 'Noise', icon: '📺' },
  ];
  
  // Handle apply effect - dispatch to Redux
  const handleApplyEffect = useCallback((effectId: string) => {
    if (!selectedClipId) return;
    dispatch(addEffect({ shotId: selectedClipId, effectId, intensity: 50 }));
  }, [dispatch, selectedClipId]);
  
  // Handle remove effect - dispatch to Redux
  const handleRemoveEffect = useCallback((effectId: string) => {
    if (!selectedClipId) return;
    dispatch(removeEffect({ shotId: selectedClipId, effectId }));
  }, [dispatch, selectedClipId]);
  
  // Handle intensity change - dispatch to Redux
  const handleIntensityChange = useCallback((effectId: string, intensity: number) => {
    if (!selectedClipId) return;
    dispatch(setEffectIntensity({ shotId: selectedClipId, effectId, intensity }));
  }, [dispatch, selectedClipId]);
  
  // Handle toggle effect - dispatch to Redux
  const handleToggleEffect = useCallback((effectId: string) => {
    if (!selectedClipId) return;
    dispatch(toggleEffect({ shotId: selectedClipId, effectId }));
  }, [dispatch, selectedClipId]);
  
  // Get applied effect details
  const getAppliedEffectDetails = (effectId: string): Effect | undefined => {
    return EFFECTS.find(e => e.id === effectId);
  };
  
  // Handle save to backend
  const handleSaveEffects = useCallback(async () => {
    if (!selectedClipId) return;
    
    try {
      const response = await fetch('/api/timeline/effects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clip_id: selectedClipId,
          effects: appliedEffects,
        }),
      });
      
      if (response.ok) {
        console.log('Effects saved successfully');
      }
    } catch (error) {
      console.error('Failed to save effects:', error);
    }
  }, [selectedClipId, appliedEffects]);
  
  return (
    <div className="effects-panel">
      <div className="effects-panel-header">
        <h3>Effects</h3>
      </div>
      
      {/* Search */}
      <div className="effects-search">
        <label className="search-label" htmlFor="search-effects">Search effects</label>
        <input
          id="search-effects"
          type="text"
          placeholder="Search effects..."
          title="Search effects"
          aria-label="Search effects"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="effects-search-input"
        />
      </div>
      
      {/* Categories */}
      <div className="effects-categories">
        {categories.map(cat => (
          <button
            key={cat.id}
            className={`category-btn ${selectedCategory === cat.id ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat.id)}
          >
            <span className="category-icon">{cat.icon}</span>
            <span className="category-label">{cat.label}</span>
          </button>
        ))}
      </div>
      
      {/* Effects Grid */}
      <div className="effects-grid">
        {filteredEffects.map(effect => {
          const isApplied = appliedEffects.some(e => e.effectId === effect.id);
          return (
            <button
              key={effect.id}
              className={`effect-item ${isApplied ? 'applied' : ''}`}
              onClick={() => handleApplyEffect(effect.id)}
              title={effect.description}
            >
              <span className="effect-icon">{effect.icon}</span>
              <span className="effect-name">{effect.name}</span>
              {isApplied && <span className="applied-badge">✓</span>}
            </button>
          );
        })}
      </div>
      
      {/* Applied Effects */}
      {appliedEffects.length > 0 && (
        <div className="applied-effects">
          <h4>Applied Effects</h4>
          
          {appliedEffects.map(applied => {
            const details = getAppliedEffectDetails(applied.effectId);
            if (!details) return null;
            
            return (
              <div 
                key={applied.effectId} 
                className={`applied-effect ${applied.enabled ? '' : 'disabled'}`}
              >
                <div className="applied-header">
                  <span className="applied-icon">{details.icon}</span>
                  <span className="applied-name">{details.name}</span>
                  <button
                    className="remove-effect-btn"
                    onClick={() => handleRemoveEffect(applied.effectId)}
                  >
                    ×
                  </button>
                </div>
                
                <div className="applied-controls">
                  <label className="intensity-label" htmlFor={`intensity-${applied.effectId}`}>
                    Intensity: {applied.intensity}%
                  </label>
                  <input
                    id={`intensity-${applied.effectId}`}
                    type="range"
                    min="0"
                    max="100"
                    value={applied.intensity}
                    onChange={(e) => handleIntensityChange(applied.effectId, parseInt(e.target.value))}
                    className="intensity-slider"
                    disabled={!applied.enabled}
                    title="Intensity slider"
                  />
                </div>
                
                <label className="enable-label">
                  <input
                    type="checkbox"
                    checked={applied.enabled}
                    onChange={() => handleToggleEffect(applied.effectId)}
                  />
                  <span>Enabled</span>
                </label>
              </div>
            );
          })}
          
          <button className="save-effects-btn" onClick={handleSaveEffects}>
            Apply Effects
          </button>
        </div>
      )}
    </div>
  );
};

export default EffectsPanel;

