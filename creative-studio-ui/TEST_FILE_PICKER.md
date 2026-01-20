# Guide de Test - Sélecteur de Fichiers

## Objectif

Vérifier que le bouton "Open Existing Project" utilise le bon dialogue selon l'environnement.

## Tests à Effectuer

### ✅ Test 1 : Electron (Windows/macOS)

**Environnement** : Application Electron desktop

**Étapes** :
1. Lancer l'application Electron :
   ```bash
   cd creative-studio-ui
   npm run electron:dev
   ```
2. Sur la page d'accueil, cliquer sur "Open Existing Project"
3. **Résultat attendu** : 
   - Windows : Ouverture de Windows File Explorer
   - macOS : Ouverture de macOS Finder
   - ❌ PAS le modal personnalisé FolderNavigationModal

**Vérification** :
- [ ] Le dialogue natif de l'OS s'ouvre
- [ ] Navigation fluide dans les dossiers
- [ ] Possibilité d'annuler sans erreur
- [ ] Sélection d'un dossier fonctionne correctement

---

### ✅ Test 2 : Chrome/Edge (Web)

**Environnement** : Navigateur Chrome ou Edge (version récente)

**Étapes** :
1. Lancer le serveur de développement :
   ```bash
   cd creative-studio-ui
   npm run dev
   ```
2. Ouvrir dans Chrome ou Edge : `http://localhost:5173`
3. Cliquer sur "Open Existing Project"
4. **Résultat attendu** : 
   - Dialogue natif du navigateur (showDirectoryPicker)
   - Interface similaire au dialogue de l'OS
   - ❌ PAS le modal personnalisé FolderNavigationModal

**Vérification** :
- [ ] Le dialogue natif du navigateur s'ouvre
- [ ] Message de permission peut apparaître (normal)
- [ ] Navigation dans les dossiers fonctionne
- [ ] Annulation ne génère pas d'erreur

**Console** : Vérifier qu'il n'y a pas d'erreur JavaScript

---

### ✅ Test 3 : Firefox (Web)

**Environnement** : Navigateur Firefox

**Étapes** :
1. Lancer le serveur de développement :
   ```bash
   cd creative-studio-ui
   npm run dev
   ```
2. Ouvrir dans Firefox : `http://localhost:5173`
3. Cliquer sur "Open Existing Project"
4. **Résultat attendu** : 
   - Modal personnalisé FolderNavigationModal
   - Interface avec arborescence de dossiers
   - Boutons "Cancel" et "Open Project"

**Vérification** :
- [ ] Le modal personnalisé s'affiche
- [ ] L'arborescence de dossiers est visible
- [ ] Navigation dans les dossiers fonctionne
- [ ] Validation du projet fonctionne
- [ ] Bouton "Open Project" s'active quand un projet valide est sélectionné

---

### ✅ Test 4 : Safari (Web)

**Environnement** : Navigateur Safari (macOS)

**Étapes** :
1. Lancer le serveur de développement
2. Ouvrir dans Safari : `http://localhost:5173`
3. Cliquer sur "Open Existing Project"
4. **Résultat attendu** : 
   - Modal personnalisé FolderNavigationModal (comme Firefox)

**Vérification** :
- [ ] Le modal personnalisé s'affiche
- [ ] Fonctionnalités identiques au test Firefox

---

## Détection de l'Environnement

Pour vérifier quel mode est actif, ouvrir la console du navigateur et taper :

```javascript
// Vérifier si Electron
console.log('Electron:', !!window.electronAPI);

// Vérifier si File System Access API disponible
console.log('showDirectoryPicker:', 'showDirectoryPicker' in window);

// Résultat attendu par environnement :
// Electron:              Electron: true,  showDirectoryPicker: false
// Chrome/Edge:           Electron: false, showDirectoryPicker: true
// Firefox/Safari:        Electron: false, showDirectoryPicker: false
```

## Scénarios de Test Détaillés

### Scénario A : Annulation

**Test** : Cliquer sur "Open Existing Project" puis annuler

**Résultat attendu** :
- Aucun message d'erreur
- Retour à la page d'accueil
- État de l'application inchangé

### Scénario B : Sélection d'un projet valide

**Test** : Sélectionner un dossier contenant un projet StoryCore valide

**Résultat attendu** :
- Validation du projet réussie
- Chargement du projet
- Navigation vers l'éditeur

### Scénario C : Sélection d'un dossier invalide

**Test** : Sélectionner un dossier qui n'est pas un projet StoryCore

**Résultat attendu** :
- Message d'erreur clair
- Possibilité de réessayer
- Pas de crash de l'application

## Problèmes Connus

### Firefox/Safari : Limitations du Modal Personnalisé

Le `FolderNavigationModal` a des limitations par rapport aux dialogues natifs :
- Navigation moins fluide
- Pas d'accès aux lecteurs réseau
- Pas de raccourcis système (favoris, etc.)

**Solution** : Ces navigateurs implémenteront l'API File System Access dans le futur.

### Permissions du Navigateur

Chrome/Edge peuvent demander des permissions pour accéder aux fichiers :
- C'est un comportement normal et sécurisé
- L'utilisateur doit accepter pour continuer

## Rapport de Bug

Si un test échoue, noter :

1. **Environnement** :
   - OS : Windows / macOS / Linux
   - Navigateur : Chrome / Firefox / Safari / Edge
   - Version du navigateur
   - Mode : Electron / Web

2. **Comportement observé** :
   - Quel dialogue s'est ouvert ?
   - Y a-t-il eu des erreurs dans la console ?
   - Capture d'écran si possible

3. **Comportement attendu** :
   - Référence à ce guide de test

## Checklist Complète

- [ ] Test 1 : Electron Windows - Dialogue natif
- [ ] Test 1 : Electron macOS - Dialogue natif
- [ ] Test 2 : Chrome - showDirectoryPicker
- [ ] Test 2 : Edge - showDirectoryPicker
- [ ] Test 3 : Firefox - Modal personnalisé
- [ ] Test 4 : Safari - Modal personnalisé
- [ ] Scénario A : Annulation fonctionne partout
- [ ] Scénario B : Sélection valide fonctionne partout
- [ ] Scénario C : Gestion d'erreur fonctionne partout

---

**Date de création** : 2026-01-19  
**Dernière mise à jour** : 2026-01-19  
**Version** : 1.0.0
