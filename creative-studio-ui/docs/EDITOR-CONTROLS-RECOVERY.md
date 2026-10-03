# Editor controls recovery

This bounded repair addresses the first root-provider and sequence-editor module
failures tracked in #74. Source before the repair is
`ab9f613665cfd7d19b37b360fdff68c8541667d0`.

## State ownership

The existing Redux `panelsSlice`, `toolsSlice` and `chatSlice` implement the
contracts requested by the toolbar, editor and compact assistant. The components
had imported missing `stores/editor/*` Zustand modules instead. `chatSlice` was
also absent from the application reducer registration.

`useEditorControls` selects the registered Redux state and binds its existing
actions to the current Provider's dispatch. Consumers share one source of state;
panel visibility, selected tools and chat messages continue to use the existing
reducers. Bound action identities stay stable across state changes.

The absent root `ComfyUIProvider` wrapper is removed. Current ComfyUI hooks access
their existing servers service directly and do not consume a provider context.
This does not add a provider, execute a workflow or establish generation quality.

## Executed validation

```sh
cd creative-studio-ui
npm test -- src/sequence-editor/store/hooks/__tests__/useEditorControls.test.tsx
```

Six local tests pass on Node 24.19.0: application chat registration, independent
consumer synchronization, existing production-mode layout transitions, tool
selection, chat message/visibility sharing, and stable action identities. The
path-filtered workflow runs this same suite on Node 22.12.0 and 24.19.0.

## Remaining acceptance

The production bundle remains blocked by other missing modules. The next observed
failure is `addons/demo-addon`, imported by `services/AddonManager.ts`. The baseline
strict typecheck has 2,147 diagnostics; these controls tests do not replace a
successful `build:check` or complete renderer startup.

The compact assistant still has its existing simulated reply. The repair tests
state sharing only, not an LLM request, backend/provider connectivity, generated
video/comic/manga content, packaging or platform acceptance.
