import React from 'react';
import { useColorCorrectionStore } from '../../stores/colorCorrectionStore';
import { Eye, EyeOff, Pipette } from 'lucide-react';
import { HSLQualifierSettings } from '../../types/color-correction';

const QualifierControls: React.FC = () => {
  const { layers, selectedLayerId, updateLayer, isPickingColor, setIsPickingColor } = useColorCorrectionStore();
  const activeLayer = layers.find(l => l.id === selectedLayerId);

  if (!activeLayer) return null;

  const q = activeLayer.adjustments.qualifier;

  const handleUpdate = (updates: Partial<HSLQualifierSettings>) => {
    updateLayer(activeLayer.id, {
      adjustments: {
        ...activeLayer.adjustments,
        qualifier: {
          ...q,
          ...updates
        }
      }
    });
  };

  return (
    <div className="h-full flex flex-col gap-6 px-4">
      <div className="flex items-center justify-between border-b border-gray-800 pb-2">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={q.enabled} 
              onChange={(e) => handleUpdate({ enabled: e.target.checked })}
              className="w-4 h-4 accent-blue-600"
            />
            <span className="text-sm font-medium">HSL Qualifier</span>
          </label>
          <button 
            className={`p-1.5 rounded ${q.showMatte ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}`}
            onClick={() => handleUpdate({ showMatte: !q.showMatte })}
            title="Highlight Selection"
          >
            {q.showMatte ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
        </div>
        
        <button 
          className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs transition-colors ${
            isPickingColor ? 'bg-blue-600 text-white' : 'bg-gray-800 hover:bg-gray-700 text-gray-400'
          }`}
          onClick={() => setIsPickingColor(!isPickingColor)}
        >
          <Pipette size={14} /> {isPickingColor ? 'Cancel' : 'Picker'}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-8">
        {/* Hue Channel */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-bold text-gray-500 uppercase">Hue</span>
            <span className="text-[10px] text-blue-400">{q.hue.center}° ± {q.hue.width}°</span>
          </div>
          <div className="h-2 rounded bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-cyan-500 via-blue-500 via-magenta-500 to-red-500 relative">
             <div 
               className="absolute h-full border-x-2 border-white bg-white/20"
               style={{ 
                 left: `${((q.hue.center - q.hue.width/2 + 360) % 360) / 3.6}%`,
                 width: `${(q.hue.width / 3.6)}%`
               }}
             ></div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="flex flex-col gap-1">
              <span className="text-[9px] text-gray-600 uppercase">Center</span>
              <input 
                type="range" min="0" max="360" value={q.hue.center} 
                onChange={(e) => handleUpdate({ hue: { ...q.hue, center: parseInt(e.target.value) } })}
                className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[9px] text-gray-600 uppercase">Width</span>
              <input 
                type="range" min="0" max="180" value={q.hue.width} 
                onChange={(e) => handleUpdate({ hue: { ...q.hue, width: parseInt(e.target.value) } })}
                className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>
          </div>
        </div>

        {/* Saturation Channel */}
        <div className="flex flex-col gap-2">
           <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold text-gray-500 uppercase">Saturation</span>
              <span className="text-[10px] text-blue-400">{Math.round(q.saturation.low*100)}% - {Math.round(q.saturation.high*100)}%</span>
            </div>
            <div className="h-2 rounded bg-gradient-to-r from-gray-500 to-blue-500 relative">
               <div 
                 className="absolute h-full border-x-2 border-white bg-white/20"
                 style={{ 
                   left: `${q.saturation.low * 100}%`,
                   width: `${(q.saturation.high - q.saturation.low) * 100}%`
                 }}
               ></div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] text-gray-600 uppercase">Low</span>
                <input 
                  type="range" min="0" max="1" step="0.01" value={q.saturation.low} 
                  onChange={(e) => handleUpdate({ saturation: { ...q.saturation, low: parseFloat(e.target.value) } })}
                  className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[9px] text-gray-600 uppercase">High</span>
                <input 
                  type="range" min="0" max="1" step="0.01" value={q.saturation.high} 
                  onChange={(e) => handleUpdate({ saturation: { ...q.saturation, high: parseFloat(e.target.value) } })}
                  className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>
            </div>
        </div>

        {/* Luminance Channel */}
        <div className="flex flex-col gap-2">
           <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold text-gray-500 uppercase">Luminance</span>
              <span className="text-[10px] text-blue-400">{Math.round(q.luminance.low*100)}% - {Math.round(q.luminance.high*100)}%</span>
            </div>
            <div className="h-2 rounded bg-gradient-to-r from-black to-white relative">
               <div 
                 className="absolute h-full border-x-2 border-white bg-white/20"
                 style={{ 
                   left: `${q.luminance.low * 100}%`,
                   width: `${(q.luminance.high - q.luminance.low) * 100}%`
                 }}
               ></div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] text-gray-600 uppercase">Low</span>
                <input 
                  type="range" min="0" max="1" step="0.01" value={q.luminance.low} 
                  onChange={(e) => handleUpdate({ luminance: { ...q.luminance, low: parseFloat(e.target.value) } })}
                  className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[9px] text-gray-600 uppercase">High</span>
                <input 
                  type="range" min="0" max="1" step="0.01" value={q.luminance.high} 
                  onChange={(e) => handleUpdate({ luminance: { ...q.luminance, high: parseFloat(e.target.value) } })}
                  className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>
            </div>
        </div>
      </div>

      <div className="flex gap-8 border-t border-gray-800 pt-4">
        <div className="flex flex-col gap-2 min-w-[150px]">
           <span className="text-[10px] text-gray-600 uppercase font-bold">Matte Refinement</span>
           <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center">
                 <span className="text-[10px] text-gray-400">Blur Radius</span>
                 <input 
                   type="range" min="0" max="50" value={q.softness * 50} 
                   onChange={(e) => handleUpdate({ softness: parseFloat(e.target.value) / 50 })}
                   className="w-24 h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                 />
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default QualifierControls;
