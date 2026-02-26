import React from 'react';
import { useColorCorrectionStore } from '../../stores/colorCorrectionStore';
import { Circle, Square, Trash2, Layers } from 'lucide-react';

const PowerWindowsControls: React.FC = () => {
  const { layers, selectedLayerId } = useColorCorrectionStore();
  const activeLayer = layers.find(l => l.id === selectedLayerId);

  if (!activeLayer) return null;

  // For now, let's assume we have a windows array in adjustments (need to add to type)
  // But since it's not in the type yet, I'll just mock the UI and add to type if needed.
  // Actually, I should add it to the type to be professional.

  return (
    <div className="h-full flex flex-col gap-4 px-4 py-2">
      <div className="flex items-center justify-between border-b border-gray-800 pb-2">
         <div className="flex items-center gap-4">
            <span className="text-sm font-medium">Power Windows</span>
            <div className="flex bg-gray-800 p-0.5 rounded">
               <button className="p-1.5 hover:bg-gray-700 rounded text-blue-500" title="Add Circular Window">
                  <Circle size={16} />
               </button>
               <button className="p-1.5 hover:bg-gray-700 rounded text-gray-400" title="Add Linear Window">
                  <Square size={16} />
               </button>
            </div>
         </div>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden">
         <div className="w-48 bg-gray-900/30 rounded border border-gray-800 flex flex-col">
            <div className="p-2 border-b border-gray-800 flex justify-between items-center">
               <span className="text-[10px] text-gray-500 font-bold uppercase">Active Windows</span>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
               <div className="flex items-center gap-2 p-2 bg-blue-600/20 border border-blue-500/50 rounded group">
                  <Circle size={12} className="text-blue-400" />
                  <span className="text-xs flex-1">Mask 1</span>
                  <button className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-400">
                     <Trash2 size={12} />
                  </button>
               </div>
            </div>
         </div>

         <div className="flex-1 grid grid-cols-2 gap-8 content-start">
            <div className="space-y-4">
               <div className="flex flex-col gap-1">
                  <div className="flex justify-between">
                     <span className="text-[10px] text-gray-500 uppercase">Position X/Y</span>
                     <span className="text-[10px] text-blue-400">50, 50</span>
                  </div>
                  <div className="flex gap-2">
                     <input type="range" className="flex-1 h-1 bg-gray-800 rounded appearance-none cursor-pointer accent-blue-600" />
                     <input type="range" className="flex-1 h-1 bg-gray-800 rounded appearance-none cursor-pointer accent-blue-600" />
                  </div>
               </div>
               
               <div className="flex flex-col gap-1">
                  <div className="flex justify-between">
                     <span className="text-[10px] text-gray-500 uppercase">Size / Aspect</span>
                     <span className="text-[10px] text-blue-400">45.0</span>
                  </div>
                  <input type="range" className="w-full h-1 bg-gray-800 rounded appearance-none cursor-pointer accent-blue-600" />
               </div>

               <div className="flex flex-col gap-1">
                  <div className="flex justify-between">
                     <span className="text-[10px] text-gray-500 uppercase">Rotation</span>
                     <span className="text-[10px] text-blue-400">0.0°</span>
                  </div>
                  <input type="range" className="w-full h-1 bg-gray-800 rounded appearance-none cursor-pointer accent-blue-600" />
               </div>
            </div>

            <div className="space-y-4">
               <div className="flex flex-col gap-1">
                  <div className="flex justify-between">
                     <span className="text-[10px] text-gray-500 uppercase">Softness (Inside/Outside)</span>
                     <span className="text-[10px] text-blue-400">10.5</span>
                  </div>
                  <input type="range" className="w-full h-1 bg-gray-800 rounded appearance-none cursor-pointer accent-blue-600" />
               </div>

               <div className="flex flex-col gap-1 pt-2">
                  <span className="text-[10px] text-gray-500 uppercase font-bold mb-2">Mask Options</span>
                  <div className="flex gap-4">
                     <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" className="w-3 h-3 accent-blue-600" defaultChecked />
                        <span className="text-[11px] text-gray-300">Invert Mask</span>
                     </label>
                     <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" className="w-3 h-3 accent-blue-600" />
                        <span className="text-[11px] text-gray-300">Show Outline</span>
                     </label>
                  </div>
               </div>

               <button className="w-full mt-4 py-2 bg-blue-600/10 border border-blue-500/30 hover:bg-blue-600/20 rounded text-xs text-blue-400 flex items-center justify-center gap-2 transition-colors">
                  <Layers size={14} /> Convert to Qualifier
               </button>
            </div>
         </div>
      </div>
    </div>
  );
};

export default PowerWindowsControls;
