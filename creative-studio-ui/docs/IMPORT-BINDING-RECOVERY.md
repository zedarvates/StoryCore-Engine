# Studio import binding recovery

Partial follow-up to #74, stacked on renderer recovery #76.

## Source repair

Restore named imports that referred to nonexistent exports after names were
altered with underscores. Each replacement was checked against the actual
module's TypeScript exports; this is not a blanket rename of local variables.
The existing `Image as ImageIcon` alias is preserved. Valid exported names that
contain underscores, such as `WIZARD_DEFINITIONS`, keep those underscores.

Restore the existing React, SceneSelector, Slider, Badge and characterOptions
module paths and the CanvasArea export consumed by EditorPage. No missing
services, adapters, assets or generation capabilities are synthesized.

The existing non-UTF-8 encoding of PropertiesPanel is retained. Package versions,
lockfiles, full compiler settings and source inclusions are unchanged.

## Validation and CI boundary

```sh
node scripts/check-ui-library-imports.mjs
./node_modules/.bin/tsc --project tsconfig.renderer-contract.json --pretty false
./node_modules/.bin/tsc --project tsconfig.preload-renderer-contract.json --pretty false
npm test -- src/sequence-editor/store/hooks/__tests__/useEditorControls.test.tsx src/services/__tests__/AddonManager.availability.test.ts src/stores/__tests__/storeDebuggerBoundary.test.ts
npm run build
./node_modules/.bin/tsc -b --pretty false
```

The new import check audits named imports and re-exports from React, React DOM,
Lucide, Material UI, Framer Motion and Three against the installed declarations,
including imports removed by tree shaking. It covers 5,713 bindings in 966 source
files in the local setup. A temporary negative probe confirmed that an unused
nonexistent export fails; valid local aliases and named re-exports pass.
This is a shared-library name contract, not an audit of all local modules,
third-party libraries, runtime implementations or application types.

Locally on Node 24.19.0, both bridge contract programs, ten focused tests and the
production bundle pass. The unmodified full `tsc -b` still fails with 1,254
diagnostics, down from 1,623 on the #76 head in the same setup. A diagnostic can
change its wording/code as name resolution improves; this count does not prove
the remaining behavior works. An isolated installation can produce a different
count because ambient declarations from the repository root are absent.

Renderer CI runs the import audit on Node 22.12.0 and 24.19.0 alongside the
existing bridge contracts, focused tests, bundle and Node 24 offline launcher
check. A separate **Full application types (unfinished)** job runs the complete
existing TypeScript build and retains the diagnostics. Its failure remains a
visible blocker; successful focused jobs must not be described as a green full
application check.

## Still unfinished

Other missing exports/modules, corrupted local bindings, unknown payload
validation and Electron capability guards remain. In particular, resolving a
component's imports/export does not prove that its callbacks, state or domain
contracts work. Full project creation/editing/playback/generation and the primary
Electron launcher remain unverified. Keep #74 open and this change in draft.
No commercial availability or security-alert closure is claimed.
