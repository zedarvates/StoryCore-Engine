import React, { useState, useEffect } from 'react';
import { useWorldBuilderSelectors, useWorldBuilderActions } from '../../../../stores/worldBuilderStore';
import { StepValidator } from '../StepValidator';

export const SynthesisStep: React.FC = () => {
  const { worldData } = useWorldBuilderSelectors();
  const { updateStep, markStepComplete } = useWorldBuilderActions();

  const [synthesis, setSynthesis] = useState(worldData?.synthesis || {
    plotHooks: [],
    keyEvents: [],
    themes: [],
    summary: '',
  });

  useEffect(() => {
    if (worldData?.synthesis) {
      setSynthesis(worldData.synthesis);
    }
  }, [worldData?.synthesis]);

  const addItem = (category: keyof typeof synthesis, item: string) => {
    if (!item.trim() || !Array.isArray(synthesis[category])) return;
    const newSynthesis = {
      ...synthesis,
      [category]: [...synthesis[category], item.trim()],
    };
    setSynthesis(newSynthesis);
    updateStep('synthesis', newSynthesis);
  };

  const removeItem = (category: keyof typeof synthesis, index: number) => {
    if (!Array.isArray(synthesis[category])) return;
    const newSynthesis = {
      ...synthesis,
      [category]: synthesis[category].filter((_, i) => i !== index),
    };
    setSynthesis(newSynthesis);
    updateStep('synthesis', newSynthesis);
  };

  const updateSummary = (summary: string) => {
    const newSynthesis = { ...synthesis, summary };
    setSynthesis(newSynthesis);
    updateStep('synthesis', newSynthesis);
  };

  const handleSubmit = () => {
    if (synthesis.summary && synthesis.themes.length > 0) {
      markStepComplete('synthesis');
    }
  };

  return (
    <div className="step-container synthesis-step">
      <h2>World Synthesis</h2>
      <p>Synthesize all elements into a cohesive world summary.</p>

      <div className="synthesis-sections">
        <div className="summary-section">
          <h3>World Summary</h3>
          <textarea
            value={synthesis.summary}
            onChange={(e) => updateSummary(e.target.value)}
            placeholder="Write a comprehensive summary of your world"
            rows={6}
          />
        </div>

        <div className="themes-section">
          <h3>Themes</h3>
          <div className="item-list">
            {synthesis.themes.map((theme, index) => (
              <div key={index} className="item">
                <span>{theme}</span>
                <button onClick={() => removeItem('themes', index)}>×</button>
              </div>
            ))}
          </div>
          <input
            type="text"
            placeholder="Add theme"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                addItem('themes', (e.target as HTMLInputElement).value);
                (e.target as HTMLInputElement).value = '';
              }
            }}
          />
        </div>

        <div className="plot-hooks-section">
          <h3>Plot Hooks</h3>
          <div className="item-list">
            {synthesis.plotHooks.map((hook, index) => (
              <div key={index} className="item">
                <span>{hook}</span>
                <button onClick={() => removeItem('plotHooks', index)}>×</button>
              </div>
            ))}
          </div>
          <input
            type="text"
            placeholder="Add plot hook"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                addItem('plotHooks', (e.target as HTMLInputElement).value);
                (e.target as HTMLInputElement).value = '';
              }
            }}
          />
        </div>

        <div className="key-events-section">
          <h3>Key Events</h3>
          <div className="item-list">
            {synthesis.keyEvents.map((event, index) => (
              <div key={index} className="item">
                <span>{event}</span>
                <button onClick={() => removeItem('keyEvents', index)}>×</button>
              </div>
            ))}
          </div>
          <input
            type="text"
            placeholder="Add key event"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                addItem('keyEvents', (e.target as HTMLInputElement).value);
                (e.target as HTMLInputElement).value = '';
              }
            }}
          />
        </div>
      </div>

      <button onClick={handleSubmit} className="btn-primary">
        Complete World Building
      </button>

      <StepValidator step="synthesis" />
    </div>
  );
};