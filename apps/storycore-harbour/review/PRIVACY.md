# StoryCore Harbour — privacy and data handling

Last reviewed: 2026-08-12

This document describes the intended version 0.1 behavior. It must be checked against the Developer Terms, privacy controls, and model-provider disclosures shown by Anna at publication time.

## Data the user provides

StoryCore Harbour processes the information entered into its project form:

- concept, synopsis, or short script;
- optional working title;
- content format and approximate duration;
- requested output language;
- tone or visual style;
- intended audience.

Users should not enter passwords, API keys, payment details, health records, confidential client material, private personal data, or content they are not authorized to process.

## Generated data

A successful run creates a structured project containing:

- project identity and source idea;
- production bible and visual direction;
- character and location descriptions;
- scenes, shots, dialogue, sound direction, and generation prompts;
- continuity report and warnings;
- operational metadata such as generation timestamp and whether one repair attempt was used.

## Processing

- The App sends the project input to the language-model capability granted through Anna's Host API.
- The actual model and model provider are selected or made available through the user's Anna environment.
- StoryCore Harbour does not embed a developer-owned model-provider key in version 0.1.
- StoryCore Harbour does not operate a separate content-processing backend in version 0.1.
- Model-provider processing, retention, and jurisdiction may therefore depend on Anna's current service configuration and disclosures.

Do not claim that content remains only on the user's device unless Anna confirms that exact runtime path for the selected model.

## Storage

Validated projects are written to the default per-user, per-App Anna storage scope:

- `projects/current` — latest validated project;
- `projects/by-id/<project-id>` — validated project snapshot.

Before an overwrite, the App reads the current record and uses its opaque ETag as an `if_match` precondition when available. After saving, it reads the latest project back and validates it again.

Version 0.1 does not request cross-App storage access, user-wide object-storage access, external database access, or a developer-operated synchronization service.

## Export

The user may explicitly export the current project as a local JSON file using the versioned contract `storycore-harbour.project.v1`.

The export is initiated in the App UI. StoryCore Harbour does not automatically upload exported files to the developer or a third party.

## Analytics and logs

Version 0.1 includes no third-party tracker and no external analytics origin.

Operational diagnostics must not store or transmit:

- complete scripts;
- generated dialogue;
- character or location descriptions;
- full generation prompts;
- full model responses;
- account tokens, signed URLs, secrets, or provider credentials.

The acceptance evaluator reports only fixed prompt IDs, pass/fail categories, validation reasons, latency, and repair counts. Real acceptance JSONL files are ignored by Git and must not be pasted into public issues or pull requests.

## Retention and deletion

The current implementation keeps validated projects in the user's Anna App storage until they are overwritten or removed through available Anna data controls. The App does not yet provide a complete “delete all StoryCore Harbour projects” UI.

Before Marketplace publication, the reviewer must confirm:

1. the Anna data-control path available to users;
2. whether App-scoped storage can be enumerated and deleted by the App without broader permissions;
3. the retention behavior of the enabled model providers;
4. the deletion and export obligations in the applicable Developer Terms and privacy policy.

A native delete-all control should be added before publication if Anna's user-facing controls are not sufficient or discoverable.

## Security measures in the App

- no untrusted generated HTML is rendered;
- model output is parsed as data and never executed;
- input and response lengths are bounded;
- every project is contract-validated;
- invalid projects are not rendered or saved;
- one bounded repair attempt is allowed, then the run fails visibly;
- storage writes use optimistic concurrency when possible;
- CSP allows only self-hosted App scripts and no external origins;
- no secrets are committed or requested by the UI.

## Children and sensitive uses

StoryCore Harbour is a general creative-planning tool, not a child-directed service and not a medical, legal, financial, employment, or emergency decision system. Users should not rely on generated content as professional advice or as verified factual research.

## Publication blockers

Do not publish the final privacy notice until these external documents and behaviors are reviewed:

- current Anna Developer Terms;
- Anna privacy policy and data-processing disclosures;
- written revenue-share policy if monetization is enabled;
- model-provider retention disclosures;
- production App storage deletion controls;
- applicable contact and legal-entity information for the publisher.
