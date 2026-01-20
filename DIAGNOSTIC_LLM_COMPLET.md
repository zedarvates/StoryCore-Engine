# Diagnostic Complet - Problème LLM Non Connecté

## 📋 Table des Matières

1. [Résumé Exécutif](#résumé-exécutif)
2. [Analyse Technique](#analyse-technique)
3. [Solutions Rapides](#solutions-rapides)
4. [Outils de Diagnostic](#outils-de-diagnostic)
5. [Guide de Résolution](#guide-de-résolution)
6. [Prévention Future](#prévention-future)

---

## Résumé Exécutif

### Problème Identifié

Les fonctionnalités LLM (chatbox, assistants IA, génération automatique) ne fonctionnent pas car le service LLM n'est pas correctement initialisé ou configuré.

### Impact

- ❌ Chatbox non fonctionnelle
- ❌ Assistants IA désactivés
- ❌ Génération automatique impossible
- ❌ Wizards sans suggestions IA

### Causes Principales (par ordre de probabilité)

1. **Configuration LLM manquante** (90%)
2. **API Key absente ou invalide** (70%)
3. **Erreur de chiffrement** (40%)
4. **Ollama non démarré** (20% si provider = local)
5. **Service non propagé aux composants** (30%)

### Solution Rapide (5 minutes)

**Option A: Ollama (Gratuit)**
```bash
# 1. Installer Ollama
# https://ollama.ai

# 2. Démarrer
ollama serve

# 3. Télécharger un modèle
ollama pull gemma3:1b

# 4. Configurer dans l'app
# Settings → Provider: Local, Model: gemma3:1b
```

**Option B: OpenAI (Payant)**
```
1. Obtenir API key: https://platform.openai.com/api-keys
2. Settings → Provider: OpenAI, Model: gpt-3.5-turbo
3. Entrer l'API key
```

---

## Analyse Technique

### Architecture du Service LLM

```
┌─────────────────────────────────────────────────────────────┐
│                    Application React                        │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         LandingChatBox Component                     │  │
│  │                                                      │  │
│  │  ┌────────────────────────────────────────────┐     │  │
│  │  │  LLMService Instance                       │     │  │
│  │  │  - Provider: openai/anthropic/local       │     │  │
│  │  │  - Config: model, apiKey, parameters      │     │  │
│  │  │  - Methods: generateCompletion()          │     │  │
│  │  └────────────────────────────────────────────┘     │  │
│  │                                                      │  │
│  │  State:                                              │  │
│  │  - llmService: LLMService | null                     │  │
│  │  - llmConfig: LLMConfig                              │  │
│  │  - connectionStatus: 'online' | 'offline' | ...      │  │
│  │  - isFallbackMode: boolean                           │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         LocalStorage                                 │  │
│  │  - storycore_llm_config (config sans API key)       │  │
│  │  - storycore_api_key_enc (API key chiffrée)         │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         SessionStorage                               │  │
│  │  - storycore_encryption_key (clé de chiffrement)    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    LLM Providers                            │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   OpenAI     │  │  Anthropic   │  │    Ollama    │     │
│  │ api.openai   │  │ api.anthropic│  │ localhost:   │     │
│  │    .com      │  │    .com      │  │    11434     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### Flux d'Initialisation

```
1. Page Load
   │
   ├─> useEffect: initializeConfiguration()
   │   │
   │   ├─> autoMigrate() (migration Ollama si nécessaire)
   │   │
   │   ├─> loadConfiguration() (depuis localStorage)
   │   │   │
   │   │   ├─> Déchiffrer API key
   │   │   └─> Retourner LLMConfig
   │   │
   │   ├─> checkOllamaStatus()
   │   │
   │   └─> setLlmConfig(config)
   │
   └─> useEffect: Initialize LLM Service
       │
       ├─> Vérifier si API key requise
       │   │
       │   ├─> Si manquante → Mode fallback
       │   └─> Si présente → Continuer
       │
       ├─> new LLMService(llmConfig)
       │
       └─> setLlmService(service)
```

### Points de Défaillance

#### 1. Configuration Non Chargée

**Fichier:** `creative-studio-ui/src/utils/llmConfigStorage.ts`

```typescript
export async function loadConfiguration(): Promise<ChatboxLLMConfig | null> {
  try {
    const configJson = localStorage.getItem(STORAGE_KEYS.LLM_CONFIG);
    const encryptedApiKey = localStorage.getItem(STORAGE_KEYS.API_KEY_ENCRYPTED);

    if (!configJson) {
      return null; // ❌ Aucune configuration
    }

    const storedConfig: StoredLLMConfig = JSON.parse(configJson);
    const apiKey = encryptedApiKey ? await decryptAPIKey(encryptedApiKey) : '';

    return {
      provider: storedConfig.provider,
      model: storedConfig.model,
      temperature: storedConfig.temperature,
      maxTokens: storedConfig.maxTokens,
      apiKey, // ❌ Peut être vide
      streamingEnabled: storedConfig.streamingEnabled,
    };
  } catch (error) {
    console.error('Failed to load LLM configuration:', error);
    return null; // ❌ Erreur de chargement
  }
}
```

#### 2. Service Non Instancié

**Fichier:** `creative-studio-ui/src/components/launcher/LandingChatBox.tsx`

```typescript
useEffect(() => {
  const requiresApiKey = llmConfig.provider === 'openai' || llmConfig.provider === 'anthropic';
  
  if (requiresApiKey && !llmConfig.apiKey) {
    setLlmService(null); // ❌ Service non créé
    setConnectionStatus('fallback');
    setIsFallbackMode(true);
    return;
  }

  const service = new LLMService(llmConfig);
  setLlmService(service); // ✓ Service créé
  
  setConnectionStatus('online');
  setIsFallbackMode(false);
}, [llmConfig]);
```

#### 3. Erreur de Chiffrement

**Fichier:** `creative-studio-ui/src/utils/llmConfigStorage.ts`

```typescript
export async function decryptAPIKey(encryptedData: string): Promise<string> {
  if (!encryptedData) {
    return '';
  }

  try {
    const key = await getEncryptionKey(); // ❌ Peut échouer si clé perdue
    
    const [encryptedBase64, ivBase64] = encryptedData.split(':');
    if (!encryptedBase64 || !ivBase64) {
      throw new Error('Invalid encrypted data format'); // ❌ Format invalide
    }

    // Déchiffrement...
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('API key decryption failed:', error);
    throw new Error('Failed to decrypt API key'); // ❌ Échec du déchiffrement
  }
}
```

### Dépendances Critiques

```
LLMService
  ├─> LLMConfig (configuration)
  │   ├─> provider (openai/anthropic/local/custom)
  │   ├─> model (nom du modèle)
  │   ├─> apiKey (clé API chiffrée)
  │   └─> parameters (température, tokens, etc.)
  │
  ├─> LLMProviderBase (classe abstraite)
  │   ├─> OpenAIProvider
  │   ├─> AnthropicProvider
  │   └─> CustomProvider (Ollama)
  │
  └─> Web Crypto API (pour chiffrement)
      └─> sessionStorage (clé de chiffrement)
```

---

## Solutions Rapides

### Solution 1: Configuration Initiale (Ollama)

**Temps:** 5-10 minutes  
**Coût:** Gratuit  
**Difficulté:** Facile

```bash
# Étape 1: Installer Ollama
# Windows: Télécharger depuis https://ollama.ai
# macOS: brew install ollama
# Linux: curl -fsSL https://ollama.ai/install.sh | sh

# Étape 2: Démarrer Ollama
ollama serve

# Étape 3: Télécharger un modèle (dans un nouveau terminal)
ollama pull gemma3:1b

# Étape 4: Vérifier l'installation
curl http://localhost:11434/api/tags

# Étape 5: Configurer dans l'application
# Ouvrir Settings → LLM Configuration
# - Provider: Local
# - Model: gemma3:1b
# - Endpoint: http://localhost:11434
# - Streaming: Activé
# Cliquer sur "Save"

# Étape 6: Tester
# Ouvrir la chatbox et envoyer un message
```

### Solution 2: Configuration Initiale (OpenAI)

**Temps:** 2-3 minutes  
**Coût:** Payant (à partir de $0.001/1K tokens)  
**Difficulté:** Très facile

```
Étape 1: Obtenir une API key
  → https://platform.openai.com/api-keys
  → Cliquer sur "Create new secret key"
  → Copier la clé (sk-...)

Étape 2: Configurer dans l'application
  → Ouvrir Settings → LLM Configuration
  → Provider: OpenAI
  → Model: gpt-3.5-turbo (économique) ou gpt-4
  → API Key: Coller la clé
  → Streaming: Activé
  → Cliquer sur "Save"

Étape 3: Tester
  → Ouvrir la chatbox
  → Envoyer un message
  → Vérifier la réponse
```

### Solution 3: Réinitialisation Complète

**Temps:** 1 minute  
**Utilisation:** Configuration corrompue

```javascript
// Ouvrir la console du navigateur (F12)

// Supprimer toute la configuration
localStorage.removeItem('storycore_llm_config');
localStorage.removeItem('storycore_api_key_enc');
sessionStorage.removeItem('storycore_encryption_key');

// Recharger la page
location.reload();

// Reconfigurer (voir Solution 1 ou 2)
```

### Solution 4: Diagnostic Automatique

**Temps:** 30 secondes  
**Utilisation:** Identifier le problème

```javascript
// Ouvrir la console du navigateur (F12)

// Importer et exécuter le diagnostic
import { runLLMDiagnostic, printDiagnostic } from './src/utils/llmDiagnostic';
const result = await runLLMDiagnostic();
printDiagnostic(result);

// Suivre les recommandations affichées
```

---

## Outils de Diagnostic

### 1. Panneau de Diagnostic Visuel

**Fichier:** `creative-studio-ui/src/components/debug/LLMDiagnosticPanel.tsx`

**Utilisation:**

```typescript
import { LLMDiagnosticPanel } from '@/components/debug/LLMDiagnosticPanel';

function MyComponent() {
  const [showDiagnostic, setShowDiagnostic] = useState(false);

  return (
    <>
      <Button onClick={() => setShowDiagnostic(true)}>
        🔍 Diagnostic LLM
      </Button>

      {showDiagnostic && (
        <LLMDiagnosticPanel 
          onClose={() => setShowDiagnostic(false)}
          onOpenSettings={() => {
            setShowDiagnostic(false);
            // Ouvrir le dialogue de configuration
          }}
        />
      )}
    </>
  );
}
```

**Fonctionnalités:**
- ✓ Tests automatiques (storage, crypto, connectivity, etc.)
- ✓ Affichage visuel des résultats
- ✓ Recommandations personnalisées
- ✓ Export des résultats en JSON
- ✓ Copie dans le presse-papiers

### 2. Badge de Statut

**Fichier:** `creative-studio-ui/src/components/debug/LLMDiagnosticPanel.tsx`

**Utilisation:**

```typescript
import { LLMDiagnosticBadge } from '@/components/debug/LLMDiagnosticPanel';

function NavigationBar() {
  return (
    <nav>
      {/* ... autres éléments ... */}
      <LLMDiagnosticBadge onClick={() => setShowDiagnostic(true)} />
    </nav>
  );
}
```

**Affichage:**
- 🟢 LLM Healthy (tout fonctionne)
- 🟡 LLM Warning (problèmes mineurs)
- 🔴 LLM Error (problèmes critiques)
- 🔵 Checking... (diagnostic en cours)

### 3. Utilitaire de Diagnostic

**Fichier:** `creative-studio-ui/src/utils/llmDiagnostic.ts`

**Fonctions disponibles:**

```typescript
// Diagnostic complet
const result = await runLLMDiagnostic();
// Retourne: DiagnosticResult avec tous les tests

// Afficher dans la console
printDiagnostic(result);

// Vérification rapide
const isHealthy = await isLLMHealthy();
// Retourne: boolean

// Message de statut
const message = await getLLMStatusMessage();
// Retourne: string (message formaté)
```

### 4. Page de Test HTML

**Fichier:** `test-llm-connection.html`

**Utilisation:**
```bash
# Ouvrir dans un navigateur
open test-llm-connection.html

# Ou avec un serveur local
python -m http.server 8080
# Puis ouvrir: http://localhost:8080/test-llm-connection.html
```

**Tests effectués:**
1. LocalStorage (disponibilité et contenu)
2. Web Crypto API (chiffrement)
3. Ollama (connexion locale)
4. OpenAI API (si configurée)
5. Validité de la configuration

---

## Guide de Résolution

### Scénario 1: Première Installation

**Symptômes:**
- Aucune configuration LLM
- Boutons IA désactivés
- Message "Configure LLM settings"

**Diagnostic:**
```javascript
localStorage.getItem('storycore_llm_config') === null
```

**Solution:**
1. Choisir un provider (Ollama recommandé pour débuter)
2. Suivre Solution 1 ou Solution 2 ci-dessus
3. Tester la chatbox

### Scénario 2: Configuration Corrompue

**Symptômes:**
- Erreurs de déchiffrement
- Configuration existe mais ne fonctionne pas
- Erreurs "Failed to decrypt"

**Diagnostic:**
```javascript
// Configuration existe
localStorage.getItem('storycore_llm_config') !== null

// Mais erreur au chargement
await loadConfiguration() === null
```

**Solution:**
1. Suivre Solution 3 (Réinitialisation)
2. Reconfigurer le LLM

### Scénario 3: Ollama Non Connecté

**Symptômes:**
- Provider = Local
- Erreur "Failed to connect"
- Timeout errors

**Diagnostic:**
```bash
curl http://localhost:11434/api/tags
# Erreur: Connection refused
```

**Solution:**
```bash
# Démarrer Ollama
ollama serve

# Vérifier
curl http://localhost:11434/api/tags

# Si aucun modèle
ollama pull gemma3:1b
```

### Scénario 4: API Key Invalide

**Symptômes:**
- Provider = OpenAI/Anthropic
- Erreur "Authentication failed"
- Status 401

**Diagnostic:**
```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer YOUR_API_KEY"
# Erreur: 401 Unauthorized
```

**Solution:**
1. Vérifier l'API key sur le dashboard du provider
2. Vérifier les crédits disponibles
3. Générer une nouvelle clé si nécessaire
4. Mettre à jour dans Settings

### Scénario 5: Service Non Propagé

**Symptômes:**
- LandingChatBox fonctionne
- Wizards/Assistants ne fonctionnent pas
- Service LLM non accessible dans d'autres composants

**Diagnostic:**
```typescript
// Dans LandingChatBox
llmService !== null // ✓

// Dans GenericWizardModal
llmService === undefined // ✗
```

**Solution:**
Créer un contexte React global (voir section Prévention Future)

---

## Prévention Future

### 1. Créer un Contexte LLM Global

**Fichier:** `creative-studio-ui/src/contexts/LLMContext.tsx`

```typescript
import React, { createContext, useContext, useState, useEffect } from 'react';
import { LLMService, type LLMConfig } from '@/services/llmService';
import { loadConfiguration, saveConfiguration } from '@/utils/llmConfigStorage';

interface LLMContextValue {
  llmService: LLMService | null;
  llmConfig: LLMConfig | null;
  isConfigured: boolean;
  isConnected: boolean;
  updateConfig: (config: LLMConfig) => Promise<void>;
  testConnection: () => Promise<boolean>;
}

const LLMContext = createContext<LLMContextValue | null>(null);

export function LLMProvider({ children }: { children: React.ReactNode }) {
  const [llmService, setLlmService] = useState<LLMService | null>(null);
  const [llmConfig, setLlmConfig] = useState<LLMConfig | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Initialisation au montage
  useEffect(() => {
    async function init() {
      const config = await loadConfiguration();
      if (config) {
        await updateConfig(config);
      }
    }
    init();
  }, []);

  const updateConfig = async (config: LLMConfig) => {
    setLlmConfig(config);
    
    // Créer le service
    const service = new LLMService(config);
    setLlmService(service);
    
    // Tester la connexion
    const connected = await testConnection();
    setIsConnected(connected);
    
    // Sauvegarder
    await saveConfiguration(config);
  };

  const testConnection = async (): Promise<boolean> => {
    if (!llmService) return false;
    
    const result = await llmService.validateConnection();
    const connected = result.success && result.data === true;
    setIsConnected(connected);
    return connected;
  };

  return (
    <LLMContext.Provider value={{
      llmService,
      llmConfig,
      isConfigured: !!llmService,
      isConnected,
      updateConfig,
      testConnection
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

**Utilisation:**

```typescript
// Dans App.tsx
import { LLMProvider } from '@/contexts/LLMContext';

function App() {
  return (
    <LLMProvider>
      {/* Votre application */}
    </LLMProvider>
  );
}

// Dans n'importe quel composant
import { useLLM } from '@/contexts/LLMContext';

function MyComponent() {
  const { llmService, isConfigured, isConnected } = useLLM();

  if (!isConfigured) {
    return <div>Please configure LLM</div>;
  }

  if (!isConnected) {
    return <div>LLM is not connected</div>;
  }

  // Utiliser llmService...
}
```

### 2. Ajouter une Validation Automatique

**Fichier:** `creative-studio-ui/src/hooks/useLLMValidation.ts`

```typescript
import { useEffect, useState } from 'react';
import { useLLM } from '@/contexts/LLMContext';

export function useLLMValidation(interval: number = 60000) {
  const { llmService, testConnection } = useLLM();
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  useEffect(() => {
    if (!llmService) return;

    // Test initial
    testConnection().then(() => setLastCheck(new Date()));

    // Test périodique
    const timer = setInterval(async () => {
      await testConnection();
      setLastCheck(new Date());
    }, interval);

    return () => clearInterval(timer);
  }, [llmService, interval]);

  return { lastCheck };
}
```

### 3. Améliorer les Messages d'Erreur

**Fichier:** `creative-studio-ui/src/components/LLMErrorBoundary.tsx`

```typescript
import React, { Component, ReactNode } from 'react';
import { LLMError } from '@/services/llmService';

interface Props {
  children: ReactNode;
  fallback?: (error: Error) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class LLMErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('LLM Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error);
      }

      const llmError = this.state.error instanceof LLMError 
        ? this.state.error 
        : new LLMError(this.state.error.message, 'unknown');

      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded">
          <h3 className="font-bold text-red-800">LLM Error</h3>
          <p className="text-red-600">{llmError.getUserMessage()}</p>
          <ul className="mt-2 text-sm text-red-700">
            {llmError.getSuggestedActions().map((action, i) => (
              <li key={i}>• {action}</li>
            ))}
          </ul>
        </div>
      );
    }

    return this.props.children;
  }
}
```

---

## Fichiers de Documentation

### Fichiers Créés

1. **ANALYSE_PROBLEME_LLM.md**
   - Analyse technique complète
   - Causes détaillées
   - Solutions par bug

2. **GUIDE_RESOLUTION_RAPIDE_LLM.md**
   - Guide pas-à-pas
   - Solutions par scénario
   - Commandes de debug

3. **RESUME_PROBLEME_LLM.txt**
   - Résumé visuel ASCII
   - Checklist rapide
   - Actions immédiates

4. **DIAGNOSTIC_LLM_COMPLET.md** (ce fichier)
   - Documentation complète
   - Architecture technique
   - Prévention future

5. **creative-studio-ui/src/utils/llmDiagnostic.ts**
   - Utilitaire de diagnostic
   - Tests automatiques
   - Fonctions d'aide

6. **creative-studio-ui/src/components/debug/LLMDiagnosticPanel.tsx**
   - Composant de diagnostic visuel
   - Badge de statut
   - Interface utilisateur

7. **test-llm-connection.html**
   - Page de test standalone
   - Tests interactifs
   - Export de résultats

---

**Date:** 2026-01-20  
**Version:** 1.0  
**Auteur:** Kiro AI Assistant  
**Statut:** Complet et prêt à l'utilisation
