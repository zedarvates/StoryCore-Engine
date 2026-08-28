# Current status

Updated: 2026-08-23

Final owner handoff: `review/FINAL_HANDOFF_2026-08-24.md`.

GitHub branch `agent/storycore-harbour-bootstrap` is synchronized through PR #30; the PR remains draft and unmerged.

## Submission-focused roadmap

The current priority split is maintained in `review/MVP_ROADMAP_2026-08-24.md`:

- **completed:** deterministic end-to-end MVP, validated export, isolated Anna adapter, automated gates, and five-minute demo package;
- **remaining before submission:** authenticated real-model and production-storage evidence, owner account/legal actions, manual accessibility, external beta, and final Marketplace assets;
- **after submission:** field editing, recent-project selection, StoryCore Desktop import, and optional media enhancements.

## Completed

### Product and repository bootstrap

- product name and boundary selected;
- strategic exchange opened with Anna;
- isolated feature branch and draft PR created;
- schema 2 manifest created with no Executa;
- static four-step UI created;
- Host LLM call and one bounded repair attempt implemented;
- App-scope persistence, verified read-back, JSON export, and delete-all UX implemented;
- Codex mission, architecture, decisions, stop gates, review package, and numbered work plan created.

### HBR-001 — Bootstrap validation

- Node.js syntax checks pass;
- sample StoryCore Harbour export validates;
- mock LLM response validates against the project contract;
- `anna-app validate --strict` passes with exact `@anna-ai/cli` 0.1.30;
- the official Anna mock harness starts and responds on port 5180;
- dedicated path-scoped GitHub Actions CI is in place.

### HBR-002 — Contract and security hardening

- one canonical executable contract is shared by the browser App and Node tooling;
- project identity, formats, lengths, dates, production bible, visual direction, references, ordering, durations, and continuity are validated;
- invalid projects cannot be rendered, saved, loaded, exported, or treated as successful;
- storage overwrites and deletion use opaque ETags when available;
- saved data is read back and revalidated;
- CLI file arguments are confined to existing files inside `apps/storycore-harbour/` with explicit extension allow-lists;
- evaluator output strips model-derived validation text and unknown identifiers;
- generated content is rendered as text rather than untrusted HTML;
- optional JSON fences and one complete object surrounded by prose use bounded manual parsing rather than a backtracking regex; truncated or multiple objects remain rejected;
- the SonarQube Cloud Quality Gate passes with zero new issues, zero accepted issues, zero security hotspots, and zero annotations.

### HBR-003 — Reliability infrastructure implemented

- bounded input and model-response lengths;
- MCP-shaped completion response extraction;
- JSON-only system contract;
- exactly one repair attempt, recorded in project metadata;
- finite 180-second host-call timeout;
- duplicate-submit protection;
- stable user-facing categories for quota, permission, provider, timeout, storage, and concurrency errors;
- supplied working title preserved exactly;
- immutable twenty-prompt corpus covering all six formats;
- exactly ten English and ten French prompts;
- deterministic evaluator for contract success, input preservation, latency, repair use, missing/duplicate results, and stable failure categories;
- hidden real-Anna collector activated only by `?acceptance=1`;
- explicit confirmation required before consuming model quota and writing test projects;
- safe stop between prompts and local JSONL download;
- official `mountBundle` tests verify declared LLM/storage/window grants and rejection of undeclared tool invocation.

### HBR-004 — Automated UI and accessibility gates

- responsive four-step interface validated at the manifest minimum size of 520 × 680;
- no horizontal overflow in the complete browser flow;
- tab/tablist/tabpanel semantics for Concept, World, Scenes, and Continuity;
- Arrow, Home, and End keyboard navigation across enabled steps;
- focus moves to local form errors and each newly active panel heading;
- runtime, loading, save, validation, deletion, and fatal states use live announcements;
- visible deletion labels and dynamic accessible names match exactly;
- reduced-motion preference is honored;
- browser test completes local validation, mock generation, save/read-back, rendering, keyboard navigation, continuity, and JSON export;
- starting another project clears the prior form and generated creative content, restores defaults, and focuses the new concept field;
- the browser flow restores the latest saved project after that reset and revalidates its rendered content;
- a separate browser test verifies paginated project listing, ETag-protected deletion, preservation of unrelated App data, form clearing, and failed reload after deletion;
- the minimum-width browser gate now verifies 400% text reflow without horizontal page overflow.

