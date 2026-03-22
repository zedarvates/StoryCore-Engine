import React, { useState } from 'react';
import { History, Users, User, UserPlus, Trash2 } from 'lucide-react';
import type { Character, CharacterRelationship } from '@/types/character';
import type { World } from '@/types/world';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { EnhancedCharacterAssistant } from '../../character-creator/EnhancedCharacterAssistant';

interface ChroniclesStepProps {
  data: Partial<Character>;
  onUpdate: (data: Partial<Character>) => void;
  worldContext?: Partial<World>;
  productionMode?: string;
}

export function ChroniclesStep({ data, onUpdate, worldContext, productionMode }: ChroniclesStepProps) {
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
      const relationships = data.relationships || [];
      const newRel: CharacterRelationship = {
        character_id: crypto.randomUUID(),
        character_name: newRelName.trim(),
        relationship_type: newRelType.trim(),
        description: '',
        dynamic: '',
      };
      onUpdate({ relationships: [...relationships, newRel] });
      setNewRelName('');
      setNewRelType('');
    }
  };

  const removeRelationship = (index: number) => {
    const relationships = data.relationships || [];
    onUpdate({ relationships: relationships.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-500/10 rounded-lg">
          <History className="w-5 h-5 text-blue-500" />
        </div>
        <h2 className="text-xl font-bold">Chronicles & Connections</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <User className="w-4 h-4" />
              Life Story
            </h3>
            <EnhancedCharacterAssistant
              suggestionType="backstory"
              characterData={data}
              worldContext={worldContext}
              productionMode={productionMode}
              onSuggestion={(field, val) => {
                if (field === 'backstory') {
                  updateBackground({ backstory: val as string });
                }
              }}
            />
          </div>
          <textarea
            className="w-full h-48 p-4 rounded-xl bg-gray-900/50 border border-white/10 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all resize-none text-sm leading-relaxed"
            placeholder="Describe the major events and formative experiences that shaped who this character is today..."
            value={data.background?.backstory || ''}
            onChange={(e) => updateBackground({ backstory: e.target.value })}
          />
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Users className="w-4 h-4" />
            Key Relationships
          </h3>
          <div className="p-4 rounded-xl bg-gray-900/50 border border-white/10 space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Name"
                value={newRelName}
                onChange={(e) => setNewRelName(e.target.value)}
                className="flex-[2]"
              />
              <Input
                placeholder="Role (e.g. Rival, Mentor)"
                value={newRelType}
                onChange={(e) => setNewRelType(e.target.value)}
                className="flex-[2]"
              />
              <Button onClick={addRelationship} variant="secondary" className="px-3">
                <UserPlus className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-2 max-h-[12rem] overflow-y-auto pr-2 custom-scrollbar">
              {data.relationships?.map((rel, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 group hover:border-white/10 transition-colors"
                >
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">{rel.character_name}</span>
                    <span className="text-xs text-blue-400 font-medium">{rel.relationship_type}</span>
                  </div>
                  <button
                    onClick={() => removeRelationship(index)}
                    className="p-1.5 text-gray-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                    title="Remove relationship"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {!data.relationships?.length && (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-xs italic">No relationships defined yet.</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      <section className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Users className="w-4 h-4" />
            Daily Existence
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Habits & Routines</label>
              <textarea
                className="w-full h-24 p-3 rounded-xl bg-gray-900/50 border border-white/10 text-sm"
                placeholder="Morning coffee, specific tic, training regime..."
                value={typeof data.daily_details?.habits === 'string' ? data.daily_details.habits : (data.daily_details?.habits?.join('\n') || '')}
                onChange={(e) => onUpdate({ daily_details: { ...data.daily_details, habits: e.target.value.split('\n').filter(s => s.trim().length > 0) } })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Diet & Cuisine</label>
              <textarea
                className="w-full h-24 p-3 rounded-xl bg-gray-900/50 border border-white/10 text-sm"
                placeholder="Loves ramen, hates cilantro, vegan..."
                value={data.daily_details?.diet || ''}
                onChange={(e) => onUpdate({ daily_details: { ...data.daily_details, diet: e.target.value } })}
              />
            </div>
          </div>
      </section>
    </div>
  );
}
