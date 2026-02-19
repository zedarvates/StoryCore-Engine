# TypeScript Build Fix Plan

## Tasks

### Phase 1: Fix Critical Import/Dependency Issues ✅ PARTIELLEMENT COMPLÉTÉ

- [x] 1.1 configurationStore.ts (creative-studio-ui/src/services) — Corrigé les erreurs `unknown` type
  - Typé `server: { apiKey?: string }` dans forEach encrypt/decrypt
  - Utilisé `config as Partial<ProjectConfiguration>` dans validateAndMerge
  - Utilisé `(config as Partial<GlobalConfiguration>)` dans validateAndMergeGlobal
- [x] 1.2 ConfigurationContext.tsx — Corrigé `validateProjectConfiguration(config as ProjectConfiguration)`
- [ ] 1.3 Fix EffectsLibrary.tsx — Exporter `Effect`, `EffectParameter`, `EffectKeyframe`
- [ ] 1.4 Fix contexts/ProjectContext.tsx — Conflits de types `Shot`, `TextLayer`, `Effect` entre types/index et types/projectDashboard
- [ ] 1.5 Fix types/index.ts vs types/projectDashboard.ts — Unifier les types `Shot`, `TextLayer`, `Effect`

### Phase 2: Conflits de Types Critiques (bloquants)

- [ ] 2.1 Unifier Shot.sequenceId (optional vs required) entre les deux fichiers de types
- [ ] 2.2 Unifier TextLayer (fields manquants: content, font, fontSize, color)
- [ ] 2.3 Unifier Effect.parameters (optional vs required)
- [ ] 2.4 Unifier Project (schema_version, project_name, assets, generation_status manquants)
- [ ] 2.5 Fix VisualIdentity (gender, reference_images, reference_sheet_images manquants)

### Phase 3: Erreurs de Modules Manquants

- [ ] 3.1 Fix `src/components/VideoEditor/StatusBar` — module manquant (VideoEditorContext)
- [ ] 3.2 Fix `src/components/VideoEditor/Toolbar` — modules manquants
- [ ] 3.3 Fix `src/components/ui/TaskQueuePanel.tsx` — modules manquants
- [ ] 3.4 Fix imports `@/services/asset/AssetService` 

### Phase 4: Unused Variables (FIX_TODO original Phase 2)
- [ ] 4.1 Fix unused variables dans 16 composants (AIEnhancementControls, etc.)

### Phase 5: Build Final ✅ TERMINÉ
- [x] 5.1 Run `npm run build` dans creative-studio-ui → **BUILD RÉUSSI** (exit code 0, 2026-02-18)
  - Seuls warnings restants : imports dynamiques/statiques mixtes (perf), chunk > 500kB (non-bloquant)

---

## Corrections déjà effectuées (session 2026-02-18)

### ✅ Security Fix (IPC Configuration Bridge)
- Canaux IPC CONFIG_* dans electron/ipcChannels.ts → déjà implémentés
- Handlers IPC registerConfigHandlers() → déjà implémentés  
- preload.ts window.electronAPI.config → déjà implémenté
- **NOUVEAU** configurationStore.ts TypeScript errors → CORRIGÉ
- **NOUVEAU** ConfigurationContext.tsx validateConfiguration cast → CORRIGÉ

---

## Prochaines priorités

1. **Unifier les types** (`types/index.ts` vs `types/projectDashboard.ts`) — ROOT CAUSE de ~200 erreurs
2. **Exporter EffectsLibrary types** — bloque EffectControls, EffectPanel, etc.
3. **VideoEditorContext manquant** — bloque VideoEditor
