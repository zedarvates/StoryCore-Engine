/**
 * Text Typography Panel Component
 * 
 * A React component for displaying and controlling text typography
 * animations in StoryCore with a professional interface.
 */

import React, { useState, useCallback } from 'react';
import { useTextTypography, useAnimatedText } from '../../hooks/useTextTypography';
import { TextAnimationType, TextPreset } from '../../services/text-typography/TextTypographyTypes';

// ============================================================================
// Styles
// ============================================================================

const styles: Record<string, React.CSSProperties> = {
  panel: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100%',
    backgroundColor: '#1a1a1a',
    color: '#ffffff',
    fontFamily: 'system-ui, sans-serif',
    fontSize: '12px'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 15px',
    backgroundColor: '#2a2a2a',
    borderBottom: '1px solid #3a3a3a'
  },
  title: {
    fontSize: '14px',
    fontWeight: 600
  },
  previewSection: {
    padding: '20px',
    backgroundColor: '#222',
    borderBottom: '1px solid #3a3a3a',
    minHeight: '150px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  previewText: {
    fontSize: '32px',
    fontWeight: 600,
    color: '#ffffff'
  },
  controlsSection: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '15px'
  },
  controlGroup: {
    marginBottom: '20px'
  },
  controlLabel: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '11px',
    color: '#888',
    textTransform: 'uppercase' as const
  },
  select: {
    width: '100%',
    padding: '8px 12px',
    backgroundColor: '#2a2a2a',
    color: '#ffffff',
    border: '1px solid #3a3a3a',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer'
  },
  input: {
    width: '100%',
    padding: '8px 12px',
    backgroundColor: '#2a2a2a',
    color: '#ffffff',
    border: '1px solid #3a3a3a',
    borderRadius: '4px',
    fontSize: '12px',
    boxSizing: 'border-box' as const
  },
  slider: {
    width: '100%',
    height: '4px',
    backgroundColor: '#3a3a3a',
    borderRadius: '2px',
    cursor: 'pointer'
  },
  sliderContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  sliderValue: {
    minWidth: '40px',
    fontSize: '11px',
    color: '#888'
  },
  presetsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
    gap: '10px'
  },
  presetCard: {
    padding: '12px',
    backgroundColor: '#2a2a2a',
    borderRadius: '6px',
    cursor: 'pointer',
    border: '2px solid transparent',
    transition: 'border-color 0.2s'
  },
  presetCardActive: {
    border: '2px solid #4a90d9'
  },
  presetName: {
    fontSize: '12px',
    fontWeight: 500,
    marginBottom: '4px'
  },
  presetDescription: {
    fontSize: '10px',
    color: '#888'
  },
  presetTags: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '4px',
    marginTop: '8px'
  },
  tag: {
    padding: '2px 6px',
    backgroundColor: '#3a3a3a',
    borderRadius: '3px',
    fontSize: '9px',
    color: '#888'
  },
  button: {
    padding: '10px 20px',
    backgroundColor: '#4a90d9',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 500,
    transition: 'background-color 0.2s'
  },
  buttonSecondary: {
    padding: '10px 20px',
    backgroundColor: '#3a3a3a',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 500,
    transition: 'background-color 0.2s'
  },
  buttonGroup: {
    display: 'flex',
    gap: '10px'
  },
  textInput: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#2a2a2a',
    color: '#ffffff',
    border: '1px solid #3a3a3a',
    borderRadius: '4px',
    fontSize: '14px',
    resize: 'vertical' as const,
    minHeight: '80px',
    boxSizing: 'border-box' as const
  }
};

// ============================================================================
// TextTypographyPanel Component
// ============================================================================

