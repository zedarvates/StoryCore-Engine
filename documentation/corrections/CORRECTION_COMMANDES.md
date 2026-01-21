# Correction - Commandes pour Démarrer l'Application

## ❌ Erreur Rencontrée

```powershell
(.venv) PS C:\storycore-engine\creative-studio-ui> npm run electron:start
npm error Missing script: "electron:start"
```

**Problème**: Vous étiez dans le mauvais dossier (`creative-studio-ui`)

## ✅ Solution

Les scripts Electron sont définis dans le `package.json` **à la racine** du projet, pas dans `creative-studio-ui`.

### Commandes Correctes

```powershell
# 1. Retourner à la racine du projet
cd ..

# Vous devriez être dans: C:\storycore-engine

# 2. Démarrer l'application Electron
npm run electron:start
```

## 📋 Scripts Disponibles

### À la Racine du Projet (`C:\storycore-engine`)

```powershell
# Démarrer l'application Electron (production)
npm run electron:start

# Démarrer en mode développement (avec hot-reload)
npm run dev

# Build complet (UI + Electron)
npm run build

# Créer un exécutable Windows
npm run package:win

# Démarrer uniquement l'UI (sans Electron)
npm run ui:dev

# Build uniquement l'UI
npm run ui:build
```

### Dans le Dossier UI (`C:\storycore-engine\creative-studio-ui`)

```powershell
# Démarrer le serveur de développement Vite
npm run dev

# Build l'UI
npm run build

# Tests
npm run test

# Tests en mode watch
npm run test:watch
```

## 🚀 Démarrage Rapide

### Option 1: Mode Production (Recommandé pour Tester Ollama)

```powershell
# Depuis la racine du projet
cd C:\storycore-engine

# Démarrer l'application
npm run electron:start
```

### Option 2: Mode Développement (Hot-Reload)

```powershell
# Depuis la racine du projet
cd C:\storycore-engine

# Démarrer en mode dev
npm run dev
```

**Note**: Le mode dev démarre:
1. Le serveur Vite (UI) sur http://localhost:5173
2. Le build Electron en mode watch
3. L'application Electron qui charge l'UI depuis Vite

## 🔍 Vérification

Après avoir démarré l'application, vous devriez voir dans la console:

```
✅ Ollama initialized with Gemma 3 4B
📍 Endpoint: http://localhost:11434
🤖 Model: gemma3:4b
🚀 StoryCore ready with Gemma 3 4B
```

Ou si Ollama n'est pas installé:

```
⚠️ Ollama is not running. LLM features will be limited.
⚠️ StoryCore ready (Ollama not available - LLM features limited)
```

## 📁 Structure des Dossiers

```
C:\storycore-engine\              ← Racine (scripts Electron ici)
├── package.json                  ← Scripts: electron:start, dev, build
├── electron/                     ← Code Electron
├── creative-studio-ui/           ← Code UI React
│   ├── package.json              ← Scripts: dev, build, test
│   ├── src/
│   └── dist/                     ← Build de l'UI
└── dist/                         ← Build Electron
```

## 🛠️ Dépannage

### Problème: "Cannot find module"

**Solution**: Installer les dépendances

```powershell
# À la racine
npm install

# Dans creative-studio-ui
cd creative-studio-ui
npm install
cd ..
```

### Problème: "Port 5173 already in use"

**Solution**: Tuer le processus ou changer le port

```powershell
# Tuer le processus sur le port 5173
netstat -ano | findstr :5173
taskkill /PID <PID> /F
```

### Problème: Build Electron échoue

**Solution**: Rebuild Electron

```powershell
npm run electron:build
```

## ✅ Commande Finale

```powershell
# Depuis n'importe où, retourner à la racine
cd C:\storycore-engine

# Démarrer l'application
npm run electron:start
```

C'est tout! 🎉
