# Améliorations des Wizards - Plan d'Implémentation

## Objectif
Améliorer l'expérience utilisateur des wizards (StorytellerWizard, CharacterCreatorWizard, DialogueGenerator) avec de nouvelles fonctionnalités.

## Améliorations à Implémenter

### 1. Validation des Champs Obligatoires
- **Fichier:** CharacterCreatorWizard.tsx, StorytellerWizard.tsx
- **Description:** Empêcher la navigation vers l'étape suivante si les champs obligatoires ne sont pas remplis
- **Implémentation:**
  - Ajouter une fonction `validateStep(stepIndex)` 
  - Afficher un message d'erreur visuel si validation échoue
  - Désactiver le bouton "Suivant" si validation échoue

### 2. Navigation Directe via Progress Bar
- **Fichier:** CharacterCreatorWizard.tsx, StorytellerWizard.tsx
- **Description:** Permettre de cliquer sur les étapes de la progress bar pour naviguer directement
- **Implémentation:**
  - Rendre les indicateurs de step cliquables
  - Autoriser navigation backwards freely
  - Limiter navigation forwards aux étapes validées

### 3. Sauvegarde Automatique
- **Fichier:** CharacterCreatorWizard.tsx, StorytellerWizard.tsx
- **Description:** Auto-save périodique pendant la création
- **Implémentation:**
  - Ajouter state `draftData` pour le draft en cours
  - Timer pour auto-save toutes les 30 secondes
  - Stocker dans localStorage avec timestamp
  - Restaurer le draft à l'ouverture du wizard

### 4. Prévisualisation Audio SAPI
- **Fichier:** CharacterCreatorWizard.tsx
- **Description:** Écouter un aperçu de la voix avant sauvegarde
- **Implémentation:**
  - Bouton "Aperçu" à côté du sélecteur de voix
  - Utiliser `sapiService.generateSpeech()` pour la prévisualisation
  - Audio player intégré dans le wizard

### 5. Templates Étendus
- **Fichier:** CharacterCreatorWizard.tsx
- **Description:** Ajouter plus d'archétypes de personnages
- **Nouveaux Templates:**
  - `villain` - Antagoniste avec motivations complexes
  - `mentor` - Guide sage et expérimenté
  - `sidekick` - Compagnon loyal et humoristique
  - `rebel` - Personnage en rébellion contre l'autorité
  - `mystic` - Figure spirituelle et énigmatique

### 6. Internationalisation (i18n)
- **Fichier:** CharacterCreatorWizard.tsx, StorytellerWizard.tsx
- **Description:** Support multilingue complet
- **Implémentation:**
  - Créer fichier de traductions `wizardTranslations.ts`
  - Support: Français (default), English, Español, Deutsch
  - Sélecteur de langue dans le header du wizard
  - Toutes les labels, boutons et messages traduits

## Ordre de Priorité
1. Templates étendus (facile, impact immédiat)
2. Navigation directe ( UX amélioration)
3. Validation des champs (qualité)
4. Prévisualisation audio (feature importante)
5. Sauvegarde automatique (qualité)
6. Internationalisation (internationalisation)

## Fichiers à Modifier
- `creative-studio-ui/src/components/editor/sequence-planning/CharacterCreatorWizard.tsx`
- `creative-studio-ui/src/components/editor/sequence-planning/StorytellerWizard.tsx`
- `creative-studio-ui/src/types/wizard.ts` (nouveau fichier pour types partagés)
- `creative-studio-ui/src/utils/wizardTranslations.ts` (nouveau fichier pour traductions)

## Tests Requis
- Navigation entre toutes les étapes
- Validation des champs obligatoires
- Auto-save et restore du draft
- Prévisualisation audio
- Changement de langue
- Création de personnage avec chaque template

