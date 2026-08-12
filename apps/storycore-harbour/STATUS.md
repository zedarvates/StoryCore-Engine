# Current status

Updated: 2026-08-12

## Completed

### Product and repository bootstrap

- product name and boundary selected;
- strategic reply sent to Anna;
- isolated feature branch and draft PR created;
- schema 2 manifest created with no Executa;
- static four-step UI created;
- Host LLM call and one bounded repair attempt implemented;
- default App-scope persistence and JSON export implemented;
- Codex mission, architecture, decisions, stop gates, and numbered work plan created.

### HBR-001 — Bootstrap validation

- Node.js syntax checks pass;
- sample StoryCore Harbour export validates;
- mock LLM response validates against the project contract;
- `anna-app validate --strict` passes with exact `@anna-ai/cli` 0.1.30;
- the official Anna mock harness starts and responds on port 5180;
- dedicated path-scoped GitHub Actions CI is in place.

### HBR-002 — Contract hardening

- one canonical executable contract is shared by the browser App and Node tooling;
- project identity, formats, lengths, dates, production bible, visual direction, and continuity rules are validated;
- character, location, scene, and shot IDs must be unique;
- scene and shot orders must be unique in their scopes;
- character, location, and warning scene references must resolve;
- shot characters must also be declared in their parent scene;
- duration totals must remain plausible relative to the requested project duration;
- invalid projects cannot be rendered, saved, loaded, or treated as successful;
- Anna storage overwrites use `etag` / `if_match` when available;
- saved data is read back and revalidated;
- the contract suite covers twenty distinct invalid conditions plus the valid reference project.

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
- generated static-bundle corpus kept synchronized with its single canonical source;
- official `mountBundle` tests verify declared LLM/storage/window grants and rejection of undeclared tool invocation.

### HBR-004 — Automated UI and accessibility gates

- responsive four-step interface validated at the manifest minimum size of 520 × 680;
- no horizontal overflow in the complete browser flow;
- tab/tablist/tabpanel semantics for Concept, World, Scenes, and Continuity;
- Arrow, Home, and End keyboard navigation across enabled steps;
- focus moves to local form errors and each newly active panel heading;
- runtime, loading, save, validation, and fatal states use live announcements;
- generated project content is rendered as text, never untrusted HTML;
- reduced-motion preference is honored;
- browser test completes local validation, mock LLM generation, save/read-back, world rendering, scene/shot rendering, continuity, keyboard navigation, and JSON export;
- the exported project and safe filename pass the canonical contract.

The browser test uses a deterministic storage adapter only because CLI 0.1.30's `--mock-llm` dashboard does not round-trip its documented WindowStore values. Production code still calls Anna storage directly; production APS remains a separate authenticated gate.

### HBR-006 — Review-package drafts

- Marketplace tagline, descriptions, keywords, limits, screenshot captions, and prohibited claims;
- privacy and data-handling draft with explicit retention/deletion limitation;
- Marketplace reviewer functional, accessibility, security, persistence, and export guide;
- external beta protocol for 10–20 independent participants;
- release-blocking launch checklist;
- existing App icon retained.

## In progress

### HBR-003 — Authenticated real-model gate

Remaining work:

- activate or authenticate a real Anna developer test environment;
- run the twenty-prompt collector against at least one enabled model;
- evaluate the downloaded JSONL locally;
- reach at least 18/20 valid projects without manual intervention;
- keep median successful completion time at or below 180 seconds;
- tune scene/shot counts or prompts only from measured failures;
- rerun the complete corpus after every reliability change.

### HBR-004 — Human accessibility and usability gates

Remaining work:

- manual screen-reader pass;
- manual 200% zoom and high/forced-contrast checks;
- first-time-user confirmation through the external beta.

### HBR-005 — Production APS verification

Remaining work:

- verify real production App storage write and read-back;
- reload a saved project in a new App session;
- induce an ETag conflict and confirm that the newer project is not overwritten;
- confirm a sufficient deletion path or add delete-all UX.

### HBR-006 — Final Marketplace assets

Remaining work:

- capture four final screenshots with fictional content;
- confirm Anna's screenshot dimensions/file limits;
- record a short demonstration;
- run the external beta and resolve all P0/P1 defects;
- finalize publisher privacy/support details and immutable 0.1.0 package.

## Latest automated gate

The latest green CI includes:

- all 35 Node tests;
- sample export validation;
- mock LLM response validation;
- immutable acceptance corpus and generated-bundle synchronization;
- strict Anna manifest validation;
- official Anna mock-harness startup;
- full Chromium flow at 520 × 680 with validation focus, keyboard step navigation, panel focus, save/read-back, scene/shot rendering, continuity, and contract-valid export.

## Still externally unverified

- real Anna production Host API handshake;
- model completion success rate and latency;
- production APS, deletion controls, and ETag conflict behavior;
- Qualified App MAU instrumentation and visibility;
- App slug and developer-handle availability;
- current Developer Terms and revenue-share policy;
- developer activation path;
- Marketplace review and launch support.

No new reply from Jiao was present at the latest Gmail check on 2026-08-12.

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

Codex should inspect the latest CI result first. The preferred next step is the authenticated Anna corpus and APS run. Non-authenticated work may prepare final screenshots, manual-accessibility checks, or deletion UX, but must not bypass the real-platform, legal, and beta gates or add an Executa/backend/media renderer.
