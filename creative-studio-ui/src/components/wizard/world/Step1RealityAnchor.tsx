import React, { useState } from 'react';
import { Sparkles, Globe, Compass, Activity, Binary, Zap, Terminal } from 'lucide-react';
import { useWizard } from '@/contexts/WizardContext';
import type { World } from '@/types/world';
import { GENRE_OPTIONS, TONE_OPTIONS } from '@/types/world';
import { WizardFormLayout, FormField } from '../WizardFormLayout';
import { ValidationErrorSummary } from '../ValidationErrorSummary';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useLLMGeneration } from '@/hooks/useLLMGeneration';
import { LLMErrorDisplay, LLMLoadingState } from '../LLMErrorDisplay';
import { ServiceWarning, useServiceStatus } from '@/components/ui/service-warning';
import { useAppStore } from '@/stores/useAppStore';
import { cn } from '@/lib/utils';

// Helper function to get option label safely
const getOptionLabel = (option: any) => option?.label || option?.value || '';

// ============================================================================
// Step 1: Reality Anchor (Basic Information)
// ============================================================================

export function Step1RealityAnchor() {
  const { formData, updateFormData, validationErrors } = useWizard<World>();
  const { llmConfigured, llmChecking } = useServiceStatus();
  const setShowLLMSettings = useAppStore((state) => state.setShowLLMSettings);
  const [showDescription, setShowDescription] = useState(false);

  const {
    generate,
    isLoading,
    error: llmError,
    clearError,
  } = useLLMGeneration({
    onSuccess: (response) => {
      const suggestions = parseLLMSuggestions(response.content);
      if (suggestions.name) {
        updateFormData({
          name: suggestions.name,
          atmosphere: suggestions.description || formData.atmosphere,
          visualIntent: suggestions.visual ? {
            colors: suggestions.visual.colors || [],
            style: suggestions.visual.style || '',
            vibe: suggestions.visual.vibe || ''
          } : formData.visualIntent
        });
        if (suggestions.description) {
          setShowDescription(true);
        }
      }
    },
  });

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateFormData({ name: e.target.value });
  };

  const handleTimePeriodChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateFormData({ timePeriod: e.target.value });
  };

  const handleGenreToggle = (genreValue: string) => {
    const currentGenres = formData.genre || [];
    const newGenres = currentGenres.includes(genreValue)
      ? currentGenres.filter((g) => g !== genreValue)
      : [...currentGenres, genreValue];
    updateFormData({ genre: newGenres });
  };

  const handleToneToggle = (toneValue: string) => {
    const currentTones = formData.tone || [];
    const newTones = currentTones.includes(toneValue)
      ? currentTones.filter((t) => t !== toneValue)
      : [...currentTones, toneValue];
    updateFormData({ tone: newTones });
  };

  // ============================================================================
  // LLM Generation
  // ============================================================================

  const handleGenerateSuggestions = async () => {
    clearError();

    if (!formData.genre?.length || !formData.tone?.length) {
      console.warn('Cannot generate suggestions: Genre and tone required');
      return;
    }

    const systemPrompt = "You are a Neural Reality Synthesizer. Your protocol is to instantiate high-fidelity ontological designations and atmospheric telemetry for newly manifested realities. Use technical, evocative language that aligns with a cyber-neon aesthetic.";

    const prompt = `Generate a creative world name, brief description, and artistic direction for a story world with these characteristics:
- Causal Frameworks (Genre): ${formData.genre.join(', ')}
- Experiential Parameters (Tone): ${formData.tone.join(', ')}
- Temporal Coordinates (Time Period): ${formData.timePeriod || 'unspecified'}

Provide:
1. A memorable reality designation
2. A brief atmospheric telemetry log
3. Visual Manufacturing Parameters: 
   - A 3-color palette (hex codes)
   - A primary artistic style/signature (e.g. "Graphic Novel", "Sci-Fi Realism")
   - 4 key visual vibe keywords (comma separated)

Format as JSON:
{
  "name": "THE_CRYSTAL_WASTES",
  "description": "A harsh desert sector where ancient crystalline protocols pierce the endless dunes...",
  "visual": {
    "colors": ["#E0F7FA", "#4DD0E1", "#006064"],
    "style": "Sci-Fi Realism",
    "vibe": "crystalline, harsh, ancient, serene"
  }
}`;

    await generate({
      prompt,
      systemPrompt,
      temperature: 0.8,
      maxTokens: 500,
    });
  };

  const parseLLMSuggestions = (response: string): { name?: string; description?: string; visual?: any } => {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            name: parsed.name || '',
            description: parsed.description || parsed.atmosphere || '',
            visual: parsed.visual || null
          };
        } catch {
          console.warn('JSON parsing failed, trying text parsing');
        }
      }

      // Fallback: Parse as structured text
      const result: { name?: string; description?: string } = {};
      const lines = response.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (/name:/i.test(trimmed)) {
          result.name = trimmed.replace(/name:\s*/i, '').replace(/["']/g, '').trim();
        } else if (/description:|atmosphere:/i.test(trimmed)) {
          result.description = trimmed.replace(/(description|atmosphere):\s*/i, '').trim();
        }
      }

      return result;
    } catch (error) {
      console.error('Failed to parse suggestions:', error);
      return {};
    }
  };

  return (
    <WizardFormLayout
      title="Reality Anchor"
      description="Define the core identity and ontological parameters of the current reality manifest"
    >
      <ValidationErrorSummary errors={validationErrors} className="mb-6" />

      {/* AI Assistance Section */}
      <div className="space-y-4 mb-8 p-4 rounded-none border border-primary/20 bg-primary/5 backdrop-blur-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-1 opacity-20">
          <Terminal className="w-8 h-8 text-primary" />
        </div>
        <div className="flex items-center justify-between relative z-10">
          <div>
            <h3 className="text-base font-bold text-primary neon-text uppercase tracking-widest text-[10px] font-mono mb-1">// Neural Reality Synthesizer</h3>
            <p className="text-[10px] text-primary/60 uppercase tracking-wider">
              Access the collective unconscious to instantiate evocative designations
            </p>
          </div>
          <Button
            onClick={handleGenerateSuggestions}
            disabled={isLoading || !formData.genre?.length || !formData.tone?.length || !llmConfigured}
            className="gap-2 btn-neon bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
            size="sm"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span className="text-[10px] font-black uppercase tracking-widest">{isLoading ? 'Initializing...' : 'Run Synthesis'}</span>
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
          <LLMLoadingState message="Extracting ontological patterns..." />
        )}

        {llmError && (
          <LLMErrorDisplay
            error={llmError}
            onRetry={handleGenerateSuggestions}
            onDismiss={() => clearError?.()}
          />
        )}
      </div>

      <div className="space-y-12">
        {/* World Identity Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 bg-primary/5 border border-primary/10 rounded-none relative overflow-hidden">
          <div className="absolute inset-x-0 h-px bg-primary/20 top-0 animate-scan" />

          <FormField
            label="Reality Designation"
            name="name"
            required
            helpText="The primary systemic identifier for this manifested reality"
          >
            <div className="relative group">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/40 group-focus-within:text-primary transition-colors" />
              <Input
                id="name"
                value={formData.name || ''}
                onChange={handleNameChange}
                placeholder="e.g., NEO_VERIDIA_PRIME"
                className="pl-10"
              />
            </div>
          </FormField>

          <FormField
            label="Temporal Coordinates"
            name="timePeriod"
            required
            helpText="Chronological placement within the primary timeline"
          >
            <div className="relative group">
              <Compass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/40 group-focus-within:text-primary transition-colors" />
              <Input
                id="timePeriod"
                value={formData.timePeriod || ''}
                onChange={handleTimePeriodChange}
                placeholder="e.g., ITERATION_4.08_POST-SHIFT"
                className="pl-10"
              />
            </div>
          </FormField>
        </div>

        {/* Categorization Section */}
        <div className="space-y-8">
          <FormField
            label="Causal Frameworks"
            name="genre"
            required
            helpText="Fundamental systemic archetypes defining the world (Multi-selection active)"
          >
            <div className="flex items-center gap-2 mb-4 text-primary/40">
              <Binary className="h-3.5 w-3.5" />
              <span className="text-[9px] uppercase tracking-widest font-black font-mono">Structural Logic Matrix</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {GENRE_OPTIONS.map((genre) => (
                <div
                  key={genre.value}
                  className={cn(
                    "flex items-center space-x-2 p-3 border transition-all duration-300 cursor-pointer group",
                    formData.genre?.includes(genre.value)
                      ? "bg-primary text-black border-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]"
                      : "bg-primary/5 border-primary/20 hover:border-primary/40"
                  )}
                  onClick={() => handleGenreToggle(genre.value)}
                >
                  <Checkbox
                    id={`genre-${genre.value}`}
                    checked={formData.genre?.includes(genre.value)}
                    onCheckedChange={() => handleGenreToggle(genre.value)}
                    className={cn(
                      "data-[state=checked]:bg-black data-[state=checked]:border-black",
                      formData.genre?.includes(genre.value) ? "border-black" : "border-primary/40"
                    )}
                  />
                  <Label
                    htmlFor={`genre-${genre.value}`}
                    className={cn(
                      "text-[10px] font-black uppercase tracking-widest cursor-pointer font-mono group-hover:text-primary transition-colors",
                      formData.genre?.includes(genre.value) ? "text-black group-hover:text-black" : "text-primary/60"
                    )}
                  >
                    {genre.label}
                  </Label>
                </div>
              ))}
            </div>
          </FormField>

          <FormField
            label="Experiential Parameters"
            name="tone"
            required
            helpText="Aesthetic and emotional frequency of the reality manifest"
          >
            <div className="flex items-center gap-2 mb-4 text-primary/40">
              <Activity className="h-3.5 w-3.5" />
              <span className="text-[9px] uppercase tracking-widest font-black font-mono">Affective Frequency Profiling</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {TONE_OPTIONS.map((tone) => (
                <div
                  key={tone.value}
                  className={cn(
                    "flex items-center space-x-2 p-3 border transition-all duration-300 cursor-pointer group",
                    formData.tone?.includes(tone.value)
                      ? "bg-primary text-black border-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]"
                      : "bg-primary/5 border-primary/20 hover:border-primary/40"
                  )}
                  onClick={() => handleToneToggle(tone.value)}
                >
                  <Checkbox
                    id={`tone-${tone.value}`}
                    checked={formData.tone?.includes(tone.value)}
                    onCheckedChange={() => handleToneToggle(tone.value)}
                    className={cn(
                      "data-[state=checked]:bg-black data-[state=checked]:border-black",
                      formData.tone?.includes(tone.value) ? "border-black" : "border-primary/40"
                    )}
                  />
                  <Label
                    htmlFor={`tone-${tone.value}`}
                    className={cn(
                      "text-[10px] font-black uppercase tracking-widest cursor-pointer font-mono group-hover:text-primary transition-colors",
                      formData.tone?.includes(tone.value) ? "text-black group-hover:text-black" : "text-primary/60"
                    )}
                  >
                    {tone.label}
                  </Label>
                </div>
              ))}
            </div>
          </FormField>
        </div>

        {/* Sensory Overview Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-primary/10 pb-2">
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-primary" />
              <h3 className="text-[11px] font-black text-primary/80 uppercase tracking-[0.2em] font-mono">Sensory Overview Protocol</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDescription(!showDescription)}
              className="text-[9px] font-black uppercase tracking-widest text-primary hover:bg-primary/10"
            >
              {showDescription ? '[ Close ]' : '[ Access ]'}
            </Button>
          </div>

          {showDescription && (
            <div className="space-y-6">
              <FormField
                label="Atmospheric Telemetry"
                name="atmosphere"
                helpText="Describe the initial environmental conditions and aesthetic profile"
              >
                <Textarea
                  id="atmosphere"
                  value={formData.atmosphere || ''}
                  onChange={(e) => updateFormData({ atmosphere: e.target.value })}
                  placeholder="Log the aesthetic and emotional profile of this reality iteration..."
                  rows={4}
                  className="bg-primary/5 border-primary/20 focus:border-primary/50 min-h-[120px] font-mono text-xs"
                />
              </FormField>

              {/* Artistic Direction Subsection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border border-primary/10 bg-primary/5">
                <div className="col-span-full mb-2">
                  <h4 className="text-[10px] font-black text-primary/60 uppercase tracking-widest font-mono">// Visual Manufacturing Parameters</h4>
                </div>

                <FormField
                  label="Primary Color Slate"
                  name="visualIntent.colors"
                  helpText="Hex codes or color names defining the world palette"
                >
                  <Input
                    value={formData.visualIntent?.colors?.join(', ') || ''}
                    onChange={(e) => updateFormData({
                      visualIntent: {
                        ...(formData.visualIntent || { vibe: '', style: '' }),
                        colors: e.target.value.split(',').map(c => c.trim())
                      }
                    })}
                    placeholder="#RRBBGG, #00FF00..."
                    className="font-mono text-[10px]"
                  />
                </FormField>

                <FormField
                  label="Artistic Signature"
                  name="visualIntent.style"
                  helpText="The intended visual style (Graphic Novel, Realism, etc.)"
                >
                  <Input
                    value={formData.visualIntent?.style || ''}
                    onChange={(e) => updateFormData({
                      visualIntent: {
                        ...(formData.visualIntent || { colors: [], vibe: '' }),
                        style: e.target.value
                      }
                    })}
                    placeholder="e.g., GRAPHIC_NOVEL_FRANK_MILLER"
                    className="font-mono text-[10px]"
                  />
                </FormField>

                <div className="col-span-full">
                  <FormField
                    label="Visual Vibe Matrix"
                    name="visualIntent.vibe"
                    helpText="Key aesthetic descriptors (keywords)"
                  >
                    <Input
                      value={formData.visualIntent?.vibe || ''}
                      onChange={(e) => updateFormData({
                        visualIntent: {
                          ...(formData.visualIntent || { colors: [], style: '' }),
                          vibe: e.target.value
                        }
                      })}
                      placeholder="e.g., GRIMY, NEON, OVERGROWN, DECAYING"
                      className="font-mono text-[10px]"
                    />
                  </FormField>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </WizardFormLayout>
  );
}
