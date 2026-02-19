import React, { useState } from 'react';
import { useWizard } from '@/contexts/WizardContext';
import { WizardFormLayout, FormField } from '../WizardFormLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, X, History, Calendar, Briefcase, GraduationCap, Users, Flag, Terminal, Microscope, Activity } from 'lucide-react';
import { useLLMGeneration } from '@/hooks/useLLMGeneration';
import { LLMErrorDisplay, LLMLoadingState } from '../LLMErrorDisplay';
import { ServiceWarning, useServiceStatus } from '@/components/ui/service-warning';
import { useAppStore } from '@/stores/useAppStore';
import type { Character } from '@/types/character';
import type { World } from '@/types/world';
import type { StoryContext } from './CharacterWizard';

// ============================================================================
// Step 4: Chronological Data (Background)
// ============================================================================

interface Step4BackgroundProps {
  worldContext?: World;
  storyContext?: StoryContext;
}

export function Step4Background({ worldContext }: Step4BackgroundProps) {
  const { formData, updateFormData } = useWizard<Character>();
  const [newEvent, setNewEvent] = useState('');
  const setShowLLMSettings = useAppStore((state) => state.setShowLLMSettings);

  // Check if LLM service is configured
  const { llmConfigured, llmChecking } = useServiceStatus();

  // LLM generation for background suggestions
  const {
    generate,
    isLoading,
    error: llmError,
    clearError,
  } = useLLMGeneration({
    onSuccess: (response) => {
      const background = parseLLMBackground(response.content);
      if (background) {
        updateFormData({
          background: {
            ...(formData.background || {}),
            ...background,
          } as Character['background'],
        });
      }
    },
  });

  const handleGenerateBackground = async () => {
    clearError();

    const context = {
      characterName: formData.name || 'the character',
      archetype: formData.role?.archetype || 'character',
      ageRange: formData.visual_identity?.age_range || 'adult',
      personality: formData.personality,
      worldGenre: worldContext?.genre?.join(', ') || 'fantasy',
      worldTone: worldContext?.tone?.join(', ') || 'dramatic',
      worldTimePeriod: worldContext?.timePeriod || 'medieval',
    };

    const systemPrompt = 'You are a character backstory specialist. Create detailed, believable backgrounds.';

    const prompt = `Generate a detailed background (Chronological Data) for an entity:
- Name: ${context.characterName}
- Archetype: ${context.archetype}
- Maturity: ${context.ageRange}
- Traits: ${context.personality?.traits?.join(', ') || 'unspecified'}
- Genre: ${context.worldGenre}
- Tone: ${context.worldTone}

Format as JSON with keys: origin (string), occupation (string), education (string), family (string), significant_events (array of strings), current_situation (string)`;

    await generate({
      prompt,
      systemPrompt,
      temperature: 0.8,
      maxTokens: 1200,
    });
  };

  const parseLLMBackground = (response: string): Partial<Character['background']> | null => {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const result: Partial<Character['background']> = {};
        if (parsed.origin) result.origin = parsed.origin;
        if (parsed.occupation) result.occupation = parsed.occupation;
        if (parsed.education) result.education = parsed.education;
        if (parsed.family) result.family = parsed.family;
        if (Array.isArray(parsed.significant_events) || Array.isArray(parsed.significantEvents)) {
          result.significant_events = parsed.significant_events || parsed.significantEvents;
        }
        if (parsed.current_situation || parsed.currentSituation) {
          result.current_situation = parsed.current_situation || parsed.currentSituation;
        }
        return result;
      }
    } catch (error) {
      console.error('Failed to parse LLM response:', error);
    }
    return null;
  };

  const handleAddEvent = () => {
    if (newEvent.trim()) {
      const events = formData.background?.significant_events || [];
      updateBackground({ significant_events: [...events, newEvent.trim()] });
      setNewEvent('');
    }
  };

  const handleRemoveEvent = (index: number) => {
    const events = formData.background?.significant_events || [];
    updateBackground({ significant_events: events.filter((_, i) => i !== index) });
  };

  const updateBackground = (updates: Partial<Character['background']>) => {
    updateFormData({
      background: {
        ...(formData.background || {}),
        ...updates,
      } as Character['background']
    });
  };

  return (
    <WizardFormLayout
      title="Chronological Data"
      description="Access and reconstruct the historical datasets and causal events of the entity"
    >
      {/* AI Assistance Section */}
      <div className="space-y-4 mb-8 p-4 rounded-lg border border-primary/20 bg-primary/5 backdrop-blur-sm shadow-[inset_0_0_10px_rgba(var(--primary-rgb),0.05)]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-primary neon-text uppercase tracking-widest text-[10px] font-mono mb-1">// Timeline Synthesizer</h3>
            <p className="text-[10px] text-primary/60 uppercase tracking-wider">
              Reconstruct the entity's chronological trajectory from heuristic datasets
            </p>
          </div>
          <Button
            onClick={handleGenerateBackground}
            disabled={isLoading || llmChecking || !formData.personality?.traits?.length || !llmConfigured}
            className="gap-2 btn-neon bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
            size="sm"
          >
            <Microscope className="h-3.5 w-3.5" />
            <span className="text-[10px] font-black uppercase tracking-widest">Synthesize Timeline</span>
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
          <LLMLoadingState message="Accessing chronological archives..." showProgress />
        )}

        {llmError && (
          <LLMErrorDisplay
            error={llmError}
            onRetry={handleGenerateBackground}
            onDismiss={clearError}
          />
        )}
      </div>

      <div className="space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <FormField label="Causal Inception (Origin)" name="origin">
            <div className="relative group">
              <History className="absolute left-3 top-3 h-5 w-5 text-primary/40 group-focus-within:text-primary transition-colors" />
              <Textarea
                value={formData.background?.origin || ''}
                onChange={(e) => updateBackground({ origin: e.target.value })}
                placeholder="Define the causal origins and developmental environments..."
                rows={4}
                className="pl-10 bg-primary/5 border-primary/20"
              />
            </div>
          </FormField>

          <FormField label="Lineage Matrix (Family)" name="family">
            <div className="relative group">
              <Users className="absolute left-3 top-3 h-5 w-5 text-primary/40 group-focus-within:text-primary transition-colors" />
              <Textarea
                value={formData.background?.family || ''}
                onChange={(e) => updateBackground({ family: e.target.value })}
                placeholder="Map the interpersonal lineage and primary connections..."
                rows={4}
                className="pl-10 bg-primary/5 border-primary/20"
              />
            </div>
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <FormField label="Functional Designation (Occupation)" name="occupation">
            <div className="relative group">
              <Briefcase className="absolute left-3 top-3 h-5 w-5 text-primary/40 group-focus-within:text-primary transition-colors" />
              <Textarea
                value={formData.background?.occupation || ''}
                onChange={(e) => updateBackground({ occupation: e.target.value })}
                placeholder="Specify functional roles and developed skillsets..."
                rows={3}
                className="pl-10 bg-primary/5 border-primary/20"
              />
            </div>
          </FormField>

          <FormField label="Acquisition Profile (Education)" name="education">
            <div className="relative group">
              <GraduationCap className="absolute left-3 top-3 h-5 w-5 text-primary/40 group-focus-within:text-primary transition-colors" />
              <Textarea
                value={formData.background?.education || ''}
                onChange={(e) => updateBackground({ education: e.target.value })}
                placeholder="Reconstruct the knowledge acquisition trajectory..."
                rows={3}
                className="pl-10 bg-primary/5 border-primary/20"
              />
            </div>
          </FormField>
        </div>

        {/* Critical Iterations (Significant Events) */}
        <div className="space-y-4 p-4 border border-primary/20 bg-primary/5">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-4 w-4 text-primary" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Critical Iterations (Significant Events)</span>
          </div>

          <div className="flex gap-2">
            <Input
              value={newEvent}
              onChange={(e) => setNewEvent(e.target.value)}
              placeholder="Record critical event..."
              onKeyPress={(e) => e.key === 'Enter' && handleAddEvent()}
              className="bg-primary/5 border-primary/20"
            />
            <Button onClick={handleAddEvent} className="btn-neon bg-primary/20 text-primary border-primary/20 px-4">
              <span className="text-[10px] font-black uppercase tracking-widest">Inject Moment</span>
            </Button>
          </div>

          <div className="space-y-2">
            {formData.background?.significant_events?.map((event, index) => (
              <div key={index} className="flex items-start gap-3 p-3 border border-primary/10 bg-primary/5 group">
                <Terminal className="h-4 w-4 text-primary/40 mt-0.5" />
                <span className="flex-1 text-[11px] font-mono text-primary/80">{event}</span>
                <button
                  onClick={() => handleRemoveEvent(index)}
                  className="text-primary/20 hover:text-red-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            {(!formData.background?.significant_events || formData.background.significant_events.length === 0) && (
              <p className="text-[10px] text-primary/30 uppercase tracking-widest font-mono italic p-2 border border-dashed border-primary/10">No iterations recorded</p>
            )}
          </div>
        </div>

        <FormField label="Active Parameters (Current Situation)" name="current_situation">
          <div className="relative group">
            <Flag className="absolute left-3 top-3 h-5 w-5 text-primary/40 group-focus-within:text-primary transition-colors" />
            <Textarea
              value={formData.background?.current_situation || ''}
              onChange={(e) => updateBackground({ current_situation: e.target.value })}
              placeholder="Describe the active state and immediate contextual factors..."
              rows={4}
              className="pl-10 bg-primary/5 border-primary/20"
            />
          </div>
        </FormField>
      </div>
    </WizardFormLayout>
  );
}
