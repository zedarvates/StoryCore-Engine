import React, { useState } from 'react';
import { Wand2, Loader2 } from 'lucide-react';
import { useEnhancedLLM } from '../../../hooks/useEnhancedLLM';
import { ModelSelector, ReasoningDisplay } from '../../llm';

interface EnhancedCharacterAssistantProps {
  worldContext?: any;
  characterData: {
    name?: string;
    gender?: string;
    age?: number;
    personality?: string[];
    appearance?: string;
    backstory?: string;
    abilities?: string[];
  };
  onSuggestion: (field: string, value: any) => void;
  suggestionType: 'name' | 'personality' | 'appearance' | 'backstory' | 'abilities';
}

export const EnhancedCharacterAssistant: React.FC<EnhancedCharacterAssistantProps> = ({
  worldContext,
  characterData,
  onSuggestion,
  suggestionType
}) => {
  const {
    isLoading,
    error,
    response,
    generate,
    currentModel,
    setCurrentModel,
    availableModels,
    reasoningMode,
    setReasoningMode
  } = useEnhancedLLM({ taskType: 'storytelling' });

  const [showResponse, setShowResponse] = useState(false);

  const getGenreString = (genre: any): string => {
    if (!genre) return 'fantastique';
    if (typeof genre === 'string') return genre;
    if (Array.isArray(genre)) return genre.join(', ');
    return String(genre);
  };

  const generateSuggestion = async () => {
    let userQuery = '';
    let systemPrompt = '';

    const genreString = getGenreString(worldContext?.genre);
    const worldDesc = worldContext?.description || 'monde fantastique';
    const rulesString = worldContext?.rules && Array.isArray(worldContext.rules)
      ? worldContext.rules.map((r: any) => r.rule).join(', ')
      : 'magie et technologie';

    switch (suggestionType) {
      case 'name':
        userQuery = `Génère 5 noms de personnages originaux et immersifs pour un monde ${genreString}.`;
        systemPrompt = `Tu es un expert en création de personnages pour des histoires ${genreString}. 
Génère des noms qui sont:
- Cohérents avec le genre et l'ambiance du monde
- Faciles à prononcer mais mémorables
- Culturellement appropriés au contexte

Contexte du monde: ${worldDesc}

Format de réponse: nom1, nom2, nom3, nom4, nom5`;
        break;

      case 'personality':
        userQuery = `Décris 4 traits de personnalité complexes et intéressants pour un personnage dans un monde ${genreString}.`;
        systemPrompt = `Tu es un expert en psychologie des personnages pour des histoires ${genreString}.
Génère des traits qui sont:
- Complexes et nuancés (pas juste "bon" ou "méchant")
- Cohérents avec l'atmosphère du monde (${worldContext?.atmosphere || 'mystérieux'})
- Créent des opportunités de conflit et de croissance

Format de réponse: trait1, trait2, trait3, trait4`;
        break;

      case 'appearance':
        userQuery = `Décris l'apparence physique d'un personnage ${characterData.gender || 'sans genre défini'} nommé ${characterData.name || 'sans nom'} dans un monde ${genreString}.`;
        systemPrompt = `Tu es un expert en description visuelle pour des histoires ${genreString}.
Crée une description qui:
- Est visuelle et détaillée
- Reflète la personnalité: ${characterData.personality?.join(', ') || 'à définir'}
- Est cohérente avec le monde: ${worldDesc}
- Inclut des détails mémorables

Format de réponse: Description en 2-3 phrases`;
        break;

      case 'backstory':
        userQuery = `Écris une histoire personnelle cohérente pour un personnage nommé ${characterData.name || 'sans nom'}, ${characterData.gender || 'genre non défini'}, âge ${characterData.age || 25}, avec les traits ${characterData.personality?.join(', ') || 'à définir'}.`;
        systemPrompt = `Tu es un expert en création de backstories pour des histoires ${genreString}.
Crée une histoire qui:
- Est cohérente avec le monde: ${worldDesc}
- Explique les traits de personnalité
- Crée des motivations claires
- Laisse des mystères à explorer

Contexte du monde: ${worldDesc}

Format de réponse: Histoire en 3-4 paragraphes`;
        break;

      case 'abilities':
        userQuery = `Quelles seraient 4 capacités ou pouvoirs uniques et équilibrés pour un personnage dans un monde ${genreString}?`;
        systemPrompt = `Tu es un expert en game design et équilibrage pour des histoires ${genreString}.
Génère des capacités qui:
- Sont cohérentes avec les règles du monde: ${rulesString}
- Sont équilibrées (ni trop faibles ni trop puissantes)
- Reflètent la personnalité: ${characterData.personality?.join(', ') || 'à définir'}
- Créent des opportunités narratives intéressantes

Format de réponse: capacité1, capacité2, capacité3, capacité4`;
        break;
    }

    await generate(userQuery, systemPrompt);
    setShowResponse(true);
  };

  const parseSuggestions = (text: string): string[] => {
    // Try comma-separated first
    if (text.includes(',')) {
      return text.split(',').map(s => s.trim()).filter(s => s.length > 0);
    }
    // Try pipe-separated
    if (text.includes('|')) {
      return text.split('|').map(s => s.trim()).filter(s => s.length > 0);
    }
    // Try newline-separated
    if (text.includes('\n')) {
      return text.split('\n').map(s => s.trim()).filter(s => s.length > 0 && !s.match(/^\d+\./));
    }
    // Return as single item
    return [text.trim()];
  };

  const handleApplySuggestion = (suggestion: string) => {
    if (suggestionType === 'personality' || suggestionType === 'abilities') {
      // For arrays, add to existing
      const currentArray = characterData[suggestionType] || [];
      onSuggestion(suggestionType, [...currentArray, suggestion]);
    } else {
      // For strings, replace
      onSuggestion(suggestionType, suggestion);
    }
    setShowResponse(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={generateSuggestion}
          disabled={isLoading}
          className="px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400 flex items-center gap-1"
          title="Générer des suggestions avec IA"
        >
          {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
          IA
        </button>

        <ModelSelector
          currentModel={currentModel}
          availableModels={availableModels}
          onModelChange={setCurrentModel}
        />

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={reasoningMode}
            onChange={(e) => setReasoningMode(e.target.checked)}
          />
          Mode raisonnement
        </label>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          Erreur: {error}
        </div>
      )}

      {showResponse && response && (
        <div className="space-y-3">
          <ReasoningDisplay
            response={response}
            showThinking={reasoningMode}
          />

          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Suggestions:</p>
            <div className="flex flex-wrap gap-2">
              {parseSuggestions(response.summary).map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleApplySuggestion(suggestion)}
                  className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm hover:bg-green-200"
                >
                  + {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
