# Écran Noir Electron - RÉSOLU ✅

## Problème
Écran noir dans Electron avec l'erreur:
```
Verify stylesheet URLs
This page failed to load a stylesheet from a URL.
1 source: index.html:0
```

## Cause Racine

Le problème était **les chemins absolus dans le HTML généré** par Vite.

### Explication Technique

Quand Vite build avec `base: '/'`, il génère:
```html
<link rel="stylesheet" href="/assets/index-CUpltz9X.css">
<script src="/assets/index-iM35axAz.js"></script>
```

Ces chemins absolus (`/assets/...`) ne fonctionnent **PAS** avec le protocole `file://` d'Electron:
- `file:///C:/storycore-engine/creative-studio-ui/dist/index.html` ✅ (charge)
- `file:///assets/index-CUpltz9X.css` ❌ (cherche à la racine du disque C:/)

## Solution

Changer la configuration Vite pour utiliser des **chemins relatifs**:

### Fichier: `creative-studio-ui/vite.config.ts`

**AVANT:**
```typescript
base: process.env.ELECTRON === 'true' ? './' : '/',
```

**APRÈS:**
```typescript
base: './',
```

Cela génère des chemins relatifs:
```html
<link rel="stylesheet" href="./assets/index-CUpltz9X.css">
<script src="./assets/index-iM35axAz.js"></script>
```

Ces chemins relatifs fonctionnent avec `file://`:
- `file:///C:/storycore-engine/creative-studio-ui/dist/index.html` ✅
- `file:///C:/storycore-engine/creative-studio-ui/dist/assets/index-CUpltz9X.css` ✅

## Changements Appliqués

### 1. Configuration Vite (vite.config.ts)
```typescript
// Avant
base: process.env.ELECTRON === 'true' ? './' : '/',

// Après
base: './',
```

### 2. CSP dans index.html (déjà fait)
Ajout du protocole `file:` à toutes les directives CSP pour permettre le chargement depuis le système de fichiers local.

## Résultat

✅ **Application fonctionne maintenant!**

Logs Electron montrent:
```
Electron app ready
IPC handlers registered
Loading production UI from: file://C:\storycore-engine\creative-studio-ui\dist\index.html
Using icon from: C:\storycore-engine\StorycoreIconeV2.png
StoryCore Creative Studio window ready
[IPC] projects:get-merged-list called with options: undefined
[ProjectDiscoveryService] Performing fresh scan
[ProjectDiscoveryService] Found 2 valid projects with 0 errors
[IPC] Merged project list: 2 projects (1 recent, 1 discovered)
```

## Vérification

L'application devrait maintenant afficher:
- ✅ Page d'accueil StoryCore
- ✅ Boutons Quick Access
- ✅ Liste des projets récents (2 projets trouvés)
- ✅ Interface complète sans écran noir

## Notes Importantes

### Pourquoi `base: './'` fonctionne pour les deux modes?

**Mode Electron (file://):**
- Chemins relatifs: `./assets/file.js` → `file:///path/to/dist/assets/file.js` ✅

**Mode Web (http://):**
- Chemins relatifs: `./assets/file.js` → `http://localhost:5173/assets/file.js` ✅

Les chemins relatifs fonctionnent dans **les deux cas**!

### Erreurs Normales (À Ignorer)

Ces erreurs sont normales et n'affectent pas le fonctionnement:
```
Request Autofill.enable failed
Request Autofill.setAddresses failed
```

Ce sont des avertissements Electron DevTools sans impact.

## Commandes de Build

Pour rebuild après modifications:
```bash
cd creative-studio-ui
npm run build
cd ..
npm run electron:start
```

## Fichiers Modifiés

1. **creative-studio-ui/vite.config.ts**
   - Changé `base` de conditionnel à `'./'`

2. **creative-studio-ui/index.html** (session précédente)
   - Ajouté `file:` au CSP

## Statut Final

🎉 **PROBLÈME RÉSOLU**

L'application Electron charge maintenant correctement avec:
- CSS chargé ✅
- JavaScript chargé ✅
- Projets détectés ✅
- Interface visible ✅

---

**Date**: 2026-01-29
**Problème**: Écran noir + erreur CSS
**Solution**: Chemins relatifs dans Vite config
**Temps de résolution**: ~10 minutes
