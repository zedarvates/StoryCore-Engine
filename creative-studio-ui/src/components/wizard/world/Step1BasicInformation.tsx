import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
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

// ============================================================================
// Step 1: Basic Information
// ============================================================================

export function Step1BasicInformation() {
  const { formData, updateFormData, validationErrors } = useWizard<World>();
  const { llmConfigured } = useServiceStatus();
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
          atmosphere: suggestions.description || formData.atmosphere
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

  const handleGenreToggle = (genre: string) => {
    const currentGenres = formData.genre || [];
    const newGenres = currentGenres.includes(genre)
      ? currentGenres.filter((g) => g !== genre)
      : [...currentGenres, genre];
    updateFormData({ genre: newGenres });
  };

  const handleToneToggle = (tone: string) => {
    const currentTones = formData.tone || [];
    const newTones = currentTones.includes(tone)
      ? currentTones.filter((t) => t !== tone)
      : [...currentTones, tone];
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

    const systemPrompt = 'You are a creative world-building assistant. Generate evocative, memorable world names and descriptions that fit the specified genre and tone.';

    const prompt = `Generate a creative world name and brief description for a story world with these characteristics:
- Genre: ${formData.genre.join(', ')}
- Tone: ${formData.tone.join(', ')}
- Time Period: ${formData.timePeriod || 'unspecified'}

Provide:
1. A memorable, evocative world name (2-3 words max)
2. A brief atmospheric description (1-2 sentences)

Format as JSON:
{
  "name": "The Crystal Wastes",
  "description": "A harsh desert world where ancient crystalline structures pierce the endless dunes, remnants of a civilization that mastered both magic and technology before their mysterious fall."
}`;

    try {
      await generate({
        prompt,
        systemPrompt,
        temperature: 0.9,
        maxTokens: 300,
      });
    } catch (error) {
      console.error('Failed to generate suggestions:', error);
    }
  };

  const parseLLMSuggestions = (response: string): { name?: string; description?: string } => {
    try {
      console.log('Parsing LLM suggestions response:', response);
      
      // Try JSON parsing first
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          const result = {
            name: parsed.name || '',
            description: parsed.description || parsed.atmosphere || '',
          };
          
          if (result.name) {
            console.log('Successfully parsed suggestions from JSON:', result);
            return result;
          }
        } catch (jsonError) {
          console.warn('JSON parsing failed, trying text parsing');
        }
      }
      
      // Fallback: Parse as structured text
      console.log('Attempting text-based parsing');
      const result: { name?: string; description?: string } = {};
      const lines = response.split('\n');
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        
        // Look for name
        const nameMatch = trimmed.match(/(?:name|world):\s*(.+)/i);
        if (nameMatch && !result.name) {
          result.name = nameMatch[1].trim().replace(/['"]/g, '');
          continue;
        }
        
        // Look for description
        const descMatch = trimmed.match(/(?:description|atmosphere):\s*(.+)/i);
        if (descMatch && !result.description) {
          result.description = descMatch[1].trim().replace(/['"]/g, '');
          continue;
        }
        
        // If we don't have a name yet and this looks like a title (short, capitalized)
        if (!result.name && trimmed.length > 3 && trimmed.length < 40 && /^[A-Z]/.test(trimmed)) {
          result.name = trimmed.replace(/['"]/g, '');
        }
        // If we have a name but no description, and this is a longer line
        else if (result.name && !result.description && trimmed.length > 30) {
          result.description = trimmed.replace(/['"]/g, '');
        }
      }
      
      if (result.name) {
        console.log('Successfully parsed suggestions from text:', result);
        return result;
      }
      
    } catch (error) {
      console.error('Failed to parse LLM response:', error);
      console.error('Response was:', response);
    }
    
    console.warn('Could not parse any suggestions from response');
    return {};
  };

  const handleAtmosphereChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateFormData({ atmosphere: e.target.value });
  };

  return (
    <WizardFormLayout
      title="Basic Information"
      description="Define the fundamental characteristics of your story world"
    >
      {/* Validation Error Summary */}
      <ValidationErrorSummary errors={validationErrors} className="mb-6" />

      {/* LLM Generation Section */}
      <div className="space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">AI-Assisted Generation</h3>
            <p className="text-xs text-gray-500 mt-1">
              Generate world name and description suggestions
            </p>
          </div>
          <Button
            onClick={handleGenerateSuggestions}
            disabled={isLoading || !formData.genre?.length || !formData.tone?.length || !llmConfigured}
            className="gap-2"
            size="sm"
          >
            <Sparkles className="h-4 w-4" />
            {isLoading ? 'Generating...' : 'Suggest Name'}
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

        {/* Loading State */}
        {isLoading && (
          <LLMLoadingState message="Generating world suggestions..." showProgress />
        )}

        {/* Error Display */}
        {llmError && (
          <LLMErrorDisplay
            error={llmError}
            onRetry={handleGenerateSuggestions}
            onDismiss={clearError}
          />
        )}

        {!formData.genre?.length || !formData.tone?.length ? (
          <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-3 rounded-md">
            💡 Select at least one genre and tone to enable AI suggestions
          </p>
        ) : null}
      </div>

      {/* World Name */}
      <FormField
        label={
          <>
            World Name <span className="text-red-600">*</span>
          </>
        }
        name="name"
        required
        error={validationErrors.name?.[0]}
        helpText="Give your world a memorable name"
      >
        <Input
          id="name"
          value={formData.name || ''}
          onChange={handleNameChange}
          placeholder="e.g., Eldoria, Neo-Tokyo, The Wasteland"
          aria-required="true"
          aria-invalid={!!validationErrors.name}
          aria-describedby={validationErrors.name ? 'name-error' : 'name-help'}
          className={validationErrors.name ? 'border-red-500 focus:ring-red-500' : ''}
        />
      </FormField>

      {/* Time Period */}
      <FormField
        label={
          <>
            Time Period <span className="text-red-600">*</span>
          </>
        }
        name="timePeriod"
        required
        error={validationErrors.timePeriod?.[0]}
        helpText="When does your story take place?"
      >
        <Input
          id="timePeriod"
          value={formData.timePeriod || ''}
          onChange={handleTimePeriodChange}
          placeholder="e.g., Medieval Era, Year 2157, Present Day"
          aria-required="true"
          aria-invalid={!!validationErrors.timePeriod}
          aria-describedby={validationErrors.timePeriod ? 'timePeriod-error' : 'timePeriod-help'}
          className={validationErrors.timePeriod ? 'border-red-500 focus:ring-red-500' : ''}
        />
      </FormField>

      {/* Genre Selection */}
      <FormField
        label={
          <>
            Genre <span className="text-red-600">*</span>
          </>
        }
        name="genre"
        required
        error={validationErrors.genre?.[0]}
        helpText="Select one or more genres that describe your world (at least one required)"
      >
        <div
          className="grid grid-cols-2 md:grid-cols-3 gap-3"
          role="group"
          aria-labelledby="genre-label"
          aria-required="true"
        >
          {GENRE_OPTIONS.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <Checkbox
                id={`genre-${option.value}`}
                checked={formData.genre?.includes(option.value) || false}
                onCheckedChange={() => handleGenreToggle(option.value)}
                aria-label={option.label}
              />
              <Label
                htmlFor={`genre-${option.value}`}
                className="text-sm font-normal cursor-pointer"
              >
                {option.label}
              </Label>
            </div>
          ))}
        </div>
      </FormField>

      {/* Tone Selection */}
      <FormField
        label={
          <>
            Tone <span className="text-red-600">*</span>
          </>
        }
        name="tone"
        required
        error={validationErrors.tone?.[0]}
        helpText="Select one or more tones that define the atmosphere (at least one required)"
      >
        <div
          className="grid grid-cols-2 md:grid-cols-3 gap-3"
          role="group"
          aria-labelledby="tone-label"
          aria-required="true"
        >
          {TONE_OPTIONS.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <Checkbox
                id={`tone-${option.value}`}
                checked={formData.tone?.includes(option.value) || false}
                onCheckedChange={() => handleToneToggle(option.value)}
                aria-label={option.label}
              />
              <Label
                htmlFor={`tone-${option.value}`}
                className="text-sm font-normal cursor-pointer"
              >
                {option.label}
              </Label>
            </div>
          ))}
        </div>
      </FormField>

      {/* World Description (Optional, shown after AI generation) */}
      {showDescription && (
        <FormField
          label="World Description"
          name="atmosphere"
          helpText="Brief atmospheric description of your world (optional)"
        >
          <Textarea
            id="atmosphere"
            value={formData.atmosphere || ''}
            onChange={handleAtmosphereChange}
            placeholder="A brief description of your world's atmosphere and feel..."
            rows={3}
          />
        </FormField>
      )}
    </WizardFormLayout>
  );
}
