import React, { useState } from 'react';
import { Sparkles, CheckCircle2, User, Fingerprint, Clock } from 'lucide-react';
import type { Character } from '@/types/character';
import { CHARACTER_ARCHETYPES, AGE_RANGES, GENDER_OPTIONS } from '@/constants/characterOptions';
import { CHARACTER_PRESETS, CharacterPreset, ICONS } from '../presets';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { I18nContext } from '@/utils/i18nContext';
import { useContext } from 'react';

interface IdentityStepProps {
  data: Partial<Character>;
  onUpdate: (data: Partial<Character>) => void;
  onApplyPreset: (preset: CharacterPreset) => void;
}

export function IdentityStep({ data, onUpdate, onApplyPreset }: IdentityStepProps) {
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const context = useContext(I18nContext);
  const t = context?.t || ((key: string) => key);

  const handleFieldChange = (field: string, value: string | number) => {
    if (field === 'archetype') {
      onUpdate({ role: { ...data.role, archetype: value } as Character['role'] });
    } else if (field === 'narrative_function') {
      onUpdate({ role: { ...data.role, narrative_function: value } as Character['role'] });
    } else if (field === 'age_range' || field === 'gender') {
      onUpdate({ 
        visual_identity: { 
          ...data.visual_identity, 
          [field]: value 
        } as Character['visual_identity'] 
      });
    } else {
      onUpdate({ [field]: value });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Presets Grid */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-amber-500" />
          <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 uppercase tracking-tight">
            {t('characterWizard.identity.template')}
          </h3>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Start Fresh Option */}
          <button
            onClick={() => {
              setSelectedPresetId('fresh');
              onApplyPreset({
                id: 'fresh',
                name: 'Blank Slate',
                description: 'Define your character entirely from scratch.',
                icon: ICONS.fresh,
                archetype: '',
                traits: [],
              });
            }}
            className={`group relative p-5 rounded-2xl border-2 text-left transition-all duration-300 ${
              selectedPresetId === 'fresh' 
                ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 shadow-lg' 
                : 'border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md'
            }`}
          >
            <div className="flex justify-between items-start mb-3">
              <span className="text-4xl group-hover:scale-110 transition-transform duration-300">{ICONS.fresh}</span>
              {selectedPresetId === 'fresh' && <CheckCircle2 className="w-6 h-6 text-blue-500 fill-blue-50 dark:fill-blue-950" />}
            </div>
            <h4 className="text-lg font-bold mb-1">Blank Slate</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              Start with empty fields for total control.
            </p>
          </button>

          {/* Presets */}
          {CHARACTER_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => {
                setSelectedPresetId(preset.id);
                onApplyPreset(preset);
              }}
              className={`group relative p-5 rounded-2xl border-2 text-left transition-all duration-300 ${
                selectedPresetId === preset.id 
                  ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 shadow-lg' 
                  : 'border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <span className="text-4xl group-hover:scale-110 transition-transform duration-300">{preset.icon}</span>
                {selectedPresetId === preset.id && <CheckCircle2 className="w-6 h-6 text-blue-500 fill-blue-50 dark:fill-blue-950" />}
              </div>
              <h4 className="text-lg font-bold mb-1">{preset.name}</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                {preset.description}
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* Core Identity Form */}
      <section className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xl space-y-8">
        <div className="flex items-center gap-3 pb-2 border-b border-gray-100 dark:border-gray-800">
           <Fingerprint className="w-5 h-5 text-blue-500" />
           <h3 className="text-sm font-black uppercase tracking-[0.2em] text-gray-400">{t('characterWizard.identity.coreMatrix')}</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500/70 ml-1">
              {t('characterWizard.identity.name')}
            </label>
            <div className="relative group">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              <Input
                value={data.name || ''}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                placeholder={t('characterWizard.identity.placeholderName')}
                className="pl-10 h-12 bg-gray-50 dark:bg-gray-800 border-transparent focus:border-blue-500 transition-all rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500/70 ml-1">
              {t('characterWizard.identity.archetype')}
            </label>
            <Select
              value={data.role?.archetype || ''}
              onValueChange={(val) => handleFieldChange('archetype', val)}
            >
              <SelectTrigger className="h-12 bg-gray-50 dark:bg-gray-800 border-transparent focus:border-blue-500 transition-all rounded-xl">
                <SelectValue placeholder="Select archetype" />
              </SelectTrigger>
              <SelectContent>
                {CHARACTER_ARCHETYPES.map((arch) => (
                  <SelectItem key={arch} value={arch}>
                    {t(`archetype.${arch.toLowerCase().replace(/ \/ /g, '_').replace(/ /g, '_')}`) || arch}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500/70 ml-1">
              {t('characterWizard.identity.maturityCycle')}
            </label>
            <div className="relative">
               <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
               <Select
                value={data.visual_identity?.age_range || ''}
                onValueChange={(val) => handleFieldChange('age_range', val)}
              >
                <SelectTrigger className="pl-10 h-12 bg-gray-50 dark:bg-gray-800 border-transparent focus:border-blue-500 transition-all rounded-xl">
                  <SelectValue placeholder="Select age range" />
                </SelectTrigger>
                <SelectContent>
                  {AGE_RANGES.map((range) => (
                    <SelectItem key={range} value={range}>{range}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500/70 ml-1">
              {t('characterWizard.identity.identityMatrix')}
            </label>
            <Select
              value={data.visual_identity?.gender || ''}
              onValueChange={(val) => handleFieldChange('gender', val)}
            >
              <SelectTrigger className="h-12 bg-gray-50 dark:bg-gray-800 border-transparent focus:border-blue-500 transition-all rounded-xl">
                <SelectValue placeholder="Select identity" />
              </SelectTrigger>
              <SelectContent>
                {GENDER_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2 pt-4">
           <label className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500/70 ml-1">
              {t('characterWizard.identity.narrativePurpose')}
           </label>
           <textarea
              value={data.role?.narrative_function || ''}
              onChange={(e) => handleFieldChange('narrative_function', e.target.value)}
              placeholder={t('characterWizard.identity.placeholderPurpose')}
              className="w-full p-4 min-h-[100px] bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-gray-950 rounded-2xl transition-all outline-none resize-none"
           />
        </div>

        <div className="space-y-2 pt-4">
           <label className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500/70 ml-1">
              CHARACTER GOAL / MOTIVATION
           </label>
           <textarea
              value={data.goal || ''}
              onChange={(e) => handleFieldChange('goal', e.target.value)}
              placeholder="What drives this character? (e.g. Find the legendary sword, avenge their village...)"
              className="w-full p-4 min-h-[100px] bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-amber-500 focus:bg-white dark:focus:bg-gray-950 rounded-2xl transition-all outline-none resize-none"
           />
        </div>
      </section>
    </div>
  );
}
