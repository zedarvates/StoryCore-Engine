import React, { useState } from 'react';
import { useWizard } from '@/contexts/WizardContext';
import { WizardFormLayout, FormField } from '../WizardFormLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Sparkles, X, Brain, Cpu, Database, Zap, Activity, Layers, Settings, Microscope } from 'lucide-react';
import { useLLMGeneration } from '@/hooks/useLLMGeneration';
import { LLMErrorDisplay, LLMLoadingState } from '../LLMErrorDisplay';
import { ServiceWarning, useServiceStatus } from '@/components/ui/service-warning';
import { useAppStore } from '@/stores/useAppStore';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  TEMPERAMENTS,
  COMMUNICATION_STYLES,
} from '@/constants/characterOptions';
import type { Character } from '@/types/character';
import type { StoryContext } from './CharacterWizard';

// ============================================================================
// Step 3: Cognitive Matrix (Personality)
// ============================================================================

interface Step3PersonalityProps {
  storyContext?: StoryContext;
}

export function Step3Personality({ storyContext }: Step3PersonalityProps = {}) {
  const { formData, updateFormData, validationErrors } = useWizard<Character>();
  const [newTrait, setNewTrait] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newFear, setNewFear] = useState('');
  const [newDesire, setNewDesire] = useState('');
  const [newFlaw, setNewFlaw] = useState('');
  const [newStrength, setNewStrength] = useState('');
  const setShowLLMSettings = useAppStore((state) => state.setShowLLMSettings);

  // Check if LLM service is configured
  const { llmConfigured, llmChecking } = useServiceStatus();

  // LLM generation for personality suggestions
  const {
    generate,
    isLoading,
    error: llmError,
    clearError,
  } = useLLMGeneration({
    onSuccess: (response) => {
      const personality = parseLLMPersonality(response.content);
      if (personality) {
        updateFormData({
          personality: {
            ...(formData.personality || {}),
            ...personality,
          } as Character['personality'],
        });
      }
    },
  });

  const handleGeneratePersonality = async () => {
    clearError();

    const uniqueEntropy = {
      timestamp: Date.now(),
      randomId: Math.random().toString(36).substring(2, 10),
      sessionSeed: Math.floor(Math.random() * 1000000),
    };

    const context = {
      characterName: formData.name || 'the character',
      archetype: formData.role?.archetype || 'character',
      ageRange: formData.visual_identity?.age_range || 'adult',
      appearance: formData.visual_identity,
      entropy: uniqueEntropy,
    };

    const systemPrompt = 'You are a character development expert. Create well-rounded, believable personalities.';

    const prompt = `Generate a detailed personality profile (Cognitive Matrix) for an entity:
- Name: ${context.characterName}
- Archetype: ${context.archetype}
- Maturity: ${context.ageRange}
- Features: ${context.appearance?.build || 'unspecified'}
- Entropy: ${uniqueEntropy.sessionSeed}

Format as JSON with keys: traits (array), values (array), fears (array), desires (array), flaws (array), strengths (array), temperament (string), communication_style (string)`;

    await generate({
      prompt,
      systemPrompt,
      temperature: 0.8,
      maxTokens: 1000,
    });
  };

  const parseLLMPersonality = (response: string): Partial<Character['personality']> | null => {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const result: Partial<Character['personality']> = {};
        if (Array.isArray(parsed.traits)) result.traits = parsed.traits;
        if (Array.isArray(parsed.values)) result.values = parsed.values;
        if (Array.isArray(parsed.fears)) result.fears = parsed.fears;
        if (Array.isArray(parsed.desires)) result.desires = parsed.desires;
        if (Array.isArray(parsed.flaws)) result.flaws = parsed.flaws;
        if (Array.isArray(parsed.strengths)) result.strengths = parsed.strengths;
        if (parsed.temperament) result.temperament = parsed.temperament;
        if (parsed.communication_style || parsed.communicationStyle) {
          result.communication_style = parsed.communication_style || parsed.communicationStyle;
        }
        return result;
      }
    } catch (error) {
      console.error('Failed to parse LLM response:', error);
    }
    return null;
  };

  const handleAddItem = (
    field: keyof Character['personality'],
    value: string,
    setter: (value: string) => void
  ) => {
    if (value.trim()) {
      const currentArray = (formData.personality?.[field] as string[]) || [];
      updateFormData({
        personality: {
          ...(formData.personality || {}),
          [field]: [...currentArray, value.trim()],
        } as Character['personality'],
      });
      setter('');
    }
  };

  const handleRemoveItem = (field: keyof Character['personality'], index: number) => {
    const currentArray = (formData.personality?.[field] as string[]) || [];
    updateFormData({
      personality: {
        ...(formData.personality || {}),
        [field]: currentArray.filter((_, i) => i !== index),
      } as Character['personality'],
    });
  };

  const updatePersonality = (updates: Partial<Character['personality']>) => {
    updateFormData({
      personality: {
        ...(formData.personality || {}),
        ...updates,
      } as Character['personality']
    });
  };

  return (
    <WizardFormLayout
      title="Cognitive Matrix"
      description="Map the heuristic architecture and behavioral subroutines of the entity"
    >
      {/* AI Assistance Section */}
      <div className="space-y-4 mb-8 p-4 rounded-lg border border-primary/20 bg-primary/5 backdrop-blur-sm shadow-[inset_0_0_10px_rgba(var(--primary-rgb),0.05)]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-primary neon-text uppercase tracking-widest text-[10px] font-mono mb-1">// Neural Logic Synthesizer</h3>
            <p className="text-[10px] text-primary/60 uppercase tracking-wider">
              Synthesize a complex personality matrix from core identity datasets
            </p>
          </div>
          <Button
            onClick={handleGeneratePersonality}
            disabled={isLoading || llmChecking || !formData.role?.archetype || !llmConfigured}
            className="gap-2 btn-neon bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
            size="sm"
          >
            <Microscope className="h-3.5 w-3.5" />
            <span className="text-[10px] font-black uppercase tracking-widest">Synthesize Matrix</span>
          </Button>
        </div>

        {!llmChecking && !llmConfigured && (
          <ServiceWarning
            service="llm"
            variant="inline"
            onConfigure={() => setShowLLMSettings(true)}
            className="bg-red-500/10 border-red-500/20 text-red-400"
          />
        )}

        {isLoading && (
          <LLMLoadingState message="Synthesizing neural pathways..." showProgress />
        )}

        {llmError && (
          <LLMErrorDisplay
            error={llmError}
            onRetry={handleGeneratePersonality}
            onDismiss={clearError}
          />
        )}
      </div>

      <div className="space-y-10">
        {/* Core Heuristics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Traits & Values */}
          <div className="space-y-8">
            {/* Traits */}
            <div className="space-y-3 p-4 border border-primary/10 bg-primary/20 relative group">
              <div className="absolute -top-3 left-3 bg-[#050b10] px-2 py-0.5 border border-primary/20">
                <span className="text-[9px] font-black text-primary uppercase tracking-widest font-mono">Heuristic Attributes</span>
              </div>
              <div className="flex gap-2 mt-2">
                <Input
                  value={newTrait}
                  onChange={(e) => setNewTrait(e.target.value)}
                  placeholder="Add DEFINING_TRAIT..."
                  onKeyPress={(e) => e.key === 'Enter' && handleAddItem('traits', newTrait, setNewTrait)}
                  className="bg-primary/5 border-primary/20 text-[10px]"
                />
                <Button onClick={() => handleAddItem('traits', newTrait, setNewTrait)} className="btn-neon bg-primary/20 text-primary border-primary/20 px-3">
                  <span className="text-[10px] font-black uppercase tracking-widest">Inject</span>
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.personality?.traits?.map((trait, index) => (
                  <Badge key={index} variant="outline" className="bg-primary/10 border-primary/30 text-primary px-2 py-1 rounded-none group hover:border-red-500/50 transition-colors">
                    <span className="text-[9px] font-mono uppercase tracking-wider">{trait}</span>
                    <button onClick={() => handleRemoveItem('traits', index)} className="ml-2 text-primary/40 hover:text-red-500 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Values */}
            <div className="space-y-3 p-4 border border-primary/10 bg-primary/20 relative group">
              <div className="absolute -top-3 left-3 bg-[#050b10] px-2 py-0.5 border border-primary/20">
                <span className="text-[9px] font-black text-primary uppercase tracking-widest font-mono">Value Directives</span>
              </div>
              <div className="flex gap-2 mt-2">
                <Input
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder="Add CORE_DIRECTIVE..."
                  onKeyPress={(e) => e.key === 'Enter' && handleAddItem('values', newValue, setNewValue)}
                  className="bg-primary/5 border-primary/20 text-[10px]"
                />
                <Button onClick={() => handleAddItem('values', newValue, setNewValue)} className="btn-neon bg-primary/20 text-primary border-primary/20 px-3">
                  <span className="text-[10px] font-black uppercase tracking-widest">Inject</span>
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.personality?.values?.map((val, index) => (
                  <Badge key={index} variant="outline" className="bg-primary/10 border-primary/30 text-primary px-2 py-1 rounded-none group hover:border-red-500/50 transition-colors">
                    <span className="text-[9px] font-mono uppercase tracking-wider">{val}</span>
                    <button onClick={() => handleRemoveItem('values', index)} className="ml-2 text-primary/40 hover:text-red-500 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Inhibitors & Objectives */}
          <div className="space-y-8">
            {/* Fears */}
            <div className="space-y-3 p-4 border border-primary/10 bg-primary/20 relative group">
              <div className="absolute -top-3 left-3 bg-[#050b10] px-2 py-0.5 border border-primary/20">
                <span className="text-[9px] font-black text-primary uppercase tracking-widest font-mono">Inhibition Subroutines</span>
              </div>
              <div className="flex gap-2 mt-2">
                <Input
                  value={newFear}
                  onChange={(e) => setNewFear(e.target.value)}
                  placeholder="Add INHIBITOR..."
                  onKeyPress={(e) => e.key === 'Enter' && handleAddItem('fears', newFear, setNewFear)}
                  className="bg-primary/5 border-primary/20 text-[10px]"
                />
                <Button onClick={() => handleAddItem('fears', newFear, setNewFear)} className="btn-neon bg-primary/20 text-primary border-primary/20 px-3">
                  <span className="text-[10px] font-black uppercase tracking-widest">Inject</span>
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.personality?.fears?.map((fear, index) => (
                  <Badge key={index} variant="outline" className="bg-primary/10 border-primary/30 text-primary px-2 py-1 rounded-none group hover:border-red-500/50 transition-colors">
                    <span className="text-[9px] font-mono uppercase tracking-wider">{fear}</span>
                    <button onClick={() => handleRemoveItem('fears', index)} className="ml-2 text-primary/40 hover:text-red-500 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Desires */}
            <div className="space-y-3 p-4 border border-primary/10 bg-primary/20 relative group">
              <div className="absolute -top-3 left-3 bg-[#050b10] px-2 py-0.5 border border-primary/20">
                <span className="text-[9px] font-black text-primary uppercase tracking-widest font-mono">Expansion Objectives</span>
              </div>
              <div className="flex gap-2 mt-2">
                <Input
                  value={newDesire}
                  onChange={(e) => setNewDesire(e.target.value)}
                  placeholder="Add OBJECTIVE..."
                  onKeyPress={(e) => e.key === 'Enter' && handleAddItem('desires', newDesire, setNewDesire)}
                  className="bg-primary/5 border-primary/20 text-[10px]"
                />
                <Button onClick={() => handleAddItem('desires', newDesire, setNewDesire)} className="btn-neon bg-primary/20 text-primary border-primary/20 px-3">
                  <span className="text-[10px] font-black uppercase tracking-widest">Inject</span>
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.personality?.desires?.map((desire, index) => (
                  <Badge key={index} variant="outline" className="bg-primary/10 border-primary/30 text-primary px-2 py-1 rounded-none group hover:border-red-500/50 transition-colors">
                    <span className="text-[9px] font-mono uppercase tracking-wider">{desire}</span>
                    <button onClick={() => handleRemoveItem('desires', index)} className="ml-2 text-primary/40 hover:text-red-500 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Binary Balance: Strengths & Flaws */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10">
          {/* Strengths */}
          <div className="space-y-3 p-4 border border-primary/10 bg-primary/20 relative group">
            <div className="absolute -top-3 left-3 bg-[#050b10] px-2 py-0.5 border border-primary/20">
              <span className="text-[9px] font-black text-primary uppercase tracking-widest font-mono">Functional Superiorities</span>
            </div>
            <div className="flex gap-2 mt-2">
              <Input
                value={newStrength}
                onChange={(e) => setNewStrength(e.target.value)}
                placeholder="Add SUPERIORITY..."
                onKeyPress={(e) => e.key === 'Enter' && handleAddItem('strengths', newStrength, setNewStrength)}
                className="bg-primary/5 border-primary/20 text-[10px]"
              />
              <Button onClick={() => handleAddItem('strengths', newStrength, setNewStrength)} className="btn-neon bg-primary/20 text-primary border-primary/20 px-3">
                <span className="text-[10px] font-black uppercase tracking-widest">Inject</span>
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.personality?.strengths?.map((strength, index) => (
                <Badge key={index} variant="outline" className="bg-primary/10 border-primary/30 text-primary px-2 py-1 rounded-none group hover:border-red-500/50 transition-colors">
                  <span className="text-[9px] font-mono uppercase tracking-wider">{strength}</span>
                  <button onClick={() => handleRemoveItem('strengths', index)} className="ml-2 text-primary/40 hover:text-red-500 transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Flaws */}
          <div className="space-y-3 p-4 border border-primary/10 bg-primary/20 relative group">
            <div className="absolute -top-3 left-3 bg-[#050b10] px-2 py-0.5 border border-primary/20">
              <span className="text-[9px] font-black text-primary uppercase tracking-widest font-mono">Logic Anomalies</span>
            </div>
            <div className="flex gap-2 mt-2">
              <Input
                value={newFlaw}
                onChange={(e) => setNewFlaw(e.target.value)}
                placeholder="Add ANOMALY..."
                onKeyPress={(e) => e.key === 'Enter' && handleAddItem('flaws', newFlaw, setNewFlaw)}
                className="bg-primary/5 border-primary/20 text-[10px]"
              />
              <Button onClick={() => handleAddItem('flaws', newFlaw, setNewFlaw)} className="btn-neon bg-primary/20 text-primary border-primary/20 px-3">
                <span className="text-[10px] font-black uppercase tracking-widest">Inject</span>
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.personality?.flaws?.map((flaw, index) => (
                <Badge key={index} variant="outline" className="bg-primary/10 border-primary/30 text-primary px-2 py-1 rounded-none group hover:border-red-500/50 transition-colors">
                  <span className="text-[9px] font-mono uppercase tracking-wider">{flaw}</span>
                  <button onClick={() => handleRemoveItem('flaws', index)} className="ml-2 text-primary/40 hover:text-red-500 transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Baselines & Protocols */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <FormField label="Emotional Baseline" name="temperament">
            <Select
              value={TEMPERAMENTS.includes(formData.personality?.temperament as any) ? formData.personality?.temperament : (formData.personality?.temperament ? 'Other' : '')}
              onValueChange={(val) => updatePersonality({ temperament: val === 'Other' ? '' : val })}
            >
              <SelectTrigger className="bg-primary/5 border-primary/20">
                <SelectValue placeholder="Select baseline" />
              </SelectTrigger>
              <SelectContent className="bg-[#050b10] border-primary/30">
                {TEMPERAMENTS.map(t => (
                  <SelectItem key={t} value={t} className="focus:bg-primary/20 focus:text-primary uppercase text-[10px] font-mono">{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="Interface Protocol" name="communication_style">
            <Select
              value={COMMUNICATION_STYLES.includes(formData.personality?.communication_style as any) ? formData.personality?.communication_style : (formData.personality?.communication_style ? 'Other' : '')}
              onValueChange={(val) => updatePersonality({ communication_style: val === 'Other' ? '' : val })}
            >
              <SelectTrigger className="bg-primary/5 border-primary/20">
                <SelectValue placeholder="Select protocol" />
              </SelectTrigger>
              <SelectContent className="bg-[#050b10] border-primary/30">
                {COMMUNICATION_STYLES.map(s => (
                  <SelectItem key={s} value={s} className="focus:bg-primary/20 focus:text-primary uppercase text-[10px] font-mono">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </div>
      </div>
    </WizardFormLayout>
  );
}
