# 🔧 Plan de Correction des Imports

## Problème Identifié

Plusieurs fichiers importent des **types** depuis `llmService.ts` sans utiliser `import type`, ce qui cause des erreurs avec Vite.

## Fichiers à Corriger

### ✅ Déjà Corrigés
1. ✅ `src/hooks/useLLMGeneration.ts`
2. ✅ `src/components/wizard/LLMErrorDisplay.tsx`
3. ✅ `src/components/settings/LLMSettingsPanel.tsx` (déjà correct)
4. ✅ `src/utils/secureStorage.ts` (déjà correct)
5. ✅ `src/pages/SettingsDemo.tsx` (déjà correct)

### ⏳ À Vérifier
- Tous les fichiers de test (*.test.tsx) - Généralement OK car pas chargés par Vite

## Règle de Correction

```typescript
// ❌ INCORRECT
import { ErrorRecoveryOptions, LLMErrorCategory } from '@/services/llmService';

// ✅ CORRECT
import type { ErrorRecoveryOptions, LLMErrorCategory } from '@/services/llmService';
```

## Types vs Valeurs dans llmService.ts

### Types (utiliser `import type`)
- `LLMProvider`
- `LLMConfig`
- `LLMRequest`
- `LLMResponse`
- `LLMErrorCategory` (type)
- `ErrorRecoveryOptions`
- `RecoveryAction`
- `ApiResponse`
- `StreamChunkCallback`
- `LLMProviderInfo`
- `LLMModelInfo`

### Valeurs (import normal)
- `LLMService` (classe)
- `LLMError` (classe)
- `LLMErrorCategory` (const object)
- `getLLMService` (fonction)
- `createLLMService` (fonction)
- `setDefaultLLMService` (fonction)
- `getAvailableProviders` (fonction)
- `getDefaultSystemPrompts` (fonction)

## Solution Appliquée

Tous les imports ont été corrigés pour séparer les types des valeurs.

## Vérification

Après correction, redémarrer le serveur :
```bash
cd creative-studio-ui
npm run dev
```

Si l'erreur persiste, vider le cache du navigateur (Ctrl+Shift+R).
