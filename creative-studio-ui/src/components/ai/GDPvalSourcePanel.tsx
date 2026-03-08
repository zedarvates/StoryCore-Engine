
import React, { useState } from 'react';
import { promptOptimizer } from '../../services/ai/PromptOptimizationService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Search, BookOpen, UserCircle, Zap, Loader2 } from 'lucide-react';

interface GDPvalTask {
  id: string;
  occupation: string;
  phase: 'Pre-Production' | 'Production' | 'Post-Production';
  title: string;
  idealPrompt: string;
}

const GDPVAL_TASKS: GDPvalTask[] = [
  {
    id: 'creative-1',
    occupation: 'Creative Director',
    phase: 'Pre-Production',
    title: 'Cinematic Video Scene',
    idealPrompt: "En tant que Réalisateur Senior, je souhaite créer une séquence cinématique d'ouverture.\nContexte: Un plan large sur une métropole futuriste sous la pluie. Lumières néon, reflets sur le sol mouillé. Style Cyberpunk.\nLivrable attendu: Vidéo 4K, 24fps, mouvement de caméra lent vers l'avant (dolly in)."
  },
  {
    id: 'cinematographer-1',
    occupation: 'Cinematographer (DP)',
    phase: 'Production',
    title: 'Dramatic High-Contrast Lighting',
    idealPrompt: "En tant que Directeur de la Photographie, je dois configurer l'éclairage pour un interrogatoire tendu.\nContexte: Utilisation d'une seule source de lumière zénithale (Top Light) pour créer des ombres marquées sur les visages. Ratio de contraste 4:1. Objectif 35mm Anamorphique.\nLivrable attendu: Plan fixe avec grain de pellicule Kodak Vision3, profondeur de champ courte (f/2.8)."
  },
  {
    id: 'vfx-1',
    occupation: 'VFX Supervisor',
    phase: 'Post-Production',
    title: 'CGI Integration & Compositing',
    idealPrompt: "En tant que Superviseur VFX, je dois intégrer un vaisseau spatial en plein vol dans un paysage désertique.\nContexte: Tracking 3D précis, ajout de poussière et de chaleur dégagée par les moteurs. Match-moving indispensable.\nLivrable attendu: Séquence EXR avec passes de rendu (Albedo, Normals, Depth) pour le compositing final."
  },
  {
    id: 'colorist-1',
    occupation: 'Colorist',
    phase: 'Post-Production',
    title: 'Hollywood Teal & Orange Look',
    idealPrompt: "En tant qu'Étalonneur Senior, je dois appliquer un look 'Teal & Orange' moderne à une scène d'action.\nContexte: Accentuer les tons chair tout en refroidissant les ombres. Travail spécifique sur les courbes de saturation.\nLivrable attendu: Fichier .cube (LUT) calibré pour l'espace colorimétrique Rec.709."
  },
  {
    id: 'prod-design-1',
    occupation: 'Production Designer',
    phase: 'Pre-Production',
    title: 'Post-Apocalyptic Set Design',
    idealPrompt: "En tant que Chef Décorateur, je dois concevoir un intérieur d'abri anti-atomique abandonné.\nContexte: Objets du quotidien rouillés, accumulation de poussière, éclairage par lampes à huile. Palette de couleurs : ocres, gris et verts délavés.\nLivrable attendu: Moodboard détaillé avec textures (béton brut, métal oxydé) et accessoires d'époque."
  },
  {
    id: 'script-1',
    occupation: 'Scriptwriter',
    phase: 'Pre-Production',
    title: 'Emotional Dialogue Sequence',
    idealPrompt: "En tant que Scénariste, je dois rédiger une scène de rupture entre deux personnages dans un café bondé.\nContexte: Sous-texte important, les silences sont plus parlants que les mots. Rythme lent.\nLivrable attendu: Script au format professionnel (Final Draft) avec descriptions précises des micro-expressions."
  },
  {
    id: 'sound-1',
    occupation: 'Sound Designer',
    phase: 'Post-Production',
    title: 'Ambient Soundscape',
    idealPrompt: "En tant que Sound Designer pour le cinéma, je dois concevoir l'ambiance sonore d'une forêt mystérieuse.\nContexte: Utilisation de sons organiques (vent, craquements), superposés à une nappe synthétique sombre.\nLivrable attendu: Fichier audio spatialisé (5.1), durée 5 minutes, boucle parfaite."
  },
  {
    id: 'gaffer-1',
    occupation: 'Gaffer (Lighting Lead)',
    phase: 'Production',
    title: 'Cinematic Rim Lighting',
    idealPrompt: "En tant que Chef Électricien, je dois créer un effet de 'Rim Light' pour détacher le personnage du fond.\nContexte: Utilisation d'un projecteur Tungstène 2K avec gel CTB. Placement à 45° derrière le sujet. Lumière douce en face via une Skypanel S60.\nLivrable attendu: Schéma d'éclairage complet et réglages des gradateurs DMX."
  },
  {
    id: 'editor-1',
    occupation: 'Film Editor',
    phase: 'Post-Production',
    title: 'Action Sequence Pacing',
    idealPrompt: "En tant que Monteur Film, je dois assembler une séquence de poursuite automobile à haute intensité.\nContexte: Utilisation de jump cuts pour simuler la vitesse, synchronisation sur les battements de la musique. Rythme effréné (cuts toutes les 12-18 images).\nLivrable attendu: Timeline exportée en XML pour l'étalonnage et fichier proxy pour validation réalisateur."
  },
  {
    id: 'stunt-1',
    occupation: 'Stunt Coordinator',
    phase: 'Production',
    title: 'Fight Choreography Layout',
    idealPrompt: "En tant que Coordinateur de Cascades, je dois planifier une chorégraphie de combat dans un espace restreint.\nContexte: Combat à mains nues, focus sur la sécurité des acteurs. Utilisation de caméras à l'épaule pour l'immersion.\nLivrable attendu: Previsualisation vidéo (stunt-vis) et liste des équipements de protection nécessaires."
  },
  {
    id: 'costume-1',
    occupation: 'Costume Designer',
    phase: 'Pre-Production',
    title: 'Period-Accurate Costume Design',
    idealPrompt: "En tant que Créateur de Costumes, je dois concevoir les tenues d'un drame historique se déroulant en 1920.\nContexte: Utilisation de tissus d'époque (soie, velours, tweed). Travail sur la patine des vêtements pour montrer l'usure sociale des personnages.\nLivrable attendu: Planches de style avec échantillons de tissus et fiches de mesures détaillées par personnage."
  },
  {
    id: 'location-1',
    occupation: 'Location Manager',
    phase: 'Pre-Production',
    title: 'Cinematic Location Scouting',
    idealPrompt: "En tant que Régisseur de Lieux, je dois trouver un manoir gothique isolé pour un film d'horreur.\nContexte: Architecture imposante, jardins abandonnés, éclairage naturel dramatique. Accessibilité pour les camions de production indispensable.\nLivrable attendu: Dossier de repérage complet avec photos 360°, orientation solaire et autorisations de tournage."
  },
  {
    id: 'music-1',
    occupation: 'Music Composer',
    phase: 'Post-Production',
    title: 'Orchestral Score Composition',
    idealPrompt: "En tant que Compositeur Film, je dois créer le thème principal d'une épopée spatiale.\nContexte: Utilisation de cuivres puissants, de cordes lyriques et de textures électroniques modernes. Le thème doit évoquer la solitude et l'immensité.\nLivrable attendu: Partition orchestrale complète et maquette audio haute fidélité synchronisée à l'image."
  },
  {
    id: 'casting-1',
    occupation: 'Casting Director',
    phase: 'Pre-Production',
    title: 'Talent Selection & Archetypes',
    idealPrompt: "En tant que Directeur de Casting, je dois trouver l'antagoniste parfait pour un thriller psychologique.\nContexte: Visage anguleux, regard intense, capable de passer de la douceur à la menace en un instant. Charisme froid.\nLivrable attendu: Liste de sélection (Shortlist) avec vidéos d'audition (selftapes) et notes sur le jeu d'acteur."
  },
  {
    id: 'sfx-coord-1',
    occupation: 'SFX Coordinator',
    phase: 'Production',
    title: 'Practical Effects & Pyro',
    idealPrompt: "En tant que Coordinateur d'Effets Spéciaux Physiques, je dois organiser une explosion contrôlée sur le plateau.\nContexte: Sécurité maximale, synchronisation parfaite avec le passage du véhicule. Utilisation de mortiers à air et de débris légers.\nLivrable attendu: Plan de tir détaillé, rapport de sécurité et inventaire des consommables."
  },
  {
    id: 'td-1',
    occupation: 'Technical Director',
    phase: 'Production',
    title: 'Pipeline & Workflow Optimization',
    idealPrompt: "En tant que Directeur Technique (TD), je dois optimiser le flux de données entre le tournage et le labo numérique.\nContexte: Gestion des métadonnées caméra, création de dailies avec LUTs appliquées en temps réel. Sauvegarde sécurisée (LTO).\nLivrable attendu: Diagramme de workflow automatisé et scripts de vérification d'intégrité des données."
  },
  {
    id: 'accountant-1',
    occupation: 'Accountant',
    phase: 'Pre-Production',
    title: 'Production Budget Management',
    idealPrompt: "En tant que Contrôleur de Gestion Production, je dois analyser les dépassements de budget sur le tournage.\nContexte: Analyse des heures supplémentaires des techniciens et des frais de logistique imprévus.\nLivrable attendu: Tableau de bord financier avec prévisions de clôture de projet."
  }
];

