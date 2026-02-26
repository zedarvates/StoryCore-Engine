import React, { useState } from 'react';
import { Palette, Brain, X, Plus } from 'lucide-react';
import type { Character } from '@/types/character';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  HAIR_COLORS,
  EYE_COLORS,
  SKIN_TONES,
  BODY_BUILDS,
  HEIGHT_CATEGORIES,
} from '@/constants/characterOptions';
import { EnhancedCharacterAssistant } from '../../character-creator/EnhancedCharacterAssistant';

interface EssenceStepProps {
  data: Partial<Character>;
  onUpdate: (data: Partial<Character>) => void;
  worldContext?: any;
}

export function EssenceStep({ data, onUpdate, worldContext }: EssenceStepProps) {
  const [newTrait, setNewTrait] = useState('');
  const [newColor, setNewColor] = useState('');
  const [newFeature, setNewFeature] = useState('');

  const updateVisual = (updates: Partial<Character['visual_identity']>) => {
    onUpdate({
      visual_identity: {
        ...data.visual_identity,
        ...updates,
      } as Character['visual_identity'],
    });
  };

  const updatePersonality = (updates: Partial<Character['personality']>) => {
    onUpdate({
      personality: {
        ...data.personality,
        ...updates,
      } as Character['personality'],
    });
  };

  const handleAddTrait = () => {
    if (newTrait.trim()) {
      const traits = data.personality?.traits || [];
      if (!traits.includes(newTrait.trim())) {
        updatePersonality({ traits: [...traits, newTrait.trim()] });
      }
      setNewTrait('');
    }
  };

  const handleRemoveTrait = (trait: string) => {
    const traits = data.personality?.traits || [];
    updatePersonality({ traits: traits.filter((t) => t !== trait) });
  };

  const handleAddColor = () => {
    if (newColor.trim()) {
      const colors = data.visual_identity?.color_palette || [];
      if (!colors.includes(newColor.trim())) {
        updateVisual({ color_palette: [...colors, newColor.trim()] });
      }
      setNewColor('');
    }
  };

  const handleRemoveColor = (color: string) => {
    const colors = data.visual_identity?.color_palette || [];
    updateVisual({ color_palette: colors.filter((c) => c !== color) });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Psychology Section */}
      <section className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xl space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <Brain className="w-5 h-5 text-purple-500" />
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-gray-400">Psychology & Essence</h3>
          </div>
          <EnhancedCharacterAssistant
            suggestionType="personality"
            characterData={data as any}
            worldContext={worldContext}
            onSuggestion={(field, val) => {
              if (field === 'personality') {
                 const currentTraits = data.personality?.traits || [];
                 const newTraits = Array.isArray(val) ? val : [val];
                 updatePersonality({ traits: Array.from(new Set([...currentTraits, ...newTraits])) as string[] });
              }
            }}
          />
        </div>

        <div className="space-y-4">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-500/70 ml-1">
            Personality Traits
          </label>
          <div className="flex gap-2">
            <Input
              value={newTrait}
              onChange={(e) => setNewTrait(e.target.value)}
              placeholder="Inject trait..."
              onKeyPress={(e) => e.key === 'Enter' && handleAddTrait()}
              className="flex-1 bg-gray-50 dark:bg-gray-800 border-transparent focus:border-purple-500 rounded-xl"
            />
            <Button onClick={handleAddTrait} className="bg-purple-100 text-purple-600 hover:bg-purple-200 border-none rounded-xl px-4">
              <Plus size={18} />
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {data.personality?.traits?.map((trait) => (
              <Badge key={trait} className="bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-300 border-purple-100 dark:border-purple-800/50 px-3 py-1.5 rounded-full flex items-center gap-2 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors">
                <span className="text-xs font-bold">{trait}</span>
                <button onClick={() => handleRemoveTrait(trait)} className="hover:text-red-500 transition-colors">
                  <X size={14} />
                </button>
              </Badge>
            ))}
            {!data.personality?.traits?.length && (
              <p className="text-xs text-gray-400 italic">No traits defined yet.</p>
            )}
          </div>
        </div>

        <div className="space-y-2 pt-4">
           <label className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-500/70 ml-1">
              Temperament & Values
           </label>
           <textarea
              value={data.personality?.temperament || ''}
              onChange={(e) => updatePersonality({ temperament: e.target.value })}
              placeholder="Describe the internal drive and core values..."
              className="w-full p-4 min-h-[80px] bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-purple-500 focus:bg-white dark:focus:bg-gray-950 rounded-2xl transition-all outline-none resize-none"
           />
        </div>
      </section>

      {/* Morphological Section */}
      <section className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xl space-y-8">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <Palette className="w-5 h-5 text-blue-500" />
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-gray-400">Morphology & Form</h3>
          </div>
          <EnhancedCharacterAssistant
            suggestionType="appearance"
            characterData={data as any}
            worldContext={worldContext}
            onSuggestion={(field, val) => {
              if (field === 'appearance') {
                updateVisual({ distinctive_features: Array.isArray(val) ? val : [String(val)] });
              }
            }}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500/70 ml-1">Hair Logic</label>
              <Select value={data.visual_identity?.hair_color || ''} onValueChange={(val) => updateVisual({ hair_color: val })}>
                <SelectTrigger className="bg-gray-50 dark:bg-gray-800 border-transparent rounded-xl">
                  <SelectValue placeholder="Color" />
                </SelectTrigger>
                <SelectContent>
                  {HAIR_COLORS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
           </div>
           <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500/70 ml-1">Ocular Hue</label>
              <Select value={data.visual_identity?.eye_color || ''} onValueChange={(val) => updateVisual({ eye_color: val })}>
                <SelectTrigger className="bg-gray-50 dark:bg-gray-800 border-transparent rounded-xl">
                  <SelectValue placeholder="Eyes" />
                </SelectTrigger>
                <SelectContent>
                  {EYE_COLORS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
           </div>
           <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500/70 ml-1">Skin Tone</label>
              <Select value={data.visual_identity?.skin_tone || ''} onValueChange={(val) => updateVisual({ skin_tone: val })}>
                <SelectTrigger className="bg-gray-50 dark:bg-gray-800 border-transparent rounded-xl">
                  <SelectValue placeholder="Tone" />
                </SelectTrigger>
                <SelectContent>
                  {SKIN_TONES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500/70 ml-1">Height Profile</label>
              <Select value={data.visual_identity?.height || ''} onValueChange={(val) => updateVisual({ height: val })}>
                <SelectTrigger className="bg-gray-50 dark:bg-gray-800 border-transparent rounded-xl">
                  <SelectValue placeholder="Height" />
                </SelectTrigger>
                <SelectContent>
                  {HEIGHT_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
           </div>
           <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500/70 ml-1">Structural Build</label>
              <Select value={data.visual_identity?.build || ''} onValueChange={(val) => updateVisual({ build: val })}>
                <SelectTrigger className="bg-gray-50 dark:bg-gray-800 border-transparent rounded-xl">
                  <SelectValue placeholder="Build" />
                </SelectTrigger>
                <SelectContent>
                  {BODY_BUILDS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
           </div>
        </div>

        <div className="space-y-2">
           <label className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500/70 ml-1">Visual Metadata (Distinctive Features)</label>
           <Input
              value={newFeature}
              onChange={(e) => setNewFeature(e.target.value)}
              placeholder="Add scar, tattoo, cyberware..."
              onKeyPress={(e) => {
                if (e.key === 'Enter' && newFeature.trim()) {
                  const features = data.visual_identity?.distinctive_features || [];
                  updateVisual({ distinctive_features: [...features, newFeature.trim()] });
                  setNewFeature('');
                }
              }}
              className="bg-gray-50 dark:bg-gray-800 border-transparent rounded-xl mb-2"
           />
           <div className="flex flex-wrap gap-2">
             {data.visual_identity?.distinctive_features?.map((f, i) => (
                <Badge key={i} variant="outline" className="border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 rounded-lg px-2 py-1 flex items-center gap-1">
                   {f}
                   <X size={12} className="cursor-pointer" onClick={() => {
                     const features = data.visual_identity?.distinctive_features || [];
                     updateVisual({ distinctive_features: features.filter((_, idx) => idx !== i) });
                   }} />
                </Badge>
             ))}
           </div>
        </div>

        <div className="space-y-2">
           <label className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500/70 ml-1">Aesthetic Attire</label>
           <textarea
              value={data.visual_identity?.clothing_style || ''}
              onChange={(e) => updateVisual({ clothing_style: e.target.value })}
              placeholder="Describe typical clothing and accessories..."
              className="w-full p-4 min-h-[80px] bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-gray-950 rounded-2xl transition-all outline-none resize-none"
           />
        </div>
      </section>
    </div>
  );
}
