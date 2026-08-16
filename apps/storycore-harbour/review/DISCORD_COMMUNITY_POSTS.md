# StoryCore Harbour — Discord community posts

Updated: 2026-08-13

These messages are intended for the official Anna Discord linked by Jiao. They avoid confidential project content, account data, credentials, private model outputs, and unconfirmed commercial claims.

## Recommended first post

Use this after joining the server and finding the appropriate builder/introduction channel.

```text
Hi everyone — I’m Sylvain, the creator of StoryCore-Engine.

Jiao invited me to join the Anna builder community after taking an interest in StoryCore-Engine, an open-source local-first creative production pipeline focused on narrative continuity, character consistency, location consistency, storyboard structure, and multimedia orchestration.

I’m now preparing StoryCore Harbour, an Anna-native Schema 2 App that turns a concept, synopsis, or short script into a validated production package:

• production bible and visual direction
• characters and locations with continuity rules
• scene breakdown and ordered shot list
• reusable generation prompts
• continuity report
• saved project and StoryCore-compatible JSON export

The first version intentionally keeps heavy image, video, audio, Blender, and ComfyUI production in StoryCore Desktop. StoryCore Harbour uses Anna Host APIs for a lightweight, independently useful cloud workflow and currently requires no Executa.

Current status:
• strict Anna manifest validation passes
• 42 automated tests pass
• real-browser generation, save, reload, export, and delete-all flows pass
• SonarQube Quality Gate passes with no new issues or security hotspots
• an immutable 20-prompt English/French real-model acceptance suite is ready

We are now moving to the authenticated Anna draft, real-model acceptance run, and production APS verification.

Which channel would be best for periodic development updates and early App Review feedback?
```

## Shorter version

Use this when the introduction channel prefers brief posts.

```text
Hi everyone — I’m Sylvain, creator of the open-source StoryCore-Engine project.

I’m building StoryCore Harbour, an Anna-native App that converts a concept or short script into a production bible, coherent characters and locations, scenes, shots, reusable prompts, a continuity report, and an exportable project.

The Schema 2 draft uses Anna Host APIs and does not require an Executa. Its current automated gates include strict Anna validation, 42 tests, browser generation/storage/export/deletion flows, and a clean SonarQube Quality Gate.

We are preparing the authenticated Anna draft and real-model acceptance tests now. Which channel should I use for development updates and early review feedback?
```

## First technical progress update

Post this after the `storycore-harbour` working draft has actually been created in Anna. Replace bracketed fields only with verified values.

```text
StoryCore Harbour development update

The Anna working draft is now created under [confirmed public identity].

Completed:
• Schema 2 Host-API architecture, without Executa
• concept/script → production package core flow
• validated save, read-back, reload, and JSON export
• ETag-protected writes and project deletion
• strict Anna CLI validation
• 42 automated tests
• browser checks at the declared minimum App size
• fixed 20-prompt acceptance corpus: 10 English, 10 French

Current work:
• real Anna model run and reliability measurement
• production APS and concurrency verification
• accessibility checks
• reviewer package and external beta preparation

I’ll share privacy-safe results such as completion rate, latency, repair count, and failure categories once the authenticated run is complete. I won’t post user scripts or model-generated project content.

Feedback on the core workflow and App Review expectations is welcome.
```

## Real-model acceptance result

Post only after the committed evaluator has actually completed. Do not post the JSONL or generated projects.

```text
StoryCore Harbour acceptance update

Model/environment: [publicly safe description]
Fixed corpus: 20 prompts — 10 English and 10 French
Valid completed projects: [N]/20
Median completion time: [N] seconds
Repair attempts used: [N]
Acceptance gate: [PASS/FAIL]

The result was evaluated against the committed StoryCore Harbour project contract. Shared figures contain no user scripts, generated dialogue, prompts, project descriptions, or account identifiers.

Next: [production APS verification / targeted reliability correction / App Review submission].
```

## Question for Anna maintainers

Use this in a technical-support channel after the draft exists.

```text
Hi Anna team — StoryCore Harbour is a Host-API-only Schema 2 App using llm.complete, App-scope storage get/set/list/delete, and window.set_title, with no Executa.

We have strict validation and mock/browser gates passing. Before the first review, could you confirm the recommended evidence for:

1. production APS write/read/reload verification;
2. ETag conflict behavior for set and delete;
3. Qualified Run instrumentation for a workflow that may make one bounded repair call;
4. current Marketplace screenshot dimensions and file-size limits?

The App’s core completion is only recorded after the generated project validates, saves successfully, reads back successfully, and renders to the user.
```

## Posting policy

Good content to share:

- verified milestone completion;
- privacy-safe test totals;
- latency and reliability figures;
- architecture decisions;
- questions about Anna APIs and App Review;
- fictional screenshots and demo content;
- GitHub PR or repository links when appropriate.

Do not share:

- Discord, Anna, GitHub, email, model-provider, or API credentials;
- Developer Console tokens or device-login codes;
- confidential Developer Terms or private attachments;
- personal data or unpublished client scripts;
- full real-model acceptance JSONL files;
- generated dialogue, character data, prompts, or project bodies from private runs;
- revenue claims not confirmed in writing;
- promises of Marketplace promotion or launch placement.

## Recommended cadence

Post only when there is a useful change:

1. initial introduction;
2. working draft created;
3. real-model acceptance result;
4. first App Review submission;
5. review outcome and next action;
6. public launch, only after approval.

Avoid daily low-signal updates. One concise, evidence-based post per meaningful milestone is preferable.
