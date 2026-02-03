/**
 * MarketingWizard - Assistant de creation de contenu marketing
 * 
 * Ce wizard guide l'utilisateur a travers le processus de creation
 * de contenus marketing (trailers, teasers, clips, thumbnails)
 */

import React, { useState, useCallback } from 'react';
import { WizardStepIndicator } from '../WizardStepIndicator';
import {
  Film,
  Crosshair,
  Music,
  Play,
  Image,
  TrendingUp,
  Youtube,
  Twitter,
  Share2
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export type MarketingContentType = 'trailer' | 'teaser' | 'clip' | 'thumbnail';
export type VisualStyle = 'dynamic' | 'dramatic' | 'humorous' | 'elegant' | 'minimalist' | 'energetic';
export type TargetPlatform = 'youtube' | 'instagram' | 'tiktok' | 'facebook' | 'twitter' | 'linkedin';
export type MusicMood = 'epic' | 'soft' | 'tense' | 'happy' | 'mysterious' | 'neutral';

export interface SequenceConfig {
  id: string;
  name: string;
  duration: number;
  description: string;
  aiPrompt: string;
  order: number;
}

export interface ExportSettings {
  resolution: string;
  format: 'mp4' | 'webm' | 'gif';
  quality: 'low' | 'medium' | 'high';
  aspectRatio: string;
}

export interface MarketingPlan {
  type: MarketingContentType;
  duration: number;
  platform: TargetPlatform;
  style: VisualStyle;
  musicMood: MusicMood;
  sequences: SequenceConfig[];
  exportSettings: ExportSettings;
  title?: string;
  description?: string;
}

export interface MarketingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (marketingPlan: MarketingPlan) => void;
  projectData: {
    projectId: string;
    projectName: string;
    storySummary?: string;
    characters?: string[];
    scenes?: string[];
  };
}

// ============================================================================
// CONSTANTES DE CONFIGURATION
// ============================================================================

export const CONTENT_TYPES: { value: MarketingContentType; label: string; icon: React.ReactNode; description: string }[] = [
  { 
    value: 'trailer', 
    label: 'Bande-annonce', 
    icon: <Film size={24} />,
    description: 'Presentation complete du projet (30s - 3min)'
  },
  { 
    value: 'teaser', 
    label: 'Teaser', 
    icon: <TrendingUp size={24} />,
    description: 'Apercu court pour creer l\'interet (15-30s)'
  },
  { 
    value: 'clip', 
    label: 'Clip promotionnel', 
    icon: <Play size={24} />,
    description: 'Clip dynamique pour les reseaux (15-60s)'
  },
  { 
    value: 'thumbnail', 
    label: 'Affiche/Thumbnail', 
    icon: <Image size={24} />,
    description: 'Image fixe pour les vignettes'
  }
];

export const VISUAL_STYLES: { value: VisualStyle; label: string; description: string }[] = [
  { value: 'dynamic', label: 'Dynamique', description: 'Mouvements rapides, transitions energetiques' },
  { value: 'dramatic', label: 'Dramatique', description: 'Eclairage cinematographique, tensions visuelles' },
  { value: 'humorous', label: 'Humoristique', description: 'Couleurs vives, timing comique' },
  { value: 'elegant', label: 'Elegant', description: 'Mouvements fluides, sobriete visuelle' },
  { value: 'minimaliste', label: 'Minimaliste', description: 'Design epure, espaces negatifs' },
  { value: 'energetic', label: 'Energetique', description: 'Rythme soutenu, effets percutants' }
];

export const PLATFORMS: { value: TargetPlatform; label: string; icon: React.ReactNode; aspectRatio: string }[] = [
  { value: 'youtube', label: 'YouTube', icon: <Youtube size={20} />, aspectRatio: '16:9' },
  { value: 'instagram', label: 'Instagram', icon: <Share2 size={20} />, aspectRatio: '1:1' },
  { value: 'tiktok', label: 'TikTok', icon: <Film size={20} />, aspectRatio: '9:16' },
  { value: 'facebook', label: 'Facebook', icon: <Crosshair size={20} />, aspectRatio: '16:9' },
  { value: 'twitter', label: 'Twitter/X', icon: <Twitter size={20} />, aspectRatio: '16:9' },
  { value: 'linkedin', label: 'LinkedIn', icon: <Crosshair size={20} />, aspectRatio: '16:9' }
];

