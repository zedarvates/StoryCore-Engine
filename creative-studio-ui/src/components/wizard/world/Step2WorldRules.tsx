import React, { useState } from 'react';
import { Plus, Trash2, Sparkles } from 'lucide-react';
import { useWizard } from '@/contexts/WizardContext';
import type { World, WorldRule } from '@/types/world';
import { RULE_CATEGORIES, createEmptyWorldRule } from '@/types/world';
import { WizardFormLayout, FormField, FormSection } from '../WizardFormLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { useLLMGeneration } from '@/hooks/useLLMGeneration';
import { LLMErrorDisplay, LLMLoadingState } from '../LLMErrorDisplay';
import { ServiceWarning, useServiceStatus } from '@/components/ui/service-warning';
import { useAppStore } from '@/stores/useAppStore';
import { useToast } from '@/hooks/use-toast';

// ============================================================================
// Step 2: World Rules
// ============================================================================

export function Step2WorldRules() {
  const { formData, updateFormData } = useWizard<World>();
  const [_editingRuleId, _setEditingRuleId] = useState<string | null>(null);
  const { llmConfigured, llmChecking } = useServiceStatus();
  const setShowLLMSettings = useAppStore((state) => state.setShowLLMSettings);
  const { toast } = useToast();

  const {
    generate,
    isLoading,
    error: llmError,
    clearError,
  } = useLLMGeneration({
    onSuccess: (response) => {
      // Parse LLM response and add rules
      const generatedRules = parseLLMRules(response.content);
      if (generatedRules.length > 0) {
        updateFormData({ rules: [...rules, ...generatedRules] });
      }
    },
  });

  const rules = formData.rules || [];

  // ============================================================================
  // Rule Management
  // ============================================================================

  const handleAddRule = () => {
    const newRule = createEmptyWorldRule();
    updateFormData({ rules: [...rules, newRule] });
    _setEditingRuleId(newRule.id);
  };

  const handleRemoveRule = (ruleId: string) => {
    updateFormData({ rules: rules.filter((r) => r.id !== ruleId) });
  };

  const handleUpdateRule = (ruleId: string, updates: Partial<WorldRule>) => {
    updateFormData({
      rules: rules.map((r) => (r.id === ruleId ? { ...r, ...updates } : r)),
    });
  };

  // ============================================================================
  // LLM Generation
  // ============================================================================

  const handleGenerateRules = async () => {
    clearError();

    // Provide helpful message if no genre selected
    if (!formData.genre?.length) {
      toast({
        title: 'Genre Required',
        description: 'Please select at least one genre before generating rules.',
        variant: 'warning',
      });
      return;
    }

    const context = {
      genre: formData.genre || [],
      timePeriod: formData.timePeriod || '',
      tone: formData.tone || [],
    };

    ;

    const systemPrompt = 'You are a creative world-building assistant. Generate coherent, genre-appropriate world rules that are internally consistent and narratively interesting.';

    const prompt = `Generate 4-6 world rules for a story world with the following characteristics:
- Genre: ${context.genre.join(', ')}
- Time Period: ${context.timePeriod}
- Tone: ${context.tone.join(', ')}

For each rule, provide:
1. Category (physical, social, magical, or technological)
2. The rule itself (concise statement)
3. Implications (how this affects the world)

IMPORTANT: Respond ONLY with a valid JSON array. Do not include any other text, explanations, or formatting.

Example format:
[
  {
    "category": "magical",
    "rule": "Magic requires life force to cast",
    "implications": "Powerful spells can be dangerous to the caster, creating moral dilemmas about the cost of magic"
  }
]`;

    ;
    ;

    try {
      await generate({
        prompt,
        systemPrompt,
        temperature: 0.8,
        maxTokens: 1000,
      });
    } catch (error) {
      console.error('❌ Failed to generate rules:', error);
      // Error will be handled by useLLMGeneration hook
    }
  };

  const parseLLMRules = (response: string): WorldRule[] => {
    if (!response || response.trim().length === 0) {
      return [];
    }

    try {
      ;
      ;
      ;

      // Try to extract JSON from response - more flexible pattern
      const jsonMatch = response.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
      ;
      if (jsonMatch) {
        ;
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          ;

          // Handle both single object and array
          let items = [];
          if (Array.isArray(parsed)) {
            items = parsed;
          } else if (parsed && typeof parsed === 'object') {
            // If it's a single rule object, wrap it in array
            items = [parsed];
          }

          if (items.length > 0) {
            const rules = items.map((item: any) => ({
              id: crypto.randomUUID(),
              category: (item.category?.toLowerCase() as WorldRule['category']) || 'physical',
              rule: item.rule || item.name || item.title || '',
              implications: item.implications || item.description || item.effect || '',
            }));

            ;
            const filtered = rules.filter(r => r.rule.trim()); // Only return rules with content
            ;
            return filtered;
          } else {
            console.warn('⚠️ No items found in parsed JSON');
          }
        } catch (jsonError) {
          console.warn('⚠️ JSON parsing failed:', jsonError);
          console.warn('⚠️ JSON string that failed:', jsonMatch[0]);
        }
      } else {
        console.warn('⚠️ No JSON found in response');
      }
      
      // Fallback: Parse as structured text
      ;
      const rules: WorldRule[] = [];
      const lines = response.split('\n');
      
      let currentRule: Partial<WorldRule> | null = null;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Look for category indicators
        const categoryMatch = line.match(/(?:category|type):\s*(\w+)/i);
        if (categoryMatch) {
          if (currentRule && currentRule.rule) {
            rules.push({
              id: crypto.randomUUID(),
              category: currentRule.category || 'physical',
              rule: currentRule.rule,
              implications: currentRule.implications || '',
            });
          }
          currentRule = {
            category: categoryMatch[1].toLowerCase() as WorldRule['category'],
          };
          continue;
        }
        
        // Look for rule content
        const ruleMatch = line.match(/(?:rule|law):\s*(.+)/i);
        if (ruleMatch && currentRule) {
          currentRule.rule = ruleMatch[1].trim();
          continue;
        }
        
        // Look for implications
        const implicationMatch = line.match(/(?:implication|effect|consequence)s?:\s*(.+)/i);
        if (implicationMatch && currentRule) {
          currentRule.implications = implicationMatch[1].trim();
          continue;
        }
        
        // Try numbered list format: "1. [Category] Rule - Implications"
        const numberedMatch = line.match(/^\d+\.\s*(?:\[?(\w+)\]?:?\s*)?(.+?)(?:\s*[-–—]\s*(.+))?$/);
        if (numberedMatch) {
          const [, category, rule, implications] = numberedMatch;
          if (rule && rule.length > 10) { // Ensure it's substantial
            rules.push({
              id: crypto.randomUUID(),
              category: (category?.toLowerCase() as WorldRule['category']) || 'physical',
              rule: rule.trim(),
              implications: implications?.trim() || '',
            });
          }
          continue;
        }
        
        // If we have a current rule being built and this looks like content
        if (currentRule && !currentRule.rule && line.length > 15) {
          currentRule.rule = line;
        } else if (currentRule && currentRule.rule && !currentRule.implications && line.length > 15) {
          currentRule.implications = line;
        }
      }
      
      // Add the last rule if exists
      if (currentRule && currentRule.rule) {
        rules.push({
          id: crypto.randomUUID(),
          category: currentRule.category || 'physical',
          rule: currentRule.rule,
          implications: currentRule.implications || '',
        });
      }
      
      if (rules.length > 0) {
        ;
        return rules;
      }
      
    } catch (error) {
      console.error('Failed to parse LLM response:', error);
      console.error('Response was:', response);
    }
    
    console.warn('Could not parse any rules from response');
    return [];
  };

  // ============================================================================
  // Technology and Magic Fields
  // ============================================================================

  const handleTechnologyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateFormData({ technology: e.target.value });
  };

  const handleMagicChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateFormData({ magic: e.target.value });
  };

  return (
    <WizardFormLayout
      title="World Rules"
      description="Define the laws and systems that govern your world"
    >
      {/* LLM Generation Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">AI-Assisted Generation</h3>
            <p className="text-xs text-gray-500 mt-1">
              Generate rule suggestions based on your world's characteristics
            </p>
          </div>
          <Button
            onClick={handleGenerateRules}
            disabled={isLoading || llmChecking || !formData.genre?.length || !llmConfigured}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            {isLoading ? 'Generating...' : llmChecking ? 'Checking...' : 'Generate Rules'}
          </Button>
        </div>

        {/* Service Checking State */}
        {llmChecking && !isLoading && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-blue-700 dark:text-blue-300">
              Checking LLM service configuration...
            </span>
          </div>
        )}

        {/* Service Warning */}
        {!llmChecking && !llmConfigured && (
          <ServiceWarning
            service="llm"
            variant="inline"
            onConfigure={() => setShowLLMSettings(true)}
            className="bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800"
          />
        )}

        {/* Loading State */}
        {isLoading && (
          <LLMLoadingState message="Generating world rules..." showProgress />
        )}

        {/* Error Display */}
        {llmError && (
          <div className="space-y-3">
            <LLMErrorDisplay
              error={llmError}
              onRetry={handleGenerateRules}
              onDismiss={clearError}
            />
            {/* Fallback to manual entry */}
            <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                You can also add rules manually below
              </p>
              <button
                onClick={() => {
                  clearError();
                  handleAddRule();
                }}
                className="text-sm text-primary hover:underline"
              >
                Add Manually
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Technology System */}
      <FormSection title="Technology System">
        <FormField
          label="Technology Level"
          name="technology"
          helpText="Describe the technological capabilities and limitations of your world"
        >
          <Textarea
            id="technology"
            value={formData.technology || ''}
            onChange={handleTechnologyChange}
            placeholder="e.g., Advanced AI and cybernetics, but limited space travel..."
            rows={4}
            aria-describedby="technology-help"
          />
        </FormField>
      </FormSection>

      {/* Magic System */}
      <FormSection title="Magic System">
        <FormField
          label="Magic Rules"
          name="magic"
          helpText="Describe how magic works in your world, if applicable"
        >
          <Textarea
            id="magic"
            value={formData.magic || ''}
            onChange={handleMagicChange}
            placeholder="e.g., Magic requires life force, limited by user's stamina..."
            rows={4}
            aria-describedby="magic-help"
          />
        </FormField>
      </FormSection>

      {/* Custom Rules */}
      <FormSection
        title="Custom Rules"
        description="Add specific rules that define your world's unique characteristics"
      >
        <div className="space-y-4">
          {rules.map((rule) => (
            <Card key={rule.id} className="border-2">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-4">
                    {/* Category */}
                    <FormField label="Category" name={`rule-${rule.id}-category`}>
                      <Select
                        value={rule.category}
                        onValueChange={(value) =>
                          handleUpdateRule(rule.id, {
                            category: value as WorldRule['category'],
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent className="z-[9999]">
                          {RULE_CATEGORIES.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>

                    {/* Rule */}
                    <FormField label="Rule" name={`rule-${rule.id}-rule`} required>
                      <Input
                        value={rule.rule}
                        onChange={(e) =>
                          handleUpdateRule(rule.id, { rule: e.target.value })
                        }
                        placeholder="State the rule concisely"
                      />
                    </FormField>

                    {/* Implications */}
                    <FormField
                      label="Implications"
                      name={`rule-${rule.id}-implications`}
                    >
                      <Textarea
                        value={rule.implications}
                        onChange={(e) =>
                          handleUpdateRule(rule.id, { implications: e.target.value })
                        }
                        placeholder="How does this rule affect the world?"
                        rows={2}
                      />
                    </FormField>
                  </div>

                  {/* Delete Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveRule(rule.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    aria-label="Delete rule"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Add Rule Button */}
          <Button
            variant="outline"
            onClick={handleAddRule}
            className="w-full gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Custom Rule
          </Button>
        </div>
      </FormSection>
    </WizardFormLayout>
  );
}
