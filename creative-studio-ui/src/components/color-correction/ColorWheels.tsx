import React, { useState, useEffect } from 'react';
import { useColorCorrectionStore } from '../../stores/colorCorrectionStore';
import { ColorWheel } from './ColorWheel';
import { ColorWheelType } from '../../types/color-correction';
import styles from './ColorCorrectionPanel.module.css';

export const ColorWheels: React.FC = () => {
  const { state, setPrimaryColorGrade, setSecondaryColorGrade } = useColorCorrectionStore();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleColorWheelChange = (type: ColorWheelType, value: number) => {
    const newGrade = { ...state.primaryGrade };
    switch (type) {
      case 'lift':
        newGrade.lift = value;
        break;
      case 'gamma':
        newGrade.gamma = value;
        break;
      case 'gain':
        newGrade.gain = value;
        break;
      case 'offset':
        newGrade.offset = value;
        break;
      case 'contrast':
        newGrade.contrast = value;
        break;
      case 'pivot':
        newGrade.pivot = value;
        break;
      case 'saturation':
        newGrade.saturation = value;
        break;
      case 'hue':
        newGrade.hue = value;
        break;
      case 'temperature':
        newGrade.temperature = value;
        break;
      case 'tint':
        newGrade.tint = value;
        break;
    }
    setPrimaryColorGrade(newGrade);
  };

  return (
    <div className={styles.colorWheelsPanel}>
      <div className={styles.wheelsHeader}>
        <h4>Color Wheels</h4>
        <button
          className={styles.advancedToggle}
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          {showAdvanced ? '▼' : '▶'} Advanced
        </button>
      </div>

      <div className={styles.wheelsGrid}>
        <ColorWheel
          type="lift"
          label="Lift"
          color="#1a1a2e"
          value={state.primaryGrade.lift}
          onChange={handleColorWheelChange}
        />
        <ColorWheel
          type="gamma"
          label="Gamma"
          color="#16213e"
          value={state.primaryGrade.gamma}
          onChange={handleColorWheelChange}
        />
        <ColorWheel
          type="gain"
          label="Gain"
          color="#0f3460"
          value={state.primaryGrade.gain}
          onChange={handleColorWheelChange}
        />
        <ColorWheel
          type="offset"
          label="Offset"
          color="#e94560"
          value={state.primaryGrade.offset}
          onChange={handleColorWheelChange}
        />
      </div>

      {showAdvanced && (
        <div className={styles.advancedControls}>
          <div className={styles.controlRow}>
            <div className={styles.sliderGroup}>
              <label>Contrast</label>
              <input
                type="range"
                min={-100}
                max={100}
                step={1}
                value={state.primaryGrade.contrast * 100}
                onChange={(e) => handleColorWheelChange('contrast', parseFloat(e.target.value) / 100)}
              />
              <span>{state.primaryGrade.contrast.toFixed(2)}</span>
            </div>
            <div className={styles.sliderGroup}>
              <label>Pivot</label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={state.primaryGrade.pivot}
                onChange={(e) => handleColorWheelChange('pivot', parseFloat(e.target.value))}
              />
              <span>{state.primaryGrade.pivot.toFixed(2)}</span>
            </div>
          </div>

          <div className={styles.controlRow}>
            <div className={styles.sliderGroup}>
              <label>Saturation</label>
              <input
                type="range"
                min={0}
                max={2}
                step={0.01}
                value={state.primaryGrade.saturation}
                onChange={(e) => handleColorWheelChange('saturation', parseFloat(e.target.value))}
              />
              <span>{state.primaryGrade.saturation.toFixed(2)}</span>
            </div>
            <div className={styles.sliderGroup}>
              <label>Hue</label>
              <input
                type="range"
                min={-180}
                max={180}
                step={1}
                value={state.primaryGrade.hue}
                onChange={(e) => handleColorWheelChange('hue', parseFloat(e.target.value))}
              />
              <span>{state.primaryGrade.hue.toFixed(0)}°</span>
            </div>
          </div>

          <div className={styles.controlRow}>
            <div className={styles.sliderGroup}>
              <label>Temperature</label>
              <input
                type="range"
                min={-1}
                max={1}
                step={0.01}
                value={state.primaryGrade.temperature}
                onChange={(e) => handleColorWheelChange('temperature', parseFloat(e.target.value))}
              />
              <span>{state.primaryGrade.temperature.toFixed(2)}</span>
            </div>
            <div className={styles.sliderGroup}>
              <label>Tint</label>
              <input
                type="range"
                min={-1}
                max={1}
                step={0.01}
                value={state.primaryGrade.tint}
                onChange={(e) => handleColorWheelChange('tint', parseFloat(e.target.value))}
              />
              <span>{state.primaryGrade.tint.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};