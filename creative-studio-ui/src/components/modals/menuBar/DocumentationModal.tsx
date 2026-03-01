/**
 * DocumentationModal - Modal for viewing user documentation
 * Supports English and French with embedded content and file fallback.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from '../Modal';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Globe, ExternalLink, Loader2, AlertCircle, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export interface DocumentationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialLanguage?: 'en' | 'fr';
}

// Embedded documentation content for guaranteed display
const EMBEDDED_DOCS = {
  en: {
    'getting-started': {
      title: 'Getting Started',
      content: `# Getting Started with StoryCore Engine

## Welcome!

StoryCore Engine is a self-correcting multimodal video production platform that transforms your scripts into finished videos in minutes.

## Creating a New Project

1. **Launch the application** → Home screen appears
2. **Click "New Project"** button
3. **Configure your project**:
   - Project name
   - Genre (Fantasy, Sci-Fi, Horror, etc.)
   - Content type
4. **Validate** → Project created!

## User Interface Overview

The main interface consists of:

- **Menu Bar**: File, Edit, View, Project, Wizards, Tools, Help
- **Sidebar**: Projects, Wizards, Assets navigation
- **Work Area**: Sequence Editor, Image Generation, Video Editor
- **Toolbar**: Generate, Export, Settings actions

## Project Structure

Each project contains:
- **characters/**: Generated characters
- **sequences/**: Video sequences
- **assets/**: Visual resources
- **output/**: Exported files
- **project.json**: Project metadata

## Next Steps

- Try the **Character Wizard** to create your first character
- Use the **World Builder** to design your universe
- Launch the **Storyteller** to generate sequences
`
    },
    'wizards': {
      title: 'Wizards',
      content: `# Wizards (Assistants)

Wizards are guided assistants for creating specific elements.

## Available Wizards

| Wizard | Function | Access |
|--------|----------|--------|
| **Character Wizard** | Create detailed characters | Menu → Wizards → Characters |
| **World Builder** | Build complete universes | Menu → Wizards → World |
| **Storyteller** | Generate sequences | Menu → Wizards → Sequences |
| **Sequence Plan** | Plan sequence structure | Menu → Wizards → Sequence Plan |
| **Shot Wizard** | Create and configure shots | Menu → Wizards → Shot |
| **Script Wizard** | Convert scripts to shots | Menu → Wizards → Script |

## Using the Character Wizard

1. Open via Menu → Wizards → Characters
2. Define basic info: name, role, archetype
3. Set personality traits (Big Five model)
4. Configure visual attributes
5. Add background story
6. Generate and save

## Using the World Builder

1. Open via Menu → Wizards → World
2. Define world parameters:
   - Genre and type
   - Technology level
   - Atmosphere
3. Add locations and societies
4. Define magic/technology systems
5. Generate and link to project

## Using the Storyteller

1. Open via Menu → Wizards → Sequences
2. Provide story concept
3. Define characters involved
4. Set visual style
5. Generate storyboard
6. Review and refine
`
    },
    'image-generation': {
      title: 'Image Generation',
      content: `# Image Generation

## Supported Models

- **Flux**: High-quality artistic images
- **SDXL**: Stable Diffusion XL
- **NewBie**: Fast generation
- **Qwen**: Multimodal AI
- **HunyuanVideo**: Video generation
- **Wan Video**: Alternative video model

## Visual Coherence

The Master Coherence Sheet ensures consistency:

1. Define visual style once
2. Apply to all shots automatically
3. Maintain character consistency
4. Environment coherence

## Auto-Correction

The system automatically:
- Detects visual problems
- Suggests corrections
- Re-generates if needed
- Validates quality

## Generation Workflow

1. Select shot or scene
2. Configure parameters:
   - Model selection
   - Resolution
   - Style presets
3. Generate preview
4. Approve or regenerate
5. Export final result
`
    },
    'audio': {
      title: 'Audio Processing',
      content: `# Audio Processing

## AI Dialogue

Natural voice generation with emotional control:

1. Select character
2. Write or generate dialogue
3. Choose emotion and tone
4. Generate voice
5. Preview and adjust

## Background Music

Automatic composition based on mood:

- Select scene mood
- Choose music style
- Set duration
- Generate track

## Sound Effects

Integrated SFX library:

- Browse categories
- Preview sounds
- Add to timeline
- Adjust timing

## Audio Timeline

Professional audio editing:

- Multi-track support
- Waveform visualization
- Fade in/out controls
- Volume automation
`
    },
    'export': {
      title: 'Export & Output',
      content: `# Export & Output

## Export Formats

### JSON Export
- Full project data
- Data Contract v1.0 compatible
- Portable format

### PDF Export
- Storyboard report
- Include images
- Print-ready format

### Video Export
- MP4 format
- Multiple resolutions
- Quality presets

## Export Process

1. Menu → File → Export
2. Select format
3. Configure options:
   - Resolution
   - Quality
   - Include assets
4. Choose destination
5. Export

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| New project | Ctrl+N |
| Open project | Ctrl+O |
| Save | Ctrl+S |
| Generate | Ctrl+G |
| Export | Ctrl+E |
| Settings | Ctrl+, |
| Full screen | F11 |
`
    },
    'ai-features': {
      title: 'AI & Voice Commands',
      content: `# AI & Voice Commands
      
## Voice Commands (Carrot Protocol 🥕)

Activate the voice recognition by saying **"/slash"** followed by:

### 🤖 AI Commands
- **"Translate project"**: Opens the localization & translation wizard.
- **"Upscale video"**: Triggers AI super-resolution on selected assets.
- **"Cinematic mode"**: Toggles high-quality rendering filters.

### ✨ Creation
- **"Generate image"**: Creates a new image from the active prompt.
- **"Add object [name]"**: Places a 3D asset in the scene.
- **"Change lighting [type]"**: Adjusts scene ambiance.

### ⚙️ System
- **"Undo / Redo"**: Revert or repeat actions.
- **"Save project"**: Persistence trigger.
- **"Help"**: Displays the carrot protocol menu.

## Addons Features

### Project Translator
Allows you to localize your story into multiple languages (French, English, Japanese, etc.) using AI translation.

### Recap Engine
Generates visual recaps of your story progression for social media or internal review.
`
    },
    'troubleshooting': {
      title: 'Troubleshooting',
      content: `# Troubleshooting

## Application won't start

**Solutions**:
1. Verify Python 3.11+ is installed: \`python --version\`
2. Reinstall dependencies: \`pip install -r requirements.txt\`
3. Check logs in \`logs/\` folder

## ComfyUI connection error

**Solutions**:
1. Verify ComfyUI is running
2. Check the port (default: 8188)
3. Update configuration in Settings → ComfyUI
4. Restart ComfyUI server

## Image generation problems

**Solutions**:
1. Check available GPU memory
2. Reduce generation resolution
3. Use a lighter model
4. Clear cache and retry

## Project won't save

**Solutions**:
1. Check write permissions
2. Verify disk space
3. Try administrator mode
4. Check file path length

## LLM not responding

**Solutions**:
1. Verify Ollama is running
2. Check model is downloaded
3. Verify configuration in Settings → LLM
4. Restart Ollama service

## Getting Help

- **Documentation**: Menu → Help → Documentation
- **Report a bug**: Menu → Help → Report Issue
- **Check updates**: Menu → Help → Updates
`
    }
  },
  fr: {
    'getting-started': {
      title: 'Démarrage',
      content: `# Démarrage Rapide - StoryCore Engine

## Bienvenue !

StoryCore Engine est une plateforme de production vidéo multimodale auto-correctrice qui transforme vos scripts en vidéos finies en quelques minutes.

## Créer un Nouveau Projet

1. **Lancer l'application** → Écran d'accueil
2. **Cliquer sur "Nouveau Projet"**
3. **Configurer votre projet**:
   - Nom du projet
   - Genre (Fantastique, Sci-Fi, Horreur, etc.)
   - Type de contenu
4. **Valider** → Projet créé !

## Aperçu de l'Interface

L'interface principale comprend :

- **Barre de menu**: Fichier, Édition, Affichage, Projet, Assistants, Outils, Aide
- **Barre latérale**: Navigation Projets, Assistants, Assets
- **Zone de travail**: Éditeur de Séquences, Génération d'Images, Éditeur Vidéo
- **Barre d'outils**: Générer, Exporter, Paramètres

## Structure du Projet

Chaque projet contient:
- **characters/**: Personnages générés
- **sequences/**: Séquences vidéo
- **assets/**: Ressources visuelles
- **output/**: Fichiers exportés
- **project.json**: Métadonnées du projet

## Prochaines Étapes

- Essayez l'**Assistant Personnage** pour créer votre premier personnage
- Utilisez le **Créateur de Monde** pour concevoir votre univers
- Lancez le **Conteur** pour générer des séquences
`
    },
    'wizards': {
      title: 'Assistants',
      content: `# Assistants (Wizards)

Les assistants sont des guides pour créer des éléments spécifiques.

## Assistants Disponibles

| Assistant | Fonction | Accès |
|-----------|----------|-------|
| **Assistant Personnage** | Créer des personnages détaillés | Menu → Assistants → Personnages |
| **Créateur de Monde** | Construire des univers complets | Menu → Assistants → Monde |
| **Conteur** | Générer des séquences | Menu → Assistants → Séquences |
| **Plan de Séquence** | Planifier la structure | Menu → Assistants → Plan |
| **Assistant Plan** | Créer et configurer des plans | Menu → Assistants → Plan |
| **Assistant Script** | Convertir scripts en plans | Menu → Assistants → Script |

## Utiliser l'Assistant Personnage

1. Ouvrir via Menu → Assistants → Personnages
2. Définir les infos de base: nom, rôle, archétype
3. Définir les traits de personnalité (modèle Big Five)
4. Configurer les attributs visuels
5. Ajouter l'histoire du personnage
6. Générer et sauvegarder

## Utiliser le Créateur de Monde

1. Ouvrir via Menu → Assistants → Monde
2. Définir les paramètres du monde:
   - Genre et type
   - Niveau technologique
   - Atmosphère
3. Ajouter lieux et sociétés
4. Définir les systèmes de magie/technologie
5. Générer et lier au projet
`
    },
    'image-generation': {
      title: 'Génération d\'Images',
      content: `# Génération d'Images

## Modèles Supportés

- **Flux**: Images artistiques haute qualité
- **SDXL**: Stable Diffusion XL
- **NewBie**: Génération rapide
- **Qwen**: IA multimodale
- **HunyuanVideo**: Génération vidéo
- **Wan Video**: Modèle vidéo alternatif

## Cohérence Visuelle

La Feuille de Cohérence Maître assure la cohérence:

1. Définir le style visuel une fois
2. Appliquer à tous les plans automatiquement
3. Maintenir la cohérence des personnages
4. Cohérence des environnements

## Auto-Correction

Le système détecte automatiquement:
- Problèmes visuels
- Suggère des corrections
- Re-génère si nécessaire
- Valide la qualité

## Flux de Génération

1. Sélectionner plan ou scène
2. Configurer les paramètres:
   - Sélection du modèle
   - Résolution
   - Préréglages de style
3. Générer un aperçu
4. Approuver ou regénérer
5. Exporter le résultat final
`
    },
    'audio': {
      title: 'Traitement Audio',
      content: `# Traitement Audio
      
## Dialogue IA
Génération de voix naturelle avec contrôle émotionnel :
1. Sélectionner le personnage
2. Écrire le dialogue
3. Choisir l'émotion et le ton
4. Générer la voix

## Musique de Fond
Composition automatique basée sur l'ambiance.

## Effets Sonores
Bibliothèque SFX intégrée.
`
    },
    'export': {
      title: 'Export & Sortie',
      content: `# Export & Sortie

## Formats d'Export

### Export JSON
- Données complètes du projet
- Compatible Data Contract v1.0
- Format portable

### Export PDF
- Rapport storyboard
- Inclure les images
- Format prêt à imprimer

### Export Vidéo
- Format MP4
- Multiples résolutions
- Préréglages de qualité

## Processus d'Export

1. Menu → Fichier → Exporter
2. Sélectionner le format
3. Configurer les options:
   - Résolution
   - Qualité
   - Inclure les assets
4. Choisir la destination
5. Exporter

## Raccourcis Clavier

| Action | Raccourci |
|--------|-----------|
| Nouveau projet | Ctrl+N |
| Ouvrir projet | Ctrl+O |
| Sauvegarder | Ctrl+S |
| Générer | Ctrl+G |
| Exporter | Ctrl+E |
| Paramètres | Ctrl+, |
| Plein écran | F11 |
`
    },
    'ai-features': {
      title: 'IA & Commandes Vocales',
      content: `# IA & Commandes Vocales
      
## Commandes Vocales (Protocole Carotte 🥕)

Activez la reconnaissance vocale en disant **"/slash"** suivi de :

### 🤖 Commandes IA
- **"Traduire le projet"** : Ouvre l'assistant de localisation.
- **"Upscaling vidéo"** : Lance la super-résolution sur les ressources.
- **"Mode cinématique"** : Active les filtres de rendu haute qualité.

### ✨ Création
- **"Générer image"** : Crée une image à partir du prompt actif.
- **"Ajouter objet [nom]"** : Place un objet 3D dans la scène.
- **"Changer lumière [type]"** : Ajuste l'ambiance lumineuse.

### ⚙️ Système
- **"Annuler / Rétablir"** : Gère l'historique des actions.
- **"Sauvegarder le projet"** : Force l'enregistrement.
- **"Aide"** : Affiche le menu du protocole carotte.

## Fonctionnalités des Addons

### Project Translator
Permet de traduire votre histoire dans plusieurs langues (Français, Anglais, Japonais, etc.) via l'IA.

### Recap Engine
Génère des récaps visuels de la progression de votre histoire.
`
    },
    'troubleshooting': {
      title: 'Dépannage',
      content: `# Dépannage

## L'application ne démarre pas

**Solutions**:
1. Vérifier que Python 3.11+ est installé: \`python --version\`
2. Réinstaller les dépendances: \`pip install -r requirements.txt\`
3. Vérifier les logs dans le dossier \`logs/\`

## Erreur de connexion ComfyUI

**Solutions**:
1. Vérifier que ComfyUI fonctionne
2. Vérifier le port (défaut: 8188)
3. Mettre à jour la configuration dans Paramètres → ComfyUI
4. Redémarrer le serveur ComfyUI

## Problèmes de génération d'images

**Solutions**:
1. Vérifier la mémoire GPU disponible
2. Réduire la résolution de génération
3. Utiliser un modèle plus léger
4. Vider le cache et réessayer

## Le projet ne se sauvegarde pas

**Solutions**:
1. Vérifier les permissions d'écriture
2. Vérifier l'espace disque
3. Essayer le mode administrateur
4. Vérifier la longueur du chemin de fichier

## Le LLM ne répond pas

**Solutions**:
1. Vérifier qu'Ollama fonctionne
2. Vérifier que le modèle est téléchargé
3. Vérifier la configuration dans Paramètres → LLM
4. Redémarrer le service Ollama

## Obtenir de l'Aide

- **Documentation**: Menu → Aide → Documentation
- **Signaler un bug**: Menu → Aide → Signaler un problème
- **Vérifier les mises à jour**: Menu → Aide → Mises à jour
`
    }
  }
};

type DocSection = keyof typeof EMBEDDED_DOCS.en;

export function DocumentationModal({
  isOpen,
  onClose,
  initialLanguage = 'en',
}: DocumentationModalProps) {
  const [language, setLanguage] = useState<'en' | 'fr'>(initialLanguage);
  const [activeSection, setActiveSection] = useState<DocSection>('getting-started');
  const [customContent, setCustomContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Detect user language on mount
  useEffect(() => {
    if (isOpen && initialLanguage === 'en') {
      const userLang = navigator.language || 'en';
      if (userLang.startsWith('fr')) {
        setLanguage('fr');
      }
    }
  }, [isOpen, initialLanguage]);

  // Try to load custom documentation content
  const loadCustomContent = useCallback(async (lang: 'en' | 'fr') => {
    setLoading(true);
    setError(null);
    
    try {
      // In Electron environment, try to read from local filesystem
      if (window.electronAPI?.fs?.readFile) {
        const fileName = lang === 'fr' ? 'USER_GUIDE_fr.md' : 'USER_GUIDE.md';
        const possiblePaths = [
          `c:\\storycore-engine\\documentation\\${fileName}`,
          `documentation/${fileName}`,
          `../documentation/${fileName}`
        ];

        for (const path of possiblePaths) {
          try {
            const buffer = await window.electronAPI.fs.readFile(path);
            const content = new TextDecoder().decode(buffer);
            setCustomContent(content);
            setLoading(false);
            return;
          } catch {
            // Try next path
          }
        }
      }

      // Fallback for web environment: try to fetch
      try {
        const response = await fetch(`/documentation/USER_GUIDE${lang === 'fr' ? '_fr' : ''}.md`);
        if (response.ok) {
          const text = await response.text();
          // Check if the response is actually HTML (from SPA fallback router)
          if (text.trim().startsWith('<') || text.includes('<!DOCTYPE html>')) {
            throw new Error('Not a markdown file (SPA fallback)');
          }
          setCustomContent(text);
          setLoading(false);
          return;
        }
      } catch {
        // Fall through to embedded content
      }

      // No custom content found, use embedded
      setCustomContent('');
      
    } catch (err) {
      console.warn('Could not load custom documentation:', err);
      setCustomContent('');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadCustomContent(language);
    }
  }, [isOpen, language, loadCustomContent]);

  // Select a section
  const selectSection = (sectionId: DocSection) => {
    setActiveSection(sectionId);
  };

  // Get sections for current language
  const sections = EMBEDDED_DOCS[language];
  const sectionList = Object.entries(sections) as [DocSection, { title: string; content: string }][];

  // Get current content
  const currentContent = customContent || sections[activeSection]?.content || '';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={language === 'fr' ? 'Documentation Utilisateur' : 'User Documentation'}
      size="xl"
    >
      <div className="flex flex-col h-[75vh]">
        {/* Header with Language Toggle */}
        <div className="flex justify-between items-center mb-4 border-b pb-4 shrink-0">
          <Tabs value={language} onValueChange={(v) => setLanguage(v as 'en' | 'fr')} className="w-[300px]">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="en" className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                English
              </TabsTrigger>
              <TabsTrigger value="fr" className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Français
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => window.open('https://github.com/zedarvates/StoryCore-Engine', '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              GitHub
            </Button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex flex-1 overflow-hidden gap-4">
          {/* Sidebar Navigation */}
          <nav className="w-64 shrink-0 border-r border-gray-200 dark:border-gray-700 pr-4 overflow-y-auto">
            <div className="space-y-1">
              {sectionList.map(([sectionId, section]) => {
                const isActive = activeSection === sectionId;
                
                return (
                  <button
                    key={sectionId}
                    onClick={() => selectSection(sectionId)}
                    className={`
                      w-full flex items-center gap-2 px-3 py-2 text-left text-sm rounded-md transition-colors
                      ${isActive 
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'}
                    `}
                  >
                    <FileText className="w-4 h-4 shrink-0" />
                    <span className="truncate">{section.title}</span>
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto pr-4 bg-white dark:bg-gray-900 rounded-lg border p-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
                <p className="text-gray-500">
                  {language === 'fr' ? 'Chargement de la documentation...' : 'Loading documentation...'}
                </p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-center max-w-md mx-auto">
                <AlertCircle className="w-12 h-12 text-red-500" />
                <h3 className="text-xl font-bold">
                  {language === 'fr' ? 'Erreur de chargement' : 'Failed to load documentation'}
                </h3>
                <p className="text-gray-500">{error}</p>
                <Button onClick={() => loadCustomContent(language)}>
                  {language === 'fr' ? 'Réessayer' : 'Try Again'}
                </Button>
              </div>
            ) : (
              <div className="prose dark:prose-invert max-w-none prose-headings:text-gray-900 dark:prose-headings:text-gray-100 prose-p:text-gray-600 dark:prose-p:text-gray-400 prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-code:text-gray-800 dark:prose-code:text-gray-200 prose-pre:bg-gray-100 dark:prose-pre:bg-gray-800">
                <ReactMarkdown>{currentContent}</ReactMarkdown>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between mt-4 pt-4 border-t shrink-0">
          <div className="text-xs text-gray-500 italic">
            {language === 'fr' 
              ? `Dernière mise à jour: ${new Date().toLocaleDateString('fr-FR')}`
              : `Last updated: ${new Date().toLocaleDateString()}`}
          </div>
          <Button onClick={onClose}>
            {language === 'fr' ? 'Fermer' : 'Close'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}