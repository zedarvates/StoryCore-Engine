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
import { getComfyUIServersService } from '@/services/comfyuiServersService';
import { Sparkles, Loader2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
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

  const [isRefining, setIsRefining] = useState(false);
  
  const handleRefineStyle = async () => {
    const activeServer = getComfyUIServersService().getActiveServer();
    if (!activeServer || activeServer.authentication.type !== 'mcp') return;

    setIsRefining(true);
    try {
      const toolMapping = activeServer.mcpConfig?.toolMappings;
      const toolName = toolMapping?.styleRefinement || toolMapping?.characterGeneration || 'refine_style';
      const result = await window.electronAPI.comfyui.callTool(activeServer.id, toolName, {
        style_params: shot.visualStyle?.parameters,
        shot_id: shot.id
      });
      
      if (result && result.parameters) {
        dispatch(updateStyleParameters({
          shotId: shot.id,
          parameters: result.parameters
        }));
      }
    } catch (error) {
      console.error('MCP Style Refinement failed:', error);
    } finally {
      setIsRefining(false);
    }
  };

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
            {parameters.colorPalette.map((color: string, index: number) => (
              <div
                key={index}
                className="color-swatch"
                ref={(el) => { if (el) el.style.setProperty('--swatch-color', color); }}
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

      {/* Refine with MCP Button */}
      {getComfyUIServersService().getActiveServer()?.authentication.type === 'mcp' && (
        <div className="mcp-actions mt-4 pb-2 border-b border-border/50">
          <button
            className={cn(
              "mcp-refine-btn w-full flex items-center justify-center gap-2 py-2 rounded-md transition-all font-medium text-sm",
              isRefining ? "bg-accent/50 cursor-not-allowed" : "bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20"
            )}
            onClick={handleRefineStyle}
            disabled={isRefining}
          >
            {isRefining ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {isRefining ? 'Refining Parameters...' : 'Refine Style with MCP'}
          </button>
          <div className="flex items-start gap-1.5 mt-2 px-1 text-muted-foreground">
            <Info className="h-3 w-3 mt-0.5" />
            <p className="text-[10px] leading-tight">
              Uses AI tool calling via Model Context Protocol to analyze and optimize your style parameters for ComfyUI.
            </p>
          </div>
        </div>
      )}

      {/* Advanced Controls Toggle */}
      <button
        className="toggle-advanced-btn"
        onClick={toggleAdvanced}
        aria-expanded={showAdvanced ? 'true' : 'false'}
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
