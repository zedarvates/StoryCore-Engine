# Guide Utilisateur - StoryCore Engine

## Table des Matières

1. [Introduction](#introduction)
2. [Installation](#installation)
3. [Premiers Pas](#premiers-pas)
4. [Fonctionnalités Principales](#fonctionnalités-principales)
5. [Exemples de Prompts pour l'Assistant IA](#exemples-de-prompts-pour-lassistant-ia)
6. [Dépannage](#dépannage)

---

## Introduction

### Qu'est-ce que StoryCore Engine ?

StoryCore Engine est une plateforme de production vidéo multimodale auto-correctrice qui transforme vos scripts en vidéos finies en quelques minutes. Grâce à l'IA et au traitement local, vous bénéficierez d'une cohérence visuelle garantie et d'une souveraineté complète de vos données.

### Caractéristiques Clés

- **100% Traitement Local** : Toutes vos données restent sur votre machine
- **Cohérence Visuelle** : Style cohérent à travers toutes les scènes
- **Pipeline Auto-correcteur** : Qualité garantie sans intervention manuelle
- **Intégration ComfyUI Native** : Workflows professionnels optimisés

---

## Installation

### Prérequis Système

| Composant | Minimum | Recommandé |
|-----------|---------|------------|
| GPU | NVIDIA RTX 3060 (12GB VRAM) | RTX 4090+ |
| RAM | 32GB | 64GB |
| Stockage | 500GB SSD | 1TB NVMe |
| OS | Windows 10/11 | Windows 11 |

### Étapes d'Installation

#### 1. Cloner le Dépôt

```bash
git clone https://github.com/zedarvates/StoryCore-Engine.git
cd storycore-engine
```

#### 2. Installer les Dépendances

```bash
pip install -r requirements.txt
npm install
```

#### 3. Installer ComfyUI (Optionnel mais Recommandé)

```bash
# Télécharger depuis https://github.com/comfyanonymous/ComfyUI
# Port par défaut: 8188
```

#### 4. Lancer l'Application

```bash
# Mode Electron (Application de bureau)
python storycore.py

# OU en mode développement
npm run dev
```

### Installation de l'Application Electron

Pour une expérience optimale, installez la version Electron :

```bash
# Construire l'application
npm run build

# Créer le package Windows
npm run package:win
```

L'exécutable sera disponible dans `dist-electron/`

---

## Premiers Pas

### Création d'un Nouveau Projet

1. **Lancez l'application** → Écran d'accueil
2. **Cliquez sur "Nouveau Projet"**
3. **Configurez votre projet** :
   - Nom du projet
   - Genre (Fantasy, Sci-Fi, Horror, etc.)
   - Type de contenu
4. **Validez** → Projet créé !

### Interface Utilisateur

```
┌─────────────────────────────────────────────────────────────┐
│ Menu Bar: Fichier | Édition | Affichage | Projet | Aide     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────────────────────────────┐ │
│  │             │  │                                     │ │
│  │  Sidebar    │  │         Zone de Travail             │ │
│  │             │  │                                     │ │
│  │ - Projets   │  │  - Éditeur de Séquence            │ │
│  │ - Wizards   │  │  - Génération d'Images             │ │
│  │ - Assets    │  │  - Éditeur Vidéo                   │ │
│  │             │  │                                     │ │
│  └─────────────┘  └─────────────────────────────────────┘ │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ Barre d'Outils: Générer | Exporter | Paramètres           │
└─────────────────────────────────────────────────────────────┘
```

### Structure d'un Projet

```
mon_projet/
├── characters/           # Personnages générés
├── sequences/           # Séquences vidéo
├── assets/              # Ressources visuelles
├── output/              # Fichiers exportés
└── project.json         # Métadonnées du projet
```

---

## Fonctionnalités Principales

### 1. Wizards (Assistants)

Les wizards sont des assistants guidés pour créer des éléments spécifiques :

| Wizard | Fonction | Commande Rapide |
|--------|----------|-----------------|
| **Character Wizard** | Créer des personnages | Menu → Wizards → Personnages |
| **World Builder** | Construire des univers | Menu → Wizards → Monde |
| **Storyteller** | Générer des séquences | Menu → Wizards → Séquences |
| **LipSync** | Synchronisation labiale | Menu → Wizards → LipSync |

### 2. Génération d'Images

- **Modèles Supportés** : Flux, SDXL, NewBie, Qwen, HunyuanVideo, Wan Video
- **Cohérence Visuelle** : Feuille de cohérence principale
- **Auto-correction** : Détection automatique des problèmes

### 3. Traitement Audio

- **Dialogue IA** : Génération de voix naturelles avec contrôle émotionnel
- **Musique de Fond** : Composition automatique basée sur l'ambiance
- **Effets Sonores** : Bibliothèque SFX intégrée

### 4. Édition de Séquence

- **Timeline** : Montage professionnel vidéo/audio
- **Transitions** : Dissolve, Wipe, Cut, etc.
- **Prévisualisation** : Rendu en temps réel

### 5. Système d'Add-ons

Étendez les fonctionnalités avec des add-ons :

```bash
# Lister les add-ons disponibles
storycore addon list

# Installer un add-on
storycore addon install nom_addon
```

---

## Exemples de Prompts pour l'Assistant IA

Cette section contient des exemples de prompts pour utiliser efficacement l'assistant IA de StoryCore Engine.

### 1. Création de Personnages

#### Génération de Description de Personnage

```
Crée un personnage avec les caractéristiques suivantes:
- Nom: Elena Shadowmend
- Archétype: Le Mentor
- Rôle: Protagoniste principale

Profile de personnalité (Modèle Big Five 0-1):
- Ouverture: 0.85 (créative, curieuse)
- Conscienciosité: 0.90 (organisée, disciplinée)
- Extraversion: 0.60 (sociable mais reflechie)
- Agréabilité: 0.75 (coopérative, empathique)
- Neuroticism: 0.30 (calme, émotionnellement stable)

Traits principaux: intelligente, loyale, mystérieuse
Genre: Fantasy
Ton: Épique
```

#### Génération de Dialogue

```
Écris un dialogue pour ce personnage dans cette situation:

Personnage: Elena Shadowmend
Archétype: Le Mentor

Profile:
- Extraversion: 0.60 | Agréabilité: 0.75
- Neuroticism: 0.30 | Ouverture: 0.85

Style de communication: Direcct mais diplomatique
Situation: Elle découvre que son apprentice l'a trahie
État émotionnel: Choc, déception, mais maîtrise de soi

Le dialogue doit révéler sa personnalité à travers son choix de mots et son rythme.
```

### 2. Construction de Monde

#### Création d'un Univers Fantasy

```
Génère un monde avec ces paramètres:

Genre: Fantasy
Type: High Fantasy
Échelle: Large (monde entier)
Niveau technologique: Medieval avec magie
Atmosphère: Épique et mystérieux

Le monde doit inclure:
- Géographie variée (montagnes, forêts, déserts)
- Au moins 3 sociétés distinctes
- Système de magie cohérent
- Palette visuelle distinctive
- Conflit central potentiel
```

#### Extraction depuis un Texte

```
Extrais les éléments de monde depuis ce texte:

"In the shadowed valleys of Eldoria, where crystal spires pierced the 
eternal mist, the elf-lord Elandor ruled from his floating citadel. 
The ancient magic flowed through ley lines of pure diamond, powering 
the great forges where star-metal was crafted into legendary blades."

Identifie:
- Les localisations
- Les éléments magiques/technologiques
- La société et la culture
- L'atmosphère générale
```

### 3. Génération de Séquences

#### Planification de Séquence

```
Génère une séquence vidéo pour cette scène:

Scène: "Le héros découvre l'épée légendaire"
Genre: Fantasy Épique
Durée: 15-30 secondes
Format: 16:9

Éléments à inclure:
- Plan d'introduction (establishing shot)
- Moment de découverte
- Réaction émotionnelle du héros
- Plan de fin (transition)

Style visuel: Épique, dramatique, couleurs chaudes
Musique suggérée: Orchestrale, montée progressive
```

#### Description d'un Plan

```
Décris ce plan pour une génération d'image:

Plan: Gros plan émotionnel
Personnage: Elena, expressions de surprise et d'émerveillement
Moment: Elle touche l'épée pour la première fois
Éclairage: Lumière dorée mystérieure venant de l'épée
Composition: Personnage au premier tiers, épée au centre
Ambiance: Révélation, moment magique

Format: Portrait 9:16 pour réseaux sociaux
```

### 4. Scripts et Dialogues

#### Écriture de Dialogue

```
Écris le dialogue suivant:

Personnages:
- ALEX (protagoniste, 25 ans, enquêteur stubborn)
- SARAH (alliée, 28 ans, hacker sarcastique)

Situation: Ils découvrent que leur contact a été éliminé
Tension: Montante
Ton: Noir, humoristique par endroits

Contexte: Dans un cybercafé malfamé d'une ville futuriste
```

#### Analyse de Scripte

```
Analyse ce script pour la cohérence narrative:

[Script à analyser]

Fournis:
- Structure narrative (actes, beats)
- Cohérence des personnages
- Rythme et pacing
- Points de tension
- Suggestions d'amélioration
```

### 5. Génération de Contenu Audio

#### Description de Musique

```
Génère une description pour une piste musicale:

Type: Musique de fond pour scène d'action
Genre: Sci-Fi
Ambiance: Tension croissante, danger approchant
Durée: 60 secondes
Émotion: Urgence, détermination

Inclure:
- Instruments suggérés
- Tempo et rythme
- Structure (intro, développement, climax)
- Transition recommandée
```

### 6. Contrôle de Qualité

#### Vérification de Cohérence

```
Vérifie la cohérence de ces éléments:

Personnages:
- Marc: décrit comme having yeux verts dans la scène 1
- Dans la scène 3: "ses yeux noisette"

Environnement:
- Scène 1: Forêt sombre et dangereuse
- Scène 2: Description mentionne "soleil brillant"

Temps:
- Scène 1: Matin
- Scène 3: Le personnage parle du "coucher de soleil"

Identifie les incohérences et propose des corrections.
```

### 7. Optimisation de Prompts

#### Amélioration de Prompt

```
Optimise ce prompt pour une génération d'image:

Prompt original: "a beautiful woman warrior"

Améliore en:
- Ajoutant des détails visuels spécifiques
- Définissant le style artistique
- Précisant l'éclairage et l'ambiance
- Ajoutant des éléments de composition
```

### 8. Commandes Spéciales

#### Création de Projet depuis Prompt

```
Crée un projet complet depuis cette idée:

"Une équipe de scientifiques découvre une technologie alien 
dans les ruines d'une ancienne civilisation. Ils doivent 
échapper à une corporation qui veut s'approprier la découverte."

Inclut:
- Nom du projet
- Genre et sous-genre
- Liste des personnages principaux
- Structure en actes
- Paramètres de génération recommandés
```

#### Export et Transformation

```
Transforme ce projet en format différent:

Projet: "mon_projet_fantasy"
Format actuel: JSON StoryCore

Options:
- Export PDF avec images
- Export Markdown pour documentation
- Export vidéo MP4 (avec assets générés)
```

---

## Dépannage

### Problèmes Courants

#### L'application ne démarre pas

**Solutions**:
1. Vérifiez Python 3.11+ installé : `python --version`
2. Réinstallez les dépendances : `pip install -r requirements.txt`
3. Vérifiez les logs dans `logs/`

#### Erreur de connexion ComfyUI

**Solutions**:
1. Vérifiez que ComfyUI est en cours d'exécution
2. Vérifiez le port (défaut: 8188)
3. Mettez à jour la configuration dans Paramètres → ComfyUI

#### Problèmes de génération d'image

**Solutions**:
1. Vérifiez la mémoire GPU disponible
2. Réduisez la résolution de génération
3. Utilisez un modèle plus léger

#### Le projet ne sauvegarde pas

**Solutions**:
1. Vérifiez les droits d'écriture
2. Espace disque suffisant ?
3. Essayez le mode administrateur

### Raccourcis Clés

| Action | Raccourci |
|--------|-----------|
| Nouveau projet | Ctrl+N |
| Ouvrir projet | Ctrl+O |
| Sauvegarder | Ctrl+S |
| Générer | Ctrl+G |
| Exporter | Ctrl+E |
| Paramètres | Ctrl+, |
| Plein écran | F11 |

### Obtenir de l'Aide

- **Documentation en ligne** : Menu → Aide → Documentation
- **Signaler un bug** : Menu → Aide → Signaler un problème
- **Vérifier les mises à jour** : Menu → Aide → Mises à jour

---

## Glossaire

| Terme | Définition |
|-------|------------|
| **Wizard** | Assistant guidé pour créer des éléments spécifiques |
| **Cohérence Feuille** | Document définissant le style visuel du projet |
| **Pipeline** | Flux de travail complet de génération |
| **Shot** | Plan vidéo individuel |
| **Séquence** | Ensemble de shots forming une scène |
| **Asset** | Ressource visuelle ou audio |
| **Add-on** | Extension ajoutant des fonctionnalités |

---

## Annexe : Configuration Avancée

### Variables d'Environnement

```bash
# Configuration ComfyUI
export COMFYUI_PORT=8188
export COMFYUI_HOST=localhost

# Configuration LLM
export OLLAMA_HOST=localhost:11434
export DEFAULT_MODEL=llama3

# Chemins
export STORYCORE_PROJECTS=./projects
export STORYCORE_CACHE=./cache
```

### Fichier de Configuration

Créez `config/storycore.json` :

```json
{
  "comfyui": {
    "host": "localhost",
    "port": 8188
  },
  "llm": {
    "provider": "ollama",
    "default_model": "llama3"
  },
  "projects": {
    "default_path": "./projects",
    "auto_save": true,
    "auto_save_interval": 300
  }
}
```

---

**Version** : 1.0.0  
**Dernière mise à jour** : 2026  
**StoryCore Engine** - De l'Écrit à l'Écran en Minutes

