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
- [x] Pass the SonarQube Cloud Quality Gate with zero new issues and zero hotspots.

**Acceptance result:** bootstrap, strict Anna validation, mock harness, browser flows, and static analysis pass.

## HBR-002 — Harden the project contract and security ✅

- [x] Replace lightweight runtime checks with one canonical executable contract.
- [x] Align browser, CLI, mock response, and test validation.
- [x] Validate project identity, formats, limits, dates, references, ordering, durations, and continuity.
- [x] Cover twenty invalid-contract conditions plus the valid reference project.
- [x] Prevent invalid data from rendering, saving, loading, exporting, or passing storage read-back.
- [x] Constrain CLI file arguments to existing app-local files with extension allow-lists.
- [x] Redact model-derived validation text and unknown identifiers from evaluator output.
- [x] Replace the optional Markdown-fence regex with bounded manual parsing.
- [x] Render generated content as text rather than untrusted HTML.
- [x] Centralize the required same-origin Anna runtime SDK import.
- [x] Pass the final shared-validator, browser, and Sonar gates.

**Acceptance result:** invalid references, malformed model output, unsafe CLI paths, and model-derived log leakage are blocked without weakening the product contract.

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
- [x] Add evaluator unit tests, privacy-output tests, and corpus validation to CI.
- [x] Keep real result files out of Git.
- [x] Add a hidden authenticated collector using the normal UI/LLM/repair/storage flow.
- [x] Require explicit quota/storage confirmation before enabling the collector.
- [x] Add safe stop and local JSONL download.
- [x] Generate the static-bundle corpus from one canonical source.
- [x] Test Host API ACLs and expected response shapes with the official `mountBundle` harness.
- [x] Obtain Anna confirmation that a Host-API-only Schema 2 App can qualify without a local Executa/runtime.
- [x] Obtain Anna confirmation that developer activation is self-service.

Owner/account actions required before the real gate:

- [ ] Sign in to or create the Anna account and verify the email.
- [ ] Read and accept the Developer ToS.
- [ ] Activate the developer profile in the Developer Console.
- [ ] Claim `storycore-labs` if available.
- [ ] Create the `storycore-harbour` App draft if available.
- [ ] Provide the authenticated environment or URL needed for real testing.

Real-platform work still required:

- [x] Run all twenty prompts against at least one enabled model.
- [x] Evaluate the downloaded JSONL with `npm run acceptance:evaluate`.
- [x] Tune scene/shot counts and warning normalization only from measured failures.
- [ ] Reach at least 18/20 valid projects without manual intervention.
- [x] Keep median successful completion time at or below 180 seconds (measured 27.18 seconds on the 2026-08-23 baseline).
- [ ] Rerun the complete immutable corpus after every reliability fix.

**Acceptance:** the committed evaluator reports `Acceptance gate: PASS` on a real, complete result file.

**Measured baseline — 2026-08-23:** FAIL at 6/20 valid projects, median 27.18 seconds, p95 63.32 seconds, 5 repaired passes, 11 contract failures, and 3 timeouts. The immutable corpus remains unchanged; reliability work must target these measured prompt IDs before a full rerun.

**Bounded diagnostic pilot:** after compact-output and warning-severity normalization, HBR-A01, HBR-A02, and HBR-A05 passed 3/3 with preserved inputs and median 43.68 seconds. This is positive evidence for the targeted fix but does not replace the complete 6/20 baseline or satisfy the 18/20 gate.

## HBR-004 — Complete the four-step UI 🟡

- [x] Finish responsive cards and scene navigation.
- [x] Add tab/tablist/tabpanel semantics for the four steps.
- [x] Add Arrow, Home, and End keyboard navigation with roving focus.
- [x] Move focus to form errors, active panel headings, and fatal errors.
- [x] Add live status for runtime, loading, save, validation, deletion, and fatal states.
- [x] Implement empty, loading, retry, quota, permission, provider, contract, storage, and concurrency messages.
- [x] Add a real-browser test of the complete mock flow at 520 × 680.
- [x] Verify no horizontal overflow at the declared minimum width.
- [x] Ensure generated content is inserted as text rather than untrusted HTML.
- [x] Ensure visible and accessible deletion labels match.
- [x] Honor reduced-motion preference.
- [x] Add an automated 400% text-reflow gate at the declared 520px minimum width.
- [ ] Complete a manual NVDA pass on Windows.
- [ ] Complete a manual VoiceOver pass on macOS.
- [ ] Complete manual 200%/400% zoom and forced/high-contrast checks.

