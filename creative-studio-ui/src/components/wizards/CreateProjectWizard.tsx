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
