# Analyse du Problème de Connexion LLM

## 🔍 Diagnostic Complet

### Problème Identifié
Les fonctionnalités LLM (chatbox, assistants IA, génération automatique) ne fonctionnent pas correctement, comme si le service n'était pas connecté.

## 📋 Points de Vérification Critiques

### 1. **Configuration LLM Non Initialisée**

#### Symptômes:
- Les boutons d'assistance IA sont désactivés ou ne répondent pas
- Aucune génération de contenu par IA
- Messages d'erreur "API key required"

#### Causes Possibles:

**A. Absence de Configuration Stockée**
```typescript
// Fichier: creative-studio-ui/src/utils/llmConfigStorage.ts
// La configuration LLM est stockée dans localStorage avec clés:
- 'storycore_llm_config' (configuration sans API key)
- 'storycore_api_key_enc' (API key chiffrée)
```

**Vérification:**
```javascript
// Dans la console du navigateur:
console.log(localStorage.getItem('storycore_llm_config'));
console.log(localStorage.getItem('storycore_api_key_enc'));
```

**B. API Key Manquante ou Invalide**
```typescript
// Fichier: creative-studio-ui/src/components/launcher/LandingChatBox.tsx
// Ligne 305-310: Vérification de l'API key
if (requiresApiKey && !llmConfig.apiKey) {
  setLlmService(null);
  setConnectionStatus('fallback');
  setIsFallbackMode(true);
  return;
}
```

### 2. **Service LLM Non Instancié**

#### Problème:
Le service `LLMService` n'est créé que si une configuration valide existe.

```typescript
// Fichier: creative-studio-ui/src/components/launcher/LandingChatBox.tsx
// Ligne 313-314
const service = new LLMService(llmConfig);
setLlmService(service);
```

**Conditions pour l'instanciation:**
1. Configuration LLM valide chargée
2. API key présente (pour OpenAI/Anthropic)
3. Pas d'erreur de chiffrement/déchiffrement

### 3. **Providers LLM Supportés**

```typescript
// Fichier: creative-studio-ui/src/services/llmService.ts
// Providers disponibles:
- 'openai' → OpenAI API (nécessite API key)
- 'anthropic' → Anthropic API (nécessite API key)
- 'local' → Ollama local (http://localhost:11434)
- 'custom' → Endpoint personnalisé
```

### 4. **Flux d'Initialisation**

```
1. Chargement de la page
   ↓
2. useEffect: initializeConfiguration()
   ↓
3. Vérification Ollama disponible
   ↓
4. Chargement configuration depuis localStorage
   ↓
5. Si config valide → Création LLMService
   ↓
6. Si pas de config → Mode fallback
```

## 🔧 Solutions Proposées

### Solution 1: Vérifier la Configuration Existante

**Étape 1: Ouvrir la Console du Navigateur**
```javascript
// Vérifier si une configuration existe
const config = localStorage.getItem('storycore_llm_config');
const apiKey = localStorage.getItem('storycore_api_key_enc');

console.log('Config:', config);
console.log('API Key (encrypted):', apiKey);
```

**Étape 2: Vérifier l'État du Service**
```javascript
// Dans React DevTools, chercher le composant LandingChatBox
// Vérifier les states:
- llmService (doit être un objet LLMService, pas null)
- llmConfig (doit contenir provider, model, apiKey)
- connectionStatus (doit être 'online', pas 'fallback')
- isFallbackMode (doit être false)
```

### Solution 2: Configurer Manuellement le LLM

#### Option A: Utiliser Ollama (Local, Gratuit)

**Prérequis:**
1. Installer Ollama: https://ollama.ai
2. Lancer Ollama: `ollama serve`
3. Télécharger un modèle: `ollama pull gemma3:1b`

**Configuration dans l'application:**
```javascript
// Ouvrir le dialogue de configuration LLM
// Sélectionner:
- Provider: Local
- Model: gemma3:1b
- Endpoint: http://localhost:11434
- Streaming: Activé
```

#### Option B: Utiliser OpenAI

**Configuration:**
```javascript
// Ouvrir le dialogue de configuration LLM
// Sélectionner:
- Provider: OpenAI
- Model: gpt-4 ou gpt-3.5-turbo
- API Key: sk-... (votre clé API)
- Streaming: Activé
```

### Solution 3: Réinitialiser la Configuration

