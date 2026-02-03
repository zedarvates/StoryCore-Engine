import React, { useState } from 'react';
import { Wand2, Loader2 } from 'lucide-react';
import { useEnhancedLLM } from '../../../hooks/useEnhancedLLM';
import { ModelSelector, ReasoningDisplay } from '../../llm';

interface EnhancedStorytellerAssistantProps {
  projectContext?: {
    characters: any[];
    world: any;
    locations: any[];
    previousStories: any[];
  };
  storyData: {
    videoType: string;
    targetDuration: number;
    genre: string[];
    tone: string[];
    targetAudience: string;
    visualStyle: string;
    selectedCharacters: string[];
    previousEpisodeReference?: string;
  };
  onStoryGenerated: (storyResult: any) => void;
}

export const EnhancedStorytellerAssistant: React.FC<EnhancedStorytellerAssistantProps> = ({
  projectContext,
  storyData,
  onStoryGenerated
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

  const generateStory = async () => {
    const worldDesc = projectContext?.world 
      ? `${projectContext.world.name} (${projectContext.world.genre?.join(', ')}, ${projectContext.world.timePeriod}, ${projectContext.world.atmosphere})`
      : 'monde fantastique';

    const selectedChars = projectContext?.characters?.filter(c => 
      storyData.selectedCharacters.includes(c.character_id)
    ) || [];

    const userQuery = `Crée une histoire complète pour une vidéo ${storyData.videoType} de ${storyData.targetDuration} minutes avec les genres ${storyData.genre.join(', ')} et les tons ${storyData.tone.join(', ')}.`;

    const systemPrompt = `Tu es un expert en narration vidéo et en scénarisation pour différents formats.

CONTEXTE DU PROJET:
- Format: ${storyData.videoType}
- Durée: ${storyData.targetDuration} minutes
- Genres: ${storyData.genre.join(', ')}
- Tons: ${storyData.tone.join(', ')}
- Public cible: ${storyData.targetAudience}
- Style visuel: ${storyData.visualStyle}

MONDE: ${worldDesc}

PERSONNAGES PRINCIPAUX:
${selectedChars.map(c => `- ${c.name} (${c.personality?.traits?.join(', ') || 'personnalité à définir'})`).join('\n') || '- Aucun personnage sélectionné'}

${storyData.previousEpisodeReference ? `ÉPISODE PRÉCÉDENT: ${storyData.previousEpisodeReference}` : ''}

INSTRUCTIONS SPÉCIFIQUES:
1. Structure adaptée au format ${storyData.videoType}
2. Rythme visuel optimisé pour ${storyData.targetDuration} minutes
3. Scènes percutantes et visuellement intéressantes
4. Développement narratif adapté au temps disponible
5. Style visuel ${storyData.visualStyle}

STYLE VISUEL DÉTAILLÉ:
${getVisualStyleInstructions(storyData.visualStyle)}

FORMAT DE RÉPONSE:
Génère une histoire structurée avec:
- Résumé complet (3-4 paragraphes)
- Conflit central
- Résolution
- Thèmes principaux
- Structure en actes avec scènes clés
- Suggestions visuelles et musicales

Assure-toi que l'histoire:
- Respecte les contraintes de durée
- Utilise efficacement les personnages sélectionnés
- S'intègre dans le monde établi
- Correspond au style visuel choisi`;

    await generate(userQuery, systemPrompt);
    setShowResponse(true);
  };

  const getVisualStyleInstructions = (style: string): string => {
    switch (style) {
      case 'cinematographique':
        return `• Langage cinématographique professionnel
• Plans de caméra variés (plan large, gros plan, travelling)
• Éclairage dramatique et compositions soignées
• Éléments visuels épiques et immersifs`;
      
      case 'anime':
        return `• Expressions faciales exagérées et gestes théâtraux
• Couleurs vives et effets visuels magiques
• Scènes émotionnelles intenses
• Animation fluide et détails élaborés`;
      
      case 'documentaire':
        return `• Langage réaliste et immersif
• Caméra à l'épaule et mouvements naturels
• Authenticité et immersion dans le réel
• Éléments éducatifs et informatifs`;
      
      case 'artistique':
        return `• Langage poétique et créatif
• Compositions visuelles non-conventionnelles
• Atmosphère poétique et émotion artistique
• Métaphores visuelles et symbolismes`;
      
      case 'vintage':
        return `• Esthétique rétro des années 80-90
• Filtres analogiques et couleurs saturées
• Éléments nostalgiques et vintage
• Langage évocateur de l'époque`;
      
      case 'minimaliste':
        return `• Langage épuré et essentiel
• Compositions simples et espaces vides
• Contemplation et introspection
• Éléments symboliques subtils`;
      
      default:
        return '• Style visuel standard avec attention aux détails';
    }
  };

  const handleApplyStory = () => {
    if (!response) return;

    // Try to parse JSON from the summary
    try {
      const jsonMatch = response.summary.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        onStoryGenerated(parsed);
      } else {
        // Fallback: use the summary as-is
        onStoryGenerated({
          summary: response.summary,
          mainConflict: '',
          resolution: '',
          themes: [],
          acts: [],
          visualStyle: '',
          pacing: '',
          musicSuggestions: [],
          moodPalette: [],
          cameraTechniques: []
        });
      }
    } catch (error) {
      console.error('Error parsing story response:', error);
      // Fallback: use the summary as-is
      onStoryGenerated({
        summary: response.summary,
        mainConflict: '',
        resolution: '',
        themes: [],
        acts: [],
        visualStyle: '',
        pacing: '',
        musicSuggestions: [],
        moodPalette: [],
        cameraTechniques: []
      });
    }
    
    setShowResponse(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={generateStory}
          disabled={isLoading}
          className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 disabled:bg-gray-400 flex items-center gap-2"
        >
          {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Wand2 size={20} />}
          {isLoading ? 'Génération en cours...' : 'Générer l\'Histoire avec IA'}
        </button>

        <ModelSelector
          currentModel={currentModel}
          availableModels={availableModels}
          onModelChange={setCurrentModel}
          taskType="storytelling"
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

          <div className="flex gap-2">
            <button
              onClick={handleApplyStory}
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
            >
              Appliquer cette Histoire
            </button>
            <button
              onClick={() => setShowResponse(false)}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-center gap-2">
            <Loader2 size={20} className="animate-spin text-blue-600" />
            <span className="text-sm text-blue-800">
              Génération de l'histoire en cours... Cela peut prendre quelques instants.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
