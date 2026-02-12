import React, { useState, useCallback } from 'react';
import { useWorldBuilderSelectors } from '../../../stores/worldBuilderStore';
import { useLLMGeneration } from '../../../hooks/useLLMGeneration';

export const LLMAssistant: React.FC = () => {
  const { currentStep, worldData } = useWorldBuilderSelectors();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');

  const { isLoading, error, generate } = useLLMGeneration({
    onSuccess: (data) => {
      setResponse(data.content);
    },
    onError: (error) => {
      setResponse(`Error: ${error.message || 'Failed to get response'}`);
    },
  });

  const handleQuery = useCallback(async () => {
    if (!query.trim()) return;

    const systemPrompt = getSystemPromptForStep(currentStep, worldData);
    
    await generate({
      prompt: query,
      systemPrompt,
      temperature: 0.7,
      maxTokens: 1500,
    });
  }, [query, currentStep, worldData, generate]);

  const getSystemPromptForStep = (step: string, data: unknown): string => {
    const basePrompt = 'You are a creative world-building assistant.';
    
    switch (step) {
      case 'foundations':
        return `${basePrompt} Help the user establish the foundational elements of their world: name, genre, core concept, and tone. Current world data: ${JSON.stringify(data?.foundations || {})}`;
      case 'rules':
        return `${basePrompt} Help the user define the rules and systems of their world: magic, physics, technology, and natural laws. Current rules: ${JSON.stringify(data?.rules || {})}`;
      case 'culture':
        return `${basePrompt} Help the user develop the cultures and societies of their world: traditions, values, conflicts, and social structures. Current culture: ${JSON.stringify(data?.culture || {})}`;
      case 'locations':
        return `${basePrompt} Help the user create memorable locations: geography, landmarks, cities, and points of interest. Current locations: ${JSON.stringify(data?.locations || {})}`;
      case 'synthesis':
        return `${basePrompt} Help the user synthesize all elements into a cohesive world summary with plot hooks and story potential.`;
      default:
        return basePrompt;
    }
  };

  const getSuggestions = () => {
    switch (currentStep) {
      case 'foundations':
        return ['What makes a compelling world name?', 'How to choose the right genre?'];
      case 'rules':
        return ['Examples of magic systems', 'Physics rules for fantasy worlds'];
      case 'culture':
        return ['Creating believable societies', 'Cultural conflict ideas'];
      case 'locations':
        return ['Types of fantasy locations', 'Geography considerations'];
      case 'synthesis':
        return ['World summary tips', 'Plot hook generation'];
      default:
        return [];
    }
  };

  return (
    <div className="llm-assistant">
      <button
        className="assistant-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        AI Assistant
      </button>

      {isOpen && (
        <div className="assistant-panel">
          <h4>AI Assistant</h4>
          
          {error && (
            <div className="error-message">
              <span>{error.message || 'Error getting assistance'}</span>
            </div>
          )}

          <div className="suggestions">
            <h5>Suggestions:</h5>
            <ul>
              {getSuggestions().map((suggestion, index) => (
                <li key={index}>
                  <button onClick={() => setQuery(suggestion)}>
                    {suggestion}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask for help with world building..."
            rows={3}
          />
          <button 
            onClick={handleQuery} 
            disabled={!query.trim() || isLoading}
          >
            {isLoading ? 'Thinking...' : 'Ask AI'}
          </button>
          {response && (
            <div className="response">
              <strong>Response:</strong>
              <p>{response}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