export const MUSIC_MOODS: { value: MusicMood; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'epic', label: 'Epique', icon: <Music size={20} />, description: 'Orchestral, grandiose' },
  { value: 'soft', label: 'Doux', icon: <Music size={20} />, description: 'Acoustique, melancholique' },
  { value: 'tense', label: 'Tension', icon: <Music size={20} />, description: 'Inquietant, suspense' },
  { value: 'happy', label: 'Joyeux', icon: <Music size={20} />, description: 'Uptempo, entrainant' },
  { value: 'mysterious', label: 'Mysterieux', icon: <Music size={20} />, description: 'Ambiant, enigmatic' },
  { value: 'neutral', label: 'Neutre', icon: <Music size={20} />, description: 'Background, discret' }
];

export const DURATION_OPTIONS = [
  { value: 15, label: '15 secondes' },
  { value: 30, label: '30 secondes' },
  { value: 60, label: '1 minute' },
  { value: 90, label: '1 minute 30' },
  { value: 120, label: '2 minutes' },
  { value: 180, label: '3 minutes' }
];

export const RESOLUTION_OPTIONS = [
  { value: '720p', label: '1280x720 (HD)' },
  { value: '1080p', label: '1920x1080 (Full HD)' },
  { value: '4k', label: '3840x2160 (4K)' },
  { value: 'square', label: '1080x1080 (Carre)' },
  { value: 'portrait', label: '1080x1920 (Portrait)' }
];

// ============================================================================
// COMPOSANTS DE SELECTION
// ============================================================================

interface CardSelectionProps<T> {
  options: readonly T[];
  selectedValue: T;
  onSelect: (value: T) => void;
  renderOption: (option: T) => React.ReactNode;
  className?: string;
}

