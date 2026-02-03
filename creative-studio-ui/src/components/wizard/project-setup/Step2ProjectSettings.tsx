import React from 'react';
import { Plus, Trash2, Sparkles } from 'lucide-react';
import { useWizard } from '@/contexts/WizardContext';
import type { ProjectSetupData } from './Step1ProjectInfo';
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
import { parseLLMArray, validateLLMResponse } from '@/utils/llmResponseParser';

// ============================================================================
// Extended Project Setup Data with Settings
// ============================================================================

export interface ProjectConstraint {
  id: string;
  category: 'technical' | 'creative' | 'budget' | 'timeline';
  constraint: string;
  impact: string;
}

export interface ExtendedProjectSetupData extends ProjectSetupData {
  visualStyle?: string;
  audioStyle?: string;
  constraints?: ProjectConstraint[];
}

const CONSTRAINT_CATEGORIES = [
  { value: 'technical', label: 'Technical' },
  { value: 'creative', label: 'Creative' },
  { value: 'budget', label: 'Budget' },
  { value: 'timeline', label: 'Timeline' },
] as const;

function createEmptyConstraint(): ProjectConstraint {
  return {
    id: crypto.randomUUID(),
    category: 'technical',
    constraint: '',
    impact: '',
  };
}

// ============================================================================
// Step 2: Project Settings
// ============================================================================

