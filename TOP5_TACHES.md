# TODO - Top 5 Tâches Prioritaires StoryCore-Engine

## Top 5 des Tâches les Plus Importantes (NOUVELLE VERSION)

### 🥇 Tâche #1 : Fix EffectsLibrary.tsx - Export Types
**Priorité : 🔴 CRITIQUE** | **Statut : ✅ TERMINÉ**

- [x] Exporter `Effect`, `EffectParameter`, `EffectKeyframe` depuis EffectsLibrary.tsx
- [x] Débloqué: EffectControls, EffectPanel, etc.
- Référence: `FIX_TODO.md` Section 1.3

---

### 🥈 Tâche #2 : Fix VideoEditor Components
**Priorité : 🔴 CRITIQUE** | **Statut : ✅ TERMINÉ**

- [x] Fix `src/components/VideoEditor/StatusBar` — module manquant (VideoEditorContext)
- [x] Fix `src/components/VideoEditor/Toolbar` — modules manquants
- Référence: `FIX_TODO.md` Section 3.1-3.2

---

### 🥉 Tâche #3 : Fix TaskQueuePanel & AssetService
**Priorité : 🟠 HAUTE** | **Statut : ✅ TERMINÉ**

- [x] Fix `src/components/ui/TaskQueuePanel.tsx` — modules manquants
- [x] Fix imports `@/services/asset/AssetService` -> `@/services/assets/AssetService`
- Référence: `FIX_TODO.md` Section 3.3-3.4

---

### 4️⃣ Tâche #4 : Unify Types (Shot, TextLayer, Effect)
**Priorité : 🟠 HAUTE** | **Statut : ✅ TERMINÉ**

- [x] Unifier Shot.sequenceId (optional vs required) entre types/index.ts et types/projectDashboard.ts
- [x] Unifier TextLayer (fields manquants: content, font, fontSize, color) -> Ajout des schémas Zod précis
- [x] Unifier Effect.parameters (optional vs required) -> Synchronisé avec effect.ts
- [x] Unifier Project (schema_version, project_name, assets, generation_status manquants)
- Référence: `FIX_TODO.md` Section 2

---

### 5️⃣ Tâche #5 : Fix Unused Variables
**Priorité : 🟡 MOYENNE** | **Statut : 🔄 EN COURS**

- [ ] Fix unused variables dans 16 composants (AIEnhancementControls, etc.)
- [x] Nettoyage partiel dans AssetDropZone.tsx et projectDashboard.ts
- Référence: `FIX_TODO.md` Section 4.1

---

## Résumé

| # | Tâche | Statut |
|---|-------|--------|
| 1 | EffectsLibrary.tsx Export Types | ✅ TERMINÉ |
| 2 | VideoEditor Components | ✅ TERMINÉ |
| 3 | TaskQueuePanel & AssetService | ✅ TERMINÉ |
| 4 | Unify Types | ✅ TERMINÉ |
| 5 | Fix Unused Variables | 🔄 EN COURS |

*Mis à jour le: 2026-03-02*