interface GDPvalSourcePanelProps {
  onSelectTemplate: (prompt: string) => void;
  className?: string;
}

export const GDPvalSourcePanel: React.FC<GDPvalSourcePanelProps> = ({ 
  onSelectTemplate,
  className = '' 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOccupation, setSelectedOccupation] = useState<string | null>(null);
  const [selectedPhase, setSelectedPhase] = useState<string | null>(null);
  const [mode, setMode] = useState<'library' | 'smart-match'>('library');
  const [sourceText, setSourceText] = useState('');
  const [isMatching, setIsMatching] = useState(false);
  const [suggestion, setSuggestion] = useState<GDPvalTask | null>(null);

  const occupations = Array.from(new Set(GDPVAL_TASKS.map(t => t.occupation)));
  const phases = ['Pre-Production', 'Production', 'Post-Production'];

  const filteredTasks = GDPVAL_TASKS.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         task.idealPrompt.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesOccupation = selectedOccupation ? task.occupation === selectedOccupation : true;
    const matchesPhase = selectedPhase ? task.phase === selectedPhase : true;
    return matchesSearch && matchesOccupation && matchesPhase;
  });

  const handleSmartMatch = async () => {
    if (!sourceText.trim()) return;
    setIsMatching(true);
    
    try {
      const suggestedId = await promptOptimizer.suggestTemplate(
        sourceText, 
        GDPVAL_TASKS.map(t => ({ id: t.id, title: t.title, occupation: t.occupation }))
      );
      
      if (suggestedId) {
        const match = GDPVAL_TASKS.find(t => t.id === suggestedId);
        if (match) {
          setSuggestion(match);
          setIsMatching(false);
          return;
        }
      }

      // Fallback to simple matching if AI doesn't return a valid ID
      const lowerSource = sourceText.toLowerCase();
      let match = GDPVAL_TASKS.find(t => 
        lowerSource.includes(t.occupation.toLowerCase()) || 
        lowerSource.includes(t.title.toLowerCase())
      );
      
      if (!match) {
        match = GDPVAL_TASKS[Math.floor(Math.random() * GDPVAL_TASKS.length)];
      }
      
      setSuggestion(match);
    } catch (error) {
      console.error('Smart Match failed:', error);
      // Fallback
      setSuggestion(GDPVAL_TASKS[0]);
    } finally {
      setIsMatching(false);
    }
  };

  return (
    <Card className={`h-full flex flex-col ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-5 h-5 text-amber-500" />
            <CardTitle className="text-lg">Sources GDPval</CardTitle>
          </div>
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <button 
              onClick={() => setMode('library')}
              className={`px-3 py-1 text-xs rounded-md transition-all ${mode === 'library' ? 'bg-white dark:bg-slate-700 shadow-sm font-medium' : 'text-slate-500'}`}
            >
              Bibliothèque
            </button>
            <button 
              onClick={() => setMode('smart-match')}
              className={`px-3 py-1 text-xs rounded-md transition-all ${mode === 'smart-match' ? 'bg-white dark:bg-slate-700 shadow-sm font-medium' : 'text-slate-500'}`}
            >
              Smart Match
            </button>
          </div>
        </div>
        <CardDescription>
          {mode === 'library' 
            ? 'Bibliothèque de tâches à haute valeur économique.' 
            : 'Analysez une source pour trouver le prompt idéal correspondant.'}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden">
        {mode === 'library' ? (
          <>
            {/* Search & Filter */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Rechercher une tâche..."
                  className="w-full pl-9 pr-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500/50 bg-background"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge 
                  variant={selectedPhase === null ? "secondary" : "outline"}
                  className={`cursor-pointer ${selectedPhase === null ? 'bg-amber-100 text-amber-700' : ''}`}
                  onClick={() => setSelectedPhase(null)}
                >
                  Phases: Toutes
                </Badge>
                {phases.map(phase => (
                  <Badge 
                    key={phase}
                    variant={selectedPhase === phase ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setSelectedPhase(phase)}
                  >
                    {phase}
                  </Badge>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge 
                  variant={selectedOccupation === null ? "secondary" : "outline"}
                  className={`cursor-pointer ${selectedOccupation === null ? 'bg-slate-100 text-slate-700' : ''}`}
                  onClick={() => setSelectedOccupation(null)}
                >
                  Métier: Tous
                </Badge>
                {occupations.map(occ => (
                  <Badge 
                    key={occ}
                    variant={selectedOccupation === occ ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setSelectedOccupation(occ)}
                  >
                    {occ}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase">Texte source / Extrait de script</label>
              <textarea
                className="w-full h-32 p-3 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50 bg-background resize-none"
                placeholder="Collez ici votre texte source pour trouver le prompt idéal..."
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
              />
              <button
                disabled={!sourceText.trim() || isMatching}
                onClick={handleSmartMatch}
                className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2"
              >
                {isMatching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                Trouver le match idéal
              </button>
            </div>
            
            {suggestion && (
              <div className="animate-in fade-in slide-in-from-top-2">
                <p className="text-xs font-bold text-slate-400 uppercase mb-2">Meilleure correspondance :</p>
                <div 
                  className="p-3 border-2 border-amber-400 bg-amber-50/50 rounded-lg cursor-pointer hover:bg-amber-100/50 transition-all"
                  onClick={() => onSelectTemplate(suggestion.idealPrompt)}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <UserCircle className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-[10px] font-bold text-amber-700 uppercase">
                      {suggestion.occupation}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-amber-900">{suggestion.title}</h4>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Task List */}
        <ScrollArea className="flex-1 -mr-4 pr-4">
          <div className="space-y-3">
            {filteredTasks.map(task => (
              <div 
                key={task.id}
                className="group p-3 border rounded-lg hover:border-amber-400 hover:bg-amber-50/30 transition-all cursor-pointer"
                onClick={() => onSelectTemplate(task.idealPrompt)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <UserCircle className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                      {task.occupation} • {task.phase}
                    </span>
                  </div>
                  <Badge variant="secondary" className="text-[9px] group-hover:bg-amber-100 group-hover:text-amber-700 transition-colors">
                    <Zap className="w-2.5 h-2.5 mr-1" />
                    Use style
                  </Badge>
                </div>
                <h4 className="text-sm font-semibold mb-1 group-hover:text-amber-700 transition-colors">
                  {task.title}
                </h4>
                <p className="text-xs text-muted-foreground line-clamp-3 italic">
                  "{task.idealPrompt.substring(0, 150)}..."
                </p>
              </div>
            ))}
            {filteredTasks.length === 0 && (
              <div className="text-center py-8 text-muted-foreground italic text-sm">
                Aucune tâche trouvée pour cette recherche.
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
