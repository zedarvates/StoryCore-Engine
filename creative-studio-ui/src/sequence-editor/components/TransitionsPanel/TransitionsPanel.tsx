/**
 * Transitions Panel Component
 * 
 * Provides UI for selecting and applying video transitions between clips.
 * Supports 17 transition types from the backend transitions_service.py.
 * 
 * Requirements: Phase 3 - Implement missing UI controls
 * Phase 2 - Connected to Redux store
 */

import React, { useState, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import { addTransition, removeTransition } from '../../store/slices/timelineSlice';
import './transitionsPanel.css';

// Transition types matching backend TransitionType enum
export type TransitionType = 
  | 'cut'
  | 'dissolve'
  | 'crossfade'
  | 'fade_black'
  | 'fade_white'
  | 'wipe_left'
  | 'wipe_right'
  | 'wipe_up'
  | 'wipe_down'
  | 'slide_left'
  | 'slide_right'
  | 'slide_up'
  | 'slide_down'
  | 'zoom_in'
  | 'zoom_out'
  | 'iris'
  | 'pixelate';

interface TransitionInfo {
  type: TransitionType;
  name: string;
  description: string;
  minDuration: number;
  maxDuration: number;
  icon: string;
  category: 'basic' | 'fade' | 'wipe' | 'slide' | 'zoom' | 'special';
}

const TRANSITIONS: TransitionInfo[] = [
  { type: 'cut', name: 'Cut', description: 'Instant cut to next clip', minDuration: 0, maxDuration: 0, icon: '✂️', category: 'basic' },
  { type: 'dissolve', name: 'Dissolve', description: 'Fade through black', minDuration: .5, maxDuration: 3., icon: '💧', category: 'fade' },
  { type: 'crossfade', name: 'Crossfade', description: 'Smooth blend between clips', minDuration: .5, maxDuration: 2., icon: '🌫️', category: 'fade' },
  { type: 'fade_black', name: 'Fade to Black', description: 'Fade out to black', minDuration: .5, maxDuration: 2., icon: '⬛', category: 'fade' },
  { type: 'fade_white', name: 'Fade to White', description: 'Fade out to white', minDuration: .5, maxDuration: 2., icon: '⬜', category: 'fade' },
  { type: 'wipe_left', name: 'Wipe Left', description: 'Wipe from right to left', minDuration: 0.3, maxDuration: 1.5, icon: '⬅️', category: 'wipe' },
  { type: 'wipe_right', name: 'Wipe Right', description: 'Wipe from left to right', minDuration: 0.3, maxDuration: 1.5, icon: '➡️', category: 'wipe' },
  { type: 'wipe_up', name: 'Wipe Up', description: 'Wipe from bottom to top', minDuration: 0.3, maxDuration: 1.5, icon: '⬆️', category: 'wipe' },
  { type: 'wipe_down', name: 'Wipe Down', description: 'Wipe from top to bottom', minDuration: 0.3, maxDuration: 1.5, icon: '⬇️', category: 'wipe' },
  { type: 'slide_left', name: 'Slide Left', description: 'Push clip from right', minDuration: 0.3, maxDuration: 1.5, icon: '<<', category: 'slide' },
  { type: 'slide_right', name: 'Slide Right', description: 'Push clip from left', minDuration: 0.3, maxDuration: 1.5, icon: '>>', category: 'slide' },
  { type: 'slide_up', name: 'Slide Up', description: 'Push clip from bottom', minDuration: 0.3, maxDuration: 1.5, icon: '^^', category: 'slide' },
  { type: 'slide_down', name: 'Slide Down', description: 'Push clip from top', minDuration: 0.3, maxDuration: 1.5, icon: 'vv', category: 'slide' },
  { type: 'zoom_in', name: 'Zoom In', description: 'Zoom into next clip', minDuration: .5, maxDuration: 2., icon: '🔍+', category: 'zoom' },
  { type: 'zoom_out', name: 'Zoom Out', description: 'Zoom out to reveal next clip', minDuration: .5, maxDuration: 2., icon: '🔍-', category: 'zoom' },
  { type: 'iris', name: 'Iris', description: 'Circular wipe effect', minDuration: 0.3, maxDuration: 1.5, icon: '⭕', category: 'special' },
  { type: 'pixelate', name: 'Pixelate', description: 'Pixelation transition', minDuration: 0.3, maxDuration: 1.5, icon: '🔲', category: 'special' },
];

interface TransitionsPanelProps {
  clipId?: string;
  position?: 'in' | 'out';
}

export const TransitionsPanel: React.FC<TransitionsPanelProps> = ({ 
  clipId, 
  position = 'out' 
}) => {
  const dispatch = useAppDispatch();
  const selectedElements = useAppSelector((state) => state.timeline.selectedElements);
  
  // Get selected clip
  const selectedClipId = clipId || (selectedElements.length > 0 ? selectedElements[0] : null);
  
  // Local state
  const [selectedTransition, setSelectedTransition] = useState<TransitionType>('dissolve');
  const [duration, setDuration] = useState(1.);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Get current transition for selected clip (from backend)
  const currentTransition = useCallback((clipId: string, pos: string) => {
    // In production, get from Redux store
    return null;
  }, []);
  
  // Filter transitions by category and search
  const filteredTransitions = TRANSITIONS.filter(t => {
    const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         t.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });
  
  // Handle apply transition
  const handleApplyTransition = useCallback(async () => {
    if (!selectedClipId) return;
    
    try {
      // Call backend API to apply transition
      const response = await fetch('/api/timeline/transitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clip_id: selectedClipId,
          transition_type: selectedTransition,
          position,
          duration,
        }),
      });
      
      if (response.ok) {
        // Update Redux store
        dispatch(addTransition({
          clipId: selectedClipId,
          transitionType: selectedTransition,
          position,
          duration,
        }));
      }
    } catch (error) {
      console.error('Failed to apply transition:', error);
    }
  }, [selectedClipId, selectedTransition, position, duration, dispatch]);
  
  // Handle remove transition
  const handleRemoveTransition = useCallback(async () => {
    if (!selectedClipId) return;
    
    try {
      const response = await fetch(`/api/timeline/transitions/${selectedClipId}/${position}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        dispatch(removeTransition({
          clipId: selectedClipId,
          position,
        }));
      }
    } catch (error) {
      console.error('Failed to remove transition:', error);
    }
  }, [selectedClipId, position, dispatch]);
  
  // Get categories
  const categories = [
    { id: 'all', label: 'All' },
    { id: 'basic', label: 'Basic' },
    { id: 'fade', label: 'Fade' },
    { id: 'wipe', label: 'Wipe' },
    { id: 'slide', label: 'Slide' },
    { id: 'zoom', label: 'Zoom' },
    { id: 'special', label: 'Special' },
  ];
  
  // Get current transition info
  const currentTransitionInfo = currentTransition(selectedClipId || '', position);
  const selectedTransitionInfo = TRANSITIONS.find(t => t.type === selectedTransition);
  
  return (
    <div className="transitions-panel">
      <div className="transitions-panel-header">
        <h3>Transitions</h3>
        <span className="position-badge">{position === 'in' ? 'In' : 'Out'}</span>
      </div>
      
      {/* Search */}
      <div className="transitions-search">
        <input
          type="text"
          placeholder="Search transitions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="transitions-search-input"
        />
      </div>
      
      {/* Category Filter */}
      <div className="transitions-categories">
        {categories.map(cat => (
          <button
            key={cat.id}
            className={`category-btn ${selectedCategory === cat.id ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat.id)}
          >
            {cat.label}
          </button>
        ))}
      </div>
      
      {/* Transitions Grid */}
      <div className="transitions-grid">
        {filteredTransitions.map(transition => (
          <button
            key={transition.type}
            className={`transition-item ${selectedTransition === transition.type ? 'selected' : ''}`}
            onClick={() => setSelectedTransition(transition.type)}
            title={transition.description}
          >
            <span className="transition-icon">{transition.icon}</span>
            <span className="transition-name">{transition.name}</span>
          </button>
        ))}
      </div>
      
      {/* Duration Slider */}
      {selectedTransitionInfo && selectedTransitionInfo.minDuration > 0 && (
        <div className="transition-duration">
          <label>
            Duration: {duration.toFixed(1)}s
          </label>
          <input
            type="range"
            min={selectedTransitionInfo.minDuration}
            max={selectedTransitionInfo.maxDuration}
            step={0.1}
            value={duration}
            onChange={(e) => setDuration(Number.parseFloat(e.target.value))}
            className="duration-slider"
            aria-label="Transition duration"
          />
          <div className="duration-range">
            <span>{selectedTransitionInfo.minDuration}s</span>
            <span>{selectedTransitionInfo.maxDuration}s</span>
          </div>
        </div>
      )}
      
      {/* Preview Description */}
      {selectedTransitionInfo && (
        <div className="transition-preview">
          <p>{selectedTransitionInfo.description}</p>
        </div>
      )}
      
      {/* Action Buttons */}
      <div className="transitions-actions">
        <button
          className="remove-transition-btn"
          onClick={handleRemoveTransition}
          disabled={!selectedClipId || !currentTransitionInfo}
        >
          Remove
        </button>
        <button
          className="apply-transition-btn"
          onClick={handleApplyTransition}
          disabled={!selectedClipId}
        >
          Apply
        </button>
      </div>
    </div>
  );
};

export default TransitionsPanel;

