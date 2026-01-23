import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Wand2, Save, BookOpen, Users, MapPin, Clock, Target, Sparkles, Info } from 'lucide-react';
import { LLMService } from '../../../services/llmService';
import { useStore } from '../../../store';
import { StorySummary, StorytellerWizardData } from '../../../types/story';

export interface StorytellerWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (storySummary: StorySummary) => void;
  projectContext?: {
    characters: any[];
    world: any;
    locations: any[];
    previousStories: any[];
  };
}

export const StorytellerWizard: React.FC<StorytellerWizardProps> = ({
  isOpen,
  onClose,
  onSave,
  projectContext
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);

  // Get data from store
  const characters = useStore((state) => state.characters);
  const worlds = useStore((state) => state.worlds);
  const world = worlds.length > 0 ? worlds[0] : null;

  const [storyData, setStoryData] = useState<StorytellerWizardData>({
    selectedCharacters: [],
    selectedLocations: [],
    previousEpisodeReference: '',

    videoType: 'court-métrage',
    targetDuration: 15,
    genre: [],
    tone: [],
    targetAudience: 'general',
    visualStyle: 'cinematographique',

    storySummary: '',
    mainConflict: '',
    resolution: '',
    themes: [],
    acts: [],
    recommendedVisualStyle: '',
    pacing: '',
    musicSuggestions: [],
    moodPalette: [],
    cameraTechniques: [],

    isValidated: false
  });

  const steps = [
    { title: 'Analyse du Projet', description: 'Personnages, monde et continuité', icon: BookOpen },
    { title: 'Format Vidéo', description: 'Type, durée et style de la vidéo', icon: Target },
    { title: 'Création de l\'Histoire', description: 'Génération de l\'intrigue vidéo', icon: Wand2 },
    { title: 'Structure Narrative', description: 'Rythme et scènes clés', icon: Sparkles },
    { title: 'Validation & Export', description: 'Aperçu et sauvegarde du scénario', icon: Save }
  ];

  // Video type options
  const videoTypeOptions = [
    { value: 'court-métrage', label: 'Court Métrage', duration: '5-20 min', description: 'Histoire complète et condensée' },
    { value: 'métrage', label: 'Métrage', duration: '60-120 min', description: 'Film complet avec développement approfondi' },
    { value: 'série-episode', label: 'Épisode de Série', duration: '20-45 min', description: 'Chapitre d\'une série plus longue' },
    { value: 'web-série', label: 'Web-Série', duration: '5-15 min', description: 'Contenu court pour plateformes digitales' }
  ];

  // Genre options
  const genreOptions = [
    'Fantasy', 'Science-Fiction', 'Aventure', 'Drame', 'Comédie', 'Horreur', 'Thriller', 'Romance', 'Action'
  ];

  // Tone options
  const toneOptions = [
    'Épique', 'Intime', 'Sombre', 'Lumineux', 'Mystérieux', 'Humoristique', 'Tendu', 'Apaisant'
  ];

  // Visual style options with enhanced preview
  const visualStyleOptions = [
    {
      value: 'cinematographique',
      label: 'Cinématographique',
      description: 'Style Hollywood classique avec éclairage dramatique et composition soignée',
      examples: ['The Dark Knight', 'Inception', 'Blade Runner 2049'],
      previewColor: 'from-blue-900 to-black',
      icon: '🎥',
      moodWords: ['Épique', 'Dramatique', 'Cinématographique'],
      recommendedFor: ['Action', 'Drame', 'Thriller']
    },
    {
      value: 'anime',
      label: 'Animé',
      description: 'Style d\'animation japonaise avec expressions exagérées et couleurs vives',
      examples: ['Studio Ghibli', 'Your Name', 'Spirited Away'],
      previewColor: 'from-pink-400 to-purple-600',
      icon: '🎨',
      moodWords: ['Magique', 'Émotionnel', 'Coloré'],
      recommendedFor: ['Fantasy', 'Romance', 'Aventure']
    },
    {
      value: 'documentaire',
      label: 'Documentaire',
      description: 'Style réaliste et immersif, caméra à l\'épaule, éclairage naturel',
      examples: ['Planet Earth', 'Won\'t You Be My Neighbor?', 'Jiro Dreams of Sushi'],
      previewColor: 'from-green-700 to-brown-600',
      icon: '📹',
      moodWords: ['Authentique', 'Éducatif', 'Immersion'],
      recommendedFor: ['Documentaire', 'Biographie', 'Science']
    },
    {
      value: 'artistique',
      label: 'Artistique',
      description: 'Style expressionniste avec compositions créatives et atmosphère poétique',
      examples: ['Amélie Poulain', 'The Grand Budapest Hotel', 'Edward Scissorhands'],
      previewColor: 'from-yellow-400 to-red-500',
      icon: '🎭',
      moodWords: ['Créatif', 'Poétique', 'Artistique'],
      recommendedFor: ['Drame', 'Romance', 'Mystère']
    },
    {
      value: 'vintage',
      label: 'Vintage',
      description: 'Style rétro avec filtres analogiques et esthétique des années 80-90',
      examples: ['Stranger Things', 'Back to the Future', 'The Breakfast Club'],
      previewColor: 'from-orange-400 to-pink-500',
      icon: '📼',
      moodWords: ['Nostalgique', 'Rétro', 'Analogique'],
      recommendedFor: ['Comédie', 'Aventure', 'Science-Fiction']
    },
    {
      value: 'minimaliste',
      label: 'Minimaliste',
      description: 'Style épuré et moderne avec compositions simples et focus sur l\'essentiel',
      examples: ['Lost in Translation', 'Drive', 'Her'],
      previewColor: 'from-gray-100 to-gray-300',
      icon: '⚪',
      moodWords: ['Épuré', 'Moderne', 'Contemplatif'],
      recommendedFor: ['Drame', 'Romance', 'Psychologique']
    }
  ];

  // Auto-suggest visual style based on selected genres
  const suggestVisualStyle = (genres: string[]) => {
    if (genres.length === 0) return null;

    // Count recommendations for each style
    const styleScores = visualStyleOptions.map(style => ({
      style: style.value,
      score: genres.filter(genre => style.recommendedFor.includes(genre)).length
    }));

    // Find the style with the highest score
    const bestMatch = styleScores.reduce((best, current) =>
      current.score > best.score ? current : best
    );

    return bestMatch.score > 0 ? bestMatch.style : null;
  };

  // Update visual style suggestion when genres change
  useEffect(() => {
    if (storyData.genre.length > 0 && !storyData.visualStyle) {
      const suggestedStyle = suggestVisualStyle(storyData.genre);
      if (suggestedStyle) {
        updateStoryData('visualStyle', suggestedStyle);
      }
    }
  }, [storyData.genre]);

  const generateStorySummary = async () => {
    if (!projectContext) return;

    setIsGenerating(true);
    try {
      const llmService = new LLMService();

      const selectedChars = characters.filter(c => storyData.selectedCharacters.includes(c.character_id));
      const worldDesc = world ? `${world.name} (${world.genre.join(', ')}, ${world.timePeriod}, ${world.atmosphere})` : 'monde fantastique';

      const prompt = `Crée une histoire complète pour une vidéo ${storyData.videoType} de ${storyData.targetDuration} minutes.

FORMAT VIDÉO: ${storyData.videoType}
DURÉE: ${storyData.targetDuration} minutes
GENRES: ${storyData.genre.join(', ')}
TONS: ${storyData.tone.join(', ')}
PUBLIC: ${storyData.targetAudience}
STYLE VISUEL CHOISI: ${storyData.visualStyle}

CONTEXTE DU MONDE: ${worldDesc}
PERSONNAGES PRINCIPAUX:
${selectedChars.map(c => `- ${c.name} (${c.personality?.traits?.join(', ')})`).join('\n')}

${storyData.previousEpisodeReference ? `ÉPISODE PRÉCÉDENT: ${storyData.previousEpisodeReference}` : ''}

INSTRUCTIONS SPÉCIFIQUES POUR VIDÉO:
- Structure adaptée au format ${storyData.videoType}
- Rythme visuel optimisé pour ${storyData.targetDuration} minutes
- Scènes percutantes et visuellement intéressantes
- Développement narratif adapté au temps disponible
- Cliffhangers appropriés au format
- Style visuel ${storyData.visualStyle} : adapter les descriptions, l'ambiance et les scènes au style choisi

INSTRUCTIONS DE STYLE DÉTAILLÉES:
${(() => {
  const style = visualStyleOptions.find(s => s.value === storyData.visualStyle);
  if (!style) return '';

  switch (storyData.visualStyle) {
    case 'cinematographique':
      return '• Utiliser un langage cinématographique professionnel\\n• Décrire les plans de caméra (plan large, gros plan, travelling)\\n• Évoquer l\'éclairage dramatique et les compositions soignées\\n• Inclure des éléments visuels épiques et immersifs';
    case 'anime':
      return '• Décrire les expressions faciales exagérées et les gestes théâtraux\\n• Utiliser des couleurs vives et des effets visuels magiques\\n• Inclure des scènes émotionnelles intenses\\n• Évoquer l\'animation fluide et les détails élaborés';
    case 'documentaire':
      return '• Utiliser un langage réaliste et immersif\\n• Décrire la caméra à l\'épaule et les mouvements naturels\\n• Évoquer l\'authenticité et l\'immersion dans le réel\\n• Inclure des éléments éducatifs et informatifs';
    case 'artistique':
      return '• Utiliser un langage poétique et créatif\\n• Décrire les compositions visuelles non-conventionnelles\\n• Évoquer l\'atmosphère poétique et l\'émotion artistique\\n• Inclure des métaphores visuelles et des symbolismes';
    case 'vintage':
      return '• Évoquer l\'esthétique rétro des années 80-90\\n• Décrire les filtres analogiques et les couleurs saturées\\n• Inclure des éléments nostalgiques et vintage\\n• Utiliser un langage évocateur de l\'époque';
    case 'minimaliste':
      return '• Utiliser un langage épuré et essentiel\\n• Décrire les compositions simples et les espaces vides\\n• Évoquer la contemplation et l\'introspection\\n• Inclure des éléments symboliques subtils';
    default:
      return '';
  }
})()}

Génère au format JSON:
{
  "summary": "Résumé complet de l'histoire vidéo (3-4 paragraphes)",
  "mainConflict": "Conflit central de la vidéo",
  "resolution": "Résolution adaptée au format",
  "themes": ["thème1", "thème2", "thème3"],
  "acts": [
    {
      "number": 1,
      "title": "Titre de l'acte 1",
      "description": "Description détaillée avec scènes clés",
      "keyScenes": ["scène1", "scène2"],
      "characterDevelopment": "Évolution des personnages",
      "duration": durée_en_minutes
    }
  ],
  "visualStyle": "Description détaillée du style visuel recommandé pour cette histoire",
  "pacing": "Rythme narratif suggéré",
  "musicSuggestions": ["suggestion1", "suggestion2"],
  "moodPalette": ["couleur1", "couleur2"],
  "cameraTechniques": ["technique1", "technique2"]
}`;

      const response = await llmService.generateText(prompt, {
        temperature: 0.8,
        maxTokens: 1000
      });

      // Parse JSON response
      try {
        const parsed = JSON.parse(response);
        setStoryData(prev => ({
          ...prev,
          storySummary: parsed.summary,
          mainConflict: parsed.mainConflict,
          resolution: parsed.resolution,
          themes: parsed.themes,
          acts: parsed.acts,
          recommendedVisualStyle: parsed.visualStyle,
          pacing: parsed.pacing,
          musicSuggestions: parsed.musicSuggestions,
          moodPalette: parsed.moodPalette,
          cameraTechniques: parsed.cameraTechniques
        }));
      } catch (parseError) {
        console.error('Erreur parsing JSON:', parseError);
        // Fallback: extract information from text
        setStoryData(prev => ({
          ...prev,
          storySummary: response
        }));
      }

    } catch (error) {
      console.error('Erreur génération histoire:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSave = () => {
    const storySummary: StorySummary = {
      id: `story_${Date.now()}`,
      title: `Histoire ${storyData.videoType}`,
      genre: storyData.genre,
      tone: storyData.tone,
      targetAudience: storyData.targetAudience,
      videoType: storyData.videoType,
      duration: storyData.targetDuration,
      acts: storyData.acts,
      keyCharacters: storyData.selectedCharacters,
      mainConflict: storyData.mainConflict,
      resolution: storyData.resolution,
      themes: storyData.themes,
      selectedVisualStyle: storyData.visualStyle,
      recommendedVisualStyle: storyData.recommendedVisualStyle,
      pacing: storyData.pacing || '',
      musicSuggestions: storyData.musicSuggestions,
      moodPalette: storyData.moodPalette,
      cameraTechniques: storyData.cameraTechniques,
      createdAt: new Date(),
      basedOnPreviousEpisode: storyData.previousEpisodeReference || undefined,
      worldContext: world ? `${world.name} - ${world.genre.join(', ')} (${world.timePeriod})` : ''
    };

    onSave(storySummary);
    onClose();
  };

  const updateStoryData = (field: keyof StorytellerWizardData, value: any) => {
    setStoryData(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <BookOpen size={24} />
              Storyteller - Créateur d'Histoire
            </h2>
            <p className="text-gray-600">Étape {currentStep + 1} sur {steps.length}: {steps[currentStep].title}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-4">
          <div className="flex items-center space-x-2">
            {steps.map((step, index) => (
              <div key={index} className="flex flex-col items-center flex-1">
                <button
                  onClick={() => {
                    // Allow navigation backwards freely
                    if (index < currentStep) {
                      setCurrentStep(index);
                    }
                    // For forwards navigation, could add validation here later
                  }}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                    index <= currentStep
                      ? 'bg-blue-500 text-white'
                      : index === currentStep + 1
                      ? 'bg-gray-300 text-gray-600 cursor-pointer hover:bg-gray-400'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                  disabled={index > currentStep + 1}
                >
                  {index + 1}
                </button>
                <div className="mt-2 text-xs text-center">
                  <div className={`font-medium ${index <= currentStep ? 'text-blue-600' : 'text-gray-400'}`}>
                    {step.title}
                  </div>
                  <div className="text-gray-500 hidden sm:block">
                    {step.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto max-h-96">
          {currentStep === 0 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Analyse du contexte de votre projet</h3>

                {/* Characters Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Users size={16} />
                    Personnages principaux
                  </label>
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                    {characters.map(character => (
                      <label key={character.character_id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={storyData.selectedCharacters.includes(character.character_id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              updateStoryData('selectedCharacters', [...storyData.selectedCharacters, character.character_id]);
                            } else {
                              updateStoryData('selectedCharacters', storyData.selectedCharacters.filter(id => id !== character.character_id));
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-sm">{character.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* World Context */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <MapPin size={16} />
                    Contexte du monde
                  </label>
                  <div className="bg-gray-50 p-3 rounded-md">
                    <p className="text-sm text-gray-700">
                      {world ? `${world.name} (${world.genre.join(', ')})` : 'Aucun monde défini dans le projet'}
                    </p>
                  </div>
                </div>

                {/* Previous Episode Reference */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Référence à l'épisode précédent (optionnel)</label>
                  <textarea
                    value={storyData.previousEpisodeReference}
                    onChange={(e) => updateStoryData('previousEpisodeReference', e.target.value)}
                    className="w-full border border-gray-300 rounded-md p-2"
                    rows={3}
                    placeholder="Résumez brièvement l'épisode précédent pour assurer la continuité..."
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Paramètres de l'histoire</h3>

                {/* Video Type */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <Target size={16} />
                    Type de vidéo
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {videoTypeOptions.map(option => (
                      <div
                        key={option.value}
                        onClick={() => {
                          updateStoryData('videoType', option.value);
                          // Auto-set duration based on type
                          const durationMap = { 'court-métrage': 15, 'métrage': 90, 'série-episode': 30, 'web-série': 10 };
                          updateStoryData('targetDuration', durationMap[option.value as keyof typeof durationMap]);
                        }}
                        className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                          storyData.videoType === option.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <h4 className="font-medium">{option.label}</h4>
                        <p className="text-sm text-gray-600">{option.duration}</p>
                        <p className="text-xs text-gray-500 mt-1">{option.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Duration */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Clock size={16} />
                    Durée cible (minutes)
                  </label>
                  <input
                    type="number"
                    value={storyData.targetDuration}
                    onChange={(e) => updateStoryData('targetDuration', parseInt(e.target.value))}
                    className="w-full border border-gray-300 rounded-md p-2"
                    min="5"
                    max="180"
                  />
                </div>

                {/* Genre */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Genres</label>
                  <div className="flex flex-wrap gap-2">
                    {genreOptions.map(genre => (
                      <button
                        key={genre}
                        onClick={() => {
                          if (storyData.genre.includes(genre)) {
                            updateStoryData('genre', storyData.genre.filter(g => g !== genre));
                          } else {
                            updateStoryData('genre', [...storyData.genre, genre]);
                          }
                        }}
                        className={`px-3 py-1 rounded-full text-sm ${
                          storyData.genre.includes(genre)
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {genre}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tone */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tons</label>
                  <div className="flex flex-wrap gap-2">
                    {toneOptions.map(tone => (
                      <button
                        key={tone}
                        onClick={() => {
                          if (storyData.tone.includes(tone)) {
                            updateStoryData('tone', storyData.tone.filter(t => t !== tone));
                          } else {
                            updateStoryData('tone', [...storyData.tone, tone]);
                          }
                        }}
                        className={`px-3 py-1 rounded-full text-sm ${
                          storyData.tone.includes(tone)
                            ? 'bg-purple-500 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {tone}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Target Audience */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Public cible</label>
                  <select
                    value={storyData.targetAudience}
                    onChange={(e) => updateStoryData('targetAudience', e.target.value)}
                    className="w-full border border-gray-300 rounded-md p-2"
                  >
                    <option value="general">Public général</option>
                    <option value="family">Famille</option>
                    <option value="young-adult">Jeune adulte</option>
                    <option value="adult">Adulte</option>
                    <option value="mature">Mature</option>
                  </select>
                </div>

                {/* Visual Style */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <Sparkles size={16} />
                    Style visuel
                  </label>
                  <div className="grid grid-cols-1 gap-4">
                    {visualStyleOptions.map(style => (
                      <div
                        key={style.value}
                        onClick={() => updateStoryData('visualStyle', style.value)}
                        className={`relative p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-lg ${
                          storyData.visualStyle === style.value
                            ? 'border-purple-500 bg-purple-50 shadow-md'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {/* Preview bar */}
                        <div className={`absolute top-0 left-0 right-0 h-2 bg-gradient-to-r ${style.previewColor} rounded-t-lg`}></div>

                        <div className="flex items-start justify-between mt-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-lg">{style.icon}</span>
                              <h4 className="font-medium text-gray-900">{style.label}</h4>
                              {storyData.visualStyle === style.value && (
                                <div className="text-purple-500">
                                  <Sparkles size={16} />
                                </div>
                              )}
                            </div>

                            <p className="text-sm text-gray-600 mb-3">{style.description}</p>

                            {/* Mood words */}
                            <div className="flex flex-wrap gap-1 mb-2">
                              {style.moodWords.map((mood, index) => (
                                <span key={index} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                  {mood}
                                </span>
                              ))}
                            </div>

                            {/* Recommended for */}
                            <div className="text-xs text-gray-500 mb-2">
                              <strong>Recommandé pour:</strong> {style.recommendedFor.join(', ')}
                            </div>

                            {/* Examples */}
                            <div className="flex flex-wrap gap-1">
                              {style.examples.map(example => (
                                <span key={example} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                  {example}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Style compatibility warning */}
                  {storyData.genre.length > 0 && storyData.visualStyle && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <div className="flex items-start gap-2">
                        <Info size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                          <strong>Compatibilité:</strong> Le style "{visualStyleOptions.find(s => s.value === storyData.visualStyle)?.label}"
                          est {storyData.genre.some(g => visualStyleOptions.find(s => s.value === storyData.visualStyle)?.recommendedFor.includes(g))
                            ? 'parfaitement adapté' : 'compatible'} avec vos genres sélectionnés ({storyData.genre.join(', ')}).
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              {/* Preview Section */}
              {storyData.visualStyle && (
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-lg border">
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                    <Sparkles size={20} />
                    Aperçu du style choisi
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-gray-800 mb-2">Style visuel</h4>
                      <div className="flex items-center gap-3 p-3 bg-white rounded-md">
                        <span className="text-2xl">{visualStyleOptions.find(s => s.value === storyData.visualStyle)?.icon}</span>
                        <div>
                          <div className="font-medium">{visualStyleOptions.find(s => s.value === storyData.visualStyle)?.label}</div>
                          <div className="text-sm text-gray-600">{visualStyleOptions.find(s => s.value === storyData.visualStyle)?.description}</div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-800 mb-2">Ambiance suggérée</h4>
                      <div className="flex flex-wrap gap-1">
                        {visualStyleOptions.find(s => s.value === storyData.visualStyle)?.moodWords.map((mood, index) => (
                          <span key={index} className="text-sm bg-purple-100 text-purple-800 px-3 py-1 rounded-full">
                            {mood}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Style compatibility info */}
                  <div className="mt-4 p-3 bg-white border border-gray-200 rounded-md">
                    <div className="text-sm text-gray-700">
                      <strong>Configuration:</strong> {storyData.videoType} • {storyData.targetDuration}min • {storyData.genre.join(', ')} • {storyData.tone.join(', ')}
                    </div>
                  </div>
                </div>
              )}

              {/* Generation Section */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Génération du résumé de l'histoire</h3>

                <div className="bg-blue-50 p-4 rounded-lg mb-4">
                  <p className="text-sm text-blue-800">
                    L'IA va analyser votre contexte et générer un résumé global cohérent avec vos personnages et votre monde.
                  </p>
                </div>

                <button
                  onClick={generateStorySummary}
                  disabled={isGenerating || !storyData.visualStyle}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 px-4 rounded-md hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Wand2 size={20} />
                  {isGenerating ? 'Génération en cours...' : 'Générer l\'histoire avec l\'IA'}
                </button>

                {!storyData.visualStyle && (
                  <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-md border border-amber-200 mt-4">
                    Veuillez d'abord sélectionner un style visuel à l'étape précédente.
                  </div>
                )}

                {storyData.storySummary && (
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Résumé généré</label>
                    <textarea
                      value={storyData.storySummary}
                      onChange={(e) => updateStoryData('storySummary', e.target.value)}
                      className="w-full border border-gray-300 rounded-md p-3"
                      rows={6}
                    />
                  </div>
                )}

                {storyData.mainConflict && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Conflit principal</label>
                    <textarea
                      value={storyData.mainConflict}
                      onChange={(e) => updateStoryData('mainConflict', e.target.value)}
                      className="w-full border border-gray-300 rounded-md p-2"
                      rows={2}
                    />
                  </div>
                )}

                {storyData.resolution && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Résolution</label>
                    <textarea
                      value={storyData.resolution}
                      onChange={(e) => updateStoryData('resolution', e.target.value)}
                      className="w-full border border-gray-300 rounded-md p-2"
                      rows={2}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Structure des actes</h3>

                {storyData.acts.length > 0 ? (
                  <div className="space-y-4">
                    {storyData.acts.map((act, index) => (
                      <div key={act.id || index} className="border border-gray-200 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900">Acte {act.number}: {act.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{act.description}</p>
                        <div className="mt-2 text-xs text-gray-500">
                          Durée estimée: {act.duration || 5} minutes
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <BookOpen size={48} className="mx-auto mb-4 opacity-50" />
                    <p>Les actes seront générés automatiquement avec le résumé de l'histoire.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg border">
                <h3 className="text-xl font-bold mb-4 text-gray-900 flex items-center gap-2">
                  <Save size={20} />
                  Validation Finale
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="bg-white p-4 rounded-md shadow-sm">
                      <h4 className="font-semibold text-gray-800 mb-2">Paramètres</h4>
                      <div className="space-y-1 text-sm">
                        <div><strong>Type:</strong> {videoTypeOptions.find(v => v.value === storyData.videoType)?.label}</div>
                        <div><strong>Durée:</strong> {storyData.targetDuration} minutes</div>
                        <div><strong>Genres:</strong> {storyData.genre.join(', ')}</div>
                        <div><strong>Tons:</strong> {storyData.tone.join(', ')}</div>
                        <div><strong>Public:</strong> {storyData.targetAudience}</div>
                        <div><strong>Style visuel choisi:</strong> {visualStyleOptions.find(s => s.value === storyData.visualStyle)?.label || 'Non défini'}</div>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-md shadow-sm">
                      <h4 className="font-semibold text-gray-800 mb-2">Éléments clés</h4>
                      <div className="space-y-2 text-sm">
                        <div><strong>Personnages:</strong> {storyData.selectedCharacters.length}</div>
                        <div><strong>Conflit:</strong> {storyData.mainConflict.substring(0, 50)}...</div>
                        <div><strong>Thèmes:</strong> {storyData.themes.join(', ')}</div>
                        <div><strong>Rythme:</strong> {storyData.pacing || 'Non défini'}</div>
                      </div>
                    </div>

                    {storyData.recommendedVisualStyle && (
                      <div className="bg-white p-4 rounded-md shadow-sm">
                        <h4 className="font-semibold text-gray-800 mb-2">Style visuel recommandé</h4>
                        <p className="text-sm text-gray-700">
                          {storyData.recommendedVisualStyle}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="bg-white p-4 rounded-md shadow-sm">
                      <h4 className="font-semibold text-gray-800 mb-2">Résumé de l'histoire</h4>
                      <p className="text-sm text-gray-700 line-clamp-6">
                        {storyData.storySummary || 'Aucun résumé généré'}
                      </p>
                    </div>

                    <div className="bg-white p-4 rounded-md shadow-sm">
                      <h4 className="font-semibold text-gray-800 mb-2">Structure</h4>
                      <div className="space-y-1 text-sm">
                        {storyData.acts.map((act, index) => (
                          <div key={index} className="flex justify-between">
                            <span>Acte {act.number}:</span>
                            <span>{act.duration || 5}min</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {(storyData.musicSuggestions && storyData.musicSuggestions.length > 0 ||
                      storyData.moodPalette && storyData.moodPalette.length > 0 ||
                      storyData.cameraTechniques && storyData.cameraTechniques.length > 0) && (
                      <div className="bg-white p-4 rounded-md shadow-sm">
                        <h4 className="font-semibold text-gray-800 mb-2">Suggestions créatives</h4>
                        <div className="space-y-2 text-sm">
                          {storyData.musicSuggestions && storyData.musicSuggestions.length > 0 && (
                            <div>
                              <strong>Musique:</strong>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {storyData.musicSuggestions.map((suggestion, index) => (
                                  <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                                    {suggestion}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {storyData.moodPalette && storyData.moodPalette.length > 0 && (
                            <div>
                              <strong>Palette d'ambiance:</strong>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {storyData.moodPalette.map((color, index) => (
                                  <span key={index} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                                    {color}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {storyData.cameraTechniques && storyData.cameraTechniques.length > 0 && (
                            <div>
                              <strong>Techniques caméra:</strong>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {storyData.cameraTechniques.map((technique, index) => (
                                  <span key={index} className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                                    {technique}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={storyData.isValidated}
                      onChange={(e) => updateStoryData('isValidated', e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm text-yellow-800">
                      J'ai vérifié et validé le résumé de l'histoire
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={16} className="mr-2" />
            Précédent
          </button>

          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">
              Étape {currentStep + 1} sur {steps.length}
            </span>
          </div>

          {currentStep === steps.length - 1 ? (
            <button
              onClick={handleSave}
              disabled={!storyData.isValidated}
              className="flex items-center px-6 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={16} className="mr-2" />
              Sauvegarder l'Histoire
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Suivant
              <ChevronRight size={16} className="ml-2" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};