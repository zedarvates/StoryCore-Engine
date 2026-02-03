/**
 * Enhanced LLM Assistant with Confucian Reasoning
 * 
 * Integrates MultiModelManager, PromptEngineeringEngine, and ResponseParser
 * to provide reasoning-mode responses with thinking/summary format.
 */

import React, { useState } from 'react';
import { useWorldBuilderSelectors } from '../../../stores/worldBuilderStore';
import { useEnhancedLLM } from '../../../hooks/useEnhancedLLM';
import { ReasoningDisplay, ModelSelector } from '../../../components/llm';

interface EnhancedLLMAssistantProps {
  className?: string;
}

export const EnhancedLLMAssistant: React.FC<EnhancedLLMAssistantProps> = ({ 
  className = '' 
}) => {
  const { currentStep } = useWorldBuilderSelectors();
  
  // State
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [showThinking, setShowThinking] = useState(false);
  
  // Enhanced LLM hook
  const {
    isLoading,
    error,
    response,
    availableModels,
    currentModel,
    reasoningMode,
    generate,
    setCurrentModel,
    setReasoningMode,
    clearError,
  } = useEnhancedLLM({ taskType: 'storytelling' });

  const handleQuery = async () => {
    if (!query.trim()) return;
    await generate(query, getSystemPromptForStep(currentStep));
  };

  const getSuggestions = () => {
    switch (currentStep) {
      case 'foundations':
        return [
          'What makes a compelling world name?',
          'How to choose the right genre?',
          'Help me define the core concept of my world',
        ];
      case 'rules':
        return [
          'Examples of magic systems',
          'Physics rules for fantasy worlds',
          'How to create consistent world rules',
        ];
      case 'culture':
        return [
          'Creating believable societies',
          'Cultural conflict ideas',
          'How to develop unique cultural traditions',
        ];
      case 'locations':
        return [
          'Types of fantasy locations',
          'Geography considerations',
          'How to design memorable locations',
        ];
      case 'synthesis':
        return [
          'World summary tips',
          'Plot hook generation',
          'How to tie everything together',
        ];
      default:
        return ['Help me with world building'];
    }
  };

  const getSystemPromptForStep = (step: string): string => {
    const basePrompt = 'You are a creative world-building assistant following Confucian principles.';
    
    switch (step) {
      case 'foundations':
        return `${basePrompt} Help the user establish the foundational elements of their world: name, genre, core concept, and tone.`;
      case 'rules':
        return `${basePrompt} Help the user define the rules and systems of their world: magic, physics, technology, and natural laws.`;
      case 'culture':
        return `${basePrompt} Help the user develop the cultures and societies of their world: traditions, values, conflicts, and social structures.`;
      case 'locations':
        return `${basePrompt} Help the user create memorable locations: geography, landmarks, cities, and points of interest.`;
      case 'synthesis':
        return `${basePrompt} Help the user synthesize all elements into a cohesive world summary with plot hooks and story potential.`;
      default:
        return basePrompt;
    }
  };

  return (
    <div className={`enhanced-llm-assistant ${className}`}>
      <button
        className="assistant-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen ? "true" : "false"}
      >
        🧠 AI Assistant {reasoningMode && '(Reasoning Mode)'}
      </button>

      {isOpen && (
        <div className="assistant-panel">
          <div className="assistant-header">
            <h4>AI World Building Assistant</h4>
            <label className="reasoning-toggle">
              <input
                type="checkbox"
                checked={reasoningMode}
                onChange={(e) => setReasoningMode(e.target.checked)}
              />
              <span>Reasoning Mode</span>
            </label>
          </div>

          {/* Model Selection */}
          {availableModels.length > 0 && (
            <ModelSelector
              currentModel={currentModel}
              availableModels={availableModels}
              onModelChange={setCurrentModel}
              taskType="storytelling"
              className="assistant-model-selector"
            />
          )}

          {/* Suggestions */}
          <div className="suggestions">
            <h5>Quick Suggestions:</h5>
            <div className="suggestion-buttons">
              {getSuggestions().map((suggestion, index) => (
                <button
                  key={index}
                  className="suggestion-button"
                  onClick={() => setQuery(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          {/* Query Input */}
          <div className="query-section">
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask for help with world building..."
              rows={3}
              className="query-input"
            />
            <button
              onClick={handleQuery}
              disabled={!query.trim() || isLoading}
              className="ask-button"
            >
              {isLoading ? 'Thinking...' : 'Ask AI'}
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              <span>{error}</span>
              <button onClick={clearError} className="error-close">×</button>
            </div>
          )}

          {/* Response Display */}
          {response && (
            <div className="response-section">
              <ReasoningDisplay
                response={response}
                showThinking={showThinking}
                onToggleThinking={() => setShowThinking(!showThinking)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// CSS styles
const styles = `
.enhanced-llm-assistant {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.assistant-toggle {
  padding: 0.75rem 1rem;
  background: var(--primary-color, #4a90e2);
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease;
}

.assistant-toggle:hover {
  background: var(--primary-hover, #357abd);
}

.assistant-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  background: var(--bg-secondary, #f8f9fa);
  border-radius: 8px;
  border: 1px solid var(--border-color, #e0e0e0);
}

.assistant-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--border-color, #e0e0e0);
}

.assistant-header h4 {
  margin: 0;
  font-size: 1.125rem;
  color: var(--text-primary, #333);
}

.reasoning-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  cursor: pointer;
}

.reasoning-toggle input {
  cursor: pointer;
}

.assistant-model-selector {
  margin-bottom: 0.5rem;
}

.suggestions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.suggestions h5 {
  margin: 0;
  font-size: 0.875rem;
  color: var(--text-secondary, #666);
}

.suggestion-buttons {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.suggestion-button {
  padding: 0.5rem 0.75rem;
  background: white;
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 4px;
  text-align: left;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.suggestion-button:hover {
  background: var(--hover-bg, #f0f4f8);
  border-color: var(--primary-color, #4a90e2);
}

.query-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.query-input {
  padding: 0.75rem;
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 4px;
  font-size: 0.875rem;
  font-family: inherit;
  resize: vertical;
}

.query-input:focus {
  outline: 2px solid var(--primary-color, #4a90e2);
  outline-offset: 0;
}

.ask-button {
  padding: 0.75rem 1rem;
  background: var(--primary-color, #4a90e2);
  color: white;
  border: none;
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease;
}

.ask-button:hover:not(:disabled) {
  background: var(--primary-hover, #357abd);
}

.ask-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: var(--error-bg, #fee);
  border: 1px solid var(--error-border, #fcc);
  border-radius: 4px;
  color: var(--error-text, #c33);
  font-size: 0.875rem;
}

.error-icon {
  font-size: 1rem;
}

.response-section {
  margin-top: 0.5rem;
}
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleId = 'enhanced-llm-assistant-styles';
  if (!document.getElementById(styleId)) {
    const styleElement = document.createElement('style');
    styleElement.id = styleId;
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
  }
}
