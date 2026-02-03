# Guide Rapide - Activer l'Aide LLM dans Project Setup

## Problème
Le bouton "Suggest Name" ✨ dans le wizard Project Setup ne fonctionne pas.

## Solution Rapide (5 minutes)

### Étape 1: Installer Ollama (si pas déjà fait)

**Windows**:
1. Télécharger: https://ollama.ai/download
2. Installer l'application
3. Lancer Ollama Desktop

**Ou via ligne de commande**:
```bash
winget install Ollama.Ollama
```

### Étape 2: Télécharger un Modèle

Ouvrir un terminal et exécuter:
```bash
ollama pull llama3.2
```

Attendre le téléchargement (quelques minutes selon votre connexion).

### Étape 3: Démarrer Ollama

```bash
ollama serve
```

Ou simplement lancer l'application Ollama Desktop.

**Vérifier que ça fonctionne**:
- Ouvrir un navigateur: http://localhost:11434
- Devrait afficher: "Ollama is running"

### Étape 4: Configurer dans StoryCore

1. Dans StoryCore, ouvrir **Menu > Settings > LLM Settings**
2. Remplir:
   - **Provider**: Ollama
   - **Endpoint**: `http://localhost:11434`
   - **Model**: `llama3.2`
3. Cliquer **"Test Connection"**
   - Devrait afficher "Connected" en vert ✅
4. Cliquer **"Save"**

### Étape 5: Utiliser dans le Wizard

1. Retourner au **wizard Project Setup**
2. **Sélectionner au moins**:
   - Un **Genre** (ex: Fantasy)
   - Un **Tone** (ex: Epic)
3. Cliquer **"Suggest Name" ✨**
4. Attendre quelques secondes
5. Le champ "Project Name" se remplit automatiquement! 🎉

## Vérification Rapide

Si le bouton est toujours grisé, vérifiez:

✅ **Ollama est lancé**
```bash
# Tester dans un terminal:
curl http://localhost:11434
# Devrait répondre: "Ollama is running"
```

✅ **Au moins un Genre sélectionné** (cochez une case dans Genre)

✅ **Au moins un Tone sélectionné** (cochez une case dans Tone)

✅ **LLM configuré dans Settings**
- Menu > Settings > LLM Settings
- Test Connection = vert ✅

## Dépannage

### Le bouton reste grisé
→ Vérifiez que Genre ET Tone sont sélectionnés

### Message "LLM service not configured"
→ Allez dans Settings > LLM et configurez Ollama

### Erreur "Failed to connect"
→ Vérifiez qu'Ollama est lancé: `ollama serve`

### Erreur "Model not found"
→ Téléchargez le modèle: `ollama pull llama3.2`

## Alternative: Utiliser OpenAI

Si vous préférez utiliser OpenAI:

1. Obtenir une clé API: https://platform.openai.com/api-keys
2. Dans StoryCore > Settings > LLM:
   - Provider: **OpenAI**
   - API Key: **votre-clé-api**
   - Model: **gpt-4** ou **gpt-3.5-turbo**
3. Test Connection → Save
4. Retourner au wizard et réessayer

---

**Temps estimé**: 5-10 minutes
**Difficulté**: Facile
**Coût**: Gratuit (Ollama) ou payant (OpenAI)
