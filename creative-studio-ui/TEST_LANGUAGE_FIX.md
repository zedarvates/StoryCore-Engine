# Test Language Fix - Instructions de Test

## Étapes de Test

### 1. Nettoyer le Cache (IMPORTANT)

Avant de tester, vous DEVEZ nettoyer le cache de langue:

**Méthode A: Utiliser l'outil HTML**
```bash
# Ouvrir dans votre navigateur:
creative-studio-ui/clear-language-cache.html
```
Puis cliquer sur "Clear Language Cache"

**Méthode B: Console du navigateur**
1. Ouvrir DevTools (F12)
2. Console tab
3. Exécuter:
```javascript
localStorage.removeItem('storycore-language');
localStorage.removeItem('language-preference');
location.reload();
```

### 2. Démarrer l'Application

```bash
cd creative-studio-ui
npm run dev
```

### 3. Tests à Effectuer

#### Test 1: Menu Bar Principal
- [ ] Ouvrir l'application
- [ ] Vérifier que le menu affiche: **File, Edit, View, Project, Tools, Help**
- [ ] PAS de texte français: ~~Fichier, Édition, Affichage~~
- [ ] PAS de texte dupliqué: ~~File Fichier~~

#### Test 2: Menu File
- [ ] Cliquer sur "File"
- [ ] Vérifier les items:
  - [ ] New Project
  - [ ] Open Project
  - [ ] Save Project
  - [ ] Save As
  - [ ] Export
  - [ ] Recent Projects

#### Test 3: Menu Edit
- [ ] Cliquer sur "Edit"
- [ ] Vérifier les items:
  - [ ] Undo
  - [ ] Redo
  - [ ] Cut
  - [ ] Copy
  - [ ] Paste
  - [ ] Preferences

#### Test 4: Menu View
- [ ] Cliquer sur "View"
- [ ] Vérifier les items:
  - [ ] Timeline
  - [ ] Zoom In
  - [ ] Zoom Out
  - [ ] Reset Zoom
  - [ ] Toggle Grid
  - [ ] Panels (submenu)
  - [ ] Full Screen

#### Test 5: Menu Project
- [ ] Cliquer sur "Project"
- [ ] Vérifier les items:
  - [ ] Project Settings
  - [ ] Characters
  - [ ] Sequences
  - [ ] Asset Library

#### Test 6: Menu Tools
- [ ] Cliquer sur "Tools"
- [ ] Vérifier les items:
  - [ ] LLM Assistant
  - [ ] ComfyUI Server
  - [ ] Script Wizard
  - [ ] Batch Generation
  - [ ] Quality Analysis

#### Test 7: Menu Help
- [ ] Cliquer sur "Help"
- [ ] Vérifier les items:
  - [ ] Documentation
  - [ ] Keyboard Shortcuts
  - [ ] About StoryCore
  - [ ] Check for Updates
  - [ ] Report Issue

#### Test 8: Changement de Langue Manuel
- [ ] Ouvrir les paramètres (Settings)
- [ ] Trouver l'option de langue
- [ ] Changer en français
- [ ] Vérifier que le menu passe en français
- [ ] Changer en anglais
- [ ] Vérifier que le menu repasse en anglais

#### Test 9: Persistance
- [ ] Rafraîchir la page (F5)
- [ ] Vérifier que la langue reste en anglais
- [ ] Fermer et rouvrir le navigateur
- [ ] Vérifier que la langue reste en anglais

#### Test 10: Mode Navigation Privée
- [ ] Ouvrir en mode navigation privée
- [ ] Vérifier que le menu est en anglais par défaut
- [ ] Pas de cache précédent

## Résultats Attendus

### ✅ SUCCÈS si:
1. Tous les menus sont en anglais par défaut
2. Aucun texte français n'apparaît
3. Aucun texte dupliqué (français + anglais)
4. Le changement de langue manuel fonctionne
5. La langue persiste après rafraîchissement

### ❌ ÉCHEC si:
1. Le menu est toujours en français
2. Du texte dupliqué apparaît
3. Le menu ne change pas de langue
4. La langue ne persiste pas

## Dépannage

### Problème: Menu toujours en français

**Solution 1: Vérifier le localStorage**
```javascript
// Dans la console du navigateur
console.log(localStorage.getItem('storycore-language'));
console.log(localStorage.getItem('language-preference'));
```

Si ces valeurs existent et contiennent 'fr', les supprimer:
```javascript
localStorage.clear();
location.reload();
```

**Solution 2: Vérifier les fichiers modifiés**
Vérifier que ces fichiers ont bien été modifiés:
- `src/utils/i18n.tsx` → `defaultLanguage = 'en'`
- `src/utils/languageDetection.ts` → `return 'en';`
- `src/utils/wizardTranslations.ts` → `language: string = 'en'`

**Solution 3: Rebuild l'application**
```bash
npm run build
npm run dev
```

### Problème: Texte dupliqué

**Cause possible**: Deux I18nProviders qui se chevauchent

**Solution**: Vérifier qu'il n'y a qu'un seul I18nProvider dans la hiérarchie des composants.

### Problème: Changement de langue ne fonctionne pas

**Vérifier**:
1. Le localStorage est accessible
2. La fonction `setLanguage` est appelée
3. Le composant se re-render après le changement

## Commandes Utiles

### Nettoyer tout le cache
```javascript
// Console du navigateur
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### Forcer l'anglais
```javascript
localStorage.setItem('storycore-language', 'en');
location.reload();
```

### Forcer le français (pour tester)
```javascript
localStorage.setItem('storycore-language', 'fr');
location.reload();
```

### Vérifier la langue actuelle
```javascript
console.log(document.documentElement.lang);
```

## Rapport de Test

Après avoir effectué tous les tests, remplir ce rapport:

```
Date: _______________
Testeur: _______________

Test 1 - Menu Bar Principal: ☐ PASS ☐ FAIL
Test 2 - Menu File: ☐ PASS ☐ FAIL
Test 3 - Menu Edit: ☐ PASS ☐ FAIL
Test 4 - Menu View: ☐ PASS ☐ FAIL
Test 5 - Menu Project: ☐ PASS ☐ FAIL
Test 6 - Menu Tools: ☐ PASS ☐ FAIL
Test 7 - Menu Help: ☐ PASS ☐ FAIL
Test 8 - Changement de Langue: ☐ PASS ☐ FAIL
Test 9 - Persistance: ☐ PASS ☐ FAIL
Test 10 - Mode Navigation Privée: ☐ PASS ☐ FAIL

Résultat Global: ☐ PASS ☐ FAIL

Notes:
_________________________________
_________________________________
_________________________________
```

## Contact

Si vous rencontrez des problèmes non résolus par ce guide, veuillez créer un rapport de bug avec:
1. Capture d'écran du menu
2. Contenu du localStorage
3. Messages d'erreur dans la console
4. Navigateur et version utilisés
