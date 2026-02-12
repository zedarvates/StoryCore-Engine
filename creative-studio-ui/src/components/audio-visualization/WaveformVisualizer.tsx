/**
 * Waveform Visualizer Component for StoryCore
 * Renders real-time audio waveform data
 */

import React, { useRef, useEffect, useCallback } from 'react';
import { WaveformData } from '../../services/audio-visualization/AudioVisualizerTypes';

export interface WaveformVisualizerProps {
  /** Waveform data to display */
  data: WaveformData | null;
  /** Width of the visualizer in pixels */
  width?: number;
  /** Height of the visualizer in pixels */
  height?: number;
  /** Background color */
  backgroundColor?: string;
  /** Line color */
  lineColor?: string;
  /** Line width */
  lineWidth?: number;
  /** Whether to mirror the waveform */
  mirror?: boolean;
  /** Whether to show RMS indicator */
  showRMS?: boolean;
  /** RMS line color */
  rmsColor?: string;
  /** Whether to show peaks */
  showPeaks?: boolean;
  /** Peak color */
  peakColor?: string;
  /** Class name for styling */
  className?: string;
  /** Style overrides */
  style?: React.CSSProperties;
}

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  data,
  width = 800,
  height = 200,
  backgroundColor = '#1a1a2e',
  lineColor = '#00d4ff',
  lineWidth = 2,
  mirror = true,
  showRMS = true,
  rmsColor = '#ff6b6b',
  showPeaks = true,
  peakColor = '#feca57',
  className,
  style,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data?.timeDomainData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { timeDomainData, rms, peaks, currentTime, duration } = data;
    const centerY = height / 2;

    // Clear canvas
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Draw center line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();

    // Calculate scaling factors
    const bufferLength = timeDomainData.length;
    const sliceWidth = width / bufferLength;
    const amplitude = height * 0.4;

    // Draw waveform
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();

    for (let i = 0; i < bufferLength; i++) {
      const v = timeDomainData[i];
      const y = centerY + v * amplitude;

      if (i === 0) {
        ctx.moveTo(0, y);
      } else {
        ctx.lineTo(i * sliceWidth, y);
      }
    }

    ctx.stroke();

    // Draw mirrored waveform
    if (mirror) {
      ctx.strokeStyle = lineColor;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();

      for (let i = 0; i < bufferLength; i++) {
        const v = timeDomainData[i];
        const y = centerY - v * amplitude;

        if (i === 0) {
          ctx.moveTo(0, y);
        } else {
          ctx.lineTo(i * sliceWidth, y);
        }
      }

      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Draw RMS indicator
    if (showRMS && data.rms > 0) {
      ctx.strokeStyle = rmsColor;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(0, centerY + data.rms * amplitude);
      ctx.lineTo(width, centerY + data.rms * amplitude);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw peak indicators
    if (showPeaks && peaks.length > 0) {
      ctx.fillStyle = peakColor;
      for (const peak of peaks) {
        const peakX = peak * width;
        const peakY = centerY - timeDomainData[Math.floor(peak * bufferLength)] * amplitude;
        
        ctx.beginPath();
        ctx.arc(peakX, peakY, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw time indicator
    if (duration > 0) {
      const timeX = (currentTime / duration) * width;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(timeX, 0);
      ctx.lineTo(timeX, height);
      ctx.stroke();
    }

    // Draw progress bar at bottom
    if (duration > 0) {
      const progress = currentTime / duration;
      ctx.fillStyle = lineColor;
      ctx.fillRect(0, height - 4, width * progress, 4);
    }
  }, [data, width, height, backgroundColor, lineColor, lineWidth, mirror, showRMS, rmsColor, showPeaks, peakColor]);

  useEffect(() => {
    drawWaveform();
  }, [drawWaveform]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
      style={{
        display: 'block',
        borderRadius: '8px',
        ...style,
      }}
    />
  );
};

export default WaveformVisualizer;
