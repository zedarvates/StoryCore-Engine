import React, { useState, useEffect } from 'react';
import { useColorCorrectionStore } from '../../stores/colorCorrectionStore';
import { ColorScopeType } from '../../types/color-correction';
import styles from './ColorCorrectionPanel.module.css';

interface VideoScopesProps {}

export const VideoScopes: React.FC<VideoScopesProps> = () => {
  const { state } = useColorCorrectionStore();
  const [activeScope, setActiveScope] = useState<ColorScopeType>('waveform');

  useEffect(() => {
    // Start scope analysis if needed
  }, []);

  const getScopeData = () => {
    // This would normally analyze the current frame
    return {
      waveform: {
        type: 'luma' as const,
        data: new Array(256).fill(0).map((_, i) => Math.sin(i * 0.1) * 50 + 128),
      },
      vectorscope: {
        data: new Array(256).fill(0).map(() => ({
          x: Math.random() * 2 - 1,
          y: Math.random() * 2 - 1,
        })),
      },
      histogram: {
        r: new Array(256).fill(0).map((_, i) => Math.floor(Math.sin(i * 0.05) * 100 + 150)),
        g: new Array(256).fill(0).map((_, i) => Math.floor(Math.cos(i * 0.05) * 100 + 150)),
        b: new Array(256).fill(0).map((_, i) => Math.floor(Math.sin(i * 0.05 + Math.PI) * 100 + 150)),
        luma: new Array(256).fill(0).map((_, i) => Math.floor(Math.sin(i * 0.05) * 100 + 150)),
      },
      rgbParade: {
        r: new Array(256).fill(0).map((_, i) => Math.floor(Math.sin(i * 0.05) * 100 + 150)),
        g: new Array(256).fill(0).map((_, i) => Math.floor(Math.cos(i * 0.05) * 100 + 150)),
        b: new Array(256).fill(0).map((_, i) => Math.floor(Math.sin(i * 0.05 + Math.PI) * 100 + 150)),
      },
    };
  };

  const scopeData = getScopeData();

  return (
    <div className={styles.scopesPanel}>
      <div className={styles.scopesHeader}>
        <h4>Video Scopes</h4>
        <div className={styles.scopesControls}>
          <button
            className={`${styles.scopeBtn} ${activeScope === 'waveform' ? styles.active : ''}`}
            onClick={() => setActiveScope('waveform')}
          >
            Waveform
          </button>
          <button
            className={`${styles.scopeBtn} ${activeScope === 'vectorscope' ? styles.active : ''}`}
            onClick={() => setActiveScope('vectorscope')}
          >
            Vectorscope
          </button>
          <button
            className={`${styles.scopeBtn} ${activeScope === 'histogram' ? styles.active : ''}`}
            onClick={() => setActiveScope('histogram')}
          >
            Histogram
          </button>
          <button
            className={`${styles.scopeBtn} ${activeScope === 'rgbParade' ? styles.active : ''}`}
            onClick={() => setActiveScope('rgbParade')}
          >
            RGB Parade
          </button>
        </div>
      </div>

      <div className={styles.scopeCanvas}>
        {activeScope === 'waveform' && (
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

              // Draw waveform
              const data = scopeData.waveform.data;
              ctx.strokeStyle = '#00ff00';
              ctx.lineWidth = 1;
              ctx.beginPath();
              data.forEach((value, index) => {
                const x = (index / data.length) * canvas.width;
                const y = canvas.height - (value / 255) * canvas.height;
                if (index === 0) {
                  ctx.moveTo(x, y);
                } else {
                  ctx.lineTo(x, y);
                }
              });
              ctx.stroke();
            }}
          />
        )}

        {activeScope === 'vectorscope' && (
          <canvas
            width={400}
            height={400}
            style={{ width: '100%', height: '400px' }}
            ref={(canvas) => {
              if (!canvas) return;
              const ctx = canvas.getContext('2d');
              if (!ctx) return;

              // Clear canvas
              ctx.clearRect(0, 0, canvas.width, canvas.height);

              // Draw vectorscope background
              ctx.fillStyle = '#000';
              ctx.fillRect(0, 0, canvas.width, canvas.height);

              // Draw color targets
              const targets = [
                { color: '#ff0000', x: 0.707, y: 0.293 },
                { color: '#00ff00', x: -0.707, y: 0.293 },
                { color: '#0000ff', x: 0, y: -1 },
                { color: '#ffff00', x: 0.966, y: 0.259 },
                { color: '#ff00ff', x: 0.707, y: -0.707 },
                { color: '#00ffff', x: -0.707, y: -0.707 },
              ];

              targets.forEach((target) => {
                ctx.fillStyle = target.color;
                ctx.beginPath();
                ctx.arc(
                  (target.x + 1) * canvas.width / 2,
                  (target.y + 1) * canvas.height / 2,
                  5,
                  0,
                  2 * Math.PI
                );
                ctx.fill();
              });

              // Draw vectorscope data
              const data = scopeData.vectorscope.data;
              ctx.fillStyle = '#00ff00';
              data.forEach((point) => {
                ctx.globalAlpha = 0.5;
                ctx.beginPath();
                ctx.arc(
                  (point.x + 1) * canvas.width / 2,
                  (point.y + 1) * canvas.height / 2,
                  2,
                  0,
                  2 * Math.PI
                );
                ctx.fill();
              });
              ctx.globalAlpha = 1;
            }}
          />
        )}

        {activeScope === 'histogram' && (
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

              // Draw histogram
              const data = scopeData.histogram;
              const channels = ['r', 'g', 'b', 'luma'];
              channels.forEach((channel, index) => {
                const channelData = data[channel as keyof typeof data];
                if (!channelData) return;

                ctx.strokeStyle = channel === 'r' ? '#ff0000' : channel === 'g' ? '#00ff00' : channel === 'b' ? '#0000ff' : '#ffffff';
                ctx.lineWidth = 1;
                ctx.beginPath();
                channelData.forEach((value, i) => {
                  const x = (i / channelData.length) * canvas.width;
                  const y = canvas.height - (value / 255) * canvas.height;
                  if (i === 0) {
                    ctx.moveTo(x, y);
                  } else {
                    ctx.lineTo(x, y);
                  }
                });
                ctx.stroke();
              });
            }}
          />
        )}

        {activeScope === 'rgbParade' && (
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

              // Draw RGB parade
              const data = scopeData.rgbParade;
              const channels = ['r', 'g', 'b'];
              channels.forEach((channel, index) => {
                const channelData = data[channel as keyof typeof data];
                if (!channelData) return;

                ctx.strokeStyle = channel === 'r' ? '#ff0000' : channel === 'g' ? '#00ff00' : '#0000ff';
                ctx.lineWidth = 1;
                ctx.beginPath();
                channelData.forEach((value, i) => {
                  const x = (i / channelData.length) * canvas.width;
                  const y = canvas.height - (value / 255) * canvas.height;
                  if (i === 0) {
                    ctx.moveTo(x, y);
                  } else {
                    ctx.lineTo(x, y);
                  }
                });
                ctx.stroke();
              });
            }}
          />
        )}
      </div>
    </div>
  );
};