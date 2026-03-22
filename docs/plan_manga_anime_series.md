# Plan d'Amélioration : Système Manga & Séries Animées

Ce plan détaille les évolutions nécessaires pour adapter StoryCore Engine à la création de contenus type Manga, Anime et Séries épisodiques, basées sur les réflexions stratégiques du projet.

## 1. Évolution du Modèle de Données

### 1.1 Support des Épisodes

- **Structure de Projet** : Ajouter une entité `Episode` liée au `Projet`.
- **Mapping Chapitres/Épisodes** : Permettre de transposer la structure de chapitres actuelle en épisodes (1 chapitre = 1 épisode ou N chapitres par épisode).
- **Pagination Manga** : Intégrer la règle des multiples de 8 pages (transposée en nombre de Shot/Séquences pour la vidéo).

### 1.2 Profilage Avancé des Personnages

- **Nouveaux Champs** :
  - `Archetype` : Protagoniste, Love Interest (Idéal, Partenaire, Maternel/Fraternel), Rival, Némésis, Sidekick, Support.
  - `Objectif/But` : Définir clairement ce qui motive le héros.
  - `Faille & Sympathie` : Champs pour définir les traits "déplaisants" qui rendent le héros humain et attachant (ex: délinquant au grand cœur).
  - `Détails du Quotidien` : Habits, régime alimentaire, habitudes quotidiennes.
- **Contrôle de Cliché** : Aide à la création pour éviter les personnages stéréotypés.

### 1.3 Bibliothèque d'Objets Symboliques

- Création d'un store d'objets porteurs de sens narratif :
  - **Photo déchirée** -> Amour brisé.
  - **Bague/Fleurs** -> Amour naissant.
  - **Charme/Amulette** -> Espoir/Vœu.
  - **Chaussure renversée** -> Accident.

## 2. Moteur Narratif & Structure

### 2.1 Gabarits de Structure (Arc Narratif)

- Implémenter le schéma : **Introduction -> Développement -> Twist -> Conclusion**.
- **Incident Déclencheur** : Forcer la définition d'un incident qui lance l'intrigue ou les sous-intrigues.
- **Pacing du Climax** : Suggestion de ralentissement du rythme avant le point culminant (Calme avant la tempête) et focus sur l'émotion du héros après le climax.

### 2.2 Méthodes de Narration Alternatives

- **Mode "Rétroactif"** : Outil permettant d'écrire la fin dramatique d'abord et de remonter le temps pour construire l'intrigue.

### 2.3 Assistant de Dialogue

- **Optimisation de la Concision** : Analyseur de texte pour simplifier les dialogues (ex : transformer des explications longues en réactions courtes et percutantes).

## 3. Techniques Narratives Avancées

### 3.1 Gestion des Monologues et Pensées (POV)

- **Dual-Track Scripting** : Possibilité d'attacher un flux de "Pensées" (monologue intérieur) indépendamment des dialogues parlés.
- **Aura Émotionnelle** : Association automatique d'effets visuels sur le calque du personnage lors des monologues (changement de colorimétrie, flou de focus).

### 3.2 Système de Flashbacks Dynamiques

- **Ancrage de Souvenir (Memory Anchor)** : Permettre de lier des séquences passées à des objets symboliques de la bibliothèque (ex: voir la bague déclenche une suggestion de flashback).

### 3.3 Alternance Protagoniste / Antagoniste

- **Mirror Planning** : Outil de planification suggérant des scènes du point de vue de l'antagoniste pour répondre aux avancées du héros, maintenant une tension constante.

### 3.4 Clues & Cliffhangers

- **Générateur de Cliffhangers** : Analyse de la tension dramatique pour suggérer le point d'arrêt optimal de l'épisode (le fameux "To Be Continued").
- **Visual Clues Store** : Système pour gérer le "foreshadowing" en plaçant des indices visuels discrets dans les calques d'arrière-plan.

## 4. Interface Utilisateur (UI)

### 4.1 Dashboard Épisodique

- Vue globale permettant de gérer les arcs narratifs sur plusieurs épisodes.
- Suivi de la progression par épisode (Synopsis -> Storyboard -> Production).

### 4.2 Vue "Storyboard Manga"

- Présentation visuelle inspirée du découpage en planches, facilitant le rythme entre les shots et les plans séquences.

### 4.3 Assistant de Création de Héros

