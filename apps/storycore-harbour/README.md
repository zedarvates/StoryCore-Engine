# StoryCore Harbour

> From an idea to a production-ready visual story.

StoryCore Harbour is the Anna-native, cloud-accessible entry point to StoryCore Engine. It turns a concept, synopsis, or short script into a structured production package: production bible, characters, locations, scene breakdown, shot list, generation prompts, and a continuity report.

The working name references Hong Kong's harbour and the product's role: ideas arrive as rough cargo and leave organized for production. The name remains subject to final availability and brand clearance.

## Product boundary

StoryCore Harbour is independently useful inside Anna. It does **not** require StoryCore Desktop, ComfyUI, Blender, a local GPU, or a developer-owned model key.

The full StoryCore Desktop application remains the advanced production destination for local rendering, video, audio, 3D, and sovereign workflows.

## Current state

This directory is a Codex-ready bootstrap for an Anna `schema: 2` App:

- static UI bundle with a four-step workflow;
- direct `anna.llm.complete` integration;
- per-user App storage through `anna.storage`;
- deterministic project contract and sample fixture;
- JSON export;
- offline/local preview fallback;
- tests and Codex mission files.

## Start here

Codex must read these files in order:

1. `AGENTS.md`
2. `MISSION.md`
3. `PRODUCT_SPEC.md`
4. `ARCHITECTURE.md`
5. `CODEX_TASKS.md`
6. `DECISIONS.md`
7. `CODEX_ENTRYPOINT.md`

## Local commands

Requires Node.js 22+.

```bash
npm install
npm test
npm run contract:check
npm run validate
npm run dev:mock
```

`npm run validate` invokes Anna's supported CLI validator. `npm run dev:mock` runs the App with the recorded LLM fixture.

## Release identity

- Working App name: `StoryCore Harbour`
- Requested Anna slug: `storycore-harbour`
- Requested developer handle: `storycore-labs`
- Initial version: `0.1.0`
- Target review submission: before the end of August 2026

## Status

The branch is intentionally isolated from the StoryCore core. Do not merge it into `main` until the Anna manifest has passed strict validation and the core run has passed the acceptance suite.
