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
- project contract tests pass;
- sample StoryCore Harbour export validates;
- mock LLM fixture validates against the project contract;
- `anna-app validate --strict` passes with `@anna-ai/cli` 0.1.30;
- the official Anna mock harness starts and responds on port 5180;
- dedicated path-scoped GitHub Actions CI is in place.

### HBR-002 — Contract hardening implemented

- one canonical contract is shared by the browser App and Node tooling;
- project identity, formats, lengths, dates, production bible, visual direction, and continuity rules are validated;
- character, location, scene, and shot IDs must be unique;
- scene and shot orders must be unique in their scopes;
- character, location, and warning scene references must resolve;
- shot characters must also be declared in their parent scene;
- duration totals must remain plausible relative to the requested project duration;
- invalid projects cannot be rendered, saved, loaded, or treated as successful;
- Anna storage overwrites use `etag` / `if_match` when available;
- saved data is read back and revalidated.

The expanded HBR-002 suite is awaiting the latest CI conclusion after the final shared-validator integration.

## In progress

### HBR-003 — Generation reliability

Current foundation:

- bounded input lengths;
- bounded model response length;
- MCP-shaped response extraction;
- JSON-only prompt contract;
- exactly one repair attempt;
- finite 180-second host-call timeout;
- duplicate-submit protection;
- stable user-facing categories for quota, permission, provider, timeout, storage, and concurrency errors.

Next work:

- create the fixed 20-prompt acceptance corpus;
- add a deterministic evaluator for contract success and latency;
- run the corpus against a real Anna account and enabled model;
- reach at least 18/20 valid projects without manual intervention;
- tune scene/shot counts by duration and format.

## Still externally unverified

- real Anna account handshake in the production App host;
- real model completion success rate and latency;
- persistence against production APS, including an induced concurrency conflict;
- Qualified App MAU instrumentation and visibility;
- App slug and developer-handle availability;
- current Developer Terms and revenue-share policy;
- developer activation path;
- Marketplace review and launch support.

## Codex resume point

```bash
git fetch origin
git switch agent/storycore-harbour-bootstrap
cd apps/storycore-harbour
npm install
npm run check
npm run dev:mock
```

Then read `AGENTS.md` and `CODEX_ENTRYPOINT.md`.

Codex should first inspect the latest CI result. If green, close HBR-002 and begin HBR-003 by building the acceptance corpus and evaluator. It must not add an Executa, backend, GPU service, image generation, or video generation.
