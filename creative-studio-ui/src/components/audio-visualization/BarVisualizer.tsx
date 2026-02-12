/**
 * Bar Visualizer Component for StoryCore
 * Renders frequency data as animated bars
 */

import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { FrequencyData } from '../../services/audio-visualization/AudioVisualizerTypes';

export interface BarVisualizerProps {
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
  /** Number of bars to display */
  barCount?: number;
  /** Bar width in pixels */
  barWidth?: number;
  /** Bar spacing in pixels */
  barSpacing?: number;
  /** Whether to use gradient fill */
  gradientFill?: boolean;
  /** Whether to reflect bars */
  reflection?: boolean;
  /** Reflection opacity */
  reflectionOpacity?: number;
  /** Whether to show peak indicators */
  peakHold?: boolean;
  /** Peak decay rate */
  peakDecay?: number;
  /** Whether to show glow effect */
  glow?: boolean;
  /** Glow intensity */
  glowIntensity?: number;
  /** Whether to animate bars with smoothing */
  smoothing?: number;
  /** Whether to use logarithmic scale */
  logarithmic?: boolean;
  /** Whether to show center line */
  showCenterLine?: boolean;
  /** Center line color */
  centerLineColor?: string;
  /** Class name for styling */
  className?: string;
  /** Style overrides */
  style?: React.CSSProperties;
}

export const BarVisualizer: React.FC<BarVisualizerProps> = ({
  data,
  width = 800,
  height = 300,
  backgroundColor = '#1a1a2e',
  colors = ['#00d4ff', '#00ff88', '#ff6b6b', '#feca57'],
  barCount = 64,
  barWidth = 10,
  barSpacing = 2,
  gradientFill = true,
  reflection = true,
  reflectionOpacity = 0.3,
  peakHold = true,
  peakDecay = 0.98,
  glow = true,
  glowIntensity = 0.6,
  smoothing = 0.9,
  logarithmic = true,
  showCenterLine = true,
  centerLineColor = 'rgba(255, 255, 255, 0.2)',
  className,
  style,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previousValuesRef = useRef<number[]>([]);
  const peakValuesRef = useRef<number[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  // Initialize arrays
  useEffect(() => {
    previousValuesRef.current = new Array(barCount).fill(0);
    peakValuesRef.current = new Array(barCount).fill(0);
  }, [barCount]);

  // Create color gradient
  const colorGradient = useMemo(() => {
    if (colors.length <= 1) return colors;
    return colors;
  }, [colors]);

  const drawBars = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerY = height / 2;
    const totalBars = reflection ? barCount * 2 : barCount;
    const totalWidth = totalBars * (barWidth + barSpacing);
    const startX = (width - totalWidth) / 2;

    // Clear canvas
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Draw center line
    if (showCenterLine) {
      ctx.strokeStyle = centerLineColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(width, centerY);
      ctx.stroke();
    }

    if (!data?.frequencyData) return;

    const { frequencyData } = data;
    const binCount = frequencyData.length;
    const step = Math.floor(binCount / barCount);

    // Draw bars
    for (let i = 0; i < barCount; i++) {
      // Calculate amplitude for this bar
      let sum = 0;
      for (let j = 0; j < step; j++) {
        const index = i * step + j;
        if (index < binCount) {
          sum += frequencyData[index];
        }
      }
      
      let amplitude = sum / step / 255;

      // Apply logarithmic scale
      if (logarithmic) {
        amplitude = Math.pow(amplitude, 0.5);
      }

      // Apply smoothing
      const prevValue = previousValuesRef.current[i] || 0;
      const smoothedValue = prevValue * smoothing + amplitude * (1 - smoothing);
      previousValuesRef.current[i] = smoothedValue;

      // Calculate bar dimensions
      const barHeight = smoothedValue * height * 0.45;
      const x = startX + i * (barWidth + barSpacing);
      const y = centerY - barHeight;

      // Get color
      const colorIndex = Math.floor((i / barCount) * (colorGradient.length - 1));
      const color = colorGradient[colorIndex] || colorGradient[0];

      // Apply glow
      if (glow) {
        ctx.shadowColor = color;
        ctx.shadowBlur = glowIntensity * 15;
      }

      // Draw bar with gradient
      if (gradientFill) {
        const gradient = ctx.createLinearGradient(x, centerY, x, y);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, adjustColorBrightness(color, 50));
        ctx.fillStyle = gradient;
      } else {
        ctx.fillStyle = color;
      }

      // Draw bar
      ctx.fillRect(x, y, barWidth, barHeight);

      // Draw peak indicator
      if (peakHold) {
        const peakValue = peakValuesRef.current[i] || 0;
        if (smoothedValue > peakValue) {
          peakValuesRef.current[i] = smoothedValue;
        } else {
          peakValuesRef.current[i] *= peakDecay;
        }

        if (peakValuesRef.current[i] > 0.05) {
          const peakY = centerY - peakValuesRef.current[i] * height * 0.45;
          ctx.fillStyle = '#ffffff';
          ctx.shadowBlur = 0;
          ctx.fillRect(x, peakY - 2, barWidth, 3);
        }
      }

      // Draw reflection
      if (reflection) {
        const reflectionY = centerY + barHeight;
        const reflectionHeight = barHeight * reflectionOpacity;

        ctx.globalAlpha = reflectionOpacity;
        ctx.fillStyle = color;
        ctx.fillRect(x, reflectionY, barWidth, reflectionHeight);
        ctx.globalAlpha = 1;
      }

      ctx.shadowBlur = 0;
    }

    // Draw bass indicator
    if (data.bassEnergy > 0.6) {
      const bassWidth = width * 0.3;
      const bassX = (width - bassWidth) / 2;
      
      ctx.fillStyle = `rgba(255, 107, 107, ${data.bassEnergy * 0.5})`;
      ctx.fillRect(bassX, height - 10, bassWidth, 10);
    }

    // Draw mid indicator
    if (data.midEnergy > 0.5) {
      const midWidth = width * 0.2;
      const midX = (width - midWidth) / 2;
      
      ctx.fillStyle = `rgba(254, 202, 87, ${data.midEnergy * 0.4})`;
      ctx.fillRect(midX, height - 10, midWidth, 10);
    }

    // Draw high indicator
    if (data.highEnergy > 0.4) {
      const highWidth = width * 0.15;
      const highX = (width - highWidth) / 2;
      
      ctx.fillStyle = `rgba(0, 212, 255, ${data.highEnergy * 0.3})`;
      ctx.fillRect(highX, height - 10, highWidth, 10);
    }

  }, [data, width, height, backgroundColor, colors, barCount, barWidth, barSpacing, gradientFill, reflection, reflectionOpacity, peakHold, peakDecay, glow, glowIntensity, smoothing, logarithmic, showCenterLine, centerLineColor, colorGradient]);

  // Animation loop
  useEffect(() => {
    const animate = () => {
      drawBars();
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [drawBars]);

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

/**
 * Helper function to adjust color brightness
 */
function adjustColorBrightness(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, Math.max(0, (num >> 16) + amt));
  const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amt));
  const B = Math.min(255, Math.max(0, (num & 0x0000ff) + amt));
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
}

export default BarVisualizer;