function CardSelection<T>({ options, selectedValue, onSelect, renderOption, className = '' }: CardSelectionProps<T>) {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 gap-4 ${className}`}>
      {options.map((option) => (
        <button
          key={String(option.value || option)}
          onClick={() => onSelect(option.value || option)}
          className={`
            p-4 rounded-lg border-2 transition-all duration-200 text-left
            ${selectedValue === (option.value || option)
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
            }
          `}
        >
          {renderOption(option)}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// ETAPES DU WIZARD
// ============================================================================

interface Step1ContentTypeProps {
  data: Partial<MarketingPlan>;
  onUpdate: (data: Partial<MarketingPlan>) => void;
}

function Step1ContentType({ data, onUpdate }: Step1ContentTypeProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        Selectionnez le type de contenu marketing
      </h3>
      <CardSelection
        options={CONTENT_TYPES}
        selectedValue={data.type || ''}
        onSelect={(type) => onUpdate({ type: type as MarketingContentType })}
        renderOption={(option) => (
          <div className="flex items-start gap-3">
            <div className="text-blue-500">{option.icon}</div>
            <div>
              <div className="font-medium text-gray-900 dark:text-white">{option.label}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{option.description}</div>
            </div>
          </div>
        )}
      />
    </div>
  );
}

interface Step2ParametersProps {
  data: Partial<MarketingPlan>;
  onUpdate: (data: Partial<MarketingPlan>) => void;
}

function Step2Parameters({ data, onUpdate }: Step2ParametersProps) {
  const selectedPlatform = PLATFORMS.find(p => p.value === data.platform);
  
  return (
    <div className="space-y-6">
      {/* Duree */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Duree souhaitee
        </label>
        <select
          value={data.duration || 30}
          onChange={(e) => onUpdate({ duration: parseInt(e.target.value) })}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {DURATION_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Style visuel */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Style visuel
        </label>
        <CardSelection
          options={VISUAL_STYLES}
          selectedValue={data.style || ''}
          onSelect={(style) => onUpdate({ style: style as VisualStyle })}
          renderOption={(option) => (
            <div>
              <div className="font-medium text-gray-900 dark:text-white">{option.label}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{option.description}</div>
            </div>
          )}
        />
      </div>

      {/* Plateforme */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Plateforme cible
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {PLATFORMS.map(platform => (
            <button
              key={platform.value}
              onClick={() => onUpdate({ 
                platform: platform.value as TargetPlatform,
                exportSettings: {
                  ...data.exportSettings,
                  aspectRatio: platform.aspectRatio
                }
              })}
              className={`
                flex items-center gap-2 p-3 rounded-lg border-2 transition-all
                ${data.platform === platform.value
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                }
              `}
            >
              <span className="text-blue-500">{platform.icon}</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {platform.label}
              </span>
            </button>
          ))}
        </div>
        {selectedPlatform && (
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Ratio d\'aspect recommande: {selectedPlatform.aspectRatio}
          </p>
        )}
      </div>
    </div>
  );
}

interface Step3MusicProps {
  data: Partial<MarketingPlan>;
  onUpdate: (data: Partial<MarketingPlan>) => void;
}

function Step3Music({ data, onUpdate }: Step3MusicProps) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        Musique et ambiance sonore
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {MUSIC_MOODS.map(mood => (
          <button
            key={mood.value}
            onClick={() => onUpdate({ musicMood: mood.value as MusicMood })}
            className={`
              p-4 rounded-lg border-2 transition-all text-left
              ${data.musicMood === mood.value
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
              }
            `}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-blue-500">{mood.icon}</span>
              <span className="font-medium text-gray-900 dark:text-white">{mood.label}</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{mood.description}</p>
          </button>
        ))}
      </div>
      
      {/* Option musique personnalisee */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="w-4 h-4 text-blue-500 rounded focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Utiliser une musique personnalisee
          </span>
        </label>
      </div>
    </div>
  );
}

interface Step4GenerateProps {
  data: Partial<MarketingPlan>;
  onUpdate: (data: Partial<MarketingPlan>) => void;
  projectData: MarketingWizardProps['projectData'];
}

function Step4Generate({ data, onUpdate, projectData }: Step4GenerateProps) {
  // Generer les sequences basees sur les choix
  const generateSequences = useCallback((): SequenceConfig[] => {
    const sequences: SequenceConfig[] = [];
    const totalDuration = data.duration || 30;
    const type = data.type || 'teaser';
    
    if (type === 'thumbnail') {
      sequences.push({
        id: 'seq-1',
        name: 'Thumbnail principale',
        duration: 0,
        description: 'Image fixe pour la vignette',
        aiPrompt: `Create a striking thumbnail for "${projectData.projectName}". ${data.style ? `Style: ${data.style}.` : ''} ${projectData.storySummary ? `Context: ${projectData.storySummary}` : ''}`,
        order: 1
      });
    } else {
      // Sequences pour trailers, teasers, clips
      const introDuration = Math.min(5, Math.floor(totalDuration * 0.2));
      const mainDuration = Math.floor(totalDuration * 0.6);
      const outroDuration = Math.min(5, totalDuration - introDuration - mainDuration);
      
      sequences.push({
        id: 'seq-intro',
        name: 'Intro',
        duration: introDuration,
        description: 'Accroche initiale avec titre/logo',
        aiPrompt: `Create an engaging intro for "${projectData.projectName}". Style: ${data.style || 'dynamic'}. Duration: ${introDuration}s.`,
        order: 1
      });
      
      sequences.push({
        id: 'seq-main',
        name: 'Corps principal',
        duration: mainDuration,
        description: 'Scenes principales du contenu',
        aiPrompt: `Create main content highlights for "${projectData.projectName}". ${projectData.storySummary ? `Story context: ${projectData.storySummary}.` : ''} ${projectData.characters ? `Characters: ${projectData.characters.join(', ')}.` : ''} Style: ${data.style || 'dynamic'}. Duration: ${mainDuration}s.`,
        order: 2
      });
      
      sequences.push({
        id: 'seq-outro',
        name: 'Outro',
        duration: outroDuration,
        description: 'Appel a l\'action / Logo final',
        aiPrompt: `Create a compelling outro for "${projectData.projectName}" with call-to-action. Style: ${data.style || 'dynamic'}. Duration: ${outroDuration}s.`,
        order: 3
      });
    }
    
    return sequences;
  }, [data, projectData]);

  const [sequences] = useState<SequenceConfig[]>(() => generateSequences());
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const handleComplete = () => {
    const platform = PLATFORMS.find(p => p.value === data.platform);
    onUpdate({
      sequences,
      title: title || `${projectData.projectName} - ${data.type}`,
      description: description || `Marketing content for ${projectData.projectName}`,
      exportSettings: {
        resolution: '1080p',
        format: 'mp4',
        quality: 'high',
        aspectRatio: platform?.aspectRatio || '16:9'
      }
    });
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        Generer le plan marketing
      </h3>
      
      {/* Resume des parametres */}
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <h4 className="font-medium text-gray-900 dark:text-white mb-3">Recapitulatif</h4>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Type</dt>
            <dd className="font-medium text-gray-900 dark:text-white">
              {CONTENT_TYPES.find(t => t.value === data.type)?.label || 'Non defini'}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Duree</dt>
            <dd className="font-medium text-gray-900 dark:text-white">
              {data.duration} secondes
            </dd>
          </div>
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Style</dt>
            <dd className="font-medium text-gray-900 dark:text-white">
              {VISUAL_STYLES.find(s => s.value === data.style)?.label || 'Non defini'}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Plateforme</dt>
            <dd className="font-medium text-gray-900 dark:text-white">
              {PLATFORMS.find(p => p.value === data.platform)?.label || 'Non defini'}
            </dd>
          </div>
        </dl>
      </div>
      
      {/* Sequences generees */}
      <div>
        <h4 className="font-medium text-gray-900 dark:text-white mb-3">
          Sequences generees ({sequences.length})
        </h4>
        <div className="space-y-3">
          {sequences.map((seq, index) => (
            <div
              key={seq.id}
              className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900 dark:text-white">
                  {index + 1}. {seq.name}
                </span>
                {seq.duration > 0 && (
                  <span className="text-sm text-gray-500">
                    {seq.duration}s
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {seq.description}
              </p>
            </div>
          ))}
        </div>
      </div>
      
      {/* Informations supplementaires */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Titre du projet marketing (optionnel)
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={`${projectData.projectName} - ${data.type}`}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description (optionnel)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={`Marketing content for ${projectData.projectName}`}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

export function MarketingWizard({ isOpen, onClose, onComplete, projectData }: MarketingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<Partial<MarketingPlan>>({});
  const [error, setError] = useState<string | null>(null);

  const steps = [
    { title: 'Type de contenu', component: Step1ContentType },
    { title: 'Parametres', component: Step2Parameters },
    { title: 'Musique', component: Step3Music },
    { title: 'Generation', component: Step4Generate }
  ];

  const CurrentStepComponent = steps[currentStep].component;

  const handleNext = () => {
    // Validation basique
    if (currentStep === 0 && !data.type) {
      setError('Veuillez selectionner un type de contenu');
      return;
    }
    
    setError(null);
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Generer le plan final et fermer
      const platform = PLATFORMS.find(p => p.value === data.platform);
      const finalPlan: MarketingPlan = {
        type: data.type as MarketingContentType,
        duration: data.duration || 30,
        platform: data.platform as TargetPlatform,
        style: data.style as VisualStyle,
        musicMood: data.musicMood as MusicMood,
        sequences: data.sequences || [],
        exportSettings: data.exportSettings || {
          resolution: '1080p',
          format: 'mp4',
          quality: 'high',
          aspectRatio: platform?.aspectRatio || '16:9'
        },
        title: data.title,
        description: data.description
      };
      onComplete(finalPlan);
      onClose();
    }
  };

  const handleBack = () => {
    setError(null);
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    setData({});
    setCurrentStep(0);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={handleClose} />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-4xl bg-white dark:bg-gray-900 rounded-xl shadow-xl" onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Marketing Wizard
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Creation de contenu promotionnel pour "{projectData.projectName}"
            </p>
          </div>

          {/* Progress Bar */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <WizardStepIndicator
              steps={steps.map((s, i) => ({ number: i + 1, title: s.title }))}
              currentStep={currentStep + 1}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="mx-6 mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center justify-between">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="text-red-400 hover:text-red-600 dark:hover:text-red-300"
                >
                  *
                </button>
              </div>
            </div>
          )}

          {/* Step Content */}
          <div className="p-6 min-h-[400px]">
            <CurrentStepComponent data={data} onUpdate={setData} projectData={projectData} />
          </div>

          {/* Navigation Buttons */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between">
            <button
              onClick={handleBack}
              disabled={currentStep === 0}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Retour
            </button>
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                Annuler
              </button>
              <button
                onClick={handleNext}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {currentStep === steps.length - 1 ? 'Generer' : 'Suivant'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MarketingWizard;

