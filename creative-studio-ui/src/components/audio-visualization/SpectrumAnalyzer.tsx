/**
 * Spectrum Analyzer Component for StoryCore
 * Renders FFT-based frequency spectrum visualization
 */

import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { FrequencyData } from '../../services/audio-visualization/AudioVisualizerTypes';

export interface SpectrumAnalyzerProps {
  /** Frequency data to display */
  data: FrequencyData | null;
  /** Width of the visualizer in pixels */
  width?: number;
  /** Height of the visualizer in pixels */
  height?: number;
  /** Background color */
  backgroundColor?: string;
  /** Bar colors (gradient) */
  colors?: string[];
  /** Whether to use GPU acceleration (WebGL) */
  gpuAccelerated?: boolean;
  /** Number of frequency bands to display */
  bandCount?: number;
  /** Bar width in pixels */
  barWidth?: number;
  /** Bar spacing in pixels */
  barSpacing?: number;
  /** Whether to show decibel labels */
  showLabels?: boolean;
  /** Whether to show frequency markers */
  showFrequencyMarkers?: boolean;
  /** Whether to mirror the spectrum */
  mirror?: boolean;
  /** Whether to show peak indicators */
  showPeaks?: boolean;
  /** Peak decay rate */
  peakDecay?: number;
  /** Glow intensity */
  glowIntensity?: number;
  /** Class name for styling */
  className?: string;
  /** Style overrides */
  style?: React.CSSProperties;
}

export const SpectrumAnalyzer: React.FC<SpectrumAnalyzerProps> = ({
  data,
  width = 800,
  height = 300,
  backgroundColor = '#0f0f1a',
  colors = ['#00ff88', '#00d4ff', '#ff6b6b', '#feca57'],
  gpuAccelerated = false,
  bandCount = 64,
  barWidth = 8,
  barSpacing = 2,
  showLabels = true,
  showFrequencyMarkers = true,
  mirror = true,
  showPeaks = true,
  peakDecay = 0.95,
  glowIntensity = 0.5,
  className,
  style,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const peakValuesRef = useRef<number[]>([]);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Initialize peak values
  useEffect(() => {
    peakValuesRef.current = new Array(bandCount).fill(0);
  }, [bandCount]);

  // Create color gradient
  const colorGradient = useMemo(() => {
    const gradient = [];
    const steps = colors.length - 1;
    for (let i = 0; i <= steps; i++) {
      gradient.push(colors[Math.min(i, colors.length - 1)]);
    }
    return gradient;
  }, [colors]);

  // Draw using Canvas 2D
  const drawWithCanvas2D = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data?.frequencyData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    const { frequencyData } = data;
    const binCount = frequencyData.length;
    const step = Math.floor(binCount / bandCount);
    const padding = barSpacing;

    // Draw frequency bands
    for (let i = 0; i < bandCount; i++) {
      // Calculate average amplitude for this band
      let sum = 0;
      for (let j = 0; j < step; j++) {
        const index = i * step + j;
        if (index < binCount) {
          sum += frequencyData[index];
        }
      }
      const avgAmplitude = sum / step / 255;

      // Calculate peak value with decay
      if (showPeaks) {
        peakValuesRef.current[i] = Math.max(
          peakValuesRef.current[i] * peakDecay,
          avgAmplitude
        );
      }

      const barHeight = avgAmplitude * height * 0.9;
      const x = i * (barWidth + padding);
      const y = height - barHeight;

      // Create gradient for this bar
      const gradient = ctx.createLinearGradient(x, height, x, y);
      const colorIndex = Math.floor((i / bandCount) * (colorGradient.length - 1));
      const nextColorIndex = Math.min(colorIndex + 1, colorGradient.length - 1);
      const t = (i / bandCount) * (colorGradient.length - 1) - colorIndex;

      gradient.addColorStop(0, colorGradient[colorIndex]);
      gradient.addColorStop(1, colorGradient[nextColorIndex] || colorGradient[colorGradient.length - 1]);

      // Draw bar with glow effect
      if (glowIntensity > 0) {
        ctx.shadowColor = colorGradient[Math.floor(i / bandCount * (colors.length - 1))];
        ctx.shadowBlur = glowIntensity * 10;
      }

      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, barWidth, barHeight);

      // Draw peak indicator
      if (showPeaks && peakValuesRef.current[i] > 0) {
        const peakHeight = peakValuesRef.current[i] * height * 0.9;
        const peakY = height - peakHeight;

        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 0;
        ctx.fillRect(x, peakY - 2, barWidth, 4);
      }

      ctx.shadowBlur = 0;
    }

    // Draw mirrored spectrum
    if (mirror) {
      ctx.globalAlpha = 0.3;
      for (let i = 0; i < bandCount; i++) {
        let sum = 0;
        for (let j = 0; j < step; j++) {
          const index = i * step + j;
          if (index < binCount) {
            sum += frequencyData[index];
          }
        }
        const avgAmplitude = sum / step / 255;
        const barHeight = avgAmplitude * height * 0.9;
        const x = i * (barWidth + padding);
        const y = height - barHeight;

        ctx.fillStyle = colorGradient[Math.floor(i / bandCount * (colors.length - 1))];
        ctx.fillRect(x, 0, barWidth, barHeight);
      }
      ctx.globalAlpha = 1;
    }

    // Draw frequency markers
    if (showFrequencyMarkers) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '10px sans-serif';
      
      const markers = [
        { freq: 20, label: '20 Hz' },
        { freq: 200, label: '200 Hz' },
        { freq: 1000, label: '1 kHz' },
        { freq: 5000, label: '5 kHz' },
        { freq: 20000, label: '20 kHz' },
      ];

      const nyquist = 22050; // Half of 44100 sample rate
      for (const marker of markers) {
        const x = (Math.log10(marker.freq) / Math.log10(nyquist)) * width;
        if (x > 0 && x < width) {
          ctx.fillText(marker.label, x + 2, height - 5);
          ctx.fillRect(x, height - 15, 1, 15);
        }
      }
    }
  }, [data, width, height, backgroundColor, colors, bandCount, barWidth, barSpacing, showPeaks, peakDecay, glowIntensity, mirror, showFrequencyMarkers, colorGradient]);

  // Draw using WebGL (for GPU acceleration)
  const drawWithWebGL = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data?.frequencyData) return;

    let gl = glRef.current;
    
    if (!gl) {
      gl = canvas.getContext('webgl', { alpha: false });
      if (!gl) return;
      glRef.current = gl;
    }

    // WebGL rendering would be implemented here for better performance
    // For now, fallback to 2D
    drawWithCanvas2D();
  }, [data, drawWithCanvas2D]);

  useEffect(() => {
    if (gpuAccelerated) {
      drawWithWebGL();
    } else {
      drawWithCanvas2D();
    }
  }, [gpuAccelerated, drawWithWebGL, drawWithCanvas2D]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (glRef.current) {
        glRef.current = null;
      }
    };
  }, []);

  return (
    <div className={className} style={style}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          display: 'block',
          borderRadius: '8px',
        }}
      />
      {showLabels && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '4px 8px',
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          borderRadius: '0 0 8px 8px',
          fontSize: '10px',
          color: 'rgba(255, 255, 255, 0.6)',
        }}>
          <span>20 Hz</span>
          <span>200 Hz</span>
          <span>1 kHz</span>
          <span>5 kHz</span>
          <span>20 kHz</span>
        </div>
      )}
    </div>
  );
};

export default SpectrumAnalyzer;