export const TextTypographyPanel: React.FC = () => {
  // State
  const [text, setText] = useState('Your Text Here');
  const [selectedAnimation, setSelectedAnimation] = useState<TextAnimationType>('fadeIn');
  const [duration, setDuration] = useState(1000);
  const [easing, setEasing] = useState('easeOut');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  const {
    presets,
    animationProgress,
    isComplete,
    playAnimation,
    stopAnimation
  } = useTextTypography();

  // Get animated text hook result
  const { displayedText, style: animatedStyle } = useAnimatedText(
    text,
    selectedAnimation,
    duration
  );

  // Animation type options
  const animationTypes: { value: TextAnimationType; label: string }[] = [
    { value: 'fadeIn', label: 'Fade In' },
    { value: 'fadeOut', label: 'Fade Out' },
    { value: 'slideUp', label: 'Slide Up' },
    { value: 'slideDown', label: 'Slide Down' },
    { value: 'slideLeft', label: 'Slide Left' },
    { value: 'slideRight', label: 'Slide Right' },
    { value: 'scaleIn', label: 'Scale In' },
    { value: 'scaleOut', label: 'Scale Out' },
    { value: 'blurIn', label: 'Blur In' },
    { value: 'elastic', label: 'Elastic' },
    { value: 'bounce', label: 'Bounce' },
    { value: 'typewriter', label: 'Typewriter' },
    { value: 'letterByLetter', label: 'Letter by Letter' },
    { value: 'wordByWord', label: 'Word by Word' },
    { value: 'wave', label: 'Wave' },
    { value: 'glitch', label: 'Glitch' }
  ];

  // Easing options
  const easingOptions = [
    { value: 'linear', label: 'Linear' },
    { value: 'ease', label: 'Ease' },
    { value: 'easeIn', label: 'Ease In' },
    { value: 'easeOut', label: 'Ease Out' },
    { value: 'easeInOut', label: 'Ease In Out' },
    { value: 'elastic', label: 'Elastic' },
    { value: 'bounce', label: 'Bounce' }
  ];

  // Handle animation change
  const handleAnimationChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedAnimation(e.target.value as TextAnimationType);
    setSelectedPreset(null);
  }, []);

  // Handle preset selection
  const handlePresetSelect = useCallback((presetId: string) => {
    const preset = presets.find(p => p.name.toLowerCase().replace(/\s+/g, '') === presetId);
    if (preset) {
      setSelectedPreset(presetId);
      if (preset.animation.type) {
        setSelectedAnimation(preset.animation.type);
      }
      if (preset.animation.duration) {
        setDuration(preset.animation.duration);
      }
      if (preset.animation.easing) {
        setEasing(preset.animation.easing);
      }
    }
  }, [presets]);

  // Handle replay
  const handleReplay = useCallback(() => {
    stopAnimation();
    playAnimation(text, {
      type: selectedAnimation,
      duration,
      easing: easing as any
    });
  }, [text, selectedAnimation, duration, easing, playAnimation, stopAnimation]);

  return (
    <div style={styles.panel}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.title}>Text Typography</span>
      </div>

      {/* Preview */}
      <div style={styles.previewSection}>
        <div style={{ ...styles.previewText, ...animatedStyle }}>
          {displayedText}
        </div>
      </div>

      {/* Controls */}
      <div style={styles.controlsSection}>
        {/* Text Input */}
        <div style={styles.controlGroup}>
          <label style={styles.controlLabel}>Text</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={styles.textInput}
            placeholder="Enter your text here..."
          />
        </div>

        {/* Animation Type */}
        <div style={styles.controlGroup}>
          <label style={styles.controlLabel}>Animation</label>
          <select
            value={selectedAnimation}
            onChange={handleAnimationChange}
            style={styles.select}
          >
            {animationTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Duration */}
        <div style={styles.controlGroup}>
          <label style={styles.controlLabel}>
            Duration: {duration}ms
          </label>
          <div style={styles.sliderContainer}>
            <input
              type="range"
              min="100"
              max="5000"
              step="100"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value))}
              style={styles.slider}
            />
            <span style={styles.sliderValue}>{duration}ms</span>
          </div>
        </div>

        {/* Easing */}
        <div style={styles.controlGroup}>
          <label style={styles.controlLabel}>Easing</label>
          <select
            value={easing}
            onChange={(e) => setEasing(e.target.value)}
            style={styles.select}
          >
            {easingOptions.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Presets */}
        <div style={styles.controlGroup}>
          <label style={styles.controlLabel}>Presets</label>
          <div style={styles.presetsGrid}>
            {presets.map(preset => {
              const presetId = preset.name.toLowerCase().replace(/\s+/g, '');
              const isActive = selectedPreset === presetId;
              
              return (
                <div
                  key={presetId}
                  style={{
                    ...styles.presetCard,
                    ...(isActive ? styles.presetCardActive : {})
                  }}
                  onClick={() => handlePresetSelect(presetId)}
                >
                  <div style={styles.presetName}>{preset.name}</div>
                  <div style={styles.presetDescription}>{preset.description}</div>
                  {preset.tags.length > 0 && (
                    <div style={styles.presetTags}>
                      {preset.tags.slice(0, 3).map(tag => (
                        <span key={tag} style={styles.tag}>{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={styles.controlGroup}>
          <div style={styles.buttonGroup}>
            <button style={styles.button} onClick={handleReplay}>
              Replay Animation
            </button>
            <button style={styles.buttonSecondary} onClick={stopAnimation}>
              Stop
            </button>
          </div>
        </div>

        {/* Progress */}
        <div style={styles.controlGroup}>
          <label style={styles.controlLabel}>
            Progress: {Math.round(animationProgress * 100)}%
          </label>
          <div style={{
            width: '100%',
            height: '4px',
            backgroundColor: '#3a3a3a',
            borderRadius: '2px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${animationProgress * 100}%`,
              height: '100%',
              backgroundColor: isComplete ? '#50c878' : '#4a90d9',
              transition: 'width 0.1s'
            }} />
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Animated Text Component
// ============================================================================

interface AnimatedTextDisplayProps {
  text: string;
  animation?: TextAnimationType;
  duration?: number;
  style?: React.CSSProperties;
  className?: string;
}

export const AnimatedTextDisplay: React.FC<AnimatedTextDisplayProps> = ({
  text,
  animation = 'fadeIn',
  duration = 1000,
  style,
  className
}) => {
  const { displayedText, style: animatedStyle } = useAnimatedText(
    text,
    animation,
    duration
  );

  return (
    <div
      className={className}
      style={{ ...styles.previewText, ...style, ...animatedStyle }}
    >
      {displayedText}
    </div>
  );
};

export default TextTypographyPanel;
