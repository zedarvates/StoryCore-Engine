import React, { useState } from 'react';
import { useWizard } from '@/contexts/WizardContext';
import { WizardFormLayout } from '../WizardFormLayout';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Sparkles, X } from 'lucide-react';
import { useLLMGeneration } from '@/hooks/useLLMGeneration';
import { LLMErrorDisplay, LLMLoadingState } from '../LLMErrorDisplay';
import type { Character } from '@/types/character';

// ============================================================================
// Step 3: Personality
// ============================================================================

export function Step3Personality() {
  const { formData, updateFormData, validationErrors } =
    useWizard<Character>();

  const [newTrait, setNewTrait] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newFear, setNewFear] = useState('');
  const [newDesire, setNewDesire] = useState('');
  const [newFlaw, setNewFlaw] = useState('');
  const [newStrength, setNewStrength] = useState('');

  // LLM generation for personality suggestions
  const {
    generate,
    isLoading,
    error: llmError,
    clearError,
  } = useLLMGeneration({
    onSuccess: (response) => {
      // Parse LLM response and update form data
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

    const context = {
      characterName: formData.name || 'the character',
      archetype: formData.role?.archetype || 'character',
      ageRange: formData.visual_identity?.age_range || 'adult',
      appearance: formData.visual_identity,
    };

    const systemPrompt = 'You are a character development expert. Create well-rounded, believable personalities that are internally consistent and match the character\'s role and appearance. Ensure traits, values, and behaviors align logically.';

    const prompt = `Generate a detailed personality profile for a character with the following context:
- Name: ${context.characterName}
- Archetype: ${context.archetype}
- Age Range: ${context.ageRange}
- Appearance: ${context.appearance?.build || 'average build'}, ${context.appearance?.posture || 'neutral posture'}

Please provide:
1. Core personality traits (5-7 traits that define this character)
2. Values and beliefs (3-5 core values)
3. Fears (2-4 deep-seated fears)
4. Desires and goals (2-4 driving desires)
5. Flaws (2-3 character flaws that create conflict)
6. Strengths (3-5 positive qualities)
7. Temperament (overall emotional disposition)
8. Communication style (how they speak and interact)

Ensure the personality is:
- Consistent with the archetype
- Well-rounded with both strengths and flaws
- Internally coherent (traits support each other)
- Creates potential for character growth

Format as JSON with keys: traits (array), values (array), fears (array), desires (array), flaws (array), strengths (array), temperament (string), communication_style (string)

Example:
{
  "traits": ["Brave", "Impulsive", "Loyal", "Stubborn", "Compassionate", "Hot-tempered"],
  "values": ["Justice", "Family", "Honor", "Freedom"],
  "fears": ["Failure", "Losing loved ones", "Being powerless"],
  "desires": ["Protect the innocent", "Prove their worth", "Find belonging"],
  "flaws": ["Acts before thinking", "Holds grudges", "Overly trusting"],
  "strengths": ["Natural leader", "Quick reflexes", "Inspiring presence", "Unwavering determination"],
  "temperament": "Choleric - passionate and driven",
  "communication_style": "Direct and honest, speaks from the heart, sometimes too blunt"
}`;

    await generate({
      prompt,
      systemPrompt,
      temperature: 0.8,
      maxTokens: 1000,
    });
  };

  const parseLLMPersonality = (response: string): Partial<Character['personality']> | null => {
    try {
      console.log('Parsing LLM personality response:', response);
      
      // Try JSON parsing first
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          const result: Partial<Character['personality']> = {};
          
          // Map all fields
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
          
          // Check if we got any data
          if (Object.keys(result).length > 0) {
            console.log('Successfully parsed personality from JSON:', result);
            return result;
          }
        } catch (jsonError) {
          console.warn('JSON parsing failed, trying text parsing');
        }
      }
      
      // Fallback: Parse as structured text
      console.log('Attempting text-based parsing');
      const result: Partial<Character['personality']> = {
        traits: [],
        values: [],
        fears: [],
        desires: [],
        flaws: [],
        strengths: [],
      };
      
      const lines = response.split('\n');
      let currentSection: 'traits' | 'values' | 'fears' | 'desires' | 'flaws' | 'strengths' | null = null;
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        
        // Detect section headers
        if (/(?:core\s*)?(?:personality\s*)?traits?:/i.test(trimmed)) {
          currentSection = 'traits';
          continue;
        }
        if (/values?(?:\s*and\s*beliefs?)?:/i.test(trimmed)) {
          currentSection = 'values';
          continue;
        }
        if (/fears?:/i.test(trimmed)) {
          currentSection = 'fears';
          continue;
        }
        if (/desires?(?:\s*and\s*goals?)?:/i.test(trimmed)) {
          currentSection = 'desires';
          continue;
        }
        if (/flaws?:/i.test(trimmed)) {
          currentSection = 'flaws';
          continue;
        }
        if (/strengths?:/i.test(trimmed)) {
          currentSection = 'strengths';
          continue;
        }
        
        // Parse temperament
        const tempMatch = trimmed.match(/temperament:\s*(.+)/i);
        if (tempMatch) {
          result.temperament = tempMatch[1].trim();
          currentSection = null;
          continue;
        }
        
        // Parse communication style
        const commMatch = trimmed.match(/communication\s*style:\s*(.+)/i);
        if (commMatch) {
          result.communication_style = commMatch[1].trim();
          currentSection = null;
          continue;
        }
        
        // Parse list items in current section
        if (currentSection) {
          const cleaned = trimmed.replace(/^[-*•]\s*/, '').replace(/^\d+\.\s*/, '');
          if (cleaned.length > 2 && !cleaned.endsWith(':')) {
            result[currentSection]?.push(cleaned);
          }
        }
      }
      
      // Check if we got any data
      const hasData = Object.values(result).some(val => 
        Array.isArray(val) ? val.length > 0 : !!val
      );
      
      if (hasData) {
        console.log('Successfully parsed personality from text:', result);
        return result;
      }
      
    } catch (error) {
      console.error('Failed to parse LLM response:', error);
      console.error('Response was:', response);
    }
    
    console.warn('Could not parse any personality data from response');
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

  const handleInputChange = (field: keyof Character['personality']) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    updateFormData({
      personality: {
        ...(formData.personality || {}),
        [field]: e.target.value,
      } as Character['personality'],
    });
  };

  return (
    <WizardFormLayout
      title="Personality"
      description="Define your character's inner world"
    >
      <div className="space-y-6">
        {/* LLM Generation Button */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">AI-Assisted Generation</h3>
              <p className="text-xs text-gray-500 mt-1">
                Generate a consistent personality based on your character's role
              </p>
            </div>
            <Button
              onClick={handleGeneratePersonality}
              disabled={isLoading || !formData.role?.archetype}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              {isLoading ? 'Generating...' : 'Generate Personality'}
            </Button>
          </div>

          {/* Loading State */}
          {isLoading && (
            <LLMLoadingState message="Generating personality profile..." showProgress />
          )}

          {/* Error Display */}
          {llmError && (
            <LLMErrorDisplay
              error={llmError}
              onRetry={handleGeneratePersonality}
              onDismiss={clearError}
            />
          )}
        </div>

        {/* Core Traits */}
        <div className="space-y-2">
          <Label>Core Personality Traits</Label>
          <p className="text-sm text-muted-foreground">5-7 defining traits</p>
          <div className="flex gap-2">
            <Input
              value={newTrait}
              onChange={(e) => setNewTrait(e.target.value)}
              placeholder="Add a trait (e.g., Brave, Curious, Stubborn)"
              onKeyPress={(e) =>
                e.key === 'Enter' && handleAddItem('traits', newTrait, setNewTrait)
              }
            />
            <Button
              onClick={() => handleAddItem('traits', newTrait, setNewTrait)}
              variant="secondary"
              size="sm"
            >
              Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {formData.personality?.traits?.map((trait, index) => (
              <Badge key={index} variant="secondary" className="gap-1">
                {trait}
                <button
                  onClick={() => handleRemoveItem('traits', index)}
                  className="ml-1 hover:text-destructive"
                  aria-label={`Remove ${trait}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
          {validationErrors.traits && (
            <p className="text-sm text-destructive" role="alert">
              {validationErrors.traits[0]}
            </p>
          )}
        </div>

        {/* Values */}
        <div className="space-y-2">
          <Label>Values and Beliefs</Label>
          <p className="text-sm text-muted-foreground">What does this character believe in?</p>
          <div className="flex gap-2">
            <Input
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="Add a value (e.g., Justice, Family, Freedom)"
              onKeyPress={(e) =>
                e.key === 'Enter' && handleAddItem('values', newValue, setNewValue)
              }
            />
            <Button
              onClick={() => handleAddItem('values', newValue, setNewValue)}
              variant="secondary"
              size="sm"
            >
              Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {formData.personality?.values?.map((value, index) => (
              <Badge key={index} variant="secondary" className="gap-1">
                {value}
                <button
                  onClick={() => handleRemoveItem('values', index)}
                  className="ml-1 hover:text-destructive"
                  aria-label={`Remove ${value}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>

        {/* Fears */}
        <div className="space-y-2">
          <Label>Fears</Label>
          <p className="text-sm text-muted-foreground">What does this character fear?</p>
          <div className="flex gap-2">
            <Input
              value={newFear}
              onChange={(e) => setNewFear(e.target.value)}
              placeholder="Add a fear (e.g., Failure, Abandonment, Heights)"
              onKeyPress={(e) =>
                e.key === 'Enter' && handleAddItem('fears', newFear, setNewFear)
              }
            />
            <Button
              onClick={() => handleAddItem('fears', newFear, setNewFear)}
              variant="secondary"
              size="sm"
            >
              Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {formData.personality?.fears?.map((fear, index) => (
              <Badge key={index} variant="secondary" className="gap-1">
                {fear}
                <button
                  onClick={() => handleRemoveItem('fears', index)}
                  className="ml-1 hover:text-destructive"
                  aria-label={`Remove ${fear}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>

        {/* Desires */}
        <div className="space-y-2">
          <Label>Desires and Goals</Label>
          <p className="text-sm text-muted-foreground">What does this character want?</p>
          <div className="flex gap-2">
            <Input
              value={newDesire}
              onChange={(e) => setNewDesire(e.target.value)}
              placeholder="Add a desire (e.g., Recognition, Love, Power)"
              onKeyPress={(e) =>
                e.key === 'Enter' && handleAddItem('desires', newDesire, setNewDesire)
              }
            />
            <Button
              onClick={() => handleAddItem('desires', newDesire, setNewDesire)}
              variant="secondary"
              size="sm"
            >
              Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {formData.personality?.desires?.map((desire, index) => (
              <Badge key={index} variant="secondary" className="gap-1">
                {desire}
                <button
                  onClick={() => handleRemoveItem('desires', index)}
                  className="ml-1 hover:text-destructive"
                  aria-label={`Remove ${desire}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>

        {/* Flaws */}
        <div className="space-y-2">
          <Label>Flaws</Label>
          <p className="text-sm text-muted-foreground">Character weaknesses</p>
          <div className="flex gap-2">
            <Input
              value={newFlaw}
              onChange={(e) => setNewFlaw(e.target.value)}
              placeholder="Add a flaw (e.g., Impulsive, Arrogant, Naive)"
              onKeyPress={(e) =>
                e.key === 'Enter' && handleAddItem('flaws', newFlaw, setNewFlaw)
              }
            />
            <Button
              onClick={() => handleAddItem('flaws', newFlaw, setNewFlaw)}
              variant="secondary"
              size="sm"
            >
              Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {formData.personality?.flaws?.map((flaw, index) => (
              <Badge key={index} variant="secondary" className="gap-1">
                {flaw}
                <button
                  onClick={() => handleRemoveItem('flaws', index)}
                  className="ml-1 hover:text-destructive"
                  aria-label={`Remove ${flaw}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>

        {/* Strengths */}
        <div className="space-y-2">
          <Label>Strengths</Label>
          <p className="text-sm text-muted-foreground">Character strengths and abilities</p>
          <div className="flex gap-2">
            <Input
              value={newStrength}
              onChange={(e) => setNewStrength(e.target.value)}
              placeholder="Add a strength (e.g., Loyal, Intelligent, Resilient)"
              onKeyPress={(e) =>
                e.key === 'Enter' && handleAddItem('strengths', newStrength, setNewStrength)
              }
            />
            <Button
              onClick={() => handleAddItem('strengths', newStrength, setNewStrength)}
              variant="secondary"
              size="sm"
            >
              Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {formData.personality?.strengths?.map((strength, index) => (
              <Badge key={index} variant="secondary" className="gap-1">
                {strength}
                <button
                  onClick={() => handleRemoveItem('strengths', index)}
                  className="ml-1 hover:text-destructive"
                  aria-label={`Remove ${strength}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>

        {/* Temperament */}
        <div className="space-y-2">
          <Label htmlFor="temperament">Temperament</Label>
          <Input
            id="temperament"
            value={formData.personality?.temperament || ''}
            onChange={handleInputChange('temperament')}
            placeholder="e.g., Melancholic, Sanguine, Choleric, Phlegmatic"
          />
          <p className="text-sm text-muted-foreground">
            Overall emotional disposition
          </p>
        </div>

        {/* Communication Style */}
        <div className="space-y-2">
          <Label htmlFor="communication-style">Communication Style</Label>
          <Textarea
            id="communication-style"
            value={formData.personality?.communication_style || ''}
            onChange={handleInputChange('communication_style')}
            placeholder="How does this character speak and interact with others?"
            rows={3}
          />
          <p className="text-sm text-muted-foreground">
            Example: "Direct and blunt, often uses humor to deflect serious topics"
          </p>
        </div>
      </div>
    </WizardFormLayout>
  );
}
