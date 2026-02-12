/**
 * Caption Styles Panel Component
 * MI2: Caption Styles - Modern, Classic, Dynamic
 */

import React, { useState, useEffect } from 'react';
import { useCaptionStyleStore } from '../../stores/captionStyleStore';
import { captionStylesService } from '../../services/CaptionStylesService';
import { CaptionStyle } from '../../types/caption-style';
import styles from './CaptionStylesPanel.module.css';

type StyleCategory = 'modern' | 'classic' | 'dynamic' | 'all';

export const CaptionStylesPanel: React.FC = () => {
  const {
    builtInStyles,
    userPresets,
    favoriteStyleIds,
    recentStyles,
    activeTrack,
    selectedStyleId,
    previewMode,
    isPanelOpen,
    isStyleEditorOpen,
    applyStyleToTrack,
    togglePanel,
    toggleStyleEditor,
    setPreviewMode,
    selectStyle,
  } = useCaptionStyleStore();

  const [activeCategory, setActiveCategory] = useState<StyleCategory>('all');
  const [previewText, setPreviewText] = useState('Hello, World!');
  const [selectedStyle, setSelectedStyle] = useState<CaptionStyle | null>(null);

  // Load built-in styles on mount
  useEffect(() => {
    captionStylesService.getAllStyles().forEach((style) => {
      useCaptionStyleStore.getState().registerBuiltInStyle(style);
    });
  }, []);

  // Combine built-in and user presets
  const allStyles = [...builtInStyles, ...userPresets.map((p) => ({
    ...p,
    id: p.styleId,
  } as CaptionStyle))];

  const filteredStyles = activeCategory === 'all'
    ? allStyles
    : allStyles.filter((s) => s.category === activeCategory);

  const handleStyleClick = (style: CaptionStyle) => {
    setSelectedStyle(style);
    selectStyle(style.id);
  };

  const handleApplyStyle = (style: CaptionStyle) => {
    if (activeTrack) {
      applyStyleToTrack(style.id, activeTrack.id);
    }
  };

  const toggleFavorite = (styleId: string) => {
    if (favoriteStyleIds.includes(styleId)) {
      useCaptionStyleStore.getState().removeFromFavorites(styleId);
    } else {
      useCaptionStyleStore.getState().addToFavorites(styleId);
    }
  };

  const categories = [
    { id: 'all', label: 'All', icon: '📝' },
    { id: 'modern', label: 'Modern', icon: '✨' },
    { id: 'classic', label: 'Classic', icon: '📜' },
    { id: 'dynamic', label: 'Dynamic', icon: '🎭' },
  ];

  if (!isPanelOpen) {
    return (
      <button className={styles.toggleButton} onClick={togglePanel}>
        💬 Captions
      </button>
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3>Caption Styles</h3>
        <div className={styles.headerActions}>
          <button
            className={`${styles.actionBtn} ${previewMode ? styles.active : ''}`}
            onClick={() => setPreviewMode(!previewMode)}
            title="Preview Mode"
          >
            👁
          </button>
          <button
            className={styles.actionBtn}
            onClick={toggleStyleEditor}
            title="Style Editor"
          >
            ✏️
          </button>
          <button className={styles.closeButton} onClick={togglePanel}>
            ×
          </button>
        </div>
      </div>

      <div className={styles.content}>
        {/* Preview Text Input */}
        <div className={styles.previewInput}>
          <input
            type="text"
            value={previewText}
            onChange={(e) => setPreviewText(e.target.value)}
            placeholder="Enter preview text..."
            className={styles.textInput}
          />
        </div>

        {/* Category Tabs */}
        <div className={styles.categories}>
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={`${styles.categoryTab} ${
                activeCategory === cat.id ? styles.active : ''
              }`}
              onClick={() => setActiveCategory(cat.id as StyleCategory)}
            >
              <span className={styles.catIcon}>{cat.icon}</span>
              <span className={styles.catLabel}>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Styles Grid */}
        <div className={styles.stylesGrid}>
          {filteredStyles.map((style) => (
            <div
              key={style.id}
              className={`${styles.styleCard} ${
                selectedStyleId === style.id ? styles.selected : ''
              }`}
              onClick={() => handleStyleClick(style)}
            >
              {/* Style Preview */}
              <div
                className={styles.stylePreview}
                style={getStylePreviewStyle(style)}
              >
                <span style={getStyleTextStyle(style)}>{previewText}</span>
              </div>

              <div className={styles.styleInfo}>
                <h4 className={styles.styleName}>{style.name}</h4>
                <p className={styles.styleDesc}>{style.description}</p>
              </div>

              <div className={styles.styleActions}>
                <button
                  className={`${styles.favBtn} ${
                    favoriteStyleIds.includes(style.id) ? styles.active : ''
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(style.id);
                  }}
                >
                  {favoriteStyleIds.includes(style.id) ? '★' : '☆'}
                </button>
                <button
                  className={styles.applyBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleApplyStyle(style);
                  }}
                  disabled={!activeTrack}
                >
                  Apply
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Recently Used */}
        {recentStyles.length > 0 && (
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>Recently Used</h4>
            <div className={styles.recentList}>
              {recentStyles.slice(0, 5).map((styleId) => {
                const style = allStyles.find((s) => s.id === styleId);
                if (!style) return null;
                return (
                  <button
                    key={styleId}
                    className={styles.recentItem}
                    onClick={() => handleApplyStyle(style)}
                    disabled={!activeTrack}
                  >
                    <span style={getStyleTextStyle(style)}>Aa</span>
                    <span>{style.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Active Track Info */}
        {activeTrack && (
          <div className={styles.trackInfo}>
            <span>Active Track:</span>
            <strong>{activeTrack.name}</strong>
            <span className={styles.trackLang}>{activeTrack.language}</span>
          </div>
        )}

        {/* Preview Mode */}
        {previewMode && selectedStyle && (
          <div className={styles.fullPreview}>
            <div className={styles.fullPreviewContent}>
              <div
                className={styles.previewCard}
                style={getStylePreviewStyle(selectedStyle)}
              >
                <span style={getStyleTextStyle(selectedStyle)}>
                  {previewText}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper function to generate preview style for cards
function getStylePreviewStyle(style: CaptionStyle): React.CSSProperties {
  return {
    background: style.background.enabled
      ? `rgba(0, 0, 0, ${style.background.opacity / 100})`
      : 'transparent',
    padding: style.background.padding,
    borderRadius: style.background.cornerRadius,
  };
}

// Helper function to generate text style
function getStyleTextStyle(style: CaptionStyle): React.CSSProperties {
  return {
    fontFamily: style.font.family,
    fontSize: `${style.font.size}px`,
    fontWeight: style.font.weight,
    fontStyle: style.font.style,
    color: style.textAppearance.color,
    textShadow: style.textAppearance.shadow
      ? `${style.textAppearance.shadow.offsetX}px ${style.textAppearance.shadow.offsetY}px ${style.textAppearance.shadow.blur}px rgba(0, 0, 0, ${style.textAppearance.shadow.opacity / 100})`
      : 'none',
    textTransform: style.font.textTransform,
    letterSpacing: `${style.font.letterSpacing}px`,
    lineHeight: style.font.lineHeight,
  };
}

export default CaptionStylesPanel;
