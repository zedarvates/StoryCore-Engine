# 🚀 Guide d'utilisation Builder.io Visual AI Code Editor dans StoryCore

## 📋 Configuration VS Code

### Extensions Recommandées
Installez l'extension Builder.io depuis le marketplace VS Code:
- **Builder.io** (ID: `builder.builder`)

L'extension a été automatiquement ajoutée aux recommandations dans `.vscode/extensions.json`.

### Configuration Active
Les paramètres Builder.io sont configurés dans `.vscode/settings.json`:
- **Serveur**: `http://localhost:5173`
- **Commande de dev**: `cd creative-studio-ui && npm run dev`
- **Type de projet**: React + Vite + TypeScript

## 🎯 Fonctionnalités Builder.io

### 1. Éditeur Visuel (Drag-and-Drop)
```bash
# Démarrer le serveur de développement
cd creative-studio-ui && npm run dev

# Builder.io sera accessible sur http://localhost:5173
```

### 2. Génération AI de Composants
L'extension offre des fonctionnalités AI pour:
- Génération automatique de layouts
- Suggestions de composants basées sur le contexte
- Optimisation intelligente des designs

### 3. Bibliothèque de Composants
- **Chemin**: `creative-studio-ui/src/components`
- **Détection automatique**: Activée
- **Formats supportés**: TypeScript, React, Vite

## 🛠️ Commandes VS Code

### Commandes Disponibles
1. **Builder.io: Open Editor** - Ouvrir l'éditeur visuel
2. **Builder.io: Generate Component** - Générer un composant via IA
3. **Builder.io: Start Dev Server** - Démarrer le serveur de dev

### Raccourcis Clés
```json
{
    "F1": "Builder.io: Open Visual Editor",
    "Ctrl+Shift+B": "Builder.io: Build Project",
    "Ctrl+Shift+R": "Builder.io: Refresh Preview"
}
```

## 📁 Structure du Projet pour Builder.io

```
creative-studio-ui/
├── src/
│   ├── components/          # Bibliothèque de composants
│   │   ├── ui/              # Composants UI de base
│   │   ├── editor/          # Composants de l'éditeur
│   │   └── wizards/         # Assistants et wizards
│   ├── pages/               # Pages de l'application
│   ├── contexts/            # Contextes React
│   └── hooks/               # Hooks personnalisés
```

## 🔧 Configuration Avancée

### Paramètres Builder.io (settings.json)
```json
{
    "builder.serverUrl": "http://localhost:5173",
    "builder.command": "cd creative-studio-ui && npm run dev",
    "builder.projectType": "react-vite",
    "builder.entryPoint": "creative-studio-ui/src/main.tsx",
    "builder.ai.enabled": true,
    "builder.ai.suggestions": true,
    "builder.visualEditor.enabled": true,
    "builder.library.autoDetect": true
}
```

## 🚀 Démarrage Rapide

### 1. Ouvrir le Projet
```bash
code storycore-engine
```

### 2. Installer l'Extension
- Ouvrir VS Code Extensions (Ctrl+Shift+X)
- Rechercher "Builder.io"
- Installer l'extension "Builder.io - Visual AI Code Editor"

### 3. Démarrer le Serveur de Développement
```bash
cd creative-studio-ui
npm run dev
```

### 4. Ouvrir l'Éditeur Builder.io
- Utiliser la commande `Builder.io: Open Visual Editor` depuis la palette de commandes (F1)

## 🎨 Intégration avec StoryCore

### Composants Pris en Charge
- ✅ Composants UI (boutons, inputs, cards)
- ✅ Composants de l'éditeur (Timeline, Preview, Properties)
- ✅ Assistants (Wizards)
- ✅ Modales et dialogues

### Fonctionnalités Spéciales
1. **Drag-and-Drop UI Building** - Construire des interfaces visuellement
2. **AI Layout Generation** - Générer des layouts automatiquement
3. **Visual Content Editing** - Éditer le contenu visuellement
4. **Component Library Integration** - Intégrer avec la bibliothèque existante

## 📊 Débogage

### Logs Builder.io
Les logs sont activés dans la configuration:
```json
{
    "builder.debug.enabled": true,
    "builder.debug.showLogs": true,
    "builder.debug.logLevel": "info"
}
```

### Lancer en Mode Débogage
```bash
cd creative-studio-ui && npm run dev
# Les logs Builder.io apparaîtront dans la console VS Code
```

## 🔒 Notes de Sécurité

- L'extension Builder.io fonctionne en local
- Aucune donnée n'est envoyée sans configuration explicite
- Les clés API doivent être configurées séparément si nécessaire

## 📝 Résolution des Problèmes

### Problème: "npx not found"
Si vous voyez l'erreur `Error: npx not found. Configure the custom Node.js path in the extension settings.`:

1. **Solution 1**: Mettre à jour les paramètres VS Code
   ```json
   {
       "builder.nodePath": "C:/Users/redga/AppData/Local/Programs/Microsoft VS Code/resources/app/node_modules"
   }
   ```

2. **Solution 2**: Utiliser le script de démarrage
   ```bash
   # Double-cliquez sur start_builder_io.bat
   # OU exécutez dans un terminal:
   cd storycore-engine
   start_builder_io.bat
   ```

### Problème: Serveur non détecté
```bash
# Vérifier que le serveur est en cours d'exécution
cd creative-studio-ui && npm run dev

# Le paramètre autoDetect devrait trouver le serveur
```

### Problème: Éditeur ne s'ouvre pas
1. Vérifier que le serveur de dev est en cours
2. Vérifier l'URL dans les paramètres (`builder.serverUrl`)
3. Redémarrer VS Code si nécessaire

### Problème: Composants non détectés
1. Vérifier le chemin de la bibliothèque (`builder.library.path`)
2. S'assurer que les fichiers sont en TypeScript/React
3. Relancer le serveur de dev

## 🚀 Démarrage Rapide

### Option 1: Script Batch (Recommandé)
```bash
# Double-cliquez sur start_builder_io.bat
```

### Option 2: Terminal
```bash
cd creative-studio-ui
npm run dev
```

### Option 3: VS Code Tasks
1. `Ctrl+Shift+P` → "Tasks: Run Task"
2. Sélectionner "builder:start-dev"

## 📚 Ressources Complémentaires

- [Documentation Builder.io](https://www.builder.io/docs)
- [Extension VS Code Builder.io](https://marketplace.visualstudio.com/items?itemName=builder.builder)
- [Guide React + Vite](https://vitejs.dev/guide/)

---

**Créé pour**: StoryCore Engine
**Date**: 2025-01-16
**Version**: 1.0.0
