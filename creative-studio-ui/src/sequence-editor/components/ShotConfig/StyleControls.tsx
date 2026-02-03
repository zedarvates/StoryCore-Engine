/**
 * Style Controls Component
 * 
 * Displays and controls visual style settings for a shot including:
 * - Applied style information
 * - Intensity slider
 * - Style parameters
 * - Remove style button
 * 
 * Requirements: 11.2, 11.3, 11.5
 */

import React, { useCallback, useState } from 'react';
import { useAppDispatch } from '../../store';
import {
  updateStyleIntensity,
  updateStyleParameters,
  removeStyleFromShot,
} from '../../store/slices/timelineSlice';
import type { Shot, StyleParameters } from '../../types';
import './styleControls.css';

// ============================================================================
// Props
// ============================================================================

interface StyleControlsProps {
  shot: Shot;
}

// ============================================================================
// Component
// ============================================================================

export const StyleControls: React.FC<StyleControlsProps> = ({ shot }) => {
  const dispatch = useAppDispatch();
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Handle intensity change
  const handleIntensityChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const intensity = parseInt(e.target.value, 10);
      dispatch(updateStyleIntensity({ shotId: shot.id, intensity }));
    },
    [dispatch, shot.id]
  );

  // Handle parameter change
  const handleParameterChange = useCallback(
    (param: keyof StyleParameters, value: number) => {
      dispatch(
        updateStyleParameters({
          shotId: shot.id,
          parameters: { [param]: value },
        })
      );
    },
    [dispatch, shot.id]
  );

  // Handle remove style
  const handleRemoveStyle = useCallback(() => {
    if (window.confirm('Remove visual style from this shot?')) {
      dispatch(removeStyleFromShot(shot.id));
    }
  }, [dispatch, shot.id]);

  // Toggle advanced controls
  const toggleAdvanced = useCallback(() => {
    setShowAdvanced((prev) => !prev);
  }, []);

  if (!shot.visualStyle) {
    return (
      <div className="style-controls-empty">
        <p className="empty-message">
          No visual style applied. Drag a style from the Asset Library to apply.
        </p>
      </div>
    );
  }

  const { styleName, intensity, parameters } = shot.visualStyle;

  return (
    <div className="style-controls">
      <div className="style-controls-header">
        <h3 className="style-controls-title">Visual Style</h3>
        <button
          className="remove-style-btn"
          onClick={handleRemoveStyle}
          title="Remove style"
          aria-label="Remove visual style"
        >
          ✕
        </button>
      </div>

      {/* Style Name */}
      <div className="style-name">
        <span className="style-icon">🎨</span>
        <span className="style-name-text">{styleName}</span>
      </div>

      {/* Intensity Slider */}
      <div className="style-control-group">
        <label htmlFor="style-intensity" className="control-label">
          Intensity
          <span className="control-value">{intensity}%</span>
        </label>
        <input
          id="style-intensity"
          type="range"
          min="0"
          max="100"
          value={intensity}
          onChange={handleIntensityChange}
          className="intensity-slider"
          aria-label="Style intensity"
        />
        <div className="slider-markers">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Color Palette Preview */}
      {parameters.colorPalette && parameters.colorPalette.length > 0 && (
        <div className="style-control-group">
          <label className="control-label">Color Palette</label>
          <div className="color-palette">
            {parameters.colorPalette.map((color, index) => (
              <div
                key={index}
                className="color-swatch"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>
      )}

      {/* Artistic Style */}
      {parameters.artisticStyle && (
        <div className="style-control-group">
          <label className="control-label">Artistic Style</label>
          <div className="artistic-style-badge">{parameters.artisticStyle}</div>
        </div>
      )}

      {/* Advanced Controls Toggle */}
      <button
        className="toggle-advanced-btn"
        onClick={toggleAdvanced}
        aria-expanded={showAdvanced ? "true" : "false"}
      >
        {showAdvanced ? '▼' : '▶'} Advanced Parameters
      </button>

      {/* Advanced Parameters */}
      {showAdvanced && (
        <div className="advanced-parameters">
          {/* Saturation */}
          {parameters.saturation !== undefined && (
            <div className="parameter-control">
              <label htmlFor="param-saturation" className="param-label">
                Saturation
                <span className="param-value">{parameters.saturation}</span>
              </label>
              <input
                id="param-saturation"
                type="range"
                min="0"
                max="100"
                value={parameters.saturation}
                onChange={(e) =>
                  handleParameterChange('saturation', parseInt(e.target.value, 10))
                }
                className="param-slider"
              />
            </div>
          )}

          {/* Contrast */}
          {parameters.contrast !== undefined && (
            <div className="parameter-control">
              <label htmlFor="param-contrast" className="param-label">
                Contrast
                <span className="param-value">{parameters.contrast}</span>
              </label>
              <input
                id="param-contrast"
                type="range"
                min="0"
                max="100"
                value={parameters.contrast}
                onChange={(e) =>
                  handleParameterChange('contrast', parseInt(e.target.value, 10))
                }
                className="param-slider"
              />
            </div>
          )}

          {/* Brightness */}
          {parameters.brightness !== undefined && (
            <div className="parameter-control">
              <label htmlFor="param-brightness" className="param-label">
                Brightness
                <span className="param-value">{parameters.brightness}</span>
              </label>
              <input
                id="param-brightness"
                type="range"
                min="0"
                max="100"
                value={parameters.brightness}
                onChange={(e) =>
                  handleParameterChange('brightness', parseInt(e.target.value, 10))
                }
                className="param-slider"
              />
            </div>
          )}

          {/* Temperature */}
          {parameters.temperature !== undefined && (
            <div className="parameter-control">
              <label htmlFor="param-temperature" className="param-label">
                Temperature
                <span className="param-value">{parameters.temperature}</span>
              </label>
              <input
                id="param-temperature"
                type="range"
                min="0"
                max="100"
                value={parameters.temperature}
                onChange={(e) =>
                  handleParameterChange('temperature', parseInt(e.target.value, 10))
                }
                className="param-slider"
              />
            </div>
          )}

          {/* Vignette */}
          {parameters.vignette !== undefined && (
            <div className="parameter-control">
              <label htmlFor="param-vignette" className="param-label">
                Vignette
                <span className="param-value">{parameters.vignette}</span>
              </label>
              <input
                id="param-vignette"
                type="range"
                min="0"
                max="100"
                value={parameters.vignette}
                onChange={(e) =>
                  handleParameterChange('vignette', parseInt(e.target.value, 10))
                }
                className="param-slider"
              />
            </div>
          )}

          {/* Grain */}
          {parameters.grain !== undefined && (
            <div className="parameter-control">
              <label htmlFor="param-grain" className="param-label">
                Grain
                <span className="param-value">{parameters.grain}</span>
              </label>
              <input
                id="param-grain"
                type="range"
                min="0"
                max="100"
                value={parameters.grain}
                onChange={(e) =>
                  handleParameterChange('grain', parseInt(e.target.value, 10))
                }
                className="param-slider"
              />
            </div>
          )}

          {/* Sharpness */}
          {parameters.sharpness !== undefined && (
            <div className="parameter-control">
              <label htmlFor="param-sharpness" className="param-label">
                Sharpness
                <span className="param-value">{parameters.sharpness}</span>
              </label>
              <input
                id="param-sharpness"
                type="range"
                min="0"
                max="100"
                value={parameters.sharpness}
                onChange={(e) =>
                  handleParameterChange('sharpness', parseInt(e.target.value, 10))
                }
                className="param-slider"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StyleControls;
