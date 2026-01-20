# 🔧 Correction - Erreur 404 Ollama

## Date: 2026-01-20

## 🐛 PROBLÈME IDENTIFIÉ

### Erreur Console
```
:11434/api/generate:1 Failed to load resource: the server responded with a status of 404 (Not Found)
```

### Cause
L'application essaie d'appeler l'API Ollama à `http://localhost:11434/api/generate` mais reçoit une erreur 404, ce qui signifie que:

1. **Ollama n'est pas en cours d'exécution** ❌
2. **Ollama n'est pas installé** ❌
3. **Ollama est installé mais le service n'est pas démarré** ❌

## ✅ SOLUTIONS APPLIQUÉES

### 1. Amélioration de la Gestion d'Erreurs

#### Fichier: `creative-studio-ui/src/services/llmService.ts`

**Modifications**:
- Ajout de try-catch autour des appels fetch
- Détection spécifique de l'erreur 404
- Messages d'erreur plus clairs
- Gestion des erreurs réseau

**Code Ajouté**:
```typescript
if (response.status === 404) {
  throw new LLMError(
    'Ollama service not found. Please ensure Ollama is running and accessible at ' + endpoint,
    'connection',
    true,
    { endpoint, status: 404 }
  );
}

// Handle network errors
if (error instanceof TypeError && error.message.includes('fetch')) {
  throw new LLMError(
    'Cannot connect to Ollama. Please ensure Ollama is running at ' + endpoint,
    'network',
    true,
    { endpoint, originalError: error.message }
  );
}
```

### 2. Vérification au Démarrage

#### Fichier: `creative-studio-ui/src/providers/LLMProvider.tsx`

**Modifications**:
- Vérification de la disponibilité d'Ollama au démarrage
- Appel à `/api/tags` pour tester la connexion
- Timeout de 3 secondes pour ne pas bloquer l'application
- Logs clairs dans la console

**Code Ajouté**:
```typescript
// If config exists and provider is local/ollama, verify Ollama is running
if (config && (config.provider === 'local' || config.provider === 'ollama')) {
  const endpoint = config.apiEndpoint || 'http://localhost:11434';
  try {
    console.log('[LLMProvider] Checking Ollama availability at', endpoint);
    const response = await fetch(`${endpoint}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    });
    
    if (!response.ok) {
      console.warn('[LLMProvider] Ollama is not responding correctly');
    } else {
      console.log('[LLMProvider] Ollama is available');
    }
  } catch (ollamaError) {
    console.warn('[LLMProvider] Ollama is not running or not accessible:', ollamaError);
  }
}
```

### 3. Message Utilisateur Amélioré

#### Fichier: `creative-studio-ui/src/components/wizard/LLMStatusBanner.tsx`

**Modifications**:
- Ajout d'une note explicative sur Ollama
- Instructions claires pour démarrer Ollama
- Vérification de l'endpoint

**Message Ajouté**:
```
Note: If you're using Ollama, make sure it's running:
• Check if Ollama is installed
• Start Ollama service
• Verify it's accessible at http://localhost:11434
```

## 🚀 COMMENT RÉSOUDRE L'ERREUR

### Option 1: Installer et Démarrer Ollama (RECOMMANDÉ)

#### Windows
1. **Télécharger Ollama**:
   ```
   https://ollama.com/download/windows
   ```

2. **Installer Ollama**:
   - Double-cliquer sur le fichier téléchargé
   - Suivre l'assistant d'installation

3. **Démarrer Ollama**:
   - Ollama démarre automatiquement après l'installation
   - Vérifier dans la barre des tâches (icône Ollama)

4. **Télécharger un Modèle**:
   ```bash
   ollama pull llama3.2:1b
   ```

5. **Vérifier que ça fonctionne**:
   ```bash
   ollama list
   ```

#### macOS
```bash
# Télécharger et installer
curl -fsSL https://ollama.com/install.sh | sh

# Démarrer Ollama
ollama serve

# Dans un autre terminal, télécharger un modèle
ollama pull llama3.2:1b
```

#### Linux
```bash
# Installer
curl -fsSL https://ollama.com/install.sh | sh

# Démarrer le service
sudo systemctl start ollama

