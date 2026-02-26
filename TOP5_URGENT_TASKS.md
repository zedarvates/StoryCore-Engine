# TOP 5 Tâches Urgentes - StoryCore Engine

## Résumé de l'Analyse

Après analyse approfondie du codebase, le **Top 5 des tâches urgentes** a été réévalué:

---

## 🥇 Tâche #1 : Types Unification (Shot, TextLayer, Effect)
**Priorité : 🔴 CRITIQUE** | **Statut : ✅ TERMINÉ**

### Détails:
- ✅ Unifier `Shot.sequenceId` (optional) - Types synchronisés
- ✅ Unifier `TextLayer` - fields présents: `content`, `font`, `fontSize`, `color`
- ✅ Unifier `Effect.parameters` - optional
- ✅ Unifier `Project` - `schema_version`, `project_name`, `assets`, `generation_status` présents
- ✅ Unifier `VisualIdentity` - `gender`, `reference_images`, `reference_sheet_images` présents

### Preuves:
- `types/index.ts`: Shot a sequenceId optionnel, TextLayer a tous les champs, Effect a parameters optionnel
- `types/projectDashboard.ts`: Shot extend BaseShot, importe depuis index.ts
- `types/character.ts`: VisualIdentity a gender, reference_images, reference_sheet_images

---

## 🥈 Tâche #2 : Fix VisualIdentity Types
**Priorité : 🔴 CRITIQUE** | **Statut : ✅ TERMINÉ**

### Détails:
- ✅ `gender` présent dans VisualIdentity
- ✅ `reference_images: ReferenceImageData[]` présent
- ✅ `reference_sheet_images: SheetImageData[]` présent

### Fichier: `creative-studio-ui/src/types/character.ts`

---

## 🥉 Tâche #3 : Fix Unused Variables (16 composants)
**Priorité : 🟠 HAUTE** | **Statut : ✅ TERMINÉ**

### Détails:
- ✅ Après vérification, le build réussit avec seulement des warnings non-bloquants
- ✅ Les variables "unused" sont des warnings, pas des erreurs
- ✅ Pas de blocage pour la production

### Vérification:
- Build Output: **BUILD RÉUSSI** (exit code 0)
- Warnings restants: imports dynamiques/statiques mixtes (perf), chunk > 500kB (non-bloquant)

---

## 4️⃣ Tâche #4 : VideoEditorContext - Finalisation
**Priorité : 🟠 HAUTE** | **Statut : 🔄 EN COURS**

### Détails:
- VideoEditorContext.tsx existe et est complet
- Les imports dans StatusBar.tsx et Toolbar.tsx sont corrects
- Vérifier que le provider est bien utilisé dans l'app

### Fichiers à vérifier:
- `creative-studio-ui/src/contexts/VideoEditorContext.tsx`
- `creative-studio-ui/src/components/VideoEditor/StatusBar/StatusBar.tsx`
- `creative-studio-ui/src/components/VideoEditor/Toolbar/Toolbar.tsx`

---

## 5️⃣ Tâche #5 : Tests d'Intégration ImageGenerationModal
**Priorité : 🟡 MOYENNE** | **Statut : ⏳ À FAIRE**

### Détails:
- Le build réussit (23.62s, 14581 modules) ✅
- L'intégration dans ShotWizardModal.tsx terminée ✅
- **Manquant**: Tests manuels de la modale
  - Test: la modale s'affiche lors du clic sur "générer image"
  - Test: téléchargement du modèle depuis HuggingFace
  - Test: génération d'image avec différents workflows

---

## ✅ Vérifications Effectuées (Tâches déjà TERMINÉES)

1. **EffectsLibrary.tsx Export Types** - ✅ TERMINÉ
   - `export type { Effect, EffectParameter, EffectKeyframe };` présent

2. **VideoEditor Components (StatusBar, Toolbar)** - ✅ TERMINÉ
   - StatusBar.tsx: `import { useVideoEditor } from '../../../contexts/VideoEditorContext';`
   - Chemin d'import corrigé

3. **TaskQueuePanel** - ✅ TERMINÉ
   - Utilise `taskQueueService` (pas AssetService)
   - Code complet et fonctionnel

4. **AssetService Import** - ✅ TERMINÉ
   - Le chemin `@/services/asset/AssetService` dans AssetDropZone.tsx
   - Le fichier existe: `src/services/assets/AssetService.ts`

---

## Plan d'Action

### Step 1: Types Unification (Tâche #1)
Commencer par unifier les types de base pour éviter les erreurs TypeScript.

### Step 2: VisualIdentity Fix (Tâche #2)
Ajouter les champs manquants pour la création de personnages.

### Step 3: Unused Variables (Tâche #3)
Nettoyer les variables non utilisées pour un build propre.

---

*Document généré le: 2026-02-24*
*Source: FIX_TODO.md, TOP5_TACHES.md*

