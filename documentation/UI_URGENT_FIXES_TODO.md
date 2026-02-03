# StoryCore-Engine - Tâches UI Urgentes Plan de Correction

**Date:** Janvier 2026  
**Priorité:** CRITIQUE - Bloquant pour la build

---

## Résumé Exécutif

Après analyse du projet, **79 erreurs TypeScript** bloquent le build. Ces erreurs doivent être corrigées en priorité.

---

## Phase 1: Corrections TypeScript (Bloquantes)

### 1.1 WizardProvider - Ajouter `onComplete` à l'interface
- **Fichier:** `src/contexts/WizardContext.tsx`
- **Erreur:** `Property 'onComplete' does not exist on type 'WizardProviderProps'`
- **Status:** ✅ `onComplete` est déjà dans l'interface (ligne 42)
- **Action:** Vérifier les tests qui utilisent cette prop

### 1.2 OllamaClient - Ajouter `num_predict`
- **Fichier:** `src/services/wizard/types.ts`
- **Erreur:** `Property 'num_predict' does not exist in type options`
- **Solution:** Ajouter `num_predict?: number` à l'interface OllamaRequest

### 1.3 PlaybackEngine Test - Casting des types
- **Fichier:** `src/playback/__tests__/PlaybackEngine.test.ts`
- **Erreur:** Type incompatibility in `transitionOut.easing`
- **Solution:** Ajouter `as const` aux valeurs

### 1.4 World Interface - Propriétés dupliquées
- **Fichier:** `src/store/index.ts` (lignes 740-747)
- **Erreur:** `createdAt` et `updatedAt` déclarés deux fois
- **Solution:** Supprimer les doublons

### 1.5 AudioTrack - Propriétés dupliquées
- **Fichier:** `src/store/index.ts` (lignes 694-710)
- **Erreur:** `duration`, `fadeIn`, `fadeOut` dupliqués
- **Solution:** Consolider les propriétés

---

## Phase 2: Corrections Fonctionnelles UI

### 2.1 World Wizard - LLM Integration
- **Emplacement:** World Wizard > Generate Rules
- **Problème:** LLM appel échoue ou résultat non traité
- **Solution:** Vérifier l'intégration LLM et le traitement des résultats

### 2.2 World Wizard - Cultural Elements
- **Emplacement:** World Wizard > Cultural Elements
- **Problème:** Même problème que Generate Rules
- **Solution:** Vérifier l'intégration LLM

### 2.3 Assets Panel
- **Emplacement:** Panneau Assets
- **Problème:** Aucun asset chargé ou problème d'affichage
- **Solution:** Vérifier le chargement et l'affichage des assets

---

## Phase 3: Menu & UX Improvements

### 3.1 Menu Reorganisation
- Ajouter "Tools Menu"
- Ajouter "Wizards Menu"
- Réorganiser "View Menu"

### 3.2 Chatbox UX
- Implémenter draggable ChatPanel
- Dashboard-context aware positioning
- Smooth animations

---

## Liste des Fichiers à Modifier

| Fichier | Erreurs | Priorité |
|---------|---------|----------|
| `src/services/wizard/types.ts` | 2 | CRITIQUE |
| `src/playback/__tests__/PlaybackEngine.test.ts` | 1 | HAUTE |
| `src/store/index.ts` | 3 | CRITIQUE |
| `src/components/wizard/character/__tests__/*.test.tsx` | 40 | CRITIQUE |
| `src/utils/memoization.ts` | 1 | MOYENNE |

---

## Commandes de Vérification

```bash
# Build TypeScript
npm run build

# Tests
npm test

# Linting
npm run lint
```

---

## Progression

- [x] Phase 1.1: OllamaClient - Ajouter `num_predict` ✅
- [x] Phase 1.2: PlaybackEngine Test - Casting des types ✅
- [x] Phase 1.3: Memoization utility - Type assertion ✅
- [x] ✅ BUILD RÉUSSI - `npm run build` complété avec succès!
- [ ] Phase 2: Corrections Fonctionnelles UI (World Wizard LLM, Assets Panel)
- [ ] Phase 3: Menu & UX Improvements

---

## Statut Final

**Build Status:** ✅ SUCCÈS  
**Date:** 25 Janvier 2026  
**Artifacts:** `creative-studio-ui/dist/` (1.4MB gzipped)

### Corrections Appliquées:
1. ✅ `OllamaClient.ts` - Ajout `num_predict` à l'interface
2. ✅ `PlaybackEngine.test.ts` - Ajout `as const` pour les types de transition
3. ✅ `memoization.ts` - Type assertion pour Promise

### Prochaines Tâches (Phase 2):
1. World Wizard - Intégration LLM (Generate Rules, Cultural Elements)
2. Assets Panel - Affichage des assets
3. Character Wizard - Validation et sauvegarde

### Améliorations UI Appliquées (Janvier 2026):
- ✅ **CanvasArea - Bouton Dashboard**: Amélioré avec un meilleur style visuel, label "Dashboard", et informations du projet (nom + nombre de shots)
- 📋 **Prochaines améliorations UI**:
  - Timeline et contrôles de lecture améliorés
  - Panel Assets avec affichage optimisé
  - ChatBox avec drag & drop
  - Wizards (World/Character) avec interface améliorée
| Fichier | Rôle |


| `src/services/llmConfigService.ts` | Configuration unifiée LLM |
| `src/services/llmService.ts` | Service LLM avec providers (OpenAI, Anthropic, Ollama) |
| `src/hooks/useLLMGeneration.ts` | Hook React pour génération LLM |
