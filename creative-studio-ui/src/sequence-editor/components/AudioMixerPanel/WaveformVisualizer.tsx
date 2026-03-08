import React, { useEffect, useRef } from 'react';
import './waveformVisualizer.css';

interface WaveformVisualizerProps {
  audioUrl?: string;
  isPlaying?: boolean;
  currentTime?: number;
  duration?: number;
  color?: string;
  height?: number;
}

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  currentTime = 0,
  duration = 0,
  color = '#3b82f6',
  height = 60,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dataRef = useRef<number[]>([]);

  // Generate random waveform data if no audioUrl or real data provided
  useEffect(() => {
    if (!dataRef.current.length) {
      const data = [];
      for (let i = 0; i < 100; i++) {
        data.push(Math.random() * 0.8 + 0.1);
      }
      dataRef.current = data;
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      const barWidth = width / dataRef.current.length;
      const progress = duration > 0 ? (currentTime / duration) : 0;
      const progressIndex = Math.floor(progress * dataRef.current.length);

      dataRef.current.forEach((val, i) => {
        const x = i * barWidth;
        const barHeight = val * height;
        const y = (height - barHeight) / 2;

        // Color based on playhead position
        ctx.fillStyle = i < progressIndex ? color : `${color}44`;
        
        // Draw rounded bars
        const radius = 2;
        ctx.beginPath();
        const rectX = x + 1;
        const rectY = y;
        const rectW = barWidth - 2;
        const rectH = barHeight;
        
        if (rectW > 0 && rectH > 0) {
          ctx.roundRect(rectX, rectY, rectW, rectH, radius);
          ctx.fill();
        }
      });

      // Draw playhead
      if (duration > 0) {
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(progress * width, 0, 2, height);
      }
    };

    draw();
  }, [currentTime, duration, color, height]);

  return (
    <div className="waveform-visualizer" style={{ height }}>
      <canvas
        ref={canvasRef}
        width={400}
        height={height}
        className="waveform-canvas"
      />
    </div>
  );
};
