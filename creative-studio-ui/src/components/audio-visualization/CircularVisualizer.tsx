/**
 * Circular Visualizer Component for StoryCore
 * Renders radial/circular frequency visualization
 */

import React, { useRef, useEffect, useCallback } from 'react';
import { FrequencyData } from '../../services/audio-visualization/AudioVisualizerTypes';

export interface CircularVisualizerProps {
  /** Frequency data to display */
  data: FrequencyData | null;
  /** Size of the visualizer in pixels */
  size?: number;
  /** Background color */
  backgroundColor?: string;
  /** Bar colors (gradient) */
  colors?: string[];
  /** Number of bars in the circle */
  barCount?: number;
  /** Inner radius of the circle */
  innerRadius?: number;
  /** Maximum bar height */
  maxBarHeight?: number;
  /** Bar width in degrees */
  barWidth?: number;
  /** Rotation offset in degrees */
  rotation?: number;
  /** Whether to animate rotation */
  autoRotate?: boolean;
  /** Auto-rotate speed */
  rotateSpeed?: number;
  /** Whether to show glow effect */
  glow?: boolean;
  /** Glow intensity */
  glowIntensity?: number;
  /** Whether to show bass kick visualization */
  showBassKick?: boolean;
  /** Bass kick color */
  bassKickColor?: string;
  /** Whether to mirror the visualization */
  mirror?: boolean;
  /** Class name for styling */
  className?: string;
  /** Style overrides */
  style?: React.CSSProperties;
}

export const CircularVisualizer: React.FC<CircularVisualizerProps> = ({
  data,
  size = 400,
  backgroundColor = '#0f0f1a',
  colors = ['#a55eea', '#ff6b6b', '#feca57', '#48dbfb', '#00ff88'],
  barCount = 64,
  innerRadius = 80,
  maxBarHeight = 100,
  barWidth = 5,
  rotation = 0,
  autoRotate = true,
  rotateSpeed = 0.5,
  glow = true,
  glowIntensity = 0.8,
  showBassKick = true,
  bassKickColor = '#ff6b6b',
  mirror = true,
  className,
  style,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationRef = useRef(0);
  const bassKickRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);

  const drawVisualization = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = size / 2;
    const centerY = size / 2;
    const angleStep = (Math.PI * 2) / barCount;

    // Clear canvas
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, size, size);

    // Apply rotation
    const currentRotation = rotation + rotationRef.current;
    rotationRef.current += rotateSpeed * 0.01;

    // Draw frequency bars
    if (data?.frequencyData) {
      const { frequencyData } = data;
      const step = Math.floor(frequencyData.length / barCount);

      for (let i = 0; i < barCount; i++) {
        // Calculate amplitude for this bar
        let sum = 0;
        for (let j = 0; j < step; j++) {
          const index = i * step + j;
          if (index < frequencyData.length) {
            sum += frequencyData[index];
          }
        }
        const amplitude = sum / step / 255;

        // Calculate bar dimensions
        const angle = i * angleStep + currentRotation;
        const barHeight = amplitude * maxBarHeight;

        // Get color from gradient
        const colorIndex = Math.floor((i / barCount) * (colors.length - 1));
        const color = colors[colorIndex];

        // Draw bar
        const x1 = centerX + Math.cos(angle) * innerRadius;
        const y1 = centerY + Math.sin(angle) * innerRadius;
        const x2 = centerX + Math.cos(angle) * (innerRadius + barHeight);
        const y2 = centerY + Math.sin(angle) * (innerRadius + barHeight);

        // Apply glow
        if (glow) {
          ctx.shadowColor = color;
          ctx.shadowBlur = glowIntensity * 15;
        }

        ctx.strokeStyle = color;
        ctx.lineWidth = barWidth;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Draw mirrored bar
        if (mirror) {
          const mirrorAngle = angle + Math.PI;
          const mx1 = centerX + Math.cos(mirrorAngle) * innerRadius;
          const my1 = centerY + Math.sin(mirrorAngle) * innerRadius;
          const mx2 = centerX + Math.cos(mirrorAngle) * (innerRadius + barHeight);
          const my2 = centerY + Math.sin(mirrorAngle) * (innerRadius + barHeight);

          ctx.globalAlpha = 0.5;
          ctx.beginPath();
          ctx.moveTo(mx1, my1);
          ctx.lineTo(mx2, my2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }

      // Draw bass kick effect
      if (showBassKick && bassKickRef.current > 0) {
        ctx.shadowColor = bassKickColor;
        ctx.shadowBlur = bassKickRef.current * 20;
        ctx.strokeStyle = bassKickColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(centerX, centerY, innerRadius - 10 + bassKickRef.current * 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;

        bassKickRef.current *= 0.9;
      }
    }

    // Draw center circle
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, innerRadius);
    gradient.addColorStop(0, colors[0] || '#a55eea');
    gradient.addColorStop(1, backgroundColor);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, innerRadius - 5, 0, Math.PI * 2);
    ctx.fill();

    // Draw outer ring
    ctx.strokeStyle = colors[0] || '#a55eea';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, innerRadius + maxBarHeight + 10, 0, Math.PI * 2);
    ctx.stroke();

  }, [data, size, backgroundColor, colors, barCount, innerRadius, maxBarHeight, barWidth, rotation, autoRotate, rotateSpeed, glow, glowIntensity, showBassKick, bassKickColor, mirror]);

  // Handle bass kick detection
  useEffect(() => {
    if (data && showBassKick && data.bassEnergy > 0.7 && bassKickRef.current < 0.1) {
      bassKickRef.current = data.bassEnergy;
    }
  }, [data, showBassKick]);

  // Animation loop
  useEffect(() => {
    const animate = () => {
      drawVisualization();
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    if (autoRotate || data) {
      animate();
    }

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [drawVisualization, autoRotate, data]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={className}
      style={{
        display: 'block',
        borderRadius: '50%',
        ...style,
      }}
    />
  );
};

export default CircularVisualizer;
