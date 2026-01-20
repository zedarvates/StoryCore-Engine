import React from 'react';
import { useWizard } from '@/contexts/WizardContext';
import { WizardFormLayout } from '../WizardFormLayout';
import { ValidationErrorSummary } from '../ValidationErrorSummary';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles } from 'lucide-react';
import { useLLMGeneration } from '@/hooks/useLLMGeneration';
import { LLMErrorDisplay, LLMLoadingState } from '../LLMErrorDisplay';
import { ServiceWarning, useServiceStatus } from '@/components/ui/service-warning';
import { useAppStore } from '@/stores/useAppStore';
import type { Character } from '@/types/character';
import type { World } from '@/types/world';

// ============================================================================
// Step 1: Basic Identity
// ============================================================================

interface Step1BasicIdentityProps {
  worldContext?: World;
}

const ARCHETYPES = [
  'Protagonist',
  'Antagonist',
  'Mentor',
  'Sidekick',
  'Love Interest',
  'Trickster',
  'Guardian',
  'Herald',
  'Shapeshifter',
  'Shadow',
  'Ally',
  'Threshold Guardian',
];

const AGE_RANGES = [
  'Child (0-12)',
  'Teenager (13-19)',
  'Young Adult (20-29)',
  'Adult (30-49)',
  'Middle-Aged (50-64)',
  'Senior (65+)',
  'Ageless/Unknown',
];

