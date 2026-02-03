# Génération de Portrait de Personnage via ComfyUI

## Vue d'ensemble

Une nouvelle fonctionnalité a été ajoutée permettant de générer automatiquement un portrait 512x512 du personnage basé sur son apparence physique décrite. Cette fonctionnalité est disponible à **deux endroits**:

1. **Dans l'éditeur de personnage** (onglet Appearance)
2. **Directement dans la tuile du personnage** sur le dashboard (quand aucune image n'existe)

## Fonctionnalités

### Génération Automatique de Prompt
Le système construit automatiquement un prompt détaillé à partir des données du personnage:

- **Nom du personnage**
- **Cheveux**: couleur, style, longueur
- **Yeux**: couleur, forme
- **Visage**: structure faciale
- **Peau**: teinte
- **Morphologie**: corpulence
- **Vêtements**: style vestimentaire
- **Caractéristiques distinctives**: cicatrices, tatouages, etc.
- **Tags de qualité**: haute qualité, détaillé, portrait professionnel

### Prompt Négatif
Le système génère également un prompt négatif pour éviter:
- Images floues ou de basse qualité
- Anatomie incorrecte
- Filigranes et textes
- Plusieurs personnes dans l'image
- Corps entier (focus sur le portrait)
- Arrière-plans encombrés

### Paramètres de Génération (Z Image Turbo)
- **Modèle**: z image turbo (rapide et efficace)
- **Dimensions**: 256x256 pixels (optimisé pour tuiles)
- **Steps**: 4 (optimisé pour turbo)
- **CFG Scale**: 1.0 (recommandé pour turbo)
- **Seed**: Aléatoire à chaque génération
- **Sampler**: Euler
- **Scheduler**: Simple

## Emplacements dans l'Interface

### 1. Dans l'Éditeur de Personnage

Le générateur de portrait est intégré dans l'onglet **"Appearance"** de l'éditeur:

1. Ouvrir un personnage existant
2. Naviguer vers l'onglet "Appearance"
3. Le générateur apparaît en haut de la section
4. Remplir les détails d'apparence du personnage
5. Cliquer sur "Generate Portrait"
6. L'image est automatiquement sauvegardée avec le personnage

### 2. Dans la Tuile du Dashboard

Quand un personnage n'a pas d'image, un bouton apparaît directement dans sa tuile:

1. Aller sur le dashboard des personnages
2. Trouver un personnage sans image (icône utilisateur par défaut)
3. Un bouton "Generate Portrait" apparaît sur la tuile
4. Cliquer pour générer instantanément
5. L'image remplace le placeholder
6. L'image est automatiquement sauvegardée

**Avantages**:
- Génération rapide sans ouvrir l'éditeur
- Workflow optimisé pour créer rapidement des portraits
- Mise à jour visuelle immédiate du dashboard

## Composants Créés

### CharacterImageGenerator.tsx
Composant React principal pour l'éditeur qui:
- Affiche une zone de prévisualisation 512x512
- Construit le prompt à partir des données du personnage
- Appelle le service ComfyUI
- Affiche l'image générée
- Gère les états de chargement et d'erreur
- Sauvegarde l'URL de l'image dans `visual_identity.generated_portrait`

### CharacterImageGenerator.css
Styles pour:
- Zone de prévisualisation avec ratio 1:1
- Placeholder avec icône
- Bouton de génération avec animation de chargement
- Messages d'erreur et d'information
- Support du thème sombre

### CharacterCard.tsx (Modifié)
Ajout de la fonctionnalité de génération dans la tuile:
- Détection automatique de l'absence d'image
- Bouton "Generate Portrait" intégré dans le placeholder
- État de chargement avec spinner
- Callback `onImageGenerated` pour sauvegarder l'image
- Utilisation du même système de prompt que l'éditeur

### CharacterCard.css (Modifié)
Nouveaux styles pour:
- Bouton de génération positionné dans la tuile
- Animation de hover et active
- État de génération avec spinner
- Support du thème sombre

## Modifications des Types

### VisualIdentity (character.ts)
Ajout du champ optionnel:
```typescript
generated_portrait?: string; // URL ou base64 du portrait généré
```

## Intégration

### AppearanceSection.tsx
- Import du composant `CharacterImageGenerator`
- Ajout de la prop `characterData` pour passer les données complètes
- Callback `onImageGenerated` pour sauvegarder l'URL de l'image

### CharacterEditor.tsx
- Passage de `formData` complet à `AppearanceSection`
- L'image générée est automatiquement sauvegardée avec le personnage

### CharacterCard.tsx
- Import de `ComfyUIService` et icônes nécessaires
- État local pour gérer la génération
- Fonction `buildCharacterPrompt()` pour construire le prompt
- Fonction `handleGenerateImage()` pour la génération
- Affichage conditionnel du bouton ou du spinner
- Prop `onImageGenerated` pour notifier le parent

## Flux de Travail

### Depuis l'Éditeur
```
1. Utilisateur remplit les détails d'apparence
   ↓
2. Clique sur "Generate Portrait"
   ↓
3. Système construit le prompt détaillé
   ↓
4. Appel à ComfyUI avec z image turbo
   ↓
5. Image 512x512 générée en ~2-3 secondes
   ↓
6. Affichage dans la prévisualisation
   ↓
7. Sauvegarde automatique dans visual_identity.generated_portrait
   ↓
8. Persistance lors de la sauvegarde du personnage
```

### Depuis la Tuile Dashboard
```
1. Utilisateur voit une tuile sans image
   ↓
2. Clique sur "Generate Portrait" dans la tuile
   ↓
3. Système construit le prompt depuis les données du personnage
   ↓
4. Appel à ComfyUI avec z image turbo
   ↓
5. Image 512x512 générée en ~2-3 secondes
   ↓
6. Image remplace le placeholder dans la tuile
   ↓
7. Callback onImageGenerated notifie le parent
   ↓
8. Sauvegarde automatique du personnage avec l'image
```

## Prérequis

- **ComfyUI** doit être en cours d'exécution
- **Configuration ComfyUI** doit être correcte dans les paramètres
- **Modèle Z Image Turbo** doit être disponible dans ComfyUI

## Messages Utilisateur

### Information (Éditeur)
"The image will be generated using ComfyUI based on the character's appearance details. Make sure ComfyUI is running and configured."

### Bouton (Tuile)
"Generate Portrait" avec icône d'image

### État de Génération
"Generating..." avec spinner animé

### Erreurs Possibles
- Échec de connexion à ComfyUI
- Timeout de génération
- Modèle non disponible
- Erreur de paramètres

## Améliorations Futures

1. **Sélection de style artistique**: Réaliste, anime, cartoon, etc.
2. **Variations multiples**: Générer plusieurs versions
3. **Édition d'image**: Inpainting pour modifications
4. **Historique**: Garder les versions précédentes
5. **Export**: Télécharger l'image séparément
6. **Galerie**: Voir tous les portraits générés du projet
7. **Seed fixe**: Option pour reproduire exactement la même image
8. **Upscaling**: Augmenter la résolution à 1024x1024
9. **Régénération**: Bouton pour régénérer une nouvelle version
10. **Prévisualisation avant sauvegarde**: Confirmer avant d'appliquer

## Exemple de Prompt Généré

```
Portrait of Sarah Connor, brown wavy hair, blue eyes, angular face, 
fair skin, athletic build, wearing tactical clothing, scar on left cheek, 
high quality, detailed, professional portrait, centered composition
```

## Fichiers Modifiés/Créés

### Nouveaux Fichiers
- `creative-studio-ui/src/components/character/editor/CharacterImageGenerator.tsx`
- `creative-studio-ui/src/components/character/editor/CharacterImageGenerator.css`
- `creative-studio-ui/CHARACTER_PORTRAIT_GENERATION.md`

### Fichiers Modifiés
- `creative-studio-ui/src/components/character/editor/AppearanceSection.tsx`
- `creative-studio-ui/src/components/character/CharacterEditor.tsx`
- `creative-studio-ui/src/components/character/CharacterCard.tsx` ⭐ **Nouvelle fonctionnalité**
- `creative-studio-ui/src/components/character/CharacterCard.css` ⭐ **Nouveaux styles**
- `creative-studio-ui/src/types/character.ts`

## Notes Techniques

- Les deux composants utilisent le service `ComfyUIService` existant
- L'image est stockée comme URL ou base64 dans le champ `generated_portrait`
- La génération est asynchrone avec gestion d'état (loading, error, success)
- Le composant CharacterCard est optimisé pour ne pas bloquer l'interface
- Les prompts sont identiques entre l'éditeur et la tuile pour cohérence
- Support complet du thème sombre dans les deux interfaces
- Le bouton n'apparaît que si aucune image n'existe (placeholder visible)
- Utilisation de **z image turbo** pour génération rapide (4 steps au lieu de 30)

## Avantages de Z Image Turbo

- **Vitesse**: Génération en 2-3 secondes au lieu de 15-20 secondes
- **Qualité**: Excellente qualité pour des portraits
- **Efficacité**: Moins de VRAM utilisée
- **CFG Scale**: 1.0 optimal (pas besoin de guidance élevée)
- **Steps**: 4 steps suffisent pour un bon résultat

---

**Date de création**: 28 janvier 2026
**Version**: 2.0
**Statut**: ✅ Implémenté (Éditeur + Dashboard)
