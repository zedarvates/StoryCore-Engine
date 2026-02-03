/**
 * Create Project Wizard
 * 3-step guided wizard: World → Characters → Scenario
 */

import React, { useState } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { useToast } from '@/hooks/use-toast';
import { StepProgress } from '@/components/ui/progress';
import {
  Globe,
  Users,
  FileText,
  ChevronRight,
  ChevronLeft,
  Check,
  Sparkles,
  Plus,
  Trash2,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface World {
  id: string;
  name: string;
  description: string;
  era: string;
  atmosphere: string;
  technology: string;
}

interface Character {
  id: string;
  name: string;
  role: string;
  description: string;
  personality: string;
  appearance: string;
}

interface Scenario {
  title: string;
  genre: string;
  synopsis: string;
  tone: string;
  targetDuration: number;
  acts: number;
}

type Step = 'world' | 'characters' | 'scenario';

interface CreateProjectWizardProps {
  onComplete?: (data: { world: World; characters: Character[]; scenario: Scenario }) => void;
  onCancel?: () => void;
  className?: string;
}

export function CreateProjectWizard({
  onComplete,
  onCancel,
  className,
}: CreateProjectWizardProps) {
  const { toast } = useToast();
  const createProject = useAppStore((state) => state.createProject);
  
  const [currentStep, setCurrentStep] = useState<Step>('world');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [world, setWorld] = useState<World>({
    id: '',
    name: '',
    description: '',
    era: 'present',
    atmosphere: 'realistic',
    technology: 'modern',
  });
  
  const [characters, setCharacters] = useState<Character[]>([
    { id: 'char_1', name: '', role: 'Protagonist', description: '', personality: '', appearance: '' },
  ]);
  
  const [scenario, setScenario] = useState<Scenario>({
    title: '',
    genre: 'drama',
    synopsis: '',
    tone: 'neutral',
    targetDuration: 10,
    acts: 3,
  });

  const steps = [
    { label: 'Monde', description: 'Univers & époque' },
    { label: 'Personnages', description: 'Cast & rôles' },
    { label: 'Scénario', description: 'Synopsis & structure' },
  ];

  const goToStep = (step: Step) => {
    setCurrentStep(step);
  };

  const nextStep = () => {
    if (currentStep === 'world') {
      if (!world.name.trim()) {
        toast({ title: 'Nom requis', description: 'Donnez un nom à votre monde', variant: 'destructive' });
        return;
      }
      goToStep('characters');
    } else if (currentStep === 'characters') {
      if (characters.length === 0 || !characters[0]?.name.trim()) {
        toast({ title: 'Personnage requis', description: 'Ajoutez au moins un personnage', variant: 'destructive' });
        return;
      }
      goToStep('scenario');
    } else {
      handleComplete();
    }
  };

  const prevStep = () => {
    if (currentStep === 'scenario') {
      goToStep('characters');
    } else if (currentStep === 'characters') {
      goToStep('world');
    }
  };

  const handleComplete = async () => {
    if (!scenario.title.trim()) {
      toast({ title: 'Titre requis', description: 'Donnez un titre à votre scénario', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      const projectData = {
        world,
        characters,
        scenario,
      };

      // Call the onComplete callback if provided
      if (onComplete) {
        onComplete(projectData);
      }

      toast({ title: 'Projet créé', description: 'Votre projet a été créé avec succès' });
    } catch (error) {
      console.error('Error creating project:', error);
      toast({ title: 'Erreur', description: 'Impossible de créer le projet', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={cn('w-full max-w-4xl mx-auto p-6', className)}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Créer un nouveau projet</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Suivez les étapes pour définir votre univers, vos personnages et votre scénario
        </p>
      </div>

      {/* Step Progress */}
      <div className="mb-8">
        <StepProgress
          steps={steps.map((s) => s.label)}
          currentStep={steps.findIndex((s) => s.label.toLowerCase() === currentStep)}
        />
      </div>

      {/* Step Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
        {currentStep === 'world' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Globe className="w-6 h-6" />
              Définir le monde
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Créez l'univers dans lequel se déroulera votre histoire
            </p>
            {/* World form fields would go here */}
            <div className="text-center text-gray-500">
              World building form placeholder
            </div>
          </div>
        )}

        {currentStep === 'characters' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Users className="w-6 h-6" />
              Créer les personnages
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Définissez les personnages principaux de votre histoire
            </p>
            {/* Characters form fields would go here */}
            <div className="text-center text-gray-500">
              Character creation form placeholder
            </div>
          </div>
        )}

        {currentStep === 'scenario' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <FileText className="w-6 h-6" />
              Écrire le scénario
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Définissez la structure et le synopsis de votre histoire
            </p>
            {/* Scenario form fields would go here */}
            <div className="text-center text-gray-500">
              Scenario form placeholder
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <button
          onClick={currentStep === 'world' ? onCancel : prevStep}
          disabled={isLoading || isSaving}
          className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
        >
          <ChevronLeft className="w-4 h-4 inline mr-2" />
          {currentStep === 'world' ? 'Annuler' : 'Précédent'}
        </button>

        <button
          onClick={nextStep}
          disabled={isLoading || isSaving}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Création...
            </>
          ) : currentStep === 'scenario' ? (
            <>
              <Check className="w-4 h-4" />
              Créer le projet
            </>
          ) : (
            <>
              Suivant
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
