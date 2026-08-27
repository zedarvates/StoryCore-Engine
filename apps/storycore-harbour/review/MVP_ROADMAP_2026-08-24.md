# StoryCore Harbour MVP roadmap — 24 August 2026

This roadmap distinguishes a demonstrable local MVP from an Anna submission or public release. Local mocks, browser automation, and contract validation do not prove real-model quality, production Anna storage, human accessibility, beta usability, or acceptance of Anna's terms.

## Completed

- Isolated Anna adapter under `apps/storycore-harbour/`; StoryCore Engine core remains unchanged.
- Concept input covering title, idea/script, format, duration, language, tone, and audience.
- One bounded Host LLM call plus at most one repair call.
- Versioned `storycore-harbour.project.v1` contract.
- Production bible, visual direction, characters, locations, ordered scenes, ordered shots, reusable prompts, and continuity report.
- Validated save, read-back, optimistic ETag overwrite handling, reload, delete-all, and filename-sanitized JSON export.
- Stable user-facing error categories for runtime, permission, quota, provider, timeout, parse, contract, storage, and concurrency failures.
- Fixed twenty-prompt English/French acceptance corpus and deterministic evaluator.
- Automated contract, evaluator, privacy, Host API ACL, browser, responsive-layout, export, and deletion gates.
- Reproducible deterministic demo under five minutes with committed input, four generated screenshots, exact validated JSON artifact, and presenter procedure.
- Draft Marketplace copy, privacy draft, reviewer guide, beta protocol, launch checklist, and submission brief.

## Remaining before Anna submission

### Owner and platform gates

- Owner reviews the current Developer Terms and decides whether to accept them.
- Owner activates/authenticates the intended Anna developer account.
- Owner claims `storycore-labs` and creates the `storycore-harbour` draft only if both identities remain available.
- Owner provides explicit consent and sufficient quota for the immutable twenty-prompt real-model run.
- Real-model evaluator reaches at least 18/20 valid projects with median successful completion at or below 180 seconds.
- Production Anna App storage proves write/read/reload, overwrite conflict, paginated delete-all, and deletion conflict behavior.

### Human and presentation gates

- Manual NVDA pass on Windows and VoiceOver pass on macOS.
- Manual 200%/400% zoom, forced-colours, and high-contrast checks.
- Ten to twenty external beta completions; all P0/P1 findings resolved.
- Anna screenshot dimensions/file limits confirmed and final fictional screenshots exported accordingly.
- Short end-to-end demonstration recorded.
- Publisher support/privacy contacts and effective dates finalized by the owner.

### Business gates before release

- Exact revenue-share calculation, deductions, threshold, currency, payout, tax/KYC, and schedule reviewed by the owner.
- Qualified App MAU and Qualified Run definitions and dashboard visibility confirmed.
- Brand/name clearance and any distribution, withdrawal, data-removal, exclusivity, or IP-transfer terms reviewed by the owner.

## Improvements after submission

- Field-level editing of bible, characters, locations, scenes, and shots.
- Recent-project selection beyond the current/latest project.
- Runtime-neutral StoryCore Desktop importer retaining Harbour provenance.
- Multilingual prompt templates beyond English and French.
- Collaboration features.
- Optional image keyframes or deterministic Executa helpers only after measured demand and a separate architecture decision.
- Visual polish informed by beta findings; no broad redesign before the submission gates.

## Local verification record — 23 August 2026

Do not replace production-platform gates with these local results.

- `npm run check`: PASS — 60/60 Node tests, sample export, mock fixture, fixed twenty-prompt corpus, bundle synchronization, and strict Anna validation.
- `npm run browser:smoke`: PASS in 12.7 seconds — 520 x 680 viewport, 400% text reflow, validation focus, keyboard navigation, one character, one location, one scene, one shot, valid export, and four screenshots.
- `npm run browser:deletion-smoke`: PASS in 3.5 seconds — two project records deleted with ETags, unrelated key preserved, and deleted current project could not reload.
- JavaScript syntax plus `git diff --check`: PASS.
- Export validator: PASS on `demo/output.local/browser-smoke-story.storycore-harbour.json`.
- Visual inspection: PASS for the concept and continuity/export screenshots; generated text remains fictional mock evidence.
- Root StoryCore checkout: intentionally not modified by this isolated adapter continuation.

## Real Anna acceptance baseline — 23 August 2026

