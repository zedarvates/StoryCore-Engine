/**
 * SkyboxPanel Component
 * 
 * Configuration panel for skybox settings including type selection,
 * time of day controls, and intensity adjustment.
 * 
 * File: creative-studio-ui/src/components/location/SkyboxPanel.tsx
 */

import React, { useState, useCallback } from 'react';
import { Sun, Moon, Cloud, Sparkles, Clock, Sliders, Video } from 'lucide-react';
import type { Location, SkyboxType, ShotType, WeatherCondition, SkyBoxConfig } from '@/types/location';
import { getDefaultSkyboxConfig } from '@/types/location';
import './SkyboxPanel.css';

// ============================================================================
// Types
// ============================================================================

/**
 * Props for the SkyboxPanel component
 */
export interface SkyboxPanelProps {
  /** Location being edited */
  location: Location;
  
  /** Handler for updates */
  onUpdate: (updates: Partial<Location>) => void;
}

// ============================================================================
// Component
// ============================================================================

export function SkyboxPanel({
  location,
  onUpdate,
}: SkyboxPanelProps) {
  const [localConfig, setLocalConfig] = useState<SkyBoxConfig>(
    location.skybox_config || getDefaultSkyboxConfig(location.location_type) || {
      type: 'procedural',
      skybox_type: 'clear_day',
      time_of_day: 12,
      intensity: 1.0,
      weather: 'clear',
    }
  );
  
  const skyboxTypes: { id: SkyboxType; label: string; icon: React.ReactNode }[] = [
    { id: 'clear_day', label: 'Clear Day', icon: <Sun size={20} /> },
    { id: 'clear_night', label: 'Clear Night', icon: <Moon size={20} /> },
    { id: 'sunset', label: 'Sunset', icon: <Sun size={20} /> },
    { id: 'sunrise', label: 'Sunrise', icon: <Sun size={20} /> },
    { id: 'overcast', label: 'Overcast', icon: <Cloud size={20} /> },
    { id: 'storm', label: 'Storm', icon: <Cloud size={20} /> },
    { id: 'foggy', label: 'Foggy', icon: <Cloud size={20} /> },
    { id: 'custom', label: 'Custom', icon: <Sparkles size={20} /> },
  ];
  
  const shotTypes: { id: ShotType; label: string }[] = [
    { id: 'plan_sequence', label: 'Plan Séquence' },
    { id: 'choc', label: 'Choc' },
    { id: 'standard', label: 'Standard' },
  ];
  
  const weatherTypes: { id: WeatherCondition; label: string }[] = [
    { id: 'clear', label: 'Clear' },
    { id: 'cloudy', label: 'Cloudy' },
    { id: 'overcast', label: 'Overcast' },
    { id: 'rain', label: 'Rain' },
    { id: 'storm', label: 'Storm' },
    { id: 'fog', label: 'Fog' },
    { id: 'snow', label: 'Snow' },
  ];
  
  const handleConfigUpdate = useCallback((updates: Partial<SkyBoxConfig>) => {
    const newConfig = { ...localConfig, ...updates };
    setLocalConfig(newConfig);
    onUpdate({ skybox_config: newConfig });
  }, [localConfig, onUpdate]);
  
  const handleTimeOfDayChange = useCallback((value: number) => {
    handleConfigUpdate({ time_of_day: value });
  }, [handleConfigUpdate]);
  
  const handleIntensityChange = useCallback((value: number) => {
    handleConfigUpdate({ intensity: value });
  }, [handleConfigUpdate]);
  
  if (location.location_type === 'interior') {
    return (
      <div className="skybox-panel">
        <div className="skybox-panel__interior-message">
          <p>Interior locations don't use skybox settings.</p>
          <p>Skybox is only applicable to exterior locations.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="skybox-panel">
      {/* Sky Type Selector */}
      <div className="skybox-panel__section">
        <h4 className="skybox-panel__section-title">
          <Sun size={16} />
          Sky Type
        </h4>
        
        <div className="skybox-panel__type-grid">
          {skyboxTypes.map((type) => (
            <button
              key={type.id}
              className={`skybox-panel__type-btn ${localConfig.skybox_type === type.id ? 'skybox-panel__type-btn--active' : ''}`}
              onClick={() => handleConfigUpdate({ skybox_type: type.id })}
            >
              {type.icon}
              <span>{type.label}</span>
            </button>
          ))}
        </div>
      </div>
      
      {/* Shot Type */}
      <div className="skybox-panel__section">
        <h4 className="skybox-panel__section-title">
          <Video size={16} />
          Shot Type
        </h4>
        
        <div className="skybox-panel__shot-types">
          {shotTypes.map((shot) => (
            <button
              key={shot.id}
              className={`skybox-panel__shot-btn ${localConfig.shot_type === shot.id ? 'skybox-panel__shot-btn--active' : ''}`}
              onClick={() => handleConfigUpdate({ shot_type: shot.id })}
            >
              {shot.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Time of Day */}
      <div className="skybox-panel__section">
        <h4 className="skybox-panel__section-title">
          <Clock size={16} />
          Time of Day
        </h4>
        
        <div className="skybox-panel__time-control">
          <input
            type="range"
            min="0"
            max="24"
            step="0.5"
            value={localConfig.time_of_day || 12}
            onChange={(e) => handleTimeOfDayChange(parseFloat(e.target.value))}
            className="skybox-panel__time-slider"
            aria-label="Time of day"
          />
          <div className="skybox-panel__time-display">
            <span className="skybox-panel__time-value">
              {localConfig.time_of_day?.toFixed(1) || '12.0'}h
            </span>
            <span className="skybox-panel__time-label">
              {getTimeLabel(localConfig.time_of_day || 12)}
            </span>
          </div>
        </div>
      </div>
      
      {/* Intensity */}
      <div className="skybox-panel__section">
        <h4 className="skybox-panel__section-title">
          <Sliders size={16} />
          Intensity
        </h4>
        
        <div className="skybox-panel__intensity-control">
          <input
            type="range"
            min="0.5"
            max="2.0"
            step="0.1"
            value={localConfig.intensity || 1.0}
            onChange={(e) => handleIntensityChange(parseFloat(e.target.value))}
            className="skybox-panel__intensity-slider"
            aria-label="Light intensity"
          />
          <div className="skybox-panel__intensity-display">
            <span className="skybox-panel__intensity-value">
              {(localConfig.intensity || 1.0).toFixed(1)}x
            </span>
          </div>
        </div>
      </div>
      
      {/* Weather */}
      <div className="skybox-panel__section">
        <h4 className="skybox-panel__section-title">
          <Cloud size={16} />
          Weather
        </h4>
        
        <div className="skybox-panel__weather-select">
          <select
            value={localConfig.weather || 'clear'}
            onChange={(e) => handleConfigUpdate({ weather: e.target.value as WeatherCondition })}
            className="skybox-panel__select"
            aria-label="Weather condition"
          >
            {weatherTypes.map((weather) => (
              <option key={weather.id} value={weather.id}>
                {weather.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Sky Colors */}
      <div className="skybox-panel__section">
        <h4 className="skybox-panel__section-title">
          <Sparkles size={16} />
          Sky Colors
        </h4>
        
        <div className="skybox-panel__colors">
          <div className="skybox-panel__color-input">
            <label>Top</label>
            <input
              type="color"
              value={localConfig.colors?.top || '#87CEEB'}
              onChange={(e) => handleConfigUpdate({
                colors: { ...localConfig.colors!, top: e.target.value }
              })}
              aria-label="Sky top color"
            />
          </div>
          <div className="skybox-panel__color-input">
            <label>Horizon</label>
            <input
              type="color"
              value={localConfig.colors?.horizon || '#E0F6FF'}
              onChange={(e) => handleConfigUpdate({
                colors: { ...localConfig.colors!, horizon: e.target.value }
              })}
              aria-label="Sky horizon color"
            />
          </div>
          <div className="skybox-panel__color-input">
            <label>Bottom</label>
            <input
              type="color"
              value={localConfig.colors?.bottom || '#FFFFFF'}
              onChange={(e) => handleConfigUpdate({
                colors: { ...localConfig.colors!, bottom: e.target.value }
              })}
              aria-label="Sky bottom color"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to get time label
function getTimeLabel(hours: number): string {
  if (hours >= 5 && hours < 7) return 'Dawn';
  if (hours >= 7 && hours < 10) return 'Morning';
  if (hours >= 10 && hours < 14) return 'Noon';
  if (hours >= 14 && hours < 17) return 'Afternoon';
  if (hours >= 17 && hours < 19) return 'Evening';
  if (hours >= 19 && hours < 21) return 'Dusk';
  if (hours >= 21 || hours < 5) return 'Night';
  return '';
}

export default SkyboxPanel;
