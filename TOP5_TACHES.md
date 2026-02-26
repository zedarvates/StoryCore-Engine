# TODO - Top 5 Tâches Prioritaires StoryCore-Engine

## Top 5 des Tâches les Plus Importantes (NOUVELLE VERSION)

### 🥇 Tâche #1 : Fix EffectsLibrary.tsx - Export Types
**Priorité : 🔴 CRITIQUE** | **Statut : ⏳ À FAIRE**
- [ ] Exporter `Effect`, `EffectParameter`, `EffectKeyframe` depuis EffectsLibrary.tsx
- [ ] Bloque: EffectControls, EffectPanel, etc.
- Référence: `FIX_TODO.md` Section 1.3

---

### 🥈 Tâche #2 : Fix VideoEditor Components
**Priorité : 🔴 CRITIQUE** | **Statut : ⏳ À FAIRE**
- [ ] Fix `src/components/VideoEditor/StatusBar` — module manquant (VideoEditorContext)
- [ ] Fix `src/components/VideoEditor/Toolbar` — modules manquants
- Référence: `FIX_TODO.md` Section 3.1-3.2

---

### 🥉 Tâche #3 : Fix TaskQueuePanel & AssetService
**Priorité : 🟠 HAUTE** | **Statut : ⏳ À FAIRE**
- [ ] Fix `src/components/ui/TaskQueuePanel.tsx` — modules manquants
- [ ] Fix imports `@/services/asset/AssetService`
- Référence: `FIX_TODO.md` Section 3.3-3.4

---

### 4️⃣ Tâche #4 : Unify Types (Shot, TextLayer, Effect)
**Priorité : 🟠 HAUTE** | **Statut : ⏳ À FAIRE**
- [ ] Unifier Shot.sequenceId (optional vs required) entre types/index.ts et types/projectDashboard.ts
- [ ] Unifier TextLayer (fields manquants: content, font, fontSize, color)
- [ ] Unifier Effect.parameters (optional vs required)
- [ ] Unifier Project (schema_version, project_name, assets, generation_status manquants)
- Référence: `FIX_TODO.md` Section 2

---

### 5️⃣ Tâche #5 : Fix Unused Variables
**Priorité : 🟡 MOYENNE** | **Statut : ⏳ À FAIRE**
- [ ] Fix unused variables dans 16 composants (AIEnhancementControls, etc.)
- Référence: `FIX_TODO.md` Section 4.1

---

## Résumé

| # | Tâche | Statut |
|---|-------|--------|
| 1 | EffectsLibrary.tsx Export Types | ⏳ À FAIRE |
| 2 | VideoEditor Components | ⏳ À FAIRE |
| 3 | TaskQueuePanel & AssetService | ⏳ À FAIRE |
| 4 | Unify Types | ⏳ À FAIRE |
| 5 | Fix Unused Variables | ⏳ À FAIRE |

*Mis à jour le: 2026-02-24*

