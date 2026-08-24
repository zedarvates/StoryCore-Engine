# Architecture — StoryCore Harbour

## Design principle

Use the smallest architecture capable of delivering a reliable meaningful completion.

```text
Static Anna UI bundle
        |
        +-- anna.llm.complete
        |       |
        |       +-- structured StoryCore Harbour project JSON
        |
        +-- local contract validation
        |
        +-- anna.storage.get / anna.storage.set
        |
        +-- user-initiated JSON export
```

## Runtime choice

Version 0.1 is an Anna `schema: 2` bundle-only UI App:

- `required_executas`: empty;
- `optional_executas`: empty;
- LLM: host `anna.llm.complete`;
- persistence: host `anna.storage`;
- title: host `anna.window.set_title`;
- no network origins;
- no custom backend;
- no provider credentials.

An Executa may be introduced later only for deterministic logic that cannot safely or efficiently run in the iframe. Its introduction requires an architecture decision.

## Repository boundary

```text
apps/storycore-harbour/
├── app.json
├── manifest.json
├── bundle/
├── contracts/
├── examples/
├── fixtures/
├── scripts/
├── tests/
└── mission and decision documents
```

The App does not import the Electron renderer or Python backend. Shared StoryCore logic may later be extracted into a separately versioned, runtime-neutral package.

## Generation flow

1. Validate form input locally.
2. Build a bounded system prompt and user payload.
3. Call `anna.llm.complete`.
4. Extract text from the MCP-shaped response.
5. remove only an optional surrounding Markdown code fence;
6. parse JSON;
7. validate required structure and invariants;
8. if invalid, make exactly one repair call containing validation errors and the previous output;
9. reject if still invalid;
10. add local metadata not delegated to the model;
11. save only validated data;
12. render the result and enable export.

## Data contract

Canonical identifier:

```text
storycore-harbour.project.v1
```

The contract is defined in `contracts/project.schema.json`. The schema is the interchange boundary between Anna and future StoryCore Desktop importers.

Rules:

- IDs are stable strings;
- scene and shot order is explicit;
- all referenced character and location IDs must exist;
- duration values are non-negative;
- the continuity score is 0–100;
- prompts are plain text;
- unknown fields may be retained for forward compatibility, but required fields may not be omitted.

## Storage

Version 0.1 uses default App scope only:

- `projects/current` — latest validated project;
- `projects/by-id/<project-id>` — project snapshot;
- `meta/last-completion` — non-content completion metadata, only if required.

Do not request cross-App or user-wide access.

Production storage writes should use optimistic concurrency when supported. The first implementation may write the latest project directly; Codex must add conflict handling before release.

## Reliability

- one primary LLM call;
- one optional repair call;
- finite timeouts;
- disable duplicate submissions while running;
- locally generated UUID and timestamps;
- no media provider in the core path;
- no silent mock fallback;
- stored project must validate again after read-back.

## Security

- text is inserted with `textContent`, never untrusted `innerHTML`;
- CSP allows only self-hosted scripts;
- no external origin;
- no secrets in code;
- prompt input length is bounded;
- LLM output is parsed as data, never executed;
- exported filenames are sanitized.

## Observability

Version 0.1 records only local operational events:

- run started;
- parse passed/failed;
- repair attempted;
- validation passed/failed;
- storage passed/failed;
- completion rendered.

No script body, character description, dialogue, prompt, or complete model response may be sent to analytics.

## Future integration

A future StoryCore Desktop importer should:

1. accept `storycore-harbour.project.v1`;
2. map characters, locations, scenes, and shots into the existing StoryCore project model;
3. retain the original Harbour JSON as provenance;
4. never require an Anna account for local editing after import.
