import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import './EffectKeyframes.css';
import { EffectKeyframe } from './EffectsLibrary';

export interface EffectParameter {
  id: string;
  name: string;
  min: number;
  max: number;
  defaultValue: number;
  keyframes: EffectKeyframe[];
}

interface EffectKeyframesProps {
  parameter: EffectParameter;
  duration: number; // total duration in seconds
  currentTime: number;
  onKeyframesChange: (keyframes: EffectKeyframe[]) => void;
  onValueChange: (value: number) => void;
  height?: number;
}

export const EffectKeyframes: React.FC<EffectKeyframesProps> = ({
  parameter,
  duration,
  currentTime,
  onKeyframesChange,
  onValueChange,
  height = 120,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedKeyframe, setDraggedKeyframe] = useState<string | null>(null);
  const [selectedKeyframe, setSelectedKeyframe] = useState<string | null>(null);

  // Calculate current value based on keyframes
  const getCurrentValue = useCallback(() => {
    if (parameter.keyframes.length === 0) {
      return parameter.defaultValue;
    }

    // Find keyframes before and after current time
    const sortedKeyframes = [...parameter.keyframes].sort((a, b) => a.time - b.time);
    const beforeKeyframe = sortedKeyframes.filter(k => k.time <= currentTime).pop();
    const afterKeyframe = sortedKeyframes.filter(k => k.time > currentTime)[0];

    if (!beforeKeyframe) {
      return parameter.defaultValue;
    }

    if (!afterKeyframe) {
      return beforeKeyframe.value * (parameter.max - parameter.min) + parameter.min;
    }

    // Interpolate between keyframes
    const timeDiff = afterKeyframe.time - beforeKeyframe.time;
    const valueDiff = afterKeyframe.value - beforeKeyframe.value;
    const progress = (currentTime - beforeKeyframe.time) / timeDiff;

    let interpolatedValue = beforeKeyframe.value;
    switch (beforeKeyframe.interpolation) {
      case 'ease-in':
        interpolatedValue = beforeKeyframe.value + valueDiff * (progress * progress);
        break;
      case 'ease-out':
        interpolatedValue = beforeKeyframe.value + valueDiff * (1 - (1 - progress) * (1 - progress));
        break;
      case 'ease-in-out':
        const t = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        interpolatedValue = beforeKeyframe.value + valueDiff * t;
        break;
      default: // linear
        interpolatedValue = beforeKeyframe.value + valueDiff * progress;
    }

    return interpolatedValue * (parameter.max - parameter.min) + parameter.min;
  }, [parameter, currentTime]);

  // Update current value when keyframes change
  useEffect(() => {
    const currentValue = getCurrentValue();
    onValueChange(currentValue);
  }, [getCurrentValue, onValueChange]);

  const addKeyframe = useCallback((time: number, value: number = 0.5) => {
    const newKeyframe: EffectKeyframe = {
      id: `keyframe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      time,
      value,
      interpolation: 'linear',
    };

    const newKeyframes = [...parameter.keyframes, newKeyframe];
    onKeyframesChange(newKeyframes);
    setSelectedKeyframe(newKeyframe.id);
  }, [parameter.keyframes, onKeyframesChange]);

  const removeKeyframe = useCallback((keyframeId: string) => {
    const newKeyframes = parameter.keyframes.filter(k => k.id !== keyframeId);
    onKeyframesChange(newKeyframes);
    if (selectedKeyframe === keyframeId) {
      setSelectedKeyframe(null);
    }
  }, [parameter.keyframes, onKeyframesChange, selectedKeyframe]);

  const updateKeyframe = useCallback((keyframeId: string, updates: Partial<EffectKeyframe>) => {
    const newKeyframes = parameter.keyframes.map(k =>
      k.id === keyframeId ? { ...k, ...updates } : k
    );
    onKeyframesChange(newKeyframes);
  }, [parameter.keyframes, onKeyframesChange]);

  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const time = (x / rect.width) * duration;
    const value = 1 - (y / rect.height); // Invert Y axis

    // Check if clicking on existing keyframe
    const clickedKeyframe = parameter.keyframes.find(k => {
      const keyframeX = (k.time / duration) * rect.width;
      const keyframeY = (1 - k.value) * rect.height;
      const distance = Math.sqrt((x - keyframeX) ** 2 + (y - keyframeY) ** 2);
      return distance < 8; // 8px radius
    });

    if (clickedKeyframe) {
      setSelectedKeyframe(clickedKeyframe.id);
    } else {
      addKeyframe(time, value);
    }
  }, [parameter.keyframes, duration, addKeyframe]);

  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const clickedKeyframe = parameter.keyframes.find(k => {
      const keyframeX = (k.time / duration) * rect.width;
      const keyframeY = (1 - k.value) * rect.height;
      const distance = Math.sqrt((x - keyframeX) ** 2 + (y - keyframeY) ** 2);
      return distance < 8;
    });

    if (clickedKeyframe) {
      setIsDragging(true);
      setDraggedKeyframe(clickedKeyframe.id);
    }
  }, [parameter.keyframes, duration]);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !draggedKeyframe) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, event.clientY - rect.top));

    const time = (x / rect.width) * duration;
    const value = 1 - (y / rect.height);

    updateKeyframe(draggedKeyframe, { time, value });
  }, [isDragging, draggedKeyframe, duration, updateKeyframe]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDraggedKeyframe(null);
  }, []);

  // Draw the keyframe curve
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw background grid
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 1;

    // Vertical lines (time)
    for (let i = 0; i <= 10; i++) {
      const x = (i / 10) * width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Horizontal lines (value)
    for (let i = 0; i <= 4; i++) {
      const y = (i / 4) * height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw curve
    if (parameter.keyframes.length > 0) {
      const sortedKeyframes = [...parameter.keyframes].sort((a, b) => a.time - b.time);

      ctx.strokeStyle = '#7c3aed';
      ctx.lineWidth = 2;
      ctx.beginPath();

      for (let i = 0; i < sortedKeyframes.length; i++) {
        const keyframe = sortedKeyframes[i];
        const x = (keyframe.time / duration) * width;
        const y = (1 - keyframe.value) * height;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.stroke();
    }

    // Draw keyframes
    parameter.keyframes.forEach(keyframe => {
      const x = (keyframe.time / duration) * width;
      const y = (1 - keyframe.value) * height;

      ctx.fillStyle = selectedKeyframe === keyframe.id ? '#7c3aed' : '#e0e0e0';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    });

    // Draw current time indicator
    const currentX = (currentTime / duration) * width;
    ctx.strokeStyle = '#ff6b35';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(currentX, 0);
    ctx.lineTo(currentX, height);
    ctx.stroke();

  }, [parameter.keyframes, duration, currentTime, selectedKeyframe]);

  return (
    <div className="effect-keyframes">
      <div className="keyframes-header">
        <div className="parameter-info">
          <span className="parameter-name">{parameter.name}</span>
          <span className="parameter-value">
            {getCurrentValue().toFixed(2)}
          </span>
        </div>
        <div className="keyframes-actions">
          <button
            className="btn-add-keyframe"
            onClick={() => addKeyframe(currentTime)}
            title="Add keyframe at current time"
          >
            <Plus size={16} />
          </button>
          {selectedKeyframe && (
            <button
              className="btn-remove-keyframe"
              onClick={() => removeKeyframe(selectedKeyframe)}
              title="Remove selected keyframe"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="keyframes-canvas-container">
        <canvas
          ref={canvasRef}
          width={400}
          height={height}
          className="keyframes-canvas"
          onClick={handleCanvasClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>

      {selectedKeyframe && (
        <div className="keyframe-properties">
          <div className="property-group">
            <label>Interpolation:</label>
            <select
              value={parameter.keyframes.find(k => k.id === selectedKeyframe)?.interpolation || 'linear'}
              onChange={(e) => updateKeyframe(selectedKeyframe, {
                interpolation: e.target.value as EffectKeyframe['interpolation']
              })}
              aria-label="Keyframe interpolation method"
            >
              <option value="linear">Linear</option>
              <option value="ease-in">Ease In</option>
              <option value="ease-out">Ease Out</option>
              <option value="ease-in-out">Ease In-Out</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};