import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../ui/card';
import { Button } from '../../ui/button';
import { Textarea } from '../../ui/textarea';
import { Label } from '../../ui/label';
import { Switch } from '../../ui/switch';
import { Slider } from '../../ui/slider';
import { RadioGroup, RadioGroupItem } from '../../ui/radio-group';
import { useStore } from '../../../store';
import { useAddonVoiceCommands } from '../../../hooks/useAddonVoiceCommands';
import type { AddonActionPayload } from '../../../services/AddonVoiceCommandRouter';
import { useToast } from '../../../hooks/use-toast';
import type { SequencePlan } from '../../../types/sequencePlan';

export const CreditsScreenEditor: React.FC = () => {
  const project = useStore((state) => state.project);
  const setProject = useStore((state) => state.setProject);
  const { toast } = useToast();
  
  const [text, setText] = useState('DIRECTED BY\nCline AI\n\nPRODUCED BY\nStoryCore Addon System');
  const [duration, setDuration] = useState(10);
  const [scrollSpeed, setScrollSpeed] = useState(50);
  const [includePegi, setIncludePegi] = useState(true);
  const [includeStoryCore, setIncludeStoryCore] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // New features
  const [autoAddSequence, setAutoAddSequence] = useState(true);
  const [placement, setPlacement] = useState<'beginning' | 'end'>('end');

  // Hook pour les commandes vocales
  useAddonVoiceCommands({
    addonId: 'credits-screen',
    onGenerate: (payload: unknown) => {
      const p = payload as AddonActionPayload;
      if (p.prompt) {
        setText((prev) => `${prev}\n\n${p.prompt}`);
      }
      handleGenerate();
    },
    onCancel: () => setIsGenerating(false),
  });

  const handleGenerate = async () => {
    if (!project) {
      toast({
        title: "Erreur",
        description: "Aucun projet chargé",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);

    // Create the sequence plan first, before trying to call the backend
    if (autoAddSequence) {
      const newPlan: SequencePlan = {
        id: `credits-${Date.now()}`,
        name: placement === 'beginning' ? 'Générique de début' : 'Générique de fin',
        description: `Générique cinématique auto-généré (${duration}s)`,
        worldId: project.worlds?.[0]?.id || 'default',
        targetDuration: duration,
        frameRate: 24,
        resolution: { width: 1920, height: 1080 },
        acts: [],
        scenes: [],
        shots: [], // We could add a special credit shot here
        createdAt: Date.now(),
        modifiedAt: Date.now(),
        status: 'completed',
        tags: ['credits', 'automatic']
      };

      const currentPlans = [...(project.sequencePlans || [])];
      if (placement === 'beginning') {
        currentPlans.unshift(newPlan);
      } else {
        currentPlans.push(newPlan);
      }

      setProject({
        ...project,
        sequencePlans: currentPlans
      });

      toast({
        title: "Succès",
        description: `Générique ajouté au plan ${placement === 'beginning' ? 'au début' : 'à la fin'}.`,
      });
    }

    try {
      // Simulation of generating the video file
      const response = await fetch('/api/addons/credits_screen/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_id: project.id || 'default_project',
          text,
          duration,
          scroll_speed: scrollSpeed,
          include_pegi: includePegi,
          include_storycore: includeStoryCore,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate credits');
      }

      const result = await response.json();
      
      if (!autoAddSequence) {
        toast({
          title: "Succès",
          description: "Générique vidéo généré avec succès !",
        });
      }

      console.log('Credits result:', result);
    } catch (error) {
      console.error('Error generating credits:', error);
      toast({
        title: "Erreur",
        description: "Échec de la génération du générique",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl border-slate-200 dark:border-slate-800">
      <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
        <CardTitle className="flex items-center gap-2 text-xl">
          🎬 Cinematic Credits Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="space-y-2">
          <Label htmlFor="credits-text">Texte du générique</Label>
          <Textarea
            id="credits-text"
            placeholder="Entrez les noms, rôles, remerciements..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-[150px] font-mono text-sm bg-black text-white rounded-xl focus:ring-purple-500"
          />
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
            ASTUCE: L'IA peut générer ce texte pour vous via la commande vocale.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-8 py-2">
          <div className="space-y-4">
            <Label className="text-sm font-semibold">Paramètres visuels</Label>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>Durée</span>
                <span className="font-bold text-purple-600">{duration}s</span>
              </div>
              <Slider
                min={5}
                max={60}
                step={1}
                value={[duration]}
                onValueChange={(val) => setDuration(val[0])}
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>Vitesse de défilement</span>
                <span className="font-bold text-blue-600">{scrollSpeed} px/s</span>
              </div>
              <Slider
                min={10}
                max={200}
                step={5}
                value={[scrollSpeed]}
                onValueChange={(val) => setScrollSpeed(val[0])}
              />
            </div>
          </div>

          <div className="space-y-4 bg-slate-50/50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/50">
            <Label className="text-sm font-semibold">Placement automatique</Label>
            <div className="flex items-center space-x-2 pt-1">
              <Switch
                id="auto-add"
                checked={autoAddSequence}
                onCheckedChange={setAutoAddSequence}
              />
              <Label htmlFor="auto-add" className="text-xs cursor-pointer">Ajouter au projet</Label>
            </div>
            
            <RadioGroup 
              value={placement} 
              onValueChange={(v) => setPlacement(v as 'beginning' | 'end')}
              disabled={!autoAddSequence}
              className="grid grid-cols-2 gap-2 mt-2"
            >
              <div className="flex items-center space-x-2 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
                <RadioGroupItem value="beginning" id="p-start" />
                <Label htmlFor="p-start" className="text-[10px] cursor-pointer">Début</Label>
              </div>
              <div className="flex items-center space-x-2 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
                <RadioGroupItem value="end" id="p-end" />
                <Label htmlFor="p-end" className="text-[10px] cursor-pointer">Fin</Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-3 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
            <div className="space-y-0.5">
              <Label className="text-xs">PEGI & Censure</Label>
              <p className="text-[9px] text-muted-foreground">Watermarks semi-transparents</p>
            </div>
            <Switch
              checked={includePegi}
              onCheckedChange={setIncludePegi}
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
            <div className="space-y-0.5">
              <Label className="text-xs">Attribution Engine</Label>
              <p className="text-[9px] text-muted-foreground">Mention StoryCore à la fin</p>
            </div>
            <Switch
              checked={includeStoryCore}
              onCheckedChange={setIncludeStoryCore}
            />
          </div>
        </div>
      </CardContent>
      <CardFooter className="bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 pt-4">
        <Button 
          className="w-full h-12 text-md font-bold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl shadow-lg transition-all transform hover:scale-[1.01] active:scale-[0.99]" 
          onClick={handleGenerate} 
          disabled={isGenerating || !text.trim()}
        >
          {isGenerating ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin text-lg">🎬</span> Rendu du générique en cours...
            </span>
          ) : '🎬 Générer le générique vidéo'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default CreditsScreenEditor;
