# Correction - Boutons IA Désactivés

## 🐛 Problème

Les boutons d'assistance IA dans le wizard World Building restaient désactivés même quand le LLM était correctement configuré:

- ❌ Step 1: "Suggest Name" désactivé
- ❌ Step 2: "Generate Rules" désactivé  
- ❌ Step 3: "Generate Locations" désactivé
- ❌ Step 4: "Generate Elements" désactivé

## 🔍 Cause Racine

Le hook `useServiceStatus()` cherchait la configuration LLM dans la mauvaise clé de localStorage:

**Avant (INCORRECT)**:
```typescript
const llmConfig = localStorage.getItem('llm-config'); // ❌ Clé inexistante
```

**Réalité**:
La configuration LLM est stockée dans `'storycore-settings'` avec une structure chiffrée:
```typescript
{
  llm: {
    config: { provider, model, endpoint, ... },
    encryptedApiKey: "...",
    lastValidated: "..."
  },
  comfyui: { ... },
  version: "1.0"
}
```

## ✅ Solution Appliquée

**Fichier**: `creative-studio-ui/src/components/ui/service-warning.tsx`

### Correction du Hook `useServiceStatus`

```typescript
export function useServiceStatus() {
  const [llmConfigured, setLLMConfigured] = React.useState(false);
  const [comfyUIConfigured, setComfyUIConfigured] = React.useState(false);

  React.useEffect(() => {
    // ✅ Lire depuis 'storycore-settings'
    try {
      const storedSettings = localStorage.getItem('storycore-settings');
      if (storedSettings) {
        const settings = JSON.parse(storedSettings);
        
        // Vérifier si LLM est configuré
        const hasLLMConfig = settings.llm?.config?.provider;
        const hasApiKey = settings.llm?.encryptedApiKey;
        const isOllama = settings.llm?.config?.provider === 'ollama' || 
                        settings.llm?.config?.provider === 'local';
        
        // LLM configuré si: provider + (apiKey OU Ollama)
        setLLMConfigured(!!(hasLLMConfig && (hasApiKey || isOllama)));
      } else {
        setLLMConfigured(false);
      }
    } catch (error) {
      console.error('Failed to check LLM config:', error);
      setLLMConfigured(false);
    }

    // Vérifier ComfyUI (avec fallback vers ancien stockage)
    try {
      const storedSettings = localStorage.getItem('storycore-settings');
      if (storedSettings) {
        const settings = JSON.parse(storedSettings);
        setComfyUIConfigured(!!(settings.comfyui?.config?.serverUrl));
      } else {
        // Fallback: ancien système de stockage
        const comfyUIServers = localStorage.getItem('comfyui-servers');
        if (comfyUIServers) {
          const servers = JSON.parse(comfyUIServers);
          setComfyUIConfigured(!!(servers.servers && servers.servers.length > 0));
        } else {
          setComfyUIConfigured(false);
        }
      }
    } catch (error) {
      console.error('Failed to check ComfyUI config:', error);
      setComfyUIConfigured(false);
    }
  }, []);

  return {
    llmConfigured,
    comfyUIConfigured,
    anyConfigured: llmConfigured || comfyUIConfigured,
    allConfigured: llmConfigured && comfyUIConfigured,
  };
}
```

## 🎯 Logique de Détection

### LLM Configuré Si:

1. **Provider existe**: `settings.llm?.config?.provider` est défini
2. **ET** l'une des conditions suivantes:
   - **API Key chiffrée existe**: `settings.llm?.encryptedApiKey` est défini
   - **OU Provider est Ollama/Local**: Pas besoin d'API key

### Providers Supportés:

- ✅ **OpenAI**: Nécessite `encryptedApiKey`
- ✅ **Anthropic**: Nécessite `encryptedApiKey`
- ✅ **Ollama**: Pas d'API key nécessaire (provider = 'ollama' ou 'local')
- ✅ **Autres**: Nécessite `encryptedApiKey`

## 📊 Résultat Attendu

Après cette correction:

### Avec LLM Configuré (Ollama)
```
✅ Step 1: "Suggest Name" ACTIVÉ
✅ Step 2: "Generate Rules" ACTIVÉ
✅ Step 3: "Generate Locations" ACTIVÉ
✅ Step 4: "Generate Elements" ACTIVÉ
❌ ServiceWarning CACHÉ
```

