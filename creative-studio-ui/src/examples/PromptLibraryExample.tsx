/**
 * Prompt Library Integration Example
 * Demonstrates how to use the Prompt Library in the wizard
 */

import { useState } from 'react';
import { BookOpen, Wand2, Download } from 'lucide-react';
import { usePromptLibrary } from '../hooks/usePromptLibrary';
import { promptGenerationService } from '../services/PromptGenerationService';
import { PromptLibraryModal, usePromptLibraryModal } from '../components/wizard/PromptLibraryModal';

export function PromptLibraryExample() {
  const { categories, loading, error } = usePromptLibrary();
  const modal = usePromptLibraryModal();
  
  const [selectedPrompt, setSelectedPrompt] = useState<string>('');
  const [generatedPrompts, setGeneratedPrompts] = useState<{
    masterCoherence?: string;
    character?: string;
    environment?: string;
  }>({});

  // Handle prompt selection from library
  const handlePromptSelect = (prompt: string) => {
    setSelectedPrompt(prompt);
    ;
  };

  // Generate Master Coherence Sheet
  const handleGenerateMasterCoherence = async () => {
    try {
      const prompt = await promptGenerationService.generateMasterCoherence({
        name: 'Neon Dreams',
        genre: 'cyberpunk sci-fi',
        colors: 'electric blue, neon purple, chrome silver',
        lighting: 'neon volumetric lighting'
      });
      
      setGeneratedPrompts(prev => ({ ...prev, masterCoherence: prompt }));
      ;
    } catch (err) {
      console.error('Error generating master coherence:', err);
    }
  };

  // Generate Character Sheet
  const handleGenerateCharacter = async () => {
    try {
      const prompt = await promptGenerationService.generateCharacterSheet({
        description: 'cyberpunk hacker',
        age: '25',
        gender: 'female',
        features: 'neon tattoos, augmented eyes, leather jacket',
        style: 'realistic'
      });
      
      setGeneratedPrompts(prev => ({ ...prev, character: prompt }));
      ;
    } catch (err) {
      console.error('Error generating character:', err);
    }
  };

  // Generate Environment Sheet
  const handleGenerateEnvironment = async () => {
    try {
      const prompt = await promptGenerationService.generateEnvironmentSheet({
        locationType: 'urban',
        description: 'neon-lit cyberpunk city street',
        time: 'night',
        conditions: 'light rain',
        mood: 'mysterious and atmospheric'
      });
      
      setGeneratedPrompts(prev => ({ ...prev, environment: prompt }));
      ;
    } catch (err) {
      console.error('Error generating environment:', err);
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading Prompt Library...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center text-red-600">
          <p>Error loading library: {error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Prompt Library Integration Example
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Demonstrates how to use the Prompt Library in your wizard
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
              {Object.keys(categories).length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Categories</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">
              24
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Prompts</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1">
              {Object.keys(generatedPrompts).length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Generated</div>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Browse Library */}
            <button
              onClick={modal.open}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <BookOpen className="h-5 w-5" />
              Browse Prompt Library
            </button>

            {/* Generate Master Coherence */}
            <button
              onClick={handleGenerateMasterCoherence}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Wand2 className="h-5 w-5" />
              Generate Master Coherence
            </button>

            {/* Generate Character */}
            <button
              onClick={handleGenerateCharacter}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Wand2 className="h-5 w-5" />
              Generate Character
            </button>

            {/* Generate Environment */}
            <button
              onClick={handleGenerateEnvironment}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              <Wand2 className="h-5 w-5" />
              Generate Environment
            </button>
          </div>
        </div>

        {/* Selected Prompt */}
        {selectedPrompt && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Selected from Library
              </h2>
              <button
                onClick={() => copyToClipboard(selectedPrompt)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                <Download className="h-4 w-4" />
                Copy
              </button>
            </div>
            <pre className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg text-sm overflow-x-auto">
              {selectedPrompt}
            </pre>
          </div>
        )}

        {/* Generated Prompts */}
        {Object.keys(generatedPrompts).length > 0 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Generated Prompts
            </h2>

            {generatedPrompts.masterCoherence && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Master Coherence Sheet
                  </h3>
                  <button
                    onClick={() => copyToClipboard(generatedPrompts.masterCoherence!)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Copy
                  </button>
                </div>
                <pre className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg text-sm overflow-x-auto whitespace-pre-wrap">
                  {generatedPrompts.masterCoherence}
                </pre>
              </div>
            )}

            {generatedPrompts.character && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Character Design Sheet
                  </h3>
                  <button
                    onClick={() => copyToClipboard(generatedPrompts.character!)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Copy
                  </button>
                </div>
                <pre className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg text-sm overflow-x-auto whitespace-pre-wrap">
                  {generatedPrompts.character}
                </pre>
              </div>
            )}

            {generatedPrompts.environment && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Environment Design Sheet
                  </h3>
                  <button
                    onClick={() => copyToClipboard(generatedPrompts.environment!)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Copy
                  </button>
                </div>
                <pre className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg text-sm overflow-x-auto whitespace-pre-wrap">
                  {generatedPrompts.environment}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Categories Info */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow mt-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Available Categories
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(categories).map(([id, category]) => (
              <div key={id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  {category.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {category.description}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  {category.prompts.length} prompts
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Prompt Library Modal */}
      <PromptLibraryModal
        isOpen={modal.isOpen}
        onClose={modal.close}
        onSelectPrompt={handlePromptSelect}
        title="Browse Prompt Library"
      />
    </div>
  );
}
