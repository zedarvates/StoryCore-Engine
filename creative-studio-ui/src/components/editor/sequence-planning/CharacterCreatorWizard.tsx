import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Wand2, Save, Eye, Volume2 } from 'lucide-react';
import { LLMService } from '../../../services/llmService';
import { ttsService } from '../../../services/ttsService';
import { EnhancedCharacterAssistant } from '../../wizard/character-creator/EnhancedCharacterAssistant';
import { ConfigManager } from '../../../services/llm/ConfigManager';

export interface CharacterCreatorWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (character: unknown) => void;
  worldContext?: unknown; // From project world/lore
}

interface CharacterData {
  name: string;
  gender: 'male' | 'female' | 'other';
  age: number;
  personality: string[];
  appearance: string;
  backstory: string;
  voiceId: string;
  abilities: string[];
  worldRelation: string; // How it relates to the project world
}

export const CharacterCreatorWizard: React.FC<CharacterCreatorWizardProps> = ({
  isOpen,
  onClose,
  onSave,
  worldContext
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [character, setCharacter] = useState<CharacterData>({
    name: '',
    gender: 'other',
    age: 25,
    personality: [],
    appearance: '',
    backstory: '',
    voiceId: '',
    abilities: [],
    worldRelation: ''
  });

  const [llmSuggestions, setLlmSuggestions] = useState<any>({});
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{[key: number]: string[]}>({});
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);

  // Auto-save functionality
  const [draftData, setDraftData] = useState<CharacterData | null>(null);

  // Character templates for quick start
  const characterTemplates = [
    {
      id: 'hero',
      name: 'Héros',
      description: 'Personnage principal courageux et déterminé',
      icon: '⚔️',
      baseStats: {
        personality: ['Courageux', 'Déterminé', 'Protecteur'],
        abilities: ['Combat au corps à corps', 'Leadership']
      }
    },
    {
      id: 'mage',
      name: 'Mage',
      description: 'Maître des arts mystiques et de la magie',
      icon: '🔮',
      baseStats: {
        personality: ['Sage', 'Curieux', 'Réservé'],
        abilities: ['Magie élémentaire', 'Télékinésie']
      }
    },
    {
      id: 'rogue',
      name: 'Voleur',
      description: 'Expert en discrétion et en subterfuges',
      icon: '🗡️',
      baseStats: {
        personality: ['Rusé', 'Indépendant', 'Mystérieux'],
        abilities: ['Furtivité', 'Crochetage']
      }
    },
    {
      id: 'scholar',
      name: 'Érudit',
      description: 'Chercheur de connaissances et de vérités',
      icon: '📚',
      baseStats: {
        personality: ['Intelligent', 'Analytique', 'Curieux'],
        abilities: ['Connaissances étendues', 'Analyse rapide']
      }
    },
    {
      id: 'villain',
      name: 'Antagoniste',
      description: 'Adversaire avec motivations complexes',
      icon: '👹',
      baseStats: {
        personality: ['Ambitieux', 'Intelligent', 'Manipulateur'],
        abilities: ['Stratégie avancée', 'Manipulation mentale']
      }
    },
    {
      id: 'mentor',
      name: 'Mentor',
      description: 'Guide sage et expérimenté',
      icon: '🧙‍♂️',
      baseStats: {
        personality: ['Sage', 'Patient', 'Inspirant'],
        abilities: ['Enseignement', 'Conseil stratégique']
      }
    },
    {
      id: 'sidekick',
      name: 'Compagnon',
      description: 'Ami loyal et humoristique',
      icon: '🤝',
      baseStats: {
        personality: ['Loyal', 'Humoristique', 'Fiable'],
        abilities: ['Soutien logistique', 'Évasion rapide']
      }
    },
    {
      id: 'rebel',
      name: 'Rebelle',
      description: 'En rébellion contre l\'autorité',
      icon: '🚩',
      baseStats: {
        personality: ['Révolté', 'Passionné', 'Idéaliste'],
        abilities: ['Guérilla urbaine', 'Propagande']
      }
    },
    {
      id: 'mystic',
      name: 'Mystique',
      description: 'Figure spirituelle et énigmatique',
      icon: '✨',
      baseStats: {
        personality: ['Énigmatique', 'Spirituel', 'Introspectif'],
        abilities: ['Prémonition', 'Communication spirituelle']
      }
    }
  ];

  const steps = [
    { title: 'Template de Personnage', description: 'Choisissez un archétype de départ' },
    { title: 'Informations de Base', description: 'Nom, genre, âge' },
    { title: 'Personnalité & Apparence', description: 'Traits et description physique' },
    { title: 'Histoire & Contexte', description: 'Backstory et lien au monde' },
    { title: 'Capacités & Voix', description: 'Pouvoirs et voix SAPI' },
    { title: 'Aperçu & Sauvegarde', description: 'Validation finale' }
  ];

  useEffect(() => {
    if (worldContext) {
      // Generate LLM suggestions based on world
      generateLlmSuggestions();
    }
  }, [worldContext]);

  // Auto-save functionality
  useEffect(() => {
    // Restore draft on component mount
    const savedDraft = localStorage.getItem('characterCreator_draft');
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        const draftAge = Date.now() - draft.timestamp;
        // Only restore if draft is less than 24 hours old
        if (draftAge < 24 * 60 * 60 * 1000) {
          setDraftData(draft.data);
          setCharacter(draft.data);
          setSelectedTemplate(draft.selectedTemplate || null);
        } else {
          // Clean up old draft
          localStorage.removeItem('characterCreator_draft');
        }
      } catch (error) {
        console.error('Error restoring draft:', error);
        localStorage.removeItem('characterCreator_draft');
      }
    }

    // Start auto-save timer
    const timer = setInterval(() => {
      autoSave();
    }, 30000); // 30 seconds

    // Cleanup on unmount
    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, []);

  const autoSave = () => {
    const draftToSave = {
      data: character,
      selectedTemplate,
      timestamp: Date.now()
    };
    localStorage.setItem('characterCreator_draft', JSON.stringify(draftToSave));
    setDraftData(character);
  };

  const clearDraft = () => {
    localStorage.removeItem('characterCreator_draft');
    setDraftData(null);
  };

  const getGenreString = (genre: unknown): string => {
    // Handle different cases safely
    if (!genre) {
      return 'fantastique';
    }

    if (typeof genre === 'string') {
      return genre;
    }

    if (Array.isArray(genre)) {
      return genre.join(', ');
    }

    return String(genre);
  };

  const generateLlmSuggestions = async () => {
    if (!worldContext) return;

    try {
      // Get properly configured LLM service from ConfigManager
      const llmConfig = ConfigManager.getLLMConfig();
      // Cast to required type to fix type mismatch
      const llmService = new LLMService(llmConfig as any);

      // Safely get genre string with proper error handling
      const genreString = getGenreString(worldContext.genre);
      const rulesString = worldContext.rules && Array.isArray(worldContext.rules)
        ? worldContext.rules.map((r: unknown) => r.rule).join(', ')
        : 'magie et technologie';

      // Enhanced prompts with more world context
      const namePrompt = `Pour un monde ${genreString} avec ces caractéristiques: ${worldContext.description || 'monde fantastique'}, génère 5 noms de personnages originaux et immersifs. Les noms doivent être cohérents avec le genre et l'ambiance du monde. Format: nom1, nom2, nom3, nom4, nom5`;

      const personalityPrompt = `Dans un monde ${genreString} (${worldContext.atmosphere || 'mystérieux'}), décris 4 traits de personnalité complexes et intéressants pour des personnages. Chaque trait doit être unique et adapté au contexte du monde. Format: trait1, trait2, trait3, trait4`;

      const abilityPrompt = `Pour un monde ${genreString} avec ces règles: ${rulesString}, quelles seraient 4 capacités ou pouvoirs uniques et équilibrés ? Chaque capacité doit être cohérente avec les règles du monde. Format: capacité1, capacité2, capacité3, capacité4`;

      const backstoryPrompt = `Génère 3 concepts d'histoire personnelle courte pour un personnage dans ce monde: ${worldContext.description || 'monde fantastique'}. Chaque backstory doit être intrigante et liée aux éléments culturels du monde. Format: histoire1 | histoire2 | histoire3`;

      // Parallel generation for better performance
      const [nameResponse, personalityResponse, abilityResponse, backstoryResponse] = await Promise.all([
        llmService.generateText(namePrompt, { temperature: 0.8, maxTokens: 150 }),
        llmService.generateText(personalityPrompt, { temperature: 0.7, maxTokens: 150 }),
        llmService.generateText(abilityPrompt, { temperature: 0.7, maxTokens: 150 }),
        llmService.generateText(backstoryPrompt, { temperature: 0.8, maxTokens: 200 })
      ]);

      const names = nameResponse.split(',').map(n => n.trim()).filter(n => n.length > 0).slice(0, 5);
      const personalities = personalityResponse.split(',').map(p => p.trim()).filter(p => p.length > 0).slice(0, 4);
      const abilities = abilityResponse.split(',').map(a => a.trim()).filter(a => a.length > 0).slice(0, 4);
      const backstories = backstoryResponse.split('|').map(b => b.trim()).filter(b => b.length > 0).slice(0, 3);

      setLlmSuggestions({
        name: names,
        personality: personalities,
        abilities: abilities,
        backstory: backstories
      });
    } catch (error) {
      console.error('Erreur lors de la génération des suggestions LLM:', error);
      // Enhanced fallback with world-aware defaults
      setLlmSuggestions({
        name: ['Elyndor', 'Sylvana', 'Tharivol', 'Morwen', 'Kaelith'],
        personality: ['Courageux et déterminé', 'Sage et mystérieux', 'Charismatique et ambitieux', 'Réservé et observateur'],
        abilities: ['Manipulation des éléments', 'Communication animale', 'Art de l\'illusion', 'Maîtrise des ombres'],
        backstory: [
          'Ancien guerrier ayant perdu son royaume dans une guerre ancienne',
          'Mage errant à la recherche d\'un artefact légendaire',
          'Enfant des rues devenu maître voleur dans les bas-fonds'
        ]
      });
    }
  };

  const applyTemplate = (templateId: string) => {
    const template = characterTemplates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      updateCharacter('personality', template.baseStats.personality);
      updateCharacter('abilities', template.baseStats.abilities);
    }
  };

  const validateStep = (stepIndex: number): string[] => {
    const errors: string[] = [];

    switch (stepIndex) {
      case 1: // Basic Information
        if (!character.name.trim()) {
          errors.push("Le nom du personnage est obligatoire");
        }
        break;
      case 2: // Personality & Appearance
        if (character.personality.length === 0) {
          errors.push("Au moins un trait de personnalité est requis");
        }
        if (!character.appearance.trim()) {
          errors.push("La description de l'apparence est obligatoire");
        }
        break;
      case 3: // History & Context
        if (!character.backstory.trim()) {
          errors.push("L'histoire personnelle est obligatoire");
        }
        if (!character.worldRelation.trim()) {
          errors.push("La relation au monde du projet est obligatoire");
        }
        break;
      case 4: // Abilities & Voice
        if (character.abilities.length === 0) {
          errors.push("Au moins une capacité est requise");
        }
        if (!character.voiceId) {
          errors.push("La sélection d'une voix SAPI est obligatoire");
        }
        break;
      default:
        break;
    }

    return errors;
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      const errors = validateStep(currentStep);
      if (errors.length > 0) {
        setValidationErrors({ ...validationErrors, [currentStep]: errors });
        return;
      }

      // Clear any previous errors for this step
      const newErrors = { ...validationErrors };
      delete newErrors[currentStep];
      setValidationErrors(newErrors);

      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSave = () => {
    onSave(character);
    clearDraft(); // Clear the draft after successful save
    onClose();
  };

  const updateCharacter = (field: keyof CharacterData, value: unknown) => {
    setCharacter(prev => ({ ...prev, [field]: value }));
  };

  const previewVoice = async () => {
    if (!character.voiceId) return;

    setIsPlayingPreview(true);
    try {
      const previewText = `Bonjour, je m'appelle ${character.name || 'votre personnage'}. Voici un aperçu de ma voix.`;

      // Create a voice over object for the TTS service
      const voiceOver = {
        id: `preview_${Date.now()}`,
        text: previewText,
        voice: character.voiceId.startsWith('Microsoft-') ? character.voiceId.replace('Microsoft-', '').toLowerCase() : character.voiceId,
        language: character.voiceId.includes('Hortense') ? 'fr-FR' : 'en-US',
        speed: 1.0,
        pitch: 0,
        emotion: 'neutral' as const
      };

      const audioUrl = await ttsService.generateVoiceOver(voiceOver);
      setAudioPreviewUrl(audioUrl);

      // Play the audio
      const audio = new Audio(audioUrl);
      audio.play();

      // Clean up after playing
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        setAudioPreviewUrl(null);
      };

    } catch (error) {
      console.error('Erreur lors de la prévisualisation audio:', error);
    } finally {
      setIsPlayingPreview(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              Créateur de Personnage
              {draftData && (
                <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                  Brouillon restauré
                </span>
              )}
            </h2>
            <p className="text-gray-600">Étape {currentStep + 1} sur {steps.length}: {steps[currentStep].title}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" title="Fermer">
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

        {/* Validation Errors */}
        {validationErrors[currentStep] && validationErrors[currentStep].length > 0 && (
          <div className="mx-6 mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-start gap-2">
              <div className="text-red-500 font-medium">❌ Erreurs de validation:</div>
            </div>
            <ul className="mt-2 space-y-1">
              {validationErrors[currentStep].map((error, index) => (
                <li key={index} className="text-sm text-red-700">• {error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto max-h-96">
          {currentStep === 0 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Choisissez un archétype de personnage</h3>
                <p className="text-gray-600 mb-6">Sélectionnez un template pour commencer rapidement, ou passez cette étape pour créer un personnage personnalisé.</p>

                <div className="grid grid-cols-2 gap-4">
                  {characterTemplates.map((template) => (
                    <div
                      key={template.id}
                      onClick={() => applyTemplate(template.id)}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedTemplate === template.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-2xl mb-2">{template.icon}</div>
                      <h4 className="font-medium text-gray-900">{template.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                      <div className="mt-3">
                        <div className="text-xs text-gray-500">Traits: {template.baseStats.personality.join(', ')}</div>
                        <div className="text-xs text-gray-500">Capacités: {template.baseStats.abilities.join(', ')}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    💡 <strong>Conseil:</strong> Vous pouvez modifier tous les aspects du personnage dans les étapes suivantes,
                    même si vous choisissez un template.
                  </p>
                </div>
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nom</label>
                <input
                  type="text"
                  value={character.name}
                  onChange={(e) => updateCharacter('name', e.target.value)}
                  className="w-full border border-gray-300 rounded-md shadow-sm p-2 mb-2"
                  placeholder="Entrez le nom du personnage"
                />
                <EnhancedCharacterAssistant
                  worldContext={worldContext}
                  characterData={character}
                  onSuggestion={(field, value) => updateCharacter(field as keyof CharacterData, value)}
                  suggestionType="name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700" htmlFor="gender">Genre</label>
                <select
                  id="gender"
                  value={character.gender}
                  onChange={(e) => updateCharacter('gender', e.target.value as any)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  title="Sélectionnez le genre du personnage"
                >
                  <option value="male">Masculin</option>
                  <option value="female">Féminin</option>
                  <option value="other">Autre</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700" htmlFor="age">Âge</label>
                <input
                  id="age"
                  type="number"
                  value={character.age}
                  onChange={(e) => updateCharacter('age', parseInt(e.target.value))}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  min="1"
                  max="200"
                  placeholder="Entrez l'âge"
                />
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Traits de Personnalité</label>
                <div className="mt-2 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {character.personality.map((trait, index) => (
                      <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                        {trait}
                        <button
                          onClick={() => updateCharacter('personality', character.personality.filter((_, i) => i !== index))}
                          className="ml-2 text-blue-600 hover:text-blue-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <EnhancedCharacterAssistant
                    worldContext={worldContext}
                    characterData={character}
                    onSuggestion={(field, value) => updateCharacter(field as keyof CharacterData, value)}
                    suggestionType="personality"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Apparence Physique</label>
                <textarea
                  value={character.appearance}
                  onChange={(e) => updateCharacter('appearance', e.target.value)}
                  className="w-full border border-gray-300 rounded-md shadow-sm p-2 mb-2"
                  rows={3}
                  placeholder="Décrivez l'apparence du personnage"
                />
                <EnhancedCharacterAssistant
                  worldContext={worldContext}
                  characterData={character}
                  onSuggestion={(field, value) => updateCharacter(field as keyof CharacterData, value)}
                  suggestionType="appearance"
                />
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Histoire Personnelle</label>
                <textarea
                  value={character.backstory}
                  onChange={(e) => updateCharacter('backstory', e.target.value)}
                  className="w-full border border-gray-300 rounded-md shadow-sm p-2 mb-2"
                  rows={4}
                  placeholder="Racontez l'histoire du personnage"
                />
                <EnhancedCharacterAssistant
                  worldContext={worldContext}
                  characterData={character}
                  onSuggestion={(field, value) => updateCharacter(field as keyof CharacterData, value)}
                  suggestionType="backstory"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Relation au Monde du Projet</label>
                <textarea
                  value={character.worldRelation}
                  onChange={(e) => updateCharacter('worldRelation', e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  rows={3}
                  placeholder="Comment ce personnage s'intègre-t-il au monde de votre projet ?"
                />
                {worldContext && (
                  <p className="text-sm text-gray-600 mt-2">
                    Monde détecté: {getGenreString(worldContext.genre)} - {worldContext.description}
                  </p>
                )}
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Capacités/Pouvoirs</label>
                <div className="mt-2 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {character.abilities.map((ability, index) => (
                      <span key={index} className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                        {ability}
                        <button
                          onClick={() => updateCharacter('abilities', character.abilities.filter((_, i) => i !== index))}
                          className="ml-2 text-purple-600 hover:text-purple-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <EnhancedCharacterAssistant
                    worldContext={worldContext}
                    characterData={character}
                    onSuggestion={(field, value) => updateCharacter(field as keyof CharacterData, value)}
                    suggestionType="abilities"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700" htmlFor="voiceId">Voix SAPI</label>
                <div className="flex gap-2">
                  <select
                    id="voiceId"
                    value={character.voiceId}
                    onChange={(e) => updateCharacter('voiceId', e.target.value)}
                    className="flex-1 border border-gray-300 rounded-md shadow-sm p-2"
                    title="Sélectionnez une voix SAPI pour le personnage"
                  >
                    <option value="">Sélectionnez une voix</option>
                    <option value="Microsoft-Zira">Zira (Femme, Anglais)</option>
                    <option value="Microsoft-David">David (Homme, Anglais)</option>
                    <option value="Microsoft-Hortense">Hortense (Femme, Français)</option>
                    {/* Add more voices from SAPIService */}
                  </select>
                  <button
                    onClick={previewVoice}
                    disabled={!character.voiceId || isPlayingPreview}
                    className="px-3 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    title="Aperçu de la voix"
                  >
                    <Volume2 size={16} />
                    {isPlayingPreview ? '...' : 'Aperçu'}
                  </button>
                </div>
                {audioPreviewUrl && (
                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-sm text-green-800">🎵 Aperçu audio généré avec succès</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border">
                <h3 className="text-xl font-bold mb-4 text-gray-900 flex items-center gap-2">
                  <Eye size={20} />
                  Aperçu Final du Personnage
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="bg-white p-4 rounded-md shadow-sm">
                      <h4 className="font-semibold text-gray-800 mb-2">Informations de Base</h4>
                      <div className="space-y-1 text-sm">
                        <div><strong>Nom:</strong> {character.name || 'Non défini'}</div>
                        <div><strong>Genre:</strong> {character.gender === 'male' ? 'Masculin' : character.gender === 'female' ? 'Féminin' : 'Autre'}</div>
                        <div><strong>Âge:</strong> {character.age} ans</div>
                        <div><strong>Voix:</strong> {character.voiceId || 'Non définie'}</div>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-md shadow-sm">
                      <h4 className="font-semibold text-gray-800 mb-2">Traits de Personnalité</h4>
                      <div className="flex flex-wrap gap-1">
                        {character.personality.length > 0 ? (
                          character.personality.map((trait, index) => (
                            <span key={index} className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                              {trait}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-500 text-sm">Aucun trait défini</span>
                        )}
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-md shadow-sm">
                      <h4 className="font-semibold text-gray-800 mb-2">Capacités</h4>
                      <div className="flex flex-wrap gap-1">
                        {character.abilities.length > 0 ? (
                          character.abilities.map((ability, index) => (
                            <span key={index} className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
                              {ability}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-500 text-sm">Aucune capacité définie</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-white p-4 rounded-md shadow-sm">
                      <h4 className="font-semibold text-gray-800 mb-2">Apparence Physique</h4>
                      <p className="text-sm text-gray-700">
                        {character.appearance || 'Non décrite'}
                      </p>
                    </div>

                    <div className="bg-white p-4 rounded-md shadow-sm">
                      <h4 className="font-semibold text-gray-800 mb-2">Histoire Personnelle</h4>
                      <p className="text-sm text-gray-700 line-clamp-4">
                        {character.backstory || 'Non racontée'}
                      </p>
                    </div>

                    <div className="bg-white p-4 rounded-md shadow-sm">
                      <h4 className="font-semibold text-gray-800 mb-2">Lien au Monde</h4>
                      <p className="text-sm text-gray-700">
                        {character.worldRelation || 'Non défini'}
                      </p>
                      {worldContext && (
                        <p className="text-xs text-gray-500 mt-1">
                          Monde: {getGenreString(worldContext.genre)} - {worldContext.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800">
                    <strong>Validation:</strong> Assurez-vous que tous les champs importants sont remplis.
                    Le personnage sera sauvegardé dans votre projet et pourra être utilisé dans vos séquences.
                  </p>
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
          <div className="flex space-x-2">
            {currentStep < steps.length - 1 ? (
              <button
                onClick={handleNext}
                className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                Suivant
                <ChevronRight size={16} className="ml-2" />
              </button>
            ) : (
              <button
                onClick={handleSave}
                className="flex items-center px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
              >
                <Save size={16} className="mr-2" />
                Sauvegarder
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

