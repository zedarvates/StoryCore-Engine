# Codex work plan

Complete tasks in order. Do not start an optional phase until the previous gate passes.

Status legend: ✅ completed · 🟡 implemented, awaiting final gate · ⬜ not started

## HBR-000 — Repository orientation ✅

- [x] Read all mission files.
- [x] Inspect the latest official Anna Markdown documentation and current CLI version.
- [x] Inspect `scripts/run_e2e_demo.py` and relevant StoryCore contracts read-only.
- [x] Record documentation drift in `DECISIONS.md`.
- [x] Justify the single cross-directory CI workflow in `DECISIONS.md`.

**Gate result:** product runtime changes remain inside `apps/storycore-harbour/`; only the path-scoped CI workflow lives outside it.

## HBR-001 — Validate the bootstrap ✅

- [x] Install dependencies with Node.js 22+.
- [x] Run JavaScript syntax checks.
- [x] Run `npm test`.
- [x] Run `npm run contract:check`.
- [x] Validate the mock LLM response fixture.
- [x] Run `anna-app validate --strict` with `@anna-ai/cli` 0.1.30.
- [x] Confirm `npm run dev:mock` starts the official Anna harness and responds on port 5180.
- [x] Add reproducible GitHub Actions validation.

**Acceptance result:** bootstrap, strict Anna validation, and mock-harness startup pass.

## HBR-002 — Harden the project contract 🟡

- [x] Replace the lightweight runtime checks with one canonical executable contract.
- [x] Align browser, CLI, mock fixture, and test validation.
- [x] Validate project identity, supported formats, limits, and date fields.
- [x] Validate production bible and visual direction.
- [x] Validate unique character, location, scene, and shot IDs.
- [x] Validate scene and shot ordering.
- [x] Validate every location, character, and warning scene reference.
- [x] Require shot characters to belong to the parent scene.
- [x] Validate plausible scene duration totals.
- [x] Add at least ten negative cases; the suite now covers twenty contract failures.
- [x] Prevent invalid data from rendering, saving, loading, or passing storage read-back.
- [ ] Confirm the final shared-validator integration is green in CI.

**Acceptance:** invalid references and malformed model output cannot be saved. Close this task when the latest CI run is green.

## HBR-003 — Generation reliability ⬜

Already implemented foundation:

- [x] Refine the bounded system prompt.
- [x] Add explicit input-size and model-response limits.
- [x] Normalize supported MCP completion response shapes.
- [x] Add exactly one repair attempt.
- [x] Classify Anna errors by stable error name.
- [x] Add finite timeout and duplicate-submit protection.

Work still required:

- [ ] Create `acceptance/prompts.json` with twenty immutable prompts.
- [ ] Cover every supported format and both English and French.
- [ ] Add a runner that records success, contract errors, latency, and repair use without storing private test content in logs.
- [ ] Test against a real Anna account and at least one enabled provider.
- [ ] Tune scene/shot counts by format and duration.
- [ ] Reach at least 18/20 valid projects without manual repair.

**Acceptance:** at least 18 of 20 fixed acceptance prompts produce valid projects in the selected real Anna test account.

## HBR-004 — Complete the four-step UI ⬜

- [ ] Finish responsive cards and scene navigation.
- [ ] Add complete keyboard navigation and `aria-live` status.
- [ ] Add empty, loading, retry, quota, permission, provider, contract, and storage-conflict states.
- [ ] Ensure no untrusted HTML injection.
- [x] Add reduced-motion support.
- [ ] Test at the manifest minimum size.

**Acceptance:** a first-time tester can finish the flow without guidance.

## HBR-005 — Persistence and export 🟡

- [x] Save only validated projects.
- [x] Read back and revalidate after save.
- [x] Add `etag` / `if_match` optimistic concurrency for overwrite operations.
- [ ] Test a real production APS write, read-back, reload, and induced conflict.
- [ ] Add recent-project selection only if it remains simple and reliable.
- [x] Sanitize export names.
- [x] Document the `storycore-harbour.project.v1` import contract.

**Acceptance:** reload restores the latest valid project; exported JSON passes the local contract validator; production APS conflict handling is verified.

## HBR-006 — Review and launch package ⬜

- [ ] Create marketplace copy, icon, screenshots, privacy notes, and reviewer test instructions.
- [ ] Record a short end-to-end demonstration.
- [ ] Run 10–20 external beta tests.
- [ ] Fix all P0/P1 defects.
- [ ] Prepare immutable version `0.1.0`.
- [ ] Do not release until the owner reviews Anna's Developer Terms and revenue-share policy.

**Acceptance:** reviewer can reproduce a successful core run with no private setup.

## Codex resume rule

1. Inspect the latest `StoryCore Harbour CI` result on draft PR #30.
2. If green, mark HBR-002 complete in `STATUS.md` and begin HBR-003.
3. If red, fix only the failing Harbour gate before doing new product work.
4. Do not add an Executa, backend, GPU service, image generation, video generation, ComfyUI, or Blender.

## Optional after 0.1

- field-level editing;
- optional Anna image keyframes;
- direct StoryCore Desktop import;
- multilingual prompt templates;
- collaboration;
- Executa-backed deterministic continuity engine.

These are outside the initial mission unless explicitly promoted.
