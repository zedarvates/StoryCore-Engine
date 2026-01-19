/**
 * Prompt Library Browser Component
 * Example React component for browsing and using the prompt library
 */

import React, { useState, useEffect } from 'react';
import { promptLibrary, PromptTemplate, PromptCategory } from './PromptLibraryService';

interface PromptLibraryBrowserProps {
  onSelectPrompt?: (prompt: string) => void;
}

export const PromptLibraryBrowser: React.FC<PromptLibraryBrowserProps> = ({ 
  onSelectPrompt 
}) => {
  const [categories, setCategories] = useState<Record<string, PromptCategory>>({});
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<PromptTemplate | null>(null);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [generatedPrompt, setGeneratedPrompt] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Load categories on mount
  useEffect(() => {
    promptLibrary.getCategories().then(setCategories);
  }, []);

  // Load prompts when category changes
  useEffect(() => {
    if (selectedCategory) {
      promptLibrary.getPromptsByCategory(selectedCategory).then(setPrompts);
    }
  }, [selectedCategory]);

  // Handle search
  const handleSearch = async () => {
    if (searchQuery.trim()) {
      const results = await promptLibrary.search(searchQuery);
      setPrompts(results);
      setSelectedCategory(null);
    }
  };

  // Handle prompt selection
  const handleSelectPrompt = (prompt: PromptTemplate) => {
    setSelectedPrompt(prompt);
    
    // Initialize variable values with defaults or empty strings
    const initialValues: Record<string, string> = {};
    Object.entries(prompt.variables).forEach(([key, variable]) => {
      initialValues[key] = variable.default?.toString() || '';
    });
    setVariableValues(initialValues);
  };

  // Generate prompt with current values
  const handleGenerate = () => {
    if (!selectedPrompt) return;

    const validation = promptLibrary.validateValues(selectedPrompt, variableValues);
    
    if (!validation.valid) {
      alert(`Validation errors:\n${validation.errors.join('\n')}`);
      return;
    }

    const filled = promptLibrary.fillPrompt(selectedPrompt, variableValues);
    setGeneratedPrompt(filled);
    
    if (onSelectPrompt) {
      onSelectPrompt(filled);
    }
  };

  // Use random example
  const handleUseExample = () => {
    if (!selectedPrompt) return;
    
    const example = promptLibrary.getRandomExample(selectedPrompt);
    if (example) {
      const stringValues: Record<string, string> = {};
      Object.entries(example).forEach(([key, value]) => {
        stringValues[key] = String(value);
      });
      setVariableValues(stringValues);
    }
  };

  return (
    <div className="prompt-library-browser">
      {/* Search Bar */}
      <div className="search-section">
        <input
          type="text"
          placeholder="Search prompts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button onClick={handleSearch}>Search</button>
      </div>

      <div className="browser-layout">
        {/* Categories Sidebar */}
        <div className="categories-sidebar">
          <h3>Categories</h3>
          {Object.entries(categories).map(([id, category]) => (
            <div
              key={id}
              className={`category-item ${selectedCategory === id ? 'active' : ''}`}
              onClick={() => setSelectedCategory(id)}
            >
              <h4>{category.name}</h4>
              <p>{category.description}</p>
            </div>
          ))}
        </div>

        {/* Prompts List */}
        <div className="prompts-list">
          <h3>Prompts</h3>
          {prompts.map((prompt) => (
            <div
              key={prompt.id}
              className={`prompt-item ${selectedPrompt?.id === prompt.id ? 'active' : ''}`}
              onClick={() => handleSelectPrompt(prompt)}
            >
              <h4>{prompt.name}</h4>
              <p>{prompt.description}</p>
              <div className="tags">
                {prompt.tags.map(tag => (
                  <span key={tag} className="tag">{tag}</span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Prompt Editor */}
        {selectedPrompt && (
          <div className="prompt-editor">
            <h3>{selectedPrompt.name}</h3>
            <p>{selectedPrompt.description}</p>

            {/* Variables Form */}
            <div className="variables-form">
              <h4>Variables</h4>
              {Object.entries(selectedPrompt.variables).map(([key, variable]) => (
                <div key={key} className="variable-field">
                  <label>
                    {key} {variable.required && <span className="required">*</span>}
                  </label>
                  {variable.description && (
                    <p className="variable-description">{variable.description}</p>
                  )}
                  
                  {variable.type === 'enum' && variable.options ? (
                    <select
                      value={variableValues[key] || ''}
                      onChange={(e) => setVariableValues({
                        ...variableValues,
                        [key]: e.target.value
                      })}
                    >
                      <option value="">Select...</option>
                      {variable.options.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={variableValues[key] || ''}
                      onChange={(e) => setVariableValues({
                        ...variableValues,
                        [key]: e.target.value
                      })}
                      placeholder={variable.examples?.[0] || ''}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="actions">
              {selectedPrompt.examples && selectedPrompt.examples.length > 0 && (
                <button onClick={handleUseExample}>Use Random Example</button>
              )}
              <button onClick={handleGenerate} className="primary">
                Generate Prompt
              </button>
            </div>

            {/* Generated Prompt */}
            {generatedPrompt && (
              <div className="generated-prompt">
                <h4>Generated Prompt</h4>
                <pre>{generatedPrompt}</pre>
                <button onClick={() => navigator.clipboard.writeText(generatedPrompt)}>
                  Copy to Clipboard
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
