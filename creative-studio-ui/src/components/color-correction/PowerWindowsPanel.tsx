import { LegacyAny } from '@/types/legacy';
import Re_act, { useState } from 'react';
import { HSLQualifierSettings } from '../../types/color-correction';
import styles from './ColorCorrectionPanel.module.css';

interface PowerWindowsPanelProps {}

export const PowerWindowsPanel: React.FC<PowerWindowsPanelProps> = () => {
  const [activeWindow, setActiveWindow] = useState<'circle' | 'polygon' | 'gradient'>('circle');
  const [windows, setWindows] = useState<LegacyAny[]>([]);

  const handleAddWindow = (type: 'circle' | 'polygon' | 'gradient') => {
    const newWindow = {
      id: Date.now().toString(),
      type: type,
      enabled: true,
      feather: 0.2,
      invert: false,
      points: type === 'circle' ? [{ x: 0.5, y: 0.5, radius: 0.3 }] : [],
    };
    setWindows([...windows, newWindow]);
  };

  const handleWindowChange = (id: string, changes: LegacyAny) => {
    setWindows(windows.map(window => 
      window.id === id ? { ...window, ...changes } : window
    ));
  };

  const handleDeleteWindow = (id: string) => {
    setWindows(windows.filter(window => window.id !== id));
  };

  return (
    <div className={styles.powerWindowsPanel}>
      <div className={styles.powerWindowsHeader}>
        <h4>Power Windows</h4>
        <div className={styles.windowControls}>
          <button
            className={`${styles.windowBtn} ${activeWindow === 'circle' ? styles.active : ''}`}
            onClick={() => setActiveWindow('circle')}
          >
            Circle
          </button>
          <button
            className={`${styles.windowBtn} ${activeWindow === 'polygon' ? styles.active : ''}`}
            onClick={() => setActiveWindow('polygon')}
          >
            Polygon
          </button>
          <button
            className={`${styles.windowBtn} ${activeWindow === 'gradient' ? styles.active : ''}`}
            onClick={() => setActiveWindow('gradient')}
          >
            Gradient
          </button>
          <button className={styles.addBtn} onClick={() => handleAddWindow(activeWindow)}>
            + Add
          </button>
        </div>
      </div>

      <div className={styles.windowsList}>
        {windows.map((window) => (
          <div key={window.id} className={styles.windowCard}>
            <div className={styles.windowHeader}>
              <h5>{window.type} Window</h5>
              <div className={styles.windowActions}>
                <label className={styles.toggleLabel}>
                  <input
                    type="checkbox"
                    checked={window.enabled}
                    onChange={(e) => handleWindowChange(window.id, { enabled: e.target.checked })}
                  />
                  <span>Enabled</span>
                </label>
                <button
                  className={styles.deleteBtn}
                  onClick={() => handleDeleteWindow(window.id)}
                >
                  ×
                </button>
              </div>
            </div>

            {window.type === 'circle' && (
              <div className={styles.circleWindow}>
                <div className={styles.windowPreview}>
                  <div className={styles.circleMask}>
                    <div
                      className={styles.circleHandle}
                      style={{
                        left: `${window.points[0].x * 100}%`,
                        top: `${window.points[0].y * 100}%`,
                      }}
                    >
                      <div className={styles.handle} />
                    </div>
                  </div>
                </div>

                <div className={styles.windowControls}>
                  <div className={styles.sliderGroup}>
                    <label>Position X</label>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={window.points[0].x}
                      onChange={(e) => handleWindowChange(window.id, {
                        points: [{ ...window.points[0], x: parseFloat(e.target.value) }]
                      })}
                    />
                    <span>{(window.points[0].x * 100).toFixed(0)}%</span>
                  </div>

                  <div className={styles.sliderGroup}>
                    <label>Position Y</label>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={window.points[0].y}
                      onChange={(e) => handleWindowChange(window.id, {
                        points: [{ ...window.points[0], y: parseFloat(e.target.value) }]
                      })}
                    />
                    <span>{(window.points[0].y * 100).toFixed(0)}%</span>
                  </div>

                  <div className={styles.sliderGroup}>
                    <label>Radius</label>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={window.points[0].radius}
                      onChange={(e) => handleWindowChange(window.id, {
                        points: [{ ...window.points[0], radius: parseFloat(e.target.value) }]
                      })}
                    />
                    <span>{(window.points[0].radius * 100).toFixed(0)}%</span>
                  </div>

                  <div className={styles.sliderGroup}>
                    <label>Feather</label>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={window.feather}
                      onChange={(e) => handleWindowChange(window.id, { feather: parseFloat(e.target.value) })}
                    />
                    <span>{(window.feather * 100).toFixed(0)}%</span>
                  </div>

                  <div className={styles.toggleGroup}>
                    <label className={styles.toggleLabel}>
                      <input
                        type="checkbox"
                        checked={window.invert}
                        onChange={(e) => handleWindowChange(window.id, { invert: e.target.checked })}
                      />
                      <span>Invert</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {window.type === 'polygon' && (
              <div className={styles.polygonWindow}>
                <div className={styles.windowPreview}>
                  <svg width="100%" height="200" viewBox="0 0 400 200">
                    <polygon
                      points={window.points.map(p => `${p.x * 400},${p.y * 200}`).join(' ')}
                      fill="rgba(255, 0, 0, 0.3)"
                      stroke="red"
                      strokeWidth="2"
                    />
                  </svg>
                </div>

                <div className={styles.windowControls}>
                  <div className={styles.sliderGroup}>
                    <label>Feather</label>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={window.feather}
                      onChange={(e) => handleWindowChange(window.id, { feather: parseFloat(e.target.value) })}
                    />
                    <span>{(window.feather * 100).toFixed(0)}%</span>
                  </div>

                  <div className={styles.toggleGroup}>
                    <label className={styles.toggleLabel}>
                      <input
                        type="checkbox"
                        checked={window.invert}
                        onChange={(e) => handleWindowChange(window.id, { invert: e.target.checked })}
                      />
                      <span>Invert</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {window.type === 'gradient' && (
              <div className={styles.gradientWindow}>
                <div className={styles.windowPreview}>
                  <div
                    className={styles.gradientMask}
                    style={{
                      background: `linear-gradient(to right, transparent 0%, rgba(255, 0, 0, 0.5) 50%, transparent 100%)`,
                    }}
                  />
                </div>

                <div className={styles.windowControls}>
                  <div className={styles.sliderGroup}>
                    <label>Angle</label>
                    <input
                      type="range"
                      min={0}
                      max={360}
                      step={1}
                      value={window.angle || 0}
                      onChange={(e) => handleWindowChange(window.id, { angle: parseFloat(e.target.value) })}
                    />
                    <span>{(window.angle || 0).toFixed(0)}°</span>
                  </div>

                  <div className={styles.sliderGroup}>
                    <label>Feather</label>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={window.feather}
                      onChange={(e) => handleWindowChange(window.id, { feather: parseFloat(e.target.value) })}
                    />
                    <span>{(window.feather * 100).toFixed(0)}%</span>
                  </div>

                  <div className={styles.toggleGroup}>
                    <label className={styles.toggleLabel}>
                      <input
                        type="checkbox"
                        checked={window.invert}
                        onChange={(e) => handleWindowChange(window.id, { invert: e.target.checked })}
                      />
                      <span>Invert</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};