# Codex work plan

Complete tasks in order. Do not start an optional phase until the previous gate passes.

Status legend: ✅ completed · 🟡 implemented, awaiting real-platform gate · ⬜ not started

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
- [x] Cover very short and longer durations, dialogue/no-dialogue, factual caution, safety constraints, ensembles, recurring props, and spatial continuity.
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

## HBR-004 — Complete the four-step UI ⬜

- [ ] Finish responsive cards and scene navigation.
- [ ] Add complete keyboard navigation and `aria-live` status.
- [ ] Add empty, loading, retry, quota, permission, provider, contract, and storage-conflict states.
- [ ] Add a browser-level test of the complete mock flow at the manifest minimum size.
- [ ] Ensure no untrusted HTML injection through all rendered fields.
- [x] Add reduced-motion support.

**Acceptance:** a first-time tester can finish the flow without guidance.

## HBR-005 — Persistence and export 🟡

- [x] Save only validated projects.
- [x] Read back and revalidate after save.
- [x] Add `etag` / `if_match` optimistic concurrency for overwrite operations.
- [x] Test declared storage ACL and app-facing response shapes with `mountBundle` mocks.
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
2. Read `acceptance/README.md` before operating the real collector.
3. Do not run the twenty-prompt collector without an authenticated test account, enabled model, sufficient quota, and explicit human confirmation in the UI.
4. Evaluate the resulting local JSONL; do not commit or paste it into the PR.
5. Make reliability changes only from measured prompt IDs and validation categories, not by weakening the contract or replacing difficult corpus entries.
6. If a gate turns red, fix only that Harbour gate before doing new product work.
7. Do not add an Executa, backend, GPU service, image generation, video generation, ComfyUI, or Blender.

## Optional after 0.1

- field-level editing;
- optional Anna image keyframes;
- direct StoryCore Desktop import;
- multilingual prompt templates;
- collaboration;
- Executa-backed deterministic continuity engine.

These are outside the initial mission unless explicitly promoted.
