# AssetPanel Selection State Improvement Plan

## Objectif
Améliorer l'AssetPanel avec un état de sélection visuel pour améliorer l'expérience utilisateur.

## Améliorations à implémenter

### 1. État de sélection
- Ajouter un état pour les assets sélectionnés
- Feedback visuel (bordure, couleur de fond)
- Support multi-sélection (Ctrl+Click)
- Support sélection par plage (Shift+Click)

### 2. Actions de sélection
- Bouton "Sélectionner tout" (Ctrl+A)
- Bouton "Désélectionner tout" (Escape)
- Inverser la sélection

### 3. Barre d'actions contextuelle
- Afficher quand au moins un asset est sélectionné
- Actions: Supprimer, Dupliquer, Renommer, Ajouter aux favoris

### 4. Indicateur de sélection
- Compteur d'assets sélectionnés
- Badge visuel sur les assets sélectionnés

## Plan d'implémentation

### Phase 1: État et sélection basique
- Ajouter selectedAssetIds state
- Implémenter handleAssetSelect avec Ctrl/Shift
- Ajouter styles visuels pour selected

### Phase 2: Actions de groupe
- Toolbar contextuelle avec actions
- Raccourcis clavier

### Phase 3: UX polish
- Animation de transition
- Feedback de confirmation

## Fichiers à modifier
- `src/components/AssetPanel.tsx` - Main component

