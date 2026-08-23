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

- `npm run check`: PASS — 48/48 Node tests, sample export, mock fixture, fixed twenty-prompt corpus, bundle synchronization, and strict Anna validation.
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
