import React, { useRef, useEffect, useState } from 'react';
import styles from './AudioWaveformEditor.module.css';

interface CurvePoint {
  time: number;
  value: number;
}

interface AudioWaveformEditorProps {
  audioUrl: string;
  audioId: string;
  duration: number;
  onCurveChange: (curvePoints: CurvePoint[]) => void;
}

export const AudioWaveformEditor: React.FC<AudioWaveformEditorProps> = ({
  audioUrl,
  duration,
  onCurveChange
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [curvePoints, setCurvePoints] = useState<CurvePoint[]>([]);
  const [viewMode, setViewMode] = useState<'waveform' | 'spectrum' | 'combined'>('combined');

  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const width = canvasRef.current.width;
    const height = canvasRef.current.height;

    ctx.clearRect(0, 0, width, height);

    // Draw waveform
    ctx.fillStyle = 'rgba(0, 150, 255, 0.3)';
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    for (let i = 0; i < width; i++) {
      const y = height / 2 + Math.sin(i * 0.02) * (height / 3) * Math.random();
      ctx.lineTo(i, y);
    }
    ctx.lineTo(width, height / 2);
    ctx.fill();

    // Draw curve
    if (curvePoints.length >= 2) {
      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth = 3;
      ctx.beginPath();
      curvePoints.forEach((point, i) => {
        const x = point.time * width;
        const y = (1 - point.value) * height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }
  }, [audioUrl, curvePoints, viewMode]);

  const curvePresets = [
    { name: 'Fade In', points: [{ time: 0, value: 0 }, { time: 1, value: 1 }] },
    { name: 'Fade Out', points: [{ time: 0, value: 1 }, { time: 1, value: 0 }] },
    { name: 'Duck', points: [{ time: 0, value: 1 }, { time: 0.5, value: 0.3 }, { time: 1, value: 1 }] },
  ];

  return (
    <div className={styles.editorContainer}>
      <div className={styles.header}>
        <h4>Audio Waveform</h4>
        <div className={styles.viewToggle}>
          {['waveform', 'spectrum', 'combined'].map(mode => (
            <button
              key={mode}
              className={`${styles.viewBtn} ${viewMode === mode ? styles.active : ''}`}
              onClick={() => setViewMode(mode as any)}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      <canvas ref={canvasRef} width={800} height={150} className={styles.waveformCanvas} />

      <div className={styles.curveEditor}>
        <h5>Volume Curve</h5>
        <div className={styles.curvePresets}>
          {curvePresets.map(preset => (
            <button
              key={preset.name}
              className={styles.presetBtn}
              onClick={() => { setCurvePoints(preset.points); onCurveChange(preset.points); }}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.actions}>
        <button className={styles.actionBtn} onClick={() => { setCurvePoints([]); onCurveChange([]); }}>
          Effacer
        </button>
        <button className={styles.actionBtn}>Appliquer</button>
      </div>
    </div>
  );
};

export default AudioWaveformEditor;