export function Step1BasicIdentity({ worldContext }: Step1BasicIdentityProps) {
  const { formData, updateFormData, validationErrors } = useWizard<Character>();
  const { llmConfigured } = useServiceStatus();
  const setShowLLMSettings = useAppStore((state) => state.setShowLLMSettings);

  // LLM generation for name suggestions
  const {
    generate,
    isLoading,
    error: llmError,
    clearError,
  } = useLLMGeneration({
    onSuccess: (response) => {
      // Parse LLM response and extract name suggestions
      const names = parseLLMNames(response.content);
      if (names.length > 0) {
        // Use the first suggested name
        updateFormData({ name: names[0] });
      }
    },
  });

  const handleGenerateName = async (random: boolean = false) => {
    clearError();

    const context = {
      archetype: formData.role?.archetype || 'character',
      ageRange: formData.visual_identity?.age_range || 'adult',
      worldName: worldContext?.name || 'the world',
      worldGenre: worldContext?.genre?.join(', ') || 'fantasy',
      worldTimePeriod: worldContext?.timePeriod || 'medieval',
    };

    const systemPrompt = 'You are a creative character naming assistant. Generate names that fit the character\'s role, world setting, and cultural context.';

    const prompt = `Generate 3 fitting character names for:
- Archetype: ${context.archetype}
- Age Range: ${context.ageRange}
- World: ${context.worldName}
- Genre: ${context.worldGenre}
- Time Period: ${context.worldTimePeriod}

Provide names that:
1. Fit the genre and time period
2. Match the character's archetype
3. Are memorable and pronounceable
4. Feel authentic to the world setting

Format as a JSON array of strings: ["Name1", "Name2", "Name3"]

Example: ["Aria Stormwind", "Marcus Ironheart", "Zara Nightshade"]`;

    await generate({
      prompt,
      systemPrompt,
      temperature: random ? 0.9 : 0.7, // Higher temperature for random, lower for intelligent
      maxTokens: 200,
    });
  };

  const parseLLMNames = (response: string): string[] => {
    try {
      // Try to extract JSON array from response
      const jsonMatch = response.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed)) {
          return parsed.filter((name) => typeof name === 'string' && name.trim());
        }
      }
      
      // Fallback: try to extract names from text
      const lines = response.split('\n').filter((line) => line.trim());
      const names = lines
        .map((line) => {
          // Remove numbering, quotes, and extra whitespace
          return line.replace(/^\d+\.\s*/, '').replace(/["']/g, '').trim();
        })
        .filter((name) => name.length > 0 && name.length < 50);
      
      return names.slice(0, 3);
    } catch (error) {
      console.error('Failed to parse LLM response:', error);
    }
    return [];
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateFormData({ name: e.target.value });
  };

  const handleArchetypeChange = (value: string) => {
    updateFormData({
      role: {
        ...(formData.role || {}),
        archetype: value,
      } as Character['role'],
    });
  };

  const handleAgeRangeChange = (value: string) => {
    updateFormData({
      visual_identity: {
        ...(formData.visual_identity || {}),
        age_range: value,
      } as Character['visual_identity'],
    });
  };

  const handleNarrativeFunctionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateFormData({
      role: {
        ...(formData.role || {}),
        narrative_function: e.target.value,
      } as Character['role'],
    });
  };

  const handleCharacterArcChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateFormData({
      role: {
        ...(formData.role || {}),
        character_arc: e.target.value,
      } as Character['role'],
    });
  };

  return (
    <WizardFormLayout
      title="Basic Identity"
      description="Define the fundamental aspects of your character"
    >
      {/* Validation Error Summary */}
      <ValidationErrorSummary errors={validationErrors} className="mb-6" />

      <div className="space-y-6">
        {/* Character Name with LLM Generation */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="character-name" className="required">
              Character Name <span className="text-red-600">*</span>
            </Label>
            <div className="flex gap-2">
              <Button
                onClick={() => handleGenerateName(false)}
                disabled={isLoading || !formData.role?.archetype || !llmConfigured}
                variant="ghost"
                size="sm"
                className="gap-2 h-8"
              >
                <Sparkles className="h-3 w-3" />
                {isLoading ? 'Generating...' : 'Intelligent'}
              </Button>
              <Button
                onClick={() => handleGenerateName(true)}
                disabled={isLoading || !formData.role?.archetype || !llmConfigured}
                variant="ghost"
                size="sm"
                className="gap-2 h-8"
              >
                <Sparkles className="h-3 w-3" />
                {isLoading ? 'Generating...' : 'Random'}
              </Button>
            </div>
          </div>
          
          {/* Service Warning */}
          {!llmConfigured && (
            <ServiceWarning
              service="llm"
              variant="inline"
              onConfigure={() => setShowLLMSettings(true)}
            />
          )}
          
          {/* Loading State */}
          {isLoading && (
            <LLMLoadingState message="Generating name suggestions..." />
          )}

          {/* Error Display */}
          {llmError && (
            <LLMErrorDisplay
              error={llmError}
              onRetry={handleGenerateName}
              onDismiss={clearError}
            />
          )}

          <Input
            id="character-name"
            value={formData.name || ''}
            onChange={handleNameChange}
            placeholder="Enter character name"
            aria-required="true"
            aria-invalid={!!validationErrors.name}
            aria-describedby={validationErrors.name ? 'name-error' : undefined}
            className={validationErrors.name ? 'border-red-500 focus:ring-red-500' : ''}
          />
          {validationErrors.name && (
            <p id="name-error" className="text-sm text-destructive" role="alert">
              {validationErrors.name[0]}
            </p>
          )}
          {worldContext && (
            <p className="text-sm text-muted-foreground">
              Creating character for world: <strong>{worldContext.name}</strong>
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            Tip: Select an archetype first to get better name suggestions
          </p>
        </div>

        {/* Archetype */}
        <div className="space-y-2">
          <Label htmlFor="archetype" className="required">
            Character Archetype <span className="text-red-600">*</span>
          </Label>
          <Select
            value={formData.role?.archetype || ''}
            onValueChange={handleArchetypeChange}
          >
            <SelectTrigger
              id="archetype"
              aria-required="true"
              aria-invalid={!!validationErrors.archetype}
              aria-describedby={validationErrors.archetype ? 'archetype-error' : undefined}
            >
              <SelectValue placeholder="Select an archetype" />
            </SelectTrigger>
            <SelectContent>
              {ARCHETYPES.map((archetype) => (
                <SelectItem key={archetype} value={archetype}>
                  {archetype}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {validationErrors.archetype && (
            <p id="archetype-error" className="text-sm text-destructive" role="alert">
              {validationErrors.archetype[0]}
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            The character's primary role in the story
          </p>
        </div>

        {/* Age Range */}
        <div className="space-y-2">
          <Label htmlFor="age-range" className="required">
            Age Range <span className="text-red-600">*</span>
          </Label>
          <Select
            value={formData.visual_identity?.age_range || ''}
            onValueChange={handleAgeRangeChange}
          >
            <SelectTrigger
              id="age-range"
              aria-required="true"
              aria-invalid={!!validationErrors.age_range}
              aria-describedby={validationErrors.age_range ? 'age-range-error' : undefined}
            >
              <SelectValue placeholder="Select age range" />
            </SelectTrigger>
            <SelectContent>
              {AGE_RANGES.map((range) => (
                <SelectItem key={range} value={range}>
                  {range}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {validationErrors.age_range && (
            <p id="age-range-error" className="text-sm text-destructive" role="alert">
              {validationErrors.age_range[0]}
            </p>
          )}
        </div>

        {/* Narrative Function */}
        <div className="space-y-2">
          <Label htmlFor="narrative-function">
            Narrative Function
            <span className="text-muted-foreground ml-1">(Optional)</span>
          </Label>
          <Textarea
            id="narrative-function"
            value={formData.role?.narrative_function || ''}
            onChange={handleNarrativeFunctionChange}
            placeholder="What purpose does this character serve in the story?"
            rows={3}
            aria-describedby="narrative-function-help"
          />
          <p id="narrative-function-help" className="text-sm text-muted-foreground">
            Example: "Provides comic relief and helps the protagonist see different perspectives"
          </p>
        </div>

        {/* Character Arc */}
        <div className="space-y-2">
          <Label htmlFor="character-arc">
            Character Arc
            <span className="text-muted-foreground ml-1">(Optional)</span>
          </Label>
          <Textarea
            id="character-arc"
            value={formData.role?.character_arc || ''}
            onChange={handleCharacterArcChange}
            placeholder="How does this character change throughout the story?"
            rows={3}
            aria-describedby="character-arc-help"
          />
          <p id="character-arc-help" className="text-sm text-muted-foreground">
            Example: "Starts as a cynical loner, learns to trust others, becomes a team leader"
          </p>
        </div>
      </div>
    </WizardFormLayout>
  );
}
