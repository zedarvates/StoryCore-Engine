import React, { useState } from 'react';
import { Plus, X, Sparkles } from 'lucide-react';
import { useWizard } from '@/contexts/WizardContext';
import type { World } from '@/types/world';
import { WizardFormLayout, FormField, FormSection } from '../WizardFormLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useLLMGeneration } from '@/hooks/useLLMGeneration';
import { LLMErrorDisplay, LLMLoadingState } from '../LLMErrorDisplay';
import { ServiceWarning, useServiceStatus } from '@/components/ui/service-warning';
import { useAppStore } from '@/stores/useAppStore';

// ============================================================================
// Cultural Elements Type
// ============================================================================

interface CulturalElements {
  languages: string[];
  religions: string[];
  traditions: string[];
  historicalEvents: string[];
  culturalConflicts: string[];
}

// ============================================================================
// Step 4: Cultural Elements
// ============================================================================

export function Step4CulturalElements() {
  const { formData, updateFormData } = useWizard<World>();
  const { llmConfigured } = useServiceStatus();
  const setShowLLMSettings = useAppStore((state) => state.setShowLLMSettings);
  
  const [languageInput, setLanguageInput] = useState('');
  const [religionInput, setReligionInput] = useState('');
  const [traditionInput, setTraditionInput] = useState('');
  const [historicalEventInput, setHistoricalEventInput] = useState('');
  const [conflictInput, setConflictInput] = useState('');

  const {
    generate,
    isLoading,
    error: llmError,
    clearError,
  } = useLLMGeneration({
    onSuccess: (response) => {
      const generated = parseLLMCulturalElements(response.content);
      updateFormData({
        culturalElements: {
          languages: [...culturalElements.languages, ...generated.languages],
          religions: [...culturalElements.religions, ...generated.religions],
          traditions: [...culturalElements.traditions, ...generated.traditions],
          historicalEvents: [...culturalElements.historicalEvents, ...generated.historicalEvents],
          culturalConflicts: [...culturalElements.culturalConflicts, ...generated.culturalConflicts],
        },
      });
    },
  });

  const culturalElements: CulturalElements = formData.culturalElements || {
    languages: [],
    religions: [],
    traditions: [],
    historicalEvents: [],
    culturalConflicts: [],
  };

  // ============================================================================
  // Array Management Helpers
  // ============================================================================

  const addToArray = (key: keyof CulturalElements, value: string) => {
    if (!value.trim()) return;
    
    const currentArray = culturalElements[key] || [];
    updateFormData({
      culturalElements: {
        ...culturalElements,
        [key]: [...currentArray, value.trim()],
      },
    });
  };

  const removeFromArray = (key: keyof CulturalElements, index: number) => {
    const currentArray = culturalElements[key] || [];
    updateFormData({
      culturalElements: {
        ...culturalElements,
        [key]: currentArray.filter((_, i) => i !== index),
      },
    });
  };

  // ============================================================================
  // Individual Add Handlers
  // ============================================================================

  const handleAddLanguage = () => {
    addToArray('languages', languageInput);
    setLanguageInput('');
  };

  const handleAddReligion = () => {
    addToArray('religions', religionInput);
    setReligionInput('');
  };

  const handleAddTradition = () => {
    addToArray('traditions', traditionInput);
    setTraditionInput('');
  };

  const handleAddHistoricalEvent = () => {
    addToArray('historicalEvents', historicalEventInput);
    setHistoricalEventInput('');
  };

  const handleAddConflict = () => {
    addToArray('culturalConflicts', conflictInput);
    setConflictInput('');
  };

  // ============================================================================
  // Atmosphere Field
  // ============================================================================

  const handleAtmosphereChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateFormData({ atmosphere: e.target.value });
  };

  // ============================================================================
  // LLM Generation
  // ============================================================================

  const handleGenerateCulturalElements = async () => {
    clearError();

    if (!formData.name) {
      console.warn('Cannot generate cultural elements: No world name');
      return;
    }

    const context = {
      worldName: formData.name || 'the world',
      genre: formData.genre || [],
      timePeriod: formData.timePeriod || '',
      tone: formData.tone || [],
    };

    const systemPrompt = 'You are a creative world-building assistant. Generate rich, coherent cultural elements that fit the world\'s genre, time period, and tone.';

    const prompt = `Generate cultural elements for a story world called "${context.worldName}":
- Genre: ${context.genre.join(', ')}
- Time Period: ${context.timePeriod}
- Tone: ${context.tone.join(', ')}

Provide:
1. Languages (2-3 language names with brief descriptions)
2. Religions (2-3 belief systems)
3. Traditions (3-4 cultural practices or customs)
4. Historical Events (3-4 significant events that shaped the world)
5. Cultural Conflicts (2-3 ongoing tensions or disputes)

Format as JSON with arrays: languages, religions, traditions, historicalEvents, culturalConflicts

Example:
{
  "languages": ["Common Tongue - spoken by most citizens", "Ancient Elvish - language of magic"],
  "religions": ["Church of the Light - monotheistic sun worship", "The Old Ways - nature-based polytheism"],
  "traditions": ["Coming of age trials at 16", "Annual harvest festival"],
  "historicalEvents": ["The Great Schism - religious split 200 years ago", "Discovery of magic crystals"],
  "culturalConflicts": ["Tension between magic users and non-magical citizens", "Religious divide between old and new faiths"]
}`;

    try {
      await generate({
        prompt,
        systemPrompt,
        temperature: 0.8,
        maxTokens: 1500,
      });
    } catch (error) {
      console.error('Failed to generate cultural elements:', error);
      // Error will be handled by useLLMGeneration hook
    }
  };

  const parseLLMCulturalElements = (response: string): CulturalElements => {
    try {
      console.log('Parsing LLM cultural elements response:', response);
      
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const elements = {
          languages: parsed.languages || [],
          religions: parsed.religions || [],
          traditions: parsed.traditions || [],
          historicalEvents: parsed.historicalEvents || [],
          culturalConflicts: parsed.culturalConflicts || [],
        };
        
        console.log('Successfully parsed cultural elements:', elements);
        return elements;
      } else {
        console.warn('No JSON object found in response');
      }
    } catch (error) {
      console.error('Failed to parse LLM response:', error);
      console.error('Response was:', response);
    }
    
    console.warn('Could not parse any cultural elements from response');
    return {
      languages: [],
      religions: [],
      traditions: [],
      historicalEvents: [],
      culturalConflicts: [],
    };
  };

  return (
    <WizardFormLayout
      title="Cultural Elements"
      description="Define the cultural richness and history of your world"
    >
      {/* LLM Generation Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">AI-Assisted Generation</h3>
            <p className="text-xs text-gray-500 mt-1">
              Generate cultural elements based on your world
            </p>
          </div>
          <Button
            onClick={handleGenerateCulturalElements}
            disabled={isLoading || !formData.name || !llmConfigured}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            {isLoading ? 'Generating...' : 'Generate Elements'}
          </Button>
        </div>

        {/* Service Warning */}
        {!llmConfigured && (
          <ServiceWarning
            service="llm"
            variant="inline"
            onConfigure={() => setShowLLMSettings(true)}
          />
        )}

        {isLoading && (
          <LLMLoadingState message="Generating cultural elements..." showProgress />
        )}

        {llmError && (
          <LLMErrorDisplay
            error={llmError}
            onRetry={handleGenerateCulturalElements}
            onDismiss={clearError}
          />
        )}
      </div>

      {/* Languages */}
      <FormSection title="Languages">
        <FormField
          label="Languages"
          name="languages"
          helpText="Add languages spoken in your world"
        >
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                value={languageInput}
                onChange={(e) => setLanguageInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddLanguage())}
                placeholder="e.g., Common Tongue, Ancient Elvish"
              />
              <Button onClick={handleAddLanguage} size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {culturalElements.languages.map((lang, index) => (
                <Badge key={index} variant="secondary" className="gap-1">
                  {lang}
                  <button
                    onClick={() => removeFromArray('languages', index)}
                    className="ml-1 hover:text-red-600"
                    aria-label={`Remove ${lang}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        </FormField>
      </FormSection>

      {/* Religions */}
      <FormSection title="Religions & Beliefs">
        <FormField
          label="Religions"
          name="religions"
          helpText="Add belief systems and religions"
        >
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                value={religionInput}
                onChange={(e) => setReligionInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddReligion())}
                placeholder="e.g., Church of the Light, Ancient Spirits"
              />
              <Button onClick={handleAddReligion} size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {culturalElements.religions.map((religion, index) => (
                <Badge key={index} variant="secondary" className="gap-1">
                  {religion}
                  <button
                    onClick={() => removeFromArray('religions', index)}
                    className="ml-1 hover:text-red-600"
                    aria-label={`Remove ${religion}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        </FormField>
      </FormSection>

      {/* Traditions */}
      <FormSection title="Traditions & Customs">
        <FormField
          label="Traditions"
          name="traditions"
          helpText="Add cultural practices and customs"
        >
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                value={traditionInput}
                onChange={(e) => setTraditionInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTradition())}
                placeholder="e.g., Coming of age ceremony, Harvest festival"
              />
              <Button onClick={handleAddTradition} size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {culturalElements.traditions.map((tradition, index) => (
                <Badge key={index} variant="secondary" className="gap-1">
                  {tradition}
                  <button
                    onClick={() => removeFromArray('traditions', index)}
                    className="ml-1 hover:text-red-600"
                    aria-label={`Remove ${tradition}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        </FormField>
      </FormSection>

      {/* Historical Events */}
      <FormSection title="Historical Events">
        <FormField
          label="Significant Events"
          name="historicalEvents"
          helpText="Add major events that shaped your world's history"
        >
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                value={historicalEventInput}
                onChange={(e) => setHistoricalEventInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddHistoricalEvent())}
                placeholder="e.g., The Great War, Discovery of magic"
              />
              <Button onClick={handleAddHistoricalEvent} size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {culturalElements.historicalEvents.map((event, index) => (
                <Badge key={index} variant="secondary" className="gap-1">
                  {event}
                  <button
                    onClick={() => removeFromArray('historicalEvents', index)}
                    className="ml-1 hover:text-red-600"
                    aria-label={`Remove ${event}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        </FormField>
      </FormSection>

      {/* Cultural Conflicts */}
      <FormSection title="Cultural Conflicts">
        <FormField
          label="Ongoing Conflicts"
          name="culturalConflicts"
          helpText="Add tensions or disputes between cultures or groups"
        >
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                value={conflictInput}
                onChange={(e) => setConflictInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddConflict())}
                placeholder="e.g., Mages vs. Technology users"
              />
              <Button onClick={handleAddConflict} size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {culturalElements.culturalConflicts.map((conflict, index) => (
                <Badge key={index} variant="secondary" className="gap-1">
                  {conflict}
                  <button
                    onClick={() => removeFromArray('culturalConflicts', index)}
                    className="ml-1 hover:text-red-600"
                    aria-label={`Remove ${conflict}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        </FormField>
      </FormSection>

      {/* Overall Atmosphere */}
      <FormSection title="Overall Atmosphere">
        <FormField
          label="World Atmosphere"
          name="atmosphere"
          helpText="Describe the overall feeling and mood of your world"
        >
          <Textarea
            id="atmosphere"
            value={formData.atmosphere || ''}
            onChange={handleAtmosphereChange}
            placeholder="e.g., A world on the brink of change, where ancient magic clashes with emerging technology..."
            rows={4}
          />
        </FormField>
      </FormSection>
    </WizardFormLayout>
  );
}
