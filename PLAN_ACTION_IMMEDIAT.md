# 🚀 Plan d'Action Immédiat — StoryCore-Engine

> **Date :** 2026-02-24 · **Statut :** PRIORITAIRE 🔴

Ce document définit les étapes concrètes et immédiates pour stabiliser le projet, unifier le code et finaliser l'intégration des moteurs IA de production (ComfyUI & Intent Engine).

---

## 🏗️ 1. Architecture & Robustesse Backend

L'objectif est de sortir de la "simulation" pour passer à une exécution réelle et robuste.

### 1.1 Unification du Système de Queue
- [ ] **Connecter `AsyncTaskQueue` à `task_queue_api.py`** : Arrêter la manipulation directe des fichiers JSON. Utiliser le moteur de queue qui gère déjà le circuit-breaker, le rate-limiting et les priorités.
- [ ] **Fix `cache.pop()` dans `storage.py`** : Corriger l'AttributeError latent dans la méthode `delete()` de `JSONFileStorage`.

### 1.2 Intégration Réelle ComfyUI
- [ ] **Connecter `ComfyUIImageEngine` à `sequence_api.py`** : Remplacer les `asyncio.sleep()` simulant la génération par de vrais appels au moteur ComfyUI.
- [ ] **Détection VRAM dynamique** : Remplacer la valeur hardcodée de 8GB dans `comfyui_integration_manager.py` par une détection réelle via `torch` ou `nvidia-smi`.

### 1.3 Stabilisation des Tests
- [ ] **Fix `test_audio_remix_api.py`** : Résoudre les problèmes d'imports qui empêchent le test de s'exécuter correctement.

---

## 🎨 2. Frontend & Cohérence Typescript

L'objectif est d'éliminer les erreurs bloquantes qui polluent le dashboard et les outils d'édition.

### 2.1 Correction des Exports & Contextes
- [ ] **Export Types `EffectsLibrary.tsx`** : Exporter `Effect`, `EffectParameter` et `EffectKeyframe` pour débloquer `EffectControls` et `EffectPanel`.
- [ ] **Fix VideoEditor Context** : Restaurer ou créer le `VideoEditorContext` manquant pour `StatusBar` et `Toolbar`.

### 2.2 Unification des Types de Données
- [ ] **Synchroniser les types `Shot`, `TextLayer`, `Effect` et `Project`** : Assurer une cohérence parfaite entre `types/index.ts` (base) et `types/projectDashboard.ts` (Zod + UI).

### 2.3 Import Cleanup
- [ ] **Fix imports `@/services/asset/AssetService`** dans les composants UI.
- [ ] **Supprimer les variables inutilisées** dans les 16 composants identifiés lors du dernier scan.

---

## 🤖 3. Intelligence & Intent Engine

Finaliser le "cerveau" de l'application.

- [ ] **Validation de l'Intent Engine** : Vérifier que le dispatcher d'actions est correctement branché sur les nouvelles commandes vocales et textuelles.
- [ ] **Optimisation des Prompts LLM** : Supprimer le double bloc `keyObjects` identifié dans `storyGenerationService.ts`.

---

## 📊 4. Matrice d'Exécution (48h)

| Tâche | Priorité | Risque | Impact |
|-------|----------|--------|--------|
| **Queue Bridge (Backend)** | 🔴 CRITIQUE | Moyen | Très Élevé (Stabilité) |
| **Real Generation Integration** | 🔴 CRITIQUE | Élevé | Très Élevé (Fonctionnel) |
| **EffectsLibrary Exports** | 🟠 HAUTE | Faible | Élevé (UI/DX) |
| **VideoEditor Context Fix** | 🟠 HAUTE | Moyen | Élevé (Productivité) |
| **VRAM Detection** | 🟡 MOYENNE | Faible | Moyen (Perf/Scalabilité) |

---

## ✅ Prochaine Étape Immédiate
> **Action 1 :** Commencer par le bridge `AsyncTaskQueue` ↔ `task_queue_api.py` pour sécuriser le pipeline de traitement.
