import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { BezierControlPoints, getBezierValue } from '../../utils/bezierUtils';
import './keyframeEditor.css';

interface Keyframe {
  id: string;
  time: number;  // Relative to clip start, 0 to 1
  value: number; // 0 to 1
  easing?: 'linear' | 'ease' | 'bezier' | 'ease-in' | 'ease-out' | 'ease-in-out';
  controlPoints?: BezierControlPoints;
}

interface KeyframeEditorProps {
  keyframes: Keyframe[];
  onUpdateKeyframe: (id: string, updates: Partial<Keyframe>) => void;
  onAddKeyframe: (time: number, value: number) => void;
  onRemoveKeyframe: (id: string) => void;
  propertyName: string;
  width?: number;
  height?: number;
}

const PADDING = 40;
const POINT_RADIUS = 6;
const HANDLE_RADIUS = 4;

export const KeyframeEditor: React.FC<KeyframeEditorProps> = ({
  keyframes,
  onUpdateKeyframe,
  onAddKeyframe,
  onRemoveKeyframe,
  propertyName,
  width = 600,
  height = 300,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedKeyframeId, setSelectedKeyframeId] = useState<string | null>(null);
  const [activeHandle, setActiveHandle] = useState<{ keyframeId: string; handle: 'cp1' | 'cp2' } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Sort keyframes by time
  const sortedKeyframes = useMemo(() => 
    [...keyframes].sort((a, b) => a.time - b.time),
  [keyframes]);

  // Coordinate conversion helpers
  const toCanvasX = useCallback((t: number) => PADDING + t * (width - PADDING * 2), [width]);
  const toCanvasY = useCallback((v: number) => height - PADDING - v * (height - PADDING * 2), [height]);
  const fromCanvasX = useCallback((x: number) => (x - PADDING) / (width - PADDING * 2), [width]);
  const fromCanvasY = useCallback((y: number) => (height - PADDING - y) / (height - PADDING * 2), [height]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= 10; i++) {
        const x = toCanvasX(i / 10);
        const y = toCanvasY(i / 10);
        ctx.moveTo(x, PADDING);
        ctx.lineTo(x, height - PADDING);
        ctx.moveTo(PADDING, y);
        ctx.lineTo(width - PADDING, y);
    }
    ctx.stroke();

    // Draw axes
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(PADDING, PADDING);
    ctx.lineTo(PADDING, height - PADDING);
    ctx.lineTo(width - PADDING, height - PADDING);
    ctx.stroke();

    // Draw curve
    if (sortedKeyframes.length >= 2) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(toCanvasX(sortedKeyframes[0].time), toCanvasY(sortedKeyframes[0].value));

      for (let i = 0; i < sortedKeyframes.length - 1; i++) {
        const k1 = sortedKeyframes[i];
        const k2 = sortedKeyframes[i+1];
        
        if (k1.easing === 'bezier' && k1.controlPoints) {
            // Draw cubic bezier interpolation
            for (let t = 0; t <= 1; t += 0.02) {
                const val = getBezierValue(t, k1.controlPoints.cp1, k1.controlPoints.cp2);
                const interTime = k1.time + t * (k2.time - k1.time);
                const interVal = k1.value + val * (k2.value - k1.value);
                ctx.lineTo(toCanvasX(interTime), toCanvasY(interVal));
            }
        } else {
            // Default linear for rendering (or other easings can be added)
            ctx.lineTo(toCanvasX(k2.time), toCanvasY(k2.value));
        }
      }
      ctx.stroke();
    }

    // Draw keyframes and handles
    sortedKeyframes.forEach(k => {
      const x = toCanvasX(k.time);
      const y = toCanvasY(k.value);
      const isSelected = k.id === selectedKeyframeId;

      // Draw bezier handles if selected
      if (isSelected && k.easing === 'bezier' && k.controlPoints && sortedKeyframes.indexOf(k) < sortedKeyframes.length - 1) {
          const nextK = sortedKeyframes[sortedKeyframes.indexOf(k) + 1];
          const cp1x = toCanvasX(k.time + k.controlPoints.cp1.x * (nextK.time - k.time));
          const cp1y = toCanvasY(k.value + k.controlPoints.cp1.y * (nextK.value - k.value));
          const cp2x = toCanvasX(k.time + k.controlPoints.cp2.x * (nextK.time - k.time));
          const cp2y = toCanvasY(k.value + k.controlPoints.cp2.y * (nextK.value - k.value));

          // Lines to handles
          ctx.strokeStyle = '#999';
          ctx.setLineDash([2, 4]);
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(cp1x, cp1y);
          ctx.stroke();
          
          const nx = toCanvasX(nextK.time);
          const ny = toCanvasY(nextK.value);
          ctx.beginPath();
          ctx.moveTo(nx, ny);
          ctx.lineTo(cp2x, cp2y);
          ctx.stroke();
          ctx.setLineDash([]);

          // Control points
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.arc(cp1x, cp1y, HANDLE_RADIUS, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(cp2x, cp2y, HANDLE_RADIUS, 0, Math.PI * 2);
          ctx.fill();
      }

      // Keyframe point
      ctx.fillStyle = isSelected ? '#ffffff' : '#3b82f6';
      ctx.beginPath();
      ctx.arc(x, y, POINT_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      if (isSelected) {
          ctx.strokeStyle = '#3b82f6';
          ctx.stroke();
      }
    });

  }, [sortedKeyframes, width, height, toCanvasX, toCanvasY, selectedKeyframeId]);

  useEffect(() => {
    draw();
  }, [draw]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicked a control point handle
    if (selectedKeyframeId) {
        const k = keyframes.find(k => k.id === selectedKeyframeId);
        const idx = sortedKeyframes.findIndex(sk => sk.id === selectedKeyframeId);
        if (k && k.easing === 'bezier' && k.controlPoints && idx < sortedKeyframes.length - 1) {
            const nextK = sortedKeyframes[idx + 1];
            const cp1x = toCanvasX(k.time + k.controlPoints.cp1.x * (nextK.time - k.time));
            const cp1y = toCanvasY(k.value + k.controlPoints.cp1.y * (nextK.value - k.value));
            const cp2x = toCanvasX(k.time + k.controlPoints.cp2.x * (nextK.time - k.time));
            const cp2y = toCanvasY(k.value + k.controlPoints.cp2.y * (nextK.value - k.value));

            if (Math.hypot(x - cp1x, y - cp1y) < HANDLE_RADIUS * 2) {
                setActiveHandle({ keyframeId: k.id, handle: 'cp1' });
                setIsDragging(true);
                return;
            }
            if (Math.hypot(x - cp2x, y - cp2y) < HANDLE_RADIUS * 2) {
                setActiveHandle({ keyframeId: k.id, handle: 'cp2' });
                setIsDragging(true);
                return;
            }
        }
    }

    // Check if clicked a keyframe
    for (const k of keyframes) {
      const kx = toCanvasX(k.time);
      const ky = toCanvasY(k.value);
      if (Math.hypot(x - kx, y - ky) < POINT_RADIUS * 2) {
        setSelectedKeyframeId(k.id);
        setIsDragging(true);
        return;
      }
    }

    // If clicked empty area, add keyframe or deselect
    const t = fromCanvasX(x);
    const v = fromCanvasY(y);
    if (t >= 0 && t <= 1 && v >= 0 && v <= 1) {
        onAddKeyframe(t, v);
    } else {
        setSelectedKeyframeId(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (activeHandle) {
        const k = keyframes.find(k => k.id === activeHandle.keyframeId);
        const idx = sortedKeyframes.findIndex(sk => sk.id === activeHandle.keyframeId);
        if (k && k.controlPoints && idx < sortedKeyframes.length - 1) {
            const nextK = sortedKeyframes[idx + 1];
            const t = fromCanvasX(x);
            const v = fromCanvasY(y);
            
            // Normalize back to [0,1] relative to the segment
            const relT = Math.max(0, Math.min(1, (t - k.time) / (nextK.time - k.time)));
            const relV = (v - k.value) / (nextK.value - k.value);

            const newCP = { ...k.controlPoints };
            if (activeHandle.handle === 'cp1') {
                newCP.cp1 = { x: relT, y: relV };
            } else {
                newCP.cp2 = { x: relT, y: relV };
            }
            onUpdateKeyframe(k.id, { controlPoints: newCP });
        }
    } else if (selectedKeyframeId) {
        const t = Math.max(0, Math.min(1, fromCanvasX(x)));
        const v = Math.max(0, Math.min(1, fromCanvasY(y)));
        onUpdateKeyframe(selectedKeyframeId, { time: t, value: v });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setActiveHandle(null);
  };

  return (
    <div className="keyframe-editor">
      <div className="keyframe-editor-header">
        <span className="editor-title">Keyframe Editor: {propertyName}</span>
        <div className="editor-controls">
            {selectedKeyframeId && (
                <>
                    <select 
                        value={keyframes.find(k => k.id === selectedKeyframeId)?.easing}
                        onChange={(e) => onUpdateKeyframe(selectedKeyframeId, { easing: e.target.value as Keyframe['easing'], controlPoints: e.target.value === 'bezier' ? { cp1: {x: 0.25, y: 0.25}, cp2: {x: 0.75, y: 0.75}} : undefined })}
                    >
                        <option value="linear">Linear</option>
                        <option value="ease-in">Ease In</option>
                        <option value="ease-out">Ease Out</option>
                        <option value="ease-in-out">Ease In/Out</option>
                        <option value="bezier">Bezier</option>
                    </select>
                    <button onClick={() => { onRemoveKeyframe(selectedKeyframeId); setSelectedKeyframeId(null); }}>Delete</button>
                </>
            )}
        </div>
      </div>
      <div className="canvas-container">
        <canvas
            ref={canvasRef}
            width={width}
            height={height}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        />
      </div>
      <div className="keyframe-editor-footer">
        <span>Click empty area to add keyframe. Drag points to move.</span>
      </div>
    </div>
  );
};
