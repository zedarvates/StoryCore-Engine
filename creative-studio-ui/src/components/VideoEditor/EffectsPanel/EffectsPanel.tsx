/**
 * Effects Panel Component
 * Color correction, filter controls, and AI enhancements
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useVideoEditor } from '../../../contexts/VideoEditorContext';
import { ColorCorrection, VideoFilter, VideoClip, FilterType } from '../../../types/video-editor';
import './EffectsPanel.css';

const SliderControl: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}> = ({ label, value, min, max, onChange }) => (
  <div className="slider-control">
    <div className="slider-header">
      <span className="slider-label">{label}</span>
      <span className="slider-value">{value > 0 ? '+' : ''}{value}</span>
    </div>
    <label className="sr-only" htmlFor={`slider-${label}`}>{label}</label>
    <input
      id={`slider-${label}`}
      type="range"
      className="slider-input"
      min={min}
      max={max}
      value={value}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(Number.parseFloat(e.target.value))}
      aria-label={label}
    />
  </div>
);

const PRESET_FILTERS: { id: VideoFilter; name: string; icon: string }[] = [
  { id: FilterType.NONE, name: 'None', icon: '○' },
  { id: FilterType.BLACK_WHITE, name: 'Grayscale', icon: '⬛' },
  { id: FilterType.SEPIA, name: 'Sepia', icon: '🟤' },
  { id: FilterType.VINTAGE, name: 'Vintage', icon: '📷' },
  { id: FilterType.VIGNETTE, name: 'Vignette', icon: '🔘' },
  { id: FilterType.BLUR, name: 'Blur', icon: '💧' },
  { id: FilterType.SHARPEN, name: 'Sharpen', icon: '🔪' },
  { id: FilterType.WARM, name: 'Warm', icon: '🔥' },
  { id: FilterType.COOL, name: 'Cool', icon: '❄️' },
  { id: FilterType.DRAMATIC, name: 'Dramatic', icon: '🎭' },
];

const CINEMATIC_PRESETS = [
  { id: 'teal_orange', name: 'Teal & Orange', icon: '🎨', correction: { brightness: 0, contrast: 15, saturation: 10, temperature: -10, tint: 5, exposure: 0, highlights: 5, shadows: -10, whites: 5, blacks: -5, gamma: 0, hue: 0 } },
  { id: 'cyberpunk', name: 'Cyberpunk', icon: '⚡', correction: { brightness: 5, contrast: 20, saturation: 30, temperature: -20, tint: 40, exposure: 0, highlights: 15, shadows: -5, whites: 10, blacks: 0, gamma: 0, hue: 0 } },
  { id: 'noir', name: 'Film Noir', icon: '📼', correction: { brightness: -10, contrast: 40, saturation: -100, temperature: 0, tint: 0, exposure: -5, highlights: 20, shadows: -30, whites: 10, blacks: -15, gamma: 0, hue: 0 } },
  { id: 'dreamy', name: 'Dreamy', icon: '☁️', correction: { brightness: 10, contrast: -10, saturation: 10, temperature: 5, tint: 10, exposure: 5, highlights: 20, shadows: 10, whites: 15, blacks: 5, gamma: 5, hue: 0 } },
];

export const EffectsPanel: React.FC = () => {
  const { clips, selectedClipIds, updateClip, smartCrop, enhanceClip, aiJobs } = useVideoEditor();
  const [activeTab, setActiveTab] = useState<'color' | 'filters' | 'ai'>('color');
  const [activeSubTab, setActiveSubTab] = useState<'basic' | 'presets'>('basic');

  const selectedClip = useMemo(() => 
    clips.find((c) => selectedClipIds.includes(c.id)) as VideoClip | undefined
  , [clips, selectedClipIds]);

  const activeJob = useMemo(() => {
    if (!selectedClip) return null;
    return Object.values(aiJobs).find(job => 
      (job.status === 'pending' || job.status === 'processing') && 
      (job as any).media_id === selectedClip.mediaId
    );
  }, [aiJobs, selectedClip]);

  const corrections = useMemo(() => selectedClip?.colorCorrection || {
    brightness: 0,
    contrast: 0,
    saturation: 0,
    temperature: 0,
    tint: 0,
    exposure: 0,
    highlights: 0,
    shadows: 0,
    whites: 0,
    blacks: 0,
    gamma: 0,
    hue: 0
  }, [selectedClip]);

  const handleCorrectionChange = useCallback(
    (key: keyof ColorCorrection, value: number) => {
      if (!selectedClip) return;
      updateClip(selectedClip.id, {
        colorCorrection: { ...corrections, [key]: value },
      });
    },
    [selectedClip, corrections, updateClip]
  );

  const handleFilterChange = useCallback(
    (filterId: VideoFilter) => {
      if (!selectedClip) return;
      updateClip(selectedClip.id, {
        filters: [{ id: 'filter-1', type: filterId, intensity: 1 }],
      });
    },
    [selectedClip, updateClip]
  );

  const handleReset = useCallback(() => {
    if (!selectedClip) return;
    updateClip(selectedClip.id, {
      colorCorrection: {
        brightness: 0,
        contrast: 0,
        saturation: 0,
        temperature: 0,
        tint: 0,
        exposure: 0,
        highlights: 0,
        shadows: 0,
        whites: 0,
        blacks: 0,
        gamma: 0,
        hue: 0
      },
      filters: [],
      aiEnhancement: undefined
    });
  }, [selectedClip, updateClip]);

  return (
    <div className="effects-panel">
      <div className="panel-header">
        <h3>Effects</h3>
        <button className="reset-btn" onClick={handleReset}>
          Reset
        </button>
      </div>

      <div className="panel-tabs">
        <button
          className={`tab-btn ${activeTab === 'color' ? 'active' : ''}`}
          onClick={() => setActiveTab('color')}
        >
          Color
        </button>
        <button
          className={`tab-btn ${activeTab === 'filters' ? 'active' : ''}`}
          onClick={() => setActiveTab('filters')}
        >
          Filters
        </button>
        <button
          className={`tab-btn ${activeTab === 'ai' ? 'active' : ''}`}
          onClick={() => setActiveTab('ai')}
        >
          AI ✨
        </button>
      </div>

      {activeTab === 'color' && (
        <div className="sub-tabs">
          <button 
            className={`sub-tab-btn ${activeSubTab === 'basic' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('basic')}
          >
            Basic
          </button>
          <button 
            className={`sub-tab-btn ${activeSubTab === 'presets' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('presets')}
          >
            Cinematic Presets
          </button>
        </div>
      )}

      {!selectedClip ? (
        <div className="panel-empty">
          <p>Select a clip to edit effects</p>
        </div>
      ) : (
        <div className="panel-content">
          {activeTab === 'color' && activeSubTab === 'basic' && (
            <div className="color-corrections">
              <SliderControl
                label="Brightness"
                value={corrections.brightness}
                min={-100}
                max={100}
                onChange={(v) => handleCorrectionChange('brightness', v)}
              />
              <SliderControl
                label="Contrast"
                value={corrections.contrast}
                min={-100}
                max={100}
                onChange={(v) => handleCorrectionChange('contrast', v)}
              />
              <SliderControl
                label="Saturation"
                value={corrections.saturation}
                min={-100}
                max={100}
                onChange={(v) => handleCorrectionChange('saturation', v)}
              />
              <SliderControl
                label="Temperature"
                value={corrections.temperature}
                min={-100}
                max={100}
                onChange={(v) => handleCorrectionChange('temperature', v)}
              />
              <SliderControl
                label="Tint"
                value={corrections.tint}
                min={-100}
                max={100}
                onChange={(v) => handleCorrectionChange('tint', v)}
              />
              <SliderControl
                label="Shadows"
                value={corrections.shadows}
                min={-100}
                max={100}
                onChange={(v) => handleCorrectionChange('shadows', v)}
              />
              <SliderControl
                label="Highlights"
                value={corrections.highlights}
                min={-100}
                max={100}
                onChange={(v) => handleCorrectionChange('highlights', v)}
              />
            </div>
          )}

          {activeTab === 'color' && activeSubTab === 'presets' && (
            <div className="color-presets-grid">
              {CINEMATIC_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  className="preset-card"
                  onClick={() => {
                    if (!selectedClip) return;
                    updateClip(selectedClip.id, {
                      colorCorrection: preset.correction,
                    });
                  }}
                >
                  <div className="preset-icon">{preset.icon}</div>
                  <div className="preset-name">{preset.name}</div>
                </button>
              ))}
            </div>
          )}

          {activeTab === 'filters' && (
            <div className="filter-presets">
              <div className="filter-grid">
                {PRESET_FILTERS.map((filter) => (
                  <button
                    key={filter.id}
                    className={`filter-btn ${selectedClip.filters?.[0]?.type === filter.id ? 'active' : ''}`}
                    onClick={() => handleFilterChange(filter.id)}
                  >
                    <span className="filter-icon">{filter.icon}</span>
                    <span className="filter-name">{filter.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="ai-enhancements">
              {activeJob && (
                <div className="active-job-progress">
                  <div className="job-info">
                    <span>{activeJob.type.replace('_', ' ').toUpperCase()} IN PROGRESS...</span>
                    <span>{Math.round(activeJob.progress)}%</span>
                  </div>
                  <div className="progress-bar-container">
                    <div className="progress-bar-fill" style={{ width: `${activeJob.progress}%` }} />
                  </div>
                </div>
              )}
              <div className="ai-section">
                <h4>✨ Skin Enhancer</h4>
                <div className="toggle-row">
                  <label>Enabled</label>
                  <input 
                    type="checkbox" 
                    checked={selectedClip.aiEnhancement?.skinEnhancer?.enabled || false}
                    onChange={(e) => {
                      const settings = selectedClip.aiEnhancement || {};
                      updateClip(selectedClip.id, {
                        aiEnhancement: {
                          ...settings,
                          skinEnhancer: {
                            enabled: e.target.checked,
                            smoothing: settings.skinEnhancer?.smoothing ?? 50,
                            preserveTexture: settings.skinEnhancer?.preserveTexture ?? true,
                            removeBlemishes: settings.skinEnhancer?.removeBlemishes ?? true
                          }
                        }
                      });
                    }}
                  />
                </div>
                {selectedClip.aiEnhancement?.skinEnhancer?.enabled && (
                  <div className="ai-controls">
                    <SliderControl
                      label="Smoothing"
                      value={selectedClip.aiEnhancement?.skinEnhancer?.smoothing || 50}
                      min={0}
                      max={100}
                      onChange={(v) => {
                        const settings = selectedClip.aiEnhancement || {};
                        updateClip(selectedClip.id, {
                          aiEnhancement: {
                            ...settings,
                            skinEnhancer: {
                              enabled: settings.skinEnhancer?.enabled ?? true,
                              preserveTexture: settings.skinEnhancer?.preserveTexture ?? true,
                              removeBlemishes: settings.skinEnhancer?.removeBlemishes ?? true,
                              smoothing: v
                            }
                          }
                        });
                      }}
                    />
                    <div className="toggle-row">
                      <label>Preserve Texture</label>
                      <input 
                        type="checkbox" 
                        checked={selectedClip.aiEnhancement?.skinEnhancer?.preserveTexture ?? true}
                        onChange={(e) => {
                          const settings = selectedClip.aiEnhancement || {};
                          updateClip(selectedClip.id, {
                            aiEnhancement: {
                              ...settings,
                              skinEnhancer: {
                                enabled: settings.skinEnhancer?.enabled ?? true,
                                smoothing: settings.skinEnhancer?.smoothing ?? 50,
                                removeBlemishes: settings.skinEnhancer?.removeBlemishes ?? true,
                                preserveTexture: e.target.checked
                              }
                            }
                          });
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="ai-divider" />

              <div className="ai-section">
                <h4>💡 Relighting</h4>
                <div className="toggle-row">
                  <label>Enabled</label>
                  <input 
                    type="checkbox" 
                    checked={selectedClip.aiEnhancement?.relighting?.enabled || false}
                    onChange={(e) => {
                      const settings = selectedClip.aiEnhancement || {};
                      updateClip(selectedClip.id, {
                        aiEnhancement: {
                          ...settings,
                          relighting: {
                            enabled: e.target.checked,
                            type: settings.relighting?.type ?? 'natural',
                            intensity: settings.relighting?.intensity ?? 100
                          }
                        }
                      });
                    }}
                  />
                </div>
                {selectedClip.aiEnhancement?.relighting?.enabled && (
                  <div className="ai-controls">
                    <div className="control-row">
                      <label>Type</label>
                      <select 
                        className="ai-select"
                        value={selectedClip.aiEnhancement?.relighting?.type || 'natural'}
                        onChange={(e) => {
                          const settings = selectedClip.aiEnhancement || {};
                          updateClip(selectedClip.id, {
                            aiEnhancement: {
                              ...settings,
                              relighting: {
                                enabled: settings.relighting?.enabled ?? true,
                                intensity: settings.relighting?.intensity ?? 100,
                                type: e.target.value
                              }
                            }
                          });
                        }}
                      >
                        <option value="natural">Natural</option>
                        <option value="studio">Studio</option>
                        <option value="cinematic">Cinematic</option>
                        <option value="dramatic">Dramatic</option>
                        <option value="golden_hour">Golden Hour</option>
                      </select>
                    </div>
                    <SliderControl
                      label="Intensity"
                      value={selectedClip.aiEnhancement?.relighting?.intensity || 100}
                      min={0}
                      max={200}
                      onChange={(v) => {
                        const settings = selectedClip.aiEnhancement || {};
                        updateClip(selectedClip.id, {
                          aiEnhancement: {
                            ...settings,
                            relighting: {
                              enabled: settings.relighting?.enabled ?? true,
                              type: settings.relighting?.type ?? 'natural',
                              intensity: v
                            }
                          }
                        });
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="ai-divider" />

              <div className="ai-section">
                <h4>📐 AI Smart Crop</h4>
                <p className="ai-desc">Auto-reframing for vertical/horizontal socials.</p>
                <div className="ai-actions">
                  <button 
                    className="ai-action-btn secondary"
                    onClick={() => selectedClip && smartCrop(selectedClip.mediaId, '9:16')}
                  >
                    📱 9:16 (TikTok/Reels)
                  </button>
                  <button 
                    className="ai-action-btn secondary"
                    onClick={() => selectedClip && smartCrop(selectedClip.mediaId, '1:1')}
                  >
                    🔳 1:1 (Insta)
                  </button>
                  <button 
                    className="ai-action-btn secondary"
                    onClick={() => selectedClip && smartCrop(selectedClip.mediaId, '16:9')}
                  >
                    💻 16:9 (YouTube)
                  </button>
                </div>
              </div>

              <div className="ai-divider" />

              <div className="ai-section">
                <h4>🚀 AI Super-Resolution</h4>
                <p className="ai-desc">Upscale and sharpen with deep learning.</p>
                <div className="ai-actions">
                  <button 
                    className="ai-action-btn primary"
                    onClick={() => selectedClip && enhanceClip(selectedClip.id, { type: 'super-res', intensity: 100 })}
                  >
                    💎 Enhance to 4K
                  </button>
                  <button 
                    className="ai-action-btn primary"
                    onClick={() => selectedClip && enhanceClip(selectedClip.id, { type: 'sharpen', intensity: 50 })}
                  >
                    ✨ Deep Sharpen
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EffectsPanel;
