# Réinitialisation Complète de la Configuration

## 🎯 Problème

L'application utilise toujours l'ancienne configuration sauvegardée dans le localStorage, même après les corrections du code.

## ✅ Solution: Réinitialisation Complète

### Étape 1: Nettoyer le LocalStorage

Ouvrez la console du navigateur (F12) et exécutez:

```javascript
// Supprimer toutes les configurations LLM
localStorage.removeItem('storycore-settings');
localStorage.removeItem('storycore_llm_config');
localStorage.removeItem('storycore_api_key_enc');
localStorage.removeItem('storycore_language_preference');
localStorage.removeItem('storycore_encryption_key');

// Vérifier que c'est supprimé
console.log('Configuration supprimée');
```

### Étape 2: Redémarrer le Serveur de Développement

**IMPORTANT**: Les modifications du code ne sont pas rechargées automatiquement.

1. **Arrêter le serveur**:
   - Dans le terminal où tourne `npm run dev`
   - Appuyez sur `Ctrl+C`

2. **Redémarrer le serveur**:
   ```bash
   cd creative-studio-ui
   npm run dev
   ```

3. **Attendre que le serveur démarre**:
   ```
   VITE v5.x.x  ready in xxx ms
   ➜  Local:   http://localhost:5173/
   ```

### Étape 3: Recharger l'Application

1. **Recharger la page** (F5 ou Ctrl+R)
2. **Ou faire un rechargement complet** (Ctrl+Shift+R)

### Étape 4: Vérifier la Configuration

La nouvelle configuration par défaut devrait être créée automatiquement:

```json
{
  "provider": "local",
  "model": "llama3.2:1b",
  "apiEndpoint": "http://localhost:11434",
  "streamingEnabled": true,
  "parameters": {
    "temperature": 0.7,
    "maxTokens": 2000,
    "topP": 0.9,
    "frequencyPenalty": 0,
    "presencePenalty": 0
  }
}
```

## 🔍 Vérification

### Dans la Console du Navigateur

Vous devriez voir:
```
[LLMConfigService] Initializing...
[LLMConfigService] No configuration found, creating default
[LLMConfigService] LLM service created
[LLMConfigService] Configuration saved to storage
[LLMConfigService] Initialized successfully
```

### Vérifier le LocalStorage

Dans la console (F12):
```javascript
// Voir la configuration actuelle
const settings = JSON.parse(localStorage.getItem('storycore-settings'));
console.log('Current config:', settings);
```

Vous devriez voir le modèle `llama3.2:1b`.

## ⚠️ Si le Modèle N'existe Pas

Si vous voyez l'erreur `model 'llama3.2:1b' not found`:

### Option 1: Installer le Modèle

```bash
ollama pull llama3.2:1b
```

### Option 2: Utiliser un Modèle Installé

1. Vérifier les modèles disponibles:
   ```bash
   ollama list
   ```

2. Changer le modèle dans Settings:
   - Cliquer sur ⚙️ (Settings) dans le chatbox
   - Ou: Menu → Settings → LLM Configuration
   - Changer "Model" vers un modèle de votre liste
   - Cliquer "Save"

## 📋 Checklist Complète

- [ ] Nettoyer le localStorage (console)
- [ ] Arrêter le serveur de dev (Ctrl+C)
- [ ] Redémarrer le serveur (`npm run dev`)
- [ ] Recharger la page (Ctrl+Shift+R)
- [ ] Vérifier les logs de la console
- [ ] Tester le chatbox
- [ ] Si erreur "model not found": installer ou changer le modèle

## 🎯 Résultat Attendu

Après ces étapes:
- ✅ Chatbox fonctionne (pas "Offline")
- ✅ Configuration par défaut créée
- ✅ Plus d'erreur "Cannot read properties of null"
- ✅ Wizards fonctionnent

## 💡 Script de Réinitialisation Rapide

Copiez-collez dans la console du navigateur (F12):

```javascript
// Script de réinitialisation complète
(function() {
  console.log('🔄 Réinitialisation de la configuration...');
  
  // Supprimer toutes les clés liées à StoryCore
  const keys = Object.keys(localStorage);
  const storyCoreKeys = keys.filter(k => k.startsWith('storycore'));
  
  storyCoreKeys.forEach(key => {
    localStorage.removeItem(key);
    console.log(`✅ Supprimé: ${key}`);
  });
  
  console.log('✅ Configuration réinitialisée!');
  console.log('⚠️  Redémarrez le serveur de dev et rechargez la page');
})();
```

## 🔧 Problèmes Connus

### Erreur 404 sur `/api/chat`

Si vous voyez `POST http://localhost:11434/api/chat 404`:
- C'est un bug dans `llmService.ts`
- L'endpoint correct est `/api/generate` pour Ollama
- Cela sera corrigé dans la prochaine mise à jour

### Modèle 'gemma2:2b' Toujours Utilisé

Si l'application utilise toujours `gemma2:2b`:
- Le localStorage n'a pas été nettoyé
- Ou le serveur n'a pas été redémarré
- Suivez les étapes ci-dessus

---

**Date**: 2026-01-20  
**Statut**: ✅ Procédure complète  
**Temps estimé**: 2-3 minutes
