# Grid Editor - Plan de Tests P0 🧪

## 📋 Tests de Validation des Corrections

Ce document décrit les tests à effectuer pour valider les corrections P0 du Grid Editor.

---

## ✅ Test 1: Accès au Grid Editor

### Objectif
Vérifier que le Grid Editor est accessible depuis le dashboard du projet.

### Prérequis
- Un projet ouvert dans StoryCore

### Étapes
1. Ouvrir un projet existant ou créer un nouveau projet
2. Naviguer vers le ProjectWorkspace (vue dashboard)
3. Localiser la section "Quick Access"
4. Vérifier la présence du bouton "🎨 Grid Editor"
5. Cliquer sur le bouton "Grid Editor"

### Résultat Attendu
- ✅ Le bouton "Grid Editor" est visible dans Quick Access
- ✅ Le tooltip "Open Master Coherence Sheet Editor (3x3 Grid)" s'affiche au survol
- ✅ Le clic ouvre l'EditorPage avec la vue grid active
- ✅ La grille 3x3 est affichée

### Critères de Succès
- [ ] Bouton visible et cliquable
- [ ] Navigation vers Grid Editor fonctionnelle
- [ ] Grille 3x3 affichée correctement

---

## ✅ Test 2: Sauvegarde de Configuration

### Objectif
Vérifier que la sauvegarde de configuration fonctionne et persiste les données.

### Prérequis
- Grid Editor ouvert
- Un projet chargé avec un projectPath valide