- Wizard dédié guidant l'utilisateur pour donner du relief au héros (points forts vs faiblesses, but ultime).

## 5. Système de Composition & Animation Traditionnelle

### 5.1 Méthodologie "Calques Indépendants"

- **Séparation des Plans** : Découpage systématique de chaque scène en calques indépendants (Arrière-plan, Personnages/Sprites, Effets de premier plan).
- **Animation par Calque** : Intégration du système de sprites animés où chaque élément peut être animé indépendamment sur sa propre timeline, simulant le flux de production des studios d'animé traditionnels.
- **Mouvements Vectoriels** : Gestion des déplacements, zooms et rotations de façon vectorielle sur les sprites et calques pour des transitions fluides et un contrôle précis de la profondeur (2.5D).

### 5.2 Onomatopées et Effets Dynamiques (VFX)

- **SFX Visuels** : Génération automatique d'onomatopées stylisées (type manga) sur un calque dédié.
- **Lignes de Force** : Intégration de "speed lines" dynamiques lors de l'activation des presets d'action.

## 6. Cohérence & Style Visuel

### 6.1 Suivi d'État Persistant

- **Consistency Tracker** : Système garantissant que les changements physiques (blessures, nouveaux vêtements) acquis dans un épisode sont répercutés dans les épisodes suivants.
- **Arbre de Relations** : Visualisation de l'évolution des liens (Love Interest, Rivalité) entre les personnages au fil du projet.

### 6.3 Style Sentinel (Moodboard Integration)

- **Vérificateur de Cohérence** : Analyse automatisée des images générées par rapport aux références du **Moodboard**.
- **Adjust-to-Vision** : Suggestion automatique d'ajustements de prompts ou de presets ComfyUI si l'image dévie trop du style visuel établi.

### 6.2 Cinématiques et Templates

- **Génériques OP/ED** : Templates structurés pour la création rapide d'Openings et d'Endings avec crédits incrustés.
- **Templates d'Épisode** : Scénarios pré-construits pour des moments clés (Arc d'entraînement, Exploration du monde, Slice of Life).
- **Presets de Style ComfyUI** :
  - *Modern Shonen* (Contour net).
  - *Watercolor Dream* (Style Ghibli).
  - *Retro 90s* (Grain VHS).

## 7. Intelligence & Aide à la Mise en Scène

### 7.1 Mode "AI Director"

- **Cinematography Assistant** : Analyse du sentiment du script pour suggérer les paramètres de cadrage optimaux (ex: Gros plan sur tension, Grand angle sur solitude).
- **Auto-Framing Suggestions** : Proposer des mouvements de caméra (Dolly, Pan) cohérents avec le rythme de la scène.

### 7.2 Générateur de Récapitulatifs (Recap)

- **Automatic "Previously On..."** : Assemblage automatisé des moments clés (pics de tension détectés) des épisodes précédents pour créer des résumés d'épisodes rapides.
- **Narrateur Synthétique** : Intégration d'une narration off pour lier les scènes du récapitulatif.

### 7.3 Leitmotifs Audio-Visuels

- **Signature Sensorielle** : Lier des thèmes musicaux, des réglages d'éclairage (Color Grading) et des VFX (Speed Lines, Auras) à des concepts ou personnages récurrents.
- **Activation Contextuelle** : Déclencher automatiquement ces presets dès que le script identifie le concept (ex: le thème du héros se lance lors de son apparition).

## 8. Prochaines Étapes Techniques

1. **Backend** : Mettre à jour les modèles SQLAlchemy pour inclure `Episode` et les nouveaux champs `Character`.
2. **Frontend** : Créer le store Zustand `useEpisodeStore` pour la gestion d'état des épisodes.
3. **Moteur Cinématique** : Développer le système de gestion de couches (Layers) indépendantes et les contrôleurs de mouvements vectoriels intégrant les sprites animés.
4. **Wizards** : Adapter le `CharacterWizard` pour intégrer les notions d'archétypes manga.
5. **Moteur Narratif** : Implémenter le `Dual-Track Scripting` pour séparer dialogues et monologues.
6. **VFX Engine** : Créer un outil d'overlay pour les onomatopées et speed lines.
7. **Intelligence** : Développer le moteur de suggestion cinématique basé sur l'analyse de sentiment du texte.
8. **Automatisme** : Créer le script d'assemblage automatique pour les séquences de récapitulatif (Recap Builder).
