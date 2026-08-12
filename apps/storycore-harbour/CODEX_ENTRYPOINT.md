# Codex entry point

Use the following mission when opening this branch in Codex:

```text
You are implementing StoryCore Harbour, an Anna-native App inside
apps/storycore-harbour/.

Read AGENTS.md, MISSION.md, PRODUCT_SPEC.md, ARCHITECTURE.md,
CODEX_TASKS.md, and DECISIONS.md before editing.

Begin with HBR-000 and HBR-001. Work only inside this directory unless a
narrow cross-directory read is needed. Do not add an Executa, GPU service,
custom backend, provider key, image generation, video generation, ComfyUI,
or Blender to the MVP.

Use the latest official Anna Markdown documentation as the protocol source
of truth. Validate the schema 2 manifest with `anna-app validate --strict`.
Run the contract tests and mock harness. Treat LLM output as untrusted,
allow one bounded repair attempt, and never save an invalid project or
silently substitute mock output.

Make focused changes, update DECISIONS.md when assumptions change, and
finish with:
- commands run and results;
- changed files;
- remaining blockers;
- the next numbered task.
```

## First expected Codex outcome

A small focused commit that makes HBR-001 green, with no product-scope expansion.
