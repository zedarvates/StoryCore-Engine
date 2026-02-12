import React, { useState, useEffect, useCallback } from 'react';
import { useWorldBuilderSelectors, useWorldBuilderActions } from '../../../../stores/worldBuilderStore';
import { StepValidator } from '../StepValidator';
import { useLLMGeneration } from '../../../../hooks/useLLMGeneration';

interface WorldRules {
  physics: string[];
  magic: string[];
  technology: string[];
  restrictions: string[];
}

export const RulesStep: React.FC = () => {
  const { worldData } = useWorldBuilderSelectors();
  const { updateStep, markStepComplete } = useWorldBuilderActions();

  const [rules, setRules] = useState<WorldRules>(worldData?.rules || {
    physics: [],
    magic: [],
    technology: [],
    restrictions: [],
  });

  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (worldData?.rules) {
      setRules(worldData.rules);
    }
  }, [worldData?.rules]);

  const { generate, error, clearError } = useLLMGeneration({
    onSuccess: (data) => {
      parseAndAddRules(data.content);
      setIsGenerating(false);
    },
    onError: () => {
      setIsGenerating(false);
    },
  });

  const parseAndAddRules = (content: string) => {
    // Parse the LLM response and extract rules by category
    const lines = content.split('\n').filter(line => line.trim());
    const newRules: WorldRules = { ...rules };

    lines.forEach(line => {
      const cleanedLine = line.replace(/^[-*•]\s*/, '').trim();
      if (!cleanedLine) return;

      // Simple heuristics to categorize rules
      const lowerLine = cleanedLine.toLowerCase();
      
      if (lowerLine.includes('magic') || lowerLine.includes('spell') || lowerLine.includes('mana') || lowerLine.includes('supernatural')) {
        if (!newRules.magic.includes(cleanedLine)) {
          newRules.magic.push(cleanedLine);
        }
      } else if (lowerLine.includes('physics') || lowerLine.includes('gravity') || lowerLine.includes('time') || lowerLine.includes('space')) {
        if (!newRules.physics.includes(cleanedLine)) {
          newRules.physics.push(cleanedLine);
        }
      } else if (lowerLine.includes('tech') || lowerLine.includes('machine') || lowerLine.includes('science')) {
        if (!newRules.technology.includes(cleanedLine)) {
          newRules.technology.push(cleanedLine);
        }
      } else if (lowerLine.includes('limit') || lowerLine.includes('cannot') || lowerLine.includes('forbidden') || lowerLine.includes('restriction')) {
        if (!newRules.restrictions.includes(cleanedLine)) {
          newRules.restrictions.push(cleanedLine);
        }
      } else {
        // Default to physics if no clear category
        if (!newRules.physics.includes(cleanedLine)) {
          newRules.physics.push(cleanedLine);
        }
      }
    });

    setRules(newRules);
    updateStep('rules', newRules);
  };

  const addRule = (category: keyof WorldRules, rule: string) => {
    if (!rule.trim()) return;
    const newRules = {
      ...rules,
      [category]: [...rules[category], rule.trim()],
    };
    setRules(newRules);
    updateStep('rules', newRules);
  };

  const removeRule = (category: keyof WorldRules, index: number) => {
    const newRules = {
      ...rules,
      [category]: rules[category].filter((_, i) => i !== index),
    };
    setRules(newRules);
    updateStep('rules', newRules);
  };

  const handleGenerateRules = useCallback(async () => {
    const foundations = worldData?.foundations || {
      name: 'Unnamed World',
      genre: 'fantasy',
      tone: 'mysterious',
      setting: 'unknown',
      scale: 'medium' as const,
    };
    const genre = foundations.genre;
    const coreConcept = worldData?.foundations?.tone || 'a mysterious world';

    const systemPrompt = `You are a creative world-building assistant. Generate interesting and unique rules for a ${genre} world called "${foundations.name}".

Core concept: ${coreConcept}

Please generate rules in the following categories:
- Physics: Fundamental laws of nature
- Magic: If applicable, how magic works
- Technology: Level and type of technology
- Restrictions: Limitations and boundaries

Format each rule on a separate line with a bullet point. Be creative and ensure consistency with the world's foundations.`;

    setIsGenerating(true);
    clearError();

    await generate({
      prompt: `Generate unique and compelling rules for this ${genre} world`,
      systemPrompt,
      temperature: 0.8,
      maxTokens: 1000,
    });
  }, [worldData, generate, clearError]);

  const handleSubmit = () => {
    if (rules.physics.length > 0) {
      markStepComplete('rules');
    }
  };

  const RuleInput: React.FC<{ category: keyof WorldRules; label: string }> = ({ category, label }) => (
    <div className="rule-category">
      <h4>{label}</h4>
      <div className="rule-list">
        {rules[category].map((rule, index) => (
          <div key={index} className="rule-item">
            <span>{rule}</span>
            <button
              onClick={() => removeRule(category, index)}
              className="remove-rule"
              aria-label={`Remove ${rule}`}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <div className="add-rule">
        <input
          type="text"
          placeholder={`Add ${label.toLowerCase()} rule`}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              addRule(category, (e.target as HTMLInputElement).value);
              (e.target as HTMLInputElement).value = '';
            }
          }}
        />
        <button
          onClick={(e) => {
            const input = e.currentTarget.previousElementSibling as HTMLInputElement;
            addRule(category, input.value);
            input.value = '';
          }}
        >
          Add
        </button>
      </div>
    </div>
  );

  return (
    <div className="step-container rules-step">
      <h2>World Rules</h2>
      <p>Define the fundamental rules that govern your world.</p>

      {error && (
        <div className="error-message">
          <span>{error.message || 'Failed to generate rules'}</span>
          <button onClick={clearError} className="error-close">×</button>
        </div>
      )}

      <button 
        onClick={handleGenerateRules} 
        className="btn-secondary generate-btn"
        disabled={isGenerating}
      >
        {isGenerating ? 'Generating...' : '✨ Generate Rules with AI'}
      </button>

      <div className="rules-grid">
        <RuleInput category="physics" label="Physics" />
        <RuleInput category="magic" label="Magic" />
        <RuleInput category="technology" label="Technology" />
        <RuleInput category="restrictions" label="Restrictions" />
      </div>

      <button onClick={handleSubmit} className="btn-primary">
        Save Rules
      </button>

      <StepValidator step="rules" />
    </div>
  );
};
