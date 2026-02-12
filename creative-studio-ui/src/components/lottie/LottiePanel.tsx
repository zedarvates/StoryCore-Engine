/**
 * Lottie Panel Component
 * ME2: Lottie Integration - Support for Lottie animations
 */

import React, { useEffect, useRef, useState } from 'react';
import { useLottieStore } from '../../stores/lottieStore';
import { lottieService } from '../../services/LottieService';
import styles from './LottiePanel.module.css';

interface LottiePanelProps {
  animationUrl?: string;
  onLoadComplete?: (animationId: string) => void;
}

export const LottiePanel: React.FC<LottiePanelProps> = ({
  animationUrl,
  onLoadComplete,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    animations,
    activeAnimationId,
    playback,
    state,
    isPanelOpen,
    selectedLayerId,
    setActiveAnimation,
    loadAnimation,
    play,
    pause,
    stop,
    setFrame,
    setSpeed,
    setLoop,
    setDirection,
    togglePanel,
    selectLayer,
  } = useLottieStore();

  const [urlInput, setUrlInput] = useState(animationUrl || '');

  // Load animation from URL
  const handleLoadAnimation = async () => {
    if (!urlInput) return;
    
    const id = `lottie_${Date.now()}`;
    const animation = await lottieService.loadAnimation(urlInput, id);
    
    if (animation) {
      loadAnimation(animation);
      onLoadComplete?.(id);
    }
  };

  // Get active animation
  const activeAnimation = activeAnimationId 
    ? animations.get(activeAnimationId) 
    : null;

  if (!isPanelOpen) {
    return (
      <button className={styles.toggleButton} onClick={togglePanel}>
        🎬 Lottie
      </button>
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3>Lottie Animations</h3>
        <button className={styles.closeButton} onClick={togglePanel}>
          ×
        </button>
      </div>

      <div className={styles.content}>
        {/* URL Input */}
        <div className={styles.urlSection}>
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="Enter Lottie JSON URL..."
            className={styles.urlInput}
          />
          <button 
            onClick={handleLoadAnimation}
            className={styles.loadButton}
            disabled={!urlInput}
          >
            Load
          </button>
        </div>

        {/* Animation Preview */}
        {activeAnimation && (
          <div className={styles.previewSection}>
            <div 
              ref={containerRef}
              className={styles.previewContainer}
              style={{
                width: activeAnimation.width,
                height: activeAnimation.height,
              }}
            >
              {/* Placeholder for Lottie renderer */}
              <div className={styles.placeholder}>
                {activeAnimation.name}
              </div>
            </div>

            {/* Playback Controls */}
            <div className={styles.playbackControls}>
              <button onClick={stop} className={styles.controlButton}>
                ⏮
              </button>
              {state.isPlaying ? (
                <button onClick={pause} className={styles.controlButton}>
                  ⏸
                </button>
              ) : (
                <button onClick={play} className={styles.controlButton}>
                  ▶
                </button>
              )}
              <button onClick={stop} className={styles.controlButton}>
                ⏭
              </button>
            </div>

            {/* Progress Bar */}
            <div className={styles.progressSection}>
              <input
                type="range"
                min="0"
                max={activeAnimation.totalFrames}
                value={state.currentFrame}
                onChange={(e) => setFrame(Number(e.target.value))}
                className={styles.progressSlider}
              />
              <span className={styles.progressText}>
                {state.currentFrame} / {activeAnimation.totalFrames}
              </span>
            </div>

            {/* Speed Control */}
            <div className={styles.controlRow}>
              <label>Speed:</label>
              <input
                type="range"
                min="0.1"
                max="3"
                step="0.1"
                value={playback.speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className={styles.slider}
              />
              <span>{playback.speed.toFixed(1)}x</span>
            </div>

            {/* Loop Toggle */}
            <div className={styles.controlRow}>
              <label>
                <input
                  type="checkbox"
                  checked={playback.loop}
                  onChange={(e) => setLoop(e.target.checked)}
                />
                Loop
              </label>
            </div>

            {/* Direction Toggle */}
            <div className={styles.controlRow}>
              <label>Direction:</label>
              <select
                value={playback.direction}
                onChange={(e) => setDirection(e.target.value as 'forward' | 'reverse')}
                className={styles.select}
              >
                <option value="forward">Forward</option>
                <option value="reverse">Reverse</option>
              </select>
            </div>
          </div>
        )}

        {/* Layers List */}
        {activeAnimation && activeAnimation.layers.length > 0 && (
          <div className={styles.layersSection}>
            <h4>Layers</h4>
            <div className={styles.layersList}>
              {activeAnimation.layers.map((layer) => (
                <div
                  key={layer.id}
                  className={`${styles.layerItem} ${
                    selectedLayerId === layer.id ? styles.selected : ''
                  }`}
                  onClick={() => selectLayer(layer.id)}
                >
                  <span className={styles.layerType}>
                    {layer.type.charAt(0).toUpperCase()}
                  </span>
                  <span className={styles.layerName}>{layer.name}</span>
                  {!layer.isEnabled && (
                    <span className={styles.disabledBadge}>Hidden</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Loaded Animations */}
        {animations.size > 0 && (
          <div className={styles.loadedSection}>
            <h4>Loaded Animations</h4>
            <div className={styles.animationList}>
              {Array.from(animations.values()).map((anim) => (
                <div
                  key={anim.id}
                  className={`${styles.animationItem} ${
                    activeAnimationId === anim.id ? styles.active : ''
                  }`}
                  onClick={() => setActiveAnimation(anim.id)}
                >
                  <span>{anim.name}</span>
                  <span className={styles.animationInfo}>
                    {anim.width}x{anim.height}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* State Display */}
        {state.error && (
          <div className={styles.error}>
            {state.error}
          </div>
        )}
      </div>
    </div>
  );
};

export default LottiePanel;
