import React, { useState, useEffect } from 'react';
import { useWorldBuilderSelectors, useWorldBuilderActions } from '../../../../stores/worldBuilderStore';
import { StepValidator } from '../StepValidator';

export const RulesStep: React.FC = () => {
  const { worldData } = useWorldBuilderSelectors();
  const { updateStep, markStepComplete } = useWorldBuilderActions();

  const [rules, setRules] = useState(worldData?.rules || {
    physics: [],
    magic: [],
    technology: [],
    restrictions: [],
  });

  useEffect(() => {
    if (worldData?.rules) {
      setRules(worldData.rules);
    }
  }, [worldData?.rules]);

  const addRule = (category: keyof typeof rules, rule: string) => {
    if (!rule.trim()) return;
    const newRules = {
      ...rules,
      [category]: [...rules[category], rule.trim()],
    };
    setRules(newRules);
    updateStep('rules', newRules);
  };

  const removeRule = (category: keyof typeof rules, index: number) => {
    const newRules = {
      ...rules,
      [category]: rules[category].filter((_, i) => i !== index),
    };
    setRules(newRules);
    updateStep('rules', newRules);
  };

  const handleSubmit = () => {
    if (rules.physics.length > 0) {
      markStepComplete('rules');
    }
  };

  const RuleInput: React.FC<{ category: keyof typeof rules; label: string }> = ({ category, label }) => (
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