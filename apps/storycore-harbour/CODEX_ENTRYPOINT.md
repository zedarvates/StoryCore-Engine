# Codex entry point

Use the following mission when opening this branch in Codex:

```text
You are continuing StoryCore Harbour, an Anna-native App inside
apps/storycore-harbour/ on draft PR #30.

Read AGENTS.md, MISSION.md, PRODUCT_SPEC.md, ARCHITECTURE.md,
CODEX_TASKS.md, DECISIONS.md, STATUS.md, and acceptance/README.md before
editing.

HBR-000, HBR-001, and HBR-002 are complete. The schema 2 manifest, strict
project contract, one-repair policy, storage read-back, CI, immutable
20-prompt corpus, deterministic evaluator, and consented acceptance
collector are already implemented. Do not rebuild or broaden them.

First inspect the latest StoryCore Harbour CI result. Run:

  npm install
  npm run check
  npm run dev:mock

If those gates remain green, continue HBR-003 at the authenticated real-Anna
gate. The collector is available only with ?acceptance=1 and must not run
without an authenticated test account, enabled model, sufficient quota, and
the explicit confirmation checkbox in its UI. Do not commit or paste its
JSONL output into GitHub.

Use measured prompt IDs, stable error categories, validation failures, repair
counts, and latency to make narrowly scoped reliability fixes. Never weaken
the contract, replace difficult corpus prompts after seeing failures, or
silently substitute mock output.

Work inside apps/storycore-harbour/. The only approved cross-directory file
is the existing path-scoped CI workflow. Do not add an Executa, GPU service,
custom backend, provider key, image generation, video generation, ComfyUI,
or Blender to the MVP.

Use current official Anna Markdown documentation as the protocol source of
truth. Record any documentation/runtime drift in DECISIONS.md.

Finish every unit with:
- commands run and exact results;
- changed files;
- measured effect on acceptance prompt IDs, when applicable;
- remaining external blockers;
- the next numbered task.
```

## Next expected Codex outcome

Either:

1. a privacy-safe report from the authenticated twenty-prompt Anna run showing whether the 18/20 and median-latency gates pass; or
2. one focused reliability commit tied to specific failing prompt IDs, followed by a complete corpus rerun.
