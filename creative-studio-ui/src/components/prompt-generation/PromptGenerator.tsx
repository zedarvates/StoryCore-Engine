/**
 * Prompt Generator Component
 * Interface for generating prompts for images and videos
 */

import React, { useState, useEffect } from 'react';
import { promptLibrary, PromptTemplate } from '@/library/PromptLibraryService';
import './PromptGenerator.css';

interface PromptGeneratorProps {
  onGenerate: (prompt: string) => void;
}

export const PromptGenerator: React.FC<PromptGeneratorProps> = ({ onGenerate }) => {
  const [categories, setCategories] = useState<Record<string, unknown>>({});
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<PromptTemplate | null>(null);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [generatedPrompt, setGeneratedPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load categories on mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const cats = await promptLibrary.getCategories();
        setCategories(cats);
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to load categories:', error);
        setIsLoading(false);
      }
    };
    loadCategories();
  }, []);

  // Load prompts when category changes
  useEffect(() => {
    const loadPrompts = async () => {
      if (selectedCategory) {
        setIsLoading(true);
        try {
          const loadedPrompts = await promptLibrary.getPromptsByCategory(selectedCategory);
          setPrompts(loadedPrompts);
        } catch (error) {
          console.error('Failed to load prompts:', error);
        }
        setIsLoading(false);
      }
    };
    loadPrompts();
  }, [selectedCategory]);

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
    onGenerate(filled);
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
    <div className="prompt-generator-container card">
      <h2 className="text-xl font-bold mb-4">Generate Prompts</h2>

      {isLoading ? (
        <div className="loading-spinner skeleton">Loading...</div>
      ) : (
        <div className="prompt-generator-layout flex">
          {/* Categories Sidebar */}
          <div className="categories-sidebar w-64 border-r border-border pr-4 custom-scrollbar">
            <h3 className="font-semibold mb-2">Categories</h3>
            <div className="space-y-2">
              {Object.entries(categories).map(([id, category]) => (
                <div
                  key={id}
                  className={`category-item p-2 rounded cursor-pointer card-hover ${selectedCategory === id ? 'bg-accent text-accent-foreground' : ''}`}
                  onClick={() => setSelectedCategory(id)}
                >
                  <h4 className="font-medium">{category.name}</h4>
                  <p className="text-sm text-muted-foreground">{category.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Prompts List */}
          <div className="prompts-list flex-1 ml-6 custom-scrollbar">
            <h3 className="font-semibold mb-2">Prompts</h3>
            {prompts.length === 0 ? (
              <p className="text-muted-foreground">Select a category to view prompts</p>
            ) : (
              <div className="space-y-2">
                {prompts.map((prompt) => (
                  <div
                    key={prompt.id}
                    className={`prompt-item p-3 border rounded cursor-pointer card-hover ${selectedPrompt?.id === prompt.id ? 'border-accent bg-accent/10' : ''}`}
                    onClick={() => handleSelectPrompt(prompt)}
                  >
                    <h4 className="font-medium">{prompt.name}</h4>
                    <p className="text-sm text-muted-foreground">{prompt.description}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {prompt.tags.map(tag => (
                        <span key={tag} className="px-2 py-1 bg-secondary text-secondary-foreground rounded text-xs badge">{tag}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Prompt Editor */}
          {selectedPrompt && (
            <div className="prompt-editor ml-6 w-96 card">
              <h3 className="font-semibold mb-2">{selectedPrompt.name}</h3>
              <p className="text-sm text-muted-foreground mb-4">{selectedPrompt.description}</p>

              {/* Variables Form */}
              <div className="variables-form space-y-3 mb-4">
                <h4 className="font-medium">Variables</h4>
                {Object.entries(selectedPrompt.variables).map(([key, variable]) => (
                  <div key={key} className="variable-field">
                    <label className="block text-sm font-medium mb-1">
                      {key} {variable.required && <span className="text-danger">*</span>}
                    </label>
                    {variable.description && (
                      <p className="text-xs text-muted-foreground mb-1">{variable.description}</p>
                    )}

                    {variable.type === 'enum' && variable.options ? (
                      <select
                        value={variableValues[key] || ''}
                        onChange={(e) => setVariableValues({
                          ...variableValues,
                          [key]: e.target.value
                        })}
                        className="w-full p-2 border rounded text-sm bg-background text-foreground"
                        aria-label={key}
                        title={key}
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
                        className="w-full p-2 border rounded text-sm bg-background text-foreground"
                        aria-label={key}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="actions space-y-2 mb-4">
                {selectedPrompt.examples && selectedPrompt.examples.length > 0 && (
                  <button
                    onClick={handleUseExample}
                    className="w-full p-2 btn-secondary btn text-sm"
                  >
                    Use Random Example
                  </button>
                )}
                <button
                  onClick={handleGenerate}
                  className="w-full p-2 btn-primary btn text-sm"
                >
                  Generate Prompt
                </button>
              </div>

              {/* Generated Prompt */}
              {generatedPrompt && (
                <div className="generated-prompt">
                  <h4 className="font-medium mb-1">Generated Prompt</h4>
                  <pre className="p-2 bg-secondary text-secondary-foreground rounded text-xs overflow-auto max-h-32">{generatedPrompt}</pre>
                  <button
                    onClick={() => navigator.clipboard.writeText(generatedPrompt)}
                    className="w-full p-2 btn-secondary btn text-sm mt-2"
                  >
                    Copy to Clipboard
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

