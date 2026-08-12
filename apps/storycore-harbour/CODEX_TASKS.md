# Codex work plan

Complete tasks in order. Do not start an optional phase until the previous gate passes.

Status legend: ✅ completed · 🟡 implemented, awaiting real-platform or human gate · ⬜ not started

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
- [x] Run the full Node test suite.
- [x] Validate the sample export.
- [x] Validate the mock LLM response fixture.
- [x] Run `anna-app validate --strict` with exact `@anna-ai/cli` 0.1.30.
- [x] Confirm `npm run dev:mock` starts the official Anna harness and responds on port 5180.
- [x] Add reproducible GitHub Actions validation.

**Acceptance result:** bootstrap, strict Anna validation, and mock-harness startup pass.

## HBR-002 — Harden the project contract ✅

- [x] Replace the lightweight runtime checks with one canonical executable contract.
- [x] Align browser, CLI, mock response, and test validation.
- [x] Validate project identity, supported formats, limits, and date fields.
- [x] Validate production bible and visual direction.
- [x] Validate unique character, location, scene, and shot IDs.
- [x] Validate scene and shot ordering.
- [x] Validate every location, character, and warning scene reference.
- [x] Require shot characters to belong to the parent scene.
- [x] Validate plausible scene duration totals.
- [x] Cover twenty invalid-contract conditions plus the valid reference project.
- [x] Prevent invalid data from rendering, saving, loading, or passing storage read-back.
- [x] Pass the final shared-validator CI gate.

**Acceptance result:** invalid references and malformed model output cannot be saved; the complete CI gate is green.

## HBR-003 — Generation reliability 🟡

Implemented foundation:

- [x] Refine the bounded system prompt.
- [x] Add explicit input-size and model-response limits.
- [x] Normalize supported MCP completion response shapes.
- [x] Add exactly one repair attempt and record its use.
- [x] Classify Anna errors by stable error name.
- [x] Add finite timeout and duplicate-submit protection.
- [x] Preserve a supplied working title unconditionally.
- [x] Create an immutable twenty-prompt corpus covering all six formats.
- [x] Include exactly ten English and ten French prompts.
- [x] Cover short/long, dialogue/no-dialogue, factual, safety, ensemble, prop, and spatial cases.
- [x] Add a deterministic evaluator for contract success, preserved inputs, latency, repair use, duplicates, missing results, and stable failure categories.
- [x] Add evaluator unit tests and corpus validation to CI.
- [x] Keep real result files out of Git.
- [x] Add a hidden authenticated collector using the normal UI/LLM/repair/storage flow.
- [x] Require explicit quota/storage confirmation before enabling the collector.
- [x] Add safe stop and local JSONL download.
- [x] Generate the static-bundle corpus from one canonical source.
- [x] Test Host API ACLs and expected response shapes with the official `mountBundle` harness.

Real-platform work still required:

- [ ] Authenticate or activate a real Anna developer test environment.
- [ ] Run all twenty prompts against at least one enabled model.
- [ ] Evaluate the downloaded JSONL with `npm run acceptance:evaluate`.
- [ ] Tune scene/shot counts or prompt constraints only from measured failures.
- [ ] Reach at least 18/20 valid projects without manual intervention.
- [ ] Keep median successful completion time at or below 180 seconds.
- [ ] Rerun the complete immutable corpus after every reliability fix.

**Acceptance:** the committed evaluator reports `Acceptance gate: PASS` on a real, complete result file.

## HBR-004 — Complete the four-step UI 🟡

- [x] Finish responsive cards and scene navigation.
- [x] Add tab/tablist/tabpanel semantics for the four steps.
- [x] Add Arrow, Home, and End keyboard navigation with roving focus.
- [x] Move focus to form errors, active panel headings, and fatal errors.
- [x] Add `aria-live` status for runtime, loading, save, validation, and fatal states.
- [x] Implement empty, loading, retry, quota, permission, provider, contract, storage, and concurrency messages.
- [x] Add a real-browser test of the complete mock flow at 520 × 680.
- [x] Test local validation focus, keyboard step navigation, panel focus, save/read-back, continuity, and JSON export.
- [x] Verify no horizontal overflow at the declared minimum width.
- [x] Ensure generated content is inserted as text rather than untrusted HTML.
- [x] Honor reduced-motion preference.
- [ ] Complete a manual screen-reader pass.
- [ ] Complete manual 200% zoom and forced/high-contrast checks.

**Acceptance:** automated accessibility/navigation gates pass; close after the remaining manual accessibility checks and external beta confirm that first-time users can finish unaided.

## HBR-005 — Persistence and export 🟡

- [x] Save only validated projects.
- [x] Read back and revalidate after save.
- [x] Add `etag` / `if_match` optimistic concurrency for overwrite operations.
- [x] Test declared storage ACL and app-facing response shapes with `mountBundle` mocks.
- [x] Exercise UI save/read-back and export in a real browser with a deterministic test adapter.
- [ ] Test a real production APS write, read-back, reload, and induced conflict.
- [ ] Confirm a sufficient user-facing deletion path; add delete-all if Anna controls are insufficient.
- [ ] Add recent-project selection only if it remains simple and reliable.
- [x] Sanitize export names.
- [x] Document the `storycore-harbour.project.v1` import contract.

**Acceptance:** reload restores the latest valid project; exported JSON passes the local contract validator; production APS conflict and deletion behavior are verified.

## HBR-006 — Review and launch package 🟡

- [x] Draft Marketplace tagline, descriptions, keywords, limits, screenshot captions, and prohibited claims.
- [x] Prepare an App privacy/data-handling draft.
- [x] Prepare reviewer functional/security instructions.
- [x] Prepare an external 10–20 participant beta protocol and exit gate.
- [x] Prepare a release-blocking launch checklist.
- [x] Provide an App icon.
- [ ] Capture four final screenshots with fictional content.
- [ ] Confirm Anna screenshot dimensions and file limits.
- [ ] Record a short end-to-end demonstration.
- [ ] Run 10–20 external beta tests.
- [ ] Fix all P0/P1 defects and disposition P2 findings.
- [ ] Verify deletion controls and finalize publisher privacy contact.
- [ ] Prepare immutable version `0.1.0`.
- [ ] Do not release until the owner reviews Anna's Developer Terms and revenue-share policy.

**Acceptance:** reviewer can reproduce a successful core run with no private setup and all real-platform, legal, accessibility, and beta gates pass.

## Codex resume rule

1. Inspect the latest `StoryCore Harbour CI` result on draft PR #30.
2. Read `acceptance/README.md` before operating the real collector.
3. Do not run the twenty-prompt collector without an authenticated test account, enabled model, sufficient quota, and explicit human confirmation in the UI.
4. Evaluate the resulting local JSONL; do not commit or paste it into the PR.
5. Make reliability changes only from measured prompt IDs and validation categories, not by weakening the contract or replacing difficult corpus entries.
6. The next non-authenticated work may cover final screenshots, manual-accessibility preparation, or deletion UX, but must not bypass the real Anna gates.
7. If a gate turns red, fix only that Harbour gate before doing new product work.
8. Do not add an Executa, backend, GPU service, image generation, video generation, ComfyUI, or Blender.

## Optional after 0.1

- field-level editing;
- optional Anna image keyframes;
- direct StoryCore Desktop import;
- multilingual prompt templates;
- collaboration;
- Executa-backed deterministic continuity engine.

These are outside the initial mission unless explicitly promoted.