The browser tests use deterministic storage adapters only because CLI 0.1.30's `--mock-llm` dashboard does not round-trip its documented WindowStore values. Production code still calls Anna storage directly; production APS remains a separate authenticated gate.

### HBR-006 — Review-package drafts

- Marketplace tagline, descriptions, keywords, limits, screenshot captions, and prohibited claims;
- privacy and data-handling draft;
- Marketplace reviewer functional, accessibility, security, persistence, deletion, and export guide;
- external beta protocol for 10–20 independent participants;
- release-blocking launch checklist;
- four deterministic fictional Marketplace screenshot drafts generated by CI;
- existing App icon retained.

### Five-minute deterministic demonstration

- committed example concept in `demo/concept.json`;
- exact Windows procedure and presenter script in `demo/README.md`;
- real browser flow writes four screenshots and the validated export to ignored local artifacts;
- export artifact is revalidated before it is persisted by the demo harness;
- submission brief separates product value, screenshot needs, limits, next steps, and owner-only actions.

### Anna confirmations received on 2026-08-13

- a Host-API-only Schema 2 App can qualify without a local Executa/runtime;
- Executa is an extension point rather than a requirement;
- developer activation is self-service and instant after account creation, email verification, Developer ToS acceptance, and Developer Console activation;
- developer handles and App slugs are first-come-first-served and lock when claimed/created;
- launch/growth support initiatives are planned for strong Apps, but no specific placement is guaranteed;
- the first App Review submission may be made when the core workflow works end-to-end; it does not need to be perfect before Anna's first look.

## Owner action required now

These steps require an authenticated owner session and cannot be performed safely by repository automation:

1. create or sign in to the Anna account;
2. verify the email address;
3. read and accept the Developer ToS;
4. activate the developer profile in the Developer Console;
5. claim the developer handle `storycore-labs` immediately if available;
6. create the `storycore-harbour` App draft immediately if available;
7. provide the authenticated development/review URL or local environment needed for the real corpus and APS tests.

Because the handle and slug are first-come-first-served, steps 5 and 6 are time-sensitive.

## In progress

### HBR-003 — Authenticated real-model gate

Remaining work:

- run the twenty-prompt collector against at least one enabled model;
- evaluate the downloaded JSONL locally;
- reach at least 18/20 valid projects without manual intervention;
- keep median successful completion time at or below 180 seconds;
- tune scene/shot counts or prompts only from measured failures;
- rerun the complete corpus after every reliability change.

### HBR-004 — Human accessibility and usability gates

Remaining work:

- manual NVDA pass on Windows;
- manual VoiceOver pass on macOS;
- manual 200%/400% zoom and forced/high-contrast checks;
- first-time-user confirmation through the external beta.

Automated Edge/Windows evidence on 2026-08-13 found a horizontal reflow defect
at 400% text scaling in the 520px minimum view. The responsive CSS was narrowed
to fix intrinsic grid/flex widths, structural spacing, header stacking, step
wrapping, and action stacking. A repeat measurement kept the document and
active panel at 520px with no horizontal page overflow at 100%, 200%, or 400%.
This is automated proxy evidence only and does not close the manual zoom,
screen-reader, real Anna WebView, or forced-colours gates.

### HBR-005 — Production APS verification

Remaining work:

- verify real production App storage write and read-back;
- reload a saved project in a new App session;
- induce an ETag overwrite conflict and confirm that newer data is preserved;
- verify paginated delete-all on production APS;
- induce an ETag deletion conflict and confirm that nothing is force-deleted.

### HBR-006 — Final Marketplace assets and first review

Remaining work:

- confirm Anna's screenshot dimensions and file limits;
- replace draft screenshots only if Anna requires a different specification;
- record a short demonstration;
- run the external beta and resolve all P0/P1 defects;
- finalize publisher privacy/support details and immutable 0.1.0 package;
- submit a first review once the authenticated core run and APS checks are credible.

## Latest automated implementation gate

The last committed CI baseline remains commit `afcebcb575bd223840a8c695ca8ed1808a9cbb6d`:

