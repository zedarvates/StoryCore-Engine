import React from 'react';
import { Sparkles, Type, AlignLeft } from 'lucide-react';
import type { Story } from '@/types/story';
import { GENRE_OPTIONS, TONE_OPTIONS } from '@/types/world';

interface FoundationsStepProps {
  data: Partial<Story>;
  onUpdate: (data: Partial<Story>) => void;
}

export function FoundationsStep({ data, onUpdate }: FoundationsStepProps) {
  const handleTitleChange = (title: string) => {
    onUpdate({ title });
  };

  const handleLoglineChange = (logline: string) => {
    onUpdate({ logline });
  };

  const handleGenreToggle = (genreValue: string) => {
    // Story type says genre is string | string[] usually, but let's assume string or string[] logic
    const currentGenres = Array.isArray(data.genre) ? data.genre : (data.genre ? [data.genre] : []);
    const newGenres = currentGenres.includes(genreValue)
      ? currentGenres.filter((g) => g !== genreValue)
      : [...currentGenres, genreValue];
    onUpdate({ genre: newGenres });
  };

  const handleToneToggle = (toneValue: string) => {
    const currentTones = Array.isArray(data.tone) ? data.tone : (data.tone ? [data.tone] : []);
    const newTones = currentTones.includes(toneValue)
      ? currentTones.filter((t) => t !== toneValue)
      : [...currentTones, toneValue];
    onUpdate({ tone: newTones });
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Identity Section */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 pb-4">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Type className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 italic">
            Scenario Identity
          </h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 mb-2 uppercase tracking-widest">
              Epic Title
            </label>
            <input
              type="text"
              value={data.title || ''}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Enter story title..."
              className="w-full px-5 py-4 text-2xl font-black bg-white dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 focus:border-blue-500 dark:focus:border-blue-400 rounded-2xl transition-all outline-none shadow-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 mb-2 uppercase tracking-widest">
              The Logline / High Concept
            </label>
            <div className="relative">
              <textarea
                value={data.logline || ''}
                onChange={(e) => handleLoglineChange(e.target.value)}
                placeholder="In a world where..."
                rows={3}
                className="w-full px-5 py-4 bg-white dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 focus:border-blue-500 dark:focus:border-blue-400 rounded-2xl transition-all outline-none shadow-sm resize-none"
              />
              <AlignLeft className="absolute bottom-4 right-4 w-5 h-5 text-gray-300 pointer-events-none" />
            </div>
          </div>
        </div>
      </section>

      {/* DNA Section */}
      <section className="bg-gray-50/50 dark:bg-gray-900/50 p-8 rounded-3xl border border-gray-100 dark:border-gray-800 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div>
            <label className="flex items-center gap-2 text-xs font-bold text-gray-400 dark:text-gray-500 mb-4 uppercase tracking-widest">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Genre Infusion
            </label>
            <div className="flex flex-wrap gap-2">
              {GENRE_OPTIONS.map((genre) => (
                <button
                  key={genre.value}
                  onClick={() => handleGenreToggle(genre.value)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                    (Array.isArray(data.genre) ? data.genre : [data.genre]).includes(genre.value)
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25 scale-105'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-blue-300'
                  }`}
                >
                  {genre.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-xs font-bold text-gray-400 dark:text-gray-500 mb-4 uppercase tracking-widest">
              <Sparkles className="w-4 h-4 text-purple-500" />
              Emotional Resonance
            </label>
            <div className="flex flex-wrap gap-2">
              {TONE_OPTIONS.map((tone) => (
                <button
                  key={tone.value}
                  onClick={() => handleToneToggle(tone.value)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                    (Array.isArray(data.tone) ? data.tone : [data.tone]).includes(tone.value)
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25 scale-105'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-purple-300'
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
