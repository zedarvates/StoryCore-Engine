import React, { useState } from 'react';
import { useWizard } from '@/contexts/WizardContext';
import { WizardFormLayout } from '../WizardFormLayout';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, X } from 'lucide-react';
import { useLLMGeneration } from '@/hooks/useLLMGeneration';
import { LLMErrorDisplay, LLMLoadingState } from '../LLMErrorDisplay';
import type { Character } from '@/types/character';
import type { World } from '@/types/world';

// ============================================================================
// Step 4: Background
// ============================================================================

interface Step4BackgroundProps {
  worldContext?: World;
}

export function Step4Background({ worldContext }: Step4BackgroundProps) {
  const { formData, updateFormData } = useWizard<Character>();
  const [newEvent, setNewEvent] = useState('');

  // LLM generation for background suggestions
  const {
    generate,
    isLoading,
    error: llmError,
    clearError,
  } = useLLMGeneration({
    onSuccess: (response) => {
      // Parse LLM response and update form data
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

    const systemPrompt = 'You are a character backstory specialist. Create detailed, believable backgrounds that explain how the character became who they are. Ensure the backstory is consistent with personality traits and creates narrative potential.';

    const prompt = `Generate a detailed background for a character with the following context:
- Name: ${context.characterName}
- Archetype: ${context.archetype}
- Age Range: ${context.ageRange}
- Personality Traits: ${context.personality?.traits?.join(', ') || 'not specified'}
- Values: ${context.personality?.values?.join(', ') || 'not specified'}
- Fears: ${context.personality?.fears?.join(', ') || 'not specified'}
- World Genre: ${context.worldGenre}
- World Tone: ${context.worldTone}
- Time Period: ${context.worldTimePeriod}

Please provide:
1. Origin and upbringing (where they came from, childhood experiences)
2. Occupation and skills (current or past work, developed abilities)
3. Education (formal or informal learning experiences)
4. Family background (family structure, key relationships)
5. Significant life events (3-5 key moments that shaped them)
6. Current situation (where they are now in life)

Ensure the background:
- Explains how they developed their personality traits
- Justifies their values and fears
- Creates potential for character growth
- Fits the world's genre, tone, and time period
- Is internally consistent and believable

Format as JSON with keys: origin (string), occupation (string), education (string), family (string), significant_events (array of strings), current_situation (string)

Example:
{
  "origin": "Born in a small coastal village to a family of fishermen. Childhood marked by poverty but strong community bonds.",
  "occupation": "Former soldier turned blacksmith. Skilled in metalworking, combat, and survival tactics.",
  "education": "Self-taught through observation and practice. Apprenticed to a master blacksmith after leaving the military.",
  "family": "Youngest of three siblings. Father died at sea when they were young. Mother remarried a merchant. Estranged from older brother.",
  "significant_events": [
    "Witnessed village raid at age 12, sparking desire to protect others",
    "Joined military at 16 to escape poverty",
    "Lost best friend in battle, leading to guilt and PTSD",
    "Discovered talent for metalworking during recovery",
    "Left military to pursue peaceful craft"
  ],
  "current_situation": "Living in the capital city, running a small forge. Struggling with past trauma while trying to build a new life. Recently received news that threatens to pull them back into conflict."
}`;

    await generate({
      prompt,
      systemPrompt,
      temperature: 0.8,
      maxTokens: 1200,
    });
  };

  const parseLLMBackground = (response: string): Partial<Character['background']> | null => {
    try {
      ;
      
      // Try JSON parsing first
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          const result: Partial<Character['background']> = {};
          
          // Map all fields with aliases
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
          
          // Check if we got any data
          if (Object.keys(result).length > 0) {
            ;
            return result;
          }
        } catch (jsonError) {
          console.warn('JSON parsing failed, trying text parsing');
        }
      }
      
      // Fallback: Parse as structured text
      ;
      const result: Partial<Character['background']> = {};
      const lines = response.split('\n');
      
      const significantEvents: string[] = [];
      let inEventsSection = false;
      let currentField: string | null = null;
      let currentValue = '';
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        
        // Detect significant events section
        if (/significant\s*(?:life\s*)?events?:/i.test(trimmed)) {
          if (currentField && currentValue) {
            // Save previous field
            if (currentField === 'origin') result.origin = currentValue;
            else if (currentField === 'occupation') result.occupation = currentValue;
            else if (currentField === 'education') result.education = currentValue;
            else if (currentField === 'family') result.family = currentValue;
            else if (currentField === 'current_situation') result.current_situation = currentValue;
          }
          inEventsSection = true;
          currentField = null;
          currentValue = '';
          continue;
        }
        
        // Parse list items in events section
        if (inEventsSection) {
          const cleaned = trimmed.replace(/^[-*•]\s*/, '').replace(/^\d+\.\s*/, '');
          if (cleaned.length > 10 && !cleaned.endsWith(':')) {
            significantEvents.push(cleaned);
          }
          // Check if we're leaving the events section
          if (/^(origin|occupation|education|family|current\s*situation):/i.test(trimmed)) {
            inEventsSection = false;
          } else {
            continue;
          }
        }
        
        // Parse field headers and values
        const fieldMatch = trimmed.match(/^(origin|occupation|education|family|current\s*situation)(?:\s*and\s*upbringing)?:\s*(.+)/i);
        if (fieldMatch) {
          // Save previous field
          if (currentField && currentValue) {
            if (currentField === 'origin') result.origin = currentValue;
            else if (currentField === 'occupation') result.occupation = currentValue;
            else if (currentField === 'education') result.education = currentValue;
            else if (currentField === 'family') result.family = currentValue;
            else if (currentField === 'current_situation') result.current_situation = currentValue;
          }
          
          currentField = fieldMatch[1].toLowerCase().replace(/\s+/g, '_');
          currentValue = fieldMatch[2].trim();
          continue;
        }
        
        // Continue multi-line field value
        if (currentField && trimmed.length > 10 && !trimmed.endsWith(':')) {
          currentValue += ' ' + trimmed;
        }
      }
      
      // Save last field
      if (currentField && currentValue) {
        if (currentField === 'origin') result.origin = currentValue;
        else if (currentField === 'occupation') result.occupation = currentValue;
        else if (currentField === 'education') result.education = currentValue;
        else if (currentField === 'family') result.family = currentValue;
        else if (currentField === 'current_situation') result.current_situation = currentValue;
      }
      
      if (significantEvents.length > 0) result.significant_events = significantEvents;
      
      // Check if we got any data
      if (Object.keys(result).length > 0) {
        ;
        return result;
      }
      
    } catch (error) {
      console.error('Failed to parse LLM response:', error);
      console.error('Response was:', response);
    }
    
    console.warn('Could not parse any background data from response');
    return null;
  };

  const handleAddEvent = () => {
    if (newEvent.trim()) {
      const events = formData.background?.significant_events || [];
      updateFormData({
        background: {
          ...(formData.background || {}),
          significant_events: [...events, newEvent.trim()],
        } as Character['background'],
      });
      setNewEvent('');
    }
  };

  const handleRemoveEvent = (index: number) => {
    const events = formData.background?.significant_events || [];
    updateFormData({
      background: {
        ...(formData.background || {}),
        significant_events: events.filter((_, i) => i !== index),
      } as Character['background'],
    });
  };

  const handleInputChange = (field: keyof Character['background']) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    updateFormData({
      background: {
        ...(formData.background || {}),
        [field]: e.target.value,
      } as Character['background'],
    });
  };

  return (
    <WizardFormLayout
      title="Background"
      description="Define your character's history and origins"
    >
      <div className="space-y-6">
        {/* LLM Generation Button */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">AI-Assisted Generation</h3>
              <p className="text-xs text-gray-500 mt-1">
                Generate a backstory aligned with your character's personality
              </p>
            </div>
            <Button
              onClick={handleGenerateBackground}
              disabled={isLoading || !formData.personality?.traits?.length}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              {isLoading ? 'Generating...' : 'Generate Background'}
            </Button>
          </div>

          {/* Loading State */}
          {isLoading && (
            <LLMLoadingState message="Generating character backstory..." showProgress />
          )}

          {/* Error Display */}
          {llmError && (
            <LLMErrorDisplay
              error={llmError}
              onRetry={handleGenerateBackground}
              onDismiss={clearError}
            />
          )}
        </div>

        {/* Origin */}
        <div className="space-y-2">
          <Label htmlFor="origin">Origin and Upbringing</Label>
          <Textarea
            id="origin"
            value={formData.background?.origin || ''}
            onChange={handleInputChange('origin')}
            placeholder="Where did this character come from? What was their childhood like?"
            rows={4}
          />
          <p className="text-sm text-muted-foreground">
            Example: "Born in a small coastal village, raised by a single mother who was a fisherman"
          </p>
        </div>

        {/* Occupation */}
        <div className="space-y-2">
          <Label htmlFor="occupation">Occupation and Skills</Label>
          <Textarea
            id="occupation"
            value={formData.background?.occupation || ''}
            onChange={handleInputChange('occupation')}
            placeholder="What does this character do? What skills have they developed?"
            rows={3}
          />
          <p className="text-sm text-muted-foreground">
            Example: "Former soldier turned blacksmith, skilled in metalworking and combat"
          </p>
        </div>

        {/* Education */}
        <div className="space-y-2">
          <Label htmlFor="education">Education</Label>
          <Textarea
            id="education"
            value={formData.background?.education || ''}
            onChange={handleInputChange('education')}
            placeholder="What formal or informal education has this character received?"
            rows={3}
          />
          <p className="text-sm text-muted-foreground">
            Example: "Self-taught through books stolen from the local library, apprenticed to a master craftsman"
          </p>
        </div>

        {/* Family */}
        <div className="space-y-2">
          <Label htmlFor="family">Family Background</Label>
          <Textarea
            id="family"
            value={formData.background?.family || ''}
            onChange={handleInputChange('family')}
            placeholder="Who are this character's family members? What are those relationships like?"
            rows={4}
          />
          <p className="text-sm text-muted-foreground">
            Example: "Youngest of three siblings, estranged from father, close to grandmother"
          </p>
        </div>

        {/* Significant Events */}
        <div className="space-y-2">
          <Label>Significant Life Events</Label>
          <p className="text-sm text-muted-foreground">
            Key moments that shaped this character (3-5 events)
          </p>
          <div className="flex gap-2">
            <Input
              value={newEvent}
              onChange={(e) => setNewEvent(e.target.value)}
              placeholder="Add a significant event"
              onKeyPress={(e) => e.key === 'Enter' && handleAddEvent()}
            />
            <Button onClick={handleAddEvent} variant="secondary" size="sm">
              Add
            </Button>
          </div>
          <div className="space-y-2 mt-2">
            {formData.background?.significant_events?.map((event, index) => (
              <div
                key={index}
                className="flex items-start gap-2 p-3 bg-muted rounded-lg"
              >
                <span className="flex-1 text-sm">{event}</span>
                <button
                  onClick={() => handleRemoveEvent(index)}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label={`Remove event ${index + 1}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          {formData.background?.significant_events?.length === 0 && (
            <p className="text-sm text-muted-foreground italic">
              No significant events added yet
            </p>
          )}
        </div>

        {/* Current Situation */}
        <div className="space-y-2">
          <Label htmlFor="current-situation">Current Situation</Label>
          <Textarea
            id="current-situation"
            value={formData.background?.current_situation || ''}
            onChange={handleInputChange('current_situation')}
            placeholder="Where is this character now in their life? What are they currently dealing with?"
            rows={4}
          />
          <p className="text-sm text-muted-foreground">
            Example: "Living in the capital city, struggling to make ends meet while searching for their missing sibling"
          </p>
        </div>
      </div>
    </WizardFormLayout>
  );
}
