import React, { useState } from 'react';
import { Languages, HandMetal, CheckCircle, Wand2, Info } from 'lucide-react';
import type { World, CulturalElements } from '@/types/world';

interface CultureReviewStepProps {
  data: Partial<World>;
  onUpdate: (data: Partial<World>) => void;
}

export function CultureReviewStep({ data, onUpdate }: CultureReviewStepProps) {
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const elements = data.culturalElements || {
    languages: [],
    religions: [],
    traditions: [],
    historicalEvents: [],
    culturalConflicts: [],
  };

  const updateElements = (updates: Partial<CulturalElements>) => {
    onUpdate({
      culturalElements: { ...elements, ...updates },
    });
  };

  const addItem = (field: keyof CulturalElements) => {
    const newItem = prompt(`Add new ${field}:`, '');
    if (newItem) {
      updateElements({ [field]: [...elements[field], newItem] });
    }
  };

  const removeItem = (field: keyof CulturalElements, index: number) => {
    const newList = [...elements[field]];
    newList.splice(index, 1);
    updateElements({ [field]: newList });
  };

  const generateCulture = async (field: keyof CulturalElements) => {
    setIsGenerating(field);
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    const genre = data.genre?.[0] || 'fantasy';
    const suggestions: Record<string, Record<string, string[]>> = {
      languages: {
        fantasy: ['High Elven', 'Dwarven Cant', 'Abyssal'],
        cyberpunk: ['Binary-Spliced English', 'Street Slang V4', 'Corporate Latin'],
      },
      religions: {
        fantasy: ['The Order of Light', 'Ancient Mother worship', 'Void Sect'],
        cyberpunk: ['The Silicon Singularity', 'Techno-Animism', 'Data Cults'],
      }
    };

    const newItems = suggestions[field]?.[genre] || ['Ancient Tongue', 'Old Faith'];
    updateElements({ [field]: Array.from(new Set([...elements[field], ...newItems])) });
    setIsGenerating(null);
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-10">
      {/* Cultural Fabric Section */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Languages */}
        <div className="bg-white/40 dark:bg-gray-900/40 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/20 dark:border-white/5 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100/50 dark:bg-purple-900/20 rounded-2xl">
                <Languages className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h4 className="text-xl font-black text-gray-800 dark:text-white tracking-tight">Languages</h4>
            </div>
            <button
               onClick={() => generateCulture('languages')}
               className={`p-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 rounded-xl transition-all ${isGenerating === 'languages' ? 'animate-spin' : ''}`}
            >
               <Wand2 className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2 min-h-[40px]">
            {elements.languages.map((lang, i) => (
              <span key={i} className="px-4 py-2 bg-purple-100/50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-xl text-xs font-bold border border-purple-200/30 flex items-center gap-2 group">
                {lang}
                <button onClick={() => removeItem('languages', i)} className="opacity-0 group-hover:opacity-100 transition-opacity">×</button>
              </span>
            ))}
            <button onClick={() => addItem('languages')} className="px-4 py-2 border-2 border-dashed border-purple-300/50 dark:border-purple-700/50 text-purple-500 rounded-xl text-xs font-bold hover:bg-purple-500/5 transition-all">
              + Add
            </button>
          </div>
        </div>

        {/* Religions */}
        <div className="bg-white/40 dark:bg-gray-900/40 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/20 dark:border-white/5 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-100/50 dark:bg-amber-900/20 rounded-2xl">
                <HandMetal className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <h4 className="text-xl font-black text-gray-800 dark:text-white tracking-tight">Belief Systems</h4>
            </div>
             <button
               onClick={() => generateCulture('religions')}
               className={`p-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 rounded-xl transition-all ${isGenerating === 'religions' ? 'animate-spin' : ''}`}
            >
               <Wand2 className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2 min-h-[40px]">
             {elements.religions.map((rel, i) => (
              <span key={i} className="px-4 py-2 bg-amber-100/50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-xl text-xs font-bold border border-amber-200/30 flex items-center gap-2 group">
                {rel}
                <button onClick={() => removeItem('religions', i)} className="opacity-0 group-hover:opacity-100 transition-opacity">×</button>
              </span>
            ))}
            <button onClick={() => addItem('religions')} className="px-4 py-2 border-2 border-dashed border-amber-300/50 dark:border-amber-700/50 text-amber-500 rounded-xl text-xs font-bold hover:bg-amber-500/5 transition-all">
              + Add
            </button>
          </div>
        </div>
      </section>

      {/* Narrative Summary / Final Review */}
      <section className="relative p-10 bg-gradient-to-br from-indigo-600/10 to-purple-600/10 rounded-[3rem] border border-white/20 dark:border-white/5 overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] -z-10 group-hover:scale-150 transition-transform duration-1000" />
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-white/50 dark:bg-gray-950/50 rounded-2xl shadow-xl">
            <CheckCircle className="w-6 h-6 text-indigo-500" />
          </div>
          <h3 className="text-2xl font-black text-gray-800 dark:text-white tracking-tight">Synchronization Complete</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           <div className="space-y-2">
              <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Structure</span>
              <p className="text-lg font-black text-gray-700 dark:text-gray-200">{(data.locations?.length || 0)} Recorded Sites</p>
           </div>
           <div className="space-y-2">
              <span className="text-[10px] font-black text-purple-500 uppercase tracking-widest">Logic</span>
              <p className="text-lg font-black text-gray-700 dark:text-gray-200">{(data.rules?.length || 0)} Physical Laws</p>
           </div>
           <div className="space-y-2">
              <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Legacy</span>
              <p className="text-lg font-black text-gray-700 dark:text-gray-200">{(data.keyObjects?.length || 0)} Prime Artifacts</p>
           </div>
        </div>

        <div className="mt-10 p-6 bg-white/30 dark:bg-black/20 rounded-3xl border border-white/20 dark:border-white/5">
           <div className="flex items-center gap-3 mb-3">
              <Info className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold text-gray-500">World Manifest Ready</span>
           </div>
           <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
             Your world-state metadata has been correctly serialized. You can now finalize the creation process and proceed to manifest characters within this reality.
           </p>
        </div>
      </section>
    </div>
  );
}
