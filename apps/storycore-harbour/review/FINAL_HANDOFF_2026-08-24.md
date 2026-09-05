# Anna opportunity final handoff — 24 August 2026

Updated with verified remote state on 28 August 2026.

This document records the verified draft state. It is not authorization to cut a version, submit a review, publish, accept new terms, or spend additional model quota.

## StoryCore Harbour

### Local candidate

- branch: `codex/anna-mvp-20260824`;
- latest integration commit at this handoff refresh: `03c2c54b`;
- GitHub branch `agent/storycore-harbour-bootstrap` is synchronized through draft PR #37 without force-push; PR #30 and PR #36 are merged, while PR #37 remains open, green, and unmerged;
- core StoryCore Engine checkout was not merged, reset, cleaned, or overwritten;
- Anna adapter remains isolated under `apps/storycore-harbour/`;
- automated gate: 66/66 Node tests, sample contract, mock fixture, fixed corpus, bundle synchronization, strict Anna validation, GitHub Anna CI, and SonarQube pass.

### Anna draft

- public identity: `@storycore-labs/storycore-harbour`;
- server App id: `214`;
- working revision: `10`;
- content hash: `7d3edf2a89b942055c4af9d53b7dcfb6de1777e0437b27711b05bef09e2049b9`;
- bundle: 15 files, 104,031 bytes, `ready`;
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
- valid projects: 16/20, target 18/20 — **FAIL**;
- median successful duration: 51.46 seconds;
- p95 successful duration: 90.94 seconds;
- repaired passes: 11;
- failures: A02/A07/A15/A18, all `json_invalid`;
- timeouts: 0.

The duration-normalization, reset/restore, and bounded JSON recovery fixes are included in draft revision 7. The latest complete rerun confirms that A09, A10, A12, and A19 now pass. Four different prompts still produced unusable JSON even after the former bounded repair path, so the measured candidate remains below its own readiness threshold.

Post-run harness metadata showed that all four remaining failures exhausted the
4,096-token MiniMax M3/OpenRouter allowance on both primary and repair calls.
The repair path also omitted the source input and quoted the partial output,
which could yield a structurally valid but semantically unrelated project.
The local candidate now rebuilds repairs from the exact source input and
validation errors while discarding the partial response. This change passes
61/61 tests, strict Anna validation, and both Edge browser smokes. It is
included in Anna draft revision 7.

That post-fix pilot has now been measured on A02/A07/A15/A18: 0/4 passed.
Every repair carried the exact source input and excluded the previous response,
confirming the semantic fix was active. Seven of eight MiniMax M3/OpenRouter
calls nevertheless exhausted the 4,096-token cap and returned incomplete or
empty visible JSON. Do not fund another full corpus on this same Host-model
configuration; first verify a different user-enabled model or a documented
App-level preference mechanism.

That preference mechanism is now verified. An advisory `gemma` hint selected
`gemma-4-E4B-it` through Runpod. A02 passed after repair in 41.5 seconds; the
four-case A02/A07/A15/A18 pilot then passed 3/4 with complete responses, versus
0/4 on MiniMax. The Anna adapter now offers the same optional validated hint
to users while leaving the field blank by default. Anna may still fall back
when a hinted model is not enabled. The local change passes 65/65 tests, strict
validation, and both Edge browser smokes; it is included in draft revision 9.

The complete fixed corpus was then run with the user preference `gemma`.
Result: 14/20, median 21.67 seconds, p95 39.78 seconds, and 6 repaired passes.
Gemma eliminated truncation and was faster, but six projects failed schema or
reference validation. Preserve both profiles in reporting: Anna default 16/20;
Gemma preference 14/20. Neither reaches the 18/20 gate.

Exact local replay of the private A02 and A10 outputs confirms two safe aliases:
warning `sceneId: "null"` and severity `minor`. They now canonicalize to `null`
and `info`, making those exact projects valid and projecting Gemma to 16/20.
This is not a measured rerun. A06/A09/A11 remain malformed JSON and A19 lacks
the required production bible, characters, locations, and scenes.

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

Do not cut `0.1.0`, submit for review, mark PR #37 ready, merge, or release while the official gate remains below 18/20. The latest measured Gemma run is 15/20 and the latest Anna-default run is 6/20. The App is demonstrable and its working draft is reserved, but it is not submission-ready under the repository's own rules.

The owner-authorized 2026-08-31 Gemma rerun after the schema-complete repair
also measured 15/20 (median 23.90 seconds, p95 44.00 seconds, 7 repaired
passes). A01 failed at transport; A06/A08/A15/A20 returned complete but
syntactically invalid JSON. This supersedes the 27 August Gemma run as the
latest real evidence without changing the submission decision.

### Anna installation diagnosis

- Developer Console shows the working draft as `v0.0.0`, `WORKING`, and `Unpublished`;
- clicking Install reports `App 暂无可用发布版本` (no available published version);
- the draft has zero immutable versions, so the current Install path has no version to install;
- cutting `0.1.0` would create that immutable version but must not be used as a workaround while the 18/20 reliability gate still fails;
- the Console web session also expired on reload and redirected to login, which is a separate authentication condition rather than the original installation cause.

Update from 2026-08-29: the current Console now exposes a separate **Install &
test** button inside the working-draft Versions tab at revision 12, while CLI
status still reports zero immutable versions. This may provide a draft-testing
path without cutting `0.1.0`, but it was not clicked because installation and
permission prompts require explicit owner approval. **View manifest** returned
`Could not validate credentials`; therefore the web-session credential path
must be healthy before any installation result can be claimed.

Second update from 2026-08-29: after reauthentication, **View manifest** works
and matches the committed Host-API-only boundaries. Installed Apps already
contains StoryCore Harbour as `v0.0.0-dev`, so another installation was not
attempted. Its Permissions panel fails with `App version not found`, while CLI
status still confirms zero immutable versions. The current blocker is therefore
permission resolution for the existing development installation, not absence
of an Installed Apps record. See `ANNA_DEV_INSTALL_PERMISSIONS_REPORT.md`.

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

1. Decide whether to fund another complete StoryCore corpus only after a measured fix for the four remaining `json_invalid` cases.
2. Complete manual NVDA/VoiceOver, high-contrast/zoom, and external beta gates.
3. Review final Anna legal, revenue-share, payout, qualified-usage, privacy, and support terms.
4. Review GitHub feedback on PR #30 and the AIMesher branch. Both branches are pushed; no merge or AIMesher PR was created by this handoff.
5. Separately authorize any immutable version cut, App Review submission, merge, or public release.
