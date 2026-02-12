// src/ui/components/LightingPicker.tsx
import React, { useState, ChangeEvent } from 'react';
import { LightingType, LightingParams } from '../../lighting/types';

interface Props {
  /** Current lighting parameters */
  value: LightingParams;
  /** Callback when any parameter changes */
  onChange: (params: LightingParams) => void;
}

export const LightingPicker: React.FC<Props> = ({ value, onChange }) => {
  // Local state mirrors the incoming value to avoid mutating props directly
  const [type, setType] = useState<LightingType>(value.type);
  const [intensity, setIntensity] = useState<number>(value.intensity);
  const [color, setColor] = useState<string>(value.color);
  const [position, setPosition] = useState<{ x: number; y: number; z: number }>(value.position);
  const [direction, setDirection] = useState<string>(value.direction);

  // Helper to emit the full LightingParams object
  const emitChange = () => {
    const params: LightingParams = {
      type,
      intensity,
      color,
      position,
      direction,
    };
    onChange(params);
  };

  // Handlers for each field – they update local state then emit
  const handleTypeChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value as LightingType;
    setType(newType);
    emitChange();
  };

  const handleIntensityChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newVal = parseFloat(e.target.value);
    setIntensity(newVal);
    emitChange();
  };

  const handleColorChange = (e: ChangeEvent<HTMLInputElement>) => {
    setColor(e.target.value);
    emitChange();
  };

  const handlePositionChange = (axis: 'x' | 'y' | 'z', e: ChangeEvent<HTMLInputElement>) => {
    const newVal = parseFloat(e.target.value);
    setPosition(prev => ({ ...prev, [axis]: newVal }));
    emitChange();
  };

  const handleDirectionChange = (e: ChangeEvent<HTMLInputElement>) => {
    setDirection(e.target.value);
    emitChange();
  };

  return (
    <div className="lighting-picker" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <label>
        Type:
        <select value={type} onChange={handleTypeChange}>
          {Object.values(LightingType).map(t => (
            <option key={t} value={t}>t}</option>
          ))}
        </select>
      </label>
      <label>
        Intensity (0‑1):
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={intensity}
          onChange={handleIntensityChange}
        />
        <input
          type="number"
          min="0"
          max="1"
          step="0.01"
          value={intensity}
          onChange={handleIntensityChange}
          style={{ width: '4rem' }}
        />
      </label>
      <label>
        Color:
        <input type="color" value={color} onChange={handleColorChange} />
      </label>
      <fieldset style={{ border: '1px solid #ccc', padding: '0.5rem' }}>
        <legend>Position</legend>
        <label>
          X:
          <input type="number" value={position.x} onChange={e => handlePositionChange('x', e)} />
        </label>
        <label>
          Y:
          <input type="number" value={position.y} onChange={e => handlePositionChange('y', e)} />
        </label>
        <label>
          Z:
          <input type="number" value={position.z} onChange={e => handlePositionChange('z', e)} />
        </label>
      </fieldset>
      <label>
        Direction:
        <input type="text" value={direction} onChange={handleDirectionChange} placeholder="e.g., front, right" />
      </label>
    </div>
  );
};
