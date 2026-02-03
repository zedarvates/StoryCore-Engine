# Wizard Project Setup - Aide LLM ne fonctionne pas

## Diagnostic

Le bouton "Suggest Name" (avec icône ✨ Sparkles) dans le wizard Project Setup ne fonctionne pas.

## Causes Possibles

### 1. LLM Non Configuré ❌

Le bouton est désactivé si le LLM n'est pas configuré.

**Vérification**:
- Le bouton est-il grisé/désactivé?
- Y a-t-il un message d'avertissement jaune qui dit "LLM service not configured"?

**Solution**:
1. Ouvrir **Settings > LLM Settings** (Menu > Settings > LLM)
2. Configurer un provider LLM:
   - **Ollama** (local, gratuit) - Port 11434
   - **OpenAI** - Nécessite API key
   - **Anthropic** - Nécessite API key
   - **Custom** - URL personnalisée

### 2. Genre/Tone Non Sélectionnés ❌

Le bouton nécessite au moins un genre ET un tone sélectionnés.

**Vérification**:
- Avez-vous coché au moins une case dans "Genre"?
- Avez-vous coché au moins une case dans "Tone"?
- Y a-t-il un message jaune qui dit "Select at least one genre and tone"?

**Solution**:
1. Cocher au moins un **Genre** (Fantasy, Sci-Fi, etc.)
2. Cocher au moins un **Tone** (Dark, Humorous, etc.)
3. Le bouton devrait s'activer

### 3. Ollama Non Démarré ❌

Si vous utilisez Ollama, le service doit être en cours d'exécution.

**Vérification**:
- Ouvrir un navigateur: `http://localhost:11434`
- Devrait afficher "Ollama is running"

**Solution**:
1. Lancer Ollama:
   ```bash
   # Windows
   ollama serve
   
   # Ou lancer l'application Ollama Desktop
   ```
2. Vérifier que le port 11434 est accessible
3. Retourner dans l'application et réessayer

### 4. Erreur de Connexion ❌

Le LLM est configuré mais la connexion échoue.

**Vérification dans DevTools Console**:
```
❌ LLM GENERATION FAILED - Error: ...
❌ Failed to generate suggestions: ...
```

**Solutions selon l'erreur**:

**Erreur: "LLM service not initialized"**
- Aller dans Settings > LLM
- Cliquer sur "Test Connection"
- Vérifier que la connexion fonctionne

**Erreur: "Network error" ou "Failed to fetch"**
- Vérifier que le service LLM est accessible
- Pour Ollama: `http://localhost:11434`
- Pour OpenAI: Vérifier la clé API
- Vérifier le firewall/antivirus

**Erreur: "Invalid API key"**
- Vérifier la clé API dans Settings > LLM
- S'assurer qu'elle est valide et active
- Régénérer une nouvelle clé si nécessaire

## Comment Tester

### Test Complet

1. **Ouvrir le wizard Project Setup**
   - Dashboard > Creative Wizards > Project Setup (📁)

2. **Sélectionner Genre et Tone**
   - Cocher "Fantasy" dans Genre
   - Cocher "Epic" dans Tone

3. **Vérifier le bouton**
   - Le bouton "Suggest Name" devrait être actif (pas grisé)
   - Pas de message d'avertissement jaune

4. **Cliquer sur "Suggest Name"**
   - Le bouton devrait afficher "Generating..."
   - Un spinner devrait apparaître
   - Après quelques secondes, le champ "Project Name" devrait se remplir

### Logs à Surveiller (DevTools Console)

**Succès** ✅:
```
🎯 [LLMGeneration] Starting generation...
✅ [LLMGeneration] Generation successful
```

**Échec** ❌:
```
❌ LLM GENERATION FAILED - Error: ...
❌ Failed to generate suggestions: ...
⚠️ [useServiceStatus] LLM service not configured
```

## Configuration Rapide Ollama

Si vous n'avez pas encore configuré de LLM, voici la méthode la plus simple:

### 1. Installer Ollama

**Windows**:
```bash
# Télécharger depuis https://ollama.ai/download
# Ou utiliser winget:
winget install Ollama.Ollama
```

**macOS**:
```bash
brew install ollama
```

**Linux**:
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

### 2. Télécharger un Modèle

```bash
# Modèle recommandé (rapide et performant)
ollama pull llama3.2

# Ou un modèle plus petit
ollama pull phi3
```

### 3. Démarrer Ollama

```bash
ollama serve
```

### 4. Configurer dans StoryCore

1. Menu > Settings > LLM Settings
2. Provider: **Ollama**
3. Endpoint: `http://localhost:11434`
4. Model: `llama3.2` (ou le modèle téléchargé)
5. Cliquer "Test Connection" → Devrait afficher "Connected" ✅
6. Cliquer "Save"

### 5. Retester le Wizard

1. Retourner au wizard Project Setup
2. Sélectionner Genre et Tone
3. Cliquer "Suggest Name"
4. Devrait générer un nom de projet! 🎉

## Vérification Rapide

Exécutez cette checklist:

- [ ] LLM configuré dans Settings > LLM
- [ ] Test Connection réussi (bouton vert)
- [ ] Au moins un Genre sélectionné
- [ ] Au moins un Tone sélectionné
- [ ] Bouton "Suggest Name" actif (pas grisé)
- [ ] Pas de message d'avertissement jaune
- [ ] Ollama en cours d'exécution (si utilisé)

Si tous les points sont cochés et ça ne fonctionne toujours pas:
1. Ouvrir DevTools Console (F12)
2. Cliquer sur "Suggest Name"
3. Copier les erreurs affichées
4. Partager les logs pour diagnostic

## Code Concerné

**Fichiers**:
- `creative-studio-ui/src/components/wizard/project-setup/Step1ProjectInfo.tsx`
- `creative-studio-ui/src/hooks/useLLMGeneration.ts`
- `creative-studio-ui/src/services/llmConfigService.ts`
- `creative-studio-ui/src/components/ui/service-warning.tsx`

**Fonction de génération**:
```typescript
const handleGenerateSuggestions = async () => {
  // Vérifie genre et tone
  if (!formData.genre?.length || !formData.tone?.length) {
    return;
  }

  // Génère le prompt
  const prompt = `Generate a creative project name...`;
  
  // Appelle le LLM
  await generate({
    prompt,
    systemPrompt,
    temperature: 0.9,
    maxTokens: 300,
  });
};
```

---

**Date**: 2026-01-29
**Problème**: Bouton LLM ne fonctionne pas dans wizard Project Setup
**Solution**: Configurer LLM + sélectionner Genre/Tone
