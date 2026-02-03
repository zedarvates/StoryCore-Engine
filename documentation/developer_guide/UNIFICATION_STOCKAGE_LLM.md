# Unification du Stockage LLM - Problème et Solution

## 🔍 Problème Identifié

Il existe **3 systèmes de stockage LLM différents** qui ne communiquent pas entre eux :

### Système 1: LandingChatBox
**Fichier:** `creative-studio-ui/src/utils/llmConfigStorage.ts`
**Clés localStorage:**
- `storycore_llm_config` (configuration sans API key)
- `storycore_api_key_enc` (API key chiffrée)
- `storycore_language_preference` (préférence de langue)

**Utilisé par:**
- `LandingChatBox.tsx` (chatbox de la page d'accueil)

### Système 2: Settings Modal
**Fichier:** `creative-studio-ui/src/utils/secureStorage.ts`
**Clés localStorage:**
- `storycore-settings` (objet global avec `llm`, `comfyui`, etc.)

**Utilisé par:**
- `LLMSettingsModal.tsx` (modal de configuration du menu)
- `LLMSettingsPanel.tsx`

### Système 3: Settings Propagation
**Fichier:** `creative-studio-ui/src/services/settingsPropagation.ts`
**Clés localStorage:**
- `llm-config` (configuration LLM)
- `comfyui-config` (configuration ComfyUI)

**Utilisé par:**
- Service de propagation des changements
- Wizards et autres composants

## 🎯 Conséquence

Quand l'utilisateur configure le LLM dans **Settings → LLM Configuration** :
1. ✅ La configuration est sauvegardée dans `storycore-settings`
2. ❌ La chatbox ne voit pas ce changement (elle lit `storycore_llm_config`)
3. ❌ Les wizards ne voient pas ce changement (ils lisent `llm-config`)
4. ❌ Chaque composant a sa propre configuration isolée

## 💡 Solution: Unification

### Option A: Utiliser secureStorage comme source unique

**Avantages:**
- Système de chiffrement robuste
- Déjà utilisé par le menu Settings
- Support de validation et migration

**Modifications nécessaires:**

#### 1. Mettre à jour LandingChatBox

```typescript
// creative-studio-ui/src/components/launcher/LandingChatBox.tsx

// AVANT
import { loadConfiguration, saveConfiguration } from '@/utils/llmConfigStorage';

// APRÈS
import { loadLLMSettings, saveLLMSettings } from '@/utils/secureStorage';

// Dans useEffect
const config = await loadLLMSettings(); // Au lieu de loadConfiguration()
```

#### 2. Mettre à jour settingsPropagation

```typescript
// creative-studio-ui/src/services/settingsPropagation.ts

// AVANT
private loadLLMConfigFromStorage(): Partial<LLMConfig> | null {
  const stored = localStorage.getItem('llm-config');
  // ...
}

// APRÈS
import { loadLLMSettings } from '@/utils/secureStorage';

private async loadLLMConfigFromStorage(): Promise<Partial<LLMConfig> | null> {
  return await loadLLMSettings();
}
```

#### 3. Supprimer llmConfigStorage.ts

Une fois que tous les composants utilisent `secureStorage`, supprimer l'ancien système.

### Option B: Créer un service LLM unifié

**Avantages:**
- Abstraction complète du stockage
- Point d'accès unique pour tous les composants
- Facilite les tests et la maintenance

**Architecture:**

```typescript
// creative-studio-ui/src/services/llmConfigService.ts

import { loadLLMSettings, saveLLMSettings } from '@/utils/secureStorage';
import { eventEmitter, WizardEventType } from './eventEmitter';
import { LLMService, type LLMConfig } from './llmService';

class LLMConfigService {
  private static instance: LLMConfigService;
  private llmService: LLMService | null = null;
  private currentConfig: LLMConfig | null = null;
  private listeners: Set<(config: LLMConfig) => void> = new Set();

  private constructor() {
    this.initialize();
  }

  static getInstance(): LLMConfigService {
    if (!LLMConfigService.instance) {
      LLMConfigService.instance = new LLMConfigService();
    }
    return LLMConfigService.instance;
  }

  private async initialize() {
    // Charger la configuration au démarrage
    const config = await loadLLMSettings();
    if (config) {
      await this.updateConfig(config);
    }

    // Écouter les changements
    eventEmitter.on(WizardEventType.LLM_SETTINGS_UPDATED, async (payload) => {
      const config = await loadLLMSettings();
      if (config) {
        await this.updateConfig(config);
      }
    });
  }

  async updateConfig(config: LLMConfig) {
    this.currentConfig = config;
    
    // Créer ou mettre à jour le service LLM
    if (!this.llmService) {
      this.llmService = new LLMService(config);
    } else {
      this.llmService.updateConfig(config);
    }

    // Sauvegarder
    await saveLLMSettings(config);

    // Notifier tous les listeners
    this.notifyListeners(config);

    // Émettre l'événement
    eventEmitter.emit(WizardEventType.LLM_SETTINGS_UPDATED, {
      provider: config.provider,
      model: config.model,
      previousProvider: this.currentConfig?.provider,
      previousModel: this.currentConfig?.model,
    });
  }

  getConfig(): LLMConfig | null {
    return this.currentConfig;
  }

  getService(): LLMService | null {
    return this.llmService;
  }

  subscribe(listener: (config: LLMConfig) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(config: LLMConfig) {
    this.listeners.forEach(listener => {
      try {
        listener(config);
      } catch (error) {
        console.error('Error in LLM config listener:', error);
      }
    });
  }
}

export const llmConfigService = LLMConfigService.getInstance();

// Hook React
export function useLLMConfig() {
  const [config, setConfig] = React.useState<LLMConfig | null>(
    llmConfigService.getConfig()
  );

  React.useEffect(() => {
    return llmConfigService.subscribe(setConfig);
  }, []);

  return {
    config,
    service: llmConfigService.getService(),
    updateConfig: (config: LLMConfig) => llmConfigService.updateConfig(config),
  };
}
```

**Utilisation dans les composants:**

```typescript
// Dans LandingChatBox
import { useLLMConfig } from '@/services/llmConfigService';

function LandingChatBox() {
  const { config, service, updateConfig } = useLLMConfig();

  // Plus besoin de gérer le stockage manuellement
  // Le service s'en charge automatiquement
}

// Dans LLMSettingsModal
import { llmConfigService } from '@/services/llmConfigService';

async function handleSave(config: LLMConfig) {
  await llmConfigService.updateConfig(config);
  onClose();
}

// Dans les Wizards
import { useLLMConfig } from '@/services/llmConfigService';

function MyWizard() {
  const { service } = useLLMConfig();
  
  // Utiliser le service directement
  if (service) {
    const response = await service.generateCompletion({...});
  }
}
```

## 🚀 Plan d'Implémentation

### Phase 1: Audit (1h)
- [x] Identifier tous les endroits utilisant `llmConfigStorage`
- [x] Identifier tous les endroits utilisant `secureStorage`
- [x] Identifier tous les endroits utilisant `settingsPropagation`
- [ ] Lister tous les composants affectés

### Phase 2: Migration (2-3h)
- [ ] Créer `llmConfigService.ts` (Option B)
- [ ] Migrer `LandingChatBox` vers le nouveau service
- [ ] Migrer `LLMSettingsModal` vers le nouveau service
- [ ] Migrer `settingsPropagation` vers le nouveau service
- [ ] Migrer tous les wizards vers le nouveau service

### Phase 3: Nettoyage (1h)
- [ ] Supprimer `llmConfigStorage.ts`
- [ ] Nettoyer les anciennes clés localStorage
- [ ] Mettre à jour la documentation
- [ ] Tester tous les flux

### Phase 4: Migration des données (30min)
- [ ] Créer un script de migration
- [ ] Détecter l'ancienne configuration au démarrage
- [ ] Migrer automatiquement vers le nouveau système
- [ ] Afficher un message de confirmation

## 📝 Script de Migration

```typescript
// creative-studio-ui/src/utils/migrateL LMConfig.ts

import { loadLLMSettings, saveLLMSettings } from './secureStorage';
import type { LLMConfig } from '@/services/llmService';

export async function migrateLLMConfig(): Promise<boolean> {
  try {
    // Vérifier si une migration est nécessaire
    const newConfig = await loadLLMSettings();
    if (newConfig) {
      console.log('LLM config already migrated');
      return false;
    }

    // Chercher l'ancienne configuration (système 1)
    const oldConfig1 = localStorage.getItem('storycore_llm_config');
    const oldApiKey1 = localStorage.getItem('storycore_api_key_enc');

    // Chercher l'ancienne configuration (système 3)
    const oldConfig3 = localStorage.getItem('llm-config');

    let configToMigrate: Partial<LLMConfig> | null = null;

    // Priorité au système 1 (plus récent)
    if (oldConfig1) {
      const parsed = JSON.parse(oldConfig1);
      configToMigrate = {
        provider: parsed.provider,
        model: parsed.model,
        apiKey: '', // Sera déchiffré séparément
        parameters: {
          temperature: parsed.temperature,
          maxTokens: parsed.maxTokens,
          topP: 1,
          frequencyPenalty: 0,
          presencePenalty: 0,
        },
        systemPrompts: {
          worldGeneration: '',
          characterGeneration: '',
          dialogueGeneration: '',
        },
        timeout: 30000,
        retryAttempts: 3,
        streamingEnabled: parsed.streamingEnabled,
      };

      // Déchiffrer l'API key si présente
      if (oldApiKey1) {
        try {
          // Utiliser la fonction de déchiffrement de llmConfigStorage
          const { decryptAPIKey } = await import('./llmConfigStorage');
          configToMigrate.apiKey = await decryptAPIKey(oldApiKey1);
        } catch (error) {
          console.error('Failed to decrypt API key:', error);
        }
      }
    } else if (oldConfig3) {
      configToMigrate = JSON.parse(oldConfig3);
    }

    // Sauvegarder dans le nouveau système
    if (configToMigrate) {
      await saveLLMSettings(configToMigrate as LLMConfig);
      
      // Nettoyer les anciennes clés
      localStorage.removeItem('storycore_llm_config');
      localStorage.removeItem('storycore_api_key_enc');
      localStorage.removeItem('llm-config');
      
      console.log('LLM config migrated successfully');
      return true;
    }

    return false;
  } catch (error) {
    console.error('Failed to migrate LLM config:', error);
    return false;
  }
}

// Appeler au démarrage de l'application
export async function initializeLLMConfig() {
  const migrated = await migrateLLMConfig();
  
  if (migrated) {
    // Afficher une notification à l'utilisateur
    console.log('✅ Your LLM configuration has been migrated to the new system');
  }
}
```

**Appel dans App.tsx:**

```typescript
import { initializeLLMConfig } from '@/utils/migrateLLMConfig';

function App() {
  useEffect(() => {
    initializeLLMConfig();
  }, []);
  
  // ...
}
```

## 🎯 Résultat Attendu

Après l'unification :

1. ✅ **Une seule source de vérité** : `storycore-settings` dans localStorage
2. ✅ **Un seul point d'accès** : `llmConfigService` ou `secureStorage`
3. ✅ **Synchronisation automatique** : Tous les composants voient les mêmes données
4. ✅ **Migration transparente** : Les anciennes configurations sont migrées automatiquement
5. ✅ **Propagation des changements** : Tous les composants sont notifiés des mises à jour

## 📊 Comparaison Avant/Après

### Avant (Problème actuel)

```
User configure LLM dans Settings
         ↓
   storycore-settings ✅
         ↓
   LandingChatBox lit storycore_llm_config ❌ (vide)
         ↓
   Wizards lisent llm-config ❌ (vide)
         ↓
   Rien ne fonctionne 😞
```

### Après (Solution)

```
User configure LLM dans Settings
         ↓
   llmConfigService.updateConfig()
         ↓
   ├─> storycore-settings (sauvegarde)
   ├─> LLMService (mise à jour)
   ├─> Event emitter (notification)
   └─> Tous les listeners (propagation)
         ↓
   ├─> LandingChatBox ✅
   ├─> Wizards ✅
   ├─> Assistants IA ✅
   └─> Tous les composants ✅
         ↓
   Tout fonctionne 🎉
```

## 🔧 Actions Immédiates

### Solution Rapide (30 minutes)

Modifier `LandingChatBox` pour utiliser `secureStorage` :

```typescript
// creative-studio-ui/src/components/launcher/LandingChatBox.tsx

// Remplacer les imports
import { loadLLMSettings, saveLLMSettings } from '@/utils/secureStorage';

// Dans useEffect d'initialisation
const loadedConfig = await loadLLMSettings(); // Au lieu de loadConfiguration()

// Dans la fonction de sauvegarde
await saveLLMSettings(config); // Au lieu de saveConfiguration()
```

### Solution Complète (3-4 heures)

Implémenter `llmConfigService.ts` et migrer tous les composants.

---

**Date:** 2026-01-20  
**Priorité:** CRITIQUE  
**Impact:** Tous les composants LLM  
**Effort:** 3-4 heures pour la solution complète
