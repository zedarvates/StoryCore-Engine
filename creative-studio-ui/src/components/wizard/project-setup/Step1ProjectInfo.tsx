import React, { useState } from 'react';
import { Sparkles, Rocket, Loader2 } from 'lucide-react';
import { useWizard } from '@/contexts/WizardContext';
import { GENRE_OPTIONS, TONE_OPTIONS, PRODUCTION_MODE_OPTIONS } from '@/types/world';
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

import { ProjectSetupData } from '@/types/project';

// ============================================================================
// Step 1: Project Information
// ============================================================================

export function Step1ProjectInfo() {
  const { formData, updateFormData, validationErrors } = useWizard<ProjectSetupData>();
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
      console.log('✅ [Step1ProjectInfo] LLM Response received:', response);
      
      const suggestions = parseLLMSuggestions(response.content);
      
      if (suggestions.projectName) {
        const updates: Partial<ProjectSetupData> = {
          projectName: suggestions.projectName,
          projectDescription: suggestions.description || formData.projectDescription,
          tags: suggestions.tags || formData.tags
        };

        updateFormData(updates);
        if (suggestions.description) {
          setShowDescription(true);
        }
      }
    },
  });

  const handleProjectNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    const lowerName = name.toLowerCase();
    
    // Intelligence Layer: Detect futuristic dates
    const futuristicYears = ['2048', '2077', '2150', '2100', '2200', '3000'];
    const hasFuturisticDate = futuristicYears.some(year => lowerName.includes(year));
    
    if (hasFuturisticDate) {
      const updates: Partial<ProjectSetupData> = { projectName: name };
      
      // Suggest Sci-Fi or Cyberpunk genre if not already set
      if (!formData.genre?.includes('sci-fi') && !formData.genre?.includes('cyberpunk')) {
        updates.genre = [...(formData.genre || []), 'sci-fi'];
      }
      
      // Suggest tone
      if (!formData.tone?.includes('serious') && !formData.tone?.includes('adventurous') && (!formData.tone || formData.tone.length === 0)) {
        updates.tone = [...(formData.tone || []), 'adventurous'];
      }
      
      // Auto-fill visual style if empty
      if (!formData.visualStyle) {
        updates.visualStyle = 'Futuristic / Sci-Fi aesthetic with advanced technology and holographic interfaces.';
      }
      
      updateFormData(updates);
    } else {
      updateFormData({ projectName: name });
    }
  };

  const handleTargetAudienceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateFormData({ targetAudience: e.target.value });
  };

  const handleEstimatedDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateFormData({ estimatedDuration: e.target.value });
  };

  const handleVisualStyleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateFormData({ visualStyle: e.target.value });
  };

  const handleAudioStyleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateFormData({ audioStyle: e.target.value });
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

    const systemPrompt = 'You are a creative project planning assistant. You MUST respond with ONLY valid JSON, nothing else. No markdown, no explanations, just pure JSON.';

    const prompt = `Generate a creative project name and brief description for a story project.

Genre: ${formData.genre.join(', ')}
Tone: ${formData.tone.join(', ')}
${formData.productionMode ? `Production Mode: ${formData.productionMode}` : ''}
Target Audience: ${formData.targetAudience || 'general audience'}

RESPOND WITH ONLY THIS JSON FORMAT, NO OTHER TEXT:
{
  "projectName": "A memorable project name (2-4 words max)",
  "description": "A brief description (1-2 sentences max)",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}`;

    try {
      console.log('🚀 [handleGenerateSuggestions] Sending request to LLM');
      console.log('📝 [handleGenerateSuggestions] Prompt:', prompt);
      
      await generate({
        prompt,
        systemPrompt,
        temperature: 0.7,
        maxTokens: 200,
      });
    } catch (error) {
      console.error('Failed to generate suggestions:', error);
    }
  };

  const parseLLMSuggestions = (response: string): { projectName?: string; description?: string; tags?: string[] } => {
    console.log('🔍 [parseLLMSuggestions] Raw response:', response);
    console.log('🔍 [parseLLMSuggestions] Response length:', response.length);
    
    try {
      // Trim whitespace
      const trimmed = response.trim();
      console.log('🔍 [parseLLMSuggestions] Trimmed response:', trimmed);
      
      // Try to find JSON object - look for { ... }
      const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        console.log('📦 [parseLLMSuggestions] Found JSON match:', jsonMatch[0]);
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          console.log('✅ [parseLLMSuggestions] Successfully parsed JSON:', parsed);
          
          const result = {
            projectName: (parsed.projectName || parsed.name || '').trim(),
            description: (parsed.description || parsed.projectDescription || '').trim(),
            tags: Array.isArray(parsed.tags) ? parsed.tags : (parsed.tags || '').split(',').map((t: string) => t.trim()).filter(Boolean)
          };

          console.log('📊 [parseLLMSuggestions] Extracted result:', result);
          
          if (result.projectName) {
            console.log('✨ [parseLLMSuggestions] Valid project name found:', result.projectName);
            return result;
          } else {
            console.warn('⚠️ [parseLLMSuggestions] JSON parsed but no projectName field');
          }
        } catch (jsonError) {
          console.error('❌ [parseLLMSuggestions] JSON parsing failed:', jsonError);
          console.error('❌ [parseLLMSuggestions] Failed JSON string:', jsonMatch[0]);
        }
      } else {
        console.warn('⚠️ [parseLLMSuggestions] No JSON object found in response');
        console.log('🔍 [parseLLMSuggestions] Response starts with:', trimmed.substring(0, 100));
      }

      // Fallback: Try to extract from plain text
      console.log('🔄 [parseLLMSuggestions] Trying text-based parsing...');
      const result: { projectName?: string; description?: string; tags?: string[] } = {};
      const lines = response.split('\n');

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        // Look for project name
        const nameMatch = trimmedLine.match(/(?:project\s*name|name):\s*(.+)/i);
        if (nameMatch && !result.projectName) {
          result.projectName = nameMatch[1].trim().replace(/['"]/g, '');
          console.log('📝 [parseLLMSuggestions] Found name from text:', result.projectName);
          continue;
        }

        // Look for description
        const descMatch = trimmedLine.match(/(?:description|summary):\s*(.+)/i);
        if (descMatch && !result.description) {
          result.description = descMatch[1].trim().replace(/['"]/g, '');
          console.log('📝 [parseLLMSuggestions] Found description from text:', result.description);
          continue;
        }

        // Look for tags
        const tagsMatch = trimmedLine.match(/(?:tags|keywords|hashtags):\s*(.+)/i);
        if (tagsMatch && !result.tags) {
          result.tags = tagsMatch[1].split(/,|\s+/).map(t => t.trim().replace(/^#/, '')).filter(Boolean);
          console.log('📝 [parseLLMSuggestions] Found tags from text:', result.tags);
        }

        // If we don't have a name yet and this looks like a title
        if (!result.projectName && trimmedLine.length > 3 && trimmedLine.length < 50 && /^[A-Z]/.test(trimmedLine)) {
          result.projectName = trimmedLine.replace(/['"]/g, '');
          console.log('📝 [parseLLMSuggestions] Found name from title:', result.projectName);
        }
        // If we have a name but no description, and this is a longer line
        else if (result.projectName && !result.description && trimmedLine.length > 30) {
          result.description = trimmedLine.replace(/['"]/g, '');
          console.log('📝 [parseLLMSuggestions] Found description from text:', result.description);
        }
      }

      if (result.projectName) {
        console.log('✨ [parseLLMSuggestions] Text-based parsing successful:', result);
        return result;
      }
      
      console.warn('⚠️ [parseLLMSuggestions] No suggestions found in response');
    } catch (error) {
      console.error('❌ [parseLLMSuggestions] Unexpected error:', error);
    }

    console.warn('⚠️ [parseLLMSuggestions] Returning empty result');
    return {};
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateFormData({ projectDescription: e.target.value });
  };

  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const tags = e.target.value.split(',').map(t => t.trim().replace(/^#/, ''));
    updateFormData({ tags });
  };

  return (
    <WizardFormLayout
      title="Project Information"
      description="Define the basic characteristics of your story project"
    >
      {/* Validation Error Summary */}
      <ValidationErrorSummary errors={validationErrors} className="mb-6" />

      {/* LLM Generation Section */}
      <div className="space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">AI-Assisted Generation</h3>
            <p className="text-xs text-gray-500 mt-1">
              Generate project name and description suggestions
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
          <LLMLoadingState message="Generating project suggestions..." showProgress />
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

      {/* Project Name */}
      <FormField
        label={
          <span className="flex items-center gap-2">
            <Rocket className="w-4 h-4 text-primary" />
            Project Name <span className="text-red-600">*</span>
          </span>
        }
        name="projectName"
        required
        error={validationErrors.projectName?.[0]}
        helpText="Give your project a memorable name"
      >
        <div className="relative">
          <Input
            id="projectName"
            value={formData.projectName || ''}
            onChange={handleProjectNameChange}
            placeholder="e.g., The Last Guardian, Neon Dreams, Shadows of the Past"
            aria-required="true"
            aria-invalid={!!validationErrors.projectName}
            className={cn("pr-12", validationErrors.projectName ? 'border-red-500 focus:ring-red-500' : '')}
          />
          {llmConfigured && (
            <button
              onClick={handleGenerateSuggestions}
              disabled={isLoading}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-50"
              title="Generate name suggestions"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </FormField>

      {/* Production Mode Selection */}
      <FormField
        label={
          <>
            Production Mode <span className="text-red-600">*</span>
          </>
        }
        name="productionMode"
        required
        error={validationErrors.productionMode?.[0]}
        helpText="Select the methodology for your project generation"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3" role="group" aria-required="true">
          {PRODUCTION_MODE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => updateFormData({ productionMode: option.value })}
              className={cn(
                "flex flex-col items-start p-3 rounded-lg border-2 text-left transition-all",
                formData.productionMode === option.value
                  ? "border-primary bg-primary/5 dark:bg-primary/10"
                  : "border-gray-200 dark:border-gray-800 hover:border-primary/50"
              )}
            >
              <span className="font-semibold text-sm">{option.label}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">{option.description}</span>
            </button>
          ))}
        </div>
      </FormField>

      <FormField
        label={
          <>
            Genre <span className="text-red-600">*</span>
          </>
        }
        name="genre"
        required
        error={validationErrors.genre?.[0]}
        helpText="Select one or more genres for your project"
      >
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3" role="group" aria-required="true">
          {GENRE_OPTIONS.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <Checkbox
                id={`genre-${option.value}`}
                checked={formData.genre?.includes(option.value) || false}
                onCheckedChange={(checked) => {
                  if (checked) {
                    handleGenreToggle(option.value);
                  } else {
                    handleGenreToggle(option.value);
                  }
                }}
                aria-label={option.label}
              />
              <Label htmlFor={`genre-${option.value}`} className="text-sm font-normal cursor-pointer">
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
        helpText="Select one or more tones for your project"
      >
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3" role="group" aria-required="true">
          {TONE_OPTIONS.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <Checkbox
                id={`tone-${option.value}`}
                checked={formData.tone?.includes(option.value) || false}
                onCheckedChange={(checked) => {
                  if (checked) {
                    handleToneToggle(option.value);
                  } else {
                    handleToneToggle(option.value);
                  }
                }}
                aria-label={option.label}
              />
              <Label htmlFor={`tone-${option.value}`} className="text-sm font-normal cursor-pointer">
                {option.label}
              </Label>
            </div>
          ))}
        </div>
      </FormField>

      {/* Target Audience */}
      <FormField
        label="Target Audience"
        name="targetAudience"
        helpText="Who is this project for?"
      >
        <Input
          id="targetAudience"
          value={formData.targetAudience || ''}
          onChange={handleTargetAudienceChange}
          placeholder="e.g., Young Adults, General Audience, Children 8-12"
        />
      </FormField>

      {/* Estimated Duration */}
      <FormField
        label="Estimated Duration"
        name="estimatedDuration"
        helpText="How long should the final content be?"
      >
        <Input
          id="estimatedDuration"
          value={formData.estimatedDuration || ''}
          onChange={handleEstimatedDurationChange}
          placeholder="e.g., 90 minutes, 10 episodes, 5 minutes"
        />
      </FormField>

      {/* Tags for Discoverability */}
      <FormField
        label={
          <span className="flex items-center gap-2">
            <Rocket className="w-4 h-4 text-purple-500" />
            Tags & Discoverability (SEO)
          </span>
        }
        name="tags"
        helpText="Add comma-separated tags to help people find your project (e.g. scifi, epic, adventure)"
      >
        <Input
          id="tags"
          value={(formData.tags || []).join(', ')}
          onChange={handleTagsChange}
          placeholder="e.g., ai, storytelling, cyberpunk, futuristic"
        />
        <div className="flex flex-wrap gap-2 mt-2">
          {(formData.tags || []).map((tag, idx) => (
            <span key={idx} className="px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-md text-[10px] font-bold uppercase tracking-wider">
              #{tag}
            </span>
          ))}
        </div>
      </FormField>

      {/* SEO Overrides */}
      <div className="p-4 bg-muted/30 rounded-xl border border-border/50 space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <Sparkles className="w-3 h-3" /> Search Engine Optimization (Advanced)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="Search Title"
            name="searchTitle"
            helpText="Custom title for Google search results"
          >
            <Input
              value={formData.seoMetadata?.searchTitle || ''}
              onChange={(e) => updateFormData({ 
                seoMetadata: { ...formData.seoMetadata, searchTitle: e.target.value } 
              })}
              placeholder={formData.projectName || "Search Title"}
              className="text-xs h-8"
            />
          </FormField>
          <FormField
            label="Search Description"
            name="searchDescription"
            helpText="Custom description for Google search results"
          >
            <Input
              value={formData.seoMetadata?.searchDescription || ''}
              onChange={(e) => updateFormData({ 
                seoMetadata: { ...formData.seoMetadata, searchDescription: e.target.value } 
              })}
              placeholder="A brief snippet for search results..."
              className="text-xs h-8"
            />
          </FormField>
        </div>
      </div>

      {/* Project Description */}
      {showDescription && (
        <FormField
          label="Project Description"
          name="projectDescription"
          helpText="Brief description of your project (optional)"
        >
          <Textarea
            id="projectDescription"
            value={formData.projectDescription || ''}
            onChange={handleDescriptionChange}
            placeholder="A brief description of your project..."
            rows={3}
          />
        </FormField>
      )}

      {/* Visual & Audio Style - Moved to Step 1 as requested for visibility */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
        <FormField
          label="Visual Style"
          name="visualStyle"
          helpText="Describe the visual direction and aesthetic"
        >
          <Textarea
            id="visualStyle"
            value={formData.visualStyle || ''}
            onChange={handleVisualStyleChange}
            placeholder="e.g., Cyberpunk, Noir, Watercolor..."
            rows={3}
          />
        </FormField>

        <FormField
          label="Audio Style"
          name="audioStyle"
          helpText="Describe the soundscape and music"
        >
          <Textarea
            id="audioStyle"
            value={formData.audioStyle || ''}
            onChange={handleAudioStyleChange}
            placeholder="e.g., Synthwave, Orchestral, Minimalist..."
            rows={3}
          />
        </FormField>
      </div>
    </WizardFormLayout>
  );
}
