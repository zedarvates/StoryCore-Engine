# Instructions - Déboguer l'Aide LLM dans Project Setup

## Problème
Le bouton "Suggest Name" ✨ se connecte à Ollama mais ne charge pas de nom.

## Solution: Vérifier les Logs

J'ai ajouté du logging détaillé pour déboguer le problème. Voici comment vérifier:

### Étape 1: Ouvrir DevTools

1. Dans Electron, appuyer sur **F12** pour ouvrir DevTools
2. Aller dans l'onglet **Console**

### Étape 2: Tester le Bouton

1. Ouvrir le **wizard Project Setup** (Dashboard > Creative Wizards > Project Setup)
2. Sélectionner au moins un **Genre** et un **Tone**
3. Cliquer sur **"Suggest Name" ✨**
4. Regarder la console pour les logs

### Étape 3: Analyser les Logs

Vous devriez voir des logs comme:

**✅ Succès**:
```
✅ [Step1ProjectInfo] LLM Response received: {content: "..."}
📝 [Step1ProjectInfo] Response content: {...}
🔍 [parseLLMSuggestions] Parsing response: {...}
📦 [parseLLMSuggestions] Found JSON: {...}
✅ [parseLLMSuggestions] Parsed JSON: {projectName: "...", description: "..."}
✨ [Step1ProjectInfo] Updating form with: {projectName: "...", description: "..."}
```

**❌ Erreur - Pas de réponse**:
```
❌ LLM GENERATION FAILED - Error: ...
```

**❌ Erreur - Réponse vide**:
```
✅ [Step1ProjectInfo] LLM Response received: {content: ""}
📝 [Step1ProjectInfo] Response content: 
⚠️ [parseLLMSuggestions] No JSON found in response
⚠️ [Step1ProjectInfo] No project name found in suggestions
```

**❌ Erreur - JSON invalide**:
```
📦 [parseLLMSuggestions] Found JSON: {...}
⚠️ [parseLLMSuggestions] JSON parsing failed: SyntaxError: ...
```

## Problèmes Courants et Solutions

### Problème 1: "No JSON found in response"

**Cause**: Ollama retourne du texte au lieu de JSON

**Solution**: Vérifier le prompt envoyé à Ollama

Le prompt demande du JSON:
```
Format as JSON:
{
  "projectName": "...",
  "description": "..."
}
```

Mais Ollama peut ignorer cette instruction.

**Fix**: Modifier le prompt pour être plus strict:

Fichier: `creative-studio-ui/src/components/wizard/project-setup/Step1ProjectInfo.tsx`

Chercher la fonction `handleGenerateSuggestions` et changer:

```typescript
const prompt = `Generate a creative project name and brief description for a story project with these characteristics:
- Genre: ${formData.genre.join(', ')}
- Tone: ${formData.tone.join(', ')}
- Target Audience: ${formData.targetAudience || 'general audience'}

IMPORTANT: You MUST respond with ONLY valid JSON, no other text.

{
  "projectName": "A memorable project name (2-4 words)",
  "description": "A brief description (1-2 sentences)"
}`;
```

### Problème 2: "JSON parsing failed"

**Cause**: Ollama retourne du JSON invalide

**Solution**: Vérifier la réponse exacte

Ajouter ce log dans la console:
```javascript
// Dans DevTools Console, copier-coller:
console.log('Response:', document.querySelector('[data-testid="llm-response"]')?.textContent);
```

Ou regarder le log:
```
📦 [parseLLMSuggestions] Found JSON: {...}
```

Copier le JSON et le valider sur https://jsonlint.com/

### Problème 3: "LLM service not initialized"

**Cause**: Le LLM n'est pas configuré

**Solution**: 
1. Menu > Settings > LLM Settings
2. Configurer Ollama ou OpenAI
3. Test Connection → Devrait être vert ✅
4. Save

### Problème 4: Réponse vide

**Cause**: Ollama ne répond pas ou timeout

**Solution**:
1. Vérifier qu'Ollama est lancé: `ollama serve`
2. Vérifier le modèle: `ollama list`
3. Tester manuellement:
   ```bash
   curl -X POST http://localhost:11434/api/generate \
     -H "Content-Type: application/json" \
     -d '{
       "model": "llama3.2",
       "prompt": "Say hello",
       "stream": false
     }'
   ```

## Prochaines Étapes

### Si les logs montrent du JSON valide mais le nom ne s'affiche pas:

1. Vérifier que `updateFormData` fonctionne
2. Ajouter un log après `updateFormData`:
   ```typescript
   updateFormData({ 
     projectName: suggestions.projectName,
     projectDescription: suggestions.description || formData.projectDescription
   });
   console.log('✅ Form updated with:', suggestions);
   ```

### Si les logs montrent une erreur:

1. Copier l'erreur exacte
2. Vérifier le fichier `creative-studio-ui/src/components/wizard/project-setup/Step1ProjectInfo.tsx`
3. Chercher la ligne du problème
4. Ajouter plus de logs si nécessaire

## Fichiers Modifiés

- `creative-studio-ui/src/components/wizard/project-setup/Step1ProjectInfo.tsx`
  - Ajout de logs détaillés dans `onSuccess` callback
  - Ajout de logs dans `parseLLMSuggestions`

## Commandes Utiles

**Redémarrer Ollama**:
```bash
taskkill /F /IM ollama.exe
ollama serve
```

**Vérifier la connexion**:
```bash
curl http://localhost:11434
# Devrait répondre: "Ollama is running"
```

**Tester un modèle**:
```bash
ollama run llama3.2 "Say hello"
```

**Lister les modèles**:
```bash
ollama list
```

---

**Prochaine étape**: Ouvrir DevTools (F12), cliquer sur "Suggest Name", et partager les logs de la console.
