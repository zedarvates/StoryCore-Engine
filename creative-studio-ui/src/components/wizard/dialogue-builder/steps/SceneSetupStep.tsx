import React, { useMemo } from 'react';
import { MessageSquare, Users, Sparkles } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SceneSetupStepProps {
  data: {
    sceneContext?: string;
    participants?: string[];
    tone?: string;
  };
  onUpdate: (data: Partial<SceneSetupStepProps['data']>) => void;
}

const TONE_OPTIONS = [
  'Casual', 'Formal', 'Humorous', 'Serious', 'Tense', 'Emotional', 'Playful', 'Professional', 'Intimate', 'Confrontational'
];

export function SceneSetupStep({ data, onUpdate }: SceneSetupStepProps) {
  const characters = useAppStore((state) => state.characters || []);
  const selectedParticipants = useMemo(() => data.participants || [], [data.participants]);

  const handleToggleCharacter = (id: string) => {
    const current = selectedParticipants;
    const updated = current.includes(id)
      ? current.filter((cId: string) => cId !== id)
      : [...current, id];
    onUpdate({ participants: updated });
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <section className="space-y-4">
        <label className="flex items-center gap-2 text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
          <MessageSquare className="w-4 h-4 text-emerald-500" />
          Scene Context
        </label>
        <textarea
          value={data.sceneContext || ''}
          onChange={(e) => onUpdate({ sceneContext: e.target.value })}
          placeholder="What's happening? Why are they talking? What's the goal of this scene?"
          rows={5}
          className="w-full px-5 py-4 bg-white dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 focus:border-emerald-500 rounded-2xl transition-all outline-none shadow-sm resize-none"
        />
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <section className="space-y-4">
          <label className="flex items-center gap-2 text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
            <Users className="w-4 h-4 text-blue-500" />
            Participants
          </label>
          <ScrollArea className="h-[250px] pr-4">
            <div className="space-y-2">
              {characters.length === 0 && (
                <div className="p-8 border-2 border-dashed rounded-2xl text-center text-sm text-gray-400">
                  No characters found.
                </div>
              )}
              {characters.map((char) => {
                const charId = char.character_id || (char as { id?: string }).id || '';
                const isSelected = selectedParticipants.includes(charId);
                return (
                  <button
                    key={charId}
                    onClick={() => handleToggleCharacter(charId)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/20 shadow-md shadow-emerald-500/10'
                        : 'border-gray-50 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-emerald-200'
                    }`}
                  >
                    <span className="font-bold text-gray-900 dark:text-gray-100">{char.name}</span>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-emerald-500 bg-emerald-500' : 'border-gray-200 dark:border-gray-700'}`}>
                      {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </section>

        <section className="space-y-4">
          <label className="flex items-center gap-2 text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
            <Sparkles className="w-4 h-4 text-amber-500" />
            Conversational Tone
          </label>
          <div className="grid grid-cols-2 gap-2">
            {TONE_OPTIONS.map((tone) => (
              <button
                key={tone}
                onClick={() => onUpdate({ tone })}
                className={`px-4 py-3 rounded-xl text-xs font-bold transition-all border ${
                  data.tone === tone
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-transparent shadow-lg'
                    : 'bg-white dark:bg-gray-800 text-gray-500 border-gray-100 dark:border-gray-800 hover:border-gray-300'
                }`}
              >
                {tone}
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
