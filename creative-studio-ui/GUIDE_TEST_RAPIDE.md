# Guide de Test Rapide - Correction I18n

## 🚀 Démarrage Rapide

### 1. Démarrer l'Application

```bash
cd creative-studio-ui
npm run dev
```

### 2. Ouvrir dans le Navigateur

L'application devrait s'ouvrir automatiquement à `http://localhost:5173`

Si ce n'est pas le cas, ouvrez manuellement cette URL dans votre navigateur.

## ✅ Points de Vérification

### A. Vérification Visuelle

1. **MenuBar Visible**
   - [ ] Le MenuBar s'affiche en haut de l'application
   - [ ] Les menus sont visibles: File, Edit, View, Project, Tools, Help
   - [ ] Les menus sont en anglais (langue par défaut)

2. **Pas d'Erreur dans la Console**
   - [ ] Ouvrir la console du navigateur (F12)
   - [ ] Vérifier qu'il n'y a PAS d'erreur "useI18n must be used within an I18nProvider"
   - [ ] Vérifier qu'il n'y a PAS d'erreur React

### B. Tests Fonctionnels

1. **Cliquer sur les Menus**
   ```
   ✓ File → Devrait afficher: New Project, Open Project, Save, etc.
   ✓ Edit → Devrait afficher: Undo, Redo, Cut, Copy, Paste, etc.
   ✓ View → Devrait afficher: Timeline, Zoom In, Zoom Out, etc.
   ✓ Project → Devrait afficher: Project Settings, Characters, etc.
   ✓ Tools → Devrait afficher: LLM Assistant, ComfyUI Server, etc.
   ✓ Help → Devrait afficher: Documentation, Keyboard Shortcuts, etc.
   ```

2. **Navigation au Clavier**
   ```
   ✓ Appuyer sur Alt → Le premier menu (File) devrait être focus
   ✓ Flèche Droite → Devrait passer au menu suivant
   ✓ Flèche Gauche → Devrait revenir au menu précédent
   ✓ Entrée → Devrait ouvrir le menu
   ✓ Échap → Devrait fermer le menu
   ```

3. **Raccourcis Clavier**
   ```
   ✓ Ctrl+N → Nouveau projet (si implémenté)
   ✓ Ctrl+O → Ouvrir projet (si implémenté)
   ✓ Ctrl+S → Sauvegarder projet (si implémenté)
   ✓ Ctrl+Z → Annuler (si implémenté)
   ✓ Ctrl+Y → Rétablir (si implémenté)
   ```

## 🔍 Vérification Console

### Console du Navigateur (F12)

#### ✅ Messages Attendus (OK)
```
[LLMProvider] Initializing...
[LLMProvider] Ollama is not available (si Ollama n'est pas installé)
Ollama not available: ... (warning normal)
```

#### ❌ Messages Non Attendus (ERREUR)
```
Error: useI18n must be used within an I18nProvider
React error: Error: useI18n must be used within an I18nProvider
```

Si vous voyez ces erreurs, la correction n'a pas été appliquée correctement.

## 🎨 Test de Changement de Langue (Optionnel)

Si l'interface de changement de langue est disponible:

1. Chercher le sélecteur de langue (généralement dans les paramètres)
2. Changer la langue vers le français
3. Vérifier que les menus se traduisent:
   - File → Fichier
   - Edit → Édition
   - View → Affichage
   - etc.

## 📊 Résultats Attendus

### ✅ Test Réussi Si:
- [x] MenuBar s'affiche correctement
- [x] Aucune erreur I18n dans la console
- [x] Les menus sont cliquables et fonctionnels
- [x] La navigation au clavier fonctionne
- [x] L'application ne crash pas au démarrage

### ❌ Test Échoué Si:
- [ ] Erreur "useI18n must be used within an I18nProvider"
- [ ] MenuBar ne s'affiche pas
- [ ] Erreur React dans la console
- [ ] L'application crash au démarrage

## 🐛 Dépannage

### Problème: L'erreur I18n persiste

**Solution:**
1. Vérifier que les modifications dans `App.tsx` sont bien présentes
2. Arrêter le serveur de développement (Ctrl+C)
3. Nettoyer le cache:
   ```bash
   npm run clean
   ```
4. Redémarrer:
   ```bash
   npm run dev
   ```

### Problème: Le build échoue

**Solution:**
1. Vérifier les erreurs TypeScript:
   ```bash
   npx tsc --noEmit
   ```
2. Réinstaller les dépendances:
   ```bash
   rm -rf node_modules
   npm install
   ```

### Problème: Les menus ne s'affichent pas

**Solution:**
1. Vérifier la console pour d'autres erreurs
2. Vérifier que `menuBarConfig` est correctement importé
3. Vérifier que les traductions existent dans `i18n.tsx`

## 📝 Rapport de Test

Après avoir effectué les tests, remplissez ce rapport:

```
Date du test: _______________
Navigateur: _______________
Version: _______________

✅ Tests Réussis:
- [ ] MenuBar visible
- [ ] Pas d'erreur I18n
- [ ] Menus fonctionnels
- [ ] Navigation clavier
- [ ] Raccourcis clavier

❌ Tests Échoués:
- [ ] _______________________
- [ ] _______________________

Notes:
_________________________________
_________________________________
_________________________________
```

## 🎯 Prochaines Actions

Si tous les tests passent:
1. ✅ Marquer la correction comme validée
2. ✅ Commiter les changements
3. ✅ Passer aux prochaines fonctionnalités

Si des tests échouent:
1. ❌ Noter les erreurs spécifiques
2. ❌ Consulter la section Dépannage
3. ❌ Demander de l'aide si nécessaire

---

**Bonne chance avec les tests ! 🚀**
