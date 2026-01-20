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

    console.log('🔍 CULTURAL ELEMENTS GENERATION CONTEXT:', context);

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

IMPORTANT: Respond ONLY with a valid JSON object. Do not include any other text, explanations, or formatting.

Example format:
{
  "languages": ["Common Tongue - spoken by most citizens", "Ancient Elvish - language of magic"],
  "religions": ["Church of the Light - monotheistic sun worship", "The Old Ways - nature-based polytheism"],
  "traditions": ["Coming of age trials at 16", "Annual harvest festival"],
  "historicalEvents": ["The Great Schism - religious split 200 years ago", "Discovery of magic crystals"],
  "culturalConflicts": ["Tension between magic users and non-magical citizens", "Religious divide between old and new faiths"]
}`;

    console.log('📤 CULTURAL ELEMENTS PROMPT:', prompt);
    console.log('📤 CULTURAL ELEMENTS SYSTEM PROMPT:', systemPrompt);

    try {
      await generate({
        prompt,
        systemPrompt,
        temperature: 0.8,
        maxTokens: 1500,
      });
    } catch (error) {
      console.error('❌ Failed to generate cultural elements:', error);
      // Error will be handled by useLLMGeneration hook
    }
  };

  const parseLLMCulturalElements = (response: string): CulturalElements => {
    console.log('🎯 PARSING CULTURAL ELEMENTS RESPONSE');
    console.log('📊 Response metadata:');
    console.log('   - Length:', response.length);
    console.log('   - Type:', typeof response);
    console.log('   - Is empty?', response.trim().length === 0);
    console.log('   - First 200 chars:', response.substring(0, 200));
    console.log('   - Last 200 chars:', response.substring(Math.max(0, response.length - 200)));

    try {
      // Log the FULL response for debugging
      console.log('=== LLM RESPONSE START ===');
      console.log(response);
      console.log('=== LLM RESPONSE END ===');

      // Try JSON parsing first - more flexible pattern
      const jsonMatch = response.match(/(\{[\s\S]*\})/);
      console.log('🔍 JSON match found:', !!jsonMatch);
      if (jsonMatch) {
        console.log('📋 Extracted JSON string:', jsonMatch[0]);
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          console.log('📋 Parsed JSON object:', parsed);

          const elements = {
            languages: Array.isArray(parsed.languages) ? parsed.languages : [],
            religions: Array.isArray(parsed.religions) ? parsed.religions : [],
            traditions: Array.isArray(parsed.traditions) ? parsed.traditions : [],
            historicalEvents: Array.isArray(parsed.historicalEvents) ? parsed.historicalEvents : [],
            culturalConflicts: Array.isArray(parsed.culturalConflicts) ? parsed.culturalConflicts : [],
          };

          console.log('🔧 Processed elements:', elements);

          // Check if we got any data
          const hasData = Object.values(elements).some(arr => arr.length > 0);
          console.log('✅ Has data?', hasData);
          if (hasData) {
            console.log('✅ Successfully parsed cultural elements from JSON:', elements);
            return elements;
          } else {
            console.warn('⚠️ JSON parsed successfully but no data arrays found');
          }
        } catch (jsonError) {
          console.warn('⚠️ JSON parsing failed:', jsonError);
          console.warn('⚠️ JSON string that failed:', jsonMatch[0]);
        }
      } else {
        console.warn('⚠️ No JSON object found in response');
      }
      
      // Try alternative JSON patterns (in case of extra text)
      console.log('🔄 Trying alternative JSON patterns...');
      const alternativePatterns = [
        /"languages"\s*:\s*\[([^\]]*)\]/i,
        /languages\s*:\s*\[([^\]]*)\]/i,
      ];

      for (const pattern of alternativePatterns) {
        const match = response.match(pattern);
        if (match) {
          console.log('📋 Found alternative pattern match');
          // Try to extract and parse individual arrays
          try {
            const languagesMatch = response.match(/"languages"\s*:\s*\[([^\]]*)\]/i);
            const religionsMatch = response.match(/"religions"\s*:\s*\[([^\]]*)\]/i);
            const traditionsMatch = response.match(/"traditions"\s*:\s*\[([^\]]*)\]/i);
            const eventsMatch = response.match(/"historicalEvents"\s*:\s*\[([^\]]*)\]/i);
            const conflictsMatch = response.match(/"culturalConflicts"\s*:\s*\[([^\]]*)\]/i);

            const elements = {
              languages: languagesMatch ? languagesMatch[1].split(',').map(s => s.replace(/["\s]/g, '')) : [],
              religions: religionsMatch ? religionsMatch[1].split(',').map(s => s.replace(/["\s]/g, '')) : [],
              traditions: traditionsMatch ? traditionsMatch[1].split(',').map(s => s.replace(/["\s]/g, '')) : [],
              historicalEvents: eventsMatch ? eventsMatch[1].split(',').map(s => s.replace(/["\s]/g, '')) : [],
              culturalConflicts: conflictsMatch ? conflictsMatch[1].split(',').map(s => s.replace(/["\s]/g, '')) : [],
            };

            const hasData = Object.values(elements).some(arr => arr.length > 0);
            if (hasData) {
              console.log('✅ Successfully parsed from alternative patterns:', elements);
              return elements;
            }
          } catch (altError) {
            console.warn('⚠️ Alternative parsing failed:', altError);
          }
        }
      }

      // Fallback: Parse as structured text
      console.log('🔄 Attempting text-based parsing');
      const elements: CulturalElements = {
        languages: [],
        religions: [],
        traditions: [],
        historicalEvents: [],
        culturalConflicts: [],
      };

      const lines = response.split('\n');
      let currentSection: keyof CulturalElements | null = null;
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        
        // Detect section headers
        if (/languages?:/i.test(trimmed)) {
          currentSection = 'languages';
          console.log('📍 Found Languages section');
          continue;
        }
        if (/religions?|beliefs?:/i.test(trimmed)) {
          currentSection = 'religions';
          console.log('📍 Found Religions section');
          continue;
        }
        if (/traditions?|customs?:/i.test(trimmed)) {
          currentSection = 'traditions';
          console.log('📍 Found Traditions section');
          continue;
        }
        if (/historical\s*events?|history:/i.test(trimmed)) {
          currentSection = 'historicalEvents';
          console.log('📍 Found Historical Events section');
          continue;
        }
        if (/conflicts?|tensions?:/i.test(trimmed)) {
          currentSection = 'culturalConflicts';
          console.log('📍 Found Conflicts section');
          continue;
        }
        
        // Parse list items
        if (currentSection) {
          // Remove list markers (-, *, •, numbers)
          const cleaned = trimmed.replace(/^[-*•]\s*/, '').replace(/^\d+\.\s*/, '');
          
          // Skip if it's too short or looks like a header
          if (cleaned.length > 5 && !cleaned.endsWith(':')) {
            elements[currentSection].push(cleaned);
            console.log(`  ➕ Added to ${currentSection}:`, cleaned);
          }
        }
      }
      
      // Check if we got any data
      const hasData = Object.values(elements).some(arr => arr.length > 0);
      if (hasData) {
        console.log('✅ Successfully parsed cultural elements from text:', elements);
        return elements;
      }
      
      // Last resort: Create default elements if response seems valid but unparseable
      if (response.length > 50) {
        console.warn('⚠️ Response seems valid but unparseable, creating default elements');
        return {
          languages: ['Common Language', 'Ancient Tongue'],
          religions: ['Primary Faith', 'Old Beliefs'],
          traditions: ['Annual Festival', 'Coming of Age Ceremony'],
          historicalEvents: ['The Great Change', 'Foundation Era'],
          culturalConflicts: ['Traditional vs Modern', 'Regional Tensions'],
        };
      }
      
    } catch (error) {
      console.error('❌ Failed to parse LLM response:', error);
      console.error('Response was:', response);
    }
    
    console.warn('❌ Could not parse any cultural elements from response');
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
