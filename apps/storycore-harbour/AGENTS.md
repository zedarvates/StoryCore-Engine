# Codex instructions — StoryCore Harbour

These instructions are normative for all work under this directory.

## Read order

Before editing code, read:

1. `MISSION.md`
2. `PRODUCT_SPEC.md`
3. `ARCHITECTURE.md`
4. `CODEX_TASKS.md`
5. `DECISIONS.md`

## Scope

- Work inside `apps/storycore-harbour/`.
- Reading existing StoryCore files is allowed to reuse contracts and concepts.
- Do not modify StoryCore Engine core, Electron, ComfyUI integrations, Blender integrations, root lockfiles, or unrelated CI during the first milestone.
- Any cross-directory change requires a written justification in `DECISIONS.md` and a separate commit.

## Non-negotiable product constraints

- Anna Host API first.
- No embedded or developer-owned LLM/API keys.
- No developer-paid inference service for the MVP.
- No Executa unless an official Anna limitation makes it unavoidable.
- No GPU, image generation, video generation, audio generation, Blender, or ComfyUI in the core completion path.
- A successful core run must produce a complete usable project even when optional media features are unavailable.
- The product must remain independently useful without StoryCore Desktop.
- Preserve export compatibility with StoryCore through a versioned JSON contract.

## Engineering rules

- Treat LLM output as untrusted input.
- Require JSON-only output, parse defensively, validate, and allow at most one bounded repair attempt.
- Never silently replace failed generated data with fake production data.
- Mock data is allowed only in local fixtures and must be visibly labeled.
- Persist only validated projects.
- Use the default per-user/per-App storage scope. Do not request cross-App or user-wide storage privileges.
- Never persist short-lived signed URLs.
- Add loading, empty, permission-denied, quota-exceeded, provider-error, malformed-output, and retry states.
- Keep the UI keyboard-accessible and usable at the minimum declared view size.
- Avoid tracking personal content. Product analytics must be aggregate and must not store scripts or generated story content.
- Never log secrets, full user scripts, or full LLM responses in production.

## Quality gate

A task is not complete until:

- relevant tests pass;
- `npm run contract:check` passes;
- `npm run validate -- --strict` or the equivalent official strict validation passes;
- no new dependency is added without justification;
- docs and decisions are updated;
- the change remains within the mission and non-goals.

## Commit discipline

Prefer small commits with one purpose. Suggested prefixes:

- `feat(harbour):`
- `fix(harbour):`
- `test(harbour):`
- `docs(harbour):`
- `chore(harbour):`

Do not claim that Anna review, Qualified App MAU counting, or revenue-share eligibility has been confirmed unless there is written evidence from Anna.