- StoryCore Harbour CI run 90;
- all 42 Node tests;
- sample export validation;
- mock LLM response validation;
- immutable acceptance corpus and generated-bundle synchronization;
- strict Anna manifest validation;
- full Chromium generation/export flow at 520 × 680;
- full Chromium paginated/ETag deletion flow;
- four deterministic Marketplace screenshot drafts;
- SonarQube Cloud Quality Gate with zero annotations.

The 2026-08-23 local continuation adds two demo-artifact tests and a persisted-export browser artifact. Its fresh local verification evidence is recorded in `review/MVP_ROADMAP_2026-08-24.md`; CI evidence remains pending until these changes are pushed by the owner.

## Still externally unverified or pending

- real Anna production Host API handshake;
- real-model completion success rate and latency;
- production APS write/read/reload and conflict behavior;
- production paginated deletion and deletion-conflict behavior;
- exact Developer Terms text/link;
- detailed definition and calculation of 70% of eligible usage profit, including deductions, threshold, and payment schedule;
- how Qualified App MAU and Qualified Runs are surfaced in the Developer Console;
- actual availability and successful claim of `storycore-labs` and `storycore-harbour`;
- exact Marketplace screenshot requirements and finalized launch-support channels.

## Latest owner-environment preflight — 2026-08-13

- Node.js, npm, `uv`, and the pinned `anna-app` 0.1.30 CLI are installed;
- all local repository checks remain green;
- `anna-app whoami --json` reports no saved account;
- `apps push --dry-run --json` therefore stops before remote identity resolution
  with no PAT configured;
- the Windows development-key ACL includes inherited read access for a
  non-owner local group, so it has not been approved for authenticated use;
- no credential, ACL, developer handle, App slug, remote draft, model quota, or
  production APS record was changed.

The next owner gate is to review and restrict the local key ACL, complete the
Developer Console/ToS steps, and authenticate the intended account. The
repository must then re-run `whoami`, the App push dry-run, and the immutable
real-model/APS gates. CLI 0.1.30's raw `0666` key-mode result is separately
documented as a Windows portability defect and is not, by itself, an ACL audit.

## Codex resume point

```bash
git fetch origin
git switch agent/storycore-harbour-bootstrap
cd apps/storycore-harbour
npm install
npm run check
npm run dev:mock
```

Then read `AGENTS.md`, `CODEX_ENTRYPOINT.md`, `CODEX_TASKS.md`, `acceptance/README.md`, and `review/LAUNCH_CHECKLIST.md`.

Codex must inspect the latest CI and Sonar results first. The next legitimate implementation work requires an authenticated Anna environment and explicit human consent before spending model quota or altering production APS. It must not add an Executa, backend, GPU service, image/video generation, ComfyUI, or Blender merely to avoid the real-platform gate.

## Real Anna continuation — 2026-08-23

