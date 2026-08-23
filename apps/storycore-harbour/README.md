# StoryCore Harbour

> From an idea to a production-ready visual story.

StoryCore Harbour is the Anna-native, cloud-accessible entry point to StoryCore Engine. It turns a concept, synopsis, or short script into a structured production package: production bible, characters, locations, scene breakdown, shot list, reusable generation prompts, and a continuity report.

The working name references Hong Kong's harbour and the product's role: ideas arrive as rough cargo and leave organized for production. The name remains subject to final availability and brand clearance.

## Product boundary

StoryCore Harbour is independently useful inside Anna. It does **not** require StoryCore Desktop, ComfyUI, Blender, a local GPU, a custom backend, an Executa, or a developer-owned model key.

The full StoryCore Desktop application remains the advanced production destination for local rendering, video, audio, 3D, and sovereign workflows.

## Implemented architecture

- Anna `schema: 2` static UI bundle;
- four-step Concept → World → Scenes → Continuity workflow;
- direct `anna.llm.complete` integration;
- exactly one bounded repair attempt;
- shared executable `storycore-harbour.project.v1` contract;
- validation before render/save/load and after storage read-back;
- per-user/per-App persistence through `anna.storage`;
- optimistic `etag` / `if_match` overwrites;
- StoryCore-compatible JSON export;
- explicit quota, permission, provider, timeout, contract, storage, and conflict states;
- no external origin or tracker.

## Reliability gates

The branch includes:

- 44 Node tests covering the project contract, demo artifacts, acceptance evaluator, and official Anna Host API harness;
- strict `anna-app validate --strict` validation with pinned `@anna-ai/cli` 0.1.30;
- Anna mock-harness startup in CI;
- a fixed twenty-prompt acceptance corpus covering all six formats, ten English and ten French cases;
- a deterministic 18/20 and median-latency evaluator;
- a consented real-Anna collector activated only with `?acceptance=1`.

The authenticated real-model corpus and production APS conflict tests remain external gates before the draft PR may be considered ready.

## Start here

Codex must read these files in order:

1. `AGENTS.md`
2. `MISSION.md`
3. `PRODUCT_SPEC.md`
4. `ARCHITECTURE.md`
5. `CODEX_TASKS.md`
6. `DECISIONS.md`
7. `STATUS.md`
8. `acceptance/README.md`
9. `CODEX_ENTRYPOINT.md`

For the deterministic reviewer path and its exported artifacts, see `demo/README.md`.

## Local commands

Requires Node.js 22+.

```bash
npm install
npm run check
npm run dev:mock
```

`npm install` also generates the bundle copy of the canonical acceptance corpus. `npm run check` runs the tests, contract, mock response, acceptance corpus/synchronization, and strict Anna validator.

For the real-model protocol, follow `acceptance/README.md`. Do not run the collector without an authenticated Anna test account, an enabled model, sufficient quota, and explicit confirmation in its UI.

## Release identity

- Working App name: `StoryCore Harbour`
- Requested Anna slug: `storycore-harbour`
- Requested developer handle: `storycore-labs`
- Initial version: `0.1.0`
- Target review submission: before the end of August 2026

## Status

The branch is intentionally isolated from the StoryCore core and the pull request remains a draft. Do not merge into `main` until:

1. the authenticated acceptance evaluator reports at least 18/20 with median completion at or below 180 seconds;
2. real APS write/read/reload and ETag conflict behavior are verified;
3. Anna's applicable Developer Terms and revenue-share policy are reviewed;
4. the App slug, developer activation, MAU visibility, and review path are confirmed.
