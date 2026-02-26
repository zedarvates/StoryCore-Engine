import React, { useState } from 'react';
import { CheckCircle2, Wand2, Zap, Flame } from 'lucide-react';
import type { World } from '@/types/world';
import { GENRE_OPTIONS, TONE_OPTIONS } from '@/types/world';
import { WORLD_PRESETS, WorldPreset, ICONS } from '../presets';

interface QuickSetupStepProps {
  data: Partial<World>;
  onUpdate: (data: Partial<World>) => void;
  onApplyPreset: (preset: WorldPreset) => void;
}

export function QuickSetupStep({ data, onUpdate, onApplyPreset }: QuickSetupStepProps) {
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [isGeneratingName, setIsGeneratingName] = useState(false);

  const handleNameChange = (name: string) => {
    onUpdate({ name });
  };

  const generateName = async () => {
    setIsGeneratingName(true);
    // Simulation
    await new Promise(resolve => setTimeout(resolve, 800));
    const genres = data.genre || [];
    
    let base = 'Unnamed Realm';
    if (genres.includes('fantasy')) base = 'Aethelgard';
    else if (genres.includes('cyberpunk')) base = 'Neo-Kyoto 7';
    else if (genres.includes('horror')) base = 'Mistvale';
    
    onUpdate({ name: `${base} ${Math.floor(Math.random() * 100)}` });
    setIsGeneratingName(false);
  };

  const handleGenreToggle = (genreValue: string) => {
    const currentGenres = data.genre || [];
    const newGenres = currentGenres.includes(genreValue)
      ? currentGenres.filter((g) => g !== genreValue)
      : [...currentGenres, genreValue];
    onUpdate({ genre: newGenres });
  };

  const handleToneToggle = (toneValue: string) => {
    const currentTones = data.tone || [];
    const newTones = currentTones.includes(toneValue)
      ? currentTones.filter((t) => t !== toneValue)
      : [...currentTones, toneValue];
    onUpdate({ tone: newTones });
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Prime Templates Section */}
      <section>
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-amber-100/50 dark:bg-amber-900/20 backdrop-blur-md rounded-2xl border border-amber-200/20 dark:border-amber-500/20 shadow-inner">
            <Zap className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-gray-800 dark:text-gray-100 tracking-tight">Prime Foundations</h3>
            <p className="text-sm text-gray-500 font-medium">Select a structural template or diverge from the void.</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Start Fresh Option */}
          <button
            onClick={() => {
              setSelectedPresetId('fresh');
              onApplyPreset({
                id: 'fresh',
                name: 'Fresh Start',
                description: 'Start with a blank canvas and build everything from scratch.',
                genre: [],
                tone: [],
                locations: [],
                rules: [],
                keyObjects: [],
                culturalElements: { languages: [], religions: [], traditions: [], historicalEvents: [], culturalConflicts: [] },
                icon: ICONS.fresh,
              });
            }}
            className={`group relative p-6 rounded-3xl border-2 text-left transition-all duration-500 overflow-hidden ${
              selectedPresetId === 'fresh' 
                ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20 shadow-2xl shadow-indigo-500/20 -translate-y-1' 
                : 'border-transparent bg-white/40 dark:bg-gray-900/40 backdrop-blur-xl hover:border-indigo-300/50 dark:hover:border-indigo-700/50 hover:shadow-xl hover:-translate-y-0.5'
            }`}
          >
             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Flame className="w-16 h-16 text-indigo-500" />
             </div>
             
            <div className="flex justify-between items-start mb-4">
              <span className="text-4xl filter drop-shadow-md group-hover:scale-125 transition-transform duration-500">{ICONS.fresh}</span>
              {selectedPresetId === 'fresh' && (
                <div className="p-1 bg-indigo-500 rounded-full">
                  <CheckCircle2 className="w-5 h-5 text-white" />
                </div>
              )}
            </div>
            <h4 className="text-lg font-black mb-1 text-gray-800 dark:text-white">Absolute Void</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
              Total creative autonomy. No predefined constraints.
            </p>
          </button>

          {/* Presets */}
          {WORLD_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => {
                setSelectedPresetId(preset.id);
                onApplyPreset(preset);
              }}
              className={`group relative p-6 rounded-3xl border-2 text-left transition-all duration-500 overflow-hidden ${
                selectedPresetId === preset.id 
                  ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20 shadow-2xl shadow-indigo-500/20 -translate-y-1' 
                  : 'border-transparent bg-white/40 dark:bg-gray-900/40 backdrop-blur-xl hover:border-indigo-300/50 dark:hover:border-indigo-700/50 hover:shadow-xl hover:-translate-y-0.5'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <span className="text-4xl filter drop-shadow-md group-hover:scale-125 transition-transform duration-500">{preset.icon}</span>
                {selectedPresetId === preset.id && (
                  <div className="p-1 bg-indigo-500 rounded-full">
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  </div>
                )}
              </div>
              <h4 className="text-lg font-black mb-1 text-gray-800 dark:text-white">{preset.name}</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                {preset.description}
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* Quick Settings with Plasma Plex feel */}
      <section className="bg-white/40 dark:bg-gray-900/40 backdrop-blur-2xl p-8 rounded-3xl border border-white/20 dark:border-white/5 shadow-xl space-y-10">
        <div className="relative group">
          <label className="block text-[10px] font-black text-indigo-600 dark:text-indigo-400 mb-2 uppercase tracking-[0.2em]">
            Cosmic Designation
          </label>
          <div className="relative">
            <input
              type="text"
              value={data.name || ''}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="What is this world called?"
              className="w-full pl-6 pr-14 py-5 text-2xl font-black bg-white/50 dark:bg-gray-950/50 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl transition-all outline-none shadow-inner"
            />
            <button 
              onClick={generateName}
              disabled={isGeneratingName}
              className={`absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 active:scale-90 transition-all ${isGeneratingName ? 'animate-spin' : ''}`}
            >
              <Wand2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div>
            <label className="block text-[10px] font-black text-indigo-600 dark:text-indigo-400 mb-4 uppercase tracking-[0.2em]">
              Primary Archetypes
            </label>
            <div className="flex flex-wrap gap-2.5">
              {GENRE_OPTIONS.map((genre) => (
                <button
                  key={genre.value}
                  onClick={() => handleGenreToggle(genre.value)}
                  className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all ${
                    data.genre?.includes(genre.value)
                      ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/40 scale-105'
                      : 'bg-white/50 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30'
                  }`}
                >
                  {genre.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-indigo-600 dark:text-indigo-400 mb-4 uppercase tracking-[0.2em]">
              Atmospheric Vibration
            </label>
            <div className="flex flex-wrap gap-2.5">
              {TONE_OPTIONS.map((tone) => (
                <button
                  key={tone.value}
                  onClick={() => handleToneToggle(tone.value)}
                  className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all ${
                    data.tone?.includes(tone.value)
                      ? 'bg-purple-600 text-white shadow-xl shadow-purple-500/40 scale-105'
                      : 'bg-white/50 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-purple-50 dark:hover:bg-purple-900/30'
                  }`}
                >
                  {tone.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