**Si la configuration est corrompue:**
```javascript
// Dans la console du navigateur:
localStorage.removeItem('storycore_llm_config');
localStorage.removeItem('storycore_api_key_enc');
sessionStorage.removeItem('storycore_encryption_key');

// Recharger la page
location.reload();
```

### Solution 4: Vérifier les Erreurs de Chiffrement

**Problème potentiel:**
La clé de chiffrement est stockée dans `sessionStorage` et peut être perdue.

```typescript
// Fichier: creative-studio-ui/src/utils/llmConfigStorage.ts
// Ligne 95-115: Gestion de la clé de chiffrement
const ENCRYPTION_KEY_STORAGE = 'storycore_encryption_key';
```

**Solution:**
```javascript
// Vérifier si la clé de chiffrement existe
const encKey = sessionStorage.getItem('storycore_encryption_key');
console.log('Encryption key exists:', !!encKey);

// Si absente, la configuration ne peut pas être déchiffrée
// → Reconfigurer le LLM
```

## 🐛 Bugs Potentiels Identifiés

### Bug 1: Service LLM Non Propagé aux Composants

**Problème:**
Le service `llmService` est créé dans `LandingChatBox` mais n'est pas partagé avec d'autres composants (wizards, assistants).

**Fichiers concernés:**
- `creative-studio-ui/src/components/wizard/GenericWizardModal.tsx`
- `creative-studio-ui/src/components/AISurroundAssistant.tsx`
- `creative-studio-ui/src/components/ChatBox.tsx`

**Solution:**
Créer un contexte React pour partager le service LLM:

```typescript
// Nouveau fichier: creative-studio-ui/src/contexts/LLMContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { LLMService, type LLMConfig } from '@/services/llmService';
import { loadConfiguration } from '@/utils/llmConfigStorage';

interface LLMContextValue {
  llmService: LLMService | null;
  llmConfig: LLMConfig | null;
  isConfigured: boolean;
  updateConfig: (config: LLMConfig) => void;
}

const LLMContext = createContext<LLMContextValue | null>(null);

export function LLMProvider({ children }: { children: React.ReactNode }) {
  const [llmService, setLlmService] = useState<LLMService | null>(null);
  const [llmConfig, setLlmConfig] = useState<LLMConfig | null>(null);

  useEffect(() => {
    async function init() {
      const config = await loadConfiguration();
      if (config) {
        setLlmConfig(config);
        const service = new LLMService(config);
        setLlmService(service);
      }
    }
    init();
  }, []);

  const updateConfig = (config: LLMConfig) => {
    setLlmConfig(config);
    const service = new LLMService(config);
    setLlmService(service);
  };

  return (
    <LLMContext.Provider value={{
      llmService,
      llmConfig,
      isConfigured: !!llmService,
      updateConfig
    }}>
      {children}
    </LLMContext.Provider>
  );
}

export function useLLM() {
  const context = useContext(LLMContext);
  if (!context) {
    throw new Error('useLLM must be used within LLMProvider');
  }
  return context;
}
```

### Bug 2: Validation de Connexion Non Effectuée

**Problème:**
Le service LLM est créé mais la connexion n'est jamais validée.

**Fichier:** `creative-studio-ui/src/services/llmService.ts`
**Méthode:** `validateConnection()`

**Solution:**
Ajouter une validation automatique après création du service:

```typescript
// Dans LandingChatBox.tsx, après création du service:
const service = new LLMService(llmConfig);
setLlmService(service);

// Valider la connexion
const validation = await service.validateConnection();
if (!validation.success || !validation.data) {
  console.error('LLM connection validation failed');
  setConnectionStatus('offline');
  // Afficher un message d'erreur à l'utilisateur
} else {
  setConnectionStatus('online');
}
```

### Bug 3: Gestion des Erreurs Silencieuse

**Problème:**
Les erreurs de configuration/connexion sont loguées mais pas affichées à l'utilisateur.

**Solution:**
Ajouter des notifications visuelles:

```typescript
// Utiliser un toast ou une notification
import { toast } from '@/components/ui/use-toast';

// En cas d'erreur de configuration
toast({
  title: "Configuration LLM invalide",
  description: "Veuillez configurer votre provider LLM dans les paramètres.",
  variant: "destructive",
});
```

## 📝 Checklist de Débogage

### Étape 1: Vérifications Basiques
- [ ] Ouvrir la console du navigateur (F12)
- [ ] Vérifier les erreurs JavaScript
- [ ] Vérifier les erreurs réseau (onglet Network)
- [ ] Vérifier localStorage: `storycore_llm_config`
- [ ] Vérifier localStorage: `storycore_api_key_enc`

