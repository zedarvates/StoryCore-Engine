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
  Trash2,
  Loader2,
  Wand2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useLLMGeneration } from '@/hooks/useLLMGeneration';

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
  // const createProject = useAppStore((state) => state.createProject); // Removed invalid selector
  const [isAIProcessing, setIsAIProcessing] = useState(false);

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
    }
  };

  const generateContent = async (prompt: string, context: string): Promise<string | null> => {
    setIsAIProcessing(true);
    try {
      // Use LLMConfigService directly to avoid hook issues
      const { llmConfigService } = await import('@/services/llmConfigService');
      const service = llmConfigService.getService();

      if (!service) {
        toast({ title: 'Service non disponible', description: 'Configurez le LLM dans les paramètres', variant: 'destructive' });
        return null;
      }

      const response = await service.generateCompletion({
        prompt,
        systemPrompt: `You are a creative assistant helping with ${context}.`,
        temperature: 0.7
      });

      if (response.success && response.data) {
        return response.data.content;
      } else {
        throw new Error(response.error || 'Generation failed');
      }
    } catch (error) {
      console.error('Generation failed', error);
      toast({ title: 'Erreur', description: 'La génération a échoué', variant: 'destructive' });
      return null;
    } finally {
      setIsAIProcessing(false);
    }
  };

  const handleGenerateWorld = async () => {
    if (!world.name) return;
    const prompt = `Generate a creative description for a world named "${world.name}" set in a ${world.era} era with a ${world.atmosphere} atmosphere and ${world.technology} technology level. Keep it under 100 words.`;
    const result = await generateContent(prompt, 'world-building');
    if (result) {
      setWorld(prev => ({ ...prev, description: result }));
    }
  };

  const handleGenerateCharacter = async (index: number) => {
    const char = characters[index];
    if (!char.name || !char.role) return;
    const prompt = `Generate a brief personality and appearance description for a character named "${char.name}" who is a ${char.role} in a ${world.atmosphere} ${world.era} setting. Keep it under 50 words.`;
    const result = await generateContent(prompt, 'character-creation');
    if (result) {
      handleUpdateCharacter(index, 'description', result);
    }
  };

  const handleGenerateScenario = async () => {
    if (!scenario.title) return;
    const prompt = `Generate a synopsis for a ${scenario.genre} story titled "${scenario.title}" with a ${scenario.tone} tone, set in a world described as: ${world.description}. The protagonist is ${characters[0]?.name}. Keep it under 150 words.`;
    const result = await generateContent(prompt, 'story-writing');
    if (result) {
      setScenario(prev => ({ ...prev, synopsis: result }));
    }
  };

  const handleUpdateCharacter = (index: number, field: keyof Character, value: string) => {
    const newChars = [...characters];
    newChars[index] = { ...newChars[index], [field]: value };
    setCharacters(newChars);
  };

  const addCharacter = () => {
    setCharacters([...characters, {
      id: `char_${Date.now()}`,
      name: '',
      role: 'Supporting',
      description: '',
      personality: '',
      appearance: ''
    }]);
  };

  const removeCharacter = (index: number) => {
    if (characters.length > 1) {
      const newChars = characters.filter((_, i) => i !== index);
      setCharacters(newChars);
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
          steps={steps}
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
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="world-name">Nom du monde</Label>
                <Input
                  id="world-name"
                  value={world.name}
                  onChange={(e) => setWorld({ ...world, name: e.target.value })}
                  placeholder="Ex: Terra Nova"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label>Époque</Label>
                  <Select value={world.era} onValueChange={(v) => setWorld({ ...world, era: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ancient">Antique</SelectItem>
                      <SelectItem value="medieval">Médiéval</SelectItem>
                      <SelectItem value="modern">Moderne</SelectItem>
                      <SelectItem value="future">Futuriste</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Atmosphère</Label>
                  <Select value={world.atmosphere} onValueChange={(v) => setWorld({ ...world, atmosphere: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bright">Lumineuse</SelectItem>
                      <SelectItem value="dark">Sombre</SelectItem>
                      <SelectItem value="mysterious">Mystérieuse</SelectItem>
                      <SelectItem value="chaotic">Chaotique</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Technologie</Label>
                  <Select value={world.technology} onValueChange={(v) => setWorld({ ...world, technology: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="magic">Magique</SelectItem>
                      <SelectItem value="steampunk">Steampunk</SelectItem>
                      <SelectItem value="modern">Moderne</SelectItem>
                      <SelectItem value="hightech">High-Tech</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="world-desc">Description</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleGenerateWorld}
                    disabled={!world.name || isAIProcessing}
                    className="h-8 text-purple-600"
                  >
                    {isAIProcessing ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Wand2 className="w-3 h-3 mr-1" />}
                    Générer
                  </Button>
                </div>
                <Textarea
                  id="world-desc"
                  value={world.description}
                  onChange={(e) => setWorld({ ...world, description: e.target.value })}
                  placeholder="Décrivez votre monde..."
                  rows={4}
                />
              </div>
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
            <div className="space-y-6">
              {characters.map((char, index) => (
                <div key={char.id} className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-900/50 relative group">
                  <div className="absolute right-2 top-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCharacter(index)}
                      disabled={characters.length <= 1}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 hover:bg-red-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="grid gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Nom</Label>
                        <Input
                          value={char.name}
                          onChange={(e) => handleUpdateCharacter(index, 'name', e.target.value)}
                          placeholder="Nom du personnage"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Rôle</Label>
                        <Select value={char.role} onValueChange={(v) => handleUpdateCharacter(index, 'role', v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Protagonist">Protagoniste</SelectItem>
                            <SelectItem value="Antagonist">Antagoniste</SelectItem>
                            <SelectItem value="Supporting">Secondaire</SelectItem>
                            <SelectItem value="Mentor">Mentor</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <div className="flex items-center justify-between">
                        <Label>Description</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleGenerateCharacter(index)}
                          disabled={!char.name || isAIProcessing}
                          className="h-8 text-purple-600"
                        >
                          {isAIProcessing ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Wand2 className="w-3 h-3 mr-1" />}
                          Générer
                        </Button>
                      </div>
                      <Textarea
                        value={char.description}
                        onChange={(e) => handleUpdateCharacter(index, 'description', e.target.value)}
                        placeholder="Description, personnalité..."
                        rows={2}
                      />
                    </div>
                  </div>
                </div>
              ))}

              <Button onClick={addCharacter} variant="outline" className="w-full dashed border-2">
                <Plus className="w-4 h-4 mr-2" />
                Ajouter un personnage
              </Button>
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
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="scenario-title">Titre du scénario</Label>
                <Input
                  id="scenario-title"
                  value={scenario.title}
                  onChange={(e) => setScenario({ ...scenario, title: e.target.value })}
                  placeholder="Titre de l'histoire"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Genre</Label>
                  <Select value={scenario.genre} onValueChange={(v) => setScenario({ ...scenario, genre: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fantasy">Fantasy</SelectItem>
                      <SelectItem value="scifi">Science-Fiction</SelectItem>
                      <SelectItem value="drama">Drame</SelectItem>
                      <SelectItem value="thriller">Thriller</SelectItem>
                      <SelectItem value="comedy">Comédie</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Ton</Label>
                  <Select value={scenario.tone} onValueChange={(v) => setScenario({ ...scenario, tone: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dark">Sombre</SelectItem>
                      <SelectItem value="hopeful">Optimiste</SelectItem>
                      <SelectItem value="serious">Sérieux</SelectItem>
                      <SelectItem value="humorous">Humoristique</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="synopsis">Synopsis</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleGenerateScenario}
                    disabled={!scenario.title || isAIProcessing}
                    className="h-8 text-purple-600"
                  >
                    {isAIProcessing ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Wand2 className="w-3 h-3 mr-1" />}
                    Générer
                  </Button>
                </div>
                <Textarea
                  id="synopsis"
                  value={scenario.synopsis}
                  onChange={(e) => setScenario({ ...scenario, synopsis: e.target.value })}
                  placeholder="Résumé de l'histoire..."
                  rows={6}
                />
              </div>
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
