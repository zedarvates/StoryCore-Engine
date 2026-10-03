# Renderer recovery after the shared editor controls

This is a partial repair for issue #74, based on PR #75 at
`02990d8e0211a5a848bedd499d25f07788c4f3fa`. It does not close the issue or
establish generation, live-provider integration or full application acceptance.

## Recovered behavior

- The demo addon's descriptor remains discoverable for saved configurations.
  Its implementation is not shipped, so activation returns `false`, reports an
  error and never adds it to the active addon list. No placeholder module reports
  success. A fresh activation does not persist an enabled configuration.
- The sequence generation button imports the existing `generateButton.css`
  with its exact filename, including on case-sensitive filesystems.
- The studio directly declares `antd` 6.3.4 (already locked at repository root)
  and `dnd-core` 16.0.1 (already locked transitively in the studio). An isolated
  install can resolve the components' dependencies without a parent installation.
  Existing locked package versions and platform/optional entries are retained.
- NexRealm and AddonStore no longer import/require a missing redaction helper.
  Their Zustand debugger connections are explicitly disabled, including in
  development, while ordinary store updates still work. This trades debugger
  visibility for an explicit boundary; it is not a general security audit or a
  replacement redaction implementation.
- The renderer can import `ElectronAPI` as an alias of `StoryCoreElectronAPI`.
  `Window.electronAPI` is optional for browser launches. The core shape matches
  the main `electron/electronAPI.d.ts` contract; character/world/location/story
  adapters and `sequence.list` are optional extensions absent from the main
  `electron/preload.ts`. Project deletion, dialog options, returned shot data,
  dates from recent-project/file-stat handlers and possibly absent command output
  are declared according to those versioned desktop sources.
- AppContent uses the store's actual `Project` type and the optional Window
  declaration instead of asserting the bridge is always present. Unknown IPC
  payloads remain unknown; domain validation is still required.
- Vite chunk classification uses paths relative to the studio rather than the
  absolute checkout name, so a parent directory containing `ai` does not change
  unrelated module classifications.

## Verification on 2026-10-03

Local Node 24.19.0 / npm 11.9.0, unchanged dependency lockfile:

1. Ten tests pass: the six shared-controls tests from #75, two unavailable-addon
   tests and two tests proving an installed Redux debugger receives no connection
   from either affected store while their local actions still update subscribers
   or state. These checks use no live provider or marketplace backend.
2. Two strict compile-only contract programs pass. One checks browser absence,
   optional capabilities, dialog and date types, missing command output and
   rejection of unvalidated IPC data. The other requires the desktop API to be
   assignable to the renderer's whole core shape. They do not load both conflicting
   legacy/browser Window declarations into the same TypeScript program.
3. `npm run build` succeeds and produces the production bundle. Vite still reports
   circular chunk warnings and large chunks. Compilation alone does not prove
   that the renderer starts or that runtime behavior is correct.
4. Full `tsc -b --pretty false` still fails: 1,623 diagnostics, compared with
   2,147 on main at `ab9f613665cfd7d19b37b360fdff68c8541667d0`.
   The 538 undeclared `Window.electronAPI` diagnostics are removed; unresolved
   exports/imports, unsafe domain payload use and missing guards remain. Strict
   compiler settings and the full application inclusion are unchanged.
5. The local Playwright browser download returned invalid archives, so no local
   browser startup result is claimed. The new CI matrix builds on Node 22.12.0
   and 24.19.0 and runs a bounded Chromium production-bundle startup check on
   Node 24.19.0. Only that check's result on the actual PR head establishes its
   limited browser-startup evidence.

The first renderer CI run at `a6b82f9fe3c40b275064fc8a91ebf72dc3d30da6`
exposed the undeclared studio `antd` import. The earlier local build had resolved
it from the root installation. Both CI builds failed, and browser installation/
startup were skipped. The direct dependencies above repair this clean-install
gap; the subsequent current-head CI result is the evidence for recovery.

A separate isolated studio installation combines the renderer changes plus the
direct-dependency repair with exact #70
`99feb3319e35a896bbdb4505a02a9fa452380329`, #63
`ca5b890a4fe010065a76294506abbde0b293ec3c` and #73
`3a8cac25a11ed207192d443562f899cecb54aede`. Axios 1.20.0, Undici 7.30.0 and
Electron 41.10.6 are resolved inside that studio. Installation, both strict
contract programs, ten focused tests and the Vite bundle pass locally. The full
strict check still fails (1,618 diagnostics in this isolated combination).
This is a local source-patch integration check, not a merged revision or a
Chromium/Electron runtime result for the combination.

Commands:

```sh
npm ci --ignore-scripts --no-audit --no-fund --legacy-peer-deps
./node_modules/.bin/tsc --project tsconfig.renderer-contract.json --pretty false
./node_modules/.bin/tsc --project tsconfig.preload-renderer-contract.json --pretty false
npm test -- src/sequence-editor/store/hooks/__tests__/useEditorControls.test.tsx src/services/__tests__/AddonManager.availability.test.ts src/stores/__tests__/storeDebuggerBoundary.test.ts
npm run build
./node_modules/.bin/playwright install --with-deps chromium --only-shell
./node_modules/.bin/playwright test --config playwright.bundle-smoke.config.ts
```

The startup check serves the generated bundle with `vite preview`, uses a fresh
browser context without an Electron preload, blocks backend/provider traffic,
and requires the launcher heading and enabled project-creation control with no
uncaught page errors. It does not exercise project creation, Electron IPC,
editing, playback, cancellation or generation.

## Remaining acceptance and review

- Verify the current-head CI build and Chromium result; investigate startup
  failures rather than accepting a green bundler as runtime proof.
- Fix the remaining strict TypeScript diagnostics with real contracts and
  validated domain data. Do not add broad `any`, suppressions or exclusions to
  make the full check appear clean.
- Review the optional entity-adapter contract and the deliberate debugger
  limitation. Do not advertise either an unavailable addon or disabled debugger
  export as an implemented capability.
- The older `creative-studio-ui/electron/preload.js` exposes a different, smaller
  bridge. Its compatibility and the full desktop launcher are not established by
  these browser/type checks. The legacy AddonManager filesystem integration suite
  also assumes an active demo addon; it is not part of the passing focused suite.
- #74 stays open. These changes do not approve or merge #70/#63, publish #67,
  or replace the #68 evidence audit.