export function Step2ProjectSettings() {
  const { formData, updateFormData } = useWizard<ExtendedProjectSetupData>();
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
      const generatedConstraints = parseLLMConstraints(response.content);
      if (generatedConstraints.length > 0) {
        updateFormData({ constraints: [...constraints, ...generatedConstraints] });
      }
    },
  });

  const constraints = formData.constraints || [];

  // ============================================================================
  // Constraint Management
  // ============================================================================

  const handleAddConstraint = () => {
    const newConstraint = createEmptyConstraint();
    updateFormData({ constraints: [...constraints, newConstraint] });
  };

  const handleRemoveConstraint = (constraintId: string) => {
    updateFormData({ constraints: constraints.filter((c) => c.id !== constraintId) });
  };

  const handleUpdateConstraint = (constraintId: string, updates: Partial<ProjectConstraint>) => {
    updateFormData({
      constraints: constraints.map((c) => (c.id === constraintId ? { ...c, ...updates } : c)),
    });
  };

  // ============================================================================
  // LLM Generation
  // ============================================================================

  const handleGenerateConstraints = async () => {
    clearError();

    if (!formData.genre?.length) {
      toast({
        title: 'Genre Required',
        description: 'Please select at least one genre before generating constraints.',
        variant: 'warning',
      });
      return;
    }

    const context = {
      projectName: formData.projectName || 'Untitled Project',
      genre: formData.genre || [],
      tone: formData.tone || [],
      targetAudience: formData.targetAudience || 'general audience',
      estimatedDuration: formData.estimatedDuration || 'unspecified',
    };

    const systemPrompt = 'You are a project planning assistant. Generate realistic project constraints that help define scope and requirements.';

    const prompt = `Generate 3-5 project constraints for a story project with these characteristics:
- Project: ${context.projectName}
- Genre: ${context.genre.join(', ')}
- Tone: ${context.tone.join(', ')}
- Target Audience: ${context.targetAudience}
- Duration: ${context.estimatedDuration}

For each constraint, provide:
1. Category (technical, creative, budget, or timeline)
2. The constraint itself (concise statement)
3. Impact (how this affects the project)

IMPORTANT: Respond ONLY with a valid JSON array.

Example format:
[
  {
    "category": "technical",
    "constraint": "Must be compatible with mobile devices",
    "impact": "Requires responsive design and optimized assets for smaller screens"
  }
]`;

    try {
      await generate({
        prompt,
        systemPrompt,
        temperature: 0.7,
        maxTokens: 1000,
      });
    } catch (error) {
      console.error('Failed to generate constraints:', error);
    }
  };

  const parseLLMConstraints = (response: string): ProjectConstraint[] => {
    console.log('🔍 [parseLLMConstraints] Raw response:', response);
    console.log('🔍 [parseLLMConstraints] Response length:', response?.length || 0);
    
    if (!validateLLMResponse(response, 'parseLLMConstraints')) {
      return [];
    }

    try {
      const trimmed = response.trim();
      console.log('🔍 [parseLLMConstraints] Trimmed response:', trimmed.substring(0, 100));
      
      // Use the utility function to parse array
      const items = parseLLMArray<any>(response, 'parseLLMConstraints');
      
      if (items.length > 0) {
        const constraints = items.map((item: any) => ({
          id: crypto.randomUUID(),
          category: (item.category?.toLowerCase() as ProjectConstraint['category']) || 'technical',
          constraint: item.constraint || item.name || '',
          impact: item.impact || item.description || '',
        }));

        const filtered = constraints.filter(c => c.constraint.trim());
        console.log('✨ [parseLLMConstraints] Extracted constraints:', filtered);
        return filtered;
      }

      // Fallback: Parse as structured text
      console.log('🔄 [parseLLMConstraints] Trying text-based parsing...');
      const constraints: ProjectConstraint[] = [];
      const lines = response.split('\n');
      
      for (const line of lines) {
        const numberedMatch = line.match(/^\d+\.\s*(?:\[?(\w+)\]?:?\s*)?(.+?)(?:\s*[-–—]\s*(.+))?$/);
        if (numberedMatch) {
          const [, category, constraint, impact] = numberedMatch;
          if (constraint && constraint.length > 10) {
            constraints.push({
              id: crypto.randomUUID(),
              category: (category?.toLowerCase() as ProjectConstraint['category']) || 'technical',
              constraint: constraint.trim(),
              impact: impact?.trim() || '',
            });
          }
        }
      }
      
      if (constraints.length > 0) {
        console.log('✨ [parseLLMConstraints] Text-based parsing successful:', constraints);
        return constraints;
      }
      
      console.warn('⚠️ [parseLLMConstraints] No constraints found in response');
    } catch (error) {
      console.error('❌ [parseLLMConstraints] Unexpected error:', error);
    }
    
    return [];
  };

  // ============================================================================
  // Style Fields
  // ============================================================================

  const handleVisualStyleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateFormData({ visualStyle: e.target.value });
  };

  const handleAudioStyleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateFormData({ audioStyle: e.target.value });
  };

  return (
    <WizardFormLayout
      title="Project Settings"
      description="Define the technical and creative parameters for your project"
    >
      {/* LLM Generation Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">AI-Assisted Generation</h3>
            <p className="text-xs text-gray-500 mt-1">
              Generate constraint suggestions based on your project characteristics
            </p>
          </div>
          <Button
            onClick={handleGenerateConstraints}
            disabled={isLoading || llmChecking || !formData.genre?.length || !llmConfigured}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            {isLoading ? 'Generating...' : llmChecking ? 'Checking...' : 'Generate Constraints'}
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
          <LLMLoadingState message="Generating project constraints..." showProgress />
        )}

        {/* Error Display */}
        {llmError && (
          <div className="space-y-3">
            <LLMErrorDisplay
              error={llmError}
              onRetry={handleGenerateConstraints}
              onDismiss={clearError}
            />
            <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                You can also add constraints manually below
              </p>
              <button
                onClick={() => {
                  clearError();
                  handleAddConstraint();
                }}
                className="text-sm text-primary hover:underline"
              >
                Add Manually
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Visual Style */}
      <FormSection title="Visual Style">
        <FormField
          label="Visual Direction"
          name="visualStyle"
          helpText="Describe the visual style and aesthetic for your project"
        >
          <Textarea
            id="visualStyle"
            value={formData.visualStyle || ''}
            onChange={handleVisualStyleChange}
            placeholder="e.g., Cinematic realism with warm color grading, inspired by Blade Runner..."
            rows={4}
          />
        </FormField>
      </FormSection>

      {/* Audio Style */}
      <FormSection title="Audio Style">
        <FormField
          label="Audio Direction"
          name="audioStyle"
          helpText="Describe the audio style and music direction for your project"
        >
          <Textarea
            id="audioStyle"
            value={formData.audioStyle || ''}
            onChange={handleAudioStyleChange}
            placeholder="e.g., Orchestral score with electronic elements, atmospheric sound design..."
            rows={4}
          />
        </FormField>
      </FormSection>

      {/* Project Constraints */}
      <FormSection
        title="Project Constraints"
        description="Define technical, creative, budget, or timeline constraints"
      >
        <div className="space-y-4">
          {constraints.map((constraint) => (
            <Card key={constraint.id} className="border-2">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-4">
                    {/* Category */}
                    <FormField label="Category" name={`constraint-${constraint.id}-category`}>
                      <Select
                        value={constraint.category}
                        onValueChange={(value) =>
                          handleUpdateConstraint(constraint.id, {
                            category: value as ProjectConstraint['category'],
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent className="z-[9999]">
                          {CONSTRAINT_CATEGORIES.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>

                    {/* Constraint */}
                    <FormField label="Constraint" name={`constraint-${constraint.id}-constraint`} required>
                      <Input
                        value={constraint.constraint}
                        onChange={(e) =>
                          handleUpdateConstraint(constraint.id, { constraint: e.target.value })
                        }
                        placeholder="State the constraint concisely"
                      />
                    </FormField>

                    {/* Impact */}
                    <FormField label="Impact" name={`constraint-${constraint.id}-impact`}>
                      <Textarea
                        value={constraint.impact}
                        onChange={(e) =>
                          handleUpdateConstraint(constraint.id, { impact: e.target.value })
                        }
                        placeholder="How does this constraint affect the project?"
                        rows={2}
                      />
                    </FormField>
                  </div>

                  {/* Delete Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveConstraint(constraint.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    aria-label="Delete constraint"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Add Constraint Button */}
          <Button
            variant="outline"
            onClick={handleAddConstraint}
            className="w-full gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Constraint
          </Button>
        </div>
      </FormSection>
    </WizardFormLayout>
  );
}
