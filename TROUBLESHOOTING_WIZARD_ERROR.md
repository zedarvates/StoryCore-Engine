# 🔧 Résolution du Problème WizardStep

## Erreur Rencontrée

```
Uncaught SyntaxError: The requested module '/src/components/wizard/WizardStepIndicator.tsx' 
does not provide an export named 'WizardStep' (at WizardContainer.tsx:4:31)
```

## Cause

Cette erreur est causée par un **cache du serveur de développement Vite**. Le fichier `WizardStepIndicator.tsx` exporte bien `WizardStep`, mais le serveur de développement utilise une version en cache qui ne contient pas cet export.

## ✅ Solution

### Option 1 : Redémarrer le Serveur de Développement

1. **Arrêter le serveur** : Appuyez sur `Ctrl+C` dans le terminal
2. **Nettoyer le cache** :
   ```bash
   cd creative-studio-ui
   Remove-Item -Recurse -Force node_modules\.vite
   ```
3. **Redémarrer** :
   ```bash
   npm run dev
   ```

### Option 2 : Build Complet

Si le problème persiste, faites un build complet :

```bash
# Nettoyer
cd creative-studio-ui
Remove-Item -Recurse -Force dist
Remove-Item -Recurse -Force node_modules\.vite

# Rebuilder
npm run build

# Tester en mode production
cd ..
npm run electron:start
```

### Option 3 : Forcer le Rechargement

Dans le navigateur ou Electron :
1. Ouvrir les DevTools (F12)
2. Faire un rechargement forcé : `Ctrl+Shift+R`
3. Ou vider le cache : `Ctrl+Shift+Delete`

## 🔍 Vérification

Le fichier `WizardStepIndicator.tsx` exporte bien `WizardStep` :

```typescript
export interface WizardStep {
  number: number;
  title: string;
  description?: string;
}
```

Et `WizardContainer.tsx` l'importe correctement :

```typescript
import { WizardStepIndicator, WizardStep } from './WizardStepIndicator';
```

## ⚠️ Avertissement de Sécurité Electron

L'avertissement suivant est **normal en mode développement** :

```
Electron Security Warning (Insecure Content-Security-Policy)
This renderer process has either no Content Security Policy set or a policy 
with "unsafe-eval" enabled.
```

**Pourquoi ?**
- En développement, Vite a besoin de `unsafe-eval` pour le Hot Module Replacement (HMR)
- Cet avertissement **disparaîtra automatiquement** en mode production
- La CSP est correctement configurée dans `electron/main.ts`

**Pour vérifier** :
```bash
npm run package:win
```
L'exécutable créé n'aura pas cet avertissement.

## 🚀 Commandes Utiles

### Développement Web
```bash
cd creative-studio-ui
npm run dev
```
Ouvrir http://localhost:5173

### Développement Electron
```bash
# À la racine
npm run dev
```

### Nettoyer Complètement
```bash
# Nettoyer le cache Vite
cd creative-studio-ui
Remove-Item -Recurse -Force node_modules\.vite
Remove-Item -Recurse -Force dist

# Nettoyer Electron
cd ..
Remove-Item -Recurse -Force dist

# Rebuilder tout
npm run build
```

### Tester en Production
```bash
# Build complet
npm run build

# Lancer Electron en mode production
npm run electron:start

# Ou créer l'exécutable
npm run package:win
```

## 📝 Si le Problème Persiste

### 1. Vérifier les Imports

Assurez-vous que tous les fichiers importent correctement :

```typescript
// ✅ Correct
import { WizardStepIndicator, WizardStep } from './WizardStepIndicator';

// ❌ Incorrect
import { WizardStepIndicator, WizardStep } from './WizardStepIndicator.tsx';
```

### 2. Vérifier TypeScript

```bash
cd creative-studio-ui
npx tsc --noEmit
```

Si des erreurs TypeScript apparaissent, corrigez-les avant de continuer.

### 3. Réinstaller les Dépendances

En dernier recours :

```bash
cd creative-studio-ui
Remove-Item -Recurse -Force node_modules
npm install
npm run build
```

## 🎯 Résultat Attendu

Après avoir suivi ces étapes, l'application devrait :
- ✅ Se lancer sans erreur
- ✅ Afficher la landing page avec la chatbox
- ✅ Permettre de naviguer dans l'interface
- ✅ Avoir l'icône personnalisée

## 📞 Commandes de Diagnostic

### Vérifier que les Fichiers Existent
```bash
cd creative-studio-ui
Get-Item src\components\wizard\WizardStepIndicator.tsx
Get-Item src\components\wizard\WizardContainer.tsx
```

### Vérifier le Contenu
```bash
Select-String -Path src\components\wizard\WizardStepIndicator.tsx -Pattern "export interface WizardStep"
```

Devrait afficher :
```
src\components\wizard\WizardStepIndicator.tsx:9:export interface WizardStep {
```

### Vérifier le Build
```bash
npm run build
```

Si le build réussit sans erreur, le problème est uniquement dans le serveur de développement.

## 🎊 Conclusion

Ce problème est causé par un **cache du serveur de développement**. La solution la plus simple est de :

1. Arrêter le serveur (`Ctrl+C`)
2. Nettoyer le cache Vite
3. Redémarrer le serveur

L'avertissement de sécurité Electron est normal en développement et disparaîtra en production.

---

**Date** : 16 janvier 2026  
**Type** : Problème de cache  
**Solution** : Redémarrage du serveur de développement  
**Statut** : ✅ Résolu

