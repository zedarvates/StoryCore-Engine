import React, { useState } from 'react';
import { HSLQualifierSettings } from '../../types/color-correction';
import styles from './ColorCorrectionPanel.module.css';

interface QualifierPanelProps {}

export const QualifierPanel: React.FC<QualifierPanelProps> = () => {
  const [settings, setSettings] = useState<HSLQualifierSettings>({
    enabled: false,
    hue: { center: 0, width: 30, softness: 0.2 },
    saturation: { low: 0.2, high: 0.8, softLow: 0.1, softHigh: 0.9 },
    luminance: { low: 0.2, high: 0.8, softLow: 0.1, softHigh: 0.9 },
    softness: 0.2,
    showMatte: false,
  });

  const handleHueChange = (hue: number) => {
    setSettings({
      ...settings,
      hue: { ...settings.hue, center: hue },
    });
  };

  const handleHueWidthChange = (width: number) => {
    setSettings({
      ...settings,
      hue: { ...settings.hue, width: width },
    });
  };

  const handleSoftnessChange = (softness: number) => {
    setSettings({
      ...settings,
      softness: softness,
    });
  };

  const handleToggleEnabled = () => {
    setSettings({
      ...settings,
      enabled: !settings.enabled,
    });
  };

  const handleToggleShowMatte = () => {
    setSettings({
      ...settings,
      showMatte: !settings.showMatte,
    });
  };

  return (
    <div className={styles.qualifierPanel}>
      <div className={styles.qualifierHeader}>
        <h4>HSL Qualifier</h4>
        <div className={styles.qualifierToggle}>
          <label className={styles.toggleLabel}>
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={handleToggleEnabled}
            />
            <span>Qualifier {settings.enabled ? 'ON' : 'OFF'}</span>
          </label>
        </div>
      </div>

      <div className={styles.qualifierContent}>
        {/* Hue Selection */}
        <div className={styles.qualifierSection}>
          <h5>Hue</h5>
          <div className={styles.hueSelector}>
            <div className={styles.hueWheel}>
              <div
                className={styles.hueWheelBackground}
                style={{
                  background: 'conic-gradient(from 0deg, red, orange, yellow, green, blue, indigo, violet, red)',
                }}
              >
                <div
                  className={styles.hueIndicator}
                  style={{
                    left: `${(settings.hue.center / 360) * 100}%`,
                    transform: `translateX(-50%) rotate(${settings.hue.center}deg)`,
                  }}
                >
                  <div className={styles.hueHandle} />
                </div>
              </div>
            </div>
            <div className={styles.hueControls}>
              <div className={styles.sliderGroup}>
                <label>Hue</label>
                <input
                  type="range"
                  min={0}
                  max={360}
                  step={1}
                  value={settings.hue.center}
                  onChange={(e) => handleHueChange(parseFloat(e.target.value))}
                />
                <span>{settings.hue.center}°</span>
              </div>
              <div className={styles.sliderGroup}>
                <label>Width</label>
                <input
                  type="range"
                  min={0}
                  max={180}
                  step={1}
                  value={settings.hue.width}
                  onChange={(e) => handleHueWidthChange(parseFloat(e.target.value))}
                />
                <span>{settings.hue.width}°</span>
              </div>
            </div>
          </div>
        </div>

        {/* Saturation/Luminance */}
        <div className={styles.qualifierSection}>
          <h5>Saturation & Luminance</h5>
          <div className={styles.slControls}>
            <div className={styles.slGroup}>
              <div className={styles.sliderGroup}>
                <label>Sat Low</label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={settings.saturation.low}
                  onChange={(e) => setSettings({
                    ...settings,
                    saturation: { ...settings.saturation, low: parseFloat(e.target.value) },
                  })}
                />
                <span>{(settings.saturation.low * 100).toFixed(0)}%</span>
              </div>
              <div className={styles.sliderGroup}>
                <label>Sat High</label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={settings.saturation.high}
                  onChange={(e) => setSettings({
                    ...settings,
                    saturation: { ...settings.saturation, high: parseFloat(e.target.value) },
                  })}
                />
                <span>{(settings.saturation.high * 100).toFixed(0)}%</span>
              </div>
            </div>

            <div className={styles.slGroup}>
              <div className={styles.sliderGroup}>
                <label>Lum Low</label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={settings.luminance.low}
                  onChange={(e) => setSettings({
                    ...settings,
                    luminance: { ...settings.luminance, low: parseFloat(e.target.value) },
                  })}
                />
                <span>{(settings.luminance.low * 100).toFixed(0)}%</span>
              </div>
              <div className={styles.sliderGroup}>
                <label>Lum High</label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={settings.luminance.high}
                  onChange={(e) => setSettings({
                    ...settings,
                    luminance: { ...settings.luminance, high: parseFloat(e.target.value) },
                  })}
                />
                <span>{(settings.luminance.high * 100).toFixed(0)}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Softness */}
        <div className={styles.qualifierSection}>
          <h5>Softness</h5>
          <div className={styles.sliderGroup}>
            <label>Softness</label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={settings.softness}
              onChange={(e) => handleSoftnessChange(parseFloat(e.target.value))}
            />
            <span>{(settings.softness * 100).toFixed(0)}%</span>
          </div>
        </div>

        {/* Matte Preview */}
        <div className={styles.qualifierSection}>
          <h5>Matte Preview</h5>
          <div className={styles.matteToggle}>
            <label className={styles.toggleLabel}>
              <input
                type="checkbox"
                checked={settings.showMatte}
                onChange={handleToggleShowMatte}
              />
              <span>Show Matte</span>
            </label>
          </div>
        </div>

        {/* Apply Button */}
        <div className={styles.qualifierActions}>
          <button className={styles.applyBtn}>Apply Qualifier</button>
        </div>
      </div>
    </div>
  );
};