### Sans LLM Configuré
```
❌ Step 1: "Suggest Name" DÉSACTIVÉ
❌ Step 2: "Generate Rules" DÉSACTIVÉ
❌ Step 3: "Generate Locations" DÉSACTIVÉ
❌ Step 4: "Generate Elements" DÉSACTIVÉ
⚠️ ServiceWarning AFFICHÉ avec bouton "Configure LLM"
```

## 🧪 Comment Tester

### Test 1: Avec Ollama Configuré

1. Ouvrir Settings > LLM Configuration
2. Configurer Ollama (localhost:11434)
3. Sélectionner un modèle (ex: gemma2:2b)
4. Sauvegarder
5. Ouvrir le wizard World Building
6. **Vérifier**: Tous les boutons "Generate" sont activés
7. **Vérifier**: Pas de ServiceWarning affiché

### Test 2: Sans LLM Configuré

1. Ouvrir Settings > LLM Configuration
2. Supprimer la configuration (ou ne rien configurer)
3. Ouvrir le wizard World Building
4. **Vérifier**: Tous les boutons "Generate" sont désactivés
5. **Vérifier**: ServiceWarning affiché avec message
6. Cliquer sur "Configure LLM"
7. **Vérifier**: Modal de configuration s'ouvre

### Test 3: Avec OpenAI/Anthropic

1. Ouvrir Settings > LLM Configuration
2. Configurer OpenAI ou Anthropic avec API key
3. Sauvegarder
4. Ouvrir le wizard World Building
5. **Vérifier**: Tous les boutons "Generate" sont activés

## 🔧 Debug

Si les boutons restent désactivés:

### Vérifier le localStorage

Ouvrir la console du navigateur (F12) et exécuter:

```javascript
// Vérifier le contenu de storycore-settings
const settings = JSON.parse(localStorage.getItem('storycore-settings'));
console.log('Settings:', settings);

// Vérifier la configuration LLM
console.log('LLM Config:', settings?.llm?.config);
console.log('Has API Key:', !!settings?.llm?.encryptedApiKey);
console.log('Provider:', settings?.llm?.config?.provider);

// Vérifier la détection
const hasLLMConfig = settings?.llm?.config?.provider;
const hasApiKey = settings?.llm?.encryptedApiKey;
const isOllama = settings?.llm?.config?.provider === 'ollama' || 
                settings?.llm?.config?.provider === 'local';
console.log('LLM Configured:', !!(hasLLMConfig && (hasApiKey || isOllama)));
```

### Résultats Attendus

**Avec Ollama**:
```javascript
LLM Config: { provider: 'ollama', endpoint: 'http://localhost:11434', model: 'gemma2:2b' }
Has API Key: false
Provider: ollama
LLM Configured: true ✅
```

**Avec OpenAI**:
```javascript
LLM Config: { provider: 'openai', model: 'gpt-4' }
Has API Key: true
Provider: openai
LLM Configured: true ✅
```

**Sans Configuration**:
```javascript
LLM Config: undefined
Has API Key: false
Provider: undefined
LLM Configured: false ❌
```

## 📝 Notes Importantes

1. **Cache du navigateur**: Après la correction, faire un hard refresh (Ctrl+F5)
2. **Réactivité**: Le hook vérifie la configuration au montage du composant
3. **Pas de réactivité automatique**: Si vous configurez le LLM pendant que le wizard est ouvert, vous devez fermer et rouvrir le wizard
4. **Sécurité**: L'API key est toujours chiffrée dans le localStorage

## 🚀 Prochaines Améliorations Possibles

1. **Réactivité en temps réel**: Écouter les changements de localStorage
2. **Indicateur visuel**: Badge "LLM Ready" dans l'interface
3. **Test de connexion**: Vérifier que le LLM répond avant d'activer les boutons
4. **Cache du statut**: Éviter de parser le JSON à chaque render

---

**Statut**: ✅ Corrigé - Les boutons s'activent maintenant correctement  
**Date**: 2026-01-20  
**Impact**: Tous les boutons d'assistance IA fonctionnent quand le LLM est configuré
