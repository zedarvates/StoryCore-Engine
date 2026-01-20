# Correction CSP et onComplete

## Problèmes Identifiés

### 1. Erreur CSP (Content Security Policy)
**Symptôme**: 
```
Connecting to 'http://127.0.0.1:8000/system_stats' violates the following Content Security Policy directive
```

**Cause**: Le navigateur a mis en cache l'ancienne version du fichier `index.html` avec l'ancien CSP qui ne permettait que `localhost:*` et pas `127.0.0.1:*`.

**Solution**: Le CSP dans `creative-studio-ui/index.html` est déjà correct:
```html
connect-src 'self' http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:* ...
```

**Action Requise**: 
- **Vider le cache du navigateur** (Ctrl+Shift+Delete ou Cmd+Shift+Delete)
- **Faire un hard refresh** (Ctrl+F5 ou Cmd+Shift+R)
- Ou fermer complètement le navigateur et le rouvrir

### 2. Erreur onComplete
**Symptôme**:
```
WizardContext.tsx:263 Uncaught ReferenceError: onComplete is not defined
```

**Cause**: Le paramètre `onComplete` n'était pas destructuré des props dans le composant `WizardProvider`, mais était utilisé dans le `useCallback` du `submitWizard`.

**Solution Appliquée**: 
Ajout de `onComplete` dans le destructuring des props:

```typescript
export function WizardProvider<T>({
  children,
  wizardType,
  totalSteps,
  initialData = {},
  onSubmit,
  onComplete,  // ✅ AJOUTÉ
  onValidateStep,
  autoSave = true,
  autoSaveDelay = 2000,
}: WizardProviderProps<T>) {
```

## Fichiers Modifiés

1. ✅ `creative-studio-ui/index.html` - CSP déjà correct (pas de modification nécessaire)
2. ✅ `creative-studio-ui/src/contexts/WizardContext.tsx` - Ajout de `onComplete` dans le destructuring

## Instructions de Test

### Pour Résoudre l'Erreur CSP:

1. **Option 1 - Hard Refresh**:
   - Windows/Linux: `Ctrl + F5` ou `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`

2. **Option 2 - Vider le Cache**:
   - Ouvrir les DevTools (F12)
   - Aller dans l'onglet "Application" ou "Storage"
   - Cliquer sur "Clear storage" ou "Vider le stockage"
   - Cocher "Cache storage" et "Cached images and files"
   - Cliquer sur "Clear site data"

3. **Option 3 - Mode Incognito**:
   - Ouvrir une fenêtre de navigation privée
   - Tester l'application (pas de cache)

### Pour Vérifier la Correction:

1. Ouvrir l'application après avoir vidé le cache
2. Ouvrir la console du navigateur (F12)
3. Cliquer sur un bouton wizard (World Building ou Character Creation)
4. Vérifier qu'il n'y a plus d'erreur:
   - ❌ Pas d'erreur CSP pour `127.0.0.1:8000`
   - ❌ Pas d'erreur `onComplete is not defined`
   - ✅ Le wizard s'ouvre correctement

## Résultat Attendu

Après avoir vidé le cache du navigateur:

✅ **ComfyUI se connecte sans erreur CSP**
```
[WizardService] Using active ComfyUI server: http://127.0.0.1:8000
✅ Connection successful
```

✅ **Les wizards s'ouvrent sans erreur**
```
[WizardLauncher] Launching wizard: world-building
✅ WorldWizard modal opens
```

✅ **Aucune erreur dans la console**

## Notes Importantes

### Pourquoi le CSP était-il en cache?

Le navigateur met en cache les fichiers HTML et leurs en-têtes de sécurité pour des raisons de performance. Lors du développement avec Vite, les modifications du fichier `index.html` ne sont pas toujours détectées par le hot-reload, nécessitant un hard refresh manuel.

### Pourquoi onComplete était-il manquant?

C'était une erreur de code - le paramètre était défini dans l'interface `WizardProviderProps` et utilisé dans le code, mais oublié dans le destructuring des props. Cette erreur n'apparaissait que lorsqu'un wizard était ouvert car c'est à ce moment que le composant `WizardProvider` était monté.

---

**Statut**: ✅ Corrections appliquées - Nécessite un hard refresh du navigateur  
**Date**: 2026-01-20
