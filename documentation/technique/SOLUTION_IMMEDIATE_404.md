# 🔧 Solution Immédiate - Erreur 404 avec Ollama Fonctionnel

## 🎯 PROBLÈME IDENTIFIÉ

Ollama fonctionne correctement (vérifié ✅) et vous avez plusieurs modèles installés:
- ✅ qwen3-vl:4b
- ✅ gemma3:1b
- ✅ llama3.1:8b
- ✅ Et d'autres...

**MAIS** l'application essaie toujours d'appeler `/api/generate` et reçoit une 404.

## 🔍 CAUSE PROBABLE

La configuration LLM dans l'application pointe vers un modèle qui n'existe pas ou la configuration est corrompue.

## ✅ SOLUTION IMMÉDIATE

### Étape 1: Ouvrir la Console du Navigateur

1. Dans votre navigateur (avec l'application ouverte)
2. Appuyer sur **F12** pour ouvrir les DevTools
3. Aller dans l'onglet **Console**

### Étape 2: Réinitialiser la Configuration LLM

Copier-coller cette commande dans la console:

```javascript
// Supprimer l'ancienne configuration
localStorage.removeItem('storycore-llm-config');

// Créer une nouvelle configuration avec qwen3-vl:4b
const newConfig = {
  provider: 'local',
  model: 'qwen3-vl:4b',
  apiKey: '',
  apiEndpoint: 'http://localhost:11434',
  streamingEnabled: true,
  parameters: {
    temperature: 0.7,
    maxTokens: 2000,
    topP: 0.9,
    frequencyPenalty: 0,
    presencePenalty: 0
  }
};

localStorage.setItem('storycore-llm-config', JSON.stringify(newConfig));

console.log('✅ Configuration LLM réinitialisée avec qwen3-vl:4b');

// Recharger la page
location.reload();
```

### Étape 3: Vérifier dans l'Application

Après le rechargement:
1. Ouvrir un wizard (World Building)
2. Le banner jaune devrait disparaître
3. Les boutons de génération AI devraient fonctionner

---

## 🔧 ALTERNATIVE: Configuration via l'Interface

Si la méthode console ne fonctionne pas:

### 1. Ouvrir les Paramètres LLM

1. Cliquer sur l'icône **Settings** (⚙️) dans l'application
2. Aller dans **LLM Configuration**

### 2. Configurer Ollama

- **Provider**: Choisir "Local" ou "Ollama"
- **Endpoint**: `http://localhost:11434`
- **Model**: Taper `qwen3-vl:4b` (ou choisir dans la liste)
- **Temperature**: 0.7
- **Max Tokens**: 2000

### 3. Sauvegarder

Cliquer sur **Save** ou **Sauvegarder**

---

## 🧪 TESTER LA CONFIGURATION

### Test 1: Vérifier Ollama Manuellement

Dans PowerShell:
```powershell
# Tester l'API generate avec qwen3-vl:4b
curl -X POST http://localhost:11434/api/generate -H "Content-Type: application/json" -d '{\"model\":\"qwen3-vl:4b\",\"prompt\":\"Hello\",\"stream\":false}'
```

Si ça fonctionne, vous devriez voir une réponse JSON.

### Test 2: Vérifier dans la Console

Dans la console du navigateur (F12):
```javascript
// Vérifier la configuration actuelle
const config = JSON.parse(localStorage.getItem('storycore-llm-config'));
console.log('Configuration actuelle:', config);
```

Vous devriez voir:
```javascript
{
  provider: "local",
  model: "qwen3-vl:4b",
  apiEndpoint: "http://localhost:11434",
  ...
}
```

---

## 🐛 SI ÇA NE FONCTIONNE TOUJOURS PAS

### Vérifier les Logs de la Console

Dans la console du navigateur, chercher:
```
[LLMProvider] Checking Ollama availability at http://localhost:11434
[LLMProvider] Ollama is available
```

Si vous voyez:
```
[LLMProvider] Ollama is not running or not accessible
```

Alors il y a un problème de connexion.

### Vérifier le Port d'Ollama

Ollama écoute normalement sur le port 11434. Vérifier:

```powershell
# Vérifier si le port 11434 est ouvert
netstat -an | findstr "11434"
```

Vous devriez voir:
```
TCP    0.0.0.0:11434          0.0.0.0:0              LISTENING
```

---

## 📝 COMMANDES RAPIDES

### Réinitialiser la Config (Console Navigateur)
```javascript
localStorage.removeItem('storycore-llm-config');
localStorage.setItem('storycore-llm-config', JSON.stringify({
  provider: 'local',
  model: 'qwen3-vl:4b',
  apiKey: '',
  apiEndpoint: 'http://localhost:11434',
  streamingEnabled: true,
  parameters: { temperature: 0.7, maxTokens: 2000, topP: 0.9, frequencyPenalty: 0, presencePenalty: 0 }
}));
location.reload();
```

### Tester Ollama (PowerShell)
```powershell
# Vérifier les modèles
ollama list

# Tester la génération
ollama run qwen3-vl:4b "Hello, how are you?"

# Tester l'API
curl http://localhost:11434/api/tags
```

---

## ✅ RÉSULTAT ATTENDU

Après avoir suivi ces étapes:
1. ✅ La configuration LLM pointe vers `qwen3-vl:4b`
2. ✅ L'erreur 404 disparaît
3. ✅ Le banner jaune dans les wizards disparaît
4. ✅ Les boutons de génération AI fonctionnent
5. ✅ Vous pouvez utiliser l'assistance LLM

---

**Essayez la méthode console en premier (Étape 2), c'est la plus rapide!**
