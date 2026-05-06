import React, { useState, _useEffect } from 'react';
import { useColorCorrectionStore } from '../../stores/colorCorrectionStore';
import { _ColorCurves, CurvePoint } from '../../types/color-correction';
import styles from './ColorCorrectionPanel.module.css';

interface CurvesEditorProps {}

export const CurvesEditor: React.FC<CurvesEditorProps> = () => {
  const { state, setPrimaryColorGrade } = useColorCorrectionStore();
  const [activeChannel, setActiveChannel] = useState<'rgb' | 'luma'>('rgb');
  const [selectedChannel, setSelectedChannel] = useState<'r' | 'g' | 'b' | 'luma'>('r');

  const _handleCurvePointChange = (channel: 'r' | 'g' | 'b' | 'luma', points: CurvePoint[]) => {
    const newCurves = { ...state.primaryGrade.curves };
    newCurves.rgb[channel === 'r' ? 0 : channel === 'g' ? 1 : channel === 'b' ? 2 : 3] = points;
    setPrimaryColorGrade({ ...state.primaryGrade, curves: newCurves });
  };

  const getChannelColor = (channel: 'r' | 'g' | 'b' | 'luma') => {
    switch (channel) {
      case 'r': return '#ff0000';
      case 'g': return '#00ff00';
      case 'b': return '#0000ff';
      case 'luma': return '#ffffff';
    }
  };

  return (
    <div className={styles.curvesPanel}>
      <div className={styles.curvesHeader}>
        <h4>Color Curves</h4>
        <div className={styles.curvesControls}>
          <button
            className={`${styles.channelBtn} ${activeChannel === 'rgb' ? styles.active : ''}`}
            onClick={() => setActiveChannel('rgb')}
          >
            RGB
          </button>
          <button
            className={`${styles.channelBtn} ${activeChannel === 'luma' ? styles.active : ''}`}
            onClick={() => setActiveChannel('luma')}
          >
            Luma
          </button>
        </div>
      </div>

      <div className={styles.curvesChannels}>
        {activeChannel === 'rgb' && (
          <div className={styles.rgbChannels}>
            <button
              className={`${styles.rgbChannelBtn} ${selectedChannel === 'r' ? styles.active : ''}`}
              onClick={() => setSelectedChannel('r')}
              style={{ color: '#ff0000' }}
            >
              R
            </button>
            <button
              className={`${styles.rgbChannelBtn} ${selectedChannel === 'g' ? styles.active : ''}`}
              onClick={() => setSelectedChannel('g')}
              style={{ color: '#00ff00' }}
            >
              G
            </button>
            <button
              className={`${styles.rgbChannelBtn} ${selectedChannel === 'b' ? styles.active : ''}`}
              onClick={() => setSelectedChannel('b')}
              style={{ color: '#0000ff' }}
            >
              B
            </button>
          </div>
        )}
      </div>

      <div className={styles.curvesCanvas}>
        <canvas
          width={400}
          height={200}
          style={{ width: '100%', height: '200px' }}
          ref={(canvas) => {
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw grid
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 0.5;
            for (let i = 0; i <= 4; i++) {
              ctx.beginPath();
              ctx.moveTo(0, (canvas.height / 4) * i);
              ctx.lineTo(canvas.width, (canvas.height / 4) * i);
              ctx.stroke();
            }
            for (let i = 0; i <= 4; i++) {
              ctx.beginPath();
              ctx.moveTo((canvas.width / 4) * i, 0);
              ctx.lineTo((canvas.width / 4) * i, canvas.height);
              ctx.stroke();
            }

            // Draw curve
            const points = state.primaryGrade.curves.rgb[selectedChannel === 'r' ? 0 : selectedChannel === 'g' ? 1 : selectedChannel === 'b' ? 2 : 3];
            if (points && points.length > 0) {
              ctx.strokeStyle = getChannelColor(selectedChannel);
              ctx.lineWidth = 2;
              ctx.beginPath();
              points.forEach((point, index) => {
                const x = (point.x * canvas.width);
                const y = canvas.height - (point.y * canvas.height);
                if (index === 0) {
                  ctx.moveTo(x, y);
                } else {
                  ctx.lineTo(x, y);
                }
              });
              ctx.stroke();
            }
          }}
        />
      </div>

      <div className={styles.curvesPresets}>
        <button className={styles.presetBtn}>S-Curve</button>
        <button className={styles.presetBtn}>Contrast</button>
        <button className={styles.presetBtn}>Log</button>
        <button className={styles.presetBtn}>Linear</button>
      </div>
    </div>
  );
};