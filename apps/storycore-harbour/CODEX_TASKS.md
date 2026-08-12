# Codex work plan

Complete tasks in order. Do not start an optional phase until the previous gate passes.

## HBR-000 — Repository orientation

- Read all mission files.
- Inspect the latest official Anna Markdown documentation and current CLI version.
- Inspect `scripts/run_e2e_demo.py` and relevant StoryCore contracts read-only.
- Record any documentation drift in `DECISIONS.md`.

**Gate:** no code change outside this directory.

## HBR-001 — Validate the bootstrap

- Install dependencies with Node.js 22+.
- Run `npm test`.
- Run `npm run contract:check`.
- Run `npm run validate -- --strict`.
- Correct manifest or SDK drift without adding an Executa.
- Confirm `npm run dev:mock` opens the App and completes the fixture flow.

**Acceptance:** tests and strict Anna validation pass.

## HBR-002 — Harden the project contract

- Replace the lightweight runtime checks with complete validation generated from or aligned with `contracts/project.schema.json`.
- Add reference-integrity checks:
  - every scene location exists;
  - every scene character exists;
  - every shot character exists;
  - scene and shot IDs are unique;
  - durations are consistent.
- Add at least ten failing contract fixtures.

**Acceptance:** invalid references and malformed model output cannot be saved.

## HBR-003 — Generation reliability

- Refine the bounded system prompt.
- Add explicit input-size limits.
- Normalize response extraction across supported MCP result shapes.
- Add exactly one repair attempt.
- Classify Anna errors by stable error name.
- Add timeout and duplicate-submit protection.
- Add acceptance prompts for all supported formats and English/French outputs.

**Acceptance:** at least 18 of 20 fixed acceptance prompts produce valid projects in the selected real Anna test account.

## HBR-004 — Complete the four-step UI

- Finish responsive cards and scene navigation.
- Add keyboard navigation and `aria-live` status.
- Add empty, loading, retry, quota, permission, and provider-error states.
- Ensure no untrusted HTML injection.
- Add reduced-motion support.
- Test at the manifest minimum size.

**Acceptance:** a first-time tester can finish the flow without guidance.

## HBR-005 — Persistence and export

- Save only validated projects.
- Read back and revalidate after save.
- Add optimistic concurrency handling for the current-project key.
- Add recent-project selection only if it remains simple and reliable.
- Sanitize export names.
- Document the `storycore-harbour.project.v1` import contract.

**Acceptance:** reload restores the latest valid project; exported JSON passes `npm run contract:check -- <file>`.

## HBR-006 — Review and launch package

- Create marketplace copy, icon, screenshots, privacy notes, and reviewer test instructions.
- Record a short end-to-end demonstration.
- Run 10–20 external beta tests.
- Fix all P0/P1 defects.
- Prepare immutable version `0.1.0`.
- Do not release until the owner reviews Anna's Developer Terms and revenue-share policy.

**Acceptance:** reviewer can reproduce a successful core run with no private setup.

## Optional after 0.1

- field-level editing;
- optional Anna image keyframes;
- direct StoryCore Desktop import;
- multilingual prompt templates;
- collaboration;
- Executa-backed deterministic continuity engine.

These are outside the initial mission unless explicitly promoted.
