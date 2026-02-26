import React, { useCallback, useMemo } from 'react';
import { Layout, Plus, Trash2, GripVertical } from 'lucide-react';
import type { Story, StoryAct } from '@/types/story';
import { Button } from '@/components/ui/button';

interface PlotArchitectureStepProps {
  data: Partial<Story>;
  onUpdate: (data: Partial<Story>) => void;
}

export function PlotArchitectureStep({ data, onUpdate }: PlotArchitectureStepProps) {
  const acts = useMemo(() => data.acts || [], [data.acts]);

  const addAct = useCallback(() => {
    const newAct: StoryAct = {
      id: crypto.randomUUID(),
      number: acts.length + 1,
      title: `Act ${acts.length + 1}`,
      description: '',
      keyScenes: [],
      characterDevelopment: '',
      duration: 30,
    };
    onUpdate({ acts: [...acts, newAct] });
  }, [acts, onUpdate]);

  const removeAct = useCallback((id: string) => {
    const filteredActs = acts.filter((a) => a.id !== id)
      .map((a, index) => ({ ...a, number: index + 1 }));
    onUpdate({ acts: filteredActs });
  }, [acts, onUpdate]);

  const updateAct = useCallback((id: string, updates: Partial<StoryAct>) => {
    const updatedActs = acts.map((a) => 
      a.id === id ? { ...a, ...updates } : a
    );
    onUpdate({ acts: updatedActs });
  }, [acts, onUpdate]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <Layout className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">
            Plot Architecture
          </h3>
        </div>
        <Button 
          onClick={addAct}
          variant="outline"
          className="gap-2 border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-900/20 text-purple-600 dark:text-purple-400 font-bold"
        >
          <Plus className="w-4 h-4" />
          Append Act
        </Button>
      </div>

      <div className="space-y-6">
        {acts.length === 0 && (
          <div className="text-center py-20 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-3xl">
            <p className="text-gray-400 font-medium">No acts defined yet. Start building your sequence.</p>
            <Button onClick={addAct} variant="link" className="text-purple-500 font-bold mt-2">Initialize 3-Act Structure</Button>
          </div>
        )}

        {acts.map((act) => (
          <div 
            key={act.id}
            className="group relative bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all"
          >
            <div className="flex items-start gap-4">
              <div className="flex flex-col items-center gap-2 pt-2">
                <GripVertical className="w-5 h-5 text-gray-300 cursor-grab" />
                <span className="text-xs font-black text-gray-300 dark:text-gray-700">{act.number.toString().padStart(2, '0')}</span>
              </div>
              
              <div className="flex-1 space-y-4">
                <div className="flex items-center justify-between">
                  <input
                    type="text"
                    value={act.title}
                    onChange={(e) => updateAct(act.id, { title: e.target.value })}
                    className="text-xl font-bold bg-transparent border-none outline-none focus:ring-0 w-full p-0 text-gray-900 dark:text-white"
                    placeholder="Act Title (e.g., The Setup)"
                  />
                  <button 
                    onClick={() => removeAct(act.id)}
                    className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-500 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <textarea
                  value={act.description}
                  onChange={(e) => updateAct(act.id, { description: e.target.value })}
                  rows={2}
                  className="w-full bg-gray-50 dark:bg-gray-800/50 border-none rounded-xl p-3 text-sm resize-none focus:ring-2 focus:ring-purple-500/20 transition-all outline-none"
                  placeholder="What happens in this act? Describe the core progression..."
                />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest mb-1">
                      Character Transformation
                    </label>
                    <input
                      type="text"
                      value={act.characterDevelopment}
                      onChange={(e) => updateAct(act.id, { characterDevelopment: e.target.value })}
                      className="w-full bg-transparent border-b border-gray-100 dark:border-gray-800 py-1 text-xs outline-none focus:border-purple-500"
                      placeholder="e.g. Hero faces first failure..."
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest mb-1">
                      Est. Duration (min)
                    </label>
                    <input
                      type="number"
                      value={act.duration}
                      onChange={(e) => updateAct(act.id, { duration: parseInt(e.target.value) || 0 })}
                      className="w-full bg-transparent border-b border-gray-100 dark:border-gray-800 py-1 text-xs outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
