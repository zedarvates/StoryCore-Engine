# ✅ Correction Endpoint Ollama - Guide Complet

## 🎯 Problème Résolu

Le problème principal était que `llmService.ts` utilisait le mauvais endpoint Ollama:
- ❌ **Ancien**: `/api/chat` (n'existe pas dans Ollama)
- ✅ **Nouveau**: `/api/generate` (endpoint correct)

## 📝 Changements Effectués

### 1. Correction de l'Endpoint dans `llmService.ts`

**Fichier**: `creative-studio-ui/src/services/llmService.ts`

#### Méthode `generateCompletion()` (ligne ~650)
```typescript
// AVANT (INCORRECT)
const response = await fetch(`${endpoint}/api/chat`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: this.config.model,
    messages: [
      ...(request.systemPrompt ? [{ role: 'system', content: request.systemPrompt }] : []),
      { role: 'user', content: request.prompt },
    ],
    stream: false,
  }),
});

// APRÈS (CORRECT)
const response = await fetch(`${endpoint}/api/generate`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: this.config.model,
    prompt: request.systemPrompt 
      ? `${request.systemPrompt}\n\n${request.prompt}`
      : request.prompt,
    stream: false,
    options: {
      temperature: request.temperature ?? this.config.parameters.temperature,
      num_predict: request.maxTokens ?? this.config.parameters.maxTokens,
    },
  }),
});
```

#### Méthode `generateStreamingCompletion()` (ligne ~700)
```typescript
// AVANT (INCORRECT)
const response = await fetch(`${endpoint}/api/chat`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: this.config.model,
    messages: [...],
    stream: true,
  }),
});

// APRÈS (CORRECT)
const response = await fetch(`${endpoint}/api/generate`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: this.config.model,
    prompt: request.systemPrompt 
      ? `${request.systemPrompt}\n\n${request.prompt}`
      : request.prompt,
    stream: true,
    options: {
      temperature: request.temperature ?? this.config.parameters.temperature,
      num_predict: request.maxTokens ?? this.config.parameters.maxTokens,
    },
  }),
});
```

#### Parsing de la Réponse
```typescript
// AVANT (INCORRECT)
const data = await response.json();
return {
  content: data.message?.content || '',
  finishReason: data.done ? 'stop' : 'length',
};

// APRÈS (CORRECT)
const data = await response.json();
return {
  content: data.response || '', // Ollama utilise 'response', pas 'message.content'
  finishReason: data.done ? 'stop' : 'length',
};
```

## 🔧 Étapes pour Appliquer la Correction

### Étape 1: Nettoyer le Cache du Navigateur

**Option A: Hard Refresh (Recommandé)**
```
Windows/Linux: Ctrl + Shift + R
Mac: Cmd + Shift + R
```

**Option B: Vider le Cache Manuellement**
1. Ouvrir DevTools (F12)
2. Aller dans l'onglet "Application" ou "Storage"
3. Cliquer sur "Clear storage" ou "Vider le stockage"
4. Cocher toutes les cases
5. Cliquer sur "Clear site data"

### Étape 2: Nettoyer localStorage

**Ouvrir la Console du Navigateur (F12) et exécuter:**
```javascript
// Supprimer toutes les anciennes configurations
localStorage.removeItem('storycore_llm_config');
localStorage.removeItem('storycore_api_key_enc');
localStorage.removeItem('storycore-settings');
localStorage.removeItem('llm-config');

// Vérifier que c'est bien supprimé
console.log('Nettoyage terminé!');
console.log('llm_config:', localStorage.getItem('storycore_llm_config'));
console.log('settings:', localStorage.getItem('storycore-settings'));
```

### Étape 3: Redémarrer le Serveur de Développement

**Dans le terminal:**
```bash
# Arrêter le serveur (Ctrl+C)
# Puis redémarrer
cd creative-studio-ui
npm run dev
```

### Étape 4: Recharger la Page

1. Fermer tous les onglets de StoryCore
2. Ouvrir un nouvel onglet
3. Aller sur `http://localhost:5173`
4. Faire un Hard Refresh (Ctrl+Shift+R)

### Étape 5: Reconfigurer le LLM

1. Cliquer sur l'icône ⚙️ Settings dans le chatbox
2. Sélectionner "Local LLM" comme provider
3. Vérifier que l'endpoint est: `http://localhost:11434`
4. Sélectionner un modèle disponible (ex: `llama3.1:8b`)
5. Cliquer sur "Test Connection"
6. Si ça fonctionne ✅, cliquer sur "Save Settings"

## 🧪 Vérification que ça Fonctionne

### Test 1: Vérifier l'Endpoint dans DevTools

1. Ouvrir DevTools (F12)
2. Aller dans l'onglet "Network"
3. Envoyer un message dans le chatbox
4. Chercher la requête vers Ollama
5. Vérifier que l'URL est: `http://localhost:11434/api/generate` ✅
6. Si c'est encore `/api/chat` ❌, refaire les étapes 1-4

### Test 2: Vérifier la Réponse

Dans la console du navigateur, vous devriez voir:
```
[LLMConfigService] Initialized successfully
[LLMConfigService] Auto-detected model: llama3.1:8b
```

Et PAS:
```
POST http://localhost:11434/api/chat 404 (Not Found)
model 'local-model' not found
```

### Test 3: Envoyer un Message

1. Taper "Bonjour" dans le chatbox
2. Appuyer sur Entrée
3. Vous devriez voir:
   - ✅ Le message s'affiche
   - ✅ L'assistant répond en streaming
   - ✅ Pas d'erreur dans la console

## 🐛 Dépannage

### Problème: Toujours l'erreur 404 sur /api/chat

**Solution:**
```bash
# 1. Vérifier que les changements sont bien dans le fichier
cat creative-studio-ui/src/services/llmService.ts | grep "/api/generate"

# 2. Si rien ne s'affiche, le fichier n'a pas été modifié
# Refaire les modifications manuellement

# 3. Redémarrer le serveur
cd creative-studio-ui
npm run dev
```

### Problème: "model 'local-model' not found"

**Solution:**
```javascript
// Dans la console du navigateur
localStorage.clear();
location.reload();
```

### Problème: "Cannot read properties of null (reading 'provider')"

**Solution:**
1. Ouvrir Settings → LLM Configuration
2. Configurer le provider
3. Tester la connexion
4. Sauvegarder

### Problème: Le code ne se recharge pas

**Solution:**
```bash
# 1. Arrêter le serveur (Ctrl+C)
# 2. Supprimer le cache de build
rm -rf creative-studio-ui/node_modules/.vite
rm -rf creative-studio-ui/dist

# 3. Redémarrer
cd creative-studio-ui
npm run dev
```

## 📊 Différences API Ollama

### Format `/api/chat` (N'EXISTE PAS)
```json
{
  "model": "llama3.1:8b",
  "messages": [
    {"role": "system", "content": "..."},
    {"role": "user", "content": "..."}
  ]
}
```

### Format `/api/generate` (CORRECT) ✅
```json
{
  "model": "llama3.1:8b",
  "prompt": "System: ...\n\nUser: ...",
  "stream": true,
  "options": {
    "temperature": 0.7,
    "num_predict": 2000
  }
}
```

### Réponse `/api/generate`
```json
{
  "model": "llama3.1:8b",
  "created_at": "2024-01-20T...",
  "response": "Bonjour! Comment puis-je vous aider?",
  "done": false
}
```

## ✅ Checklist de Vérification

- [ ] Le fichier `llmService.ts` contient `/api/generate` (pas `/api/chat`)
- [ ] Le serveur de dev a été redémarré
- [ ] Le cache du navigateur a été vidé (Ctrl+Shift+R)
- [ ] localStorage a été nettoyé
- [ ] La page a été rechargée
- [ ] Le LLM a été reconfiguré dans Settings
- [ ] La connexion a été testée avec succès
- [ ] Un message de test a été envoyé et a reçu une réponse

## 🎉 Résultat Attendu

Après avoir suivi toutes les étapes:

1. ✅ Le chatbox affiche "Assistant StoryCore" avec statut "Online"
2. ✅ Le modèle sélectionné s'affiche (ex: "llama3.1:8b")
3. ✅ Les messages envoyés reçoivent des réponses en streaming
4. ✅ Aucune erreur 404 dans la console
5. ✅ Aucune erreur "model not found"

## 📞 Si Ça Ne Fonctionne Toujours Pas

1. Vérifier qu'Ollama est bien lancé:
   ```bash
   curl http://localhost:11434/api/tags
   ```

2. Vérifier que le modèle existe:
   ```bash
   ollama list
   ```

3. Tester manuellement l'API:
   ```bash
   curl http://localhost:11434/api/generate -d '{
     "model": "llama3.1:8b",
     "prompt": "Hello",
     "stream": false
   }'
   ```

4. Si tout fonctionne en ligne de commande mais pas dans l'app:
   - Vérifier les CORS
   - Vérifier le firewall
   - Redémarrer Ollama

---

**Date**: 2026-01-20
**Statut**: ✅ Correction Appliquée
**Fichiers Modifiés**: `creative-studio-ui/src/services/llmService.ts`
