import React, { useCallback, useMemo } from 'react';
import { Users, Shield, Sword, Heart, Star } from 'lucide-react';
import type { Story, CharacterReference } from '@/types/story';
import { useStore } from '@/store';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CharacterArcsStepProps {
  data: Partial<Story>;
  onUpdate: (data: Partial<Story>) => void;
}

export function CharacterArcsStep({ data, onUpdate }: CharacterArcsStepProps) {
  const characters = useStore((state) => state.characters || []);
  const selectedChars = useMemo(() => data.charactersUsed || [], [data.charactersUsed]);

  const toggleCharacter = useCallback((char: { id: string; name: string }) => {
    const isSelected = selectedChars.some(c => c.id === char.id);
    let newSelected: CharacterReference[];
    
    if (isSelected) {
      newSelected = selectedChars.filter(c => c.id !== char.id);
    } else {
      newSelected = [...selectedChars, {
        id: char.id,
        name: char.name,
        role: 'Protagonist' // Default role
      }];
    }
    
    onUpdate({ charactersUsed: newSelected });
  }, [selectedChars, onUpdate]);

  const updateRole = useCallback((id: string, role: string) => {
    const newSelected = selectedChars.map(c => 
      c.id === id ? { ...c, role } : c
    );
    onUpdate({ charactersUsed: newSelected });
  }, [selectedChars, onUpdate]);

  const roles = [
    { label: 'Protagonist', icon: Star, color: 'text-amber-500' },
    { label: 'Antagonist', icon: Sword, color: 'text-red-500' },
    { label: 'Guardian', icon: Shield, color: 'text-blue-500' },
    { label: 'Supporter', icon: Heart, color: 'text-pink-500' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 pb-4">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
          <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 italic">
          Cast & Arcs
        </h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Selection Sidebar */}
        <div className="space-y-4">
          <label className="block text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
            Available Cast
          </label>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-2">
              {characters.length === 0 && (
                <p className="text-sm text-gray-400 italic py-10 text-center border-2 border-dashed rounded-2xl">
                  No characters found in world database.
                </p>
              )}
              {characters.map((char) => {
                const charId = char.character_id;
                const isSelected = selectedChars.some(c => c.id === charId);
                const portrait = char.visual_identity?.generated_portrait;
                const archetype = char.role?.archetype || 'No Archetype';
                
                return (
                  <button
                    key={charId}
                    onClick={() => toggleCharacter({ id: charId, name: char.name })}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20'
                        : 'border-gray-50 dark:border-gray-800 hover:border-blue-200 bg-white dark:bg-gray-900'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden flex-shrink-0">
                      {portrait ? (
                        <img src={portrait} alt={char.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400"><Users className="w-5 h-5" /></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-900 dark:text-white truncate">{char.name}</h4>
                      <p className="text-xs text-gray-500 truncate">{archetype}</p>
                    </div>
                    {isSelected && <div className="w-2 h-2 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50" />}
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Roles & Arcs Editor */}
        <div className="space-y-4">
          <label className="block text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
            Narrative Functions
          </label>
          <div className="space-y-4">
            {selectedChars.length === 0 && (
              <div className="h-[400px] flex flex-col items-center justify-center text-center p-8 bg-gray-50 dark:bg-gray-900/50 rounded-3xl border-2 border-dashed border-gray-100 dark:border-gray-800">
                <Users className="w-12 h-12 text-gray-200 dark:text-gray-800 mb-4" />
                <p className="text-gray-400 font-medium">Select characters from the left to define their roles in this scenario.</p>
              </div>
            )}
            {selectedChars.map((char) => (
              <div 
                key={char.id}
                className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-gray-900 dark:text-white">{char.name}</h4>
                  <button 
                    onClick={() => toggleCharacter(char)}
                    className="text-[10px] font-black text-red-400 uppercase tracking-widest hover:text-red-500 transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  {roles.map((role) => {
                    const RoleIcon = role.icon;
                    const isActive = char.role === role.label;
                    return (
                      <button
                        key={role.label}
                        onClick={() => updateRole(char.id, role.label)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-bold transition-all border ${
                          isActive
                            ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-transparent shadow-md'
                            : 'bg-transparent border-gray-100 dark:border-gray-800 text-gray-500 hover:border-gray-300'
                        }`}
                      >
                        <RoleIcon className={`w-3 h-3 ${isActive ? (isActive && char.role === 'Protagonist' ? 'text-amber-400' : 'text-current') : role.color}`} />
                        {role.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
