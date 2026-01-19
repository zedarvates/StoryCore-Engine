# Quick Start - Ollama avec Gemma 3

## Installation Rapide

### 1. Installer Ollama
```bash
# Windows: Télécharger depuis
https://ollama.com/download/windows

# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.ai/install.sh | sh
```

### 2. Démarrer Ollama
```bash
ollama serve
```

### 3. Installer un Modèle
```bash
# Recommandé pour la plupart des systèmes
ollama pull gemma3:4b

# Ou pour systèmes avec moins de RAM
ollama pull gemma3:1b

# Ou pour systèmes puissants
ollama pull gemma3:12b
```

### 4. Démarrer StoryCore
```bash
# Retourner à la racine du projet
cd C:\storycore-engine

# Démarrer l'application
npm run electron:start
```

## Vérification

Dans la console, vous devriez voir:
```
✅ Ollama initialized with Gemma 3 4B
📍 Endpoint: http://localhost:11434
🤖 Model: gemma3:4b
🚀 StoryCore ready with Gemma 3 4B
```

## Si Ollama N'est Pas Détecté

L'application affichera un message dans les ChatBox avec:
- 🔗 Lien de téléchargement direct
- 🔄 Bouton "Vérifier à nouveau"
- 💡 Instructions d'installation

## Sélection Automatique du Modèle

L'application choisit automatiquement le meilleur modèle selon votre système:

| Votre RAM | Modèle Sélectionné |
|-----------|-------------------|
| < 6 GB | Gemma 3 1B |
| 6-16 GB | Gemma 3 4B ⭐ |
| > 16 GB | Gemma 3 12B |

## Commandes Utiles

```bash
# Vérifier qu'Ollama fonctionne
curl http://localhost:11434/api/tags

# Lister les modèles installés
ollama list

# Tester un modèle
ollama run gemma3:4b "Hello!"

# Supprimer un modèle
ollama rm gemma3:1b
```

## Documentation Complète

- **Guide utilisateur**: `OLLAMA_CONFIGURATION.md`
- **Documentation technique**: `OLLAMA_IMPLEMENTATION_SUMMARY.md`
- **Résumé complet**: `SESSION_COMPLETE_OLLAMA.md`

C'est tout! 🎉
