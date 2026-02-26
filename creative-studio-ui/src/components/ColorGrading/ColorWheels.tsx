import React from 'react';
import ColorWheel from './ColorWheel';
import { useColorCorrectionStore } from '../../stores/colorCorrectionStore';

const ColorWheels: React.FC = () => {
  const { layers, selectedLayerId, updateLayer } = useColorCorrectionStore();
  const activeLayer = layers.find(l => l.id === selectedLayerId);

  if (!activeLayer) return null;

  const handleUpdate = (type: 'lift' | 'gamma' | 'gain' | 'offset', value: [number, number, number]) => {
    updateLayer(activeLayer.id, {
      adjustments: {
        ...activeLayer.adjustments,
        [type]: value
      }
    });
  };

  const handleReset = (type: 'lift' | 'gamma' | 'gain' | 'offset') => {
    const defaults = {
      lift: [0, 0, 0],
      gamma: [1, 1, 1],
      gain: [1, 1, 1],
      offset: [0, 0, 0]
    };
    handleUpdate(type, defaults[type] as [number, number, number]);
  };

  return (
    <div className="flex justify-between items-center h-full px-10 gap-8 overflow-x-auto">
      <ColorWheel 
        label="Lift" 
        value={activeLayer.adjustments.lift || [0, 0, 0]} 
        onChange={(v) => handleUpdate('lift', v)}
        onReset={() => handleReset('lift')}
      />
      <ColorWheel 
        label="Gamma" 
        value={activeLayer.adjustments.gamma || [1, 1, 1]} 
        onChange={(v) => handleUpdate('gamma', v)}
        onReset={() => handleReset('gamma')}
      />
      <ColorWheel 
        label="Gain" 
        value={activeLayer.adjustments.gain || [1, 1, 1]} 
        onChange={(v) => handleUpdate('gain', v)}
        onReset={() => handleReset('gain')}
      />
      <ColorWheel 
        label="Offset" 
        value={activeLayer.adjustments.offset || [0, 0, 0]} 
        onChange={(v) => handleUpdate('offset', v)}
        onReset={() => handleReset('offset')}
      />
      
      {/* Primary sliders for master adjustments */}
      <div className="flex flex-col gap-4 min-w-[200px] border-l border-gray-800 pl-8 ml-4">
        {[
          { label: 'Saturation', key: 'saturation', min: 0, max: 2, step: 0.01 },
          { label: 'Contrast', key: 'contrast', min: 0, max: 2, step: 0.01 },
          { label: 'Pivot', key: 'pivot', min: 0, max: 1, step: 0.01 },
          { label: 'Temp', key: 'temperature', min: -100, max: 100, step: 1 },
        ].map(slider => (
          <div key={slider.key} className="flex flex-col">
            <div className="flex justify-between mb-1">
              <span className="text-[10px] text-gray-500 uppercase">{slider.label}</span>
              <span className="text-[10px] text-gray-300 font-mono">
                {(activeLayer.adjustments[slider.key as keyof typeof activeLayer.adjustments] as number)?.toFixed(2)}
              </span>
            </div>
            <input 
              type="range" 
              min={slider.min} 
              max={slider.max} 
              step={slider.step}
              value={(activeLayer.adjustments[slider.key as keyof typeof activeLayer.adjustments] as number) || 0}
              onChange={(e) => updateLayer(activeLayer.id, {
                adjustments: {
                  ...activeLayer.adjustments,
                  [slider.key]: parseFloat(e.target.value)
                }
              })}
              className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ColorWheels;
