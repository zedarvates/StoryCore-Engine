import React, { useState } from 'react';
import { useWorldBuilderSelectors } from '../../../stores/worldBuilderStore';

export const LLMAssistant: React.FC = () => {
  const { currentStep, worldData } = useWorldBuilderSelectors();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');

  const handleQuery = async () => {
    if (!query.trim()) return;

    setResponse('Thinking...');
    try {
      // TODO: Integrate with LLMAugmentationService
      await new Promise(resolve => setTimeout(resolve, 1000)); // Mock
      setResponse(`Mock response for: ${query}`);
    } catch (error) {
      setResponse('Error getting assistance');
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
          <button onClick={handleQuery} disabled={!query.trim()}>
            Ask AI
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