# Télécharger un modèle
ollama pull llama3.2:1b
```

### Option 2: Utiliser un Autre Provider LLM

Si vous ne voulez pas utiliser Ollama, vous pouvez configurer un autre provider:

#### OpenAI
1. Ouvrir Settings → LLM Configuration
2. Choisir "OpenAI" comme provider
3. Entrer votre API key OpenAI
4. Choisir un modèle (ex: gpt-3.5-turbo)
5. Sauvegarder

#### Anthropic (Claude)
1. Ouvrir Settings → LLM Configuration
2. Choisir "Anthropic" comme provider
3. Entrer votre API key Anthropic
4. Choisir un modèle (ex: claude-3-haiku)
5. Sauvegarder

## 🧪 VÉRIFIER QUE ÇA FONCTIONNE

### Test 1: Vérifier Ollama dans le Terminal
```bash
# Vérifier que Ollama est en cours d'exécution
curl http://localhost:11434/api/tags

# Devrait retourner une liste de modèles installés
```

### Test 2: Vérifier dans l'Application
1. Démarrer l'application:
   ```bash
   cd creative-studio-ui
   npm run dev
   ```

2. Ouvrir la console du navigateur (F12)

3. Chercher ces messages:
   ```
   [LLMProvider] Checking Ollama availability at http://localhost:11434
   [LLMProvider] Ollama is available
   ```

4. Ouvrir un wizard (World Building, Character Creation, etc.)

5. Le banner jaune ne devrait PAS apparaître si Ollama fonctionne

### Test 3: Tester la Génération
1. Ouvrir le World Wizard
2. Remplir les champs
3. Cliquer sur un bouton de génération AI
4. Vérifier qu'il n'y a pas d'erreur 404 dans la console

## 📊 MESSAGES DE LA CONSOLE

### Ollama Disponible ✅
```
[LLMProvider] Initializing LLM service...
[LLMProvider] Checking Ollama availability at http://localhost:11434
[LLMProvider] Ollama is available
[LLMProvider] LLM service initialized successfully
```

### Ollama Non Disponible ⚠️
```
[LLMProvider] Initializing LLM service...
[LLMProvider] Checking Ollama availability at http://localhost:11434
[LLMProvider] Ollama is not running or not accessible: TypeError: Failed to fetch
[LLMProvider] LLM service initialized successfully
```

### Erreur 404 lors de la Génération ❌
```
Error: Ollama service not found. Please ensure Ollama is running and accessible at http://localhost:11434
```

## 🔍 DIAGNOSTIC

### Vérifier si Ollama est Installé
```bash
# Windows (PowerShell)
Get-Command ollama

# macOS/Linux
which ollama
```

### Vérifier si Ollama est en Cours d'Exécution
```bash
# Windows (PowerShell)
Get-Process ollama

# macOS/Linux
ps aux | grep ollama
```

### Vérifier les Modèles Installés
```bash
ollama list
```

### Tester Manuellement
```bash
# Tester l'API
curl http://localhost:11434/api/tags

# Tester la génération
curl http://localhost:11434/api/generate -d '{
  "model": "llama3.2:1b",
  "prompt": "Hello, world!",
  "stream": false
}'
```

## 📝 FICHIERS MODIFIÉS

1. ✅ `creative-studio-ui/src/services/llmService.ts`
   - Amélioration de la gestion d'erreurs
   - Messages plus clairs

2. ✅ `creative-studio-ui/src/providers/LLMProvider.tsx`
   - Vérification de la disponibilité d'Ollama au démarrage
   - Logs détaillés

3. ✅ `creative-studio-ui/src/components/wizard/LLMStatusBanner.tsx`
   - Message utilisateur amélioré
   - Instructions pour Ollama

## ✅ RÉSULTAT

Après ces modifications:

1. **Erreurs Plus Claires**: L'utilisateur comprend immédiatement que Ollama n'est pas en cours d'exécution
2. **Vérification au Démarrage**: L'application vérifie si Ollama est disponible
3. **Instructions Claires**: Le banner explique comment résoudre le problème
4. **Pas de Crash**: L'application continue de fonctionner même si Ollama n'est pas disponible

## 🚀 PROCHAINES ÉTAPES

1. **Installer Ollama** (si pas déjà fait)
2. **Démarrer Ollama**
3. **Télécharger un modèle**: `ollama pull llama3.2:1b`
4. **Redémarrer l'application**
5. **Tester les wizards**

## 📞 COMMANDES RAPIDES

```bash
# Installer Ollama (Windows)
# Télécharger depuis: https://ollama.com/download/windows

# Vérifier Ollama
curl http://localhost:11434/api/tags

# Télécharger un modèle
ollama pull llama3.2:1b

# Lister les modèles
ollama list

# Démarrer l'application
cd creative-studio-ui
npm run dev
```

---

**Statut**: ✅ **CORRECTIFS APPLIQUÉS**

**Prochaine Action**: Installer et démarrer Ollama, puis tester l'application