- Developer access activated by the owner; public handle `storycore-labs` confirmed.
- CLI device authorization completed; local PAT lifetime reported as 90 days.
- Working draft created as `@storycore-labs/storycore-harbour`, server App id `214`, then updated to revision `6` with the compact prompt, connected/bounded acceptance mode, privacy-safe diagnostics, deterministic warning/duration normalization, verified new-project reset/restore, and bounded JSON recovery; status remains `draft`.
- Revision 6 static bundle uploaded successfully: 13 files, 101,041 bytes, bundle status `ready`; no Executa or local shim installed.
- No immutable version, review submission, or public release was created.
- Server listing category changed from locally accepted `creative-tools` to server-supported `creative`.
- CLI 0.1.30 lifecycle calls hit a Windows/libuv assertion under Node 24.13.0; the same dry-run and push completed under Node 22.23.2.
- Real harness connected with the declared LLM, storage, and window scopes.
- Production APS `storage.get(projects/current)` passed and returned `exists: false`; no project record existed or was written.
- A `kind=complete` developer session minted successfully (`HTTP 200`), proving PAT, handle, App slug, and session authorization.
- The first fictional `llm.complete` request failed at transport with `fetch failed` before parse, repair, or storage. No successful project and no acceptance score can be claimed.
- Current official Anna documentation states that Host LLM completion selects only among providers the user has enabled. Confirm an enabled provider/model in the owner account before requesting consent for one retry.
- A second owner-consented attempt reached the real model. Both the primary response and the single repair used MiniMax M3 through OpenRouter, each reached the 4,096-output-token cap, and each ended as truncated JSON. The App rejected both and wrote no project.
- Changing the model shown in the Anna chat UI to Gemma did not change the model used by Host App completion; the real response metadata still identified MiniMax M3/OpenRouter.
- The generation and repair prompts now require a compact result below 12,000 characters: exactly three scenes, one shot per scene, bounded characters/locations, and bounded prose. Local 60-test, contract, fixture, corpus, synchronization, and strict-validation gates pass.
- The owner-consented compact retry succeeded. The primary MiniMax M3/OpenRouter response completed in 1,860 output tokens; one bounded repair normalized contract-invalid warning severities and produced a valid project.
- The validated project contains 2 characters, 3 locations, 3 scenes, 3 shots, continuity score 94, and `repairUsed: true`.
- Production APS wrote the snapshot and `projects/current`, returned generation `1` and a 7,566-byte current record, then passed immediate read-back validation.
- A separate fresh App session loaded `projects/current`, revalidated it, and rendered the expected title, characters, and locations.
- The APS value was exported locally to ignored `acceptance/results.real-project.json` and passed the canonical CLI contract validator.
- The Anna chat model selector showed Gemma after the owner changed it, but Host App completion continued to report MiniMax M3/OpenRouter. Do not treat the chat selector as the App default-model control.
- The normal-project prerequisite for the twenty-prompt corpus is now satisfied. The corpus still requires separate owner consent for 20 primary calls, up to 20 repairs, and APS writes.
- The owner consented and the complete immutable corpus ran through the connected harness. Result: 6/20 PASS versus target 18/20; median successful duration 27.18 seconds, p95 63.32 seconds, 5 repaired passes, 11 contract failures, and 3 timeouts. `Acceptance gate: FAIL`.
- The private 20-line JSONL is stored only at ignored `acceptance/results.local.jsonl`. The first direct-iframe attempt produced local-preview failures and was excluded; the valid run used the connected dashboard at `/?acceptance=1`.
- Known model warning severities now normalize deterministically (`low→info`, `medium→warning`, `high→error`) before validation; unknown values remain rejected. This targets the exact real-project repair observed without weakening the canonical contract.
- Future collector failures now record privacy-safe stable names such as `json_invalid`, `reference_invalid`, `duration_invalid`, and `required_field_invalid`; unrecognized details collapse to `contract_invalid` and generated text is never persisted in the failure name.
- Loopback-only `acceptance_ids` supports bounded diagnostic subsets without editing the immutable corpus; subset results are explicitly labelled non-official and cannot replace the twenty-prompt score.
- Scene totals outside the existing contract bounds now normalize proportionally to the user-requested duration; already-plausible plans remain unchanged at the scene-duration fields. This targets the measured A19 `duration_invalid` failure without relaxing validation.
- Owner-consented diagnostic pilot HBR-A01/A02/A05 passed 3/3 after the targeted fixes. All three projects passed the canonical contract and input-preservation checks; median duration was 43.68 seconds, A01/A02 used repair, and A05 passed directly. Private output remains ignored at `acceptance/results.diagnostic.local.jsonl`.
- The owner-consented complete rerun improved the official result from 6/20 to 12/20, with median 30.54 seconds, p95 121.17 seconds, and 8 repaired passes. It remains `Acceptance gate: FAIL` against the 18/20 target.
- Rerun failures are privacy-safe and actionable: A01/A07/A13/A17 timeout, A12 `json_invalid`, A19 `duration_invalid`, and A09/A10 `contract_invalid`. Private output remains ignored at `acceptance/results.rerun.local.jsonl`.
- Bounded JSON recovery now targets A12 by accepting exactly one complete object surrounded by model prose while rejecting truncated, ambiguous, oversized, or multiple objects. This has local/browser coverage and has not yet been remeasured by a complete real corpus.
- Owner-consented A09/A10/A12/A19 pilot: A09 passed directly in 36.77 seconds; A10 passed after repair in 40.57 seconds; A12 passed after repair in 75.74 seconds; A19 no longer failed duration validation but timed out at 144.66 seconds. All three successful projects passed canonical validation and input-preservation checks.
- Private pilot output remains ignored at `acceptance/results.contract-pilot.local.jsonl`. The official readiness result remains 12/20 until a complete rerun.
- Provider neutrality is explicit: Host LLM calls omit `modelPreferences` and use Anna's per-user enabled model configuration. StoryCore supplies no provider key or subscription. The dashboard chat selector is not treated as an App selector because changing it to Gemma did not change the measured Host App model metadata.
- Timeout diagnosis: the four official rerun timeouts returned between 125.1 and 126.0 seconds, before StoryCore's 180-second Host call and 190-second collector deadlines. A19 later timed out at 144.66 seconds. This is variable upstream/provider behavior, so increasing local deadlines or forcing a model is not justified by the evidence.
- A third owner-consented complete corpus run finished at 16/20, improving the official score from 12/20 but remaining below the 18/20 gate. Median successful duration was 51.46 seconds, p95 was 90.94 seconds, and 11 successful projects used repair. There were no timeouts; A02/A07/A15/A18 failed as `json_invalid`.
- Anna Developer Console reproduced the installation blocker on the zero-version draft: StoryCore Harbour appeared as `v0.0.0`, `WORKING`, and `Unpublished`; Install returned `App 暂无可用发布版本` (no available published version). The visible Install action therefore cannot install the mutable working draft while the App has zero immutable versions.
- The authenticated web session separately expired on reload and redirected to `/login?redirect=/developer`; this explains the detail-page `Could not validate credentials` state but is distinct from the zero-version Install error.
- Private harness metadata identified the common JSON failure: every A02/A07/A15/A18 primary and repair response reported MiniMax M3/OpenRouter at the exact 4,096-token cap and ended with incomplete visible JSON. The old repair prompt also omitted the original input and carried the truncated response, allowing a structurally valid but semantically unrelated repair.
- Repair now rebuilds from the exact normalized source input and validation errors without including the previous response. Automated gates pass: 61/61 Node tests, strict Anna validation, Edge end-to-end smoke, and Edge deletion/storage-preservation smoke.
- Owner-consented post-fix A02/A07/A15/A18 pilot finished 0/4. The intended prompt change was observed on every repair (`exactInput: true`, no previous response), but 7 of 8 MiniMax M3/OpenRouter calls still exhausted 4,096 output tokens and returned incomplete or empty visible JSON. A02's primary response completed below the cap but failed the contract; its repair then exhausted the cap.
- The remaining reliability blocker is architectural at the current Host-model boundary: the Host cap cannot be raised by this App, provider/model forcing would violate the per-user model decision, and another parser/prompt workaround is not justified after three measured fix cycles. A different enabled model or a documented App-level preference control is required before another corpus has evidentiary value.
- A loopback-only `gemma` hint proved Anna's documented model preference path: A02 passed after repair in 41.5 seconds using `gemma-4-E4B-it`/Runpod at roughly 1,500 output tokens per call. The four-case Gemma pilot passed A02/A07 directly and A15 after repair; A18 remained contract-invalid. Result: 3/4 versus 0/4 on MiniMax, with every Gemma response complete.
- The Anna adapter now exposes an optional user-entered model preference. Blank or invalid values preserve the Anna default; valid hints are advisory and only match models already enabled for that user. Normal StoryCore data and provider credentials remain unaffected. Automated gates pass: 65/65 Node tests, strict validation, Edge end-to-end smoke, and Edge deletion/storage-preservation smoke.
- The complete fixed corpus with user preference `gemma` finished at 14/20: median 21.67 seconds, p95 39.78 seconds, 6 repaired passes, and no JSON truncation. Failures were A02 `reference_invalid`, A06/A09/A11 `contract_invalid`, A10 `warning_severity_invalid`, and A19 `required_field_invalid`.
- Exact private-output replay identified two bounded schema aliases: A02 used warning `sceneId: "null"`; A10 used severity `minor`. Both now normalize to canonical `null` and `info`, and their exact real outputs pass the validator locally. This projects Gemma to 16/20 but does not replace the measured 14/20 score. Three malformed JSON responses and one structurally empty project remain rejected.
- A loopback-only cross-model experiment kept Anna default for primary generation and hinted Gemma only for the single repair. It passed A02/A15 directly but failed A07 (`contract_invalid`) and A18 (`unknown`): 2/4, worse than Gemma-only 3/4. The uncommitted experiment was removed; production retains one user-selected preference for both calls.
- A fresh Gemma A06 reproduction ruled out a bounded syntax-only repair. The primary output was missing one final brace, but appending it still left characters, locations, scenes, score, and warnings absent. The model repair was valid JSON yet again omitted the production bible and all core arrays. Parser recovery must remain fail-closed because required creative structure cannot be inferred safely.
- A single A06 diagnostic using Anna's documented example hint `gpt-4o` produced no completion or model metadata. The UI recorded timeout while the harness request remained pending for more than six minutes and only window heartbeats continued. The server was stopped to terminate the orphaned request; do not retry this hint until Anna exposes model grants or fixes cancellation/deadline propagation.
- Reliability evidence is now a two-profile matrix: Anna default 16/20; Gemma preference 14/20. Both fail the 18/20 gate. No readiness, version cut, review, or release claim is permitted.
- An owner-authorized complete corpus rerun on 2026-08-27 used Anna default `minimax/minimax-m3` through OpenRouter and regressed to 6/20. Median successful duration was 49.13 seconds, p95 was 57.87 seconds, and 2 successful projects used repair. Privacy-safe failures were eight `json_invalid`, five `contract_invalid`, and one timeout. The complete private result remains ignored at `acceptance/results.2026-08-27.local.jsonl`. This stochastic regression does not justify weakening the contract or cutting a version; it reinforces the unresolved default-model reliability blocker.
- A second owner-authorized complete corpus rerun on 2026-08-27 used the advisory `gemma` hint and finished at 15/20. Median successful duration was 21.91 seconds, p95 was 41.92 seconds, and 6 successful projects used repair. Privacy-safe failures were A07/A10/A12/A19 `contract_invalid` and A20 `required_field_invalid`; there were no timeouts or JSON truncations. The private result remains ignored at `acceptance/results.2026-08-27.gemma.local.jsonl`. This improves the measured Gemma profile from 14/20 to 15/20 but remains below the 18/20 gate, so no readiness, version cut, review submission, or release claim is permitted.
- Future acceptance runs now classify schema, timestamp, duplicate, ordering, continuity-score, structure, and parent-scene reference failures with stable privacy-safe names. Unknown validation details still collapse to `contract_invalid`; generated content and private identifiers are never persisted in the public result.
- The privacy-safe diagnostic update is synchronized to Anna working draft revision 10. The 15-file, 104,031-byte bundle is ready with content hash `7d3edf2a89b942055c4af9d53b7dcfb6de1777e0437b27711b05bef09e2049b9`. The App remains a mutable draft with zero immutable versions; this synchronization is not an installation, review, or release claim.
- Read-only `apps grants storycore-harbour --json` currently returns `grants: null`. In CLI 0.1.30 this specifically represents a 404 from the informational grants endpoint (`no grants endpoint data available`), not evidence that the declared Host APIs were denied. Prior authenticated Host calls remain the capability evidence; do not use this null result to claim either a grant or a denial.
- Fresh Edge verification on 2026-08-28 passed the 520 × 680 generation/export flow, keyboard navigation, focus management, reduced-motion context, 400% text reflow, project reset/restore, and contract-valid export. The deletion smoke also passed sequentially with two ETag deletions, paginated listing, unrelated-key preservation, and a not-found reload. A new `browser:check` script fixes the intended sequential order because both smokes share one mock fixture stream.
- Edge now emulates `forced-colors: active` during the browser smoke and verifies visible keyboard focus, a non-colour selected-step outline, fully opaque dashed disabled controls, and a solid error boundary. The App also supplies forced-colour treatments for warning/success/error deletion states, armed destructive actions, and the continuity score. This automated evidence reduces risk but does not replace the remaining human Windows High Contrast and screen-reader passes.
- The forced-colour fix is synchronized to Anna working draft revision 11. Its 15-file, 104,890-byte bundle is ready with content hash `c5ddb6b3a45b42cebb3ceed713f65121ba3efac9808fece05aa05ad6ce863a17`; the App still has zero immutable versions and remains unpublished.
