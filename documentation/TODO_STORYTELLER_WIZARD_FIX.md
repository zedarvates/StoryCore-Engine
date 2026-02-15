# TODO - Correction du Storyteller Wizard

## Problèmes corrigés
1. **Anciennes données affichées** - Le wizard chargeait automatiquement les anciennes données de projet
2. **Bloqué à l'étape 1** - Impossible de continuer après l'étape 1
3. **Ancien résumé affiché** - Un résumé d'un ancien projet s'affichait

## Corrections implémentées

### 1. Ajout d'un dialogue de choix au démarrage
- [x] Modifier StorytellerWizard.tsx pour demander à l'utilisateur s'il veut charger l'ancienne histoire ou commencer un nouveau
- [x] Ajouter les boutons "Continue Previous" et "Start Fresh"

### 2. Ajout de la fonction clearSavedProgress
- [x] Modifier WizardContext.tsx pour ajouter clearSavedProgress() pour effacer les données du localStorage

### 3. Amélioration de la validation de l'étape 1
- [x] La validation ne bloque plus si genre/tone/length sont vides - utilise les valeurs par défaut du projet

## Fichiers modifiés
- creative-studio-ui/src/contexts/WizardContext.tsx - Ajout de clearSavedProgress
- creative-studio-ui/src/components/wizard/storyteller/StorytellerWizard.tsx - Dialogue de choix au démarrage

## Tests à effectuer
1. Ouvrir le Storyteller Wizard avec un projet existant
2. Vérifier que le dialogue de choix s'affiche
3. Cliquer sur "Start Fresh" et vérifier qu'on peut continuer
4. Vérifier qu'on peut générer l'histoire et passer les étapes

