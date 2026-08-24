# Anna opportunity final handoff — 24 August 2026

This document records the verified draft state. It is not authorization to cut a version, submit a review, publish, accept new terms, or spend additional model quota.

## StoryCore Harbour

### Local candidate

- branch: `codex/anna-mvp-20260824`;
- latest integration commit before this handoff refresh: `ec2d9da7`;
- GitHub branch `agent/storycore-harbour-bootstrap` was updated through PR #30 without force-push; the PR remains draft and unmerged;
- core StoryCore Engine checkout was not merged, reset, cleaned, or overwritten;
- Anna adapter remains isolated under `apps/storycore-harbour/`;
- automated gate: 60/60 Node tests, sample contract, mock fixture, fixed corpus, bundle synchronization, and strict Anna validation pass.

### Anna draft

- public identity: `@storycore-labs/storycore-harbour`;
- server App id: `214`;
- working revision: `6`;
- content hash: `b52470ae269f2ee3ebeeaae4971ad511effd3db5a8834997276b17208429e846`;
- bundle: 13 files, 101,041 bytes, `ready`;
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

The duration-normalization, reset/restore, and bounded JSON recovery fixes are included in draft revision 6. A bounded real pilot remeasured the four contract failures: A09, A10, and A12 produced valid input-preserving projects; A19 no longer failed duration validation and instead timed out. The diagnostic result is 3/4, but the 12/20 complete rerun remains the only valid readiness score.

### User model boundary

- StoryCore Harbour does not embed a provider key, subscription, or forced model;
- Host LLM requests omit `modelPreferences`, so Anna selects among models enabled for the current user;
- the Anna chat model selector is not treated as an App model selector: changing it to Gemma did not change the real Host App metadata, which still reported MiniMax M3/OpenRouter;
- a documented future App-level picker may be added in the Anna adapter only, without changing the generic StoryCore data contract.

The four official timeout failures returned at 125.1–126.0 seconds, before the
App's 180-second Host LLM timeout and the collector's 190-second UI deadline.
A19 later reached 144.66 seconds in the pilot. The measured cutoff is upstream
and variable; increasing StoryCore's local deadlines would only delay feedback
without addressing the failure.

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
4. Review GitHub feedback on PR #30 and the AIMesher branch. Both branches are pushed; no merge or AIMesher PR was created by this handoff.
5. Separately authorize any immutable version cut, App Review submission, merge, or public release.