### Étapes
1. Ouvrir le Grid Editor
2. Effectuer une modification (ex: déplacer un panel avec l'outil Select)
3. Appuyer sur `Ctrl+S` ou cliquer sur le bouton "Save"
4. Observer le toast de confirmation
5. Vérifier la création du fichier `grid_config.json` dans le dossier projet
6. Recharger la page (F5)
7. Rouvrir le Grid Editor

### Résultat Attendu
- ✅ Toast "Configuration Saved" s'affiche
- ✅ Fichier `grid_config.json` créé dans `{projectPath}/`
- ✅ Le fichier contient la configuration JSON valide
- ✅ Après rechargement, les modifications sont persistées

### Critères de Succès
- [ ] Toast de confirmation affiché
- [ ] Fichier grid_config.json créé
- [ ] JSON valide et lisible
- [ ] Modifications persistées après reload

### Vérification du Fichier
```bash
# Vérifier l'existence du fichier
ls {projectPath}/grid_config.json

# Vérifier le contenu JSON
cat {projectPath}/grid_config.json | jq .
```

---

## ✅ Test 3: Export de Configuration

### Objectif
Vérifier que l'export de configuration crée un fichier avec timestamp.

### Prérequis
- Grid Editor ouvert
- Un projet chargé

### Étapes
1. Ouvrir le Grid Editor
2. Créer ou modifier une configuration
3. Appuyer sur `Ctrl+E` ou cliquer sur le bouton "Export"
4. Observer le toast de confirmation
5. Vérifier la création du fichier dans `{projectPath}/exports/`
6. Vérifier que le nom contient un timestamp

### Résultat Attendu
- ✅ Toast "Configuration Exported" s'affiche avec le nom du fichier
- ✅ Fichier créé dans `{projectPath}/exports/`
- ✅ Nom du fichier: `grid_export_YYYY-MM-DDTHH-MM-SS.json`
- ✅ Le fichier contient la configuration JSON valide

### Critères de Succès
- [ ] Toast de confirmation affiché
- [ ] Fichier créé dans exports/
- [ ] Nom avec timestamp correct
- [ ] JSON valide

### Vérification du Fichier
```bash
# Vérifier l'existence du dossier exports
ls {projectPath}/exports/

# Lister les exports
ls -la {projectPath}/exports/grid_export_*.json

# Vérifier le contenu
cat {projectPath}/exports/grid_export_*.json | jq .
```

---

## ✅ Test 4: Gestion d'Erreurs - Pas de Projet

### Objectif
Vérifier que la sauvegarde gère correctement l'absence de projet.

### Prérequis
- Grid Editor ouvert sans projet chargé (ou projectPath null)

### Étapes
1. Ouvrir le Grid Editor sans projet
2. Tenter de sauvegarder avec `Ctrl+S`
3. Observer le toast d'erreur

### Résultat Attendu
- ✅ Toast d'erreur "No project loaded" s'affiche
- ✅ Aucun fichier n'est créé
- ✅ L'application ne crash pas

### Critères de Succès
- [ ] Toast d'erreur affiché
- [ ] Message clair pour l'utilisateur
- [ ] Pas de crash

---

## ✅ Test 5: Fallback Browser

### Objectif
Vérifier que le fallback browser fonctionne quand Electron API n'est pas disponible.

### Prérequis
- Grid Editor ouvert dans un navigateur (pas Electron)
- Ou simuler l'absence de `window.electronAPI`

### Étapes
1. Ouvrir le Grid Editor dans un navigateur
2. Créer une configuration
3. Cliquer sur "Save"
4. Observer le téléchargement automatique
5. Vérifier le fichier téléchargé

### Résultat Attendu
- ✅ Toast "Configuration Downloaded" s'affiche
- ✅ Fichier `grid_config.json` téléchargé automatiquement
- ✅ Le fichier contient la configuration JSON valide

### Critères de Succès
- [ ] Téléchargement automatique déclenché
- [ ] Fichier téléchargé dans Downloads/
- [ ] JSON valide

---

## ✅ Test 6: Tooltips Détaillés

### Objectif
Vérifier que tous les outils ont des tooltips détaillés.

### Prérequis
- Grid Editor ouvert

### Étapes
1. Ouvrir le Grid Editor
2. Survoler chaque outil de la toolbar:
   - Select (⬚)
   - Crop (✂)
   - Rotate (↻)
   - Scale (⇲)
   - Pan (✋)
   - Annotate (✎)
3. Vérifier le contenu des tooltips

### Résultat Attendu
Chaque tooltip doit contenir:
- ✅ Nom de l'outil
- ✅ Raccourci clavier
- ✅ Description détaillée de l'utilisation

### Critères de Succès
- [ ] Tous les tooltips s'affichent
- [ ] Contenu détaillé et instructif
- [ ] Raccourcis clavier mentionnés

### Exemples Attendus
```
Select Tool (V) - Click to select panels, drag to move, Ctrl+Click for multi-select
Crop Tool (C) - Define crop region for selected panels, drag handles to adjust
Rotate Tool (R) - Rotate selected panels, drag to rotate or enter angle value
```

---

## ✅ Test 7: Modal d'Aide

### Objectif
Vérifier que le modal d'aide s'ouvre et contient toutes les informations.

### Prérequis
- Grid Editor ouvert

### Étapes
1. Ouvrir le Grid Editor
2. Cliquer sur le bouton "?" dans la toolbar
3. Vérifier l'ouverture du modal
4. Vérifier la présence de toutes les sections:
   - 🛠️ Tools
   - ⌨️ Keyboard Shortcuts
   - 💡 Workflow Tips
   - 🚀 Getting Started
5. Cliquer sur "Got it!" ou en dehors du modal
6. Vérifier la fermeture du modal

### Résultat Attendu
- ✅ Modal s'ouvre au clic sur "?"
- ✅ Toutes les sections sont présentes
- ✅ Contenu lisible et bien formaté
- ✅ Modal se ferme correctement

### Critères de Succès
- [ ] Bouton "?" visible et cliquable
- [ ] Modal s'ouvre
- [ ] 4 sections présentes
- [ ] Contenu complet
- [ ] Fermeture fonctionnelle

---

## ✅ Test 8: Tooltips Zoom et Undo/Redo

### Objectif
Vérifier que les tooltips des contrôles de zoom et undo/redo sont détaillés.

### Prérequis
- Grid Editor ouvert

### Étapes
1. Survoler les boutons Undo/Redo
2. Survoler les boutons de zoom (Fit, 1:1, +, -)
3. Vérifier le contenu des tooltips

### Résultat Attendu
- ✅ Undo: "Undo (Ctrl+Z) - Revert last action"
- ✅ Redo: "Redo (Ctrl+Shift+Z) - Restore undone action"
- ✅ Fit: "Fit to View (F) - Zoom to fit entire grid in viewport"
- ✅ 1:1: "Zoom to Actual Size (100%) - View at original resolution"
- ✅ +: "Zoom In (+) - Increase zoom level"
- ✅ -: "Zoom Out (-) - Decrease zoom level"

### Critères de Succès
- [ ] Tous les tooltips détaillés
- [ ] Raccourcis mentionnés
- [ ] Descriptions claires

---

## ✅ Test 9: Workflow Complet

### Objectif
Tester le workflow complet de bout en bout.

### Prérequis
- Un projet avec des assets

### Étapes
1. Ouvrir le projet
2. Cliquer sur "🎨 Grid Editor" dans Quick Access
3. Vérifier que la grille se charge
4. Utiliser l'outil Select (V) pour sélectionner un panel
5. Utiliser l'outil Rotate (R) pour faire pivoter le panel
6. Cliquer sur "?" pour ouvrir l'aide
7. Fermer l'aide
8. Sauvegarder avec Ctrl+S
9. Vérifier le toast de confirmation
10. Exporter avec Ctrl+E
11. Vérifier le toast de confirmation
12. Recharger la page
13. Rouvrir le Grid Editor
14. Vérifier que les modifications sont persistées

### Résultat Attendu
- ✅ Toutes les étapes se déroulent sans erreur
- ✅ Les toasts s'affichent aux bons moments
- ✅ Les fichiers sont créés
- ✅ Les modifications sont persistées

### Critères de Succès
- [ ] Workflow complet sans erreur
- [ ] Tous les feedbacks affichés
- [ ] Persistance fonctionnelle

---

## 📊 Checklist de Validation Globale

### Fonctionnalités
- [ ] Accès au Grid Editor depuis dashboard
- [ ] Sauvegarde crée grid_config.json
- [ ] Export crée fichier avec timestamp
- [ ] Gestion d'erreurs (pas de projet)
- [ ] Fallback browser fonctionnel

### Documentation
- [ ] Tooltips détaillés sur tous les outils
- [ ] Modal d'aide accessible
- [ ] Guide complet dans le modal
- [ ] Raccourcis clavier documentés

### UX
- [ ] Toasts de confirmation
- [ ] Messages d'erreur clairs
- [ ] Navigation intuitive
- [ ] Feedback visuel

### Technique
- [ ] Aucune erreur TypeScript
- [ ] Aucune erreur console
- [ ] Fichiers JSON valides
- [ ] Persistance garantie

---

## 🐛 Bugs Potentiels à Surveiller

### 1. Sauvegarde
- [ ] Vérifier que le dossier projet existe
- [ ] Vérifier les permissions d'écriture
- [ ] Vérifier que le JSON est valide

### 2. Export
- [ ] Vérifier que le dossier exports/ existe (créer si nécessaire)
- [ ] Vérifier le format du timestamp
- [ ] Vérifier les caractères spéciaux dans le nom

### 3. Modal d'Aide
- [ ] Vérifier que le modal se ferme au clic extérieur
- [ ] Vérifier le scroll si contenu long
- [ ] Vérifier la compatibilité mobile

### 4. Tooltips
- [ ] Vérifier que les tooltips ne débordent pas de l'écran
- [ ] Vérifier la lisibilité sur fond sombre
- [ ] Vérifier le timing d'affichage

---

## 📝 Rapport de Tests

### Template de Rapport
```
Date: ___________
Testeur: ___________
Environnement: ___________

Test 1: Accès au Grid Editor
- [ ] Passé  [ ] Échoué
Notes: ___________

Test 2: Sauvegarde
- [ ] Passé  [ ] Échoué
Notes: ___________

Test 3: Export
- [ ] Passé  [ ] Échoué
Notes: ___________

Test 4: Gestion d'Erreurs
- [ ] Passé  [ ] Échoué
Notes: ___________

Test 5: Fallback Browser
- [ ] Passé  [ ] Échoué
Notes: ___________

Test 6: Tooltips
- [ ] Passé  [ ] Échoué
Notes: ___________

Test 7: Modal d'Aide
- [ ] Passé  [ ] Échoué
Notes: ___________

Test 8: Tooltips Zoom/Undo
- [ ] Passé  [ ] Échoué
Notes: ___________

Test 9: Workflow Complet
- [ ] Passé  [ ] Échoué
Notes: ___________

Résultat Global: ___________
Bugs Trouvés: ___________
Recommandations: ___________
```

---

## ✅ Validation Finale

Une fois tous les tests passés:
- [ ] Tous les tests manuels passés
- [ ] Aucun bug critique trouvé
- [ ] Documentation complète
- [ ] Prêt pour la production

---

*Plan de tests créé le: 2026-01-20*
*Version: 1.0*
*Status: Prêt pour exécution*