- Complete immutable corpus: 20/20 prompts executed through the connected Anna harness.
- Gate: FAIL — 6/20 valid projects versus target 18/20.
- Successful-run median: 27.18 seconds; p95: 63.32 seconds; latency target of 180 seconds passed.
- Five passing projects required repair; one passed directly.
- Failures: 11 contract and 3 timeout for 14 total failures.
- Private JSONL: `acceptance/results.local.jsonl` (ignored; never commit or paste publicly).
- Bounded follow-up pilot after targeted fixes: HBR-A01/A02/A05 passed 3/3, all inputs preserved, median 43.68 seconds. As a subset, it did not replace the then-current 6/20 baseline.
- Complete rerun after targeted fixes: 12/20 valid projects, median 30.54 seconds, p95 121.17 seconds, 8 repaired passes. This is the latest official result and remains below the 18/20 submission gate.
- Remaining rerun failures: four timeout, one `json_invalid`, one `duration_invalid`, and two `contract_invalid`.
- Local fixes now target `json_invalid` and `duration_invalid`; neither has been remeasured in a complete real corpus.
- Private rerun JSONL: `acceptance/results.rerun.local.jsonl` (ignored; never commit or paste publicly).
- Four-prompt contract pilot after those fixes: A09/A10/A12 passed with valid preserved projects; A19 shifted from `duration_invalid` to timeout. Diagnostic result 3/4; official score remains 12/20.
- Private contract-pilot JSONL: `acceptance/results.contract-pilot.local.jsonl` (ignored).
- Latest complete real corpus: 16/20, median 51.46 seconds, p95 90.94 seconds, 11 repaired passes, and no timeouts. A02/A07/A15/A18 failed as `json_invalid`; readiness remains blocked below 18/20.
- Anna installation is independently blocked because the mutable draft is still `v0.0.0` with zero immutable versions. Developer Console reports no available version to install. Do not cut `0.1.0` solely to bypass this while the reliability gate fails.
- Root cause evidence: all four remaining failures exhausted the 4,096-token MiniMax M3/OpenRouter allowance on both primary and repair, leaving incomplete visible JSON. Repair previously lacked the exact user input and quoted the truncated response.
- Local semantic fix complete: repair is reconstructed from exact source input plus validation errors and discards the partial response. The fix has 61-test, strict-validation, real-browser flow, and deletion/storage-preservation coverage.
- Post-fix A02/A07/A15/A18 real pilot: 0/4. Prompt provenance was corrected, but 7/8 MiniMax M3/OpenRouter calls still hit the 4,096-token cap with incomplete or empty JSON. Do not spend another complete-corpus quota until a different user-enabled model or documented App-level model preference can be verified.
- Model-preference verification: advisory hint `gemma` selected `gemma-4-E4B-it`/Runpod and improved the same four-case pilot to 3/4 with complete outputs. A02/A07 passed directly, A15 after repair, and A18 remained contract-invalid.
- User control complete: the Anna adapter offers an optional validated model hint and otherwise preserves the Anna default. It has 65-test, strict-validation, end-to-end Edge, and deletion/storage-preservation evidence.
- Complete Gemma-preference corpus: 14/20, median 21.67 seconds, p95 39.78 seconds, 6 repaired passes. It is faster and avoids MiniMax truncation but creates six schema/reference failures. Keep this score separate from Anna-default 16/20; neither satisfies readiness.
- Post-run exact replay: canonicalizing warning severity `minor→info` and string scene reference `"null"→null` makes the measured A02/A10 outputs valid, projecting 16/20 without weakening any structural rule. The measured score remains 14/20 until a real rerun; the four remaining outputs are genuinely malformed or structurally empty.
- Rejected experiment: Anna-default primary plus Gemma-only repair scored 2/4 on A02/A07/A15/A18, below Gemma-only 3/4. The diagnostic code was removed; do not add separate repair-model complexity without new platform evidence.
- A06 reproduction: one missing final brace was not the root cause. Both the completed primary object and the syntactically valid repair lacked the required creative structure. Keep fail-closed validation; do not synthesize characters, locations, scenes, or continuity data in the parser.
- Third-model probe blocked: hint `gpt-4o` returned no response metadata and remained pending beyond the App timeout. Treat it as a platform cancellation/grant issue, not model evidence; no further blind hint probes.
- 27 August default-model rerun: the complete immutable corpus used `minimax/minimax-m3` through OpenRouter and finished at 6/20, median 49.13 seconds, p95 57.87 seconds, and 2 repaired passes. The privacy-safe failure matrix was eight `json_invalid`, five `contract_invalid`, and one timeout. The ignored private JSONL is `acceptance/results.2026-08-27.local.jsonl`. This is a measured stochastic regression from the earlier 16/20 default run, so readiness remains blocked and no parser relaxation, immutable version, review submission, or release is justified.
- 27 August Gemma rerun: the complete immutable corpus with advisory hint `gemma` finished at 15/20, median 21.91 seconds, p95 41.92 seconds, and 6 repaired passes. Failures were A07/A10/A12/A19 `contract_invalid` and A20 `required_field_invalid`, with no timeout or JSON truncation. The ignored private JSONL is `acceptance/results.2026-08-27.gemma.local.jsonl`. This improves the measured Gemma profile from 14/20 to 15/20 but remains below the 18/20 gate; keep the PR draft and do not cut, submit, or release a version.
