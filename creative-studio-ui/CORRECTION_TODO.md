# TODO List - Error Corrections

## 1. AssetPanel.tsx - ARIA Errors (2 errors)
- [x] Remove invalid `aria-selected` from `renderAssetGridItem` function
- [x] Remove invalid `aria-selected` from `renderAssetListItem` function

## 2. types/index.ts - TypeScript Errors (6 errors)
- [x] Remove duplicate `CharacterReference` re-export (was exported from both './story' and './project')
- [x] Remove `CharacterPosition` from './shot' export (not exported from shot.ts)
- [x] Remove `ShotPreview` from './wizard' export (not exported from wizard.ts)
- [x] Remove `SequencePlanWizardState` from './wizard' export (not exported from wizard.ts)
- [x] Remove `ShotWizardState` from './wizard' export (not exported from wizard.ts)

## Follow-up Steps
- [x] Run TypeScript compilation to verify fixes

## Summary
All 8 errors have been successfully fixed:
- 2 ARIA accessibility errors in AssetPanel.tsx
- 6 TypeScript errors in types/index.ts (duplicate identifier + 4 missing exports + 1 duplicate export)

