/**
 * Color Correction Panel Component
 * MI1: Color Correction Presets - Vintage, Noir, Vibrant, Cinematic
 */

import React, { useState, useEffect } from 'react';
import { useColorCorrectionStore } from '../../stores/colorCorrectionStore';
import { colorCorrectionPresetsService } from '../../services/ColorCorrectionPresets';
import { ColorCorrectionPreset } from '../../types/color-correction';
import styles from './ColorCorrectionPanel.module.css';

type Category = 'vintage' | 'noir' | 'vibrant' | 'cinematic' | 'all';

export const ColorCorrectionPanel: React.FC = () => {
  const {
    presets,
    favorites,
    recentlyUsed,
    layers,
    state,
    selectedPresetId,
    compareMode,
    isPanelOpen,
    applyPreset,
    addToFavorites,
    removeFromFavorites,
    addLayer,
    toggleEnabled,
    setCompareMode,
    togglePanel,
    selectPreset,
  } = useColorCorrectionStore();

  const [activeCategory, setActiveCategory] = useState<Category>('all');
  const [previewPreset, setPreviewPreset] = useState<ColorCorrectionPreset | null>(null);
  const [showCustomPanel, setShowCustomPanel] = useState(false);

  // Load built-in presets on mount
  useEffect(() => {
    colorCorrectionPresetsService.getAllPresets().forEach((preset) => {
      useColorCorrectionStore.getState().loadPreset(preset);
    });
  }, []);

  // Filter presets by category
  const filteredPresets = activeCategory === 'all'
    ? presets
    : presets.filter((p) => p.category === activeCategory);

  const handlePresetClick = (preset: ColorCorrectionPreset) => {
    setPreviewPreset(preset);
    selectPreset(preset.id);
  };

  const handleApplyPreset = (preset: ColorCorrectionPreset) => {
    applyPreset(preset.id);
    useColorCorrectionStore.getState().addToRecent(preset.id);
  };

  const handleToggleFavorite = (presetId: string) => {
    if (favorites.includes(presetId)) {
      removeFromFavorites(presetId);
    } else {
      addToFavorites(presetId);
    }
  };

  const categories: { id: Category; label: string; icon: string }[] = [
    { id: 'all', label: 'All', icon: '🎨' },
    { id: 'vintage', label: 'Vintage', icon: '📷' },
    { id: 'noir', label: 'Noir', icon: '🖤' },
    { id: 'vibrant', label: 'Vibrant', icon: '✨' },
    { id: 'cinematic', label: 'Cinematic', icon: '🎬' },
  ];

  if (!isPanelOpen) {
    return (
      <button className={styles.toggleButton} onClick={togglePanel}>
        🎨 Color
      </button>
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3>Color Correction Presets</h3>
        <div className={styles.headerActions}>
          <button
            className={`${styles.toggleBtn} ${compareMode ? styles.active : ''}`}
            onClick={() => setCompareMode(!compareMode)}
            title="Compare"
          >
            👁
          </button>
          <button className={styles.closeButton} onClick={togglePanel}>
            ×
          </button>
        </div>
      </div>

      <div className={styles.content}>
        {/* Global Toggle */}
        <div className={styles.globalToggle}>
          <label className={styles.toggleLabel}>
            <input
              type="checkbox"
              checked={state.isEnabled}
              onChange={() => toggleEnabled()}
            />
            <span>Color Correction {state.isEnabled ? 'ON' : 'OFF'}</span>
          </label>
        </div>

        {/* Category Tabs */}
        <div className={styles.categories}>
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={`${styles.categoryTab} ${
                activeCategory === cat.id ? styles.active : ''
              }`}
              onClick={() => setActiveCategory(cat.id)}
            >
              <span className={styles.catIcon}>{cat.icon}</span>
              <span className={styles.catLabel}>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Presets Grid */}
        <div className={styles.presetsGrid}>
          {filteredPresets.map((preset) => (
            <div
              key={preset.id}
              className={`${styles.presetCard} ${
                selectedPresetId === preset.id ? styles.selected : ''
              }`}
              onClick={() => handlePresetClick(preset)}
            >
              {/* Preset Preview Thumbnail */}
              <div
                className={styles.presetThumbnail}
                style={{
                  background: getPresetGradient(preset),
                }}
              >
                <span className={styles.presetBadge}>{preset.category}</span>
              </div>

              <div className={styles.presetInfo}>
                <h4 className={styles.presetName}>{preset.name}</h4>
                <p className={styles.presetDesc}>{preset.description}</p>
              </div>

              <div className={styles.presetActions}>
                <button
                  className={`${styles.favBtn} ${
                    favorites.includes(preset.id) ? styles.active : ''
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleFavorite(preset.id);
                  }}
                  title={favorites.includes(preset.id) ? 'Remove from favorites' : 'Add to favorites'}
                >
                  {favorites.includes(preset.id) ? '★' : '☆'}
                </button>
                <button
                  className={styles.applyBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleApplyPreset(preset);
                  }}
                >
                  Apply
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Recently Used */}
        {recentlyUsed.length > 0 && (
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>Recently Used</h4>
            <div className={styles.recentList}>
              {recentlyUsed.slice(0, 5).map((presetId) => {
                const preset = presets.find((p) => p.id === presetId);
                if (!preset) return null;
                return (
                  <button
                    key={presetId}
                    className={styles.recentItem}
                    onClick={() => handleApplyPreset(preset)}
                  >
                    <div
                      className={styles.recentThumb}
                      style={{ background: getPresetGradient(preset) }}
                    />
                    <span>{preset.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Custom Adjustments Toggle */}
        <button
          className={styles.customToggle}
          onClick={() => setShowCustomPanel(!showCustomPanel)}
        >
          {showCustomPanel ? '▼' : '▶'} Custom Adjustments
        </button>

        {/* Preview Modal */}
        {previewPreset && compareMode && (
          <div className={styles.previewModal}>
            <div className={styles.previewHeader}>
              <h4>Preview: {previewPreset.name}</h4>
              <button onClick={() => setPreviewPreset(null)}>×</button>
            </div>
            <div className={styles.previewContent}>
              <div className={styles.previewBefore}>
                <span>Before</span>
              </div>
              <div className={styles.previewAfter}>
                <span>After</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper function to generate preset preview gradient
function getPresetGradient(preset: ColorCorrectionPreset): string {
  const { adjustments } = preset;
  const temp = adjustments.temperature;
  const contrast = adjustments.contrast;
  
  // Generate a representative color based on preset adjustments
  const r = Math.round(128 + temp * 5 + contrast * 2);
  const g = Math.round(128 + adjustments.saturation * 0.5);
  const b = Math.round(128 - temp * 5);
  
  return `linear-gradient(135deg, rgb(${Math.min(255, r)}, ${Math.min(255, g)}, ${Math.min(255, b)}) 0%, rgb(${Math.max(0, r - 30)}, ${Math.max(0, g - 30)}, ${Math.max(0, b - 30)}) 100%)`;
}

export default ColorCorrectionPanel;
