# Studio editor binding recovery

Partial follow-up to #74, stacked on #77 at
`b0018678cc7ca67e229264d0b6bb6dc1eb6e3a3a`. Keep the change in draft.

## Repaired controls

- AudioEffectsPanel uses its real selected-effect state. Icon buttons expose
  their action and effect name to assistive technology. Selection, disabling,
  preview/apply callback payloads and removal are covered; applying still sends
  the complete effect chain, including each enabled flag.
- AssetLibrary uses its real active category. General templates no longer compare
  an absent subcategory against the category's `null` marker. Named transition
  presets remain separate, and rapid search changes use the last debounced value.
- CanvasArea uses the existing editor store, createShot action and effect-stack
  prop. Nonexistent unused destructures are removed. Tests exercise the real
  shot-wizard state and effect selection, duplication, toggling and removal.
- KeyframeEditor uses the real state hook, zoom binding and play/pause callback.
  Its animation ref is initialized for React 19. Rendering sorts a copy of the
  keyframe array rather than mutating the parent's array.

The scheduling wrappers retain the callback argument tuple instead of requiring
a callback to accept arbitrary `unknown` arguments. Timer types work in the
browser as well as Node. Their emitted JavaScript is byte-identical to the base
after TypeScript erasure. The existing throttle is leading-only: a suppressed
call does not become a trailing invocation. Its old test is corrected to assert
that contract and that a new call starts the next window. No timer behavior is
changed to accommodate the test.

## React 19 dependency correction

The additional strict editor-control program exposed Lucide 0.468.0 importing
`ReactSVG`, which React 19 types no longer export. This upstream incompatibility
is tracked in [Lucide #2667](https://github.com/lucide-icons/lucide/issues/2667).
Published npm declarations for 0.469.0, 0.470.0, 0.471.0, 0.471.1, 0.471.2,
0.472.0 and 0.473.0 still contain the import. The inspected
[0.474.0 package](https://registry.npmjs.org/lucide-react/-/lucide-react-0.474.0.tgz)
removes it and declares stable React 19 peer support.

Only the Studio's Lucide requirement and matching locked package change. Every
other locked package version and optional/platform entry is preserved. Root and
Electron dependency locks are unchanged. No ambient React export is fabricated;
the new program uses `skipLibCheck: false`. Full application compiler flags and
source inclusions are unchanged.

## Evidence and checks

Eight new interaction tests fail before the component repairs and pass after
them. They retain real React hooks, Zustand stores, Radix controls, React DnD and
Lucide icons. Only the grid, timeline and graphics preview boundaries are
substituted; the animation scheduler is stubbed in its cancellation test.

On a clean Studio-only installation with Node 24.19.0 / npm 11.9.0:

- The shared-library audit passes: 5,713 named bindings in 966 source files.
- Both existing strict bridge programs and the new strict audio/keyframe/
  scheduling program pass. Compile-only negative cases reject incorrectly typed
  callback arguments; this program does not cover the entire application.
- All 24 focused tests in five files pass (the prior ten checks, eight new editor
  tests and six scheduling tests).
- The production bundle succeeds.

The unchanged complete `tsc -b` still fails with **1,206 diagnostics**, down from
**1,249** at the exact #77 base in the same clean Studio-only setup. None is in
the five modified production source files. An existing unresolved
`_currentTexture` in EffectPreviewRenderer gains a suggested-name diagnostic;
that wording change is not a new error. The previously reported 1,254 local /
1,317 hosted counts used different installations and are separate measurements.

```sh
npm ci --ignore-scripts --no-audit --no-fund --legacy-peer-deps
node scripts/check-ui-library-imports.mjs
./node_modules/.bin/tsc --project tsconfig.renderer-contract.json --pretty false
./node_modules/.bin/tsc --project tsconfig.preload-renderer-contract.json --pretty false
./node_modules/.bin/tsc --project tsconfig.editor-controls-contract.json --pretty false
npm test -- src/sequence-editor/store/hooks/__tests__/useEditorControls.test.tsx src/services/__tests__/AddonManager.availability.test.ts src/stores/__tests__/storeDebuggerBoundary.test.ts src/components/__tests__/editorBindings.test.tsx src/utils/__tests__/debounce.test.ts
npm run build
./node_modules/.bin/tsc -b --pretty false
```

The renderer workflow applies these checks on Node 22.12.0 and 24.19.0, retaining
the bounded offline Chromium launcher check on Node 24. Browser steps on Node 22
are skipped by matrix design. A separate full-application compiler job retains
its real exit status and diagnostic artifact. Hosted evidence must be read from
the exact PR head; these local checks are not a hosted result or a Sonar gate.

## Still unfinished

Full application compilation and other domain/module/optional Electron contracts
remain unresolved. These tests prove control/state behavior, not media processing,
audible preview, keyframe interpolation, canvas zoom geometry, project creation,
saved-shot round trips, provider generation or the primary Electron launcher.
The #70/#63/#73 dependency combination has not been retested with this batch.
No commercial availability, security-alert closure, owner or deadline is claimed.
