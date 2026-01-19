import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { AutomationCurve, AudioKeyframe } from '../types';

interface AudioCurveEditorProps {
  curve: AutomationCurve;
  duration: number; // Track duration in seconds
  parameterRange: { min: number; max: number };
  parameterLabel: string;
  onUpdate: (curve: AutomationCurve) => void;
  width?: number;
  height?: number;
}

export const AudioCurveEditor: React.FC<AudioCurveEditorProps> = ({
  curve,
  duration,
  parameterRange,
  parameterLabel,
  onUpdate,
  width = 600,
  height = 200,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedKeyframe, setSelectedKeyframe] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredKeyframe, setHoveredKeyframe] = useState<string | null>(null);

  // Grid configuration
  const GRID_COLOR = '#e5e7eb';
  const CURVE_COLOR = '#3b82f6';
  const KEYFRAME_COLOR = '#3b82f6';
  const KEYFRAME_SELECTED_COLOR = '#1d4ed8';
  const KEYFRAME_HOVER_COLOR = '#60a5fa';
  const KEYFRAME_RADIUS = 6;
  const PADDING = 40;

  // Convert time to canvas X coordinate
  const timeToX = useCallback(
    (time: number): number => {
      return PADDING + ((time / duration) * (width - 2 * PADDING));
    },
    [duration, width]
  );

  // Convert value to canvas Y coordinate (inverted)
  const valueToY = useCallback(
    (value: number): number => {
      const normalized = (value - parameterRange.min) / (parameterRange.max - parameterRange.min);
      return height - PADDING - (normalized * (height - 2 * PADDING));
    },
    [parameterRange, height]
  );

  // Convert canvas X to time
  const xToTime = useCallback(
    (x: number): number => {
      return Math.max(0, Math.min(duration, ((x - PADDING) / (width - 2 * PADDING)) * duration));
    },
    [duration, width]
  );

  // Convert canvas Y to value
  const yToValue = useCallback(
    (y: number): number => {
      const normalized = 1 - ((y - PADDING) / (height - 2 * PADDING));
      return Math.max(
        parameterRange.min,
        Math.min(parameterRange.max, parameterRange.min + normalized * (parameterRange.max - parameterRange.min))
      );
    },
    [parameterRange, height]
  );

  // Draw the curve editor
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw grid
    drawGrid(ctx);

    // Draw curve
    drawCurve(ctx);

    // Draw keyframes
    drawKeyframes(ctx);
  }, [curve, selectedKeyframe, hoveredKeyframe, width, height]);

  // Draw grid with time markers
  const drawGrid = (ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;

    // Vertical grid lines (time)
    const timeSteps = Math.ceil(duration);
    for (let i = 0; i <= timeSteps; i++) {
      const x = timeToX(i);
      ctx.beginPath();
      ctx.moveTo(x, PADDING);
      ctx.lineTo(x, height - PADDING);
      ctx.stroke();

      // Time labels
      ctx.fillStyle = '#6b7280';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${i}s`, x, height - PADDING + 15);
    }

    // Horizontal grid lines (value)
    const valueSteps = 5;
    for (let i = 0; i <= valueSteps; i++) {
      const value = parameterRange.min + (i / valueSteps) * (parameterRange.max - parameterRange.min);
      const y = valueToY(value);
      ctx.beginPath();
      ctx.moveTo(PADDING, y);
      ctx.lineTo(width - PADDING, y);
      ctx.stroke();

      // Value labels
      ctx.fillStyle = '#6b7280';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(value.toFixed(1), PADDING - 5, y + 3);
    }

    // Border
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 2;
    ctx.strokeRect(PADDING, PADDING, width - 2 * PADDING, height - 2 * PADDING);

    // Parameter label
    ctx.fillStyle = '#374151';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(parameterLabel, width / 2, 20);
  };

  // Draw the automation curve
  const drawCurve = (ctx: CanvasRenderingContext2D) => {
    if (curve.keyframes.length < 2) return;

    const sortedKeyframes = [...curve.keyframes].sort((a, b) => a.time - b.time);

    ctx.strokeStyle = CURVE_COLOR;
    ctx.lineWidth = 2;
    ctx.beginPath();

    // Draw curve segments between keyframes
    for (let i = 0; i < sortedKeyframes.length - 1; i++) {
      const kf1 = sortedKeyframes[i];
      const kf2 = sortedKeyframes[i + 1];

      const x1 = timeToX(kf1.time);
      const y1 = valueToY(kf1.value);
      const x2 = timeToX(kf2.time);
      const y2 = valueToY(kf2.value);

      if (i === 0) {
        ctx.moveTo(x1, y1);
      }

      // Draw based on interpolation type
      if (curve.interpolation === 'linear' || !kf1.easing) {
        ctx.lineTo(x2, y2);
      } else if (curve.interpolation === 'step') {
        ctx.lineTo(x2, y1);
        ctx.lineTo(x2, y2);
      } else if (curve.interpolation === 'bezier' && kf1.bezierControlPoints) {
        // Bezier curve
        const cp1x = x1 + (x2 - x1) * kf1.bezierControlPoints.cp1.x;
        const cp1y = y1 + (y2 - y1) * kf1.bezierControlPoints.cp1.y;
        const cp2x = x1 + (x2 - x1) * kf1.bezierControlPoints.cp2.x;
        const cp2y = y1 + (y2 - y1) * kf1.bezierControlPoints.cp2.y;
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x2, y2);
      } else {
        // Smooth (ease-in-out)
        const cpx1 = x1 + (x2 - x1) * 0.33;
        const cpy1 = y1;
        const cpx2 = x1 + (x2 - x1) * 0.67;
        const cpy2 = y2;
        ctx.bezierCurveTo(cpx1, cpy1, cpx2, cpy2, x2, y2);
      }
    }

    ctx.stroke();
  };

  // Draw keyframes
  const drawKeyframes = (ctx: CanvasRenderingContext2D) => {
    curve.keyframes.forEach((kf) => {
      const x = timeToX(kf.time);
      const y = valueToY(kf.value);

      // Determine color
      let color = KEYFRAME_COLOR;
      if (selectedKeyframe === kf.id) {
        color = KEYFRAME_SELECTED_COLOR;
      } else if (hoveredKeyframe === kf.id) {
        color = KEYFRAME_HOVER_COLOR;
      }

      // Draw keyframe circle
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, KEYFRAME_RADIUS, 0, Math.PI * 2);
      ctx.fill();

      // Draw border
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw bezier handles if selected and bezier mode
      if (selectedKeyframe === kf.id && curve.interpolation === 'bezier' && kf.bezierControlPoints) {
        const nextKf = curve.keyframes.find((k) => k.time > kf.time);
        if (nextKf) {
          const x2 = timeToX(nextKf.time);
          const y2 = valueToY(nextKf.value);

          const cp1x = x + (x2 - x) * kf.bezierControlPoints.cp1.x;
          const cp1y = y + (y2 - y) * kf.bezierControlPoints.cp1.y;
          const cp2x = x + (x2 - x) * kf.bezierControlPoints.cp2.x;
          const cp2y = y + (y2 - y) * kf.bezierControlPoints.cp2.y;

          // Draw control point lines
          ctx.strokeStyle = '#9ca3af';
          ctx.lineWidth = 1;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(cp1x, cp1y);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(x2, y2);
          ctx.lineTo(cp2x, cp2y);
          ctx.stroke();
          ctx.setLineDash([]);

          // Draw control points
          ctx.fillStyle = '#9ca3af';
          ctx.beginPath();
          ctx.arc(cp1x, cp1y, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(cp2x, cp2y, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    });
  };

  // Find keyframe at position
  const findKeyframeAt = (x: number, y: number): string | null => {
    for (const kf of curve.keyframes) {
      const kfX = timeToX(kf.time);
      const kfY = valueToY(kf.value);
      const distance = Math.sqrt((x - kfX) ** 2 + (y - kfY) ** 2);
      if (distance <= KEYFRAME_RADIUS + 2) {
        return kf.id;
      }
    }
    return null;
  };

  // Handle mouse down
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const keyframeId = findKeyframeAt(x, y);

    if (keyframeId) {
      setSelectedKeyframe(keyframeId);
      setIsDragging(true);
    } else {
      // Add new keyframe
      const time = xToTime(x);
      const value = yToValue(y);

      const newKeyframe: AudioKeyframe = {
        id: `kf-${Date.now()}`,
        time,
        value,
        easing: 'linear',
      };

      const updatedCurve: AutomationCurve = {
        ...curve,
        keyframes: [...curve.keyframes, newKeyframe],
      };

      onUpdate(updatedCurve);
      setSelectedKeyframe(newKeyframe.id);
    }
  };

  // Handle mouse move
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isDragging && selectedKeyframe) {
      // Update keyframe position
      const time = xToTime(x);
      const value = yToValue(y);

      const updatedKeyframes = curve.keyframes.map((kf) =>
        kf.id === selectedKeyframe ? { ...kf, time, value } : kf
      );

      onUpdate({ ...curve, keyframes: updatedKeyframes });
    } else {
      // Update hover state
      const keyframeId = findKeyframeAt(x, y);
      setHoveredKeyframe(keyframeId);
    }
  };

  // Handle mouse up
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Handle double click to delete keyframe
  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const keyframeId = findKeyframeAt(x, y);

    if (keyframeId && curve.keyframes.length > 2) {
      const updatedKeyframes = curve.keyframes.filter((kf) => kf.id !== keyframeId);
      onUpdate({ ...curve, keyframes: updatedKeyframes });
      setSelectedKeyframe(null);
    }
  };

  // Redraw on changes
  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        className="border rounded cursor-crosshair bg-white"
        style={{ touchAction: 'none' }}
      />

      <div className="text-xs text-gray-600 space-y-1">
        <div>• Click to add keyframe</div>
        <div>• Drag keyframe to move</div>
        <div>• Double-click keyframe to delete</div>
        <div>• {curve.keyframes.length} keyframe{curve.keyframes.length !== 1 ? 's' : ''}</div>
      </div>
    </div>
  );
};
