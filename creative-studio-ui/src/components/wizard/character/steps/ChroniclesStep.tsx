import React, { useState } from 'react';
import { History, Users, User, UserPlus, Trash2 } from 'lucide-react';
import type { Character, CharacterRelationship } from '@/types/character';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { EnhancedCharacterAssistant } from '../../character-creator/EnhancedCharacterAssistant';

interface ChroniclesStepProps {
  data: Partial<Character>;
  onUpdate: (data: Partial<Character>) => void;
  worldContext?: unknown;
}

export function ChroniclesStep({ data, onUpdate, worldContext }: ChroniclesStepProps) {
  const [newRelName, setNewRelName] = useState('');
  const [newRelType, setNewRelType] = useState('');

  const updateBackground = (updates: Partial<Character['background']>) => {
    onUpdate({
      background: {
        ...data.background,
        ...updates,
      } as Character['background'],
    });
  };

  const addRelationship = () => {
    if (newRelName.trim() && newRelType.trim()) {
      const rels = data.relationships || [];
      const newRel: CharacterRelationship = {
        character_id: crypto.randomUUID(),
        character_name: newRelName.trim(),
        relationship_type: newRelType.trim(),
        description: '',
        dynamic: '',
      };
      onUpdate({ relationships: [...rels, newRel] });
      setNewRelName('');
      setNewRelType('');
    }
  };

  const removeRelationship = (index: number) => {
    const rels = data.relationships || [];
    onUpdate({ relationships: rels.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* Background Section */}
      <section className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xl space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <History className="w-5 h-5 text-amber-500" />
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-gray-400">Chronological Data</h3>
          </div>
          <EnhancedCharacterAssistant
            suggestionType="backstory"
            characterData={data}
            worldContext={worldContext}
            onSuggestion={(field, val) => {
              if (field === 'backstory') {
                updateBackground({ origin: String(val) });
              }
            }}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500/70 ml-1">Origin / Home</label>
              <Input
                value={data.background?.origin || ''}
                onChange={(e) => updateBackground({ origin: e.target.value })}
                placeholder="Where were they born?"
                className="bg-gray-50 dark:bg-gray-800 border-transparent rounded-xl"
              />
           </div>
           <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500/70 ml-1">Current Occupation</label>
              <Input
                value={data.background?.occupation || ''}
                onChange={(e) => updateBackground({ occupation: e.target.value })}
                placeholder="What do they do now?"
                className="bg-gray-50 dark:bg-gray-800 border-transparent rounded-xl"
              />
           </div>
        </div>

        <div className="space-y-2">
           <label className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500/70 ml-1">Backstory & Experience</label>
           <textarea
              value={data.background?.family || ''} 
              onChange={(e) => updateBackground({ family: e.target.value })}
              placeholder="Crucial life events, family background, or secrets..."
              className="w-full p-4 min-h-[120px] bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-amber-500 focus:bg-white dark:focus:bg-gray-950 rounded-2xl transition-all outline-none resize-none"
           />
        </div>
      </section>

      {/* Relationships Section */}
      <section className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xl space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-gray-100 dark:border-gray-800">
           <Users className="w-5 h-5 text-green-500" />
           <h3 className="text-sm font-black uppercase tracking-[0.2em] text-gray-400">Social Nexus</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
           <Input
              value={newRelName}
              onChange={(e) => setNewRelName(e.target.value)}
              placeholder="Target character name..."
              className="bg-gray-50 dark:bg-gray-800 border-transparent rounded-xl"
           />
           <div className="flex gap-2">
              <Input
                value={newRelType}
                onChange={(e) => setNewRelType(e.target.value)}
                placeholder="Relationship type..."
                className="flex-1 bg-gray-50 dark:bg-gray-800 border-transparent rounded-xl"
              />
              <Button onClick={addRelationship} className="bg-green-100 text-green-600 hover:bg-green-200 border-none rounded-xl">
                 <UserPlus size={18} />
              </Button>
           </div>
        </div>

        <div className="space-y-3 pt-2">
           {data.relationships?.map((rel, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-transparent hover:border-green-200 transition-all">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                       <User size={20} />
                    </div>
                    <div>
                       <h4 className="text-sm font-bold">{rel.character_name}</h4>
                       <p className="text-xs text-gray-500">{rel.relationship_type}</p>
                    </div>
                 </div>
                 <button onClick={() => removeRelationship(i)} className="text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 size={16} />
                 </button>
              </div>
           ))}
           {!data.relationships?.length && (
              <p className="text-xs text-gray-400 italic text-center py-4">No relationships recorded yet.</p>
           )}
        </div>
      </section>

    </div>
  );
}
