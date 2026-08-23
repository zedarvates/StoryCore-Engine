# Current status

Updated: 2026-08-23

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
- optional JSON fence handling uses bounded manual parsing rather than a backtracking regex;
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
- Working draft created as `@storycore-labs/storycore-harbour`, server App id `214`, then updated to revision `3` with the compact prompt, connected acceptance mode, and warning-severity normalization; status remains `draft`.
- Revision 3 static bundle uploaded successfully: 11 files, 94,677 bytes, bundle status `ready`; no Executa or local shim installed.
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
- The generation and repair prompts now require a compact result below 12,000 characters: exactly three scenes, one shot per scene, bounded characters/locations, and bounded prose. Local 51-test, contract, fixture, corpus, synchronization, and strict-validation gates pass.
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
