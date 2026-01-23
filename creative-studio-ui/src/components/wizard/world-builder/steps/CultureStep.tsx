import React, { useState, useEffect } from 'react';
import { useWorldBuilderSelectors, useWorldBuilderActions } from '../../../../stores/worldBuilderStore';
import { StepValidator } from '../StepValidator';

export const CultureStep: React.FC = () => {
  const { worldData } = useWorldBuilderSelectors();
  const { updateStep, markStepComplete } = useWorldBuilderActions();

  const [culture, setCulture] = useState(worldData?.culture || {
    societies: [],
    conflicts: [],
    alliances: [],
  });

  useEffect(() => {
    if (worldData?.culture) {
      setCulture(worldData.culture);
    }
  }, [worldData?.culture]);

  const addItem = (category: keyof typeof culture, item: string) => {
    if (!item.trim()) return;
    const newCulture = {
      ...culture,
      [category]: [...culture[category], item.trim()],
    };
    setCulture(newCulture);
    updateStep('culture', newCulture);
  };

  const removeItem = (category: keyof typeof culture, index: number) => {
    const newCulture = {
      ...culture,
      [category]: culture[category].filter((_, i) => i !== index),
    };
    setCulture(newCulture);
    updateStep('culture', newCulture);
  };

  const handleSubmit = () => {
    if (culture.societies.length > 0) {
      markStepComplete('culture');
    }
  };

  return (
    <div className="step-container culture-step">
      <h2>Culture & Societies</h2>
      <p>Define the cultures, societies, and social dynamics of your world.</p>

      <div className="culture-sections">
        <div className="societies-section">
          <h3>Societies</h3>
          <div className="item-list">
            {culture.societies.map((society, index) => (
              <div key={index} className="item">
                <span>{society}</span>
                <button onClick={() => removeItem('societies', index)}>×</button>
              </div>
            ))}
          </div>
          <input
            type="text"
            placeholder="Add society"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                addItem('societies', (e.target as HTMLInputElement).value);
                (e.target as HTMLInputElement).value = '';
              }
            }}
          />
        </div>

        <div className="conflicts-section">
          <h3>Conflicts</h3>
          <div className="item-list">
            {culture.conflicts.map((conflict, index) => (
              <div key={index} className="item">
                <span>{conflict}</span>
                <button onClick={() => removeItem('conflicts', index)}>×</button>
              </div>
            ))}
          </div>
          <input
            type="text"
            placeholder="Add conflict"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                addItem('conflicts', (e.target as HTMLInputElement).value);
                (e.target as HTMLInputElement).value = '';
              }
            }}
          />
        </div>

        <div className="alliances-section">
          <h3>Alliances</h3>
          <div className="item-list">
            {culture.alliances.map((alliance, index) => (
              <div key={index} className="item">
                <span>{alliance}</span>
                <button onClick={() => removeItem('alliances', index)}>×</button>
              </div>
            ))}
          </div>
          <input
            type="text"
            placeholder="Add alliance"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                addItem('alliances', (e.target as HTMLInputElement).value);
                (e.target as HTMLInputElement).value = '';
              }
            }}
          />
        </div>
      </div>

      <button onClick={handleSubmit} className="btn-primary">
        Save Culture
      </button>

      <StepValidator step="culture" />
    </div>
  );
};