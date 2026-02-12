import React, { useState, useEffect, useCallback } from 'react';
import { useWorldBuilderSelectors, useWorldBuilderActions } from '../../../../stores/worldBuilderStore';
import { StepValidator } from '../StepValidator';
import { useLLMGeneration } from '../../../../hooks/useLLMGeneration';

interface CultureData {
  societies: Array<{
    id: string;
    name: string;
    values: string[];
    customs: string[];
  }>;
  conflicts: string[];
  alliances: string[];
}

export const CultureStep: React.FC = () => {
  const { worldData } = useWorldBuilderSelectors();
  const { updateStep, markStepComplete } = useWorldBuilderActions();

  const [culture, setCulture] = useState<CultureData>(worldData?.culture || {
    societies: [],
    conflicts: [],
    alliances: [],
  });

  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (worldData?.culture) {
      setCulture(worldData.culture);
    }
  }, [worldData?.culture]);

  const { generate, error, clearError } = useLLMGeneration({
    onSuccess: (data) => {
      parseAndAddCulture(data.content);
      setIsGenerating(false);
    },
    onError: () => {
      setIsGenerating(false);
    },
  });

  const parseAndAddCulture = (content: string) => {
    // Parse the LLM response and extract cultural elements
    const lines = content.split('\n').filter(line => line.trim());
    const newCulture: CultureData = { ...culture };

    lines.forEach(line => {
      const cleanedLine = line.replace(/^[-*•]\s*/, '').trim();
      if (!cleanedLine) return;

      // Simple heuristics to categorize cultural elements
      const lowerLine = cleanedLine.toLowerCase();

      // Check if it's a society name (often contains "Kingdom", "Empire", "Clan", "Tribe", etc.)
      if (lowerLine.includes('kingdom') || lowerLine.includes('empire') || 
          lowerLine.includes('clan') || lowerLine.includes('tribe') ||
          lowerLine.includes('nation') || lowerLine.includes('civilization') ||
          lowerLine.includes('realm')) {
        const societyId = `society_${Date.now()}_${Math.random()}`;
        const societyName = cleanedLine.replace(/^["']|["']$/g, '');
        // Check if this society already exists
        if (!newCulture.societies.some(s => s.name.toLowerCase() === societyName.toLowerCase())) {
          newCulture.societies.push({
            id: societyId,
            name: societyName,
            values: [],
            customs: [],
          });
        }
      } else if (lowerLine.includes('conflict') || lowerLine.includes('war') || 
                 lowerLine.includes('tension') || lowerLine.includes('dispute')) {
        if (!newCulture.conflicts.includes(cleanedLine)) {
          newCulture.conflicts.push(cleanedLine);
        }
      } else if (lowerLine.includes('alliance') || lowerLine.includes('treaty') || 
                 lowerLine.includes('union') || lowerLine.includes('pact')) {
        if (!newCulture.alliances.includes(cleanedLine)) {
          newCulture.alliances.push(cleanedLine);
        }
      } else {
        // If no clear category, add to the first society's values or conflicts
        if (newCulture.societies.length > 0) {
          const lastSociety = newCulture.societies[newCulture.societies.length - 1];
          if (lastSociety.values.length <= lastSociety.customs.length) {
            if (!lastSociety.values.includes(cleanedLine)) {
              lastSociety.values.push(cleanedLine);
            }
          } else {
            if (!lastSociety.customs.includes(cleanedLine)) {
              lastSociety.customs.push(cleanedLine);
            }
          }
        }
      }
    });

    setCulture(newCulture);
    updateStep('culture', newCulture);
  };

  const addItem = (category: keyof Omit<CultureData, 'societies'>, item: string) => {
    if (!item.trim()) return;
    const newCulture = {
      ...culture,
      [category]: [...culture[category], item.trim()],
    };
    setCulture(newCulture);
    updateStep('culture', newCulture);
  };

  const removeItem = (category: keyof Omit<CultureData, 'societies'>, index: number) => {
    const newCulture = {
      ...culture,
      [category]: culture[category].filter((_, i) => i !== index),
    };
    setCulture(newCulture);
    updateStep('culture', newCulture);
  };

  const handleGenerateCulture = useCallback(async () => {
    const foundations = worldData?.foundations || {
      name: 'Unnamed World',
      genre: 'fantasy',
      tone: 'mysterious',
      setting: 'unknown',
      scale: 'medium' as const,
    };
    const rules = worldData?.rules || { magic: [], physics: [], technology: [], restrictions: [] };

    const systemPrompt = `You are a creative world-building assistant. Generate interesting cultural elements for a ${foundations.genre} world called "${foundations.name}".

World tone: ${foundations.tone}
World setting: ${foundations.setting}
World rules: ${JSON.stringify(rules)}

Please generate cultural elements in the following categories:
- Societies: Kingdoms, empires, clans, or other social groups with names
- Conflicts: Tensions, wars, or disputes between groups
- Alliances: Treaties, unions, or cooperative agreements
- Values: Core beliefs of societies
- Customs: Traditions and practices

Format each item on a separate line with a bullet point. Be creative and ensure consistency with the world's foundations and rules.`;

    setIsGenerating(true);
    clearError();

    await generate({
      prompt: `Generate unique cultural elements for this ${foundations.genre} world`,
      systemPrompt,
      temperature: 0.8,
      maxTokens: 1000,
    });
  }, [worldData, generate, clearError]);

  const handleSubmit = () => {
    if (culture.societies.length > 0) {
      markStepComplete('culture');
    }
  };

  return (
    <div className="step-container culture-step">
      <h2>Culture & Societies</h2>
      <p>Define the cultures, societies, and social dynamics of your world.</p>

      {error && (
        <div className="error-message">
          <span>{error.message || 'Failed to generate cultural elements'}</span>
          <button onClick={clearError} className="error-close">×</button>
        </div>
      )}

      <button 
        onClick={handleGenerateCulture} 
        className="btn-secondary generate-btn"
        disabled={isGenerating}
      >
        {isGenerating ? 'Generating...' : '✨ Generate Cultural Elements with AI'}
      </button>

      <div className="culture-sections">
        <div className="societies-section">
          <h3>Societies</h3>
          {culture.societies.map((society, index) => (
            <div key={society.id} className="society-item">
              <div className="society-header">
                <span className="society-name">{society.name}</span>
                <button onClick={() => setCulture({
                  ...culture,
                  societies: culture.societies.filter((_, i) => i !== index),
                })}>×</button>
              </div>
              <div className="society-details">
                <span className="values-label">Values: {society.values.join(', ')}</span>
                <span className="customs-label">Customs: {society.customs.join(', ')}</span>
              </div>
            </div>
          ))}
          <input
            type="text"
            placeholder="Add society"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                const newSociety = {
                  id: `society_${Date.now()}`,
                  name: (e.target as HTMLInputElement).value,
                  values: [],
                  customs: [],
                };
                setCulture({
                  ...culture,
                  societies: [...culture.societies, newSociety],
                });
                updateStep('culture', {
                  ...culture,
                  societies: [...culture.societies, newSociety],
                });
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
