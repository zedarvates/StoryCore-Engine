import React, { useState } from 'react';
import { Wand2, Loader2 } from 'lucide-react';
import { z } from 'zod';
import { useEnhancedLLM } from '../../../hooks/useEnhancedLLM';
import type { Character } from '@/types/character';
import type { World, WorldRule } from '@/types/world';
import { ModelSelector, ReasoningDisplay } from '../../llm';

interface EnhancedCharacterAssistantProps {
  worldContext?: Partial<World>;
  characterData: Partial<Character>;
  onSuggestion: (field: string, value: unknown) => void;
  suggestionType: 'name' | 'personality' | 'appearance' | 'backstory' | 'abilities';
  productionMode?: string;
}

export const EnhancedCharacterAssistant: React.FC<EnhancedCharacterAssistantProps> = ({
  worldContext,
  characterData,
  onSuggestion,
  suggestionType,
  productionMode
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

  const getGenreString = (genre: unknown): string => {
    const genreMap: Record<string, string> = {
      'fantasy': 'fantastique',
      'sci-fi': 'science-fiction',
      'historical': 'historique',
      'contemporary': 'contemporain',
      'horror': 'horreur',
      'mystery': 'mystère',
      'romance': 'romance',
      'thriller': 'thriller',
      'western': 'western',
      'cyberpunk': 'cyberpunk',
      'steampunk': 'steampunk',
      'post-apocalyptic': 'post-apocalyptique',
    };

    if (!genre) return 'contemporain';
    
    if (typeof genre === 'string') {
      const lowerGenre = genre.toLowerCase();
      return genreMap[lowerGenre] || genre;
    }
    
    if (Array.isArray(genre)) {
      if (genre.length === 0) return 'contemporain';
      return genre.map(g => {
        const lowerG = String(g).toLowerCase();
        return genreMap[lowerG] || g;
      }).join(', ');
    }
    
    return String(genre);
  };

  const generateSuggestion = async () => {
    let userQuery = '';
    let systemPrompt = '';

    const genreString = getGenreString(worldContext?.genre);
    const worldDesc = worldContext?.atmosphere || `un monde ${genreString} réaliste et immersif`;
    const rulesString = worldContext?.rules && Array.isArray(worldContext.rules) && worldContext.rules.length > 0
      ? worldContext.rules.map((r: WorldRule) => r.rule).join(', ')
      : 'les lois de la physique et de la réalité habituelle';

    const contextPrefix = productionMode === 'documentary' 
      ? "Pour un documentaire réaliste," 
      : `Dans le contexte d'une histoire de genre ${genreString},`;

    switch (suggestionType) {
      case 'name':
        userQuery = `${contextPrefix} génère 5 noms de personnages originaux et immersifs pour un monde ${genreString}.`;
        systemPrompt = `Tu es un expert en création de personnages pour des projets de type ${productionMode || 'fiction'}. 
Le monde est ${genreString}. ${worldDesc}.
Génère des noms qui sonnent authentiques et mémorables.

Réponds UNIQUEMENT avec un objet JSON valide suivant ce format:
{
  "suggestions": ["nom1", "nom2", "nom3", "nom4", "nom5"]
}`;
        break;

      case 'personality':
        userQuery = `${contextPrefix} quels seraient 4 traits de personnalité complexes et nuancés pour un personnage?`;
        systemPrompt = `Tu es un expert en psychologie des personnages pour des projets de type ${productionMode || 'fiction'}.
Le genre est ${genreString}.
Génère des traits qui sont:
- Complexes et nuancés (pas juste "bon" ou "méchant")
- ${productionMode === 'documentary' ? 'Réalistes et authentiques pour un documentaire.' : 'Créent des opportunités de conflit et de croissance.'}
- Cohérents avec l'atmosphère: ${worldContext?.atmosphere || 'réaliste'}
- Reflètent le monde: ${worldDesc}

Réponds UNIQUEMENT avec un objet JSON valide suivant ce format:
{
  "suggestions": ["trait1", "trait2", "trait3", "trait4"]
}`;
        break;

      case 'appearance':
        userQuery = `${contextPrefix} décris l'apparence physique d'un personnage ${characterData.visual_identity?.gender || 'sans genre défini'} nommé ${characterData.name || 'sans nom'}.`;
        systemPrompt = `Tu es un expert en description visuelle pour des projets de type ${productionMode || 'fiction'}.
Le genre est ${genreString}.
Crée une description qui:
- Est visuelle et détaillée
- Reflète la personnalité: ${characterData.personality?.traits?.join(', ') || 'à définir'}
- Est cohérente avec le monde: ${worldDesc}
- Respecte les règles: ${rulesString}
- ${productionMode === 'documentary' ? 'Évite tout élément fantastique ou imaginaire trop prononcé.' : 'Inclut des détails mémorables.'}
Génère une description en 2-3 phrases. 

Réponds UNIQUEMENT avec un objet JSON valide suivant ce format:
{
  "suggestions": ["Ta description captivante ici..."]
}`;
        break;

      case 'backstory':
        userQuery = `${contextPrefix} écris une histoire personnelle cohérente pour un personnage nommé ${characterData.name || 'sans nom'}, ${characterData.visual_identity?.gender || 'genre non défini'}, âge ${characterData.visual_identity?.age_range || 25}, avec les traits ${characterData.personality?.traits?.join(', ') || 'à définir'}.`;
        systemPrompt = `Tu es un expert en création d'histoires pour des projets de type ${productionMode || 'fiction'}.
Le genre est ${genreString}.
Crée une histoire qui:
- Est cohérente avec le monde: ${worldDesc}
- Explique les traits de personnalité
- Crée des motivations claires
- ${productionMode === 'documentary' ? 'Se concentre sur des faits et une trajectoire de vie réaliste.' : 'Laisse des mystères à explorer.'}
Génère une histoire en 3-4 paragraphes.

Réponds UNIQUEMENT avec un objet JSON valide suivant ce format:
{
  "suggestions": ["Ton histoire fascinante ici..."]
}`;
        break;

      case 'abilities':
        userQuery = `${contextPrefix} quelles seraient 4 capacités ou compétences uniques pour ce personnage?`;
        systemPrompt = `Tu es un expert en conception de personnages pour des projets ${productionMode || 'fiction'}.
Le genre est ${genreString}.
Génère des ${productionMode === 'documentary' ? 'compétences réelles et concrètes' : 'capacités ou pouvoirs'} qui:
- Sont cohérentes avec les règles du monde: ${rulesString}
- ${productionMode === 'documentary' ? 'Sont basées sur l\'expertise humaine et le talent.' : 'Sont équilibrées et narratives.'}
- Reflètent la personnalité: ${characterData.personality?.traits?.join(', ') || 'à définir'}
- Créent des opportunités narratives intéressantes.

Réponds UNIQUEMENT avec un objet JSON valide suivant ce format:
{
  "suggestions": ["capacité1", "capacité2", "capacité3", "capacité4"]
}`;
        break;
    }

    await generate(userQuery, systemPrompt);
    setShowResponse(true);
  };

  const parseSuggestions = (text: string): string[] => {
    // Schéma Zod pour valider la réponse JSON du LLM
    const suggestionSchema = z.object({
      suggestions: z.array(z.string())
    });

    try {
      // Nettoyage : tentative de récupération du JSON s'il y a du texte autour (ex: blocs markdown)
      const jsonMatch = text.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        const parsedJson = JSON.parse(jsonMatch[0]);
        const validatedData = suggestionSchema.parse(parsedJson);
        return validatedData.suggestions;
      }
    } catch (e) {
      console.warn("Échec de la validation JSON/Zod, fallback sur le parsing manuel", e);
    }

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
    if (suggestionType === 'personality') {
      const currentArray = characterData.personality?.traits || [];
      onSuggestion(suggestionType, [...currentArray, suggestion]);
    } else if (suggestionType === 'abilities') {
      const currentArray = characterData.background?.significant_events || [];
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


