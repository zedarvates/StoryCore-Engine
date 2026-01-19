import React, { useRef, useEffect, useState } from 'react';
import type { Point } from '../types';

interface BezierCurveEditorProps {
  controlPoint1: Point;
  controlPoint2: Point;
  onChange: (cp1: Point, cp2: Point) => void;
}

export const BezierCurveEditor: React.FC<BezierCurveEditorProps> = ({
  controlPoint1,
  controlPoint2,
  onChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dragging, setDragging] = useState<'cp1' | 'cp2' | null>(null);
  const [hovering, setHovering] = useState<'cp1' | 'cp2' | null>(null);

  const CANVAS_SIZE = 200;
  const PADDING = 20;
  const POINT_RADIUS = 6;

  // Convert normalized coordinates (0-1) to canvas coordinates
  const toCanvasCoords = (point: Point): Point => ({
    x: PADDING + point.x * (CANVAS_SIZE - 2 * PADDING),
    y: CANVAS_SIZE - PADDING - point.y * (CANVAS_SIZE - 2 * PADDING),
  });

  // Convert canvas coordinates to normalized coordinates (0-1)
  const toNormalizedCoords = (x: number, y: number): Point => ({
    x: Math.max(0, Math.min(1, (x - PADDING) / (CANVAS_SIZE - 2 * PADDING))),
    y: Math.max(0, Math.min(1, 1 - (y - PADDING) / (CANVAS_SIZE - 2 * PADDING))),
  });

  // Draw the bezier curve and control points
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Draw background grid
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const pos = PADDING + (i * (CANVAS_SIZE - 2 * PADDING)) / 4;
      // Vertical lines
      ctx.beginPath();
      ctx.moveTo(pos, PADDING);
      ctx.lineTo(pos, CANVAS_SIZE - PADDING);
      ctx.stroke();
      // Horizontal lines
      ctx.beginPath();
      ctx.moveTo(PADDING, pos);
      ctx.lineTo(CANVAS_SIZE - PADDING, pos);
      ctx.stroke();
    }

    // Draw border
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 2;
    ctx.strokeRect(PADDING, PADDING, CANVAS_SIZE - 2 * PADDING, CANVAS_SIZE - 2 * PADDING);

    // Start and end points
    const start = toCanvasCoords({ x: 0, y: 0 });
    const end = toCanvasCoords({ x: 1, y: 1 });
    const cp1 = toCanvasCoords(controlPoint1);
    const cp2 = toCanvasCoords(controlPoint2);

    // Draw control lines
    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(cp1.x, cp1.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(cp2.x, cp2.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw bezier curve
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, end.x, end.y);
    ctx.stroke();

    // Draw start and end points
    ctx.fillStyle = '#6b7280';
    ctx.beginPath();
    ctx.arc(start.x, start.y, POINT_RADIUS, 0, 2 * Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(end.x, end.y, POINT_RADIUS, 0, 2 * Math.PI);
    ctx.fill();

    // Draw control points
    const drawControlPoint = (point: Point, isHovering: boolean, isDragging: boolean) => {
      ctx.fillStyle = isDragging ? '#2563eb' : isHovering ? '#3b82f6' : '#60a5fa';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(point.x, point.y, POINT_RADIUS + 2, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    };

    drawControlPoint(cp1, hovering === 'cp1', dragging === 'cp1');
    drawControlPoint(cp2, hovering === 'cp2', dragging === 'cp2');
  }, [controlPoint1, controlPoint2, hovering, dragging]);

  // Handle mouse down
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const cp1 = toCanvasCoords(controlPoint1);
    const cp2 = toCanvasCoords(controlPoint2);

    // Check if clicking on control point 1
    const distToCp1 = Math.sqrt((x - cp1.x) ** 2 + (y - cp1.y) ** 2);
    if (distToCp1 <= POINT_RADIUS + 5) {
      setDragging('cp1');
      return;
    }

    // Check if clicking on control point 2
    const distToCp2 = Math.sqrt((x - cp2.x) ** 2 + (y - cp2.y) ** 2);
    if (distToCp2 <= POINT_RADIUS + 5) {
      setDragging('cp2');
      return;
    }
  };

  // Handle mouse move
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (dragging) {
      const normalized = toNormalizedCoords(x, y);
      if (dragging === 'cp1') {
        onChange(normalized, controlPoint2);
      } else {
        onChange(controlPoint1, normalized);
      }
    } else {
      // Update hovering state
      const cp1 = toCanvasCoords(controlPoint1);
      const cp2 = toCanvasCoords(controlPoint2);

      const distToCp1 = Math.sqrt((x - cp1.x) ** 2 + (y - cp1.y) ** 2);
      const distToCp2 = Math.sqrt((x - cp2.x) ** 2 + (y - cp2.y) ** 2);

      if (distToCp1 <= POINT_RADIUS + 5) {
        setHovering('cp1');
      } else if (distToCp2 <= POINT_RADIUS + 5) {
        setHovering('cp2');
      } else {
        setHovering(null);
      }
    }
  };

  // Handle mouse up
  const handleMouseUp = () => {
    setDragging(null);
  };

  // Handle mouse leave
  const handleMouseLeave = () => {
    setDragging(null);
    setHovering(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Bezier Curve</label>
        <button
          onClick={() => onChange({ x: 0.25, y: 0.25 }, { x: 0.75, y: 0.75 })}
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          Reset
        </button>
      </div>

      <div className="flex justify-center">
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          className="border rounded cursor-crosshair bg-white"
          style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="space-y-1">
          <div className="font-medium text-gray-700">Control Point 1</div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-gray-600">X</label>
              <input
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={controlPoint1.x.toFixed(2)}
                onChange={(e) =>
                  onChange(
                    { ...controlPoint1, x: parseFloat(e.target.value) },
                    controlPoint2
                  )
                }
                className="w-full px-2 py-1 text-xs border rounded"
              />
            </div>
            <div className="flex-1">
              <label className="text-gray-600">Y</label>
              <input
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={controlPoint1.y.toFixed(2)}
                onChange={(e) =>
                  onChange(
                    { ...controlPoint1, y: parseFloat(e.target.value) },
                    controlPoint2
                  )
                }
                className="w-full px-2 py-1 text-xs border rounded"
              />
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <div className="font-medium text-gray-700">Control Point 2</div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-gray-600">X</label>
              <input
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={controlPoint2.x.toFixed(2)}
                onChange={(e) =>
                  onChange(
                    controlPoint1,
                    { ...controlPoint2, x: parseFloat(e.target.value) }
                  )
                }
                className="w-full px-2 py-1 text-xs border rounded"
              />
            </div>
            <div className="flex-1">
              <label className="text-gray-600">Y</label>
              <input
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={controlPoint2.y.toFixed(2)}
                onChange={(e) =>
                  onChange(
                    controlPoint1,
                    { ...controlPoint2, y: parseFloat(e.target.value) }
                  )
                }
                className="w-full px-2 py-1 text-xs border rounded"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="text-xs text-gray-500">
        Drag the blue control points to adjust the curve shape
      </div>
    </div>
  );
};
