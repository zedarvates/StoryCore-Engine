# Correction LLM - Aide "Suggest Name" dans Project Setup

## Problème Identifié

Le bouton "Suggest Name" ✨ se connectait à Ollama mais ne chargeait pas de nom car:
- **Ollama retournait du texte au lieu de JSON**
- Le parsing ne trouvait pas le JSON dans la réponse

## Solutions Appliquées

### 1. ✅ Prompt Amélioré

**Fichier**: `creative-studio-ui/src/components/wizard/project-setup/Step1ProjectInfo.tsx`

**Changement**: Rendu le prompt plus strict pour forcer Ollama à retourner du JSON:

```typescript
// AVANT: Prompt flexible
const prompt = `Generate a creative project name...
Format as JSON: {...}`;

// APRÈS: Prompt strict
const prompt = `Generate a creative project name...
RESPOND WITH ONLY THIS JSON FORMAT, NO OTHER TEXT:
{
  "projectName": "...",
  "description": "..."
}`;
```

**Aussi**:
- Réduit `temperature` de 0.9 à 0.7 (plus déterministe)
- Réduit `maxTokens` de 300 à 200 (réponse plus courte)
- Amélioré le `systemPrompt` pour insister sur JSON uniquement

### 2. ✅ Parsing Robuste

**Améliorations du parsing**:
- Ajout de logs détaillés à chaque étape
- Meilleure extraction du JSON (même avec du texte avant/après)
- Fallback text-based parsing si JSON échoue
- Vérification que `projectName` n'est pas vide

### 3. ✅ Logging Complet

Ajouté des logs pour déboguer:
```
🚀 [handleGenerateSuggestions] Sending request to LLM
📝 [handleGenerateSuggestions] Prompt: ...
✅ [Step1ProjectInfo] LLM Response received: ...
📝 [Step1ProjectInfo] Response content: ...
🔍 [parseLLMSuggestions] Raw response: ...
📦 [parseLLMSuggestions] Found JSON match: ...
✅ [parseLLMSuggestions] Successfully parsed JSON: ...
✨ [Step1ProjectInfo] Updating form with: {projectName: "...", ...}
```

## Comment Tester

### Étape 1: Ouvrir DevTools
- Appuyer sur **F12** dans Electron
- Aller dans l'onglet **Console**

### Étape 2: Tester le Bouton
1. Ouvrir **wizard Project Setup**
2. Sélectionner **Genre** + **Tone**
3. Cliquer **"Suggest Name" ✨**
4. Regarder les logs dans la console

### Résultats Attendus

**✅ Succès**:
```
✨ [Step1ProjectInfo] Updating form with: {projectName: "Echoes of Tomorrow", description: "..."}
```

Le champ "Project Name" se remplit automatiquement!

**❌ Problème**:
```
⚠️ [parseLLMSuggestions] No JSON found in response
```

Si vous voyez ça, c'est que Ollama retourne toujours du texte au lieu de JSON.

## Si Ça Ne Fonctionne Toujours Pas

### Option 1: Vérifier la Réponse d'Ollama

Ouvrir un terminal et tester directement:
```bash
curl -X POST http://localhost:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama3.2",
    "prompt": "RESPOND WITH ONLY THIS JSON:\n{\"projectName\": \"Test\", \"description\": \"Test\"}",
    "stream": false
  }'
```

Vérifier que la réponse contient du JSON valide.

### Option 2: Utiliser OpenAI à la Place

Si Ollama ne coopère pas:
1. Menu > Settings > LLM Settings
2. Provider: **OpenAI**
3. API Key: Votre clé OpenAI
4. Model: **gpt-4** ou **gpt-3.5-turbo**
5. Test Connection → Save
6. Retester le wizard

OpenAI est plus fiable pour suivre les instructions JSON.

### Option 3: Modifier le Modèle Ollama

Essayer un modèle différent:
```bash
ollama pull mistral
# Puis dans Settings > LLM, changer Model à "mistral"
```

Certains modèles sont meilleurs pour générer du JSON.

## Fichiers Modifiés

- `creative-studio-ui/src/components/wizard/project-setup/Step1ProjectInfo.tsx`
  - Fonction `handleGenerateSuggestions`: Prompt amélioré
  - Fonction `parseLLMSuggestions`: Parsing robuste avec logs

## Build Status

✅ **Build réussi**: 9.31s
✅ **Electron lancé**: Prêt à tester

## Prochaines Étapes

1. **Ouvrir DevTools** (F12)
2. **Tester le bouton "Suggest Name"**
3. **Regarder les logs**
4. **Partager les logs si ça ne fonctionne pas**

---

**Date**: 2026-01-29
**Problème**: Aide LLM ne charge pas de nom
**Solution**: Prompt strict + parsing robuste + logs détaillés
**Statut**: ✅ Prêt à tester