### Étape 2: Vérifications de Configuration
- [ ] Ouvrir React DevTools
- [ ] Trouver le composant `LandingChatBox`
- [ ] Vérifier state `llmService` (doit être non-null)
- [ ] Vérifier state `llmConfig` (doit contenir provider, model, apiKey)
- [ ] Vérifier state `connectionStatus` (doit être 'online')
- [ ] Vérifier state `isFallbackMode` (doit être false)

### Étape 3: Test de Connexion
- [ ] Si Ollama: vérifier `http://localhost:11434/api/tags`
- [ ] Si OpenAI: vérifier l'API key est valide
- [ ] Tester manuellement un appel API

### Étape 4: Reconfiguration
- [ ] Ouvrir le dialogue de configuration LLM
- [ ] Sélectionner un provider
- [ ] Entrer les credentials
- [ ] Sauvegarder
- [ ] Vérifier que la configuration est stockée
- [ ] Recharger la page
- [ ] Tester une génération

## 🎯 Actions Immédiates Recommandées

### Action 1: Ajouter des Logs de Débogage

```typescript
// Dans LandingChatBox.tsx, après useEffect d'initialisation
console.log('=== LLM Service Debug ===');
console.log('Config loaded:', llmConfig);
console.log('Service created:', !!llmService);
console.log('Connection status:', connectionStatus);
console.log('Fallback mode:', isFallbackMode);
console.log('Provider:', providerName);
console.log('Model:', modelName);
console.log('========================');
```

### Action 2: Créer un Composant de Diagnostic

```typescript
// Nouveau fichier: creative-studio-ui/src/components/debug/LLMDiagnostic.tsx
export function LLMDiagnostic() {
  const [diagnosticInfo, setDiagnosticInfo] = useState<any>(null);

  useEffect(() => {
    async function runDiagnostic() {
      const config = await loadConfiguration();
      const hasConfig = hasStoredConfiguration();
      const cryptoAvailable = isCryptoAvailable();
      
      setDiagnosticInfo({
        hasConfig,
        cryptoAvailable,
        config: config ? {
          provider: config.provider,
          model: config.model,
          hasApiKey: !!config.apiKey,
          streaming: config.streamingEnabled
        } : null
      });
    }
    runDiagnostic();
  }, []);

  return (
    <div className="p-4 bg-gray-100 rounded">
      <h3>LLM Diagnostic</h3>
      <pre>{JSON.stringify(diagnosticInfo, null, 2)}</pre>
    </div>
  );
}
```

### Action 3: Ajouter un Bouton de Test de Connexion

```typescript
// Dans le dialogue de configuration LLM
<Button onClick={async () => {
  if (llmService) {
    const result = await llmService.validateConnection();
    if (result.success && result.data) {
      toast({ title: "Connexion réussie ✓" });
    } else {
      toast({ 
        title: "Échec de connexion", 
        description: result.error,
        variant: "destructive" 
      });
    }
  }
}}>
  Tester la Connexion
</Button>
```

## 📊 Résumé

### Causes Probables (par ordre de probabilité):

1. **Configuration LLM non initialisée** (90%)
   - Aucune configuration stockée dans localStorage
   - Première utilisation de l'application

2. **API Key manquante ou invalide** (70%)
   - Pour OpenAI/Anthropic
   - Clé expirée ou révoquée

3. **Erreur de chiffrement/déchiffrement** (40%)
   - Clé de session perdue
   - Corruption des données chiffrées

4. **Service LLM non propagé** (30%)
   - Service créé dans LandingChatBox uniquement
   - Autres composants n'y ont pas accès

5. **Ollama non démarré** (20%)
   - Si provider = 'local'
   - Service Ollama non lancé

### Solution Rapide:

**Pour tester immédiatement:**
1. Ouvrir l'application
2. Cliquer sur l'icône de configuration LLM (Settings)
3. Sélectionner "Local" comme provider
4. Modèle: "gemma3:1b"
5. Endpoint: "http://localhost:11434"
6. Sauvegarder
7. Tester une génération

**Si Ollama n'est pas installé:**
1. Sélectionner "OpenAI"
2. Entrer une API key valide
3. Modèle: "gpt-3.5-turbo" (moins cher)
4. Sauvegarder
5. Tester une génération

---

**Date:** 2026-01-20
**Statut:** Analyse complète - Actions recommandées
