# Correction: Wizards utilisent maintenant la configuration LLM des paramètres

## Problème identifié

Les wizards cherchaient un modèle LLM hardcodé ('gemma3:1b') au lieu d'utiliser le modèle configuré dans les paramètres de l'application. Cela causait des erreurs "model 'gemma3:1b' not found" même si l'utilisateur avait configuré un autre modèle dans les settings.

## Cause racine

Le singleton `OllamaClient` était initialisé avec des valeurs par défaut hardcodées dans le constructeur:

```typescript
constructor(
  endpoint: string = 'http://localhost:11434',
  model: string = 'gemma3:1b',  // ❌ Valeur hardcodée
  defaultOptions?: OllamaGenerationOptions
)
```

La fonction `getOllamaClient()` créait simplement une nouvelle instance sans paramètres, utilisant donc toujours les valeurs par défaut.

## Solution implémentée

### 1. Modification de `getOllamaClient()` (OllamaClient.ts)

Transformé en fonction asynchrone qui charge automatiquement la configuration depuis les settings:

```typescript
export async function getOllamaClient(): Promise<OllamaClient> {
  if (!ollamaClientInstance) {
    try {
      const { loadLLMSettings } = await import('@/utils/secureStorage');
      const llmConfig = await loadLLMSettings();
      
      if (llmConfig && llmConfig.provider === 'local') {
        // ✅ Utilise la configuration des settings
        const endpoint = llmConfig.apiEndpoint || 'http://localhost:11434';
        const model = llmConfig.model || 'gemma3:1b';
        const options = {
          temperature: llmConfig.parameters?.temperature ?? 0.7,
          top_p: llmConfig.parameters?.topP ?? 0.9,
          max_tokens: llmConfig.parameters?.maxTokens ?? 2000,
        };
        
        ollamaClientInstance = new OllamaClient(endpoint, model, options);
      } else {
        // Fallback aux valeurs par défaut si pas de config
        ollamaClientInstance = new OllamaClient();
      }
    } catch (error) {
      console.warn('[OllamaClient] Failed to load LLM settings, using defaults:', error);
      ollamaClientInstance = new OllamaClient();
    }
  }
  return ollamaClientInstance;
}
```

### 2. Ajout de fonctions de gestion

**`updateOllamaClientFromSettings()`**: Met à jour le client quand les settings changent
```typescript
export async function updateOllamaClientFromSettings(): Promise<void> {
  // Recharge la config et recrée le client
}
```

**`resetOllamaClient()`**: Force le rechargement de la configuration
```typescript
export function resetOllamaClient(): void {
  ollamaClientInstance = null;
}
```

**`getOllamaClientSync()`**: Version synchrone pour compatibilité (utilise les defaults)
```typescript
export function getOllamaClientSync(): OllamaClient {
  // Pour les cas où async n'est pas possible
}
```

### 3. Mise à jour du WizardService

Tous les appels à `getOllamaClient()` ont été mis à jour pour utiliser `await`:

```typescript
// Avant ❌
const ollama = ollamaClient || getOllamaClient();

// Après ✅
const ollama = ollamaClient || await getOllamaClient();
```

Fichiers modifiés:
- `executeCharacterWizard()`
- `executeSceneGenerator()`
- `executeStoryboardCreator()`
- `executeDialogueWriter()`
- `executeWorldBuilder()`

### 4. Intégration avec le système de propagation des settings

Ajout d'un listener dans `settingsPropagation.ts` pour mettre à jour automatiquement l'OllamaClient quand les paramètres LLM changent:

```typescript
// Dans handleLLMSettingsUpdate()
if (payload.provider === 'local') {
  const { updateOllamaClientFromSettings } = await import('./wizard/OllamaClient');
  await updateOllamaClientFromSettings();
}
```

## Flux de configuration

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Utilisateur configure LLM dans Settings                  │
│    - Provider: local (Ollama)                               │
│    - Model: llama3:8b (ou autre)                            │
│    - Endpoint: http://localhost:11434                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. saveLLMSettings() stocke la config (chiffrée)           │
│    - Sauvegarde dans localStorage                           │
│    - Émet événement LLM_SETTINGS_UPDATED                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. settingsPropagation détecte le changement               │
│    - Met à jour LLMService                                  │
│    - Appelle updateOllamaClientFromSettings()              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. OllamaClient est mis à jour                             │
│    - Nouvelle instance avec la config des settings          │
│    - Prêt pour les wizards                                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Wizard utilise getOllamaClient()                        │
│    - Charge automatiquement la config                       │
│    - Utilise le bon modèle configuré                        │
│    - ✅ Plus d'erreur "model not found"                     │
└─────────────────────────────────────────────────────────────┘
```

## Avantages de cette solution

1. **Automatique**: Les wizards utilisent toujours la configuration actuelle
2. **Réactif**: Les changements de settings sont immédiatement pris en compte
3. **Fallback sécurisé**: Si pas de config, utilise des valeurs par défaut
4. **Rétrocompatible**: Les tests existants continuent de fonctionner
5. **Type-safe**: Utilise TypeScript pour la sécurité des types

## Tests recommandés

1. **Configuration initiale**:
   - Ouvrir Settings → LLM
   - Configurer Ollama avec un modèle spécifique (ex: llama3:8b)
   - Sauvegarder

2. **Utilisation d'un wizard**:
   - Ouvrir un wizard (Character, Scene, etc.)
   - Générer du contenu
   - ✅ Vérifier que le bon modèle est utilisé (pas gemma3:1b)

3. **Changement de configuration**:
   - Changer le modèle dans Settings
   - Utiliser un wizard
   - ✅ Vérifier que le nouveau modèle est utilisé

4. **Fallback**:
   - Supprimer la configuration LLM
   - Utiliser un wizard
   - ✅ Vérifier que les valeurs par défaut sont utilisées

## Fichiers modifiés

- `creative-studio-ui/src/services/wizard/OllamaClient.ts`
- `creative-studio-ui/src/services/wizard/WizardService.ts`
- `creative-studio-ui/src/services/settingsPropagation.ts`

## Notes techniques

- La fonction `getOllamaClient()` est maintenant asynchrone
- Un import dynamique est utilisé pour éviter les dépendances circulaires
- Le singleton est réinitialisé quand les settings changent
- La configuration est chargée depuis `secureStorage` (avec déchiffrement)

## Prochaines étapes possibles

1. Ajouter un indicateur visuel du modèle utilisé dans les wizards
2. Permettre de changer temporairement de modèle pour un wizard spécifique
3. Ajouter des logs détaillés pour le debugging
4. Créer des tests unitaires pour la nouvelle logique de configuration
