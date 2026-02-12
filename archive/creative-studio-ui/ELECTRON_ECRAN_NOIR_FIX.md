# Electron Écran Noir - Dépannage

## Problème

L'application Electron se lance mais affiche un écran noir.

## Vérifications Effectuées

✅ **Build UI réussi** - `npm run build` terminé sans erreur  
✅ **Electron lancé** - Application démarrée  
✅ **Fichiers dist présents** - index.html et assets existent  
✅ **CSP mise à jour** - Content Security Policy corrigée  

## Solutions

### Solution 1: Ouvrir DevTools pour Voir les Erreurs

**Dans l'application Electron**:
1. Appuie sur `F12` ou `Ctrl+Shift+I`
2. Regarde l'onglet **Console**
3. Note les erreurs en rouge

**Erreurs Communes**:
- `Failed to load resource` → Fichier manquant
- `CSP violation` → Problème de sécurité
- `Module not found` → Import cassé
- `Uncaught Error` → Erreur JavaScript

### Solution 2: Vérifier le Chemin de Chargement

**Logs Electron**:
```
Loading production UI from: file://C:\storycore-engine\creative-studio-ui\dist\index.html
```

**Vérifier**:
```bash
# Le fichier existe?
Test-Path "creative-studio-ui/dist/index.html"

# Le contenu est correct?
Get-Content "creative-studio-ui/dist/index.html" -Head 20
```

### Solution 3: Mode Développement au Lieu de Production

Au lieu de charger depuis `dist`, utilise le mode dev:

```bash
# Arrêter Electron actuel
# Ctrl+C ou fermer la fenêtre

# Lancer en mode développement
npm run dev
```

**Avantages du mode dev**:
- ✅ Hot reload
- ✅ Source maps
- ✅ Meilleurs messages d'erreur
- ✅ DevTools automatiques

### Solution 4: Nettoyer et Rebuilder

```bash
# Nettoyer le build
cd creative-studio-ui
npm run clean

# Rebuilder
npm run build

# Relancer Electron
cd ..
npm run electron:start
```

### Solution 5: Vérifier les Dépendances

```bash
# Dans creative-studio-ui
npm install

# À la racine
npm install

# Relancer
npm run electron:start
```

## Commandes de Diagnostic

### Vérifier le Build

```bash
# Lister les fichiers dist
Get-ChildItem "creative-studio-ui/dist" -Recurse | Select-Object FullName

# Vérifier la taille du bundle principal
Get-ChildItem "creative-studio-ui/dist/assets/*.js" | Sort-Object Length -Descending | Select-Object -First 5 Name, @{N='Size (MB)';E={[math]::Round($_.Length/1MB,2)}}
```

### Vérifier les Logs Electron

```bash
# Voir tous les logs
npm run electron:start 2>&1 | Tee-Object -FilePath electron-logs.txt
```

### Tester le HTML Directement

```bash
# Ouvrir index.html dans le navigateur
start creative-studio-ui/dist/index.html
```

Si ça fonctionne dans le navigateur mais pas dans Electron → Problème Electron  
Si ça ne fonctionne pas dans le navigateur → Problème de build

## Problèmes Connus

### 1. CSP Trop Restrictive

**Symptôme**: Écran noir, erreurs CSP dans la console

**Solution**: Vérifier `creative-studio-ui/dist/index.html`:
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: http://localhost:8000 http://127.0.0.1:8000;
">
```

### 2. Chemin Relatif Cassé

**Symptôme**: Erreurs `Failed to load resource`

**Solution**: Vérifier `vite.config.ts`:
```typescript
export default defineConfig({
  base: './', // Important pour Electron
  build: {
    outDir: 'dist',
  },
});
```

### 3. Module ES vs CommonJS

**Symptôme**: `Cannot use import statement outside a module`

**Solution**: Vérifier `package.json`:
```json
{
  "type": "module"
}
```

### 4. Electron Version Incompatible

**Symptôme**: Écran blanc, pas d'erreur

**Solution**:
```bash
npm list electron
# Vérifier la version (devrait être 27+)

# Mettre à jour si nécessaire
npm install electron@latest --save-dev
```

## Mode Développement (Recommandé)

Pour éviter ces problèmes, utilise le mode développement:

```bash
# Lancer en mode dev
npm run dev
```

**Ce que ça fait**:
1. Compile Electron en watch mode
2. Lance Vite dev server (port 5173)
3. Ouvre Electron qui charge depuis localhost:5173
4. Hot reload automatique

**Avantages**:
- ✅ Pas besoin de rebuilder
- ✅ Changements instantanés
- ✅ Meilleur debugging
- ✅ Source maps

## Vérification Rapide

### Test 1: Le Build Est-il Valide?

```bash
# Ouvrir dans le navigateur
start creative-studio-ui/dist/index.html
```

**Résultat attendu**: L'application s'affiche (même si certaines fonctionnalités Electron ne marchent pas)

### Test 2: Electron Peut-il Charger du HTML?

Crée un fichier test:

```html
<!-- test.html -->
<!DOCTYPE html>
<html>
<head>
  <title>Test</title>
</head>
<body>
  <h1>Test Electron</h1>
  <script>
    console.log('Electron works!');
  </script>
</body>
</html>
```

Modifie temporairement `electron/main.ts`:
```typescript
mainWindow.loadFile('test.html');
```

Si ça marche → Problème avec le build UI  
Si ça ne marche pas → Problème Electron

### Test 3: Les DevTools Fonctionnent-ils?

Dans l'application Electron:
1. `F12` pour ouvrir DevTools
2. Si DevTools s'ouvre → Electron fonctionne
3. Regarde la console pour les erreurs

## Solution Recommandée

**Pour le développement**:
```bash
npm run dev
```

**Pour tester la production**:
```bash
# Rebuilder proprement
cd creative-studio-ui
npm run clean
npm run build
cd ..
npm run electron:start
```

**Si toujours écran noir**:
1. Ouvre DevTools (F12)
2. Copie les erreurs de la console
3. Partage-les pour diagnostic

## Logs Utiles

### Electron Main Process

```bash
# Voir les logs du processus principal
npm run electron:start 2>&1 | Select-String "ERROR|error|Error"
```

### Electron Renderer Process

Ouvre DevTools (F12) dans l'application et regarde:
- **Console**: Erreurs JavaScript
- **Network**: Fichiers qui ne chargent pas
- **Sources**: Vérifier que les fichiers sont là

## Prochaines Étapes

1. **Ouvre DevTools** (F12) dans Electron
2. **Copie les erreurs** de la console
3. **Partage les erreurs** pour diagnostic précis

Ou utilise le mode dev qui fonctionne mieux:
```bash
npm run dev
```

---

**Status**: 🔍 En Investigation
**Action**: Ouvrir DevTools pour voir les erreurs
**Alternative**: Utiliser `npm run dev` au lieu de `electron:start`
