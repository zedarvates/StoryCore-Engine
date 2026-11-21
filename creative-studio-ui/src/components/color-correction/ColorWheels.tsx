import React, { useId, useState } from 'react';
import { useColorCorrectionStore } from '../../stores/colorCorrectionStore';
import { ColorWheel } from './ColorWheel';
import type { ColorWheelType } from '../../types/color-wheel';
import styles from './ColorCorrectionPanel.module.css';

export const ColorWheels: React.FC = () => {
  const grade = useColorCorrectionStore((store) => store.state.globalAdjustment);
  const updateGlobalAdjustment = useColorCorrectionStore((store) => store.updateGlobalAdjustment);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const hueSliderId = useId();
  const hue = grade.hsl.find((entry) => entry.colorRange === 'all')?.hue ?? 0;

  const handleColorWheelChange = (type: ColorWheelType, value: number) => {
    switch (type) {
      case 'lift':
      case 'gamma':
      case 'gain':
      case 'offset':
        updateGlobalAdjustment({ [type]: [value, value, value] });
        break;
      case 'contrast':
      case 'pivot':
      case 'saturation':
      case 'temperature':
      case 'tint':
        updateGlobalAdjustment({ [type]: value });
        break;
      case 'hue': {
        const hasGlobalHue = grade.hsl.some((entry) => entry.colorRange === 'all');
        const hsl = hasGlobalHue
          ? grade.hsl.map((entry) => entry.colorRange === 'all' ? { ...entry, hue: value } : entry)
          : [...grade.hsl, { colorRange: 'all' as const, hue: value, saturation: 0, luminance: 0 }];
        updateGlobalAdjustment({ hsl });
        break;
      }
    }
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
          value={grade.lift[0]}
          onChange={handleColorWheelChange}
        />
        <ColorWheel
          type="gamma"
          label="Gamma"
          color="#16213e"
          value={grade.gamma[0]}
          onChange={handleColorWheelChange}
        />
        <ColorWheel
          type="gain"
          label="Gain"
          color="#0f3460"
          value={grade.gain[0]}
          onChange={handleColorWheelChange}
        />
        <ColorWheel
          type="offset"
          label="Offset"
          color="#e94560"
          value={grade.offset[0]}
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
                value={grade.contrast * 100}
                onChange={(e) => handleColorWheelChange('contrast', parseFloat(e.target.value) / 100)}
              />
              <span>{grade.contrast.toFixed(2)}</span>
            </div>
            <div className={styles.sliderGroup}>
              <label>Pivot</label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={grade.pivot}
                onChange={(e) => handleColorWheelChange('pivot', parseFloat(e.target.value))}
              />
              <span>{grade.pivot.toFixed(2)}</span>
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
                value={grade.saturation}
                onChange={(e) => handleColorWheelChange('saturation', parseFloat(e.target.value))}
              />
              <span>{grade.saturation.toFixed(2)}</span>
            </div>
            <div className={styles.sliderGroup}>
              <label htmlFor={hueSliderId}>Hue</label>
              <input
                id={hueSliderId}
                type="range"
                min={-180}
                max={180}
                step={1}
                value={hue}
                onChange={(e) => handleColorWheelChange('hue', parseFloat(e.target.value))}
              />
              <span>{hue.toFixed(0)}°</span>
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
                value={grade.temperature}
                onChange={(e) => handleColorWheelChange('temperature', parseFloat(e.target.value))}
              />
              <span>{grade.temperature.toFixed(2)}</span>
            </div>
            <div className={styles.sliderGroup}>
              <label>Tint</label>
              <input
                type="range"
                min={-1}
                max={1}
                step={0.01}
                value={grade.tint}
                onChange={(e) => handleColorWheelChange('tint', parseFloat(e.target.value))}
              />
              <span>{grade.tint.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
