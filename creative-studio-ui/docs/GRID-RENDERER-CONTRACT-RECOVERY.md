# Grid renderer contract recovery

Partial follow-up to #74, stacked on #78 at
`af83b71145191bb964f2109261adbe15234cdd87`. Keep the work in draft.

## Source and behavior repairs

GridRenderer and PanelRenderer now use the existing Layer, Panel, transform,
crop, drawing and text contracts. Image URLs are obtained through their actual
content discriminant rather than a LegacyAny assertion. Shared domain types,
dependency versions/locks and full compiler flags/source inclusions are unchanged.

The new strict program reproduces 111 diagnostics on the base (63 in
GridRenderer, 48 in PanelRenderer). Its existing-data fixtures and negative cases
retain numeric crop/transform coordinates and typed annotation points. The
program checks both real components with `skipLibCheck: false`; it does not
replace full application compilation or validate external JSON payloads.

The interaction tests also expose and cover these behavior repairs:

- The grid uses the same normalized source crop and cropped aspect ratio as the
  individual panel. Its image draw receives the correct source/destination
  rectangles after loading.
- Visible locked layers remain visible. The existing layer controls use locking
  to prevent edits; visibility is a separate field.
- Drawing opacity composes with layer opacity, including zero, instead of making
  zero opaque or overwriting the layer's opacity.
- Rectangles/ellipses without two points are skipped without stopping the rest
  of the annotation layer. Individual panels now draw the already-supported line
  annotation type as well as paths, rectangles, ellipses and text.
- Obsolete image-load completions do not repaint old props or notify the old
  individual panel's onLoad callback. Cleanup ignores completions; it does not
  abort native image requests or change the existing image-error policy.
- Window resize redraws the current grid props, rather than the initially
  captured panels. Click/double-click handlers still select the requested cell
  using CSS coordinates and retain modifier information.

PanelRenderer's helper callbacks precede their consumers and list their real
dependencies. Its redundant imagesLoaded state/second render effect is removed:
current annotations/borders and cached images draw immediately, and active image
completions redraw the native canvas. This avoids cascading React renders without
disabling a lint rule.

## Local evidence and commands

On Node 24.19.0 / npm 11.9.0 in the same Studio-only installation as the #78 base:

- The 13 old PanelRenderer tests pass before repair, while 11 of the first 14 new
  tests fail (including one unhandled incomplete-shape error). Two additional
  tests reproduce an unhandled native draw failure after image loading. The final
  set contains **53 focused tests in seven files**: the previous 24, the old 13
  and the new 16.
- Both bridge programs, the editor control program and the new grid program pass.
  The library-name audit passes for **5,712 bindings in 966 files**; the one-binding
  change is removal of the redundant React useState import.
- Targeted ESLint passes for both repaired components and both new contract/test
  files, with no suppressions or config changes.
- The production bundle succeeds.
- The unmodified complete `tsc -b` still **fails with 1,095 diagnostics**, down
  from **1,206** on the exact base in the same setup. All 111 grid-renderer errors
  disappear, with no new diagnostic fingerprints after normalizing line numbers.
  These local counts are separate from isolated hosted CI measurements.

```sh
node scripts/check-ui-library-imports.mjs
./node_modules/.bin/tsc --project tsconfig.renderer-contract.json --pretty false
./node_modules/.bin/tsc --project tsconfig.preload-renderer-contract.json --pretty false
./node_modules/.bin/tsc --project tsconfig.editor-controls-contract.json --pretty false
./node_modules/.bin/tsc --project tsconfig.grid-renderer-contract.json --pretty false
./node_modules/.bin/eslint src/components/gridEditor/GridRenderer.tsx src/components/gridEditor/PanelRenderer.tsx src/components/gridEditor/__tests__/rendererContracts.test.tsx tests/contracts/grid-renderer.contract.ts
npm test -- src/sequence-editor/store/hooks/__tests__/useEditorControls.test.tsx src/services/__tests__/AddonManager.availability.test.ts src/stores/__tests__/storeDebuggerBoundary.test.ts src/components/__tests__/editorBindings.test.tsx src/utils/__tests__/debounce.test.ts src/components/gridEditor/__tests__/rendererContracts.test.tsx src/components/gridEditor/__tests__/PanelRenderer.test.tsx
npm run build
./node_modules/.bin/tsc -b --pretty false
```

The renderer matrix adds the strict grid program, targeted lint and grid tests.
The separate full-compiler job keeps its real failure and diagnostic artifact.
The offline Chromium launcher check remains limited to Node 24; Node 22 browser
steps are skipped by matrix design. Read hosted results from the exact PR head.

## Sonar follow-up

The first published head, `91e9854f5833eb0654e8d2009ce0d632cc930afc`, received a
[failed SonarCloud check](https://github.com/zedarvates/StoryCore-Engine/runs/111380409938)
with Reliability Rating C on New Code (A required). Its ten GitHub annotations
identify seven unnecessary void discard expressions in the compile-only fixture,
two unhandled render promise chains and one complexity finding in GridRenderer.

Export the compile-only fixtures without those discard expressions; retain all
three negative numeric-geometry cases. Both asynchronous render completions now
report native draw failures through console.error, with two regression tests
asserting that a failed draw does not notify panel load. The unchanged normalized
crop arithmetic is isolated in a small typed source-rectangle helper. No scanner
suppression, excluded source, altered threshold or disabled lint rule is added.
The final head's hosted checks and Sonar gate still need their own evidence;
the earlier failure is not proof of the follow-up result.

## Remaining limits

The new unit tests use real component hooks, prop updates and pointer handlers;
only native canvas/image-loading boundaries are controlled. They inspect drawing
commands and lifecycle behavior, not browser pixel output or photo decoding.

Effects remain incomplete: GridRenderer displays an effect label, and
PanelRenderer's effect helper remains a no-op. Transform pivot/clipping semantics,
primary Electron startup, saved project/media round trips and real generation
remain outside this proof. The #70/#63/#73 dependency combination has not been
retested with this batch. Keep #74 open. No commercial availability, security-alert
closure, owner or deadline is claimed.
