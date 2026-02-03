/**
 * Lighting Rig Controls Component
 * 
 * Provides controls for applying and adjusting lighting rigs in shot configuration.
 */

import React, { useState } from 'react';
import {
  LightingRig,
  LightingRigParameters,
  LightConfiguration,
  lightingRigService
} from '../../services/lightingRigService';
import { LightingRigLibrary } from '../LightingRigLibrary';
import './lightingRigControls.css';

export interface LightingRigControlsProps {
  shotId: string;
  currentRig?: LightingRig;
  currentParameters?: LightingRigParameters;
  onRigApply: (shotId: string, rig: LightingRig, parameters: LightingRigParameters) => void;
  onParametersChange: (shotId: string, parameters: LightingRigParameters) => void;
}

export const LightingRigControls: React.FC<LightingRigControlsProps> = ({
  shotId,
  currentRig,
  currentParameters,
  onRigApply,
  onParametersChange
}) => {
  const [showLibrary, setShowLibrary] = useState(false);
  const [selectedLightId, setSelectedLightId] = useState<string | null>(null);

  const handleRigSelect = (rig: LightingRig) => {
    const parameters = lightingRigService.applyRigToShot(rig, shotId);
    onRigApply(shotId, rig, parameters);
    setShowLibrary(false);
  };

  const handleLightIntensityChange = (lightId: string, intensity: number) => {
    if (!currentParameters) return;
    
    const updatedParams = lightingRigService.modifyLight(
      currentParameters,
      lightId,
      { intensity }
    );
    onParametersChange(shotId, updatedParams);
  };

  const handleLightColorChange = (lightId: string, color: string) => {
    if (!currentParameters) return;
    
    const updatedParams = lightingRigService.modifyLight(
      currentParameters,
      lightId,
      { color }
    );
    onParametersChange(shotId, updatedParams);
  };

  const handleLightSoftnessChange = (lightId: string, softness: number) => {
    if (!currentParameters) return;
    
    const updatedParams = lightingRigService.modifyLight(
      currentParameters,
      lightId,
      { softness }
    );
    onParametersChange(shotId, updatedParams);
  };

  const handleAmbientIntensityChange = (intensity: number) => {
    if (!currentParameters) return;
    
    const updatedParams = lightingRigService.adjustAmbientLight(
      currentParameters,
      { intensity }
    );
    onParametersChange(shotId, updatedParams);
  };

  const handleShadowIntensityChange = (intensity: number) => {
    if (!currentParameters) return;
    
    const updatedParams = lightingRigService.adjustShadows(
      currentParameters,
      { intensity }
    );
    onParametersChange(shotId, updatedParams);
  };

  const handleShadowSoftnessChange = (softness: number) => {
    if (!currentParameters) return;
    
    const updatedParams = lightingRigService.adjustShadows(
      currentParameters,
      { softness }
    );
    onParametersChange(shotId, updatedParams);
  };

  const selectedLight = currentParameters?.lights.find(
    light => light.id === selectedLightId
  );

  return (
    <div className="lighting-rig-controls">
      <div className="lighting-rig-controls__header">
        <h3 className="lighting-rig-controls__title">Lighting Rig</h3>
        <button
          className="lighting-rig-controls__browse-button"
          onClick={() => setShowLibrary(!showLibrary)}
          aria-label="Browse lighting rigs"
        >
          {showLibrary ? 'Close Library' : 'Browse Rigs'}
        </button>
      </div>

      {showLibrary && (
        <div className="lighting-rig-controls__library">
          <LightingRigLibrary
            onRigSelect={handleRigSelect}
            selectedRigId={currentRig?.id}
            showSearch={true}
          />
        </div>
      )}

      {currentRig && currentParameters && (
        <div className="lighting-rig-controls__current">
          <div className="lighting-rig-controls__current-info">
            <div className="lighting-rig-controls__current-name">
              {currentRig.name}
            </div>
            <div className="lighting-rig-controls__current-mood">
              {currentRig.mood}
            </div>
          </div>

          {/* Individual Lights */}
          <div className="lighting-rig-controls__section">
            <h4 className="lighting-rig-controls__section-title">
              Lights ({currentParameters.lights.length})
            </h4>
            <div className="lighting-rig-controls__lights-list">
              {currentParameters.lights.map((light) => (
                <div
                  key={light.id}
                  className={`lighting-rig-controls__light-item ${
                    selectedLightId === light.id ? 'selected' : ''
                  }`}
                  onClick={() => setSelectedLightId(light.id)}
                >
                  <div className="lighting-rig-controls__light-header">
                    <span className="lighting-rig-controls__light-type">
                      {light.type}
                    </span>
                    <span className="lighting-rig-controls__light-intensity">
                      {light.intensity}%
                    </span>
                  </div>
                  
                  {selectedLightId === light.id && (
                    <div className="lighting-rig-controls__light-controls">
                      <div className="lighting-rig-controls__control-group">
                        <label className="lighting-rig-controls__label">
                          Intensity
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={light.intensity}
                          onChange={(e) =>
                            handleLightIntensityChange(light.id, Number(e.target.value))
                          }
                          className="lighting-rig-controls__slider"
                        />
                        <span className="lighting-rig-controls__value">
                          {light.intensity}%
                        </span>
                      </div>

                      <div className="lighting-rig-controls__control-group">
                        <label className="lighting-rig-controls__label">
                          Color
                        </label>
                        <input
                          type="color"
                          value={light.color}
                          onChange={(e) =>
                            handleLightColorChange(light.id, e.target.value)
                          }
                          className="lighting-rig-controls__color-picker"
                        />
                      </div>

                      <div className="lighting-rig-controls__control-group">
                        <label className="lighting-rig-controls__label">
                          Softness
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={light.softness}
                          onChange={(e) =>
                            handleLightSoftnessChange(light.id, Number(e.target.value))
                          }
                          className="lighting-rig-controls__slider"
                        />
                        <span className="lighting-rig-controls__value">
                          {light.softness}%
                        </span>
                      </div>

                      <div className="lighting-rig-controls__control-group">
                        <label className="lighting-rig-controls__label">
                          Color Temperature
                        </label>
                        <span className="lighting-rig-controls__value">
                          {light.colorTemperature}K
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Ambient Light */}
          <div className="lighting-rig-controls__section">
            <h4 className="lighting-rig-controls__section-title">
              Ambient Light
            </h4>
            <div className="lighting-rig-controls__control-group">
              <label className="lighting-rig-controls__label">
                Intensity
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={currentParameters.ambientLight.intensity}
                onChange={(e) =>
                  handleAmbientIntensityChange(Number(e.target.value))
                }
                className="lighting-rig-controls__slider"
              />
              <span className="lighting-rig-controls__value">
                {currentParameters.ambientLight.intensity}%
              </span>
            </div>
          </div>

          {/* Shadows */}
          <div className="lighting-rig-controls__section">
            <h4 className="lighting-rig-controls__section-title">
              Shadows
            </h4>
            <div className="lighting-rig-controls__control-group">
              <label className="lighting-rig-controls__label">
                Intensity
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={currentParameters.shadows.intensity}
                onChange={(e) =>
                  handleShadowIntensityChange(Number(e.target.value))
                }
                className="lighting-rig-controls__slider"
              />
              <span className="lighting-rig-controls__value">
                {currentParameters.shadows.intensity}%
              </span>
            </div>

            <div className="lighting-rig-controls__control-group">
              <label className="lighting-rig-controls__label">
                Softness
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={currentParameters.shadows.softness}
                onChange={(e) =>
                  handleShadowSoftnessChange(Number(e.target.value))
                }
                className="lighting-rig-controls__slider"
              />
              <span className="lighting-rig-controls__value">
                {currentParameters.shadows.softness}%
              </span>
            </div>
          </div>
        </div>
      )}

      {!currentRig && (
        <div className="lighting-rig-controls__empty">
          <p>No lighting rig applied</p>
          <button
            className="lighting-rig-controls__browse-button"
            onClick={() => setShowLibrary(true)}
          >
            Browse Lighting Rigs
          </button>
        </div>
      )}
    </div>
  );
};
