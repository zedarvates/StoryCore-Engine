# Anna opportunity final handoff — 24 August 2026

This document records the verified draft state. It is not authorization to cut a version, submit a review, publish, accept new terms, or spend additional model quota.

## StoryCore Harbour

### Local candidate

- branch: `codex/anna-mvp-20260824`;
- latest integration commit before this handoff refresh: `ec2d9da7`;
- core StoryCore Engine checkout was not merged, reset, cleaned, or overwritten;
- Anna adapter remains isolated under `apps/storycore-harbour/`;
- automated gate: 55/55 Node tests, sample contract, mock fixture, fixed corpus, bundle synchronization, and strict Anna validation pass.

### Anna draft

- public identity: `@storycore-labs/storycore-harbour`;
- server App id: `214`;
- working revision: `5`;
- content hash: `f72337ebb59c78aa4d7d97791bba6a4f760b55a7e47297c4e71f3e3b2b3f626f`;
- bundle: 12 files, 99,496 bytes, `ready`;
- status: `draft`, not published;
- immutable versions: 0;
- Executas/local shims: 0.

### Proven real workflow

- owner account and CLI authorization completed;
- real Host LLM session mint succeeded;
- one fictional project generated and contract-validated after one repair;
- production APS snapshot and `projects/current` write/read-back succeeded;
- a fresh App session reloaded and revalidated the project;
- private export passed the canonical validator.
- starting another project clears prior form/generated content and restores defaults/focus;
- a subsequent explicit load restores and revalidates the saved project.

### Latest official reliability result

- fixed corpus: 20/20 prompts executed;
- valid projects: 12/20, target 18/20 — **FAIL**;
- median successful duration: 30.54 seconds;
- p95 successful duration: 121.17 seconds;
- repaired passes: 8;
- failures: four timeout and four contract;
- private result: `acceptance/results.rerun.local.jsonl` (ignored, never publish).

The duration-normalization and reset/restore fixes are included in draft revision 5 but landed after the 12/20 rerun. They have automated coverage and have not been remeasured by another complete real corpus. The 12/20 result therefore remains the only valid readiness score.

### Submission decision

Do not cut `0.1.0`, submit for review, mark PR #30 ready, merge, or release while the official gate remains below 18/20. The App is demonstrable and its working draft is reserved, but it is not submission-ready under the repository's own rules.

## AIMesher Anna App

### Local candidate

- worktree: `F:\AIMesher-anna-app`;
- branch: `codex/aimesher-anna-app`;
- latest local commit at handoff creation: `7a47169` plus the existing browser-demo commits;
- original dirty `F:\AIMesher` checkout and closed-beta API surfaces were not modified;
- automated gate: 8/8 Node tests, mock fixture, syntax, and strict Anna validation pass;
- Edge smoke: form validation, Host mock completion, 2 canonical patches, dimension confidence 0.65, and validated export pass.

### Anna draft

- public identity: `@storycore-labs/aimesher`;
- server App id: `217`;
- working revision: `1`;
- content hash: `eb2c22d6eb13db7374111549b8fe9e75eb64f705bdb6b51f6c11522bf298eb60`;
- bundle: 6 files, 14,641 bytes, `ready`;
- status: `draft`, not published;
- immutable versions: 0;
- Executas/local shims: 0.

The separate draft `executa-tool-dev-aimesher-patch-surgeon` (App id `215`) remains distinct and was not modified.

### Remaining AIMesher gates

- one owner-consented real-model project;
- App-scoped persistence only if measured product need justifies it;
- fixed reliability corpus;
- runtime-neutral importer into AIMesher's canonical patch/scene contracts;
- explicit architecture decision before combining the App with Patch Surgeon or any beta API;
- no billing/provider secret/GPU dependency in the core planning path.

## Owner-only actions remaining

1. Decide whether to fund another complete StoryCore corpus after additional measured reliability work.
2. Complete manual NVDA/VoiceOver, high-contrast/zoom, and external beta gates.
3. Review final Anna legal, revenue-share, payout, qualified-usage, privacy, and support terms.
4. Decide whether to push the local StoryCore and AIMesher branches to GitHub. StoryCore now contains the concurrent PR commits and is fast-forwardable onto PR #30; no repository push was performed by this handoff.
5. Separately authorize any immutable version cut, App Review submission, merge, or public release.
