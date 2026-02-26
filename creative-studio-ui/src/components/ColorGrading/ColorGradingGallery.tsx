import React from 'react';
import { useColorCorrectionStore } from '../../stores/colorCorrectionStore';
import { LayoutGrid, List, Search, Plus } from 'lucide-react';
import { DEFAULT_PRESETS } from '../../constants/color-grading';

const ColorGradingGallery: React.FC = () => {
  const { applyPreset, selectedPresetId, selectPreset } = useColorCorrectionStore();

  return (
    <div className="h-full flex flex-col bg-gray-900/50">
      <div className="p-3 border-b border-gray-800 flex items-center justify-between">
         <div className="flex items-center gap-2">
            <button className="p-1.5 text-blue-500 bg-blue-500/10 rounded" title="Grid View">
               <LayoutGrid size={14} />
            </button>
            <button className="p-1.5 text-gray-500 hover:text-gray-300" title="List View">
               <List size={14} />
            </button>
         </div>
         <button className="p-1.5 text-gray-500 hover:text-white" title="Save Current Look">
            <Plus size={16} />
         </button>
      </div>

      <div className="p-2">
         <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" size={12} />
            <input 
               type="text" 
               placeholder="Search looks..." 
               className="w-full bg-black border border-gray-800 rounded px-7 py-1 text-[11px] focus:outline-none focus:border-blue-500"
            />
         </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 grid grid-cols-2 gap-2 content-start">
        {DEFAULT_PRESETS.map((preset) => (
          <div 
            key={preset.id}
            className={`aspect-video rounded border cursor-pointer overflow-hidden relative group transition-all duration-200 ${
              selectedPresetId === preset.id ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-800 hover:border-gray-600'
            }`}
            onClick={() => {
               selectPreset(preset.id);
               applyPreset(preset.id);
            }}
          >
            {/* Mock Thumbnail Background */}
            <div className="absolute inset-0 bg-gray-800 overflow-hidden">
               <div 
                  className="absolute inset-0 opacity-40 mix-blend-overlay scale-150 rotate-12"
                  style={{ 
                     background: `linear-gradient(135deg, 
                        rgb(${preset.adjustments.gain[0]*120 + 80},${preset.adjustments.gain[1]*120 + 80},${preset.adjustments.gain[2]*120 + 80}), 
                        rgb(${preset.adjustments.lift[0]*200},${preset.adjustments.lift[1]*200},${preset.adjustments.lift[2]*200}))` 
                  }}
               />
               <div className="absolute inset-0 bg-black/20" />
            </div>
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-2 opacity-100 group-hover:opacity-100 transition-opacity">
               <span className="text-[10px] text-white font-medium truncate leading-tight">{preset.name}</span>
               <span className="text-[8px] text-gray-500 truncate uppercase tracking-tighter">{preset.category}</span>
            </div>
            
            {selectedPresetId === preset.id && (
               <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.8)] z-10" />
            )}
          </div>
        ))}
      </div>
      
      <div className="p-3 border-t border-gray-800 bg-black/20 text-[10px] text-gray-500">
         {DEFAULT_PRESETS.length} Look(s) Available
      </div>
    </div>
  );
};

export default ColorGradingGallery;