**Acceptance:** automated accessibility/navigation gates pass; close after manual accessibility checks and external beta confirm that first-time users can finish unaided.

## HBR-005 — Persistence, deletion, and export 🟡

- [x] Save only validated projects.
- [x] Read back and revalidate after save.
- [x] Add `etag` / `if_match` optimistic concurrency for overwrite operations.
- [x] Test declared storage get/set/list/delete ACLs and response shapes with `mountBundle` mocks.
- [x] Exercise UI save/read-back and export in a real browser with a deterministic test adapter.
- [x] Add a double-confirmed user-facing delete-all path limited to `projects/`.
- [x] Paginate project listing and delete `projects/current` last.
- [x] Pass ETags to every deletion when available.
- [x] Re-list and re-read after deletion before reporting success.
- [x] Test that unrelated App data survives deletion and deleted projects cannot reload.
- [x] Sanitize export names.
- [x] Document the `storycore-harbour.project.v1` import contract.
- [ ] Test a real production APS write, read-back, reload, and induced overwrite conflict.
- [ ] Test production paginated delete-all and an induced deletion conflict.
- [ ] Add recent-project selection only if measured beta needs justify the complexity.

**Acceptance:** production reload restores the latest valid project; export passes the contract; overwrite and deletion conflicts preserve newer data; delete-all removes only StoryCore Harbour project records.

## HBR-006 — Review and launch package 🟡

- [x] Draft Marketplace tagline, descriptions, keywords, limits, screenshot captions, and prohibited claims.
- [x] Prepare an App privacy/data-handling draft.
- [x] Prepare reviewer functional/security/persistence/deletion instructions.
- [x] Prepare an external 10–20 participant beta protocol and exit gate.
- [x] Prepare a release-blocking launch checklist.
- [x] Provide an App icon.
- [x] Capture four deterministic fictional screenshot drafts in CI.
- [x] Obtain confirmation that Anna plans launch/growth initiatives while making no guaranteed placement claim.
- [ ] Confirm Anna screenshot dimensions and file limits.
- [ ] Record a short end-to-end demonstration.
- [ ] Run 10–20 external beta tests.
- [ ] Fix all P0/P1 defects and disposition P2 findings.
- [ ] Complete manual accessibility checks.
- [ ] Finalize publisher privacy/support details.
- [ ] Prepare immutable version `0.1.0`.
- [ ] Submit a first review after the authenticated core flow and APS checks are credible.
- [ ] Do not release until the owner reviews Anna's Developer Terms and revenue-share policy.

**Acceptance:** reviewer can reproduce a successful core run with no private setup and all real-platform, legal, accessibility, and beta gates pass.

## Outstanding Anna confirmations

Jiao is coordinating confirmed answers for:

- [ ] exact current Developer Terms text/link;
- [ ] detailed calculation of 70% of eligible usage profit, deductions, payment threshold, and schedule;
- [ ] how Qualified App MAU and Qualified Runs are displayed in the Developer Console.

These do not block continued development or a first review, but they remain release/business gates.

## Codex resume rule

1. Inspect the latest `StoryCore Harbour CI` and Sonar results on draft PR #30.
2. Read `acceptance/README.md` before operating the real collector.
3. Do not accept legal terms, claim identities, or operate the owner's Anna account without an authenticated owner-controlled session.
4. Do not run the twenty-prompt collector without an authenticated test account, enabled model, sufficient quota, and explicit human confirmation in the UI.
5. Evaluate the resulting local JSONL; do not commit or paste it into the PR.
6. Make reliability changes only from measured prompt IDs and privacy-safe validation categories, not by weakening the contract or replacing difficult corpus entries.
7. If a gate turns red, fix only that Harbour gate before doing new product work.
8. Do not add an Executa, backend, GPU service, image generation, video generation, ComfyUI, or Blender merely to bypass the authenticated platform gate.

## Optional after 0.1

- field-level editing;
- optional Anna image keyframes;
- direct StoryCore Desktop import;
- multilingual prompt templates;
- collaboration;
- Executa-backed deterministic continuity engine.

These are outside the initial mission unless explicitly promoted.
