import React from 'react';
import { useWizard } from '@/contexts/WizardContext';
import { WizardFormLayout, FormField } from '../WizardFormLayout';
import { ValidationErrorSummary } from '../ValidationErrorSummary';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, X, Activity, Fingerprint, User, Clock } from 'lucide-react';
import { ServiceWarning, useServiceStatus } from '@/components/ui/service-warning';
import { useAppStore } from '@/stores/useAppStore';
import { useLLMGeneration } from '@/hooks/useLLMGeneration';
import { cn } from '@/lib/utils';
import { LLMLoadingState, LLMErrorDisplay } from '../LLMErrorDisplay';
import { useMemoryStore } from '@/stores/memoryStore';
import { CHARACTER_ARCHETYPES, AGE_RANGES, GENDER_OPTIONS } from '@/constants/characterOptions';
import type { Character } from '@/types/character';
import type { World } from '@/types/world';
import type { StoryContext } from './CharacterWizard';

// ============================================================================
// Step 1: Neural Signature (Basic Identity)
// ============================================================================

interface Step1BasicIdentityProps {
  worldContext?: World;
  storyContext?: StoryContext;
}

export function Step1BasicIdentity({ worldContext }: Step1BasicIdentityProps) {
  const { formData, updateFormData, validationErrors } = useWizard<Character>();
  const { llmConfigured, llmChecking } = useServiceStatus();
  const setShowLLMSettings = useAppStore((state) => state.setShowLLMSettings);
  const [suggestions, setSuggestions] = React.useState<string[]>([]);

  // LLM generation for name suggestions
  const {
    generate,
    isLoading,
    error: llmError,
    clearError,
  } = useLLMGeneration({
    onSuccess: (response) => {
      const names = parseLLMNames(response.content);
      if (names.length > 0) {
        setSuggestions(names);
        if (!formData.name) {
          updateFormData({ name: names[0] });
        }
      }
    },
  });

  const handleGenerateName = async (random: boolean = false) => {
    clearError();

    const uniqueEntropy = {
      timestamp: Date.now(),
      randomId: Math.random().toString(36).substring(2, 10),
      sessionSeed: Math.floor(Math.random() * 1000000),
    };

    const context = {
      archetype: formData.role?.archetype || 'character',
      ageRange: formData.visual_identity?.age_range || 'adult',
      worldName: worldContext?.name || 'the world',
      worldGenre: worldContext?.genre?.join(', ') || 'fantasy',
      worldTimePeriod: worldContext?.timePeriod || 'medieval',
      entropy: uniqueEntropy,
    };

    const systemPrompt = random
      ? 'You are a creative character naming assistant. Generate UNIQUE, DIVERSE names that fit the character\'s world setting and cultural context.'
      : 'You are a creative character naming assistant. Generate names that fit the character\'s role, world setting, and cultural context.';

    const prompt = `Generate 3 UNIQUE and DIFFERENT character names for:
- Archetype: ${context.archetype}
- Age Range: ${context.ageRange}
- World: ${context.worldName}
- Genre: ${context.worldGenre}
- Time Period: ${context.worldTimePeriod}
- Entropy ID: ${uniqueEntropy.sessionSeed}

[EXISTING PROJECT PROTOCOLS / MEMORY]:
${useMemoryStore.getState().workingContext}

Format as a JSON array of strings: ["Name1", "Name2", "Name3"]`;

    await generate({
      prompt,
      systemPrompt,
      temperature: random ? 0.9 : 0.7,
      maxTokens: 200,
    });
  };

  const parseLLMNames = (response: string): string[] => {
    try {
      const jsonMatch = response.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed)) {
          return parsed.filter((name) => typeof name === 'string' && name.trim());
        }
      }
      return response.split('\n')
        .map(line => line.replace(/^\d+\.\s*/, '').replace(/["']/g, '').trim())
        .filter(name => name.length > 0 && name.length < 50)
        .slice(0, 3);
    } catch (error) {
      console.error('Failed to parse LLM response:', error);
    }
    return [];
  };

  return (
    <WizardFormLayout
      title="Neural Signature"
      description="Establish the fundamental parameters of a new consciousness"
    >
      <ValidationErrorSummary errors={validationErrors} className="mb-6" />

      {/* AI Assistance Section */}
      <div className="space-y-4 mb-8 p-4 rounded-lg border border-primary/20 bg-primary/5 backdrop-blur-sm shadow-[inset_0_0_10px_rgba(var(--primary-rgb),0.05)]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-primary neon-text uppercase tracking-widest text-[10px] font-mono mb-1">// Identity Synthesizer</h3>
            <p className="text-[10px] text-primary/60 uppercase tracking-wider">
              Access the collective unconscious for evocative designations
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => handleGenerateName(false)}
              disabled={isLoading || llmChecking || !formData.role?.archetype || !llmConfigured}
              className="gap-2 btn-neon bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
              size="sm"
            >
              <Activity className="h-3.5 w-3.5" />
              <span className="text-[10px] font-black uppercase tracking-widest">Heuristic</span>
            </Button>
            <Button
              onClick={() => handleGenerateName(true)}
              disabled={isLoading || llmChecking || !formData.role?.archetype || !llmConfigured}
              className="gap-2 btn-neon bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
              size="sm"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span className="text-[10px] font-black uppercase tracking-widest">Entropy</span>
            </Button>
          </div>
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
          <LLMLoadingState message="Extracting linguistic patterns..." />
        )}

        {llmError && (
          <LLMErrorDisplay
            error={llmError}
            onRetry={() => handleGenerateName(false)}
            onDismiss={clearError}
          />
        )}
      </div>

      <div className="space-y-10">
        {/* Core Identity Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 bg-primary/5 border border-primary/10 rounded-none relative overflow-hidden">
          {/* Background scanner line effect */}
          <div className="absolute inset-x-0 h-px bg-primary/20 top-0 animate-scan" />

          <FormField
            label="Identity Designation"
            name="name"
            required
            error={validationErrors.name?.[0]}
            helpText="The primary linguistic identifier for this entity"
          >
            <div className="relative group">
              <Fingerprint className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/40 group-focus-within:text-primary transition-colors" />
              <Input
                id="name"
                value={formData.name || ''}
                onChange={(e) => updateFormData({ name: e.target.value })}
                placeholder="e.g., K-749_VOX"
                className="pl-10"
              />
            </div>

            {suggestions.length > 0 && !isLoading && (
              <div className="flex flex-wrap gap-2 mt-3">
                {suggestions.map((name, index) => (
                  <button
                    key={index}
                    onClick={() => updateFormData({ name })}
                    className={cn(
                      "px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.2em] border transition-all duration-300",
                      formData.name === name
                        ? "bg-primary text-primary-foreground border-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]"
                        : "bg-primary/5 text-primary/60 border-primary/20 hover:bg-primary/10 hover:border-primary/40"
                    )}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
          </FormField>

          <FormField
            label="Societal Archetype"
            name="archetype"
            required
            error={validationErrors.archetype?.[0]}
            helpText="The primary systemic role within the social grid"
          >
            <div className="relative group">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/40 z-10" />
              <Select
                value={formData.role?.archetype || ''}
                onValueChange={(val) => updateFormData({ role: { ...formData.role, archetype: val } as Character['role'] })}
              >
                <SelectTrigger className="pl-10">
                  <SelectValue placeholder="Select archetype" />
                </SelectTrigger>
                <SelectContent className="bg-[#050b10] border-primary/30">
                  {CHARACTER_ARCHETYPES.map((arch) => (
                    <SelectItem key={arch} value={arch} className="focus:bg-primary/20 focus:text-primary">
                      <span className="uppercase tracking-widest text-[10px] font-black font-mono">{arch}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </FormField>
        </div>

        {/* Biological/Visual Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <FormField
            label="Maturity Cycle"
            name="age_range"
            required
            error={validationErrors.age_range?.[0]}
            helpText="Chronological stage of the entity's current iteration"
          >
            <div className="relative group">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/40 z-10" />
              <Select
                value={formData.visual_identity?.age_range || ''}
                onValueChange={(val) => updateFormData({ visual_identity: { ...formData.visual_identity, age_range: val } as Character['visual_identity'] })}
              >
                <SelectTrigger className="pl-10">
                  <SelectValue placeholder="Select cycle" />
                </SelectTrigger>
                <SelectContent className="bg-[#050b10] border-primary/30">
                  {AGE_RANGES.map((range) => (
                    <SelectItem key={range} value={range} className="focus:bg-primary/20 focus:text-primary">
                      <span className="uppercase tracking-widest text-[10px] font-black font-mono">{range}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </FormField>

          <FormField
            label="Gender Matrix"
            name="gender"
            required
            error={validationErrors.gender?.[0]}
            helpText="Internal and external identity alignment"
          >
            <Select
              value={GENDER_OPTIONS.includes(formData.visual_identity?.gender as any) ? formData.visual_identity?.gender || '' : formData.visual_identity?.gender ? 'Other' : ''}
              onValueChange={(val) => updateFormData({ visual_identity: { ...formData.visual_identity, gender: val } as Character['visual_identity'] })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent className="bg-[#050b10] border-primary/30">
                {GENDER_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option} className="focus:bg-primary/20 focus:text-primary">
                    <span className="uppercase tracking-widest text-[10px] font-black font-mono">{option}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formData.visual_identity?.gender && !['Male', 'Female', 'Non-binary'].includes(formData.visual_identity.gender) && (
              <Input
                value={formData.visual_identity.gender === 'Other' ? '' : formData.visual_identity.gender}
                onChange={(e) => updateFormData({ visual_identity: { ...formData.visual_identity, gender: e.target.value || 'Other' } as Character['visual_identity'] })}
                placeholder="SPECIFY_CUSTOM_MATRIX..."
                className="mt-3"
              />
            )}
          </FormField>
        </div>

        {/* Narrative Layers */}
        <div className="space-y-8">
          <FormField
            label="Causal Trajectory"
            name="narrative_function"
            helpText="Define the entity's primary influence on the causal timeline"
          >
            <Textarea
              value={formData.role?.narrative_function || ''}
              onChange={(e) => updateFormData({ role: { ...formData.role, narrative_function: e.target.value } as Character['role'] })}
              placeholder="Identify the strategic narrative purpose..."
              rows={3}
            />
          </FormField>

          <FormField
            label="Developmental Protocol"
            name="character_arc"
            helpText="The projected evolution of this entity's consciousness"
          >
            <Textarea
              value={formData.role?.character_arc || ''}
              onChange={(e) => updateFormData({ role: { ...formData.role, character_arc: e.target.value } as Character['role'] })}
              placeholder="Map the transformation of the neuro-matrix..."
              rows={3}
            />
          </FormField>
        </div>
      </div>
    </WizardFormLayout>
  );
}
