/**
 * Lighting Rig Library Component
 * 
 * Displays a library of lighting rig presets organized by mood.
 */

import React, { useState, useMemo } from 'react';
import { LightingRig, lightingRigService } from '../../services/lightingRigService';
import { LightingRigPreview } from '../LightingRigPreview';
import './lightingRigLibrary.css';

export interface LightingRigLibraryProps {
  onRigSelect?: (rig: LightingRig) => void;
  selectedRigId?: string;
  showSearch?: boolean;
}

export const LightingRigLibrary: React.FC<LightingRigLibraryProps> = ({
  onRigSelect,
  selectedRigId,
  showSearch = true
}) => {
  const [selectedMood, setSelectedMood] = useState<LightingRig['mood'] | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const moods = useMemo(() => lightingRigService.getAvailableMoods(), []);

  const filteredRigs = useMemo(() => {
    let rigs = lightingRigService.getAllRigs();

    // Filter by mood
    if (selectedMood !== 'all') {
      rigs = lightingRigService.getRigsByMood(selectedMood);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      rigs = lightingRigService.searchRigs(searchQuery);
    }

    return rigs;
  }, [selectedMood, searchQuery]);

  const handleMoodChange = (mood: LightingRig['mood'] | 'all') => {
    setSelectedMood(mood);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleRigSelect = (rig: LightingRig) => {
    if (onRigSelect) {
      onRigSelect(rig);
    }
  };

  return (
    <div className="lighting-rig-library">
      <div className="lighting-rig-library__header">
        <h2 className="lighting-rig-library__title">Lighting Rigs</h2>
        
        {showSearch && (
          <div className="lighting-rig-library__search">
            <input
              type="text"
              className="lighting-rig-library__search-input"
              placeholder="Search lighting rigs..."
              value={searchQuery}
              onChange={handleSearchChange}
              aria-label="Search lighting rigs"
            />
          </div>
        )}
      </div>

      <div className="lighting-rig-library__filters">
        <button
          className={`lighting-rig-library__filter-button ${
            selectedMood === 'all' ? 'active' : ''
          }`}
          onClick={() => handleMoodChange('all')}
          aria-pressed={selectedMood === 'all'}
        >
          All
        </button>
        {moods.map((mood) => (
          <button
            key={mood}
            className={`lighting-rig-library__filter-button ${
              selectedMood === mood ? 'active' : ''
            }`}
            onClick={() => handleMoodChange(mood)}
            aria-pressed={selectedMood === mood}
          >
            {mood.charAt(0).toUpperCase() + mood.slice(1)}
          </button>
        ))}
      </div>

      <div className="lighting-rig-library__grid">
        {filteredRigs.length > 0 ? (
          filteredRigs.map((rig) => (
            <LightingRigPreview
              key={rig.id}
              rig={rig}
              onSelect={handleRigSelect}
              selected={rig.id === selectedRigId}
              showMetadata={true}
            />
          ))
        ) : (
          <div className="lighting-rig-library__empty">
            <p>No lighting rigs found</p>
            {searchQuery && (
              <button
                className="lighting-rig-library__clear-search"
                onClick={() => setSearchQuery('')}
              >
                Clear search
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
